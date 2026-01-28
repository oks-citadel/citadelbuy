import { Controller, Get, Post, Delete, Param, UseGuards, Query } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheHealthService } from './cache-health.service';
import { CacheWarmingService } from './cache-warming.service';
import { ProductCacheService } from './product-cache.service';
import { SearchCacheService } from './search-cache.service';
import { SessionCacheService } from './session-cache.service';
import { CartCacheService } from './cart-cache.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';

/**
 * Cache Administration Controller
 * Provides endpoints for cache management, monitoring, and administration
 * Protected by admin authentication
 */
@Controller('admin/cache')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CacheAdminController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheHealthService: CacheHealthService,
    private readonly cacheWarmingService: CacheWarmingService,
    private readonly productCacheService: ProductCacheService,
    private readonly searchCacheService: SearchCacheService,
    private readonly sessionCacheService: SessionCacheService,
    private readonly cartCacheService: CartCacheService,
  ) {}

  /**
   * Get cache health metrics
   * GET /admin/cache/health
   */
  @Get('health')
  async getHealth() {
    const health = await this.cacheHealthService.getHealthMetrics();
    return {
      success: true,
      data: health,
    };
  }

  /**
   * Get cache health history
   * GET /admin/cache/health/history?limit=20
   */
  @Get('health/history')
  async getHealthHistory(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const history = this.cacheHealthService.getHealthHistory(limitNum);

    return {
      success: true,
      data: history,
    };
  }

  /**
   * Get cache statistics
   * GET /admin/cache/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.cacheService.getStats();
    const searchStats = await this.cacheHealthService.getSearchCacheStats();

    return {
      success: true,
      data: {
        ...stats,
        searchCache: searchStats,
      },
    };
  }

  /**
   * Get all cache keys (with optional pattern)
   * GET /admin/cache/keys?pattern=product:*
   */
  @Get('keys')
  async getKeys(@Query('pattern') pattern: string = '*') {
    const keys = await this.cacheService.getKeys(pattern);

    return {
      success: true,
      data: {
        pattern,
        count: keys.length,
        keys: keys.slice(0, 100), // Limit to 100 keys for safety
      },
    };
  }

  /**
   * Get keys expiring soon
   * GET /admin/cache/expiring?limit=10
   */
  @Get('expiring')
  async getExpiring(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const expiring = await this.cacheHealthService.getKeysExpiringSoon(limitNum);

    return {
      success: true,
      data: expiring,
    };
  }

  /**
   * Warm all caches
   * POST /admin/cache/warm
   */
  @Post('warm')
  async warmCache() {
    const result = await this.cacheWarmingService.forceWarmAll();

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Get warming status
   * GET /admin/cache/warm/status
   */
  @Get('warm/status')
  async getWarmingStatus() {
    const status = this.cacheWarmingService.getWarmingStatus();

    return {
      success: true,
      data: status,
    };
  }

  /**
   * Invalidate product cache
   * DELETE /admin/cache/product/:productId
   */
  @Delete('product/:productId')
  async invalidateProduct(@Param('productId') productId: string) {
    await this.productCacheService.invalidateProduct(productId);

    return {
      success: true,
      message: `Cache invalidated for product: ${productId}`,
    };
  }

  /**
   * Invalidate category cache
   * DELETE /admin/cache/category/:categoryId
   */
  @Delete('category/:categoryId')
  async invalidateCategory(@Param('categoryId') categoryId: string) {
    await this.productCacheService.invalidateCategory(categoryId);

    return {
      success: true,
      message: `Cache invalidated for category: ${categoryId}`,
    };
  }

  /**
   * Invalidate user cache
   * DELETE /admin/cache/user/:userId
   */
  @Delete('user/:userId')
  async invalidateUser(@Param('userId') userId: string) {
    await this.sessionCacheService.invalidateUserCache(userId);

    return {
      success: true,
      message: `Cache invalidated for user: ${userId}`,
    };
  }

  /**
   * Invalidate all search caches
   * DELETE /admin/cache/search
   */
  @Delete('search')
  async invalidateSearches() {
    await this.searchCacheService.invalidateAllSearches();

    return {
      success: true,
      message: 'All search caches invalidated',
    };
  }

  /**
   * Invalidate all product lists
   * DELETE /admin/cache/products/lists
   */
  @Delete('products/lists')
  async invalidateProductLists() {
    await this.productCacheService.invalidateAllProductLists();

    return {
      success: true,
      message: 'All product list caches invalidated',
    };
  }

  /**
   * Clear all cache (use with caution!)
   * DELETE /admin/cache/all
   */
  @Delete('all')
  async clearAllCache() {
    const success = await this.cacheService.flushAll();

    return {
      success,
      message: success ? 'All cache cleared' : 'Failed to clear cache',
    };
  }

  /**
   * Cleanup expired entries
   * POST /admin/cache/cleanup
   */
  @Post('cleanup')
  async cleanupCache() {
    const result = await this.cacheHealthService.cleanupExpiredEntries();

    return {
      success: true,
      message: `Cleaned up ${result.cleaned} expired cache entries`,
      data: result,
    };
  }

  /**
   * Reset cache statistics
   * POST /admin/cache/stats/reset
   */
  @Post('stats/reset')
  async resetStats() {
    this.cacheService.resetStats();

    return {
      success: true,
      message: 'Cache statistics reset',
    };
  }

  /**
   * Get cache breakdown by prefix
   * GET /admin/cache/breakdown
   */
  @Get('breakdown')
  async getCacheBreakdown() {
    const [products, users, sessions, carts, searches, rateLimits] = await Promise.all([
      this.cacheHealthService.getCacheSizeByPrefix('product:'),
      this.cacheHealthService.getCacheSizeByPrefix('user:'),
      this.cacheHealthService.getCacheSizeByPrefix('session:'),
      this.cacheHealthService.getCacheSizeByPrefix('cart:'),
      this.cacheHealthService.getCacheSizeByPrefix('search:'),
      this.cacheHealthService.getCacheSizeByPrefix('rate_limit:'),
    ]);

    return {
      success: true,
      data: {
        products,
        users,
        sessions,
        carts,
        searches,
        rateLimits,
        total: products + users + sessions + carts + searches + rateLimits,
      },
    };
  }

  /**
   * Warm specific product
   * POST /admin/cache/warm/product/:productId
   */
  @Post('warm/product/:productId')
  async warmProduct(@Param('productId') productId: string) {
    await this.cacheWarmingService.warmProduct(productId);

    return {
      success: true,
      message: `Cache warmed for product: ${productId}`,
    };
  }

  /**
   * Warm category products
   * POST /admin/cache/warm/category/:categoryId
   */
  @Post('warm/category/:categoryId')
  async warmCategory(@Param('categoryId') categoryId: string) {
    await this.cacheWarmingService.warmCategoryProducts(categoryId);

    return {
      success: true,
      message: `Cache warmed for category: ${categoryId}`,
    };
  }
}
