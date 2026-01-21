# Broxiva Environment & Release - Quick Reference Card

## Environment Matrix

| Environment | Namespace | Domain | Branch |
|------------|-----------|--------|--------|
| Dev | `broxiva-development` | dev.broxiva.com | develop |
| Staging | `broxiva-staging` | staging.broxiva.com | staging |
| Production | `broxiva-production` | broxiva.com | main |

## Common Commands

### Setup Environment
```bash
# Development
./infrastructure/scripts/setup-environment.sh dev

# Staging
./infrastructure/scripts/setup-environment.sh staging

# Production
./infrastructure/scripts/setup-environment.sh prod
```

### Promote Release
```bash
# Dev to Staging
./infrastructure/scripts/promote-release.sh dev staging

# Staging to Production
./infrastructure/scripts/promote-release.sh staging prod
```

### Rollback
```bash
# To previous version
./infrastructure/scripts/rollback-release.sh prod

# To specific version
./infrastructure/scripts/rollback-release.sh prod v2.1.5

# To specific revision
./infrastructure/scripts/rollback-release.sh prod revision-3
```

### Manual Deployment
```bash
# Build manifests
kustomize build infrastructure/kubernetes/overlays/[env] > deployment.yaml

# Apply
kubectl apply -f deployment.yaml

# Watch rollout
kubectl rollout status deployment/broxiva-api -n broxiva-[env]
```

## Kubernetes Quick Commands

### View Resources
```bash
# All resources
kubectl get all -n broxiva-production

# Pods
kubectl get pods -n broxiva-production

# Deployments
kubectl get deployments -n broxiva-production

# Services
kubectl get services -n broxiva-production
```

### Logs
```bash
# Follow API logs
kubectl logs -f deployment/broxiva-api -n broxiva-production

# Last 100 lines
kubectl logs deployment/broxiva-api -n broxiva-production --tail=100

# Logs from specific pod
kubectl logs <pod-name> -n broxiva-production
```

### Scaling
```bash
# Scale deployment
kubectl scale deployment/broxiva-api --replicas=10 -n broxiva-production

# Auto-scaling status
kubectl get hpa -n broxiva-production
```

### Troubleshooting
```bash
# Describe deployment
kubectl describe deployment/broxiva-api -n broxiva-production

# Get events
kubectl get events -n broxiva-production --sort-by='.lastTimestamp'

# Exec into pod
kubectl exec -it <pod-name> -n broxiva-production -- /bin/sh

# Port forward
kubectl port-forward service/broxiva-api 8080:4000 -n broxiva-production
```

## GitHub Actions

### Trigger Deployment
```bash
# Manual staging deployment
gh workflow run cd-staging.yml -f image_tag=staging-abc123

# Manual production deployment
gh workflow run cd-prod.yml -f image_tag=v2.1.0 -f deployment_strategy=blue-green
```

### Watch Workflow
```bash
# Watch latest run
gh run watch

# List recent runs
gh run list --workflow=cd-prod.yml
```

## Health Checks

### API Health
```bash
# Development
curl https://api-dev.broxiva.com/api/health/live
curl https://api-dev.broxiva.com/api/health/ready

# Staging
curl https://api-staging.broxiva.com/api/health/live

# Production
curl https://api.broxiva.com/api/health/live
```

### Web Health
```bash
# Development
curl https://dev.broxiva.com/health

# Staging
curl https://staging.broxiva.com/health

# Production
curl https://broxiva.com/health
```

## Deployment Checklist

### Before Deployment
- [ ] All tests passing
- [ ] Code review approved
- [ ] Security scans passed
- [ ] Change request approved (prod only)
- [ ] Backup verified
- [ ] Rollback plan documented

### During Deployment
- [ ] Monitor deployment progress
- [ ] Watch error rates
- [ ] Check health endpoints
- [ ] Verify logs

### After Deployment
- [ ] Run smoke tests
- [ ] Verify customer functionality
- [ ] Monitor metrics
- [ ] Update changelog

## Emergency Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | devops@broxiva.com |
| On-Call Engineer | oncall@broxiva.com |
| Engineering Manager | engineering@broxiva.com |

## Slack Channels
- **Incidents:** #incidents
- **Deployments:** #deployments
- **DevOps:** #devops

## Key Files

| File | Purpose |
|------|---------|
| `infrastructure/docs/RELEASE_GUIDE.md` | Complete release documentation |
| `infrastructure/scripts/setup-environment.sh` | Environment setup |
| `infrastructure/scripts/promote-release.sh` | Release promotion |
| `infrastructure/scripts/rollback-release.sh` | Rollback procedure |

## Resource Allocations

### Development
- API: 256Mi-512Mi RAM, 100m-500m CPU
- Web: 128Mi-256Mi RAM, 50m-250m CPU
- Replicas: 1

### Staging
- API: 512Mi-1Gi RAM, 250m-1000m CPU
- Web: 256Mi-768Mi RAM, 125m-500m CPU
- Replicas: 2

### Production
- API: 1Gi-2Gi RAM, 500m-2000m CPU
- Web: 512Mi-1536Mi RAM, 250m-1000m CPU
- Replicas: 5 (HPA: 3-10)

---

**Print this card and keep it handy!**
