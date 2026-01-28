/**
 * Shopify Webhook Handler
 *
 * Handles incoming Shopify webhooks for product updates,
 * including signature verification and payload processing.
 */

import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ShopifyMapper } from './shopify.mapper';
import {
  ShopifyWebhookPayload,
  ShopifyWebhookHeaders,
  ShopifyWebhookTopic,
  ShopifyProduct,
} from './dto/shopify-product.dto';
import { ConnectorEventType } from '../base/connector.interface';

/**
 * Webhook event types
 */
export enum ShopifyWebhookEvent {
  PRODUCT_CREATED = 'shopify.product.created',
  PRODUCT_UPDATED = 'shopify.product.updated',
  PRODUCT_DELETED = 'shopify.product.deleted',
  INVENTORY_UPDATED = 'shopify.inventory.updated',
}

@Injectable()
export class ShopifyWebhookHandler {
  private readonly logger = new Logger(ShopifyWebhookHandler.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly mapper: ShopifyMapper,
  ) {}

  /**
   * Handle incoming Shopify webhook
   */
  async handleWebhook(
    headers: ShopifyWebhookHeaders,
    rawBody: string,
    payload: ShopifyWebhookPayload,
  ): Promise<{ success: boolean; message: string }> {
    const topic = headers['x-shopify-topic'];
    const shopDomain = headers['x-shopify-shop-domain'];
    const webhookId = headers['x-shopify-webhook-id'];

    this.logger.log(`Received Shopify webhook: ${topic} from ${shopDomain}`);

    try {
      // Verify webhook signature
      await this.verifyWebhookSignature(headers, rawBody, shopDomain);

      // Process webhook based on topic
      switch (topic) {
        case ShopifyWebhookTopic.PRODUCTS_CREATE:
          await this.handleProductCreated(payload, shopDomain);
          break;
        case ShopifyWebhookTopic.PRODUCTS_UPDATE:
          await this.handleProductUpdated(payload, shopDomain);
          break;
        case ShopifyWebhookTopic.PRODUCTS_DELETE:
          await this.handleProductDeleted(payload, shopDomain);
          break;
        case ShopifyWebhookTopic.INVENTORY_LEVELS_UPDATE:
          await this.handleInventoryUpdated(payload, shopDomain);
          break;
        case 'app/uninstalled':
          await this.handleAppUninstalled(shopDomain);
          break;
        default:
          this.logger.warn(`Unhandled webhook topic: ${topic}`);
      }

      return {
        success: true,
        message: `Webhook processed: ${topic}`,
      };
    } catch (error) {
      this.logger.error(`Failed to process Shopify webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify Shopify webhook signature (HMAC-SHA256)
   */
  async verifyWebhookSignature(
    headers: ShopifyWebhookHeaders,
    rawBody: string,
    shopDomain: string,
  ): Promise<void> {
    const hmacHeader = headers['x-shopify-hmac-sha256'];

    if (!hmacHeader) {
      throw new BadRequestException('Missing HMAC signature');
    }

    // Get the API secret for this shop
    const apiSecret = await this.getApiSecretForShop(shopDomain);

    if (!apiSecret) {
      // Fall back to global webhook secret
      const globalSecret = this.configService.get<string>('SHOPIFY_WEBHOOK_SECRET');
      if (!globalSecret) {
        throw new UnauthorizedException('No webhook secret configured');
      }
    }

    const secret = await this.getApiSecretForShop(shopDomain) ||
      this.configService.get<string>('SHOPIFY_WEBHOOK_SECRET');

    if (!secret) {
      throw new UnauthorizedException('No webhook secret configured');
    }

    // Calculate expected HMAC
    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(hmacHeader),
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug(`Webhook signature verified for ${shopDomain}`);
  }

  /**
   * Handle product created webhook
   */
  private async handleProductCreated(payload: ShopifyWebhookPayload, shopDomain: string): Promise<void> {
    this.logger.log(`Product created: ${payload.id} from ${shopDomain}`);

    const connector = await this.findConnectorByShopDomain(shopDomain);

    if (!connector) {
      this.logger.warn(`No connector found for shop: ${shopDomain}`);
      return;
    }

    // Map the Shopify product to normalized format
    const normalizedProduct = this.mapper.mapRestProduct(payload as unknown as ShopifyProduct);

    // Emit event for sync service to handle
    this.eventEmitter.emit(ShopifyWebhookEvent.PRODUCT_CREATED, {
      connectorId: connector.id,
      tenantId: connector.tenantId,
      shopDomain,
      product: normalizedProduct,
      rawPayload: payload,
    });

    // Update connector's last sync time
    await this.updateConnectorLastSync(connector.id);
  }

  /**
   * Handle product updated webhook
   */
  private async handleProductUpdated(payload: ShopifyWebhookPayload, shopDomain: string): Promise<void> {
    this.logger.log(`Product updated: ${payload.id} from ${shopDomain}`);

    const connector = await this.findConnectorByShopDomain(shopDomain);

    if (!connector) {
      this.logger.warn(`No connector found for shop: ${shopDomain}`);
      return;
    }

    // Map the Shopify product to normalized format
    const normalizedProduct = this.mapper.mapRestProduct(payload as unknown as ShopifyProduct);

    // Emit event for sync service to handle
    this.eventEmitter.emit(ShopifyWebhookEvent.PRODUCT_UPDATED, {
      connectorId: connector.id,
      tenantId: connector.tenantId,
      shopDomain,
      product: normalizedProduct,
      rawPayload: payload,
    });

    // Update connector's last sync time
    await this.updateConnectorLastSync(connector.id);
  }

  /**
   * Handle product deleted webhook
   */
  private async handleProductDeleted(payload: ShopifyWebhookPayload, shopDomain: string): Promise<void> {
    this.logger.log(`Product deleted: ${payload.id} from ${shopDomain}`);

    const connector = await this.findConnectorByShopDomain(shopDomain);

    if (!connector) {
      this.logger.warn(`No connector found for shop: ${shopDomain}`);
      return;
    }

    // Emit event for sync service to handle
    this.eventEmitter.emit(ShopifyWebhookEvent.PRODUCT_DELETED, {
      connectorId: connector.id,
      tenantId: connector.tenantId,
      shopDomain,
      externalId: payload.id.toString(),
    });

    // Update connector's last sync time
    await this.updateConnectorLastSync(connector.id);
  }

  /**
   * Handle inventory level updated webhook
   */
  private async handleInventoryUpdated(payload: ShopifyWebhookPayload, shopDomain: string): Promise<void> {
    this.logger.log(`Inventory updated: item ${payload.inventory_item_id} from ${shopDomain}`);

    const connector = await this.findConnectorByShopDomain(shopDomain);

    if (!connector) {
      this.logger.warn(`No connector found for shop: ${shopDomain}`);
      return;
    }

    // Emit event for sync service to handle
    this.eventEmitter.emit(ShopifyWebhookEvent.INVENTORY_UPDATED, {
      connectorId: connector.id,
      tenantId: connector.tenantId,
      shopDomain,
      inventoryItemId: payload.inventory_item_id,
      locationId: payload.location_id,
      available: payload.available,
    });

    // Update connector's last sync time
    await this.updateConnectorLastSync(connector.id);
  }

  /**
   * Handle app uninstalled webhook
   */
  private async handleAppUninstalled(shopDomain: string): Promise<void> {
    this.logger.log(`App uninstalled from: ${shopDomain}`);

    const connector = await this.findConnectorByShopDomain(shopDomain);

    if (connector) {
      // Deactivate the connector
      await this.prisma.connectorConfig.update({
        where: { id: connector.id },
        data: {
          isActive: false,
          lastSyncStatus: 'APP_UNINSTALLED',
        },
      });

      this.eventEmitter.emit(ConnectorEventType.DISCONNECTED, {
        type: ConnectorEventType.DISCONNECTED,
        connectorId: connector.id,
        tenantId: connector.tenantId,
        timestamp: new Date(),
        data: { reason: 'app_uninstalled', shopDomain },
      });
    }
  }

  /**
   * Find connector by shop domain
   */
  private async findConnectorByShopDomain(shopDomain: string): Promise<any | null> {
    // Normalize the shop domain
    const normalizedDomain = shopDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    try {
      const connectors = await this.prisma.connectorConfig.findMany({
        where: {
          type: 'SHOPIFY',
          isActive: true,
        },
      });

      // Find the connector with matching shop domain in config
      for (const connector of connectors) {
        const config = connector.config as any;
        if (config?.credentials?.shopDomain) {
          const connectorDomain = config.credentials.shopDomain
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '');

          if (connectorDomain === normalizedDomain || connectorDomain.includes(normalizedDomain)) {
            return connector;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to find connector for shop ${shopDomain}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get API secret for a specific shop
   */
  private async getApiSecretForShop(shopDomain: string): Promise<string | null> {
    const connector = await this.findConnectorByShopDomain(shopDomain);

    if (connector) {
      const config = connector.config as any;
      return config?.credentials?.apiSecretKey || null;
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
