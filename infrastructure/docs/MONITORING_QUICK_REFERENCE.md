# Broxiva Monitoring - Quick Reference Card

## Quick Access Commands

### Access Monitoring UIs
```bash
# Prometheus
kubectl port-forward -n broxiva-monitoring svc/prometheus 9090:9090
# http://localhost:9090

# Grafana (User: admin, Get password below)
kubectl port-forward -n broxiva-monitoring svc/grafana 3000:3000
kubectl get secret grafana-secrets -n broxiva-monitoring -o jsonpath='{.data.admin-password}' | base64 -d
# http://localhost:3000

# AlertManager
kubectl port-forward -n broxiva-monitoring svc/alertmanager 9093:9093
# http://localhost:9093
```

### Quick Health Check
```bash
# All monitoring pods
kubectl get pods -n broxiva-monitoring

# Application pods
kubectl get pods -n broxiva-production

# Check all services
kubectl get svc -n broxiva-monitoring
```

### View Logs
```bash
# Prometheus
kubectl logs -n broxiva-monitoring -l app=prometheus -f

# Grafana
kubectl logs -n broxiva-monitoring -l app=grafana -f

# API
kubectl logs -n broxiva-production -l app=broxiva-api -f --tail=100
```

## Common Prometheus Queries

```promql
# Request rate (last 5 min)
sum(rate(http_requests_total[5m])) by (app)

# Error rate %
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# Response time P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, app))

# CPU usage by pod
sum(rate(container_cpu_usage_seconds_total{namespace="broxiva-production"}[5m])) by (pod) * 100

# Memory usage by pod (MB)
sum(container_memory_usage_bytes{namespace="broxiva-production"}) by (pod) / 1024 / 1024
```

## Alert Severity Response

| Level | Response Time | Who | How |
|-------|--------------|-----|-----|
| **Critical** | Immediate | On-call engineer | PagerDuty + SMS |
| **Warning** | < 30 min | DevOps team | Slack + Email |
| **Info** | < 4 hours | Engineering | Slack |

## Common Issues & Quick Fixes

### Issue: High Error Rate
```bash
# Check errors
kubectl logs -n broxiva-production -l app=broxiva-api | grep -i error | tail -50

# Scale up
kubectl scale deployment broxiva-api -n broxiva-production --replicas=5

# Restart
kubectl rollout restart deployment broxiva-api -n broxiva-production
```

### Issue: Pod Crash Looping
```bash
# Check pod status
kubectl get pod <pod-name> -n broxiva-production
kubectl describe pod <pod-name> -n broxiva-production

# View logs (current and previous)
kubectl logs <pod-name> -n broxiva-production
kubectl logs <pod-name> -n broxiva-production --previous

# Delete pod to force restart
kubectl delete pod <pod-name> -n broxiva-production
```

### Issue: Database Connection Issues
```bash
# Check DB pod
kubectl get pods -l app=postgres -n broxiva-production
kubectl logs -l app=postgres -n broxiva-production --tail=100

# Restart API to reset connections
kubectl rollout restart deployment broxiva-api -n broxiva-production

# Check connection count in Prometheus
# Query: pg_stat_activity_count
```

### Issue: High Memory Usage
```bash
# Find top consumers
kubectl top pods -n broxiva-production --sort-by=memory

# Scale horizontally
kubectl scale deployment <deployment> -n broxiva-production --replicas=<count>

# Or increase limits (edit deployment)
kubectl edit deployment <deployment> -n broxiva-production
```

## Deployment Commands

### Deploy Monitoring Stack
```bash
# Linux/macOS
cd infrastructure/scripts
./deploy-monitoring.sh

# Windows
cd infrastructure\scripts
.\deploy-monitoring.ps1
```

### Manual Component Deployment
```bash
# Prometheus
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-deployment.yaml

# Grafana
kubectl apply -f infrastructure/kubernetes/monitoring/grafana-deployment.yaml

# AlertManager
kubectl apply -f infrastructure/kubernetes/monitoring/alertmanager-deployment.yaml

# ServiceMonitors
kubectl apply -f infrastructure/kubernetes/monitoring/servicemonitor-broxiva.yaml

# Azure Alerts
az deployment group create \
  --resource-group broxiva-prod-rg \
  --template-file infrastructure/azure/monitoring/alert-rules-enhanced.bicep
```

## Key Metrics to Watch

| Metric | Warning | Critical | Query |
|--------|---------|----------|-------|
| Error Rate | > 1% | > 5% | `rate(http_requests_total{status=~"5.."}[5m])` |
| Response Time P95 | > 1s | > 3s | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` |
| CPU Usage | > 70% | > 85% | `rate(container_cpu_usage_seconds_total[5m]) * 100` |
| Memory Usage | > 80% | > 90% | `container_memory_usage_bytes / container_spec_memory_limit_bytes` |
| DB Connections | > 150 | > 180 | `pg_stat_activity_count` |
| Cache Hit Rate | < 80% | < 70% | `rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))` |

## Dashboards

1. **Broxiva Overview** - High-level system health
2. **API Detailed** - Backend performance deep-dive
3. **Infrastructure** - Node and cluster metrics
4. **Database** - PostgreSQL, Redis, Elasticsearch

## Contact Information

| Team | Slack Channel | Email | Escalation |
|------|--------------|-------|------------|
| On-Call | #broxiva-oncall | oncall@broxiva.com | PagerDuty |
| DevOps | #broxiva-devops | devops@broxiva.com | devops-lead@ |
| Backend | #broxiva-backend | backend@broxiva.com | engineering-lead@ |
| Database | #broxiva-database | database@broxiva.com | devops-lead@ |

## Documentation

- **Full Guide**: `infrastructure/docs/MONITORING_GUIDE.md`
- **Setup Summary**: `infrastructure/docs/MONITORING_SETUP_SUMMARY.md`
- **This Card**: `infrastructure/docs/MONITORING_QUICK_REFERENCE.md`

---

**Keep this handy for quick troubleshooting!**
