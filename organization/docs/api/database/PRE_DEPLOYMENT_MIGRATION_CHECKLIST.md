# Pre-Deployment Migration Checklist

Use this checklist before deploying any database migrations to staging or production environments.

## 📋 Critical Pre-Deployment Checks

### 1. Environment Validation

- [ ] **Environment Variables**
  - [ ] `DATABASE_URL` is correctly configured
  - [ ] Database credentials are valid and tested
  - [ ] Environment is correctly set (`NODE_ENV`)
  - [ ] All required secrets are loaded from `.env`

- [ ] **Database Connectivity**
  ```bash
  npx prisma db execute --stdin <<< "SELECT 1;"
  ```
  - [ ] Connection successful
  - [ ] Correct database server (check host/port)
  - [ ] Sufficient permissions for migrations

### 2. Migration Review

- [ ] **Schema Changes**
  - [ ] Review `prisma/schema.prisma` changes
  - [ ] Understand impact of each change
  - [ ] No accidental deletions or data loss
  - [ ] All relations properly defined
  - [ ] Indexes added for performance

- [ ] **Migration Files**
  - [ ] Review pending migrations:
    ```bash
    npx prisma migrate status
    ```
  - [ ] Check SQL in each migration file
  - [ ] No destructive operations without data backup plan
  - [ ] Migration names are descriptive
  - [ ] No duplicate migrations

- [ ] **Data Safety**
  - [ ] No `DROP COLUMN` without data migration
  - [ ] No `DROP TABLE` without confirmation
  - [ ] New `NOT NULL` columns have defaults or migration script
  - [ ] Foreign key constraints won't break existing data
  - [ ] Unique constraints verified against existing data

### 3. Testing Requirements

- [ ] **Local Testing**
  - [ ] Migrations tested in local environment
  - [ ] Reset and reapply all migrations successfully:
    ```bash
    npx prisma migrate reset
    ```
  - [ ] Seed data runs without errors
  - [ ] Application starts and runs correctly

- [ ] **Integration Tests**
  - [ ] All unit tests passing:
    ```bash
    npm run test
    ```
  - [ ] E2E tests passing:
    ```bash
    npm run test:e2e
    ```
  - [ ] No test failures related to schema changes

- [ ] **Staging Environment**
  - [ ] Migrations applied to staging successfully
  - [ ] Application deployed to staging
  - [ ] Smoke tests completed in staging
  - [ ] Critical user flows tested
  - [ ] No errors in staging logs

### 4. Backup Strategy

- [ ] **Backup Plan**
  - [ ] Backup schedule determined (before migration)
  - [ ] Backup storage location confirmed
  - [ ] Backup retention policy defined
  - [ ] Backup restoration tested recently

- [ ] **Pre-Migration Backup**
  - [ ] Create fresh database backup:
    ```bash
    ./scripts/run-migrations.sh prod  # Handles backup automatically
    # OR manual backup:
    pg_dump -h HOST -p PORT -U USER DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql
    ```
  - [ ] Verify backup file created
  - [ ] Check backup file size is reasonable
  - [ ] Test backup can be restored (if critical)

- [ ] **Rollback Plan**
  - [ ] Rollback procedure documented
  - [ ] Rollback tested in staging
  - [ ] Team knows how to execute rollback
  - [ ] Rollback time estimated

### 5. Performance Considerations

- [ ] **Migration Performance**
  - [ ] Estimated migration time calculated
  - [ ] Table sizes checked for large migrations:
    ```sql
    SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
    FROM pg_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;
    ```
  - [ ] Index creation won't lock tables for too long
  - [ ] Consider `CREATE INDEX CONCURRENTLY` for large tables

- [ ] **Database Load**
  - [ ] Migration scheduled during low-traffic period
  - [ ] Database resources sufficient (CPU, RAM, Disk)
  - [ ] No other maintenance scheduled simultaneously
  - [ ] Connection pool size adequate

### 6. Downtime Planning

- [ ] **Downtime Assessment**
  - [ ] Determine if downtime is required
  - [ ] Estimate downtime duration
  - [ ] Schedule maintenance window
  - [ ] Consider zero-downtime migration strategies

- [ ] **User Communication**
  - [ ] Maintenance notice sent to users
  - [ ] Downtime window communicated
  - [ ] Status page updated
  - [ ] Support team notified

### 7. Monitoring Setup

- [ ] **Monitoring Preparation**
  - [ ] Application monitoring active
  - [ ] Database monitoring active
  - [ ] Alert thresholds reviewed
  - [ ] On-call team notified

- [ ] **Log Collection**
  - [ ] Migration logs will be captured
  - [ ] Application logs monitored
  - [ ] Database logs accessible
  - [ ] Error tracking enabled (Sentry, etc.)

### 8. Team Readiness

- [ ] **Team Communication**
  - [ ] Migration plan shared with team
  - [ ] Roles and responsibilities assigned
  - [ ] Backup person identified
  - [ ] Communication channels established

- [ ] **On-Call Coverage**
  - [ ] On-call engineer identified
  - [ ] Contact information confirmed
  - [ ] Escalation path documented
  - [ ] Runbook available

### 9. Deployment Dependencies

- [ ] **Application Code**
  - [ ] Application code compatible with new schema
  - [ ] Backward compatibility verified (if needed)
  - [ ] Feature flags configured (if using)
  - [ ] Code changes reviewed and approved

- [ ] **Infrastructure**
  - [ ] Database server resources adequate
  - [ ] Disk space sufficient for migration
  - [ ] Network connectivity stable
  - [ ] Load balancers configured correctly

### 10. Security & Compliance

- [ ] **Security Review**
  - [ ] No sensitive data exposed in migration files
  - [ ] Encryption requirements met
  - [ ] Access controls reviewed
  - [ ] Audit logging enabled

