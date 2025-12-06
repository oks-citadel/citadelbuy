# CitadelBuy Database Schema Changes Documentation

## Overview

This document provides a comprehensive breakdown of all schema changes introduced by the 7 pending database migrations. Each migration is analyzed for its impact, breaking changes, and data transformation requirements.

---

## Table of Contents

1. [Migration 1: Password Reset Table](#migration-1-password-reset-table)
2. [Migration 2: Phase 30 Schema Sync](#migration-2-phase-30-schema-sync)
3. [Migration 3: Vendor Management System](#migration-3-vendor-management-system)
4. [Migration 4: Organization Roles & Permissions](#migration-4-organization-roles--permissions)
5. [Migration 5: Performance Indexes](#migration-5-performance-indexes)
6. [Migration 6: Privacy & Consent Management](#migration-6-privacy--consent-management)
7. [Migration 7: Organization Module](#migration-7-organization-module)
8. [Summary of Breaking Changes](#summary-of-breaking-changes)
9. [Data Transformation Guide](#data-transformation-guide)

---

## Migration 1: Password Reset Table

**Migration Name:** `20251117022438_add_password_reset_table`

**Date:** November 17, 2025

**Breaking Changes:** None

### New Tables

#### password_resets

Stores password reset tokens and their expiration status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique identifier |
| email | TEXT | NOT NULL | User email address |
| token | TEXT | NOT NULL, UNIQUE | Reset token |
| expiresAt | TIMESTAMP | NOT NULL | Token expiration time |
| used | BOOLEAN | DEFAULT false | Whether token was used |
| createdAt | TIMESTAMP | DEFAULT NOW | Creation timestamp |

**Indexes:**
- `password_resets_token_key` (UNIQUE on token)
- `password_resets_email_idx` (on email)
- `password_resets_token_idx` (on token)

### New ENUM Types

#### UserRole
- CUSTOMER
- VENDOR
- ADMIN

#### OrderStatus
- PENDING
- PROCESSING
- SHIPPED
- DELIVERED
- CANCELLED

### Initial Schema Tables

The migration also creates the core schema if not exists:

1. **users** - User accounts
2. **categories** - Product categories
3. **products** - Product catalog
4. **orders** - Order records
5. **order_items** - Order line items
6. **reviews** - Product reviews

### Impact Assessment

- **Application Changes Required:** Low
  - Add password reset functionality
  - Implement token validation logic

- **Data Migration Required:** No

- **Rollback Complexity:** Low
  - Simple DROP TABLE

---

## Migration 2: Phase 30 Schema Sync

**Migration Name:** `20251118154530_sync_schema_phase30`

**Date:** November 18, 2025

**Breaking Changes:** YES (Major)

This is the largest migration, adding 50+ tables and extensive functionality.

### Modified Existing Tables

#### orders (Columns Added)

| Column | Type | Description |
|--------|------|-------------|
| actualDeliveryDate | TIMESTAMP | When order was delivered |
| carrier | TEXT | Shipping carrier name |
| estimatedDeliveryDate | TIMESTAMP | Expected delivery date |
| giftCardAmount | DOUBLE PRECISION | Gift card payment amount |
| notes | TEXT | Order notes |
| shippingMethod | TEXT | Shipping method used |
| statusHistory | JSONB | Status change history |
| storeCreditAmount | DOUBLE PRECISION | Store credit used |
| trackingNumber | TEXT | Shipment tracking number |

**Index Added:**
- `orders_trackingNumber_idx`

#### reviews (Columns Added)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| helpfulCount | INTEGER | 0 | Helpful votes count |
| isVerifiedPurchase | BOOLEAN | false | Verified buyer flag |
| status | ReviewStatus | APPROVED | Review moderation status |

**Index Added:**
- `reviews_status_idx`

### New ENUM Types (17 total)

1. **ReviewStatus**: PENDING, APPROVED, REJECTED
2. **CampaignStatus**: DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
3. **AdType**: SPONSORED_PRODUCT, SEARCH, DISPLAY, CATEGORY
4. **AdStatus**: DRAFT, PENDING_REVIEW, ACTIVE, PAUSED, REJECTED, COMPLETED, OUT_OF_BUDGET
5. **SubscriptionPlanType**: CUSTOMER_BASIC, CUSTOMER_PREMIUM, CUSTOMER_PRO, VENDOR_STARTER, VENDOR_PROFESSIONAL, VENDOR_ENTERPRISE
6. **SubscriptionStatus**: ACTIVE, CANCELLED, EXPIRED, PAST_DUE, TRIAL
7. **BillingInterval**: MONTHLY, QUARTERLY, YEARLY
8. **BnplProvider**: KLARNA, AFFIRM, AFTERPAY, SEZZLE
9. **BnplPaymentPlanStatus**: PENDING, ACTIVE, COMPLETED, CANCELLED, DEFAULTED
10. **BnplInstallmentStatus**: PENDING, PAID, FAILED, OVERDUE, REFUNDED
11. **UserActionType**: VIEW, CLICK, ADD_TO_CART, PURCHASE, WISHLIST, SEARCH
12. **SearchSource**: SEARCH_BAR, AUTOCOMPLETE, CATEGORY_FILTER, VOICE_SEARCH, VISUAL_SEARCH, BARCODE_SCAN
13. **AnalyticsPeriod**: HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY
14. **LoyaltyTier**: BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
15. **PointTransactionType**: Multiple earning/redemption types
16. **RewardType**: Various reward types
17. **ReferralStatus**: PENDING, COMPLETED, REWARDED, EXPIRED, CANCELLED
18. **DealType**: Multiple deal types
19. **DealStatus**: SCHEDULED, ACTIVE, ENDED, CANCELLED, PAUSED
20. **GiftCardStatus**: ACTIVE, REDEEMED, EXPIRED, CANCELLED, SUSPENDED
21. **GiftCardType**: DIGITAL, PHYSICAL, PROMOTIONAL
22. **StoreCreditType**: REFUND, COMPENSATION, PROMOTIONAL, GIFT, LOYALTY
23. **TransactionType**: PURCHASE, REDEMPTION, REFUND, ADJUSTMENT, EXPIRATION, CANCELLATION, TRANSFER

### New Tables (53 total)

#### Product Management (3 tables)

1. **review_votes** - Track helpful/unhelpful votes on reviews
2. **wishlist** - User product wishlists
3. **product_variants** - Product variations (size, color, etc.)

#### Advertising System (5 tables)

4. **ad_campaigns** - Advertising campaigns
5. **advertisements** - Individual ads
6. **ad_keywords** - Keyword targeting
7. **ad_impressions** - Ad view tracking
8. **ad_clicks** - Ad click tracking

#### Subscription Management (3 tables)

9. **subscription_plans** - Available subscription tiers
10. **subscriptions** - User subscriptions
11. **subscription_invoices** - Subscription billing

#### Buy Now Pay Later (2 tables)

12. **bnpl_payment_plans** - Payment plan records
13. **bnpl_installments** - Individual installment payments

#### User Behavior & Analytics (6 tables)

14. **user_behaviors** - Track user actions
15. **product_recommendations** - AI-generated recommendations
16. **search_queries** - Search history
17. **search_suggestions** - Autocomplete suggestions
18. **product_views** - Product view tracking
19. **saved_searches** - User saved searches

#### Business Analytics (5 tables)

20. **vendor_analytics** - Vendor performance metrics
21. **product_analytics** - Product performance
22. **category_analytics** - Category statistics
23. **revenue_analytics** - Revenue tracking
24. **traffic_analytics** - Traffic metrics

#### Internationalization (4 tables)

25. **languages** - Supported languages
26. **product_translations** - Product i18n
27. **category_translations** - Category i18n
28. **translations** - General translations

#### Loyalty Program (6 tables)

29. **loyalty_programs** - Program configuration
30. **customer_loyalty** - User loyalty accounts
31. **point_transactions** - Points earning/spending
32. **loyalty_tier_benefits** - Tier benefits definition
33. **rewards** - Available rewards
34. **reward_redemptions** - Reward claims

#### Referral System (1 table)

35. **referrals** - Referral tracking

#### Deals & Promotions (4 tables)

36. **deals** - Deal/promotion records
37. **deal_products** - Products in deals
38. **deal_purchases** - Deal purchase tracking
39. **deal_notifications** - Deal alerts

#### Deal Analytics (1 table)

40. **deal_analytics** - Deal performance metrics

#### Gift Cards & Store Credit (4 tables)

41. **gift_cards** - Gift card records
42. **gift_card_transactions** - Gift card usage
43. **store_credits** - User store credit accounts
44. **store_credit_transactions** - Store credit history

### Total Schema Impact

- **New Tables:** 43 tables
- **Modified Tables:** 2 tables (orders, reviews)
- **New Indexes:** 200+ indexes
- **New ENUM Types:** 23 types
- **New Foreign Keys:** 80+ relationships

### Breaking Changes

1. **orders table structure changed** - Existing queries may need updates
2. **reviews table structure changed** - Review moderation logic required
3. **Massive new functionality** - Application code needs extensive updates

### Application Updates Required

**HIGH PRIORITY:**
- Update order model to handle new shipping fields
- Implement review moderation workflow
- Add subscription management UI
- Integrate advertising platform
- Implement loyalty program

**MEDIUM PRIORITY:**
- Add analytics dashboards
- Implement gift card system
- Add i18n support
- Create deal management UI

**LOW PRIORITY:**
- BNPL provider integration
- Advanced search features
- Recommendation engine

### Data Transformation

**No immediate data migration required** - all new columns are nullable or have defaults.

**Post-Migration Tasks:**
1. Populate default loyalty tiers
2. Create default subscription plans
3. Set up initial languages (English, etc.)
4. Initialize analytics tables

---

## Migration 3: Vendor Management System

**Migration Name:** `20251119004754_add_vendor_management_system`

**Date:** November 19, 2025

**Breaking Changes:** None

### New ENUM Types

1. **VendorStatus**: PENDING_VERIFICATION, ACTIVE, SUSPENDED, REJECTED, INACTIVE
2. **VendorApplicationStatus**: PENDING, UNDER_REVIEW, APPROVED, REJECTED
3. **PayoutStatus**: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
4. **PayoutMethod**: BANK_TRANSFER, PAYPAL, STRIPE, CHECK

### New Tables (5 tables)

#### vendor_profiles

Comprehensive vendor profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| userId | TEXT | FOREIGN KEY to users, UNIQUE |
| businessName | TEXT | Business name |
| businessType | TEXT | Business type |
| taxId | TEXT | Tax ID number |
| businessAddress | TEXT | Business address |
| businessPhone | TEXT | Business phone |
| businessEmail | TEXT | Business email |
| website | TEXT | Website URL |
| businessLicense | TEXT | License number |
| businessDocuments | TEXT[] | Document URLs |
| verificationDocuments | TEXT[] | Verification docs |
| bankName | TEXT | Bank name |
| accountNumber | TEXT | Account number |
| routingNumber | TEXT | Routing number |
| paypalEmail | TEXT | PayPal email |
| stripeAccountId | TEXT | Stripe account ID |
| status | VendorStatus | Vendor status |
| commissionRate | DOUBLE PRECISION | Commission rate (default 15%) |
| isVerified | BOOLEAN | Verification status |
| canSell | BOOLEAN | Selling permission |
| autoApproveProducts | BOOLEAN | Auto-approve products |
| logoUrl | TEXT | Logo URL |
| bannerUrl | TEXT | Banner URL |
| description | TEXT | Vendor description |
| socialMedia | JSONB | Social media links |
| totalSales | DOUBLE PRECISION | Total sales amount |
| totalOrders | INTEGER | Total orders |
| averageRating | DOUBLE PRECISION | Average rating |
| totalProducts | INTEGER | Product count |
| totalRevenue | DOUBLE PRECISION | Total revenue |
| totalCommission | DOUBLE PRECISION | Commission paid |
| verifiedAt | TIMESTAMP | Verification date |
| lastPayoutAt | TIMESTAMP | Last payout date |
| createdAt | TIMESTAMP | Creation date |
| updatedAt | TIMESTAMP | Last update |

**Indexes:**
- `vendor_profiles_userId_key` (UNIQUE)
- `vendor_profiles_userId_idx`
- `vendor_profiles_status_idx`
- `vendor_profiles_isVerified_idx`
- `vendor_profiles_businessName_idx`

#### vendor_applications

Vendor application and approval tracking.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| vendorProfileId | TEXT | FK to vendor_profiles, UNIQUE |
| status | VendorApplicationStatus | Application status |
| applicationData | JSONB | Application form data |
| documentsSubmitted | TEXT[] | Submitted documents |
| documentsVerified | BOOLEAN | Documents verified |
| reviewedBy | TEXT | Reviewer user ID |
| reviewedAt | TIMESTAMP | Review date |
| reviewNotes | TEXT | Review notes |
| rejectionReason | TEXT | Rejection reason |
| businessInfoComplete | BOOLEAN | Business info complete |
| bankingInfoComplete | BOOLEAN | Banking info complete |
| documentsComplete | BOOLEAN | Documents complete |
| agreementSigned | BOOLEAN | Agreement signed |

#### vendor_payouts

Vendor payout records.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| vendorProfileId | TEXT | FK to vendor_profiles |
| amount | DOUBLE PRECISION | Payout amount |
| currency | TEXT | Currency code |
| status | PayoutStatus | Payout status |
| method | PayoutMethod | Payout method |
| periodStart | TIMESTAMP | Payout period start |
| periodEnd | TIMESTAMP | Payout period end |
| totalSales | DOUBLE PRECISION | Period sales |
| totalCommission | DOUBLE PRECISION | Commission amount |
| platformFees | DOUBLE PRECISION | Platform fees |
| adjustments | DOUBLE PRECISION | Adjustments |
| netAmount | DOUBLE PRECISION | Net payout |
| transactionId | TEXT | Payment transaction ID |
| orderIds | TEXT[] | Included order IDs |

#### vendor_commission_rules

Custom commission rules per vendor.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| vendorProfileId | TEXT | FK to vendor_profiles |
| name | TEXT | Rule name |
| commissionRate | DOUBLE PRECISION | Commission percentage |
| categoryId | TEXT | Applies to category |
| minOrderValue | DOUBLE PRECISION | Minimum order value |
| maxOrderValue | DOUBLE PRECISION | Maximum order value |
| priority | INTEGER | Rule priority |
| effectiveFrom | TIMESTAMP | Start date |
| effectiveTo | TIMESTAMP | End date |

#### vendor_performance_metrics

Performance tracking per vendor.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| vendorProfileId | TEXT | FK to vendor_profiles |
| period | TEXT | Period type (daily, weekly, monthly) |
| periodDate | TIMESTAMP | Period date |
| totalSales | DOUBLE PRECISION | Sales amount |
| totalOrders | INTEGER | Order count |
| totalRevenue | DOUBLE PRECISION | Revenue |
| totalCommission | DOUBLE PRECISION | Commission |
| averageOrderValue | DOUBLE PRECISION | AOV |
| productsListed | INTEGER | Products count |
| productsSold | INTEGER | Sold products |
| outOfStockProducts | INTEGER | Out of stock |
| uniqueCustomers | INTEGER | Unique buyers |
| repeatCustomers | INTEGER | Repeat buyers |
| customerRetention | DOUBLE PRECISION | Retention rate |
| ordersShipped | INTEGER | Shipped orders |
| ordersDelivered | INTEGER | Delivered orders |
| ordersCancelled | INTEGER | Cancelled orders |
| ordersReturned | INTEGER | Returned orders |
| averageShippingTime | DOUBLE PRECISION | Avg shipping time |
| averageRating | DOUBLE PRECISION | Average rating |
| totalReviews | INTEGER | Review count |
| positiveReviews | INTEGER | Positive reviews |
| negativeReviews | INTEGER | Negative reviews |
| overallScore | DOUBLE PRECISION | Overall score |

**Unique Constraint:** `vendor_performance_metrics_vendorProfileId_period_periodDate_key`

### Impact Assessment

- **Application Changes Required:** High
  - Vendor onboarding workflow
  - Application review UI
  - Payout management system
  - Performance dashboard

- **Data Migration Required:**
  - Existing vendors need to be migrated to vendor_profiles
  - Historical performance data calculation

### Required Application Features

1. **Vendor Registration**
   - Multi-step application form
   - Document upload
   - Banking information collection

2. **Admin Review**
   - Application review dashboard
   - Document verification
   - Approval/rejection workflow

3. **Payout Management**
   - Automated payout calculation
   - Payout scheduling
   - Payment processing integration

4. **Performance Tracking**
   - Real-time metrics
   - Historical trends
   - Comparative analytics

---

## Migration 4: Organization Roles & Permissions

**Migration Name:** `20251202_add_owner_relation_and_role_permissions`

**Date:** December 2, 2025

**Breaking Changes:** Minimal

### New Tables

#### role_permissions

Links roles to permissions (many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique identifier |
| roleId | TEXT | FK to organization_roles | Role ID |
| permissionId | TEXT | FK to permissions | Permission ID |
| createdAt | TIMESTAMP | DEFAULT NOW | Creation date |

**Indexes:**
- `role_permissions_roleId_idx`
- `role_permissions_permissionId_idx`

**Unique Constraint:**
- `role_permissions_roleId_permissionId_key` (UNIQUE on roleId, permissionId)

### Modified Tables

#### organizations

**New Foreign Key:**
- `organizations_ownerId_fkey` - Links organization to owner user

### Impact Assessment

- **Application Changes Required:** Low
  - Update RBAC logic to use role_permissions junction table
  - Add owner assignment during organization creation

- **Data Migration Required:**
  - Set ownerId for existing organizations
  - Create default role-permission mappings

### Post-Migration Data Setup

```sql
-- Set owners for existing organizations
UPDATE organizations
SET "ownerId" = (
  SELECT "userId"
  FROM organization_members
  WHERE "organizationId" = organizations.id
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "ownerId" IS NULL;

-- Create default role permissions
-- (See Migration 7 for detailed permission setup)
```

---

## Migration 5: Performance Indexes

**Migration Name:** `add_performance_indexes`

**Date:** December 2025

**Breaking Changes:** None

This migration creates 100+ indexes to optimize query performance across all tables.

### Index Categories

#### 1. Core Entities (Products, Orders, Users)

**products table:**
- `idx_products_status` - Filter by status
- `idx_products_vendor_status_created` - Vendor's active products
- `idx_products_category_status_created` - Category browsing
- `idx_products_price` - Price range filtering
- `idx_products_stock` - Stock availability
- `idx_products_sku_active` - SKU lookups
- `idx_products_tags_gin` - Full-text search on tags (GIN index)

**orders table:**
- `idx_orders_user_status_created` - User's order history
- `idx_orders_status_created` - Admin order management
- `idx_orders_guest_email` - Guest order lookups
- `idx_orders_tracking_carrier` - Tracking queries
- `idx_orders_created_status` - Date range queries
- `idx_orders_payment_intent` - Payment lookups

**order_items table:**
- `idx_order_items_order_product` - Order details
- `idx_order_items_product_created` - Product sales analytics

**users table:**
- `idx_users_role_active` - Filter by role
- `idx_users_email_domain` - B2B analytics

#### 2. Reviews

- `idx_reviews_product_status_created` - Product reviews
- `idx_reviews_user_created` - User review history
- `idx_reviews_verified_status` - Verified purchases
- `idx_reviews_product_rating` - Rating distribution

#### 3. Categories

- `idx_categories_parent_status_order` - Category hierarchy
- `idx_categories_featured_active` - Featured categories

#### 4. Shopping Cart

- `idx_carts_user_active` - User carts
- `idx_carts_session_active` - Session-based carts
- `idx_carts_abandoned_activity` - Abandoned cart recovery
- `idx_carts_expires_at` - Cart expiration cleanup
- `idx_carts_share_token` - Shared cart lookups
- `idx_cart_items_cart_product` - Cart item queries
- `idx_cart_items_variant` - Variant lookups
- `idx_cart_items_inventory_reserved` - Inventory reservations

#### 5. Inventory Management

- `idx_inventory_status_product` - Inventory status
- `idx_inventory_warehouse_status` - Warehouse inventory
- `idx_inventory_low_stock` - Low stock alerts
- `idx_stock_movements_product_created` - Stock history
- `idx_stock_movements_warehouse_type` - Warehouse movements
- `idx_stock_transfers_status_created` - Transfer tracking
- `idx_stock_transfers_warehouses` - Warehouse transfers

#### 6. Vendor Management

- `idx_vendor_profiles_status_verified` - Vendor filtering
- `idx_vendor_profiles_business_name` - Name search
- `idx_vendor_payouts_vendor_status` - Payout queries
- `idx_vendor_payouts_period` - Period-based queries
- `idx_vendor_performance_period` - Performance metrics

#### 7. Advertising System

- `idx_ad_campaigns_vendor_status` - Campaign management
- `idx_ad_campaigns_dates_status` - Active campaigns
- `idx_advertisements_campaign_status` - Ad management
- `idx_advertisements_product_dates` - Product ads
- `idx_ad_impressions_ad_timestamp` - Impression tracking
- `idx_ad_clicks_ad_timestamp` - Click tracking
- `idx_ad_clicks_converted` - Conversion tracking

#### 8. Loyalty & Rewards

- `idx_customer_loyalty_tier` - Tier filtering
- `idx_customer_loyalty_referral` - Referral lookups
- `idx_point_transactions_loyalty_type` - Transaction history
- `idx_point_transactions_expiry` - Expiring points
- `idx_referrals_status_created` - Referral tracking
- `idx_referrals_email` - Email lookups

#### 9. Deals & Promotions

- `idx_deals_status_dates` - Active deals
- `idx_deals_featured_order` - Featured deals
- `idx_deals_type_status` - Deal types
- `idx_deal_products_deal_active` - Deal products
- `idx_coupons_code_active` - Coupon lookups
- `idx_coupons_dates_active` - Active coupons
- `idx_coupons_type_active` - Coupon types
- `idx_coupon_usages_coupon_date` - Usage tracking
- `idx_coupon_usages_user_date` - User usage history

#### 10. Subscriptions

- `idx_subscriptions_user_status` - User subscriptions
- `idx_subscriptions_plan_status` - Plan subscriptions
- `idx_subscriptions_period_end` - Renewal tracking
- `idx_subscription_invoices_status_date` - Invoice queries

#### 11. Search & Analytics

- `idx_search_queries_query_created` - Search history
- `idx_search_queries_user_session` - User searches
- `idx_search_queries_converted` - Search conversions
- `idx_product_views_product_created` - Product views
- `idx_product_views_user_created` - User views
- `idx_vendor_analytics_vendor_period` - Vendor metrics
- `idx_product_analytics_product_period` - Product metrics
- `idx_category_analytics_category_period` - Category metrics

#### 12. Organization Module

- `idx_organizations_status_created` - Organization listing
- `idx_organizations_owner` - Owner lookups
- `idx_org_members_org_status` - Member management
- `idx_org_members_role` - Role-based queries
- `idx_org_audit_logs_org_created` - Audit trail
- `idx_org_audit_logs_user_action` - User actions
- `idx_kyc_applications_org_status` - KYC tracking

#### 13. Security & Audit

- `idx_audit_logs_user_activity` - User activity
- `idx_audit_logs_suspicious` - Security alerts
- `idx_audit_logs_ip_created` - IP tracking
- `idx_api_keys_user_active` - API key management
- `idx_api_keys_expiry` - Key expiration
- `idx_user_sessions_user_active` - Session management
- `idx_user_sessions_expiry` - Session cleanup
- `idx_login_attempts_email_created` - Rate limiting
- `idx_login_attempts_ip_created` - IP-based limiting

#### 14. Support System

- `idx_support_tickets_user_status` - User tickets
- `idx_support_tickets_assigned_status` - Assigned tickets
- `idx_support_tickets_priority_status` - Priority sorting
- `idx_support_tickets_sla_breach` - SLA monitoring
- `idx_ticket_messages_ticket_created` - Message thread
- `idx_live_chat_sessions_status_started` - Chat sessions
- `idx_live_chat_sessions_assigned` - Assigned chats

### Index Types

1. **B-tree Indexes** (Default) - Most indexes
2. **GIN Indexes** - For array and JSONB columns
3. **Partial Indexes** - For filtered queries (WHERE clauses)
4. **Covering Indexes** - Include additional columns for index-only scans

### Performance Impact

**Benefits:**
- 50-90% query performance improvement for common operations
- Reduced table scans
- Faster JOIN operations
- Improved sorting and filtering

**Costs:**
- 10-15% increase in storage (estimated 2-3GB for large databases)
- Slight write overhead (5-10% slower INSERTs/UPDATEs)
- Increased index maintenance time

### Post-Migration Maintenance

```sql
-- Update statistics
ANALYZE;

-- Monitor index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes (after 1 week)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Migration 6: Privacy & Consent Management

**Migration Name:** `add_privacy_consent`

**Date:** December 2025

**Breaking Changes:** Potential (Table name case sensitivity)

### New Tables

#### ConsentLog

Tracks user consent history for GDPR/CCPA compliance.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | TEXT | - | PRIMARY KEY |
| userId | TEXT | - | FK to users |
| dataProcessing | BOOLEAN | true | Data processing consent |
| marketing | BOOLEAN | false | Marketing consent |
| analytics | BOOLEAN | false | Analytics consent |
| thirdPartySharing | BOOLEAN | false | Third-party sharing consent |
| ipAddress | TEXT | - | IP address at consent |
| userAgent | TEXT | - | User agent string |
| version | TEXT | '1.0' | Consent version |
| createdAt | TIMESTAMP | NOW | Consent timestamp |

**Indexes:**
- `ConsentLog_userId_idx`
- `ConsentLog_createdAt_idx`

#### DataDeletionRequest

Tracks GDPR "right to be forgotten" requests.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | TEXT | - | PRIMARY KEY |
| userId | TEXT | - | FK to users |
| strategy | TEXT | - | Deletion strategy (hard/soft) |
| reason | TEXT | - | User reason |
| status | TEXT | 'PENDING' | Request status |
| scheduledDate | TIMESTAMP | - | Scheduled deletion date |
| completedAt | TIMESTAMP | - | Completion timestamp |
| createdAt | TIMESTAMP | NOW | Request timestamp |
| updatedAt | TIMESTAMP | NOW | Last update |

**Indexes:**
- `DataDeletionRequest_userId_idx`
- `DataDeletionRequest_status_idx`

#### DataExportRequest

Tracks GDPR data portability requests.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | TEXT | - | PRIMARY KEY |
| userId | TEXT | - | FK to users |
| format | TEXT | - | Export format (JSON/CSV) |
| status | TEXT | 'PENDING' | Request status |
| downloadUrl | TEXT | - | Temporary download URL |
| expiresAt | TIMESTAMP | - | URL expiration |
| completedAt | TIMESTAMP | - | Completion timestamp |
| createdAt | TIMESTAMP | NOW | Request timestamp |
| updatedAt | TIMESTAMP | NOW | Last update |

**Indexes:**
- `DataExportRequest_userId_idx`
- `DataExportRequest_status_idx`

#### AgreedTerms

Tracks which terms/privacy policy version user agreed to.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| userId | TEXT | FK to users |
| termsVersion | TEXT | Terms of service version |
| privacyPolicyVersion | TEXT | Privacy policy version |
| cookiePolicyVersion | TEXT | Cookie policy version |
| ipAddress | TEXT | IP at agreement |
| userAgent | TEXT | User agent |
| agreedAt | TIMESTAMP | Agreement timestamp |

**Index:**
- `AgreedTerms_userId_idx`

### Modified Tables

#### User (or users)

**WARNING:** Migration references "User" but schema uses "users". May need adjustment.

**New Columns:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| deletedAt | TIMESTAMP | NULL | Soft delete timestamp |
| processingRestricted | BOOLEAN | false | GDPR processing restriction |

### Breaking Changes

**CRITICAL:** Table name case sensitivity issue

The migration references `"User"` but the actual table is likely `"users"`. This will cause the migration to fail.

**Fix Required Before Migration:**

```bash
# Edit migration file
sed -i 's/"User"/"users"/g' \
  apps/api/prisma/migrations/add_privacy_consent/migration.sql
```

### Application Updates Required

1. **Consent Management**
   - Cookie consent banner
   - Consent preference center
   - Consent version tracking

2. **Data Export**
   - Export request UI
   - Data aggregation logic
   - Temporary file generation
   - Secure download links

3. **Data Deletion**
   - Deletion request form
   - Admin review workflow
   - Automated deletion process
   - Compliance reporting

4. **Terms Tracking**
   - Version management system
   - Agreement modal on updates
   - Historical agreement records

### Compliance Requirements

**GDPR:**
- Right to access (DataExportRequest)
- Right to erasure (DataDeletionRequest)
- Right to restrict processing (processingRestricted flag)
- Consent management (ConsentLog)
- Data retention policies

**CCPA:**
- Right to know (DataExportRequest)
- Right to delete (DataDeletionRequest)
- Right to opt-out (thirdPartySharing consent)

---

## Migration 7: Organization Module

**Migration Name:** `organization_module`

**Date:** December 2025

**Breaking Changes:** YES (Major multi-tenant architecture)

This migration adds comprehensive multi-tenant organization management.

### New ENUM Types

1. **OrganizationType**: INDIVIDUAL, SMALL_BUSINESS, ENTERPRISE, MARKETPLACE
2. **OrganizationStatus**: PENDING_VERIFICATION, ACTIVE, SUSPENDED, TERMINATED
3. **MemberStatus**: INVITED, ACTIVE, SUSPENDED, REMOVED
4. **KycStatus**: NOT_STARTED, DOCUMENTS_SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, EXPIRED

### New Tables (12 tables)

#### organizations

Main organization/tenant table.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| name | TEXT | Organization name |
| slug | TEXT | UNIQUE URL slug |
| type | OrganizationType | Organization type |
| status | OrganizationStatus | Status |
| legalName | TEXT | Legal business name |
| registrationNumber | TEXT | Business registration |
| taxId | TEXT | Tax ID |
| industry | TEXT | Industry sector |
| website | TEXT | Website URL |
| primaryEmail | TEXT | Contact email |
| primaryPhone | TEXT | Phone number |
| address | JSONB | Address object |
| logoUrl | TEXT | Logo URL |
| bannerUrl | TEXT | Banner URL |
| primaryColor | TEXT | Brand color |
| description | TEXT | Description |
| settings | JSONB | Organization settings |
| features | TEXT[] | Enabled features |
| billingEmail | TEXT | Billing email |
| billingAddress | JSONB | Billing address |
| stripeCustomerId | TEXT | Stripe customer |
| subscriptionTier | TEXT | Subscription plan |
| maxTeamMembers | INTEGER | Team size limit |
| maxProducts | INTEGER | Product limit |
| maxApiCalls | INTEGER | API call limit |
| verifiedAt | TIMESTAMP | Verification date |
| ownerId | TEXT | FK to users |
| createdAt | TIMESTAMP | Creation date |
| updatedAt | TIMESTAMP | Last update |
| deletedAt | TIMESTAMP | Soft delete |

**Indexes:**
- `organizations_slug_key` (UNIQUE)
- `organizations_slug_idx`
- `organizations_status_idx`
- `organizations_ownerId_idx`

#### organization_members

Organization membership/team management.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations |
| userId | TEXT | FK to users |
| status | MemberStatus | Member status |
| roleId | TEXT | FK to organization_roles |
| departmentId | TEXT | FK to departments |
| teamId | TEXT | FK to teams |
| title | TEXT | Job title |
| joinedAt | TIMESTAMP | Join date |
| invitedBy | TEXT | Inviter user ID |
| lastActiveAt | TIMESTAMP | Last activity |

**Unique Constraint:** `organization_members_organizationId_userId_key`

#### departments

Hierarchical department structure.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations |
| name | TEXT | Department name |
| description | TEXT | Description |
| parentId | TEXT | Parent department (self-reference) |
| level | INTEGER | Hierarchy level |
| headId | TEXT | Department head user ID |

**Unique Constraint:** `departments_organizationId_name_key`

#### teams

Team management within departments.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations |
| departmentId | TEXT | FK to departments |
| name | TEXT | Team name |
| description | TEXT | Description |
| leadId | TEXT | Team lead user ID |

**Unique Constraint:** `teams_organizationId_name_key`

#### organization_roles

Custom roles per organization.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations (nullable for system roles) |
| name | TEXT | Role name |
| description | TEXT | Description |
| isSystem | BOOLEAN | System-defined role |
| isDefault | BOOLEAN | Default role for new members |
| permissions | TEXT[] | Permission codes |

**Unique Constraint:** `organization_roles_organizationId_name_key`

#### permissions

Granular permission system.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| code | TEXT | UNIQUE permission code |
| name | TEXT | Display name |
| description | TEXT | Description |
| category | TEXT | Permission category |

**Permission Categories:**
- organization
- members
- products
- orders
- billing
- settings
- reports
- api_keys
- audit

#### kyc_applications

KYC/KYB verification tracking.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations |
| status | KycStatus | KYC status |
| idType | TEXT | ID document type |
| idDocumentUrl | TEXT | ID document URL |
| idVerified | BOOLEAN | ID verified |
| addressDocumentUrl | TEXT | Address proof URL |
| addressVerified | BOOLEAN | Address verified |
| businessDocUrl | TEXT | Business docs URL |
| businessVerified | BOOLEAN | Business verified |
| verificationScore | DOUBLE PRECISION | Verification score |
| verificationData | JSONB | Verification details |
| reviewerId | TEXT | Reviewer user ID |
| reviewNotes | TEXT | Review notes |
| rejectionReason | TEXT | Rejection reason |
| submittedAt | TIMESTAMP | Submission date |
| reviewedAt | TIMESTAMP | Review date |
| expiresAt | TIMESTAMP | Expiration date |

#### organization_invitations

Member invitation system.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations |
| email | TEXT | Invitee email |
| roleId | TEXT | Assigned role |
| departmentId | TEXT | Assigned department |
| teamId | TEXT | Assigned team |
| token | TEXT | UNIQUE invitation token |
| status | TEXT | Invitation status |
| invitedById | TEXT | Inviter user ID |
| message | TEXT | Invitation message |
| expiresAt | TIMESTAMP | Token expiration |
| acceptedAt | TIMESTAMP | Acceptance date |

#### organization_api_keys

API key management per organization.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations |
| name | TEXT | Key name |
| keyHash | TEXT | Hashed key |
| keyPrefix | TEXT | Key prefix (visible) |
| permissions | TEXT[] | API permissions |
| rateLimit | INTEGER | Rate limit |
| lastUsedAt | TIMESTAMP | Last usage |
| expiresAt | TIMESTAMP | Expiration |
| revokedAt | TIMESTAMP | Revocation |
| createdById | TEXT | Creator user ID |

#### organization_audit_logs

Comprehensive audit trail.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations |
| userId | TEXT | Actor user ID |
| action | TEXT | Action type |
| resource | TEXT | Resource type |
| resourceId | TEXT | Resource ID |
| oldValue | JSONB | Before state |
| newValue | JSONB | After state |
| metadata | JSONB | Additional data |
| ipAddress | TEXT | IP address |
| userAgent | TEXT | User agent |

#### organization_billing

Billing management per organization.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| organizationId | TEXT | FK to organizations, UNIQUE |
| stripeCustomerId | TEXT | Stripe customer |
| stripeSubscriptionId | TEXT | Stripe subscription |
| planId | TEXT | Plan ID |
| planName | TEXT | Plan name |
| billingCycle | TEXT | Billing cycle |
| status | TEXT | Billing status |
| currentPeriodStart | TIMESTAMP | Period start |
| currentPeriodEnd | TIMESTAMP | Period end |
| paymentMethodId | TEXT | Payment method |
| paymentMethodLast4 | TEXT | Card last 4 |
| paymentMethodBrand | TEXT | Card brand |
| balance | DOUBLE PRECISION | Account balance |
| creditBalance | DOUBLE PRECISION | Credit balance |

#### organization_invoices

Invoice tracking.

| Key Columns | Type | Description |
|-------------|------|-------------|
| id | TEXT | PRIMARY KEY |
| billingId | TEXT | FK to organization_billing |
| stripeInvoiceId | TEXT | Stripe invoice ID |
| number | TEXT | UNIQUE invoice number |
| amount | DOUBLE PRECISION | Invoice amount |
| currency | TEXT | Currency code |
| status | TEXT | Invoice status |
| description | TEXT | Description |
| lineItems | JSONB | Line items |
| dueDate | TIMESTAMP | Due date |
| paidAt | TIMESTAMP | Payment date |
| pdfUrl | TEXT | PDF URL |

### Total Schema Impact

- **New Tables:** 12 tables
- **New ENUM Types:** 4 types
- **New Indexes:** 30+ indexes
- **New Foreign Keys:** 15+ relationships

### Breaking Changes

1. **Multi-tenant architecture** - All resources now scoped to organizations
2. **Authentication changes** - Need organization context in requests
3. **Authorization overhaul** - New permission system
4. **Data isolation** - Queries must filter by organizationId

### Application Updates Required

**CRITICAL - ARCHITECTURE CHANGES:**

1. **Multi-tenancy Implementation**
   - Add organization context to all requests
   - Implement tenant isolation at DB level
   - Update all queries to filter by organizationId

2. **Organization Management**
   - Organization creation workflow
   - Member invitation system
   - Role and permission management
   - Department/team hierarchy

3. **Billing Integration**
   - Stripe subscription integration
   - Invoice generation
   - Usage tracking
   - Payment method management

4. **KYC/KYB Process**
   - Document upload
   - Verification workflow
   - Admin review interface
   - Compliance reporting

5. **API Key Management**
   - Key generation
   - Permission management
   - Rate limiting
   - Usage analytics

6. **Audit Logging**
   - Automatic audit trail
   - Action logging
   - Compliance exports
   - Audit review interface

### Post-Migration Data Setup

```sql
-- Create system roles
INSERT INTO organization_roles (id, name, description, "isSystem", "isDefault", permissions)
VALUES
  (gen_random_uuid(), 'Owner', 'Full organization access', true, false, ARRAY['*']),
  (gen_random_uuid(), 'Admin', 'Administrative access', true, true,
   ARRAY['org.read', 'org.write', 'members.manage', 'products.*', 'orders.*', 'billing.read']),
  (gen_random_uuid(), 'Member', 'Standard member access', true, true,
   ARRAY['org.read', 'products.read', 'orders.read']);

-- Create default permissions
INSERT INTO permissions (id, code, name, description, category)
VALUES
  (gen_random_uuid(), 'org.read', 'View Organization', 'View organization details', 'organization'),
  (gen_random_uuid(), 'org.write', 'Manage Organization', 'Modify organization', 'organization'),
  (gen_random_uuid(), 'org.delete', 'Delete Organization', 'Delete organization', 'organization'),
  (gen_random_uuid(), 'members.read', 'View Members', 'View team members', 'members'),
  (gen_random_uuid(), 'members.invite', 'Invite Members', 'Invite new members', 'members'),
  (gen_random_uuid(), 'members.manage', 'Manage Members', 'Manage team members', 'members'),
  (gen_random_uuid(), 'members.remove', 'Remove Members', 'Remove members', 'members'),
  (gen_random_uuid(), 'products.*', 'Full Product Access', 'All product operations', 'products'),
  (gen_random_uuid(), 'products.read', 'View Products', 'View products', 'products'),
  (gen_random_uuid(), 'products.create', 'Create Products', 'Create products', 'products'),
  (gen_random_uuid(), 'products.update', 'Update Products', 'Update products', 'products'),
  (gen_random_uuid(), 'products.delete', 'Delete Products', 'Delete products', 'products'),
  (gen_random_uuid(), 'orders.*', 'Full Order Access', 'All order operations', 'orders'),
  (gen_random_uuid(), 'orders.read', 'View Orders', 'View orders', 'orders'),
  (gen_random_uuid(), 'orders.manage', 'Manage Orders', 'Manage orders', 'orders'),
  (gen_random_uuid(), 'billing.read', 'View Billing', 'View billing', 'billing'),
  (gen_random_uuid(), 'billing.manage', 'Manage Billing', 'Manage billing', 'billing'),
  (gen_random_uuid(), 'settings.read', 'View Settings', 'View settings', 'settings'),
  (gen_random_uuid(), 'settings.manage', 'Manage Settings', 'Manage settings', 'settings'),
  (gen_random_uuid(), 'api_keys.manage', 'Manage API Keys', 'Manage API keys', 'api_keys'),
  (gen_random_uuid(), 'audit.read', 'View Audit Logs', 'View audit logs', 'audit');

-- Migrate existing vendors to organizations
INSERT INTO organizations (id, name, slug, type, status, "primaryEmail", "ownerId", "subscriptionTier", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  vp."businessName",
  lower(regexp_replace(vp."businessName", '[^a-zA-Z0-9]+', '-', 'g')),
  'SMALL_BUSINESS',
  CASE
    WHEN vp.status = 'ACTIVE' THEN 'ACTIVE'::OrganizationStatus
    ELSE 'PENDING_VERIFICATION'::OrganizationStatus
  END,
  vp."businessEmail",
  vp."userId",
  'free',
  vp."createdAt",
  vp."updatedAt"
FROM vendor_profiles vp;
```

---

## Summary of Breaking Changes

### High Impact (Require Code Changes)

1. **Migration 2: Phase 30 Schema Sync**
   - Modified `orders` table structure
   - Modified `reviews` table structure
   - 50+ new tables requiring feature implementation

2. **Migration 7: Organization Module**
   - Multi-tenant architecture
   - All queries need organization scoping
   - Authentication/authorization overhaul

### Medium Impact (Require Configuration)

3. **Migration 3: Vendor Management System**
   - Vendor data migration needed
   - Payout system setup required

4. **Migration 6: Privacy & Consent**
   - Table name fix required
   - Compliance workflows needed

### Low Impact (Mostly Additive)

5. **Migration 1: Password Reset**
   - New feature, no breaking changes

6. **Migration 4: Roles & Permissions**
   - Enhanced RBAC, backward compatible

7. **Migration 5: Performance Indexes**
   - Performance improvement, no code changes

---

## Data Transformation Guide

### Pre-Migration Data Preparation

#### 1. Vendor Migration

```sql
-- Check vendors without user accounts
SELECT * FROM vendor_profiles vp
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = vp."userId"
);

-- Create placeholder users if needed
INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  vp."businessEmail",
  'PLACEHOLDER_HASH',
  vp."businessName",
  'VENDOR',
  NOW(),
  NOW()
FROM vendor_profiles vp
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = vp."userId"
);
```

#### 2. Organization Ownership

```sql
-- Set organization owners
UPDATE organizations o
SET "ownerId" = (
  SELECT om."userId"
  FROM organization_members om
  WHERE om."organizationId" = o.id
  ORDER BY om."createdAt" ASC
  LIMIT 1
)
WHERE o."ownerId" IS NULL;
```

#### 3. Initialize Loyalty Program

```sql
-- Create default loyalty program
INSERT INTO loyalty_programs (id, name, description, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'CitadelBuy Rewards',
  'Earn points on every purchase and unlock exclusive benefits',
  true,
  NOW(),
  NOW()
);

-- Create loyalty accounts for existing users
INSERT INTO customer_loyalty (
  id, "userId", "referralCode", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  u.id,
  upper(substring(md5(random()::text) from 1 for 8)),
  NOW(),
  NOW()
FROM users u
WHERE u.role = 'CUSTOMER'
  AND NOT EXISTS (
    SELECT 1 FROM customer_loyalty cl WHERE cl."userId" = u.id
  );
```

#### 4. Initialize Languages

```sql
-- Add default languages
INSERT INTO languages (id, code, name, "nativeName", "isDefault", "isEnabled", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'en', 'English', 'English', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'es', 'Spanish', 'Español', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'fr', 'French', 'Français', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'de', 'German', 'Deutsch', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'zh', 'Chinese', '中文', false, true, NOW(), NOW());
```

### Post-Migration Data Cleanup

#### 1. Remove Test Data

```sql
-- Remove test orders
DELETE FROM orders WHERE "shippingAddress" LIKE '%test%';

-- Remove test users
DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%@example.com';
```

#### 2. Recalculate Aggregates

```sql
-- Update vendor totals
UPDATE vendor_profiles vp
SET
  "totalProducts" = (SELECT count(*) FROM products p WHERE p."vendorId" = vp."userId"),
  "totalOrders" = (SELECT count(*) FROM orders o
    JOIN order_items oi ON oi."orderId" = o.id
    JOIN products p ON p.id = oi."productId"
    WHERE p."vendorId" = vp."userId"),
  "totalRevenue" = (SELECT COALESCE(SUM(oi.price * oi.quantity), 0) FROM orders o
    JOIN order_items oi ON oi."orderId" = o.id
    JOIN products p ON p.id = oi."productId"
    WHERE p."vendorId" = vp."userId"
      AND o.status IN ('DELIVERED', 'SHIPPED'));
```

#### 3. Generate Initial Analytics

```sql
-- Generate initial vendor analytics
INSERT INTO vendor_analytics (
  id, "vendorProfileId", period, date,
  "totalRevenue", "totalOrders", "totalProducts",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  vp.id,
  'MONTHLY',
  date_trunc('month', CURRENT_DATE),
  vp."totalRevenue",
  vp."totalOrders",
  vp."totalProducts",
  NOW(),
  NOW()
FROM vendor_profiles vp;
```

---

## Migration Dependencies

```
Migration 1 (password_resets)
  └─> No dependencies

Migration 2 (phase30_sync)
  └─> Depends on: Migration 1
  └─> Modifies: orders, reviews

Migration 3 (vendor_management)
  └─> Depends on: Migration 1
  └─> References: users table

Migration 4 (roles_permissions)
  └─> Depends on: Migration 7 (organization_module)
  └─> References: organization_roles, permissions, organizations

Migration 5 (performance_indexes)
  └─> Depends on: All previous migrations
  └─> Indexes all existing tables

Migration 6 (privacy_consent)
  └─> Depends on: Migration 1
  └─> Modifies: users table (WARNING: case sensitivity)

Migration 7 (organization_module)
  └─> Depends on: Migration 1
  └─> References: users table
  └─> Required by: Migration 4
```

**Execution Order:**
1. Migration 1 (base schema)
2. Migration 2 (phase 30)
3. Migration 3 (vendors)
4. Migration 7 (organizations) **BEFORE Migration 4**
5. Migration 4 (roles)
6. Migration 6 (privacy)
7. Migration 5 (indexes - last for optimal performance)

---

## Schema Statistics

### Before Migrations

- **Tables:** ~10 (base schema)
- **ENUM Types:** 2
- **Indexes:** ~20
- **Foreign Keys:** ~10

### After All Migrations

- **Tables:** 110+ tables
- **ENUM Types:** 30+ types
- **Indexes:** 320+ indexes
- **Foreign Keys:** 150+ foreign keys
- **Estimated Database Size:** 5-20GB (depending on data volume)

---

**Document Version:** 1.0
**Last Updated:** December 4, 2025
**Author:** CitadelBuy Platform Team
