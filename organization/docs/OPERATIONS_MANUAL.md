# CitadelBuy Operations Manual

**Version**: 1.0.0
**Last Updated**: 2025-12-06
**Owner**: Site Reliability Engineering (SRE) Team

---

## Table of Contents

1. [Monitoring and Alerting](#monitoring-and-alerting)
2. [Incident Response](#incident-response)
3. [Scaling Procedures](#scaling-procedures)
4. [Backup and Recovery](#backup-and-recovery)
5. [Multi-Region Failover](#multi-region-failover)
6. [Performance Optimization](#performance-optimization)
7. [Security Operations](#security-operations)
8. [Maintenance Windows](#maintenance-windows)

---

## Monitoring and Alerting

### Monitoring Stack Overview

```
┌──────────────────────────────────────────────────┐
│            Application Metrics                    │
│  (Prometheus + Custom Exporters)                  │
└───────────────────┬──────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────┐
│         Prometheus (Metrics Storage)              │
│  - Time-series database                           │
│  - Alert evaluation                               │
└───────────────────┬──────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼────────┐
│    Grafana     │    │   AlertManager   │
│  (Dashboards)  │    │  (Alert Routing) │
└────────────────┘    └─────────┬────────┘
                                │
                     ┌──────────┼──────────┐
                     │                     │
              ┌──────▼──────┐    ┌────────▼────────┐
              │  PagerDuty  │    │  Slack/Email    │
              │  (On-call)  │    │ (Notifications) │
              └─────────────┘    └─────────────────┘
```

### Key Metrics to Monitor

#### Application Metrics

**API Performance**
```
# Request rate
sum(rate(http_requests_total[5m])) by (method, endpoint)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Response time (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Database Metrics**
- Connection pool utilization: `pg_stat_database_connections / pg_settings_max_connections`
- Query execution time: `pg_stat_statements_mean_exec_time`
- Active queries: `pg_stat_activity_count{state="active"}`
- Database size: `pg_database_size_bytes`

**Cache Metrics (Redis)**
- Hit rate: `redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses)`
- Memory usage: `redis_memory_used_bytes / redis_memory_max_bytes`
- Connected clients: `redis_connected_clients`
- Evicted keys: `rate(redis_evicted_keys_total[5m])`

#### Infrastructure Metrics

**Kubernetes**
```
# Pod availability
sum(kube_pod_status_phase{phase="Running"}) / sum(kube_pod_status_phase)

# CPU usage
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Memory usage
sum(container_memory_usage_bytes) by (pod)

# Disk I/O
rate(container_fs_reads_bytes_total[5m])
rate(container_fs_writes_bytes_total[5m])
```

**Node Health**
- CPU utilization: `100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
- Memory usage: `(node_memory_MemTotal - node_memory_MemAvailable) / node_memory_MemTotal`
- Disk usage: `(node_filesystem_size - node_filesystem_free) / node_filesystem_size`
- Network throughput: `rate(node_network_receive_bytes[5m])`

### Critical Alerts

#### P1: Critical Alerts

**Service Down**
```yaml
- alert: ServiceDown
  expr: up{job="citadelbuy-api"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Service {{ $labels.job }} is down"
    description: "{{ $labels.instance }} has been down for more than 1 minute"
```

**High Error Rate**
```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High HTTP error rate detected"
    description: "Error rate is {{ $value | humanizePercentage }} for the past 5 minutes"
```

**Database Connection Pool Exhausted**
```yaml
- alert: DatabasePoolExhausted
  expr: pg_stat_database_connections / pg_settings_max_connections > 0.9
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Database connection pool nearly exhausted"
    description: "{{ $value | humanizePercentage }} of database connections are in use"
```

#### P2: Warning Alerts

**High Response Time**
```yaml
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "API response time is high"
    description: "P95 latency is {{ $value }}s"
```

**High Memory Usage**
```yaml
- alert: HighMemoryUsage
  expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.85
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage in {{ $labels.pod }}"
    description: "Memory usage is {{ $value | humanizePercentage }}"
```

### Grafana Dashboards

#### Main Dashboard

**URL**: `https://grafana.citadelbuy.com/d/main-dashboard`

**Panels**:
1. **Overall Health**
   - Service uptime (last 24h)
   - Total requests/s
   - Error rate
   - P95 latency

2. **Traffic**
   - Requests by endpoint
   - Requests by method
   - Geographic distribution

3. **Resources**
   - CPU usage by pod
   - Memory usage by pod
   - Network I/O

4. **Business Metrics**
   - Orders per hour
   - Revenue per hour
   - Conversion rate
   - Cart abandonment rate

#### Database Dashboard

**URL**: `https://grafana.citadelbuy.com/d/database-dashboard`

**Panels**:
1. Active connections
2. Query execution time
3. Cache hit rate
4. Table sizes
5. Index usage
6. Slow query log

---

## Incident Response

### Incident Classification

See [INCIDENT_RESPONSE.md](./root/INCIDENT_RESPONSE.md) for complete incident response procedures.

### Quick Response Actions

#### API is Down (P1)

```bash
# 1. Check pod status
kubectl get pods -n citadelbuy -l app=citadelbuy-api

# 2. Check pod logs
kubectl logs -n citadelbuy -l app=citadelbuy-api --tail=100

# 3. Check recent deployments
kubectl rollout history deployment/citadelbuy-api -n citadelbuy

# 4. Quick rollback if needed
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy

# 5. Scale up if resource issue
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=10
```

#### Database Issues (P1)

```bash
# 1. Check database status
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npx prisma db execute --stdin <<< "SELECT 1;"

# 2. Check active connections
kubectl run psql --rm -it --restart=Never --image=postgres:16 \
  --env="PGPASSWORD=${DB_PASSWORD}" -- \
  psql -h postgres -U citadelbuy -d citadelbuy_production \
  -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Kill long-running queries
kubectl run psql --rm -it --restart=Never --image=postgres:16 \
  --env="PGPASSWORD=${DB_PASSWORD}" -- \
  psql -h postgres -U citadelbuy -d citadelbuy_production \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';"
```

#### High Load (P2)

```bash
# 1. Scale up immediately
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=15

# 2. Check HPA status
kubectl get hpa -n citadelbuy

# 3. Increase HPA max if needed
kubectl patch hpa citadelbuy-api -n citadelbuy \
  -p '{"spec":{"maxReplicas":20}}'

# 4. Monitor scaling
watch kubectl get pods -n citadelbuy
```

---

## Scaling Procedures

### Horizontal Pod Autoscaling (HPA)

#### Current Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: citadelbuy-api
  namespace: citadelbuy
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: citadelbuy-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

#### Manual Scaling

**Scale Up**
```bash
# During high traffic periods
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=15

# Or update HPA
kubectl patch hpa citadelbuy-api -n citadelbuy \
  -p '{"spec":{"minReplicas":5,"maxReplicas":20}}'
```

**Scale Down**
```bash
# During low traffic periods
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=2

# Or update HPA
kubectl patch hpa citadelbuy-api -n citadelbuy \
  -p '{"spec":{"minReplicas":2,"maxReplicas":10}}'
```

### Database Scaling

#### Read Replicas

**Add Read Replica**:
```bash
# 1. Create read replica (Azure PostgreSQL)
az postgres flexible-server replica create \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-db-replica-01 \
  --source-server citadelbuy-db-primary

# 2. Update application config
kubectl set env deployment/citadelbuy-api -n citadelbuy \
  DATABASE_READ_REPLICA_URL=postgresql://replica01.postgres.database.azure.com/citadelbuy

# 3. Verify replication lag
# Should be < 5 seconds
```

#### Connection Pooling

**PgBouncer Configuration**:
```ini
[databases]
citadelbuy = host=postgres port=5432 dbname=citadelbuy_production

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
```

### Redis Scaling

#### Redis Cluster Mode

**Enable Cluster**:
```bash
# 1. Deploy Redis cluster
kubectl apply -f infrastructure/kubernetes/redis-cluster.yaml

# 2. Verify cluster status
kubectl exec -it redis-cluster-0 -n citadelbuy -- \
  redis-cli --cluster check redis-cluster-0.redis-cluster:6379

# 3. Update application config
kubectl set env deployment/citadelbuy-api -n citadelbuy \
  REDIS_CLUSTER=true \
  REDIS_NODES=redis-cluster-0:6379,redis-cluster-1:6379,redis-cluster-2:6379
```

---

## Backup and Recovery

See [DATABASE_BACKUP_STRATEGY.md](./root/DATABASE_BACKUP_STRATEGY.md) for complete backup procedures.

### Daily Operations

#### Verify Backups

```bash
# Check latest backup
az postgres flexible-server backup list \
  --resource-group citadelbuy-prod-rg \
  --server-name citadelbuy-db-primary \
  --query "[0]"

# Verify backup size and status
```

#### Test Restore (Monthly)

```bash
# 1. Create test server from backup
az postgres flexible-server restore \
  --resource-group citadelbuy-test-rg \
  --name citadelbuy-db-restore-test \
  --source-server citadelbuy-db-primary \
  --restore-time "2025-12-06T10:00:00Z"

# 2. Verify data integrity
psql -h citadelbuy-db-restore-test.postgres.database.azure.com \
  -U citadelbuy -d citadelbuy_production \
  -c "SELECT COUNT(*) FROM \"User\";" \
  -c "SELECT COUNT(*) FROM \"Order\";"

# 3. Delete test server
az postgres flexible-server delete \
  --resource-group citadelbuy-test-rg \
  --name citadelbuy-db-restore-test
```

### Disaster Recovery

#### Complete System Restoration

**RTO (Recovery Time Objective)**: 1 hour
**RPO (Recovery Point Objective)**: 5 minutes

**Procedure**:

1. **Restore Database**
   ```bash
   # Point-in-time restore
   az postgres flexible-server restore \
     --resource-group citadelbuy-dr-rg \
     --name citadelbuy-db-dr \
     --source-server citadelbuy-db-primary \
     --restore-time "$(date -u -d '5 minutes ago' '+%Y-%m-%dT%H:%M:%SZ')"
   ```

2. **Deploy Application**
   ```bash
   # Deploy to DR cluster
   kubectl config use-context citadelbuy-dr-cluster
   kubectl apply -f infrastructure/kubernetes/production/
   ```

3. **Update DNS**
   ```bash
   # Point DNS to DR environment
   az network dns record-set a update \
     --resource-group citadelbuy-dns-rg \
     --zone-name citadelbuy.com \
     --name api \
     --set aRecords[0].ipv4Address=<DR-IP>
   ```

4. **Verify Services**
   ```bash
   # Run smoke tests
   curl https://api.citadelbuy.com/api/health
   ```

---

## Multi-Region Failover

### Architecture

```
Primary Region (East US)          Secondary Region (West Europe)
┌─────────────────────┐          ┌─────────────────────┐
│  AKS Cluster        │          │  AKS Cluster        │
│  ├─ API Pods        │          │  ├─ API Pods        │
│  ├─ Web Pods        │          │  ├─ Web Pods        │
│  └─ Workers         │          │  └─ Workers         │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                 │
┌──────────▼──────────┐          ┌──────────▼──────────┐
│  PostgreSQL Primary │◄────────►│  PostgreSQL Replica │
│  (Read/Write)       │          │  (Read Only)        │
└─────────────────────┘          └─────────────────────┘
           │                                 │
        Traffic                           Standby
        (Active)                        (Passive)
```

### Failover Procedure

#### Planned Failover

**Use Case**: Planned maintenance, region migration

```bash
# 1. Stop new traffic to primary
kubectl annotate service citadelbuy-api -n citadelbuy \
  maintenance=true

# 2. Wait for active requests to complete
sleep 60

# 3. Promote secondary database to primary
az postgres flexible-server replica promote \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-db-west-europe

# 4. Update DNS to secondary region
az network traffic-manager endpoint update \
  --resource-group citadelbuy-dns-rg \
  --profile-name citadelbuy-global \
  --name primary-endpoint \
  --type azureEndpoints \
  --target-resource-id <secondary-lb-id>

# 5. Verify traffic routing
dig api.citadelbuy.com

# 6. Monitor secondary region
watch kubectl get pods -n citadelbuy
```

#### Emergency Failover

**Use Case**: Primary region down, disaster

```bash
# 1. Immediate DNS update
az network traffic-manager endpoint update \
  --resource-group citadelbuy-dns-rg \
  --profile-name citadelbuy-global \
  --name primary-endpoint \
  --endpoint-status Disabled

# 2. Force database promotion
az postgres flexible-server replica promote \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-db-west-europe \
  --force

# 3. Scale up secondary region
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=10

# 4. Notify team
# Post in #incidents channel
```

### Failback Procedure

**After primary region recovery**:

```bash
# 1. Verify primary region health
kubectl get nodes
kubectl get pods -n citadelbuy

# 2. Create new replica from current primary
az postgres flexible-server replica create \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-db-east-us \
  --source-server citadelbuy-db-west-europe

# 3. Wait for replication to catch up
# Monitor lag

# 4. Planned failback during low traffic
# Follow "Planned Failover" procedure

# 5. Update documentation
# Record incident and lessons learned
```

---

## Performance Optimization

### Application Performance

#### API Response Time Targets

| Endpoint Type | P50 | P95 | P99 |
|--------------|-----|-----|-----|
| Read (GET) | < 50ms | < 200ms | < 500ms |
| Write (POST/PUT) | < 100ms | < 500ms | < 1000ms |
| Search | < 200ms | < 1000ms | < 2000ms |

#### Optimization Checklist

**Database**
- [ ] Enable query result caching
- [ ] Add indexes for frequent queries
- [ ] Use database connection pooling
- [ ] Implement read replicas for read-heavy operations
- [ ] Use EXPLAIN ANALYZE for slow queries

**Caching**
- [ ] Implement Redis caching for frequently accessed data
- [ ] Set appropriate TTLs for cached data
- [ ] Use cache warming for critical data
- [ ] Implement cache invalidation strategy

**Code Optimization**
- [ ] Use pagination for list endpoints
- [ ] Implement lazy loading
- [ ] Optimize N+1 queries
- [ ] Use batch operations where possible
- [ ] Minimize payload sizes

### Database Performance

#### Query Optimization

```sql
-- Before: N+1 query problem
SELECT * FROM "Order" WHERE userId = '123';
-- Then for each order:
SELECT * FROM "OrderItem" WHERE orderId = ?;

-- After: Single query with join
SELECT o.*, oi.*
FROM "Order" o
LEFT JOIN "OrderItem" oi ON o.id = oi.orderId
WHERE o.userId = '123';
```

#### Index Management

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM "Product"
WHERE categoryId = '123'
  AND price BETWEEN 50 AND 200
ORDER BY createdAt DESC;

-- Add composite index
CREATE INDEX CONCURRENTLY idx_products_category_price_date
ON "Product" (categoryId, price, createdAt DESC);
```

### CDN Configuration

**Azure CDN Rules**:

```json
{
  "caching": {
    "queryStringCachingBehavior": "IgnoreQueryString",
    "cachingRules": [
      {
        "name": "static-assets",
        "matchConditions": [
          {
            "matchVariable": "UrlFileExtension",
            "operator": "Contains",
            "matchValue": ["jpg", "png", "css", "js", "woff2"]
          }
        ],
        "actions": [
          {
            "name": "CacheExpiration",
            "parameters": {
              "cacheDuration": "1.00:00:00"
            }
          }
        ]
      },
      {
        "name": "api-responses",
        "matchConditions": [
          {
            "matchVariable": "UrlPath",
            "operator": "BeginsWith",
            "matchValue": ["/api/products"]
          }
        ],
        "actions": [
          {
            "name": "CacheExpiration",
            "parameters": {
              "cacheDuration": "00:05:00"
            }
          }
        ]
      }
    ]
  }
}
```

---

## Security Operations

### Security Monitoring

#### Log Monitoring

**Failed Login Attempts**
```bash
# Check failed logins
kubectl logs -n citadelbuy -l app=citadelbuy-api | \
  grep "authentication failed" | \
  jq -r '.userId, .ip, .timestamp' | \
  sort | uniq -c | sort -rn
```

**Suspicious Activity**
```bash
# Check for SQL injection attempts
kubectl logs -n citadelbuy -l app=citadelbuy-api | \
  grep -i "select.*from\|union.*select\|drop.*table"

# Check for XSS attempts
kubectl logs -n citadelbuy -l app=citadelbuy-api | \
  grep -i "<script\|javascript:\|onerror="
```

### Security Patching

#### Monthly Security Updates

**Procedure**:

1. **Check for Updates**
   ```bash
   # Check npm packages
   pnpm audit

   # Check Docker images
   docker scan citadelplatforms/citadelbuy-ecommerce:backend-latest
   ```

2. **Test Updates in Staging**
   ```bash
   # Update packages
   pnpm update
   pnpm audit fix

   # Test
   pnpm test
   pnpm test:e2e

   # Deploy to staging
   kubectl apply -f infrastructure/kubernetes/staging/
   ```

3. **Deploy to Production**
   ```bash
   # Follow deployment runbook
   # See DEPLOYMENT_RUNBOOK.md
   ```

### SSL/TLS Certificate Renewal

**Auto-renewal** via cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: citadelbuy-tls
  namespace: citadelbuy
spec:
  secretName: citadelbuy-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - citadelbuy.com
  - www.citadelbuy.com
  - api.citadelbuy.com
```

**Manual verification**:
```bash
# Check certificate expiry
echo | openssl s_client -servername api.citadelbuy.com \
  -connect api.citadelbuy.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## Maintenance Windows

### Scheduled Maintenance

**Window**: Every Sunday 2:00 AM - 4:00 AM UTC (Low traffic period)

**Activities**:
- Database maintenance (VACUUM, ANALYZE)
- Index rebuilding
- Log rotation
- Backup verification
- Security updates
- Performance tuning

### Maintenance Checklist

#### Pre-Maintenance

- [ ] Announce maintenance in status page
- [ ] Notify customers via email
- [ ] Take database backup
- [ ] Verify backup integrity
- [ ] Prepare rollback plan
- [ ] Ensure on-call engineer available

#### During Maintenance

- [ ] Put application in maintenance mode
- [ ] Run database maintenance
- [ ] Apply security updates
- [ ] Clear old logs
- [ ] Run optimization scripts
- [ ] Verify health after each step

#### Post-Maintenance

- [ ] Remove maintenance mode
- [ ] Run smoke tests
- [ ] Monitor metrics for 1 hour
- [ ] Update status page
- [ ] Document any issues
- [ ] Send completion notification

---

## Support Contacts

### Escalation Chain

| Level | Role | Contact | Availability |
|-------|------|---------|--------------|
| L1 | On-Call Engineer | PagerDuty | 24/7 |
| L2 | Platform Lead | platform-lead@citadelbuy.com | Business hours + on-call |
| L3 | Engineering Manager | eng-manager@citadelbuy.com | Business hours |
| L4 | CTO | cto@citadelbuy.com | Emergency only |

### External Vendors

| Service | Contact | SLA |
|---------|---------|-----|
| Azure Support | portal.azure.com | 24/7, Response < 1 hour |
| Stripe Support | support@stripe.com | 24/7 for P1 |
| SendGrid Support | support@sendgrid.com | Business hours |

---

**Last Updated**: 2025-12-06
**Maintained By**: SRE Team
**Version**: 1.0.0
**Next Review**: 2026-01-06
