import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';
import { SearchCacheService } from './search-cache.service';

export interface CacheHealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connected: boolean;
  uptime: number;
  metrics: {
    totalKeys: number;
    memoryUsed: string;
    hitRate: string;
    hits: number;
    misses: number;
  };
  breakdown: {
    products: number;
    users: number;
    sessions: number;
    carts: number;
    searches: number;
    rateLimits: number;
  };
  performance: {
    avgResponseTime?: number;
    slowQueries: number;
  };
  warnings: string[];
  timestamp: number;
}

/**
 * Cache Health Monitoring Service
 * Monitors cache health, performance, and provides metrics
 */
@Injectable()
export class CacheHealthService {
  private readonly logger = new Logger(CacheHealthService.name);
  private healthHistory: CacheHealthMetrics[] = [];
  private readonly maxHistorySize = 100;
  private slowQueryCount = 0;

  constructor(
    private readonly cacheService: CacheService,
    private readonly redis: RedisService,
    private readonly searchCacheService: SearchCacheService,
  ) {}

  /**
   * Get comprehensive cache health metrics
   */
  async getHealthMetrics(): Promise<CacheHealthMetrics> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Get basic stats
      const stats = await this.cacheService.getStats();
      const redisStats = await this.redis.getStats();
      const isConnected = await this.cacheService.isAvailable();

      // Get key breakdown by prefix
      const breakdown = await this.getKeyBreakdown();

      // Calculate hit rate
      const totalRequests = stats.hits + stats.misses;
      const hitRateNum = totalRequests > 0
        ? (stats.hits / totalRequests) * 100
        : 0;

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (!isConnected) {
        status = 'unhealthy';
        warnings.push('Redis connection is down');
      } else {
        // Check hit rate
        if (hitRateNum < 50 && totalRequests > 100) {
          status = 'degraded';
          warnings.push(`Low cache hit rate: ${hitRateNum.toFixed(2)}%`);
        }

        // Check memory usage (parse memory string)
        const memoryMB = this.parseMemoryString(redisStats.memory);
        if (memoryMB > 1000) { // > 1GB
          warnings.push(`High memory usage: ${redisStats.memory}`);
          if (status === 'healthy') status = 'degraded';
        }

        // Check slow queries
        if (this.slowQueryCount > 10) {
          warnings.push(`High slow query count: ${this.slowQueryCount}`);
          if (status === 'healthy') status = 'degraded';
        }

        // Check key count
        if (redisStats.keys > 100000) {
          warnings.push(`High key count: ${redisStats.keys}`);
        }
      }

      const metrics: CacheHealthMetrics = {
        status,
        connected: isConnected,
        uptime: process.uptime(),
        metrics: {
          totalKeys: redisStats.keys,
          memoryUsed: redisStats.memory,
          hitRate: stats.hitRate,
          hits: stats.hits,
          misses: stats.misses,
        },
        breakdown,
        performance: {
          avgResponseTime: Date.now() - startTime,
          slowQueries: this.slowQueryCount,
        },
        warnings,
        timestamp: Date.now(),
      };

