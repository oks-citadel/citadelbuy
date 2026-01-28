import { Module, Global, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { QUEUES, DEFAULT_JOB_OPTIONS, QUEUE_RATE_LIMITS } from './queue.constants';

/**
 * Queue configuration options
 */
export interface QueueModuleOptions {
  /** Redis connection string (overrides individual options) */
  redisUrl?: string;
  /** Redis host */
  host?: string;
  /** Redis port */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database number */
  db?: number;
  /** Key prefix for all queues */
  prefix?: string;
  /** Default job options */
  defaultJobOptions?: Record<string, any>;
}

/**
 * Global Queue Module
 * Provides BullMQ queues for background job processing
 *
 * Features:
 * - Redis-backed job queues
 * - Retry with exponential backoff
 * - Rate limiting
 * - Job priorities
 * - Delayed jobs
 * - Cron-scheduled jobs
 */
@Global()
@Module({})
export class QueueModule {
  /**
   * Register the queue module with Redis connection from environment
   */
  static forRoot(): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        // Configure Bull with Redis connection
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisUrl = configService.get<string>('REDIS_URL');

            if (redisUrl) {
              // Parse Redis URL
              const url = new URL(redisUrl);
              return {
                redis: {
                  host: url.hostname,
                  port: parseInt(url.port, 10) || 6379,
                  password: url.password || undefined,
                  db: parseInt(url.pathname?.slice(1) || '0', 10),
                },
                prefix: configService.get<string>('QUEUE_PREFIX', 'broxiva:queue'),
                defaultJobOptions: DEFAULT_JOB_OPTIONS.default,
              };
            }

            return {
              redis: {
                host: configService.get<string>('REDIS_HOST', 'localhost'),
                port: configService.get<number>('REDIS_PORT', 6379),
                password: configService.get<string>('REDIS_PASSWORD'),
                db: configService.get<number>('REDIS_QUEUE_DB', 1), // Use separate DB for queues
              },
              prefix: configService.get<string>('QUEUE_PREFIX', 'broxiva:queue'),
              defaultJobOptions: DEFAULT_JOB_OPTIONS.default,
            };
          },
        }),

        // Register all queues
        BullModule.registerQueue(
          {
            name: QUEUES.FX_REFRESH,
            defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUES.FX_REFRESH],
            limiter: QUEUE_RATE_LIMITS[QUEUES.FX_REFRESH],
          },
          {
            name: QUEUES.TRANSLATION,
            defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUES.TRANSLATION],
            limiter: QUEUE_RATE_LIMITS[QUEUES.TRANSLATION],
          },
          {
            name: QUEUES.PRODUCT_SYNC,
            defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUES.PRODUCT_SYNC],
            limiter: QUEUE_RATE_LIMITS[QUEUES.PRODUCT_SYNC],
          },
          {
            name: QUEUES.SITEMAP,
            defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUES.SITEMAP],
          },
          {
            name: QUEUES.DOMAIN_VERIFICATION,
            defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUES.DOMAIN_VERIFICATION],
            limiter: QUEUE_RATE_LIMITS[QUEUES.DOMAIN_VERIFICATION],
          },
          {
            name: QUEUES.EMAIL,
            defaultJobOptions: DEFAULT_JOB_OPTIONS.default,
          },
          {
            name: QUEUES.NOTIFICATION,
            defaultJobOptions: DEFAULT_JOB_OPTIONS.default,
          },
          {
            name: QUEUES.ANALYTICS,
            defaultJobOptions: DEFAULT_JOB_OPTIONS.default,
          },
          {
            name: QUEUES.IMAGE_PROCESSING,
            defaultJobOptions: DEFAULT_JOB_OPTIONS.default,
          },
          {
            name: QUEUES.WEBHOOK_DELIVERY,
            defaultJobOptions: {
              ...DEFAULT_JOB_OPTIONS.default,
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 30000, // 30 seconds base
              },
            },
          },
        ),
      ],
      exports: [BullModule],
    };
  }

  /**
   * Register specific queues for a feature module
   * Use this when you only need certain queues
   */
  static forFeature(queueNames: string[]): DynamicModule {
    const queues = queueNames.map((name) => ({
      name,
      defaultJobOptions:
        DEFAULT_JOB_OPTIONS[name as keyof typeof DEFAULT_JOB_OPTIONS] ||
        DEFAULT_JOB_OPTIONS.default,
    }));

    return {
      module: QueueModule,
      imports: [BullModule.registerQueue(...queues)],
      exports: [BullModule],
    };
  }
}

/**
 * Export queue-related items for convenience
 */
export * from './queue.constants';
export * from './queue.decorators';
