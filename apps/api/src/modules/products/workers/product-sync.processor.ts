import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { DistributedLockService } from '@/common/redis/lock.service';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { REDIS_KEYS, CACHE_TTL } from '@/common/redis/keys';
import { QUEUES, SYNC_STATUS } from '@/common/queue/queue.constants';
import {
  ProductSyncJobData,
  ProductSyncJobResult,
  ProductSyncStats,
  ProductSyncError,
  ProductConflict,
  ProductSyncSource,
  SyncMode,
  ConflictResolution,
  NormalizedProduct,
  PRODUCT_SYNC_JOB_NAMES,
  SYNC_SCHEDULES,
} from './product-sync.job';

/**
 * Product Sync Processor
 *
 * Background worker that synchronizes products from external sources.
 *
 * Features:
 * - Webhook-driven sync from external sources
 * - Scheduled delta sync (every 6 hours)
 * - Normalize product data from different sources
 * - Handle inventory updates
 * - Detect and resolve conflicts
 * - Idempotent processing for webhooks
 */
@Injectable()
@Processor(QUEUES.PRODUCT_SYNC)
export class ProductSyncProcessor {
  private readonly logger = new Logger(ProductSyncProcessor.name);

  constructor(
    @InjectQueue(QUEUES.PRODUCT_SYNC)
    private readonly syncQueue: Queue<ProductSyncJobData>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly lockService: DistributedLockService,
    private readonly idempotencyService: IdempotencyService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Schedule delta sync every 6 hours
   */
  @Cron(SYNC_SCHEDULES.DELTA)
  async scheduleDeltaSync() {
    this.logger.log('Scheduling delta sync for all connected tenants');

    // Get all tenants with sync configurations
    const syncConfigs = await (this.prisma as any).productSyncConfig.findMany({
      where: {
        enabled: true,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        source: true,
        lastSyncAt: true,
      },
    });

    for (const config of syncConfigs) {
      await this.syncQueue.add(
        PRODUCT_SYNC_JOB_NAMES.SYNC_DELTA,
        {
          syncId: `delta:${config.tenantId}:${Date.now()}`,
          tenantId: config.tenantId,
          source: config.source as ProductSyncSource,
          mode: SyncMode.DELTA,
          conflictResolution: ConflictResolution.NEWEST_WINS,
          triggeredBy: 'scheduler',
          triggeredAt: new Date().toISOString(),
        },
        {
          priority: 5, // Normal priority
          delay: Math.random() * 60000, // Random delay up to 1 minute
        },
      );
    }
  }

  /**
   * Process webhook-triggered sync
   */
  @Process(PRODUCT_SYNC_JOB_NAMES.SYNC_WEBHOOK)
  async handleWebhookSync(job: Job<ProductSyncJobData>): Promise<ProductSyncJobResult> {
    const { syncId, tenantId, source, webhookData } = job.data;
    const startTime = Date.now();

    if (!webhookData) {
      throw new Error('Webhook data is required for webhook sync');
    }

    this.logger.log(`Processing webhook sync: ${syncId} from ${source}`);

    // Check idempotency
    const idempotencyKey = webhookData.idempotencyKey || webhookData.eventId;
    const { acquired, existingRecord } = await this.idempotencyService.tryAcquireLock(
      `webhook:${source}:${idempotencyKey}`,
      undefined,
      86400, // 24 hour TTL
    );

    if (!acquired) {
      this.logger.debug(`Skipping duplicate webhook: ${idempotencyKey}`);
      return {
        success: true,
        syncId,
        status: SYNC_STATUS.COMPLETED,
        stats: { total: 0, created: 0, updated: 0, skipped: 1, deleted: 0, errors: 0, conflicts: 0, inventoryUpdates: 0, priceUpdates: 0 },
        errors: [],
        conflicts: [],
        durationMs: Date.now() - startTime,
        lastSyncAt: new Date().toISOString(),
      };
    }

    try {
      // Parse webhook event
      const product = this.parseWebhookEvent(webhookData, source);

      if (!product) {
        return {
          success: true,
          syncId,
          status: SYNC_STATUS.COMPLETED,
          stats: { total: 1, created: 0, updated: 0, skipped: 1, deleted: 0, errors: 0, conflicts: 0, inventoryUpdates: 0, priceUpdates: 0 },
          errors: [],
          conflicts: [],
          durationMs: Date.now() - startTime,
          lastSyncAt: new Date().toISOString(),
        };
      }

      // Sync the single product
      const result = await this.syncProduct(tenantId, product, job.data.conflictResolution || ConflictResolution.SOURCE_WINS);

      // Store successful result
      await this.idempotencyService.storeResponse(
        `webhook:${source}:${idempotencyKey}`,
        result,
        200,
      );

      return {
        success: true,
        syncId,
        status: SYNC_STATUS.COMPLETED,
        stats: {
          total: 1,
          created: result.action === 'created' ? 1 : 0,
          updated: result.action === 'updated' ? 1 : 0,
          skipped: result.action === 'skipped' ? 1 : 0,
          deleted: result.action === 'deleted' ? 1 : 0,
          errors: result.error ? 1 : 0,
          conflicts: result.conflict ? 1 : 0,
          inventoryUpdates: result.inventoryUpdated ? 1 : 0,
          priceUpdates: result.priceUpdated ? 1 : 0,
        },
        errors: result.error ? [result.error] : [],
        conflicts: result.conflict ? [result.conflict] : [],
        durationMs: Date.now() - startTime,
        lastSyncAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.idempotencyService.releaseLock(`webhook:${source}:${idempotencyKey}`);
      throw error;
    }
  }

  /**
   * Process delta sync
   */
  @Process(PRODUCT_SYNC_JOB_NAMES.SYNC_DELTA)
  async handleDeltaSync(job: Job<ProductSyncJobData>): Promise<ProductSyncJobResult> {
    const { syncId, tenantId, source, filter } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing delta sync: ${syncId} for tenant ${tenantId}`);

    // Acquire lock to prevent concurrent syncs
    const lockKey = `sync:${tenantId}:${source}`;
    const lockResult = await this.lockService.acquireLock(lockKey, {
      ttlSeconds: 600, // 10 minute lock for sync
      waitTimeMs: 0,
    });

    if (!lockResult.acquired) {
      this.logger.debug(`Skipping sync for ${tenantId} - another sync in progress`);
      return {
        success: true,
        syncId,
        status: SYNC_STATUS.COMPLETED,
        stats: { total: 0, created: 0, updated: 0, skipped: 0, deleted: 0, errors: 0, conflicts: 0, inventoryUpdates: 0, priceUpdates: 0 },
        errors: [{ externalId: '', message: 'Sync already in progress', code: 'SYNC_LOCKED', retryable: true }],
        conflicts: [],
        durationMs: Date.now() - startTime,
        lastSyncAt: new Date().toISOString(),
      };
    }

    try {
      // Get last sync timestamp
      const lastSync = await this.getLastSyncTimestamp(tenantId, source);
      const updatedAfter = filter?.updatedAfter || lastSync;

      // Fetch products from source
      const products = await this.fetchProductsFromSource(
        tenantId,
        source,
        { ...filter, updatedAfter },
      );

      // Process products
      const stats: ProductSyncStats = {
        total: products.length,
        created: 0,
        updated: 0,
        skipped: 0,
        deleted: 0,
        errors: 0,
        conflicts: 0,
        inventoryUpdates: 0,
        priceUpdates: 0,
      };
      const errors: ProductSyncError[] = [];
      const conflicts: ProductConflict[] = [];

      for (let i = 0; i < products.length; i++) {
        const product = products[i];

        try {
          const result = await this.syncProduct(
            tenantId,
            product,
            job.data.conflictResolution || ConflictResolution.NEWEST_WINS,
          );

          switch (result.action) {
            case 'created':
              stats.created++;
              break;
            case 'updated':
              stats.updated++;
              break;
            case 'skipped':
              stats.skipped++;
              break;
            case 'deleted':
              stats.deleted++;
              break;
          }

          if (result.inventoryUpdated) stats.inventoryUpdates++;
          if (result.priceUpdated) stats.priceUpdates++;
          if (result.conflict) {
            stats.conflicts++;
            conflicts.push(result.conflict);
          }
        } catch (error) {
          stats.errors++;
          errors.push({
            externalId: product.externalId,
            sku: product.sku,
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'SYNC_ERROR',
            retryable: true,
          });
        }

        // Update progress
        await job.progress(((i + 1) / products.length) * 100);
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(tenantId, source);

      // Invalidate product cache for tenant
      await this.invalidateProductCache(tenantId);

      return {
        success: stats.errors === 0,
        syncId,
        status: stats.errors === 0 ? SYNC_STATUS.COMPLETED : SYNC_STATUS.PARTIAL,
        stats,
        errors,
        conflicts,
        durationMs: Date.now() - startTime,
        lastSyncAt: new Date().toISOString(),
        nextSyncRecommended: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      };
    } finally {
      if (lockResult.lockId) {
        await this.lockService.releaseLock(lockKey, lockResult.lockId);
      }
    }
  }

  /**
   * Process full sync
   */
  @Process(PRODUCT_SYNC_JOB_NAMES.SYNC_FULL)
  async handleFullSync(job: Job<ProductSyncJobData>): Promise<ProductSyncJobResult> {
    // Full sync is similar to delta but without the updatedAfter filter
    return this.handleDeltaSync({
      ...job,
      data: {
        ...job.data,
        filter: { ...job.data.filter, updatedAfter: undefined },
      },
    });
  }

  /**
   * Process inventory-only sync
   */
  @Process(PRODUCT_SYNC_JOB_NAMES.SYNC_INVENTORY)
  async handleInventorySync(job: Job<ProductSyncJobData>): Promise<ProductSyncJobResult> {
    const { syncId, tenantId, source } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing inventory sync: ${syncId}`);

    // Fetch inventory data from source
    const inventoryData = await this.fetchInventoryFromSource(tenantId, source);

    const stats: ProductSyncStats = {
      total: inventoryData.length,
      created: 0,
      updated: 0,
      skipped: 0,
      deleted: 0,
      errors: 0,
      conflicts: 0,
      inventoryUpdates: 0,
      priceUpdates: 0,
    };

    for (const item of inventoryData) {
      try {
        await this.prisma.product.updateMany({
          where: {
            tenantId,
            OR: [
              { externalId: item.externalId },
              { sku: item.sku },
            ],
          } as any,
          data: {
            stock: item.quantity,
            updatedAt: new Date(),
          },
        });
        stats.inventoryUpdates++;
        stats.updated++;
      } catch (error) {
        stats.errors++;
      }
    }

    // Invalidate inventory cache
    await this.redis.delPattern(`inventory:${tenantId}:*`);

    return {
      success: stats.errors === 0,
      syncId,
      status: SYNC_STATUS.COMPLETED,
      stats,
      errors: [],
      conflicts: [],
      durationMs: Date.now() - startTime,
      lastSyncAt: new Date().toISOString(),
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Parse webhook event to normalized product
   */
  private parseWebhookEvent(
    webhookData: any,
    source: ProductSyncSource,
  ): NormalizedProduct | null {
    try {
      switch (source) {
        case ProductSyncSource.SHOPIFY:
          return this.parseShopifyWebhook(webhookData);
        case ProductSyncSource.WOOCOMMERCE:
          return this.parseWooCommerceWebhook(webhookData);
        default:
          return this.parseGenericWebhook(webhookData);
      }
    } catch (error) {
      this.logger.error(`Failed to parse webhook: ${error}`);
      return null;
    }
  }

  /**
   * Parse Shopify webhook
   */
  private parseShopifyWebhook(webhookData: any): NormalizedProduct {
    const payload = webhookData.payload;
    return {
      externalId: payload.id?.toString(),
      source: ProductSyncSource.SHOPIFY,
      sku: payload.variants?.[0]?.sku || payload.handle,
      name: payload.title,
      description: payload.body_html,
      price: parseFloat(payload.variants?.[0]?.price || '0'),
      compareAtPrice: payload.variants?.[0]?.compare_at_price
        ? parseFloat(payload.variants[0].compare_at_price)
        : undefined,
      currency: 'USD',
      inventoryQuantity: payload.variants?.[0]?.inventory_quantity,
      categories: payload.product_type ? [payload.product_type] : [],
      images: payload.images?.map((img: any) => img.src) || [],
      variants: payload.variants?.map((v: any) => ({
        externalId: v.id?.toString(),
        sku: v.sku,
        title: v.title,
        price: parseFloat(v.price),
        inventoryQuantity: v.inventory_quantity,
        options: { size: v.option1, color: v.option2 },
      })),
      status: payload.status === 'active' ? 'active' : 'draft',
      updatedAt: new Date(payload.updated_at),
      rawData: payload,
    };
  }

  /**
   * Parse WooCommerce webhook
   */
  private parseWooCommerceWebhook(webhookData: any): NormalizedProduct {
    const payload = webhookData.payload;
    return {
      externalId: payload.id?.toString(),
      source: ProductSyncSource.WOOCOMMERCE,
      sku: payload.sku,
      name: payload.name,
      description: payload.description,
      price: parseFloat(payload.price || '0'),
      compareAtPrice: payload.regular_price
        ? parseFloat(payload.regular_price)
        : undefined,
      currency: 'USD',
      inventoryQuantity: payload.stock_quantity,
      categories: payload.categories?.map((c: any) => c.name) || [],
      images: payload.images?.map((img: any) => img.src) || [],
      status: payload.status === 'publish' ? 'active' : 'draft',
      updatedAt: new Date(payload.date_modified),
      rawData: payload,
    };
  }

  /**
   * Parse generic webhook
   */
  private parseGenericWebhook(webhookData: any): NormalizedProduct {
    const payload = webhookData.payload;
    return {
      externalId: payload.id || payload.external_id,
      source: ProductSyncSource.CUSTOM,
      sku: payload.sku,
      name: payload.name || payload.title,
      description: payload.description,
      price: parseFloat(payload.price || '0'),
      currency: payload.currency || 'USD',
      inventoryQuantity: payload.inventory || payload.stock,
      status: 'active',
      updatedAt: new Date(),
      rawData: payload,
    };
  }

  /**
   * Sync a single product
   */
  private async syncProduct(
    tenantId: string,
    product: NormalizedProduct,
    conflictResolution: ConflictResolution,
  ): Promise<{
    action: 'created' | 'updated' | 'skipped' | 'deleted';
    inventoryUpdated: boolean;
    priceUpdated: boolean;
    conflict?: ProductConflict;
    error?: ProductSyncError;
  }> {
    // Check if product exists
    const existing = await this.prisma.product.findFirst({
      where: {
        tenantId,
        OR: [
          { externalId: product.externalId },
          { sku: product.sku },
        ],
      } as any,
    });

    if (!existing) {
      // Create new product
      await this.prisma.product.create({
        data: {
          tenantId,
          externalId: product.externalId,
          sku: product.sku,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          stock: product.inventoryQuantity || 0,
          status: product.status === 'active' ? 'ACTIVE' : 'DRAFT',
          syncSource: product.source,
          lastSyncedAt: new Date(),
        } as any,
      });

      return { action: 'created', inventoryUpdated: false, priceUpdated: false };
    }

    // Check for conflicts
    if (existing.updatedAt > product.updatedAt && conflictResolution === ConflictResolution.FLAG_FOR_REVIEW) {
      return {
        action: 'skipped',
        inventoryUpdated: false,
        priceUpdated: false,
        conflict: {
          productId: existing.id,
          externalId: product.externalId,
          sku: product.sku,
          fields: [
            {
              field: 'updatedAt',
              localValue: existing.updatedAt,
              sourceValue: product.updatedAt,
              localUpdatedAt: existing.updatedAt,
              sourceUpdatedAt: product.updatedAt,
            },
          ],
          suggestedResolution: ConflictResolution.NEWEST_WINS,
        },
      };
    }

    // Update existing product
    const inventoryUpdated = (existing as any).stock !== product.inventoryQuantity;
    const priceUpdated = existing.price !== product.price;

    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.inventoryQuantity || (existing as any).stock,
        status: product.status === 'active' ? 'ACTIVE' : 'DRAFT',
        lastSyncedAt: new Date(),
      } as any,
    });

    return { action: 'updated', inventoryUpdated, priceUpdated };
  }

