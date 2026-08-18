import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRateLimitStore, MemoryReplayStore, SecurityDecision } from '../SecurityStores';
import { RedisRateLimitStore, RedisReplayStore } from '../RedisStores';
import { redisClient } from '../../../lib/redis';

// Mock Redis client
vi.mock('../../../lib/redis', () => ({
  redisClient: {
    multi: vi.fn(),
    pexpire: vi.fn(),
    set: vi.fn(),
  },
}));

describe('SecurityStores', () => {
  describe('RedisReplayStore', () => {
    let store: RedisReplayStore;

    beforeEach(() => {
      store = new RedisReplayStore();
      vi.clearAllMocks();
    });

    it('should return allowed: true on first event', async () => {
      vi.mocked(redisClient.set).mockResolvedValueOnce('OK');
      const decision = await store.storeIfNotExists('test-key', 1000);
      expect(decision).toEqual({ allowed: true });
      expect(redisClient.set).toHaveBeenCalledWith('test-key', '1', 'PX', 1000, 'NX');
    });

    it('should return REPLAY_DETECTED on duplicate event', async () => {
      vi.mocked(redisClient.set).mockResolvedValueOnce(null as any);
      const decision = await store.storeIfNotExists('test-key', 1000);
      expect(decision).toEqual({ allowed: false, reason: 'REPLAY_DETECTED' });
    });

    it('should return SERVICE_UNAVAILABLE on Redis failure', async () => {
      vi.mocked(redisClient.set).mockRejectedValueOnce(new Error('Connection timeout'));
      const decision = await store.storeIfNotExists('test-key', 1000);
      expect(decision).toEqual({ allowed: false, reason: 'SERVICE_UNAVAILABLE' });
    });

    it('should handle concurrency safely', async () => {
      // Mock one success, then rest fails (typical SET NX behavior)
      vi.mocked(redisClient.set)
        .mockResolvedValueOnce('OK')
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce(null as any);

      const promises = [
        store.storeIfNotExists('concurrent-key', 1000),
        store.storeIfNotExists('concurrent-key', 1000),
        store.storeIfNotExists('concurrent-key', 1000),
      ];

      const results = await Promise.all(promises);
      
      expect(results.filter((r: any) => r.allowed).length).toBe(1);
      expect(results.filter((r: any) => !r.allowed && r.reason === 'REPLAY_DETECTED').length).toBe(2);
    });
  });

  describe('RedisRateLimitStore', () => {
    let store: RedisRateLimitStore;

    beforeEach(() => {
      store = new RedisRateLimitStore();
      vi.clearAllMocks();
    });

    it('should return allowed: true for requests within limit', async () => {
      const mockExec = vi.fn().mockResolvedValue([
        [null, 1], // INCR result
        [null, 1000] // PTTL result
      ]);
      vi.mocked(redisClient.multi).mockReturnValue({
        incr: vi.fn(),
        pttl: vi.fn(),
        exec: mockExec
      } as any);

      const result = await store.checkLimit('rl-key', 10, 60000);
      expect(result.decision).toEqual({ allowed: true });
      expect(result.remaining).toBe(9); // 10 - 1
    });

    it('should return RATE_LIMIT_EXCEEDED when limit is reached', async () => {
      const mockExec = vi.fn().mockResolvedValue([
        [null, 11], // INCR result (exceeds limit 10)
        [null, 1000] 
      ]);
      vi.mocked(redisClient.multi).mockReturnValue({
        incr: vi.fn(),
        pttl: vi.fn(),
        exec: mockExec
      } as any);

      const result = await store.checkLimit('rl-key', 10, 60000);
      expect(result.decision).toEqual({ allowed: false, reason: 'RATE_LIMIT_EXCEEDED' });
      expect(result.remaining).toBe(0);
    });

    it('should return SERVICE_UNAVAILABLE on Redis failure', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('Connection error'));
      vi.mocked(redisClient.multi).mockReturnValue({
        incr: vi.fn(),
        pttl: vi.fn(),
        exec: mockExec
      } as any);

      const result = await store.checkLimit('rl-key', 10, 60000);
      expect(result.decision).toEqual({ allowed: false, reason: 'SERVICE_UNAVAILABLE' });
      expect(result.remaining).toBe(0);
    });
  });
});
