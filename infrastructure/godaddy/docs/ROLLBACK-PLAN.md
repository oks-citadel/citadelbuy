# Broxiva Migration Rollback Plan

## Overview

This document outlines the procedures to rollback to Vercel/Railway if the GoDaddy migration fails or encounters critical issues.

**Rollback Decision Criteria:**
- P0 bugs affecting >10% of users
- Data corruption or loss
- Payment processing failures
- Complete service unavailability >15 minutes
- Security breach detected

---

## Rollback Windows

| Phase | Rollback Complexity | Estimated Time |
|-------|---------------------|----------------|
| Before DNS cutover | Trivial | 0 minutes |
| Within DNS TTL (60s) | Easy | 1-5 minutes |
| 0-24 hours post-cutover | Moderate | 15-30 minutes |
| 24-48 hours post-cutover | Complex | 1-2 hours |
| After decommissioning | Very Complex | 2-4 hours |

---

## Rollback Procedures

### Scenario 1: Before DNS Cutover

**Situation:** Issues discovered during GoDaddy setup/testing before DNS is changed.

**Action:** Simply abandon GoDaddy deployment.

```bash
# No action required
# Original Vercel/Railway continues to serve traffic
# GoDaddy setup can be discarded or fixed
```

**Cleanup (Optional):**
```bash
# Stop PM2 processes on GoDaddy
pm2 delete all

# Stop Docker services
docker-compose -f docker-compose.godaddy.yml down
```

---

### Scenario 2: Within DNS TTL Window (0-5 minutes)

**Situation:** Critical issue discovered immediately after DNS cutover.

**Action:** Revert DNS records immediately.

**Step 1: Revert DNS**

1. Go to GoDaddy DNS Management
2. Update A records to original values:

| Type | Host | Revert To |
|------|------|-----------|
| A | @ | (remove or point to Vercel) |
| A | www | Vercel IP or CNAME |
| A | api | Railway domain |

3. Save changes

**Step 2: Verify Reversion**

```bash
# Check DNS is reverting
watch -n 5 "dig +short www.broxiva.com"

# Expected: Should show Vercel/Railway IPs within 60 seconds
```

**Step 3: Confirm Original Service**

```bash
# Test original endpoints
curl https://www.broxiva.com
curl https://api.broxiva.com/api/health
```

---

### Scenario 3: 0-24 Hours Post-Cutover

**Situation:** Issues discovered after DNS has propagated globally.

**Action:** Revert DNS and restore if needed.

**Step 1: Revert DNS (Same as Scenario 2)**

**Step 2: Verify Railway Database is Still Active**

```bash
# Check Railway dashboard
# Database should still be running if not decommissioned
railway status
```

**Step 3: If Data Changes Occurred on GoDaddy**

```bash
# Export GoDaddy database changes
pg_dump -U broxiva broxiva > godaddy_changes_$(date +%Y%m%d).sql

# Compare and selectively apply to Railway
# This requires manual review
```

**Step 4: Notify Users**

```
Subject: Brief Service Update

We experienced a brief service interruption while performing
infrastructure maintenance. All services have been restored.
No data was lost. We apologize for any inconvenience.
```

---

### Scenario 4: 24-48 Hours Post-Cutover

**Situation:** Significant issues discovered after extended operation on GoDaddy.

**Action:** Careful rollback with data consideration.

**Step 1: Create GoDaddy Database Backup**

```bash
# Full backup of current state
pg_dump -U broxiva broxiva | gzip > godaddy_full_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Step 2: Assess Data Changes**

Compare:
- New user registrations
- New orders
- Updated user data
- Transaction records

```sql
-- Get changes since migration
SELECT COUNT(*) as new_users FROM "User"
WHERE "createdAt" > 'MIGRATION_TIMESTAMP';

SELECT COUNT(*) as new_orders FROM "Order"
WHERE "createdAt" > 'MIGRATION_TIMESTAMP';
```

**Step 3: Restore Railway Service**

```bash
# Ensure Railway services are running
railway up

# If database was stopped, restore from backup
cat railway_backup.sql | railway run psql
```

**Step 4: Merge Data (If Necessary)**

If users created accounts/orders on GoDaddy:
1. Export new records from GoDaddy
2. Import to Railway database
3. Verify data integrity

**Step 5: Revert DNS**

Same as previous scenarios.

**Step 6: Extended Verification**

```bash
# Test all critical flows
- User login (existing + new users)
- Order history
- Active carts
- Payment methods
```

---

### Scenario 5: After Decommissioning

**Situation:** Critical issue discovered after Vercel/Railway have been deleted.

**Action:** Full restoration required.

**Step 1: DON'T PANIC**

All backups should exist at `/opt/backups/decommission_*`

**Step 2: Restore Railway**

```bash
# Create new Railway project
railway init

# Provision PostgreSQL
railway add postgresql

# Get new database URL
railway variables

# Restore from backup
gunzip -c /opt/backups/decommission_*/final_database_backup.sql.gz | \
  railway run psql
```

**Step 3: Redeploy to Railway**

```bash
# Deploy backend
cd /opt/broxiva/source/apps/api
railway up
```

**Step 4: Restore Vercel**

```bash
# In project directory
cd /opt/broxiva/source

# Link to Vercel
vercel link

# Deploy
vercel --prod
```

**Step 5: Update DNS**

Point DNS back to restored services.

**Step 6: Merge Any New Data**

Export data from GoDaddy, import to restored services.

---

## Rollback Communication Templates

### Internal Alert

```
ROLLBACK INITIATED

Time: [TIMESTAMP]
Reason: [BRIEF REASON]
Current Status: [REVERTING DNS / RESTORING DB / etc.]
ETA to Resolution: [TIME]

Actions Required:
- [TEAM MEMBER]: Monitor DNS propagation
- [TEAM MEMBER]: Verify service restoration
- [TEAM MEMBER]: Prepare user communication
```

### User Communication

```
Subject: Service Update - [TIMESTAMP]

Dear Broxiva Users,

We detected an issue with a recent infrastructure update and have
rolled back to our previous configuration to ensure service stability.

Current Status: Services are fully operational
Impact: [Brief description, e.g., "Some users may have experienced
brief login issues"]

Your data is safe and all transactions are preserved.

We apologize for any inconvenience and thank you for your patience.

- The Broxiva Team
```

---

## Post-Rollback Actions

### Immediate (0-1 hour)

- [ ] Confirm all services operational
- [ ] Check error rates returning to normal
- [ ] Verify no data loss
- [ ] Send user communication if needed

### Short-term (1-24 hours)

- [ ] Root cause analysis
- [ ] Document what went wrong
- [ ] Update migration plan
- [ ] Schedule post-mortem

### Long-term

- [ ] Fix identified issues
- [ ] Re-test migration in staging
- [ ] Plan new migration window
- [ ] Update runbook with lessons learned

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| DevOps Lead | [CONTACT] | 24/7 |
| Backend Lead | [CONTACT] | Business hours |
| Database Admin | [CONTACT] | 24/7 |
| GoDaddy Support | 1-480-505-8877 | 24/7 |
| Railway Support | https://railway.app/help | 24/7 |

---

## Prevention Checklist

Before next migration attempt:

- [ ] All issues from failed migration documented
- [ ] Fixes tested in staging environment
- [ ] Extended testing period completed
- [ ] Rollback tested successfully
- [ ] Team briefed on updated procedures
- [ ] Monitoring enhanced for known issues
