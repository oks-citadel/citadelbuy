# CitadelBuy Database Management

Database management scripts and tools for PostgreSQL backup, restore, and migration operations.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Scripts](#scripts)
- [Backup & Restore](#backup--restore)
- [Migrations](#migrations)
- [Best Practices](#best-practices)

## Overview

This directory contains:
- Automated backup scripts with compression and cloud storage
- Safe restore procedures with automatic safety backups
- Prisma migration management
- Database maintenance utilities

## Directory Structure

```
database/
├── scripts/
│   ├── backup.sh          # Automated backup script
│   ├── restore.sh         # Database restore script
│   └── migrate.sh         # Migration management script
├── migrations/            # Prisma migration files
└── backups/              # Local backup storage (generated)
```

## Scripts

### backup.sh

Automated PostgreSQL backup with compression, encryption, and cloud upload.

**Features:**
- SQL and custom format backups
- Gzip compression
- Optional AES-256 encryption
- S3/Azure Blob upload
- Automatic retention management
- Backup manifests

**Usage:**
```bash
./scripts/backup.sh
```

**Configuration via Environment Variables:**

```bash
# Backup directory (default: /opt/citadelbuy/backups)
export BACKUP_DIR=/path/to/backups

# Retention in days (default: 30)
export RETENTION_DAYS=30

# Database connection
export POSTGRES_DB=citadelbuy_prod
export POSTGRES_USER=citadelbuy
export POSTGRES_PASSWORD=your_password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432

# S3 configuration (optional)
export S3_BUCKET=citadelbuy-backups-prod

# Encryption (optional)
export ENCRYPTION_ENABLED=true
export ENCRYPTION_KEY=your_encryption_key
```

**Examples:**

```bash
# Basic backup
./scripts/backup.sh

# Backup with custom directory
BACKUP_DIR=/mnt/backups ./scripts/backup.sh

# Backup to S3
S3_BUCKET=my-backups ./scripts/backup.sh

# Encrypted backup
ENCRYPTION_ENABLED=true ENCRYPTION_KEY=mykey123 ./scripts/backup.sh
```

**Output:**

The script creates two types of backups:
1. **SQL Format** (`citadelbuy_prod_20241121_120000.sql.gz`)
   - Compressed SQL dump
   - Easy to inspect and modify
   - Portable across PostgreSQL versions

2. **Custom Format** (`citadelbuy_prod_20241121_120000.dump`)
   - PostgreSQL custom format
   - Faster restore
   - Supports parallel restore

**Backup Manifest:**

A JSON manifest is created at `latest_backup.json`:

```json
{
  "timestamp": "20241121_120000",
  "database": "citadelbuy_prod",
  "sql_backup": "citadelbuy_prod_20241121_120000.sql.gz",
  "custom_backup": "citadelbuy_prod_20241121_120000.dump",
  "sql_size": "150M",
  "custom_size": "200M",
  "encrypted": false,
  "s3_uploaded": true
}
```

**Automated Backups with Cron:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/citadelbuy/infrastructure/database/scripts/backup.sh >> /var/log/citadelbuy-backup.log 2>&1
```

### restore.sh

Safe database restoration with automatic safety backups.

**Features:**
- Automatic safety backup before restore
- Decryption support
- Connection termination
- Database recreation
- Post-restore migrations

**Usage:**
```bash
./scripts/restore.sh /path/to/backup.sql.gz
```

**Configuration:**

```bash
export BACKUP_DIR=/opt/citadelbuy/backups
export POSTGRES_DB=citadelbuy_prod
export POSTGRES_USER=citadelbuy
export POSTGRES_PASSWORD=your_password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432

# For encrypted backups
export ENCRYPTION_ENABLED=true
export ENCRYPTION_KEY=your_encryption_key
```

**Examples:**

```bash
# List available backups
ls -lh /opt/citadelbuy/backups/

# Restore from SQL backup
./scripts/restore.sh /opt/citadelbuy/backups/citadelbuy_prod_20241121_120000.sql.gz

# Restore from custom format
./scripts/restore.sh /opt/citadelbuy/backups/citadelbuy_prod_20241121_120000.dump

# Restore encrypted backup
ENCRYPTION_ENABLED=true ENCRYPTION_KEY=mykey123 \
  ./scripts/restore.sh /opt/citadelbuy/backups/citadelbuy_prod_20241121_120000.sql.gz.enc
```

**Safety Features:**

1. **Safety Backup**: Creates backup of current database before restore
2. **Confirmation Prompt**: Requires explicit confirmation
3. **Connection Termination**: Closes all active connections
4. **Post-Restore Migrations**: Runs Prisma migrations after restore

**Restore Process:**

```
1. Prompt for confirmation
2. Create safety backup of current database
3. Decrypt backup if encrypted
4. Terminate active connections
5. Drop and recreate database
6. Restore from backup
7. Run database migrations
8. Clean up temporary files
```

### migrate.sh

Prisma database migration management.

**Features:**
- Deploy pending migrations
- Create new migrations
- Check migration status
- Reset database (development)
- Generate Prisma Client
- Open Prisma Studio

**Usage:**
```bash
./scripts/migrate.sh [migration_name] [action]
```

**Actions:**

**deploy** - Deploy pending migrations (default):
```bash
./scripts/migrate.sh deploy
```

**dev** - Create and apply new migration:
```bash
./scripts/migrate.sh add_user_preferences dev
```

**status** - Show migration status:
```bash
./scripts/migrate.sh status
```

**reset** - Reset database (DANGEROUS):
```bash
./scripts/migrate.sh reset
```

**generate** - Generate Prisma Client:
```bash
./scripts/migrate.sh generate
```

**studio** - Open Prisma Studio:
```bash
./scripts/migrate.sh studio
```

**help** - Show help:
```bash
./scripts/migrate.sh help
```

**Configuration:**

```bash
export BACKEND_DIR=/opt/citadelbuy/backend
export DATABASE_URL="postgresql://user:password@localhost:5432/citadelbuy_prod"
```

**Examples:**

```bash
# Deploy migrations in production
DATABASE_URL="postgresql://user:pass@prod-db:5432/citadelbuy_prod" \
  ./scripts/migrate.sh deploy

# Create new migration in development
cd /path/to/backend
../infrastructure/database/scripts/migrate.sh add_notifications dev

# Check migration status
./scripts/migrate.sh status

# Reset database (dev only!)
./scripts/migrate.sh reset
```

## Backup & Restore

### Complete Backup Strategy

**Development:**
- Manual backups before major changes
- No retention requirements

**Staging:**
- Daily automated backups
- 14-day retention
- Local storage

**Production:**
- Daily automated backups at 2 AM
- 30-day retention
- Cloud storage (S3/Azure Blob)
- Encryption enabled
- Geo-redundant storage

### Backup Schedule

```bash
# Production backup cron
0 2 * * * /opt/citadelbuy/infrastructure/database/scripts/backup.sh

# Weekly full backup to remote location
0 3 * * 0 S3_BUCKET=citadelbuy-backups-archive ./scripts/backup.sh
```

### Restore Scenarios

**Scenario 1: Recent Data Corruption**
```bash
# Find latest backup
ls -lt /opt/citadelbuy/backups/ | head -5

# Restore latest backup
./scripts/restore.sh /opt/citadelbuy/backups/citadelbuy_prod_20241121_120000.sql.gz
```

**Scenario 2: Point-in-Time Recovery**
```bash
# List backups from specific date
ls -l /opt/citadelbuy/backups/*20241115*

# Restore specific backup
./scripts/restore.sh /opt/citadelbuy/backups/citadelbuy_prod_20241115_140000.sql.gz
```

**Scenario 3: Disaster Recovery**
```bash
# Download from S3
aws s3 cp s3://citadelbuy-backups-prod/backups/citadelbuy_prod_20241121_120000.sql.gz .

# Restore
./scripts/restore.sh citadelbuy_prod_20241121_120000.sql.gz
```

### Testing Backups

**Regular Backup Testing:**

```bash
# 1. Create test database
createdb citadelbuy_test

# 2. Restore to test database
POSTGRES_DB=citadelbuy_test ./scripts/restore.sh /path/to/backup.sql.gz

# 3. Verify data
psql citadelbuy_test -c "SELECT COUNT(*) FROM users;"
psql citadelbuy_test -c "SELECT COUNT(*) FROM products;"

# 4. Clean up
dropdb citadelbuy_test
```

## Migrations

### Migration Workflow

**Development:**
```bash
# 1. Make schema changes in prisma/schema.prisma

# 2. Create migration
./scripts/migrate.sh add_feature_name dev

# 3. Test migration
npm run test

# 4. Commit migration files
git add prisma/migrations/
git commit -m "Add migration: feature_name"
```

**Production:**
```bash
# 1. Backup database
./scripts/backup.sh

# 2. Deploy migrations
./scripts/migrate.sh deploy

# 3. Verify
./scripts/migrate.sh status
```

### Migration Best Practices

1. **Always backup before migrations**
2. **Test migrations in staging first**
3. **Review generated SQL**
4. **Use descriptive migration names**
5. **Never edit applied migrations**
6. **Keep migrations small and focused**

### Rolling Back Migrations

Prisma doesn't support automatic rollback. To rollback:

```bash
# 1. Restore from backup taken before migration
./scripts/restore.sh /path/to/pre-migration-backup.sql.gz

# 2. Remove migration files
rm -rf prisma/migrations/YYYYMMDDHHMMSS_migration_name/

# 3. Regenerate client
npx prisma generate
```

## Best Practices

### Backup Best Practices

1. **Automated Backups**
   - Use cron for automated backups
   - Monitor backup success/failure
   - Alert on backup failures

2. **Retention Policy**
   - Keep daily backups for 30 days
   - Keep weekly backups for 3 months
   - Keep monthly backups for 1 year

3. **Storage**
   - Local backups for quick restore
   - Cloud backups for disaster recovery
   - Geo-redundant cloud storage

4. **Testing**
   - Test restore monthly
   - Verify backup integrity
   - Document restore procedures

5. **Security**
   - Encrypt backups at rest
   - Use secure transfer (HTTPS/TLS)
   - Limit backup access

### Database Maintenance

**Weekly Tasks:**
```bash
# Vacuum and analyze
psql -c "VACUUM ANALYZE;"

# Check for bloat
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

**Monthly Tasks:**
```bash
# Full vacuum (requires downtime)
psql -c "VACUUM FULL ANALYZE;"

# Reindex
psql -c "REINDEX DATABASE citadelbuy_prod;"

# Test backup restore
./scripts/restore.sh /latest/backup.sql.gz
```

### Monitoring

**Key Metrics:**
- Database size growth
- Connection count
- Query performance
- Replication lag (if applicable)
- Backup success rate

**Alerts:**
- Backup failures
- Disk space < 15%
- Connection count > 80%
- Replication lag > 5 minutes

## Troubleshooting

### Backup Issues

**Issue: Backup script fails**
```bash
# Check database connectivity
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"

# Check disk space
df -h /opt/citadelbuy/backups

# Check permissions
ls -la /opt/citadelbuy/backups
```

**Issue: S3 upload fails**
```bash
# Test AWS CLI
aws s3 ls s3://citadelbuy-backups-prod/

# Check credentials
aws configure list
```

### Restore Issues

**Issue: Connection errors**
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check connection settings
psql -h localhost -U citadelbuy -d postgres -c "SELECT 1;"
```

**Issue: Insufficient permissions**
```bash
# Grant necessary permissions
psql -c "ALTER USER citadelbuy WITH SUPERUSER;"
```

### Migration Issues

**Issue: Migration fails**
```bash
# Check database connection
npx prisma db execute --stdin <<< "SELECT 1;"

# Reset (development only!)
./scripts/migrate.sh reset

# Reapply
./scripts/migrate.sh deploy
```

**Issue: Schema drift**
```bash
# Check for drift
npx prisma migrate status

# Fix drift
npx prisma db push
```

## Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Database Best Practices](https://www.postgresql.org/docs/current/best-practices.html)

## Support

For issues or questions:
- Check logs: `/var/log/citadelbuy-backup.log`
- Review backup manifest: `/opt/citadelbuy/backups/latest_backup.json`
- Contact: dev@citadelbuy.com

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.
