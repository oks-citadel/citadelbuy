import { Controller, Post, Get, Delete, UseGuards, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchProviderFactory } from './providers/search-provider.factory';
import { ElasticsearchProvider } from './providers/elasticsearch.provider';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Admin Controller for Search Index Management
 * Provides endpoints for managing search indexes
 */
@ApiTags('Search Admin')
@ApiBearerAuth()
@Controller('admin/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SearchAdminController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchProviderFactory: SearchProviderFactory,
  ) {}

  /**
   * Bulk index all products
   */
  @Post('index/rebuild')
  @ApiOperation({ summary: 'Rebuild entire search index' })
  @ApiResponse({ status: 200, description: 'Index rebuilt successfully' })
  async rebuildIndex(@Query('deleteFirst') deleteFirst?: boolean) {
    const provider = await this.searchProviderFactory.getProvider();

    if (deleteFirst && provider instanceof ElasticsearchProvider) {
      await (provider as any).deleteIndex();
      await (provider as any).ensureIndex();
    }

    const result = await this.searchService.bulkIndexProducts();

    return {
      success: true,
      message: 'Index rebuilt successfully',
      ...result,
    };
  }

  /**
   * Index specific products by IDs
   */
  @Post('index/products')
  @ApiOperation({ summary: 'Index specific products' })
  @ApiResponse({ status: 200, description: 'Products indexed successfully' })
  async indexProducts(@Body() body: { productIds: string[] }) {
    const result = await this.searchService.bulkIndexProducts(body.productIds);

    return {
      success: true,
      message: 'Products indexed successfully',
      ...result,
    };
  }

  /**
   * Index a single product
   */
  @Post('index/product/:productId')
  @ApiOperation({ summary: 'Index a single product' })
  @ApiResponse({ status: 200, description: 'Product indexed successfully' })
  async indexProduct(@Query('productId') productId: string) {
    await this.searchService.indexProduct(productId);

    return {
      success: true,
      message: `Product ${productId} indexed successfully`,
    };
  }

  /**
   * Delete product from index
   */
  @Delete('index/product/:productId')
  @ApiOperation({ summary: 'Delete product from search index' })
  @ApiResponse({ status: 200, description: 'Product deleted from index' })
  async deleteProduct(@Query('productId') productId: string) {
    await this.searchService.deleteProductFromIndex(productId);

    return {
      success: true,
      message: `Product ${productId} removed from index`,
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
    if (provider instanceof ElasticsearchProvider) {
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

    if (provider instanceof ElasticsearchProvider) {
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
