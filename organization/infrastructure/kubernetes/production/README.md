# CitadelBuy Production Kubernetes Manifests

This directory contains the production Kubernetes manifests for the CitadelBuy e-commerce platform.

## Overview

The production environment is configured for high availability, scalability, and security. It includes:

- **API Service**: 5 replicas (scales 5-20)
- **Web Frontend**: 5 replicas (scales 5-15)
- **Background Workers**: 15 total replicas across 5 worker types
- **Auto-scaling**: HPA configured for all services
- **Security**: Pod Security Standards, Network Policies, RBAC
- **Monitoring**: Prometheus metrics, health checks
- **High Availability**: Anti-affinity rules, Pod Disruption Budgets

## Directory Structure

```
production/
├── api-deployment.yaml        # API backend deployment and service
├── web-deployment.yaml        # Next.js frontend deployment and service
├── worker-deployment.yaml     # Background job workers
├── ingress.yaml              # Ingress rules with TLS and security
├── hpa.yaml                  # Horizontal Pod Autoscalers
├── configmap.yaml            # Production configuration
├── namespace.yaml            # Namespace with quotas and limits
├── kustomization.yaml        # Kustomize configuration
├── kustomizeconfig.yaml      # Kustomize behavior configuration
└── README.md                 # This file
```

## Prerequisites

Before deploying to production:

1. **Kubernetes Cluster**: v1.24+
2. **kubectl**: Configured with production cluster access
3. **Kustomize**: v4.5+ (or kubectl with built-in kustomize)
4. **Secrets Management**: External Secrets Operator or Sealed Secrets
5. **Ingress Controller**: NGINX Ingress Controller
6. **Cert Manager**: For TLS certificate management
7. **Metrics Server**: For HPA functionality
8. **Container Registry**: Access to ghcr.io/citadelplatforms

## Environment Variables & Secrets

### Required Secrets

Create these secrets before deployment:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/citadelbuy_production

# Redis
REDIS_PASSWORD=<secure-password>

# JWT
JWT_SECRET=<secure-secret>
JWT_REFRESH_SECRET=<secure-secret>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=<client-id>
PAYPAL_CLIENT_SECRET=<client-secret>

# SendGrid
SENDGRID_API_KEY=SG...

# AWS
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=<auth-token>
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### Secret Management Options

#### Option 1: External Secrets Operator (Recommended)

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create SecretStore
kubectl apply -f ../base/external-secrets-enhanced.yaml
```

#### Option 2: Sealed Secrets

```bash
# Install Sealed Secrets
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal your secrets
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
kubectl apply -f sealed-secret.yaml
```

#### Option 3: Manual Secret Creation (Development Only)

```bash
kubectl create secret generic citadelbuy-secrets \
  --from-literal=DATABASE_URL=<url> \
  --from-literal=REDIS_PASSWORD=<password> \
  --from-literal=JWT_SECRET=<secret> \
  --from-literal=STRIPE_SECRET_KEY=<key> \
  -n citadelbuy-production
```

## Deployment

### 1. Update Configuration

Edit `configmap.yaml` to match your production environment:

```yaml
# Update these values
NEXT_PUBLIC_API_URL: "https://api.citadelbuy.com"
CORS_ORIGIN: "https://citadelbuy.com,https://www.citadelbuy.com"
AWS_REGION: "us-east-1"
AWS_S3_BUCKET: "citadelbuy-production-assets"
```

### 2. Deploy with Kustomize

```bash
# Preview what will be deployed
kubectl kustomize . | less

# Apply the manifests
kubectl apply -k .

# Or use kubectl directly
kubectl apply -k organization/infrastructure/kubernetes/production/
```

### 3. Verify Deployment

```bash
# Check namespace
kubectl get ns citadelbuy-production

# Check all resources
kubectl get all -n citadelbuy-production

# Check pods status
kubectl get pods -n citadelbuy-production -w

# Check HPA status
kubectl get hpa -n citadelbuy-production

# Check ingress
kubectl get ingress -n citadelbuy-production

# Check PDB
kubectl get pdb -n citadelbuy-production
```

### 4. Verify Health

```bash
# API health check
curl https://api.citadelbuy.com/api/health

# Web health check
curl https://citadelbuy.com/api/health

# Check logs
kubectl logs -n citadelbuy-production -l app=citadelbuy-api --tail=100
kubectl logs -n citadelbuy-production -l app=citadelbuy-web --tail=100
```

## Scaling

### Manual Scaling

```bash
# Scale API
kubectl scale deployment citadelbuy-api -n citadelbuy-production --replicas=10

