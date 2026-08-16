import Redis from 'ioredis';

// Use standard REDIS_URL or fallback to localhost default for MVP/Self-hosting
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared instance for standard operations (Rate Limiting, Replay Protection)
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // BullMQ requires maxRetriesPerRequest to be null
  enableReadyCheck: false,
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected to Redis.');
});

// For BullMQ we need an ioredis instance directly with maxRetriesPerRequest: null
export const bullMQConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
