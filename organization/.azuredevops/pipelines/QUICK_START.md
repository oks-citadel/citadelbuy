# Broxiva Pipelines - Quick Start Guide

This guide will help you set up and run the Azure Pipelines for Broxiva in under 30 minutes.

## Prerequisites Checklist

- [ ] Azure DevOps Organization: `broxivacloudmanagement`
- [ ] Azure DevOps Project: `Broxiva`
- [ ] Azure Subscription with active credits
- [ ] Project Administrator access in Azure DevOps
- [ ] Contributor/Owner access on Azure subscription

## 5-Minute Setup

### 1. Create Service Connections (5 min)

Go to **Project Settings** → **Service connections** and create:

1. **Azure Connection** (`broxiva-azure-connection`)
   - Type: Azure Resource Manager
   - Authentication: Service Principal (automatic)
   - Scope: Subscription

2. **ACR Connection** (`broxiva-acr-connection`)
   - Type: Docker Registry
   - Registry type: Azure Container Registry
   - Select your ACR: `broxivaprod.azurecr.io`

3. **AKS Connections** (3 connections)
   - `broxiva-aks-dev`
   - `broxiva-aks-staging`
   - `broxiva-aks-production`
   - Type: Kubernetes
   - Authentication: Azure Subscription or Service Account

### 2. Create Variable Groups (10 min)

Go to **Pipelines** → **Library** → **+ Variable group**

Create these groups (copy from template):

```yaml
# broxiva-common
DOCKER_BUILDKIT: 1
NODE_ENV: production
PNPM_VERSION: 10.23.0

# broxiva-acr
ACR_NAME: broxivaprod
ACR_LOGIN_SERVER: broxivaprod.azurecr.io

# broxiva-dev
ENVIRONMENT: dev
API_URL: https://api-dev.broxiva.com
WEB_URL: https://dev.broxiva.com
NEXT_PUBLIC_API_URL: https://api-dev.broxiva.com

# broxiva-staging
ENVIRONMENT: staging
API_URL: https://api-staging.broxiva.com
WEB_URL: https://staging.broxiva.com
NEXT_PUBLIC_API_URL: https://api-staging.broxiva.com

# broxiva-production
ENVIRONMENT: production
API_URL: https://api.broxiva.com
WEB_URL: https://broxiva.com
NEXT_PUBLIC_API_URL: https://api.broxiva.com

# broxiva-terraform
TF_BACKEND_RG: broxiva-terraform-state
TF_BACKEND_SA: broxivatfstate
TF_BACKEND_CONTAINER: tfstate

# broxiva-ci-variables
NODE_VERSION: 20.x
PYTHON_VERSION: 3.11
```

**Important**: Link secrets to Azure Key Vault for:
- Database URLs
- API keys
- Stripe keys
- Sentry DSN

### 3. Create Environments (5 min)

Go to **Pipelines** → **Environments** → **New environment**

Create these environments:

| Environment | Approvals | Resource |
|------------|-----------|----------|
| broxiva-dev | None | Kubernetes (namespace: broxiva-dev) |
| broxiva-staging | 1 approver | Kubernetes (namespace: broxiva-staging) |
| broxiva-production | 2 approvers | Kubernetes (namespace: broxiva-prod) |
| broxiva-dev-infra | None | None |
| broxiva-staging-infra | 1 approver | None |
| broxiva-production-infra | 2 approvers | None |

### 4. Create Pipelines (5 min)

Go to **Pipelines** → **New pipeline** for each:

1. **CI - Main**
   - YAML path: `/.azuredevops/pipelines/ci-main.yml`
   - Trigger: PR to main/master/develop

2. **CD - API**
   - YAML path: `/.azuredevops/pipelines/cd-api.yml`
   - Trigger: Push to main/develop

3. **CD - Web**
   - YAML path: `/.azuredevops/pipelines/cd-web.yml`
   - Trigger: Push to main/develop

4. **CD - Services**
   - YAML path: `/.azuredevops/pipelines/cd-services.yml`
   - Trigger: Push to main/develop

5. **Infrastructure**
   - YAML path: `/.azuredevops/pipelines/infrastructure.yml`
   - Trigger: Push to main (terraform changes)

6. **Release Pipeline**
   - YAML path: `/.azuredevops/pipelines/release-pipeline.yml`
   - Trigger: Manual only

### 5. Configure Branch Policies (5 min)

**Repos** → **Branches** → **main** → **Branch policies**

Enable:
- ✅ Require a minimum number of reviewers: 1
- ✅ Check for comment resolution
- ✅ Build validation: Add **CI - Main** pipeline

## Daily Workflow

### Developers

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... code changes ...

# 3. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 4. Create PR in Azure DevOps
# CI pipeline runs automatically

# 5. After approval, merge to develop
# Automatic deployment to dev environment
```

### DevOps - Deploy to Production

```bash
# Option 1: Automatic (via main branch)
git checkout main
git merge develop
git push origin main
# Deploys: Dev → Staging (auto) → Production (requires approval)

# Option 2: Manual Release
# Go to Pipelines → Release Pipeline → Run pipeline
# Select production environment and version
```

## Common Commands

### Check Pipeline Status

```bash
# Install Azure DevOps CLI
az extension add --name azure-devops

