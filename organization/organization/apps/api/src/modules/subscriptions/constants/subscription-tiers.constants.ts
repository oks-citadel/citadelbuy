/**
 * Subscription Tier Definitions
 *
 * Comprehensive tier system for vendor subscriptions with 6 tiers:
 * - FREE (Starter): $0/month, 3% fee
 * - SILVER: $29.99/month, 2.5% fee
 * - GOLD: $79.99/month, 2% fee
 * - PLATINUM: $199.99/month, 1.5% fee
 * - DIAMOND: $499.99/month, 1% fee
 * - ENTERPRISE: Custom pricing
 */

import { SubscriptionPlanType, BillingInterval } from '@prisma/client';

// =============================================================================
// FEATURE FLAGS INTERFACE
// =============================================================================

export interface SubscriptionFeatures {
  // Product features
  maxProductListings: number | null;
  basicProductPages: boolean;
  productVariants: boolean;
  bulkProductUpload: boolean;
  csvImport: boolean;
  apiProductManagement: boolean;

  // Order & checkout
  standardCheckout: boolean;
  manualOrderProcessing: boolean;
  automatedOrderProcessing: boolean;
  maxOrdersPerMonth: number | null;

  // Branding & customization
  broxivaBranding: boolean;
  customStoreUrl: boolean;
  customDomain: boolean;
  whiteLabelStorefront: boolean;
  noAdsDisplayed: boolean;

  // Analytics & reporting
  basicAnalytics: boolean;
  customerAnalytics: boolean;
  advancedAnalyticsDashboard: boolean;
  customReportsBuilder: boolean;
  premiumAnalyticsSuite: boolean;

  // Inventory & shipping
  basicInventoryAlerts: boolean;
  smartInventoryManagement: boolean;
  multiWarehouseSupport: boolean;
  shippingIntegration: number; // Number of carriers

  // Marketing & promotions
  maxDiscountCodesPerMonth: number | null;
  couponScheduling: boolean;
  abandonedCartRecovery: 'none' | 'basic' | 'advanced';
  customerLoyaltyProgram: boolean;
  emailMarketingIntegration: boolean;
  abTesting: boolean;

  // SEO & social
  basicSeoTools: boolean;
  advancedSeoTools: boolean;
  socialMediaIntegration: boolean;

  // Support
  supportType: 'email' | 'email_chat' | 'priority_email_chat' | 'priority_chat_phone' | 'dedicated';
  supportResponseHours: number;
  communityForumAccess: boolean;

  // Admin & team
  maxAdminUsers: number | null;

  // Pricing & currency
  multiCurrencySupport: number; // Number of currencies
  wholesalePricing: boolean;
  aiPricingOptimization: boolean;
  competitorPriceMonitoring: boolean;
  automatedRepricing: boolean;

  // AI features
  basicAiRecommendations: boolean;
  advancedAiRecommendations: boolean;
  personalAiBusinessAdvisor: boolean;
  demandForecasting: 'none' | 'basic' | 'advanced';

  // Segmentation
  basicCustomerSegmentation: boolean;
  advancedCustomerSegmentation: boolean;

  // Featured & promotions
  featuredListingsPerMonth: number;
  promotionalBannerSlots: boolean;
  prioritySearchPlacement: boolean;
  topVendorsSection: boolean;
  homepageSpotlight: boolean;

  // API access
  apiAccess: boolean;
  apiCallsPerMonth: number | null;
  customApiIntegrations: boolean;

  // Enterprise features
  dedicatedAccountManager: boolean;
  customFeatureDevelopment: boolean;
  multiStoreManagement: boolean;
  onPremiseDeployment: boolean;
  customCompliance: boolean;
  dedicatedInfrastructure: boolean;
  customSlaGuarantees: boolean;
  roadmapInfluence: boolean;
  whiteGloveMigration: boolean;

  // Security
  advancedFraudProtection: boolean;

  // Return management
  returnManagementSystem: boolean;

  // Badges
  vipVendorBadge: boolean;