  /**
   * Fetch products from source
   */
  private async fetchProductsFromSource(
    tenantId: string,
    source: ProductSyncSource,
    filter?: any,
  ): Promise<NormalizedProduct[]> {
    // In production, this would call the external API
    // For now, return empty array
    this.logger.debug(`Fetching products from ${source} for tenant ${tenantId}`);
    return [];
  }

  /**
   * Fetch inventory from source
   */
  private async fetchInventoryFromSource(
    tenantId: string,
    source: ProductSyncSource,
  ): Promise<Array<{ externalId: string; sku: string; quantity: number }>> {
    // In production, this would call the external API
    return [];
  }

  /**
   * Get last sync timestamp
   */
  private async getLastSyncTimestamp(
    tenantId: string,
    source: ProductSyncSource,
  ): Promise<Date | undefined> {
    const config = await (this.prisma as any).productSyncConfig.findFirst({
      where: { tenantId, source },
    });
    return config?.lastSyncAt || undefined;
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTimestamp(
    tenantId: string,
    source: ProductSyncSource,
  ): Promise<void> {
    await (this.prisma as any).productSyncConfig.updateMany({
      where: { tenantId, source },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * Invalidate product cache
   */
  private async invalidateProductCache(tenantId: string): Promise<void> {
    await this.redis.delPattern(`product:${tenantId}:*`);
    await this.redis.delPattern(`products:${tenantId}:*`);
  }

  // ==================== Queue Event Handlers ====================

  @OnQueueActive()
  onActive(job: Job<ProductSyncJobData>) {
    this.logger.debug(`Processing sync job ${job.id}: ${job.data.syncId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<ProductSyncJobData>, result: ProductSyncJobResult) {
    this.logger.log(
      `Sync job ${job.id} completed: ${result.stats.created} created, ${result.stats.updated} updated in ${result.durationMs}ms`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<ProductSyncJobData>, error: Error) {
    this.logger.error(`Sync job ${job.id} failed: ${error.message}`);
  }
}
