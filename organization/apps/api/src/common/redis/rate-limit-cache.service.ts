import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CachePrefix } from './cache.service';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests in window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  totalRequests: number;
}

/**
 * Rate Limiting Service using Redis
 * Provides efficient rate limiting with sliding window algorithm
 */
@Injectable()
export class RateLimitCacheService {
  private readonly logger = new Logger(RateLimitCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Check and increment rate limit
   * Uses sliding window counter algorithm
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Get current count
      const currentCount = await this.redis.get<number>(fullKey);

      if (currentCount === null) {
        // First request in window
        const ttl = Math.ceil(config.windowMs / 1000);
        await this.redis.set(fullKey, 1, ttl);

        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: now + config.windowMs,
          totalRequests: 1,
        };
      }

      if (currentCount >= config.maxRequests) {
        // Rate limit exceeded
        const ttl = await this.redis.ttl(fullKey);
        const resetAt = now + (ttl * 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          totalRequests: currentCount,
        };
      }

      // Increment counter
      const newCount = await this.redis.incr(fullKey);

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetAt: now + config.windowMs,
        totalRequests: newCount,
      };
    } catch (error) {
      this.logger.error(`Rate limit check error for ${key}:`, error);

      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
        totalRequests: 0,
      };
    }
  }

  /**
   * Check rate limit without incrementing
   */
  async getRateLimitStatus(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;
    const now = Date.now();

    try {
      const currentCount = await this.redis.get<number>(fullKey);

      if (currentCount === null) {
        return {
          allowed: true,
          remaining: config.maxRequests,
          resetAt: now + config.windowMs,
          totalRequests: 0,
        };
      }

      const ttl = await this.redis.ttl(fullKey);
      const resetAt = now + (ttl * 1000);

      return {
        allowed: currentCount < config.maxRequests,
        remaining: Math.max(0, config.maxRequests - currentCount),
        resetAt,
        totalRequests: currentCount,
      };
    } catch (error) {
      this.logger.error(`Rate limit status error for ${key}:`, error);

      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
        totalRequests: 0,
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<boolean> {
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;

    try {
      await this.redis.del(fullKey);
      this.logger.debug(`Rate limit reset: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Rate limit reset error for ${key}:`, error);
      return false;
    }
  }

  /**
   * IP-based rate limiting
   */
  async checkIpRateLimit(
    ipAddress: string,
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `ip:${ipAddress}:${endpoint}`;
    return this.checkRateLimit(key, config);
  }

  /**
   * User-based rate limiting
   */
  async checkUserRateLimit(
    userId: string,
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `user:${userId}:${endpoint}`;
    return this.checkRateLimit(key, config);
  }

  /**
   * API key-based rate limiting
   */
  async checkApiKeyRateLimit(
    apiKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `apikey:${apiKey}`;
    return this.checkRateLimit(key, config);
  }

  /**
   * Global rate limiting (per endpoint)
   */
  async checkGlobalRateLimit(
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `global:${endpoint}`;
    return this.checkRateLimit(key, config);
  }

  /**
   * Login attempt rate limiting
   */
  async checkLoginAttempts(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
  ): Promise<RateLimitResult> {
    const key = `login:${identifier}`;
    return this.checkRateLimit(key, { windowMs, maxRequests: maxAttempts });
  }

  /**
   * Reset login attempts
   */
  async resetLoginAttempts(identifier: string): Promise<boolean> {
    const key = `login:${identifier}`;
    return this.resetRateLimit(key);
  }

  /**
   * OTP/verification code rate limiting
   */
  async checkOtpRateLimit(
    identifier: string,
    maxAttempts: number = 3,
    windowMs: number = 10 * 60 * 1000, // 10 minutes
  ): Promise<RateLimitResult> {
    const key = `otp:${identifier}`;
    return this.checkRateLimit(key, { windowMs, maxRequests: maxAttempts });
  }

  /**
   * Track suspicious activity
   */
  async trackSuspiciousActivity(
    identifier: string,
    activityType: string,
    ttl: number = 3600,
  ): Promise<number> {
    const key = `suspicious:${activityType}:${identifier}`;
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;

    try {
      const count = await this.redis.incr(fullKey);
      await this.redis.expire(fullKey, ttl);

      if (count > 10) {
        this.logger.warn(`High suspicious activity detected: ${key} (${count} times)`);
      }

      return count;
    } catch (error) {
      this.logger.error(`Error tracking suspicious activity for ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get suspicious activity count
   */
  async getSuspiciousActivityCount(
    identifier: string,
    activityType: string,
  ): Promise<number> {
    const key = `suspicious:${activityType}:${identifier}`;
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;

    try {
      const count = await this.redis.get<number>(fullKey);
      return count || 0;
    } catch (error) {
      this.logger.error(`Error getting suspicious activity count for ${key}:`, error);
      return 0;
    }
  }

  /**
   * Temporary ban (cooldown)
   */
  async setBan(
    identifier: string,
    reason: string,
    durationSeconds: number,
  ): Promise<boolean> {
    const key = `ban:${identifier}`;
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;

    try {
      await this.redis.set(fullKey, { reason, bannedAt: Date.now() }, durationSeconds);
      this.logger.warn(`Temporary ban set for ${identifier}: ${reason} (${durationSeconds}s)`);
      return true;
    } catch (error) {
      this.logger.error(`Error setting ban for ${identifier}:`, error);
      return false;
    }
  }

  /**
   * Check if identifier is banned
   */
  async isBanned(identifier: string): Promise<{ banned: boolean; reason?: string; ttl?: number }> {
    const key = `ban:${identifier}`;
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;

    try {
      const banData = await this.redis.get<{ reason: string; bannedAt: number }>(fullKey);

      if (!banData) {
        return { banned: false };
      }

      const ttl = await this.redis.ttl(fullKey);

      return {
        banned: true,
        reason: banData.reason,
        ttl,
      };
    } catch (error) {
      this.logger.error(`Error checking ban status for ${identifier}:`, error);
      return { banned: false };
    }
  }

  /**
   * Remove ban
   */
  async removeBan(identifier: string): Promise<boolean> {
    const key = `ban:${identifier}`;
    const fullKey = `${CachePrefix.RATE_LIMIT}${key}`;

    try {
      await this.redis.del(fullKey);
      this.logger.log(`Ban removed for ${identifier}`);
      return true;
    } catch (error) {
      this.logger.error(`Error removing ban for ${identifier}:`, error);
      return false;
    }
  }
}
