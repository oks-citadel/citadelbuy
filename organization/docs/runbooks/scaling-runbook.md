# Scaling Runbook

**Version**: 1.0.0
**Last Updated**: 2025-12-06
**Owner**: Platform Engineering Team

## Quick Reference

| Scenario | Action | Command |
|----------|--------|---------|
| High CPU | Scale up API pods | `kubectl scale deployment/broxiva-api --replicas=15 -n broxiva` |
| High Memory | Increase memory limits | `kubectl set resources deployment/broxiva-api --limits=memory=2Gi -n broxiva` |
| Database slow | Add read replica | See Database Scaling section |
| Cache overload | Enable Redis cluster | See Redis Scaling section |

## When to Scale

### Automatic Scaling Triggers
- CPU utilization > 70% for 5 minutes
- Memory utilization > 80% for 5 minutes
- Request queue depth > 100
- Response time P95 > 1 second

### Manual Scaling Indicators
- Anticipated traffic spike (product launch, sale event)
- Seasonal demand increase
- Load test preparation
- Migration or data import operations

## API Scaling

### Horizontal Scaling

**Scale Up**:
```bash
# Immediate scale for traffic spike
kubectl scale deployment/broxiva-api -n broxiva --replicas=20

# Update HPA limits
kubectl patch hpa broxiva-api -n broxiva -p '{"spec":{"maxReplicas":30}}'
```

**Scale Down**:
```bash
# Gradual scale down during low traffic
kubectl scale deployment/broxiva-api -n broxiva --replicas=3

# Reset HPA
kubectl patch hpa broxiva-api -n broxiva -p '{"spec":{"maxReplicas":10}}'
```

### Vertical Scaling

**Increase Resources**:
```bash
kubectl set resources deployment/broxiva-api -n broxiva \
  --limits=cpu=2000m,memory=4Gi \
  --requests=cpu=1000m,memory=2Gi
```

## Database Scaling

### Read Replica Setup

```bash
# Create read replica (Azure)
az postgres flexible-server replica create \
  --resource-group broxiva-prod-rg \
  --name broxiva-db-replica-02 \
  --source-server broxiva-db-primary

# Update application
kubectl set env deployment/broxiva-api -n broxiva \
  DATABASE_READ_REPLICA_URL="postgresql://replica02.postgres.database.azure.com/broxiva"
```

### Connection Pooling

**PgBouncer Scaling**:
```bash
# Increase connection pool
kubectl scale deployment/pgbouncer -n broxiva --replicas=3

# Update pool size
kubectl patch configmap pgbouncer-config -n broxiva \
  -p '{"data":{"default_pool_size":"50"}}'
```

## Redis Scaling

### Enable Cluster Mode

```bash
# Deploy Redis cluster
kubectl apply -f infrastructure/kubernetes/redis-cluster.yaml

# Verify cluster
kubectl exec -it redis-cluster-0 -n broxiva -- \
  redis-cli --cluster check redis-cluster-0:6379

# Update app configuration
kubectl set env deployment/broxiva-api -n broxiva \
  REDIS_CLUSTER_ENABLED=true
```

## Monitoring Post-Scale

```bash
# Monitor pod metrics
watch kubectl top pods -n broxiva

# Check HPA status
kubectl get hpa -n broxiva -w

# View scaling events
kubectl get events -n broxiva --sort-by='.lastTimestamp'
```

---

**Last Updated**: 2025-12-06
