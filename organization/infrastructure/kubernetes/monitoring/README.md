# Broxiva AKS Monitoring Configuration

This directory contains all monitoring and alerting configurations for the **broxiva-prod-aks** AKS cluster.

## Files Overview

### Kubernetes Manifests

| File | Description |
|------|-------------|
| `azure-monitor-integration.yaml` | Azure Monitor Container Insights configuration, Log Analytics queries, and workbook definitions |
| `metrics-server.yaml` | Kubernetes Metrics Server deployment for resource metrics API |
| `prometheus-deployment.yaml` | Prometheus server deployment with scrape configurations |
| `prometheus-alerts.yaml` | Prometheus alert rules for Broxiva services |
| `grafana-deployment.yaml` | Grafana deployment with pre-configured dashboards |

### Azure Resources

Located in `infrastructure/azure/monitoring/`:

| File | Description |
|------|-------------|
| `alert-rules.bicep` | Azure Monitor metric alert rules (Bicep IaC) |
| `deploy-alerts.ps1` | PowerShell deployment script for alert rules |

### Scripts

Located in `infrastructure/scripts/`:

| File | Description |
|------|-------------|
| `setup-aks-monitoring.sh` | Automated bash script for complete monitoring setup |

### Documentation

Located in `infrastructure/docs/`:

| File | Description |
|------|-------------|
| `MONITORING_SETUP.md` | Comprehensive setup guide and documentation |

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Run the automated setup script
cd infrastructure/scripts
chmod +x setup-aks-monitoring.sh
./setup-aks-monitoring.sh
```

### Option 2: Manual Setup

```bash
# 1. Get AKS credentials
az aks get-credentials --name broxiva-prod-aks --resource-group broxiva-prod-rg

# 2. Enable Azure Monitor addon
az aks enable-addons --name broxiva-prod-aks --resource-group broxiva-prod-rg --addons monitoring

# 3. Deploy metrics-server
kubectl apply -f metrics-server.yaml

# 4. Deploy Azure Monitor configuration
kubectl apply -f azure-monitor-integration.yaml

# 5. Deploy Prometheus and alerts
kubectl create namespace broxiva-monitoring
kubectl apply -f prometheus-alerts.yaml
kubectl apply -f prometheus-deployment.yaml

# 6. Deploy Grafana
kubectl apply -f grafana-deployment.yaml

# 7. Deploy Azure alert rules
cd ../../azure/monitoring
az deployment group create \
  --name broxiva-alerts \
  --resource-group broxiva-prod-rg \
  --template-file alert-rules.bicep
```

## Verification

### Check Metrics Server

```bash
# Wait for metrics-server to be ready
kubectl wait --for=condition=available --timeout=300s deployment/metrics-server -n kube-system

# Test metrics
kubectl top nodes
kubectl top pods -A
```

### Check Azure Monitor

```bash
# Verify addon is enabled
az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg --query addonProfiles.omsagent

# View Log Analytics workspace
az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg \
  --query addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID -o tsv
```

### Check Prometheus and Grafana

```bash
# Check deployments
kubectl get all -n broxiva-monitoring

# Access Prometheus
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090

# Access Grafana
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000
```

## Monitoring Components

### 1. Azure Monitor Container Insights

**Purpose:** Cloud-native monitoring for AKS clusters

**Features:**
- Real-time metrics for nodes, pods, and containers
- Log aggregation and analysis with KQL
- Pre-built workbooks and dashboards
- Integration with Azure Alerts

**Access:**
- Azure Portal → AKS cluster → Insights

### 2. Metrics Server

**Purpose:** Kubernetes resource metrics API

**Features:**
- Enables `kubectl top nodes` and `kubectl top pods`
- Provides metrics for Horizontal Pod Autoscaler (HPA)
- Resource usage tracking

### 3. Prometheus

**Purpose:** Time-series metrics collection and storage

**Scrape Targets:**
- Kubernetes API server
- Nodes (cAdvisor)
- Application pods
- PostgreSQL, Redis, Elasticsearch exporters

**Access:**
```bash
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
```

### 4. Grafana

**Purpose:** Metrics visualization and dashboards

**Pre-configured Dashboards:**
- Broxiva API Metrics
- Database Metrics (PostgreSQL, Redis, Elasticsearch)
- Production Overview

**Access:**
```bash
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000
```
Default credentials: admin/changeme

## Alert Rules

### Azure Monitor Alerts

| Alert | Severity | Threshold | Evaluation |
|-------|----------|-----------|------------|
| High CPU | Warning | >80% | 15 min |
| High Memory | Warning | >85% | 15 min |
| Pod Crashes | Critical | >0 | 15 min |
| Failed Pods | Critical | >0 | 5 min |
| Node Not Ready | Critical | >0 | 5 min |
| High Disk Usage | Warning | >85% | 15 min |
| OOM Killed | Critical | >0 | 5 min |
| CPU Throttling | Warning | >25% | 15 min |
| PV Usage | Warning | >80% | 15 min |
| Cluster Health | Critical | Degraded | Immediate |

### Prometheus Alerts

Categories:
- **Service Availability**: ServiceDown, HighErrorRate
- **API Performance**: APIResponseTimeSlow, HighRequestRate
- **Resource Usage**: HighCPUUsage, HighMemoryUsage, DiskSpace
- **Database Health**: PostgreSQL, Redis, Elasticsearch
- **Container Issues**: Restarts, CrashLooping, NotReady

## Notification Channels

Configure in Azure action groups:
- **Email**: DevOps and Engineering teams
- **SMS**: On-call engineers
- **Webhooks**: Slack, Microsoft Teams
- **Azure App Push**: Mobile notifications

## Useful Commands

### Metrics

```bash
# Node metrics
kubectl top nodes

