import { Worker, Job } from 'bullmq';
import { bullMQConnection } from '../../../lib/redis';
import { TELEMETRY_QUEUE_NAME, TelemetryJobData } from './TelemetryQueue';
import { processTelemetryWebhook } from '../TelemetryIngestionService';

export const telemetryWorker = new Worker<TelemetryJobData>(
  TELEMETRY_QUEUE_NAME,
  async (job: Job<TelemetryJobData>) => {
    const { provider, rawPayload, securityContext, correlationId, receivedAt } = job.data;
    const start = Date.now();
    const queueLatency = start - receivedAt;

    try {
      // Execute the heavy ingestion pipeline
      await processTelemetryWebhook(rawPayload, provider, securityContext);
      
      const processingLatency = Date.now() - start;
      console.log(`[Worker] Job ${job.id} (Corr: ${correlationId}) completed in ${processingLatency}ms (Q-Latency: ${queueLatency}ms)`);
      
    } catch (error: any) {
      // Attach metadata for DLQ inspection
      job.updateData({
        ...job.data,
        error: error.message,
        retryCount: job.attemptsMade + 1,
      });

      console.error(`[Worker] Job ${job.id} (Corr: ${correlationId}) failed on attempt ${job.attemptsMade + 1}: ${error.message}`);
      // Throwing the error signals BullMQ to retry or move to failed status
      throw error;
    }
  },
  {
    connection: bullMQConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '10', 10),
  }
);

telemetryWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`[Worker] DLQ: Job ${job.id} definitively failed after ${job.attemptsMade} attempts. Provider: ${job.data.provider}, Error: ${err.message}`);
  }
});
