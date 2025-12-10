# AKS Deployment Pipeline Templates

This directory contains reusable Azure DevOps pipeline templates for deploying CitadelBuy to Azure Kubernetes Service (AKS).

## Templates Overview

### Stage Templates

#### 1. `stages/deploy-dev.yml`
Deploys to the development environment.

**Features:**
- Triggers on `develop` branch or manual trigger
- No approval required
- Connects to `citadelbuy-dev-aks` cluster
- Applies Kubernetes manifests from `infrastructure/kubernetes/dev/`
- Updates deployment images with new tags
- Runs Prisma database migrations
- Health check: `https://dev.citadelbuy.com/api/health`

**Usage:**
```yaml
stages:
  - template: templates/stages/deploy-dev.yml
    parameters:
      imageTag: $(Build.BuildNumber)
```

#### 2. `stages/deploy-staging.yml`
Deploys to the staging environment with approval gates.

**Features:**
- Depends on successful `DeployDev` stage
- Requires approval via 'staging' environment
- Syncs ConfigMaps and Secrets from Azure Key Vault
- Runs smoke tests after deployment
- Tests authentication, products API, and frontend
- Performance validation
- Health check: `https://staging.citadelbuy.com/api/health`

**Usage:**
```yaml
stages:
  - template: templates/stages/deploy-staging.yml
    parameters:
      imageTag: $(Build.BuildNumber)
```

#### 3. `stages/deploy-production.yml`
Deploys to production using Blue-Green deployment strategy.

**Features:**
- Depends on `DeployStaging` AND `E2ETests` stages
- Manual approval gate via 'production' environment
- Security gate checks (image signatures, vulnerability scans)
- Blue-Green deployment for zero-downtime
- Deploys to inactive slot (green)
- Runs health checks on green deployment
- Switches traffic to green slot
- Keeps blue slot for 24 hours for potential rollback
- Creates rollback plan as ConfigMap
- Health check: `https://citadelbuy.com/api/health`

**Usage:**
```yaml
stages:
  - template: templates/stages/deploy-production.yml
    parameters:
      imageTag: $(Build.BuildNumber)
```

#### 4. `stages/rollback.yml`
Automatic rollback on deployment failure.

**Features:**
- Triggers on failed deployment
- Backs up current state
- Rolls back deployments using `kubectl rollout undo`
- Restores previous ConfigMaps and Secrets
- Verifies rollback health
- Sends notifications via Slack/Teams
- Creates detailed rollback report

**Usage:**
```yaml
stages:
  - template: templates/stages/rollback.yml
    parameters:
      targetEnvironment: 'production'
      rollbackReason: 'Deployment failure detected'
      notificationChannel: '$(SlackWebhook)'
```

### Job Templates

#### 5. `jobs/deploy-aks.yml`
Reusable AKS deployment job for any environment.

**Parameters:**
- `environment`: Target environment (dev/staging/production)
- `aksResourceGroup`: Azure resource group containing AKS
- `aksClusterName`: Name of AKS cluster
- `namespace`: Kubernetes namespace
- `manifestPath`: Path to Kubernetes manifests
- `imageTag`: Docker image tag to deploy
- `serviceConnection`: Azure service connection (default: CitadelBuyAzure)
- `acrName`: Azure Container Registry (default: citadelbuyacr.azurecr.io)
- `runMigrations`: Run database migrations (default: true)
- `healthCheckUrl`: Health check endpoint URL
- `deploymentTimeout`: Timeout for rollout (default: 10m)

**Usage:**
```yaml
jobs:
  - template: templates/jobs/deploy-aks.yml
    parameters:
      environment: 'staging'
      aksResourceGroup: 'citadelbuy-staging-rg'
      aksClusterName: 'citadelbuy-staging-aks'
      namespace: 'citadelbuy-staging'
      manifestPath: 'infrastructure/kubernetes/staging'
      imageTag: $(Build.BuildNumber)
      healthCheckUrl: 'https://staging.citadelbuy.com/api/health'
```

## Complete Pipeline Example

Here's how to use these templates in a complete CI/CD pipeline:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

variables:
  - name: imageTag
    value: $(Build.BuildNumber)
  - group: citadelbuy-common-vars

stages:
  # Build stage
  - template: templates/stages/build.yml

  # Security scanning
  - template: templates/stages/security-scan.yml

  # Deploy to Dev
  - template: templates/stages/deploy-dev.yml
    parameters:
      imageTag: $(imageTag)

  # Deploy to Staging
  - template: templates/stages/deploy-staging.yml
    parameters:
      imageTag: $(imageTag)

  # E2E Tests (custom stage)
  - stage: E2ETests
    dependsOn: DeployStaging
    jobs:
      - job: RunE2ETests
        steps:
          - script: npm run test:e2e
            displayName: 'Run E2E Tests'

  # Deploy to Production
  - template: templates/stages/deploy-production.yml
    parameters:
      imageTag: $(imageTag)

  # Rollback on failure
  - template: templates/stages/rollback.yml
    parameters:
      targetEnvironment: 'production'
      rollbackReason: 'Deployment failure detected'
      notificationChannel: '$(SlackWebhook)'
