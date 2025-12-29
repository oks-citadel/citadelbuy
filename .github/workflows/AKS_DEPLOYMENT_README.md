# AKS Deployment Workflows Documentation

This directory contains GitHub Actions workflows for deploying Broxiva to Azure Kubernetes Service (AKS) across multiple environments.

## Overview

Three deployment workflows are configured:

1. **cd-dev.yml** - Continuous deployment to development environment
2. **cd-staging.yml** - Deployment to staging with approval and comprehensive testing
3. **cd-prod.yml** - Production deployment with Blue-Green strategy

## Architecture

### AKS Clusters

| Environment | Cluster Name | Resource Group | Namespace |
|-------------|--------------|----------------|-----------|
| Development | broxiva-dev-aks | broxiva-dev-rg | broxiva-dev |
| Staging | broxiva-staging-aks | broxiva-staging-rg | broxiva-staging |
| Production | broxiva-prod-aks | broxiva-prod-rg | broxiva-production |

### Components Deployed

Each environment deploys:
- **API Service** - NestJS backend application
- **Web Application** - Next.js frontend
- **Worker Services** - Background job processors (Production only)
  - Email worker
  - Cart abandonment worker
  - Order processing worker
  - Search indexing worker
  - Scheduled jobs worker

## Workflow Details

### 1. Development Deployment (cd-dev.yml)

**Trigger:** Push to `develop` branch

**Key Features:**
- Automatic deployment on commit
- Database migrations via Prisma
- Health checks for all services
- Automatic rollback on failure
- Post-deployment smoke tests

**Process:**
1. Build and validate code
2. Authenticate to Azure via OIDC
3. Connect to AKS cluster using kubelogin
4. Run Prisma database migrations
5. Deploy using Kustomize
6. Verify health endpoints
7. Run smoke tests
8. Send Slack notifications

**Manual Trigger:**
```bash
gh workflow run cd-dev.yml -f image_tag=dev-abc123
```

### 2. Staging Deployment (cd-staging.yml)

**Trigger:** Push to `staging` branch

**Key Features:**
- Pre-deployment validation
- Manual approval gate (optional)
- Comprehensive smoke tests
- Integration testing
- Light load testing
- State backup before deployment
- Rollback capability

**Process:**
1. Pre-deployment security scans
2. Validate Kubernetes manifests
3. Request manual approval (configurable)
4. Backup current state
5. Run database migrations
6. Deploy with Kustomize
7. Health check validation
8. Execute smoke tests
9. Run integration tests
10. Send notifications

**Manual Trigger:**
```bash
# With approval
gh workflow run cd-staging.yml -f image_tag=staging-v1.2.3

# Skip approval (use with caution)
gh workflow run cd-staging.yml -f image_tag=staging-v1.2.3 -f skip_approval=true
```

### 3. Production Deployment (cd-prod.yml)

**Trigger:** Push to `main` branch or manual dispatch

**Key Features:**
- Blue-Green deployment strategy (default)
- Rolling update strategy (optional)
- Production approval gate
- Image verification from staging
- Zero-downtime deployment
- Comprehensive testing on green environment
- Gradual traffic switch
- Blue environment kept for quick rollback

**Blue-Green Process:**
1. Validate image tag and staging deployment
2. Security and vulnerability scanning
3. Request production approval
4. Create deployment tracking issue
5. Deploy GREEN environment alongside BLUE
6. Run database migrations (zero-downtime)
7. Execute comprehensive tests on GREEN
8. Switch traffic from BLUE to GREEN
9. Monitor for errors
10. Scale down BLUE (after 10-minute safety period)
11. Send notifications

**Manual Trigger:**
```bash
# Blue-Green deployment
gh workflow run cd-prod.yml -f image_tag=v1.2.3 -f deployment_strategy=blue-green

# Rolling update (faster but brief downtime)
gh workflow run cd-prod.yml -f image_tag=v1.2.3 -f deployment_strategy=rolling
```

## Authentication & Authorization

### OIDC Authentication

All workflows use OpenID Connect (OIDC) for secure, keyless authentication to Azure:

- No service principal secrets required
- Automatic token generation by GitHub
- Short-lived credentials
- Audit trail in Azure AD

### Required Secrets

Configure these secrets in GitHub repository settings:

