/**
 * Subscription Feature Guard
 *
 * Protects routes based on subscription tier features
 * Usage:
 *   @UseGuards(JwtAuthGuard, SubscriptionFeatureGuard)
 *   @RequiresFeature('productVariants')
 *   @RequiresTier(SubscriptionPlanType.VENDOR_GOLD)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionPlanType } from '@prisma/client';
import { SubscriptionTierService } from '../services/subscription-tier.service';
import { FeatureKey } from '../constants';

// =============================================================================
// DECORATORS
// =============================================================================

export const REQUIRED_FEATURE_KEY = 'requiredFeature';
export const REQUIRED_TIER_KEY = 'requiredTier';
export const REQUIRED_LIMIT_KEY = 'requiredLimit';

/**
 * Decorator to require a specific feature
 * @example @RequiresFeature('productVariants')
 */
export const RequiresFeature = (feature: FeatureKey) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);

/**
 * Decorator to require a minimum tier
 * @example @RequiresTier(SubscriptionPlanType.VENDOR_GOLD)
 */
export const RequiresTier = (tier: SubscriptionPlanType) =>
  SetMetadata(REQUIRED_TIER_KEY, tier);

/**
 * Decorator to check a specific limit before allowing action
 * @example @RequiresLimit('products') - will check product limit
 */
export const RequiresLimit = (limitType: 'products' | 'orders' | 'discountCodes' | 'adminUsers') =>
  SetMetadata(REQUIRED_LIMIT_KEY, limitType);

// =============================================================================
// GUARD IMPLEMENTATION
// =============================================================================

@Injectable()
export class SubscriptionFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionTierService: SubscriptionTierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get vendor ID - for vendors this is their user ID
    // For admin users managing a vendor, it would come from the request
    const vendorId = request.body?.vendorId || request.params?.vendorId || user.id;

    // Check required feature
    const requiredFeature = this.reflector.getAllAndOverride<FeatureKey>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredFeature) {
      await this.subscriptionTierService.requireFeature(
        vendorId,
        requiredFeature,
        this.getFeatureDisplayName(requiredFeature),
      );
    }

    // Check required tier
    const requiredTier = this.reflector.getAllAndOverride<SubscriptionPlanType>(
      REQUIRED_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredTier) {
      await this.subscriptionTierService.requireMinimumTier(vendorId, requiredTier);
    }

    // Check required limit
    const requiredLimit = this.reflector.getAllAndOverride<string>(
      REQUIRED_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredLimit) {
      await this.checkLimit(vendorId, requiredLimit);
    }

    return true;
  }

  private async checkLimit(vendorId: string, limitType: string): Promise<void> {
    switch (limitType) {
      case 'products':
        await this.subscriptionTierService.enforceProductLimit(vendorId);
        break;
      case 'orders':
        await this.subscriptionTierService.enforceOrderLimit(vendorId);
        break;
      case 'discountCodes':
        await this.subscriptionTierService.enforceDiscountCodeLimit(vendorId);
        break;
      default:
        break;
    }
  }

  private getFeatureDisplayName(feature: FeatureKey): string {
    const displayNames: Partial<Record<FeatureKey, string>> = {
      productVariants: 'Product Variants',
      bulkProductUpload: 'Bulk Product Upload',
      csvImport: 'CSV Import',
      apiProductManagement: 'API Product Management',
      automatedOrderProcessing: 'Automated Order Processing',
      customStoreUrl: 'Custom Store URL',
      customDomain: 'Custom Domain',
      whiteLabelStorefront: 'White-label Storefront',
      customerAnalytics: 'Customer Analytics',
      advancedAnalyticsDashboard: 'Advanced Analytics',
      customReportsBuilder: 'Custom Reports Builder',
      basicInventoryAlerts: 'Inventory Alerts',
      smartInventoryManagement: 'Smart Inventory Management',
      multiWarehouseSupport: 'Multi-Warehouse Support',
      couponScheduling: 'Coupon Scheduling',
      abandonedCartRecovery: 'Abandoned Cart Recovery',
      customerLoyaltyProgram: 'Customer Loyalty Program',
      emailMarketingIntegration: 'Email Marketing Integration',
      abTesting: 'A/B Testing',
      basicSeoTools: 'SEO Tools',
      advancedSeoTools: 'Advanced SEO Tools',
      socialMediaIntegration: 'Social Media Integration',
      multiCurrencySupport: 'Multi-Currency Support',
      wholesalePricing: 'Wholesale Pricing',
      aiPricingOptimization: 'AI Pricing Optimization',
      competitorPriceMonitoring: 'Competitor Price Monitoring',
      automatedRepricing: 'Automated Repricing',
      basicAiRecommendations: 'AI Recommendations',
      advancedAiRecommendations: 'Advanced AI Recommendations',
      personalAiBusinessAdvisor: 'AI Business Advisor',
      demandForecasting: 'Demand Forecasting',
      basicCustomerSegmentation: 'Customer Segmentation',
      advancedCustomerSegmentation: 'Advanced Customer Segmentation',
      prioritySearchPlacement: 'Priority Search Placement',
      apiAccess: 'API Access',
      customApiIntegrations: 'Custom API Integrations',
      dedicatedAccountManager: 'Dedicated Account Manager',
      advancedFraudProtection: 'Advanced Fraud Protection',
      returnManagementSystem: 'Return Management System',
    };

    return displayNames[feature] || feature;
  }
}

