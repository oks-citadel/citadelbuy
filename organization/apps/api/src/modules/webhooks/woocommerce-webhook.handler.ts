/**
 * WooCommerce Webhook Handler Controller
 *
 * Handles incoming WooCommerce webhooks for product updates.
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WooCommerceMapper } from '../connectors/woocommerce/woocommerce.mapper';
import {
  WooCommerceWebhookHeaders,
  WooCommerceWebhookPayload,
  WooCommerceWebhookTopic,
} from '../connectors/woocommerce/dto/woocommerce-product.dto';
import { ConnectorEventType } from '../connectors/base/connector.interface';

/**
 * WooCommerce webhook event types
 */
export enum WooCommerceWebhookEvent {
  PRODUCT_CREATED = 'woocommerce.product.created',
  PRODUCT_UPDATED = 'woocommerce.product.updated',
  PRODUCT_DELETED = 'woocommerce.product.deleted',
}

@ApiTags('Webhooks')
@Controller('api/v1/webhooks/woocommerce')
export class WooCommerceWebhookController {
  private readonly logger = new Logger(WooCommerceWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly mapper: WooCommerceMapper,
  ) {}

  /**
   * Handle WooCommerce product webhooks
   */
  @Post('products')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleProductWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() payload: WooCommerceWebhookPayload,
  ): Promise<{ success: boolean; message: string }> {
    const webhookHeaders: WooCommerceWebhookHeaders = {
      'x-wc-webhook-topic': headers['x-wc-webhook-topic'],
      'x-wc-webhook-resource': headers['x-wc-webhook-resource'],
      'x-wc-webhook-event': headers['x-wc-webhook-event'],
      'x-wc-webhook-signature': headers['x-wc-webhook-signature'],
      'x-wc-webhook-id': headers['x-wc-webhook-id'],
      'x-wc-webhook-delivery-id': headers['x-wc-webhook-delivery-id'],
      'x-wc-webhook-source': headers['x-wc-webhook-source'],
    };

    const topic = webhookHeaders['x-wc-webhook-topic'];
    const sourceUrl = webhookHeaders['x-wc-webhook-source'];

    this.logger.log(`Received WooCommerce webhook: ${topic} from ${sourceUrl}`);

    // Validate required headers
    if (!topic || !sourceUrl) {
      this.logger.warn('Received WooCommerce webhook without required headers');
      throw new BadRequestException('Missing required WooCommerce webhook headers');
    }

    // Verify webhook signature
    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(payload);
    await this.verifyWebhookSignature(webhookHeaders, rawBody, sourceUrl);

    try {
      // Find connector by source URL
      const connector = await this.findConnectorBySourceUrl(sourceUrl);

      if (!connector) {
        this.logger.warn(`No connector found for WooCommerce site: ${sourceUrl}`);
        return { success: true, message: 'No connector configured for this site' };
      }

      // Process webhook based on topic
      switch (topic) {
        case WooCommerceWebhookTopic.PRODUCT_CREATED:
          await this.handleProductCreated(payload, connector);
          break;
        case WooCommerceWebhookTopic.PRODUCT_UPDATED:
          await this.handleProductUpdated(payload, connector);
          break;
        case WooCommerceWebhookTopic.PRODUCT_DELETED:
          await this.handleProductDeleted(payload, connector);
          break;
        default:
          this.logger.warn(`Unhandled WooCommerce webhook topic: ${topic}`);
      }

      // Update connector's last sync time
      await this.updateConnectorLastSync(connector.id);

      return {
        success: true,
        message: `Webhook processed: ${topic}`,
      };
    } catch (error) {
      this.logger.error(`Failed to process WooCommerce webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify WooCommerce webhook signature
   */
  private async verifyWebhookSignature(
    headers: WooCommerceWebhookHeaders,
    rawBody: string,
    sourceUrl: string,
  ): Promise<void> {
    const signature = headers['x-wc-webhook-signature'];

    if (!signature) {
      // WooCommerce webhooks might not always have signature
      // In production, you should require signatures
      this.logger.warn('WooCommerce webhook received without signature');
      return;
    }

    // Get the webhook secret for this site
    const secret = await this.getWebhookSecretForSite(sourceUrl);

    if (!secret) {
      // Fall back to global webhook secret
      const globalSecret = this.configService.get<string>('WOOCOMMERCE_WEBHOOK_SECRET');
      if (!globalSecret) {
        this.logger.warn('No webhook secret configured, skipping verification');
        return;
      }
    }

    const webhookSecret = await this.getWebhookSecretForSite(sourceUrl) ||
      this.configService.get<string>('WOOCOMMERCE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      return;
    }

    // Calculate expected signature (HMAC-SHA256 base64)
    const calculatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Constant-time comparison
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(calculatedSignature),
        Buffer.from(signature),
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Buffer length mismatch
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug(`WooCommerce webhook signature verified for ${sourceUrl}`);
  }

  /**
   * Handle product created webhook
   */
  private async handleProductCreated(payload: WooCommerceWebhookPayload, connector: any): Promise<void> {
    this.logger.log(`WooCommerce product created: ${payload.id}`);

    // Map to normalized product
    const normalizedProduct = this.mapper.mapProduct(payload as any);

    // Emit event for sync service
    this.eventEmitter.emit(WooCommerceWebhookEvent.PRODUCT_CREATED, {
      connectorId: connector.id,
      tenantId: connector.tenantId,
      product: normalizedProduct,
      rawPayload: payload,
    });
  }

  /**
   * Handle product updated webhook
   */
  private async handleProductUpdated(payload: WooCommerceWebhookPayload, connector: any): Promise<void> {
    this.logger.log(`WooCommerce product updated: ${payload.id}`);

    // Map to normalized product
    const normalizedProduct = this.mapper.mapProduct(payload as any);

    // Emit event for sync service
    this.eventEmitter.emit(WooCommerceWebhookEvent.PRODUCT_UPDATED, {
      connectorId: connector.id,
      tenantId: connector.tenantId,
      product: normalizedProduct,
      rawPayload: payload,
    });
  }

  /**
   * Handle product deleted webhook
   */
  private async handleProductDeleted(payload: WooCommerceWebhookPayload, connector: any): Promise<void> {
    this.logger.log(`WooCommerce product deleted: ${payload.id}`);

    // Emit event for sync service
    this.eventEmitter.emit(WooCommerceWebhookEvent.PRODUCT_DELETED, {
      connectorId: connector.id,
      tenantId: connector.tenantId,
      externalId: payload.id.toString(),
    });
  }

  /**
   * Find connector by source URL
   */
  private async findConnectorBySourceUrl(sourceUrl: string): Promise<any | null> {
    // Normalize the URL
    const normalizedUrl = sourceUrl.toLowerCase().replace(/\/$/, '');

    try {
      const connectors = await this.prisma.connectorConfig.findMany({
        where: {
          type: 'WOOCOMMERCE',
          isActive: true,
        },
      });

      // Find connector with matching site URL
      for (const connector of connectors) {
        const config = connector.config as any;
        if (config?.credentials?.siteUrl) {
          const connectorUrl = config.credentials.siteUrl.toLowerCase().replace(/\/$/, '');
          if (connectorUrl === normalizedUrl || normalizedUrl.includes(connectorUrl)) {
            return connector;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to find connector for ${sourceUrl}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get webhook secret for a specific site
   */
  private async getWebhookSecretForSite(sourceUrl: string): Promise<string | null> {
    const connector = await this.findConnectorBySourceUrl(sourceUrl);

    if (connector) {
      const config = connector.config as any;
      // WooCommerce webhook secret might be stored in connector config
      return config?.settings?.webhookSecret || null;
    }

    return null;
  }

  /**
   * Update connector's last sync timestamp
   */
  private async updateConnectorLastSync(connectorId: string): Promise<void> {
    try {
      await this.prisma.connectorConfig.update({
        where: { id: connectorId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'WEBHOOK_SYNC',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update connector last sync: ${error.message}`);
    }
  }
}
