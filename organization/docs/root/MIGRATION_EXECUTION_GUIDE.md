# CitadelBuy Database Migration Execution Guide

## Overview

This guide provides comprehensive instructions for executing database migrations for the CitadelBuy platform. There are currently **7 pending migrations** that need to be applied to update the database schema.

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Execution Steps](#migration-execution-steps)
4. [Post-Migration Verification](#post-migration-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)

---

## Migration Overview

### Pending Migrations (In Order)

| # | Migration Name | Priority | Est. Duration | Breaking Changes |
|---|----------------|----------|---------------|------------------|
| 1 | `20251117022438_add_password_reset_table` | High | 2-3 min | No |
| 2 | `20251118154530_sync_schema_phase30` | Critical | 10-15 min | Yes (Major) |
| 3 | `20251119004754_add_vendor_management_system` | High | 5-7 min | No |
| 4 | `20251202_add_owner_relation_and_role_permissions` | Medium | 2-3 min | No |
| 5 | `add_performance_indexes` | Low | 15-20 min | No |
| 6 | `add_privacy_consent` | High | 3-5 min | No |
| 7 | `organization_module` | Critical | 8-10 min | Yes |

**Total Estimated Duration:** 45-63 minutes

---

## Pre-Migration Checklist

### 1. Environment Preparation

- [ ] **Verify Database Connection**
  ```bash
  psql $DATABASE_URL -c "SELECT version();"
  ```

- [ ] **Check Current Migration Status**
  ```bash
  cd C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization/apps/api
  npx prisma migrate status
  ```

- [ ] **Verify Disk Space** (Minimum 20% free space recommended)
  ```bash
  df -h
  ```

- [ ] **Check Database Size**
  ```sql
  SELECT pg_size_pretty(pg_database_size(current_database()));
  ```

### 2. Backup Requirements

- [ ] **Create Full Database Backup**
  ```bash
  # Using pg_dump
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

  # Or use the automated script
  ./scripts/backup-database.sh
  ```

- [ ] **Verify Backup Integrity**
  ```bash
  # Check backup file size
  ls -lh backup_*.sql

  # Test restore to temporary database (recommended)
  createdb citadelbuy_test
  psql citadelbuy_test < backup_20251204_120000.sql
  dropdb citadelbuy_test
  ```

- [ ] **Store Backup in Safe Location**
  - Copy to S3/Azure Blob Storage
  - Keep local copy on different disk/server
  - Document backup location and timestamp

### 3. Maintenance Window

- [ ] **Schedule Downtime Window**
  - Recommended: 1.5-2 hours window
  - Best time: Low traffic period (e.g., 2 AM - 4 AM)
  - Notify users 48 hours in advance

- [ ] **Put Application in Maintenance Mode**
  ```bash
  # Set environment variable
  export MAINTENANCE_MODE=true

  # Or use maintenance page
  kubectl scale deployment web --replicas=0
  ```

- [ ] **Stop Background Jobs**
  ```bash
  # Stop job processors
  systemctl stop citadelbuy-worker
  # Or
  kubectl scale deployment worker --replicas=0
  ```

### 4. Team Coordination

- [ ] Notify development team
- [ ] Have DBA available on call
- [ ] Prepare incident response team
- [ ] Set up communication channel (Slack/Teams)

---

## Migration Execution Steps

### Step 1: Password Reset Table Migration

**Migration:** `20251117022438_add_password_reset_table`

**Description:** Creates the initial database schema including core tables (users, products, orders, categories) and adds password reset functionality.

**Execution:**

```bash
cd C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization/apps/api

# Dry run (check what will be applied)
npx prisma migrate status

# Apply migration
npx prisma migrate deploy
```

**Expected Changes:**
- Creates `password_resets` table
- Adds indexes on email and token columns
- Creates ENUM types: UserRole, OrderStatus

**Verification Queries:**

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'password_resets'
);

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'password_resets';

-- Check ENUM types
SELECT typname FROM pg_type WHERE typtype = 'e';
```

**Estimated Duration:** 2-3 minutes

**Risk Level:** Low

---

### Step 2: Phase 30 Schema Synchronization (CRITICAL)

**Migration:** `20251118154530_sync_schema_phase30`

**Description:** Major schema update adding comprehensive e-commerce features including:
- Advanced product management (variants, wishlists)
- Advertising system (campaigns, ads, keywords)
- Subscription management
- Buy Now Pay Later (BNPL) integration
- Analytics and tracking
- Loyalty programs
- Internationalization (i18n)

**BREAKING CHANGES:**
- Adds columns to existing `orders` table
- Adds columns to existing `reviews` table
- Creates 50+ new tables
- May require application code updates

**Pre-Execution Checklist:**
- [ ] Ensure no active transactions
- [ ] Verify sufficient storage (tables will consume ~2-5GB)
- [ ] Review application compatibility

**Execution:**

```bash
# This is a large migration - monitor progress
npx prisma migrate deploy
```

**Progress Monitoring:**

```sql
-- In another terminal, monitor table creation
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Check for locks
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

**Expected Changes:**

Major table additions:
- **Product Management:** `product_variants`, `wishlist`, `product_translations`
- **Advertising:** `ad_campaigns`, `advertisements`, `ad_keywords`, `ad_impressions`, `ad_clicks`
- **Subscriptions:** `subscription_plans`, `subscriptions`, `subscription_invoices`
- **BNPL:** `bnpl_payment_plans`, `bnpl_installments`
- **Analytics:** `vendor_analytics`, `product_analytics`, `category_analytics`, `revenue_analytics`, `traffic_analytics`
- **Loyalty:** `loyalty_programs`, `customer_loyalty`, `point_transactions`, `rewards`, `referrals`
- **Deals:** `deals`, `deal_products`, `deal_purchases`, `deal_notifications`
- **Gift Cards:** `gift_cards`, `gift_card_transactions`, `store_credits`
- **i18n:** `languages`, `product_translations`, `category_translations`, `translations`
- **Tracking:** `user_behaviors`, `search_queries`, `product_views`, `saved_searches`

**Verification Queries:**

```sql
-- Verify critical tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'subscription_plans',
  'customer_loyalty',
  'ad_campaigns',
  'product_variants',
  'deals'
)
ORDER BY table_name;

-- Count new indexes
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';

-- Verify foreign key constraints
SELECT count(*) FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- Check for any failed constraints
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'f' AND convalidated = false;
```

**Estimated Duration:** 10-15 minutes

**Risk Level:** High (Major schema changes)

**Rollback Consideration:** Have full backup ready. Rollback may require restoring from backup.

---

### Step 3: Vendor Management System

**Migration:** `20251119004754_add_vendor_management_system`

**Description:** Adds comprehensive vendor management capabilities.

**Execution:**

```bash
npx prisma migrate deploy
```

**Expected Changes:**
- Creates `vendor_profiles` table
- Creates `vendor_applications` table
- Creates `vendor_payouts` table
- Creates `vendor_commission_rules` table
- Creates `vendor_performance_metrics` table
- Adds ENUM types: VendorStatus, VendorApplicationStatus, PayoutStatus, PayoutMethod

**Verification Queries:**

```sql
-- Verify vendor tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'vendor_%'
ORDER BY table_name;

-- Check foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'vendor_%';
```

**Estimated Duration:** 5-7 minutes

**Risk Level:** Medium

---

### Step 4: Organization Roles and Permissions

**Migration:** `20251202_add_owner_relation_and_role_permissions`

**Description:** Adds role-based access control (RBAC) for organizations.

**Execution:**

```bash
npx prisma migrate deploy
```

**Expected Changes:**
- Creates `role_permissions` table
- Adds foreign key from `organizations` to `users` (ownerId)
- Establishes relationships between roles and permissions

**Verification Queries:**

```sql
-- Verify role_permissions table
SELECT * FROM information_schema.tables
WHERE table_name = 'role_permissions';

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'role_permissions';

-- Verify foreign key constraints
SELECT conname FROM pg_constraint
WHERE conrelid = 'role_permissions'::regclass;
```

**Estimated Duration:** 2-3 minutes

**Risk Level:** Low

---

### Step 5: Performance Indexes (LONG RUNNING)

**Migration:** `add_performance_indexes`

**Description:** Adds comprehensive database indexes to optimize query performance. This migration creates 100+ indexes across all tables.

**IMPORTANT:** This migration may take 15-20 minutes and will lock tables temporarily.

**Pre-Execution Checklist:**
- [ ] Ensure low database activity
- [ ] Have at least 2GB free disk space
- [ ] Consider running during maintenance window

**Execution:**

```bash
# This migration uses CREATE INDEX IF NOT EXISTS to be idempotent
npx prisma migrate deploy
```

**Index Categories:**
1. **Core Entities:** Products, Orders, Users, Reviews
2. **Shopping Cart:** Cart items, abandoned carts
3. **Inventory:** Stock management, warehouses
4. **Vendor Management:** Profiles, payouts, performance
5. **Advertising:** Campaigns, impressions, clicks
6. **Loyalty & Rewards:** Points, tiers, referrals
7. **Search & Analytics:** Queries, views, tracking
8. **Organization Module:** Members, roles, audit logs

**Progress Monitoring:**

```sql
-- Monitor index creation progress
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check index sizes
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

**Post-Migration Analysis:**

```sql
-- Run ANALYZE to update statistics
ANALYZE;

-- Verify index usage (wait a few hours after migration)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 50;
```

**Verification Queries:**

```sql
-- Count total indexes
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';

-- Check for duplicate indexes
SELECT
  array_agg(indexname) as index_names,
  tablename,
  string_agg(indexdef, ' | ') as definitions
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename, indexdef
HAVING count(*) > 1;

-- Verify covering indexes exist
SELECT indexname FROM pg_indexes
WHERE indexname LIKE 'idx_%_covering';
```

**Estimated Duration:** 15-20 minutes

**Risk Level:** Low (Non-breaking changes)

---

### Step 6: Privacy and Consent Management

**Migration:** `add_privacy_consent`

**Description:** Adds GDPR/CCPA compliance tables for user consent and data management.

**Execution:**

```bash
npx prisma migrate deploy
```

**Expected Changes:**
- Creates `ConsentLog` table for consent tracking
- Creates `DataDeletionRequest` table for GDPR deletion requests
- Creates `DataExportRequest` table for data portability
- Creates `AgreedTerms` table for terms acceptance tracking
- Adds `deletedAt` and `processingRestricted` columns to `User` table

**IMPORTANT NOTE:** This migration references "User" table but your schema uses "users". You may need to adjust the migration:

**Pre-Migration Fix (if needed):**

```sql
-- If migration fails, manually adjust the table name
-- Edit the migration file before running
sed -i 's/"User"/"users"/g' prisma/migrations/add_privacy_consent/migration.sql
```

**Verification Queries:**

```sql
-- Verify privacy tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ConsentLog', 'DataDeletionRequest', 'DataExportRequest', 'AgreedTerms');

-- Check User table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('deletedAt', 'processingRestricted');

-- Verify foreign key constraints
SELECT conname FROM pg_constraint
WHERE conrelid IN (
  'ConsentLog'::regclass,
  'DataDeletionRequest'::regclass,
  'DataExportRequest'::regclass,
  'AgreedTerms'::regclass
);
```

**Estimated Duration:** 3-5 minutes

**Risk Level:** Medium (May require schema adjustment)

---

### Step 7: Organization Module (CRITICAL)

**Migration:** `organization_module`

**Description:** Adds complete multi-tenant organization management system with teams, departments, roles, KYC, billing, and audit logging.

**BREAKING CHANGES:**
- Creates organization hierarchy
- Adds KYC verification system
- Implements organization-level billing
- May require application updates for multi-tenancy

**Execution:**

```bash
npx prisma migrate deploy
```

**Expected Changes:**

Major tables:
- `organizations` - Main organization table
- `organization_members` - Member relationships
- `departments` - Hierarchical department structure
- `teams` - Team management
- `organization_roles` - Custom roles per organization
- `permissions` - Granular permissions system
- `kyc_applications` - KYC verification tracking
- `organization_invitations` - Member invitation system
- `organization_api_keys` - API key management
- `organization_audit_logs` - Comprehensive audit trail
- `organization_billing` - Billing management
- `organization_invoices` - Invoice tracking

ENUMs:
- OrganizationType
- OrganizationStatus
- MemberStatus
- KycStatus

**Verification Queries:**

```sql
-- Verify organization tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE 'organization%' OR table_name IN ('departments', 'teams', 'permissions'))
ORDER BY table_name;

