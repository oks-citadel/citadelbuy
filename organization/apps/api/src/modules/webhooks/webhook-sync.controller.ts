import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/common/redis/redis.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SkipTenant } from '@/common/decorators/tenant.decorator';
import { getCurrentTraceId } from '@/common/interceptors/trace.interceptor';
import * as crypto from 'crypto';

/**
 * Product Sync Webhook Payload
 */
interface ProductSyncPayload {
  eventType: 'product.created' | 'product.updated' | 'product.deleted' | 'product.bulk_sync';
  timestamp: string;
  organizationId: string;
  products: Array<{
    externalId: string;
    sku?: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    stock?: number;
    images?: string[];
    categoryId?: string;
    metadata?: Record<string, unknown>;
  }>;
  source: string;
  correlationId?: string;
}

/**
 * Translation Complete Webhook Payload
 */
interface TranslationCompletePayload {
  eventType: 'translation.completed' | 'translation.failed';
  timestamp: string;
  organizationId: string;
  resourceType: 'product' | 'category' | 'page';
  resourceId: string;
  locale: string;
  translations: Record<string, string>;
  translationProvider?: string;
  quality?: {
    score: number;
    reviewRequired: boolean;
  };
  correlationId?: string;
}

/**
 * Webhook Sync Controller
 *
 * Handles incoming webhooks for:
 * - Product synchronization from external systems
 * - Translation completion notifications
 *
 * Security features:
 * - HMAC signature verification
 * - Replay protection via Redis
 * - Request timestamp validation
 */
