import { Controller, Post, Get, Delete, UseGuards, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchProviderFactory } from './providers/search-provider.factory';
import { SearchIndexingService } from './services/search-indexing.service';
import { CategoryVendorIndexingService } from './services/category-vendor-indexing.service';
import { ElasticsearchProvider } from './providers/elasticsearch.provider';
import { ElasticsearchEnhancedProvider } from './providers/elasticsearch-enhanced.provider';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Enhanced Admin Controller for Search Index Management
 * Provides comprehensive endpoints for managing search indexes
 */
@ApiTags('Search Admin')
@ApiBearerAuth()
@Controller('admin/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SearchAdminEnhancedController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchProviderFactory: SearchProviderFactory,
    private readonly searchIndexingService: SearchIndexingService,
    private readonly categoryVendorIndexingService: CategoryVendorIndexingService,
  ) {}

  // ==================== Product Index Management ====================

  /**
   * Full reindex of all products
   */
  @Post('index/products/rebuild')
  @ApiOperation({ summary: 'Rebuild entire product search index' })
  @ApiResponse({ status: 200, description: 'Index rebuilt successfully' })
  async rebuildProductIndex(
    @Query('deleteFirst') deleteFirst?: boolean,
    @Query('batchSize') batchSize?: number,
  ) {
    const result = await this.searchIndexingService.reindexAll({
      deleteExisting: deleteFirst === true || String(deleteFirst) === 'true',
      batchSize: batchSize ? parseInt(batchSize.toString()) : 1000,
    });

    return {
      success: true,
      message: 'Product index rebuilt successfully',
      ...result,
    };
  }

  /**
   * Incremental sync - index only changed products
   */
  @Post('index/products/sync')
  @ApiOperation({ summary: 'Incremental sync of modified products' })
  @ApiResponse({ status: 200, description: 'Sync completed successfully' })
  async syncProducts() {
    const result = await this.searchIndexingService.incrementalSync();

    return {
      success: true,
      message: 'Product sync completed successfully',
      ...result,
    };
  }

  /**
   * Index specific products by IDs
   */
  @Post('index/products/batch')
  @ApiOperation({ summary: 'Index specific products by IDs' })
  @ApiResponse({ status: 200, description: 'Products indexed successfully' })
  async indexProductsBatch(@Body() body: { productIds: string[] }) {
    const result = await this.searchIndexingService.indexProductsByIds(body.productIds);

    return {
      success: true,
      message: 'Products indexed successfully',
      ...result,
    };
  }

  /**
   * Index a single product
   */
  @Post('index/products/:productId')
  @ApiOperation({ summary: 'Index a single product' })
  @ApiResponse({ status: 200, description: 'Product indexed successfully' })
  async indexProduct(@Param('productId') productId: string) {
    await this.searchService.indexProduct(productId);

    return {
      success: true,
      message: `Product ${productId} indexed successfully`,
    };
  }

  /**
   * Delete products from index by IDs
   */
  @Delete('index/products/batch')
  @ApiOperation({ summary: 'Delete products from index' })
  @ApiResponse({ status: 200, description: 'Products deleted successfully' })
  async deleteProductsBatch(@Body() body: { productIds: string[] }) {
    const result = await this.searchIndexingService.deleteProductsByIds(body.productIds);

    return {
      success: true,
      message: 'Products deleted from index',
      ...result,
    };
  }

  /**
   * Delete product from index
   */
  @Delete('index/products/:productId')
  @ApiOperation({ summary: 'Delete product from search index' })
  @ApiResponse({ status: 200, description: 'Product deleted from index' })
  async deleteProduct(@Param('productId') productId: string) {
    await this.searchService.deleteProductFromIndex(productId);

    return {
      success: true,
      message: `Product ${productId} removed from index`,
    };
  }

  // ==================== Category Index Management ====================

  /**
   * Index all categories
   */
  @Post('index/categories/rebuild')
  @ApiOperation({ summary: 'Rebuild category search index' })
  @ApiResponse({ status: 200, description: 'Categories indexed successfully' })
  async rebuildCategoryIndex() {
    const result = await this.categoryVendorIndexingService.indexAllCategories();

    return {
      success: true,
      message: 'Category index rebuilt successfully',
      ...result,
    };
  }

  /**
   * Index a single category
   */
  @Post('index/categories/:categoryId')
  @ApiOperation({ summary: 'Index a single category' })
  @ApiResponse({ status: 200, description: 'Category indexed successfully' })
  async indexCategory(@Param('categoryId') categoryId: string) {
    await this.categoryVendorIndexingService.indexCategory(categoryId);

    return {
      success: true,
      message: `Category ${categoryId} indexed successfully`,
    };
  }

  /**
   * Delete category from index
   */
  @Delete('index/categories/:categoryId')
  @ApiOperation({ summary: 'Delete category from search index' })
  @ApiResponse({ status: 200, description: 'Category deleted from index' })
  async deleteCategory(@Param('categoryId') categoryId: string) {
    await this.categoryVendorIndexingService.deleteCategory(categoryId);

    return {
      success: true,
      message: `Category ${categoryId} removed from index`,
    };
  }

  // ==================== Vendor Index Management ====================

  /**
   * Index all vendors
   */
  @Post('index/vendors/rebuild')
  @ApiOperation({ summary: 'Rebuild vendor search index' })
  @ApiResponse({ status: 200, description: 'Vendors indexed successfully' })
  async rebuildVendorIndex() {
    const result = await this.categoryVendorIndexingService.indexAllVendors();

    return {
      success: true,
      message: 'Vendor index rebuilt successfully',
      ...result,
    };
  }

  /**
   * Index a single vendor
   */
  @Post('index/vendors/:vendorId')
  @ApiOperation({ summary: 'Index a single vendor' })
  @ApiResponse({ status: 200, description: 'Vendor indexed successfully' })
  async indexVendor(@Param('vendorId') vendorId: string) {
    await this.categoryVendorIndexingService.indexVendor(vendorId);

    return {
      success: true,
      message: `Vendor ${vendorId} indexed successfully`,
    };
  }

  /**
   * Delete vendor from index
   */
  @Delete('index/vendors/:vendorId')
  @ApiOperation({ summary: 'Delete vendor from search index' })
  @ApiResponse({ status: 200, description: 'Vendor deleted from index' })
  async deleteVendor(@Param('vendorId') vendorId: string) {
    await this.categoryVendorIndexingService.deleteVendor(vendorId);

    return {
      success: true,
      message: `Vendor ${vendorId} removed from index`,
    };
  }

  // ==================== Full Rebuild ====================

  /**
   * Rebuild all search indices (products, categories, vendors)
   */
  @Post('index/rebuild-all')
  @ApiOperation({ summary: 'Rebuild all search indices' })
  @ApiResponse({ status: 200, description: 'All indices rebuilt successfully' })
  async rebuildAllIndices(
    @Query('deleteFirst') deleteFirst?: boolean,
    @Query('batchSize') batchSize?: number,
  ) {
    const products = await this.searchIndexingService.reindexAll({
      deleteExisting: deleteFirst === true || String(deleteFirst) === 'true',
      batchSize: batchSize ? parseInt(batchSize.toString()) : 1000,
    });

    const { categories, vendors } = await this.categoryVendorIndexingService.rebuildAll();

    return {
      success: true,
      message: 'All indices rebuilt successfully',
      products,
      categories,
      vendors,
    };
  }

  // ==================== Index Status and Health ====================

  /**
   * Get indexing status
   */
  @Get('status')
  @ApiOperation({ summary: 'Get search indexing status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getIndexingStatus() {
    const status = this.searchIndexingService.getStatus();
    const provider = await this.searchService.getCurrentProvider();

    return {
      ...status,
      provider,
    };
  }

  /**
   * Verify index health
   */
  @Get('health')
  @ApiOperation({ summary: 'Verify search index health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async verifyHealth() {
    const health = await this.searchIndexingService.verifyIndexHealth();

    return {
      success: health.healthy,
      message: health.healthy
        ? 'Index is healthy'
        : `Index health issue detected: ${health.difference} document difference`,
      ...health,
    };
  }

  /**
   * Get search provider information
   */
  @Get('provider')
  @ApiOperation({ summary: 'Get current search provider information' })
  @ApiResponse({ status: 200, description: 'Provider information retrieved' })
  async getProviderInfo() {
    const current = await this.searchService.getCurrentProvider();
    const available = await this.searchService.getAvailableProviders();

    return {
      current,
      available,
    };
  }

  /**
   * Get index statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get search index statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats() {
    const provider = await this.searchProviderFactory.getProvider();

    const stats: any = {
      provider: provider.getProviderName(),
      available: await provider.isAvailable(),
    };

    // Get Elasticsearch-specific stats
    if (
      provider instanceof ElasticsearchProvider ||
      provider instanceof ElasticsearchEnhancedProvider
    ) {
      const esStats = await (provider as any).getIndexStats();
      if (esStats) {
        stats.elasticsearch = {
          indexName: esStats.indexName,
          documentCount: esStats.documentCount,
          storeSizeBytes: esStats.storeSizeBytes,
          storeSize: this.formatBytes(esStats.storeSizeBytes),
        };
      }
    }

    return stats;
  }

  /**
   * Test search functionality
   */
  @Get('test')
  @ApiOperation({ summary: 'Test search functionality' })
  @ApiResponse({ status: 200, description: 'Search test completed' })
  async testSearch(@Query('query') query: string = 'test') {
    const startTime = Date.now();

    const results = await this.searchService.searchProducts({
      query,
      page: 1,
      limit: 10,
    });

    const took = Date.now() - startTime;

    return {
      success: true,
      query,
      resultsCount: results.total,
      tookMs: took,
      provider: results.provider,
      sampleProducts: results.products.slice(0, 3).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      })),
    };
  }

  /**
   * Refresh the index
   */
  @Post('index/refresh')
  @ApiOperation({ summary: 'Refresh search index' })
  @ApiResponse({ status: 200, description: 'Index refreshed' })
  async refreshIndex() {
    const provider = await this.searchProviderFactory.getProvider();

    if (
      provider instanceof ElasticsearchProvider ||
      provider instanceof ElasticsearchEnhancedProvider
    ) {
      await (provider as any).refreshIndex();
      return {
        success: true,
        message: 'Index refreshed successfully',
      };
    }

    return {
      success: false,
      message: 'Index refresh not supported by current provider',
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
