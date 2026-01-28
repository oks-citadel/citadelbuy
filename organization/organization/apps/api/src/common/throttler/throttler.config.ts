/**
 * Comprehensive Rate Limiting Configuration
 *
 * Provides tiered rate limiting based on:
 * - User authentication status (anonymous vs authenticated)
 * - User subscription plan (free vs premium)
 * - Endpoint type (read vs write operations)
 * - Endpoint group (auth, api, webhooks, etc.)
 */

import { ConfigService } from '@nestjs/config';

/**
 * User subscription plan types for rate limiting
 */
export enum UserPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

/**
 * Operation types for rate limiting
 */
export enum OperationType {
  READ = 'read',
  WRITE = 'write',
}

/**
 * Endpoint groups for rate limiting
 */
export enum EndpointGroup {
  AUTH = 'auth',
  API = 'api',
  WEBHOOKS = 'webhooks',
  ADMIN = 'admin',
  SEARCH = 'search',
  UPLOAD = 'upload',
  AI = 'ai',
}

/**
 * Rate limit configuration for a specific tier
 */
export interface RateLimitTier {
  ttl: number; // Time window in seconds
  limit: number; // Maximum requests in the window
}

/**
 * Rate limit configuration by plan
 */
export interface PlanRateLimits {
  [UserPlan.FREE]: RateLimitTier;
  [UserPlan.BASIC]: RateLimitTier;
  [UserPlan.PREMIUM]: RateLimitTier;
  [UserPlan.ENTERPRISE]: RateLimitTier;
}

/**
 * Rate limit configuration by endpoint group
 */
export interface GroupRateLimits {
  anonymous: RateLimitTier;
  authenticated: PlanRateLimits;
}

/**
 * Complete rate limit configuration
 */
export interface ThrottlerConfig {
  // Default limits
  default: {
    ttl: number;
    limit: number;
  };

  // Per-IP limits for anonymous requests
  anonymous: {
    ttl: number;
    limit: number;
  };

  // Per-user limits by plan
  byPlan: PlanRateLimits;

  // Limits by endpoint group
  byGroup: {
    [EndpointGroup.AUTH]: GroupRateLimits;
    [EndpointGroup.API]: GroupRateLimits;
    [EndpointGroup.WEBHOOKS]: GroupRateLimits;
    [EndpointGroup.ADMIN]: GroupRateLimits;
    [EndpointGroup.SEARCH]: GroupRateLimits;
    [EndpointGroup.UPLOAD]: GroupRateLimits;
    [EndpointGroup.AI]: GroupRateLimits;
  };

  // Operation-specific multipliers
  operationMultipliers: {
    [OperationType.READ]: number;
    [OperationType.WRITE]: number;
  };
}

/**
 * Default rate limit configuration
 * These values can be overridden via environment variables
 */
export const DEFAULT_THROTTLER_CONFIG: ThrottlerConfig = {
  default: {
    ttl: 60, // 1 minute
    limit: 100, // 100 requests per minute
  },

  anonymous: {
    ttl: 60, // 1 minute
    limit: 30, // 30 requests per minute for anonymous users
  },

  byPlan: {
    [UserPlan.FREE]: {
      ttl: 60,
      limit: 60, // 60 requests per minute
    },
    [UserPlan.BASIC]: {
      ttl: 60,
      limit: 120, // 120 requests per minute
    },
    [UserPlan.PREMIUM]: {
      ttl: 60,
      limit: 300, // 300 requests per minute
    },
    [UserPlan.ENTERPRISE]: {
      ttl: 60,
      limit: 1000, // 1000 requests per minute
    },
  },

  byGroup: {
    [EndpointGroup.AUTH]: {
      anonymous: { ttl: 60, limit: 10 }, // 10 auth attempts per minute
      authenticated: {
        [UserPlan.FREE]: { ttl: 60, limit: 20 },
        [UserPlan.BASIC]: { ttl: 60, limit: 30 },
        [UserPlan.PREMIUM]: { ttl: 60, limit: 50 },
        [UserPlan.ENTERPRISE]: { ttl: 60, limit: 100 },
      },
    },
    [EndpointGroup.API]: {
      anonymous: { ttl: 60, limit: 30 },
      authenticated: {
        [UserPlan.FREE]: { ttl: 60, limit: 60 },
        [UserPlan.BASIC]: { ttl: 60, limit: 120 },
        [UserPlan.PREMIUM]: { ttl: 60, limit: 300 },
        [UserPlan.ENTERPRISE]: { ttl: 60, limit: 1000 },
      },
    },
    [EndpointGroup.WEBHOOKS]: {
      anonymous: { ttl: 60, limit: 100 }, // Webhooks are usually from trusted sources
      authenticated: {
        [UserPlan.FREE]: { ttl: 60, limit: 200 },
        [UserPlan.BASIC]: { ttl: 60, limit: 500 },
        [UserPlan.PREMIUM]: { ttl: 60, limit: 1000 },
        [UserPlan.ENTERPRISE]: { ttl: 60, limit: 5000 },
      },
    },
    [EndpointGroup.ADMIN]: {
      anonymous: { ttl: 60, limit: 5 }, // Very restrictive for admin
      authenticated: {
        [UserPlan.FREE]: { ttl: 60, limit: 30 },
        [UserPlan.BASIC]: { ttl: 60, limit: 60 },
        [UserPlan.PREMIUM]: { ttl: 60, limit: 100 },
        [UserPlan.ENTERPRISE]: { ttl: 60, limit: 200 },
      },
    },
    [EndpointGroup.SEARCH]: {
      anonymous: { ttl: 60, limit: 20 },
      authenticated: {
        [UserPlan.FREE]: { ttl: 60, limit: 50 },
        [UserPlan.BASIC]: { ttl: 60, limit: 100 },
        [UserPlan.PREMIUM]: { ttl: 60, limit: 300 },
        [UserPlan.ENTERPRISE]: { ttl: 60, limit: 1000 },
      },
    },
    [EndpointGroup.UPLOAD]: {
      anonymous: { ttl: 60, limit: 5 }, // Very restrictive for uploads
      authenticated: {
        [UserPlan.FREE]: { ttl: 60, limit: 10 },
        [UserPlan.BASIC]: { ttl: 60, limit: 30 },
        [UserPlan.PREMIUM]: { ttl: 60, limit: 60 },
        [UserPlan.ENTERPRISE]: { ttl: 60, limit: 200 },
      },
    },
    [EndpointGroup.AI]: {
      anonymous: { ttl: 60, limit: 5 }, // AI endpoints are expensive
      authenticated: {
        [UserPlan.FREE]: { ttl: 60, limit: 10 },
        [UserPlan.BASIC]: { ttl: 60, limit: 30 },
        [UserPlan.PREMIUM]: { ttl: 60, limit: 100 },
        [UserPlan.ENTERPRISE]: { ttl: 60, limit: 500 },
      },
    },
  },

  operationMultipliers: {
    [OperationType.READ]: 1.0, // Read operations use full limit
    [OperationType.WRITE]: 0.5, // Write operations are limited to 50% of read limit
  },
};

