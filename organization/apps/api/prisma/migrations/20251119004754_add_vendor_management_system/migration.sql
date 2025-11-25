-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VendorApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'CHECK');

-- CreateTable
CREATE TABLE "vendor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT,
    "taxId" TEXT,
    "businessAddress" TEXT NOT NULL,
    "businessPhone" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "website" TEXT,
    "businessLicense" TEXT,
    "businessDocuments" TEXT[],
    "verificationDocuments" TEXT[],
    "bankName" TEXT,
    "accountNumber" TEXT,
    "routingNumber" TEXT,
    "paypalEmail" TEXT,
    "stripeAccountId" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "canSell" BOOLEAN NOT NULL DEFAULT false,
    "autoApproveProducts" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "description" TEXT,
    "socialMedia" JSONB,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "lastPayoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_applications" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "status" "VendorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "applicationData" JSONB NOT NULL,
    "documentsSubmitted" TEXT[],
    "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "businessInfoComplete" BOOLEAN NOT NULL DEFAULT false,
    "bankingInfoComplete" BOOLEAN NOT NULL DEFAULT false,
    "documentsComplete" BOOLEAN NOT NULL DEFAULT false,
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payouts" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PayoutMethod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalSales" DOUBLE PRECISION NOT NULL,
    "totalCommission" DOUBLE PRECISION NOT NULL,
    "platformFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "transactionId" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "orderIds" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_commission_rules" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "minCommission" DOUBLE PRECISION,
    "maxCommission" DOUBLE PRECISION,
    "categoryId" TEXT,
    "minOrderValue" DOUBLE PRECISION,
    "maxOrderValue" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_performance_metrics" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productsListed" INTEGER NOT NULL DEFAULT 0,
    "productsSold" INTEGER NOT NULL DEFAULT 0,
    "outOfStockProducts" INTEGER NOT NULL DEFAULT 0,
    "uniqueCustomers" INTEGER NOT NULL DEFAULT 0,
    "repeatCustomers" INTEGER NOT NULL DEFAULT 0,
    "customerRetention" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordersShipped" INTEGER NOT NULL DEFAULT 0,
    "ordersDelivered" INTEGER NOT NULL DEFAULT 0,
    "ordersCancelled" INTEGER NOT NULL DEFAULT 0,
    "ordersReturned" INTEGER NOT NULL DEFAULT 0,
    "averageShippingTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "positiveReviews" INTEGER NOT NULL DEFAULT 0,
    "negativeReviews" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_userId_key" ON "vendor_profiles"("userId");

-- CreateIndex
CREATE INDEX "vendor_profiles_userId_idx" ON "vendor_profiles"("userId");

-- CreateIndex
CREATE INDEX "vendor_profiles_status_idx" ON "vendor_profiles"("status");

-- CreateIndex
CREATE INDEX "vendor_profiles_isVerified_idx" ON "vendor_profiles"("isVerified");

-- CreateIndex
CREATE INDEX "vendor_profiles_businessName_idx" ON "vendor_profiles"("businessName");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_applications_vendorProfileId_key" ON "vendor_applications"("vendorProfileId");

-- CreateIndex
CREATE INDEX "vendor_applications_status_idx" ON "vendor_applications"("status");

-- CreateIndex
CREATE INDEX "vendor_applications_submittedAt_idx" ON "vendor_applications"("submittedAt");

-- CreateIndex
CREATE INDEX "vendor_payouts_vendorProfileId_idx" ON "vendor_payouts"("vendorProfileId");

-- CreateIndex
CREATE INDEX "vendor_payouts_status_idx" ON "vendor_payouts"("status");

-- CreateIndex
CREATE INDEX "vendor_payouts_periodStart_periodEnd_idx" ON "vendor_payouts"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "vendor_payouts_createdAt_idx" ON "vendor_payouts"("createdAt");

-- CreateIndex
CREATE INDEX "vendor_commission_rules_vendorProfileId_idx" ON "vendor_commission_rules"("vendorProfileId");

-- CreateIndex
CREATE INDEX "vendor_commission_rules_isActive_idx" ON "vendor_commission_rules"("isActive");

-- CreateIndex
CREATE INDEX "vendor_commission_rules_effectiveFrom_effectiveTo_idx" ON "vendor_commission_rules"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "vendor_performance_metrics_vendorProfileId_idx" ON "vendor_performance_metrics"("vendorProfileId");

-- CreateIndex
CREATE INDEX "vendor_performance_metrics_periodDate_idx" ON "vendor_performance_metrics"("periodDate");

-- CreateIndex
CREATE INDEX "vendor_performance_metrics_overallScore_idx" ON "vendor_performance_metrics"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_performance_metrics_vendorProfileId_period_periodDat_key" ON "vendor_performance_metrics"("vendorProfileId", "period", "periodDate");

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_commission_rules" ADD CONSTRAINT "vendor_commission_rules_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_performance_metrics" ADD CONSTRAINT "vendor_performance_metrics_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