  // Early/beta access
  earlyFeatureAccess: boolean;
  betaFeatureAccess: boolean;
}

// =============================================================================
// TIER DEFINITION INTERFACE
// =============================================================================

export interface SubscriptionTierDefinition {
  type: SubscriptionPlanType;
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number; // 20% discount on yearly
  transactionFee: number; // Percentage
  isPopular: boolean;
  displayOrder: number;
  trialDays: number;
  features: SubscriptionFeatures;
}

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export const VENDOR_TIER_FREE: SubscriptionTierDefinition = {
  type: SubscriptionPlanType.VENDOR_FREE,
  slug: 'free',
  name: 'Free',
  description: 'Perfect for getting started with your online business',
  monthlyPrice: 0,
  yearlyPrice: 0,
  transactionFee: 3.0,
  isPopular: false,
  displayOrder: 1,
  trialDays: 0,
  features: {
    // Product features
    maxProductListings: 10,
    basicProductPages: true,
    productVariants: false,
    bulkProductUpload: false,
    csvImport: false,
    apiProductManagement: false,

    // Order & checkout
    standardCheckout: true,
    manualOrderProcessing: true,
    automatedOrderProcessing: false,
    maxOrdersPerMonth: 50,

    // Branding
    broxivaBranding: true,
    customStoreUrl: false,
    customDomain: false,
    whiteLabelStorefront: false,
    noAdsDisplayed: false,

    // Analytics
    basicAnalytics: true,
    customerAnalytics: false,
    advancedAnalyticsDashboard: false,
    customReportsBuilder: false,
    premiumAnalyticsSuite: false,

    // Inventory & shipping
    basicInventoryAlerts: false,
    smartInventoryManagement: false,
    multiWarehouseSupport: false,
    shippingIntegration: 0,

    // Marketing
    maxDiscountCodesPerMonth: 0,
    couponScheduling: false,
    abandonedCartRecovery: 'none',
    customerLoyaltyProgram: false,
    emailMarketingIntegration: false,
    abTesting: false,

    // SEO & social
    basicSeoTools: false,
    advancedSeoTools: false,
    socialMediaIntegration: false,

    // Support
    supportType: 'email',
    supportResponseHours: 48,
    communityForumAccess: true,

    // Admin
    maxAdminUsers: 1,

    // Pricing
    multiCurrencySupport: 1,
    wholesalePricing: false,
    aiPricingOptimization: false,
    competitorPriceMonitoring: false,
    automatedRepricing: false,

    // AI features
    basicAiRecommendations: false,
    advancedAiRecommendations: false,
    personalAiBusinessAdvisor: false,
    demandForecasting: 'none',

    // Segmentation
    basicCustomerSegmentation: false,
    advancedCustomerSegmentation: false,

    // Featured
    featuredListingsPerMonth: 0,
    promotionalBannerSlots: false,
    prioritySearchPlacement: false,
    topVendorsSection: false,
    homepageSpotlight: false,

    // API
    apiAccess: false,
    apiCallsPerMonth: 0,
    customApiIntegrations: false,

    // Enterprise
    dedicatedAccountManager: false,
    customFeatureDevelopment: false,
    multiStoreManagement: false,
    onPremiseDeployment: false,
    customCompliance: false,
    dedicatedInfrastructure: false,
    customSlaGuarantees: false,
    roadmapInfluence: false,
    whiteGloveMigration: false,

    // Security
    advancedFraudProtection: false,

    // Returns
    returnManagementSystem: false,

    // Badges
    vipVendorBadge: false,

    // Early access
    earlyFeatureAccess: false,
    betaFeatureAccess: false,
  },
};

