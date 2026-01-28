import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Cache Key Prefixes
 */
export enum CachePrefix {
  PRODUCT = 'product:',
  PRODUCT_LIST = 'product_list:',
  CATEGORY = 'category:',
  USER = 'user:',
  SESSION = 'session:',
  CART = 'cart:',
  SEARCH = 'search:',
  TRENDING = 'trending:',
  RATE_LIMIT = 'rate_limit:',
  VENDOR = 'vendor:',
  ORDER = 'order:',
}

/**
 * Cache TTL (Time To Live) in seconds
 */
export enum CacheTTL {
  // Short-lived cache (1-5 minutes)
  VERY_SHORT = 60, // 1 minute
  SHORT = 300, // 5 minutes

  // Medium-lived cache (15-30 minutes)
  MEDIUM = 900, // 15 minutes
  MEDIUM_LONG = 1800, // 30 minutes

  // Long-lived cache (1-6 hours)
  LONG = 3600, // 1 hour
  VERY_LONG = 21600, // 6 hours

  // Extra long-lived cache (12-24 hours)
  HALF_DAY = 43200, // 12 hours
  DAY = 86400, // 24 hours

  // Extended cache (7-30 days)
  WEEK = 604800, // 7 days
  MONTH = 2592000, // 30 days
}

export interface CacheOptions {
  ttl?: number;
  prefix?: CachePrefix;
  compress?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: string;
  hitRate: string;
}

/**
 * Enhanced Cache Service
 * Provides high-level caching operations with automatic key management,
 * TTL configuration, and cache invalidation patterns.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private readonly redis: RedisService) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix);

    try {
      const value = await this.redis.get<T>(fullKey);

      if (value !== null) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT: ${fullKey}`);
        return value;
      }

      this.stats.misses++;
      this.logger.debug(`Cache MISS: ${fullKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache GET error for ${fullKey}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix);
    const ttl = options?.ttl || CacheTTL.MEDIUM;

    try {
      const success = await this.redis.set(fullKey, value, ttl);

      if (success) {
        this.logger.debug(`Cache SET: ${fullKey} (TTL: ${ttl}s)`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Cache SET error for ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Get or set value (with loader function)
   * This is the most common pattern: try to get from cache, if not found, load and cache
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Load the value
    try {
      const value = await loader();

      // Cache the loaded value
      await this.set(key, value, options);

      return value;
    } catch (error) {
      this.logger.error(`Loader error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string, prefix?: CachePrefix): Promise<boolean> {
    const fullKey = this.buildKey(key, prefix);

    try {
      const success = await this.redis.del(fullKey);

      if (success) {
        this.logger.debug(`Cache DELETE: ${fullKey}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Cache DELETE error for ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[], prefix?: CachePrefix): Promise<boolean> {
    const fullKeys = keys.map((key) => this.buildKey(key, prefix));

    try {
      const success = await this.redis.delMany(fullKeys);

      if (success) {
        this.logger.debug(`Cache DELETE MANY: ${fullKeys.length} keys`);
      }

      return success;
    } catch (error) {
      this.logger.error('Cache DELETE MANY error:', error);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string, prefix?: CachePrefix): Promise<number> {
    const fullPattern = prefix ? `${prefix}${pattern}` : pattern;

    try {
      const deletedCount = await this.redis.delPattern(fullPattern);

      if (deletedCount > 0) {
        this.logger.debug(`Cache DELETE PATTERN: ${fullPattern} (${deletedCount} keys)`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache DELETE PATTERN error for ${fullPattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate product cache
   */
  async invalidateProduct(productId: string): Promise<void> {
    await Promise.all([
      this.delete(productId, CachePrefix.PRODUCT),
      this.deletePattern(`*${productId}*`, CachePrefix.PRODUCT_LIST),
      this.deletePattern('*', CachePrefix.SEARCH), // Invalidate search results
    ]);

    this.logger.log(`Invalidated cache for product: ${productId}`);
  }

  /**
   * Invalidate category cache
   */
  async invalidateCategory(categoryId: string): Promise<void> {
    await Promise.all([
      this.delete(categoryId, CachePrefix.CATEGORY),
      this.deletePattern(`*category:${categoryId}*`, CachePrefix.PRODUCT_LIST),
      this.deletePattern('*', CachePrefix.SEARCH),
    ]);

    this.logger.log(`Invalidated cache for category: ${categoryId}`);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.delete(userId, CachePrefix.USER),
      this.delete(`profile:${userId}`, CachePrefix.USER),
      this.deletePattern(`${userId}:*`, CachePrefix.SESSION),
    ]);

    this.logger.log(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Invalidate cart cache
   */
  async invalidateCart(cartId: string): Promise<void> {
    await this.delete(cartId, CachePrefix.CART);
    this.logger.log(`Invalidated cache for cart: ${cartId}`);
  }

  /**
   * Invalidate all search caches
   */
  async invalidateAllSearches(): Promise<void> {
    const deletedCount = await this.deletePattern('*', CachePrefix.SEARCH);
    this.logger.log(`Invalidated all search caches: ${deletedCount} keys`);
  }

  /**
   * Warm cache for frequently accessed data
   */
  async warmCache(items: Array<{ key: string; loader: () => Promise<any>; options?: CacheOptions }>) {
    this.logger.log(`Warming cache for ${items.length} items...`);

    const results = await Promise.allSettled(
      items.map(async (item) => {
        try {
          await this.getOrSet(item.key, item.loader, item.options);
        } catch (error) {
          this.logger.error(`Failed to warm cache for ${item.key}:`, error);
        }
      }),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(`Cache warming complete: ${successful}/${items.length} successful`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const redisStats = await this.redis.getStats();

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2)
      : '0.00';

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: redisStats.keys,
      memory: redisStats.memory,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.log('Cache statistics reset');
  }

  /**
   * Check if cache is available
   */
  async isAvailable(): Promise<boolean> {
    return this.redis.isRedisConnected();
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    this.logger.warn('Flushing all cache data...');
    const success = await this.redis.flushAll();

    if (success) {
      this.resetStats();
    }

    return success;
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, prefix?: CachePrefix): string {
    return prefix ? `${prefix}${key}` : key;
  }

  /**
   * Get all keys matching a pattern (for debugging)
   */
  async getKeys(pattern: string = '*'): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string, prefix?: CachePrefix): Promise<number> {
    const fullKey = this.buildKey(key, prefix);
    return this.redis.ttl(fullKey);
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: CachePrefix): Promise<boolean> {
    const fullKey = this.buildKey(key, prefix);
    return this.redis.exists(fullKey);
  }

  /**
   * Refresh TTL for existing key
   */
  async refreshTTL(key: string, ttl: number, prefix?: CachePrefix): Promise<boolean> {
    const fullKey = this.buildKey(key, prefix);
    return this.redis.expire(fullKey, ttl);
  }
}
