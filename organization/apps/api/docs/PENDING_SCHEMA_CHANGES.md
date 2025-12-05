# Pending Database Schema Changes

**Document Status**: Ready for Review
**Last Updated**: December 4, 2024
**Total Pending Migrations**: 7
**Risk Level**: Medium
**Estimated Migration Time**: 5-15 minutes

## Executive Summary

This document outlines all pending database migrations that need to be applied to the CitadelBuy production database. The migrations introduce significant new features while maintaining backward compatibility.

### Key Highlights

- **New Features**: Organization management, privacy compliance, performance optimizations
- **Breaking Changes**: None
- **Data Migration Required**: No
- **Downtime Required**: No (can be applied with zero downtime)
- **Rollback Strategy**: Full backup-based rollback available

---

## Pending Migrations Overview

### Migration 1: Password Reset Table
**File**: `20251117022438_add_password_reset_table`
**Risk**: Low
**Purpose**: Initial schema setup and password reset functionality

#### Changes
- Creates core tables: `users`, `categories`, `products`, `orders`
- Adds `password_resets` table for secure password recovery
- Establishes base enums: `UserRole`, `OrderStatus`

#### New Tables
- `users` - User accounts with role-based access
- `categories` - Product categorization
- `products` - Product catalog
- `orders` - Order management
- `order_items` - Order line items
- `reviews` - Product reviews
- `wishlist` - User wishlists
- `password_resets` - Password reset tokens

#### Impact
- **Data**: No existing data affected (initial schema)
- **Performance**: Fast migration (no large data operations)
- **Application**: Core functionality enablement

---

### Migration 2: Schema Phase 30 Sync
**File**: `20251118154530_sync_schema_phase30`
**Risk**: Low-Medium
**Purpose**: Advanced marketplace features

#### Changes
- Advertising system (campaigns, ads, impressions)
- Subscription management (plans, billing)
- BNPL payment plans (Klarna, Affirm, Afterpay)
- AI recommendations system
- Enhanced search and discovery
- Advanced analytics dashboard
- Multi-language support (i18n)
- Loyalty and rewards program
- Flash sales and deals system
- Gift cards and store credit

#### New Tables (40+ tables)
**Advertising**:
- `ad_campaigns` - Marketing campaigns
- `advertisements` - Individual ads
- `ad_keywords` - Keyword targeting
- `ad_impressions` - Ad view tracking
- `ad_clicks` - Click tracking

**Subscriptions**:
- `subscription_plans` - Pricing tiers
- `subscriptions` - User subscriptions
- `subscription_invoices` - Billing

**BNPL**:
- `bnpl_payment_plans` - Payment plan management
- `bnpl_installments` - Installment tracking

**Loyalty**:
- `customer_loyalty` - Loyalty tracking
- `point_transactions` - Points ledger
- `rewards` - Available rewards
- `reward_redemptions` - Redemption history
- `referrals` - Referral tracking

**Deals**:
- `deals` - Flash sales and promotions
- `deal_products` - Deal product associations
- `deal_purchases` - Purchase tracking
- `deal_notifications` - User notifications

**Gift Cards**:
- `gift_cards` - Gift card management
- `gift_card_transactions` - Transaction history
- `store_credits` - Store credit balances
- `store_credit_transactions` - Credit transactions

**Analytics**:
- `vendor_analytics` - Vendor performance
- `product_analytics` - Product metrics
- `category_analytics` - Category performance
- `revenue_analytics` - Revenue tracking
- `traffic_analytics` - Traffic metrics

#### Impact
- **Data**: No existing data affected (all new tables)
- **Performance**: May take 2-3 minutes due to table count
- **Application**: Enables major marketplace features

---

### Migration 3: Vendor Management System
**File**: `20251119004754_add_vendor_management_system`
**Risk**: Low
**Purpose**: Complete vendor onboarding and management

#### Changes
- Vendor profile management
- Application and approval workflow
- Payout processing system
- Commission tracking
- Performance metrics

#### New Tables
- `vendor_profiles` - Vendor business details
- `vendor_applications` - Onboarding workflow
- `vendor_payouts` - Payment processing
- `vendor_commission_rules` - Flexible commission structure
- `vendor_performance_metrics` - Analytics

#### New Enums
- `VendorStatus` - Profile status tracking
- `VendorApplicationStatus` - Application workflow
- `PayoutStatus` - Payment status
- `PayoutMethod` - Payment methods

