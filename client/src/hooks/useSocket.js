import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useGameStore from '../store/gameStore';

const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin 
  : 'http://localhost:3000';

export function useSocket() {
  const socketRef = useRef(null);
  const {
    userId,
    nickname,
    setConnected,
    setKitchen,
    setMembers,
    updateMember,
    addMember,
    removeMember,
    setTimer,
    clearTimer,
    addReaction,
    addToppings,
    setError,
    leaveKitchen,
  } = useGameStore();

  // Initialize socket connection
  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('🔌 Connected to server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server');
    });

    // Kitchen events
    socket.on('member_joined', ({ member, kitchen }) => {
      console.log('👨‍🍳 Member joined:', member.nickname);
      addMember(member);
      setKitchen(kitchen);
    });

    socket.on('member_left', ({ userId, kitchen }) => {
      console.log('👋 Member left:', userId);
      removeMember(userId);
      setKitchen(kitchen);
    });

    socket.on('member_disconnected', ({ userId, kitchen }) => {
      console.log('📴 Member disconnected:', userId);
      updateMember(userId, { state: 'OFFLINE' });
      setKitchen(kitchen);
    });

    socket.on('member_cooled', ({ userId, kitchen }) => {
      console.log('❄️ Member cooled:', userId);
      updateMember(userId, { state: 'IDLE' });
      setKitchen(kitchen);
    });

    // Timer events
    socket.on('heating_started', ({ holderId, startTime, duration, kitchen }) => {
      console.log('🔥 Heating started by:', holderId);
      setTimer(startTime, duration);
      setKitchen(kitchen);
    });

    socket.on('potato_critical', ({ holderId, kitchen }) => {
      console.log('🚨 Potato critical!');
      setKitchen(kitchen);
    });

    socket.on('potato_ready_to_toss', ({ holderId, kitchen }) => {
      console.log('🥔 Potato ready to toss!');
      setKitchen(kitchen);
    });

    socket.on('potato_tossed', ({ fromUserId, toUserId, toNickname, kitchen }) => {
      console.log(`🥔➡️ Potato tossed from ${fromUserId} to ${toUserId}`);
      clearTimer();
      setKitchen(kitchen);
    });

    socket.on('potato_auto_tossed', ({ fromUserId, toUserId, reason, kitchen }) => {
      console.log(`🥔➡️ Potato auto-tossed (${reason})`);
      clearTimer();
      setKitchen(kitchen);
    });

    socket.on('potato_to_oven', ({ fromUserId, kitchen }) => {
      console.log('🥔➡️🔥 Potato sent to Global Oven');
      clearTimer();
      setKitchen(kitchen);
    });

    socket.on('session_cancelled', ({ userId, kitchen }) => {
      console.log('❌ Session cancelled');
      clearTimer();
      setKitchen(kitchen);
    });

    // Reaction events
    socket.on('reaction_received', ({ fromUserId, toUserId, reactionType }) => {
      addReaction({ fromUserId, toUserId, reactionType });
    });

    // Achievement events
    socket.on('toppings_earned', ({ toppings }) => {
      console.log('🏆 New toppings earned:', toppings);
      addToppings(toppings);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Socket action methods
  const createKitchen = useCallback((nickname, existingUserId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Not connected'));
        return;
      }

      socketRef.current.emit(
        'create_kitchen',
        { nickname, userId: existingUserId },
        (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  }, []);

  const joinKitchen = useCallback((kitchenCode, nickname, existingUserId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Not connected'));
        return;
      }

      socketRef.current.emit(
        'join_kitchen',
        { kitchenCode, nickname, userId: existingUserId },
        (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  }, []);

  const leaveKitchenSocket = useCallback(() => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ success: true });
        return;
      }

      socketRef.current.emit('leave_kitchen', {}, (response) => {
        leaveKitchen();
        resolve(response);
      });
    });
  }, [leaveKitchen]);

  const startHeating = useCallback((duration) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Not connected'));
        return;
      }

      socketRef.current.emit('start_heating', { duration }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const tossPotato = useCallback((targetUserId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Not connected'));
        return;
      }

      socketRef.current.emit('toss_potato', { targetUserId }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const cancelSession = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Not connected'));
        return;
      }

      socketRef.current.emit('cancel_session', {}, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const sendReaction = useCallback((targetUserId, reactionType) => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ success: false });
        return;
      }

      socketRef.current.emit(
        'send_reaction',
        { targetUserId, reactionType },
        (response) => {
          resolve(response);
        }
      );
    });
  }, []);

  const getKitchenState = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Not connected'));
        return;
      }

      socketRef.current.emit('get_kitchen_state', {}, (response) => {
        if (response.success) {
          setKitchen(response.kitchen);
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, [setKitchen]);

  return {
    socket: socketRef.current,
    createKitchen,
    joinKitchen,
    leaveKitchen: leaveKitchenSocket,
    startHeating,
    tossPotato,
    cancelSession,
    sendReaction,
    getKitchenState,
  };
}

export default useSocket;
