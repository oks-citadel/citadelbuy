# Sentry Quick Reference Guide

## Overview

Quick reference for common Sentry operations and troubleshooting for CitadelBuy operations team.

---

## Quick Links

### Sentry Dashboards
- **Production Backend:** https://sentry.io/organizations/citadelbuy/projects/citadelbuy-backend-prod/
- **Production Frontend:** https://sentry.io/organizations/citadelbuy/projects/citadelbuy-web-prod/
- **Production Mobile:** https://sentry.io/organizations/citadelbuy/projects/citadelbuy-mobile-prod/

### Internal Resources
- **Status Page:** https://status.citadelbuy.com
- **Runbooks:** https://docs.citadelbuy.com/runbooks
- **On-Call Schedule:** https://citadelbuy.pagerduty.com/schedules

---

## Common Sentry Queries

### Find Recent Errors
```
is:unresolved firstSeen:-1h
```

### Find High-Impact Errors
```
is:unresolved user.count:>=50
```

### Find Production Errors
```
is:unresolved environment:production level:error
```

### Find Errors in Specific Module
```
is:unresolved transaction:*checkout*
```

### Find Database Errors
```
is:unresolved error.type:*Database* OR error.type:*Prisma*
```

### Find Payment Errors
```
is:unresolved error.type:*Stripe* OR transaction:*payment*
```

### Find Performance Issues
```
is:unresolved transaction.duration:>2s
```

### Compare Releases
```
release:citadelbuy-backend@2.0.0 vs release:citadelbuy-backend@1.9.0
```

---

## Environment Variables

### Backend
```bash
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
SENTRY_ENVIRONMENT=production|staging|development
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_RELEASE=citadelbuy-backend@2.0.0
```

### Frontend
```bash
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=citadelbuy
SENTRY_PROJECT=citadelbuy-web-prod
SENTRY_RELEASE=citadelbuy-web@2.0.0
```

---

## Alert Response Checklist

### When Alert Fires

#### 1. Acknowledge (< 5 minutes)
- [ ] Open Sentry issue link
- [ ] Check severity and impact
- [ ] Acknowledge in PagerDuty
- [ ] Post to Slack: "Investigating [issue]"

#### 2. Assess (< 10 minutes)
- [ ] How many users affected?
- [ ] Is it still happening?
- [ ] What changed recently?
- [ ] Check related systems

#### 3. Triage (< 15 minutes)
- [ ] Determine severity: Critical/High/Medium/Low
- [ ] Identify root cause category
- [ ] Escalate if needed
- [ ] Assign to appropriate team

#### 4. Resolve
- [ ] Implement fix
- [ ] Deploy to production
- [ ] Monitor Sentry for 30 minutes
- [ ] Mark issue as resolved
- [ ] Update Slack thread

#### 5. Follow-Up
- [ ] Document incident
- [ ] Schedule post-mortem (if critical)
- [ ] Create prevention tasks
- [ ] Update runbooks

---

## Common Issues and Quick Fixes

### Issue: High Error Rate

**Quick Check:**
```bash
# Check application health
curl https://api.citadelbuy.com/health

# Check recent deployments
kubectl rollout history deployment/citadelbuy-backend -n production

# Check resource usage
kubectl top pods -n production
```

**Quick Fix:**
```bash
# Rollback if needed
kubectl rollout undo deployment/citadelbuy-backend -n production

# Scale up if resource issue
kubectl scale deployment/citadelbuy-backend --replicas=5 -n production
```

### Issue: Database Connection Errors

**Quick Check:**
```bash
# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool
redis-cli INFO stats | grep connected_clients
```

**Quick Fix:**
```bash
# Restart problematic pods
kubectl rollout restart deployment/citadelbuy-backend -n production

# Increase connection pool (if capacity exists)
# Update DATABASE_URL with ?connection_limit=20
```

### Issue: Payment Processing Failures

**Quick Check:**
1. Check Stripe Dashboard: https://dashboard.stripe.com
2. Check Stripe Status: https://status.stripe.com
3. Verify webhook endpoints

**Quick Fix:**
- If Stripe down: Enable maintenance mode
- If configuration issue: Verify webhook secrets
- If rate limit: Implement backoff

