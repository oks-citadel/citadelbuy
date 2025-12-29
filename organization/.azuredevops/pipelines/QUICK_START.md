# CitadelBuy Pipelines - Quick Start Guide

This guide will help you set up and run the Azure Pipelines for CitadelBuy in under 30 minutes.

## Prerequisites Checklist

- [ ] Azure DevOps Organization: `citadelcloudmanagement`
- [ ] Azure DevOps Project: `CitadelBuy`
- [ ] Azure Subscription with active credits
- [ ] Project Administrator access in Azure DevOps
- [ ] Contributor/Owner access on Azure subscription

## 5-Minute Setup

### 1. Create Service Connections (5 min)

Go to **Project Settings** → **Service connections** and create:

1. **Azure Connection** (`citadelbuy-azure-connection`)
   - Type: Azure Resource Manager
   - Authentication: Service Principal (automatic)
   - Scope: Subscription

2. **ACR Connection** (`citadelbuy-acr-connection`)
   - Type: Docker Registry
   - Registry type: Azure Container Registry
   - Select your ACR: `citadelbuyprod.azurecr.io`

3. **AKS Connections** (3 connections)
   - `citadelbuy-aks-dev`
   - `citadelbuy-aks-staging`
   - `citadelbuy-aks-production`
   - Type: Kubernetes
   - Authentication: Azure Subscription or Service Account

### 2. Create Variable Groups (10 min)

Go to **Pipelines** → **Library** → **+ Variable group**

Create these groups (copy from template):

```yaml
# citadelbuy-common
DOCKER_BUILDKIT: 1
NODE_ENV: production
PNPM_VERSION: 10.23.0

# citadelbuy-acr
ACR_NAME: citadelbuyprod
ACR_LOGIN_SERVER: citadelbuyprod.azurecr.io

# citadelbuy-dev
ENVIRONMENT: dev
API_URL: https://api-dev.citadelbuy.com
WEB_URL: https://dev.citadelbuy.com
NEXT_PUBLIC_API_URL: https://api-dev.citadelbuy.com

# citadelbuy-staging
ENVIRONMENT: staging
API_URL: https://api-staging.citadelbuy.com
WEB_URL: https://staging.citadelbuy.com
NEXT_PUBLIC_API_URL: https://api-staging.citadelbuy.com

# citadelbuy-production
ENVIRONMENT: production
API_URL: https://api.citadelbuy.com
WEB_URL: https://citadelbuy.com
NEXT_PUBLIC_API_URL: https://api.citadelbuy.com

# citadelbuy-terraform
TF_BACKEND_RG: citadelbuy-terraform-state
TF_BACKEND_SA: citadelbuytfstate
TF_BACKEND_CONTAINER: tfstate

# citadelbuy-ci-variables
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
| citadelbuy-dev | None | Kubernetes (namespace: citadelbuy-dev) |
| citadelbuy-staging | 1 approver | Kubernetes (namespace: citadelbuy-staging) |
| citadelbuy-production | 2 approvers | Kubernetes (namespace: citadelbuy-prod) |
| citadelbuy-dev-infra | None | None |
| citadelbuy-staging-infra | 1 approver | None |
| citadelbuy-production-infra | 2 approvers | None |

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
az devops configure --defaults organization=https://dev.azure.com/citadelcloudmanagement project=CitadelBuy

# List recent pipeline runs
az pipelines runs list --top 5

# Show specific run
az pipelines runs show --id [RUN_ID]
```

### Troubleshooting

```bash
# Check if images exist in ACR
az acr repository list --name citadelbuyprod --output table

# Check AKS pods
kubectl get pods -n citadelbuy-prod

# View pod logs
kubectl logs -f deployment/citadelbuy-api -n citadelbuy-prod

# Rollback deployment
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-prod
```

### Manual Deployment

```bash
# If pipeline fails, you can manually deploy:

# Build and push image
docker build -t citadelbuyprod.azurecr.io/citadelbuy-api:v2.1.0 -f apps/api/Dockerfile.production .
docker push citadelbuyprod.azurecr.io/citadelbuy-api:v2.1.0

# Update Kubernetes deployment
kubectl set image deployment/citadelbuy-api api=citadelbuyprod.azurecr.io/citadelbuy-api:v2.1.0 -n citadelbuy-prod
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
   kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-prod
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

- **Azure DevOps**: https://dev.azure.com/citadelcloudmanagement/CitadelBuy
- **Pipelines**: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build
- **Releases**: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_release
- **Environments**: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_environments
- **Service Connections**: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_settings/adminservices

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
| Dev | api-dev.citadelbuy.com | dev.citadelbuy.com | wss://api-dev.citadelbuy.com |
| Staging | api-staging.citadelbuy.com | staging.citadelbuy.com | wss://api-staging.citadelbuy.com |
| Production | api.citadelbuy.com | citadelbuy.com | wss://api.citadelbuy.com |

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
