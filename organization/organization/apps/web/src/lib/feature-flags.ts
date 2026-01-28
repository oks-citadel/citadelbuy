// Feature Flags Configuration
// This module provides a centralized way to manage feature toggles

export interface FeatureFlags {
  // Payment Features
  enableStripePayments: boolean;
  enablePayPalPayments: boolean;
  enableApplePay: boolean;
  enableGooglePay: boolean;
  enableBNPL: boolean; // Buy Now Pay Later

  // Auth Features
  enableSocialLogin: boolean;
  enableGoogleAuth: boolean;
  enableFacebookAuth: boolean;
  enableAppleAuth: boolean;
  enableMFA: boolean; // Multi-Factor Authentication

  // Shopping Features
  enableWishlist: boolean;
  enableProductComparison: boolean;
  enableProductReviews: boolean;
  enableGiftCards: boolean;
  enableSubscriptions: boolean;
  enableCoupons: boolean;

  // AI Features
  enableAIRecommendations: boolean;
  enableAISearch: boolean;
  enableAIChatbot: boolean;
  enableVisualSearch: boolean;

  // Vendor Features
  enableMultiVendor: boolean;
  enableVendorAnalytics: boolean;
  enableVendorSubscriptions: boolean;

  // Marketing Features
  enableEmailMarketing: boolean;
  enablePushNotifications: boolean;
  enableABTesting: boolean;
  enablePersonalization: boolean;

  // Experimental Features
  enableBetaFeatures: boolean;
  enableDarkMode: boolean;
  enablePWA: boolean;
}

// Default feature flags configuration
const defaultFlags: FeatureFlags = {
  // Payment Features
  enableStripePayments: true,
  enablePayPalPayments: true,
  enableApplePay: false,
  enableGooglePay: false,
  enableBNPL: true,

  // Auth Features
  enableSocialLogin: true,
  enableGoogleAuth: true,
  enableFacebookAuth: true,
  enableAppleAuth: false,
  enableMFA: false,

  // Shopping Features
  enableWishlist: true,
  enableProductComparison: true,
  enableProductReviews: true,
  enableGiftCards: true,
  enableSubscriptions: true,
  enableCoupons: true,

  // AI Features
  enableAIRecommendations: true,
  enableAISearch: true,
  enableAIChatbot: true,
  enableVisualSearch: false,

  // Vendor Features
  enableMultiVendor: true,
  enableVendorAnalytics: true,
  enableVendorSubscriptions: true,

  // Marketing Features
  enableEmailMarketing: true,
  enablePushNotifications: false,
  enableABTesting: false,
  enablePersonalization: true,

  // Experimental Features
  enableBetaFeatures: false,
  enableDarkMode: true,
  enablePWA: true,
};

// Environment-based overrides
const getEnvironmentOverrides = (): Partial<FeatureFlags> => {
  const env = process.env.NODE_ENV;

  if (env === 'development') {
    return {
      enableBetaFeatures: true,
      enableABTesting: true,
    };
  }

  if (env === 'production') {
    return {
      enableBetaFeatures: false,
    };
  }

  return {};
};

// Merge flags with environment overrides
const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...getEnvironmentOverrides(),
};

// Feature flag getter
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag] ?? false;
}

// Get all feature flags
export function getAllFeatureFlags(): FeatureFlags {
  return { ...featureFlags };
}

// Check multiple flags at once
export function areAllFeaturesEnabled(flags: (keyof FeatureFlags)[]): boolean {
  return flags.every((flag) => isFeatureEnabled(flag));
}

// Check if any of the flags are enabled
export function isAnyFeatureEnabled(flags: (keyof FeatureFlags)[]): boolean {
  return flags.some((flag) => isFeatureEnabled(flag));
}

// Export the flags object for direct access
export { featureFlags };

export default featureFlags;
