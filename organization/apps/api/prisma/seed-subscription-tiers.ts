/**
 * Subscription Tier Seeding Script
 *
 * Seeds all vendor subscription tiers into the database
 *
 * Run: npx ts-node prisma/seed-subscription-tiers.ts
 * Or:  npm run db:seed:tiers
 */

import { PrismaClient, BillingInterval } from '@prisma/client';
import {
  VENDOR_SUBSCRIPTION_TIERS,
  SubscriptionTierDefinition,
} from '../src/modules/subscriptions/constants/subscription-tiers.constants';

const prisma = new PrismaClient();

async function seedSubscriptionTier(tier: SubscriptionTierDefinition): Promise<void> {
  const existingPlan = await prisma.subscriptionPlan.findFirst({
    where: {
      OR: [
        { slug: tier.slug },
        { type: tier.type },
      ],
    },
  });

  const planData = {
    name: tier.name,
    slug: tier.slug,
    description: tier.description,
    type: tier.type,
    price: tier.monthlyPrice,
    yearlyPrice: tier.yearlyPrice,
    billingInterval: BillingInterval.MONTHLY,
    trialDays: tier.trialDays,
    isActive: true,
    isPopular: tier.isPopular,
    displayOrder: tier.displayOrder,
    transactionFee: tier.transactionFee,
    maxProducts: tier.features.maxProductListings,
    maxOrders: tier.features.maxOrdersPerMonth,
    maxAdminUsers: tier.features.maxAdminUsers ?? 1,
    maxDiscountCodes: tier.features.maxDiscountCodesPerMonth,
    maxFeaturedListings: tier.features.featuredListingsPerMonth,
    supportType: tier.features.supportType,
    supportSLA: tier.features.supportResponseHours,
    features: tier.features as any,
    benefits: {
      // Legacy benefits format for backward compatibility
      freeShipping: false,
      discountPercent: 0,
      earlyAccess: tier.features.earlyFeatureAccess,
      prioritySupport: tier.features.supportType !== 'email',
      features: getFeatureList(tier),
    },
    commissionRate: tier.transactionFee,
    prioritySupport: tier.features.supportType !== 'email',
    removeBranding: !tier.features.citadelBuyBranding,
    customDomain: tier.features.customDomain,
    apiAccess: tier.features.apiAccess,
    apiCallsPerMonth: tier.features.apiCallsPerMonth,
  };

  if (existingPlan) {
    await prisma.subscriptionPlan.update({
      where: { id: existingPlan.id },
      data: planData,
    });
    console.log(`✓ Updated tier: ${tier.name} (${tier.slug})`);
  } else {
    await prisma.subscriptionPlan.create({
      data: planData,
    });
    console.log(`✓ Created tier: ${tier.name} (${tier.slug})`);
  }
}

