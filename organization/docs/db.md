# Broxiva Multi-Tenant Global Marketplace Database Schema

This document describes the database schema additions for the multi-tenant global marketplace functionality, including internationalization (i18n), multi-currency support, and tenant domain management.

## Table of Contents

1. [Overview](#overview)
2. [Schema Diagram](#schema-diagram)
3. [New Models](#new-models)
4. [Enums](#enums)
5. [Index Strategy](#index-strategy)
6. [Query Optimization](#query-optimization)
7. [Migration Procedures](#migration-procedures)
8. [Seed Data](#seed-data)

---

## Overview

The multi-tenant global marketplace schema extends the existing Broxiva platform to support:

- **Multi-tenancy**: Organizations can have their own storefronts with custom domains
- **Internationalization (i18n)**: Multiple locales/languages per tenant
- **Multi-currency**: Support for multiple currencies with real-time FX conversion
- **Geographic rules**: Country-specific settings for tax, shipping, and access control
- **User preferences**: Per-user locale and currency preferences

### Key Design Principles

1. **Tenant Isolation**: All tenant-specific data includes `tenantId` for logical separation
2. **High Precision for Money**: Using `Decimal(19, 4)` for monetary amounts (minor units)
3. **High Precision for FX**: Using `Decimal(18, 8)` for exchange rates
4. **Audit Trail**: FX snapshots captured at order time for financial accuracy
5. **Soft Deletes**: Cascade deletes configured appropriately for referential integrity

---

## Schema Diagram

```
Organization (Tenant)
    |
    +-- TenantDomain[]      (Custom domains/subdomains)
    |
    +-- TenantLocale[]      (Supported languages)
    |
    +-- TenantCurrency[]    (Supported currencies)
    |
    +-- TenantGeoRule[]     (Country-specific rules)
    |
    +-- Product[]           (Products with tenantId)
         |
         +-- ProductTranslation[]  (Localized content)

User
    |
    +-- UserPreference      (User's locale/currency preference)

Order
    |
    +-- OrderFxSnapshot     (FX rate at time of order)

FxRate[]                    (Global FX rate cache)
```

---

## New Models

### TenantDomain

Maps custom domains to tenant organizations for white-label storefronts.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| host | String (unique) | Domain host (e.g., "shop.acme.com") |
| tenantId | String | Foreign key to Organization |
| domainType | DomainType | Type of domain configuration |
| status | DomainStatus | Verification status |
| verificationToken | String? | DNS TXT verification token |
| cnameTarget | String? | CNAME target for custom domains |
| verifiedAt | DateTime? | When domain was verified |
| sslStatus | SslStatus? | SSL certificate status |
| sslExpiresAt | DateTime? | SSL expiration date |

**Indexes**: `tenantId`, `status`, `domainType`

### TenantLocale

Defines supported locales/languages for each tenant.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| tenantId | String | Foreign key to Organization |
| locale | String | BCP 47 code (e.g., "en-US", "fr-CA") |
| isDefault | Boolean | Default locale for tenant |
| isEnabled | Boolean | Whether locale is active |
| label | String? | Human-readable name |

**Unique Constraint**: `[tenantId, locale]`

### TenantCurrency

Defines supported currencies for each tenant.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| tenantId | String | Foreign key to Organization |
| currency | String | ISO 4217 code (e.g., "USD", "EUR") |
| isDefault | Boolean | Default currency for tenant |
| isEnabled | Boolean | Whether currency is active |
| symbol | String? | Currency symbol |
| displayName | String? | Human-readable name |

**Unique Constraint**: `[tenantId, currency]`

### TenantGeoRule

Defines geographic rules and restrictions per tenant.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| tenantId | String | Foreign key to Organization |
| countryCode | String | ISO 3166-1 alpha-2 code |
| countryName | String? | Human-readable country name |
| isAllowed | Boolean | Whether country is allowed |
| defaultCurrency | String? | Default currency for country |
| defaultLocale | String? | Default locale for country |
| shippingZone | String? | Shipping zone identifier |
| taxRate | Decimal(5,4)? | Tax rate (e.g., 0.0750 = 7.5%) |
| vatNumber | String? | VAT/GST number if applicable |

**Unique Constraint**: `[tenantId, countryCode]`

### FxRate

Caches foreign exchange rates from external sources.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| baseCurrency | String | Source currency (ISO 4217) |
| quoteCurrency | String | Target currency (ISO 4217) |
| rate | Decimal(18,8) | Exchange rate |
| inverseRate | Decimal(18,8)? | Pre-computed inverse rate |
| source | String | Rate source identifier |
| fetchedAt | DateTime | When rate was fetched |
| expiresAt | DateTime | When rate expires |
| metadata | Json? | Additional source data |

**Unique Constraint**: `[baseCurrency, quoteCurrency]`

### OrderFxSnapshot

Captures the FX rate at the time of order for audit trail.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orderId | String (unique) | Foreign key to Order |
| baseCurrency | String | Original transaction currency |
| quoteCurrency | String | Settlement/display currency |
| rate | Decimal(18,8) | Rate at time of order |
| originalAmount | Decimal(19,4) | Amount in base currency (minor) |
| convertedAmount | Decimal(19,4) | Amount in quote currency (minor) |
| source | String? | Rate source at snapshot time |
| snapshotAt | DateTime | Timestamp of snapshot |

### UserPreference

Stores user-specific locale and currency preferences.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String (unique) | Foreign key to User |
| country | String? | Preferred country (ISO 3166-1) |
| language | String? | Preferred locale (BCP 47) |
| currency | String? | Preferred currency (ISO 4217) |
| timezone | String? | Preferred timezone (IANA) |

---

## Enums

### DomainType
- `PRIMARY` - Main domain for tenant
- `SUBDOMAIN` - Platform subdomain (tenant.broxiva.com)
- `CUSTOM` - Custom domain owned by tenant
- `VANITY` - Short vanity domain

### DomainStatus
- `PENDING` - Domain added, not verified
- `VERIFYING` - Verification in progress
- `VERIFIED` - Domain verified and active
- `FAILED` - Verification failed
- `SUSPENDED` - Domain suspended
- `EXPIRED` - Verification expired

### SslStatus
- `PENDING` - SSL cert being provisioned
- `ACTIVE` - SSL cert active
- `EXPIRED` - SSL cert expired
- `FAILED` - SSL provisioning failed
- `RENEWING` - SSL cert being renewed

### TranslationStatus
- `DRAFT` - Translation in progress
- `AUTO_TRANSLATED` - Machine translated, needs review
- `VENDOR_APPROVED` - Vendor approved translation
- `PUBLISHED` - Translation is live

---

## Index Strategy

### Primary Access Patterns

| Query Pattern | Index | Notes |
|---------------|-------|-------|
| Domain lookup by host | `TenantDomain.host` (unique) | Primary domain resolution |
| Tenant domains list | `TenantDomain.tenantId` | List all tenant domains |
| Active domains | `TenantDomain.status` | Filter by status |
| Tenant locales | `TenantLocale.tenantId` | List tenant languages |
| Default locale | `TenantLocale.isDefault` | Find default |
| Tenant currencies | `TenantCurrency.tenantId` | List tenant currencies |
| Geo rules by country | `TenantGeoRule.countryCode` | Country lookup |
| FX rate lookup | `FxRate.[baseCurrency, quoteCurrency]` (unique) | Rate conversion |
| Expired FX rates | `FxRate.expiresAt` | Rate refresh job |
| Products by tenant | `Product.tenantId` | Tenant product list |
| Products by SKU | `Product.[tenantId, sku]` | Composite for tenant SKU |
| Translation status | `ProductTranslation.status` | Filter by status |

### Composite Indexes

The following composite indexes optimize common queries:

```sql
-- Product queries within tenant
CREATE INDEX idx_product_tenant_id ON products(tenant_id, id);
CREATE INDEX idx_product_tenant_sku ON products(tenant_id, sku);

-- FX rate lookup with freshness
CREATE INDEX idx_fx_rate_lookup ON fx_rates(base_currency, quote_currency, fetched_at);
```

---

## Query Optimization

### Domain Resolution (Hot Path)

```typescript
// Optimized: Uses unique index on host
const domain = await prisma.tenantDomain.findUnique({
  where: { host: req.hostname },
  select: {
    tenantId: true,
    status: true,
    tenant: {
      select: { id: true, slug: true, settings: true }
    }
  }
});
```

### FX Rate Conversion

```typescript
// Optimized: Uses composite unique constraint
const rate = await prisma.fxRate.findUnique({
  where: {
    baseCurrency_quoteCurrency: {
      baseCurrency: 'USD',
      quoteCurrency: 'EUR'
    }
  }
});

// Check expiration
if (rate && rate.expiresAt > new Date()) {
  return rate.rate;
}
// Fallback: Refresh rate from external source
```

### Tenant Configuration Loading

```typescript
// Load all tenant config in single query
const tenantConfig = await prisma.organization.findUnique({
  where: { id: tenantId },
  include: {
    tenantLocales: { where: { isEnabled: true } },
    tenantCurrencies: { where: { isEnabled: true } },
    tenantGeoRules: { where: { isAllowed: true } },
  }
});
```

### User Preference Resolution

```typescript
// Fallback chain: User Pref -> Geo Rule -> Tenant Default -> Platform Default
async function resolveUserLocale(userId: string, countryCode: string, tenantId: string) {
  // 1. Check user preference
  const userPref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { language: true }
  });
  if (userPref?.language) return userPref.language;

  // 2. Check geo rule for country
  const geoRule = await prisma.tenantGeoRule.findUnique({
    where: { tenantId_countryCode: { tenantId, countryCode } },
    select: { defaultLocale: true }
  });
  if (geoRule?.defaultLocale) return geoRule.defaultLocale;

  // 3. Check tenant default
  const defaultLocale = await prisma.tenantLocale.findFirst({
    where: { tenantId, isDefault: true },
    select: { locale: true }
  });
  if (defaultLocale) return defaultLocale.locale;

  // 4. Platform default
  return 'en-US';
}
```

---

## Migration Procedures

### Running Migrations

```bash
# Development: Create and apply migration
cd apps/api
npx prisma migrate dev --name add_multi_tenant_global_marketplace

# Production: Apply pending migrations
npx prisma migrate deploy

# Reset database (DANGER: destroys data)
npx prisma migrate reset
```

### Migration Best Practices

1. **Always backup before migrating production**
2. **Test migrations on staging first**
3. **Use transactions for data migrations**
4. **Monitor migration duration for large tables**

### Rollback Procedure

Prisma does not auto-generate rollback scripts. For critical rollbacks:

```sql
-- Manual rollback example (adjust as needed)
DROP TABLE IF EXISTS tenant_domains;
DROP TABLE IF EXISTS tenant_locales;
DROP TABLE IF EXISTS tenant_currencies;
DROP TABLE IF EXISTS tenant_geo_rules;
DROP TABLE IF EXISTS fx_rates;
DROP TABLE IF EXISTS order_fx_snapshots;
DROP TABLE IF EXISTS user_preferences;

-- Remove columns from existing tables
ALTER TABLE products DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE product_translations DROP COLUMN IF EXISTS status;
ALTER TABLE product_translations DROP COLUMN IF EXISTS translated_by;
ALTER TABLE product_translations DROP COLUMN IF EXISTS published_at;

-- Drop enums
DROP TYPE IF EXISTS "DomainType";
DROP TYPE IF EXISTS "DomainStatus";
DROP TYPE IF EXISTS "SslStatus";
DROP TYPE IF EXISTS "TranslationStatus";
```

---

## Seed Data

### Running Seeds

```bash
# Run main seed (includes marketplace)
cd apps/api
npx prisma db seed

# Run marketplace seed only
npx ts-node prisma/seed-marketplace.ts
```

### Seed Data Includes

1. **FX Rates**: 12 currency pairs from USD
2. **Tenant Domains**: Subdomain + custom domain per org
3. **Tenant Locales**: 5 common locales per tenant
4. **Tenant Currencies**: 6 major currencies per tenant
5. **Geo Rules**: 14 countries with tax rates and shipping zones
6. **User Preferences**: Sample preferences for test users

### Adding Custom Seed Data

```typescript
import { seedTenantConfiguration } from './seed-marketplace';

// Add tenant config for a new organization
await seedTenantConfiguration(organizationId, 'my-org-slug');
```

---

## Performance Considerations

### High-Traffic Queries

1. **Domain Resolution**: Cache in Redis/memory with short TTL
2. **FX Rates**: Cache with TTL matching `expiresAt`
3. **Tenant Config**: Cache on startup, invalidate on changes

### Scaling Recommendations

1. **Read Replicas**: Route read queries to replicas
2. **Connection Pooling**: Use PgBouncer for connection management
3. **Partitioning**: Consider partitioning `order_fx_snapshots` by date for historical data

### Monitoring Queries

```sql
-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
WHERE query LIKE '%tenant%' OR query LIKE '%fx_rate%'
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename IN ('tenant_domains', 'tenant_locales', 'fx_rates')
ORDER BY idx_scan DESC;
```

---

## Related Documentation

- [Multi-Tenant Architecture](./architecture.md)
- [Internationalization Guide](./i18n.md)
- [Currency Conversion Service](./currency-service.md)
- [Domain Configuration Guide](./domain-setup.md)
