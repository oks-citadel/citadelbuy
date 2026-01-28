import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';

export interface UserSessionData {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface UserProfileData {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  preferences?: Record<string, any>;
  [key: string]: any;
}

/**
 * Session and User Caching Service
 * Handles caching for user sessions, profiles, and authentication data
 */
@Injectable()
export class SessionCacheService {
  private readonly logger = new Logger(SessionCacheService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Store user session
   */
  async setSession(
    sessionId: string,
    sessionData: UserSessionData,
    ttl: number = CacheTTL.DAY,
  ): Promise<boolean> {
    const success = await this.cacheService.set(sessionId, sessionData, {
      prefix: CachePrefix.SESSION,
      ttl,
    });

    if (success) {
      this.logger.debug(`Session stored: ${sessionId} for user ${sessionData.userId}`);
    }

    return success;
  }

  /**
   * Get user session
   */
  async getSession(sessionId: string): Promise<UserSessionData | null> {
    return this.cacheService.get<UserSessionData>(sessionId, {
      prefix: CachePrefix.SESSION,
    });
  }

  /**
   * Update session last activity
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.lastActivity = Date.now();

    return this.setSession(sessionId, session);
  }

  /**
   * Delete user session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const success = await this.cacheService.delete(sessionId, CachePrefix.SESSION);

    if (success) {
      this.logger.debug(`Session deleted: ${sessionId}`);
    }

    return success;
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    await this.cacheService.deletePattern(`*${userId}*`, CachePrefix.SESSION);
    this.logger.log(`Deleted all sessions for user: ${userId}`);
  }

  /**
   * Store user profile
   */
  async setUserProfile(
    userId: string,
    profile: UserProfileData,
    ttl: number = CacheTTL.LONG,
  ): Promise<boolean> {
    return this.cacheService.set(`profile:${userId}`, profile, {
      prefix: CachePrefix.USER,
      ttl,
    });
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfileData | null> {
    return this.cacheService.get<UserProfileData>(`profile:${userId}`, {
      prefix: CachePrefix.USER,
    });
  }

  /**
   * Get or load user profile
   */
  async getOrLoadUserProfile(
    userId: string,
    loader: () => Promise<UserProfileData>,
  ): Promise<UserProfileData> {
    return this.cacheService.getOrSet(`profile:${userId}`, loader, {
      prefix: CachePrefix.USER,
      ttl: CacheTTL.LONG,
    });
  }

  /**
   * Store user permissions
   */
  async setUserPermissions(
    userId: string,
    permissions: string[],
    ttl: number = CacheTTL.LONG,
  ): Promise<boolean> {
    return this.cacheService.set(`permissions:${userId}`, permissions, {
      prefix: CachePrefix.USER,
      ttl,
    });
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<string[] | null> {
    return this.cacheService.get<string[]>(`permissions:${userId}`, {
      prefix: CachePrefix.USER,
    });
  }

  /**
   * Store user preferences
   */
  async setUserPreferences(
    userId: string,
    preferences: Record<string, any>,
    ttl: number = CacheTTL.WEEK,
  ): Promise<boolean> {
    return this.cacheService.set(`preferences:${userId}`, preferences, {
      prefix: CachePrefix.USER,
      ttl,
    });
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<Record<string, any> | null> {
    return this.cacheService.get<Record<string, any>>(`preferences:${userId}`, {
      prefix: CachePrefix.USER,
    });
  }

  /**
   * Invalidate all user cache (profile, permissions, preferences)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheService.invalidateUser(userId);
    this.logger.log(`Invalidated all cache for user: ${userId}`);
  }

  /**
   * Store JWT token blacklist (for logout)
   */
  async blacklistToken(
    token: string,
    expiresInSeconds: number,
  ): Promise<boolean> {
    return this.cacheService.set(`blacklist:${token}`, true, {
      prefix: CachePrefix.SESSION,
      ttl: expiresInSeconds,
    });
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.cacheService.get<boolean>(`blacklist:${token}`, {
      prefix: CachePrefix.SESSION,
    });

    return blacklisted === true;
  }

  /**
   * Store refresh token
   */
  async setRefreshToken(
    userId: string,
    tokenId: string,
    ttl: number = CacheTTL.MONTH,
  ): Promise<boolean> {
    return this.cacheService.set(`refresh:${userId}:${tokenId}`, true, {
      prefix: CachePrefix.SESSION,
      ttl,
    });
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const valid = await this.cacheService.get<boolean>(`refresh:${userId}:${tokenId}`, {
      prefix: CachePrefix.SESSION,
    });

    return valid === true;
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    return this.cacheService.delete(`refresh:${userId}:${tokenId}`, CachePrefix.SESSION);
  }

  /**
   * Revoke all refresh tokens for user
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.cacheService.deletePattern(`refresh:${userId}:*`, CachePrefix.SESSION);
    this.logger.log(`Revoked all refresh tokens for user: ${userId}`);
  }

  /**
   * Store online users count
   */
  async setOnlineUsersCount(count: number): Promise<boolean> {
    return this.cacheService.set('online_users_count', count, {
      prefix: CachePrefix.SESSION,
      ttl: CacheTTL.VERY_SHORT,
    });
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount(): Promise<number | null> {
    return this.cacheService.get<number>('online_users_count', {
      prefix: CachePrefix.SESSION,
    });
  }

  /**
   * Track active user session
   */
  async trackActiveUser(userId: string, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    await this.cacheService.set(`active:${userId}`, Date.now(), {
      prefix: CachePrefix.SESSION,
      ttl,
    });
  }

  /**
   * Check if user is active
   */
  async isUserActive(userId: string): Promise<boolean> {
    const active = await this.cacheService.get<number>(`active:${userId}`, {
      prefix: CachePrefix.SESSION,
    });

    return active !== null;
  }

  /**
   * Get all active users (debugging/admin use)
   */
  async getActiveUserIds(): Promise<string[]> {
    const keys = await this.cacheService.getKeys(`${CachePrefix.SESSION}active:*`);

    return keys.map((key) => {
      const parts = key.split(':');
      return parts[parts.length - 1];
    });
  }
}
