import express from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { redisClient } from '../lib/redis';
import { telemetryQueue } from '../services/telemetry/queue/TelemetryQueue';
import { logger } from '../lib/logger';

const healthRouter = express.Router();

/**
 * Executes a promise with a hard timeout.
 */
async function withTimeout<T>(promise: PromiseLike<T> | Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
}

// 1. GET /health/live
// Standard liveness probe: indicates the Node.js process is running and accepting HTTP requests.
healthRouter.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 2. GET /health/ready
// Standard readiness probe: checks critical dependencies (Database, Redis, BullMQ).
healthRouter.get('/ready', async (req, res) => {
  const TIMEOUT_MS = 2000;

  // Initialize status trackers
  let dbStatus = 'ok';
  let redisStatus = 'ok';
  let queueStatus = 'ok';

  // Execute checks in parallel with individual timeouts
  await Promise.allSettled([
    // Check Database: A very lightweight query using the existing singleton
    withTimeout(
      supabaseAdmin.from('telematics_gateways').select('id').limit(1),
      TIMEOUT_MS
    ).then((result) => {
      if ((result as any).error) throw (result as any).error;
    }).catch((err) => {
      dbStatus = 'error';
      logger.warn({ 
        event: 'health_dependency_failed', 
        dependency: 'database', 
        error: err.message === 'TIMEOUT' ? 'TIMEOUT' : 'Connection failed' 
      }, 'Database readiness check failed');
    }),

    // Check Redis: A simple PING using the existing singleton
    withTimeout(redisClient.ping(), TIMEOUT_MS).catch((err) => {
      redisStatus = 'error';
      logger.warn({ 
        event: 'health_dependency_failed', 
        dependency: 'redis', 
        error: err.message === 'TIMEOUT' ? 'TIMEOUT' : 'Connection failed' 
      }, 'Redis readiness check failed');
    }),

    // Check Queue: A non-destructive operation (getJobCounts) to verify BullMQ is operational
    withTimeout(telemetryQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'), TIMEOUT_MS).catch((err) => {
      queueStatus = 'error';
      logger.warn({ 
        event: 'health_dependency_failed', 
        dependency: 'queue', 
        error: err.message === 'TIMEOUT' ? 'TIMEOUT' : 'Connection failed' 
      }, 'BullMQ readiness check failed');
    })
  ]);

  const isReady = dbStatus === 'ok' && redisStatus === 'ok' && queueStatus === 'ok';

  const responseBody = {
    status: isReady ? 'ready' : 'not_ready',
    dependencies: {
      database: dbStatus,
      redis: redisStatus,
      queue: queueStatus
    }
  };

  if (isReady) {
    res.status(200).json(responseBody);
  } else {
    // 503 Service Unavailable if any dependency fails
    res.status(503).json(responseBody);
  }
});

export { healthRouter };
