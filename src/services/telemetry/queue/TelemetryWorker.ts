import { Worker, Job } from 'bullmq';
import { bullMQConnection } from '../../../lib/redis';
import { TELEMETRY_QUEUE_NAME, TelemetryJobData } from './TelemetryQueue';
import { processTelemetryWebhook } from '../TelemetryIngestionService';
import { logger } from '../../../lib/logger';
import { runWithContext } from '../../../middleware/requestContext';
import { bullmqJobsTotal, telemetryProcessingDurationSeconds } from '../../../lib/metrics';
import { telemetryQueue } from './TelemetryQueue';
import { QueueMetricsCollector } from './QueueMetricsCollector';

export const queueMetricsCollector = new QueueMetricsCollector(telemetryQueue);

export const telemetryWorker = new Worker<TelemetryJobData>(
  TELEMETRY_QUEUE_NAME,
  async (job: Job<TelemetryJobData>) => {
    const { provider, rawPayload, securityContext, correlationId, receivedAt } = job.data;
    
    // Inject correlationId into the execution context
    return runWithContext({ request_id: correlationId }, async () => {
      const start = Date.now();
      const queueLatency = start - receivedAt;

      bullmqJobsTotal.inc({ queue: TELEMETRY_QUEUE_NAME, status: 'started' });
      const endTimer = telemetryProcessingDurationSeconds.startTimer({ provider });

      logger.info({ event: 'telemetry_worker_job_started', jobId: job.id, provider, queueLatency }, 'Worker started processing job');

      try {
        // Execute the heavy ingestion pipeline
        await processTelemetryWebhook(rawPayload, provider, securityContext);
        
        endTimer();
        bullmqJobsTotal.inc({ queue: TELEMETRY_QUEUE_NAME, status: 'completed' });
        const processingLatency = Date.now() - start;
        logger.info({ event: 'telemetry_worker_job_completed', jobId: job.id, provider, processingLatency, queueLatency }, 'Worker completed job successfully');
        
      } catch (error: any) {
        // Attach metadata for DLQ inspection
        job.updateData({
          ...job.data,
          error: error.message,
          retryCount: job.attemptsMade + 1,
        });

        logger.error({ event: 'telemetry_worker_job_failed', jobId: job.id, provider, attempts: job.attemptsMade + 1, error: error.message }, 'Worker failed to process job');
        // Throwing the error signals BullMQ to retry or move to failed status
        
        endTimer();
        bullmqJobsTotal.inc({ queue: TELEMETRY_QUEUE_NAME, status: 'failed' });
        throw error;
      }
    });
  },
  {
    connection: bullMQConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '10', 10),
  }
);

telemetryWorker.on('failed', (job, err) => {
  if (job) {
    logger.error({ event: 'telemetry_worker_job_dlq', jobId: job.id, provider: job.data.provider, attempts: job.attemptsMade, error: err.message }, 'Job definitively failed and moved to DLQ');
  }
});