```

## Configuration Requirements

### Azure Resources

1. **AKS Clusters:**
   - Development: `citadelbuy-dev-aks` in `citadelbuy-dev-rg`
   - Staging: `citadelbuy-staging-aks` in `citadelbuy-staging-rg`
   - Production: `citadelbuy-production-aks` in `citadelbuy-production-rg`

2. **Azure Key Vaults:**
   - Development: `citadelbuy-dev-kv`
   - Staging: `citadelbuy-staging-kv`
   - Production: `citadelbuy-production-kv`

3. **Azure Container Registry:**
   - `citadelbuyacr.azurecr.io`

4. **Service Connection:**
   - Name: `CitadelBuyAzure`
   - Subscription ID: `ba233460-2dbe-4603-a594-68f93ec9deb3`

### Variable Groups

Create these variable groups in Azure DevOps:

**citadelbuy-dev-vars:**
- API-URL
- FRONTEND-URL
- LOG-LEVEL

**citadelbuy-staging-vars:**
- API-URL
- FRONTEND-URL
- LOG-LEVEL
- DATABASE-URL (secret)
- JWT-SECRET (secret)
- REDIS-URL (secret)
- SMTP-PASSWORD (secret)
- STRIPE-SECRET-KEY (secret)

**citadelbuy-production-vars:**
- API-URL
- FRONTEND-URL
- LOG-LEVEL
- DATABASE-URL (secret)
- JWT-SECRET (secret)
- REDIS-URL (secret)
- SMTP-PASSWORD (secret)
- STRIPE-SECRET-KEY (secret)

### Azure DevOps Environments

Create these environments with approval gates:

1. **development** - No approvals
2. **staging** - Optional approvals
3. **production** - Required manual approval

## Deployment Strategy

### Development
- **Trigger:** Automatic on `develop` branch
- **Strategy:** Rolling update
- **Approval:** None
- **Rollback:** Automatic on failure

### Staging
- **Trigger:** After successful dev deployment
- **Strategy:** Rolling update
- **Approval:** Optional
- **Rollback:** Automatic on failure
- **Tests:** Smoke tests, API validation

### Production
- **Trigger:** After successful staging + E2E tests
- **Strategy:** Blue-Green deployment
- **Approval:** Required (manual)
- **Rollback:** Automatic on failure, manual rollback available
- **Tests:** Health checks, verification tests
- **Zero-downtime:** Yes

## Blue-Green Deployment Details

Production uses Blue-Green deployment:

1. **Green Deployment:** New version deployed to inactive slot
2. **Health Checks:** Extensive testing on green slot
3. **Traffic Switch:** Service selector updated to point to green
4. **Rollback Safety:** Blue slot kept for 24 hours
5. **Cleanup:** Automated cleanup after retention period

### Manual Rollback

If needed, rollback manually:

```bash
# Get rollback plan
kubectl get configmap rollback-plan-<BUILD_ID> -n citadelbuy-production -o jsonpath='{.data.rollback\.sh}' > rollback.sh

# Execute rollback
bash rollback.sh
```

## Health Checks

Each environment includes health checks:

- **Dev:** `https://dev.citadelbuy.com/api/health`
- **Staging:** `https://staging.citadelbuy.com/api/health`
- **Production:** `https://citadelbuy.com/api/health`

Health checks verify:
- API responsiveness
- Database connectivity
- Service health
- Response time (< 2 seconds)

## Database Migrations

Prisma migrations run automatically:

1. Generate Prisma Client: `npx prisma generate`
2. Deploy migrations: `npx prisma migrate deploy`
3. Verify status: `npx prisma migrate status`

Migrations run on the API pod after deployment completes.

## Notifications

Configure notifications for rollbacks and failures:

**Slack/Teams Webhook:**
- Add webhook URL to pipeline variables
- Pass to rollback stage via `notificationChannel` parameter

## Troubleshooting

### Deployment Fails

1. Check pod logs: `kubectl logs -n <namespace> <pod-name>`
2. Check events: `kubectl get events -n <namespace> --sort-by='.lastTimestamp'`
3. Review rollout status: `kubectl rollout status deployment/<name> -n <namespace>`

### Rollback Fails

1. Review rollback report in pipeline artifacts
2. Check rollback plan ConfigMap
3. Manual intervention may be required

### Health Check Fails

1. Verify ingress configuration
2. Check DNS resolution
3. Verify pod readiness probes
4. Review service endpoints

## Best Practices

1. **Always test in dev first** - Never skip dev deployment
2. **Monitor staging deployments** - Review smoke test results
3. **Schedule production deployments** - Deploy during low-traffic periods
4. **Keep blue slot** - Don't delete immediately after production deployment
5. **Review rollback plans** - Verify rollback plan exists before production deployment
6. **Use semantic versioning** - Tag images with proper version numbers
7. **Monitor after deployment** - Watch metrics for 15-30 minutes post-deployment

## Security Considerations

- Secrets stored in Azure Key Vault
- ConfigMaps synced from Key Vault for staging/production
- Image signature verification in production
- Security scanning before deployment
- RBAC enforced on AKS clusters
- Service connections use managed identities

## Support

For issues or questions:
- Review pipeline logs in Azure DevOps
- Check AKS cluster events
- Review rollback reports in artifacts
- Contact DevOps team

---

**Last Updated:** 2025-12-10
**Version:** 1.0.0
