# Broxiva Staging Environment - Kubernetes Configuration

This directory contains Kubernetes manifests for the Broxiva staging environment.

## Overview

The staging environment is designed to mirror production as closely as possible while allowing for testing and validation before production deployment.

## Architecture

```
┌─────────────────────────────────────────────┐
│         Ingress (nginx-ingress)             │
│    staging.broxiva.com                   │
│    staging-api.broxiva.com               │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
┌───▼────────┐    ┌──────▼─────┐
│    Web     │    │    API     │
│ (Next.js)  │    │ (NestJS)   │
│ 2 replicas │    │ 2 replicas │
└───┬────────┘    └──────┬─────┘
    │                    │
    └──────────┬─────────┘
               │
    ┌──────────┴────────┐
    │                   │
┌───▼─────┐      ┌──────▼────┐
│Postgres │      │   Redis   │
│  (1)    │      │    (1)    │
└─────────┘      └───────────┘
```

## Files

- **namespace.yaml** - Namespace, resource quotas, and limits
- **configmap.yaml** - Application configuration and environment variables
- **postgres-deployment.yaml** - PostgreSQL database StatefulSet and Service
- **redis-deployment.yaml** - Redis cache StatefulSet and Service
- **api-deployment.yaml** - API backend Deployment and Service
- **web-deployment.yaml** - Web frontend Deployment and Service
- **ingress.yaml** - Ingress resources for external access
- **hpa.yaml** - Horizontal Pod Autoscalers for API and Web
- **kustomization.yaml** - Kustomize configuration for simplified deployment

## Quick Start

### Prerequisites

1. kubectl configured with staging cluster access
2. Secrets created in the cluster
3. Docker images built and pushed to registry

### Deploy Everything

```bash
# Using kubectl
kubectl apply -f .

# Or using kustomize
kubectl apply -k .
```

### Deploy Specific Components

```bash
# Deploy database layer
kubectl apply -f postgres-deployment.yaml
kubectl apply -f redis-deployment.yaml

# Deploy application layer
kubectl apply -f api-deployment.yaml
kubectl apply -f web-deployment.yaml

# Deploy networking
kubectl apply -f ingress.yaml
```

## Configuration

### Environment Variables

Key environment variables are defined in `configmap.yaml`:

- `NODE_ENV`: staging
- `NEXT_PUBLIC_API_URL`: https://staging-api.broxiva.com
- `CORS_ORIGIN`: https://staging.broxiva.com

### Secrets

Required secrets (must be created separately):

```yaml
broxiva-secrets:
  - DATABASE_URL
  - POSTGRES_PASSWORD
  - JWT_SECRET
  - JWT_REFRESH_SECRET
  - STRIPE_SECRET_KEY
  - SENDGRID_API_KEY
```

Create secrets:

```bash
kubectl create secret generic broxiva-secrets \
  --namespace=broxiva-staging \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=POSTGRES_PASSWORD="..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=JWT_REFRESH_SECRET="..." \
  --from-literal=STRIPE_SECRET_KEY="..." \
  --from-literal=SENDGRID_API_KEY="..."
```

## Resource Allocation

### API Backend

- Requests: 250m CPU, 512Mi memory
- Limits: 1000m CPU, 1Gi memory
- Replicas: 2-5 (with HPA)

### Web Frontend

- Requests: 100m CPU, 256Mi memory
- Limits: 500m CPU, 512Mi memory
- Replicas: 2-4 (with HPA)

### PostgreSQL

- Requests: 250m CPU, 256Mi memory
- Limits: 1000m CPU, 1Gi memory
- Storage: 10Gi

### Redis

- Requests: 100m CPU, 128Mi memory
- Limits: 500m CPU, 256Mi memory
- Storage: 5Gi

## Scaling

### Horizontal Pod Autoscaling

HPA is configured for both API and Web deployments:

- Scale based on CPU (70%) and Memory (80%) utilization
- API: 2-5 replicas
- Web: 2-4 replicas

### Manual Scaling

```bash
# Scale API
kubectl scale deployment broxiva-api --replicas=3 -n broxiva-staging

# Scale Web
kubectl scale deployment broxiva-web --replicas=3 -n broxiva-staging
```

## Networking

### Ingress

Two ingress resources are configured:

