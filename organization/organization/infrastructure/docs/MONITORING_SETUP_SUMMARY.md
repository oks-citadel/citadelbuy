# Broxiva Monitoring & Observability Setup - Summary

## Overview

This document summarizes the complete observability infrastructure setup for Broxiva on Azure Kubernetes Service (AKS). All components have been configured and are ready for deployment.

---

## Completed Tasks

### ✅ 1. Current Monitoring Setup Check

**Status**: Analyzed existing monitoring infrastructure

**Findings**:
- Existing Prometheus and Grafana deployments found in `infrastructure/kubernetes/monitoring/`
- Basic ServiceMonitor configuration exists for production environment
- Azure Monitor integration configured via `azure-monitor-integration.yaml`
- Prometheus alert rules defined in `prometheus-alerts.yaml`

**Files Reviewed**:
- `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/monitoring/prometheus-deployment.yaml`
- `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/monitoring/grafana-deployment.yaml`
- `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/monitoring/azure-monitor-integration.yaml`
- `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/production/servicemonitor.yaml`

---

### ✅ 2. Enhanced ServiceMonitors Created

**Status**: Comprehensive ServiceMonitors for all Broxiva services

**File Created**: `infrastructure/kubernetes/monitoring/servicemonitor-broxiva.yaml`

**Components Monitored**:
1. **Broxiva API** (`broxiva-api`)
   - Primary metrics endpoint: `:metrics` (15s interval)
   - Health metrics: `/api/health/metrics` (30s interval)
   - Business metrics: `/api/metrics/business` (60s interval)

2. **Broxiva Web** (`broxiva-web`)
   - Next.js metrics: `/api/metrics` (30s interval)
   - Performance metrics: `/api/metrics/performance` (60s interval)

3. **Database Exporters**
   - PostgreSQL Exporter (port 9187)
   - Redis Exporter (port 9121)
   - Elasticsearch Exporter (port 9114)

4. **Infrastructure**
   - NGINX Ingress Controller
   - Node Exporter
   - kube-state-metrics

**Features**:
- Automatic service discovery via label selectors
- Metric relabeling for consistent labeling
- Pod, namespace, and node labels automatically added
- Metric filtering to reduce cardinality

**Location**: `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/monitoring/servicemonitor-broxiva.yaml`

---

### ✅ 3. Grafana Dashboards JSON

**Status**: Three comprehensive dashboards created

**File Created**: `infrastructure/kubernetes/monitoring/grafana-dashboards.json`

**Dashboards**:

#### 1. Broxiva Production Overview
- Overall request rate (req/s)
- Error rate percentage
- Response time (P50, P95)
- Pod CPU and Memory usage
- Pod restart count
- Total requests (24h)
- Current error rate
- Active pods
- Average response time

#### 2. Broxiva API - Detailed Metrics
- Request rate by endpoint
- Response time by endpoint (P95)
- HTTP status code distribution
- Database query performance
- Database connection pool usage
- Cache hit rate
- API errors by type

#### 3. Broxiva Infrastructure Metrics
- Node CPU usage
- Node Memory usage
- Disk usage
- Network I/O
- PostgreSQL connections
- Redis memory usage
- Elasticsearch cluster health

**Import Instructions**:
1. Access Grafana: `kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000`
2. Navigate to Dashboards → Import
3. Upload JSON from `grafana-dashboards.json`

**Location**: `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/monitoring/grafana-dashboards.json`

---

### ✅ 4. AlertManager Deployment

**Status**: Complete AlertManager configuration with routing and notification

**File Created**: `infrastructure/kubernetes/monitoring/alertmanager-deployment.yaml`

**Components**:

