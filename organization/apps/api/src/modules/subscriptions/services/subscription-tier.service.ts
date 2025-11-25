/**
 * Subscription Tier Service
 *
 * Handles tier-specific validation, feature checks, and usage limits
 */

import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SubscriptionPlanType, SubscriptionStatus } from '@prisma/client';
import {
  VENDOR_SUBSCRIPTION_TIERS,
  getTierByType,
  hasFeature,
  getFeatureLimit,
  isTierHigherOrEqual,
  FeatureKey,
  SubscriptionFeatures,
} from '../constants';

// =============================================================================
// USAGE TRACKING INTERFACE
// =============================================================================

export interface VendorUsage {
  productCount: number;
  ordersThisMonth: number;
  adminUserCount: number;
  discountCodesThisMonth: number;
  featuredListingsThisMonth: number;
  apiCallsThisMonth: number;
}

export interface UsageLimitResult {
  isWithinLimit: boolean;
  current: number;
  limit: number | null; // null = unlimited
  limitType: string;
  message?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class SubscriptionTierService {
  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // TIER & SUBSCRIPTION RETRIEVAL
  // =============================================================================

  /**
   * Get vendor's current subscription with plan details
   */
  async getVendorSubscription(vendorId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: vendorId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
        plan: {
          type: {
            in: [
              SubscriptionPlanType.VENDOR_FREE,
              SubscriptionPlanType.VENDOR_SILVER,
              SubscriptionPlanType.VENDOR_GOLD,
              SubscriptionPlanType.VENDOR_PLATINUM,
              SubscriptionPlanType.VENDOR_DIAMOND,
              SubscriptionPlanType.VENDOR_ENTERPRISE,
              // Legacy types
              SubscriptionPlanType.VENDOR_STARTER,
              SubscriptionPlanType.VENDOR_PROFESSIONAL,
            ],
          },
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return subscription;
  }

  /**
   * Get vendor's subscription tier type (defaults to FREE if no subscription)
   */
  async getVendorTierType(vendorId: string): Promise<SubscriptionPlanType> {
    const subscription = await this.getVendorSubscription(vendorId);

    if (!subscription) {
      return SubscriptionPlanType.VENDOR_FREE;
    }

    // Map legacy types to new types
    if (subscription.plan.type === SubscriptionPlanType.VENDOR_STARTER) {
      return SubscriptionPlanType.VENDOR_FREE;
    }
    if (subscription.plan.type === SubscriptionPlanType.VENDOR_PROFESSIONAL) {
      return SubscriptionPlanType.VENDOR_GOLD;
    }

    return subscription.plan.type;
  }

  /**
   * Get full tier definition for a vendor
   */
  async getVendorTierDefinition(vendorId: string) {
    const tierType = await this.getVendorTierType(vendorId);
    return getTierByType(tierType);
  }

  // =============================================================================
  // FEATURE CHECKS
  // =============================================================================

  /**
   * Check if vendor has access to a specific feature
   */
  async hasFeatureAccess(vendorId: string, featureKey: FeatureKey): Promise<boolean> {
    const tierType = await this.getVendorTierType(vendorId);
    return hasFeature(tierType, featureKey);
  }

  /**
   * Require a feature - throws exception if not available
   */
  async requireFeature(vendorId: string, featureKey: FeatureKey, featureName?: string): Promise<void> {
    const hasAccess = await this.hasFeatureAccess(vendorId, featureKey);

    if (!hasAccess) {
      const tierType = await this.getVendorTierType(vendorId);
      const tier = getTierByType(tierType);

      throw new ForbiddenException({
        message: `${featureName || featureKey} is not available on your current plan (${tier?.name || 'Free'})`,
        code: 'FEATURE_NOT_AVAILABLE',
        feature: featureKey,
        currentTier: tier?.slug,
        upgradeRequired: true,
      });
    }
  }

  /**
   * Check if vendor has minimum tier level
   */
  async hasMinimumTier(vendorId: string, minimumTier: SubscriptionPlanType): Promise<boolean> {
    const currentTier = await this.getVendorTierType(vendorId);
    return isTierHigherOrEqual(currentTier, minimumTier);
  }

  /**
   * Require minimum tier - throws exception if not met
   */
  async requireMinimumTier(vendorId: string, minimumTier: SubscriptionPlanType): Promise<void> {
    const hasMinimum = await this.hasMinimumTier(vendorId, minimumTier);

    if (!hasMinimum) {
      const currentTier = await this.getVendorTierType(vendorId);
      const currentDef = getTierByType(currentTier);
      const requiredDef = getTierByType(minimumTier);

      throw new ForbiddenException({
        message: `This action requires ${requiredDef?.name || minimumTier} tier or higher. Your current tier: ${currentDef?.name || 'Free'}`,
        code: 'TIER_UPGRADE_REQUIRED',
        currentTier: currentDef?.slug,
        requiredTier: requiredDef?.slug,
        upgradeRequired: true,
      });
    }
  }

  // =============================================================================
  // USAGE TRACKING & LIMITS
  // =============================================================================

  /**
   * Get vendor's current usage metrics
   */
  async getVendorUsage(vendorId: string): Promise<VendorUsage> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get vendor's products first to find related orders
    const vendorProducts = await this.prisma.product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const productIds = vendorProducts.map((p) => p.id);

    const [
      productCount,
      ordersThisMonth,
      discountCodesThisMonth,
    ] = await Promise.all([
      // Product count
      this.prisma.product.count({
        where: { vendorId },
      }),

      // Orders this month (orders containing vendor's products)
      productIds.length > 0
        ? this.prisma.order.count({
            where: {
              items: {
                some: {
                  productId: { in: productIds },
                },
              },
              createdAt: { gte: startOfMonth },
            },
          })
        : Promise.resolve(0),

      // Discount codes created this month (global count since coupons aren't vendor-specific)
      // In a production system, you would add vendorId to the Coupon model
      this.prisma.coupon.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      productCount,
      ordersThisMonth,
      adminUserCount: 1, // Simplified - vendors have 1 admin by default
      discountCodesThisMonth,
      featuredListingsThisMonth: 0, // Placeholder
      apiCallsThisMonth: 0, // Placeholder
    };
  }

  /**
   * Check if vendor is within product listing limit
   */
  async checkProductLimit(vendorId: string): Promise<UsageLimitResult> {
    const tierType = await this.getVendorTierType(vendorId);
    const limit = getFeatureLimit(tierType, 'maxProductListings');
    const usage = await this.getVendorUsage(vendorId);

    if (limit === null) {
      return {
        isWithinLimit: true,
        current: usage.productCount,
        limit: null,
        limitType: 'products',
      };
    }

    const isWithinLimit = usage.productCount < limit;

    return {
      isWithinLimit,
      current: usage.productCount,
      limit,
      limitType: 'products',
      message: isWithinLimit
        ? undefined
        : `You've reached your product limit of ${limit}. Upgrade your plan to list more products.`,
    };
  }

  /**
   * Check if vendor is within monthly order limit
   */
  async checkOrderLimit(vendorId: string): Promise<UsageLimitResult> {
    const tierType = await this.getVendorTierType(vendorId);
    const limit = getFeatureLimit(tierType, 'maxOrdersPerMonth');
    const usage = await this.getVendorUsage(vendorId);

    if (limit === null) {
      return {
        isWithinLimit: true,
        current: usage.ordersThisMonth,
        limit: null,
        limitType: 'orders',
      };
    }

    const isWithinLimit = usage.ordersThisMonth < limit;

    return {
      isWithinLimit,
      current: usage.ordersThisMonth,
      limit,
      limitType: 'orders',
      message: isWithinLimit
        ? undefined
        : `You've reached your monthly order limit of ${limit}. Upgrade your plan to process more orders.`,
    };
  }

  /**
   * Check if vendor is within admin user limit
   */
  async checkAdminUserLimit(vendorId: string): Promise<UsageLimitResult> {
    const tierType = await this.getVendorTierType(vendorId);
    const limit = getFeatureLimit(tierType, 'maxAdminUsers');
    const usage = await this.getVendorUsage(vendorId);

    if (limit === null) {
      return {
        isWithinLimit: true,
        current: usage.adminUserCount,
        limit: null,
        limitType: 'adminUsers',
      };
    }

    const isWithinLimit = usage.adminUserCount < limit;

    return {
      isWithinLimit,
      current: usage.adminUserCount,
      limit,
      limitType: 'adminUsers',
      message: isWithinLimit
        ? undefined
        : `You've reached your admin user limit of ${limit}. Upgrade your plan to add more team members.`,
    };
  }

  /**
   * Check if vendor is within discount code limit
   */
  async checkDiscountCodeLimit(vendorId: string): Promise<UsageLimitResult> {
    const tierType = await this.getVendorTierType(vendorId);
    const limit = getFeatureLimit(tierType, 'maxDiscountCodesPerMonth');
    const usage = await this.getVendorUsage(vendorId);

    if (limit === null) {
      return {
        isWithinLimit: true,
        current: usage.discountCodesThisMonth,
        limit: null,
        limitType: 'discountCodes',
      };
    }

    const isWithinLimit = usage.discountCodesThisMonth < limit;

    return {
      isWithinLimit,
      current: usage.discountCodesThisMonth,
      limit,
      limitType: 'discountCodes',
      message: isWithinLimit
        ? undefined
        : `You've reached your monthly discount code limit of ${limit}. Upgrade your plan to create more.`,
    };
  }

  /**
   * Enforce product creation limit
   */
  async enforceProductLimit(vendorId: string): Promise<void> {
    const result = await this.checkProductLimit(vendorId);

    if (!result.isWithinLimit) {
      throw new ForbiddenException({
        message: result.message,
        code: 'PRODUCT_LIMIT_REACHED',
        current: result.current,
        limit: result.limit,
        upgradeRequired: true,
      });
    }
  }

  /**
   * Enforce order processing limit
   */
  async enforceOrderLimit(vendorId: string): Promise<void> {
    const result = await this.checkOrderLimit(vendorId);

    if (!result.isWithinLimit) {
      throw new ForbiddenException({
        message: result.message,
        code: 'ORDER_LIMIT_REACHED',
        current: result.current,
        limit: result.limit,
        upgradeRequired: true,
      });
    }
  }

  /**
   * Enforce discount code creation limit
   */
  async enforceDiscountCodeLimit(vendorId: string): Promise<void> {
    const result = await this.checkDiscountCodeLimit(vendorId);

    if (!result.isWithinLimit) {
      throw new ForbiddenException({
        message: result.message,
        code: 'DISCOUNT_CODE_LIMIT_REACHED',
        current: result.current,
        limit: result.limit,
        upgradeRequired: true,
      });
    }
  }

  // =============================================================================
  // TRANSACTION FEE CALCULATION
  // =============================================================================

  /**
   * Get vendor's transaction fee rate
   */
  async getTransactionFeeRate(vendorId: string): Promise<number> {
    const tier = await this.getVendorTierDefinition(vendorId);
    return tier?.transactionFee ?? 3.0; // Default to FREE tier rate
  }

  /**
   * Calculate transaction fee for an amount
   */
  async calculateTransactionFee(vendorId: string, amount: number): Promise<number> {
    const rate = await this.getTransactionFeeRate(vendorId);
    return Number((amount * (rate / 100)).toFixed(2));
  }

  // =============================================================================
  // SUMMARY & DASHBOARD
  // =============================================================================

  /**
   * Get comprehensive subscription summary for vendor dashboard
   */
  async getVendorSubscriptionSummary(vendorId: string) {
    const subscription = await this.getVendorSubscription(vendorId);
    const tierType = await this.getVendorTierType(vendorId);
    const tier = getTierByType(tierType);
    const usage = await this.getVendorUsage(vendorId);

    const [productLimit, orderLimit, discountLimit] = await Promise.all([
      this.checkProductLimit(vendorId),
      this.checkOrderLimit(vendorId),
      this.checkDiscountCodeLimit(vendorId),
    ]);

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEnd: subscription.trialEnd,
          }
        : null,
      tier: {
        type: tier?.type,
        slug: tier?.slug,
        name: tier?.name,
        monthlyPrice: tier?.monthlyPrice,
        yearlyPrice: tier?.yearlyPrice,
        transactionFee: tier?.transactionFee,
      },
      usage,
      limits: {
        products: productLimit,
        orders: orderLimit,
        discountCodes: discountLimit,
      },
      features: tier?.features,
      upgradeAvailable: tierType !== SubscriptionPlanType.VENDOR_ENTERPRISE,
    };
  }

