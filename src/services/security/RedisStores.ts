import { RateLimitResult, RateLimitStore, ReplayStore } from './SecurityStores';
import { redisClient } from '../../lib/redis';

export class RedisRateLimitStore implements RateLimitStore {
  async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const resetAt = now + windowMs;
      
      // Use multi to execute commands atomically
      const multi = redisClient.multi();
      multi.incr(key);
      multi.pttl(key);
      
      const results = await multi.exec();
      
      if (!results) {
        // Fail-closed if Redis pipeline fails
        return { allowed: false, remaining: 0, resetAt };
      }
      
      const count = results[0][1] as number;
      const ttl = results[1][1] as number;
      
      // If the key has no TTL (-1), set it
      if (ttl === -1) {
        await redisClient.pexpire(key, windowMs);
      }
      
      if (count <= limit) {
        return { allowed: true, remaining: limit - count, resetAt: ttl > 0 ? now + ttl : resetAt };
      }
      
      return { allowed: false, remaining: 0, resetAt: ttl > 0 ? now + ttl : resetAt };
    } catch (error) {
      console.error(`[RedisRateLimitStore] Error checking limit for ${key}:`, error);
      // FAIL-CLOSED POLICY (Rule 5/11): If Redis is down, reject requests
      return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
    }
  }
}

export class RedisReplayStore implements ReplayStore {
  async storeIfNotExists(key: string, ttlMs: number): Promise<boolean> {
    try {
      // SETNX: Sets the key if it does not exist. Returns 1 if set, 0 if it already existed.
      // We use PX to set the expiration in milliseconds atomically in Redis 2.6.12+ 
      // Actually ioredis supports 'PX' argument on SET: SET key value PX ttl NX
      const result = await redisClient.set(key, '1', 'PX', ttlMs, 'NX');
      
      if (result === 'OK') {
        return true; // Key was set, not a replay
      }
      
      return false; // Key already existed, replay detected
    } catch (error) {
      console.error(`[RedisReplayStore] Error checking replay for ${key}:`, error);
      // FAIL-CLOSED POLICY (Rule 5/11): If Redis is down, consider it a replay (reject)
      return false; 
    }
  }
}