```yaml
# Azure OIDC
AZURE_CLIENT_ID: <Azure AD App Client ID>
AZURE_TENANT_ID: <Azure AD Tenant ID>
AZURE_SUBSCRIPTION_ID: <Azure Subscription ID>

# Database URLs
DEV_DATABASE_URL: postgresql://...
STAGING_DATABASE_URL: postgresql://...
PROD_DATABASE_URL: postgresql://...

# Notifications
SLACK_WEBHOOK_URL: https://hooks.slack.com/...

# Testing
STAGING_TEST_USER_EMAIL: test@example.com
STAGING_TEST_USER_PASSWORD: <secure-password>
```

### kubelogin Setup

kubelogin is used for AKS authentication:
- Converts kubeconfig to use Azure CLI credentials
- Supports OIDC token flow
- Automatic token refresh

## Database Migrations

### Prisma Migration Strategy

Each deployment runs Prisma migrations for all schemas:

1. `schema.prisma` - Main application schema
2. `schema-organization.prisma` - Organization/tenant data
3. `schema-dropshipping.prisma` - Dropshipping functionality
4. `schema-privacy.prisma` - Privacy and compliance data

### Migration Safety

- **Development:** Migrations run automatically
- **Staging:** Backup created before migration
- **Production:** Full backup + migration in transaction

### Rollback

If migrations fail:
```bash
# Connect to AKS
az aks get-credentials --resource-group broxiva-prod-rg --name broxiva-prod-aks

# Rollback last migration
kubectl exec -it <api-pod> -n broxiva-production -- npx prisma migrate resolve --rolled-back <migration-name>
```

## Kustomize Configuration

Deployments use Kustomize for environment-specific configuration:

```
infrastructure/kubernetes/
├── base/           # Base configurations
├── staging/        # Staging overlays
└── production/     # Production overlays
```

### Image Tag Management

Images are automatically tagged per environment:
- Development: `dev-<commit-sha>`
- Staging: `staging-<commit-sha>`
- Production: `v<semantic-version>`

## Health Checks

### API Health Endpoints

- `/api/health/live` - Liveness probe
- `/api/health/ready` - Readiness probe

### Web Health Endpoint

- `/health` - Application health status

### Validation Process

1. Wait for pod startup (30-45 seconds)
2. Execute curl from within pod
3. Verify 200 OK response
4. Fail deployment if health check fails

## Deployment Strategies

### Blue-Green Deployment (Production Default)

**Advantages:**
- Zero downtime
- Instant rollback capability
- Full testing before traffic switch
- Reduced risk

**Process:**
1. Deploy GREEN alongside existing BLUE
2. Test GREEN thoroughly
3. Switch traffic to GREEN
4. Keep BLUE running for 10 minutes
5. Scale down BLUE

**Rollback:**
```bash
kubectl patch service broxiva-api -n broxiva-production -p '{"spec":{"selector":{"color":"blue"}}}'
kubectl patch service broxiva-web -n broxiva-production -p '{"spec":{"selector":{"color":"blue"}}}'
```

### Rolling Update

**Advantages:**
- Simpler process
- Lower resource usage
- Faster deployment

**Disadvantages:**
- Brief potential downtime
- More difficult rollback

## Monitoring & Notifications

### Slack Notifications

Notifications sent for:
- Deployment start
- Deployment success
- Deployment failure
- Test results
- Traffic switch (production)

### Deployment Tracking

Production deployments automatically create GitHub issues for tracking:
- Image tag deployed
- Approver
- Timestamp
- Workflow run link

## Testing Strategy

### Development
- Basic smoke tests
- API endpoint validation
- Health check verification

### Staging
- Comprehensive smoke tests
- Integration tests
- Light load testing
- End-to-end scenarios

### Production
- Smoke tests on GREEN environment
- Integration tests
- Performance validation
- 2-minute monitoring period after traffic switch

## Rollback Procedures

### Automatic Rollback

Workflows automatically rollback on:
- Health check failures
- Deployment timeout
- Pod crash loops

### Manual Rollback

#### Development/Staging
```bash
kubectl rollout undo deployment/broxiva-api -n <namespace>
kubectl rollout undo deployment/broxiva-web -n <namespace>
```

#### Production (Blue-Green)
```bash
# Switch back to blue
kubectl patch service broxiva-api -n broxiva-production -p '{"spec":{"selector":{"color":"blue"}}}'
kubectl patch service broxiva-web -n broxiva-production -p '{"spec":{"selector":{"color":"blue"}}}'

# Scale up blue if scaled down
kubectl scale deployment/broxiva-api-blue -n broxiva-production --replicas=5
kubectl scale deployment/broxiva-web-blue -n broxiva-production --replicas=5
```

## Artifacts & Backup

### Deployment Artifacts

Workflows upload artifacts including:
- Generated Kubernetes manifests
- Kustomize configurations
- Pre-deployment state backups

