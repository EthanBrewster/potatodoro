import { v4 as uuidv4 } from 'uuid';
import {
  createKitchen,
  getKitchen,
  updateKitchen,
  addMemberToKitchen,
  removeMemberFromKitchen,
  getMember,
  updateMember,
  getKitchenMembers,
  mapSocketToUser,
  getSocketMapping,
  removeSocketMapping,
  addToGlobalOven
} from '../db/redis.js';
import {
  createOrUpdateUser,
  incrementUserStats,
  checkAndAwardToppings,
  createSession,
  completeSession
} from '../db/postgres.js';

// Potato state machine
const POTATO_STATES = {
  IDLE: 'IDLE',       // No active session
  HEATING: 'HEATING', // Timer is running
  CRITICAL: 'CRITICAL', // Timer near end or complete
  COOLING: 'COOLING'  // Break time
};

// Generate a kitchen code like "POTATO-A1B2"
function generateKitchenCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `POTATO-${code}`;
}

// Calculate joules earned based on time focused
function calculateJoules(durationMs) {
  // 1 minute of focus = 10 Joules
  return Math.floor(durationMs / 60000) * 10;
}

export function setupSocketHandlers(io) {
  // Active timers stored in memory (backed by Redis for recovery)
  const activeTimers = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ═══════════════════════════════════════════════════════════════
    // KITCHEN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    // Create a new kitchen
    socket.on('create_kitchen', async (data, callback) => {
      try {
        const { nickname } = data;
        const userId = data.userId || uuidv4();
        const kitchenCode = generateKitchenCode();

        // Create user in Postgres
        await createOrUpdateUser(userId, nickname);

        // Create kitchen in Redis
        await createKitchen(kitchenCode, userId);

        // Add creator as first member
        await addMemberToKitchen(kitchenCode, {
          id: userId,
          nickname,
          socketId: socket.id
        });

        // Map socket to user
        await mapSocketToUser(socket.id, userId, kitchenCode);

        // Join socket room
        socket.join(kitchenCode);

        console.log(`🍳 Kitchen created: ${kitchenCode} by ${nickname}`);

        callback({
          success: true,
          kitchenCode,
          userId,
          kitchen: await getKitchen(kitchenCode)
        });

      } catch (error) {
        console.error('Create kitchen error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Join an existing kitchen
    socket.on('join_kitchen', async (data, callback) => {
      try {
        const { kitchenCode, nickname } = data;
        const userId = data.userId || uuidv4();

        // Check if kitchen exists
        const kitchen = await getKitchen(kitchenCode);
        if (!kitchen) {
          return callback({ success: false, error: 'Kitchen not found. Check the code!' });
        }

        // Check member limit (max 5)
        if (kitchen.members.length >= 5) {
          return callback({ success: false, error: 'Kitchen is full! Maximum 5 chefs allowed.' });
        }

        // Create/update user in Postgres
        await createOrUpdateUser(userId, nickname);

        // Check if user is already a member (reconnecting)
        const existingMember = kitchen.members.find(m => m.id === userId);
        if (existingMember) {
          // Update socket ID
          await updateMember(kitchenCode, userId, { socketId: socket.id, state: 'IDLE' });
        } else {
          // Add as new member
          await addMemberToKitchen(kitchenCode, {
            id: userId,
            nickname,
            socketId: socket.id
          });
        }

        // Map socket to user
        await mapSocketToUser(socket.id, userId, kitchenCode);

        // Join socket room
        socket.join(kitchenCode);

        // Get updated kitchen state
        const updatedKitchen = await getKitchen(kitchenCode);

        console.log(`👨‍🍳 ${nickname} joined kitchen: ${kitchenCode}`);

        // Notify other members
        socket.to(kitchenCode).emit('member_joined', {
          member: { id: userId, nickname, state: 'IDLE' },
          kitchen: updatedKitchen
        });

        callback({
          success: true,
          kitchenCode,
          userId,
          kitchen: updatedKitchen
        });

      } catch (error) {
        console.error('Join kitchen error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Leave kitchen
    socket.on('leave_kitchen', async (data, callback) => {
      try {
        const mapping = await getSocketMapping(socket.id);
        if (!mapping || !mapping.kitchenCode) {
          return callback?.({ success: true });
        }

        const { userId, kitchenCode } = mapping;

        // Remove member
        await removeMemberFromKitchen(kitchenCode, userId);
        await removeSocketMapping(socket.id);

        // Leave socket room
        socket.leave(kitchenCode);

        // Get updated kitchen
        const kitchen = await getKitchen(kitchenCode);

        // Notify others
        io.to(kitchenCode).emit('member_left', {
          userId,
          kitchen
        });

        console.log(`👋 User ${userId} left kitchen: ${kitchenCode}`);

        callback?.({ success: true });

      } catch (error) {
        console.error('Leave kitchen error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // POTATO TIMER LOGIC
    // ═══════════════════════════════════════════════════════════════

    // Start heating (begin focus session)
    socket.on('start_heating', async (data, callback) => {
      try {
        const mapping = await getSocketMapping(socket.id);
        if (!mapping) return callback?.({ success: false, error: 'Not in a kitchen' });

        const { userId, kitchenCode } = mapping;
        const kitchen = await getKitchen(kitchenCode);

        // Check if someone else is already heating
        if (kitchen.potatoHolder && kitchen.potatoHolder !== userId && kitchen.potatoState === POTATO_STATES.HEATING) {
          return callback?.({ success: false, error: 'Someone else is holding the potato!' });
        }

        const duration = data.duration || kitchen.timerDuration;
        const startTime = Date.now();

        // Update kitchen state
        await updateKitchen(kitchenCode, {
          potatoHolder: userId,
          potatoState: POTATO_STATES.HEATING,
          timerStartedAt: startTime,
          timerDuration: duration
        });

        // Update member state
        await updateMember(kitchenCode, userId, { state: POTATO_STATES.HEATING });

        // Create session in Postgres
        const session = await createSession(userId, kitchenCode);

        // Set up timer for CRITICAL state (when 90% complete)
        const criticalTime = duration * 0.9;
        const criticalTimer = setTimeout(async () => {
          await updateKitchen(kitchenCode, { potatoState: POTATO_STATES.CRITICAL });
          await updateMember(kitchenCode, userId, { state: POTATO_STATES.CRITICAL });
          
          io.to(kitchenCode).emit('potato_critical', {
            holderId: userId,
            kitchen: await getKitchen(kitchenCode)
          });
        }, criticalTime);

        // Set up timer for session complete
        const completeTimer = setTimeout(async () => {
          // Mark session as needing toss
          await updateKitchen(kitchenCode, { potatoState: POTATO_STATES.CRITICAL });
          
          io.to(kitchenCode).emit('potato_ready_to_toss', {
            holderId: userId,
            sessionId: session.id,
            kitchen: await getKitchen(kitchenCode)
          });
        }, duration);

        // Store timer references
        activeTimers.set(`${kitchenCode}:${userId}`, {
          criticalTimer,
          completeTimer,
          sessionId: session.id,
          startTime,
          duration
        });

        console.log(`🔥 ${userId} started heating in ${kitchenCode}`);

        // Broadcast to kitchen
        io.to(kitchenCode).emit('heating_started', {
          holderId: userId,
          startTime,
          duration,
          kitchen: await getKitchen(kitchenCode)
        });

        callback?.({ success: true, sessionId: session.id, startTime, duration });

      } catch (error) {
        console.error('Start heating error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // Toss the potato to another user
    socket.on('toss_potato', async (data, callback) => {
      try {
        const mapping = await getSocketMapping(socket.id);
        if (!mapping) return callback?.({ success: false, error: 'Not in a kitchen' });

        const { userId, kitchenCode } = mapping;
        const { targetUserId } = data;
        const kitchen = await getKitchen(kitchenCode);

        // Verify current user holds the potato
        if (kitchen.potatoHolder !== userId) {
          return callback?.({ success: false, error: "You're not holding the potato!" });
        }

        // Clear existing timers
        const timerKey = `${kitchenCode}:${userId}`;
        const timerData = activeTimers.get(timerKey);
        if (timerData) {
          clearTimeout(timerData.criticalTimer);
          clearTimeout(timerData.completeTimer);

          // Calculate joules earned
          const elapsedMs = Date.now() - timerData.startTime;
          const joules = calculateJoules(elapsedMs);

          // Complete the session
          await completeSession(timerData.sessionId, Math.floor(elapsedMs / 1000), joules);

          // Update user stats
          const stats = await incrementUserStats(userId, { joules, potatoes: 1, tosses: 1 });
          
          // Check for new toppings
          const newToppings = await checkAndAwardToppings(userId, stats);
          if (newToppings.length > 0) {
            socket.emit('toppings_earned', { toppings: newToppings });
          }

          activeTimers.delete(timerKey);
        }

        // Update tosser to cooling state
        await updateMember(kitchenCode, userId, { state: POTATO_STATES.COOLING });

        // Find target (or random available member)
        let actualTargetId = targetUserId;
        const availableMembers = kitchen.members.filter(
          m => m.id !== userId && m.state !== POTATO_STATES.HEATING
        );

        if (!actualTargetId && availableMembers.length > 0) {
          // Random toss
          actualTargetId = availableMembers[Math.floor(Math.random() * availableMembers.length)].id;
        }

        if (!actualTargetId) {
          // No one available - send to Global Oven
          await updateKitchen(kitchenCode, {
            potatoHolder: null,
            potatoState: POTATO_STATES.IDLE,
            timerStartedAt: null
          });
          
          await addToGlobalOven(kitchenCode);

          io.to(kitchenCode).emit('potato_to_oven', {
            fromUserId: userId,
            kitchen: await getKitchen(kitchenCode)
          });

          console.log(`🥔➡️🔥 Potato sent to Global Oven from ${kitchenCode}`);

          return callback?.({ success: true, sentToOven: true });
        }

        // Toss to target
        await updateKitchen(kitchenCode, {
          potatoHolder: actualTargetId,
          potatoState: POTATO_STATES.IDLE,
          timerStartedAt: null
        });

        const targetMember = await getMember(kitchenCode, actualTargetId);

        console.log(`🥔➡️ ${userId} tossed to ${actualTargetId} in ${kitchenCode}`);

        // Broadcast the toss
        io.to(kitchenCode).emit('potato_tossed', {
          fromUserId: userId,
          toUserId: actualTargetId,
          toNickname: targetMember?.nickname,
          kitchen: await getKitchen(kitchenCode)
        });

        // Start cooling period for tosser (5 minutes)
        setTimeout(async () => {
          await updateMember(kitchenCode, userId, { state: POTATO_STATES.IDLE });
          io.to(kitchenCode).emit('member_cooled', {
            userId,
            kitchen: await getKitchen(kitchenCode)
          });
        }, kitchen.breakDuration);

        callback?.({ success: true, targetUserId: actualTargetId });

      } catch (error) {
        console.error('Toss potato error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // Cancel current session
    socket.on('cancel_session', async (data, callback) => {
      try {
        const mapping = await getSocketMapping(socket.id);
        if (!mapping) return callback?.({ success: false, error: 'Not in a kitchen' });

        const { userId, kitchenCode } = mapping;

        // Clear timers
        const timerKey = `${kitchenCode}:${userId}`;
        const timerData = activeTimers.get(timerKey);
        if (timerData) {
          clearTimeout(timerData.criticalTimer);
          clearTimeout(timerData.completeTimer);
          activeTimers.delete(timerKey);
        }

        // Reset states
        await updateKitchen(kitchenCode, {
          potatoHolder: null,
          potatoState: POTATO_STATES.IDLE,
          timerStartedAt: null
        });
        await updateMember(kitchenCode, userId, { state: POTATO_STATES.IDLE });

        io.to(kitchenCode).emit('session_cancelled', {
          userId,
          kitchen: await getKitchen(kitchenCode)
        });

        callback?.({ success: true });

      } catch (error) {
        console.error('Cancel session error:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // SOCIAL FEATURES
    // ═══════════════════════════════════════════════════════════════

    // Send encouragement (ice cube) or nudge (salt)
    socket.on('send_reaction', async (data, callback) => {
      try {
        const mapping = await getSocketMapping(socket.id);
        if (!mapping) return callback?.({ success: false });

        const { kitchenCode } = mapping;
        const { targetUserId, reactionType } = data; // 'ice' or 'salt'

        const targetMember = await getMember(kitchenCode, targetUserId);
        if (!targetMember) return callback?.({ success: false });

        // Find target's socket and send reaction
        io.to(kitchenCode).emit('reaction_received', {
          fromUserId: mapping.userId,
          toUserId: targetUserId,
          reactionType
        });

        callback?.({ success: true });

      } catch (error) {
        console.error('Send reaction error:', error);
        callback?.({ success: false });
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // DISCONNECT HANDLING
    // ═══════════════════════════════════════════════════════════════

    socket.on('disconnect', async () => {
      try {
        console.log(`🔌 Socket disconnected: ${socket.id}`);

        const mapping = await getSocketMapping(socket.id);
        if (!mapping || !mapping.kitchenCode) return;

        const { userId, kitchenCode } = mapping;

        // Check if user was holding potato
        const kitchen = await getKitchen(kitchenCode);
        if (kitchen && kitchen.potatoHolder === userId) {
          // Clear timers
          const timerKey = `${kitchenCode}:${userId}`;
          const timerData = activeTimers.get(timerKey);
          if (timerData) {
            clearTimeout(timerData.criticalTimer);
            clearTimeout(timerData.completeTimer);
            activeTimers.delete(timerKey);
          }

          // Auto-toss after 2 minutes of disconnect
          setTimeout(async () => {
            const currentKitchen = await getKitchen(kitchenCode);
            if (currentKitchen && currentKitchen.potatoHolder === userId) {
              // Find available member
              const members = await getKitchenMembers(kitchenCode);
              const available = members.filter(m => m.id !== userId && m.state !== POTATO_STATES.HEATING);

              if (available.length > 0) {
                const target = available[Math.floor(Math.random() * available.length)];
                await updateKitchen(kitchenCode, {
                  potatoHolder: target.id,
                  potatoState: POTATO_STATES.IDLE,
                  timerStartedAt: null
                });

                io.to(kitchenCode).emit('potato_auto_tossed', {
                  fromUserId: userId,
                  toUserId: target.id,
                  reason: 'disconnect',
                  kitchen: await getKitchen(kitchenCode)
                });
              } else {
                await addToGlobalOven(kitchenCode);
                await updateKitchen(kitchenCode, {
                  potatoHolder: null,
                  potatoState: POTATO_STATES.IDLE,
                  timerStartedAt: null
                });

                io.to(kitchenCode).emit('potato_to_oven', {
                  fromUserId: userId,
                  reason: 'disconnect',
                  kitchen: await getKitchen(kitchenCode)
                });
              }
            }
          }, 2 * 60 * 1000); // 2 minutes
        }

        // Update member as offline (but don't remove yet)
        await updateMember(kitchenCode, userId, { 
          socketId: null,
          state: 'OFFLINE'
        });

        // Notify others
        io.to(kitchenCode).emit('member_disconnected', {
          userId,
          kitchen: await getKitchen(kitchenCode)
        });

        await removeSocketMapping(socket.id);

      } catch (error) {
        console.error('Disconnect handling error:', error);
      }
    });

    // Request current kitchen state (for reconnection/sync)
    socket.on('get_kitchen_state', async (data, callback) => {
      try {
        const mapping = await getSocketMapping(socket.id);
        if (!mapping) return callback?.({ success: false, error: 'Not in a kitchen' });

        const kitchen = await getKitchen(mapping.kitchenCode);
        callback?.({ success: true, kitchen });

      } catch (error) {
        console.error('Get kitchen state error:', error);
        callback?.({ success: false, error: error.message });
      }
    });
  });

  // Periodic cleanup of stale kitchens (runs every hour)
  setInterval(async () => {
    console.log('🧹 Running periodic cleanup...');
    // Redis TTLs handle most cleanup automatically
  }, 60 * 60 * 1000);

  return io;
}