      // Add to history
      this.addToHistory(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Error getting cache health metrics:', error);

      return {
        status: 'unhealthy',
        connected: false,
        uptime: process.uptime(),
        metrics: {
          totalKeys: 0,
          memoryUsed: '0',
          hitRate: '0%',
          hits: 0,
          misses: 0,
        },
        breakdown: {
          products: 0,
          users: 0,
          sessions: 0,
          carts: 0,
          searches: 0,
          rateLimits: 0,
        },
        performance: {
          avgResponseTime: Date.now() - startTime,
          slowQueries: this.slowQueryCount,
        },
        warnings: [`Error getting metrics: ${error.message}`],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get key breakdown by prefix
   */
  private async getKeyBreakdown(): Promise<{
    products: number;
    users: number;
    sessions: number;
    carts: number;
    searches: number;
    rateLimits: number;
  }> {
    try {
      const [products, users, sessions, carts, searches, rateLimits] = await Promise.all([
        this.redis.keys('product:*'),
        this.redis.keys('user:*'),
        this.redis.keys('session:*'),
        this.redis.keys('cart:*'),
        this.redis.keys('search:*'),
        this.redis.keys('rate_limit:*'),
      ]);

      return {
        products: products.length,
        users: users.length,
        sessions: sessions.length,
        carts: carts.length,
        searches: searches.length,
        rateLimits: rateLimits.length,
      };
    } catch (error) {
      this.logger.error('Error getting key breakdown:', error);
      return {
        products: 0,
        users: 0,
        sessions: 0,
        carts: 0,
        searches: 0,
        rateLimits: 0,
      };
    }
  }

  /**
   * Parse memory string to MB
   */
  private parseMemoryString(memory: string): number {
    const match = memory.match(/([\d.]+)([KMG])/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'K': return value / 1024;
      case 'M': return value;
      case 'G': return value * 1024;
      default: return value;
    }
  }

  /**
   * Add metrics to history
   */
  private addToHistory(metrics: CacheHealthMetrics): void {
    this.healthHistory.push(metrics);

    // Keep only last N entries
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  /**
   * Get health history
   */
  getHealthHistory(limit: number = 20): CacheHealthMetrics[] {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Track slow query
   */
  trackSlowQuery(): void {
    this.slowQueryCount++;
  }

  /**
   * Reset slow query counter
   */
  resetSlowQueryCounter(): void {
    this.slowQueryCount = 0;
  }

  /**
   * Scheduled health check (every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledHealthCheck(): Promise<void> {
    this.logger.debug('Running scheduled cache health check...');

    try {
      const health = await this.getHealthMetrics();

      if (health.status === 'unhealthy') {
        this.logger.error('Cache health is UNHEALTHY', {
          warnings: health.warnings,
          metrics: health.metrics,
        });
      } else if (health.status === 'degraded') {
        this.logger.warn('Cache health is DEGRADED', {
          warnings: health.warnings,
          metrics: health.metrics,
        });
      } else {
        this.logger.debug('Cache health is HEALTHY');
      }
    } catch (error) {
      this.logger.error('Error in scheduled health check:', error);
    }
  }

  /**
   * Reset cache statistics (every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async resetStatistics(): Promise<void> {
    this.logger.debug('Resetting cache statistics...');
    this.resetSlowQueryCounter();
  }

  /**
   * Get search cache statistics
   */
  async getSearchCacheStats(): Promise<any> {
    return this.searchCacheService.getSearchCacheStats();
  }

  /**
   * Check if cache is healthy
   */
  async isHealthy(): Promise<boolean> {
    const health = await this.getHealthMetrics();
    return health.status === 'healthy';
  }

  /**
   * Get cache size by prefix
   */
  async getCacheSizeByPrefix(prefix: string): Promise<number> {
    try {
      const keys = await this.redis.keys(`${prefix}*`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Error getting cache size for prefix ${prefix}:`, error);
      return 0;
    }
  }

  /**
   * Get top keys by TTL (expiring soon)
   */
  async getKeysExpiringSoon(limit: number = 10): Promise<Array<{ key: string; ttl: number }>> {
    try {
      const allKeys = await this.redis.keys('*');
      const keysWithTTL: Array<{ key: string; ttl: number }> = [];

      for (const key of allKeys.slice(0, 100)) { // Check first 100 keys
        const ttl = await this.redis.ttl(key);
        if (ttl > 0 && ttl < 300) { // Expiring in < 5 minutes
          keysWithTTL.push({ key, ttl });
        }
      }

      return keysWithTTL
        .sort((a, b) => a.ttl - b.ttl)
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting expiring keys:', error);
      return [];
    }
  }

  /**
   * Cleanup old/expired cache entries
   */
  async cleanupExpiredEntries(): Promise<{ cleaned: number }> {
    this.logger.log('Starting cache cleanup...');
    let cleaned = 0;

    try {
      // Redis automatically removes expired keys, but we can do manual cleanup
      // of abandoned sessions, old carts, etc.

      // Clean up old abandoned carts (> 30 days)
      const cartKeys = await this.redis.keys('cart:abandoned:*');
      for (const key of cartKeys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiry set
          await this.redis.del(key);
          cleaned++;
        }
      }

      this.logger.log(`Cache cleanup completed: ${cleaned} keys cleaned`);
      return { cleaned };
    } catch (error) {
      this.logger.error('Error during cache cleanup:', error);
      return { cleaned };
    }
  }
}