export const VENDOR_TIER_SILVER: SubscriptionTierDefinition = {
  type: SubscriptionPlanType.VENDOR_SILVER,
  slug: 'silver',
  name: 'Silver',
  description: 'For growing businesses ready to scale',
  monthlyPrice: 29.99,
  yearlyPrice: 287.90, // 20% discount
  transactionFee: 2.5,
  isPopular: false,
  displayOrder: 2,
  trialDays: 14,
  features: {
    // Product features
    maxProductListings: 100,
    basicProductPages: true,
    productVariants: false,
    bulkProductUpload: false,
    csvImport: true,
    apiProductManagement: false,

    // Order & checkout
    standardCheckout: true,
    manualOrderProcessing: true,
    automatedOrderProcessing: false,
    maxOrdersPerMonth: 500,

    // Branding
    broxivaBranding: false,
    customStoreUrl: true,
    customDomain: false,
    whiteLabelStorefront: false,
    noAdsDisplayed: true,

    // Analytics
    basicAnalytics: true,
    customerAnalytics: true,
    advancedAnalyticsDashboard: false,
    customReportsBuilder: false,
    premiumAnalyticsSuite: false,

    // Inventory & shipping
    basicInventoryAlerts: true,
    smartInventoryManagement: false,
    multiWarehouseSupport: false,
    shippingIntegration: 3,

    // Marketing
    maxDiscountCodesPerMonth: 5,
    couponScheduling: false,
    abandonedCartRecovery: 'none',
    customerLoyaltyProgram: false,
    emailMarketingIntegration: false,
    abTesting: false,

    // SEO & social
    basicSeoTools: false,
    advancedSeoTools: false,
    socialMediaIntegration: false,

    // Support
    supportType: 'email',
    supportResponseHours: 24,
    communityForumAccess: true,

    // Admin
    maxAdminUsers: 2,

    // Pricing
    multiCurrencySupport: 1,
    wholesalePricing: false,
    aiPricingOptimization: false,
    competitorPriceMonitoring: false,
    automatedRepricing: false,

    // AI features
    basicAiRecommendations: false,
    advancedAiRecommendations: false,
    personalAiBusinessAdvisor: false,
    demandForecasting: 'none',

    // Segmentation
    basicCustomerSegmentation: false,
    advancedCustomerSegmentation: false,

    // Featured
    featuredListingsPerMonth: 0,
    promotionalBannerSlots: false,
    prioritySearchPlacement: false,
    topVendorsSection: false,
    homepageSpotlight: false,

    // API
    apiAccess: false,
    apiCallsPerMonth: 0,
    customApiIntegrations: false,

    // Enterprise
    dedicatedAccountManager: false,
    customFeatureDevelopment: false,
    multiStoreManagement: false,
    onPremiseDeployment: false,
    customCompliance: false,
    dedicatedInfrastructure: false,
    customSlaGuarantees: false,
    roadmapInfluence: false,
    whiteGloveMigration: false,

    // Security
    advancedFraudProtection: false,

    // Returns
    returnManagementSystem: false,

    // Badges
    vipVendorBadge: false,

    // Early access
    earlyFeatureAccess: false,
    betaFeatureAccess: false,
  },
};