**Retention:**
- Development: 30 days
- Staging: 90 days
- Production: 365 days

### State Backups

Before each deployment, current state is backed up:
- All resources (deployments, services, etc.)
- ConfigMaps
- Secrets (encrypted)
- Ingress configurations

## Troubleshooting

### Common Issues

#### 1. OIDC Authentication Failure

**Error:** `Failed to get credentials`

**Solution:**
```bash
# Verify OIDC configuration in Azure
az ad app show --id $AZURE_CLIENT_ID

# Check federated credentials
az ad app federated-credential list --id $AZURE_CLIENT_ID
```

#### 2. kubelogin Not Found

**Error:** `kubelogin: command not found`

**Solution:** Workflow automatically installs kubelogin, but if manual access needed:
```bash
curl -LO https://github.com/Azure/kubelogin/releases/download/v0.1.1/kubelogin-linux-amd64.zip
unzip kubelogin-linux-amd64.zip
sudo mv bin/linux_amd64/kubelogin /usr/local/bin/
```

#### 3. Image Pull Errors

**Error:** `ImagePullBackOff`

**Solution:**
```bash
# Verify image exists
docker manifest inspect ghcr.io/broxiva/broxiva-api:<tag>

# Check registry credentials
kubectl get secret -n <namespace> | grep regcred
```

#### 4. Migration Failures

**Error:** `Migration failed`

**Solution:**
```bash
# Check migration status
kubectl exec -it <api-pod> -n <namespace> -- npx prisma migrate status

# Manual migration
kubectl exec -it <api-pod> -n <namespace> -- npx prisma migrate deploy
```

#### 5. Health Check Timeouts

**Error:** `Health check failed after 3 attempts`

**Solution:**
```bash
# Check pod logs
kubectl logs -n <namespace> <pod-name>

# Check pod status
kubectl describe pod -n <namespace> <pod-name>

# Manual health check
kubectl exec -it <pod-name> -n <namespace> -- curl http://localhost:4000/api/health/live
```

## Best Practices

### 1. Image Tags
- Development: Use commit SHA
- Staging: Use branch + commit SHA
- Production: Use semantic versioning (v1.2.3)

### 2. Approval Gates
- Always require approval for production
- Consider approval for staging in high-stakes scenarios
- Skip approval for development

### 3. Testing
- Run full test suite before staging deployment
- Validate on staging before promoting to production
- Monitor production for at least 10 minutes after deployment

### 4. Rollback
- Always test rollback procedures
- Keep previous deployment artifacts
- Document rollback process for each environment

### 5. Database Migrations
- Test migrations on staging first
- Use transactions where possible
- Create backups before production migrations
- Have rollback scripts ready

## Security Considerations

### 1. OIDC Over Service Principals
- No long-lived credentials
- Automatic credential rotation
- Better audit trail

### 2. Secret Management
- Use External Secrets Operator for production
- Rotate secrets regularly
- Never commit secrets to repository

### 3. Network Policies
- All environments use network policies
- Restrict pod-to-pod communication
- Ingress controls in place

### 4. Container Security
- Run as non-root user
- Read-only root filesystem
- Drop all capabilities
- Seccomp profile enabled

## Performance Optimization

### Resource Limits

| Environment | API CPU | API Memory | Web CPU | Web Memory |
|-------------|---------|------------|---------|------------|
| Development | 250m-1000m | 512Mi-1Gi | 100m-500m | 256Mi-512Mi |
| Staging | 500m-1000m | 512Mi-1Gi | 250m-500m | 512Mi-1Gi |
| Production | 500m-2000m | 1Gi-2Gi | 250m-1000m | 512Mi-1536Mi |

### Horizontal Pod Autoscaling

- **Development:** Fixed replicas (1-2)
- **Staging:** 2-4 replicas based on CPU
- **Production:** 5-20 replicas based on CPU/memory

## Monitoring Dashboards

Access deployment status:
- GitHub Actions: `https://github.com/<org>/<repo>/actions`
- Azure Portal: AKS cluster metrics
- Grafana: Application metrics
- Prometheus: System metrics

## Support & Escalation

For deployment issues:
1. Check workflow logs in GitHub Actions
2. Review pod logs in AKS
3. Check Slack notifications
4. Escalate to DevOps team if unresolved

## Changelog

### Version 1.0.0 (2025-12-10)
- Initial release
- Development, Staging, and Production workflows
- OIDC authentication
- Blue-Green deployment for production
- Comprehensive health checks and testing
- Slack notifications
- Automatic rollback capabilities
