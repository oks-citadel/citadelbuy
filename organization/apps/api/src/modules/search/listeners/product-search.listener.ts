import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  BulkProductIndexEvent,
} from '../events/product-search.events';
import { SearchService } from '../search.service';

/**
 * Product Search Event Listener
 * Automatically indexes products when they are created, updated, or deleted
 */
@Injectable()
export class ProductSearchListener {
  private readonly logger = new Logger(ProductSearchListener.name);

  constructor(private readonly searchService: SearchService) {}

  /**
   * Handle product created event
   */
  @OnEvent('product.created', { async: true })
  async handleProductCreated(event: ProductCreatedEvent) {
    try {
      this.logger.debug(`Indexing newly created product: ${event.productId}`);
      await this.searchService.indexProduct(event.productId);
      this.logger.debug(`Successfully indexed product: ${event.productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to index product ${event.productId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle product updated event
   */
  @OnEvent('product.updated', { async: true })
  async handleProductUpdated(event: ProductUpdatedEvent) {
    try {
      this.logger.debug(`Re-indexing updated product: ${event.productId}`);
      await this.searchService.updateProductInIndex(event.productId);
      this.logger.debug(`Successfully re-indexed product: ${event.productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to re-index product ${event.productId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle product deleted event
   */
  @OnEvent('product.deleted', { async: true })
  async handleProductDeleted(event: ProductDeletedEvent) {
    try {
      this.logger.debug(`Removing deleted product from index: ${event.productId}`);
      await this.searchService.deleteProductFromIndex(event.productId);
      this.logger.debug(`Successfully removed product from index: ${event.productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove product ${event.productId} from index: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle bulk product indexing event
   */
  @OnEvent('product.bulk-index', { async: true })
  async handleBulkProductIndex(event: BulkProductIndexEvent) {
    try {
      this.logger.log('Starting bulk product indexing...');
      const result = await this.searchService.bulkIndexProducts(event.productIds);
      this.logger.log(
        `Bulk indexing completed: ${result.indexed} products indexed using ${result.provider}`,
      );
    } catch (error) {
      this.logger.error(`Failed to bulk index products: ${error.message}`, error.stack);
    }
  }
}
