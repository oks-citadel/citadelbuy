# AKS Deployment Quick Reference

## Quick Commands

### Trigger Deployments

```bash
# Development
git push origin develop

# Staging
git push origin staging

# Production
gh workflow run cd-prod.yml -f image_tag=v1.2.3
```

### Manual Deployment

```bash
# Development with specific tag
gh workflow run cd-dev.yml -f image_tag=dev-abc123

# Staging with approval
gh workflow run cd-staging.yml -f image_tag=staging-v1.2.3

# Staging skip approval
gh workflow run cd-staging.yml -f image_tag=staging-v1.2.3 -f skip_approval=true

# Production Blue-Green
gh workflow run cd-prod.yml -f image_tag=v1.2.3 -f deployment_strategy=blue-green

# Production Rolling
gh workflow run cd-prod.yml -f image_tag=v1.2.3 -f deployment_strategy=rolling
```

## Environment Access

### Connect to AKS Clusters

```bash
# Development
az aks get-credentials --resource-group citadelbuy-dev-rg --name citadelbuy-dev-aks

# Staging
az aks get-credentials --resource-group citadelbuy-staging-rg --name citadelbuy-staging-aks

# Production
az aks get-credentials --resource-group citadelbuy-prod-rg --name citadelbuy-prod-aks
```

### View Deployments

```bash
# List all deployments
kubectl get deployments -n citadelbuy-<env>

# Get deployment details
kubectl describe deployment citadelbuy-api -n citadelbuy-<env>

# Watch rollout status
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-<env>
```

### View Pods

```bash
# List all pods
kubectl get pods -n citadelbuy-<env>

# Get pod logs
kubectl logs -f <pod-name> -n citadelbuy-<env>

# Execute command in pod
kubectl exec -it <pod-name> -n citadelbuy-<env> -- /bin/sh
```

## Health Checks

### API Health

```bash
# From within cluster
kubectl exec -it <api-pod> -n citadelbuy-<env> -- curl http://localhost:4000/api/health/live
kubectl exec -it <api-pod> -n citadelbuy-<env> -- curl http://localhost:4000/api/health/ready

# From external (if exposed)
curl https://api-dev.citadelbuy.com/api/health/live
curl https://api-staging.citadelbuy.com/api/health/live
curl https://api.citadelbuy.com/api/health/live
```

### Web Health

```bash
# From within cluster
kubectl exec -it <web-pod> -n citadelbuy-<env> -- curl http://localhost:3000/health

# From external
curl https://dev.citadelbuy.com/health
curl https://staging.citadelbuy.com/health
curl https://citadelbuy.com/health
```

## Rollback Procedures

### Development/Staging Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-<env>
kubectl rollout undo deployment/citadelbuy-web -n citadelbuy-<env>

# Rollback to specific revision
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-<env> --to-revision=2

# View rollout history
kubectl rollout history deployment/citadelbuy-api -n citadelbuy-<env>
```

### Production Blue-Green Rollback

```bash
# Switch traffic back to blue
kubectl patch service citadelbuy-api -n citadelbuy-production -p '{"spec":{"selector":{"color":"blue"}}}'
kubectl patch service citadelbuy-web -n citadelbuy-production -p '{"spec":{"selector":{"color":"blue"}}}'

# Scale up blue if needed
kubectl scale deployment/citadelbuy-api-blue -n citadelbuy-production --replicas=5
kubectl scale deployment/citadelbuy-web-blue -n citadelbuy-production --replicas=5

# Verify traffic routing
kubectl get service citadelbuy-api -n citadelbuy-production -o jsonpath='{.spec.selector.color}'
```

## Database Migrations

### Check Migration Status

```bash
# Get API pod
API_POD=$(kubectl get pod -n citadelbuy-<env> -l app=citadelbuy-api -o jsonpath="{.items[0].metadata.name}")