@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhookSyncController {
  private readonly logger = new Logger(WebhookSyncController.name);
  private readonly WEBHOOK_SECRET_KEY = 'WEBHOOK_SIGNING_SECRET';
  private readonly REPLAY_WINDOW_SECONDS = 300; // 5 minutes
  private readonly REPLAY_KEY_PREFIX = 'webhook:replay:';
  private readonly REPLAY_TTL = 3600; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Product Sync Webhook
   *
   * Receives product data from external systems for synchronization.
   */
  @Post('products/sync')
  @SkipTenant()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Product sync webhook',
    description: 'Receive product data from external systems. Requires valid HMAC signature.',
  })
  @ApiHeader({
    name: 'x-webhook-signature',
    description: 'HMAC-SHA256 signature of the request body',
    required: true,
  })
  @ApiHeader({
    name: 'x-webhook-timestamp',
    description: 'Unix timestamp of when the webhook was sent',
    required: true,
  })
  @ApiHeader({
    name: 'x-webhook-id',
    description: 'Unique identifier for this webhook delivery',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @ApiResponse({ status: 409, description: 'Duplicate webhook (replay protection)' })
  async handleProductSync(
    @Body() payload: ProductSyncPayload,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Headers('x-webhook-id') webhookId: string,
    @Headers('x-bx-trace-id') traceId?: string,
  ) {
    const effectiveTraceId = traceId || getCurrentTraceId() || webhookId;

    this.logger.log('Received product sync webhook', {
      traceId: effectiveTraceId,
      webhookId,
      eventType: payload.eventType,
      organizationId: payload.organizationId,
      productCount: payload.products?.length,
    });

    // Verify signature
    await this.verifySignature(payload, signature, timestamp);

    // Check for replay attacks
    await this.checkReplay(webhookId);

    // Validate payload
    this.validateProductSyncPayload(payload);

    try {
      // Process the webhook
      const result = await this.processProductSync(payload, effectiveTraceId);

      // Mark as processed (replay protection)
      await this.markProcessed(webhookId);

      return {
        success: true,
        message: 'Product sync processed successfully',
        processed: result.processed,
        failed: result.failed,
        traceId: effectiveTraceId,
      };
    } catch (error) {
      this.logger.error('Product sync webhook failed', {
        traceId: effectiveTraceId,
        webhookId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Translation Complete Webhook
   *
   * Receives notifications when translations are completed.
   */
  @Post('translations/complete')
  @SkipTenant()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Translation complete webhook',
    description: 'Receive notification when translations are completed. Requires valid HMAC signature.',
  })
  @ApiHeader({
    name: 'x-webhook-signature',
    description: 'HMAC-SHA256 signature of the request body',
    required: true,
  })
  @ApiHeader({
    name: 'x-webhook-timestamp',
    description: 'Unix timestamp of when the webhook was sent',
    required: true,
  })
  @ApiHeader({
    name: 'x-webhook-id',
    description: 'Unique identifier for this webhook delivery',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @ApiResponse({ status: 409, description: 'Duplicate webhook (replay protection)' })
  async handleTranslationComplete(
    @Body() payload: TranslationCompletePayload,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Headers('x-webhook-id') webhookId: string,
    @Headers('x-bx-trace-id') traceId?: string,
  ) {
    const effectiveTraceId = traceId || getCurrentTraceId() || webhookId;

    this.logger.log('Received translation complete webhook', {
      traceId: effectiveTraceId,
      webhookId,
      eventType: payload.eventType,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      locale: payload.locale,
    });

    // Verify signature
    await this.verifySignature(payload, signature, timestamp);

    // Check for replay attacks
    await this.checkReplay(webhookId);

    // Validate payload
    this.validateTranslationPayload(payload);

    try {
      // Process the webhook
      const result = await this.processTranslationComplete(payload, effectiveTraceId);

      // Mark as processed (replay protection)
      await this.markProcessed(webhookId);

      return {
        success: true,
        message: 'Translation webhook processed successfully',
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        locale: payload.locale,
        status: result.status,
        traceId: effectiveTraceId,
      };
    } catch (error) {
      this.logger.error('Translation complete webhook failed', {
        traceId: effectiveTraceId,
        webhookId,
        error: error.message,
      });
      throw error;
    }
  }

  // Private methods

  /**
   * Verify webhook signature
   */
  private async verifySignature(
    payload: unknown,
    signature: string,
    timestamp: string,
  ): Promise<void> {
    if (!signature || !timestamp) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing signature or timestamp headers',
        errorCode: 'MISSING_SIGNATURE',
      });
    }

    // Validate timestamp (prevent replay with old signatures)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - timestampNum) > this.REPLAY_WINDOW_SECONDS) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Webhook timestamp is too old or in the future',
        errorCode: 'INVALID_TIMESTAMP',
      });
    }

    // Get signing secret
    const secret = this.configService.get<string>(this.WEBHOOK_SECRET_KEY);
    if (!secret) {
      this.logger.warn('Webhook signing secret not configured');
      // In production, this should throw. For development, allow unsigned requests.
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Webhook verification failed',
          errorCode: 'SIGNATURE_VERIFICATION_FAILED',
        });
      }
      return;
    }

    // Calculate expected signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${payloadString}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    // Compare signatures (timing-safe)
    const providedSig = signature.replace('sha256=', '');
    const sigBuffer = Buffer.from(providedSig, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
        errorCode: 'INVALID_SIGNATURE',
      });
    }
  }

  /**
   * Check for replay attacks
   */
  private async checkReplay(webhookId: string): Promise<void> {
    const key = `${this.REPLAY_KEY_PREFIX}${webhookId}`;

    // Try to set the key (only succeeds if it doesn't exist)
    const isNew = await this.redis.setNx(key, { processedAt: Date.now() }, this.REPLAY_TTL);

    if (!isNew) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Webhook already processed (duplicate)',
        errorCode: 'DUPLICATE_WEBHOOK',
      });
    }
  }

  /**
   * Mark webhook as processed
   */
  private async markProcessed(webhookId: string): Promise<void> {
    const key = `${this.REPLAY_KEY_PREFIX}${webhookId}`;
    await this.redis.set(key, { processedAt: Date.now(), status: 'completed' }, this.REPLAY_TTL);
  }

  /**
   * Validate product sync payload
   */
  private validateProductSyncPayload(payload: ProductSyncPayload): void {
    if (!payload.eventType) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing eventType',
        errorCode: 'INVALID_PAYLOAD',
      });
    }

    if (!payload.organizationId) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing organizationId',
        errorCode: 'INVALID_PAYLOAD',
      });
    }

    if (!Array.isArray(payload.products) || payload.products.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Products array is required and must not be empty',
        errorCode: 'INVALID_PAYLOAD',
      });
    }
  }

  /**
   * Validate translation payload
   */
  private validateTranslationPayload(payload: TranslationCompletePayload): void {
    if (!payload.eventType) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing eventType',
        errorCode: 'INVALID_PAYLOAD',
      });
    }

    if (!payload.resourceType || !payload.resourceId) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing resourceType or resourceId',
        errorCode: 'INVALID_PAYLOAD',
      });
    }

    if (!payload.locale) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing locale',
        errorCode: 'INVALID_PAYLOAD',
      });
    }
  }

  /**
   * Process product sync webhook
   */
  private async processProductSync(
    payload: ProductSyncPayload,
    traceId: string,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const product of payload.products) {
      try {
        // Check if product exists (by external ID or SKU)
        const existingProduct = await this.prisma.product.findFirst({
          where: {
            OR: [
              { sku: product.sku },
              // Could add external ID lookup if the schema supports it
            ],
          },
        });

        if (payload.eventType === 'product.deleted') {
          if (existingProduct) {
            await this.prisma.product.update({
              where: { id: existingProduct.id },
              data: { isActive: false, status: 'DELETED' },
            });
          }
          processed++;
        } else if (existingProduct) {
          // Update existing product
          await this.prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: product.name,
              description: product.description || existingProduct.description,
              price: product.price,
              stock: product.stock ?? existingProduct.stock,
              images: product.images || existingProduct.images,
              updatedAt: new Date(),
            },
          });
          processed++;
        } else {
          // Note: Creating new products would require vendorId and categoryId
          // For now, log and skip
          this.logger.warn('Cannot create product via webhook - missing required fields', {
            traceId,
            externalId: product.externalId,
            sku: product.sku,
          });
          failed++;
        }
      } catch (error) {
        this.logger.error('Failed to process product', {
          traceId,
          externalId: product.externalId,
          error: error.message,
        });
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Process translation complete webhook
   */
  private async processTranslationComplete(
    payload: TranslationCompletePayload,
    traceId: string,
  ): Promise<{ status: string }> {
    if (payload.eventType === 'translation.failed') {
      this.logger.warn('Translation failed', {
        traceId,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        locale: payload.locale,
      });
      return { status: 'failed' };
    }

    try {
      // Handle based on resource type
      switch (payload.resourceType) {
        case 'product':
          await this.updateProductTranslation(payload);
          break;
        case 'category':
          await this.updateCategoryTranslation(payload);
          break;
        default:
          this.logger.warn('Unknown resource type for translation', {
            traceId,
            resourceType: payload.resourceType,
          });
      }

      return { status: 'applied' };
    } catch (error) {
      this.logger.error('Failed to apply translation', {
        traceId,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update product translation
   */
  private async updateProductTranslation(payload: TranslationCompletePayload): Promise<void> {
    await this.prisma.productTranslation.upsert({
      where: {
        productId_languageCode: {
          productId: payload.resourceId,
          languageCode: payload.locale,
        },
      },
      create: {
        productId: payload.resourceId,
        languageCode: payload.locale,
        name: payload.translations.name || '',
        description: payload.translations.description || '',
        status: 'PUBLISHED',
      },
      update: {
        name: payload.translations.name,
        description: payload.translations.description,
        status: 'PUBLISHED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update category translation
   */
  private async updateCategoryTranslation(payload: TranslationCompletePayload): Promise<void> {
    await this.prisma.categoryTranslation.upsert({
      where: {
        categoryId_languageCode: {
          categoryId: payload.resourceId,
          languageCode: payload.locale,
        },
      },
      create: {
        categoryId: payload.resourceId,
        languageCode: payload.locale,
        name: payload.translations.name || '',
        description: payload.translations.description || '',
      },
      update: {
        name: payload.translations.name,
        description: payload.translations.description,
        updatedAt: new Date(),
      },
    });
  }
}
