-- Migration: Add Multi-Tenant Global Marketplace Schema
-- Version: 20260127
-- Description: Adds support for multi-tenant domains, internationalization,
--              multi-currency, geographic rules, and FX rate tracking

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Domain Type Enum
CREATE TYPE "DomainType" AS ENUM ('PRIMARY', 'SUBDOMAIN', 'CUSTOM', 'VANITY');

-- Domain Status Enum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFYING', 'VERIFIED', 'FAILED', 'SUSPENDED', 'EXPIRED');

-- SSL Status Enum
CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'FAILED', 'RENEWING');

-- Translation Status Enum
CREATE TYPE "TranslationStatus" AS ENUM ('DRAFT', 'AUTO_TRANSLATED', 'VENDOR_APPROVED', 'PUBLISHED');

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Tenant Domains: Maps custom domains to tenant organizations
CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domainType" "DomainType" NOT NULL DEFAULT 'SUBDOMAIN',
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT,
    "cnameTarget" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "sslStatus" "SslStatus",
    "sslExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- Tenant Locales: Supported languages per tenant
CREATE TABLE "tenant_locales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_locales_pkey" PRIMARY KEY ("id")
);

-- Tenant Currencies: Supported currencies per tenant
CREATE TABLE "tenant_currencies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "symbol" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_currencies_pkey" PRIMARY KEY ("id")
);

-- Tenant Geo Rules: Country-specific settings per tenant
CREATE TABLE "tenant_geo_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "defaultCurrency" TEXT,
    "defaultLocale" TEXT,
    "shippingZone" TEXT,
    "taxRate" DECIMAL(5,4),
    "vatNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_geo_rules_pkey" PRIMARY KEY ("id")
);

-- FX Rates: Foreign exchange rate cache
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "inverseRate" DECIMAL(18,8),
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- Order FX Snapshots: FX rate at time of order
CREATE TABLE "order_fx_snapshots" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "originalAmount" DECIMAL(19,4) NOT NULL,
    "convertedAmount" DECIMAL(19,4) NOT NULL,
    "source" TEXT,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_fx_snapshots_pkey" PRIMARY KEY ("id")
);

-- User Preferences: User locale/currency preferences
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "country" TEXT,
    "language" TEXT,
    "currency" TEXT,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX "tenant_domains_host_key" ON "tenant_domains"("host");
CREATE UNIQUE INDEX "tenant_locales_tenantId_locale_key" ON "tenant_locales"("tenantId", "locale");
CREATE UNIQUE INDEX "tenant_currencies_tenantId_currency_key" ON "tenant_currencies"("tenantId", "currency");
CREATE UNIQUE INDEX "tenant_geo_rules_tenantId_countryCode_key" ON "tenant_geo_rules"("tenantId", "countryCode");
CREATE UNIQUE INDEX "fx_rates_baseCurrency_quoteCurrency_key" ON "fx_rates"("baseCurrency", "quoteCurrency");
CREATE UNIQUE INDEX "order_fx_snapshots_orderId_key" ON "order_fx_snapshots"("orderId");
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tenant Domains indexes
CREATE INDEX "tenant_domains_tenantId_idx" ON "tenant_domains"("tenantId");
CREATE INDEX "tenant_domains_status_idx" ON "tenant_domains"("status");
CREATE INDEX "tenant_domains_domainType_idx" ON "tenant_domains"("domainType");

-- Tenant Locales indexes
CREATE INDEX "tenant_locales_tenantId_idx" ON "tenant_locales"("tenantId");
CREATE INDEX "tenant_locales_isDefault_idx" ON "tenant_locales"("isDefault");

-- Tenant Currencies indexes
CREATE INDEX "tenant_currencies_tenantId_idx" ON "tenant_currencies"("tenantId");
CREATE INDEX "tenant_currencies_isDefault_idx" ON "tenant_currencies"("isDefault");

-- Tenant Geo Rules indexes
CREATE INDEX "tenant_geo_rules_tenantId_idx" ON "tenant_geo_rules"("tenantId");
CREATE INDEX "tenant_geo_rules_countryCode_idx" ON "tenant_geo_rules"("countryCode");
CREATE INDEX "tenant_geo_rules_isAllowed_idx" ON "tenant_geo_rules"("isAllowed");

-- FX Rates indexes
CREATE INDEX "fx_rates_baseCurrency_quoteCurrency_fetchedAt_idx" ON "fx_rates"("baseCurrency", "quoteCurrency", "fetchedAt");
CREATE INDEX "fx_rates_expiresAt_idx" ON "fx_rates"("expiresAt");

-- Order FX Snapshots indexes
CREATE INDEX "order_fx_snapshots_orderId_idx" ON "order_fx_snapshots"("orderId");
CREATE INDEX "order_fx_snapshots_snapshotAt_idx" ON "order_fx_snapshots"("snapshotAt");

-- User Preferences indexes
CREATE INDEX "user_preferences_country_idx" ON "user_preferences"("country");
CREATE INDEX "user_preferences_currency_idx" ON "user_preferences"("currency");

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

-- Add tenantId to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Add indexes for tenant-scoped product queries
CREATE INDEX IF NOT EXISTS "products_tenantId_idx" ON "products"("tenantId");
CREATE INDEX IF NOT EXISTS "products_tenantId_id_idx" ON "products"("tenantId", "id");
CREATE INDEX IF NOT EXISTS "products_tenantId_sku_idx" ON "products"("tenantId", "sku");

-- Enhance product_translations table
ALTER TABLE "product_translations"
    ADD COLUMN IF NOT EXISTS "status" "TranslationStatus" DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS "translatedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- Add index for translation status
CREATE INDEX IF NOT EXISTS "product_translations_status_idx" ON "product_translations"("status");

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Tenant Domains -> Organization
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant Locales -> Organization
ALTER TABLE "tenant_locales" ADD CONSTRAINT "tenant_locales_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant Currencies -> Organization
ALTER TABLE "tenant_currencies" ADD CONSTRAINT "tenant_currencies_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant Geo Rules -> Organization
ALTER TABLE "tenant_geo_rules" ADD CONSTRAINT "tenant_geo_rules_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order FX Snapshots -> Order
ALTER TABLE "order_fx_snapshots" ADD CONSTRAINT "order_fx_snapshots_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User Preferences -> User
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Products -> Organization (tenant)
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE "tenant_domains" IS 'Maps custom domains to tenant organizations for white-label storefronts';
COMMENT ON TABLE "tenant_locales" IS 'Supported locales/languages per tenant for i18n';
COMMENT ON TABLE "tenant_currencies" IS 'Supported currencies per tenant for multi-currency';
COMMENT ON TABLE "tenant_geo_rules" IS 'Country-specific rules including tax rates and shipping zones';
COMMENT ON TABLE "fx_rates" IS 'Foreign exchange rate cache with expiration';
COMMENT ON TABLE "order_fx_snapshots" IS 'Captures FX rate at order time for audit trail';
COMMENT ON TABLE "user_preferences" IS 'User-specific locale and currency preferences';

COMMENT ON COLUMN "fx_rates"."rate" IS 'Exchange rate with high precision (18,8) for accurate conversions';
COMMENT ON COLUMN "order_fx_snapshots"."originalAmount" IS 'Amount in minor units (cents) with (19,4) precision';
COMMENT ON COLUMN "tenant_geo_rules"."taxRate" IS 'Tax rate as decimal (e.g., 0.0750 = 7.5%)';
