# Broxiva Operations Manual

**Version:** 1.0.0
**Last Updated:** January 2026
**Owner:** Platform Engineering & SRE Team

---

## Table of Contents

1. [On-Call Procedures](#1-on-call-procedures)
2. [Incident Response Workflow](#2-incident-response-workflow)
3. [SLIs/SLOs](#3-slisslos)
4. [Runbook Links](#4-runbook-links)
5. [Escalation Matrix](#5-escalation-matrix)
6. [Common Operations Tasks](#6-common-operations-tasks)
7. [Disaster Recovery Summary](#7-disaster-recovery-summary)
8. [Monitoring & Alerting Overview](#8-monitoring--alerting-overview)
9. [Maintenance Windows](#9-maintenance-windows)

---

## 1. On-Call Procedures

### Schedule

- **Rotation:** Weekly (Monday 9:00 AM to Monday 9:00 AM UTC)
- **Coverage:** 24/7 including weekends and holidays
- **Handoff:** Monday morning standup
- **Backup:** Secondary on-call for escalation

### Response Times

| Time Period | P1/P2 Response | P3/P4 Response |
|-------------|----------------|----------------|
| Business Hours (9 AM - 6 PM) | 5 minutes | 1 hour |
| After Hours & Weekends | 15 minutes | Next business day |

### On-Call Duties

**During Business Hours:**
- Monitor #alerts Slack channel
- Respond to alerts within 5 minutes
- Participate in incident response
- Coordinate fixes with team

**After Hours:**
- Respond to P1/P2 alerts within 15 minutes
- Be available by phone and laptop
- Escalate if needed
- Document all actions taken

### Handoff Checklist

**Outgoing On-Call:**
- [ ] Brief incoming on-call on current issues
- [ ] Share ongoing investigations
- [ ] Review open incidents and tickets
- [ ] Confirm upcoming events (deployments, maintenance)
- [ ] Transfer PagerDuty responsibility

**Incoming On-Call:**
- [ ] Test PagerDuty notifications
- [ ] Review Grafana dashboards
- [ ] Check recent alerts and incidents
- [ ] Verify VPN and kubectl access

> **Full Details:** See `/organization/docs/root/INCIDENT_RESPONSE.md` - On-Call Responsibilities section

---

## 2. Incident Response Workflow

### Severity Classification

| Severity | Impact | Response Time | Resolution Target | Update Frequency |
|----------|--------|---------------|-------------------|------------------|
| **P1 Critical** | Production down, data loss, security breach | Immediate (< 5 min) | 1 hour | Every 15 minutes |
| **P2 High** | Major degradation, >10% users affected | 15 minutes | 4 hours | Every 30 minutes |
| **P3 Medium** | Non-critical feature down, workaround exists | 1 hour | 24 hours | Every 2 hours |
| **P4 Low** | Cosmetic issues, minimal impact | Next business day | 1 week | As needed |

### Response Phases

**Phase 1: Detection & Triage (0-5 min)**
1. Acknowledge alert in PagerDuty
2. Post in #incidents Slack channel
3. Assess severity and impact
4. Escalate if P1/P2

**Phase 2: Investigation (5-30 min)**
1. Gather information (health checks, logs, metrics)
2. Review recent changes
3. Form hypothesis
4. Post status update

**Phase 3: Mitigation (Variable)**
1. Identify quick fix (rollback, scale, disable feature)
2. Implement fix
3. Verify recovery

**Phase 4: Recovery (30-60 min)**
1. Confirm full recovery
2. Monitor for 1-2 hours
3. Post resolution update

**Phase 5: Post-Incident (24-48 hours)**
1. Schedule post-incident review
2. Document timeline and root cause
3. Identify action items
4. Publish report

### Quick Commands

```bash
# Check application health
curl https://api.broxiva.com/api/health/detailed

# Check pod status
kubectl get pods -n broxiva

# View recent logs
kubectl logs -n broxiva -l app=broxiva-api --tail=200 --timestamps

# Quick rollback
kubectl rollout undo deployment/broxiva-api -n broxiva

# Scale up
kubectl scale deployment/broxiva-api -n broxiva --replicas=10
```

> **Full Details:** See `/organization/docs/root/INCIDENT_RESPONSE.md`

---

## 3. SLIs/SLOs

### Service Level Objectives

| Service | SLI | Target | Max Acceptable | Measurement |
|---------|-----|--------|----------------|-------------|
| **API Availability** | Uptime | 99.9% | 99.5% | Uptime monitoring |
| **API Latency** | Response time (p95) | < 500ms | < 2s | Prometheus metrics |
| **API Error Rate** | HTTP 5xx errors | < 0.1% | < 1% | Error rate tracking |
| **Web Page Load** | Time to interactive | < 2s | < 5s | Core Web Vitals |
| **Database Query** | Query time (p95) | < 100ms | < 1s | PostgreSQL metrics |
| **Cache Hit Rate** | Redis hit ratio | > 85% | > 70% | Redis metrics |

### Component-Specific Recovery Objectives

| Component | RPO (Data Loss) | RTO (Downtime) | Priority |
|-----------|-----------------|----------------|----------|
| **Database (PostgreSQL)** | 15 min | 30 min | Critical |
| **Redis Cache** | 5 min | 15 min | High |
| **Application State** | 0 (stateless) | 15 min | Critical |
| **File Storage (S3)** | 1 hour | 2 hours | Medium |
| **Logs** | 24 hours | N/A | Low |

### Error Budget

- **Monthly Uptime Target:** 99.9% = 43.2 minutes of allowed downtime
- **Burn Rate Alerts:** Triggered when consuming budget faster than expected

---

## 4. Runbook Links

### Deployment & Operations

| Runbook | Location | Purpose |
|---------|----------|---------|
| Deployment Runbook | `/organization/docs/root/DEPLOYMENT_RUNBOOK.md` | Standard deployment procedures |
| Migration Runbook | `/organization/docs/root/MIGRATION_PRODUCTION_RUNBOOK.md` | Production migration steps |
| Disaster Recovery | `/organization/docs/root/DISASTER_RECOVERY.md` | DR procedures and failover |
| Incident Response | `/organization/docs/root/INCIDENT_RESPONSE.md` | Incident handling procedures |
| Monitoring Guide | `/organization/infrastructure/docs/MONITORING_GUIDE.md` | Observability and alerting |

### Issue-Specific Runbooks

Referenced in `/organization/infrastructure/docs/MONITORING_GUIDE.md`:

| Issue | Runbook Section | Quick Action |
|-------|-----------------|--------------|
| Node Failure | #runbook-node-failure | Cordon, drain, replace |
| High CPU | #runbook-high-cpu | Scale horizontally/vertically |
| Pod Crashes | #runbook-pod-crashes | Check logs, restart, fix config |
| High Error Rate | #runbook-high-errors | Scale, rollback, or hotfix |
| DB Connection Issues | #runbook-db-connection | Reset connections, scale |
| Certificate Expiry | #runbook-cert-renewal | Renew via cert-manager or manual |

---

## 5. Escalation Matrix

### Escalation Chain

```
Level 1: On-Call Engineer (Primary Responder)
    |-- P1/P2 or unresolved after 30 min
    v
Level 2: Platform Lead / Senior Engineer
    |-- P1 or unresolved after 1 hour
    v
Level 3: Engineering Manager / CTO
    |-- Business impact or legal concerns
    v
Level 4: CEO / Executive Team
```

### Contact Information

| Role | Contact Method | Escalation Trigger |
|------|----------------|-------------------|
| **On-Call Engineer** | PagerDuty, Slack @oncall-engineer | First responder |
| **Platform Lead** | Slack @platform-lead, Phone | P1/P2 or 30 min unresolved |
| **Engineering Manager** | Slack @eng-manager, Email | P1 or 1 hour unresolved |
| **CTO** | Slack @cto, Phone | Executive decisions |
| **Security Team** | Slack #security-incidents | Security events |

### When to Escalate Immediately (P1)

- Service completely down
- Data breach suspected
- Payment processing failure
- Cannot identify root cause within 15 minutes
- Active security attack

### Communication Channels

| Channel | Purpose |
|---------|---------|
| #incidents | Primary incident channel |
| #alerts | Automated alerts |
| #devops | Infrastructure discussions |
| #security-incidents | Security events |
| status.broxiva.com | Public status page |

---

## 6. Common Operations Tasks

### Health Checks

```bash
# Overall health
kubectl get pods -n broxiva && curl https://api.broxiva.com/api/health

# Check all services
kubectl get svc -n broxiva

# Check resource usage
kubectl top pods -n broxiva
kubectl top nodes
```

### Scaling

```bash
# Scale API pods
kubectl scale deployment/broxiva-api -n broxiva --replicas=10

# Scale workers
kubectl scale deployment/broxiva-worker -n broxiva --replicas=5
```

### Deployments

```bash
# Rollback deployment
kubectl rollout undo deployment/broxiva-api -n broxiva

# Check rollout history
kubectl rollout history deployment/broxiva-api -n broxiva

# Restart deployment
kubectl rollout restart deployment/broxiva-api -n broxiva
```

### Database Operations

```bash
# Check database connections
kubectl exec -it deployment/broxiva-api -n broxiva -- npx prisma studio

# Kill idle connections (emergency)
# Connect to PostgreSQL and run:
# SELECT pg_terminate_backend(pid) FROM pg_stat_activity
# WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';
```

### Cache Operations

```bash
# Check Redis status
kubectl exec -it deployment/redis -n broxiva -- redis-cli INFO

# Clear cache (use with caution)
kubectl exec -it deployment/redis -n broxiva -- redis-cli FLUSHDB
```

### Log Access

```bash
# View API logs
kubectl logs -n broxiva -l app=broxiva-api --tail=100 --timestamps

# Follow logs
kubectl logs -n broxiva -l app=broxiva-api -f

# Previous container logs (after crash)
kubectl logs <pod-name> -n broxiva --previous
```

### Secret Management

```bash
# View secret (base64 encoded)
kubectl get secret broxiva-secrets -n broxiva -o jsonpath='{.data.KEY_NAME}' | base64 -d

# Update secret
kubectl create secret generic broxiva-secrets \
  --from-literal=KEY_NAME=value \
  -n broxiva --dry-run=client -o yaml | kubectl apply -f -
```

---

## 7. Disaster Recovery Summary

### Recovery Objectives

| Metric | Target | Maximum Acceptable |
|--------|--------|-------------------|
| **RTO (Recovery Time)** | 1 hour | 4 hours |
| **RPO (Data Loss)** | 15 minutes | 1 hour |
| **Data Loss Tolerance** | < 0.1% | < 1% |

### Recovery Strategy

- **Primary Region:** East US (Production)
- **Secondary Region:** West US (DR Site)
- **Strategy:** Multi-region active-passive with geo-redundant storage

### Backup Schedule

| Component | Frequency | Retention |
|-----------|-----------|-----------|
| Database Full Backup | Daily (2:00 AM UTC) | 90 days (primary), 365 days (secondary) |
| Database Incremental | Every 6 hours | 30 days |
| WAL Archiving | Continuous | 7 days |
| Kubernetes Config | Daily (1:00 AM UTC) | 90 days |
| Redis | Every 6 hours | 7 days |
| File Storage | Daily (3:00 AM UTC) | 30 days (hot), 365 days (cold) |

### Regional Failover Steps

1. Declare disaster event
2. Activate DR team
3. Verify backup availability in West US
4. Restore latest database backup
5. Deploy applications from container registry
6. Update DNS to West US endpoints
7. Verify service functionality
8. Monitor for 24 hours

### DR Testing Schedule

| Quarter | Test Type | Scope |
|---------|-----------|-------|
| Q1 | Database restore | Full database recovery |
| Q2 | Regional failover | Complete failover to West US |
| Q3 | Ransomware simulation | Restore from offline backups |
| Q4 | Full disaster drill | All systems recovery |

> **Full Details:** See `/organization/docs/root/DISASTER_RECOVERY.md`

---

## 8. Monitoring & Alerting Overview

### Monitoring Stack

| Component | Purpose | Access |
|-----------|---------|--------|
| **Prometheus** | Metrics collection | `kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090` |
| **Grafana** | Dashboards & visualization | `kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000` |
| **AlertManager** | Alert routing & notification | `kubectl port-forward -n broxiva-monitoring svc/alertmanager 9093:9093` |
| **Azure Monitor** | Cloud-native monitoring | Azure Portal |
| **PagerDuty** | On-call management | broxiva.pagerduty.com |

### Alert Routing

| Severity | Notification Channels |
|----------|----------------------|
| **Critical (P0)** | PagerDuty + Slack #critical + Email + SMS |
| **Warning (P1)** | Slack #warnings + Email |
| **Info (P2)** | Slack #info |

### Key Dashboards

1. **Broxiva Overview** - High-level system health
2. **API Detailed Metrics** - Backend performance deep-dive
3. **Infrastructure Metrics** - Node, pod, and resource usage
4. **Database Performance** - PostgreSQL, Redis, Elasticsearch
5. **Business Metrics** - Orders, users, revenue tracking

### Critical Alerts

| Alert | Trigger | Owner |
|-------|---------|-------|
| ServiceDown | Service unreachable 2 min | Backend |
| HighErrorRate | HTTP 5xx > 5% for 5 min | Backend |
| PodCrashLooping | Restarts > 2 in 5 min | DevOps |
| DatabaseDown | DB unreachable 1 min | Database |
| DiskSpaceCritical | Disk > 95% for 5 min | DevOps |
| CertificateExpiringCritical | Cert expires in 7 days | Security |

### Alert Suppression Rules

- Service Down suppresses High Latency alerts
- Node Not Ready suppresses Pod Issues on that node
- Critical alerts suppress related Warnings

> **Full Details:** See `/organization/infrastructure/docs/MONITORING_GUIDE.md`

---

## 9. Maintenance Windows

### Scheduled Maintenance

| Type | Window | Frequency | Notification |
|------|--------|-----------|--------------|
| **Standard Updates** | Tuesday 2:00-4:00 AM UTC | Weekly | 24 hours advance |
| **Security Patches** | As needed | ASAP | Best effort |
| **Major Upgrades** | Sunday 2:00-6:00 AM UTC | Monthly | 1 week advance |
| **Database Maintenance** | Sunday 3:00-5:00 AM UTC | Monthly | 1 week advance |

### Pre-Maintenance Checklist

- [ ] Notify stakeholders (email + Slack)
- [ ] Update status page
- [ ] Verify backup completed
- [ ] Prepare rollback plan
- [ ] Scale up resources if needed
- [ ] Notify on-call team

### During Maintenance

- [ ] Monitor all dashboards
- [ ] Keep #maintenance Slack channel updated
- [ ] Document any issues
- [ ] Test critical paths before completion

### Post-Maintenance Checklist

- [ ] Verify all health checks passing
- [ ] Check error rates and latency
- [ ] Update status page to operational
- [ ] Send completion notification
- [ ] Document any follow-up items

### Emergency Maintenance

For urgent unplanned maintenance:
1. Assess impact and urgency
2. Notify on-call lead
3. Post in #incidents channel
4. Update status page immediately
5. Proceed with change using standard rollback procedures
6. Conduct post-incident review

### Deployment Freeze Periods

- **Black Friday/Cyber Monday:** No deployments 3 days before through 1 day after
- **End of Quarter:** Reduced deployments last 2 days of quarter
- **Major Holidays:** Emergency fixes only

---

## Quick Reference

### Emergency Contacts

| Team | Slack | Email |
|------|-------|-------|
| On-Call | #broxiva-oncall | oncall@broxiva.com |
| DevOps | #broxiva-devops | devops@broxiva.com |
| Security | #broxiva-security | security@broxiva.com |
| Database | #broxiva-database | database@broxiva.com |

### External Vendor Support

| Vendor | Support | Priority |
|--------|---------|----------|
| AWS | aws.amazon.com/support | Business Critical |
| Stripe | support.stripe.com | Critical |
| SendGrid | support.sendgrid.com | High |

### Key URLs

| Service | URL |
|---------|-----|
| Status Page | status.broxiva.com |
| Grafana | grafana.broxiva.com |
| PagerDuty | broxiva.pagerduty.com |
| Sentry | sentry.io/broxiva |

---

**Document Classification:** Internal Operations
**Review Frequency:** Quarterly
**Next Review:** April 2026
