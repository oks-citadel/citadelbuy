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
az aks get-credentials --resource-group broxiva-dev-rg --name broxiva-dev-aks

# Staging
az aks get-credentials --resource-group broxiva-staging-rg --name broxiva-staging-aks

# Production
az aks get-credentials --resource-group broxiva-prod-rg --name broxiva-prod-aks
```

### View Deployments

```bash
# List all deployments
kubectl get deployments -n broxiva-<env>

# Get deployment details
kubectl describe deployment broxiva-api -n broxiva-<env>

# Watch rollout status
kubectl rollout status deployment/broxiva-api -n broxiva-<env>
```

### View Pods

```bash
# List all pods
kubectl get pods -n broxiva-<env>

# Get pod logs
kubectl logs -f <pod-name> -n broxiva-<env>

# Execute command in pod
kubectl exec -it <pod-name> -n broxiva-<env> -- /bin/sh
```

## Health Checks

### API Health

```bash
# From within cluster
kubectl exec -it <api-pod> -n broxiva-<env> -- curl http://localhost:4000/api/health/live
kubectl exec -it <api-pod> -n broxiva-<env> -- curl http://localhost:4000/api/health/ready

# From external (if exposed)
curl https://api-dev.broxiva.com/api/health/live
curl https://api-staging.broxiva.com/api/health/live
curl https://api.broxiva.com/api/health/live
```

### Web Health

```bash
# From within cluster
kubectl exec -it <web-pod> -n broxiva-<env> -- curl http://localhost:3000/health

# From external
curl https://dev.broxiva.com/health
curl https://staging.broxiva.com/health
curl https://broxiva.com/health
```

## Rollback Procedures

### Development/Staging Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/broxiva-api -n broxiva-<env>
kubectl rollout undo deployment/broxiva-web -n broxiva-<env>

# Rollback to specific revision
kubectl rollout undo deployment/broxiva-api -n broxiva-<env> --to-revision=2

# View rollout history
kubectl rollout history deployment/broxiva-api -n broxiva-<env>
```

### Production Blue-Green Rollback

```bash
# Switch traffic back to blue
kubectl patch service broxiva-api -n broxiva-production -p '{"spec":{"selector":{"color":"blue"}}}'
kubectl patch service broxiva-web -n broxiva-production -p '{"spec":{"selector":{"color":"blue"}}}'

# Scale up blue if needed
kubectl scale deployment/broxiva-api-blue -n broxiva-production --replicas=5
kubectl scale deployment/broxiva-web-blue -n broxiva-production --replicas=5

# Verify traffic routing
kubectl get service broxiva-api -n broxiva-production -o jsonpath='{.spec.selector.color}'
```

## Database Migrations

### Check Migration Status

```bash
# Get API pod
API_POD=$(kubectl get pod -n broxiva-<env> -l app=broxiva-api -o jsonpath="{.items[0].metadata.name}")

# Check migration status
kubectl exec -it $API_POD -n broxiva-<env> -- npx prisma migrate status

# Run migrations manually
kubectl exec -it $API_POD -n broxiva-<env> -- npx prisma migrate deploy
```

### Rollback Migration

```bash
# Mark migration as rolled back
kubectl exec -it $API_POD -n broxiva-<env> -- npx prisma migrate resolve --rolled-back <migration-name>

# Apply down migration (if available)
kubectl exec -it $API_POD -n broxiva-<env> -- npx prisma migrate dev
```

## Debugging

### View Logs

```bash
# Tail logs
kubectl logs -f <pod-name> -n broxiva-<env>

# View previous pod logs
kubectl logs <pod-name> -n broxiva-<env> --previous

# View logs from all pods in deployment
kubectl logs -l app=broxiva-api -n broxiva-<env> --tail=100
```

### Pod Troubleshooting

```bash
# Describe pod for events
kubectl describe pod <pod-name> -n broxiva-<env>

# Get pod in different output formats
kubectl get pod <pod-name> -n broxiva-<env> -o yaml
kubectl get pod <pod-name> -n broxiva-<env> -o json

# Check resource usage
kubectl top pod -n broxiva-<env>
```

### Service Debugging

```bash
# Test service connectivity
kubectl run test-pod --rm -it --image=curlimages/curl -n broxiva-<env> -- curl http://broxiva-api:4000/api/health/live

# Port forward for local access
kubectl port-forward service/broxiva-api 4000:4000 -n broxiva-<env>
kubectl port-forward service/broxiva-web 3000:3000 -n broxiva-<env>
```

### Network Debugging

