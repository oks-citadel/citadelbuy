# Broxiva Production - Quick Reference Card

One-page reference for common production operations.

## Environment Details

```
Cluster:    broxiva-production-eks
Namespace:  broxiva-productionuction
ECR:        ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
Region:     us-east-1
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
kubectl get all -n broxiva-production

# Secrets (names only)
kubectl get secrets -n broxiva-production

# ConfigMaps
kubectl get configmaps -n broxiva-production

# Pods with status
kubectl get pods -n broxiva-production -o wide

# Services
kubectl get svc -n broxiva-production
```

### Secret Management

```bash
# View secret (no values shown)
kubectl describe secret broxiva-secrets -n broxiva-production

# Get specific secret value
kubectl get secret broxiva-secrets -n broxiva-production -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Update single secret value
kubectl patch secret broxiva-secrets -n broxiva-production \
  --type='json' \
  -p='[{"op":"replace","path":"/data/KEY_NAME","value":"'$(echo -n "NEW_VALUE" | base64)'"}]'

# Backup all secrets
kubectl get secrets -n broxiva-production -o yaml > backup-$(date +%Y%m%d).yaml
```

### Deployment Operations

```bash
# Deploy/Update application
kubectl apply -f deployment.yaml

# Rolling restart
kubectl rollout restart deployment broxiva-api -n broxiva-production

# Check rollout status
kubectl rollout status deployment broxiva-api -n broxiva-production

# Rollback deployment
kubectl rollout undo deployment broxiva-api -n broxiva-production

# Scale deployment
kubectl scale deployment broxiva-api -n broxiva-production --replicas=5
```

### Logs and Debugging

```bash
# View logs (last 100 lines)
kubectl logs -n broxiva-production deployment/broxiva-api --tail=100

# Follow logs
kubectl logs -n broxiva-production deployment/broxiva-api -f

# Logs from all pods
kubectl logs -n broxiva-production -l app=broxiva-api --all-containers=true

# Execute command in pod
kubectl exec -it POD_NAME -n broxiva-production -- /bin/bash

# Port forward for local access
kubectl port-forward -n broxiva-production svc/broxiva-api 8080:4000
```

### Health Checks

```bash
# Check pod health
kubectl get pods -n broxiva-production

# Describe pod for events
kubectl describe pod POD_NAME -n broxiva-production

# View pod resource usage
kubectl top pods -n broxiva-production

# View node resource usage
kubectl top nodes
```

### Database Operations

```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n broxiva-production -- psql -U broxiva -d broxiva_production

# Database backup
kubectl exec postgres-0 -n broxiva-production -- \
  pg_dump -U broxiva broxiva_production > backup-$(date +%Y%m%d).sql

# Connect to Redis
kubectl exec -it redis-0 -n broxiva-production -- redis-cli -a "$REDIS_PASSWORD"

# Redis ping test
kubectl exec -it redis-0 -n broxiva-production -- redis-cli PING
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
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
```

### Azure Key Vault

```bash
# Store secret
az keyvault secret set --vault-name broxiva-production-kv --name SECRET_NAME --value "VALUE"

# Get secret
az keyvault secret show --vault-name broxiva-production-kv --name SECRET_NAME --query value -o tsv

# List secrets
az keyvault secret list --vault-name broxiva-production-kv
```

### Monitoring

```bash
# View events
kubectl get events -n broxiva-production --sort-by='.lastTimestamp'

# Watch pod status
kubectl get pods -n broxiva-production -w

# Resource quotas
kubectl describe quota -n broxiva-production

# Limit ranges
kubectl describe limitrange -n broxiva-production
```

## Update External API Keys

### Stripe

```bash
kubectl patch secret broxiva-secrets -n broxiva-production \
  --type='json' \
  -p='[{"op":"replace","path":"/data/STRIPE_SECRET_KEY","value":"'$(echo -n "sk_live_XXX" | base64)'"}]'

kubectl rollout restart deployment broxiva-api -n broxiva-production
```

### SendGrid

```bash
kubectl patch secret broxiva-secrets -n broxiva-production \
  --type='json' \
  -p='[{"op":"replace","path":"/data/SENDGRID_API_KEY","value":"'$(echo -n "SG.XXX" | base64)'"}]'

kubectl rollout restart deployment broxiva-api -n broxiva-production
```

### Sentry

```bash
kubectl patch secret broxiva-secrets -n broxiva-production \
  --type='json' \
  -p='[{"op":"replace","path":"/data/SENTRY_DSN","value":"'$(echo -n "https://XXX@sentry.io/XXX" | base64)'"}]'

kubectl rollout restart deployment broxiva-api -n broxiva-production
```

## Emergency Procedures

### Rollback to Previous Version

```bash
kubectl rollout undo deployment broxiva-api -n broxiva-production
kubectl rollout status deployment broxiva-api -n broxiva-production
```

### Restore Secrets from Backup

```bash
kubectl apply -f backup-YYYYMMDD.yaml
kubectl rollout restart deployment broxiva-api -n broxiva-production
kubectl rollout restart deployment broxiva-worker -n broxiva-production
```

### Scale Down (Maintenance Mode)

```bash
kubectl scale deployment broxiva-api -n broxiva-production --replicas=0
kubectl scale deployment broxiva-worker -n broxiva-production --replicas=0
kubectl scale deployment broxiva-web -n broxiva-production --replicas=1
```

### Scale Up (Resume Operations)

```bash
kubectl scale deployment broxiva-api -n broxiva-production --replicas=3
kubectl scale deployment broxiva-worker -n broxiva-production --replicas=2
kubectl scale deployment broxiva-web -n broxiva-production --replicas=3
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
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n broxiva-production -- \
  psql postgresql://broxiva:PASSWORD@postgres.broxiva-production.svc.cluster.local:5432/broxiva_production
```

### Test Redis Connection

```bash
kubectl run -it --rm debug --image=redis:7 --restart=Never -n broxiva-production -- \
  redis-cli -h redis.broxiva-production.svc.cluster.local -a PASSWORD PING
```

## Security Checks

### Verify RBAC Permissions

```bash
# Check if service account can get secrets
kubectl auth can-i get secrets \
  --as=system:serviceaccount:broxiva-production:broxiva-api \
  -n broxiva-production

# List all permissions for service account
kubectl auth can-i --list \
  --as=system:serviceaccount:broxiva-production:broxiva-api \
  -n broxiva-production
```

### Check Pod Security

```bash
# Describe pod security context
kubectl get pod POD_NAME -n broxiva-production -o jsonpath='{.spec.securityContext}'

# Check for privileged containers
kubectl get pods -n broxiva-production -o json | \
  jq '.items[] | select(.spec.containers[].securityContext.privileged==true) | .metadata.name'
```

## Performance Tuning

### View Resource Usage

```bash
# Current usage
kubectl top pods -n broxiva-production

# Historical metrics (requires metrics-server)
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/broxiva-production/pods
```

### Adjust HPA (Horizontal Pod Autoscaler)

```bash
# Create HPA
kubectl autoscale deployment broxiva-api -n broxiva-production \
  --cpu-percent=70 --min=2 --max=10

# View HPA status
kubectl get hpa -n broxiva-production

# Describe HPA
kubectl describe hpa broxiva-api -n broxiva-production
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias kp='kubectl -n broxiva-production'
alias kpg='kubectl -n broxiva-production get'
alias kpd='kubectl -n broxiva-production describe'
alias kpl='kubectl -n broxiva-production logs'
alias kpe='kubectl -n broxiva-production exec -it'
alias kpa='kubectl -n broxiva-production apply -f'
alias kpdel='kubectl -n broxiva-production delete'

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
