# Broxiva Production - Quick Reference Card

One-page reference for common production operations.

## Environment Details

```
Cluster:    broxiva-aks-prod
Namespace:  broxiva-prod
ACR:        broxivaprodacr.azurecr.io
Region:     (Azure region)
```

## Quick Setup

```bash
# Run automated setup (PowerShell)
.\setup-production-secrets.ps1

# OR run automated setup (Bash)
./setup-production-secrets.sh
```

## Common Operations

### View Resources

```bash
# All resources
kubectl get all -n broxiva-prod

# Secrets (names only)
kubectl get secrets -n broxiva-prod

# ConfigMaps
kubectl get configmaps -n broxiva-prod

# Pods with status
kubectl get pods -n broxiva-prod -o wide

# Services
kubectl get svc -n broxiva-prod
```

### Secret Management

```bash
# View secret (no values shown)
kubectl describe secret broxiva-secrets -n broxiva-prod

# Get specific secret value
kubectl get secret broxiva-secrets -n broxiva-prod -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Update single secret value
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' \
  -p='[{"op":"replace","path":"/data/KEY_NAME","value":"'$(echo -n "NEW_VALUE" | base64)'"}]'

# Backup all secrets
kubectl get secrets -n broxiva-prod -o yaml > backup-$(date +%Y%m%d).yaml
```

### Deployment Operations

```bash
# Deploy/Update application
kubectl apply -f deployment.yaml

# Rolling restart
kubectl rollout restart deployment broxiva-api -n broxiva-prod

# Check rollout status
kubectl rollout status deployment broxiva-api -n broxiva-prod

# Rollback deployment
kubectl rollout undo deployment broxiva-api -n broxiva-prod

# Scale deployment
kubectl scale deployment broxiva-api -n broxiva-prod --replicas=5
```

### Logs and Debugging

```bash
# View logs (last 100 lines)
kubectl logs -n broxiva-prod deployment/broxiva-api --tail=100

# Follow logs
kubectl logs -n broxiva-prod deployment/broxiva-api -f

# Logs from all pods
kubectl logs -n broxiva-prod -l app=broxiva-api --all-containers=true

# Execute command in pod
kubectl exec -it POD_NAME -n broxiva-prod -- /bin/bash

# Port forward for local access
kubectl port-forward -n broxiva-prod svc/broxiva-api 8080:4000
```

### Health Checks

```bash
# Check pod health
kubectl get pods -n broxiva-prod

# Describe pod for events
kubectl describe pod POD_NAME -n broxiva-prod

# View pod resource usage
kubectl top pods -n broxiva-prod

# View node resource usage
kubectl top nodes
```

### Database Operations

```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n broxiva-prod -- psql -U broxiva -d broxiva_production

# Database backup
kubectl exec postgres-0 -n broxiva-prod -- \
  pg_dump -U broxiva broxiva_production > backup-$(date +%Y%m%d).sql

# Connect to Redis
kubectl exec -it redis-0 -n broxiva-prod -- redis-cli -a "$REDIS_PASSWORD"

# Redis ping test
kubectl exec -it redis-0 -n broxiva-prod -- redis-cli PING
```

### ACR Operations

```bash
# Login to ACR
az acr login --name broxivaprodacr

# List repositories
az acr repository list --name broxivaprodacr

# List tags
az acr repository show-tags --name broxivaprodacr --repository broxiva-api

# Check ACR integration
az aks check-acr --resource-group broxiva-rg --name broxiva-aks-prod --acr broxivaprodacr.azurecr.io
```

### Azure Key Vault

```bash
# Store secret
az keyvault secret set --vault-name broxiva-prod-kv --name SECRET_NAME --value "VALUE"

# Get secret
az keyvault secret show --vault-name broxiva-prod-kv --name SECRET_NAME --query value -o tsv

# List secrets
az keyvault secret list --vault-name broxiva-prod-kv
```

### Monitoring

```bash
# View events
kubectl get events -n broxiva-prod --sort-by='.lastTimestamp'

# Watch pod status
kubectl get pods -n broxiva-prod -w

# Resource quotas
kubectl describe quota -n broxiva-prod

# Limit ranges
kubectl describe limitrange -n broxiva-prod
```

## Update External API Keys

### Stripe

```bash
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' \
  -p='[{"op":"replace","path":"/data/STRIPE_SECRET_KEY","value":"'$(echo -n "sk_live_XXX" | base64)'"}]'

kubectl rollout restart deployment broxiva-api -n broxiva-prod
```

### SendGrid