1. **API Ingress** - `staging-api.broxiva.com`
   - Routes to broxiva-api service
   - TLS enabled
   - CORS configured

2. **Web Ingress** - `staging.broxiva.com`
   - Routes to broxiva-web service
   - TLS enabled

### Network Policies

Network policies are in place to:
- Allow ingress from nginx-ingress namespace
- Restrict pod-to-pod communication

## Storage

### Persistent Volumes

- **PostgreSQL**: 10Gi persistent volume
- **Redis**: 5Gi persistent volume

Storage class: `standard` (can be changed in PVC manifests)

## Health Checks

### API Service

- **Liveness**: `/api/health/live` - Checks if service is alive
- **Readiness**: `/api/health/ready` - Checks if service can handle traffic
- **Startup**: `/api/health/live` - Gives service time to start up

### Web Service

- **Liveness**: `/api/health` - Basic health check
- **Readiness**: `/api/health` - Checks if frontend is ready
- **Startup**: `/api/health` - Initial startup probe

## Monitoring

### Prometheus Metrics

API service exposes metrics at `/metrics`:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "4000"
  prometheus.io/path: "/metrics"
```

### Recommended Dashboards

- Pod resource usage
- HTTP request rates and latencies
- Database connection pool metrics
- Cache hit rates

## Security

### Pod Security

- `runAsNonRoot: true`
- `readOnlyRootFilesystem: true` (where possible)
- Drop all capabilities
- SeccompProfile: RuntimeDefault

### Network Security

- Network policies restrict traffic
- Ingress uses TLS
- Security headers configured

### Secrets Management

- Secrets stored in Kubernetes secrets
- Never commit secrets to Git
- Rotate secrets regularly

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n broxiva-staging
kubectl describe pod <pod-name> -n broxiva-staging
```

### View Logs

```bash
# API logs
kubectl logs -n broxiva-staging deployment/broxiva-api --tail=100 -f

# Web logs
kubectl logs -n broxiva-staging deployment/broxiva-web --tail=100 -f

# Database logs
kubectl logs -n broxiva-staging statefulset/postgres --tail=100 -f
```

### Check Resources

```bash
# Resource usage
kubectl top pods -n broxiva-staging
kubectl top nodes

# Events
kubectl get events -n broxiva-staging --sort-by='.lastTimestamp'
```

### Common Issues

#### ImagePullBackOff

```bash
# Check image exists
docker pull ghcr.io/broxivaplatforms/broxiva-api:staging-latest

# Verify image pull secret
kubectl get secret ghcr-secret -n broxiva-staging
```

#### CrashLoopBackOff

```bash
# Check logs for errors
kubectl logs -n broxiva-staging <pod-name> --previous

# Check environment variables
kubectl exec -n broxiva-staging <pod-name> -- env
```

#### Pending Pods

```bash
# Check events
kubectl describe pod <pod-name> -n broxiva-staging

# Check resource quotas
kubectl describe resourcequota -n broxiva-staging
```

## Maintenance

### Update Images

```bash
# Update API image
kubectl set image deployment/broxiva-api \
  api=ghcr.io/broxivaplatforms/broxiva-api:staging-abc123 \
  -n broxiva-staging

# Update Web image
kubectl set image deployment/broxiva-web \
  web=ghcr.io/broxivaplatforms/broxiva-web:staging-abc123 \
  -n broxiva-staging
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/broxiva-api -n broxiva-staging

# Rollback to previous version
kubectl rollout undo deployment/broxiva-api -n broxiva-staging
```

### Database Backup

```bash
# Create backup
API_POD=$(kubectl get pods -n broxiva-staging -l app=broxiva-api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n broxiva-staging $API_POD -- \
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## CI/CD Integration

This staging environment is automatically deployed via GitHub Actions:

- **Workflow**: `.github/workflows/staging-deployment.yml`
- **Trigger**: Push to `main` or `develop` branch
- **Process**: Build → Test → Deploy → Smoke Tests

## Related Documentation

- [Staging Deployment Guide](../../../docs/STAGING_DEPLOYMENT.md)
- [Smoke Tests Documentation](../../../tests/smoke/README.md)
- [Production Deployment Checklist](../../../docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)

## Support

For issues or questions:
- DevOps Team: devops@broxiva.com
- Slack: #staging-support
- Documentation: https://docs.broxiva.com
