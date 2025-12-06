# CitadelBuy Operations Checklist

**Version:** 1.0.0
**Last Updated:** 2025-12-03
**Owner:** Platform Engineering & SRE Team

## Table of Contents

1. [Daily Operations Tasks](#daily-operations-tasks)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Reviews](#monthly-reviews)
4. [Quarterly Assessments](#quarterly-assessments)
5. [Ad-Hoc Tasks](#ad-hoc-tasks)
6. [Emergency Procedures](#emergency-procedures)
7. [Automation Opportunities](#automation-opportunities)

---

## Daily Operations Tasks

### Morning Checks (Start of Business Day)

**Time Required:** 15-20 minutes

#### 1. System Health Verification

- [ ] **Check Overall Platform Status**
  ```bash
  # Quick health check
  curl -f https://api.citadelbuy.com/api/health/detailed | jq '.'

  # Verify all services running
  kubectl get pods -n citadelbuy
  ```

- [ ] **Review Monitoring Dashboards**
  - Open Grafana main dashboard: https://grafana.citadelbuy.com/d/main-dashboard
  - Check for any anomalies in:
    - Request rate
    - Error rate
    - Response times (P50, P95, P99)
    - Resource utilization (CPU, Memory)

- [ ] **Check Active Alerts**
  ```bash
  # Check PagerDuty for active incidents
  # Check Prometheus alerts
  curl https://prometheus.citadelbuy.com/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'
  ```

- [ ] **Review Application Logs**
  ```bash
  # Check for errors in last hour
  kubectl logs -n citadelbuy -l app=citadelbuy-api --since=1h | grep -i error | tail -20

  # Check for critical issues
  kubectl logs -n citadelbuy -l app=citadelbuy-api --since=1h | grep -i critical
  ```

#### 2. Database Health

- [ ] **Check Database Status**
  ```bash
  # Verify PostgreSQL is running
  kubectl get pods -n citadelbuy -l app=postgres

  # Check database connections
  kubectl run psql-client --rm -it --restart=Never \
    --image=postgres:16-alpine \
    --env="PGPASSWORD=${DB_PASSWORD}" \
    -- psql -h postgres -U citadelbuy -d citadelbuy_production -c \
    "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
  ```

- [ ] **Verify Backup Completion**
  ```bash
  # Check last backup timestamp
  ls -lh /backups/postgres/ | tail -5

  # Verify backup size is reasonable
  # Should be similar to previous days
  ```

- [ ] **Monitor Database Performance**
  ```bash
  # Check slow queries
  kubectl run psql-client --rm -it --restart=Never \
    --image=postgres:16-alpine \
    --env="PGPASSWORD=${DB_PASSWORD}" \
    -- psql -h postgres -U citadelbuy -d citadelbuy_production -c \
    "SELECT query, calls, mean_exec_time
     FROM pg_stat_statements
     WHERE mean_exec_time > 100
     ORDER BY mean_exec_time DESC
     LIMIT 5;"
  ```

#### 3. Cache & Search

- [ ] **Check Redis Health**
  ```bash
  # Verify Redis is running
  kubectl run redis-test --rm -it --restart=Never \
    --image=redis:7-alpine \
    -- redis-cli -h redis PING

  # Check memory usage
  kubectl exec -it deployment/redis -n citadelbuy -- \
    redis-cli INFO memory | grep used_memory_human

  # Check cache hit rate
  kubectl exec -it deployment/redis -n citadelbuy -- \
    redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
  ```

- [ ] **Verify Elasticsearch**
  ```bash
  # Check cluster health
  curl https://elasticsearch.citadelbuy.com/_cluster/health | jq '.'

  # Verify indices
  curl https://elasticsearch.citadelbuy.com/_cat/indices?v | grep products
  ```

#### 4. Business Metrics Review

- [ ] **Check Key Metrics (Last 24 hours)**
  - Total orders processed
  - Revenue generated
  - New user registrations
  - Active users
  - Cart abandonment rate
  - Payment success rate

  ```bash
  # Query from monitoring dashboard or database
  kubectl run psql-client --rm -it --restart=Never \
    --image=postgres:16-alpine \
    --env="PGPASSWORD=${DB_PASSWORD}" \
    -- psql -h postgres -U citadelbuy -d citadelbuy_production -c \
    "SELECT
       COUNT(*) as total_orders,
       SUM(total) as revenue,
       AVG(total) as avg_order_value
     FROM \"Order\"
     WHERE created_at >= NOW() - INTERVAL '24 hours';"
  ```

#### 5. Security Checks

- [ ] **Review Security Alerts**
  - Check for unusual authentication attempts
  - Review failed login attempts
  - Check for suspicious API usage patterns

  ```bash
  # Check failed login attempts
  kubectl logs -n citadelbuy -l app=citadelbuy-api --since=24h | \
    grep -i "failed login\|unauthorized" | wc -l
  ```

- [ ] **Verify SSL Certificates**
  ```bash
  # Check certificate expiration
  kubectl get certificate -n citadelbuy

  # Should show "True" in READY column
  ```

#### 6. Queue Status

- [ ] **Check Background Job Queues**
  ```bash
  # Check email queue
  kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
    npm run queue:status

  # Look for:
  # - No stuck jobs
  # - Queue length reasonable (<1000)
  # - Processing rate healthy
  ```

---

### End of Day Checks

**Time Required:** 10-15 minutes

#### 1. Daily Summary

- [ ] **Generate Daily Report**
  - Orders processed: _____
  - Revenue: $_____
  - New users: _____
  - Incidents: _____
  - Deployments: _____

- [ ] **Review Error Logs**
  ```bash
  # Summarize errors for the day
  kubectl logs -n citadelbuy -l app=citadelbuy-api --since=24h | \
    grep -i error | wc -l
  ```

#### 2. Handoff to Next Shift / On-Call

- [ ] **Document Any Issues**
  - Update team Slack channel with summary
  - Document any ongoing investigations
  - Note any planned maintenance

- [ ] **Check On-Call Schedule**
  - Verify on-call engineer is available
  - Brief on any current issues

---

## Weekly Maintenance

### Monday: Planning & Review

**Time Required:** 30-45 minutes

- [ ] **Review Previous Week's Incidents**
  - Count of P1/P2/P3/P4 incidents
  - Root causes identified
  - Action items from post-mortems

- [ ] **Review Deployment Schedule**
  - Planned deployments for the week
  - Feature releases scheduled
  - Maintenance windows

- [ ] **Check Monitoring & Alerting**
  - Review alert thresholds
  - Update dashboards if needed
  - Silence alerts for planned maintenance

- [ ] **Capacity Planning Review**
  ```bash
  # Check resource usage trends
  kubectl top nodes
  kubectl top pods -n citadelbuy

  # Review HPA status
  kubectl get hpa -n citadelbuy
  ```

### Tuesday: Database Maintenance

**Time Required:** 45-60 minutes

- [ ] **Database Performance Analysis**
  ```sql
  -- Check database size growth
  SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size,
    pg_size_pretty(pg_database_size(pg_database.datname) -
      LAG(pg_database_size(pg_database.datname)) OVER (ORDER BY pg_database.datname)
    ) AS growth
  FROM pg_database;

  -- Check table bloat
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
  ```

- [ ] **Review Slow Queries**
  ```sql
  -- Reset statistics at beginning of week
  -- SELECT pg_stat_statements_reset();

  -- Check slow queries
  SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 20;
  ```

- [ ] **Verify Backup Integrity**
  ```bash
  # Test restore from backup (on staging)
  pg_restore --dbname=citadelbuy_test \
    --verbose \
    /backups/postgres/latest-backup.dump

  # Verify data integrity
  psql -d citadelbuy_test -c "SELECT COUNT(*) FROM \"User\";"
  psql -d citadelbuy_test -c "SELECT COUNT(*) FROM \"Product\";"
  psql -d citadelbuy_test -c "SELECT COUNT(*) FROM \"Order\";"
  ```

- [ ] **Database Optimization**
  ```sql
  -- Run VACUUM ANALYZE
  VACUUM ANALYZE;

  -- Check index usage
  SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
    AND schemaname = 'public'
  ORDER BY pg_relation_size(indexrelid) DESC
  LIMIT 10;
  ```

### Wednesday: Security Audit

**Time Required:** 30-45 minutes

- [ ] **Review Access Logs**
  ```bash
  # Check for unusual access patterns
  kubectl logs -n citadelbuy -l app=nginx --since=7d | \
    awk '{print $1}' | sort | uniq -c | sort -rn | head -20

  # Check for suspicious requests
  kubectl logs -n citadelbuy -l app=nginx --since=7d | \
    grep -E "sql|script|exec|\.\./" | head -20
  ```

- [ ] **Review Failed Authentication Attempts**
  ```bash
  kubectl logs -n citadelbuy -l app=citadelbuy-api --since=7d | \
    grep -i "failed login\|unauthorized" | \
    awk '{print $NF}' | sort | uniq -c | sort -rn
  ```

- [ ] **Check Dependency Vulnerabilities**
  ```bash
  cd apps/api
  pnpm audit

  cd ../web
  pnpm audit

  # Review and plan fixes for high/critical vulnerabilities
  ```

- [ ] **Review Secret Rotation Schedule**
  - Database passwords (rotate every 90 days)
  - API keys (rotate every 180 days)
  - JWT secrets (rotate every 90 days)
  - SSL certificates (auto-renewed, verify)

- [ ] **Verify Security Headers**
  ```bash
  # Check security headers on production
  curl -I https://citadelbuy.com | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options"
  ```

### Thursday: Performance Review

**Time Required:** 45-60 minutes

- [ ] **Analyze Response Times**
  - Review Grafana performance dashboard
  - Check P50, P95, P99 response times
  - Identify slow endpoints

  ```bash
  # Extract response time metrics
  kubectl logs -n citadelbuy -l app=citadelbuy-api --since=7d | \
    grep "duration" | \
    awk '{print $NF}' | \
    sort -n | \
    awk '{a[i++]=$1} END {print "P50:", a[int(i*0.5)], "P95:", a[int(i*0.95)], "P99:", a[int(i*0.99)]}'
  ```

- [ ] **Review Cache Performance**
  ```bash
  # Check Redis cache hit rate
  kubectl exec -it deployment/redis -n citadelbuy -- \
    redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

  # Calculate hit rate
  # Hit rate = hits / (hits + misses)
  # Target: > 90%
  ```

- [ ] **Database Query Performance**
  ```sql
  -- Review most called queries
  SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time
  FROM pg_stat_statements
  ORDER BY calls DESC
  LIMIT 20;

  -- Review most time-consuming queries
  SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time
  FROM pg_stat_statements
  ORDER BY total_exec_time DESC
  LIMIT 20;
  ```

- [ ] **Frontend Performance**
  - Run Lighthouse audit on key pages
  - Check Core Web Vitals
  - Review bundle sizes

  ```bash
  cd apps/web
  pnpm build
  pnpm analyze
  ```

- [ ] **Load Testing**
  ```bash
  # Run weekly load test
  k6 run --vus 100 --duration 5m load-test.js

  # Compare with baseline
  # Document any degradation
  ```

### Friday: Documentation & Cleanup

**Time Required:** 30-45 minutes

- [ ] **Update Documentation**
  - Update runbooks with lessons learned
  - Document any new procedures
  - Update architecture diagrams if changed

- [ ] **Review and Update On-Call Runbooks**
  - Add new troubleshooting steps
  - Update contact information
  - Remove outdated information

- [ ] **Clean Up Resources**
  ```bash
  # Remove old PVCs
  kubectl get pvc -n citadelbuy | grep "Released"

  # Clean up old Docker images
  docker image prune -a --filter "until=168h"

  # Clean up old logs
  kubectl logs -n citadelbuy -l app=citadelbuy-api --tail=0
  ```

- [ ] **Review Open Tickets**
  - Close resolved tickets
  - Update status on ongoing issues
  - Prioritize for next week

- [ ] **Weekly Team Sync**
  - Share weekly metrics
  - Discuss challenges
  - Plan improvements

---

## Monthly Reviews

### First Week: Infrastructure Review

**Time Required:** 2-3 hours

- [ ] **Cost Analysis**
  - Review cloud spending
  - Identify cost optimization opportunities
  - Right-size over/under-utilized resources

- [ ] **Capacity Planning**
  ```bash
  # Review resource utilization trends
  # Check if scaling policies are appropriate
  kubectl get hpa -n citadelbuy -o wide

  # Review node utilization
  kubectl describe nodes | grep -A 5 "Allocated resources"
  ```

- [ ] **Review Auto-Scaling Policies**
  - Are HPA thresholds appropriate?
  - Is cluster autoscaler working correctly?
  - Any scaling events that were too slow/fast?

- [ ] **SSL Certificate Audit**
  ```bash
  # Check all certificates
  kubectl get certificate -n citadelbuy

  # Verify expiration dates
  # Plan renewals
  ```

### Second Week: Security Deep Dive

**Time Required:** 2-3 hours

- [ ] **Full Security Audit**
  - Run automated security scanners
  - Review IAM policies and permissions
  - Check network policies
  - Review secrets management

- [ ] **Penetration Testing**
  - Run OWASP ZAP or similar
  - Test authentication mechanisms
  - Test authorization boundaries
  - Test input validation

- [ ] **Compliance Check**
  - PCI DSS compliance (for payment processing)
  - GDPR compliance (for EU users)
  - Review data retention policies
  - Check audit logs

- [ ] **Dependency Updates**
  ```bash
  # Update all dependencies
  cd apps/api
  pnpm update --latest

  cd ../web
  pnpm update --latest

  # Test thoroughly before deploying
  ```

### Third Week: Disaster Recovery Test

**Time Required:** 3-4 hours

- [ ] **Database Backup & Restore Test**
  ```bash
  # Full backup and restore drill
  # See DATABASE_BACKUP_STRATEGY.md

  # Verify data integrity after restore
  # Measure RTO and RPO
  ```

- [ ] **Failover Testing**
  - Test database failover to replica
  - Test Redis cluster failover
  - Test multi-region failover (if applicable)

- [ ] **Incident Response Drill**
  - Simulate P1 incident
  - Test escalation procedures
  - Verify communication templates
  - Time response and resolution

- [ ] **Update Disaster Recovery Plan**
  - Document lessons learned
  - Update procedures
  - Update contact information

### Fourth Week: Performance Optimization

**Time Required:** 2-3 hours

- [ ] **Database Optimization**
  ```sql
  -- Analyze and optimize
  ANALYZE;

  -- Rebuild indexes if needed
  REINDEX DATABASE citadelbuy_production;

  -- Update statistics
  VACUUM ANALYZE;
  ```

- [ ] **Cache Optimization**
  ```bash
  # Review cache keys and TTLs
  kubectl exec -it deployment/redis -n citadelbuy -- \
    redis-cli --scan --pattern "*" | head -100

  # Identify candidates for longer/shorter TTL
  ```

- [ ] **Code Performance Review**
  - Profile application code
  - Identify N+1 queries
  - Review algorithmic complexity
  - Optimize hot paths

- [ ] **Infrastructure Optimization**
  - Right-size pods based on actual usage
  - Review and optimize resource requests/limits
  - Consolidate underutilized services

---

## Quarterly Assessments

### Q1, Q2, Q3, Q4: Comprehensive Review

**Time Required:** 1-2 days (spread across the quarter)

#### 1. Business Continuity Planning

- [ ] **Review and Update DR Plan**
  - Update RTO/RPO requirements
  - Test all disaster scenarios
  - Update contact lists
  - Review insurance coverage

- [ ] **Data Retention Review**
  - Archive old data
  - Purge unnecessary data
  - Verify compliance with regulations

#### 2. Architecture Review

- [ ] **System Architecture Assessment**
  - Review current architecture
  - Identify technical debt
  - Plan architectural improvements
  - Document architectural decisions (ADRs)

- [ ] **Scalability Review**
  - Review growth projections
  - Identify scaling bottlenecks
  - Plan infrastructure upgrades
  - Budget for growth

#### 3. Security Posture

- [ ] **Comprehensive Security Assessment**
  - Third-party security audit
  - Penetration testing
  - Vulnerability assessment
  - Security training for team

- [ ] **Rotate All Secrets**
  - Database credentials
  - API keys
  - JWT secrets
  - Encryption keys

#### 4. Team & Process Review

- [ ] **On-Call Process Review**
  - Analyze on-call metrics
  - Review incident response times
  - Gather feedback from on-call engineers
  - Improve runbooks

- [ ] **Documentation Audit**
  - Review all documentation
  - Update outdated content
  - Add missing documentation
  - Improve clarity

- [ ] **Training & Development**
  - Identify knowledge gaps
  - Plan training sessions
  - Cross-train team members
  - Update onboarding materials

#### 5. Technology Stack Review

- [ ] **Evaluate Technology Choices**
  - Review third-party services
  - Evaluate alternatives
  - Consider new technologies
  - Plan migrations if needed

- [ ] **Dependency Audit**
  - Review all dependencies
  - Identify abandoned packages
  - Plan replacements
  - Update to LTS versions

#### 6. Metrics & Reporting

- [ ] **Quarterly Metrics Report**
  - System uptime
  - Incident count and trends
  - Performance metrics
  - Cost trends
  - User growth
  - Revenue metrics

- [ ] **SLA/SLO Review**
  - Review SLA compliance
  - Adjust SLOs if needed
  - Report to stakeholders

---

## Ad-Hoc Tasks

### As Needed

- [ ] **New Service Deployment**
  - Review deployment checklist (DEPLOYMENT_RUNBOOK.md)
  - Update monitoring
  - Update documentation
  - Train team

- [ ] **Security Incident Response**
  - Follow incident response plan (INCIDENT_RESPONSE.md)
  - Contain and remediate
  - Document and report
  - Implement preventive measures

- [ ] **Major Version Upgrades**
  - Plan upgrade path
  - Test in staging
  - Schedule maintenance window
  - Prepare rollback plan
  - Execute upgrade
  - Verify functionality

- [ ] **Vendor Evaluation**
  - Define requirements
  - Research alternatives
  - Conduct POCs
  - Make recommendations
  - Plan migration

---

## Emergency Procedures

### Critical Production Issue

**Immediate Actions (0-5 minutes):**

1. [ ] Acknowledge alert in PagerDuty
2. [ ] Post in #incidents Slack channel
3. [ ] Assess severity (P1-P4)
4. [ ] Escalate if P1/P2
5. [ ] Start incident timeline

**Investigation (5-30 minutes):**

1. [ ] Check health endpoints
2. [ ] Review recent changes
3. [ ] Check logs and metrics
4. [ ] Form hypothesis

**Mitigation (Variable):**

1. [ ] Implement quick fix or rollback
2. [ ] Verify fix worked
3. [ ] Monitor for stability
4. [ ] Update stakeholders

**Recovery (30-60 minutes):**

1. [ ] Confirm full recovery
2. [ ] Post resolution update
3. [ ] Continue monitoring
4. [ ] Schedule post-mortem

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for detailed procedures.

---

## Automation Opportunities

### Tasks to Automate

**High Priority:**
- [ ] Daily health checks → Automated dashboard
- [ ] Backup verification → Automated testing
- [ ] Security scanning → CI/CD pipeline
- [ ] Dependency updates → Renovate/Dependabot
- [ ] Performance testing → Scheduled load tests

**Medium Priority:**
- [ ] Log analysis → Automated anomaly detection
- [ ] Cost reporting → Automated reports
- [ ] Certificate renewal → Automated with cert-manager
- [ ] Database optimization → Scheduled maintenance jobs

**Low Priority:**
- [ ] Documentation generation → From code comments
- [ ] Metric collection → Enhanced monitoring
- [ ] Incident reporting → Automated summaries

### Automation Scripts

```bash
# Example: Daily health check automation
# Save as: scripts/daily-health-check.sh

#!/bin/bash
set -e

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
DATE=$(date +"%Y-%m-%d %H:%M:%S")

echo "Running daily health check at $DATE"

# Check API health
API_HEALTH=$(curl -sf https://api.citadelbuy.com/api/health/detailed)
if [ $? -eq 0 ]; then
  echo "✅ API health check passed"
else
  echo "❌ API health check failed"
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 Daily health check failed: API is down\"}" \
    $SLACK_WEBHOOK_URL
  exit 1
fi

# Check pod status
FAILING_PODS=$(kubectl get pods -n citadelbuy --no-headers | grep -v "Running\|Completed" | wc -l)
if [ "$FAILING_PODS" -gt 0 ]; then
  echo "❌ Found $FAILING_PODS failing pods"
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ Daily health check: $FAILING_PODS pods not running\"}" \
    $SLACK_WEBHOOK_URL
else
  echo "✅ All pods running"
fi

# Check database backup
LATEST_BACKUP=$(ls -t /backups/postgres/*.dump | head -1)
BACKUP_AGE=$(($(date +%s) - $(date -r "$LATEST_BACKUP" +%s)))
if [ "$BACKUP_AGE" -gt 86400 ]; then
  echo "❌ Latest backup is older than 24 hours"
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ Database backup is stale (>24h old)\"}" \
    $SLACK_WEBHOOK_URL
else
  echo "✅ Database backup is current"
fi

echo "Daily health check complete"
```

```yaml
# Schedule with CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-health-check
  namespace: citadelbuy
spec:
  schedule: "0 9 * * *"  # Daily at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: health-check
            image: citadelplatforms/health-checker:latest
            env:
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: slack-secrets
                  key: webhook-url
          restartPolicy: OnFailure
```

---

## Checklist Templates

### Daily Operations Template

```markdown
# Daily Operations - [Date]

**On-Duty Engineer:** [Name]

## Morning Checks
- [ ] All pods running
- [ ] Health endpoints responding
- [ ] No critical alerts
- [ ] Grafana dashboard normal
- [ ] Database backup completed
- [ ] Redis cache healthy
- [ ] Elasticsearch healthy

## Business Metrics
- Orders (24h): _____
- Revenue (24h): $_____
- New users (24h): _____
- Error rate: _____%

## Issues Encountered
[Document any issues]

## Actions Taken
[Document actions]

## Notes for Next Shift
[Handoff notes]
```

### Weekly Maintenance Template

```markdown
# Weekly Maintenance - Week of [Date]

## Monday: Planning
- [ ] Reviewed last week's incidents
- [ ] Checked deployment schedule
- [ ] Updated monitoring

## Tuesday: Database
- [ ] Analyzed performance
- [ ] Verified backups
- [ ] Optimized queries

## Wednesday: Security
- [ ] Reviewed access logs
- [ ] Checked vulnerabilities
- [ ] Verified secrets

## Thursday: Performance
- [ ] Analyzed response times
- [ ] Reviewed cache performance
- [ ] Ran load tests

## Friday: Documentation
- [ ] Updated runbooks
- [ ] Cleaned up resources
- [ ] Weekly team sync

## Notes
[Document improvements and issues]
```

---

**Document Version History:**

- v1.0.0 (2025-12-03): Initial operations checklist

---

**Quick Reference:**

For detailed procedures, see:
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) - Deployment procedures
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident handling
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [DATABASE_MAINTENANCE.md](./DATABASE_MAINTENANCE.md) - Database operations
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Monitoring configuration
