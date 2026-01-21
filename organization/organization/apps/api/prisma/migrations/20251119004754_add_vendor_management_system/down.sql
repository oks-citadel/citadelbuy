-- Rollback migration: 20251119004754_add_vendor_management_system
-- This script reverses all changes made in migration.sql

-- Drop foreign keys
ALTER TABLE "vendor_performance_metrics" DROP CONSTRAINT IF EXISTS "vendor_performance_metrics_vendorProfileId_fkey";
ALTER TABLE "vendor_commission_rules" DROP CONSTRAINT IF EXISTS "vendor_commission_rules_vendorProfileId_fkey";
ALTER TABLE "vendor_payouts" DROP CONSTRAINT IF EXISTS "vendor_payouts_vendorProfileId_fkey";
ALTER TABLE "vendor_applications" DROP CONSTRAINT IF EXISTS "vendor_applications_vendorProfileId_fkey";
ALTER TABLE "vendor_profiles" DROP CONSTRAINT IF EXISTS "vendor_profiles_userId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "vendor_performance_metrics_vendorProfileId_period_periodDat_key";
DROP INDEX IF EXISTS "vendor_performance_metrics_overallScore_idx";
DROP INDEX IF EXISTS "vendor_performance_metrics_periodDate_idx";
DROP INDEX IF EXISTS "vendor_performance_metrics_vendorProfileId_idx";
DROP INDEX IF EXISTS "vendor_commission_rules_effectiveFrom_effectiveTo_idx";
DROP INDEX IF EXISTS "vendor_commission_rules_isActive_idx";
DROP INDEX IF EXISTS "vendor_commission_rules_vendorProfileId_idx";
DROP INDEX IF EXISTS "vendor_payouts_createdAt_idx";
DROP INDEX IF EXISTS "vendor_payouts_periodStart_periodEnd_idx";
DROP INDEX IF EXISTS "vendor_payouts_status_idx";
DROP INDEX IF EXISTS "vendor_payouts_vendorProfileId_idx";
DROP INDEX IF EXISTS "vendor_applications_submittedAt_idx";
DROP INDEX IF EXISTS "vendor_applications_status_idx";
DROP INDEX IF EXISTS "vendor_applications_vendorProfileId_key";
DROP INDEX IF EXISTS "vendor_profiles_businessName_idx";
DROP INDEX IF EXISTS "vendor_profiles_isVerified_idx";
DROP INDEX IF EXISTS "vendor_profiles_status_idx";
DROP INDEX IF EXISTS "vendor_profiles_userId_idx";
DROP INDEX IF EXISTS "vendor_profiles_userId_key";

-- Drop tables
DROP TABLE IF EXISTS "vendor_performance_metrics";
DROP TABLE IF EXISTS "vendor_commission_rules";
DROP TABLE IF EXISTS "vendor_payouts";
DROP TABLE IF EXISTS "vendor_applications";
DROP TABLE IF EXISTS "vendor_profiles";

-- Drop enums
DROP TYPE IF EXISTS "PayoutMethod";
DROP TYPE IF EXISTS "PayoutStatus";
DROP TYPE IF EXISTS "VendorApplicationStatus";
DROP TYPE IF EXISTS "VendorStatus";
