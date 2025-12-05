# CitadelBuy Kubernetes Infrastructure

Complete Kubernetes infrastructure setup for CitadelBuy e-commerce platform with monitoring, high availability, and auto-scaling.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Components](#components)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)
- [Production Checklist](#production-checklist)

## Overview

This infrastructure provides:

- **High Availability**: Multiple replicas for all services
- **Auto-scaling**: HPA configured for API and web services
- **Monitoring**: Prometheus + Grafana with comprehensive dashboards
- **Health Checks**: Liveness and readiness probes for all services
- **Rate Limiting**: Production-grade rate limiting with configurable rules
- **Security**: Network policies, secrets management, and RBAC
- **Observability**: Metrics, logs, and distributed tracing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Ingress                              │
│                    (Load Balancer)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
┌───────▼──────────┐      ┌─────────▼──────────┐
│   Web Frontend   │      │    API Backend     │
│   (Next.js)      │      │    (NestJS)        │
│   Replicas: 3-20 │      │    Replicas: 3-10  │
└───────┬──────────┘      └─────────┬──────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│   PostgreSQL   │  │     Redis       │  │ Elasticsearch   │
│   (Primary)    │  │    (Cache)      │  │   (Search)      │
└────────────────┘  └─────────────────┘  └─────────────────┘
        │                   │                     │
        └───────────────────┴─────────────────────┘
                            │
                ┌───────────▼───────────┐
                │   Monitoring Stack    │
                │  (Prometheus+Grafana) │
                └───────────────────────┘
```

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm 3.x (optional, for easier deployments)
- Docker registry access
- Domain name with DNS configured

### Required Resources

**Minimum Cluster Resources:**
- 4 vCPUs
- 16 GB RAM
- 100 GB Storage

**Recommended Production Resources:**
- 8+ vCPUs
- 32+ GB RAM
- 500+ GB Storage

## Quick Start

### 1. Clone and Navigate

```bash
cd infrastructure/kubernetes
```

### 2. Create Namespaces

```bash
kubectl apply -f base/namespace.yaml
```

### 3. Set up Secrets

Create a secrets file (do not commit this):

```bash
# Copy the example
cp base/secrets.example.yaml base/secrets.yaml

# Edit with your actual values
vim base/secrets.yaml
```

Required secrets:
- `DATABASE_PASSWORD`
- `REDIS_PASSWORD`
- `ELASTICSEARCH_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- API keys for third-party services

Apply secrets:

```bash
kubectl apply -f base/secrets.yaml
```

### 4. Deploy ConfigMaps

```bash
kubectl apply -f base/configmap.yaml
```

### 5. Deploy Data Layer

```bash
# PostgreSQL
kubectl apply -f base/postgres-deployment.yaml

# Redis
kubectl apply -f base/redis-deployment.yaml

# Elasticsearch
kubectl apply -f base/elasticsearch-deployment.yaml
```

Wait for all pods to be ready:

```bash
kubectl wait --for=condition=ready pod -l tier=database -n citadelbuy --timeout=300s
kubectl wait --for=condition=ready pod -l tier=cache -n citadelbuy --timeout=300s
kubectl wait --for=condition=ready pod -l tier=search -n citadelbuy --timeout=300s
```

### 6. Deploy Application Layer

```bash
# API Backend
kubectl apply -f apps/api-deployment.yaml

# Web Frontend
kubectl apply -f apps/web-deployment.yaml
```

### 7. Deploy Monitoring

```bash
kubectl apply -f monitoring/prometheus-deployment.yaml
kubectl apply -f monitoring/prometheus-alerts.yaml
kubectl apply -f monitoring/grafana-deployment.yaml
```

### 8. Verify Deployment

```bash
# Check all pods
kubectl get pods -n citadelbuy
kubectl get pods -n citadelbuy-monitoring

# Check services
kubectl get svc -n citadelbuy
kubectl get svc -n citadelbuy-monitoring

# Check HPA
kubectl get hpa -n citadelbuy
```

## Components

### Application Components

#### 1. API Backend (NestJS)
- **Path**: `apps/api-deployment.yaml`
- **Replicas**: 3-10 (auto-scaling)
- **Resources**:
  - Requests: 250m CPU, 256Mi RAM
  - Limits: 500m CPU, 512Mi RAM
- **Health Checks**:
  - Liveness: `/health/live`
  - Readiness: `/health/ready`
- **Metrics**: Exposed on `/metrics`

#### 2. Web Frontend (Next.js)
- **Path**: `apps/web-deployment.yaml`
- **Replicas**: 3-20 (auto-scaling)
- **Resources**:
  - Requests: 200m CPU, 256Mi RAM
  - Limits: 400m CPU, 512Mi RAM
- **Health Checks**:
  - Liveness: `/api/health`
  - Readiness: `/api/health`

### Data Layer

#### 1. PostgreSQL
- **Path**: `base/postgres-deployment.yaml`
- **Type**: StatefulSet
- **Storage**: 20Gi PVC
- **Resources**:
  - Requests: 500m CPU, 512Mi RAM
  - Limits: 2000m CPU, 2Gi RAM
- **Backup**: Automated daily backups recommended
- **Exporter**: Prometheus PostgreSQL Exporter on port 9187

#### 2. Redis
- **Path**: `base/redis-deployment.yaml`
- **Type**: StatefulSet
- **Storage**: 10Gi PVC
- **Resources**:
  - Requests: 250m CPU, 512Mi RAM
  - Limits: 1000m CPU, 2Gi RAM
- **Configuration**:
  - Max Memory: 1GB
  - Eviction Policy: allkeys-lru
  - AOF: Enabled
- **Exporter**: Prometheus Redis Exporter on port 9121

#### 3. Elasticsearch
- **Path**: `base/elasticsearch-deployment.yaml`
- **Type**: StatefulSet
- **Storage**: 30Gi PVC
- **Resources**:
  - Requests: 1000m CPU, 2Gi RAM
  - Limits: 2000m CPU, 4Gi RAM
- **JVM Heap**: 1GB (configured via ES_JAVA_OPTS)
- **Exporter**: Prometheus Elasticsearch Exporter on port 9114

### Monitoring Stack

#### 1. Prometheus
- **Path**: `monitoring/prometheus-deployment.yaml`
- **Storage**: 50Gi PVC
- **Retention**: 30 days
- **Scrape Interval**: 15s
- **Targets**:
  - Kubernetes API Server
  - Kubernetes Nodes
  - Application Pods
  - Database Exporters
  - Redis Exporter
  - Elasticsearch Exporter

#### 2. Grafana
- **Path**: `monitoring/grafana-deployment.yaml`
- **Storage**: 10Gi PVC
- **Dashboards**:
  - API Metrics Dashboard
  - Database Metrics Dashboard
  - Infrastructure Overview
- **Default Credentials**: admin/changeme (change in production!)

#### 3. Alert Rules
- **Path**: `monitoring/prometheus-alerts.yaml`
- **Alert Categories**:
  - Service Availability
  - API Performance
  - Resource Usage
  - Database Health
  - Redis Health
  - Elasticsearch Health
  - Container Health
  - Kubernetes Health

## Deployment

### Using kubectl

```bash
# Deploy everything
kubectl apply -f base/
kubectl apply -f apps/
kubectl apply -f monitoring/
```

### Using Kustomize

```bash
# Development
kubectl apply -k overlays/development

# Production
kubectl apply -k overlays/production
```

### Rolling Updates

```bash
# Update API image
kubectl set image deployment/citadelbuy-api api=citadelplatforms/citadelbuy-ecommerce:backend-v2.0.0 -n citadelbuy

# Check rollout status
kubectl rollout status deployment/citadelbuy-api -n citadelbuy

# Rollback if needed
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy
```

### Database Migrations

```bash
# Run migrations
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- npm run migration:run

# Or use a Job
kubectl apply -f jobs/migration-job.yaml
```

## Monitoring

### Access Grafana

```bash
# Port forward
kubectl port-forward svc/grafana -n citadelbuy-monitoring 3000:3000

# Open browser
open http://localhost:3000
```

### Access Prometheus

```bash
# Port forward
kubectl port-forward svc/prometheus -n citadelbuy-monitoring 9090:9090

# Open browser
open http://localhost:9090
```

### Key Metrics to Monitor

1. **API Performance**:
   - Request rate
   - Error rate (5xx)
   - Response time (p50, p95, p99)
   - Active connections

2. **Database**:
   - Connection count
   - Query duration
   - Deadlocks
   - Replication lag

3. **Redis**:
   - Memory usage
   - Cache hit rate
   - Operations per second
   - Evicted keys

4. **Elasticsearch**:
   - Cluster health
   - Index rate
   - Query rate
   - JVM memory

5. **Infrastructure**:
   - CPU usage
   - Memory usage
   - Disk usage
   - Network I/O

### Alerts

Configure Alertmanager to receive alerts:

```yaml
# Example alertmanager config
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK'
        channel: '#alerts'

  - name: 'email'
    email_configs:
      - to: 'ops@citadelbuy.com'
        from: 'alerts@citadelbuy.com'
```

## Scaling

### Manual Scaling

```bash
# Scale API
kubectl scale deployment citadelbuy-api --replicas=5 -n citadelbuy

# Scale Web
kubectl scale deployment citadelbuy-web --replicas=10 -n citadelbuy
```

### Auto-scaling (HPA)

The HPA is configured to scale based on:
- CPU utilization (70% target)
- Memory utilization (80% target)

```bash
# Check HPA status
kubectl get hpa -n citadelbuy

# Describe HPA
kubectl describe hpa citadelbuy-api-hpa -n citadelbuy
```

### Vertical Scaling

To increase resources:

1. Edit deployment:
```bash
kubectl edit deployment citadelbuy-api -n citadelbuy
```

2. Update resource limits:
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Rate Limiting

### Configuration

Rate limiting is configured in `base/configmap.yaml`:

```yaml
# Global rate limit
RATE_LIMIT_TTL: "60000"  # 1 minute
RATE_LIMIT_MAX_REQUESTS: "100"

# Sensitive endpoints
RATE_LIMIT_AUTH_MAX: "10"
RATE_LIMIT_PAYMENT_MAX: "20"
```

### Rate Limit Tiers

1. **Public Endpoints**: 300 req/min
2. **API Endpoints**: 100 req/min
3. **Search Endpoints**: 200 req/min
4. **Auth Endpoints**: 10 req/min
5. **Payment/Banking**: 20 req/min

Authenticated users get 50% more requests.

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n citadelbuy

# Check logs
kubectl logs <pod-name> -n citadelbuy

# Check events
kubectl get events -n citadelbuy --sort-by='.lastTimestamp'
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- psql -h postgres -U citadelbuy -d citadelbuy

# Check database logs
kubectl logs statefulset/postgres -n citadelbuy
```

#### 3. Redis Connection Issues

```bash
# Test Redis connectivity
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- redis-cli -h redis ping

# Check Redis logs
kubectl logs statefulset/redis -n citadelbuy
```

#### 4. High Memory Usage

```bash
# Check memory usage
kubectl top pods -n citadelbuy

# Check for memory leaks
kubectl logs <pod-name> -n citadelbuy | grep "memory"

# Increase resource limits if needed
```

#### 5. Slow API Response

```bash
# Check Prometheus metrics
# Look at API response time dashboard in Grafana

# Check database query performance
kubectl exec -it statefulset/postgres -n citadelbuy -- psql -U citadelbuy -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n citadelbuy

# Get resource usage
kubectl top nodes
kubectl top pods -n citadelbuy

# Shell into pod
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- /bin/sh

# Port forward for debugging
kubectl port-forward deployment/citadelbuy-api -n citadelbuy 3000:3000

# View logs (last hour)
kubectl logs deployment/citadelbuy-api -n citadelbuy --since=1h

# Follow logs
kubectl logs -f deployment/citadelbuy-api -n citadelbuy
```

## Production Checklist

### Before Production Deployment

- [ ] Update all secrets in `base/secrets.yaml`
- [ ] Change Grafana admin password
- [ ] Configure backup solution for PostgreSQL
- [ ] Set up external DNS
- [ ] Configure SSL/TLS certificates
- [ ] Set up log aggregation (ELK/Loki)
- [ ] Configure Alertmanager
- [ ] Set up monitoring alerts
- [ ] Configure network policies
- [ ] Review and adjust resource limits
- [ ] Set up CI/CD pipeline
- [ ] Configure automated backups
- [ ] Test disaster recovery procedures
- [ ] Set up monitoring dashboards
- [ ] Configure rate limiting rules
- [ ] Review security policies
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure CDN
- [ ] Test auto-scaling
- [ ] Load test the application
- [ ] Document runbooks

### Security Hardening

1. **Enable Network Policies**:
```bash
kubectl apply -f base/networking/network-policies.yaml
```

2. **Enable Pod Security Policies**:
```bash
kubectl apply -f base/rbac/pod-security-policies.yaml
```

3. **Rotate Secrets Regularly**:
```bash
# Use a secret management solution like Sealed Secrets or External Secrets
```

4. **Enable Audit Logging**:
```bash
# Configure Kubernetes audit logging
```

### Backup and Recovery

1. **Database Backups**:
```bash
# Set up automated daily backups
kubectl apply -f jobs/postgres-backup-cronjob.yaml
```

2. **Volume Snapshots**:
```bash
# Take snapshots of PVCs
kubectl apply -f backup/volume-snapshot.yaml
```

3. **Disaster Recovery Test**:
```bash
# Regularly test restoration procedures
```

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## Support

For issues and questions:
- Create an issue in the repository
- Contact the DevOps team
- Check the troubleshooting guide above

## License

Copyright (c) 2025 CitadelBuy. All rights reserved.
