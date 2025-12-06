/**
 * Feature Flags Configuration
 *
 * This file defines all available feature flags for the application.
 * Feature flags enable/disable features without code changes.
 *
 * @module feature-flags
 */

/**
 * Feature flag keys enum for type safety
 */
export enum FeatureFlag {
  AI_RECOMMENDATIONS = 'AI_RECOMMENDATIONS',
  SOCIAL_LOGIN = 'SOCIAL_LOGIN',
  BNPL_PAYMENTS = 'BNPL_PAYMENTS',
  VIRTUAL_TRYON = 'VIRTUAL_TRYON',
  CHAT_SUPPORT = 'CHAT_SUPPORT',
  OFFLINE_MODE = 'OFFLINE_MODE',
}

/**
 * Feature flag metadata interface
 */
export interface FeatureFlagConfig {
  key: FeatureFlag;
  enabled: boolean;
  description: string;
  environments?: ('development' | 'staging' | 'production')[];
  rolloutPercentage?: number; // 0-100, for gradual rollouts
  enabledForUsers?: string[]; // User IDs for targeted rollouts
}

/**
 * Feature flags configuration object
 *
 * This is the central place to enable/disable features.
 * Environment-specific overrides can be set via environment variables.
 */
export const featureFlags: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.AI_RECOMMENDATIONS]: {
    key: FeatureFlag.AI_RECOMMENDATIONS,
    enabled: true,
    description: 'AI-powered product recommendations using machine learning',
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  [FeatureFlag.SOCIAL_LOGIN]: {
    key: FeatureFlag.SOCIAL_LOGIN,
    enabled: true,
    description: 'Social authentication (Google, Facebook, Apple)',
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  [FeatureFlag.BNPL_PAYMENTS]: {
    key: FeatureFlag.BNPL_PAYMENTS,
    enabled: true,
    description: 'Buy Now Pay Later payment options (Klarna, Afterpay)',
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  [FeatureFlag.VIRTUAL_TRYON]: {
    key: FeatureFlag.VIRTUAL_TRYON,
    enabled: false,
    description: 'Virtual try-on using AR/camera for fashion and accessories',
    environments: ['development', 'staging'],
    rolloutPercentage: 0,
  },

  [FeatureFlag.CHAT_SUPPORT]: {
    key: FeatureFlag.CHAT_SUPPORT,
    enabled: true,
    description: 'Live chat support with customer service agents',
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  [FeatureFlag.OFFLINE_MODE]: {
    key: FeatureFlag.OFFLINE_MODE,
    enabled: false,
    description: 'Offline mode with service worker caching',
    environments: ['development'],
    rolloutPercentage: 0,
  },
};

/**
 * Get environment from Node.js environment variables
 */
const getCurrentEnvironment = (): 'development' | 'staging' | 'production' => {
  // Use NEXT_PUBLIC_APP_ENV for custom environments, fallback to NODE_ENV
  const env = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development') as string;

  if (env === 'production') {
    return 'production';
  } else if (env === 'staging') {
    return 'staging';
  }

  return 'development';
};

/**
 * Check if a feature flag is enabled
 *
 * This function considers:
 * - Base enabled state
 * - Environment restrictions
 * - Environment variable overrides
 * - Rollout percentage (for gradual feature rollouts)
 * - User-specific enablement
 *
 * @param flag - The feature flag to check
 * @param userId - Optional user ID for targeted rollouts
 * @returns true if the feature is enabled, false otherwise
 */
export const isFeatureEnabled = (
  flag: FeatureFlag,
  userId?: string
): boolean => {
  const config = featureFlags[flag];

  if (!config) {
    console.warn(`Feature flag "${flag}" not found`);
    return false;
  }

  // Check environment variable override
  const envOverride = process.env[`NEXT_PUBLIC_FEATURE_${flag}`];
  if (envOverride !== undefined) {
    return envOverride === 'true' || envOverride === '1';
  }

  // Check if feature is enabled
  if (!config.enabled) {
    return false;
  }

  // Check environment restrictions
  const currentEnv = getCurrentEnvironment();
  if (config.environments && !config.environments.includes(currentEnv)) {
    return false;
  }

  // Check user-specific enablement
  if (userId && config.enabledForUsers) {
    return config.enabledForUsers.includes(userId);
  }

  // Check rollout percentage
  if (config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
    // Use deterministic hash based on flag + userId for consistent user experience
    if (userId) {
      const hash = simpleHash(`${flag}-${userId}`);
      return (hash % 100) < config.rolloutPercentage;
    }
    // For anonymous users, use random rollout
    return Math.random() * 100 < config.rolloutPercentage;
  }

  return true;
};

/**
 * Simple hash function for deterministic rollout percentage
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get all enabled feature flags
 *
 * @param userId - Optional user ID for targeted rollouts
 * @returns Array of enabled feature flag keys
 */
export const getEnabledFeatures = (userId?: string): FeatureFlag[] => {
  return Object.values(FeatureFlag).filter(flag =>
    isFeatureEnabled(flag, userId)
  );
};

/**
 * Get feature flag configuration
 *
 * @param flag - The feature flag to get config for
 * @returns The feature flag configuration object
 */
export const getFeatureFlagConfig = (flag: FeatureFlag): FeatureFlagConfig | undefined => {
  return featureFlags[flag];
};

/**
 * Get all feature flags with their current state
 *
 * @param userId - Optional user ID for targeted rollouts
 * @returns Object mapping feature flags to their enabled state
 */
export const getAllFeatureStates = (userId?: string): Record<FeatureFlag, boolean> => {
  const states = {} as Record<FeatureFlag, boolean>;

  Object.values(FeatureFlag).forEach(flag => {
    states[flag] = isFeatureEnabled(flag, userId);
  });

  return states;
};

/**
 * Type guard to check if a string is a valid FeatureFlag
 */
export const isValidFeatureFlag = (flag: string): flag is FeatureFlag => {
  return Object.values(FeatureFlag).includes(flag as FeatureFlag);
};
