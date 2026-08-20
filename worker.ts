import { loadEnv } from 'vite';

// Ensure .env is loaded for the worker context
const env = loadEnv('', process.cwd(), '');
Object.assign(process.env, env);
import './src/config/env';
import { validateDatabaseContract } from './src/config/dbValidation';

import { telemetryWorker, queueMetricsCollector } from './src/services/telemetry/queue/TelemetryWorker';
import http from 'http';
import { metricsRegistry, nexttransitBuildInfo } from './src/lib/metrics';

console.log('[Worker] Starting Telemetry Worker...');

// Validate Database Contract asynchronously but blockingly at startup
validateDatabaseContract();

// Start the queue metrics collector (idempotent, unref'd interval)
queueMetricsCollector.start();

// Update Build Info Metric for the worker
nexttransitBuildInfo.set({ version: '2.1.0', environment: process.env.NODE_ENV || 'development', service: 'worker' }, 1);

// Create a mini HTTP server for exposing metrics on port 9091
const METRICS_PORT = 9091;
const metricsServer = http.createServer(async (req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    try {
      res.setHeader('Content-Type', metricsRegistry.contentType);
      const metrics = await metricsRegistry.metrics();
      res.end(metrics);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

metricsServer.listen(METRICS_PORT, '0.0.0.0', () => {
  console.log(`[Worker] Metrics server running on http://0.0.0.0:${METRICS_PORT}`);
});

// Graceful Shutdown handling (Rule 13)
const shutdown = async (signal: string) => {
  console.log(`[Worker] Received ${signal}, starting graceful shutdown...`);
  try {
    // Wait for active jobs to finish
    await telemetryWorker.close();
    await queueMetricsCollector.stop();
    
    // Close the metrics server
    await new Promise<void>((resolve, reject) => {
      metricsServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('[Worker] Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