# Scale workers
kubectl scale deployment order-processing-worker -n citadelbuy-production --replicas=8
```

### HPA Configuration

The HPA is configured to scale based on:
- CPU utilization (70%)
- Memory utilization (80%)
- Custom metrics (requests per second)

Modify `hpa.yaml` to adjust scaling parameters.

## High Availability

### Anti-Affinity

Pods are distributed across:
- Different nodes (preferredDuringSchedulingIgnoredDuringExecution)
- Different availability zones (topologyKey: topology.kubernetes.io/zone)

### Pod Disruption Budgets

PDBs ensure minimum availability during:
- Node maintenance
- Cluster upgrades
- Voluntary disruptions

Current PDBs:
- API: minAvailable 3
- Web: minAvailable 3
- Order Processing Worker: minAvailable 3

### Topology Spread Constraints

Ensures even distribution across zones and nodes.

## Security

### Pod Security

- **runAsNonRoot**: true
- **readOnlyRootFilesystem**: true
- **seccompProfile**: RuntimeDefault
- **capabilities**: Dropped ALL

### Network Policies

- Ingress: Allow only from ingress controller
- Egress: Allow only to required services
- Pod-to-pod: Restricted communication

### Secrets Management

- Use External Secrets Operator or Sealed Secrets
- Never commit plain secrets to git
- Rotate secrets regularly (90 days)

### TLS/SSL

- All external traffic uses TLS
- Certificates managed by cert-manager
- HSTS headers enabled

## Monitoring & Observability

### Prometheus Metrics

Endpoints exposed:
- API: `:9090/metrics`
- Web: `:3000/api/metrics`
- Workers: `:9090/metrics`

### Health Checks

Three types of probes configured:
1. **Liveness**: Restarts unhealthy pods
2. **Readiness**: Removes pod from service when not ready
3. **Startup**: Protects slow-starting containers

### Logging

- Structured JSON logs
- Retention: 90 days
- Aggregated via FluentD/Fluentbit (if configured)

### Sentry Integration

Error tracking configured for:
- API backend
- Web frontend
- Background workers

## Backup & Disaster Recovery

### Database Backups

```bash
# Create manual backup
kubectl exec -n citadelbuy-production postgres-0 -- pg_dump -U citadelbuy citadelbuy_production > backup.sql

# Automated backups via CronJob (recommended)
kubectl apply -f ../base/backup-cronjob.yaml
```

### Redis Persistence

- AOF (Append Only File): Enabled
- RDB Snapshots: Configured
- Volume: PersistentVolumeClaim with backup

### Disaster Recovery Plan

See: `../../docs/DISASTER_RECOVERY.md`

## Rollback

### Rollback Deployment

```bash
# Check deployment history
kubectl rollout history deployment citadelbuy-api -n citadelbuy-production

# Rollback to previous version
kubectl rollout undo deployment citadelbuy-api -n citadelbuy-production

# Rollback to specific revision
kubectl rollout undo deployment citadelbuy-api -n citadelbuy-production --to-revision=2
```

### Rollback All Services

```bash
# API
kubectl rollout undo deployment citadelbuy-api -n citadelbuy-production

# Web
kubectl rollout undo deployment citadelbuy-web -n citadelbuy-production

# Workers
kubectl rollout undo deployment email-worker -n citadelbuy-production
kubectl rollout undo deployment order-processing-worker -n citadelbuy-production
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n citadelbuy-production

# Check events
kubectl get events -n citadelbuy-production --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n citadelbuy-production --previous
```

### High Memory/CPU Usage

```bash
# Check resource usage
kubectl top pods -n citadelbuy-production

# Check HPA status
kubectl describe hpa citadelbuy-api-hpa -n citadelbuy-production

# Increase resources if needed
kubectl edit deployment citadelbuy-api -n citadelbuy-production
```

### Ingress Issues

```bash
# Check ingress
kubectl describe ingress citadelbuy-api-ingress -n citadelbuy-production

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Test SSL certificate
curl -vI https://api.citadelbuy.com
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n citadelbuy-production -- psql $DATABASE_URL

# Check database logs
kubectl logs postgres-0 -n citadelbuy-production
```

## Performance Tuning

### Database

- Connection pooling: 20-100 connections
- Query optimization: Use EXPLAIN ANALYZE
- Indexes: Verify all critical queries use indexes
- Vacuum: Regular maintenance

### Redis

- Maxmemory: 4GB
- Eviction policy: allkeys-lru
- Persistence: AOF + RDB

### Application

- Connection keep-alive: Enabled
- Gzip compression: Enabled
- CDN: CloudFront for static assets
- Caching: Redis for sessions, queries

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error rates in Sentry
- Check pod health and restarts
- Review resource utilization

**Weekly**:
- Review HPA metrics and adjust if needed
- Check for failed jobs/workers
- Review security alerts

**Monthly**:
- Database maintenance (vacuum, analyze)
- Review and update dependencies
- Security patches and updates
- Certificate renewal check

**Quarterly**:
- Rotate secrets and credentials
- Disaster recovery drill
- Performance review and optimization
- Cost optimization review

### Upgrade Procedure

1. Test in staging environment
2. Create backup
3. Update image tags in kustomization.yaml
4. Apply with rolling update
5. Monitor rollout
6. Verify health checks
7. Roll back if issues occur

## Cost Optimization

### Resource Requests & Limits

- Set appropriate requests (scheduling)
- Set limits to prevent resource exhaustion
- Use HPA for dynamic scaling
- Right-size based on actual usage

### Storage

- Use appropriate storage classes
- Clean up unused PVCs
- Compress logs and backups
- Set retention policies

### Network

- Use CDN for static assets
- Enable caching where appropriate
- Use ClusterIP instead of LoadBalancer when possible

## Support

- **Documentation**: https://docs.citadelbuy.com
- **DevOps Team**: devops@citadelbuy.com
- **Incident Response**: oncall@citadelbuy.com
- **Slack**: #platform-ops

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Cert Manager](https://cert-manager.io/)
- [External Secrets Operator](https://external-secrets.io/)
- [Production Best Practices](../../docs/PRODUCTION_DEPLOYMENT_GUIDE.md)

---

**Last Updated**: 2024-12-04
**Version**: 1.0.0
**Maintained By**: Platform Team
