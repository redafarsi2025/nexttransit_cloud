import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

// ============================================================================
// 1. REGISTRE CENTRAL
// ============================================================================
export const metricsRegistry = new Registry();

// Collecte des métriques système par défaut (CPU, Mémoire, Event Loop)
collectDefaultMetrics({ register: metricsRegistry });

// ============================================================================
// 2. MÉTRIQUES HTTP (API)
// ============================================================================
export const httpRequestsTotal = new Counter({
  name: 'nexttransit_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [metricsRegistry]
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'nexttransit_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

// ============================================================================
// 3. MÉTRIQUES TÉLÉMÉTRIE
// ============================================================================
export const telemetryWebhooksTotal = new Counter({
  name: 'nexttransit_telemetry_webhooks_total',
  help: 'Total number of telemetry webhooks received',
  labelNames: ['provider', 'status'] as const,
  registers: [metricsRegistry]
});

export const telemetryProcessingDurationSeconds = new Histogram({
  name: 'nexttransit_telemetry_processing_duration_seconds',
  help: 'Duration of telemetry processing by the worker in seconds',
  labelNames: ['provider'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

// ============================================================================
// 4. MÉTRIQUES BULLMQ (QUEUE)
// ============================================================================
export const bullmqJobsTotal = new Counter({
  name: 'nexttransit_bullmq_jobs_total',
  help: 'Total number of BullMQ jobs processed',
  labelNames: ['queue', 'status'] as const, // status: enqueued | started | completed | failed
  registers: [metricsRegistry]
});

export const bullmqJobsWaiting = new Gauge({
  name: 'nexttransit_bullmq_jobs_waiting',
  help: 'Current number of waiting jobs in BullMQ',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry]
});

export const bullmqJobsActive = new Gauge({
  name: 'nexttransit_bullmq_jobs_active',
  help: 'Current number of active jobs in BullMQ',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry]
});

export const bullmqJobsDelayed = new Gauge({
  name: 'nexttransit_bullmq_jobs_delayed',
  help: 'Current number of delayed jobs in BullMQ',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry]
});

export const bullmqJobsFailed = new Gauge({
  name: 'nexttransit_bullmq_jobs_failed',
  help: 'Current number of failed jobs in BullMQ',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry]
});

// ============================================================================
// 5. MÉTRIQUES SÉCURITÉ & INFRASTRUCTURE
// ============================================================================
export const securityRejectsTotal = new Counter({
  name: 'nexttransit_security_rejects_total',
  help: 'Total number of webhooks rejected by security rules',
  labelNames: ['provider', 'reason'] as const,
  registers: [metricsRegistry]
});

export const securityServiceUnavailableTotal = new Counter({
  name: 'nexttransit_security_service_unavailable_total',
  help: 'Business impact: total number of requests aborted due to infrastructure unavailability (e.g. Redis)',
  labelNames: ['provider'] as const,
  registers: [metricsRegistry]
});

export const redisErrorsTotal = new Counter({
  name: 'nexttransit_redis_errors_total',
  help: 'Infrastructure: total number of pure Redis connection/command errors',
  registers: [metricsRegistry]
});

export const nexttransitBuildInfo = new Gauge({
  name: 'nexttransit_build_info',
  help: 'Build and version information',
  labelNames: ['version', 'environment', 'service'] as const,
  registers: [metricsRegistry]
});

// ============================================================================
// 6. UTILITAIRES DE TEST
// ============================================================================

/**
 * Réinitialise tous les compteurs sans détruire leur enregistrement.
 * À appeler dans beforeEach() pour les tests unitaires.
 */
export function resetMetrics(): void {
  metricsRegistry.resetMetrics();
}
