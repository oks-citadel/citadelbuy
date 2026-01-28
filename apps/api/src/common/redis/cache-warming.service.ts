import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductCacheService } from './product-cache.service';
import { SearchCacheService } from './search-cache.service';
import { CacheService } from './cache.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cache Warming Service
 * Proactively loads frequently accessed data into cache
 * to improve performance and reduce database load
 */
@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);
  private isWarming = false;

  constructor(
    private readonly cacheService: CacheService,
    private readonly productCacheService: ProductCacheService,
    private readonly searchCacheService: SearchCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Warm cache on application startup (with delay to allow services to initialize)
    setTimeout(() => {
      this.warmCacheOnStartup();
    }, 5000);
  }

  /**
   * Warm essential caches on application startup
   */
  async warmCacheOnStartup(): Promise<void> {
    if (!await this.cacheService.isAvailable()) {
      this.logger.warn('Cache not available, skipping cache warming');
      return;
    }

    this.logger.log('Starting cache warming on startup...');

    try {
      await Promise.allSettled([
        this.warmPopularProducts(),
        this.warmFeaturedProducts(),
        this.warmNewArrivals(),
        this.warmCategories(),
        this.warmTrendingSearches(),
      ]);

      this.logger.log('Cache warming completed successfully');
    } catch (error) {
      this.logger.error('Error during cache warming:', error);
    }
  }

  /**
   * Scheduled cache warming (every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledCacheWarming(): Promise<void> {
    if (this.isWarming) {
      this.logger.debug('Cache warming already in progress, skipping');
      return;
    }

    if (!await this.cacheService.isAvailable()) {
      this.logger.warn('Cache not available, skipping scheduled warming');
      return;
    }

    this.logger.log('Starting scheduled cache warming...');
    this.isWarming = true;

    try {
      await Promise.allSettled([
        this.warmPopularProducts(),
        this.warmTrendingSearches(),
        this.warmTopCategories(),
      ]);

      this.logger.log('Scheduled cache warming completed');
    } catch (error) {
      this.logger.error('Error during scheduled cache warming:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm popular products cache
   */
  async warmPopularProducts(): Promise<void> {
    this.logger.debug('Warming popular products cache...');

    try {
      // Fetch top 50 popular products (based on sales and reviews)
      const products = await this.prisma.product.findMany({
        take: 50,
        orderBy: [
          { orderItems: { _count: 'desc' } },
          { reviews: { _count: 'desc' } },
        ],
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (products.length > 0) {
        await this.productCacheService.cachePopularProducts(products as any);
        this.logger.debug(`Warmed ${products.length} popular products`);
      }
    } catch (error) {
      this.logger.error('Error warming popular products:', error);
    }
  }

  /**
   * Warm featured products cache
   */
  async warmFeaturedProducts(): Promise<void> {
    this.logger.debug('Warming featured products cache...');

    try {
      // Fetch featured products (you may have a 'featured' flag in your schema)
      const products = await this.prisma.product.findMany({
        take: 20,
        where: {
          // Add your featured filter here, e.g., featured: true
          stock: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (products.length > 0) {
        await this.productCacheService.cacheFeaturedProducts(products as any);
        this.logger.debug(`Warmed ${products.length} featured products`);
      }
    } catch (error) {
      this.logger.error('Error warming featured products:', error);
    }
  }

  /**
   * Warm new arrivals cache
   */
  async warmNewArrivals(): Promise<void> {
    this.logger.debug('Warming new arrivals cache...');

    try {
      const products = await this.prisma.product.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (products.length > 0) {
        await this.productCacheService.cacheNewArrivals(products as any);
        this.logger.debug(`Warmed ${products.length} new arrivals`);
      }
    } catch (error) {
      this.logger.error('Error warming new arrivals:', error);
    }
  }

  /**
   * Warm categories cache
   */
  async warmCategories(): Promise<void> {
    this.logger.debug('Warming categories cache...');

    try {
      const categories = await this.prisma.category.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      // Cache each category
      await Promise.all(
        categories.map(async (category) => {
          await this.cacheService.set(
            category.id,
            category,
            {
              prefix: 'category:' as any,
              ttl: 3600, // 1 hour
            },
          );
        }),
      );

      this.logger.debug(`Warmed ${categories.length} categories`);
    } catch (error) {
      this.logger.error('Error warming categories:', error);
    }
  }

  /**
   * Warm top categories (most active)
   */
  async warmTopCategories(): Promise<void> {
    this.logger.debug('Warming top categories cache...');

    try {
      const categories = await this.prisma.category.findMany({
        take: 10,
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: {
          products: { _count: 'desc' },
        },
      });

      await Promise.all(
        categories.map(async (category) => {
          await this.cacheService.set(
            category.id,
            category,
            {
              prefix: 'category:' as any,
              ttl: 3600,
            },
          );
        }),
      );

      this.logger.debug(`Warmed ${categories.length} top categories`);
    } catch (error) {
      this.logger.error('Error warming top categories:', error);
    }
  }

  /**
   * Warm trending searches cache
   */
  async warmTrendingSearches(): Promise<void> {
    this.logger.debug('Warming trending searches cache...');

    try {
      // Get trending searches from Redis
      const trendingSearches = await this.cacheService['redis'].getTrendingSearches(10);

      if (trendingSearches && trendingSearches.length > 0) {
        await this.searchCacheService.setTrendingSearches(trendingSearches);
        this.logger.debug(`Warmed ${trendingSearches.length} trending searches`);
      }
    } catch (error) {
      this.logger.error('Error warming trending searches:', error);
    }
  }

  /**
   * Warm popular search queries
   */
  async warmPopularSearches(): Promise<void> {
    this.logger.debug('Warming popular searches cache...');

    try {
      // Define popular search terms (you can fetch this from analytics)
      const popularQueries = [
        'electronics',
        'clothing',
        'shoes',
        'laptops',
        'smartphones',
        'watches',
        'books',
        'furniture',
      ];

      await this.searchCacheService.setPopularSearches(popularQueries);
      this.logger.debug(`Warmed ${popularQueries.length} popular searches`);
    } catch (error) {
      this.logger.error('Error warming popular searches:', error);
    }
  }

  /**
   * Warm specific product cache
   */
  async warmProduct(productId: string): Promise<void> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: true,
        },
      });

      if (product) {
        await this.productCacheService.setProduct(productId, product as any);
        this.logger.debug(`Warmed product: ${productId}`);
      }
    } catch (error) {
      this.logger.error(`Error warming product ${productId}:`, error);
    }
  }

  /**
   * Warm multiple products
   */
  async warmProducts(productIds: string[]): Promise<void> {
    this.logger.debug(`Warming ${productIds.length} products...`);

    await Promise.allSettled(
      productIds.map((id) => this.warmProduct(id)),
    );
  }

  /**
   * Warm category products
   */
  async warmCategoryProducts(categoryId: string): Promise<void> {
    this.logger.debug(`Warming products for category: ${categoryId}`);

    try {
      const products = await this.prisma.product.findMany({
        where: { categoryId },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (products.length > 0) {
        await this.productCacheService.cachePopularProducts(products as any, categoryId);
        this.logger.debug(`Warmed ${products.length} products for category ${categoryId}`);
      }
    } catch (error) {
      this.logger.error(`Error warming category products for ${categoryId}:`, error);
    }
  }

  /**
   * Force warm all essential caches (manual trigger)
   */
  async forceWarmAll(): Promise<{ success: boolean; message: string }> {
    if (this.isWarming) {
      return {
        success: false,
        message: 'Cache warming already in progress',
      };
    }

    this.logger.log('Force warming all caches...');
    this.isWarming = true;

    try {
      await Promise.allSettled([
        this.warmPopularProducts(),
        this.warmFeaturedProducts(),
        this.warmNewArrivals(),
        this.warmCategories(),
        this.warmTrendingSearches(),
        this.warmPopularSearches(),
      ]);

      return {
        success: true,
        message: 'All caches warmed successfully',
      };
    } catch (error) {
      this.logger.error('Error during force warm:', error);
      return {
        success: false,
        message: `Error warming caches: ${error.message}`,
      };
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Get warming status
   */
  getWarmingStatus(): { isWarming: boolean } {
    return { isWarming: this.isWarming };
  }
}
