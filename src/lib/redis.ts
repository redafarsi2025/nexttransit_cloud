import Redis from 'ioredis';

// Use standard REDIS_URL or fallback to localhost default for MVP/Self-hosting
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Explicit timeout values for fast failing during webhook ingestion
const connectTimeout = parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10);
const commandTimeout = parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '2000', 10);

// Shared instance for standard operations (Rate Limiting, Replay Protection)
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // BullMQ requires maxRetriesPerRequest to be null
  enableReadyCheck: false,
  connectTimeout,
  commandTimeout,
});

import { logger } from './logger';
import { redisErrorsTotal } from './metrics';

redisClient.on('error', (err: any) => {
  redisErrorsTotal.inc();
  logger.error({ event: 'redis_connection_error', error: err.message }, 'Redis Connection Error');
});

redisClient.on('connect', () => {
  logger.info({ event: 'redis_connected' }, 'Connected to Redis.');
});

// For BullMQ we need an ioredis instance directly with maxRetriesPerRequest: null
export const bullMQConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Let BullMQ handle its own timeouts and retries, standard values here
});
