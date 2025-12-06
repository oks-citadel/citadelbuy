# CitadelBuy Production Migration Runbook

## Document Purpose

This runbook provides a step-by-step operational guide for executing database migrations in production. It includes coordination procedures, communication templates, and emergency response plans.

**Target Audience:** DevOps Engineers, Database Administrators, Engineering Managers

---

## Table of Contents

1. [Pre-Migration Phase](#pre-migration-phase)
2. [Migration Day Preparation](#migration-day-preparation)
3. [Execution Phase](#execution-phase)
4. [Verification Phase](#verification-phase)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Migration Phase](#post-migration-phase)
7. [Communication Templates](#communication-templates)
8. [Emergency Contacts](#emergency-contacts)

---

## Pre-Migration Phase

### Timeline: T-7 days to T-1 day

### Day 7 Before (T-7)

#### 1. Schedule Maintenance Window

- [ ] **Select Maintenance Window**
  - Recommended: Sunday 2:00 AM - 5:00 AM (local time)
  - Duration: 3-hour window (migrations expected ~1 hour)
  - Buffer time: 2 hours for unexpected issues

- [ ] **Create Calendar Events**
  - Engineering team calendar
  - Operations calendar
  - Executive team notification

- [ ] **Book Resources**
  - On-call DBA
  - On-call DevOps Engineer
  - Backup engineering support

#### 2. Stakeholder Notification

**Send to:**
- Executive team
- Product management
- Customer success team
- Marketing team (for user communication)

**Email Template:** See [Communication Templates](#communication-templates)

#### 3. Customer Communication Preparation

- [ ] **Draft Customer Notification**
  - Maintenance window announcement
  - Expected impact (read-only mode)
  - Alternative contact methods

- [ ] **Schedule Communications**
  - T-7 days: Initial announcement
  - T-3 days: Reminder email
  - T-1 day: Final reminder
  - T-4 hours: "Maintenance starting soon"
  - T+0: "Maintenance in progress"
  - T+complete: "System restored"

- [ ] **Update Status Page**
  - Schedule maintenance event
  - Add incident response contact

### Day 5 Before (T-5)

#### 1. Staging Environment Testing

- [ ] **Apply Migrations to Staging**
  ```bash
  # Connect to staging
  ssh citadelbuy-staging

  # Set environment
  export ENVIRONMENT=staging

  # Run migration script
  cd /opt/citadelbuy/organization
  ./scripts/apply-migrations.sh --environment staging
  ```

- [ ] **Document Staging Results**
  - Execution time: _________
  - Issues encountered: _________
  - Backup size: _________
  - Index creation time: _________

- [ ] **Run Staging Tests**
  ```bash
  # Smoke tests
  ./scripts/smoke-tests.sh

  # Load tests
  ./scripts/run-load-tests.sh
  ```

- [ ] **Performance Baseline**
  - Capture query performance metrics
  - Document slow queries
  - Verify index usage

#### 2. Migration Script Validation

- [ ] **Review Migration Files**
  ```bash
  cd apps/api/prisma/migrations
  ls -la
  # Verify all 7 migrations present
  ```

- [ ] **Check for Known Issues**
  - [ ] Privacy migration table name (User vs users)
  - [ ] Organization module dependencies
  - [ ] Migration order (org before roles)

- [ ] **Prepare Fixes**
  ```bash
  # Fix privacy migration if needed
  sed -i 's/"User"/"users"/g' \
    apps/api/prisma/migrations/add_privacy_consent/migration.sql
  ```

### Day 3 Before (T-3)

#### 1. Production Database Audit

- [ ] **Check Database Health**
  ```sql
  -- Check for table bloat
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) AS external_size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;

  -- Check for dead tuples
  SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 1000
  ORDER BY dead_pct DESC;

  -- Check for long-running queries
  SELECT
    pid,
    usename,
    state,
    query_start,
    now() - query_start AS duration,
    query
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND now() - query_start > interval '1 minute'
  ORDER BY duration DESC;
  ```

- [ ] **Run VACUUM if Needed**
  ```sql
  -- If dead tuple percentage > 20%
  VACUUM ANALYZE;
  ```

- [ ] **Check Disk Space**
  ```bash
  df -h
  # Ensure at least 30% free space
  ```

#### 2. Backup Strategy Verification

- [ ] **Test Backup Process**
  ```bash
  # Create test backup
  pg_dump $DATABASE_URL > /tmp/test_backup.sql

  # Verify backup size
  ls -lh /tmp/test_backup.sql

  # Test restoration to temporary database
  createdb citadelbuy_test_restore
  psql citadelbuy_test_restore < /tmp/test_backup.sql

  # Verify restoration
  psql citadelbuy_test_restore -c "SELECT count(*) FROM users;"

  # Cleanup
  dropdb citadelbuy_test_restore
  rm /tmp/test_backup.sql
  ```

- [ ] **Configure Backup Storage**
  - Verify S3/Azure Blob Storage access
  - Test upload to backup storage
  - Verify retention policies

- [ ] **Document Backup Locations**
  - Primary backup: __________________
  - Offsite backup: __________________
  - Recovery time objective (RTO): ____
  - Recovery point objective (RPO): ____

#### 3. Rollback Plan Preparation

- [ ] **Create Rollback Scripts**
  - Document manual rollback steps
  - Prepare rollback SQL if needed
  - Test rollback on staging

- [ ] **Define Rollback Criteria**
  - Migration failure
  - Performance degradation > 50%
  - Critical functionality broken
  - Data integrity issues

### Day 1 Before (T-1)

#### 1. Final Pre-Flight Checks

- [ ] **Verify Team Availability**
  - DBA on-call: ________ (phone: _______)
  - DevOps on-call: ________ (phone: _______)
  - Engineering backup: ________ (phone: _______)

- [ ] **Prepare Communication Channels**
  - Create Slack channel: #migration-prod-YYYYMMDD
  - Set up video call link (Zoom/Teams)
  - Prepare incident response doc

- [ ] **Review Migration Checklist**
  - Print physical copy of this runbook
  - Review [MIGRATION_EXECUTION_GUIDE.md](./MIGRATION_EXECUTION_GUIDE.md)
  - Review [MIGRATION_SCHEMA_CHANGES.md](./MIGRATION_SCHEMA_CHANGES.md)

#### 2. Code Freeze

- [ ] **Enforce Code Freeze**
  - No deployments 24 hours before
  - No database changes
  - Emergency fixes only

- [ ] **Lock Production Branches**
  ```bash
  # GitHub branch protection
  gh api repos/citadelbuy/citadelbuy-master/branches/main/protection \
    --method PUT \
    --field required_approvals=2 \
    --field enforce_admins=true
  ```

#### 3. Final Customer Communication

- [ ] **Send T-1 Day Reminder**
  - Email customers
  - Update status page
  - Post on social media

---

## Migration Day Preparation

### Timeline: T-4 hours to T-0

### T-4 Hours: Pre-Migration Setup

#### 1. Team Assembly

- [ ] **Join Communication Channels**
  - Slack: #migration-prod-YYYYMMDD
  - Video call: _______________
  - Phone bridge: _______________

- [ ] **Role Assignment**
  - Migration Lead: ____________
  - Database Monitor: ____________
  - Application Monitor: ____________
  - Communication Lead: ____________
  - Incident Commander (backup): ____________

#### 2. Environment Preparation

- [ ] **Connect to Production**
  ```bash
  # SSH to production database server
  ssh citadelbuy-prod-db

  # Or connect via bastion
  ssh -J bastion citadelbuy-prod-db
  ```

- [ ] **Verify Database Connection**
  ```bash
  psql $DATABASE_URL -c "SELECT version();"
  ```

- [ ] **Set Environment Variables**
  ```bash
  export DATABASE_URL="postgresql://..."
  export ENVIRONMENT=production
  export MIGRATION_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  ```

#### 3. Monitoring Setup

- [ ] **Open Monitoring Dashboards**
  - Database metrics (CPU, memory, disk I/O)
  - Application metrics (response time, error rate)
  - Infrastructure metrics (load balancer, servers)

- [ ] **Configure Alerts**
  ```bash
  # Increase alert thresholds temporarily
  # (to avoid noise during maintenance)
  ```

- [ ] **Start Logging**
  ```bash
  # Terminal session recording
  script -a migration_${MIGRATION_TIMESTAMP}.log
  ```

### T-2 Hours: Final Verification

- [ ] **Database Pre-Check**
  ```sql
  -- Verify no long-running transactions
  SELECT count(*) FROM pg_stat_activity
  WHERE state != 'idle' AND now() - query_start > interval '5 minutes';

  -- Check for locks
  SELECT count(*) FROM pg_locks WHERE NOT granted;

  -- Verify replication lag (if using replicas)
  SELECT pg_last_wal_replay_lsn(), pg_last_wal_receive_lsn();
  ```

- [ ] **Application Health Check**
  ```bash
  curl -f https://api.citadelbuy.com/health || echo "API DOWN"
  curl -f https://citadelbuy.com || echo "WEB DOWN"
  ```

### T-30 Minutes: Go/No-Go Decision

#### Decision Criteria

**GO if ALL conditions met:**
- [ ] All team members present
- [ ] Backup completed successfully
- [ ] Database health checks passed
- [ ] No critical production incidents
- [ ] Monitoring dashboards accessible

**NO-GO if ANY condition:**
- [ ] Critical team member unavailable
- [ ] Active production incident
- [ ] Database health issues
- [ ] Backup failure
- [ ] Unusual traffic patterns

#### Go/No-Go Meeting

- **Migration Lead:** Reviews readiness
- **DBA:** Confirms database ready
- **DevOps:** Confirms infrastructure ready
- **Engineering Manager:** Gives final approval

**Decision:** GO / NO-GO

**If NO-GO:**
- Notify stakeholders immediately
- Reschedule maintenance window
- Send customer communication
- Document reasons for postponement

---

## Execution Phase

### Timeline: T+0 to T+60 minutes

### Step 1: Enable Maintenance Mode (T+0)

#### 1.1 Update Status Page

- [ ] **Update Status**
  - Status: "Under Maintenance"
  - Message: "We are performing scheduled maintenance. Expected completion: [TIME]"

#### 1.2 Put Application in Read-Only Mode

```bash
# Option 1: Environment variable
export MAINTENANCE_MODE=true
kubectl set env deployment/api MAINTENANCE_MODE=true

# Option 2: Scale down write services
kubectl scale deployment/api --replicas=0

# Option 3: Use maintenance page
kubectl apply -f k8s/maintenance-page.yaml
```

#### 1.3 Stop Background Workers

```bash
# Stop job processors
kubectl scale deployment/worker --replicas=0

# Stop cron jobs
kubectl delete cronjob --all
```

#### 1.4 Drain Active Connections

```bash
# Wait for active requests to complete (2 minutes)
sleep 120

# Verify no active connections
psql $DATABASE_URL -c "
  SELECT count(*) FROM pg_stat_activity
  WHERE datname = current_database()
    AND pid != pg_backend_pid()
    AND state = 'active';
"
```

**Checkpoint:** Application in maintenance mode
- **Time:** T+____
- **Status:** ✓ / ✗
- **Issues:** _____________

### Step 2: Create Database Backup (T+5)

#### 2.1 Create Full Backup

```bash
cd /opt/citadelbuy/organization

# Run backup
pg_dump $DATABASE_URL | gzip > \
  /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz
```

**Estimated Time:** 5-10 minutes (depending on database size)

#### 2.2 Verify Backup

```bash
# Check backup file
ls -lh /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz

# Verify backup integrity
gunzip -t /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz

# Record backup size
BACKUP_SIZE=$(du -h /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz | cut -f1)
echo "Backup size: $BACKUP_SIZE"
```

#### 2.3 Upload to Offsite Storage

```bash
# Upload to S3
aws s3 cp /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz \
  s3://citadelbuy-backups/production/migrations/

# Or Azure
az storage blob upload \
  --container-name backups \
  --file /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz \
  --name production/migrations/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz
```

**Checkpoint:** Backup completed
- **Time:** T+____
- **Backup Size:** _____________
- **Location:** _____________
- **Status:** ✓ / ✗

### Step 3: Apply Migrations (T+15)

#### 3.1 Pre-Migration Database State

```bash
# Capture current state
psql $DATABASE_URL -c "
  SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
" > pre_migration_table_count.txt

# Capture migration status
cd apps/api
npx prisma migrate status > pre_migration_status.txt
```

#### 3.2 Execute Migrations

```bash
# Run migration script
./scripts/apply-migrations.sh \
  --environment production \
  --auto-approve
```

**Monitor Progress:**

In separate terminal, watch database activity:
```sql
-- Watch table creation
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Watch for locks
SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;

-- Watch query progress
SELECT query, state, wait_event
FROM pg_stat_activity
WHERE state = 'active';
```

**Expected Duration by Migration:**
1. password_reset_table: 2-3 min
2. phase30_sync: 10-15 min ⚠️
3. vendor_management: 5-7 min
4. organization_module: 8-10 min ⚠️
5. roles_permissions: 2-3 min
6. privacy_consent: 3-5 min
7. performance_indexes: 15-20 min ⚠️

**Total Expected:** 45-63 minutes

#### 3.3 Monitor Migration Progress

**Watch for:**
- Lock waits
- Deadlocks
- Out of memory errors
- Disk space issues
- Timeout errors

**If Issues Occur:**
1. Document error message
2. Check logs: `tail -f /var/log/postgresql/postgresql.log`
3. Consult [Troubleshooting](#troubleshooting) section
4. Decide: Continue or Rollback

**Checkpoint:** Migrations applied
- **Time:** T+____
- **Status:** ✓ / ✗
- **Issues:** _____________
- **Duration:** _____ minutes

### Step 4: Post-Migration Verification (T+60)

#### 4.1 Database Integrity Check

```sql
-- Check for constraint violations
SELECT count(*) FROM pg_constraint
WHERE contype = 'f' AND convalidated = false;

-- Verify all migrations applied
SELECT * FROM _prisma_migrations
ORDER BY finished_at DESC
LIMIT 10;

-- Count tables
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public';

-- Count indexes
SELECT count(*) FROM pg_indexes
WHERE schemaname = 'public';

-- Check for failed indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexrelid IN (
    SELECT indexrelid FROM pg_index WHERE NOT indisvalid
  );
```

#### 4.2 Update Table Statistics

```sql
-- Critical for query performance with new indexes
ANALYZE;
```

#### 4.3 Verify Schema Changes

```bash
# Run verification script
./scripts/verify-migrations.sh
```

**Checkpoint:** Verification passed
- **Time:** T+____
- **Tables:** _____ (expected: 110+)
- **Indexes:** _____ (expected: 320+)
- **Status:** ✓ / ✗

---

## Verification Phase

### Timeline: T+60 to T+90 minutes

### Application Testing

#### 1. Restart Application Services

```bash
# Remove maintenance mode
kubectl set env deployment/api MAINTENANCE_MODE=false

# Scale up services
kubectl scale deployment/api --replicas=3
kubectl scale deployment/worker --replicas=2

# Restore cron jobs
kubectl apply -f k8s/cronjobs/

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=api --timeout=300s
```

#### 2. Health Checks

```bash
# API health check
curl -f https://api.citadelbuy.com/health
# Expected: {"status":"ok","database":"connected"}

# Web health check
curl -f https://citadelbuy.com
# Expected: HTTP 200

# Database connection pool
curl -f https://api.citadelbuy.com/health/db
# Expected: {"connections":{"active":X,"idle":Y,"total":Z}}
```

#### 3. Smoke Tests

```bash
# Run automated smoke tests
./scripts/smoke-tests.sh --environment production

# Expected tests:
# ✓ User registration
# ✓ User login
# ✓ Product listing
# ✓ Product detail
# ✓ Add to cart
# ✓ Checkout flow
# ✓ Order creation
# ✓ Admin access
```

#### 4. Critical Path Testing

**Manual Verification:**

- [ ] **Authentication**
  - Register new account
  - Login with existing account
  - Password reset flow
  - Social login (if applicable)

- [ ] **Product Browsing**
  - Browse categories
  - Search products
  - Filter products
  - View product details

- [ ] **Shopping Cart**
  - Add product to cart
  - Update quantities
  - Remove items
  - Apply coupon (if available)

- [ ] **Checkout**
  - Proceed to checkout
  - Enter shipping address
  - Select shipping method
  - Enter payment details
  - Place order

- [ ] **Order Management**
  - View order history
  - View order details
  - Track shipment

- [ ] **Admin Functions**
  - Login to admin panel
  - View dashboard
  - Manage products
  - View orders
  - Access reports

- [ ] **Vendor Functions** (if applicable)
  - Login to vendor dashboard
  - View analytics
  - Manage products
  - View payouts

#### 5. Performance Validation

```sql
-- Check slow queries
SELECT
  queryid,
  calls,
  mean_exec_time,
  max_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Verify index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- Check for sequential scans on large tables
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 100
ORDER BY seq_tup_read DESC;
```

#### 6. Monitoring Review

- [ ] **Check Metrics**
  - Response time: < 500ms p95
  - Error rate: < 0.1%
  - Database connections: < 80% capacity
  - CPU usage: < 70%
  - Memory usage: < 80%

- [ ] **Review Logs**
  ```bash
  # Application logs
  kubectl logs -l app=api --tail=100

  # Database logs
  tail -100 /var/log/postgresql/postgresql.log

  # Nginx logs
  tail -100 /var/log/nginx/access.log
  tail -100 /var/log/nginx/error.log
  ```

**Checkpoint:** Verification complete
- **Time:** T+____
- **Health Checks:** ✓ / ✗
- **Smoke Tests:** ✓ / ✗
- **Performance:** ✓ / ✗
- **Status:** PASS / FAIL

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback if:**
- Migration fails with unrecoverable error
- Data corruption detected
- Critical functionality broken
- Performance degradation > 70%
- Database integrity issues

**Consider Rollback if:**
- Minor functionality issues
- Performance degradation 50-70%
- Non-critical errors
- Unexpected behavior

**Do NOT Rollback if:**
- Migration successful but application needs updates
- Minor cosmetic issues
- Expected behavior changes
- Non-blocking issues

### Rollback Procedure

#### Option 1: Automated Rollback (Preferred)

```bash
# Run rollback using backup
cd /opt/citadelbuy/organization

# Stop application
kubectl scale deployment/api --replicas=0
kubectl scale deployment/worker --replicas=0

# Get database name
DB_NAME=$(psql $DATABASE_URL -t -c "SELECT current_database();")

# Terminate connections
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND pid != pg_backend_pid();
"

# Drop and recreate database
BASE_URL=$(echo "$DATABASE_URL" | sed "s|/$DB_NAME||")
psql "$BASE_URL/postgres" -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql "$BASE_URL/postgres" -c "CREATE DATABASE $DB_NAME;"

# Restore from backup
gunzip -c /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz | \
  psql $DATABASE_URL

# Verify restoration
psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# Restart application
kubectl scale deployment/api --replicas=3
kubectl scale deployment/worker --replicas=2
```

**Estimated Time:** 15-30 minutes

#### Option 2: Manual SQL Rollback

If automated rollback fails, use manual rollback scripts:

```sql
-- Rollback organization module
DROP TABLE IF EXISTS organization_invoices CASCADE;
DROP TABLE IF EXISTS organization_billing CASCADE;
DROP TABLE IF EXISTS organization_audit_logs CASCADE;
DROP TABLE IF EXISTS organization_api_keys CASCADE;
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS kyc_applications CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS organization_roles CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TYPE IF EXISTS OrganizationType;
DROP TYPE IF EXISTS OrganizationStatus;
DROP TYPE IF EXISTS MemberStatus;
DROP TYPE IF EXISTS KycStatus;

-- Continue with other migrations...
```

### Post-Rollback Actions

- [ ] **Verify Application**
  - Run health checks
  - Test critical paths
  - Verify data integrity

- [ ] **Notify Stakeholders**
  - Internal team
  - Customers (if applicable)
  - Update status page

- [ ] **Document Issues**
  - Root cause
  - Error messages
  - Recovery steps taken

- [ ] **Schedule Retry**
  - Fix identified issues
  - Test on staging
  - Reschedule migration

---

## Post-Migration Phase

### Timeline: T+90 to T+24 hours

### Immediate Actions (T+90)

#### 1. Remove Maintenance Mode

```bash
# Update status page
# Status: "All Systems Operational"

# Send customer communication
# "Maintenance completed successfully"
```

#### 2. Enable Monitoring Alerts

```bash
# Restore normal alert thresholds
# Enable all alerting rules
```

#### 3. Team Stand-Down

- [ ] **Team Debrief** (15 minutes)
  - What went well
  - What could be improved
  - Action items

- [ ] **Document Completion**
  - Actual vs. estimated duration
  - Issues encountered
  - Lessons learned

### First Hour Monitoring (T+90 to T+150)

- [ ] **Watch Dashboards**
  - Error rate
  - Response times
  - Database performance
  - User activity

- [ ] **Review Logs**
  ```bash
  # Check for errors
  kubectl logs -l app=api --since=1h | grep ERROR

  # Check database logs
  tail -f /var/log/postgresql/postgresql.log | grep ERROR
  ```

- [ ] **User Feedback**
  - Monitor support tickets
  - Check social media
  - Review app store reviews

### 24-Hour Follow-Up (T+24h)

#### 1. Performance Analysis

```sql
-- Query performance comparison
SELECT
  queryid,
  calls,
  total_exec_time,
  mean_exec_time,
  query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Index usage stats
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
ORDER BY idx_scan DESC
LIMIT 50;

-- Unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### 2. Data Integrity Validation

```bash
# Run data validation script
./scripts/validate-data-integrity.sh

# Check for anomalies
psql $DATABASE_URL -f scripts/data-integrity-checks.sql
```

#### 3. Backup Cleanup

```bash
# Archive migration backup
aws s3 cp /backups/citadelbuy_pre_migration_${MIGRATION_TIMESTAMP}.sql.gz \
  s3://citadelbuy-backups/production/migrations/archive/

# Remove local backup after 7 days (schedule cleanup)
find /backups -name "citadelbuy_pre_migration_*.sql.gz" -mtime +7 -delete
```

### Post-Mortem Meeting (T+48h)

#### Agenda

1. **Timeline Review** (10 min)
   - Planned vs actual duration
   - Each phase breakdown

2. **Issues Encountered** (15 min)
   - Technical issues
   - Process issues
   - Communication issues

3. **What Went Well** (10 min)
   - Successes
   - Effective processes
   - Team performance

4. **Improvements** (15 min)
   - Process improvements
   - Documentation updates
   - Tool enhancements

5. **Action Items** (10 min)
   - Assign owners
   - Set deadlines
   - Track progress

#### Document Outcomes

Create post-mortem document with:
- Executive summary
- Detailed timeline
- Issues and resolutions
- Metrics (downtime, performance impact)
- Action items
- Updated runbook (this document)

---

## Communication Templates

### T-7 Days: Initial Announcement

**Subject:** Scheduled Maintenance - [DATE] at [TIME]

**Body:**
```
Dear CitadelBuy Users,

We will be performing scheduled maintenance on [DATE] from [START TIME] to [END TIME] [TIMEZONE].

During this time:
- The platform will be in read-only mode
- You will not be able to place new orders
- Existing orders will not be affected
- You can still browse products and view your account

This maintenance will improve system performance and add new features.

We apologize for any inconvenience and appreciate your patience.

If you have any questions, please contact support@citadelbuy.com.

Best regards,
The CitadelBuy Team
```

### T-4 Hours: Maintenance Starting Soon

**Subject:** Reminder: Maintenance Starting in 4 Hours

**Body:**
```
This is a reminder that scheduled maintenance will begin in 4 hours at [TIME].

Please complete any pending transactions before [TIME].

Timeline:
- [TIME]: Maintenance begins
- [TIME]: Expected completion
- [TIME]: System fully restored

Status updates: https://status.citadelbuy.com

Thank you for your patience.
```

### T+0: Maintenance In Progress

**Subject:** Maintenance In Progress

**Body:**
```
Scheduled maintenance is now in progress.

The platform is temporarily unavailable. We expect to complete maintenance by [TIME].

Current status: https://status.citadelbuy.com

Thank you for your patience.
```

### T+Complete: Maintenance Complete

**Subject:** Maintenance Complete - CitadelBuy is Back Online

**Body:**
```
Great news! Scheduled maintenance has been completed successfully.

All systems are now operational:
✓ Website and mobile app
✓ Order processing
✓ Payment processing
✓ All features restored

What's new:
- Improved system performance
- Enhanced search capabilities
- New features [list key features]

If you experience any issues, please contact support@citadelbuy.com.

Thank you for your patience during the maintenance window.

Best regards,
The CitadelBuy Team
```

### Rollback Notification (if needed)

**Subject:** Maintenance Extended - Status Update

**Body:**
```
We encountered an unexpected issue during our scheduled maintenance.

To ensure system stability and data integrity, we are extending the maintenance window.

New expected completion time: [TIME]

We apologize for the extended downtime and will provide updates every 30 minutes.

Current status: https://status.citadelbuy.com

Thank you for your continued patience.
```

---

## Emergency Contacts

### On-Call Rotation

| Role | Primary | Backup | Phone | Email |
|------|---------|--------|-------|-------|
| Database Administrator | [Name] | [Name] | [Phone] | [Email] |
| DevOps Engineer | [Name] | [Name] | [Phone] | [Email] |
| Engineering Manager | [Name] | [Name] | [Phone] | [Email] |
| CTO | [Name] | - | [Phone] | [Email] |

### Escalation Path

1. **Level 1:** Migration Lead + DBA (0-15 minutes)
2. **Level 2:** + DevOps Engineer + Engineering Manager (15-30 minutes)
3. **Level 3:** + CTO (30+ minutes)

### External Contacts

- **Hosting Provider:** [Provider] - [Support Number]
- **Database Support:** [PostgreSQL Support] - [Support Number]
- **Payment Processor:** [Stripe Support] - [Support Number]
- **CDN Provider:** [CDN Support] - [Support Number]

### Communication Channels

- **Slack:** #migration-prod-YYYYMMDD
- **Video Call:** [Link]
- **Phone Bridge:** [Number]
- **Status Page:** https://status.citadelbuy.com
- **Incident Management:** [PagerDuty/OpsGenie/etc.]

---

## Appendix

### A. Migration Checklist

**7 Days Before:**
- [ ] Schedule maintenance window
- [ ] Notify stakeholders
- [ ] Draft customer communications
- [ ] Test on staging

**3 Days Before:**
- [ ] Audit production database
- [ ] Test backup/restore
- [ ] Verify rollback plan

**1 Day Before:**
- [ ] Verify team availability
- [ ] Code freeze
- [ ] Final customer communication

**Migration Day:**
- [ ] Team assembly (T-4h)
- [ ] Go/No-Go decision (T-30m)
- [ ] Enable maintenance mode (T+0)
- [ ] Create backup (T+5)
- [ ] Apply migrations (T+15)
- [ ] Verification (T+60)
- [ ] Remove maintenance mode (T+90)

**After Migration:**
- [ ] First hour monitoring
- [ ] 24-hour follow-up
- [ ] 48-hour post-mortem

### B. Success Criteria

**Migration Successful if:**
- ✓ All 7 migrations applied
- ✓ No data loss
- ✓ All health checks pass
- ✓ Smoke tests pass
- ✓ Performance within acceptable range
- ✓ No critical errors in logs

**Migration Failed if:**
- ✗ Data corruption
- ✗ Unrecoverable migration error
- ✗ Critical functionality broken
- ✗ Performance degradation > 70%

### C. Metrics to Track

**During Migration:**
- Start time
- End time
- Total duration
- Backup time
- Migration time per step
- Rollback (yes/no)

**Post-Migration:**
- Downtime duration
- Error rate (before/after)
- Response time (before/after)
- Database size (before/after)
- Index count (before/after)
- Support tickets related to migration

---

**Document Version:** 1.0
**Last Updated:** December 4, 2025
**Next Review:** After production deployment
**Owner:** DevOps Team
