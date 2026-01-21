# Broxiva Operations Guide

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Classification:** Operations Documentation

---

## Overview

This guide provides comprehensive operations documentation for the Broxiva E-Commerce Platform. It covers deployment procedures, monitoring, incident response, and day-to-day operational tasks.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Incident Response](#incident-response)
- [Maintenance Tasks](#maintenance-tasks)
- [Troubleshooting](#troubleshooting)
- [Runbooks](#runbooks)

---

## Quick Reference

### Production URLs

| Service | URL |
|---------|-----|
| Website | https://www.broxiva.com |
| API | https://api.broxiva.com |
| API Docs | https://api.broxiva.com/docs |
| CDN | https://cdn.broxiva.com |
| Status Page | https://status.broxiva.com |

### Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api |
| Swagger | http://localhost:4000/api/docs |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| Prisma Studio | http://localhost:5555 |

### Common Commands

```bash
# Start development environment
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Database operations
pnpm db:migrate
pnpm db:seed
pnpm prisma:studio

# Docker operations
pnpm docker:up
pnpm docker:down
pnpm docker:logs
```

---

## Deployment

### Deployment Environments

| Environment | Branch | Auto-Deploy | URL |
|-------------|--------|-------------|-----|
| Development | `develop` | Yes | dev.broxiva.com |
| Staging | `staging` | Yes | staging.broxiva.com |
| Production | `main` | Manual | www.broxiva.com |

### Deployment Process

#### 1. Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Code review approved
- [ ] Database migrations reviewed
- [ ] Environment variables verified
- [ ] Rollback plan documented

#### 2. Deploy to Staging

```bash
# Merge to staging branch
git checkout staging
git merge develop
git push origin staging
# Auto-deploys via GitHub Actions
```

#### 3. Staging Verification

- [ ] Smoke tests passing
- [ ] API health check OK
- [ ] Frontend loads correctly
- [ ] Critical user flows working

#### 4. Deploy to Production

```bash
# Create release
git checkout main
git merge staging
git tag v1.x.x
git push origin main --tags
# Requires manual approval in GitHub Actions
```

#### 5. Post-Deployment Verification

- [ ] Production health check
- [ ] Monitor error rates (Sentry)
- [ ] Check performance metrics
- [ ] Verify database migrations applied

### Rollback Procedures

#### Application Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/broxiva-api -n broxiva-production
kubectl rollout undo deployment/broxiva-web -n broxiva-production

# Verify rollback
kubectl rollout status deployment/broxiva-api -n broxiva-production
```

#### Database Rollback

```bash
# List migrations
pnpm prisma migrate status

# Rollback last migration (requires manual SQL)
# Consult docs/api/database/MIGRATION_QUICK_REFERENCE.md
```

---

## Monitoring

### Monitoring Stack

| Tool | Purpose | URL |
|------|---------|-----|
| Prometheus | Metrics collection | :9090 |
| Grafana | Dashboards | :3001 |
| Sentry | Error tracking | sentry.io |
| Azure Monitor | Cloud monitoring | Azure Portal |
| Application Insights | APM | Azure Portal |

### Key Metrics to Monitor

#### Application Metrics

| Metric | Warning | Critical |
|--------|---------|----------|
| API Response Time (p95) | > 500ms | > 1000ms |
| Error Rate | > 1% | > 5% |
| Request Rate | - | Sudden drop/spike |
| Active Users | - | Unusual patterns |

#### Infrastructure Metrics

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 70% | > 90% |
| Database Connections | > 80% | > 95% |

### Alerting

Alerts are configured in Prometheus and sent via:
- PagerDuty (critical)
- Slack (#alerts channel)
- Email

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 | Service Down | 15 min | Complete outage, data breach |
| P2 | Major Impact | 30 min | Checkout broken, auth failing |
| P3 | Minor Impact | 2 hours | Single feature degraded |
| P4 | Low Impact | 24 hours | UI issues, minor bugs |

### Incident Response Process

1. **Detect** - Alert triggered or user report
2. **Assess** - Determine severity and impact
3. **Communicate** - Notify stakeholders
4. **Mitigate** - Apply immediate fix
5. **Resolve** - Implement permanent solution
6. **Review** - Post-incident analysis

### Communication Templates

#### Status Page Update
```
[Status: Investigating/Identified/Monitoring/Resolved]

We are currently investigating [issue description].

Affected services: [list services]
Impact: [user impact description]

We will provide updates every [X] minutes.
```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Review error logs in Sentry
- [ ] Check monitoring dashboards
- [ ] Verify backup completion
- [ ] Review security alerts

### Weekly Tasks

- [ ] Review performance metrics
- [ ] Check disk usage trends
- [ ] Review slow queries
- [ ] Update dependencies (non-breaking)
- [ ] Review security advisories

### Monthly Tasks

- [ ] Rotate secrets
- [ ] Review access permissions
- [ ] Capacity planning review
- [ ] DR drill (quarterly)
- [ ] Security patch updates

### Database Maintenance

```bash
# View database size
pnpm prisma:studio

# Run VACUUM (PostgreSQL)
# Connect to database and run:
# VACUUM ANALYZE;

# Check for slow queries
# Review pg_stat_statements
```

---

## Troubleshooting

### Common Issues

#### API Not Responding

1. Check pod status:
   ```bash
   kubectl get pods -n broxiva-production
   ```

2. Check logs:
   ```bash
   kubectl logs -n broxiva-production -l app=broxiva-api --tail=100
   ```

3. Check database connection:
   ```bash
   kubectl exec -it <pod-name> -n broxiva-production -- pg_isready -h <db-host>
   ```

#### High Memory Usage

1. Check pod resources:
   ```bash
   kubectl top pods -n broxiva-production
   ```

2. Review memory leaks in APM

3. Scale if needed:
   ```bash
   kubectl scale deployment/broxiva-api --replicas=5 -n broxiva-production
   ```

#### Database Connection Issues

1. Check connection pool:
   ```bash
   # View active connections
   SELECT count(*) FROM pg_stat_activity;
   ```

2. Check for long-running queries:
   ```bash
   SELECT pid, query, state, age(now(), query_start)
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY query_start;
   ```

3. Kill problematic queries if needed:
   ```bash
   SELECT pg_terminate_backend(<pid>);
   ```

---

## Runbooks

### Runbook: Scale API Pods

**When:** High load or slow responses

```bash
# Check current replicas
kubectl get deployment broxiva-api -n broxiva-production

# Scale up
kubectl scale deployment/broxiva-api --replicas=5 -n broxiva-production

# Verify scaling
kubectl rollout status deployment/broxiva-api -n broxiva-production

# Monitor metrics
# Check Grafana dashboard
```

### Runbook: Database Failover

**When:** Primary database unavailable

1. Verify replica status
2. Promote replica to primary (Azure Portal or CLI)
3. Update connection strings if needed
4. Verify application connectivity
5. Monitor for data consistency

### Runbook: Clear Redis Cache

**When:** Stale data issues or cache corruption

```bash
# Connect to Redis pod
kubectl exec -it <redis-pod> -n broxiva-production -- redis-cli

# Clear all keys (CAUTION)
FLUSHALL

# Or clear specific pattern
KEYS "user:*" | xargs DEL
```

### Runbook: Force Logout All Users

**When:** Security incident requiring session invalidation

```bash
# Blacklist all tokens by incrementing token version
# This requires a database update and is handled by the auth service
```

---

## Related Documentation

- [Infrastructure README](../infrastructure/README.md)
- [Kubernetes Deployment](../infrastructure/kubernetes/README.md)
- [Docker Configuration](../infrastructure/docker/README.md)
- [Security Documentation](../../SECURITY/README.md)
- [API Documentation](../api/README.md)

---

## Contacts

### On-Call Schedule

- Primary: DevOps Team (PagerDuty)
- Secondary: Backend Team Lead
- Escalation: CTO

### Vendor Support

| Vendor | Support URL | SLA |
|--------|-------------|-----|
| Azure | portal.azure.com | Enterprise |
| Stripe | dashboard.stripe.com | 24/7 |
| Sentry | sentry.io | Business |

---

**Maintained by:** DevOps Team
**Review Cycle:** Monthly
**Last Reviewed:** 2026-01-05
