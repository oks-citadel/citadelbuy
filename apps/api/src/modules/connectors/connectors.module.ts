/**
 * Connectors Module
 *
 * Main module for product integration connectors.
 * Provides connectivity to external e-commerce platforms and data sources.
 */

import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Common modules
import { PrismaModule } from '../../common/prisma/prisma.module';

// Services
import { ConnectorsService } from './connectors.service';
import { SyncService } from './sync.service';

// Controller
import { ConnectorsController } from './connectors.controller';

// Factory
import { ConnectorFactory } from './base/connector.factory';

// Shopify
import { ShopifyConnector } from './shopify/shopify.connector';
import { ShopifyMapper } from './shopify/shopify.mapper';
import { ShopifyWebhookHandler } from './shopify/shopify.webhook-handler';

// WooCommerce
import { WooCommerceConnector } from './woocommerce/woocommerce.connector';
import { WooCommerceMapper } from './woocommerce/woocommerce.mapper';

// REST API
import { RestConnector } from './rest/rest.connector';
import { RestMapper } from './rest/rest.mapper';

// CSV
import { CsvConnector } from './csv/csv.connector';
import { CsvParser } from './csv/csv.parser';

/**
 * Connectors Module
 *
 * Features:
 * - Shopify integration with OAuth and webhooks
 * - WooCommerce integration with REST API
 * - Generic REST API connector with custom mapping
 * - CSV file import with validation
 * - Automated product synchronization
 * - Conflict resolution
 * - Real-time webhook updates
 *
 * API Endpoints:
 * - POST /api/v1/connectors - Create connector
 * - GET /api/v1/connectors - List connectors
 * - GET /api/v1/connectors/:id - Get connector
 * - PUT /api/v1/connectors/:id - Update connector
 * - DELETE /api/v1/connectors/:id - Delete connector
 * - POST /api/v1/connectors/:id/test - Test connection
 * - POST /api/v1/connectors/:id/sync - Trigger sync
 * - GET /api/v1/connectors/:id/sync/status - Get sync status
 * - GET /api/v1/connectors/:id/sync/history - Get sync history
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    EventEmitterModule,
    ScheduleModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT', 30000),
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ConnectorsController],
  providers: [
    // Core services
    ConnectorsService,
    SyncService,
    ConnectorFactory,

    // Shopify
    ShopifyConnector,
    ShopifyMapper,
    ShopifyWebhookHandler,

    // WooCommerce
    WooCommerceConnector,
    WooCommerceMapper,

    // REST API
    RestConnector,
    RestMapper,

    // CSV
    CsvConnector,
    CsvParser,
  ],
  exports: [
    ConnectorsService,
    SyncService,
    ConnectorFactory,
    ShopifyWebhookHandler,
    ShopifyConnector,
    WooCommerceConnector,
    RestConnector,
    CsvConnector,
  ],
})
export class ConnectorsModule {}
