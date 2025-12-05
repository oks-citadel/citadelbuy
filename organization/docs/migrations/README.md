# CitadelBuy Database Migration Documentation

## Overview

This directory contains comprehensive documentation and tooling for managing database migrations for the CitadelBuy platform. There are currently **7 pending migrations** that need to be applied to update the database schema from the base version to the full feature set.

---

## Quick Start

### For Developers (Non-Production)

```bash
# 1. Navigate to project directory
cd C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization

# 2. Set database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/citadelbuy_dev"

# 3. Run migrations with automatic backup
./scripts/apply-migrations.sh

# 4. Verify migrations
./scripts/verify-migrations.sh --detailed
```

### For Production Deployment

**DO NOT run migrations directly in production without following the runbook!**

1. Read the [Migration Production Runbook](../MIGRATION_PRODUCTION_RUNBOOK.md)
2. Follow the pre-migration checklist
3. Schedule maintenance window
4. Execute according to the runbook procedures

---

## Documentation Index

### Primary Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [**MIGRATION_EXECUTION_GUIDE.md**](../MIGRATION_EXECUTION_GUIDE.md) | Detailed step-by-step migration procedures | DBAs, DevOps Engineers |
| [**MIGRATION_SCHEMA_CHANGES.md**](../MIGRATION_SCHEMA_CHANGES.md) | Complete breakdown of all schema changes | Developers, Architects |
| [**MIGRATION_PRODUCTION_RUNBOOK.md**](../MIGRATION_PRODUCTION_RUNBOOK.md) | Production deployment operational guide | DevOps, Operations Team |

### Supporting Documentation

- [Database Maintenance Guide](../DATABASE_MAINTENANCE.md)
- [Database Backup Strategy](../DATABASE_BACKUP_STRATEGY.md)
- [Security Setup](../SECURITY_SETUP.md)

---

## Migration Overview

### Pending Migrations Summary

| # | Name | Date | Duration | Breaking | Priority |
|---|------|------|----------|----------|----------|
| 1 | password_reset_table | 2025-11-17 | 2-3 min | No | High |
| 2 | phase30_sync | 2025-11-18 | 10-15 min | **YES** | Critical |
| 3 | vendor_management | 2025-11-19 | 5-7 min | No | High |
| 4 | roles_permissions | 2025-12-02 | 2-3 min | No | Medium |
| 5 | performance_indexes | 2025-12 | 15-20 min | No | Low |
| 6 | privacy_consent | 2025-12 | 3-5 min | Potential | High |
| 7 | organization_module | 2025-12 | 8-10 min | **YES** | Critical |

**Total Estimated Duration:** 45-63 minutes

### What These Migrations Add

**Core Features:**
- Password reset functionality
- Advanced product management (variants, wishlists)
- Comprehensive vendor management system
- Multi-tenant organization support
- Role-based access control (RBAC)

**E-commerce Features:**
- Advertising platform
- Subscription management
- Buy Now Pay Later (BNPL)
- Gift cards and store credit
- Deals and promotions
- Loyalty programs and rewards

**Analytics & Tracking:**
- User behavior tracking
- Product analytics
- Vendor performance metrics
- Search analytics
- Conversion tracking

**Compliance:**
- GDPR/CCPA compliance tools
- Privacy consent management
- Data export/deletion requests
- Audit logging

**Performance:**
- 300+ performance indexes
- Query optimization
- Covering indexes
- GIN indexes for full-text search

**Internationalization:**
- Multi-language support
- Product translations
- Category translations

---

## Available Scripts

### C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization/scripts/

#### apply-migrations.sh

Automated migration script with backup and verification.

```bash
# Dry run to see what would happen
./scripts/apply-migrations.sh --dry-run

# Apply migrations in development
./scripts/apply-migrations.sh --environment dev

# Apply in production (with confirmation)
./scripts/apply-migrations.sh --environment production

# Skip backup (development only!)
./scripts/apply-migrations.sh --skip-backup --environment dev

# Automated CI/CD mode
./scripts/apply-migrations.sh --auto-approve --environment staging
```

**Features:**
- Automatic database backup before migration
- Migration verification
- Rollback support
- Detailed logging
- Progress monitoring

#### verify-migrations.sh

Comprehensive migration verification script.

