import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client singleton
let redis = null;

export async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    console.log('🔴 Redis connected');
  });

  await redis.connect();
  return redis;
}

// ═══════════════════════════════════════════════════════════════
// KITCHEN (ROOM) OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function createKitchen(code, creatorId) {
  const kitchenKey = `kitchen:${code}`;
  const membersKey = `kitchen:${code}:members`;
  
  await redis.hset(kitchenKey, {
    code,
    createdAt: Date.now(),
    createdBy: creatorId,
    potatoHolder: null,
    potatoState: 'IDLE', // IDLE, HEATING, CRITICAL, COOLING
    timerStartedAt: null,
    timerDuration: 25 * 60 * 1000, // 25 minutes default
    breakDuration: 5 * 60 * 1000   // 5 minutes default
  });
  
  // Set kitchen to expire after 24 hours of inactivity
  await redis.expire(kitchenKey, 86400);
  await redis.expire(membersKey, 86400);
  
  return { code, kitchenKey };
}

export async function getKitchen(code) {
  const kitchenKey = `kitchen:${code}`;
  const data = await redis.hgetall(kitchenKey);
  
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  
  // Get members
  const members = await getKitchenMembers(code);
  
  return {
    ...data,
    timerDuration: parseInt(data.timerDuration),
    breakDuration: parseInt(data.breakDuration),
    timerStartedAt: data.timerStartedAt ? parseInt(data.timerStartedAt) : null,
    createdAt: parseInt(data.createdAt),
    members
  };
}

export async function updateKitchen(code, updates) {
  const kitchenKey = `kitchen:${code}`;
  await redis.hset(kitchenKey, updates);
  // Refresh TTL on activity
  await redis.expire(kitchenKey, 86400);
}

export async function deleteKitchen(code) {
  const kitchenKey = `kitchen:${code}`;
  const membersKey = `kitchen:${code}:members`;
  await redis.del(kitchenKey, membersKey);
}

// ═══════════════════════════════════════════════════════════════
// MEMBER OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function addMemberToKitchen(code, member) {
  const membersKey = `kitchen:${code}:members`;
  const memberKey = `kitchen:${code}:member:${member.id}`;
  
  // Store member data
  await redis.hset(memberKey, {
    id: member.id,
    nickname: member.nickname,
    socketId: member.socketId,
    state: 'IDLE', // IDLE, HEATING, CRITICAL, COOLING
    joinedAt: Date.now(),
    joulesEarned: 0,
    potatoesBaked: 0
  });
  
  // Add to members set
  await redis.sadd(membersKey, member.id);
  
  // Set TTL
  await redis.expire(memberKey, 86400);
  await redis.expire(membersKey, 86400);
}

export async function removeMemberFromKitchen(code, memberId) {
  const membersKey = `kitchen:${code}:members`;
  const memberKey = `kitchen:${code}:member:${memberId}`;
  
  await redis.srem(membersKey, memberId);
  await redis.del(memberKey);
}

export async function getMember(code, memberId) {
  const memberKey = `kitchen:${code}:member:${memberId}`;
  const data = await redis.hgetall(memberKey);
  
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  
  return {
    ...data,
    joinedAt: parseInt(data.joinedAt),
    joulesEarned: parseInt(data.joulesEarned || 0),
    potatoesBaked: parseInt(data.potatoesBaked || 0)
  };
}

export async function updateMember(code, memberId, updates) {
  const memberKey = `kitchen:${code}:member:${memberId}`;
  await redis.hset(memberKey, updates);
}

export async function getKitchenMembers(code) {
  const membersKey = `kitchen:${code}:members`;
  const memberIds = await redis.smembers(membersKey);
  
  const members = await Promise.all(
    memberIds.map(id => getMember(code, id))
  );
  
  return members.filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════
// SOCKET MAPPING
// ═══════════════════════════════════════════════════════════════

export async function mapSocketToUser(socketId, userId, kitchenCode) {
  await redis.hset(`socket:${socketId}`, {
    userId,
    kitchenCode
  });
  await redis.expire(`socket:${socketId}`, 86400);
}

export async function getSocketMapping(socketId) {
  return redis.hgetall(`socket:${socketId}`);
}

export async function removeSocketMapping(socketId) {
  return redis.del(`socket:${socketId}`);
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL OVEN (Shared Pool)
// ═══════════════════════════════════════════════════════════════

export async function addToGlobalOven(kitchenCode) {
  await redis.zadd('global:oven', Date.now(), kitchenCode);
}

export async function popFromGlobalOven() {
  // Get and remove the oldest potato in the oven
  const result = await redis.zpopmin('global:oven');
  return result.length > 0 ? result[0] : null;
}

export { redis };