#### Alert Routing
- **Critical Alerts** → PagerDuty + Slack (#critical) + Email (oncall@)
- **Warning Alerts** → Slack (#warnings) + Email (devops@)
- **Info Alerts** → Slack (#info)
- **Component-specific** → Database team, Backend team, Frontend team

#### Notification Channels
- **PagerDuty**: On-call engineer paging
- **Slack**: Multiple channels (#critical, #warnings, #info, #database, #backend, #frontend)
- **Microsoft Teams**: Warning alerts
- **Email**: Configurable recipients per severity level
- **SMS**: Critical alerts to on-call engineer

#### Alert Inhibition Rules
- Service Down suppresses High Latency alerts
- Node Not Ready suppresses Pod issue alerts
- Critical alerts suppress related warning alerts

#### Configuration Details
- **Replicas**: 2 (HA setup with anti-affinity)
- **Storage**: 10Gi persistent volume
- **Alert Grouping**: By alertname, cluster, service
- **Group Wait**: 10s (critical), 30s (warning), 5m (info)
- **Repeat Interval**: 5m (critical), 2h (warning), 24h (info)

**Required Configuration**:
Before deployment, update the following secrets in `alertmanager-deployment.yaml`:
```yaml
stringData:
  slack-webhook-url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  pagerduty-service-key: "YOUR_PAGERDUTY_SERVICE_KEY"
  sendgrid-api-key: "YOUR_SENDGRID_API_KEY"
```

**Location**: `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/monitoring/alertmanager-deployment.yaml`

---

### ✅ 5. Azure Monitor Alert Rules (Bicep)

**Status**: Comprehensive Azure-native alert rules created

**File Created**: `infrastructure/azure/monitoring/alert-rules-enhanced.bicep`

**Action Groups**:
1. **broxiva-critical-alerts**: PagerDuty, SMS, Slack, Email
2. **broxiva-warning-alerts**: Slack, Teams, Email
3. **broxiva-info-alerts**: Slack only

**Alert Categories**:

#### Infrastructure Alerts (8 rules)
- High CPU Usage (>80% for 15min)
- High Memory Usage (>85% for 15min)
- Pod Restart Alert (>3 restarts in 15min)
- Node Not Ready (5min)
- OOM Killed Containers
- High Disk Usage (>85%)
- CPU Throttling (>25%)
- Persistent Volume Usage (>80%)

#### HTTP Error Rate Alerts (3 rules)
- Application Gateway 5xx Errors (>10 in 5min)
- Application Gateway 4xx Errors (>100 in 15min)
- HTTP Error Rate from Logs (>5% error rate)

#### Certificate Expiry Alerts (3 rules)
- Key Vault Certificate 30-day warning
- Key Vault Certificate 7-day critical
- Ingress Certificate expiry check

#### Application Alerts (3 rules)
- Database Connection Failures (>5 errors in 5min)
- Deployment Failures
- Service health events

**Deployment Parameters**:
```bicep
aksClusterName: 'broxiva-prod-aks'
resourceGroupName: 'broxiva-prod-rg'
logAnalyticsWorkspaceId: '<workspace-id>'
applicationGatewayName: 'broxiva-appgw'
keyVaultName: 'broxiva-keyvault'
```

**Deployment Command**:
```bash
az deployment group create \
  --resource-group broxiva-prod-rg \
  --template-file infrastructure/azure/monitoring/alert-rules-enhanced.bicep \
  --parameters \
    aksClusterName=broxiva-prod-aks \
    logAnalyticsWorkspaceId=<workspace-id>
```

**Location**: `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/azure/monitoring/alert-rules-enhanced.bicep`

---

### ✅ 6. Monitoring Deployment Scripts

**Status**: Automated deployment scripts for Linux/macOS and Windows

**Files Created**:
- `infrastructure/scripts/deploy-monitoring.sh` (Bash)
- `infrastructure/scripts/deploy-monitoring.ps1` (PowerShell)

**Script Features**:
1. **Pre-flight Checks**:
   - Verify kubectl, Azure CLI, Helm installation
   - Check Azure login status
   - Get AKS credentials

2. **Azure Monitor Setup**:
   - Check if Container Insights is enabled
   - Enable Container Insights if needed
   - Verify Log Analytics Workspace

3. **Kubernetes Deployment**:
   - Create namespaces (`broxiva-monitoring`, `broxiva-production`)
   - Deploy Prometheus with alert rules
   - Deploy Grafana with datasources
   - Deploy AlertManager
   - Deploy ServiceMonitors
   - Deploy metric exporters (PostgreSQL, Redis)

4. **Azure Alerts Deployment**:
   - Deploy Bicep template for Azure Monitor alerts
   - Create action groups
   - Configure notification channels

5. **Verification**:
   - Check pod status
   - Verify services
   - Display access information
   - Provide next steps

**Usage**:

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

**Locations**:
- `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/scripts/deploy-monitoring.sh`
- `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/scripts/deploy-monitoring.ps1`

---

### ✅ 7. Comprehensive Monitoring Guide

**Status**: Complete operational documentation created

**File Created**: `infrastructure/docs/MONITORING_GUIDE.md`

**Contents**:

#### 1. Overview
- Monitoring goals and objectives
- Key metrics (SLIs) and targets
- SLO definitions

#### 2. Architecture
- Observability stack architecture diagram
- Data flow explanation
- Integration points

#### 3. Component Documentation
- Prometheus configuration and usage
- Grafana setup and dashboards
- AlertManager routing and notifications
- Azure Monitor integration
- Metric exporters

#### 4. Alert Matrix
- Alert severity levels (Critical, Warning, Info)
- Response time expectations
- Escalation procedures
- Alert ownership by team
- Complete alert catalog with triggers and runbooks

#### 5. Runbooks (15+ procedures)
- **Infrastructure**: Node failure, High CPU, Pod crashes, OOM killed
- **Application**: High errors, Slow response, Service down
- **Database**: DB connection issues, Slow queries, Cache hit rate
- **Security**: Certificate renewal, Unauthorized access

#### 6. Dashboards
- Detailed explanation of each dashboard
- Use cases and filters
- Panel descriptions

#### 7. Cost Analysis
- Monthly cost breakdown by component
- Cost optimization tips
- Signal vs noise analysis

#### 8. Troubleshooting
- Common issues and solutions
- Debug commands
- Resolution procedures

#### 9. Best Practices
- Metric naming conventions
- Label guidelines
- Alert design
- Dashboard design
- Security practices

#### 10. Appendix
- Useful commands
- Prometheus query examples
- Support contacts

**Location**: `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/docs/MONITORING_GUIDE.md`

---

## File Structure Summary

```
infrastructure/
├── kubernetes/
│   └── monitoring/
│       ├── prometheus-deployment.yaml (existing)
│       ├── prometheus-alerts.yaml (existing)
│       ├── grafana-deployment.yaml (existing)
│       ├── azure-monitor-integration.yaml (existing)
│       ├── servicemonitor-broxiva.yaml (NEW - Enhanced ServiceMonitors)
│       ├── alertmanager-deployment.yaml (NEW - Complete AlertManager)
│       └── grafana-dashboards.json (NEW - Dashboard definitions)
├── azure/
│   └── monitoring/
│       ├── alert-rules.bicep (existing)
│       └── alert-rules-enhanced.bicep (NEW - Comprehensive Azure alerts)
├── scripts/
│   ├── deploy-monitoring.sh (NEW - Bash deployment script)
│   └── deploy-monitoring.ps1 (NEW - PowerShell deployment script)
└── docs/
    ├── MONITORING_GUIDE.md (NEW - Complete operational guide)
    └── MONITORING_SETUP_SUMMARY.md (THIS FILE)
```

---

## Pre-Deployment Checklist

Before deploying the monitoring stack, ensure the following:

### 1. Azure Prerequisites
- [ ] AKS cluster `broxiva-prod-aks` exists in resource group `broxiva-prod-rg`
- [ ] Azure CLI installed and logged in
- [ ] Log Analytics Workspace created (or Container Insights enabled)
- [ ] Application Gateway `broxiva-appgw` deployed
- [ ] Key Vault `broxiva-keyvault` configured

### 2. Kubernetes Prerequisites
- [ ] kubectl installed and configured for AKS cluster
- [ ] Namespaces `broxiva` and `broxiva-production` exist
- [ ] Application deployments (`broxiva-api`, `broxiva-web`) running
- [ ] Services expose metrics endpoints at `:3000/metrics`

### 3. Notification Channels
- [ ] Slack webhooks created for channels: `#critical`, `#warnings`, `#info`
- [ ] PagerDuty service key obtained
- [ ] SendGrid API key (or SMTP credentials) configured
- [ ] Microsoft Teams webhook (optional) configured
- [ ] Email distribution lists created: `oncall@`, `devops@`, `engineering@`

### 4. Secrets Configuration
- [ ] Update `alertmanager-deployment.yaml` with actual webhook URLs and API keys
- [ ] Create Kubernetes secret `postgres-connection` with database connection string
- [ ] Verify Grafana admin password in `grafana-secrets` secret

### 5. DNS/Ingress (Optional)
- [ ] DNS records for `prometheus.broxiva.com`, `grafana.broxiva.com`, `alertmanager.broxiva.com`
- [ ] TLS certificates for monitoring endpoints
- [ ] Basic auth configured for public-facing monitoring UIs

---

## Deployment Steps

### Quick Start (Automated)

**Option 1: Bash (Linux/macOS)**
```bash
cd infrastructure/scripts
chmod +x deploy-monitoring.sh
./deploy-monitoring.sh
```

**Option 2: PowerShell (Windows)**
```powershell
cd infrastructure\scripts
.\deploy-monitoring.ps1
```

### Manual Deployment (Step-by-Step)

#### Step 1: Enable Azure Monitor Container Insights
```bash
az aks enable-addons \
  --name broxiva-prod-aks \
  --resource-group broxiva-prod-rg \
  --addons monitoring
```

#### Step 2: Create Monitoring Namespace
```bash
kubectl create namespace broxiva-monitoring
kubectl label namespace broxiva-monitoring environment=production name=monitoring
```

#### Step 3: Deploy Prometheus Stack
```bash
# Deploy Prometheus
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-deployment.yaml

# Deploy Alert Rules
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-alerts.yaml

# Wait for Prometheus to be ready
kubectl wait --for=condition=ready pod -l app=prometheus -n broxiva-monitoring --timeout=300s
```

#### Step 4: Deploy ServiceMonitors
```bash
kubectl apply -f infrastructure/kubernetes/monitoring/servicemonitor-broxiva.yaml
```

#### Step 5: Deploy Grafana
```bash
kubectl apply -f infrastructure/kubernetes/monitoring/grafana-deployment.yaml

# Wait for Grafana
kubectl wait --for=condition=ready pod -l app=grafana -n broxiva-monitoring --timeout=300s

# Get admin password
kubectl get secret grafana-secrets -n broxiva-monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

#### Step 6: Import Grafana Dashboards
```bash
# Port-forward to Grafana
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000

# Open browser to http://localhost:3000
# Navigate to Dashboards → Import
# Upload infrastructure/kubernetes/monitoring/grafana-dashboards.json
```

#### Step 7: Deploy AlertManager (After Configuring Secrets)
```bash
# Edit alertmanager-deployment.yaml first!
# Update webhook URLs and API keys

kubectl apply -f infrastructure/kubernetes/monitoring/alertmanager-deployment.yaml

# Wait for AlertManager
kubectl wait --for=condition=ready pod -l app=alertmanager -n broxiva-monitoring --timeout=300s
```

#### Step 8: Deploy Azure Monitor Alerts
```bash
# Get Log Analytics Workspace ID
WORKSPACE_ID=$(az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg \
  --query "addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID" -o tsv)

# Deploy Bicep template
az deployment group create \
  --resource-group broxiva-prod-rg \
  --template-file infrastructure/azure/monitoring/alert-rules-enhanced.bicep \
  --parameters \
    aksClusterName=broxiva-prod-aks \
    logAnalyticsWorkspaceId=$WORKSPACE_ID \
    applicationGatewayName=broxiva-appgw \
    keyVaultName=broxiva-keyvault
```

#### Step 9: Verify Deployment
```bash
# Check all pods are running
kubectl get pods -n broxiva-monitoring

# Check services
kubectl get svc -n broxiva-monitoring

# Check Prometheus targets
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/targets

# Verify metrics collection
# Should see targets: broxiva-api, broxiva-web, postgres, redis, etc.
```

---

## Post-Deployment Configuration

### 1. Configure Alert Notification Channels

**Slack Integration**:
1. Create Slack app with incoming webhooks
2. Create webhooks for channels: `#critical`, `#warnings`, `#info`
3. Update `alertmanager-deployment.yaml` with webhook URLs
4. Redeploy AlertManager

**PagerDuty Integration**:
1. Create PagerDuty service for Broxiva
2. Get integration key
3. Update `alertmanager-deployment.yaml`
4. Test alert routing

**Email Configuration**:
1. Verify SendGrid API key or SMTP settings
2. Test email delivery
3. Update email distribution lists

### 2. Import Custom Dashboards

The provided dashboards are templates. Customize them:
1. Add business-specific metrics
2. Adjust time ranges and refresh rates
3. Add annotations for deployments
4. Configure variables for multi-environment support

### 3. Tune Alert Thresholds

Initial thresholds are conservative. Adjust based on production data:
1. Monitor alert frequency for 1-2 weeks
2. Identify false positives
3. Adjust thresholds in `prometheus-alerts.yaml`
4. Update Azure alert rules in Bicep

### 4. Set Up Ingress (Optional)

To expose monitoring UIs publicly:
```bash
# Example Ingress for Grafana
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: broxiva-monitoring
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: grafana-basic-auth
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - grafana.broxiva.com
      secretName: grafana-tls
  rules:
    - host: grafana.broxiva.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: grafana
                port:
                  number: 3000
EOF
```

---

## Testing the Setup

### 1. Test Metrics Collection
```bash
# Port-forward to Prometheus
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090

# Navigate to http://localhost:9090/graph
# Run test queries:
# - up{job="broxiva-api"}
# - rate(http_requests_total[5m])
# - container_memory_usage_bytes{namespace="broxiva-production"}
```

### 2. Test Alerts
```bash
# Trigger a test alert by scaling down a deployment
kubectl scale deployment broxiva-api -n broxiva-production --replicas=0

# Check alert in Prometheus (http://localhost:9090/alerts)
# Should see "ServiceDown" alert after 2 minutes

# Check alert in AlertManager (http://localhost:9093)
# Should see alert routed correctly

# Scale back up
kubectl scale deployment broxiva-api -n broxiva-production --replicas=3
```

### 3. Test Notifications
```bash
# Send test alert to AlertManager
curl -H "Content-Type: application/json" -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "Test alert from monitoring setup",
      "description": "This is a test alert to verify notification channels"
    }
  }
]' http://localhost:9093/api/v1/alerts

# Verify alert received in Slack, email, etc.
```

### 4. Test Dashboards
```bash
# Port-forward to Grafana
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000

# Login to http://localhost:3000
# Navigate to imported dashboards
# Verify data is displaying correctly
# Check for any "No Data" panels
```

---

## Monitoring the Monitoring Stack

Even the monitoring stack needs monitoring! Set up these checks:

### 1. Meta-Monitoring Alerts
```yaml
# Alert if Prometheus is down
- alert: PrometheusDown
  expr: up{job="prometheus"} == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Prometheus is down"

# Alert if Grafana is down
- alert: GrafanaDown
  expr: up{job="grafana"} == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Grafana is down"

# Alert if AlertManager is down
- alert: AlertManagerDown
  expr: up{job="alertmanager"} == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "AlertManager is down"
```

### 2. Scrape Success Monitoring
```promql
# Check scrape failures
sum(up{job!="prometheus"}) by (job) == 0
```

### 3. Prometheus Storage Monitoring
```bash
# Check PVC usage
kubectl get pvc -n broxiva-monitoring

# Set up alert for high disk usage
```

---

## Next Steps

After successful deployment:

1. **Week 1**:
   - [ ] Monitor alert frequency
   - [ ] Identify false positives
   - [ ] Train team on dashboards and runbooks

2. **Week 2**:
   - [ ] Tune alert thresholds
   - [ ] Add custom business metrics
   - [ ] Set up on-call rotation in PagerDuty

3. **Month 1**:
   - [ ] Review and optimize costs
   - [ ] Add more detailed dashboards
   - [ ] Conduct incident response drill

4. **Ongoing**:
   - [ ] Quarterly review of alert effectiveness
   - [ ] Monthly dashboard review and updates
   - [ ] Continuous optimization based on feedback

---

## Support and Resources

### Documentation
- **Monitoring Guide**: `infrastructure/docs/MONITORING_GUIDE.md`
- **Runbooks**: See MONITORING_GUIDE.md § Runbooks
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **Azure Monitor Docs**: https://docs.microsoft.com/en-us/azure/azure-monitor/

### Contact
- **DevOps Team**: devops@broxiva.com | #broxiva-devops
- **On-Call**: oncall@broxiva.com | PagerDuty
- **Emergency Escalation**: devops-lead@broxiva.com

---

## Conclusion

The Broxiva monitoring and observability infrastructure is now fully configured and ready for deployment. This setup provides:

- **Comprehensive Metrics Collection**: Application, infrastructure, and business metrics
- **Proactive Alerting**: 30+ alert rules covering all critical scenarios
- **Rich Visualization**: Pre-built dashboards for all stakeholders
- **Automated Deployment**: Scripts for quick and consistent deployment
- **Operational Documentation**: Detailed runbooks and troubleshooting guides

The monitoring stack is designed to scale with Broxiva's growth while maintaining cost efficiency and providing actionable insights.

**Good luck with your deployment!** 🚀

---

**Document Version**: 1.0
**Created**: 2025-12-13
**Author**: Agent 3 - Monitoring & Observability Engineer
**Status**: Ready for Deployment