export const VENDOR_TIER_GOLD: SubscriptionTierDefinition = {
  type: SubscriptionPlanType.VENDOR_GOLD,
  slug: 'gold',
  name: 'Gold',
  description: 'Advanced features for established sellers',
  monthlyPrice: 79.99,
  yearlyPrice: 767.90, // 20% discount
  transactionFee: 2.0,
  isPopular: true, // Most popular plan
  displayOrder: 3,
  trialDays: 14,
  features: {
    // Product features
    maxProductListings: 500,
    basicProductPages: true,
    productVariants: true,
    bulkProductUpload: true,
    csvImport: true,
    apiProductManagement: false,

    // Order & checkout
    standardCheckout: true,
    manualOrderProcessing: true,
    automatedOrderProcessing: true,
    maxOrdersPerMonth: 2500,

    // Branding
    broxivaBranding: false,
    customStoreUrl: true,
    customDomain: false,
    whiteLabelStorefront: false,
    noAdsDisplayed: true,

    // Analytics
    basicAnalytics: true,
    customerAnalytics: true,
    advancedAnalyticsDashboard: true,
    customReportsBuilder: false,
    premiumAnalyticsSuite: false,

    // Inventory & shipping
    basicInventoryAlerts: true,
    smartInventoryManagement: false,
    multiWarehouseSupport: false,
    shippingIntegration: 5,

    // Marketing
    maxDiscountCodesPerMonth: 25,
    couponScheduling: true,
    abandonedCartRecovery: 'basic',
    customerLoyaltyProgram: false,
    emailMarketingIntegration: false,
    abTesting: false,

    // SEO & social
    basicSeoTools: true,
    advancedSeoTools: false,
    socialMediaIntegration: true,

    // Support
    supportType: 'email_chat',
    supportResponseHours: 12,
    communityForumAccess: true,

    // Admin
    maxAdminUsers: 5,

    // Pricing
    multiCurrencySupport: 10,
    wholesalePricing: false,
    aiPricingOptimization: false,
    competitorPriceMonitoring: false,
    automatedRepricing: false,

    // AI features
    basicAiRecommendations: false,
    advancedAiRecommendations: false,
    personalAiBusinessAdvisor: false,
    demandForecasting: 'none',

    // Segmentation
    basicCustomerSegmentation: true,
    advancedCustomerSegmentation: false,

    // Featured
    featuredListingsPerMonth: 1,
    promotionalBannerSlots: false,
    prioritySearchPlacement: false,
    topVendorsSection: false,
    homepageSpotlight: false,

    // API
    apiAccess: false,
    apiCallsPerMonth: 0,
    customApiIntegrations: false,

    // Enterprise
    dedicatedAccountManager: false,
    customFeatureDevelopment: false,
    multiStoreManagement: false,
    onPremiseDeployment: false,
    customCompliance: false,
    dedicatedInfrastructure: false,
    customSlaGuarantees: false,
    roadmapInfluence: false,
    whiteGloveMigration: false,

    // Security
    advancedFraudProtection: false,

    // Returns
    returnManagementSystem: true,

    // Badges
    vipVendorBadge: false,

    // Early access
    earlyFeatureAccess: false,
    betaFeatureAccess: false,
  },
};

export const VENDOR_TIER_PLATINUM: SubscriptionTierDefinition = {
  type: SubscriptionPlanType.VENDOR_PLATINUM,
  slug: 'platinum',
  name: 'Platinum',
  description: 'Premium tools for high-volume sellers',
  monthlyPrice: 199.99,
  yearlyPrice: 1919.90, // 20% discount
  transactionFee: 1.5,
  isPopular: false,
  displayOrder: 4,
  trialDays: 14,
  features: {
    // Product features
    maxProductListings: 2500,
    basicProductPages: true,
    productVariants: true,
    bulkProductUpload: true,
    csvImport: true,
    apiProductManagement: true,

    // Order & checkout
    standardCheckout: true,
    manualOrderProcessing: true,
    automatedOrderProcessing: true,
    maxOrdersPerMonth: 10000,

    // Branding
    broxivaBranding: false,
    customStoreUrl: true,
    customDomain: false,
    whiteLabelStorefront: false,
    noAdsDisplayed: true,

    // Analytics
    basicAnalytics: true,
    customerAnalytics: true,
    advancedAnalyticsDashboard: true,
    customReportsBuilder: true,
    premiumAnalyticsSuite: false,

    // Inventory & shipping
    basicInventoryAlerts: true,
    smartInventoryManagement: true,
    multiWarehouseSupport: true,
    shippingIntegration: 10,

    // Marketing
    maxDiscountCodesPerMonth: null, // Unlimited
    couponScheduling: true,
    abandonedCartRecovery: 'advanced',
    customerLoyaltyProgram: true,
    emailMarketingIntegration: true,
    abTesting: true,

    // SEO & social
    basicSeoTools: true,
    advancedSeoTools: true,
    socialMediaIntegration: true,

    // Support
    supportType: 'priority_chat_phone',
    supportResponseHours: 4,
    communityForumAccess: true,

    // Admin
    maxAdminUsers: 15,

    // Pricing
    multiCurrencySupport: 25,
    wholesalePricing: true,
    aiPricingOptimization: false,
    competitorPriceMonitoring: false,
    automatedRepricing: false,

    // AI features
    basicAiRecommendations: true,
    advancedAiRecommendations: false,
    personalAiBusinessAdvisor: false,
    demandForecasting: 'basic',

    // Segmentation
    basicCustomerSegmentation: true,
    advancedCustomerSegmentation: true,

    // Featured
    featuredListingsPerMonth: 5,
    promotionalBannerSlots: true,
    prioritySearchPlacement: false,
    topVendorsSection: false,
    homepageSpotlight: false,

    // API
    apiAccess: true,
    apiCallsPerMonth: 10000,
    customApiIntegrations: false,

    // Enterprise
    dedicatedAccountManager: false,
    customFeatureDevelopment: false,
    multiStoreManagement: false,
    onPremiseDeployment: false,
    customCompliance: false,
    dedicatedInfrastructure: false,
    customSlaGuarantees: false,
    roadmapInfluence: false,
    whiteGloveMigration: false,

    // Security
    advancedFraudProtection: false,

    // Returns
    returnManagementSystem: true,

    // Badges
    vipVendorBadge: false,

    // Early access
    earlyFeatureAccess: true,
    betaFeatureAccess: false,
  },
};

