import { Queue } from 'bullmq';
import { bullMQConnection } from '../../../lib/redis';
import { SecurityContext } from '../../security/WebhookSecurityService';
import { TelematicsProviderType } from '../../../types';

export const TELEMETRY_QUEUE_NAME = 'telemetry-ingestion';

export interface TelemetryJobData {
  provider: TelematicsProviderType;
  rawPayload: any;
  securityContext: SecurityContext;
  correlationId: string;
  receivedAt: number;
  error?: string;
  retryCount?: number;
}

// Queue for distributing telemetry ingestion
export const telemetryQueue = new Queue<TelemetryJobData>(TELEMETRY_QUEUE_NAME, {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 3, // Rule: Retry policy - max attempts 3
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: true, 
    removeOnFail: false, // Keep in queue as 'failed' (DLQ)
  },
});

export async function enqueueTelemetry(jobData: TelemetryJobData): Promise<boolean> {
  try {
    const job = await telemetryQueue.add(TELEMETRY_QUEUE_NAME, jobData, {
      jobId: `telemetry-${jobData.correlationId}`
    });
    return !!job.id;
  } catch (error) {
    console.error(`[TelemetryQueue] Failed to enqueue job for correlationId ${jobData.correlationId}:`, error);
    // Returning false will trigger a 503 from the API, implementing Fail-Closed for the queue.
    return false;
  }
}