#### Impact
- **Data**: Links to existing users table
- **Performance**: Fast (small number of tables)
- **Application**: Enables multi-vendor marketplace

---

### Migration 4: Owner Relations and Role Permissions
**File**: `20251202_add_owner_relation_and_role_permissions`
**Risk**: Low
**Purpose**: Organization ownership and RBAC

#### Changes
- Links organizations to owners
- Role-permission junction table
- Foreign key constraints

#### New Tables
- `role_permissions` - Many-to-many role permissions

#### New Relations
- `organizations.ownerId` → `users.id`
- `role_permissions.roleId` → `organization_roles.id`
- `role_permissions.permissionId` → `permissions.id`

#### Impact
- **Data**: Existing organizations need owner assignment
- **Performance**: Fast (minimal data)
- **Application**: Enables fine-grained access control

---

### Migration 5: Performance Indexes
**File**: `add_performance_indexes`
**Risk**: Low-Medium
**Purpose**: Database query optimization

#### Changes
Adds strategic indexes for:
- Product filtering and search
- Order history queries
- User lookups
- Category navigation
- Inventory management
- Analytics queries

#### New Indexes (30+)
**Products**:
```sql
idx_products_status
idx_products_vendor_status_created
idx_products_category_status_created
idx_products_price
idx_products_stock
idx_products_sku_active
idx_products_tags_gin (GIN index for array search)
```

**Orders**:
```sql
idx_orders_user_status_created
idx_orders_status_created
idx_orders_guest_email
idx_orders_tracking_carrier
```

**Users**:
```sql
idx_users_email_active
idx_users_role_created
```

**Analytics Tables**:
- Composite indexes for time-series queries
- Indexes for dashboard metrics
- Performance metric lookups

#### Impact
- **Data**: No data changes (indexes only)
- **Performance**: May take 5-10 minutes on large tables
- **Application**: Significant query performance improvements
- **Note**: Uses `CREATE INDEX IF NOT EXISTS` for safety

#### Estimated Index Creation Time
| Table | Rows (est.) | Time (est.) |
|-------|-------------|-------------|
| products | < 10k | 1-2 min |
| orders | < 50k | 2-3 min |
| users | < 10k | 1 min |
| analytics | < 100k | 2-4 min |

---

### Migration 6: Privacy and Consent
**File**: `add_privacy_consent`
**Risk**: Low
**Purpose**: GDPR/CCPA compliance

#### Changes
- User consent tracking
- Data deletion requests
- Data export requests
- Terms agreement tracking

#### New Tables
- `ConsentLog` - Consent history with versioning
- `DataDeletionRequest` - GDPR right to deletion
- `DataExportRequest` - GDPR data portability
- `AgreedTerms` - Terms acceptance tracking

#### Fields
**ConsentLog**:
- `dataProcessing` - Core data processing consent
- `marketing` - Marketing communications
- `analytics` - Analytics tracking
- `thirdPartySharing` - Third-party data sharing
- `ipAddress`, `userAgent` - Audit trail
- `version` - Policy version tracking

**DataDeletionRequest**:
- `strategy` - Deletion strategy (soft/hard)
- `status` - PENDING, PROCESSING, COMPLETED
- `scheduledDate` - Scheduled deletion time
- `reason` - User-provided reason

**DataExportRequest**:
- `format` - JSON, CSV, etc.
- `downloadUrl` - Secure download link
- `expiresAt` - Link expiration

#### Impact
- **Data**: No existing data affected
- **Performance**: Fast (small tables)
- **Application**: Enables privacy compliance features
- **Legal**: Critical for GDPR/CCPA compliance

---

### Migration 7: Organization Module
**File**: `organization_module`
**Risk**: Medium
**Purpose**: Multi-tenant organization management

#### Changes
- Complete organization hierarchy
- Team and department structure
- Role-based access control
- KYC verification system
- Organization billing
- API key management
- Audit logging

#### New Tables (20+)
**Core Organization**:
- `organizations` - Organization profiles
- `organization_members` - Team members
- `departments` - Department hierarchy
- `teams` - Team management
- `organization_roles` - Custom roles
- `permissions` - Permission registry

**KYC & Compliance**:
- `kyc_applications` - Identity verification
- `organization_invitations` - Team invitations
- `organization_api_keys` - API access
- `organization_audit_logs` - Activity tracking

