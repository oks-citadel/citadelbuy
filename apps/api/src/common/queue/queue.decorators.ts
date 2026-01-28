import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { JOB_PRIORITY } from './queue.constants';

/**
 * Metadata keys for queue decorators
 */
export const QUEUE_METADATA = {
  JOB_OPTIONS: 'queue:job_options',
  CONCURRENCY: 'queue:concurrency',
  RATE_LIMIT: 'queue:rate_limit',
  PRIORITY: 'queue:priority',
  TIMEOUT: 'queue:timeout',
  RETRYABLE: 'queue:retryable',
  IDEMPOTENT: 'queue:idempotent',
} as const;

/**
 * Options for job processing
 */
export interface JobProcessorOptions {
  /** Job name/type within the queue */
  name?: string;
  /** Number of concurrent jobs */
  concurrency?: number;
  /** Maximum time in ms before job is considered stalled */
  lockDuration?: number;
  /** Renewal interval for lock */
  lockRenewTime?: number;
}

/**
 * Options for rate-limited jobs
 */
export interface RateLimitOptions {
  /** Maximum number of jobs in the window */
  max: number;
  /** Time window in milliseconds */
  duration: number;
}

/**
 * Decorator for processing jobs with specific options
 * Combines @Process with additional metadata
 */
export function ProcessJob(options?: JobProcessorOptions | string) {
  const opts: JobProcessorOptions =
    typeof options === 'string' ? { name: options } : options || {};

  return applyDecorators(
    Process({
      name: opts.name,
      concurrency: opts.concurrency || 1,
    }),
    SetMetadata(QUEUE_METADATA.CONCURRENCY, opts.concurrency || 1),
    SetMetadata(QUEUE_METADATA.JOB_OPTIONS, opts),
  );
}

/**
 * Mark a job as rate-limited
 * Rate limiting is enforced by the processor
 */
export function RateLimited(options: RateLimitOptions) {
  return SetMetadata(QUEUE_METADATA.RATE_LIMIT, options);
}

/**
 * Set job priority
 * Lower number = higher priority
 */
export function Priority(priority: number = JOB_PRIORITY.NORMAL) {
  return SetMetadata(QUEUE_METADATA.PRIORITY, priority);
}

/**
 * Set job timeout
 * Job will fail if it takes longer than specified time
 */
export function Timeout(timeoutMs: number) {
  return SetMetadata(QUEUE_METADATA.TIMEOUT, timeoutMs);
}

/**
 * Mark a job as retryable with specific options
 */
export function Retryable(options: {
  attempts?: number;
  backoffType?: 'fixed' | 'exponential';
  backoffDelay?: number;
}) {
  return SetMetadata(QUEUE_METADATA.RETRYABLE, {
    attempts: options.attempts || 3,
    backoffType: options.backoffType || 'exponential',
    backoffDelay: options.backoffDelay || 10000,
  });
}

/**
 * Mark a job as idempotent
 * Processor should check idempotency before execution
 */
export function Idempotent(keyExtractor?: (data: any) => string) {
  return SetMetadata(QUEUE_METADATA.IDEMPOTENT, {
    enabled: true,
    keyExtractor,
  });
}

/**
 * Combined decorator for high-priority jobs
 */
export function CriticalJob(name?: string) {
  return applyDecorators(
    ProcessJob({ name, concurrency: 1 }),
    Priority(JOB_PRIORITY.CRITICAL),
    Retryable({ attempts: 5, backoffType: 'exponential', backoffDelay: 5000 }),
  );
}

/**
 * Combined decorator for background jobs (low priority)
 */
export function BackgroundJob(name?: string, concurrency: number = 5) {
  return applyDecorators(
    ProcessJob({ name, concurrency }),
    Priority(JOB_PRIORITY.BACKGROUND),
  );
}

/**
 * Combined decorator for scheduled/cron jobs
 */
export function ScheduledJob(name?: string) {
  return applyDecorators(
    ProcessJob({ name, concurrency: 1 }),
    Priority(JOB_PRIORITY.NORMAL),
    Retryable({ attempts: 3 }),
  );
}

/**
 * Decorator for handling queue events with logging
 */
export function OnJobActive() {
  return OnQueueActive();
}

export function OnJobCompleted() {
  return OnQueueCompleted();
}

export function OnJobFailed() {
  return OnQueueFailed();
}

export function OnJobStalled() {
  return OnQueueStalled();
}

/**
 * Type for job data with tenant context
 */
export interface TenantJobData<T = any> {
  tenantId: string;
  organizationId?: string;
  data: T;
  correlationId?: string;
  triggeredBy?: string;
  triggeredAt?: string;
}

/**
 * Type for job result
 */
export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processedAt: string;
  duration: number;
}

/**
 * Base interface for all job processors
 */
export interface IJobProcessor<TData = any, TResult = any> {
  process(data: TData): Promise<TResult>;
}
