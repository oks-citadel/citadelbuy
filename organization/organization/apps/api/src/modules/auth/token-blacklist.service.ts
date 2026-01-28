import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import * as jwt from 'jsonwebtoken';

/**
 * Token Blacklist Service
 *
 * SECURITY: Implements JWT token blacklisting to properly invalidate tokens
 * on logout, password change, or security incidents.
 *
 * Key Features:
 * - Blacklist individual tokens (logout)
 * - Blacklist all tokens for a user (password change, security)
 * - Automatic TTL management matching JWT expiration
 * - Redis-backed for high performance and distributed systems
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  // Redis key prefixes for organization
  private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly USER_TOKEN_INVALIDATION_PREFIX = 'user:tokens:invalidated:';

  // Default TTL if we can't extract from JWT (should never happen)
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Add a token to the blacklist
   *
   * @param token - The JWT token to blacklist
   * @returns Promise<boolean> - Success status
   */
  async blacklistToken(token: string): Promise<boolean> {
    try {
      // Decode the token to extract jti (JWT ID) and expiration
      const decoded = this.decodeToken(token);

      if (!decoded) {
        this.logger.error('Failed to decode token for blacklisting');
        return false;
      }

      // Use jti if available, otherwise use a hash of the token
      const tokenId = decoded.jti || this.hashToken(token);
      const key = `${this.TOKEN_BLACKLIST_PREFIX}${tokenId}`;

      // Calculate TTL: time remaining until token expires
      const ttl = this.calculateTTL(decoded.exp);

      if (ttl <= 0) {
        // Token already expired, no need to blacklist
        this.logger.debug('Token already expired, skipping blacklist');
        return true;
      }

      // Store minimal data - we just need to know it's blacklisted
      const blacklistData = {
        blacklistedAt: Date.now(),
        userId: decoded.sub,
        expiresAt: decoded.exp,
      };

      const success = await this.redisService.set(key, blacklistData, ttl);

      if (success) {
        this.logger.log(`Token blacklisted successfully (TTL: ${ttl}s, User: ${decoded.sub})`);
      } else {
        this.logger.error('Failed to blacklist token in Redis');
      }

      return success;
    } catch (error) {
      this.logger.error('Error blacklisting token:', error);
      return false;
    }
  }

  /**
   * Check if a token is blacklisted
   *
   * @param token - The JWT token to check
   * @returns Promise<boolean> - True if blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const decoded = this.decodeToken(token);

      if (!decoded) {
        // Invalid token format - treat as blacklisted for security
        this.logger.warn('Invalid token format encountered in blacklist check');
        return true;
      }

      // Check 1: Is the specific token blacklisted?
      const tokenId = decoded.jti || this.hashToken(token);
      const tokenKey = `${this.TOKEN_BLACKLIST_PREFIX}${tokenId}`;

      const isBlacklisted = await this.redisService.exists(tokenKey);
      if (isBlacklisted) {
        this.logger.debug(`Token is blacklisted (Token ID: ${tokenId})`);
        return true;
      }

      // Check 2: Has the user invalidated all tokens?
      if (decoded.sub) {
        const isUserInvalidated = await this.isUserTokensInvalidated(decoded.sub, decoded.iat);
        if (isUserInvalidated) {
          this.logger.debug(`Token invalidated by user-wide invalidation (User: ${decoded.sub})`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking token blacklist:', error);
      // On error, deny access for security
      return true;
    }
  }

  /**
   * Invalidate all tokens for a user
   *
   * Use cases:
   * - Password change
   * - Account compromise
   * - Security policy enforcement
   *
   * @param userId - The user ID whose tokens should be invalidated
   * @returns Promise<boolean> - Success status
   */
  async invalidateAllUserTokens(userId: string): Promise<boolean> {
    try {
      const key = `${this.USER_TOKEN_INVALIDATION_PREFIX}${userId}`;
      const invalidationTimestamp = Date.now();

      // Store the invalidation timestamp
      // Any token issued before this timestamp will be considered invalid
      const data = {
        invalidatedAt: invalidationTimestamp,
        reason: 'user_initiated', // Could be extended to include reason
      };

      // Use a long TTL (longer than any JWT could be valid)
      const maxJwtExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
      const ttl = this.parseDurationToSeconds(maxJwtExpiration);

      const success = await this.redisService.set(key, data, ttl);

      if (success) {
        this.logger.log(`All tokens invalidated for user ${userId} (timestamp: ${invalidationTimestamp})`);
      } else {
        this.logger.error(`Failed to invalidate tokens for user ${userId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Error invalidating all tokens for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if a token was issued before user-wide invalidation
   *
   * @param userId - The user ID to check
   * @param tokenIssuedAt - The 'iat' claim from the JWT (in seconds)
   * @returns Promise<boolean> - True if token is invalidated
   */
  private async isUserTokensInvalidated(userId: string, tokenIssuedAt?: number): Promise<boolean> {
    if (!tokenIssuedAt) {
      return false;
    }

    try {
      const key = `${this.USER_TOKEN_INVALIDATION_PREFIX}${userId}`;
      const invalidationData = await this.redisService.get<{
        invalidatedAt: number;
        reason?: string;
      }>(key);

      if (!invalidationData) {
        return false;
      }

      // Convert JWT iat (seconds) to milliseconds for comparison
      const tokenIssuedAtMs = tokenIssuedAt * 1000;

      // If token was issued before the invalidation timestamp, it's invalid
      return tokenIssuedAtMs < invalidationData.invalidatedAt;
    } catch (error) {
      this.logger.error('Error checking user token invalidation:', error);
      return false;
    }
  }

  /**
   * Remove a user's token invalidation (e.g., after successful password change)
   * Note: This doesn't re-validate old tokens, it just stops future checks
   *
   * @param userId - The user ID
   * @returns Promise<boolean> - Success status
   */
  async clearUserTokenInvalidation(userId: string): Promise<boolean> {
    try {
      const key = `${this.USER_TOKEN_INVALIDATION_PREFIX}${userId}`;
      return await this.redisService.del(key);
    } catch (error) {
      this.logger.error(`Error clearing token invalidation for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Decode JWT token without verification
   * We only need to extract metadata for blacklist purposes
   */
  private decodeToken(token: string): {
    jti?: string;
    sub?: string;
    exp?: number;
    iat?: number;
  } | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded;
    } catch (error) {
      this.logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Calculate TTL (time to live) for a blacklisted token
   * Based on the token's expiration time
   */
  private calculateTTL(exp?: number): number {
    if (!exp) {
      return this.DEFAULT_TTL;
    }

    // exp is in seconds, convert to current time
    const expirationTime = exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const ttlMs = expirationTime - now;

    // Convert to seconds and ensure it's positive
    const ttlSeconds = Math.max(Math.ceil(ttlMs / 1000), 0);

    return ttlSeconds || this.DEFAULT_TTL;
  }

  /**
   * Create a hash of the token for use as a key when jti is not available
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse duration strings like '7d', '24h', '30m' to seconds
   */
  private parseDurationToSeconds(duration: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
    };

    const match = duration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      this.logger.warn(`Invalid duration format: ${duration}, using default`);
      return this.DEFAULT_TTL;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    return value * (units[unit] || 1);
  }

  /**
   * Get blacklist statistics (for monitoring/admin purposes)
   */
  async getBlacklistStats(): Promise<{
    blacklistedTokens: number;
    invalidatedUsers: number;
  }> {
    try {
      const tokenKeys = await this.redisService.keys(`${this.TOKEN_BLACKLIST_PREFIX}*`);
      const userKeys = await this.redisService.keys(`${this.USER_TOKEN_INVALIDATION_PREFIX}*`);

      return {
        blacklistedTokens: tokenKeys.length,
        invalidatedUsers: userKeys.length,
      };
    } catch (error) {
      this.logger.error('Error getting blacklist stats:', error);
      return {
        blacklistedTokens: 0,
        invalidatedUsers: 0,
      };
    }
  }

  /**
   * Clean up expired blacklist entries (optional maintenance task)
   * Note: Redis automatically removes expired keys, but this can be used for manual cleanup
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const tokenKeys = await this.redisService.keys(`${this.TOKEN_BLACKLIST_PREFIX}*`);
      let cleaned = 0;

      for (const key of tokenKeys) {
        const ttl = await this.redisService.ttl(key);
        if (ttl === -2 || ttl === -1) {
          // Key doesn't exist or has no expiration
          await this.redisService.del(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`Cleaned up ${cleaned} expired blacklist entries`);
      }

      return cleaned;
    } catch (error) {
      this.logger.error('Error cleaning up expired entries:', error);
      return 0;
    }
  }
}
