import { Queue } from 'bullmq';
import { logger } from '../../../lib/logger';
import {
  bullmqJobsWaiting,
  bullmqJobsActive,
  bullmqJobsDelayed,
  bullmqJobsFailed
} from '../../../lib/metrics';

export class QueueMetricsCollector {
  private interval?: NodeJS.Timeout;
  private queue: Queue;
  private queueName: string;
  private intervalMs: number;

  constructor(queue: Queue, intervalMs: number = 15_000) {
    this.queue = queue;
    this.queueName = queue.name;
    this.intervalMs = intervalMs;
  }

  /**
   * Démarre la collecte périodique des métriques de la queue.
   * Cette méthode est idempotente.
   */
  public start(): void {
    if (this.interval) {
      return;
    }

    logger.info({
      event: 'queue_metrics_collector_start',
      queue: this.queueName,
      msg: `Starting BullMQ metrics collector for queue ${this.queueName}`
    });

    // Première collecte immédiate
    void this.collect();

    // Collectes périodiques
    this.interval = setInterval(() => {
      void this.collect();
    }, this.intervalMs);

    // Ne pas empêcher le graceful shutdown de Node.js
    this.interval.unref();
  }

  /**
   * Arrête la collecte périodique.
   */
  public async stop(): Promise<void> {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = undefined;

    logger.info({
      event: 'queue_metrics_collector_stop',
      queue: this.queueName,
      msg: `Stopped BullMQ metrics collector for queue ${this.queueName}`
    });
  }

  /**
   * Interroge BullMQ et met à jour les jauges Prometheus.
   */
  private async collect(): Promise<void> {
    try {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
      
      bullmqJobsWaiting.set({ queue: this.queueName }, counts.waiting);
      bullmqJobsActive.set({ queue: this.queueName }, counts.active);
      bullmqJobsDelayed.set({ queue: this.queueName }, counts.delayed);
      bullmqJobsFailed.set({ queue: this.queueName }, counts.failed);

    } catch (error) {
      logger.error({
        event: 'queue_metrics_collector_error',
        queue: this.queueName,
        error: error instanceof Error ? error.message : String(error),
        msg: 'Failed to collect BullMQ metrics'
      });
    }
  }
}
