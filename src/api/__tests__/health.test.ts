import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { healthRouter } from '../healthRouter';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redisClient } from '../../lib/redis';
import { telemetryQueue } from '../../services/telemetry/queue/TelemetryQueue';

vi.mock('../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [{ id: 'mock' }], error: null })
  }
}));

vi.mock('../../lib/redis', () => ({
  redisClient: {
    ping: vi.fn().mockResolvedValue('PONG')
  }
}));

vi.mock('../../services/telemetry/queue/TelemetryQueue', () => ({
  telemetryQueue: {
    getJobCounts: vi.fn().mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0 })
  }
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('Health Router (LOT 2F-02)', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use('/health', healthRouter);
  });

  describe('GET /health/live', () => {
    it('should return 200 OK immediately', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
      
      // Verification that no dependencies are called
      expect(redisClient.ping).not.toHaveBeenCalled();
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
      expect(telemetryQueue.getJobCounts).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 OK when all dependencies are healthy', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ready',
        dependencies: {
          database: 'ok',
          redis: 'ok',
          queue: 'ok'
        }
      });
    });

    it('should return 503 if database check fails', async () => {
      ((supabaseAdmin as any).limit).mockResolvedValueOnce({ error: new Error('DB Error') });
      const res = await request(app).get('/health/ready');
      
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body.dependencies.database).toBe('error');
      
      // Should not leak internal error messages in the response
      expect(res.text).not.toContain('DB Error');
    });

    it('should return 503 if redis check fails', async () => {
      (redisClient.ping as any).mockRejectedValueOnce(new Error('Redis Down'));
      const res = await request(app).get('/health/ready');
      
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body.dependencies.redis).toBe('error');
      expect(res.text).not.toContain('Redis Down');
    });

    it('should return 503 if queue check fails', async () => {
      (telemetryQueue.getJobCounts as any).mockRejectedValueOnce(new Error('Queue Down'));
      const res = await request(app).get('/health/ready');
      
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body.dependencies.queue).toBe('error');
      expect(res.text).not.toContain('Queue Down');
    });

    it('should return 503 on database timeout', async () => {
      // Simulate timeout by never resolving
      ((supabaseAdmin as any).limit).mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 3000)));
      
      const start = Date.now();
      const res = await request(app).get('/health/ready');
      const duration = Date.now() - start;

      expect(res.status).toBe(503);
      expect(res.body.dependencies.database).toBe('error');
      // Should return near the 2000ms boundary (with some tolerance)
      expect(duration).toBeGreaterThanOrEqual(1900);
      expect(duration).toBeLessThan(2500);
    });
  });
});
