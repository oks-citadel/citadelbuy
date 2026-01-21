# Broxiva Database Migration Guide

Complete guide for managing database migrations safely in development, staging, and production environments.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Migration Workflow](#migration-workflow)
- [Development Environment](#development-environment)
- [Production Environment](#production-environment)
- [Creating New Migrations](#creating-new-migrations)
- [Rollback Procedures](#rollback-procedures)
- [Common Issues](#common-issues-and-fixes)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Broxiva uses **Prisma ORM** for database schema management and migrations. This guide covers all aspects of database migration management.

### Current Status

```bash
# Check current migration status
npx prisma migrate status
```

### Pending Migrations

As of the last check, the following migrations are pending:

- `20251117022438_add_password_reset_table` - Password reset functionality
- `20251118154530_sync_schema_phase30` - Schema synchronization
- `20251119004754_add_vendor_management_system` - Vendor management features
- `20251202_add_owner_relation_and_role_permissions` - Organization permissions
- `add_performance_indexes` - Database performance optimizations
- `add_privacy_consent` - Privacy and consent features
- `organization_module` - Full organization module

## Quick Start

### Development

```bash
# Run all pending migrations
npm run migrate

# Or use the migration script
./scripts/run-migrations.sh dev
```

### Production

```bash
# ALWAYS create a backup first!
# Then run migrations using the script
./scripts/run-migrations.sh prod
```

## Migration Workflow

### 1. Pre-Migration Checklist

Before running any migration:

- [ ] Review the schema changes in `prisma/schema.prisma`
- [ ] Check pending migrations: `npx prisma migrate status`
- [ ] Ensure database backup exists
- [ ] Verify database connection
- [ ] Review migration files in `prisma/migrations/`
- [ ] Test migrations in development/staging first
- [ ] Plan downtime window (if needed)
- [ ] Notify team members

### 2. Migration Process Flow

```
Check Status → Create Backup → Run Migration → Validate → Test → Monitor
```

### 3. Post-Migration Checklist

After migration completes:

- [ ] Verify all migrations applied successfully
- [ ] Run application health checks
- [ ] Test critical user flows
- [ ] Monitor database performance
- [ ] Check application logs for errors
- [ ] Update deployment documentation

## Development Environment

### Running Migrations in Development

Development migrations create a new migration and apply it:

```bash
# Interactive migration (recommended)
npx prisma migrate dev

# Named migration
npx prisma migrate dev --name add_new_feature

# Skip generating Prisma Client
npx prisma migrate dev --skip-generate

# Create migration without applying
npx prisma migrate dev --create-only
```

### Development Best Practices

1. **Test migrations locally first**
   ```bash
   # Reset database and apply all migrations
   npx prisma migrate reset
   ```

2. **Use descriptive migration names**
   - ✅ Good: `add_user_email_verification`
   - ❌ Bad: `update_schema` or `changes`

3. **Review generated SQL**
   - Check `prisma/migrations/[timestamp]_[name]/migration.sql`
   - Ensure no data loss or breaking changes

4. **Seed data after migration**
   ```bash
   npm run db:seed
   ```

## Production Environment

### Pre-Production Steps

1. **Test in Staging First**
   ```bash
   # Apply migrations to staging
   ./scripts/run-migrations.sh staging
   ```

2. **Create Production Backup**
   ```bash
   # The script handles this automatically
   ./scripts/run-migrations.sh prod
   ```

3. **Schedule Maintenance Window**
   - Inform users of potential downtime
   - Schedule during low-traffic periods
   - Have rollback plan ready

### Running Production Migrations

**IMPORTANT: Never run `prisma migrate dev` in production!**

```bash
# Recommended: Use the migration script
./scripts/run-migrations.sh prod

# Manual method (only if script unavailable)
npx prisma migrate deploy
```

The production migration script will:
1. Check database connectivity
2. Create automatic backup
3. Display pending migrations
4. Ask for confirmation
5. Apply migrations
6. Validate results
7. Run health checks
8. Provide rollback instructions

### Production Safety Features

- **Automatic Backups**: Created before each migration
- **Health Checks**: Validates database after migration
- **Rollback Instructions**: Generated for each migration
- **Confirmation Prompts**: Prevents accidental production changes
- **Detailed Logging**: All actions logged with timestamps

## Creating New Migrations

### Step 1: Modify Schema

Edit `prisma/schema.prisma`:

```prisma
model NewFeature {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("new_features")
}
```

### Step 2: Create Migration

```bash
# Create and apply migration in dev
npx prisma migrate dev --name add_new_feature

# Create without applying (for review)
npx prisma migrate dev --create-only --name add_new_feature
```

### Step 3: Review Generated SQL

```bash
# View the migration file
cat prisma/migrations/[timestamp]_add_new_feature/migration.sql
```

### Step 4: Test Migration

```bash
# Reset and reapply all migrations
npx prisma migrate reset

# Verify everything works
npm run test:e2e
```

### Step 5: Commit Migration

```bash
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: add new feature model and migration"
```

## Rollback Procedures

### Automatic Rollback (Recent Migration)

If migration just completed and failed validation:

```bash
# 1. Stop application
npm run stop

# 2. Restore from latest backup (auto-generated by script)
export PGPASSWORD="your_db_password"
pg_restore -h localhost -p 5432 -U broxiva -d broxiva_dev \
  --clean --if-exists \
  ./backups/migration_backup_[timestamp].sql

# 3. Verify restoration
npx prisma migrate status

# 4. Restart application
npm run start
```

### Manual Rollback (Specific Migration)

```bash
# 1. Identify the migration to rollback
npx prisma migrate status

# 2. Mark migration as rolled back
npx prisma migrate resolve --rolled-back "migration_name"

# 3. Fix schema issues in Prisma
# Edit prisma/schema.prisma to match database state

# 4. Create corrective migration
npx prisma migrate dev --name fix_migration_issue
```

### Emergency Rollback (Production)

**ONLY USE IN EMERGENCIES**

```bash
# 1. Stop application immediately
pm2 stop all  # or your process manager

# 2. Restore from last known good backup
# Use backup created before migration
pg_restore -h [host] -p [port] -U [user] -d [database] \
  --clean --if-exists \
  ./backups/migration_backup_[timestamp].sql

# 3. Verify database state
psql -h [host] -U [user] -d [database] -c "\dt"

# 4. Generate correct Prisma Client
npx prisma generate

# 5. Restart application
pm2 start all
```

### Rollback Verification

After rollback, verify:

```bash
# Check migration status
npx prisma migrate status

# Test database connectivity
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users;"

# Run health checks
npm run test:e2e

# Check application logs
tail -f logs/application.log
```

## Common Issues and Fixes

### Issue 1: Migration Out of Sync

**Error**: "Your database schema is not in sync"

**Solution**:
```bash
# Option A: Reset and reapply (DEV ONLY)
npx prisma migrate reset

# Option B: Generate new baseline (if needed)
npx prisma migrate resolve --applied "migration_name"

# Option C: Force sync (careful!)
npx prisma db push --skip-generate
```

### Issue 2: Failed Migration

**Error**: "Migration failed to apply"

**Solution**:
```bash
# 1. Check the error in logs
cat logs/migration_[timestamp].log

# 2. Mark as rolled back
npx prisma migrate resolve --rolled-back "migration_name"

# 3. Fix the schema
# Edit prisma/schema.prisma

# 4. Create corrective migration
npx prisma migrate dev --name fix_failed_migration
```

### Issue 3: Pending Migrations Block Deploy

**Error**: "Pending migrations must be applied"

**Solution**:
```bash
# Apply pending migrations
npx prisma migrate deploy

# If needed, skip to specific migration
npx prisma migrate deploy --skip-migrations="migration1,migration2"
```

### Issue 4: Schema Drift Detected

**Error**: "Database schema has drifted"

**Solution**:
```bash
# Check what drifted
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# Fix: Create migration from current state
npx prisma migrate dev --name fix_schema_drift
```

### Issue 5: Duplicate Migrations

**Error**: "Migration already exists"

**Solution**:
```bash
# Remove duplicate migration file
rm -rf prisma/migrations/[timestamp]_duplicate_name

# Reset migration history (DEV ONLY)
npx prisma migrate reset
```

### Issue 6: Cannot Connect to Database

**Error**: "Can't reach database server"

**Solution**:
```bash
# 1. Check DATABASE_URL in .env
echo $DATABASE_URL

# 2. Verify database is running
pg_isready -h localhost -p 5432

# 3. Test connection
psql $DATABASE_URL -c "SELECT 1;"

# 4. Check firewall/network
telnet localhost 5432
```

## Best Practices

### Schema Design

1. **Always use migrations** - Never manually alter production database
2. **Make migrations atomic** - One logical change per migration
3. **Keep migrations small** - Easier to review and rollback
4. **Use descriptive names** - Clear purpose in migration name
5. **Review generated SQL** - Ensure it matches intent

### Migration Safety

1. **Test in staging first** - Always test before production
2. **Create backups** - Automated or manual before each migration
3. **Plan for rollback** - Have rollback procedure ready
4. **Use transactions** - Ensure all-or-nothing application
5. **Monitor performance** - Watch for slow queries or locks

### Data Safety

1. **Avoid data loss** - Use `ALTER TABLE` carefully
2. **Default values** - Provide defaults for new NOT NULL columns
3. **Backwards compatibility** - Support old and new schema temporarily
4. **Gradual rollout** - Multi-step migrations for breaking changes
5. **Validate data** - Check data integrity after migration

### Production Guidelines

1. **Schedule downtime** - For complex migrations
2. **Monitor actively** - Watch logs and metrics during migration
3. **Have team ready** - On-call support during migration window
4. **Document everything** - Log all actions and decisions
5. **Communicate status** - Keep stakeholders informed

## Advanced Topics

### Zero-Downtime Migrations

For large tables or high-traffic applications:

1. **Phase 1: Additive Changes**
   ```sql
   -- Add new column (nullable first)
   ALTER TABLE users ADD COLUMN email_verified BOOLEAN;
   ```

2. **Phase 2: Backfill Data**
   ```sql
   -- Update existing rows in batches
   UPDATE users SET email_verified = false
   WHERE email_verified IS NULL
   LIMIT 1000;
   ```

3. **Phase 3: Apply Constraints**
   ```sql
   -- Make column NOT NULL
   ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
   ```

4. **Phase 4: Cleanup**
   ```sql
   -- Remove old columns after full deployment
   ALTER TABLE users DROP COLUMN old_field;
   ```

### Custom Migration SQL

Add custom SQL to migrations:

```bash
# Create empty migration
npx prisma migrate dev --create-only --name custom_changes

# Edit migration file and add custom SQL
echo "-- Custom index" >> prisma/migrations/[timestamp]_custom/migration.sql
echo "CREATE INDEX CONCURRENTLY idx_users_email ON users(email);" >> prisma/migrations/[timestamp]_custom/migration.sql

# Apply migration
npx prisma migrate dev
```

### Migration Testing

Create test suite for migrations:

```typescript
// test/migrations.test.ts
describe('Database Migrations', () => {
  it('should apply all migrations', async () => {
    await execSync('npx prisma migrate deploy');
    // Verify schema
  });

  it('should seed test data', async () => {
    await execSync('npm run db:seed');
    // Verify data
  });
});
```

## Monitoring and Maintenance

### Health Check Script

```bash
#!/bin/bash
# scripts/check-migration-health.sh

echo "Checking migration status..."
npx prisma migrate status

echo "Checking database connectivity..."
npx prisma db execute --stdin <<< "SELECT 1;"

echo "Checking table counts..."
psql $DATABASE_URL <<EOF
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;
EOF
```

### Regular Maintenance

```bash
# Weekly: Check for pending migrations
npx prisma migrate status

# Monthly: Analyze and vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Quarterly: Review and cleanup old backups
ls -lh backups/ | tail -20
```

## Getting Help

### Prisma Documentation

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Migration Troubleshooting](https://www.prisma.io/docs/guides/database/production-troubleshooting)

### Team Resources

- **Database Admin**: Contact DB team for production access
- **DevOps**: For CI/CD pipeline issues
- **Slack Channel**: #broxiva-database

### Emergency Contacts

- **On-Call DBA**: [Contact info]
- **DevOps Lead**: [Contact info]
- **CTO**: [Contact info]

## Appendix

### Migration Script Reference

```bash
# Development
./scripts/run-migrations.sh dev

# Staging
./scripts/run-migrations.sh staging

# Production
./scripts/run-migrations.sh prod
```

### Useful Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (DB GUI)
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Push schema to DB (without migration)
npx prisma db push

# Pull schema from DB
npx prisma db pull

# Seed database
npm run db:seed
```

### Database Backup Commands

```bash
# Create backup
pg_dump -h localhost -p 5432 -U broxiva broxiva_dev > backup.sql

# Create compressed backup
pg_dump -h localhost -p 5432 -U broxiva broxiva_dev | gzip > backup.sql.gz

# Restore backup
psql -h localhost -p 5432 -U broxiva broxiva_dev < backup.sql

# Restore compressed backup
gunzip -c backup.sql.gz | psql -h localhost -U broxiva broxiva_dev
```

### Migration File Anatomy

```
prisma/migrations/
  └── 20251203_000000_add_feature/
      ├── migration.sql          # SQL commands
      └── migration.json         # Metadata (internal)
```

### Sample Migration SQL

```sql
-- CreateTable
CREATE TABLE "new_features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "new_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "new_features_name_idx" ON "new_features"("name");
```

---

## Version History

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.0     | 2024-12-04 | Initial migration guide                      |

---

**Last Updated**: December 4, 2024
**Maintained By**: Broxiva Engineering Team
