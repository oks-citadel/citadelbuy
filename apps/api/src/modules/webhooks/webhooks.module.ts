import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebhookService, WEBHOOK_QUEUE } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookProcessor } from './webhook.processor';
import { WebhookEventsService } from './webhook-events.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

// Connector webhook handlers
import { ShopifyWebhookController } from './shopify-webhook.handler';
import { WooCommerceWebhookController } from './woocommerce-webhook.handler';
import { ConnectorsModule } from '../connectors/connectors.module';

/**
 * Webhooks Module
 *
 * Provides webhook functionality for the application.
 *
 * Features:
 * - Webhook endpoint management (CRUD operations)
 * - Event-driven webhook triggering
 * - Delivery tracking and retry logic
 * - Dead letter queue for failed deliveries
 * - Signature verification for security
 * - Admin endpoints for monitoring
 *
 * Dependencies:
 * - Bull Queue (for job processing and retries)
 * - HttpModule (for HTTP requests to webhook endpoints)
 * - EventEmitter (for listening to application events)
 * - Prisma (for database operations)
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    forwardRef(() => ConnectorsModule), // Connector module for webhook handlers

    BullModule.registerQueueAsync({
      name: WEBHOOK_QUEUE,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
        defaultJobOptions: {
          attempts: 1, // We handle retries manually with exponential backoff
          removeOnComplete: {
            age: 7 * 24 * 60 * 60, // Keep completed jobs for 7 days
            count: 1000, // Keep max 1000 completed jobs
          },
          removeOnFail: {
            age: 30 * 24 * 60 * 60, // Keep failed jobs for 30 days
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    WebhookController,
    ShopifyWebhookController,      // Shopify product webhooks
    WooCommerceWebhookController,  // WooCommerce product webhooks
  ],
  providers: [WebhookService, WebhookProcessor, WebhookEventsService],
  exports: [WebhookService, WebhookEventsService],
})
export class WebhooksModule {}