export const VENDOR_TIER_DIAMOND: SubscriptionTierDefinition = {
  type: SubscriptionPlanType.VENDOR_DIAMOND,
  slug: 'diamond',
  name: 'Diamond',
  description: 'Ultimate package for enterprise sellers',
  monthlyPrice: 499.99,
  yearlyPrice: 4799.90, // 20% discount
  transactionFee: 1.0,
  isPopular: false,
  displayOrder: 5,
  trialDays: 30,
  features: {
    // Product features
    maxProductListings: null, // Unlimited
    basicProductPages: true,
    productVariants: true,
    bulkProductUpload: true,
    csvImport: true,
    apiProductManagement: true,

    // Order & checkout
    standardCheckout: true,
    manualOrderProcessing: true,
    automatedOrderProcessing: true,
    maxOrdersPerMonth: null, // Unlimited

    // Branding
    broxivaBranding: false,
    customStoreUrl: true,
    customDomain: true,
    whiteLabelStorefront: true,
    noAdsDisplayed: true,

    // Analytics
    basicAnalytics: true,
    customerAnalytics: true,
    advancedAnalyticsDashboard: true,
    customReportsBuilder: true,
    premiumAnalyticsSuite: true,

    // Inventory & shipping
    basicInventoryAlerts: true,
    smartInventoryManagement: true,
    multiWarehouseSupport: true,
    shippingIntegration: 20, // All major carriers

    // Marketing
    maxDiscountCodesPerMonth: null, // Unlimited
    couponScheduling: true,
    abandonedCartRecovery: 'advanced',
    customerLoyaltyProgram: true,
    emailMarketingIntegration: true,
    abTesting: true,

    // SEO & social
    basicSeoTools: true,
    advancedSeoTools: true,
    socialMediaIntegration: true,

    // Support
    supportType: 'dedicated',
    supportResponseHours: 1,
    communityForumAccess: true,

    // Admin
    maxAdminUsers: null, // Unlimited

    // Pricing
    multiCurrencySupport: 100, // All currencies
    wholesalePricing: true,
    aiPricingOptimization: true,
    competitorPriceMonitoring: true,
    automatedRepricing: true,

    // AI features
    basicAiRecommendations: true,
    advancedAiRecommendations: true,
    personalAiBusinessAdvisor: true,
    demandForecasting: 'advanced',

    // Segmentation
    basicCustomerSegmentation: true,
    advancedCustomerSegmentation: true,

    // Featured
    featuredListingsPerMonth: 20,
    promotionalBannerSlots: true,
    prioritySearchPlacement: true,
    topVendorsSection: true,
    homepageSpotlight: true,

    // API
    apiAccess: true,
    apiCallsPerMonth: null, // Unlimited
    customApiIntegrations: true,

    // Enterprise
    dedicatedAccountManager: true,
    customFeatureDevelopment: false,
    multiStoreManagement: false,
    onPremiseDeployment: false,
    customCompliance: false,
    dedicatedInfrastructure: false,
    customSlaGuarantees: false,
    roadmapInfluence: false,
    whiteGloveMigration: false,

    // Security
    advancedFraudProtection: true,

    // Returns
    returnManagementSystem: true,

    // Badges
    vipVendorBadge: true,

    // Early access
    earlyFeatureAccess: true,
    betaFeatureAccess: true,
  },
};