**Billing**:
- `organization_billing` - Billing configuration
- `organization_invoices` - Invoice management

**Webhooks**:
- `webhooks` - Webhook endpoints
- `webhook_deliveries` - Delivery tracking
- `webhook_dead_letters` - Failed webhooks
- `webhook_event_logs` - Event audit trail

#### New Enums
- `OrganizationType` - INDIVIDUAL, SMALL_BUSINESS, ENTERPRISE
- `OrganizationStatus` - Verification workflow
- `MemberStatus` - Member lifecycle
- `KycStatus` - KYC verification stages

#### Impact
- **Data**: Links to existing users
- **Performance**: 2-3 minutes (many tables)
- **Application**: Enables B2B functionality
- **Features**: Full multi-tenant support

---

## Data Migration Requirements

### No Destructive Operations
✅ All migrations are **additive only**:
- No `DROP TABLE` statements
- No `DROP COLUMN` statements
- No data deletion or modification

### Default Values
All new columns have appropriate defaults:
- String fields: Allow NULL or have default ""
- Numbers: Default to 0
- Booleans: Default to false
- Timestamps: Default to CURRENT_TIMESTAMP

### Foreign Key Safety
All foreign keys include proper cascading:
- `ON DELETE CASCADE` where appropriate
- `ON DELETE SET NULL` for optional relations
- `ON DELETE RESTRICT` for critical relations

---

## Performance Considerations

### Index Creation Strategy
Performance indexes use safe patterns:
- `CREATE INDEX IF NOT EXISTS` prevents conflicts
- `CONCURRENTLY` option available for production
- Partial indexes with `WHERE` clauses reduce index size

### Table Sizes (Estimated Impact)
| Table | Expected Rows | Migration Time |
|-------|---------------|----------------|
| Small tables (< 1k) | Most new tables | < 1 minute |
| Medium tables (1k-10k) | Products, Users | 1-2 minutes |
| Large tables (> 10k) | Orders, Analytics | 2-5 minutes |

### Recommended Approach
For production with large datasets:
```sql
-- Use CONCURRENTLY for indexes (requires separate statements)
CREATE INDEX CONCURRENTLY idx_products_status ON products(status);
```

---

## Application Compatibility

### Breaking Changes
**None** - All changes are backward compatible

### New Required Environment Variables
```bash
# Organization module (optional)
ORG_MAX_MEMBERS=5
ORG_MAX_PRODUCTS=100

# KYC encryption (required if using KYC)
KYC_ENCRYPTION_KEY=<32-byte hex key>

# Storage for KYC documents (required if using KYC)
STORAGE_PROVIDER=S3|AZURE|LOCAL
STORAGE_BUCKET=citadelbuy-kyc-documents
```

### Feature Flags
Consider enabling features gradually:
```typescript
// Example feature flag configuration
const features = {
  organizations: process.env.ENABLE_ORGANIZATIONS === 'true',
  kyc: process.env.ENABLE_KYC === 'true',
  advancedAnalytics: process.env.ENABLE_ANALYTICS === 'true',
};
```

---

## Testing Requirements

### Pre-Migration Tests
- [ ] All unit tests passing
- [ ] E2E tests passing
- [ ] Integration tests passing
- [ ] Load tests on staging

### Post-Migration Tests
- [ ] Schema validation: `npx prisma validate`
- [ ] Client generation: `npx prisma generate`
- [ ] Connection test: `npx prisma db execute --stdin <<< "SELECT 1;"`
- [ ] Table count verification
- [ ] Index verification
- [ ] Foreign key integrity check
- [ ] Application smoke tests

### Test Queries
```sql
-- Verify tables created
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'organizations',
  'organization_members',
  'role_permissions',
  'vendor_profiles',
  'gift_cards'
);

-- Verify indexes created
SELECT count(*) FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- Check foreign keys
SELECT count(*) FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';
```

---

## Rollback Plan

### Backup Strategy
The migration script automatically creates backups:
```bash
./scripts/run-migrations.sh prod
# Creates: backups/migration_backup_YYYYMMDD_HHMMSS.sql
```

### Manual Backup
```bash
pg_dump -h localhost -p 5432 -U citadelbuy citadelbuy_prod \
  --format=custom \
  --compress=9 \
  --file=backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Rollback Procedure
If migration fails:
```bash
# 1. Stop application
pm2 stop all

