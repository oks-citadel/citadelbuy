# Broxiva Database Migrations - Quick Reference

## Overview

This document provides a quick reference for database migration documentation and procedures. There are **7 pending migrations** that need to be applied.

---

## Documentation Structure

### C:/Users/citad/OneDrive/Documents/broxiva-master/organization/

```
organization/
├── docs/
│   ├── migrations/
│   │   └── README.md                          # Migration documentation index
│   ├── MIGRATION_EXECUTION_GUIDE.md           # Step-by-step migration guide
│   ├── MIGRATION_SCHEMA_CHANGES.md            # Detailed schema change documentation
│   └── MIGRATION_PRODUCTION_RUNBOOK.md        # Production deployment runbook
│
├── scripts/
│   ├── apply-migrations.sh                    # Automated migration script
│   └── verify-migrations.sh                   # Migration verification script
│
└── apps/api/prisma/migrations/
    ├── 20251117022438_add_password_reset_table/
    ├── 20251118154530_sync_schema_phase30/
    ├── 20251119004754_add_vendor_management_system/
    ├── 20251202_add_owner_relation_and_role_permissions/
    ├── add_performance_indexes/
    ├── add_privacy_consent/
    └── organization_module/
```

---

## Quick Start

### Development Environment

```bash
cd C:/Users/citad/OneDrive/Documents/broxiva-master/organization

# Set database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/broxiva_dev"

# Apply migrations
./scripts/apply-migrations.sh

# Verify
./scripts/verify-migrations.sh
```

### Production Environment

**STOP! Read the production runbook first:**

See [docs/MIGRATION_PRODUCTION_RUNBOOK.md](./docs/MIGRATION_PRODUCTION_RUNBOOK.md)

---

## Essential Information

### Migration Summary

| # | Name | Duration | Breaking Changes |
|---|------|----------|------------------|
| 1 | password_reset_table | 2-3 min | No |
| 2 | phase30_sync | 10-15 min | **YES** |
| 3 | vendor_management | 5-7 min | No |
| 4 | roles_permissions | 2-3 min | No |
| 5 | performance_indexes | 15-20 min | No |
| 6 | privacy_consent | 3-5 min | Potential |
| 7 | organization_module | 8-10 min | **YES** |

**Total:** 45-63 minutes

### Critical Notes

1. **Migration Order Matters!**
   - Organization module (#7) MUST be applied BEFORE roles_permissions (#4)
   - Performance indexes (#5) should be applied LAST

2. **Privacy Migration Issue**
   - Migration references "User" but table is "users"
   - Fix before running:
   ```bash
   sed -i 's/"User"/"users"/g' \
     apps/api/prisma/migrations/add_privacy_consent/migration.sql
   ```

3. **Breaking Changes**
   - Migration 2: Modifies `orders` and `reviews` tables
   - Migration 7: Implements multi-tenant architecture

---

## Essential Commands

### Check Migration Status

```bash
cd apps/api
npx prisma migrate status
```

### Create Backup

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Apply Migrations

```bash
./scripts/apply-migrations.sh --environment production
```

### Verify Migrations

```bash
./scripts/verify-migrations.sh --detailed
```

### Rollback (Emergency)

```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

---

## Pre-Migration Checklist

**Required:**
- [ ] Database backup created
- [ ] Tested on staging environment
- [ ] Disk space verified (20%+ free)
- [ ] Maintenance window scheduled
- [ ] Team coordination confirmed
- [ ] Privacy migration fixed (table name)

**Recommended:**
- [ ] Code freeze enacted
- [ ] Customers notified
- [ ] Status page updated
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented

---

## What Gets Added

**Major Features:**
- Multi-tenant organization management
- Comprehensive vendor management
- Advertising platform
- Subscription billing
- Buy Now Pay Later (BNPL)
- Loyalty programs & rewards
- Gift cards & store credit
- Deals & promotions
- Privacy & compliance tools
- 300+ performance indexes

**Schema Changes:**
- **Tables:** 10 → 110+
- **Indexes:** 20 → 320+
- **ENUM Types:** 2 → 30+
- **Foreign Keys:** 10 → 150+

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call DBA | [Name] - [Phone] |
| DevOps Lead | [Name] - [Phone] |
| Engineering Manager | [Name] - [Phone] |
| CTO | [Name] - [Phone] |

**Communication:**
- Slack: #broxiva-infrastructure
- Status: https://status.broxiva.com

---

## Resources

### Primary Documents

1. **[Migration Execution Guide](./docs/MIGRATION_EXECUTION_GUIDE.md)**
   - Detailed migration procedures
   - Step-by-step instructions
   - Verification steps
   - Troubleshooting guide

2. **[Schema Changes Documentation](./docs/MIGRATION_SCHEMA_CHANGES.md)**
   - Complete schema breakdown
   - Breaking changes analysis
   - Data transformation guide
   - Application update requirements

3. **[Production Runbook](./docs/MIGRATION_PRODUCTION_RUNBOOK.md)**
   - Production deployment procedures
   - Team coordination
   - Communication templates
   - Post-migration tasks

### Scripts

- **[apply-migrations.sh](./scripts/apply-migrations.sh)** - Automated migration with backup
- **[verify-migrations.sh](./scripts/verify-migrations.sh)** - Post-migration verification

### Related Documentation

- [Database Maintenance](./docs/DATABASE_MAINTENANCE.md)
- [Backup Strategy](./docs/DATABASE_BACKUP_STRATEGY.md)
- [Security Setup](./docs/SECURITY_SETUP.md)

---

## Support

**Issues or Questions?**

1. Check the documentation
2. Review troubleshooting section
3. Contact DBA or DevOps team
4. Escalate to Engineering Manager if needed

---

**Version:** 1.0.0
**Last Updated:** December 4, 2025
**Next Review:** After production deployment