- [ ] **Compliance**
  - [ ] Data retention policies followed
  - [ ] Privacy regulations considered (GDPR, CCPA)
  - [ ] Compliance team notified (if required)
  - [ ] Change approval obtained

---

## 🚀 Deployment Execution Checklist

### Pre-Deployment (T-30 minutes)

- [ ] Final backup created
- [ ] Team assembled and ready
- [ ] Monitoring dashboards open
- [ ] Communication channels active
- [ ] Runbook open and ready

### Deployment (T-0)

- [ ] Maintenance mode enabled (if needed)
- [ ] Application traffic reduced/stopped
- [ ] Run migration script:
  ```bash
  ./scripts/run-migrations.sh prod
  ```
- [ ] Monitor migration progress
- [ ] Watch for errors or warnings

### Post-Deployment (T+0)

- [ ] Migration completed successfully
- [ ] Database health checks passing:
  ```bash
  npx prisma migrate status
  ```
- [ ] Application restarted successfully
- [ ] Smoke tests passing
- [ ] Critical paths tested
- [ ] No errors in logs
- [ ] Performance metrics normal
- [ ] Maintenance mode disabled

### Post-Deployment (T+30 minutes)

- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Review slow query logs
- [ ] Verify user functionality
- [ ] Document any issues
- [ ] Send completion notification

---

## 📊 Migration Impact Assessment

### Schema Changes Summary

| Change Type | Count | Tables Affected | Risk Level |
|-------------|-------|-----------------|------------|
| New Tables  | __    | __              | Low        |
| New Columns | __    | __              | Low-Medium |
| Modified Columns | __ | __             | Medium     |
| Dropped Columns | __  | __             | High       |
| Dropped Tables | __   | __              | High       |
| New Indexes | __     | __              | Low-Medium |
| Modified Indexes | __ | __             | Medium     |

### Data Migration Required

- [ ] Yes - See data migration plan below
- [ ] No - Schema changes only

### Estimated Impact

- **Migration Duration**: ______ minutes
- **Downtime Required**: ⬜ Yes (______ minutes) / ⬜ No
- **User Impact**: ⬜ None / ⬜ Minimal / ⬜ Moderate / ⬜ High
- **Rollback Time**: ______ minutes

---

## 🔄 Rollback Plan

### Triggers for Rollback

Initiate rollback if:
- [ ] Migration fails to complete
- [ ] Critical errors in application logs
- [ ] Database performance degraded significantly
- [ ] Data integrity issues detected
- [ ] Critical functionality broken

### Rollback Procedure

1. **Stop Application**
   ```bash
   pm2 stop all  # Or your process manager
   ```

2. **Restore Database**
   ```bash
   pg_restore -h HOST -p PORT -U USER -d DATABASE \
     --clean --if-exists \
     backups/migration_backup_TIMESTAMP.sql
   ```

3. **Verify Restoration**
   ```bash
   npx prisma migrate status
   psql $DATABASE_URL -c "\dt"
   ```

4. **Restart Application**
   ```bash
   pm2 start all
   ```

5. **Verify Functionality**
   - Run smoke tests
   - Check critical paths
   - Review logs

### Rollback Communication

- [ ] Notify team of rollback
- [ ] Update status page
- [ ] Log rollback reason
- [ ] Schedule post-mortem

---

## 📝 Sign-Off

### Pre-Deployment Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Database Administrator | _________ | _________ | _____ |
| DevOps Lead | _________ | _________ | _____ |
| Engineering Manager | _________ | _________ | _____ |
| CTO (if high risk) | _________ | _________ | _____ |

### Post-Deployment Verification

| Check | Status | Verified By | Time |
|-------|--------|-------------|------|
| Migration Completed | ⬜ Pass / ⬜ Fail | _________ | _____ |
| Health Checks Pass | ⬜ Pass / ⬜ Fail | _________ | _____ |
| Smoke Tests Pass | ⬜ Pass / ⬜ Fail | _________ | _____ |
| No Critical Errors | ⬜ Pass / ⬜ Fail | _________ | _____ |
| Performance Normal | ⬜ Pass / ⬜ Fail | _________ | _____ |

---

## 📞 Emergency Contacts

### During Deployment

- **Primary DBA**: [Name] - [Phone] - [Email]
- **Backup DBA**: [Name] - [Phone] - [Email]
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **Engineering Manager**: [Name] - [Phone] - [Email]
- **On-Call Engineer**: [Name] - [Phone] - [Email]

### Escalation Path

1. On-Call Engineer
2. Engineering Manager
3. CTO
4. CEO (if business-critical)

---

## 📚 Additional Resources

- [Database Migration Guide](./DATABASE_MIGRATION_GUIDE.md)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Backup Guide](https://www.postgresql.org/docs/current/backup.html)
- [Zero-Downtime Migration Strategies](./DATABASE_MIGRATION_GUIDE.md#zero-downtime-migrations)

---

## 🔍 Deployment Notes

### Current Pending Migrations

```
1. 20251117022438_add_password_reset_table
2. 20251118154530_sync_schema_phase30
3. 20251119004754_add_vendor_management_system
4. 20251202_add_owner_relation_and_role_permissions
5. add_performance_indexes
6. add_privacy_consent
7. organization_module
```

### Migration Highlights

**Key Changes**:
- Organization module with full RBAC
- Performance indexes for better query speed
- Privacy and consent management
- Vendor management enhancements

**Risk Assessment**: Medium
- Includes new tables and columns
- Performance indexes (may take time on large tables)
- No destructive operations

**Estimated Duration**: 5-15 minutes (depends on data volume)

---

**Checklist Version**: 1.0
**Last Updated**: December 4, 2024
**Next Review**: Before each major migration