# Login
az devops login

# Set default organization and project
az devops configure --defaults organization=https://dev.azure.com/broxivacloudmanagement project=Broxiva

# List recent pipeline runs
az pipelines runs list --top 5

# Show specific run
az pipelines runs show --id [RUN_ID]
```

### Troubleshooting

```bash
# Check if images exist in ACR
az acr repository list --name broxivaprod --output table

# Check AKS pods
kubectl get pods -n broxiva-prod

# View pod logs
kubectl logs -f deployment/broxiva-api -n broxiva-prod

# Rollback deployment
kubectl rollout undo deployment/broxiva-api -n broxiva-prod
```

### Manual Deployment

```bash
# If pipeline fails, you can manually deploy:

# Build and push image
docker build -t broxivaprod.azurecr.io/broxiva-api:v2.1.0 -f apps/api/Dockerfile.production .
docker push broxivaprod.azurecr.io/broxiva-api:v2.1.0

# Update Kubernetes deployment
kubectl set image deployment/broxiva-api api=broxivaprod.azurecr.io/broxiva-api:v2.1.0 -n broxiva-prod
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing in CI
- [ ] Code review approved
- [ ] Database migrations tested in staging
- [ ] Feature flags configured (if applicable)
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured
- [ ] Post-deployment verification plan ready

## Emergency Procedures

### Pipeline Stuck/Hanging

1. Go to the pipeline run
2. Click **Cancel**
3. Wait for cancellation
4. Re-run the pipeline

### Production Deployment Failed

1. **Immediate**: Check error logs in pipeline
2. **If critical**: Rollback to previous version
   ```bash
   kubectl rollout undo deployment/broxiva-api -n broxiva-prod
   ```
3. **If non-critical**: Fix issue and redeploy
4. **Notify**: Alert team in Slack/Teams

### Database Migration Failed

1. **DO NOT** continue deployment
2. Check migration error logs
3. Restore database from backup if needed
4. Fix migration script
5. Test in staging first
6. Redeploy

## Key URLs

- **Azure DevOps**: https://dev.azure.com/broxivacloudmanagement/Broxiva
- **Pipelines**: https://dev.azure.com/broxivacloudmanagement/Broxiva/_build
- **Releases**: https://dev.azure.com/broxivacloudmanagement/Broxiva/_release
- **Environments**: https://dev.azure.com/broxivacloudmanagement/Broxiva/_environments
- **Service Connections**: https://dev.azure.com/broxivacloudmanagement/Broxiva/_settings/adminservices

## Pipeline Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Create PR      │
                    └──────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │          CI Pipeline (ci-main.yml)      │
         │  • Lint & Type Check                   │
         │  • Security Scanning                   │
         │  • Unit Tests                          │
         │  • Build Apps                          │
         └────────────────────────────────────────┘
                              │
                         Passed? │
                              ▼
                    ┌──────────────────┐
                    │   Merge to Main  │
                    └──────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌──────────────────┐                    ┌──────────────────┐
│   CD - API       │                    │   CD - Web       │
│   cd-api.yml     │                    │   cd-web.yml     │
└──────────────────┘                    └──────────────────┘
         │                                         │
         ▼                                         ▼
┌──────────────────┐                    ┌──────────────────┐
│   Deploy to Dev  │                    │   Deploy to Dev  │
│   (Automatic)    │                    │   (Automatic)    │
└──────────────────┘                    └──────────────────┘
         │                                         │
         ▼                                         ▼
┌──────────────────┐                    ┌──────────────────┐
│ Deploy to Staging│                    │ Deploy to Staging│
│   (Automatic)    │                    │   (Automatic)    │
└──────────────────┘                    └──────────────────┘
         │                                         │
         ▼                                         ▼
┌──────────────────┐                    ┌──────────────────┐
│ Deploy to Prod   │                    │ Deploy to Prod   │
│ (Manual Approval)│                    │ (Manual Approval)│
└──────────────────┘                    └──────────────────┘
```

## Pipeline Variables Reference

### Environment-specific URLs

| Environment | API URL | Web URL | WS URL |
|------------|---------|---------|--------|
| Dev | api-dev.broxiva.com | dev.broxiva.com | wss://api-dev.broxiva.com |
| Staging | api-staging.broxiva.com | staging.broxiva.com | wss://api-staging.broxiva.com |
| Production | api.broxiva.com | broxiva.com | wss://api.broxiva.com |

### Docker Image Tags

- `latest` - Latest build from main
- `$(Build.BuildNumber)` - Build-specific tag (e.g., 20251206.1)
- `v2.1.0` - Release version tag
- `develop` - Latest build from develop branch

## Next Steps

1. ✅ Complete setup using this guide
2. 📖 Read full [README.md](./README.md) for detailed documentation
3. 🧪 Test CI pipeline with a sample PR
4. 🚀 Test CD pipeline by deploying to dev
5. 📊 Monitor pipeline runs and optimize as needed

## Support

**Questions?** Contact the DevOps team or check the main [README.md](./README.md)

**Found a bug?** Create a work item in Azure Boards

---

**Quick Setup Time**: ~30 minutes
**Difficulty**: Intermediate
**Last Updated**: 2025-12-06
