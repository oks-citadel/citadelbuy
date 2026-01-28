/**
 * Sync Service
 *
 * Orchestrates product synchronization from external connectors.
 * Handles full sync, delta sync, conflict resolution, and progress tracking.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  IConnector,
  NormalizedProduct,
  SyncResult,
  SyncError,
  SyncWarning,
  ConnectorEventType,
} from './base/connector.interface';
import { ConnectorFactory } from './base/connector.factory';
import { ProductValidator, ProductComparator, ProductTransformer } from './base/normalized-product.model';
import {
  SyncStatusEnum,
  SyncTypeEnum,
  TriggerSyncDto,
  SyncStatusResponseDto,
  SyncResultDto,
} from './dto/sync-result.dto';

/**
 * Sync job state
 */
interface SyncJob {
  id: string;
  connectorId: string;
  tenantId: string;
  type: SyncTypeEnum;
  status: SyncStatusEnum;
  startedAt: Date;
  completedAt?: Date;
  totalItems: number;
  processedItems: number;
  createdItems: number;
  updatedItems: number;
  deletedItems: number;
  skippedItems: number;
  failedItems: number;
  errors: SyncError[];
  warnings: SyncWarning[];
  phase?: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly activeJobs: Map<string, SyncJob> = new Map();
  private readonly jobHistory: Map<string, SyncJob[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Trigger a sync for a connector
   */
  async triggerSync(
    connectorId: string,
    tenantId: string,
    options: TriggerSyncDto,
  ): Promise<SyncStatusResponseDto> {
    // Check if a sync is already in progress
    const existingJob = this.findActiveJob(connectorId);
    if (existingJob && !options.force) {
      return this.jobToStatusResponse(existingJob);
    }

    // Get connector configuration
    const connectorConfig = await this.prisma.connectorConfig.findFirst({
      where: { id: connectorId, tenantId },
    });

    if (!connectorConfig) {
      throw new NotFoundException('Connector not found');
    }

    if (!connectorConfig.isActive) {
      throw new BadRequestException('Connector is not active');
    }

    // Create sync job
    const jobId = `sync-${connectorId}-${Date.now()}`;
    const job: SyncJob = {
      id: jobId,
      connectorId,
      tenantId,
      type: options.type || SyncTypeEnum.FULL,
      status: SyncStatusEnum.PENDING,
      startedAt: new Date(),
      totalItems: 0,
      processedItems: 0,
      createdItems: 0,
      updatedItems: 0,
      deletedItems: 0,
      skippedItems: 0,
      failedItems: 0,
      errors: [],
      warnings: [],
    };

    this.activeJobs.set(jobId, job);

    // Run sync asynchronously
    this.executeSyncJob(job, connectorConfig, options).catch((error) => {
      this.logger.error(`Sync job ${jobId} failed: ${error.message}`);
    });

    return this.jobToStatusResponse(job);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(connectorId: string, tenantId: string): Promise<SyncStatusResponseDto | null> {
    const job = this.findActiveJob(connectorId);

    if (!job) {
      // Check history for most recent job
      const history = this.jobHistory.get(connectorId);
      if (history && history.length > 0) {
        return this.jobToStatusResponse(history[history.length - 1]);
      }
      return null;
    }

    return this.jobToStatusResponse(job);
  }

  /**
   * Get sync history
   */
  async getSyncHistory(connectorId: string, tenantId: string, limit: number = 10): Promise<SyncStatusResponseDto[]> {
    const history = this.jobHistory.get(connectorId) || [];
    return history.slice(-limit).map((job) => this.jobToStatusResponse(job));
  }

  /**
   * Cancel an active sync
   */
  async cancelSync(connectorId: string, tenantId: string): Promise<boolean> {
    const job = this.findActiveJob(connectorId);

    if (job) {
      job.status = SyncStatusEnum.CANCELLED;
      job.completedAt = new Date();
      this.moveToHistory(job);
      return true;
    }

    return false;
  }

  /**
   * Execute sync job
   */
  private async executeSyncJob(
    job: SyncJob,
    connectorConfig: any,
    options: TriggerSyncDto,
  ): Promise<void> {
    try {
      job.status = SyncStatusEnum.IN_PROGRESS;
      job.phase = 'Initializing connector';

      // Create connector instance
      const connector = await this.connectorFactory.create({
        id: connectorConfig.id,
        tenantId: connectorConfig.tenantId,
        type: connectorConfig.type.toLowerCase() as any,
        name: connectorConfig.name,
        isActive: connectorConfig.isActive,
        credentials: connectorConfig.config?.credentials,
        settings: connectorConfig.config?.settings,
      });

      job.phase = 'Fetching products';

      // Determine sync type
      if (options.type === SyncTypeEnum.DELTA && options.since) {
        await this.executeDeltaSync(job, connector, options.since, options.dryRun);
      } else if (options.externalIds && options.externalIds.length > 0) {
        await this.executeScopedSync(job, connector, options.externalIds, options.dryRun);
      } else {
        await this.executeFullSync(job, connector, options.dryRun);
      }

      // Disconnect connector
      await connector.disconnect();

      // Mark job as completed
      job.status = job.failedItems > 0 ? SyncStatusEnum.PARTIAL : SyncStatusEnum.COMPLETED;
      job.completedAt = new Date();
      job.phase = 'Completed';

      // Update connector's last sync info
      await this.updateConnectorSyncStatus(connectorConfig.id, job);

      this.moveToHistory(job);
    } catch (error) {
      job.status = SyncStatusEnum.FAILED;
      job.completedAt = new Date();
      job.errors.push({
        message: error.message,
        code: 'SYNC_FAILED',
      });
      job.phase = 'Failed';

      this.moveToHistory(job);
      throw error;
    }
  }

  /**
   * Execute full sync
   */
  private async executeFullSync(job: SyncJob, connector: IConnector, dryRun: boolean = false): Promise<void> {
    let hasMore = true;
    let cursor: string | undefined;
    let page = 1;

    // Get existing product mappings
    const existingMappings = await this.getExistingProductMappings(job.connectorId);
    const processedExternalIds = new Set<string>();

    while (hasMore && job.status !== SyncStatusEnum.CANCELLED) {
      job.phase = `Fetching page ${page}`;

      const result = await connector.fetchProducts({ cursor, limit: 100 });
      job.totalItems += result.data.length;

      for (const product of result.data) {
        if (job.status === SyncStatusEnum.CANCELLED) break;

        await this.processProduct(job, product, existingMappings, dryRun);
        processedExternalIds.add(product.externalId);
      }

      hasMore = result.pagination.hasMore;
      cursor = result.pagination.nextCursor;
      page++;
    }

    // Handle deleted products (in existing mappings but not in source)
    if (!dryRun) {
      for (const [externalId, mapping] of existingMappings) {
        if (!processedExternalIds.has(externalId)) {
          await this.handleDeletedProduct(job, externalId, mapping);
        }
      }
    }
  }

  /**
   * Execute delta sync
   */
  private async executeDeltaSync(
    job: SyncJob,
    connector: IConnector,
    since: Date,
    dryRun: boolean = false,
  ): Promise<void> {
    let hasMore = true;
    let cursor: string | undefined;
    let page = 1;

    const existingMappings = await this.getExistingProductMappings(job.connectorId);

    while (hasMore && job.status !== SyncStatusEnum.CANCELLED) {
      job.phase = `Fetching changes (page ${page})`;

      const result = await connector.fetchProducts({ cursor, limit: 100, since });
      job.totalItems += result.data.length;

      for (const product of result.data) {
        if (job.status === SyncStatusEnum.CANCELLED) break;

        await this.processProduct(job, product, existingMappings, dryRun);
      }

      hasMore = result.pagination.hasMore;
      cursor = result.pagination.nextCursor;
      page++;
    }
  }

  /**
   * Execute scoped sync (specific product IDs)
   */
  private async executeScopedSync(
    job: SyncJob,
    connector: IConnector,
    externalIds: string[],
    dryRun: boolean = false,
  ): Promise<void> {
    job.totalItems = externalIds.length;
    const existingMappings = await this.getExistingProductMappings(job.connectorId);

    for (const externalId of externalIds) {
      if (job.status === SyncStatusEnum.CANCELLED) break;

      job.phase = `Fetching product ${externalId}`;

      try {
        const product = await connector.fetchProduct(externalId);

        if (product) {
          await this.processProduct(job, product, existingMappings, dryRun);
        } else {
          job.skippedItems++;
          job.warnings.push({
            externalId,
            message: 'Product not found in source',
            code: 'NOT_FOUND',
          });
        }
      } catch (error) {
        job.failedItems++;
        job.errors.push({
          externalId,
          message: error.message,
          code: 'FETCH_ERROR',
        });
      }
    }
  }

  /**
   * Process a single product
   */
  private async processProduct(
    job: SyncJob,
    product: NormalizedProduct,
    existingMappings: Map<string, any>,
    dryRun: boolean,
  ): Promise<void> {
    job.processedItems++;
    const progress = Math.floor((job.processedItems / Math.max(job.totalItems, 1)) * 100);

    // Emit progress event
    this.eventEmitter.emit('sync.progress', {
      jobId: job.id,
      connectorId: job.connectorId,
      progress,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
    });

    try {
      // Validate product
      const validation = ProductValidator.validate(product);
      if (!validation.valid) {
        job.warnings.push({
          externalId: product.externalId,
          message: `Validation warnings: ${validation.errors.join(', ')}`,
          code: 'VALIDATION',
        });
      }

      // Sanitize product
      const sanitizedProduct = ProductValidator.sanitize(product);

      // Check if product exists
      const existingMapping = existingMappings.get(product.externalId);

      if (existingMapping) {
        // Update existing product
        if (!dryRun) {
          await this.updateProduct(sanitizedProduct, existingMapping, job);
        }
        job.updatedItems++;
      } else {
        // Create new product
        if (!dryRun) {
          await this.createProduct(sanitizedProduct, job);
        }
        job.createdItems++;
      }
    } catch (error) {
      job.failedItems++;
      job.errors.push({
        externalId: product.externalId,
        message: error.message,
        code: 'PROCESS_ERROR',
      });
    }
  }

  /**
   * Create a new product from connector
   */
  private async createProduct(product: NormalizedProduct, job: SyncJob): Promise<void> {
    // Generate slug
    const slug = ProductTransformer.generateSlug(product.name) + `-${Date.now()}`;

    // Create product in database
    const createdProduct = await this.prisma.product.create({
      data: {
        name: product.name,
        slug,
        description: product.description,
        price: product.price,
        images: product.images,
        stock: product.inventory?.quantity || 0,
        vendorId: job.tenantId, // Use tenant as vendor for now
        categoryId: await this.findOrCreateCategory(product.categories[0] || 'Uncategorized'),
        sku: product.sku,
        barcode: product.barcode,
        tags: product.tags || [],
        status: product.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        isActive: product.status === 'active',
        trackInventory: product.inventory?.trackInventory || false,
        weight: product.dimensions?.weight,
        metaTitle: product.seo?.title,
        metaDescription: product.seo?.description,
      },
    });

    // Create product source mapping
    await this.prisma.productSource.create({
      data: {
        productId: createdProduct.id,
        connectorId: job.connectorId,
        externalId: product.externalId,
        lastSyncAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });

    // Emit event
    this.eventEmitter.emit('product.created', {
      productId: createdProduct.id,
      connectorId: job.connectorId,
      externalId: product.externalId,
    });
  }

  /**
   * Update an existing product
   */
  private async updateProduct(product: NormalizedProduct, mapping: any, job: SyncJob): Promise<void> {
    await this.prisma.product.update({
      where: { id: mapping.productId },
      data: {
        name: product.name,
        description: product.description,
        price: product.price,
        images: product.images,
        stock: product.inventory?.quantity || 0,
        tags: product.tags || [],
        status: product.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        isActive: product.status === 'active',
        weight: product.dimensions?.weight,
        metaTitle: product.seo?.title,
        metaDescription: product.seo?.description,
      },
    });

    // Update source mapping
    await this.prisma.productSource.update({
      where: { id: mapping.id },
      data: {
        lastSyncAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });

    // Emit event
    this.eventEmitter.emit('product.updated', {
      productId: mapping.productId,
      connectorId: job.connectorId,
      externalId: product.externalId,
    });
  }

  /**
   * Handle deleted product
   */
  private async handleDeletedProduct(job: SyncJob, externalId: string, mapping: any): Promise<void> {
    // Option 1: Mark as inactive (soft delete)
    await this.prisma.product.update({
      where: { id: mapping.productId },
      data: {
        isActive: false,
        status: 'INACTIVE',
      },
    });

    await this.prisma.productSource.update({
      where: { id: mapping.id },
      data: {
        syncStatus: 'DELETED' as any,
        lastSyncAt: new Date(),
      },
    });

    job.deletedItems++;

    this.eventEmitter.emit('product.deleted', {
      productId: mapping.productId,
      connectorId: job.connectorId,
      externalId,
    });
  }

  /**
   * Get existing product mappings for connector
   */
  private async getExistingProductMappings(connectorId: string): Promise<Map<string, any>> {
    const mappings = await this.prisma.productSource.findMany({
      where: { connectorId },
    });

    return new Map(mappings.map((m) => [m.externalId, m]));
  }

  /**
   * Find or create category by name
   */
  private async findOrCreateCategory(categoryName: string): Promise<string> {
    const slug = ProductTransformer.generateSlug(categoryName);

    let category = await this.prisma.category.findFirst({
      where: {
        OR: [{ name: categoryName }, { slug }],
      },
    });

    if (!category) {
      category = await this.prisma.category.create({
        data: {
          name: categoryName,
          slug,
        },
      });
    }

    return category.id;
  }

  /**
   * Update connector sync status
   */
  private async updateConnectorSyncStatus(connectorId: string, job: SyncJob): Promise<void> {
    await this.prisma.connectorConfig.update({
      where: { id: connectorId },
      data: {
        lastSyncAt: job.completedAt || new Date(),
        lastSyncStatus: job.status,
      },
    });
  }

  /**
   * Find active job for connector
   */
  private findActiveJob(connectorId: string): SyncJob | undefined {
    for (const job of this.activeJobs.values()) {
      if (job.connectorId === connectorId && job.status === SyncStatusEnum.IN_PROGRESS) {
        return job;
      }
    }
    return undefined;
  }

  /**
   * Move job to history
   */
  private moveToHistory(job: SyncJob): void {
    this.activeJobs.delete(job.id);

    const history = this.jobHistory.get(job.connectorId) || [];
    history.push(job);

    // Keep last 50 jobs
    if (history.length > 50) {
      history.shift();
    }

    this.jobHistory.set(job.connectorId, history);
  }

  /**
   * Convert job to status response DTO
   */
  private jobToStatusResponse(job: SyncJob): SyncStatusResponseDto {
    return {
      jobId: job.id,
      connectorId: job.connectorId,
      status: job.status,
      type: job.type,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      progress: Math.floor((job.processedItems / Math.max(job.totalItems, 1)) * 100),
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      phase: job.phase,
      errorMessage: job.errors.length > 0 ? job.errors[0].message : undefined,
      result:
        job.status === SyncStatusEnum.COMPLETED || job.status === SyncStatusEnum.PARTIAL
          ? {
              success: job.failedItems === 0,
              connectorId: job.connectorId,
              startedAt: job.startedAt,
              completedAt: job.completedAt || new Date(),
              summary: {
                totalProcessed: job.processedItems,
                created: job.createdItems,
                updated: job.updatedItems,
                deleted: job.deletedItems,
                skipped: job.skippedItems,
                failed: job.failedItems,
              },
              errors: job.errors,
              warnings: job.warnings,
            }
          : undefined,
    };
  }

  /**
   * Scheduled sync for active connectors
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync(): Promise<void> {
    this.logger.log('Running scheduled connector sync');

    const activeConnectors = await this.prisma.connectorConfig.findMany({
      where: {
        isActive: true,
      },
    });

    for (const connector of activeConnectors) {
      try {
        // Only sync if not synced in last hour
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (!connector.lastSyncAt || connector.lastSyncAt < hourAgo) {
          await this.triggerSync(connector.id, connector.tenantId, {
            type: SyncTypeEnum.DELTA,
            since: connector.lastSyncAt || undefined,
          });
        }
      } catch (error) {
        this.logger.error(`Scheduled sync failed for connector ${connector.id}: ${error.message}`);
      }
    }
  }

  /**
   * Handle connector product update events
   */
  @OnEvent(ConnectorEventType.PRODUCT_UPDATED)
  async handleProductUpdated(payload: any): Promise<void> {
    // This can be used for real-time updates from webhooks
    this.logger.debug(`Product updated event: ${payload.data?.product?.externalId}`);
  }
}
