# Broxiva E-Commerce Platform - Incident Runbooks

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Owner:** Site Reliability Engineering Team
**Review Cycle:** Monthly

---

## Table of Contents

1. [General Incident Response](#general-incident-response)
2. [Service Outages](#service-outages)
3. [Performance Degradation](#performance-degradation)
4. [Database Incidents](#database-incidents)
5. [Cache Incidents](#cache-incidents)
6. [Payment Processing Issues](#payment-processing-issues)
7. [Security Incidents](#security-incidents)
8. [Infrastructure Incidents](#infrastructure-incidents)

---

## General Incident Response

### Severity Classification

| Severity | Impact | Response Time | Examples |
|----------|--------|---------------|----------|
| **P1 - Critical** | Complete service outage or data breach | 15 minutes | Site down, payment system failure, security breach |
| **P2 - High** | Major feature unavailable | 30 minutes | Checkout broken, search not working |
| **P3 - Medium** | Minor feature degraded | 2 hours | Slow page loads, single API endpoint failing |
| **P4 - Low** | Minimal impact | 24 hours | UI glitches, non-critical bug |

### Incident Commander Responsibilities

1. **Assess** - Determine severity and scope
2. **Communicate** - Notify stakeholders and update status page
3. **Coordinate** - Direct team efforts and resource allocation
4. **Document** - Maintain incident timeline
5. **Resolve** - Ensure mitigation and recovery
6. **Review** - Lead post-incident review

### Communication Templates

#### Incident Declaration
```
INCIDENT DECLARED: [P1/P2/P3/P4]
Service: [Affected Service]
Impact: [User Impact Description]
Started: [Timestamp]
Incident Commander: [Name]
Status: Investigating

Updates will be provided every [15/30/60] minutes.
```

#### Status Update
```
UPDATE [#N] - [Timestamp]
Status: [Investigating/Identified/Mitigating/Resolved]
Current State: [Description]
Actions Taken: [List]
Next Steps: [Plan]
ETA: [If known]
```

---

## Service Outages

### Runbook: API Service Down

**Alert:** `ServiceDown` - API service not responding
**Severity:** P1 - Critical
**On-Call Team:** Backend Engineering

#### Symptoms
- Health check endpoint returns 5xx or times out
- Prometheus shows `up == 0` for backend target
- Error rate spikes to 100%
- Users cannot access any API endpoints

#### Investigation Steps

```bash
# 1. Check pod status
kubectl get pods -n broxiva-production -l app=broxiva-api

# 2. Check pod events
kubectl describe pod <pod-name> -n broxiva-production

# 3. View recent logs
kubectl logs -n broxiva-production -l app=broxiva-api --tail=500 --since=10m

# 4. Check deployment status
kubectl rollout status deployment/broxiva-api -n broxiva-production

# 5. Check node health
kubectl get nodes
kubectl describe node <node-name>
```

#### Mitigation Actions

```bash
# Option 1: Restart pods (if crash loop)
kubectl rollout restart deployment/broxiva-api -n broxiva-production

# Option 2: Rollback to previous version
kubectl rollout undo deployment/broxiva-api -n broxiva-production

# Option 3: Scale up healthy pods
kubectl scale deployment/broxiva-api --replicas=10 -n broxiva-production

# Option 4: Check and fix ConfigMap/Secrets
kubectl get configmap -n broxiva-production
kubectl get secrets -n broxiva-production
```

#### Verification
```bash
# Verify pods are running
kubectl get pods -n broxiva-production -l app=broxiva-api

# Test health endpoint
curl -s https://api.broxiva.com/api/health | jq .

# Check Prometheus target status
# Visit Prometheus UI > Status > Targets
```

#### Post-Incident
- Document root cause
- Create follow-up tickets for permanent fix
- Update runbook if new failure mode discovered

---

### Runbook: Frontend Service Down

**Alert:** `ServiceDown` - Frontend not responding
**Severity:** P1 - Critical
**On-Call Team:** Frontend Engineering

#### Symptoms
- Website returns 5xx errors
- CDN health checks failing
- Users see blank page or error page

#### Investigation Steps

```bash
# 1. Check CDN status
# Visit Vercel/CloudFront dashboard

# 2. Check deployment status
kubectl get pods -n broxiva-production -l app=broxiva-web

# 3. Check build artifacts
# Verify latest deployment in CI/CD

# 4. Test direct access (bypass CDN)
curl -s -o /dev/null -w "%{http_code}" https://web.broxiva-internal.com
```

#### Mitigation Actions

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/broxiva-web -n broxiva-production

# Or trigger redeployment
kubectl rollout restart deployment/broxiva-web -n broxiva-production

# Clear CDN cache if stale content
# Use CDN provider's purge API
```

---

## Performance Degradation

### Runbook: High API Latency

**Alert:** `APIResponseTimeSlow` or `APIResponseTimeCritical`
**Severity:** P2-P3
**On-Call Team:** Backend Engineering

#### Symptoms
- P95 response time > 500ms (warning) or > 1000ms (critical)
- Users reporting slow page loads
- Increased timeout errors

#### Investigation Steps

```bash
# 1. Check current latency metrics
# Grafana Dashboard: API Response Time

# 2. Identify slow endpoints
# Prometheus query:
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (route, le)
)

# 3. Check resource utilization
kubectl top pods -n broxiva-production

# 4. Check database query performance
# View slow query logs or pg_stat_statements

# 5. Check for external service latency
# Review Sentry transaction traces
```

#### Mitigation Actions

```bash
# Scale up if CPU/memory constrained
kubectl scale deployment/broxiva-api --replicas=10 -n broxiva-production

# Increase resource limits if needed
kubectl set resources deployment/broxiva-api -n broxiva-production \
  --limits=cpu=2000m,memory=4Gi \
  --requests=cpu=1000m,memory=2Gi

# Clear cache if stale data causing issues
kubectl exec -it <redis-pod> -n broxiva-production -- redis-cli FLUSHDB

# Restart pods if memory leak suspected
kubectl rollout restart deployment/broxiva-api -n broxiva-production
```

#### Root Cause Analysis
- Check for N+1 query patterns
- Review recently deployed changes
- Analyze slow database queries
- Check external API response times

---

### Runbook: High Error Rate

**Alert:** `HighErrorRate`
**Severity:** P2
**On-Call Team:** Backend Engineering

#### Symptoms
- 5xx error rate > 1% for 5+ minutes
- Sentry showing increased error volume
- Users reporting failures

#### Investigation Steps

```bash
# 1. Identify error types
# Grafana: HTTP Status Codes panel
# Sentry: Issues dashboard

# 2. Check error distribution by endpoint
sum(rate(http_requests_total{status=~"5.."}[5m])) by (route)

# 3. Review recent deployments
kubectl rollout history deployment/broxiva-api -n broxiva-production

# 4. Check external dependencies
# Database, Redis, Elasticsearch, Payment providers

# 5. Review application logs
kubectl logs -n broxiva-production -l app=broxiva-api --since=30m | grep -i error
```

#### Mitigation Actions

```bash
# Rollback if recent deployment caused issues
kubectl rollout undo deployment/broxiva-api -n broxiva-production

# Restart pods if transient error
kubectl rollout restart deployment/broxiva-api -n broxiva-production

# Scale up if overloaded
kubectl scale deployment/broxiva-api --replicas=15 -n broxiva-production

# Enable circuit breaker for failing external service
# Update feature flag in ConfigMap
```

---

## Database Incidents

### Runbook: Database Connection Exhaustion

**Alert:** `PostgreSQLTooManyConnections` or `PostgreSQLConnectionsNearLimit`
**Severity:** P2
**On-Call Team:** Database/Backend Engineering

#### Symptoms
- Application logs showing connection timeout errors
- Database connection count approaching limit
- Some queries failing with connection errors

#### Investigation Steps

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check connections by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Check connections by application
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name
ORDER BY count(*) DESC;

-- Find long-running queries
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 10;
```

#### Mitigation Actions

```sql
-- Kill idle connections older than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '10 minutes';

-- Kill specific long-running query
SELECT pg_terminate_backend(<pid>);
```

```bash
# Restart application pods to reset connections
kubectl rollout restart deployment/broxiva-api -n broxiva-production

# Scale down then up to reset connection pool
kubectl scale deployment/broxiva-api --replicas=2 -n broxiva-production
sleep 30
kubectl scale deployment/broxiva-api --replicas=5 -n broxiva-production
```

#### Prevention
- Review connection pool settings in application
- Implement connection timeouts
- Add connection pooler (PgBouncer)

---

### Runbook: Database High Latency

**Alert:** `PostgreSQLSlowQueries`
**Severity:** P2-P3
**On-Call Team:** Database/Backend Engineering

#### Symptoms
- Query response times increasing
- API latency correlated with DB latency
- CPU/IO pressure on database server

#### Investigation Steps

```sql
-- Check for locks
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;

-- Check for missing indexes
SELECT relname, seq_scan, idx_scan,
       100 * idx_scan / (seq_scan + idx_scan) AS idx_usage_pct
FROM pg_stat_user_tables
WHERE seq_scan + idx_scan > 0
ORDER BY seq_scan DESC
LIMIT 20;

-- Check table bloat
SELECT schemaname, relname, n_dead_tup, n_live_tup,
       round(n_dead_tup * 100.0 / nullif(n_live_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

#### Mitigation Actions

```sql
-- Run VACUUM to clean up dead tuples
VACUUM ANALYZE;

-- Reindex problematic tables
REINDEX TABLE <table_name>;

-- Kill blocking queries
SELECT pg_terminate_backend(<blocking_pid>);
```

---

### Runbook: Database Replication Lag

**Alert:** `PostgreSQLReplicationLag`
**Severity:** P2
**On-Call Team:** Database Engineering

#### Symptoms
- Read replica showing stale data
- Replication lag > 60 seconds
- Potential data consistency issues

#### Investigation Steps

```sql
-- Check replication status on primary
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
       (pg_wal_lsn_diff(sent_lsn, replay_lsn) / 1024)::int AS lag_kb
FROM pg_stat_replication;

-- Check WAL receiver on replica
SELECT status, received_lsn, latest_end_lsn,
       (extract(epoch from now()) - extract(epoch from latest_end_time))::int AS lag_seconds
FROM pg_stat_wal_receiver;
```

#### Mitigation Actions

1. Check network connectivity between primary and replica
2. Verify disk I/O on replica
3. Consider temporarily routing all traffic to primary
4. If lag persists, rebuild replica from fresh backup

---

## Cache Incidents

### Runbook: Redis Down

**Alert:** `RedisDown`
**Severity:** P1-P2
**On-Call Team:** Platform Engineering

#### Symptoms
- Redis health check failing
- Application showing cache-related errors
- Session management failing

#### Investigation Steps

```bash
# Check Redis pod status
kubectl get pods -n broxiva-production -l app=redis

# Check Redis logs
kubectl logs -n broxiva-production -l app=redis --tail=200

# Check Redis cluster status (if clustered)
kubectl exec -it <redis-pod> -n broxiva-production -- redis-cli CLUSTER INFO
```

#### Mitigation Actions

```bash
# Restart Redis pod
kubectl delete pod <redis-pod> -n broxiva-production

# Application should handle cache miss gracefully
# If not, restart application pods
kubectl rollout restart deployment/broxiva-api -n broxiva-production

# For Redis cluster, trigger failover
kubectl exec -it <redis-pod> -n broxiva-production -- \
  redis-cli CLUSTER FAILOVER
```

---

### Runbook: Low Cache Hit Rate

**Alert:** `RedisCacheLowHitRate`
**Severity:** P3
**On-Call Team:** Backend Engineering

#### Symptoms
- Cache hit rate < 70%
- Increased database load
- Higher API latency

#### Investigation Steps

```bash
# Check Redis memory usage
kubectl exec -it <redis-pod> -n broxiva-production -- redis-cli INFO memory

# Check key expiration patterns
kubectl exec -it <redis-pod> -n broxiva-production -- redis-cli INFO stats

# Check most frequently accessed keys
kubectl exec -it <redis-pod> -n broxiva-production -- \
  redis-cli --hotkeys
```

#### Mitigation Actions

1. Review cache key patterns in application
2. Increase cache TTLs for frequently accessed data
3. Implement cache warming for critical data
4. Consider increasing Redis memory allocation

---

## Payment Processing Issues

### Runbook: Payment Failures Spike

**Alert:** `PaymentFailureRateHigh`
**Severity:** P1
**On-Call Team:** Backend Engineering + Payment Provider

#### Symptoms
- Payment success rate drops below 95%
- Users unable to complete checkout
- Error logs showing payment gateway errors

#### Investigation Steps

```bash
# Check payment-related metrics
# Grafana: Payment Success Rate panel

# Review Stripe dashboard for outages
# https://status.stripe.com

# Check application logs for payment errors
kubectl logs -n broxiva-production -l app=broxiva-api --since=30m | grep -i payment

# Review Sentry for payment-related exceptions
```

#### Mitigation Actions

1. **Provider Outage:** Enable backup payment provider if available
2. **Configuration Issue:** Verify API keys and webhook configurations
3. **Network Issue:** Check egress rules and DNS resolution
4. **Rate Limiting:** Reduce request rate, implement backoff

```bash
# Enable backup payment provider (feature flag)
kubectl set env deployment/broxiva-api -n broxiva-production \
  BACKUP_PAYMENT_PROVIDER_ENABLED=true

# Disable problematic payment method
kubectl set env deployment/broxiva-api -n broxiva-production \
  STRIPE_ENABLED=false
```

#### Communication
- Update status page immediately
- Notify customer support team
- Prepare customer communication for affected orders

---

## Security Incidents

### Runbook: Suspected Security Breach

**Alert:** Manual report or automated security alert
**Severity:** P1
**On-Call Team:** Security Team + Engineering Leadership

#### Immediate Actions

1. **DO NOT** modify or delete any logs or data
2. **Isolate** affected systems if active threat
3. **Notify** Security Team Lead and CTO immediately
4. **Document** all observations and actions taken

#### Investigation Steps

```bash
# Preserve logs
kubectl logs -n broxiva-production --all-containers --since=24h > incident_logs_$(date +%Y%m%d%H%M%S).txt

# Check for unusual activity
# Review authentication logs
# Check for privilege escalation
# Look for data exfiltration patterns

# Review recent access patterns
kubectl logs -n broxiva-production -l app=broxiva-api | grep -E "(401|403|login|auth)"
```

#### Containment Actions

```bash
# Rotate compromised credentials
kubectl create secret generic api-secrets --from-literal=... -n broxiva-production
kubectl rollout restart deployment/broxiva-api -n broxiva-production

# Force logout all users (if session compromise)
kubectl exec -it <redis-pod> -n broxiva-production -- redis-cli FLUSHDB

# Block suspicious IPs (if known)
# Update WAF rules or network policies
```

#### Escalation
- Notify legal team if data breach confirmed
- Prepare for regulatory notification if required
- Engage incident response retainer if needed

---

### Runbook: DDoS Attack

**Alert:** Anomalous traffic spike or WAF alerts
**Severity:** P1
**On-Call Team:** Platform Engineering + Security

#### Symptoms
- Sudden 10x+ increase in traffic
- Many requests from similar IPs/regions
- Application becoming unresponsive
- WAF blocking large number of requests

#### Investigation Steps

```bash
# Check traffic patterns
# CloudFront/ALB access logs

# Analyze request patterns
# Look for common user agents, endpoints, origins

# Check current rate limiting effectiveness
kubectl logs -n broxiva-production -l app=broxiva-api | grep "rate limit"
```

#### Mitigation Actions

```bash
# Enable stricter rate limiting
kubectl set env deployment/broxiva-api -n broxiva-production \
  RATE_LIMIT_REQUESTS=10 \
  RATE_LIMIT_WINDOW_MS=60000

# Scale up to handle legitimate traffic
kubectl scale deployment/broxiva-api --replicas=20 -n broxiva-production

# Block attacking IP ranges (at CDN/WAF level)
# Use provider's DDoS protection services
```

#### Recovery
1. Monitor traffic patterns for attack cessation
2. Gradually reduce defensive measures
3. Analyze attack patterns for future prevention
4. Document attack vectors and mitigations

---

## Infrastructure Incidents

### Runbook: Kubernetes Node Failure

**Alert:** `KubernetesNodeNotReady`
**Severity:** P2
**On-Call Team:** Platform Engineering

#### Symptoms
- Node showing NotReady status
- Pods rescheduling to other nodes
- Potential service degradation

#### Investigation Steps

```bash
# Check node status
kubectl get nodes
kubectl describe node <node-name>

# Check node conditions
kubectl get node <node-name> -o jsonpath='{.status.conditions[*]}' | jq .

# Check pods on the node
kubectl get pods --all-namespaces -o wide | grep <node-name>
```

#### Mitigation Actions

```bash
# Cordon node to prevent new scheduling
kubectl cordon <node-name>

# Drain node if pods need to be rescheduled
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# If cloud provider, check for instance issues
# AWS: Check EC2 status checks
# Azure: Check VM health

# Remove node if unrecoverable
kubectl delete node <node-name>
```

---

### Runbook: Disk Space Critical

**Alert:** `DiskSpaceCritical`
**Severity:** P2
**On-Call Team:** Platform Engineering

#### Symptoms
- Disk usage > 90%
- Application may fail to write logs/data
- Pod evictions possible

#### Investigation Steps

```bash
# Check disk usage on node
kubectl debug node/<node-name> -it --image=ubuntu -- df -h

# Find large files
kubectl debug node/<node-name> -it --image=ubuntu -- \
  du -h /var/lib/docker/containers | sort -rh | head -20

# Check for log accumulation
kubectl get pods -n broxiva-production -o json | \
  jq '.items[] | {name: .metadata.name, restartCount: .status.containerStatuses[].restartCount}'
```

#### Mitigation Actions

```bash
# Clean up old container logs
kubectl debug node/<node-name> -it --image=ubuntu -- \
  truncate -s 0 /var/lib/docker/containers/*/*.log

# Clean up unused images
docker system prune -a -f

# Clean up completed jobs
kubectl delete jobs --field-selector status.successful=1 -n broxiva-production

# Expand disk if cloud-based
# Follow cloud provider procedures
```

---

## Post-Incident Procedures

### Post-Incident Review (PIR)

#### Timeline Template

```markdown
## Incident Timeline

| Time (UTC) | Event | Action Taken |
|------------|-------|--------------|
| HH:MM | Alert triggered | IC paged |
| HH:MM | Investigation started | Checked logs |
| HH:MM | Root cause identified | Database connection issue |
| HH:MM | Mitigation applied | Restarted application |
| HH:MM | Incident resolved | Normal operation restored |
```

#### PIR Questions

1. What happened?
2. What was the impact?
3. What was the root cause?
4. What went well?
5. What could be improved?
6. What action items resulted?

### Action Item Categories

- **Prevent:** Changes to prevent recurrence
- **Detect:** Improvements to monitoring/alerting
- **Mitigate:** Faster recovery procedures
- **Document:** Runbook updates

---

## Contact Information

### On-Call Rotations

| Team | PagerDuty Schedule | Escalation |
|------|-------------------|------------|
| Platform | platform-oncall | Platform Lead |
| Backend | backend-oncall | Backend Lead |
| Database | dba-oncall | Database Lead |
| Security | security-oncall | Security Lead |

### External Contacts

| Provider | Support URL | SLA |
|----------|-------------|-----|
| AWS | aws.amazon.com/support | Enterprise |
| Stripe | dashboard.stripe.com/support | 24/7 |
| Sentry | sentry.io/support | Business |

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | SRE Team | Initial runbook creation |
