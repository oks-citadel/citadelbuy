/**
 * In-App Purchase Product Configuration
 *
 * Configure your IAP products here.
 * Product IDs must match those configured in App Store Connect and Google Play Console.
 */

export interface IAPProduct {
  id: string;
  name: string;
  description: string;
  appleProductId: string;
  googleProductId: string;
  type: 'consumable' | 'non-consumable' | 'subscription';
}

export interface IAPSubscriptionProduct extends IAPProduct {
  type: 'subscription';
  interval: 'month' | 'year';
  trialPeriod?: {
    duration: number;
    unit: 'day' | 'week' | 'month';
  };
}

export interface IAPCreditPackage extends IAPProduct {
  type: 'consumable';
  credits: number;
  bonus?: number;
}

// ==================== Subscription Products ====================

export const SUBSCRIPTION_PRODUCTS: IAPSubscriptionProduct[] = [
  {
    id: 'broxiva_basic_monthly',
    name: 'Broxiva Basic - Monthly',
    description: 'Monthly subscription to Broxiva Basic',
    appleProductId: 'com.broxiva.subscription.basic.monthly',
    googleProductId: 'broxiva_basic_monthly',
    type: 'subscription',
    interval: 'month',
    trialPeriod: {
      duration: 7,
      unit: 'day',
    },
  },
  {
    id: 'broxiva_basic_yearly',
    name: 'Broxiva Basic - Yearly',
    description: 'Yearly subscription to Broxiva Basic (Save 20%)',
    appleProductId: 'com.broxiva.subscription.basic.yearly',
    googleProductId: 'broxiva_basic_yearly',
    type: 'subscription',
    interval: 'year',
    trialPeriod: {
      duration: 7,
      unit: 'day',
    },
  },
  {
    id: 'broxiva_premium_monthly',
    name: 'Broxiva Premium - Monthly',
    description: 'Monthly subscription to Broxiva Premium',
    appleProductId: 'com.broxiva.subscription.premium.monthly',
    googleProductId: 'broxiva_premium_monthly',
    type: 'subscription',
    interval: 'month',
    trialPeriod: {
      duration: 14,
      unit: 'day',
    },
  },
  {
    id: 'broxiva_premium_yearly',
    name: 'Broxiva Premium - Yearly',
    description: 'Yearly subscription to Broxiva Premium (Save 25%)',
    appleProductId: 'com.broxiva.subscription.premium.yearly',
    googleProductId: 'broxiva_premium_yearly',
    type: 'subscription',
    interval: 'year',
    trialPeriod: {
      duration: 14,
      unit: 'day',
    },
  },
];

// ==================== Credit Packages (Consumables) ====================

export const CREDIT_PACKAGES: IAPCreditPackage[] = [
  {
    id: 'credits_100',
    name: '100 Credits',
    description: '100 Broxiva credits',
    appleProductId: 'com.broxiva.credits.100',
    googleProductId: 'broxiva_credits_100',
    type: 'consumable',
    credits: 100,
  },
  {
    id: 'credits_500',
    name: '500 Credits',
    description: '500 Broxiva credits',
    appleProductId: 'com.broxiva.credits.500',
    googleProductId: 'broxiva_credits_500',
    type: 'consumable',
    credits: 500,
    bonus: 25, // 5% bonus
  },
  {
    id: 'credits_1000',
    name: '1000 Credits',
    description: '1000 Broxiva credits',
    appleProductId: 'com.broxiva.credits.1000',
    googleProductId: 'broxiva_credits_1000',
    type: 'consumable',
    credits: 1000,
    bonus: 100, // 10% bonus
  },
  {
    id: 'credits_5000',
    name: '5000 Credits',
    description: '5000 Broxiva credits',
    appleProductId: 'com.broxiva.credits.5000',
    googleProductId: 'broxiva_credits_5000',
    type: 'consumable',
    credits: 5000,
    bonus: 750, // 15% bonus
  },
];

// ==================== Helper Functions ====================

/**
 * Get all product IDs for the current platform
 */
export function getPlatformProductIds(platform: 'ios' | 'android'): string[] {
  const allProducts = [...SUBSCRIPTION_PRODUCTS, ...CREDIT_PACKAGES];
  return allProducts.map((product) =>
    platform === 'ios' ? product.appleProductId : product.googleProductId
  );
}

/**
 * Find a product by platform-specific product ID
 */
export function findProductById(productId: string): IAPProduct | undefined {
  const allProducts = [...SUBSCRIPTION_PRODUCTS, ...CREDIT_PACKAGES];
  return allProducts.find(
    (product) =>
      product.appleProductId === productId || product.googleProductId === productId
  );
}

/**
 * Get platform-specific product ID
 */
export function getPlatformProductId(
  product: IAPProduct,
  platform: 'ios' | 'android'
): string {
  return platform === 'ios' ? product.appleProductId : product.googleProductId;
}
