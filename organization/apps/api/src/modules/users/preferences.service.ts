import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { getCurrentTraceId } from '@/common/interceptors/trace.interceptor';

/**
 * User preferences structure
 */
export interface UserPreferences {
  country?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    marketing?: boolean;
  };
}

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  country: 'US',
  language: 'en',
  currency: 'USD',
  timezone: 'UTC',
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    sms: false,
    marketing: false,
  },
};

/**
 * Preferences Service
 *
 * Manages user preferences storage with Redis caching.
 */
@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);
  private readonly CACHE_PREFIX = 'user:preferences:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Save user preferences
   */
  async savePreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const traceId = getCurrentTraceId();

    this.logger.log('Saving preferences', { traceId, userId });

    // Get existing preferences
    const existing = await this.getPreferences(userId);

    // Merge with new preferences
    const merged: UserPreferences = {
      ...existing,
      ...preferences,
      notifications: {
        ...existing.notifications,
        ...preferences.notifications,
      },
    };

    // Upsert to user_profiles table (using preferences JSON field)
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        locale: merged.language,
        timezone: merged.timezone,
        preferences: JSON.parse(JSON.stringify(merged)),
      },
      update: {
        locale: merged.language,
        timezone: merged.timezone,
        preferences: JSON.parse(JSON.stringify(merged)),
      },
    });

    // Invalidate cache
    await this.redis.del(`${this.CACHE_PREFIX}${userId}`);

    // Cache the new preferences
    await this.redis.set(`${this.CACHE_PREFIX}${userId}`, merged, this.CACHE_TTL);

    return merged;
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    const traceId = getCurrentTraceId();

    // Check cache first
    const cached = await this.redis.get<UserPreferences>(`${this.CACHE_PREFIX}${userId}`);
    if (cached) {
      this.logger.debug('Preferences cache hit', { traceId, userId });
      return { ...DEFAULT_PREFERENCES, ...cached };
    }

    // Load from database
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: {
          locale: true,
          timezone: true,
          preferences: true,
        },
      });

      if (!profile) {
        return DEFAULT_PREFERENCES;
      }

      const preferences: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        ...(profile.preferences as unknown as UserPreferences),
        language: profile.locale || DEFAULT_PREFERENCES.language,
        timezone: profile.timezone || DEFAULT_PREFERENCES.timezone,
      };

      // Cache the preferences
      await this.redis.set(`${this.CACHE_PREFIX}${userId}`, preferences, this.CACHE_TTL);

      return preferences;
    } catch (error) {
      this.logger.warn('Failed to load preferences, using defaults', {
        traceId,
        userId,
        error: error.message,
      });
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Delete user preferences
   */
  async deletePreferences(userId: string): Promise<void> {
    const traceId = getCurrentTraceId();

    this.logger.log('Deleting preferences', { traceId, userId });

    // Delete from database (the profile, not just preferences)
    // In practice, you might just want to clear the preferences field
    await this.prisma.userProfile.updateMany({
      where: { userId },
      data: { preferences: null },
    });

    // Invalidate cache
    await this.redis.del(`${this.CACHE_PREFIX}${userId}`);
  }

  /**
   * Get preferences for anonymous user from cookies
   * This is a helper for frontend integration
   */
  parsePreferencesFromCookies(cookies: Record<string, string>): Partial<UserPreferences> {
    return {
      country: cookies['bx_country'],
      language: cookies['bx_language'],
      currency: cookies['bx_currency'],
      timezone: cookies['bx_timezone'],
      theme: cookies['bx_theme'] as UserPreferences['theme'],
    };
  }

  /**
   * Validate country code
   */
  isValidCountry(code: string): boolean {
    // ISO 3166-1 alpha-2 validation (simplified)
    return /^[A-Z]{2}$/.test(code.toUpperCase());
  }

  /**
   * Validate language code
   */
  isValidLanguage(code: string): boolean {
    // ISO 639-1 validation (simplified)
    return /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
  }

  /**
   * Validate currency code
   */
  isValidCurrency(code: string): boolean {
    // ISO 4217 validation (simplified)
    return /^[A-Z]{3}$/.test(code.toUpperCase());
  }
}
