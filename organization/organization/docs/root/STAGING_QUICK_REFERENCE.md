# Broxiva Staging Deployment - Quick Reference

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
docker build -t ghcr.io/broxivaplatforms/broxiva-api:staging-latest -f apps/api/Dockerfile apps/api
docker build -t ghcr.io/broxivaplatforms/broxiva-web:staging-latest -f apps/web/Dockerfile apps/web

# 2. Push images
docker push ghcr.io/broxivaplatforms/broxiva-api:staging-latest
docker push ghcr.io/broxivaplatforms/broxiva-web:staging-latest

# 3. Deploy to Kubernetes
kubectl apply -k infrastructure/kubernetes/staging/

# 4. Update images
kubectl set image deployment/broxiva-api api=ghcr.io/broxivaplatforms/broxiva-api:staging-latest -n broxiva-staging
kubectl set image deployment/broxiva-web web=ghcr.io/broxivaplatforms/broxiva-web:staging-latest -n broxiva-staging

# 5. Run migrations
API_POD=$(kubectl get pods -n broxiva-staging -l app=broxiva-api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n broxiva-staging $API_POD -- npx prisma migrate deploy
```

## Smoke Tests

```bash
# Run all smoke tests
./scripts/smoke-tests.sh broxiva-staging

# View results
cat logs/smoke-tests-report-*.txt
```

## Common Commands

### Status Checks

```bash
# All resources
kubectl get all -n broxiva-staging

# Pod status
kubectl get pods -n broxiva-staging

# Service endpoints
kubectl get svc -n broxiva-staging

# Ingress
kubectl get ingress -n broxiva-staging
```

### Logs

```bash
# API logs (tail)
kubectl logs -n broxiva-staging deployment/broxiva-api --tail=50 -f

# Web logs (tail)
kubectl logs -n broxiva-staging deployment/broxiva-web --tail=50 -f

# Previous container logs
kubectl logs -n broxiva-staging <pod-name> --previous
```

### Resource Usage

```bash
# Pod resource usage
kubectl top pods -n broxiva-staging

# Node resource usage
kubectl top nodes
```

### Scaling

```bash
# Manual scale
kubectl scale deployment broxiva-api --replicas=3 -n broxiva-staging

# Check HPA status
kubectl get hpa -n broxiva-staging
```

### Rollback

```bash
# Quick rollback
kubectl rollout undo deployment/broxiva-api -n broxiva-staging

# View history
kubectl rollout history deployment/broxiva-api -n broxiva-staging

# Rollback to specific revision
kubectl rollout undo deployment/broxiva-api --to-revision=2 -n broxiva-staging
```

## Testing Endpoints

```bash
# Health checks
curl https://staging-api.broxiva.com/api/health
curl https://staging-api.broxiva.com/api/health/ready
curl https://staging-api.broxiva.com/api/health/detailed

# Products
curl https://staging-api.broxiva.com/api/products

# Web frontend
curl https://staging.broxiva.com
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n broxiva-staging
kubectl get events -n broxiva-staging --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Check database pod
kubectl get pods -n broxiva-staging -l app=postgres

# Test connection
kubectl exec -n broxiva-staging $API_POD -- \
  npx prisma db execute --stdin <<< "SELECT 1;"
```

### Image Pull Errors

```bash
# Verify image exists
docker pull ghcr.io/broxivaplatforms/broxiva-api:staging-latest

# Check secret
kubectl get secret ghcr-secret -n broxiva-staging
```

## Quick Fixes

### Restart Deployment

```bash
kubectl rollout restart deployment/broxiva-api -n broxiva-staging
```

### Delete and Recreate Pod

```bash
kubectl delete pod <pod-name> -n broxiva-staging
```

### Update Config

```bash
kubectl apply -f infrastructure/kubernetes/staging/configmap.yaml
kubectl rollout restart deployment/broxiva-api -n broxiva-staging
```

## Environment URLs

- **Web**: https://staging.broxiva.com
- **API**: https://staging-api.broxiva.com
- **Health**: https://staging-api.broxiva.com/api/health

## Environment Variables

```bash
export REGISTRY="ghcr.io"
export IMAGE_NAME="broxivaplatforms/broxiva"
export K8S_NAMESPACE="broxiva-staging"
export STAGING_API_URL="https://staging-api.broxiva.com"
export STAGING_WEB_URL="https://staging.broxiva.com"
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

- **DevOps**: devops@broxiva.com
- **Slack**: #staging-deployments
- **Docs**: docs/STAGING_DEPLOYMENT.md