### Issue: Memory Leak

**Quick Check:**
```bash
# Check memory usage
kubectl top pods -n production

# Check memory trends
# Navigate to: Monitoring Dashboard → Memory Usage
```

**Quick Fix:**
```bash
# Restart affected pods
kubectl delete pod [pod-name] -n production

# Schedule investigation
# Create ticket for memory profiling
```

---

## Critical Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error Rate | > 50/min | > 100/min | Investigate immediately |
| Response Time (P95) | > 1s | > 2s | Check performance |
| Error Rate (%) | > 0.5% | > 1% | Check for issues |
| Users Affected | > 100 | > 500 | High priority |
| Database Connections | > 80% | > 90% | Scale database |
| Memory Usage | > 80% | > 90% | Restart/scale |
| CPU Usage | > 70% | > 85% | Scale horizontally |

---

## Escalation Contacts

### Level 1: On-Call Engineers
- **Platform:** platform-oncall@citadelbuy.com
- **Frontend:** frontend-oncall@citadelbuy.com
- **Mobile:** mobile-oncall@citadelbuy.com
- **Payments:** payments-oncall@citadelbuy.com

### Level 2: Team Leads
- **Platform Lead:** platform-lead@citadelbuy.com
- **Frontend Lead:** frontend-lead@citadelbuy.com
- **Mobile Lead:** mobile-lead@citadelbuy.com

### Level 3: Management
- **Engineering Manager:** engineering-manager@citadelbuy.com
- **VP Engineering:** vp-engineering@citadelbuy.com

### Critical Incidents
- **All Hands:** engineering-all@citadelbuy.com
- **Executive Team:** executives@citadelbuy.com

---

## Slack Channels

| Channel | Purpose |
|---------|---------|
| #incidents-critical | Critical production incidents |
| #platform-alerts | Warning-level platform alerts |
| #payments-team | Payment-specific issues |
| #frontend-team | Frontend-specific issues |
| #backend-team | Backend-specific issues |
| #mobile-team | Mobile app issues |
| #releases | Deployment notifications |
| #weekly-metrics | Weekly summaries |

---

## Useful Commands

### Sentry CLI

```bash
# Login
sentry-cli login

# List projects
sentry-cli projects list

# Create release
sentry-cli releases new citadelbuy-backend@2.0.0

# Upload source maps
sentry-cli sourcemaps upload \
  --org citadelbuy \
  --project citadelbuy-web-prod \
  --release citadelbuy-web@2.0.0 \
  .next/static/chunks

# Finalize release
sentry-cli releases finalize citadelbuy-backend@2.0.0

# List releases
sentry-cli releases list
```

### Kubernetes

```bash
# Get pod status
kubectl get pods -n production

# Check logs
kubectl logs -f deployment/citadelbuy-backend -n production --tail=100

# Describe pod
kubectl describe pod [pod-name] -n production

# Get events
kubectl get events -n production --sort-by='.lastTimestamp'

# Port forward
kubectl port-forward service/citadelbuy-backend 4000:4000 -n production

# Execute command in pod
kubectl exec -it [pod-name] -n production -- /bin/sh
```

### Database

```bash
# Connect to database
psql $DATABASE_URL

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;

# Kill long-running query
SELECT pg_terminate_backend([pid]);

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Redis

```bash
# Connect to Redis
redis-cli

# Check info
INFO stats

# Check keys
KEYS *

# Get value
GET key_name

