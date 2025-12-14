# Broxiva AKS Monitoring and Alerting Setup Guide

## Overview

This document provides comprehensive setup instructions for monitoring and alerting for the **broxiva-prod-aks** AKS cluster.

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Monitoring Components](#monitoring-components)
6. [Alert Rules](#alert-rules)
7. [Accessing Dashboards](#accessing-dashboards)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Architecture

The monitoring stack consists of:

- **Azure Monitor Container Insights**: Cloud-native monitoring and alerting
- **Log Analytics Workspace**: Centralized log aggregation and analysis
- **Metrics Server**: Kubernetes resource metrics API
- **Prometheus**: Time-series metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alert Manager**: Alert routing and notification management

```
┌─────────────────────────────────────────────────────────┐
│                   Azure Monitor                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Container Insights                       │   │
│  │  - Node metrics                                  │   │
│  │  - Pod metrics                                   │   │
│  │  - Container logs                                │   │
│  │  - Kubernetes events                             │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                                │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │      Log Analytics Workspace                     │   │
│  │  - KQL queries                                   │   │
│  │  - Workbooks                                     │   │
│  │  - Alert rules                                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              AKS Cluster: broxiva-prod-aks              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Metrics      │  │ Prometheus   │  │ Grafana      │ │
│  │ Server       │  │              │  │              │ │
│  │              │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Application Pods                         │  │
│  │  - broxiva-api                                   │  │
│  │  - broxiva-web                                   │  │
│  │  - broxiva-workers                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

- Azure CLI (az) version 2.50.0 or later
- kubectl version 1.27 or later
- Bash (for Linux/Mac) or PowerShell (for Windows)
- Bicep (for deploying alert rules)

### Required Permissions

- Contributor role on the AKS cluster
- Monitoring Contributor role on the resource group
- Log Analytics Contributor role (if creating new workspace)

### Verify Prerequisites

```bash
# Check Azure CLI
az version

# Check kubectl
kubectl version --client

# Login to Azure
az login

# Set subscription
az account set --subscription <subscription-id>

# Verify AKS cluster access
az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg
```

## Quick Start

### Automated Setup (Recommended)

Run the automated setup script:

```bash
# Navigate to scripts directory
cd infrastructure/scripts

# Make script executable
chmod +x setup-aks-monitoring.sh

# Run setup script
./setup-aks-monitoring.sh
```

This script will:
1. Get AKS credentials
2. Enable Azure Monitor addon
3. Deploy metrics-server
4. Deploy Prometheus and Grafana
5. Configure alert rules
6. Verify metrics collection

### Manual Setup

If you prefer manual setup, follow the [Detailed Setup](#detailed-setup) section below.

## Detailed Setup

### Step 1: Get AKS Credentials

```bash
az aks get-credentials \
  --name broxiva-prod-aks \
  --resource-group broxiva-prod-rg \
  --overwrite-existing
```

### Step 2: Check Azure Monitor Addon Status

```bash
az aks show \
  --name broxiva-prod-aks \
  --resource-group broxiva-prod-rg \
  --query addonProfiles.omsagent
```

### Step 3: Enable Azure Monitor Addon (if not enabled)

```bash
az aks enable-addons \
  --name broxiva-prod-aks \
  --resource-group broxiva-prod-rg \
  --addons monitoring
```

### Step 4: Get Log Analytics Workspace ID

```bash
az aks show \
  --name broxiva-prod-aks \
  --resource-group broxiva-prod-rg \
  --query addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID \
  -o tsv
```

### Step 5: Deploy Metrics Server

```bash
# Deploy metrics-server
kubectl apply -f infrastructure/kubernetes/monitoring/metrics-server.yaml

# Wait for deployment to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/metrics-server -n kube-system

# Verify metrics-server is running
kubectl get deployment metrics-server -n kube-system
kubectl get apiservice v1beta1.metrics.k8s.io
```

### Step 6: Verify Metrics Collection

Wait 1-2 minutes for metrics to be available, then test:

```bash
# Check node metrics
kubectl top nodes

# Check pod metrics
kubectl top pods -A

# Check specific namespace
kubectl top pods -n broxiva-production
```

### Step 7: Deploy Prometheus Stack

```bash
# Create monitoring namespace
kubectl create namespace broxiva-monitoring

# Deploy Prometheus
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-deployment.yaml

# Deploy Prometheus alert rules
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-alerts.yaml

# Deploy Grafana
kubectl apply -f infrastructure/kubernetes/monitoring/grafana-deployment.yaml

# Verify deployments
kubectl get all -n broxiva-monitoring
```

### Step 8: Deploy Azure Monitor Configuration

```bash
kubectl apply -f infrastructure/kubernetes/monitoring/azure-monitor-integration.yaml
```

### Step 9: Deploy Azure Alert Rules

```bash
# Using Bicep
cd infrastructure/azure/monitoring

# Deploy with Azure CLI
az deployment group create \
  --name broxiva-alerts-deployment \
  --resource-group broxiva-prod-rg \
  --template-file alert-rules.bicep \
  --parameters aksClusterName=broxiva-prod-aks

# OR using PowerShell script
.\deploy-alerts.ps1
```

## Monitoring Components

### Azure Monitor Container Insights

**Features:**
- Real-time node and pod performance metrics
- Container logs aggregation
- Kubernetes events tracking
- Live container console access
- Metric alerts and log alerts

**Access:**
- Azure Portal → AKS Cluster → Insights

**Key Metrics:**
- CPU usage percentage (node and pod level)
- Memory working set percentage
- Disk usage percentage
- Network bytes sent/received
- Pod and container counts by status

### Metrics Server

**Purpose:** Provides resource metrics API for kubectl and HPA

**Endpoints:**
- `/apis/metrics.k8s.io/v1beta1/nodes` - Node metrics
- `/apis/metrics.k8s.io/v1beta1/pods` - Pod metrics

**Usage:**
```bash
# View node metrics
kubectl top nodes

# View pod metrics
kubectl top pods -n broxiva-production

# View specific pod
kubectl top pod <pod-name> -n broxiva-production

# View container metrics
kubectl top pod <pod-name> --containers -n broxiva-production
```

### Prometheus

**Configuration Location:**
- Deployment: `infrastructure/kubernetes/monitoring/prometheus-deployment.yaml`
- Alerts: `infrastructure/kubernetes/monitoring/prometheus-alerts.yaml`

**Scrape Targets:**
- Kubernetes API server
- Kubernetes nodes (cAdvisor)
- Application pods (with annotations)
- PostgreSQL exporter
- Redis exporter
- Elasticsearch exporter

**Access Prometheus:**
```bash
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
```
Open: http://localhost:9090

### Grafana

**Pre-configured Dashboards:**
- Broxiva API Metrics
- Database Metrics (PostgreSQL, Redis, Elasticsearch)
- Broxiva Production Overview

**Access Grafana:**
```bash
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000
```
Open: http://localhost:3000

**Default Credentials:**
- Username: `admin`
- Password: `changeme` (CHANGE THIS IN PRODUCTION!)

**Change Password:**
```bash
kubectl exec -it -n broxiva-monitoring deployment/grafana -- grafana-cli admin reset-admin-password <new-password>
```

## Alert Rules

### Azure Monitor Metric Alerts

| Alert Name | Severity | Threshold | Description |
|------------|----------|-----------|-------------|
| broxiva-aks-high-cpu | Warning (2) | >80% | Node CPU usage exceeds 80% for 15 minutes |
| broxiva-aks-high-memory | Warning (2) | >85% | Node memory usage exceeds 85% for 15 minutes |
| broxiva-aks-pod-crashes | Critical (1) | >0 | Pods are crash looping in production namespace |
| broxiva-aks-failed-pods | Critical (1) | >0 | Pods in Failed state |
| broxiva-aks-node-not-ready | Critical (0) | >0 | Nodes not in Ready state |
| broxiva-aks-high-disk-usage | Warning (2) | >85% | Disk usage exceeds 85% |
| broxiva-aks-oom-killed | Critical (1) | >0 | Containers killed due to OOM |
| broxiva-aks-cpu-throttling | Warning (2) | >25% | CPU throttling exceeds 25% |
| broxiva-aks-pv-usage | Warning (2) | >80% | Persistent volume usage exceeds 80% |
| broxiva-aks-cluster-health | Critical (0) | N/A | Cluster health degraded or unavailable |

### Prometheus Alert Rules

Located in: `infrastructure/kubernetes/monitoring/prometheus-alerts.yaml`

**Categories:**
1. **Service Availability**
   - ServiceDown
   - HighErrorRate
   - HighPodRestartRate

2. **API Performance**
   - APIResponseTimeSlow
   - APIResponseTimeCritical
   - HighRequestRate

3. **Resource Usage**
   - HighCPUUsage
   - HighMemoryUsage
   - DiskSpaceLow
   - DiskSpaceCritical

4. **Database Health**
   - PostgreSQLDown
   - PostgreSQLTooManyConnections
   - PostgreSQLSlowQueries
   - RedisDown
   - RedisMemoryHigh
   - ElasticsearchClusterYellow

5. **Container Issues**
   - ContainerHighCPU
   - ContainerHighMemory
   - ContainerRestarting
   - PodCrashLooping

### Configuring Alert Notifications

#### Email Notifications

Edit action group in Azure Portal or update Bicep template:

```bicep
emailReceivers: [
  {
    name: 'DevOps Team'
    emailAddress: 'devops@broxiva.com'
    useCommonAlertSchema: true
  }
]
```

#### Slack Integration

1. Create Slack webhook URL in your Slack workspace
2. Add webhook receiver to action group:

```bicep
webhookReceivers: [
  {
    name: 'Slack Integration'
    serviceUri: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    useCommonAlertSchema: true
  }
]
```

#### SMS Notifications

```bicep
smsReceivers: [
  {
    name: 'On-Call Engineer'
    countryCode: '1'
    phoneNumber: '5551234567'
  }
]
```

## Accessing Dashboards

### Azure Portal

1. Navigate to Azure Portal: https://portal.azure.com
2. Search for "broxiva-prod-aks"
3. Click on **Insights** in left menu
4. View tabs:
   - **Cluster**: Overall cluster health
   - **Nodes**: Node-level metrics
   - **Controllers**: Deployment, ReplicaSet, StatefulSet metrics
   - **Containers**: Container-level metrics
   - **Logs**: Run KQL queries

### Useful KQL Queries

**Pod Restarts Analysis:**
```kql
KubePodInventory
| where Namespace == 'broxiva-production'
| where PodRestartCount > 0
| summarize TotalRestarts = sum(PodRestartCount) by PodName, ControllerName
| order by TotalRestarts desc
```

**Container CPU Usage:**
```kql
Perf
| where ObjectName == "K8SContainer"
| where CounterName == "cpuUsageNanoCores"
| where InstanceName contains "broxiva"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), InstanceName
| render timechart
```

**Error Logs:**
```kql
ContainerLog
| where Namespace == 'broxiva-production'
| where LogEntry contains "error" or LogEntry contains "ERROR"
| project TimeGenerated, ContainerName, LogEntry
| order by TimeGenerated desc
| take 100
```

### Grafana Dashboards

Access Grafana:
```bash
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000
```

**Available Dashboards:**
1. Broxiva API Metrics
2. Database Metrics
3. Broxiva Production Overview

**Create New Dashboard:**
1. Click **+** → **Dashboard**
2. Add panel
3. Configure data source (Prometheus)
4. Enter PromQL query
5. Save dashboard

## Troubleshooting

### Metrics Server Issues

**Problem:** `kubectl top` returns error "Metrics API not available"

**Solution:**
```bash
# Check metrics-server pods
kubectl get pods -n kube-system -l app=metrics-server

# Check logs
kubectl logs -n kube-system -l app=metrics-server

# Verify APIService
kubectl get apiservice v1beta1.metrics.k8s.io

# Check for TLS issues (common on AKS)
kubectl describe apiservice v1beta1.metrics.k8s.io
```

### Azure Monitor Addon Issues

**Problem:** OMS agent pods not running

**Solution:**
```bash
# Check OMS agent pods
kubectl get pods -n kube-system -l component=oms-agent

# Check logs
kubectl logs -n kube-system -l component=oms-agent

# Restart addon
az aks disable-addons --name broxiva-prod-aks --resource-group broxiva-prod-rg --addons monitoring
az aks enable-addons --name broxiva-prod-aks --resource-group broxiva-prod-rg --addons monitoring
```

### Prometheus Issues

**Problem:** Prometheus not scraping targets

**Solution:**
```bash
# Check Prometheus pods
kubectl get pods -n broxiva-monitoring -l app=prometheus

# Access Prometheus UI and check targets
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Open http://localhost:9090/targets

# Check service discovery
# Look for targets in "Down" state and check pod annotations
```

### Alert Not Firing

**Problem:** Expected alerts not triggering

**Solution:**
1. Verify alert rule is enabled:
   ```bash
   az monitor metrics alert show --name broxiva-aks-high-cpu --resource-group broxiva-prod-rg
   ```

2. Check metric data availability:
   - Azure Portal → Monitor → Metrics
   - Select metric and verify data is being collected

3. Verify action group:
   ```bash
   az monitor action-group show --name broxiva-alerts-action-group --resource-group broxiva-prod-rg
   ```

4. Check alert history:
   ```bash
   az monitor activity-log list --resource-group broxiva-prod-rg --max-events 50
   ```

## Maintenance

### Regular Tasks

**Daily:**
- Review active alerts
- Check dashboard for anomalies
- Verify all monitoring components are running

**Weekly:**
- Review alert history and adjust thresholds if needed
- Check Log Analytics workspace usage
- Update alert rules based on patterns

**Monthly:**
- Review and update Grafana dashboards
- Clean up old metrics data if needed
- Review and optimize KQL queries
- Update metrics-server and Prometheus versions

### Updating Components

**Update Metrics Server:**
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

**Update Prometheus:**
```bash
kubectl set image deployment/prometheus prometheus=prom/prometheus:latest -n broxiva-monitoring
```

**Update Grafana:**
```bash
kubectl set image deployment/grafana grafana=grafana/grafana:latest -n broxiva-monitoring
```

### Backup and Disaster Recovery

**Backup Prometheus Data:**
```bash
kubectl exec -n broxiva-monitoring deployment/prometheus -- tar czf /tmp/prometheus-backup.tar.gz /prometheus
kubectl cp broxiva-monitoring/prometheus-xxx:/tmp/prometheus-backup.tar.gz ./prometheus-backup-$(date +%Y%m%d).tar.gz
```

**Backup Grafana Dashboards:**
```bash
kubectl exec -n broxiva-monitoring deployment/grafana -- tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
kubectl cp broxiva-monitoring/grafana-xxx:/tmp/grafana-backup.tar.gz ./grafana-backup-$(date +%Y%m%d).tar.gz
```

## Best Practices

1. **Set Appropriate Thresholds**: Adjust alert thresholds based on baseline metrics
2. **Use Alert Grouping**: Group related alerts to avoid notification fatigue
3. **Document Runbooks**: Create runbooks for common alert scenarios
4. **Regular Reviews**: Review and tune alert rules quarterly
5. **Monitor the Monitors**: Set up alerts for monitoring system health
6. **Secure Access**: Use RBAC to control access to monitoring tools
7. **Data Retention**: Configure appropriate retention policies for cost optimization

## Support and Resources

- Azure Monitor Documentation: https://docs.microsoft.com/azure/azure-monitor/
- Prometheus Documentation: https://prometheus.io/docs/
- Grafana Documentation: https://grafana.com/docs/
- Kubernetes Metrics Server: https://github.com/kubernetes-sigs/metrics-server

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-13 | Initial setup documentation |

---

**Maintained by:** DevOps Team
**Last Updated:** 2025-12-13
**Review Schedule:** Quarterly
