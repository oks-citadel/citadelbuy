# CitadelBuy Staging Deployment - Quick Reference

One-page reference for common staging deployment tasks.

## Quick Deploy

```bash
# Automated deployment
./scripts/deploy-staging.sh

# With environment variables
SKIP_CONFIRMATION=true ./scripts/deploy-staging.sh
```

## Manual Deploy Steps

```bash
# 1. Build images
docker build -t ghcr.io/citadelplatforms/citadelbuy-api:staging-latest -f apps/api/Dockerfile apps/api
docker build -t ghcr.io/citadelplatforms/citadelbuy-web:staging-latest -f apps/web/Dockerfile apps/web

# 2. Push images
docker push ghcr.io/citadelplatforms/citadelbuy-api:staging-latest
docker push ghcr.io/citadelplatforms/citadelbuy-web:staging-latest

# 3. Deploy to Kubernetes
kubectl apply -k infrastructure/kubernetes/staging/

# 4. Update images
kubectl set image deployment/citadelbuy-api api=ghcr.io/citadelplatforms/citadelbuy-api:staging-latest -n citadelbuy-staging
kubectl set image deployment/citadelbuy-web web=ghcr.io/citadelplatforms/citadelbuy-web:staging-latest -n citadelbuy-staging

# 5. Run migrations
API_POD=$(kubectl get pods -n citadelbuy-staging -l app=citadelbuy-api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n citadelbuy-staging $API_POD -- npx prisma migrate deploy
```

## Smoke Tests

```bash
# Run all smoke tests
./scripts/smoke-tests.sh citadelbuy-staging

# View results
cat logs/smoke-tests-report-*.txt
```

## Common Commands

### Status Checks

```bash
# All resources
kubectl get all -n citadelbuy-staging

# Pod status
kubectl get pods -n citadelbuy-staging

# Service endpoints
kubectl get svc -n citadelbuy-staging

# Ingress
kubectl get ingress -n citadelbuy-staging
```

### Logs

```bash
# API logs (tail)
kubectl logs -n citadelbuy-staging deployment/citadelbuy-api --tail=50 -f

# Web logs (tail)
kubectl logs -n citadelbuy-staging deployment/citadelbuy-web --tail=50 -f

# Previous container logs
kubectl logs -n citadelbuy-staging <pod-name> --previous
```

### Resource Usage

```bash
# Pod resource usage
kubectl top pods -n citadelbuy-staging

# Node resource usage
kubectl top nodes
```

### Scaling

```bash
# Manual scale
kubectl scale deployment citadelbuy-api --replicas=3 -n citadelbuy-staging

# Check HPA status
kubectl get hpa -n citadelbuy-staging
```

### Rollback

```bash
# Quick rollback
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-staging

# View history
kubectl rollout history deployment/citadelbuy-api -n citadelbuy-staging

# Rollback to specific revision
kubectl rollout undo deployment/citadelbuy-api --to-revision=2 -n citadelbuy-staging
```

## Testing Endpoints

```bash
# Health checks
curl https://staging-api.citadelbuy.com/api/health
curl https://staging-api.citadelbuy.com/api/health/ready
curl https://staging-api.citadelbuy.com/api/health/detailed

# Products
curl https://staging-api.citadelbuy.com/api/products

# Web frontend
curl https://staging.citadelbuy.com
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n citadelbuy-staging
kubectl get events -n citadelbuy-staging --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Check database pod
kubectl get pods -n citadelbuy-staging -l app=postgres

# Test connection
kubectl exec -n citadelbuy-staging $API_POD -- \
  npx prisma db execute --stdin <<< "SELECT 1;"
```

### Image Pull Errors

```bash
# Verify image exists
docker pull ghcr.io/citadelplatforms/citadelbuy-api:staging-latest

# Check secret
kubectl get secret ghcr-secret -n citadelbuy-staging
```

## Quick Fixes

### Restart Deployment

```bash
kubectl rollout restart deployment/citadelbuy-api -n citadelbuy-staging
```

### Delete and Recreate Pod

```bash
kubectl delete pod <pod-name> -n citadelbuy-staging
```

### Update Config

```bash
kubectl apply -f infrastructure/kubernetes/staging/configmap.yaml
kubectl rollout restart deployment/citadelbuy-api -n citadelbuy-staging
```

## Environment URLs

- **Web**: https://staging.citadelbuy.com
- **API**: https://staging-api.citadelbuy.com
- **Health**: https://staging-api.citadelbuy.com/api/health

## Environment Variables

```bash
export REGISTRY="ghcr.io"
export IMAGE_NAME="citadelplatforms/citadelbuy"
export K8S_NAMESPACE="citadelbuy-staging"
export STAGING_API_URL="https://staging-api.citadelbuy.com"
export STAGING_WEB_URL="https://staging.citadelbuy.com"
```

## File Locations

- **Deployment Script**: `scripts/deploy-staging.sh`
- **Smoke Tests**: `scripts/smoke-tests.sh`
- **K8s Manifests**: `infrastructure/kubernetes/staging/`
- **Test Config**: `tests/smoke/smoke-config.json`
- **Documentation**: `docs/STAGING_DEPLOYMENT.md`

## CI/CD

### Trigger Deployment

```bash
# Via GitHub CLI
gh workflow run staging-deployment.yml

# Via git push
git push origin main
```

### View Workflow

```bash
gh run list --workflow=staging-deployment.yml
gh run view <run-id>
```

## Support

- **DevOps**: devops@citadelbuy.com
- **Slack**: #staging-deployments
- **Docs**: docs/STAGING_DEPLOYMENT.md
