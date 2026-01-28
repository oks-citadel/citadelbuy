import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * High-performance flag cache service
 * Optimized for sub-10ms evaluations using in-memory caching with Redis fallback
 */
@Injectable()
export class FlagCacheService implements OnModuleInit {
  private readonly logger = new Logger(FlagCacheService.name);

  // In-memory cache for ultra-fast lookups
  private memoryCache: Map<string, {
    data: any;
    expiresAt: number;
  }> = new Map();

  private readonly MEMORY_TTL = 30_000; // 30 seconds for memory cache
  private readonly REDIS_PREFIX = 'flag:cache:';
  private readonly REDIS_TTL = 300; // 5 minutes for Redis

  // Preloaded flags for instant access
  private preloadedFlags: Map<string, any> = new Map();

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.warmCache();
  }

  /**
   * Get flag from cache with multi-tier lookup
   * Performance target: < 1ms for memory hit, < 5ms for Redis hit
   */
  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache (< 0.1ms)
    const memoryHit = this.getFromMemory<T>(key);
    if (memoryHit !== null) {
      return memoryHit;
    }

    // L2: Redis cache (< 5ms)
    const redisHit = await this.getFromRedis<T>(key);
    if (redisHit !== null) {
      // Promote to memory cache
      this.setMemory(key, redisHit);
      return redisHit;
    }

    return null;
  }

  /**
   * Set value in both memory and Redis cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in memory first (sync, fast)
    this.setMemory(key, value, ttl);

    // Set in Redis (async, persisted)
    await this.setRedis(key, value, ttl);
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.redis.del(`${this.REDIS_PREFIX}${key}`);
  }

  /**
   * Delete pattern from all cache layers
   */
  async deletePattern(pattern: string): Promise<void> {
    // Clear memory cache matching pattern
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis cache
    await this.redis.delPattern(`${this.REDIS_PREFIX}${pattern}`);
  }

  /**
   * Get flag evaluation from cache
   */
  async getEvaluation(
    flagKey: string,
    userId: string,
    environment: string,
  ): Promise<any | null> {
    const cacheKey = `eval:${flagKey}:${userId}:${environment}`;
    return this.get(cacheKey);
  }

  /**
   * Cache flag evaluation
   */
  async setEvaluation(
    flagKey: string,
    userId: string,
    environment: string,
    result: any,
    ttl = 300,
  ): Promise<void> {
    const cacheKey = `eval:${flagKey}:${userId}:${environment}`;
    await this.set(cacheKey, result, ttl);
  }

  /**
   * Get preloaded flag (instant, no async)
   */
  getPreloadedFlag(key: string): any | undefined {
    return this.preloadedFlags.get(key);
  }

  /**
   * Warm cache with all enabled flags
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async warmCache(): Promise<void> {
    try {
      const flags = await this.prisma.featureFlag.findMany({
        where: { enabled: true },
        include: {
          rules: { orderBy: { priority: 'desc' } },
          segments: true,
        },
      });

      // Update preloaded flags
      this.preloadedFlags.clear();
      for (const flag of flags) {
        this.preloadedFlags.set(flag.key, flag);
        await this.set(`flag:${flag.key}`, flag);
      }

      // Store flag list in Redis
      await this.redis.set(
        'flags:enabled:list',
        flags.map(f => f.key),
        60,
      );

      this.logger.debug(`Cache warmed with ${flags.length} flags`);
    } catch (error) {
      this.logger.error(`Failed to warm cache: ${error.message}`);
    }
  }

  /**
   * Invalidate flag cache
   */
  async invalidateFlag(flagKey: string): Promise<void> {
    // Remove from preloaded
    this.preloadedFlags.delete(flagKey);

    // Remove from caches
    await this.delete(`flag:${flagKey}`);
    await this.deletePattern(`eval:${flagKey}:*`);

    // Refresh this specific flag
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { key: flagKey },
        include: {
          rules: { orderBy: { priority: 'desc' } },
          segments: true,
        },
      });

      if (flag && flag.enabled) {
        this.preloadedFlags.set(flag.key, flag);
        await this.set(`flag:${flag.key}`, flag);
      }
    } catch (error) {
      this.logger.error(`Failed to refresh flag ${flagKey}: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    preloadedCount: number;
    memoryHitRate: number;
  } {
    return {
      memorySize: this.memoryCache.size,
      preloadedCount: this.preloadedFlags.size,
      memoryHitRate: 0, // Would need hit tracking
    };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    this.preloadedFlags.clear();
    await this.redis.delPattern(`${this.REDIS_PREFIX}*`);
    this.logger.log('All flag caches cleared');
  }

  // Private methods

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setMemory<T>(key: string, value: T, ttl?: number): void {
    this.memoryCache.set(key, {
      data: value,
      expiresAt: Date.now() + (ttl ?? this.MEMORY_TTL),
    });
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(`${this.REDIS_PREFIX}${key}`);
    } catch {
      return null;
    }
  }

  private async setRedis<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.redis.set(
        `${this.REDIS_PREFIX}${key}`,
        value,
        ttl ?? this.REDIS_TTL,
      );
    } catch (error) {
      this.logger.warn(`Failed to set Redis cache: ${error.message}`);
    }
  }

  /**
   * Cleanup expired memory cache entries
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired memory cache entries`);
    }
  }
}
