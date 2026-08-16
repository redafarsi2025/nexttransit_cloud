import { loadEnv } from 'vite';

// Ensure .env is loaded for the worker context
const env = loadEnv('', process.cwd(), '');
Object.assign(process.env, env);

import { telemetryWorker } from './src/services/telemetry/queue/TelemetryWorker';

console.log('[Worker] Starting Telemetry Worker...');

// Graceful Shutdown handling (Rule 13)
const shutdown = async (signal: string) => {
  console.log(`[Worker] Received ${signal}, starting graceful shutdown...`);
  try {
    // Wait for active jobs to finish
    await telemetryWorker.close();
    console.log('[Worker] Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
