import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            this.logger.error('Max Redis reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 100, 3000);
          this.logger.warn(`Reconnecting to Redis in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
      password: redisPassword,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client connected and ready');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting...');
      this.isConnected = false;
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping get operation');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting key ${key} from cache:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping set operation');
      return false;
    }

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key} in cache:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from cache:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async delMany(keys: string[]): Promise<boolean> {
    if (!this.isConnected || keys.length === 0) {
      return false;
    }

    try {
      await this.client.del(keys);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting keys from cache:`, error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL (time to live) for key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isConnected) {
      return -2;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment value by amount
   */
  async incrBy(key: string, amount: number): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key} by ${amount}:`, error);
      return 0;
    }
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.decr(key);
    } catch (error) {
      this.logger.error(`Error decrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Add value to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.sAdd(key, members);
    } catch (error) {
      this.logger.error(`Error adding to set ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get all members of set
   */
  async smembers(key: string): Promise<string[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      return await this.client.sMembers(key);
    } catch (error) {
      this.logger.error(`Error getting set members for ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove member from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.sRem(key, members);
    } catch (error) {
      this.logger.error(`Error removing from set ${key}:`, error);
      return 0;
    }
  }

  /**
   * Add to sorted set with score
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      this.logger.error(`Error adding to sorted set ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get range from sorted set
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      this.logger.error(`Error getting range from sorted set ${key}:`, error);
      return [];
    }
  }

  /**
   * Push to list (left)
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.lPush(key, values);
    } catch (error) {
      this.logger.error(`Error pushing to list ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      this.logger.error(`Error getting list range for ${key}:`, error);
      return [];
    }
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.flushAll();
      this.logger.warn('Redis cache cleared (flushAll)');
      return true;
    } catch (error) {
      this.logger.error('Error flushing Redis cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
  }> {
    if (!this.isConnected) {
      return { connected: false, keys: 0, memory: '0' };
    }

    try {
      const dbSize = await this.client.dbSize();
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : '0';

      return {
        connected: true,
        keys: dbSize,
        memory,
      };
    } catch (error) {
      this.logger.error('Error getting Redis stats:', error);
      return { connected: false, keys: 0, memory: '0' };
    }
  }

  // ==================== Search History Methods ====================

  private readonly SEARCH_HISTORY_KEY_PREFIX = 'search_history:';
  private readonly SEARCH_HISTORY_TTL = 30 * 24 * 60 * 60; // 30 days
  private readonly MAX_SEARCH_HISTORY = 100;

  /**
   * Add a search query to user's search history
   */
  async addSearchHistory(
    userId: string,
    searchData: {
      query: string;
      resultsCount: number;
      filters?: Record<string, any>;
      timestamp?: number;
    },
  ): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const key = `${this.SEARCH_HISTORY_KEY_PREFIX}${userId}`;
    const entry = JSON.stringify({
      ...searchData,
      timestamp: searchData.timestamp || Date.now(),
    });

    try {
      // Add to sorted set with timestamp as score (for ordering)
      await this.client.zAdd(key, {
        score: Date.now(),
        value: entry,
      });

      // Trim to max entries (keep only the most recent)
      await this.client.zRemRangeByRank(key, 0, -(this.MAX_SEARCH_HISTORY + 1));

      // Set/refresh TTL
      await this.client.expire(key, this.SEARCH_HISTORY_TTL);

      return true;
    } catch (error) {
      this.logger.error(`Error adding search history for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Array<{
    query: string;
    resultsCount: number;
    filters?: Record<string, any>;
    timestamp: number;
  }>> {
    if (!this.isConnected) {
      return [];
    }

    const key = `${this.SEARCH_HISTORY_KEY_PREFIX}${userId}`;

    try {
      // Get searches in reverse chronological order
      const start = -(offset + limit);
      const stop = offset > 0 ? -(offset + 1) : -1;

      const entries = await this.client.zRange(key, start, stop, { REV: true });

      return entries.map((entry) => {
        try {
          return JSON.parse(entry);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      this.logger.error(`Error getting search history for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Clear user's search history
   */
  async clearSearchHistory(userId: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const key = `${this.SEARCH_HISTORY_KEY_PREFIX}${userId}`;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error clearing search history for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Delete specific search from history
   */
  async deleteSearchFromHistory(userId: string, timestamp: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const key = `${this.SEARCH_HISTORY_KEY_PREFIX}${userId}`;

    try {
      // Get all entries and find the one with matching timestamp
      const entries = await this.client.zRange(key, 0, -1);

      for (const entry of entries) {
        try {
          const parsed = JSON.parse(entry);
          if (parsed.timestamp === timestamp) {
            await this.client.zRem(key, entry);
            return true;
          }
        } catch {
          // Skip invalid entries
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error deleting search from history for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get search history count for user
   */
  async getSearchHistoryCount(userId: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    const key = `${this.SEARCH_HISTORY_KEY_PREFIX}${userId}`;

    try {
      return await this.client.zCard(key);
    } catch (error) {
      this.logger.error(`Error getting search history count for user ${userId}:`, error);
      return 0;
    }
  }

  // ==================== Trending Searches ====================

  private readonly TRENDING_SEARCHES_KEY = 'trending_searches';
  private readonly TRENDING_TTL = 24 * 60 * 60; // 24 hours

  /**
   * Record a search for trending calculation
   */
  async recordSearchForTrending(query: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) return;

    try {
      // Increment score in sorted set
      await this.client.zIncrBy(this.TRENDING_SEARCHES_KEY, 1, normalizedQuery);

      // Set TTL on first write
      const ttl = await this.client.ttl(this.TRENDING_SEARCHES_KEY);
      if (ttl === -1) {
        await this.client.expire(this.TRENDING_SEARCHES_KEY, this.TRENDING_TTL);
      }
    } catch (error) {
      this.logger.error('Error recording search for trending:', error);
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit: number = 10): Promise<Array<{
    query: string;
    count: number;
  }>> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const results = await this.client.zRangeWithScores(
        this.TRENDING_SEARCHES_KEY,
        0,
        limit - 1,
        { REV: true },
      );

      return results.map((r) => ({
        query: r.value,
        count: r.score,
      }));
    } catch (error) {
      this.logger.error('Error getting trending searches:', error);
      return [];
    }
  }

  /**
   * Reset trending searches (for daily reset)
   */
  async resetTrendingSearches(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(this.TRENDING_SEARCHES_KEY);
      return true;
    } catch (error) {
      this.logger.error('Error resetting trending searches:', error);
      return false;
    }
  }
}
