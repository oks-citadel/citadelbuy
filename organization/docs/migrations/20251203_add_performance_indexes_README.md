# Performance Indexes Migration

## Overview

This migration adds comprehensive database indexes to optimize query performance across the Broxiva platform. The indexes are designed to support common query patterns and improve response times for frequently accessed data.

## What This Migration Does

### Indexes Added

- **Core Entities**: Products, Orders, Users, Reviews, Categories
- **Shopping Features**: Carts, Wishlists, Cart Abandonment
- **Inventory**: Stock management, Warehouses, Transfers
- **Shipping**: Shipments, Tracking, Returns & Refunds
- **Tax System**: Tax rates, Calculations
- **Vendor Management**: Profiles, Payouts, Performance
- **Marketing**: Ads, Coupons, Deals, Loyalty
- **Security**: Audit logs, API keys, Sessions
- **Support**: Tickets, Messages, Chat
- **Organization**: Members, Roles, Audit
- **Analytics**: Search queries, Product views, Reports

### Index Types

1. **Single-column indexes** - For simple filtering
2. **Composite indexes** - For complex queries with multiple conditions
3. **Partial indexes** - For commonly filtered subsets
4. **Covering indexes** - Include frequently accessed columns
5. **GIN indexes** - For array and full-text search

## Performance Impact

### Expected Improvements

- ⚡ **50-90% faster** queries on indexed columns
- ⚡ **10x faster** complex JOINs with composite indexes
- ⚡ **Instant** lookups on unique constraints
- ⚡ **Reduced** database CPU usage

### Trade-offs

- 💾 **10-15% additional storage** for indexes
- 🐌 **Slightly slower** INSERT/UPDATE operations (typically < 5%)
- 🔧 **Increased maintenance** overhead (VACUUM, REINDEX)

## Prerequisites

Before applying this migration:

1. **Backup your database**:
   ```bash
   pg_dump broxiva > broxiva_backup_$(date +%Y%m%d).sql
   ```

2. **Check available disk space**:
   ```sql
   SELECT pg_size_pretty(pg_database_size('broxiva'));
   ```
   Ensure you have at least 15% additional space available.

3. **Schedule during low traffic period**:
   - Index creation can take time on large tables
   - Consider maintenance window for production

## How to Apply

### Method 1: Using Prisma Migrate (Recommended)

```bash
# Navigate to API directory
cd organization/apps/api

# Generate Prisma client (if not already done)
npx prisma generate

# Apply migration
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

### Method 2: Manual SQL Execution

```bash
# Connect to database
psql -U postgres -d broxiva

# Run migration
\i prisma/migrations/add_performance_indexes/migration.sql

# Verify indexes created
\di
```

### Method 3: Using Docker

```bash
# If using Docker Compose
docker-compose exec postgres psql -U postgres -d broxiva -f /migrations/add_performance_indexes/migration.sql
```

## Verification

After applying the migration, verify the indexes:

```sql
-- Check all indexes
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
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Verify specific indexes exist
SELECT indexname FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY indexname;
```

## Post-Migration Steps

### 1. Update Table Statistics

After creating indexes, update PostgreSQL statistics:

```sql
-- Analyze all tables
ANALYZE;

-- Or analyze specific tables
ANALYZE products;
ANALYZE orders;
ANALYZE users;
```

### 2. Monitor Index Usage

Check that indexes are being used:

```sql
-- View index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 3. Test Query Performance

Run EXPLAIN ANALYZE on critical queries:

```sql
-- Test product search
EXPLAIN ANALYZE
SELECT * FROM products
WHERE vendor_id = '...' AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;

-- Test order history
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = '...'
ORDER BY created_at DESC
LIMIT 10;
```

Look for:
- Index Scan (good) vs Seq Scan (bad for large tables)
- Reduced execution time
- Lower cost estimates

## Monitoring

### Set Up Continuous Monitoring

**1. Enable pg_stat_statements extension**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**2. Monitor slow queries**:
```sql
SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**3. Check for unused indexes** (after 1 week):
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Rollback

If you need to rollback this migration:

**Option 1: Drop all new indexes**:
```sql
-- Generate DROP commands
SELECT 'DROP INDEX IF EXISTS ' || indexname || ';'
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public';

-- Copy and execute the generated commands
```

**Option 2: Restore from backup**:
```bash
# Stop application
docker-compose stop api

# Restore database
dropdb broxiva
createdb broxiva
psql broxiva < broxiva_backup_20251203.sql

# Restart application
docker-compose start api
```

## Troubleshooting

### Issue: Migration Taking Too Long

**Solution**: Create indexes with CONCURRENTLY flag (doesn't lock table):
```sql
-- Instead of
CREATE INDEX idx_name ON table(column);

-- Use
CREATE INDEX CONCURRENTLY idx_name ON table(column);
```

### Issue: Disk Space Full

**Symptoms**: Migration fails with "disk full" error

**Solution**:
1. Free up disk space
2. Create indexes in batches
3. Use compressed tables if available

### Issue: Performance Degraded After Migration

**Causes**:
- Too many indexes on write-heavy tables
- Index bloat

**Solution**:
```sql
-- Check table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex if needed
REINDEX TABLE table_name;
```

### Issue: Queries Still Slow

**Diagnosis**:
```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM products WHERE vendor_id = '...';
```

**Solutions**:
- Ensure query matches index column order
- Update table statistics: `ANALYZE table_name;`
- Check for index bloat
- Consider adjusting PostgreSQL configuration

## Maintenance Schedule

After this migration, establish regular maintenance:

**Daily**:
- Monitor slow queries
- Check autovacuum activity

**Weekly**:
- Review index usage statistics
- Identify and drop unused indexes

**Monthly**:
- Reindex large tables/indexes
- Vacuum full on bloated tables (during maintenance window)

**Quarterly**:
- Performance benchmark
- Index strategy review
- Capacity planning

## Additional Resources

- **Index Strategy Documentation**: `prisma/INDEX_STRATEGY.md`
- **Database Maintenance Guide**: `docs/DATABASE_MAINTENANCE.md`
- **Backup Strategy**: `docs/DATABASE_BACKUP_STRATEGY.md`
- **PostgreSQL Index Documentation**: https://www.postgresql.org/docs/current/indexes.html

## Support

If you encounter issues:

1. Check PostgreSQL logs: `/var/log/postgresql/postgresql-14-main.log`
2. Review application logs for query errors
3. Contact DevOps team: devops@broxiva.com
4. Create incident ticket with:
   - Error messages
   - Query plans (EXPLAIN ANALYZE output)
   - Table sizes
   - Index statistics

---

**Migration Created**: December 2025
**Estimated Duration**: 10-30 minutes (depending on table sizes)
**Risk Level**: Low (read-only operations)
**Reversible**: Yes