# Clear cache (dangerous!)
FLUSHDB
```

---

## Monitoring URLs

### Internal Dashboards
- **Application Dashboard:** https://grafana.citadelbuy.com/d/app-overview
- **Infrastructure Dashboard:** https://grafana.citadelbuy.com/d/infra-overview
- **Database Dashboard:** https://grafana.citadelbuy.com/d/database-metrics

### External Services
- **Sentry:** https://sentry.io/organizations/citadelbuy/
- **PagerDuty:** https://citadelbuy.pagerduty.com/
- **Stripe:** https://dashboard.stripe.com/
- **AWS Console:** https://console.aws.amazon.com/

### Status Pages
- **CitadelBuy Status:** https://status.citadelbuy.com
- **Sentry Status:** https://status.sentry.io
- **Stripe Status:** https://status.stripe.com
- **AWS Status:** https://status.aws.amazon.com

---

## Decision Tree

```
┌─────────────────────────┐
│  Sentry Alert Received  │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Critical?     │
    │ (>100 users)  │
    └───┬───────┬───┘
        │       │
    YES │       │ NO
        │       │
        ▼       ▼
    ┌──────┐  ┌──────────────┐
    │ Page │  │ Assign to    │
    │ Team │  │ Team & Monitor│
    └──┬───┘  └──────────────┘
       │
       ▼
    ┌──────────────────┐
    │ Start Incident   │
    │ Response         │
    └────┬─────────────┘
         │
         ▼
    ┌──────────────────┐
    │ Recent Deploy?   │
    └───┬───────┬──────┘
        │       │
    YES │       │ NO
        │       │
        ▼       ▼
    ┌──────┐  ┌──────────────┐
    │ Roll │  │ Investigate  │
    │ Back │  │ Root Cause   │
    └──────┘  └──────────────┘
```

---

## Severity Definitions

### Critical (P0)
- All users or critical functionality affected
- Revenue-impacting
- Security breach
- Data loss risk
- **Response Time:** < 15 minutes
- **Resolution Time:** < 2 hours

### High (P1)
- Many users affected
- Major feature broken
- Significant performance degradation
- **Response Time:** < 1 hour
- **Resolution Time:** < 8 hours

### Medium (P2)
- Some users affected
- Minor feature issues
- Moderate performance issues
- **Response Time:** < 4 hours
- **Resolution Time:** < 2 days

### Low (P3)
- Few users affected
- Cosmetic issues
- Edge cases
- **Response Time:** < 1 day
- **Resolution Time:** < 1 week

---

## Best Practices

### Do's
✓ Acknowledge alerts promptly
✓ Document investigation steps
✓ Communicate status updates
✓ Follow escalation procedures
✓ Create post-incident reports
✓ Update runbooks after incidents
✓ Test fixes in staging first

### Don'ts
✗ Ignore alerts
✗ Make changes without backup plan
✗ Deploy untested fixes to production
✗ Skip documentation
✗ Forget to notify stakeholders
✗ Leave issues unresolved
✗ Work on multiple critical issues alone

---

## Emergency Procedures

### Complete System Outage

1. **Immediate Actions (0-5 minutes)**
   - Page all senior engineers
   - Post to #incidents-critical
   - Check external services (AWS, Stripe, etc.)
   - Activate incident response team

2. **Assessment (5-15 minutes)**
   - Check application health endpoints
   - Review recent deployments
   - Check infrastructure metrics
   - Identify scope of outage

3. **Recovery (15+ minutes)**
   - Rollback recent changes if applicable
   - Scale up infrastructure if needed
   - Restore from backups if necessary
   - Enable maintenance page if needed

4. **Communication**
   - Update status page every 15 minutes
   - Notify customers via email
   - Post updates to social media
   - Inform executive team

### Data Breach

1. **Immediate Actions**
   - Page security team
   - Isolate affected systems
   - Preserve logs and evidence
   - Notify security@citadelbuy.com

2. **Follow security incident response plan**
   - See: docs/SECURITY_INCIDENT_RESPONSE.md

---

## Additional Resources

- **Full Documentation:** [docs/SENTRY_DASHBOARD_SETUP.md](./SENTRY_DASHBOARD_SETUP.md)
- **Alert Templates:** [docs/templates/sentry-alert-templates.yml](./templates/sentry-alert-templates.yml)
- **Debugging Workflows:** [docs/SENTRY_DEBUGGING_WORKFLOWS.md](./SENTRY_DEBUGGING_WORKFLOWS.md)
- **Notification Setup:** [docs/SENTRY_NOTIFICATIONS_SETUP.md](./SENTRY_NOTIFICATIONS_SETUP.md)
- **Project Configuration:** [docs/SENTRY_PROJECT_CONFIGURATION.md](./SENTRY_PROJECT_CONFIGURATION.md)

---

**Last Updated:** 2024-12-04
**Document Owner:** DevOps Team
**Review Schedule:** Monthly
