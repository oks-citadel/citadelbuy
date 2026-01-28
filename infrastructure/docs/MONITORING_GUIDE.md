# Broxiva Observability & Monitoring Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Monitoring Stack Components](#monitoring-stack-components)
4. [Deployment](#deployment)
5. [Alert Matrix](#alert-matrix)
6. [Runbooks](#runbooks)
7. [Dashboards](#dashboards)
8. [Cost Analysis](#cost-analysis)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

This guide provides comprehensive documentation for the Broxiva observability and monitoring infrastructure deployed on Azure Kubernetes Service (AKS).

### Monitoring Goals

- **Reliability**: Detect and respond to incidents before users are impacted
- **Performance**: Track application performance and identify bottlenecks
- **Cost Optimization**: Monitor resource usage and optimize spending
- **Compliance**: Maintain audit trails and meet regulatory requirements
- **Operational Excellence**: Enable data-driven decision making

### Key Metrics (SLIs)

| Service | SLI | Target | Measurement |
|---------|-----|--------|-------------|
| API | Availability | 99.9% | Uptime monitoring |
| API | Latency (p95) | < 500ms | Response time tracking |
| API | Error Rate | < 0.1% | HTTP 5xx errors |
| Web | Page Load Time | < 2s | Core Web Vitals |
| Database | Query Time (p95) | < 100ms | PostgreSQL metrics |
| Cache | Hit Rate | > 85% | Redis metrics |

---

## Architecture

### Observability Stack Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Azure Monitor / Container Insights         │
│  - Cluster-level metrics                                        │
│  - Log Analytics Workspace                                      │
│  - Azure Alerts                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    AKS Cluster (broxiva-prod-aks)               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Prometheus  │  │   Grafana    │  │ AlertManager │         │
│  │   (Metrics)  │─▶│ (Dashboards) │◀─│ (Alerting)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         ▲                                      │                │
│         │                                      ▼                │
│  ┌──────────────────────────────────────────────────┐          │
│  │          ServiceMonitors / PodMonitors           │          │
│  └──────────────────────────────────────────────────┘          │
│         ▲                                                       │
│         │                                                       │
│  ┌──────┴────────────┬─────────────┬─────────────────┐        │
│  │                   │             │                 │         │
│  │  broxiva-api      │ broxiva-web │  exporters      │         │
│  │  (Nest.js)        │ (Next.js)   │  (DB/Cache)     │         │
│  │  :3000/metrics    │ :3000/metrics│ :9187/9121     │         │
│  └───────────────────┴─────────────┴─────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Integrations                      │
│  - PagerDuty (Critical alerts)                                  │
│  - Slack (All alerts)                                           │
│  - Microsoft Teams (Warnings)                                   │
│  - Email (All severity levels)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Metrics Collection**: Applications expose metrics at `/metrics` endpoints
2. **Service Discovery**: ServiceMonitors define scraping configuration
3. **Metrics Storage**: Prometheus scrapes and stores metrics (30-day retention)
4. **Alerting**: Prometheus evaluates rules, sends alerts to AlertManager
5. **Notification**: AlertManager routes alerts based on severity and component
6. **Visualization**: Grafana queries Prometheus for dashboard displays
7. **Long-term Storage**: Azure Monitor stores logs and metrics for compliance

---

## Monitoring Stack Components

### 1. Prometheus

**Purpose**: Time-series metrics collection and storage

**Configuration**:
- Scrape interval: 15s (adjustable per target)
- Retention: 30 days local, unlimited in Azure Monitor
- Storage: 50Gi persistent volume

**Key Jobs**:
- `broxiva-api`: Backend API metrics
- `broxiva-web`: Frontend metrics
- `postgres`: Database metrics
- `redis`: Cache metrics
- `elasticsearch`: Search metrics
- `kubernetes-*`: Cluster components

**Access**:
```bash
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Open http://localhost:9090
```

### 2. Grafana

**Purpose**: Metrics visualization and dashboards

**Configuration**:
- Admin user: `admin`
- Password: Stored in `grafana-secrets` secret
- Datasource: Prometheus (auto-configured)

**Pre-configured Dashboards**:
1. **Broxiva Overview**: High-level system health
2. **API Detailed Metrics**: Backend performance deep-dive
3. **Infrastructure Metrics**: Node, pod, and resource usage
4. **Database Performance**: PostgreSQL, Redis, Elasticsearch
5. **Business Metrics**: Orders, users, revenue tracking

**Access**:
```bash
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000
# Open http://localhost:3000
```

### 3. AlertManager

**Purpose**: Alert routing, grouping, and notification delivery

**Configuration**:
- Routes alerts based on severity and component
- Groups related alerts to reduce noise
- Inhibits duplicate alerts
- Integrates with PagerDuty, Slack, Teams, Email

**Alert Routing**:
```
Critical → PagerDuty + Slack (#critical) + Email (oncall@)
Warning  → Slack (#warnings) + Email (devops@)
Info     → Slack (#info)
```

**Access**:
```bash
kubectl port-forward -n broxiva-monitoring svc/alertmanager 9093:9093
# Open http://localhost:9093
```

### 4. Azure Monitor / Container Insights

**Purpose**: Cloud-native monitoring and long-term storage

**Features**:
- Automatic metric collection from AKS
- Log aggregation in Log Analytics
- Built-in dashboards in Azure Portal
- Alert rules for infrastructure events
- Integration with Azure services

**Access**:
- Azure Portal → AKS Cluster → Insights
- Log Analytics Workspace → Logs

### 5. Metric Exporters

**PostgreSQL Exporter**:
- Port: 9187
- Metrics: Connections, queries, replication lag, locks

**Redis Exporter**:
- Port: 9121
- Metrics: Memory usage, hit rate, operations/sec

**Elasticsearch Exporter**:
- Port: 9114
- Metrics: Cluster health, indexing rate, search performance

**Node Exporter**:
- Port: 9100
- Metrics: CPU, memory, disk, network per node

---

## Deployment

### Prerequisites

1. **Tools**:
   - kubectl (configured for AKS cluster)
   - Azure CLI (logged in)
   - Helm (optional, for advanced deployments)

2. **Permissions**:
   - AKS cluster admin access
   - Azure subscription contributor role

3. **Configuration**:
   - Update AlertManager secrets (Slack webhooks, PagerDuty keys)
   - Configure notification recipients
   - Set up Log Analytics Workspace

### Deployment Steps

#### Option 1: Automated Deployment

**Linux/macOS**:
```bash
cd infrastructure/scripts
chmod +x deploy-monitoring.sh
./deploy-monitoring.sh
```

**Windows (PowerShell)**:
```powershell
cd infrastructure\scripts
.\deploy-monitoring.ps1
```

#### Option 2: Manual Deployment

**Step 1: Enable Azure Monitor**
```bash
az aks enable-addons \
  --name broxiva-prod-aks \
  --resource-group broxiva-prod-rg \
  --addons monitoring
```

**Step 2: Create Namespaces**
```bash
kubectl create namespace broxiva-monitoring
kubectl label namespace broxiva-monitoring environment=production
```

**Step 3: Deploy Prometheus**
```bash
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-deployment.yaml
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-alerts.yaml
```

**Step 4: Deploy Grafana**
```bash
kubectl apply -f infrastructure/kubernetes/monitoring/grafana-deployment.yaml
```

**Step 5: Deploy AlertManager**
```bash
# Update secrets first!
kubectl apply -f infrastructure/kubernetes/monitoring/alertmanager-deployment.yaml
```

**Step 6: Deploy ServiceMonitors**
```bash
kubectl apply -f infrastructure/kubernetes/monitoring/servicemonitor-broxiva.yaml
```

**Step 7: Deploy Azure Alerts**
```bash
az deployment group create \
  --resource-group broxiva-prod-rg \
  --template-file infrastructure/azure/monitoring/alert-rules-enhanced.bicep \
  --parameters \
    aksClusterName=broxiva-prod-aks \
    logAnalyticsWorkspaceId=<workspace-id>
```

### Verification

```bash
# Check pod status
kubectl get pods -n broxiva-monitoring

# Check services
kubectl get svc -n broxiva-monitoring

# Check ServiceMonitors
kubectl get servicemonitors -n broxiva-monitoring

# Verify Prometheus targets
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/targets

# Check Grafana
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000
# Login with admin credentials
```

---

## Alert Matrix

### Alert Severity Levels

| Severity | Response Time | Escalation | Notification Channels |
|----------|--------------|------------|----------------------|
| **Critical** (P0) | Immediate | PagerDuty on-call | PagerDuty, Slack, Email, SMS |
| **Warning** (P1) | < 30 minutes | Team lead | Slack, Email |
| **Info** (P2) | < 4 hours | Engineering team | Slack |

### Alert Categories and Ownership

#### Infrastructure Alerts (DevOps Team)

| Alert Name | Trigger | Severity | Owner | Runbook |
|------------|---------|----------|-------|---------|
| `KubernetesNodeNotReady` | Node status != Ready for 5min | Critical | DevOps | [Node Failure](#runbook-node-failure) |
| `HighCPUUsage` | CPU > 80% for 10min | Warning | DevOps | [High CPU](#runbook-high-cpu) |
| `HighMemoryUsage` | Memory > 85% for 10min | Warning | DevOps | [High Memory](#runbook-high-memory) |
| `DiskSpaceLow` | Disk > 85% for 5min | Warning | DevOps | [Disk Space](#runbook-disk-space) |
| `DiskSpaceCritical` | Disk > 95% for 5min | Critical | DevOps | [Disk Space](#runbook-disk-space) |
| `PodCrashLooping` | Restarts > 2 in 5min | Critical | DevOps | [Pod Crashes](#runbook-pod-crashes) |
| `OOMKilled` | Container killed due to OOM | Critical | DevOps | [OOM Killed](#runbook-oom) |

#### Application Alerts (Backend Team)

| Alert Name | Trigger | Severity | Owner | Runbook |
|------------|---------|----------|-------|---------|
| `HighErrorRate` | HTTP 5xx > 5% for 5min | Critical | Backend | [High Errors](#runbook-high-errors) |
| `APIResponseTimeSlow` | p95 > 2s for 10min | Warning | Backend | [Slow Response](#runbook-slow-response) |
| `APIResponseTimeCritical` | p95 > 5s for 5min | Critical | Backend | [Slow Response](#runbook-slow-response) |
| `DatabaseConnectionFailure` | DB errors > 5 in 5min | Critical | Backend | [DB Connection](#runbook-db-connection) |
| `ServiceDown` | Service unreachable 2min | Critical | Backend | [Service Down](#runbook-service-down) |

#### Database Alerts (Database Team)

| Alert Name | Trigger | Severity | Owner | Runbook |
|------------|---------|----------|-------|---------|
| `PostgreSQLDown` | DB unreachable 1min | Critical | Database | [DB Down](#runbook-db-down) |
| `PostgreSQLTooManyConnections` | Connections > 150 for 5min | Warning | Database | [Too Many Connections](#runbook-db-connections) |
| `PostgreSQLSlowQueries` | Avg query > 1s for 5min | Warning | Database | [Slow Queries](#runbook-slow-queries) |
| `RedisDown` | Redis unreachable 1min | Critical | Database | [Redis Down](#runbook-redis-down) |
| `RedisMemoryHigh` | Memory > 90% for 5min | Warning | Database | [Redis Memory](#runbook-redis-memory) |
| `RedisCacheLowHitRate` | Hit rate < 70% for 10min | Warning | Database | [Cache Hit Rate](#runbook-cache-hit-rate) |

#### Security Alerts (Security Team)

| Alert Name | Trigger | Severity | Owner | Runbook |
|------------|---------|----------|-------|---------|
| `CertificateExpiringSoon` | Cert expires in 30 days | Warning | Security | [Cert Renewal](#runbook-cert-renewal) |
| `CertificateExpiringCritical` | Cert expires in 7 days | Critical | Security | [Cert Renewal](#runbook-cert-renewal) |
| `UnauthorizedAccessAttempt` | 401/403 spike | Warning | Security | [Security Incident](#runbook-security) |

### Alert Inhibition Rules

To prevent alert fatigue, the following inhibition rules are in place:

1. **Service Down suppresses High Latency**: If a service is down, don't alert on slow responses
2. **Node Not Ready suppresses Pod Issues**: If a node fails, don't alert on pods on that node
3. **Critical suppresses Warning**: Critical alerts suppress related warnings for the same component

---

## Runbooks

### Infrastructure Runbooks

#### <a name="runbook-node-failure"></a>Node Failure

**Alert**: `KubernetesNodeNotReady`

**Symptoms**: Node status shows NotReady or Unknown

**Investigation**:
1. Check node status:
   ```bash
   kubectl get nodes
   kubectl describe node <node-name>
   ```

2. Check node events:
   ```bash
   kubectl get events --field-selector involvedObject.name=<node-name>
   ```

3. Check Azure Portal for VM issues

**Resolution**:
1. **If disk full**: Clean up logs, resize disk
2. **If network issue**: Check NSG rules, VNet connectivity
3. **If VM crash**: Restart VM via Azure Portal
4. **If persistent**: Cordon and drain node, replace with new node
   ```bash
   kubectl cordon <node-name>
   kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
   # Add new node to node pool
   kubectl delete node <node-name>
   ```

**Prevention**: Enable auto-repair in AKS node pool settings

---

#### <a name="runbook-high-cpu"></a>High CPU Usage

**Alert**: `HighCPUUsage`

**Investigation**:
1. Identify top consumers:
   ```bash
   kubectl top nodes
   kubectl top pods --all-namespaces
   ```

2. Check Grafana CPU dashboard for trends

3. Examine pod logs for unusual activity:
   ```bash
   kubectl logs <pod-name> -n <namespace> --tail=100
   ```

**Resolution**:
1. **Scale horizontally**: Increase replicas
   ```bash
   kubectl scale deployment <deployment-name> -n <namespace> --replicas=<count>
   ```

2. **Optimize code**: Identify and fix CPU-intensive operations

3. **Scale vertically**: Increase CPU limits in deployment

4. **Add nodes**: Scale AKS node pool if cluster-wide issue

**Prevention**: Set up HPA (Horizontal Pod Autoscaler) for automatic scaling

---

#### <a name="runbook-pod-crashes"></a>Pod Crash Looping

**Alert**: `PodCrashLooping`

**Investigation**:
1. Check pod status and events:
   ```bash
   kubectl get pod <pod-name> -n <namespace>
   kubectl describe pod <pod-name> -n <namespace>
   ```

2. Check logs (current and previous):
   ```bash
   kubectl logs <pod-name> -n <namespace>
   kubectl logs <pod-name> -n <namespace> --previous
   ```

3. Check resource constraints:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Limits"
   ```

**Resolution**:
1. **Application error**: Fix bug, deploy new version
2. **Missing dependencies**: Check ConfigMaps, Secrets, PVCs
3. **Resource limits**: Increase memory/CPU limits
4. **Image pull error**: Check registry credentials, image tag

**Common Fixes**:
```bash
# Restart deployment
kubectl rollout restart deployment <deployment-name> -n <namespace>

# Check secret
kubectl get secret <secret-name> -n <namespace> -o yaml

# Check configmap
kubectl get configmap <configmap-name> -n <namespace> -o yaml
```

---

### Application Runbooks

#### <a name="runbook-high-errors"></a>High Error Rate

**Alert**: `HighErrorRate`

**Investigation**:
1. Check error breakdown in Grafana "API Detailed" dashboard

2. Query logs for errors:
   ```bash
   kubectl logs -l app=broxiva-api -n broxiva-production | grep -i error | tail -50
   ```

3. Check specific error patterns:
   - 500: Internal server errors
   - 502: Bad gateway (upstream issues)
   - 503: Service unavailable
   - 504: Gateway timeout

4. Check dependent services (database, cache, external APIs)

**Resolution**:
1. **Database issues**: Scale DB, optimize queries, check connections
2. **External API failures**: Implement circuit breakers, fallbacks
3. **Application bugs**: Deploy hotfix
4. **Resource exhaustion**: Scale application pods

**Mitigation**:
```bash
# Scale API pods
kubectl scale deployment broxiva-api -n broxiva-production --replicas=5

# Restart problematic pods
kubectl rollout restart deployment broxiva-api -n broxiva-production
```

---

#### <a name="runbook-db-connection"></a>Database Connection Failures

**Alert**: `DatabaseConnectionFailure`

**Investigation**:
1. Check PostgreSQL pod status:
   ```bash
   kubectl get pods -l app=postgres -n broxiva-production
   kubectl logs -l app=postgres -n broxiva-production --tail=100
   ```

2. Check connection count:
   ```bash
   # Port-forward to Prometheus
   kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
   # Query: pg_stat_activity_count
   ```

3. Check for connection leaks in application logs

**Resolution**:
1. **Connection pool exhausted**:
   - Increase max connections in PostgreSQL
   - Increase connection pool size in app
   - Fix connection leaks in code

2. **Database overloaded**:
   - Scale database resources
   - Optimize slow queries
   - Add read replicas

3. **Network issues**:
   - Check Service endpoints
   - Verify DNS resolution
   - Check NetworkPolicies

**Quick Fix**:
```bash
# Restart API pods to reset connections
kubectl rollout restart deployment broxiva-api -n broxiva-production

# If database is stuck, restart (CAREFUL - causes downtime)
kubectl delete pod -l app=postgres -n broxiva-production
```

---

#### <a name="runbook-cert-renewal"></a>Certificate Renewal

**Alert**: `CertificateExpiringSoon` or `CertificateExpiringCritical`

**Investigation**:
1. Identify expiring certificates:
   ```bash
   # Check Azure Key Vault
   az keyvault certificate list --vault-name broxiva-keyvault --query "[].{name:name, expires:attributes.expires}"

   # Check Kubernetes secrets
   kubectl get certificates -A
   ```

2. Determine certificate type:
   - TLS/SSL certificates (Let's Encrypt, commercial CA)
   - Service principal certificates
   - API keys/tokens

**Resolution**:

**For Let's Encrypt (cert-manager)**:
```bash
# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Force renewal
kubectl delete certificaterequest <cert-request> -n <namespace>
kubectl delete certificate <cert-name> -n <namespace>
# cert-manager will automatically recreate
```

**For Azure Key Vault**:
1. Renew via Azure Portal or CLI
2. Update Kubernetes external secret
3. Restart affected pods

**For Manual Certificates**:
1. Generate new certificate
2. Upload to Key Vault
3. Update Kubernetes secret:
   ```bash
   kubectl create secret tls <secret-name> \
     --cert=path/to/cert.crt \
     --key=path/to/cert.key \
     -n <namespace> \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
4. Restart affected pods

**Prevention**: Set up automatic renewal with cert-manager

---

## Dashboards

### 1. Broxiva Production Overview

**Purpose**: Real-time system health at a glance

**Key Panels**:
- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- CPU usage per pod
- Memory usage per pod
- Pod restart count
- Active alerts

**Filters**: Time range, namespace, service

**URL**: `http://localhost:3000/d/broxiva-overview`

---

### 2. API Detailed Metrics

**Purpose**: Deep-dive into backend API performance

**Key Panels**:
- Request rate by endpoint
- Response time by endpoint
- HTTP status code distribution
- Database query performance
- Cache hit rate
- Error breakdown by type
- Active connections
- Thread pool utilization

**Use Cases**:
- Performance troubleshooting
- Endpoint-specific analysis
- Capacity planning

---

### 3. Infrastructure Metrics

**Purpose**: Kubernetes cluster and node monitoring

**Key Panels**:
- Node CPU/Memory/Disk usage
- Network I/O
- Pod distribution across nodes
- Persistent volume usage
- Ingress traffic
- DNS query rate

**Use Cases**:
- Capacity planning
- Resource optimization
- Infrastructure issues

---

### 4. Database Performance

**Purpose**: Monitor all data stores (PostgreSQL, Redis, Elasticsearch)

**Key Panels**:
- PostgreSQL: Connections, query time, deadlocks, replication lag
- Redis: Memory usage, hit rate, operations/sec, evicted keys
- Elasticsearch: Cluster health, indexing rate, search performance, JVM memory

**Use Cases**:
- Database tuning
- Query optimization
- Capacity planning

---

### 5. Business Metrics

**Purpose**: Track business KPIs and user behavior

**Key Panels**:
- Active users
- Order volume
- Revenue (hourly, daily)
- Cart abandonment rate
- Payment success rate
- User signup rate
- Top products
- Geographic distribution

**Use Cases**:
- Business intelligence
- Product decisions
- Marketing effectiveness

---

## Cost Analysis

### Monitoring Cost Breakdown

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| **Azure Monitor Container Insights** | $150-300 | Based on data ingestion (GB) |
| **Log Analytics Workspace** | $100-250 | 30-day retention, ~5GB/day |
| **Prometheus Storage (50Gi)** | $10 | Azure Managed Disk |
| **Grafana Storage (10Gi)** | $2 | Azure Managed Disk |
| **AlertManager Storage (10Gi)** | $2 | Azure Managed Disk |
| **Application Gateway (Metrics)** | $0 | Included in AppGw cost |
| **PagerDuty** | $25-50/user | On-call management |
| **Total Estimated** | **$289-614/month** | |

### Cost Optimization Tips

1. **Reduce Log Ingestion**:
   - Filter out verbose logs
   - Exclude non-production namespaces
   - Adjust retention policies

2. **Optimize Metric Collection**:
   - Increase scrape intervals for non-critical metrics
   - Drop unnecessary metrics via relabeling
   - Use metric_relabel_configs to filter

3. **Right-size Storage**:
   - Monitor PVC usage
   - Adjust retention periods based on compliance needs
   - Archive old data to cheaper storage

4. **Consolidate Tools**:
   - Use Azure Monitor for infrastructure, Prometheus for apps
   - Evaluate if separate Grafana instance is needed
   - Consider managed Prometheus/Grafana offerings

### Signal vs Noise

**High-Signal Metrics** (Keep):
- Error rates, latency percentiles
- Resource saturation (CPU, memory, disk)
- Business KPIs (orders, revenue)
- Security events
- SLI/SLO tracking

**Low-Signal Metrics** (Consider Dropping):
- Debug-level application metrics
- Metrics that never trigger alerts
- Redundant system metrics
- Very high-cardinality metrics (specific user IDs, request IDs)

**Recommended Approach**:
1. Start with comprehensive monitoring
2. Analyze alert frequency and actionability
3. Prune metrics that don't provide value
4. Focus on metrics tied to SLOs

---

## Troubleshooting

### Common Issues

#### Prometheus Not Scraping Targets

**Symptoms**: Missing metrics, empty dashboards

**Check**:
```bash
# Check Prometheus targets
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/targets

# Check ServiceMonitor
kubectl get servicemonitor -n broxiva-monitoring
kubectl describe servicemonitor broxiva-api -n broxiva-monitoring

# Check Service labels match ServiceMonitor selector
kubectl get svc broxiva-api -n broxiva-production --show-labels
```

**Fix**:
- Ensure Service labels match ServiceMonitor selector
- Verify metrics endpoint is accessible
- Check RBAC permissions for Prometheus

---

#### Grafana Can't Connect to Prometheus

**Symptoms**: "Data source proxy error" in Grafana

**Check**:
```bash
# Test Prometheus from Grafana pod
kubectl exec -it -n broxiva-monitoring <grafana-pod> -- curl http://prometheus:9090/api/v1/query?query=up
```

**Fix**:
- Verify Prometheus Service exists and is accessible
- Check datasource configuration in Grafana
- Restart Grafana pod

---

#### Alerts Not Firing

**Symptoms**: Expected alerts don't appear

**Check**:
```bash
# Check alert rules in Prometheus
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/alerts

# Check AlertManager
kubectl port-forward -n broxiva-monitoring svc/alertmanager 9093:9093
# Navigate to http://localhost:9093
```

**Debug**:
1. Verify alert rule syntax
2. Check if metric exists (query in Prometheus)
3. Verify alert evaluation (check "for" duration)
4. Check AlertManager routing rules
5. Verify notification channel configuration (webhooks, emails)

---

#### High Cardinality Issues

**Symptoms**: Prometheus running out of memory, slow queries

**Check**:
```bash
# Check metric cardinality
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Query: topk(10, count by (__name__)({__name__=~".+"}))
```

**Fix**:
- Drop high-cardinality labels (user IDs, request IDs)
- Use metric_relabel_configs to filter
- Aggregate metrics before storing
- Increase Prometheus memory if needed

---

## Best Practices

### Metric Naming

Follow Prometheus naming conventions:
- Use snake_case: `http_requests_total`
- Include unit suffix: `_seconds`, `_bytes`, `_total`
- Counter suffix: `_total`
- Example: `broxiva_api_http_requests_total{method="GET",status="200"}`

### Label Best Practices

**Do**:
- Keep labels low-cardinality (< 100 unique values)
- Use meaningful label names: `method`, `status`, `endpoint`
- Include environment label: `environment="production"`

**Don't**:
- Use user IDs, request IDs, email addresses as labels
- Create labels with unbounded values
- Over-use labels (keep to 5-10 per metric)

### Alert Best Practices

1. **Make Alerts Actionable**: Every alert should have a clear action
2. **Avoid Alert Fatigue**: Tune thresholds, use inhibition rules
3. **Provide Context**: Include runbook links, relevant metrics
4. **Test Alerts**: Regularly test critical alert paths
5. **Review Regularly**: Adjust thresholds based on production data

### Dashboard Best Practices

1. **Audience-Specific**: Create different dashboards for different teams
2. **Start High-Level**: Overview first, drill-down second
3. **Include SLOs**: Show SLI metrics prominently
4. **Use Variables**: Enable filtering by namespace, service, etc.
5. **Add Annotations**: Mark deployments, incidents on graphs

### Security Best Practices

1. **Secure Endpoints**: Use authentication for Grafana, Prometheus, AlertManager
2. **Encrypt Secrets**: Use Kubernetes secrets or Azure Key Vault
3. **RBAC**: Implement least-privilege access
4. **Audit Logs**: Enable logging for all monitoring components
5. **Regular Updates**: Keep monitoring stack components updated

---

## Appendix

### Useful Commands

**Port Forwarding**:
```bash
# Prometheus
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090

# Grafana
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000

# AlertManager
kubectl port-forward -n broxiva-monitoring svc/alertmanager 9093:9093
```

**Logs**:
```bash
# Prometheus logs
kubectl logs -n broxiva-monitoring -l app=prometheus -f

# Grafana logs
kubectl logs -n broxiva-monitoring -l app=grafana -f

# AlertManager logs
kubectl logs -n broxiva-monitoring -l app=alertmanager -f

# Application logs
kubectl logs -n broxiva-production -l app=broxiva-api -f --tail=100
```

**Metrics**:
```bash
# Check metric endpoint
kubectl exec -it <pod-name> -n <namespace> -- curl localhost:3000/metrics
```

### Prometheus Query Examples

**Request Rate**:
```promql
sum(rate(http_requests_total[5m])) by (app)
```

**Error Rate**:
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

**Response Time (P95)**:
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, app))
```

**CPU Usage**:
```promql
sum(rate(container_cpu_usage_seconds_total{namespace="broxiva-production"}[5m])) by (pod) * 100
```

**Memory Usage**:
```promql
sum(container_memory_usage_bytes{namespace="broxiva-production"}) by (pod) / 1024 / 1024
```

### Support Contacts

| Team | Channel | Email | Escalation |
|------|---------|-------|------------|
| DevOps | #broxiva-devops | devops@broxiva.com | PagerDuty |
| Backend | #broxiva-backend | backend@broxiva.com | devops-lead@ |
| Database | #broxiva-database | database@broxiva.com | devops-lead@ |
| Security | #broxiva-security | security@broxiva.com | CISO |
| On-Call | #broxiva-oncall | oncall@broxiva.com | Immediate |

---

**Document Version**: 1.0
**Last Updated**: 2025-12-13
**Maintained By**: DevOps Team
**Review Cycle**: Quarterly