export const VENDOR_TIER_ENTERPRISE: SubscriptionTierDefinition = {
  type: SubscriptionPlanType.VENDOR_ENTERPRISE,
  slug: 'enterprise',
  name: 'Enterprise',
  description: 'Custom solutions for large organizations',
  monthlyPrice: 0, // Custom pricing
  yearlyPrice: 0, // Custom pricing
  transactionFee: 0.5, // Typically 0.5-1%
  isPopular: false,
  displayOrder: 6,
  trialDays: 0, // No trial for enterprise
  features: {
    // Everything in Diamond plus:
    maxProductListings: null,
    basicProductPages: true,
    productVariants: true,
    bulkProductUpload: true,
    csvImport: true,
    apiProductManagement: true,

    standardCheckout: true,
    manualOrderProcessing: true,
    automatedOrderProcessing: true,
    maxOrdersPerMonth: null,

    broxivaBranding: false,
    customStoreUrl: true,
    customDomain: true,
    whiteLabelStorefront: true,
    noAdsDisplayed: true,

    basicAnalytics: true,
    customerAnalytics: true,
    advancedAnalyticsDashboard: true,
    customReportsBuilder: true,
    premiumAnalyticsSuite: true,

    basicInventoryAlerts: true,
    smartInventoryManagement: true,
    multiWarehouseSupport: true,
    shippingIntegration: 50, // Custom integrations

    maxDiscountCodesPerMonth: null,
    couponScheduling: true,
    abandonedCartRecovery: 'advanced',
    customerLoyaltyProgram: true,
    emailMarketingIntegration: true,
    abTesting: true,

    basicSeoTools: true,
    advancedSeoTools: true,
    socialMediaIntegration: true,

    supportType: 'dedicated',
    supportResponseHours: 0.5, // 30 minutes
    communityForumAccess: true,

    maxAdminUsers: null,

    multiCurrencySupport: 200, // All currencies + custom
    wholesalePricing: true,
    aiPricingOptimization: true,
    competitorPriceMonitoring: true,
    automatedRepricing: true,

    basicAiRecommendations: true,
    advancedAiRecommendations: true,
    personalAiBusinessAdvisor: true,
    demandForecasting: 'advanced',

    basicCustomerSegmentation: true,
    advancedCustomerSegmentation: true,

    featuredListingsPerMonth: 50, // Or unlimited
    promotionalBannerSlots: true,
    prioritySearchPlacement: true,
    topVendorsSection: true,
    homepageSpotlight: true,

    apiAccess: true,
    apiCallsPerMonth: null,
    customApiIntegrations: true,

    // Enterprise-exclusive features
    dedicatedAccountManager: true,
    customFeatureDevelopment: true,
    multiStoreManagement: true,
    onPremiseDeployment: true,
    customCompliance: true,
    dedicatedInfrastructure: true,
    customSlaGuarantees: true,
    roadmapInfluence: true,
    whiteGloveMigration: true,

    advancedFraudProtection: true,
    returnManagementSystem: true,
    vipVendorBadge: true,
    earlyFeatureAccess: true,
    betaFeatureAccess: true,
  },
};

// =============================================================================
// ALL TIERS COLLECTION
// =============================================================================

export const VENDOR_SUBSCRIPTION_TIERS: SubscriptionTierDefinition[] = [
  VENDOR_TIER_FREE,
  VENDOR_TIER_SILVER,
  VENDOR_TIER_GOLD,
  VENDOR_TIER_PLATINUM,
  VENDOR_TIER_DIAMOND,
  VENDOR_TIER_ENTERPRISE,
];

