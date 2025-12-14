# Broxiva AKS Monitoring - Commands Reference Card

Quick reference for common monitoring commands.

## Setup Commands

### Initial Setup
```bash
# Get AKS credentials
az aks get-credentials --name broxiva-prod-aks --resource-group broxiva-prod-rg

# Enable Azure Monitor addon
az aks enable-addons --name broxiva-prod-aks --resource-group broxiva-prod-rg --addons monitoring

# Deploy all monitoring components
cd infrastructure/scripts
./setup-aks-monitoring.sh
```

## Metrics Commands

### Node Metrics
```bash
# View node CPU and memory usage
kubectl top nodes

# Watch node metrics in real-time
watch kubectl top nodes

# Get detailed node information
kubectl describe nodes
```

### Pod Metrics
```bash
# All namespaces
kubectl top pods -A

# Production namespace
kubectl top pods -n broxiva-production

# Specific pod
kubectl top pod <pod-name> -n broxiva-production

# With containers breakdown
kubectl top pod <pod-name> --containers -n broxiva-production

# Sort by CPU
kubectl top pods -A --sort-by=cpu

# Sort by memory
kubectl top pods -A --sort-by=memory
```

## Azure Monitor Commands

### Check Addon Status
```bash
# Check if monitoring addon is enabled
az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg \
  --query addonProfiles.omsagent.enabled

# Get Log Analytics workspace ID
az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg \
  --query addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID -o tsv
```

### Alert Management
```bash
# List all metric alerts
az monitor metrics alert list --resource-group broxiva-prod-rg

# Show specific alert
az monitor metrics alert show \
  --name broxiva-aks-high-cpu \
  --resource-group broxiva-prod-rg

# Enable alert
az monitor metrics alert update \
  --name broxiva-aks-high-cpu \
  --resource-group broxiva-prod-rg \
  --enabled true

# Disable alert
az monitor metrics alert update \
  --name broxiva-aks-high-cpu \
  --resource-group broxiva-prod-rg \
  --enabled false
```

### Activity Log
```bash
# View recent alerts
az monitor activity-log list \
  --resource-group broxiva-prod-rg \
  --max-events 50

# Filter by category
az monitor activity-log list \
  --resource-group broxiva-prod-rg \
  --max-events 20 \
  --query "[?category=='Alert']"
```

## Kubernetes Monitoring Components

### Metrics Server
```bash
# Check deployment
kubectl get deployment metrics-server -n kube-system

# Check pods
kubectl get pods -n kube-system -l app=metrics-server

# View logs
kubectl logs -n kube-system -l app=metrics-server

# Restart
kubectl rollout restart deployment metrics-server -n kube-system

# Check API service
kubectl get apiservice v1beta1.metrics.k8s.io

# Describe API service
kubectl describe apiservice v1beta1.metrics.k8s.io
```

### Prometheus
```bash
# Check deployment
kubectl get deployment prometheus -n broxiva-monitoring

# Check pods
kubectl get pods -n broxiva-monitoring -l app=prometheus

# View logs
kubectl logs -n broxiva-monitoring -l app=prometheus

# Port forward to access UI
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090

# Reload configuration (if web API enabled)
curl -X POST http://localhost:9090/-/reload
```

### Grafana
```bash
# Check deployment
kubectl get deployment grafana -n broxiva-monitoring

# Check pods
kubectl get pods -n broxiva-monitoring -l app=grafana

# View logs
kubectl logs -n broxiva-monitoring -l app=grafana

# Port forward to access UI
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000

# Reset admin password
kubectl exec -it -n broxiva-monitoring deployment/grafana -- \
  grafana-cli admin reset-admin-password <new-password>
```

### Azure Monitor OMS Agent
```bash
# Check DaemonSet
kubectl get daemonset omsagent -n kube-system

# Check pods
kubectl get pods -n kube-system -l component=oms-agent

# View logs
kubectl logs -n kube-system -l component=oms-agent

# View specific container logs
kubectl logs -n kube-system <omsagent-pod> -c omsagent
```

## Monitoring Status Commands

### Overall Status
```bash
# All monitoring components
kubectl get all -n broxiva-monitoring

# All monitoring-related pods system-wide
kubectl get pods -A -l tier=monitoring

# Check all deployments
kubectl get deployments -A -l tier=monitoring
```

### Service Monitors (if using Prometheus Operator)
```bash
# List ServiceMonitors
kubectl get servicemonitor -n broxiva-production

# Describe specific ServiceMonitor
kubectl describe servicemonitor broxiva-api-monitor -n broxiva-production

# List PodMonitors
kubectl get podmonitor -n broxiva-production
```

### Alert Rules
```bash
# Prometheus rules
kubectl get prometheusrules -A

# Describe rules
kubectl describe prometheusrule broxiva-alerts -n broxiva-production

# View ConfigMap with alerts
kubectl get configmap prometheus-alerts -n broxiva-monitoring -o yaml
```

## Log Commands

### Application Logs
```bash
# API logs
kubectl logs -n broxiva-production -l app=broxiva-api --tail=100

# Web logs
kubectl logs -n broxiva-production -l app=broxiva-web --tail=100

# Follow logs
kubectl logs -n broxiva-production -l app=broxiva-api -f

# Previous container logs
kubectl logs -n broxiva-production <pod-name> --previous
```

### Search Logs for Errors
```bash
# Grep for errors in API logs
kubectl logs -n broxiva-production -l app=broxiva-api | grep -i error

# Last 1000 lines, filter errors
kubectl logs -n broxiva-production -l app=broxiva-api --tail=1000 | grep -i "error\|exception"
```

## Troubleshooting Commands

### Debug Metrics Issues
```bash
# Test metrics API directly
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods

# Check API server health
kubectl get --raw /healthz
kubectl get --raw /livez
kubectl get --raw /readyz
```

