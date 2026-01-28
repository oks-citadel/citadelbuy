import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SearchProviderFactory } from '../providers/search-provider.factory';
import { ProductDocument } from '../providers/search-provider.interface';

/**
 * Search Indexing Service
 * Handles automatic synchronization of data to Elasticsearch
 * Provides batch indexing, incremental updates, and scheduled sync
 */
@Injectable()
export class SearchIndexingService {
  private readonly logger = new Logger(SearchIndexingService.name);
  private isIndexing = false;
  private lastSyncTime: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchProviderFactory: SearchProviderFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Full reindex of all products
   * Should be run during maintenance windows or initial setup
   */
  async reindexAll(options?: { deleteExisting?: boolean; batchSize?: number }): Promise<{
    indexed: number;
    failed: number;
    duration: number;
  }> {
    const { deleteExisting = false, batchSize = 1000 } = options || {};

    if (this.isIndexing) {
      throw new Error('Indexing is already in progress');
    }

    this.isIndexing = true;
    const startTime = Date.now();
    let totalIndexed = 0;
    let totalFailed = 0;

    try {
      const provider = await this.searchProviderFactory.getProvider();

      // Delete existing index if requested
      if (deleteExisting) {
        this.logger.log('Deleting existing index...');
        const elasticsearchProvider = provider as any;
        if (elasticsearchProvider.deleteIndex) {
          await elasticsearchProvider.deleteIndex();
          await elasticsearchProvider.ensureIndex();
        }
      }

      // Get total count
      const totalProducts = await this.prisma.product.count({
        where: { status: 'ACTIVE' },
      });

      this.logger.log(`Starting full reindex of ${totalProducts} products...`);

      // Process in batches
      let offset = 0;
      while (offset < totalProducts) {
        this.logger.log(`Processing batch ${offset / batchSize + 1}...`);

        const products = await this.fetchProductsForIndexing(batchSize, offset);

        if (products.length === 0) break;

        try {
          await provider.bulkIndexProducts(products);
          totalIndexed += products.length;
          this.logger.log(`Indexed ${totalIndexed}/${totalProducts} products`);
        } catch (error) {
          this.logger.error(`Failed to index batch at offset ${offset}: ${error.message}`);
          totalFailed += products.length;
        }

        offset += batchSize;

        // Small delay to prevent overwhelming the system
        await this.delay(100);
      }

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Full reindex completed: ${totalIndexed} indexed, ${totalFailed} failed, ${duration}ms`,
      );

      return { indexed: totalIndexed, failed: totalFailed, duration };
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Incremental sync - only index products modified since last sync
   */
  async incrementalSync(): Promise<{
    indexed: number;
    deleted: number;
    duration: number;
  }> {
    if (this.isIndexing) {
      this.logger.warn('Indexing already in progress, skipping incremental sync');
      return { indexed: 0, deleted: 0, duration: 0 };
    }

    this.isIndexing = true;
    const startTime = Date.now();
    let totalIndexed = 0;
    let totalDeleted = 0;

    try {
      const provider = await this.searchProviderFactory.getProvider();

      // Get last sync time (default to 1 hour ago if never synced)
      const syncTime =
        this.lastSyncTime || new Date(Date.now() - 60 * 60 * 1000);

      this.logger.log(`Starting incremental sync from ${syncTime.toISOString()}...`);

      // Find updated/created products
      const updatedProducts = await this.prisma.product.findMany({
        where: {
          updatedAt: { gte: syncTime },
          status: 'ACTIVE',
        },
        include: {
          category: true,
          vendor: {
            select: { id: true, name: true },
          },
          variants: {
            select: { id: true, price: true },
          },
          reviews: {
            select: { rating: true },
          },
        },
      });

      if (updatedProducts.length > 0) {
        this.logger.log(`Found ${updatedProducts.length} updated products`);

        const productDocuments = updatedProducts.map((p) =>
          this.transformToProductDocument(p),
        );

        await provider.bulkIndexProducts(productDocuments);
        totalIndexed = updatedProducts.length;
      }

      // Find deleted/deactivated products
      const deletedProducts = await this.prisma.product.findMany({
        where: {
          updatedAt: { gte: syncTime },
          status: { not: 'ACTIVE' },
        },
        select: { id: true },
      });

      if (deletedProducts.length > 0) {
        this.logger.log(`Found ${deletedProducts.length} deleted/deactivated products`);

        for (const product of deletedProducts) {
          try {
            await provider.deleteProduct(product.id);
            totalDeleted++;
          } catch (error) {
            this.logger.error(`Failed to delete product ${product.id}: ${error.message}`);
          }
        }
      }

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Incremental sync completed: ${totalIndexed} indexed, ${totalDeleted} deleted, ${duration}ms`,
      );

      return { indexed: totalIndexed, deleted: totalDeleted, duration };
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Scheduled incremental sync (runs every 5 minutes)
   * Can be disabled via DISABLE_SEARCH_AUTO_SYNC env var
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledSync() {
    if (process.env.DISABLE_SEARCH_AUTO_SYNC === 'true') {
      return;
    }

    try {
      await this.incrementalSync();
    } catch (error) {
      this.logger.error(`Scheduled sync failed: ${error.message}`);
    }
  }

  /**
   * Index specific products by IDs
   */
  async indexProductsByIds(productIds: string[]): Promise<{
    indexed: number;
    failed: number;
  }> {
    const provider = await this.searchProviderFactory.getProvider();
    let indexed = 0;
    let failed = 0;

    this.logger.log(`Indexing ${productIds.length} specific products...`);

    for (const productId of productIds) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          include: {
            category: true,
            vendor: {
              select: { id: true, name: true },
            },
            variants: {
              select: { id: true, price: true },
            },
            reviews: {
              select: { rating: true },
            },
          },
        });

