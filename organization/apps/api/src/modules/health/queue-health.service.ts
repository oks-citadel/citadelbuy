import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobCounts } from 'bull';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { QUEUES, QueueName } from '@/common/queue/queue.constants';

/**
 * Queue health status
 */
export interface QueueHealthStatus {
  /** Queue name */
  name: string;
  /** Whether the queue is connected */
  connected: boolean;
  /** Job counts */
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  /** Workers count */
  workers: number;
  /** Whether the queue is healthy */
  healthy: boolean;
  /** Health message */
  message?: string;
}

/**
 * Queue health thresholds
 */
export interface QueueHealthThresholds {
  /** Maximum waiting jobs before warning */
  maxWaiting?: number;
  /** Maximum active jobs */
  maxActive?: number;
  /** Maximum failed jobs */
  maxFailed?: number;
  /** Maximum job age in seconds */
  maxJobAge?: number;
}

const DEFAULT_THRESHOLDS: QueueHealthThresholds = {
  maxWaiting: 1000,
  maxActive: 100,
  maxFailed: 50,
  maxJobAge: 3600, // 1 hour
};

/**
 * Queue Health Indicator
 *
 * Provides health checks for BullMQ queues:
 * - Queue connectivity
 * - Job backlog monitoring
 * - Failed job alerts
 * - Worker availability
 */