```bash
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' \
  -p='[{"op":"replace","path":"/data/SENDGRID_API_KEY","value":"'$(echo -n "SG.XXX" | base64)'"}]'

kubectl rollout restart deployment broxiva-api -n broxiva-prod
```

### Sentry

```bash
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' \
  -p='[{"op":"replace","path":"/data/SENTRY_DSN","value":"'$(echo -n "https://XXX@sentry.io/XXX" | base64)'"}]'

kubectl rollout restart deployment broxiva-api -n broxiva-prod
```

## Emergency Procedures

### Rollback to Previous Version

```bash
kubectl rollout undo deployment broxiva-api -n broxiva-prod
kubectl rollout status deployment broxiva-api -n broxiva-prod
```

### Restore Secrets from Backup

```bash
kubectl apply -f backup-YYYYMMDD.yaml
kubectl rollout restart deployment broxiva-api -n broxiva-prod
kubectl rollout restart deployment broxiva-worker -n broxiva-prod
```

### Scale Down (Maintenance Mode)

```bash
kubectl scale deployment broxiva-api -n broxiva-prod --replicas=0
kubectl scale deployment broxiva-worker -n broxiva-prod --replicas=0
kubectl scale deployment broxiva-web -n broxiva-prod --replicas=1
```

### Scale Up (Resume Operations)

```bash
kubectl scale deployment broxiva-api -n broxiva-prod --replicas=3
kubectl scale deployment broxiva-worker -n broxiva-prod --replicas=2
kubectl scale deployment broxiva-web -n broxiva-prod --replicas=3
```

## Testing and Verification

### Test API Endpoint

```bash
# Health check
curl https://api.broxiva.com/health

# Detailed health
curl https://api.broxiva.com/health/ready

# Test authentication
curl -X POST https://api.broxiva.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Test Database Connection

```bash
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n broxiva-prod -- \
  psql postgresql://broxiva:PASSWORD@postgres.broxiva-prod.svc.cluster.local:5432/broxiva_production
```

### Test Redis Connection

```bash
kubectl run -it --rm debug --image=redis:7 --restart=Never -n broxiva-prod -- \
  redis-cli -h redis.broxiva-prod.svc.cluster.local -a PASSWORD PING
```

## Security Checks

### Verify RBAC Permissions

```bash
# Check if service account can get secrets
kubectl auth can-i get secrets \
  --as=system:serviceaccount:broxiva-prod:broxiva-api \
  -n broxiva-prod

# List all permissions for service account
kubectl auth can-i --list \
  --as=system:serviceaccount:broxiva-prod:broxiva-api \
  -n broxiva-prod
```

### Check Pod Security

```bash
# Describe pod security context
kubectl get pod POD_NAME -n broxiva-prod -o jsonpath='{.spec.securityContext}'

# Check for privileged containers
kubectl get pods -n broxiva-prod -o json | \
  jq '.items[] | select(.spec.containers[].securityContext.privileged==true) | .metadata.name'
```

## Performance Tuning

### View Resource Usage

```bash
# Current usage
kubectl top pods -n broxiva-prod

# Historical metrics (requires metrics-server)
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/broxiva-prod/pods
```

### Adjust HPA (Horizontal Pod Autoscaler)

```bash
# Create HPA
kubectl autoscale deployment broxiva-api -n broxiva-prod \
  --cpu-percent=70 --min=2 --max=10

# View HPA status
kubectl get hpa -n broxiva-prod

# Describe HPA
kubectl describe hpa broxiva-api -n broxiva-prod
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias kp='kubectl -n broxiva-prod'
alias kpg='kubectl -n broxiva-prod get'
alias kpd='kubectl -n broxiva-prod describe'
alias kpl='kubectl -n broxiva-prod logs'
alias kpe='kubectl -n broxiva-prod exec -it'
alias kpa='kubectl -n broxiva-prod apply -f'
alias kpdel='kubectl -n broxiva-prod delete'

# Usage examples:
# kpg pods
# kpl deployment/broxiva-api --tail=100
# kpe POD_NAME -- bash
```

## Contact Information

- **Platform Team**: devops@broxiva.com
- **Security Team**: security@broxiva.com
- **On-Call**: PagerDuty
- **Documentation**: https://docs.broxiva.com/infrastructure

## Documentation Links

- Setup Guide: `PRODUCTION-SETUP.md`
- Secret Rotation: `SECRET-ROTATION-GUIDE.md`
- Deployment Status: `DEPLOYMENT-STATUS.md`
- This Reference: `QUICK-REFERENCE.md`

---

**Version**: 1.0
**Last Updated**: 2025-12-14