```bash
# Basic verification
./scripts/verify-migrations.sh

# Detailed verification with statistics
./scripts/verify-migrations.sh --detailed

# Verify and attempt to fix minor issues
./scripts/verify-migrations.sh --fix --detailed

# Quiet mode (errors only)
./scripts/verify-migrations.sh --quiet
```

**Checks:**
- Migration status
- Table counts
- ENUM types
- Index verification
- Foreign key constraints
- Data integrity
- Core table existence
- Organization module
- Privacy compliance tables

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

Migration 7 (organization_module)  ⚠️ MUST BE BEFORE #4
  └─> Depends on: Migration 1
  └─> References: users table

Migration 4 (roles_permissions)
  └─> Depends on: Migration 7
  └─> References: organization_roles, permissions

Migration 6 (privacy_consent)
  └─> Depends on: Migration 1
  └─> Modifies: users table

Migration 5 (performance_indexes)
  └─> Depends on: All previous migrations
  └─> Should be applied LAST
```

**Correct Order:**
1. password_reset_table
2. phase30_sync
3. vendor_management
4. **organization_module** (before roles_permissions!)
5. roles_permissions
6. privacy_consent
7. performance_indexes (last for optimal performance)

---

## Breaking Changes

### High Impact (Require Application Updates)

#### Migration 2: Phase 30 Schema Sync

**Changes:**
- Adds 9 columns to `orders` table
- Adds 3 columns to `reviews` table
- Creates 43+ new tables

**Application Updates Required:**
- Update order models
- Implement review moderation
- Add subscription management
- Integrate advertising platform
- Implement loyalty program

#### Migration 7: Organization Module

**Changes:**
- Adds multi-tenant architecture
- Creates organization hierarchy
- Implements RBAC system

**Application Updates Required:**
- Add organization context to all requests
- Implement tenant isolation
- Update authentication/authorization
- Scope all queries by organizationId

### Medium Impact

#### Migration 6: Privacy & Consent

**WARNING:** Migration file may reference incorrect table name.

**Fix Required Before Migration:**
```bash
# The migration references "User" but table is "users"
sed -i 's/"User"/"users"/g' \
  apps/api/prisma/migrations/add_privacy_consent/migration.sql
```

---

## Pre-Migration Checklist

### Required Before Migration

- [ ] **Backup Database**
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Test on Staging**
  - Apply migrations to staging environment
  - Run full test suite
  - Verify performance
  - Test rollback procedure

- [ ] **Check Disk Space**
  ```bash
  df -h
  # Ensure at least 20% free space
  ```

- [ ] **Verify Database Health**
  ```sql
  -- Check for table bloat
  -- Check for long-running transactions
  -- Verify replication lag (if applicable)
  ```

- [ ] **Schedule Downtime**
  - Recommended: 2-hour window for production
  - Notify users 48 hours in advance
  - Prepare status page updates

- [ ] **Team Coordination**
  - DBA available
  - DevOps on-call
  - Engineering backup support

### Known Issues to Address

1. **Privacy Migration Table Name**
   - Migration references "User" instead of "users"
   - Fix: Edit migration file before running

2. **Organization Module Dependency**
   - Migration 4 (roles_permissions) depends on Migration 7 (organization_module)
   - Ensure correct execution order

3. **Performance Index Duration**
   - Migration 5 can take 15-20 minutes
   - Plan for extended downtime
   - Consider running during low-traffic period

---

## Post-Migration Tasks

### Immediate Actions

1. **Verify Migration Success**
   ```bash
   ./scripts/verify-migrations.sh --detailed
   ```

2. **Update Table Statistics**
   ```sql
   ANALYZE;
   ```

3. **Test Critical Paths**
   - User registration/login
   - Product browsing
   - Checkout flow
   - Order creation
   - Admin panel access

### Within 24 Hours

1. **Monitor Performance**
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_statements
   ORDER BY mean_exec_time DESC LIMIT 10;

   -- Verify index usage
   SELECT * FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

2. **Data Integrity Validation**
   - Check for orphaned records
   - Verify foreign key relationships
   - Validate constraint integrity

3. **Initialize Default Data**
   ```sql
   -- Create default loyalty tiers
   -- Set up initial subscription plans
   -- Initialize languages
   -- Create system roles and permissions
   ```

### Within 1 Week

1. **Performance Optimization**
   - Review slow query log
   - Adjust indexes based on usage patterns
   - Optimize frequently-used queries

2. **Data Migration**
   - Migrate existing vendors to vendor_profiles
   - Create organizations for existing vendors
   - Set organization owners
   - Calculate historical metrics

3. **Feature Rollout**
   - Enable new features gradually
   - Monitor adoption and performance
   - Gather user feedback

---

## Rollback Procedures

### Option 1: Restore from Backup (Recommended)

```bash
# Stop application
systemctl stop citadelbuy-api citadelbuy-worker