# 2. Restore backup
pg_restore -h HOST -p PORT -U USER -d DATABASE \
  --clean --if-exists \
  backups/migration_backup_TIMESTAMP.sql

# 3. Verify restoration
npx prisma migrate status

# 4. Restart application
pm2 start all
```

### Rollback Testing
Test rollback in staging:
```bash
# 1. Apply migrations to staging
./scripts/run-migrations.sh staging

# 2. Test rollback procedure
# Restore from backup

# 3. Verify application works
npm run test:e2e
```

---

## Deployment Strategy

### Recommended Approach: Blue-Green Deployment

1. **Prepare New Environment (Green)**
   - Apply all migrations
   - Deploy new application version
   - Run smoke tests

2. **Switch Traffic**
   - Route small percentage to green
   - Monitor for errors
   - Gradually increase traffic

3. **Complete Migration**
   - Switch 100% traffic to green
   - Keep blue environment as backup
   - Decommission blue after validation period

### Alternative: Rolling Deployment

1. **Apply Migrations**
   ```bash
   ./scripts/run-migrations.sh prod
   ```

2. **Deploy Application**
   - Update one instance at a time
   - Monitor each instance
   - Continue if healthy

3. **Validate**
   - Run health checks
   - Monitor metrics
   - Verify functionality

---

## Monitoring Plan

### Metrics to Watch
- Query response times
- Database CPU and memory usage
- Connection pool utilization
- Error rates
- Application response times

### Alert Thresholds
```yaml
database:
  cpu_usage: > 80%
  memory_usage: > 85%
  connection_pool: > 90%
  query_time_p95: > 1000ms

application:
  error_rate: > 1%
  response_time_p95: > 500ms
```

### Dashboards
- Database performance dashboard
- Application metrics dashboard
- Business metrics dashboard

---

## Success Criteria

### Migration Success
- [ ] All migrations applied without errors
- [ ] `npx prisma migrate status` shows up to date
- [ ] All tables created successfully
- [ ] All indexes created successfully
- [ ] Foreign keys established correctly

### Application Health
- [ ] Application starts successfully
- [ ] Health checks passing
- [ ] No errors in logs
- [ ] All API endpoints responding
- [ ] Critical user flows working

### Performance
- [ ] Query performance improved or maintained
- [ ] No significant increase in response times
- [ ] Database metrics within normal range
- [ ] No connection pool exhaustion

---

## Communication Plan

### Pre-Migration
- [ ] Notify team 24 hours before
- [ ] Update status page
- [ ] Send user notification (if downtime expected)
- [ ] Prepare support team

### During Migration
- [ ] Real-time updates in team channel
- [ ] Status page updates
- [ ] Monitor error reports

### Post-Migration
- [ ] Announce completion
- [ ] Update documentation
- [ ] Send summary report
- [ ] Schedule retrospective

---

## Risk Assessment

### Overall Risk: Medium

| Component | Risk | Mitigation |
|-----------|------|------------|
| Schema Changes | Low | No destructive operations |
| Index Creation | Medium | Can run CONCURRENTLY |
| Foreign Keys | Low | Proper cascade rules |
| Data Migration | None | No data transformation needed |
| Application Code | Low | Backward compatible |
| Rollback | Low | Full backup strategy |

### Risk Mitigation
1. **Test in staging first** - Mandatory
2. **Create backups** - Automated
3. **Gradual rollout** - Recommended for production
4. **Monitor closely** - During and after migration
5. **Have rollback ready** - Tested procedure

---

## Next Steps

1. **Review this document** with team
2. **Run migrations in development**:
   ```bash
   ./scripts/run-migrations.sh dev
   ```
3. **Test application** thoroughly
4. **Apply to staging**:
   ```bash
   ./scripts/run-migrations.sh staging
   ```
5. **Schedule production deployment**
6. **Complete pre-deployment checklist**
7. **Execute production migration**:
   ```bash
   ./scripts/run-migrations.sh prod
   ```

---

## Questions & Approvals

### Technical Review
- [ ] Database Administrator: _______________
- [ ] Backend Lead: _______________
- [ ] DevOps Engineer: _______________

### Business Approval
- [ ] Product Manager: _______________
- [ ] Engineering Manager: _______________

### Sign-off Date: _______________

---

**Document Version**: 1.0
**Prepared By**: Database Team
**Review Date**: December 4, 2024