// =============================================================================
// SPECIALIZED GUARDS
// =============================================================================

/**
 * Guard specifically for product creation (checks product limit)
 */
@Injectable()
export class ProductCreationGuard implements CanActivate {
  constructor(private readonly subscriptionTierService: SubscriptionTierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const vendorId = request.user?.id;

    if (!vendorId) {
      throw new ForbiddenException('User not authenticated');
    }

    await this.subscriptionTierService.enforceProductLimit(vendorId);
    return true;
  }
}

/**
 * Guard specifically for discount code creation
 */
@Injectable()
export class DiscountCodeCreationGuard implements CanActivate {
  constructor(private readonly subscriptionTierService: SubscriptionTierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const vendorId = request.user?.id;

    if (!vendorId) {
      throw new ForbiddenException('User not authenticated');
    }

    await this.subscriptionTierService.enforceDiscountCodeLimit(vendorId);
    return true;
  }
}

/**
 * Guard that requires Gold tier or above
 */
@Injectable()
export class GoldTierGuard implements CanActivate {
  constructor(private readonly subscriptionTierService: SubscriptionTierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const vendorId = request.user?.id;

    if (!vendorId) {
      throw new ForbiddenException('User not authenticated');
    }

    await this.subscriptionTierService.requireMinimumTier(
      vendorId,
      SubscriptionPlanType.VENDOR_GOLD,
    );
    return true;
  }
}

/**
 * Guard that requires Platinum tier or above
 */
@Injectable()
export class PlatinumTierGuard implements CanActivate {
  constructor(private readonly subscriptionTierService: SubscriptionTierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const vendorId = request.user?.id;

    if (!vendorId) {
      throw new ForbiddenException('User not authenticated');
    }

    await this.subscriptionTierService.requireMinimumTier(
      vendorId,
      SubscriptionPlanType.VENDOR_PLATINUM,
    );
    return true;
  }
}

/**
 * Guard that requires Diamond tier or above
 */
@Injectable()
export class DiamondTierGuard implements CanActivate {
  constructor(private readonly subscriptionTierService: SubscriptionTierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const vendorId = request.user?.id;

    if (!vendorId) {
      throw new ForbiddenException('User not authenticated');
    }

    await this.subscriptionTierService.requireMinimumTier(
      vendorId,
      SubscriptionPlanType.VENDOR_DIAMOND,
    );
    return true;
  }
}
