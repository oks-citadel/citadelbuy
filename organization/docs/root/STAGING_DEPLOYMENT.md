# CitadelBuy Staging Deployment Guide

Complete guide for deploying CitadelBuy to the staging environment, including prerequisites, deployment procedures, smoke testing, and troubleshooting.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment Process](#deployment-process)
5. [Smoke Tests](#smoke-tests)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedures](#rollback-procedures)
8. [Best Practices](#best-practices)

## Overview

The staging environment is a production-like environment used for:
- Final validation before production deployment
- Integration testing
- Performance testing
- User acceptance testing (UAT)
- Demo and client presentations

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Ingress Controller                      │
│           (staging.citadelbuy.com / staging-api...)         │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐          ┌──────▼──────┐
        │  Web Frontend  │          │  API Backend │
        │   (Next.js)    │          │  (NestJS)    │
        │  Replicas: 2   │          │  Replicas: 2 │
        └───────┬────────┘          └──────┬───────┘
                │                           │
                └─────────┬─────────────────┘
                          │
                ┌─────────┴──────────┐
                │                    │
        ┌───────▼────────┐   ┌──────▼──────┐
        │   PostgreSQL   │   │    Redis    │
        │   Database     │   │    Cache    │
        └────────────────┘   └─────────────┘
```

## Prerequisites

### Required Tools

Install the following tools before deploying:

```bash
# Docker
docker --version  # >= 24.0.0

# kubectl
kubectl version --client  # >= 1.28.0

# pnpm (for local development)
pnpm --version  # >= 8.0.0

# curl (for testing)
curl --version

# jq (for JSON processing)
jq --version
```

### Access Requirements

1. **Kubernetes Cluster Access**
   - kubectl configured with staging cluster credentials
   - Namespace creation permissions
   - Deployment permissions

2. **Container Registry Access**
   - GitHub Container Registry (ghcr.io) authentication
   - Push permissions for citadelplatforms organization

3. **DNS Configuration**
   - Access to DNS management
   - Ability to create/update A records for:
     - `staging.citadelbuy.com`
     - `staging-api.citadelbuy.com`

4. **Secrets Management**
   - Access to secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Staging environment credentials

### Network Requirements

- Outbound internet access for:
  - Pulling Docker images
  - Accessing external APIs (Stripe, SendGrid, etc.)
- Internal cluster networking configured
- Load balancer provisioned

## Environment Setup

### 1. Configure kubectl Context

```bash
# View available contexts
kubectl config get-contexts

# Set staging context
kubectl config use-context staging

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### 2. Create Kubernetes Secrets

Create secrets using the provided script:

```bash
# Generate staging secrets
cd scripts
./generate-secrets.sh staging

# Apply secrets to cluster
kubectl apply -f ../infrastructure/kubernetes/staging/secrets.yaml
```

Or create secrets manually:

```bash
# Create namespace first
kubectl apply -f infrastructure/kubernetes/staging/namespace.yaml

# Create secrets
kubectl create secret generic citadelbuy-secrets \
  --namespace=citadelbuy-staging \
  --from-literal=DATABASE_URL="postgresql://citadelbuy:SECURE_PASSWORD@postgres:5432/citadelbuy_staging" \
  --from-literal=POSTGRES_PASSWORD="SECURE_PASSWORD" \
  --from-literal=JWT_SECRET="YOUR_JWT_SECRET_64_CHARS" \
  --from-literal=JWT_REFRESH_SECRET="YOUR_JWT_REFRESH_SECRET_64_CHARS" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_..." \
  --from-literal=SENDGRID_API_KEY="SG...."
```

### 3. Configure Container Registry Authentication

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Create image pull secret for Kubernetes
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=USERNAME \
  --docker-password=$GITHUB_TOKEN \
  --docker-email=EMAIL \
  --namespace=citadelbuy-staging
```

### 4. Set Environment Variables

```bash
# Export required variables
export REGISTRY="ghcr.io"
export IMAGE_NAME="citadelplatforms/citadelbuy"
export K8S_NAMESPACE="citadelbuy-staging"
export STAGING_API_URL="https://staging-api.citadelbuy.com"
export STAGING_WEB_URL="https://staging.citadelbuy.com"
```

## Deployment Process

### Automated Deployment

Use the deployment script for automated deployment:

```bash
# Navigate to project root
cd /path/to/citadelbuy

# Make script executable
chmod +x scripts/deploy-staging.sh

# Run deployment
./scripts/deploy-staging.sh
```

The script will:
1. Check prerequisites
2. Build Docker images
3. Push images to registry
4. Deploy to Kubernetes
5. Run database migrations
6. Wait for pods to be ready
7. Execute smoke tests
8. Generate deployment report

### Manual Deployment

For manual control or troubleshooting:

#### Step 1: Build Docker Images

```bash
# Build API image
docker build -t ghcr.io/citadelplatforms/citadelbuy-api:staging-$(git rev-parse --short HEAD) \
  -f apps/api/Dockerfile \
  --build-arg NODE_ENV=staging \
  apps/api

# Build Web image
docker build -t ghcr.io/citadelplatforms/citadelbuy-web:staging-$(git rev-parse --short HEAD) \
  -f apps/web/Dockerfile \
  --build-arg NODE_ENV=staging \
  --build-arg NEXT_PUBLIC_API_URL=https://staging-api.citadelbuy.com \
  apps/web
```

#### Step 2: Push Images

```bash
# Push API image
docker push ghcr.io/citadelplatforms/citadelbuy-api:staging-$(git rev-parse --short HEAD)

# Push Web image
docker push ghcr.io/citadelplatforms/citadelbuy-web:staging-$(git rev-parse --short HEAD)
```

#### Step 3: Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f infrastructure/kubernetes/staging/

# Or apply selectively
kubectl apply -f infrastructure/kubernetes/staging/namespace.yaml
kubectl apply -f infrastructure/kubernetes/staging/configmap.yaml
kubectl apply -f infrastructure/kubernetes/staging/postgres-deployment.yaml
kubectl apply -f infrastructure/kubernetes/staging/redis-deployment.yaml
kubectl apply -f infrastructure/kubernetes/staging/api-deployment.yaml
kubectl apply -f infrastructure/kubernetes/staging/web-deployment.yaml
kubectl apply -f infrastructure/kubernetes/staging/ingress.yaml
kubectl apply -f infrastructure/kubernetes/staging/hpa.yaml
```

#### Step 4: Update Deployment Images

```bash
# Update API deployment
kubectl set image deployment/citadelbuy-api \
  api=ghcr.io/citadelplatforms/citadelbuy-api:staging-$(git rev-parse --short HEAD) \
  -n citadelbuy-staging

# Update Web deployment
kubectl set image deployment/citadelbuy-web \
  web=ghcr.io/citadelplatforms/citadelbuy-web:staging-$(git rev-parse --short HEAD) \
  -n citadelbuy-staging
```

#### Step 5: Monitor Rollout

```bash
# Watch API rollout
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-staging

# Watch Web rollout
kubectl rollout status deployment/citadelbuy-web -n citadelbuy-staging

# Check pod status
kubectl get pods -n citadelbuy-staging -w
```

#### Step 6: Run Database Migrations

```bash
# Get API pod name
API_POD=$(kubectl get pods -n citadelbuy-staging -l app=citadelbuy-api -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -n citadelbuy-staging $API_POD -- npx prisma migrate deploy

# Verify migrations
kubectl exec -n citadelbuy-staging $API_POD -- npx prisma migrate status
```

#### Step 7: Verify Deployment

```bash
# Check all resources
kubectl get all -n citadelbuy-staging

# Check ingress
kubectl get ingress -n citadelbuy-staging

# Check logs
kubectl logs -n citadelbuy-staging deployment/citadelbuy-api --tail=50
kubectl logs -n citadelbuy-staging deployment/citadelbuy-web --tail=50
```

## Smoke Tests

### Running Smoke Tests

After deployment, run smoke tests to verify functionality:

```bash
# Run all smoke tests
./scripts/smoke-tests.sh citadelbuy-staging

# View test results
cat logs/smoke-tests-report-*.txt
```

### Test Coverage

Smoke tests verify:
- ✅ API health endpoints
- ✅ Database connectivity
- ✅ Redis connectivity
- ✅ Authentication endpoints
- ✅ Product listing and search
- ✅ Cart operations
- ✅ Checkout flow
- ✅ Admin panel access
- ✅ Response times
- ✅ Web frontend

### Test Results

```
CitadelBuy Smoke Test Report
=============================
Timestamp: 2025-12-04 10:30:00
Namespace: citadelbuy-staging

Test Results:
  Total:   15
  Passed:  15
  Failed:  0
  Skipped: 0

Pass Rate: 100.00%

Status: SUCCESS
```

### Manual Testing

Test key endpoints manually:

```bash
# API health check
curl -f https://staging-api.citadelbuy.com/api/health

# API readiness
curl -f https://staging-api.citadelbuy.com/api/health/ready

# Product listing
curl -f https://staging-api.citadelbuy.com/api/products?page=1&limit=10

# Web homepage
curl -f https://staging.citadelbuy.com
```

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

**Symptoms:**
- Pods stuck in `Pending` or `ImagePullBackOff` state

**Solutions:**

```bash
# Check pod status
kubectl describe pod <POD_NAME> -n citadelbuy-staging

# Check events
kubectl get events -n citadelbuy-staging --sort-by='.lastTimestamp'

# Common fixes:
# - Verify image exists in registry
# - Check image pull secret
# - Verify resource quotas
# - Check node capacity
```

#### 2. Database Connection Failures

**Symptoms:**
- API pods crashing with database errors
- Health checks failing

**Solutions:**

```bash
# Check PostgreSQL pod
kubectl get pods -n citadelbuy-staging -l app=postgres

# Check PostgreSQL logs
kubectl logs -n citadelbuy-staging statefulset/postgres

# Test database connection
kubectl exec -n citadelbuy-staging $API_POD -- \
  npx prisma db execute --stdin <<< "SELECT 1;"

# Verify DATABASE_URL secret
kubectl get secret citadelbuy-secrets -n citadelbuy-staging -o json | \
  jq -r '.data.DATABASE_URL' | base64 -d
```

#### 3. Ingress Not Working

**Symptoms:**
- Cannot access staging URLs
- 404 or 502 errors

**Solutions:**

```bash
# Check ingress status
kubectl get ingress -n citadelbuy-staging

# Describe ingress
kubectl describe ingress citadelbuy-api-ingress -n citadelbuy-staging

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify DNS resolution
nslookup staging-api.citadelbuy.com
```

#### 4. Smoke Tests Failing

**Symptoms:**
- Smoke tests report failures
- Endpoints returning errors

**Solutions:**

```bash
# Check API logs
kubectl logs -n citadelbuy-staging deployment/citadelbuy-api --tail=100

# Test specific endpoint
curl -v https://staging-api.citadelbuy.com/api/health

# Check service endpoints
kubectl get endpoints -n citadelbuy-staging

# Verify environment variables
kubectl exec -n citadelbuy-staging $API_POD -- env | grep -E 'DATABASE|REDIS|JWT'
```

#### 5. Out of Memory (OOM) Errors

**Symptoms:**
- Pods restarting frequently
- OOMKilled status

**Solutions:**

```bash
# Check resource usage
kubectl top pods -n citadelbuy-staging

# Increase memory limits in deployment
kubectl edit deployment citadelbuy-api -n citadelbuy-staging

# Check for memory leaks in logs
kubectl logs -n citadelbuy-staging $API_POD --previous
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n citadelbuy-staging

# Describe deployment
kubectl describe deployment citadelbuy-api -n citadelbuy-staging

# Get logs with timestamps
kubectl logs -n citadelbuy-staging deployment/citadelbuy-api --timestamps=true --tail=100

# Execute commands in pod
kubectl exec -it -n citadelbuy-staging $API_POD -- /bin/sh

# Port forward for local testing
kubectl port-forward -n citadelbuy-staging svc/citadelbuy-api 4000:4000
```

## Rollback Procedures

### Quick Rollback

If deployment issues are detected, rollback immediately:

```bash
# Rollback API deployment
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-staging

# Rollback Web deployment
kubectl rollout undo deployment/citadelbuy-web -n citadelbuy-staging

# Check rollback status
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-staging
```

### Rollback to Specific Revision

```bash
# View deployment history
kubectl rollout history deployment/citadelbuy-api -n citadelbuy-staging

# Rollback to specific revision
kubectl rollout undo deployment/citadelbuy-api \
  --to-revision=3 \
  -n citadelbuy-staging
```

### Database Rollback

If database migrations need to be rolled back:

```bash
# Get API pod
API_POD=$(kubectl get pods -n citadelbuy-staging -l app=citadelbuy-api -o jsonpath='{.items[0].metadata.name}')

# View migration history
kubectl exec -n citadelbuy-staging $API_POD -- npx prisma migrate status

# Manual rollback (requires SQL knowledge)
kubectl exec -it -n citadelbuy-staging $API_POD -- \
  psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration_name = 'MIGRATION_TO_ROLLBACK';"
```

### Full Environment Rollback

To completely restore previous state:

```bash
# Delete all resources
kubectl delete namespace citadelbuy-staging

# Restore from backup
kubectl apply -f backup/staging-$(date -d yesterday +%Y%m%d)/
```

## Best Practices

### Pre-Deployment Checklist

- [ ] All tests passing in CI/CD
- [ ] Code review completed
- [ ] Database migrations reviewed
- [ ] Secrets updated if needed
- [ ] Backup of current staging environment
- [ ] Monitoring dashboards prepared
- [ ] Team notified of deployment

### During Deployment

- [ ] Monitor pod status continuously
- [ ] Check logs for errors
- [ ] Verify health endpoints
- [ ] Run smoke tests immediately
- [ ] Test critical user flows manually
- [ ] Monitor resource usage
- [ ] Check for error spikes in monitoring

### Post-Deployment

- [ ] All smoke tests passing
- [ ] No error spikes in logs
- [ ] Performance metrics normal
- [ ] Database connections stable
- [ ] Cache working correctly
- [ ] External integrations working
- [ ] Documentation updated
- [ ] Team notified of successful deployment

### Deployment Schedule

- **Best Time:** During business hours (9 AM - 5 PM weekdays)
- **Avoid:** Friday afternoons, holidays, end of month
- **Duration:** Allow 30-60 minutes for full deployment
- **Testing Window:** Allow 2-4 hours for thorough testing

### Communication

Before deployment:
```
Team, deploying CitadelBuy to staging at 10:00 AM EST.
Expected duration: 30 minutes.
Commit: abc123def
Changes: [list major changes]
```

After deployment:
```
Staging deployment completed successfully.
All smoke tests passed.
Ready for UAT.
Staging URL: https://staging.citadelbuy.com
```

### Monitoring

Set up alerts for:
- Pod restart count > 5 in 10 minutes
- Error rate > 1% of requests
- Response time > 2 seconds (95th percentile)
- Memory usage > 80%
- CPU usage > 80%

### Backup Strategy

- Daily automated backups of PostgreSQL
- Configuration snapshots before each deployment
- Git tags for each staging deployment
- Docker image retention (30 days minimum)

## CI/CD Integration

The staging deployment is automated in GitHub Actions. See `.github/workflows/staging-deployment.yml` for the complete pipeline.

### Manual Trigger

```bash
# Trigger staging deployment via GitHub CLI
gh workflow run staging-deployment.yml

# Or via API
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/citadelplatforms/citadelbuy/actions/workflows/staging-deployment.yml/dispatches \
  -d '{"ref":"main"}'
```

## Support

For deployment issues or questions:

- **DevOps Team:** devops@citadelbuy.com
- **Slack Channel:** #staging-deployments
- **On-Call:** +1-XXX-XXX-XXXX
- **Documentation:** https://docs.citadelbuy.com/staging

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [CitadelBuy Production Deployment Guide](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