```bash
# Check network policies
kubectl get networkpolicies -n broxiva-<env>

# Describe network policy
kubectl describe networkpolicy <policy-name> -n broxiva-<env>

# Check ingress
kubectl get ingress -n broxiva-<env>
kubectl describe ingress broxiva-ingress -n broxiva-<env>
```

## Scaling

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment/broxiva-api -n broxiva-<env> --replicas=5

# Check current replicas
kubectl get deployment broxiva-api -n broxiva-<env>
```

### Horizontal Pod Autoscaler

```bash
# Check HPA status
kubectl get hpa -n broxiva-<env>

# Describe HPA
kubectl describe hpa broxiva-api-hpa -n broxiva-<env>

# Modify HPA
kubectl edit hpa broxiva-api-hpa -n broxiva-<env>
```

## Configuration Updates

### Update ConfigMap

```bash
# Edit ConfigMap
kubectl edit configmap broxiva-config -n broxiva-<env>

# Restart pods to pick up changes
kubectl rollout restart deployment/broxiva-api -n broxiva-<env>
```

### Update Secrets

```bash
# Create secret from file
kubectl create secret generic broxiva-secrets -n broxiva-<env> \
  --from-file=.env=.env.production \
  --dry-run=client -o yaml | kubectl apply -f -

# Update secret
kubectl delete secret broxiva-secrets -n broxiva-<env>
kubectl create secret generic broxiva-secrets -n broxiva-<env> --from-env-file=.env.production
```

## Monitoring

### Resource Usage

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n broxiva-<env>

# Specific deployment resources
kubectl top pods -n broxiva-<env> -l app=broxiva-api
```

### Events

```bash
# Get all events
kubectl get events -n broxiva-<env> --sort-by='.lastTimestamp'

# Watch events
kubectl get events -n broxiva-<env> --watch

# Events for specific pod
kubectl get events -n broxiva-<env> --field-selector involvedObject.name=<pod-name>
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# Namespace aliases
alias kdev='kubectl -n broxiva-dev'
alias kstg='kubectl -n broxiva-staging'
alias kprd='kubectl -n broxiva-production'

# Common commands
alias kgp='kubectl get pods'
alias kgd='kubectl get deployments'
alias kgs='kubectl get services'
alias kgi='kubectl get ingress'
alias kdp='kubectl describe pod'
alias klf='kubectl logs -f'

# Get API pod
alias api-dev='kubectl get pod -n broxiva-dev -l app=broxiva-api -o jsonpath="{.items[0].metadata.name}"'
alias api-stg='kubectl get pod -n broxiva-staging -l app=broxiva-api -o jsonpath="{.items[0].metadata.name}"'
alias api-prd='kubectl get pod -n broxiva-production -l app=broxiva-api -o jsonpath="{.items[0].metadata.name}"'
```

## Emergency Procedures

### Complete Rollback

```bash
# 1. Switch to previous image
kubectl set image deployment/broxiva-api -n broxiva-<env> \
  api=ghcr.io/broxiva/broxiva-api:<previous-tag>

# 2. Watch rollout
kubectl rollout status deployment/broxiva-api -n broxiva-<env>

# 3. Verify health
kubectl exec -it $(kubectl get pod -n broxiva-<env> -l app=broxiva-api -o jsonpath="{.items[0].metadata.name}") \
  -n broxiva-<env> -- curl http://localhost:4000/api/health/live
```

### Emergency Scale Down

```bash
# Scale to zero (maintenance mode)
kubectl scale deployment/broxiva-api -n broxiva-<env> --replicas=0
kubectl scale deployment/broxiva-web -n broxiva-<env> --replicas=0

# Scale back up
kubectl scale deployment/broxiva-api -n broxiva-<env> --replicas=5
kubectl scale deployment/broxiva-web -n broxiva-<env> --replicas=5
```

### Emergency Database Connection

```bash
# Port forward to PostgreSQL (if in cluster)
kubectl port-forward service/postgres 5432:5432 -n broxiva-<env>

# Connect via psql
psql postgresql://user:password@localhost:5432/broxiva
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
- Web: https://dev.broxiva.com
- API: https://api-dev.broxiva.com
- Grafana: https://grafana-dev.broxiva.com

### Staging
- Web: https://staging.broxiva.com
- API: https://api-staging.broxiva.com
- Grafana: https://grafana-staging.broxiva.com

### Production
- Web: https://broxiva.com
- API: https://api.broxiva.com
- Grafana: https://grafana.broxiva.com

## Support Contacts

- **DevOps Team:** devops@broxiva.com
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
