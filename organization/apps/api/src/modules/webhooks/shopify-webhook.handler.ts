/**
 * Shopify Webhook Handler Controller
 *
 * Handles incoming Shopify webhooks for product updates.
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ShopifyWebhookHandler, ShopifyWebhookEvent } from '../connectors/shopify/shopify.webhook-handler';
import { ShopifyWebhookHeaders, ShopifyWebhookPayload } from '../connectors/shopify/dto/shopify-product.dto';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks/shopify')
export class ShopifyWebhookController {
  private readonly logger = new Logger(ShopifyWebhookController.name);

  constructor(private readonly shopifyWebhookHandler: ShopifyWebhookHandler) {}

  /**
   * Handle Shopify product webhooks
   */
  @Post('products')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger (internal endpoint)
  async handleProductWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() payload: ShopifyWebhookPayload,
  ): Promise<{ success: boolean; message: string }> {
    const webhookHeaders: ShopifyWebhookHeaders = {
      'x-shopify-topic': headers['x-shopify-topic'],
      'x-shopify-hmac-sha256': headers['x-shopify-hmac-sha256'],
      'x-shopify-shop-domain': headers['x-shopify-shop-domain'],
      'x-shopify-api-version': headers['x-shopify-api-version'],
      'x-shopify-webhook-id': headers['x-shopify-webhook-id'],
    };

    // Validate required headers
    if (!webhookHeaders['x-shopify-topic'] || !webhookHeaders['x-shopify-hmac-sha256']) {
      this.logger.warn('Received Shopify webhook without required headers');
      throw new BadRequestException('Missing required Shopify webhook headers');
    }

    this.logger.log(`Received Shopify webhook: ${webhookHeaders['x-shopify-topic']}`);

    // Get raw body for HMAC verification
    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(payload);

    try {
      return await this.shopifyWebhookHandler.handleWebhook(webhookHeaders, rawBody, payload);
    } catch (error) {
      this.logger.error(`Failed to process Shopify webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Shopify inventory webhooks
   */
  @Post('inventory')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleInventoryWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() payload: any,
  ): Promise<{ success: boolean; message: string }> {
    const webhookHeaders: ShopifyWebhookHeaders = {
      'x-shopify-topic': headers['x-shopify-topic'] || 'inventory_levels/update',
      'x-shopify-hmac-sha256': headers['x-shopify-hmac-sha256'],
      'x-shopify-shop-domain': headers['x-shopify-shop-domain'],
      'x-shopify-api-version': headers['x-shopify-api-version'],
      'x-shopify-webhook-id': headers['x-shopify-webhook-id'],
    };

    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(payload);

    try {
      return await this.shopifyWebhookHandler.handleWebhook(webhookHeaders, rawBody, payload);
    } catch (error) {
      this.logger.error(`Failed to process Shopify inventory webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Shopify app uninstalled webhook
   */
  @Post('app/uninstalled')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleAppUninstalled(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() payload: any,
  ): Promise<{ success: boolean; message: string }> {
    const webhookHeaders: ShopifyWebhookHeaders = {
      'x-shopify-topic': 'app/uninstalled',
      'x-shopify-hmac-sha256': headers['x-shopify-hmac-sha256'],
      'x-shopify-shop-domain': headers['x-shopify-shop-domain'],
      'x-shopify-api-version': headers['x-shopify-api-version'],
      'x-shopify-webhook-id': headers['x-shopify-webhook-id'],
    };

    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(payload);

    try {
      return await this.shopifyWebhookHandler.handleWebhook(webhookHeaders, rawBody, payload);
    } catch (error) {
      this.logger.error(`Failed to process app uninstalled webhook: ${error.message}`);
      throw error;
    }
  }
}