  /**
   * Get available upgrade options for vendor
   */
  async getUpgradeOptions(vendorId: string) {
    const currentTierType = await this.getVendorTierType(vendorId);

    const availableTiers = VENDOR_SUBSCRIPTION_TIERS.filter((tier) => {
      // Can't upgrade to current or lower tier
      return isTierHigherOrEqual(tier.type, currentTierType) && tier.type !== currentTierType;
    });

    return availableTiers.map((tier) => ({
      type: tier.type,
      slug: tier.slug,
      name: tier.name,
      monthlyPrice: tier.monthlyPrice,
      yearlyPrice: tier.yearlyPrice,
      transactionFee: tier.transactionFee,
      isPopular: tier.isPopular,
      keyFeatures: this.getKeyFeaturesDifference(currentTierType, tier.type),
    }));
  }

  /**
   * Get key features difference between tiers (for upgrade UI)
   */
  private getKeyFeaturesDifference(
    currentTier: SubscriptionPlanType,
    targetTier: SubscriptionPlanType,
  ): string[] {
    const currentDef = getTierByType(currentTier);
    const targetDef = getTierByType(targetTier);

    if (!currentDef || !targetDef) return [];

    const differences: string[] = [];

    // Check key feature improvements
    const featureChecks: { key: keyof SubscriptionFeatures; label: string }[] = [
      { key: 'maxProductListings', label: 'product listings' },
      { key: 'maxOrdersPerMonth', label: 'orders per month' },
      { key: 'productVariants', label: 'Product variants' },
      { key: 'abandonedCartRecovery', label: 'Abandoned cart recovery' },
      { key: 'advancedAnalyticsDashboard', label: 'Advanced analytics' },
      { key: 'customerLoyaltyProgram', label: 'Loyalty program' },
      { key: 'apiAccess', label: 'API access' },
      { key: 'customDomain', label: 'Custom domain' },
      { key: 'dedicatedAccountManager', label: 'Dedicated account manager' },
    ];

    for (const check of featureChecks) {
      const currentValue = currentDef.features[check.key];
      const targetValue = targetDef.features[check.key];

      if (typeof currentValue === 'number' && typeof targetValue === 'number') {
        if (targetValue > currentValue) {
          differences.push(
            `${targetValue === -1 ? 'Unlimited' : targetValue.toLocaleString()} ${check.label}`,
          );
        }
      } else if (currentValue === null && targetValue !== null) {
        differences.push(`Unlimited ${check.label}`);
      } else if (!currentValue && targetValue) {
        differences.push(check.label);
      }

      if (differences.length >= 5) break; // Limit to top 5
    }

    return differences;
  }
}