function getFeatureList(tier: SubscriptionTierDefinition): string[] {
  const features: string[] = [];
  const f = tier.features;

  // Product features
  if (f.maxProductListings === null) {
    features.push('Unlimited product listings');
  } else if (f.maxProductListings) {
    features.push(`Up to ${f.maxProductListings} product listings`);
  }

  if (f.productVariants) features.push('Product variants support');
  if (f.bulkProductUpload) features.push('Bulk product upload');
  if (f.csvImport) features.push('CSV import');

  // Orders
  if (f.maxOrdersPerMonth === null) {
    features.push('Unlimited orders');
  } else if (f.maxOrdersPerMonth) {
    features.push(`Up to ${f.maxOrdersPerMonth.toLocaleString()} orders/month`);
  }

  if (f.automatedOrderProcessing) features.push('Automated order processing');

  // Branding
  if (!f.citadelBuyBranding) features.push('No CitadelBuy branding');
  if (f.customStoreUrl) features.push('Custom store URL');
  if (f.customDomain) features.push('Custom domain with SSL');
  if (f.whiteLabelStorefront) features.push('White-label storefront');

  // Analytics
  if (f.advancedAnalyticsDashboard) features.push('Advanced analytics dashboard');
  else if (f.customerAnalytics) features.push('Customer analytics');
  else if (f.basicAnalytics) features.push('Basic analytics');

  if (f.customReportsBuilder) features.push('Custom reports builder');
  if (f.premiumAnalyticsSuite) features.push('Premium analytics suite');

  // Inventory
  if (f.smartInventoryManagement) features.push('Smart inventory management');
  else if (f.basicInventoryAlerts) features.push('Inventory alerts');

  if (f.multiWarehouseSupport) features.push('Multi-warehouse support');

  if (f.shippingIntegration > 0) {
    features.push(`${f.shippingIntegration} shipping carrier integrations`);
  }

  // Marketing
  if (f.maxDiscountCodesPerMonth === null) {
    features.push('Unlimited discount codes');
  } else if (f.maxDiscountCodesPerMonth && f.maxDiscountCodesPerMonth > 0) {
    features.push(`${f.maxDiscountCodesPerMonth} discount codes/month`);
  }

  if (f.couponScheduling) features.push('Coupon scheduling');
  if (f.abandonedCartRecovery === 'advanced') features.push('Advanced abandoned cart recovery');
  else if (f.abandonedCartRecovery === 'basic') features.push('Abandoned cart recovery');

  if (f.customerLoyaltyProgram) features.push('Customer loyalty program');
  if (f.emailMarketingIntegration) features.push('Email marketing integration');
  if (f.abTesting) features.push('A/B testing');

  // SEO
  if (f.advancedSeoTools) features.push('Advanced SEO tools');
  else if (f.basicSeoTools) features.push('Basic SEO tools');

  if (f.socialMediaIntegration) features.push('Social media integration');

  // Support
  switch (f.supportType) {
    case 'dedicated':
      features.push('Dedicated account manager');
      features.push('Priority support (1hr response)');
      break;
    case 'priority_chat_phone':
      features.push('Priority live chat & phone support');
      break;
    case 'email_chat':
      features.push('Live chat support');
      break;
    default:
      features.push('Email support');
  }

  // Admin users
  if (f.maxAdminUsers === null) {
    features.push('Unlimited admin users');
  } else if (f.maxAdminUsers && f.maxAdminUsers > 1) {
    features.push(`${f.maxAdminUsers} admin users`);
  }

  // Currency & pricing
  if (f.multiCurrencySupport > 1) {
    features.push(`${f.multiCurrencySupport}+ currencies`);
  }
  if (f.wholesalePricing) features.push('Wholesale/B2B pricing');
  if (f.aiPricingOptimization) features.push('AI pricing optimization');
  if (f.competitorPriceMonitoring) features.push('Competitor price monitoring');
  if (f.automatedRepricing) features.push('Automated repricing');

  // AI features
  if (f.advancedAiRecommendations) features.push('Advanced AI recommendations');
  else if (f.basicAiRecommendations) features.push('AI product recommendations');

  if (f.personalAiBusinessAdvisor) features.push('Personal AI business advisor');
  if (f.demandForecasting === 'advanced') features.push('ML-powered demand forecasting');
  else if (f.demandForecasting === 'basic') features.push('Basic demand forecasting');

  // Segmentation
  if (f.advancedCustomerSegmentation) features.push('Advanced customer segmentation');
  else if (f.basicCustomerSegmentation) features.push('Customer segmentation');

  // Featured
  if (f.featuredListingsPerMonth > 0) {
    features.push(`${f.featuredListingsPerMonth} featured listings/month`);
  }
  if (f.prioritySearchPlacement) features.push('Priority search placement');
  if (f.topVendorsSection) features.push('Featured in Top Vendors');
  if (f.homepageSpotlight) features.push('Homepage spotlight');

  // API
  if (f.apiAccess) {
    if (f.apiCallsPerMonth === null) {
      features.push('Unlimited API access');
    } else {
      features.push(`API access (${f.apiCallsPerMonth.toLocaleString()} calls/month)`);
    }
  }
  if (f.customApiIntegrations) features.push('Custom API integrations');

  // Enterprise
  if (f.customFeatureDevelopment) features.push('Custom feature development');
  if (f.multiStoreManagement) features.push('Multi-store management');
  if (f.onPremiseDeployment) features.push('On-premise deployment option');
  if (f.dedicatedInfrastructure) features.push('Dedicated infrastructure');
  if (f.customSlaGuarantees) features.push('Custom SLA guarantees');
  if (f.roadmapInfluence) features.push('Roadmap influence');
  if (f.whiteGloveMigration) features.push('White-glove migration service');

  // Security
  if (f.advancedFraudProtection) features.push('Advanced fraud protection');

  // Returns
  if (f.returnManagementSystem) features.push('Return management system');

  // Badges
  if (f.vipVendorBadge) features.push('VIP vendor badge');

  // Early access
  if (f.betaFeatureAccess) features.push('Beta feature access');
  else if (f.earlyFeatureAccess) features.push('Early access to new features');

  return features;
}

async function main(): Promise<void> {
  console.log('🚀 Starting subscription tier seeding...\n');

  try {
    // Seed each tier
    for (const tier of VENDOR_SUBSCRIPTION_TIERS) {
      await seedSubscriptionTier(tier);
    }

    console.log('\n✅ Subscription tier seeding completed successfully!');

    // Print summary
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        type: {
          in: VENDOR_SUBSCRIPTION_TIERS.map((t) => t.type),
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    console.log('\n📊 Summary:');
    console.log('═'.repeat(60));
    console.log(`${'Tier'.padEnd(12)} ${'Price'.padEnd(15)} ${'Fee'.padEnd(8)} Products`);
    console.log('─'.repeat(60));

    for (const plan of plans) {
      const price = plan.price === 0 ? 'FREE' : `$${plan.price.toFixed(2)}/mo`;
      const fee = `${plan.transactionFee}%`;
      const products = plan.maxProducts === null ? 'Unlimited' : plan.maxProducts.toString();
      console.log(
        `${plan.name.padEnd(12)} ${price.padEnd(15)} ${fee.padEnd(8)} ${products}`,
      );
    }

    console.log('═'.repeat(60));
    console.log(`\nTotal tiers: ${plans.length}`);
  } catch (error) {
    console.error('❌ Error seeding subscription tiers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
