# Database Migration Quick Reference

Quick reference guide for common migration tasks in Broxiva.

## 🚀 Quick Start

### Development
```bash
# Run all pending migrations
npm run migrate
# OR
./scripts/run-migrations.sh dev
```

### Production
```bash
# Run with automatic backup
./scripts/run-migrations.sh prod
```

## 📝 Common Commands

### Check Migration Status
```bash
# See pending migrations
npx prisma migrate status

# See what's different
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma
```

### Create New Migration
```bash
# Create and apply migration
npx prisma migrate dev --name descriptive_name

# Create without applying (for review)
npx prisma migrate dev --create-only --name descriptive_name
```

### Apply Migrations
```bash
# Development (creates migrations)
npx prisma migrate dev

# Production (applies only)
npx prisma migrate deploy
```

### Reset Database (DEV ONLY!)
```bash
# WARNING: Deletes all data!
npx prisma migrate reset
```

## 🔧 Prisma Client

### Generate Client
```bash
# After schema changes
npx prisma generate

# With automatic restart
npx prisma generate --watch
```

### Database Tools
```bash
# Open Prisma Studio (GUI)
npx prisma studio

# Validate schema
npx prisma validate

# Format schema file
npx prisma format
```

## 💾 Backup & Restore

### Create Backup
```bash
# Standard backup
pg_dump -h localhost -p 5432 -U broxiva broxiva_dev > backup.sql

# Compressed backup
pg_dump -h localhost -p 5432 -U broxiva broxiva_dev | gzip > backup.sql.gz

# Custom format (faster restore)
pg_dump -h localhost -p 5432 -U broxiva -Fc broxiva_dev > backup.dump
```

### Restore Backup
```bash
# From SQL file
psql -h localhost -p 5432 -U broxiva broxiva_dev < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql -h localhost -U broxiva broxiva_dev

# From custom format
pg_restore -h localhost -p 5432 -U broxiva -d broxiva_dev backup.dump
```

## 🔍 Troubleshooting

### Migration Out of Sync
```bash
# Mark migration as applied (if it actually is)
npx prisma migrate resolve --applied "migration_name"

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "migration_name"
```

### Schema Drift
```bash
# Force push schema (careful!)
npx prisma db push --accept-data-loss

# Create migration from current state
npx prisma migrate dev --name fix_drift
```

### Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if server is ready
pg_isready -h localhost -p 5432

# View connection details
echo $DATABASE_URL
```

## 📊 Database Queries

### Check Tables
```sql
-- List all tables
\dt

-- Table details
\d+ table_name

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Indexes
```sql
-- List all indexes
SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- Unused indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- Index sizes
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_indexes i
JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Check Constraints
```sql
-- All constraints
SELECT * FROM information_schema.table_constraints
WHERE table_schema = 'public';

-- Foreign keys only
SELECT * FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
```

## 🎯 Best Practices

### Migration Naming
✅ **Good Names**:
- `add_user_email_verification`
- `create_payment_tables`
- `update_order_status_enum`

❌ **Bad Names**:
- `update_schema`
- `changes`
- `fix`

### Schema Changes
✅ **Do**:
- Test in development first
- Create descriptive migrations
- Review generated SQL
- Add indexes for performance
- Use transactions

❌ **Don't**:
- Run `migrate dev` in production
- Drop columns without backup
- Make breaking changes without planning
- Skip staging environment
- Commit without testing

## 📱 Environment-Specific

### Development
```bash
# Quick reset and seed
npm run migrate:reset && npm run db:seed

# Watch mode for schema changes
npx prisma generate --watch
```

### Staging
```bash
# Deploy to staging
./scripts/run-migrations.sh staging

# Verify
npx prisma migrate status
```

### Production
```bash
# ALWAYS backup first!
./scripts/run-migrations.sh prod

# Or manual process:
# 1. Create backup
pg_dump ... > backup.sql

# 2. Apply migrations
npx prisma migrate deploy

# 3. Verify
npx prisma migrate status
```

## 🔐 Security

### Sensitive Data
```bash
# Never commit these files:
.env
.env.local
.env.production

# Always use environment variables for:
# - Database credentials
# - API keys
# - Encryption keys
```

### Production Access
```bash
# Use read-only access when possible
export DATABASE_URL_READONLY="postgresql://readonly:...@host:5432/db"

# Require 2FA for production access
# Use bastion hosts or VPN
# Audit all production access
```

## 📈 Performance

### Analyze Tables
```sql
-- Update statistics
ANALYZE;

-- Specific table
ANALYZE table_name;

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Index Management
```sql
-- Create index without locking table
CREATE INDEX CONCURRENTLY idx_name ON table_name(column_name);

-- Drop unused indexes
DROP INDEX IF EXISTS idx_name;

-- Rebuild index
REINDEX INDEX idx_name;
```

## 🆘 Emergency Procedures

### Rollback Migration
```bash
# 1. Stop application
pm2 stop all

# 2. Restore backup
pg_restore -d broxiva_prod backup.dump

# 3. Verify
npx prisma migrate status

# 4. Restart
pm2 start all
```

### Fix Failed Migration
```bash
# 1. Mark as rolled back
npx prisma migrate resolve --rolled-back "failed_migration"

# 2. Fix schema
# Edit prisma/schema.prisma

# 3. Create new migration
npx prisma migrate dev --name fix_issue

# 4. Apply to production
npx prisma migrate deploy
```

## 📚 Documentation Links

- [Full Migration Guide](./DATABASE_MIGRATION_GUIDE.md)
- [Pre-Deployment Checklist](./PRE_DEPLOYMENT_MIGRATION_CHECKLIST.md)
- [Pending Schema Changes](./PENDING_SCHEMA_CHANGES.md)
- [Prisma Docs](https://www.prisma.io/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## 💡 Tips & Tricks

### Speed Up Development
```bash
# Use shadow database for faster migrations
DATABASE_URL="..." SHADOW_DATABASE_URL="..." npx prisma migrate dev
```

### Database Shell Aliases
```bash
# Add to ~/.bashrc or ~/.zshrc
alias db-dev='psql $DATABASE_URL'
alias db-migrate='npx prisma migrate dev'
alias db-studio='npx prisma studio'
alias db-status='npx prisma migrate status'
```

### Git Workflow
```bash
# After creating migration
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: add new feature with migration"
```

## 🎓 Learning Resources

### Prisma
- [Prisma Migrate Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Troubleshooting](https://www.prisma.io/docs/guides/database/production-troubleshooting)

### PostgreSQL
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Backup & Recovery](https://www.postgresql.org/docs/current/backup.html)
- [Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Quick Reference Version**: 1.0
**Last Updated**: December 4, 2024

For detailed information, see [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md)