# Check migration status
kubectl exec -it $API_POD -n citadelbuy-<env> -- npx prisma migrate status

# Run migrations manually
kubectl exec -it $API_POD -n citadelbuy-<env> -- npx prisma migrate deploy
```

### Rollback Migration

```bash
# Mark migration as rolled back
kubectl exec -it $API_POD -n citadelbuy-<env> -- npx prisma migrate resolve --rolled-back <migration-name>

# Apply down migration (if available)
kubectl exec -it $API_POD -n citadelbuy-<env> -- npx prisma migrate dev
```

## Debugging

### View Logs

```bash
# Tail logs
kubectl logs -f <pod-name> -n citadelbuy-<env>

# View previous pod logs
kubectl logs <pod-name> -n citadelbuy-<env> --previous

# View logs from all pods in deployment
kubectl logs -l app=citadelbuy-api -n citadelbuy-<env> --tail=100
```

### Pod Troubleshooting

```bash
# Describe pod for events
kubectl describe pod <pod-name> -n citadelbuy-<env>

# Get pod in different output formats
kubectl get pod <pod-name> -n citadelbuy-<env> -o yaml
kubectl get pod <pod-name> -n citadelbuy-<env> -o json

# Check resource usage
kubectl top pod -n citadelbuy-<env>
```

### Service Debugging

```bash
# Test service connectivity
kubectl run test-pod --rm -it --image=curlimages/curl -n citadelbuy-<env> -- curl http://citadelbuy-api:4000/api/health/live

# Port forward for local access
kubectl port-forward service/citadelbuy-api 4000:4000 -n citadelbuy-<env>
kubectl port-forward service/citadelbuy-web 3000:3000 -n citadelbuy-<env>
```

### Network Debugging

```bash
# Check network policies
kubectl get networkpolicies -n citadelbuy-<env>

# Describe network policy
kubectl describe networkpolicy <policy-name> -n citadelbuy-<env>

# Check ingress
kubectl get ingress -n citadelbuy-<env>
kubectl describe ingress citadelbuy-ingress -n citadelbuy-<env>
```

## Scaling

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment/citadelbuy-api -n citadelbuy-<env> --replicas=5

# Check current replicas
kubectl get deployment citadelbuy-api -n citadelbuy-<env>
```

### Horizontal Pod Autoscaler

```bash
# Check HPA status
kubectl get hpa -n citadelbuy-<env>

# Describe HPA
kubectl describe hpa citadelbuy-api-hpa -n citadelbuy-<env>

# Modify HPA
kubectl edit hpa citadelbuy-api-hpa -n citadelbuy-<env>
```

## Configuration Updates

### Update ConfigMap

```bash
# Edit ConfigMap
kubectl edit configmap citadelbuy-config -n citadelbuy-<env>

# Restart pods to pick up changes
kubectl rollout restart deployment/citadelbuy-api -n citadelbuy-<env>
```

### Update Secrets

```bash
# Create secret from file
kubectl create secret generic citadelbuy-secrets -n citadelbuy-<env> \
  --from-file=.env=.env.production \
  --dry-run=client -o yaml | kubectl apply -f -

# Update secret
kubectl delete secret citadelbuy-secrets -n citadelbuy-<env>
kubectl create secret generic citadelbuy-secrets -n citadelbuy-<env> --from-env-file=.env.production
```

## Monitoring

### Resource Usage

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n citadelbuy-<env>

# Specific deployment resources
kubectl top pods -n citadelbuy-<env> -l app=citadelbuy-api
```

### Events

```bash
# Get all events
kubectl get events -n citadelbuy-<env> --sort-by='.lastTimestamp'

# Watch events
kubectl get events -n citadelbuy-<env> --watch

# Events for specific pod
kubectl get events -n citadelbuy-<env> --field-selector involvedObject.name=<pod-name>
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# Namespace aliases
alias kdev='kubectl -n citadelbuy-dev'
alias kstg='kubectl -n citadelbuy-staging'
alias kprd='kubectl -n citadelbuy-production'