-- Check organization ENUMs
SELECT typname FROM pg_type
WHERE typname LIKE '%Organization%' OR typname LIKE '%Member%' OR typname = 'KycStatus';

-- Verify department hierarchy support (self-referencing FK)
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'departments'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'parentId';

-- Check audit log structure
\d organization_audit_logs
```

**Post-Migration Data Setup:**

```sql
-- Create default system roles
INSERT INTO organization_roles (id, name, description, "isSystem", "isDefault", permissions, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Owner', 'Organization owner with full access', true, false,
   ARRAY['*'], NOW(), NOW()),
  (gen_random_uuid(), 'Admin', 'Administrator with most permissions', true, true,
   ARRAY['org.read', 'org.write', 'members.manage', 'billing.read'], NOW(), NOW()),
  (gen_random_uuid(), 'Member', 'Standard member with basic access', true, true,
   ARRAY['org.read', 'products.read', 'orders.read'], NOW(), NOW());

-- Create default permissions
INSERT INTO permissions (id, code, name, description, category, "createdAt")
VALUES
  (gen_random_uuid(), 'org.read', 'Read Organization', 'View organization details', 'organization', NOW()),
  (gen_random_uuid(), 'org.write', 'Write Organization', 'Modify organization settings', 'organization', NOW()),
  (gen_random_uuid(), 'members.manage', 'Manage Members', 'Add, remove, and modify members', 'members', NOW()),
  (gen_random_uuid(), 'billing.read', 'Read Billing', 'View billing information', 'billing', NOW()),
  (gen_random_uuid(), 'billing.write', 'Manage Billing', 'Modify billing settings', 'billing', NOW());