@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(QueueHealthIndicator.name);

  constructor(
    @InjectQueue(QUEUES.FX_REFRESH)
    private readonly fxQueue: Queue,
    @InjectQueue(QUEUES.TRANSLATION)
    private readonly translationQueue: Queue,
    @InjectQueue(QUEUES.PRODUCT_SYNC)
    private readonly productSyncQueue: Queue,
    @InjectQueue(QUEUES.SITEMAP)
    private readonly sitemapQueue: Queue,
    @InjectQueue(QUEUES.DOMAIN_VERIFICATION)
    private readonly domainVerificationQueue: Queue,
  ) {
    super();
  }

  /**
   * Get all queue instances
   */
  private getQueues(): Map<string, Queue> {
    return new Map([
      [QUEUES.FX_REFRESH, this.fxQueue],
      [QUEUES.TRANSLATION, this.translationQueue],
      [QUEUES.PRODUCT_SYNC, this.productSyncQueue],
      [QUEUES.SITEMAP, this.sitemapQueue],
      [QUEUES.DOMAIN_VERIFICATION, this.domainVerificationQueue],
    ]);
  }

  /**
   * Check if all queues are healthy
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const queues = this.getQueues();
    const results: Record<string, any> = {};
    let isHealthy = true;
    const errors: string[] = [];

    for (const [name, queue] of queues) {
      try {
        const status = await this.getQueueHealth(queue, name, DEFAULT_THRESHOLDS);
        results[name] = {
          status: status.healthy ? 'up' : 'degraded',
          ...status.counts,
          workers: status.workers,
        };

        if (!status.healthy) {
          isHealthy = false;
          if (status.message) {
            errors.push(`${name}: ${status.message}`);
          }
        }
      } catch (error) {
        results[name] = {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        isHealthy = false;
        errors.push(`${name}: Connection failed`);
      }
    }

    const result = this.getStatus(key, isHealthy, results);

    if (!isHealthy) {
      throw new HealthCheckError('Queue health check failed', result);
    }

    return result;
  }

  /**
   * Check health of a specific queue
   */
  async checkQueue(
    queueName: string,
    thresholds?: QueueHealthThresholds,
  ): Promise<HealthIndicatorResult> {
    const queues = this.getQueues();
    const queue = queues.get(queueName);

    if (!queue) {
      throw new HealthCheckError(
        `Unknown queue: ${queueName}`,
        this.getStatus(queueName, false, { error: 'Queue not found' }),
      );
    }

    const status = await this.getQueueHealth(
      queue,
      queueName,
      thresholds || DEFAULT_THRESHOLDS,
    );

    const result = this.getStatus(queueName, status.healthy, {
      ...status.counts,
      workers: status.workers,
      message: status.message,
    });

    if (!status.healthy) {
      throw new HealthCheckError(`Queue ${queueName} is unhealthy`, result);
    }

    return result;
  }

  /**
   * Get health status for a queue
   */
  async getQueueHealth(
    queue: Queue,
    name: string,
    thresholds: QueueHealthThresholds,
  ): Promise<QueueHealthStatus> {
    try {
      // Get job counts
      const counts = await queue.getJobCounts();

      // Check if Redis is connected
      const client = queue.client;
      const connected = client.status === 'ready';

      // Get worker count
      const workers = await queue.getWorkers();

      // Determine health status
      let healthy = true;
      const messages: string[] = [];

      if (!connected) {
        healthy = false;
        messages.push('Redis not connected');
      }

      if (thresholds.maxWaiting && counts.waiting > thresholds.maxWaiting) {
        healthy = false;
        messages.push(`High backlog: ${counts.waiting} waiting jobs`);
      }

      if (thresholds.maxFailed && counts.failed > thresholds.maxFailed) {
        healthy = false;
        messages.push(`Too many failed jobs: ${counts.failed}`);
      }

      if (workers.length === 0 && (counts.waiting > 0 || counts.active > 0)) {
        healthy = false;
        messages.push('No workers available');
      }

      return {
        name,
        connected,
        counts: {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
          paused: (counts as any).paused || 0,
        },
        workers: workers.length,
        healthy,
        message: messages.length > 0 ? messages.join('; ') : undefined,
      };
    } catch (error) {
      return {
        name,
        connected: false,
        counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
        workers: 0,
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get detailed stats for all queues
   */
  async getAllQueueStats(): Promise<QueueHealthStatus[]> {
    const queues = this.getQueues();
    const stats: QueueHealthStatus[] = [];

    for (const [name, queue] of queues) {
      const status = await this.getQueueHealth(queue, name, DEFAULT_THRESHOLDS);
      stats.push(status);
    }

    return stats;
  }

  /**
   * Get summary of all queues
   */
  async getQueuesSummary(): Promise<{
    totalQueues: number;
    healthyQueues: number;
    totalWaiting: number;
    totalActive: number;
    totalFailed: number;
    queues: Record<string, { waiting: number; active: number; failed: number; healthy: boolean }>;
  }> {
    const stats = await this.getAllQueueStats();

    const summary = {
      totalQueues: stats.length,
      healthyQueues: stats.filter((s) => s.healthy).length,
      totalWaiting: stats.reduce((sum, s) => sum + s.counts.waiting, 0),
      totalActive: stats.reduce((sum, s) => sum + s.counts.active, 0),
      totalFailed: stats.reduce((sum, s) => sum + s.counts.failed, 0),
      queues: {} as Record<string, any>,
    };

    for (const stat of stats) {
      summary.queues[stat.name] = {
        waiting: stat.counts.waiting,
        active: stat.counts.active,
        failed: stat.counts.failed,
        healthy: stat.healthy,
      };
    }

    return summary;
  }

  /**
   * Clean failed jobs from a queue
   */
  async cleanFailedJobs(queueName: string, gracePeriod: number = 86400000): Promise<number> {
    const queues = this.getQueues();
    const queue = queues.get(queueName);

    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const cleaned = await queue.clean(gracePeriod, 'failed');
    this.logger.log(`Cleaned ${cleaned.length} failed jobs from ${queueName}`);
    return cleaned.length;
  }

  /**
   * Clean completed jobs from a queue
   */
  async cleanCompletedJobs(queueName: string, gracePeriod: number = 3600000): Promise<number> {
    const queues = this.getQueues();
    const queue = queues.get(queueName);

    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const cleaned = await queue.clean(gracePeriod, 'completed');
    this.logger.log(`Cleaned ${cleaned.length} completed jobs from ${queueName}`);
    return cleaned.length;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queues = this.getQueues();
    const queue = queues.get(queueName);

    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    await queue.pause();
    this.logger.warn(`Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queues = this.getQueues();
    const queue = queues.get(queueName);

    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }
}