### Debug Prometheus
```bash
# Check if Prometheus can reach targets
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# Open: http://localhost:9090/targets

# Query Prometheus metrics
curl 'http://localhost:9090/api/v1/query?query=up'

# Check configuration
kubectl get configmap prometheus-config -n broxiva-monitoring -o yaml
```

### Check Resource Usage
```bash
# Node capacity and allocations
kubectl describe nodes | grep -A 5 "Allocated resources"

# Pod resource requests and limits
kubectl describe pod <pod-name> -n broxiva-production | grep -A 10 "Limits\|Requests"

# Events (helpful for troubleshooting)
kubectl get events -n broxiva-production --sort-by='.lastTimestamp'
```

## Useful One-Liners

### Find Resource-Hungry Pods
```bash
# Top 10 CPU consumers
kubectl top pods -A --sort-by=cpu | head -n 11

# Top 10 Memory consumers
kubectl top pods -A --sort-by=memory | head -n 11

# Pods in production namespace sorted by memory
kubectl top pods -n broxiva-production --sort-by=memory
```

### Check Pod Health
```bash
# Pods not in Running state
kubectl get pods -A --field-selector=status.phase!=Running

# Pods with restarts
kubectl get pods -A --field-selector=status.containerStatuses[*].restartCount>0

# Recently created pods
kubectl get pods -A --sort-by=.metadata.creationTimestamp
```

### Monitor Pod Restarts
```bash
# Show restart counts
kubectl get pods -n broxiva-production -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[*].restartCount

# Watch for changes
watch 'kubectl get pods -n broxiva-production -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[*].restartCount'
```

## Azure CLI Shortcuts

### Quick Status Check
```bash
# AKS cluster status
az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg --query "powerState"

# Node pool status
az aks nodepool list --cluster-name broxiva-prod-aks --resource-group broxiva-prod-rg -o table

# Active alerts count
az monitor metrics alert list --resource-group broxiva-prod-rg --query "length([?enabled==\`true\`])"
```

## Export and Backup

### Export Configurations
```bash
# Export all monitoring configs
kubectl get all,configmap,secret -n broxiva-monitoring -o yaml > monitoring-backup.yaml

# Export Prometheus config
kubectl get configmap prometheus-config -n broxiva-monitoring -o yaml > prometheus-config-backup.yaml

# Export Grafana dashboards
kubectl get configmap -n broxiva-monitoring -l app=grafana -o yaml > grafana-dashboards-backup.yaml
```

### Create Diagnostic Bundle
```bash
# Collect diagnostic info
mkdir monitoring-diagnostics
kubectl get all -n broxiva-monitoring > monitoring-diagnostics/resources.txt
kubectl describe all -n broxiva-monitoring > monitoring-diagnostics/descriptions.txt
kubectl logs -n broxiva-monitoring -l app=prometheus --tail=500 > monitoring-diagnostics/prometheus.log
kubectl logs -n broxiva-monitoring -l app=grafana --tail=500 > monitoring-diagnostics/grafana.log
kubectl logs -n kube-system -l app=metrics-server --tail=500 > monitoring-diagnostics/metrics-server.log
tar czf monitoring-diagnostics-$(date +%Y%m%d).tar.gz monitoring-diagnostics/
```

## Maintenance Commands

### Update Monitoring Components
```bash
# Update metrics-server
kubectl set image deployment/metrics-server \
  metrics-server=registry.k8s.io/metrics-server/metrics-server:v0.7.0 \
  -n kube-system

# Update Prometheus
kubectl set image deployment/prometheus \
  prometheus=prom/prometheus:latest \
  -n broxiva-monitoring

# Update Grafana
kubectl set image deployment/grafana \
  grafana=grafana/grafana:latest \
  -n broxiva-monitoring
```

### Restart Components
```bash
# Restart all monitoring components
kubectl rollout restart deployment -n broxiva-monitoring

# Restart specific component
kubectl rollout restart deployment prometheus -n broxiva-monitoring
kubectl rollout restart deployment grafana -n broxiva-monitoring
kubectl rollout restart deployment metrics-server -n kube-system
```

### Scale Components
```bash
# Scale Prometheus
kubectl scale deployment prometheus -n broxiva-monitoring --replicas=2

# Scale Grafana
kubectl scale deployment grafana -n broxiva-monitoring --replicas=2
```

## Quick Tests

### Test Metrics Collection
```bash
# One-liner to test all metrics
echo "Testing node metrics..." && kubectl top nodes && \
echo "Testing pod metrics..." && kubectl top pods -A | head -n 5 && \
echo "Testing API service..." && kubectl get apiservice v1beta1.metrics.k8s.io && \
echo "All tests completed!"
```

### Test Alert Rules
```bash
# List all Azure alerts
az monitor metrics alert list --resource-group broxiva-prod-rg -o table

# Check Prometheus rules
kubectl exec -n broxiva-monitoring deployment/prometheus -- \
  promtool check rules /etc/prometheus/alerts/*.yml
```

---

## Aliases (Add to .bashrc or .zshrc)

```bash
# Monitoring aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgpa='kubectl get pods -A'
alias kl='kubectl logs'
alias kd='kubectl describe'
alias kt='kubectl top'
alias ktn='kubectl top nodes'
alias ktp='kubectl top pods'
alias mon='kubectl get all -n broxiva-monitoring'
alias prom='kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090'
alias graf='kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000'
```

---

**Quick Access URLs** (after port-forwarding):
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Azure Portal: https://portal.azure.com

**Common Namespaces:**
- `broxiva-production` - Production applications
- `broxiva-monitoring` - Monitoring stack
- `kube-system` - System components (metrics-server, OMS agent)
