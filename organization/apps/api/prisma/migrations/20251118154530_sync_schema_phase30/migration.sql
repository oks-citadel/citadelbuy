-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('SPONSORED_PRODUCT', 'SEARCH', 'DISPLAY', 'CATEGORY');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'COMPLETED', 'OUT_OF_BUDGET');

-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('CUSTOMER_BASIC', 'CUSTOMER_PREMIUM', 'CUSTOMER_PRO', 'VENDOR_STARTER', 'VENDOR_PROFESSIONAL', 'VENDOR_ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'TRIAL');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BnplProvider" AS ENUM ('KLARNA', 'AFFIRM', 'AFTERPAY', 'SEZZLE');

-- CreateEnum
CREATE TYPE "BnplPaymentPlanStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "BnplInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'OVERDUE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UserActionType" AS ENUM ('VIEW', 'CLICK', 'ADD_TO_CART', 'PURCHASE', 'WISHLIST', 'SEARCH');

-- CreateEnum
CREATE TYPE "SearchSource" AS ENUM ('SEARCH_BAR', 'AUTOCOMPLETE', 'CATEGORY_FILTER', 'VOICE_SEARCH', 'VISUAL_SEARCH', 'BARCODE_SCAN');

-- CreateEnum
CREATE TYPE "AnalyticsPeriod" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('EARNED_PURCHASE', 'EARNED_REVIEW', 'EARNED_REFERRAL', 'EARNED_SIGNUP', 'EARNED_BIRTHDAY', 'EARNED_SOCIAL_SHARE', 'EARNED_PROMOTION', 'REDEEMED_DISCOUNT', 'REDEEMED_PRODUCT', 'EXPIRED', 'ADJUSTED_MANUAL', 'REVERSED_RETURN');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DISCOUNT_PERCENTAGE', 'DISCOUNT_FIXED', 'FREE_SHIPPING', 'EARLY_ACCESS', 'EXCLUSIVE_PRODUCT', 'PRIORITY_SUPPORT', 'BONUS_POINTS', 'FREE_PRODUCT');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'REWARDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('FLASH_SALE', 'DAILY_DEAL', 'BUNDLE_DEAL', 'BOGO', 'PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT', 'VOLUME_DISCOUNT', 'SEASONAL_SALE');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "GiftCardType" AS ENUM ('DIGITAL', 'PHYSICAL', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "StoreCreditType" AS ENUM ('REFUND', 'COMPENSATION', 'PROMOTIONAL', 'GIFT', 'LOYALTY');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'REDEMPTION', 'REFUND', 'ADJUSTMENT', 'EXPIRATION', 'CANCELLATION', 'TRANSFER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "actualDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "estimatedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "giftCardAmount" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "shippingMethod" TEXT,
ADD COLUMN     "statusHistory" JSONB,
ADD COLUMN     "storeCreditAmount" DOUBLE PRECISION,
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "helpfulCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "attributes" JSONB NOT NULL,
    "images" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "dailyBudget" DOUBLE PRECISION,
    "spentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT,
    "type" "AdType" NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "targetUrl" TEXT,
    "bidAmount" DOUBLE PRECISION NOT NULL,
    "dailyBudget" DOUBLE PRECISION,
    "spentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetCategories" TEXT[],
    "targetKeywords" TEXT[],
    "targetLocations" TEXT[],
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_keywords" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "bidAmount" DOUBLE PRECISION NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_impressions" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "placement" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_clicks" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "placement" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SubscriptionPlanType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "benefits" JSONB NOT NULL,
    "maxProducts" INTEGER,
    "maxAds" INTEGER,
    "commissionRate" DOUBLE PRECISION,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "attemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bnpl_payment_plans" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "BnplProvider" NOT NULL,
    "status" "BnplPaymentPlanStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numberOfInstallments" INTEGER NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "providerPlanId" TEXT,
    "providerMetadata" JSONB,
    "firstPaymentDate" TIMESTAMP(3) NOT NULL,
    "finalPaymentDate" TIMESTAMP(3) NOT NULL,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bnpl_payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bnpl_installments" (
    "id" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "BnplInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "providerPaymentId" TEXT,
    "paymentMethod" TEXT,
    "failureReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bnpl_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_behaviors" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT,
    "categoryId" TEXT,
    "actionType" "UserActionType" NOT NULL,
    "searchQuery" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recommendations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recommendedProductId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "resultsCount" INTEGER NOT NULL,
    "clickedItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "source" "SearchSource" NOT NULL DEFAULT 'SEARCH_BAR',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_suggestions" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_views" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "notifyOnNew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_analytics" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "period" "AnalyticsPeriod" NOT NULL DEFAULT 'DAILY',
    "date" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "activeProducts" INTEGER NOT NULL DEFAULT 0,
    "outOfStock" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "returningCustomers" INTEGER NOT NULL DEFAULT 0,
    "adSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adImpressions" INTEGER NOT NULL DEFAULT 0,
    "adClicks" INTEGER NOT NULL DEFAULT 0,
    "adConversions" INTEGER NOT NULL DEFAULT 0,
    "subscriptionRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analytics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "period" "AnalyticsPeriod" NOT NULL DEFAULT 'DAILY',
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "addToCart" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewToCart" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cartToCheckout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "checkoutToPurchase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageTimeOnPage" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockLevel" INTEGER NOT NULL DEFAULT 0,
    "stockouts" INTEGER NOT NULL DEFAULT 0,
    "newReviews" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "searchTraffic" INTEGER NOT NULL DEFAULT 0,
    "directTraffic" INTEGER NOT NULL DEFAULT 0,
    "recommendationTraffic" INTEGER NOT NULL DEFAULT 0,
    "adTraffic" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_analytics" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "period" "AnalyticsPeriod" NOT NULL DEFAULT 'DAILY',
    "date" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "activeProducts" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_analytics" (
    "id" TEXT NOT NULL,
    "period" "AnalyticsPeriod" NOT NULL DEFAULT 'DAILY',
    "date" TIMESTAMP(3) NOT NULL,
    "productRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subscriptionRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bnplRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "refundedOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRefunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traffic_analytics" (
    "id" TEXT NOT NULL,
    "period" "AnalyticsPeriod" NOT NULL DEFAULT 'DAILY',
    "date" TIMESTAMP(3) NOT NULL,
    "totalVisitors" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "newVisitors" INTEGER NOT NULL DEFAULT 0,
    "returningVisitors" INTEGER NOT NULL DEFAULT 0,
    "totalPageViews" INTEGER NOT NULL DEFAULT 0,
    "avgPagesPerVisit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSessionDuration" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directTraffic" INTEGER NOT NULL DEFAULT 0,
    "searchTraffic" INTEGER NOT NULL DEFAULT 0,
    "socialTraffic" INTEGER NOT NULL DEFAULT 0,
    "referralTraffic" INTEGER NOT NULL DEFAULT 0,
    "adTraffic" INTEGER NOT NULL DEFAULT 0,
    "mobileVisitors" INTEGER NOT NULL DEFAULT 0,
    "desktopVisitors" INTEGER NOT NULL DEFAULT 0,
    "tabletVisitors" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traffic_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isRTL" BOOLEAN NOT NULL DEFAULT false,
    "flag" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_translations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'common',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerDollar" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "minimumRedeemPoints" INTEGER NOT NULL DEFAULT 100,
    "pointsExpiryDays" INTEGER,
    "signupBonusPoints" INTEGER NOT NULL DEFAULT 100,
    "reviewRewardPoints" INTEGER NOT NULL DEFAULT 50,
    "birthdayRewardPoints" INTEGER NOT NULL DEFAULT 200,
    "referrerRewardPoints" INTEGER NOT NULL DEFAULT 500,
    "refereeRewardPoints" INTEGER NOT NULL DEFAULT 250,
    "referralMinPurchase" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_loyalty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "currentTier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
    "tierSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lifetimeSpending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tierSpending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "loyaltyId" TEXT NOT NULL,
    "type" "PointTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "orderId" TEXT,
    "productId" TEXT,
    "referralId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tier_benefits" (
    "id" TEXT NOT NULL,
    "tier" "LoyaltyTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minimumSpending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumPoints" INTEGER NOT NULL DEFAULT 0,
    "pointsMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "earlyAccessHours" INTEGER NOT NULL DEFAULT 0,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "exclusiveProducts" BOOLEAN NOT NULL DEFAULT false,
    "badgeIcon" TEXT,
    "badgeColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tier_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "discountPercentage" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "productId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "minimumTier" "LoyaltyTier",
    "minimumPurchase" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "loyaltyId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "refereeEmail" TEXT,
    "refereePhone" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "firstPurchaseId" TEXT,
    "firstPurchaseAmount" DOUBLE PRECISION,
    "referrerRewarded" BOOLEAN NOT NULL DEFAULT false,
    "referrerRewardedAt" TIMESTAMP(3),
    "referrerPoints" INTEGER,
    "refereeRewarded" BOOLEAN NOT NULL DEFAULT false,
    "refereeRewardedAt" TIMESTAMP(3),
    "refereePoints" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "DealType" NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "earlyAccessHours" INTEGER NOT NULL DEFAULT 0,
    "minimumTier" "LoyaltyTier",
    "discountPercentage" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "minimumPurchase" DOUBLE PRECISION,
    "totalStock" INTEGER,
    "remainingStock" INTEGER,
    "limitPerCustomer" INTEGER,
    "badge" TEXT,
    "badgeColor" TEXT,
    "featuredOrder" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "bannerImage" TEXT,
    "stackableWithCoupons" BOOLEAN NOT NULL DEFAULT false,
    "stackableWithLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_products" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "dealPrice" DOUBLE PRECISION,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "stockAllocated" INTEGER,
    "stockRemaining" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_purchases" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dealPrice" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "productId" TEXT,
    "notifyOnStart" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnPriceDrop" BOOLEAN NOT NULL DEFAULT true,
    "notifyBeforeEnd" BOOLEAN NOT NULL DEFAULT true,
    "hoursBeforeEnd" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_analytics" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "clickThroughRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialStock" INTEGER,
    "stockSold" INTEGER NOT NULL DEFAULT 0,
    "stockRemaining" INTEGER,
    "sellThroughRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peakHour" INTEGER,
    "averageTimeToConvert" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "GiftCardType" NOT NULL DEFAULT 'DIGITAL',
    "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "initialAmount" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "purchasedBy" TEXT,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "senderName" TEXT,
    "personalMessage" TEXT,
    "redeemedBy" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "designTemplate" TEXT,
    "customImage" TEXT,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "orderId" TEXT,
    "minimumPurchase" DOUBLE PRECISION,
    "allowedCategories" TEXT[],
    "excludedProducts" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_transactions" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "userId" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_credits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "expirationDate" TIMESTAMP(3),
    "minimumPurchase" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_credit_transactions" (
    "id" TEXT NOT NULL,
    "storeCreditId" TEXT NOT NULL,
    "type" "StoreCreditType" NOT NULL,
    "transactionType" "TransactionType" NOT NULL DEFAULT 'PURCHASE',
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "giftCardId" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OrderGiftCards" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "review_votes_reviewId_idx" ON "review_votes"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_userId_key" ON "review_votes"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "wishlist_userId_idx" ON "wishlist"("userId");

-- CreateIndex
CREATE INDEX "wishlist_productId_idx" ON "wishlist"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_userId_productId_key" ON "wishlist"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "ad_campaigns_vendorId_idx" ON "ad_campaigns"("vendorId");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns"("status");

-- CreateIndex
CREATE INDEX "ad_campaigns_startDate_endDate_idx" ON "ad_campaigns"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "advertisements_campaignId_idx" ON "advertisements"("campaignId");

-- CreateIndex
CREATE INDEX "advertisements_vendorId_idx" ON "advertisements"("vendorId");

-- CreateIndex
CREATE INDEX "advertisements_productId_idx" ON "advertisements"("productId");

-- CreateIndex
CREATE INDEX "advertisements_type_idx" ON "advertisements"("type");

-- CreateIndex
CREATE INDEX "advertisements_status_idx" ON "advertisements"("status");

-- CreateIndex
CREATE INDEX "advertisements_startDate_endDate_idx" ON "advertisements"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ad_keywords_adId_idx" ON "ad_keywords"("adId");

-- CreateIndex
CREATE INDEX "ad_keywords_keyword_idx" ON "ad_keywords"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "ad_keywords_adId_keyword_key" ON "ad_keywords"("adId", "keyword");

-- CreateIndex
CREATE INDEX "ad_impressions_adId_idx" ON "ad_impressions"("adId");

-- CreateIndex
CREATE INDEX "ad_impressions_userId_idx" ON "ad_impressions"("userId");

-- CreateIndex
CREATE INDEX "ad_impressions_timestamp_idx" ON "ad_impressions"("timestamp");

-- CreateIndex
CREATE INDEX "ad_clicks_adId_idx" ON "ad_clicks"("adId");

-- CreateIndex
CREATE INDEX "ad_clicks_userId_idx" ON "ad_clicks"("userId");

-- CreateIndex
CREATE INDEX "ad_clicks_timestamp_idx" ON "ad_clicks"("timestamp");

-- CreateIndex
CREATE INDEX "ad_clicks_converted_idx" ON "ad_clicks"("converted");

-- CreateIndex
CREATE INDEX "subscription_plans_type_idx" ON "subscription_plans"("type");

-- CreateIndex
CREATE INDEX "subscription_plans_isActive_idx" ON "subscription_plans"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_stripeInvoiceId_key" ON "subscription_invoices"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscriptionId_idx" ON "subscription_invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_invoices_status_idx" ON "subscription_invoices"("status");

-- CreateIndex
CREATE INDEX "subscription_invoices_stripeInvoiceId_idx" ON "subscription_invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "bnpl_payment_plans_orderId_key" ON "bnpl_payment_plans"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "bnpl_payment_plans_providerPlanId_key" ON "bnpl_payment_plans"("providerPlanId");

-- CreateIndex
CREATE INDEX "bnpl_payment_plans_orderId_idx" ON "bnpl_payment_plans"("orderId");

-- CreateIndex
CREATE INDEX "bnpl_payment_plans_userId_idx" ON "bnpl_payment_plans"("userId");

-- CreateIndex
CREATE INDEX "bnpl_payment_plans_provider_idx" ON "bnpl_payment_plans"("provider");

-- CreateIndex
CREATE INDEX "bnpl_payment_plans_status_idx" ON "bnpl_payment_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bnpl_installments_providerPaymentId_key" ON "bnpl_installments"("providerPaymentId");

-- CreateIndex
CREATE INDEX "bnpl_installments_paymentPlanId_idx" ON "bnpl_installments"("paymentPlanId");

-- CreateIndex
CREATE INDEX "bnpl_installments_status_idx" ON "bnpl_installments"("status");

-- CreateIndex
CREATE INDEX "bnpl_installments_dueDate_idx" ON "bnpl_installments"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "bnpl_installments_paymentPlanId_installmentNumber_key" ON "bnpl_installments"("paymentPlanId", "installmentNumber");

-- CreateIndex
CREATE INDEX "user_behaviors_userId_idx" ON "user_behaviors"("userId");

-- CreateIndex
CREATE INDEX "user_behaviors_sessionId_idx" ON "user_behaviors"("sessionId");

-- CreateIndex
CREATE INDEX "user_behaviors_productId_idx" ON "user_behaviors"("productId");

-- CreateIndex
CREATE INDEX "user_behaviors_categoryId_idx" ON "user_behaviors"("categoryId");

-- CreateIndex
CREATE INDEX "user_behaviors_actionType_idx" ON "user_behaviors"("actionType");

-- CreateIndex
CREATE INDEX "user_behaviors_createdAt_idx" ON "user_behaviors"("createdAt");

-- CreateIndex
CREATE INDEX "product_recommendations_productId_type_idx" ON "product_recommendations"("productId", "type");

-- CreateIndex
CREATE INDEX "product_recommendations_score_idx" ON "product_recommendations"("score");

-- CreateIndex
CREATE UNIQUE INDEX "product_recommendations_productId_recommendedProductId_type_key" ON "product_recommendations"("productId", "recommendedProductId", "type");

-- CreateIndex
CREATE INDEX "search_queries_query_idx" ON "search_queries"("query");

-- CreateIndex
CREATE INDEX "search_queries_userId_idx" ON "search_queries"("userId");

-- CreateIndex
CREATE INDEX "search_queries_sessionId_idx" ON "search_queries"("sessionId");

-- CreateIndex
CREATE INDEX "search_queries_createdAt_idx" ON "search_queries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "search_suggestions_keyword_key" ON "search_suggestions"("keyword");

-- CreateIndex
CREATE INDEX "search_suggestions_keyword_idx" ON "search_suggestions"("keyword");

-- CreateIndex
CREATE INDEX "search_suggestions_searchCount_idx" ON "search_suggestions"("searchCount");

-- CreateIndex
CREATE INDEX "product_views_productId_idx" ON "product_views"("productId");

-- CreateIndex
CREATE INDEX "product_views_userId_idx" ON "product_views"("userId");

-- CreateIndex
CREATE INDEX "product_views_sessionId_idx" ON "product_views"("sessionId");

-- CreateIndex
CREATE INDEX "product_views_createdAt_idx" ON "product_views"("createdAt");

-- CreateIndex
CREATE INDEX "saved_searches_userId_idx" ON "saved_searches"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_searches_userId_name_key" ON "saved_searches"("userId", "name");

-- CreateIndex
CREATE INDEX "vendor_analytics_vendorId_period_date_idx" ON "vendor_analytics"("vendorId", "period", "date");

-- CreateIndex
CREATE INDEX "vendor_analytics_date_idx" ON "vendor_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_analytics_vendorId_period_date_key" ON "vendor_analytics"("vendorId", "period", "date");

-- CreateIndex
CREATE INDEX "product_analytics_productId_period_date_idx" ON "product_analytics"("productId", "period", "date");

-- CreateIndex
CREATE INDEX "product_analytics_date_idx" ON "product_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "product_analytics_productId_period_date_key" ON "product_analytics"("productId", "period", "date");

-- CreateIndex
CREATE INDEX "category_analytics_categoryId_period_date_idx" ON "category_analytics"("categoryId", "period", "date");

-- CreateIndex
CREATE INDEX "category_analytics_date_idx" ON "category_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "category_analytics_categoryId_period_date_key" ON "category_analytics"("categoryId", "period", "date");

-- CreateIndex
CREATE INDEX "revenue_analytics_period_date_idx" ON "revenue_analytics"("period", "date");

-- CreateIndex
CREATE INDEX "revenue_analytics_date_idx" ON "revenue_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_analytics_period_date_key" ON "revenue_analytics"("period", "date");

-- CreateIndex
CREATE INDEX "traffic_analytics_period_date_idx" ON "traffic_analytics"("period", "date");

-- CreateIndex
CREATE INDEX "traffic_analytics_date_idx" ON "traffic_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "traffic_analytics_period_date_key" ON "traffic_analytics"("period", "date");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

-- CreateIndex
CREATE INDEX "languages_code_idx" ON "languages"("code");

-- CreateIndex
CREATE INDEX "languages_isDefault_isEnabled_idx" ON "languages"("isDefault", "isEnabled");

-- CreateIndex
CREATE INDEX "product_translations_productId_idx" ON "product_translations"("productId");

-- CreateIndex
CREATE INDEX "product_translations_languageCode_idx" ON "product_translations"("languageCode");

-- CreateIndex
CREATE INDEX "product_translations_slug_idx" ON "product_translations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_translations_productId_languageCode_key" ON "product_translations"("productId", "languageCode");

-- CreateIndex
CREATE INDEX "category_translations_categoryId_idx" ON "category_translations"("categoryId");

-- CreateIndex
CREATE INDEX "category_translations_languageCode_idx" ON "category_translations"("languageCode");

-- CreateIndex
CREATE INDEX "category_translations_slug_idx" ON "category_translations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_categoryId_languageCode_key" ON "category_translations"("categoryId", "languageCode");

-- CreateIndex
CREATE INDEX "translations_languageCode_namespace_idx" ON "translations"("languageCode", "namespace");

-- CreateIndex
CREATE INDEX "translations_key_idx" ON "translations"("key");

-- CreateIndex
CREATE UNIQUE INDEX "translations_languageCode_key_namespace_key" ON "translations"("languageCode", "key", "namespace");

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_userId_key" ON "customer_loyalty"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_referralCode_key" ON "customer_loyalty"("referralCode");

-- CreateIndex
CREATE INDEX "customer_loyalty_currentTier_idx" ON "customer_loyalty"("currentTier");

-- CreateIndex
CREATE INDEX "customer_loyalty_referralCode_idx" ON "customer_loyalty"("referralCode");

-- CreateIndex
CREATE INDEX "point_transactions_loyaltyId_createdAt_idx" ON "point_transactions"("loyaltyId", "createdAt");

-- CreateIndex
CREATE INDEX "point_transactions_orderId_idx" ON "point_transactions"("orderId");

-- CreateIndex
CREATE INDEX "point_transactions_expiresAt_idx" ON "point_transactions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tier_benefits_tier_key" ON "loyalty_tier_benefits"("tier");

-- CreateIndex
CREATE INDEX "rewards_type_idx" ON "rewards"("type");

-- CreateIndex
CREATE INDEX "rewards_isActive_idx" ON "rewards"("isActive");

-- CreateIndex
CREATE INDEX "reward_redemptions_loyaltyId_idx" ON "reward_redemptions"("loyaltyId");

-- CreateIndex
CREATE INDEX "reward_redemptions_rewardId_idx" ON "reward_redemptions"("rewardId");

-- CreateIndex
CREATE INDEX "reward_redemptions_orderId_idx" ON "reward_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_refereeId_idx" ON "referrals"("refereeId");

-- CreateIndex
CREATE INDEX "referrals_refereeEmail_idx" ON "referrals"("refereeEmail");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "deals_status_startTime_endTime_idx" ON "deals"("status", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "deals_type_idx" ON "deals"("type");

-- CreateIndex
CREATE INDEX "deals_isFeatured_featuredOrder_idx" ON "deals"("isFeatured", "featuredOrder");

-- CreateIndex
CREATE INDEX "deal_products_dealId_isActive_idx" ON "deal_products"("dealId", "isActive");

-- CreateIndex
CREATE INDEX "deal_products_productId_idx" ON "deal_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_products_dealId_productId_key" ON "deal_products"("dealId", "productId");

-- CreateIndex
CREATE INDEX "deal_purchases_dealId_idx" ON "deal_purchases"("dealId");

-- CreateIndex
CREATE INDEX "deal_purchases_userId_idx" ON "deal_purchases"("userId");

-- CreateIndex
CREATE INDEX "deal_purchases_orderId_idx" ON "deal_purchases"("orderId");

-- CreateIndex
CREATE INDEX "deal_notifications_userId_isActive_idx" ON "deal_notifications"("userId", "isActive");

-- CreateIndex
CREATE INDEX "deal_notifications_dealId_idx" ON "deal_notifications"("dealId");

-- CreateIndex
CREATE INDEX "deal_notifications_productId_idx" ON "deal_notifications"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_analytics_dealId_key" ON "deal_analytics"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- CreateIndex
CREATE INDEX "gift_cards_code_idx" ON "gift_cards"("code");

-- CreateIndex
CREATE INDEX "gift_cards_status_idx" ON "gift_cards"("status");

-- CreateIndex
CREATE INDEX "gift_cards_purchasedBy_idx" ON "gift_cards"("purchasedBy");

-- CreateIndex
CREATE INDEX "gift_cards_redeemedBy_idx" ON "gift_cards"("redeemedBy");

-- CreateIndex
CREATE INDEX "gift_cards_recipientEmail_idx" ON "gift_cards"("recipientEmail");

-- CreateIndex
CREATE INDEX "gift_cards_expirationDate_idx" ON "gift_cards"("expirationDate");

-- CreateIndex
CREATE INDEX "gift_card_transactions_giftCardId_idx" ON "gift_card_transactions"("giftCardId");

-- CreateIndex
CREATE INDEX "gift_card_transactions_orderId_idx" ON "gift_card_transactions"("orderId");

-- CreateIndex
CREATE INDEX "gift_card_transactions_userId_idx" ON "gift_card_transactions"("userId");

-- CreateIndex
CREATE INDEX "gift_card_transactions_type_idx" ON "gift_card_transactions"("type");

-- CreateIndex
CREATE INDEX "gift_card_transactions_createdAt_idx" ON "gift_card_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "store_credits_userId_key" ON "store_credits"("userId");

-- CreateIndex
CREATE INDEX "store_credits_userId_idx" ON "store_credits"("userId");

-- CreateIndex
CREATE INDEX "store_credit_transactions_storeCreditId_idx" ON "store_credit_transactions"("storeCreditId");

-- CreateIndex
CREATE INDEX "store_credit_transactions_orderId_idx" ON "store_credit_transactions"("orderId");

-- CreateIndex
CREATE INDEX "store_credit_transactions_type_idx" ON "store_credit_transactions"("type");

-- CreateIndex
CREATE INDEX "store_credit_transactions_createdAt_idx" ON "store_credit_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "store_credit_transactions_expiresAt_idx" ON "store_credit_transactions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "_OrderGiftCards_AB_unique" ON "_OrderGiftCards"("A", "B");

-- CreateIndex
CREATE INDEX "_OrderGiftCards_B_index" ON "_OrderGiftCards"("B");

-- CreateIndex
CREATE INDEX "orders_trackingNumber_idx" ON "orders"("trackingNumber");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_keywords" ADD CONSTRAINT "ad_keywords_adId_fkey" FOREIGN KEY ("adId") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_adId_fkey" FOREIGN KEY ("adId") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_adId_fkey" FOREIGN KEY ("adId") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bnpl_payment_plans" ADD CONSTRAINT "bnpl_payment_plans_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bnpl_payment_plans" ADD CONSTRAINT "bnpl_payment_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bnpl_installments" ADD CONSTRAINT "bnpl_installments_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "bnpl_payment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_analytics" ADD CONSTRAINT "vendor_analytics_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_analytics" ADD CONSTRAINT "category_analytics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "languages"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "languages"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "languages"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_loyaltyId_fkey" FOREIGN KEY ("loyaltyId") REFERENCES "customer_loyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_loyaltyId_fkey" FOREIGN KEY ("loyaltyId") REFERENCES "customer_loyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "customer_loyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "customer_loyalty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_purchases" ADD CONSTRAINT "deal_purchases_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_purchases" ADD CONSTRAINT "deal_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_purchases" ADD CONSTRAINT "deal_purchases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_notifications" ADD CONSTRAINT "deal_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_redeemedBy_fkey" FOREIGN KEY ("redeemedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_credits" ADD CONSTRAINT "store_credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_credit_transactions" ADD CONSTRAINT "store_credit_transactions_storeCreditId_fkey" FOREIGN KEY ("storeCreditId") REFERENCES "store_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_credit_transactions" ADD CONSTRAINT "store_credit_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderGiftCards" ADD CONSTRAINT "_OrderGiftCards_A_fkey" FOREIGN KEY ("A") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderGiftCards" ADD CONSTRAINT "_OrderGiftCards_B_fkey" FOREIGN KEY ("B") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