# Common commands
alias kgp='kubectl get pods'
alias kgd='kubectl get deployments'
alias kgs='kubectl get services'
alias kgi='kubectl get ingress'
alias kdp='kubectl describe pod'
alias klf='kubectl logs -f'

# Get API pod
alias api-dev='kubectl get pod -n citadelbuy-dev -l app=citadelbuy-api -o jsonpath="{.items[0].metadata.name}"'
alias api-stg='kubectl get pod -n citadelbuy-staging -l app=citadelbuy-api -o jsonpath="{.items[0].metadata.name}"'
alias api-prd='kubectl get pod -n citadelbuy-production -l app=citadelbuy-api -o jsonpath="{.items[0].metadata.name}"'
```

## Emergency Procedures

### Complete Rollback

```bash
# 1. Switch to previous image
kubectl set image deployment/citadelbuy-api -n citadelbuy-<env> \
  api=ghcr.io/citadelplatforms/citadelbuy-api:<previous-tag>

# 2. Watch rollout
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-<env>

# 3. Verify health
kubectl exec -it $(kubectl get pod -n citadelbuy-<env> -l app=citadelbuy-api -o jsonpath="{.items[0].metadata.name}") \
  -n citadelbuy-<env> -- curl http://localhost:4000/api/health/live
```

### Emergency Scale Down

```bash
# Scale to zero (maintenance mode)
kubectl scale deployment/citadelbuy-api -n citadelbuy-<env> --replicas=0
kubectl scale deployment/citadelbuy-web -n citadelbuy-<env> --replicas=0

# Scale back up
kubectl scale deployment/citadelbuy-api -n citadelbuy-<env> --replicas=5
kubectl scale deployment/citadelbuy-web -n citadelbuy-<env> --replicas=5
```

### Emergency Database Connection

```bash
# Port forward to PostgreSQL (if in cluster)
kubectl port-forward service/postgres 5432:5432 -n citadelbuy-<env>

# Connect via psql
psql postgresql://user:password@localhost:5432/citadelbuy
```

## Workflow Status

### Check Running Workflows

```bash
# List recent workflow runs
gh run list --workflow=cd-dev.yml
gh run list --workflow=cd-staging.yml
gh run list --workflow=cd-prod.yml

# Watch workflow run
gh run watch <run-id>

# View workflow logs
gh run view <run-id> --log
```

### Cancel Running Workflow

```bash
# Cancel specific run
gh run cancel <run-id>

# Cancel all runs for a workflow
gh run list --workflow=cd-dev.yml --json databaseId -q '.[].databaseId' | xargs -n1 gh run cancel
```

## URL Reference

### Development
- Web: https://dev.citadelbuy.com
- API: https://api-dev.citadelbuy.com
- Grafana: https://grafana-dev.citadelbuy.com

### Staging
- Web: https://staging.citadelbuy.com
- API: https://api-staging.citadelbuy.com
- Grafana: https://grafana-staging.citadelbuy.com

### Production
- Web: https://citadelbuy.com
- API: https://api.citadelbuy.com
- Grafana: https://grafana.citadelbuy.com

## Support Contacts

- **DevOps Team:** devops@citadelbuy.com
- **Slack Channel:** #deployments
- **Emergency:** PagerDuty on-call rotation

## Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Configuration updated (if needed)
- [ ] Dependencies updated
- [ ] Release notes prepared
- [ ] Stakeholders notified
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] On-call engineer available

## Post-Deployment Checklist

- [ ] Health checks passing
- [ ] No error spikes in logs
- [ ] Database migrations successful
- [ ] Application metrics normal
- [ ] User-facing features working
- [ ] Third-party integrations operational
- [ ] Monitoring alerts configured
- [ ] Deployment documented
- [ ] Team notified of completion
- [ ] Known issues documented