/**
 * Get throttler configuration from environment variables
 */
export function getThrottlerConfig(configService: ConfigService): ThrottlerConfig {
  const config = { ...DEFAULT_THROTTLER_CONFIG };

  // Override default values from environment
  const envTtl = configService.get<number>('THROTTLE_TTL');
  const envLimit = configService.get<number>('THROTTLE_LIMIT');

  if (envTtl) {
    config.default.ttl = envTtl;
  }

  if (envLimit) {
    config.default.limit = envLimit;
  }

  // Override anonymous limits
  const anonTtl = configService.get<number>('THROTTLE_ANONYMOUS_TTL');
  const anonLimit = configService.get<number>('THROTTLE_ANONYMOUS_LIMIT');

  if (anonTtl) {
    config.anonymous.ttl = anonTtl;
  }

  if (anonLimit) {
    config.anonymous.limit = anonLimit;
  }

  // Override auth endpoint limits
  const authTtl = configService.get<number>('THROTTLE_AUTH_TTL');
  const authLimit = configService.get<number>('THROTTLE_AUTH_LIMIT');

  if (authTtl) {
    config.byGroup[EndpointGroup.AUTH].anonymous.ttl = authTtl;
  }

  if (authLimit) {
    config.byGroup[EndpointGroup.AUTH].anonymous.limit = authLimit;
  }

  // Override webhook limits
  const webhookTtl = configService.get<number>('THROTTLE_WEBHOOK_TTL');
  const webhookLimit = configService.get<number>('THROTTLE_WEBHOOK_LIMIT');

  if (webhookTtl) {
    config.byGroup[EndpointGroup.WEBHOOKS].anonymous.ttl = webhookTtl;
  }

  if (webhookLimit) {
    config.byGroup[EndpointGroup.WEBHOOKS].anonymous.limit = webhookLimit;
  }

  // Override AI endpoint limits
  const aiTtl = configService.get<number>('THROTTLE_AI_TTL');
  const aiLimit = configService.get<number>('THROTTLE_AI_LIMIT');

  if (aiTtl) {
    config.byGroup[EndpointGroup.AI].anonymous.ttl = aiTtl;
  }

  if (aiLimit) {
    config.byGroup[EndpointGroup.AI].anonymous.limit = aiLimit;
  }

  return config;
}

/**
 * Get rate limit for a specific context
 */
export function getRateLimit(
  config: ThrottlerConfig,
  options: {
    isAuthenticated: boolean;
    userPlan?: UserPlan;
    endpointGroup?: EndpointGroup;
    operationType?: OperationType;
  },
): RateLimitTier {
  const {
    isAuthenticated,
    userPlan = UserPlan.FREE,
    endpointGroup = EndpointGroup.API,
    operationType = OperationType.READ,
  } = options;

  let tier: RateLimitTier;

  // Get base tier from endpoint group
  const groupConfig = config.byGroup[endpointGroup];

  if (isAuthenticated && groupConfig) {
    tier = { ...groupConfig.authenticated[userPlan] };
  } else if (groupConfig) {
    tier = { ...groupConfig.anonymous };
  } else if (isAuthenticated) {
    tier = { ...config.byPlan[userPlan] };
  } else {
    tier = { ...config.anonymous };
  }

  // Apply operation multiplier
  const multiplier = config.operationMultipliers[operationType];
  tier.limit = Math.floor(tier.limit * multiplier);

  return tier;
}