# Drop current database
dropdb citadelbuy_production

# Recreate database
createdb citadelbuy_production

# Restore from backup
psql citadelbuy_production < backup_20251204_120000.sql

# Restart application
systemctl start citadelbuy-api citadelbuy-worker
```

### Option 2: Prisma Migration Rollback

```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Manually execute rollback SQL
# (See MIGRATION_EXECUTION_GUIDE.md for rollback SQL templates)
```

### Option 3: Point-in-Time Recovery

If using PostgreSQL WAL (Write-Ahead Logging):

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Restore from base backup + WAL
# Configure recovery to specific timestamp
# See MIGRATION_PRODUCTION_RUNBOOK.md for details
```

---

## Troubleshooting

### Common Issues

#### Issue: Migration Timeout

**Solution:**
```sql
-- Increase timeout
SET statement_timeout = '600s';
ALTER DATABASE citadelbuy SET statement_timeout = '600s';
```

#### Issue: Lock Contention

**Diagnosis:**
```sql
-- Find blocking queries
SELECT * FROM pg_stat_activity
WHERE wait_event IS NOT NULL;
```

**Solution:**
```sql
-- Terminate blocking query (use with caution!)
SELECT pg_terminate_backend(<pid>);
```

#### Issue: Out of Disk Space

**Solution:**
```bash
# Free up space
find /var/lib/postgresql/data/pg_wal -mtime +7 -delete
VACUUM FULL;
```

#### Issue: Foreign Key Violation

**Diagnosis:**
```sql
-- Find orphaned records
SELECT * FROM child_table
WHERE foreign_key_id NOT IN (SELECT id FROM parent_table);
```

**Solution:**
```sql
-- Clean up orphaned records
DELETE FROM child_table
WHERE foreign_key_id NOT IN (SELECT id FROM parent_table);
```

### Getting Help

- **Documentation:** Review this documentation set
- **Internal Slack:** #citadelbuy-infrastructure
- **On-Call DBA:** [Contact Information]
- **Engineering Manager:** [Contact Information]

---

## Performance Benchmarks

### Expected Performance Impact

**Query Performance:**
- Common queries: 50-90% faster
- Join operations: 60-80% faster
- Filtered queries: 70-95% faster

**Write Performance:**
- INSERTs: 5-10% slower (due to indexes)
- UPDATEs: 8-12% slower (due to indexes)
- Overall impact: Negligible for most workloads

**Storage:**
- Database size increase: 10-15%
- Index storage: ~2-3GB (for large databases)

### Monitoring Queries

```sql
-- Top 10 slowest queries
SELECT
  queryid,
  calls,
  mean_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Most frequently executed queries
SELECT
  queryid,
  calls,
  total_exec_time,
  query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;

-- Unused indexes (consider removing after 1 week)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Schema Statistics

### Before Migrations

- Tables: ~10
- ENUM Types: 2
- Indexes: ~20
- Foreign Keys: ~10

### After All Migrations

- Tables: 110+
- ENUM Types: 30+
- Indexes: 320+
- Foreign Keys: 150+
- Database Size: 5-20GB (varies by data volume)

---

## Additional Resources

### Internal Documentation

- [API Documentation](../api/)
- [Architecture Decision Records](../ADR/)
- [Deployment Guide](../DEPLOYMENT_RUNBOOK.md)
- [Security Guidelines](../SECURITY_SETUP.md)

### External Resources

- [Prisma Migration Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-12-04 | Initial documentation | CitadelBuy Team |

---

## Support

For questions or issues related to database migrations:

1. Check this documentation first
2. Review the troubleshooting section
3. Consult with DBA or DevOps team
4. Open an issue in the project repository

---

**Last Updated:** December 4, 2025
**Maintained By:** CitadelBuy Platform Team
**Next Review:** After production deployment
