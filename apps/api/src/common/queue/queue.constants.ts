/**
 * Queue Configuration Constants
 * Central definition for all background job queues in the platform
 */

/**
 * Queue names for BullMQ
 * Each queue handles a specific type of background work
 */
export const QUEUES = {
  /** FX rate refresh - fetches and caches currency exchange rates */
  FX_REFRESH: 'fx-refresh',
  /** Translation jobs - auto-translate product content using LLM */
  TRANSLATION: 'translation',
  /** Product sync - synchronize products from external sources */
  PRODUCT_SYNC: 'product-sync',
  /** Sitemap generation - create per-locale sitemaps for tenants */
  SITEMAP: 'sitemap-generation',
  /** Domain verification - verify custom domain DNS configuration */
  DOMAIN_VERIFICATION: 'domain-verification',
  /** Email sending - background email dispatch */
  EMAIL: 'email',
  /** Notification - push notifications and alerts */
  NOTIFICATION: 'notification',
  /** Analytics - background analytics processing */
  ANALYTICS: 'analytics',
  /** Image processing - resize, optimize, and transform images */
  IMAGE_PROCESSING: 'image-processing',
  /** Webhook delivery - reliable webhook event delivery */
  WEBHOOK_DELIVERY: 'webhook-delivery',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Job priority levels
 * Lower number = higher priority
 */
export const JOB_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 5,
  LOW: 10,
  BACKGROUND: 20,
} as const;

export type JobPriority = (typeof JOB_PRIORITY)[keyof typeof JOB_PRIORITY];

/**
 * Default job options for different queue types
 */
export const DEFAULT_JOB_OPTIONS = {
  /** FX refresh - run frequently, quick timeout */
  [QUEUES.FX_REFRESH]: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // 5 seconds
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
    timeout: 30000, // 30 seconds
  },
  /** Translation - longer timeout for LLM calls */
  [QUEUES.TRANSLATION]: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 10000, // 10 seconds
    },
    removeOnComplete: 100,
    removeOnFail: 500,
    timeout: 120000, // 2 minutes for LLM translation
  },
  /** Product sync - medium timeout */
  [QUEUES.PRODUCT_SYNC]: {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 30000, // 30 seconds
    },
    removeOnComplete: 50,
    removeOnFail: 200,
    timeout: 300000, // 5 minutes for large syncs
  },
  /** Sitemap generation - longer timeout, run less frequently */
  [QUEUES.SITEMAP]: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 60000, // 1 minute
    },
    removeOnComplete: 20,
    removeOnFail: 100,
    timeout: 600000, // 10 minutes for large sitemaps
  },
  /** Domain verification - quick check, retry often */
  [QUEUES.DOMAIN_VERIFICATION]: {
    attempts: 10,
    backoff: {
      type: 'exponential' as const,
      delay: 60000, // 1 minute base delay
    },
    removeOnComplete: 100,
    removeOnFail: 500,
    timeout: 30000, // 30 seconds
  },
  /** Default options for other queues */
  default: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
    timeout: 60000,
  },
} as const;

/**
 * Queue rate limiting configuration
 * Prevents overwhelming external services
 */
export const QUEUE_RATE_LIMITS = {
  /** FX API rate limits */
  [QUEUES.FX_REFRESH]: {
    max: 10, // Max 10 jobs
    duration: 60000, // Per minute
  },
  /** LLM translation rate limits */
  [QUEUES.TRANSLATION]: {
    max: 50, // Max 50 translations
    duration: 60000, // Per minute
  },
  /** External API sync limits */
  [QUEUES.PRODUCT_SYNC]: {
    max: 20,
    duration: 60000,
  },
  /** Domain DNS lookup limits */
  [QUEUES.DOMAIN_VERIFICATION]: {
    max: 30,
    duration: 60000,
  },
} as const;

/**
 * Cron schedules for recurring jobs
 */
export const CRON_SCHEDULES = {
  /** FX refresh every 15 minutes */
  FX_REFRESH: '*/15 * * * *',
  /** Product delta sync every 6 hours */
  PRODUCT_SYNC_DELTA: '0 */6 * * *',
  /** Full product sync daily at 2 AM UTC */
  PRODUCT_SYNC_FULL: '0 2 * * *',
  /** Sitemap generation daily at 3 AM UTC */
  SITEMAP_GENERATION: '0 3 * * *',
  /** Domain verification every 5 minutes for pending */
  DOMAIN_VERIFICATION: '*/5 * * * *',
  /** Cleanup old jobs weekly on Sunday at 4 AM UTC */
  JOB_CLEANUP: '0 4 * * 0',
} as const;

/**
 * Job event names for logging/monitoring
 */
export const JOB_EVENTS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  STALLED: 'stalled',
  PROGRESS: 'progress',
  ACTIVE: 'active',
  WAITING: 'waiting',
  DELAYED: 'delayed',
  REMOVED: 'removed',
} as const;

/**
 * Translation status lifecycle
 */
export const TRANSLATION_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  AUTO_TRANSLATED: 'AUTO_TRANSLATED',
  VENDOR_REVIEW: 'VENDOR_REVIEW',
  VENDOR_APPROVED: 'VENDOR_APPROVED',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const;

export type TranslationStatus =
  (typeof TRANSLATION_STATUS)[keyof typeof TRANSLATION_STATUS];

/**
 * Domain verification status
 */
export const DOMAIN_STATUS = {
  PENDING: 'PENDING',
  VERIFYING: 'VERIFYING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const;

export type DomainStatus = (typeof DOMAIN_STATUS)[keyof typeof DOMAIN_STATUS];

/**
 * Product sync status
 */
export const SYNC_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];