// =============================================================================
// TIER LOOKUP HELPERS
// =============================================================================

export const getTierByType = (type: SubscriptionPlanType): SubscriptionTierDefinition | undefined => {
  return VENDOR_SUBSCRIPTION_TIERS.find(tier => tier.type === type);
};

export const getTierBySlug = (slug: string): SubscriptionTierDefinition | undefined => {
  return VENDOR_SUBSCRIPTION_TIERS.find(tier => tier.slug === slug);
};

export const getTierHierarchy = (): SubscriptionPlanType[] => {
  return [
    SubscriptionPlanType.VENDOR_FREE,
    SubscriptionPlanType.VENDOR_SILVER,
    SubscriptionPlanType.VENDOR_GOLD,
    SubscriptionPlanType.VENDOR_PLATINUM,
    SubscriptionPlanType.VENDOR_DIAMOND,
    SubscriptionPlanType.VENDOR_ENTERPRISE,
  ];
};

export const isTierHigherOrEqual = (
  currentTier: SubscriptionPlanType,
  requiredTier: SubscriptionPlanType,
): boolean => {
  const hierarchy = getTierHierarchy();
  const currentIndex = hierarchy.indexOf(currentTier);
  const requiredIndex = hierarchy.indexOf(requiredTier);

  if (currentIndex === -1 || requiredIndex === -1) {
    return false;
  }

  return currentIndex >= requiredIndex;
};

// =============================================================================
// FEATURE CHECK HELPER
// =============================================================================

export type FeatureKey = keyof SubscriptionFeatures;

export const hasFeature = (
  tierType: SubscriptionPlanType,
  featureKey: FeatureKey,
): boolean => {
  const tier = getTierByType(tierType);
  if (!tier) return false;

  const value = tier.features[featureKey];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (value === null) {
    return true; // null means unlimited
  }

  if (typeof value === 'string') {
    return value !== 'none';
  }

  return false;
};

export const getFeatureLimit = (
  tierType: SubscriptionPlanType,
  featureKey: FeatureKey,
): number | null => {
  const tier = getTierByType(tierType);
  if (!tier) return 0;

  const value = tier.features[featureKey];

  if (typeof value === 'number') {
    return value;
  }

  if (value === null) {
    return null; // null means unlimited
  }

  return null;
};

// =============================================================================
// UPGRADE PATH HELPERS
// =============================================================================

export const getNextTier = (currentTier: SubscriptionPlanType): SubscriptionPlanType | null => {
  const hierarchy = getTierHierarchy();
  const currentIndex = hierarchy.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex >= hierarchy.length - 1) {
    return null;
  }

  return hierarchy[currentIndex + 1];
};

export const getPreviousTier = (currentTier: SubscriptionPlanType): SubscriptionPlanType | null => {
  const hierarchy = getTierHierarchy();
  const currentIndex = hierarchy.indexOf(currentTier);

  if (currentIndex <= 0) {
    return null;
  }

  return hierarchy[currentIndex - 1];
};

export const calculateUpgradePrice = (
  currentTier: SubscriptionPlanType,
  targetTier: SubscriptionPlanType,
  billingInterval: BillingInterval,
  daysRemainingInPeriod: number,
  totalDaysInPeriod: number,
): number => {
  const currentDef = getTierByType(currentTier);
  const targetDef = getTierByType(targetTier);

  if (!currentDef || !targetDef) return 0;

  const currentPrice = billingInterval === BillingInterval.YEARLY
    ? currentDef.yearlyPrice / 12
    : currentDef.monthlyPrice;

  const targetPrice = billingInterval === BillingInterval.YEARLY
    ? targetDef.yearlyPrice / 12
    : targetDef.monthlyPrice;

  const priceDifference = targetPrice - currentPrice;
  const prorationFactor = daysRemainingInPeriod / totalDaysInPeriod;

  return Math.max(0, priceDifference * prorationFactor);
};