# Pod metrics (all namespaces)
kubectl top pods -A

# Pod metrics (production namespace)
kubectl top pods -n broxiva-production

# Container metrics
kubectl top pod <pod-name> --containers -n broxiva-production
```

### Logs

```bash
# Prometheus logs
kubectl logs -n broxiva-monitoring -l app=prometheus

# Grafana logs
kubectl logs -n broxiva-monitoring -l app=grafana

# Metrics-server logs
kubectl logs -n kube-system -l app=metrics-server

# OMS agent logs (Azure Monitor)
kubectl logs -n kube-system -l component=oms-agent
```

### Status

```bash
# Monitoring pods
kubectl get pods -n broxiva-monitoring

# Metrics server
kubectl get deployment metrics-server -n kube-system

# Azure Monitor agent
kubectl get daemonset omsagent -n kube-system

# API services
kubectl get apiservice v1beta1.metrics.k8s.io
```

## Troubleshooting

### Metrics Not Available

```bash
# Check metrics-server
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl describe apiservice v1beta1.metrics.k8s.io
kubectl logs -n kube-system -l app=metrics-server

# Restart metrics-server if needed
kubectl rollout restart deployment metrics-server -n kube-system
```

### Azure Monitor Not Collecting Data

```bash
# Check OMS agent
kubectl get pods -n kube-system -l component=oms-agent
kubectl logs -n kube-system -l component=oms-agent

# Restart addon
az aks disable-addons --name broxiva-prod-aks --resource-group broxiva-prod-rg --addons monitoring
az aks enable-addons --name broxiva-prod-aks --resource-group broxiva-prod-rg --addons monitoring
```

### Prometheus Issues

```bash
# Check Prometheus
kubectl get pods -n broxiva-monitoring -l app=prometheus
kubectl logs -n broxiva-monitoring -l app=prometheus

# Check targets (port-forward first)
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Visit: http://localhost:9090/targets
```

## Configuration Updates

### Update Alert Thresholds

Edit `alert-rules.bicep` or `prometheus-alerts.yaml` and redeploy:

```bash
# Azure alerts
az deployment group create \
  --name broxiva-alerts \
  --resource-group broxiva-prod-rg \
  --template-file alert-rules.bicep

# Prometheus alerts
kubectl apply -f prometheus-alerts.yaml
```

### Add New Scrape Target

Edit `prometheus-deployment.yaml` and add to `scrape_configs`:

```yaml
- job_name: 'my-new-service'
  kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
          - broxiva-production
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app]
      action: keep
      regex: my-new-service
```

Then apply:
```bash
kubectl apply -f prometheus-deployment.yaml
kubectl rollout restart deployment prometheus -n broxiva-monitoring
```

## Security Best Practices

1. **Change Default Passwords**: Update Grafana admin password
2. **Use RBAC**: Restrict access to monitoring namespaces
3. **Network Policies**: Limit traffic to monitoring components
4. **Secrets Management**: Use Kubernetes secrets or Azure Key Vault
5. **TLS Encryption**: Enable TLS for Grafana and Prometheus
6. **Audit Logging**: Enable audit logs for monitoring changes

## Maintenance Schedule

- **Daily**: Review active alerts and dashboards
- **Weekly**: Check monitoring component health
- **Monthly**: Review and optimize alert thresholds
- **Quarterly**: Update monitoring components to latest versions

## Support

For issues or questions:
- DevOps Team: devops@broxiva.com
- Documentation: `infrastructure/docs/MONITORING_SETUP.md`
- Runbooks: TBD

## Related Documentation

- [Complete Setup Guide](../../docs/MONITORING_SETUP.md)
- [Azure Monitor Documentation](https://docs.microsoft.com/azure/azure-monitor/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

**Last Updated:** 2025-12-13
**Version:** 1.0.0