```

**Estimated Duration:** 8-10 minutes

**Risk Level:** High (Complex multi-tenant system)

---

## Post-Migration Verification

### 1. Database Integrity Checks

```sql
-- Check for constraint violations
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'f' AND convalidated = false;

-- Verify all foreign keys
SELECT count(*) FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- Check for missing indexes on foreign keys
SELECT
  c.conrelid::regclass AS table_name,
  string_agg(a.attname, ', ') AS column_names
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND a.attnum = ANY(i.indkey)
  )
GROUP BY c.conrelid;

-- Check table counts
SELECT
  schemaname,
  count(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;

-- Verify migration history
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC;
```

### 2. Application Testing

- [ ] **Restart Application Services**
  ```bash
  systemctl restart citadelbuy-api
  systemctl restart citadelbuy-worker
  # Or for Kubernetes
  kubectl rollout restart deployment api
  kubectl rollout restart deployment worker
  ```

- [ ] **Run Smoke Tests**
  ```bash
  ./scripts/smoke-tests.sh
  ```

- [ ] **Test Critical Paths**
  - User registration and login
  - Product browsing
  - Add to cart
  - Checkout process
  - Order creation
  - Admin panel access
  - Vendor dashboard

### 3. Performance Validation

```sql
-- Update table statistics
ANALYZE;

-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Verify index usage (run queries first)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 30;

-- Check for slow queries
SELECT
  queryid,
  calls,
  total_exec_time,
  mean_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 4. Monitoring Setup

- [ ] **Configure Alerts**
  - Database connection pool
  - Query performance
  - Error rates
  - Lock timeouts

- [ ] **Enable Query Logging** (temporarily)
  ```sql
  ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
  SELECT pg_reload_conf();
  ```

---

## Rollback Procedures

### Option 1: Rollback Specific Migration

**Use Case:** Single migration failed or caused issues

```bash
cd C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization/apps/api

# Check migration history
npx prisma migrate status

# Rollback last migration (WARNING: Data loss possible)
npx prisma migrate resolve --rolled-back <migration_name>

# Example:
npx prisma migrate resolve --rolled-back 20251117022438_add_password_reset_table
```

**NOTE:** Prisma doesn't have automatic rollback. You'll need to:
1. Mark migration as rolled back
2. Manually write and execute DOWN migration SQL
3. Remove migration from `_prisma_migrations` table

### Option 2: Full Database Restore

**Use Case:** Multiple migrations failed or major issues detected

```bash
# 1. Stop application
systemctl stop citadelbuy-api citadelbuy-worker

# 2. Drop current database (DESTRUCTIVE!)
dropdb citadelbuy_production

# 3. Recreate database
createdb citadelbuy_production

# 4. Restore from backup
psql citadelbuy_production < backup_20251204_120000.sql

# 5. Verify restore
psql citadelbuy_production -c "SELECT count(*) FROM users;"

# 6. Restart application
systemctl start citadelbuy-api citadelbuy-worker
```

### Option 3: Point-in-Time Recovery (If Using PostgreSQL WAL)

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Restore from base backup
rm -rf /var/lib/postgresql/data
tar -xzf base_backup.tar.gz -C /var/lib/postgresql/data

# Configure recovery
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'cp /backup/wal/%f %p'
recovery_target_time = '2025-12-04 12:00:00'
EOF

# Start PostgreSQL (will recover to specified time)
systemctl start postgresql

# Verify recovery
psql -c "SELECT pg_last_xact_replay_timestamp();"
```

### Manual Rollback SQL Templates

#### Rollback: add_performance_indexes

```sql
-- Drop all indexes created by the migration
DO $$
DECLARE
  idx_name text;
BEGIN
  FOR idx_name IN
    SELECT indexname FROM pg_indexes
    WHERE indexname LIKE 'idx_%'
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', idx_name);
  END LOOP;
END $$;
```

#### Rollback: add_privacy_consent

```sql
-- Drop privacy tables
DROP TABLE IF EXISTS "ConsentLog" CASCADE;
DROP TABLE IF EXISTS "DataDeletionRequest" CASCADE;
DROP TABLE IF EXISTS "DataExportRequest" CASCADE;
DROP TABLE IF EXISTS "AgreedTerms" CASCADE;

-- Remove columns from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "processingRestricted";
```

---

## Troubleshooting

### Issue 1: Migration Timeout

**Symptom:** Migration hangs or times out

**Solution:**
```bash
# Increase statement timeout
psql $DATABASE_URL -c "SET statement_timeout = '600s';"

# Or set globally
ALTER DATABASE citadelbuy_production SET statement_timeout = '600s';
```

### Issue 2: Lock Contention

**Symptom:** Migration waits for locks

**Diagnosis:**
```sql
-- Check for blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Solution:**
```sql
-- Kill blocking query (use with caution!)
SELECT pg_terminate_backend(blocking_pid);
```

### Issue 3: Out of Disk Space

**Symptom:** "No space left on device" error

**Solution:**
```bash
# Check disk usage
df -h

# Free up space
# 1. Clear old WAL files
find /var/lib/postgresql/data/pg_wal -mtime +7 -delete

# 2. Vacuum old data
psql $DATABASE_URL -c "VACUUM FULL;"

# 3. Clear temporary files
rm -rf /tmp/postgresql/*
```

### Issue 4: Foreign Key Constraint Violation

**Symptom:** Migration fails with FK constraint error

**Diagnosis:**
```sql
-- Find orphaned records
SELECT * FROM child_table
WHERE foreign_key_column NOT IN (SELECT id FROM parent_table);
```

**Solution:**
```sql
-- Option 1: Fix data
DELETE FROM child_table WHERE foreign_key_column NOT IN (SELECT id FROM parent_table);

-- Option 2: Temporarily disable constraints (use with caution!)
SET session_replication_role = replica;
-- Run migration
SET session_replication_role = DEFAULT;
```

### Issue 5: Duplicate Key Errors

**Symptom:** "duplicate key value violates unique constraint"

**Solution:**
```sql
-- Find duplicates
SELECT column_name, COUNT(*)
FROM table_name
GROUP BY column_name
HAVING COUNT(*) > 1;

-- Remove duplicates (keep first occurrence)
DELETE FROM table_name a USING (
  SELECT MIN(ctid) as ctid, column_name
  FROM table_name
  GROUP BY column_name HAVING COUNT(*) > 1
) b
WHERE a.column_name = b.column_name
AND a.ctid <> b.ctid;
```

### Issue 6: Table Name Case Sensitivity

**Symptom:** Migration fails with "relation does not exist"

**Solution:**
```sql
-- PostgreSQL is case-sensitive for quoted identifiers
-- Check actual table names
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Fix migration by adjusting table names
-- For add_privacy_consent, change "User" to "users"
```

---

## Emergency Contacts

### On-Call Support

- **Database Administrator:** [Contact Info]
- **DevOps Lead:** [Contact Info]
- **Engineering Manager:** [Contact Info]

### Escalation Path

1. Alert team in Slack channel: #citadelbuy-incidents
2. Page on-call DBA if no response in 15 minutes
3. Escalate to Engineering Manager if unresolved in 30 minutes

---

## Post-Migration Tasks

- [ ] Remove maintenance mode
- [ ] Resume background jobs
- [ ] Monitor error logs for 24 hours
- [ ] Update documentation
- [ ] Schedule post-mortem meeting
- [ ] Archive backups
- [ ] Update runbook with lessons learned

---

## Additional Resources

- [Prisma Migration Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL ALTER TABLE Reference](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Database Maintenance Guide](./DATABASE_MAINTENANCE.md)
- [Backup Strategy Guide](./DATABASE_BACKUP_STRATEGY.md)

---

**Document Version:** 1.0
**Last Updated:** December 4, 2025
**Author:** CitadelBuy Platform Team