        if (product) {
          const productDocument = this.transformToProductDocument(product);
          await provider.indexProduct(productDocument);
          indexed++;
        } else {
          this.logger.warn(`Product ${productId} not found, skipping...`);
          failed++;
        }
      } catch (error) {
        this.logger.error(`Failed to index product ${productId}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`Indexed ${indexed}/${productIds.length} products (${failed} failed)`);

    return { indexed, failed };
  }

  /**
   * Remove products from index by IDs
   */
  async deleteProductsByIds(productIds: string[]): Promise<{
    deleted: number;
    failed: number;
  }> {
    const provider = await this.searchProviderFactory.getProvider();
    let deleted = 0;
    let failed = 0;

    this.logger.log(`Deleting ${productIds.length} products from index...`);

    for (const productId of productIds) {
      try {
        await provider.deleteProduct(productId);
        deleted++;
      } catch (error) {
        this.logger.error(`Failed to delete product ${productId}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`Deleted ${deleted}/${productIds.length} products (${failed} failed)`);

    return { deleted, failed };
  }

  /**
   * Get indexing status
   */
  getStatus(): {
    isIndexing: boolean;
    lastSyncTime: Date | null;
    autoSyncEnabled: boolean;
  } {
    return {
      isIndexing: this.isIndexing,
      lastSyncTime: this.lastSyncTime,
      autoSyncEnabled: process.env.DISABLE_SEARCH_AUTO_SYNC !== 'true',
    };
  }

  /**
   * Verify index health
   */
  async verifyIndexHealth(): Promise<{
    healthy: boolean;
    databaseCount: number;
    indexCount: number;
    difference: number;
  }> {
    const provider = await this.searchProviderFactory.getProvider();

    // Get database count
    const databaseCount = await this.prisma.product.count({
      where: { status: 'ACTIVE' },
    });

    // Get index count (Elasticsearch specific)
    let indexCount = 0;
    const elasticsearchProvider = provider as any;
    if (elasticsearchProvider.getIndexStats) {
      const stats = await elasticsearchProvider.getIndexStats();
      indexCount = stats?.documentCount || 0;
    }

    const difference = Math.abs(databaseCount - indexCount);
    const healthy = difference < 10; // Allow small difference

    this.logger.log(
      `Index health check: DB=${databaseCount}, Index=${indexCount}, Diff=${difference}, Healthy=${healthy}`,
    );

    return {
      healthy,
      databaseCount,
      indexCount,
      difference,
    };
  }

  // Private helper methods

  private async fetchProductsForIndexing(
    limit: number,
    offset: number,
  ): Promise<ProductDocument[]> {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      skip: offset,
      take: limit,
      include: {
        category: true,
        vendor: {
          select: { id: true, name: true },
        },
        variants: {
          select: { id: true, price: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    return products.map((p) => this.transformToProductDocument(p));
  }

  private transformToProductDocument(product: any): ProductDocument {
    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
          product.reviews.length
        : undefined;

    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      compareAtPrice: product.compareAtPrice || undefined,
      sku: product.sku || undefined,
      barcode: product.barcode || undefined,
      images: product.images || [],
      categoryId: product.categoryId,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      vendorId: product.vendorId,
      vendorName: product.vendor.name,
      stock: product.stock,
      inStock: product.stock > 0,
      tags: product.tags || [],
      avgRating,
      reviewCount: product.reviews.length,
      salesCount: 0, // Can be calculated from orders if needed
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      hasVariants: product.variants.length > 0,
      variantCount: product.variants.length,
      minVariantPrice:
        product.variants.length > 0
          ? Math.min(...product.variants.map((v: any) => v.price ?? 0))
          : undefined,
      maxVariantPrice:
        product.variants.length > 0
          ? Math.max(...product.variants.map((v: any) => v.price ?? 0))
          : undefined,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
