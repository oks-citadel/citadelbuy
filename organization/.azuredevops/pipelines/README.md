# CitadelBuy Azure Pipelines Documentation

This directory contains all Azure DevOps pipeline configurations for the CitadelBuy platform.

## Table of Contents

- [Overview](#overview)
- [Pipeline Files](#pipeline-files)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Variable Groups Configuration](#variable-groups-configuration)
- [Service Connections](#service-connections)
- [Environments Setup](#environments-setup)
- [Pipeline Usage](#pipeline-usage)
- [Troubleshooting](#troubleshooting)

## Overview

CitadelBuy uses Azure Pipelines for continuous integration and deployment across multiple environments (dev, staging, production). The pipeline architecture follows best practices with:

- **Automated CI/CD**: Continuous integration on pull requests and continuous deployment on merge
- **Multi-environment deployment**: Dev → Staging → Production progression
- **Security scanning**: Automated vulnerability scanning and dependency auditing
- **Approval gates**: Manual approval required for production deployments
- **Canary deployments**: Gradual rollout to production (25% → 100%)
- **Rollback capabilities**: Quick rollback in case of deployment issues

## Pipeline Files

### 1. `ci-main.yml` - Continuous Integration Pipeline

**Purpose**: Runs on every pull request to validate code quality

**Triggers**:
- Pull requests to `main`, `master`, or `develop` branches

**Stages**:
1. **Code Quality**: Linting, type checking, security scanning
2. **Build & Test**: Run unit tests, integration tests, build all apps
3. **Report**: Generate and publish test results and coverage reports

**Usage**:
```bash
# Automatically triggered on PR creation
# View results in Azure DevOps → Pipelines → CI-Main
```

### 2. `cd-api.yml` - API Deployment Pipeline

**Purpose**: Builds and deploys the NestJS API to AKS

**Triggers**:
- Push to `main`, `master`, or `develop` branches
- Changes in `apps/api/**` or `packages/**`

**Stages**:
1. **Build**: Build Docker image and push to ACR
2. **Deploy Dev**: Automatic deployment to development
3. **Deploy Staging**: Deployment to staging (requires dev success)
4. **Deploy Production**: Canary deployment to production (requires staging success)

**Key Features**:
- Database migrations
- Health checks after deployment
- Canary deployment strategy (25% → 100%)
- Smoke tests

### 3. `cd-web.yml` - Web Frontend Deployment Pipeline

**Purpose**: Builds and deploys the Next.js web application

**Triggers**:
- Push to `main`, `master`, or `develop` branches
- Changes in `apps/web/**` or `packages/**`

**Stages**:
1. **Build**: Build Next.js standalone output
2. **Deploy Dev**: Deploy to development
3. **Deploy Staging**: Deploy to staging with E2E tests
4. **Deploy Production**: Canary deployment with CDN cache purge

**Key Features**:
- Next.js optimized builds
- Playwright E2E tests on staging
- Lighthouse performance checks
- CDN cache purging

### 4. `cd-services.yml` - Python Services Deployment

**Purpose**: Deploys all Python microservices (AI agents, inventory, media, notification, personalization)

**Triggers**:
- Push to `main`, `master`, or `develop` branches
- Changes in `apps/services/**`

**Stages**:
1. **Build Services**: Build all Python service Docker images in parallel
2. **Deploy Dev**: Deploy all services to development
3. **Deploy Staging**: Deploy to staging
4. **Deploy Production**: Canary deployment

**Services Included**:
- AI Agents Service
- Inventory Service
- Media Service
- Notification Service
- Personalization Service

### 5. `infrastructure.yml` - Infrastructure Pipeline

**Purpose**: Manages infrastructure as code using Terraform

**Triggers**:
- Push to `main` or `master` branches
- Changes in `infrastructure/terraform/**`
- Pull requests (validation only)

**Stages**:
1. **Validate**: Terraform validation and security scanning
2. **Plan Dev**: Create Terraform plan for dev
3. **Apply Dev**: Apply infrastructure changes to dev
4. **Plan Staging**: Create plan for staging
5. **Apply Staging**: Apply to staging
6. **Plan Production**: Create plan for production
7. **Apply Production**: Apply to production (requires manual approval)

**Key Features**:
- Terraform state backup
- Checkov security scanning
- Approval gates for production
- Infrastructure drift detection

### 6. `release-pipeline.yml` - Coordinated Release Pipeline

**Purpose**: Orchestrates deployment of all components in a coordinated manner

**Trigger**: Manual only

**Parameters**:
- `deployEnvironment`: Target environment (dev/staging/production)
- `deployAPI`: Deploy API (true/false)
- `deployWeb`: Deploy Web (true/false)
- `deployServices`: Deploy Services (true/false)
- `runMigrations`: Run database migrations (true/false)
- `version`: Release version

**Stages**:
1. **Pre-Deployment**: Health checks, backups, validation
2. **Deploy Migrations**: Run database migrations
3. **Deploy API**: Deploy backend API
4. **Deploy Web**: Deploy frontend
5. **Deploy Services**: Deploy Python services
6. **Promote Canary**: Promote to 100% traffic (production only)
7. **Post-Deployment**: Final validation and reporting

## Prerequisites

Before setting up the pipelines, ensure you have:

1. **Azure DevOps Organization**: `citadelcloudmanagement`
2. **Azure DevOps Project**: `CitadelBuy`
3. **Azure Subscription**: Active subscription with sufficient credits
4. **Azure Resources**:
   - Azure Kubernetes Service (AKS) clusters for dev, staging, production
   - Azure Container Registry (ACR)
   - Azure Storage Account (for Terraform state)
   - Azure Key Vault (for secrets)
5. **Permissions**:
   - Project Administrator in Azure DevOps
   - Contributor or Owner on Azure subscription

## Initial Setup

### Step 1: Import Repository

1. Navigate to https://dev.azure.com/citadelcloudmanagement/CitadelBuy
2. Go to **Repos** → **Files**
3. If repository doesn't exist:
   - Click **Initialize** or **Import repository**
   - Import from your Git repository URL

### Step 2: Create Service Connections

#### Azure Resource Manager Connection

1. Go to **Project Settings** → **Service connections**
2. Click **New service connection**
3. Select **Azure Resource Manager**
4. Choose **Service principal (automatic)**
5. Configure:
   - **Connection name**: `citadelbuy-azure-connection`
   - **Scope level**: Subscription
   - **Subscription**: Select your Azure subscription
   - **Resource group**: Leave empty for subscription-level access
6. Click **Save**

#### Azure Container Registry Connection

1. Click **New service connection**
2. Select **Docker Registry**
3. Choose **Azure Container Registry**
4. Configure:
   - **Connection name**: `citadelbuy-acr-connection`
   - **Azure subscription**: Select subscription
   - **Azure container registry**: Select your ACR
5. Click **Save**

#### Kubernetes Service Connections

Create three separate connections for each environment:

**Development:**
1. New service connection → **Kubernetes**
2. Configure:
   - **Connection name**: `citadelbuy-aks-dev`
   - **Server URL**: Your dev AKS API server URL
   - **Authentication**: Service Account or Azure Subscription
3. Click **Save**

**Staging:**
- **Connection name**: `citadelbuy-aks-staging`
- Follow same process as dev

**Production:**
- **Connection name**: `citadelbuy-aks-production`
- Follow same process as dev

### Step 3: Create Variable Groups

Go to **Pipelines** → **Library** → **+ Variable group**

#### Common Variables: `citadelbuy-common`

```yaml
Variables:
  - DOCKER_BUILDKIT: 1
  - NODE_ENV: production
  - PNPM_VERSION: 10.23.0
  - TERRAFORM_VERSION: 1.6.0
```

#### ACR Variables: `citadelbuy-acr`

```yaml
Variables:
  - ACR_NAME: citadelbuyprod
  - ACR_LOGIN_SERVER: citadelbuyprod.azurecr.io
```

#### Development Variables: `citadelbuy-dev`

```yaml
Variables:
  - ENVIRONMENT: dev
  - API_URL: https://api-dev.citadelbuy.com
  - WEB_URL: https://dev.citadelbuy.com
  - DATABASE_URL: [Link to Azure Key Vault secret]
  - NEXT_PUBLIC_API_URL: https://api-dev.citadelbuy.com
  - NEXT_PUBLIC_WS_URL: wss://api-dev.citadelbuy.com
  - STRIPE_PUBLISHABLE_KEY: [Link to Key Vault]
  - SENTRY_DSN: [Link to Key Vault]
```

**Important**: Link sensitive variables to Azure Key Vault:
1. Click **Link secrets from an Azure key vault**
2. Select your Azure subscription
3. Select your Key Vault
4. Add secrets

#### Staging Variables: `citadelbuy-staging`

```yaml
Variables:
  - ENVIRONMENT: staging
  - API_URL: https://api-staging.citadelbuy.com
  - WEB_URL: https://staging.citadelbuy.com
  - DATABASE_URL: [Link to Azure Key Vault]
  - NEXT_PUBLIC_API_URL: https://api-staging.citadelbuy.com
  - NEXT_PUBLIC_WS_URL: wss://api-staging.citadelbuy.com
  - STRIPE_PUBLISHABLE_KEY: [Link to Key Vault]
  - SENTRY_DSN: [Link to Key Vault]
```

#### Production Variables: `citadelbuy-production`

```yaml
Variables:
  - ENVIRONMENT: production
  - API_URL: https://api.citadelbuy.com
  - WEB_URL: https://citadelbuy.com
  - DATABASE_URL: [Link to Azure Key Vault]
  - NEXT_PUBLIC_API_URL: https://api.citadelbuy.com
  - NEXT_PUBLIC_WS_URL: wss://api.citadelbuy.com
  - STRIPE_PUBLISHABLE_KEY: [Link to Key Vault]
  - STRIPE_SECRET_KEY: [Link to Key Vault]
  - SENTRY_DSN: [Link to Key Vault]
  - SENTRY_AUTH_TOKEN: [Link to Key Vault]
```

#### Terraform Variables: `citadelbuy-terraform`

```yaml
Variables:
  - TF_BACKEND_RG: citadelbuy-terraform-state
  - TF_BACKEND_SA: citadelbuytfstate
  - TF_BACKEND_CONTAINER: tfstate
  - ARM_SUBSCRIPTION_ID: [Your Azure subscription ID]
  - ARM_TENANT_ID: [Your Azure tenant ID]
  - ARM_CLIENT_ID: [Link to Key Vault]
  - ARM_CLIENT_SECRET: [Link to Key Vault]
```

#### CI Variables: `citadelbuy-ci-variables`

```yaml
Variables:
  - NODE_VERSION: 20.x
  - PYTHON_VERSION: 3.11
  - BUILD_TIMEOUT: 30
```

### Step 4: Create Environments

Go to **Pipelines** → **Environments** → **New environment**

#### Development Environment

1. **Name**: `citadelbuy-dev`
2. **Resource**: Kubernetes
3. **Kubernetes resource**:
   - Service connection: `citadelbuy-aks-dev`
   - Namespace: `citadelbuy-dev`
4. **Approvals**: None (automatic deployment)

#### Staging Environment

1. **Name**: `citadelbuy-staging`
2. **Resource**: Kubernetes
3. **Kubernetes resource**:
   - Service connection: `citadelbuy-aks-staging`
   - Namespace: `citadelbuy-staging`
4. **Approvals**:
   - Add approval: Select team members
   - Required approvers: 1
   - Timeout: 7 days

#### Production Environment

1. **Name**: `citadelbuy-production`
2. **Resource**: Kubernetes
3. **Kubernetes resource**:
   - Service connection: `citadelbuy-aks-production`
   - Namespace: `citadelbuy-prod`
4. **Approvals**:
   - Required approvers: 2 (minimum)
   - Timeout: 7 days
   - Instructions: "Please verify staging deployment and test results before approving"

#### Infrastructure Environments

Create separate environments for infrastructure:
- `citadelbuy-dev-infra`
- `citadelbuy-staging-infra`
- `citadelbuy-production-infra` (with strict approvals)

### Step 5: Create Pipelines

#### Create CI Pipeline

1. Go to **Pipelines** → **New pipeline**
2. Select **Azure Repos Git**
3. Select your repository
4. Choose **Existing Azure Pipelines YAML file**
5. Path: `/.azuredevops/pipelines/ci-main.yml`
6. Click **Continue** → **Save**
7. Rename to: **CI - Main**

#### Create CD Pipelines

Repeat the process for each CD pipeline:

1. **CD - API**
   - Path: `/.azuredevops/pipelines/cd-api.yml`

2. **CD - Web**
   - Path: `/.azuredevops/pipelines/cd-web.yml`

3. **CD - Services**
   - Path: `/.azuredevops/pipelines/cd-services.yml`

4. **Infrastructure**
   - Path: `/.azuredevops/pipelines/infrastructure.yml`

5. **Release Pipeline**
   - Path: `/.azuredevops/pipelines/release-pipeline.yml`

### Step 6: Configure Branch Policies

1. Go to **Repos** → **Branches**
2. Click on **main** branch → **Branch policies**
3. Enable:
   - **Require a minimum number of reviewers**: 1 (or 2 for production)
   - **Check for linked work items**: Optional
   - **Check for comment resolution**: Recommended
4. Under **Build Validation**:
   - Add **CI - Main** pipeline
   - Trigger: Automatic
   - Policy requirement: Required
   - Build expiration: 12 hours

## Pipeline Usage

### Running CI Pipeline

The CI pipeline runs automatically on every pull request:

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to Azure Repos
git push origin feature/my-feature

# 4. Create pull request in Azure DevOps
# The CI pipeline will automatically run
```

### Deploying to Development

Development deployments are automatic when changes are pushed to `develop` branch:

```bash
# Merge to develop branch
git checkout develop
git merge feature/my-feature
git push origin develop

# CD pipelines will automatically deploy to dev
```

### Deploying to Staging/Production

Staging and production deployments trigger on merge to `main`:

```bash
# 1. Create PR from develop to main
# 2. Wait for CI pipeline to pass
# 3. Get required approvals
# 4. Merge PR

# CD pipelines will:
# - Deploy to staging automatically
# - Wait for staging approval
# - Deploy to production after approval
```

### Manual Release

For coordinated releases, use the Release Pipeline:

1. Go to **Pipelines** → **Release Pipeline**
2. Click **Run pipeline**
3. Select parameters:
   - **Environment**: production
   - **Deploy API**: true
   - **Deploy Web**: true
   - **Deploy Services**: true
   - **Run Migrations**: true (if needed)
   - **Version**: v2.1.0
4. Click **Run**
5. Monitor progress
6. Approve production deployment when prompted

### Rollback Procedure

If a deployment fails or causes issues:

**Option 1: Automatic Rollback (Kubernetes)**
```bash
# Connect to AKS
az aks get-credentials --resource-group citadelbuy-prod --name citadelbuy-aks-prod

# Rollback deployment
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-prod
kubectl rollout undo deployment/citadelbuy-web -n citadelbuy-prod
```

**Option 2: Redeploy Previous Version**
1. Find the last successful pipeline run
2. Go to **Pipelines** → **Release Pipeline**
3. Click **Run pipeline**
4. Use the previous version number
5. Deploy

**Option 3: Emergency Rollback**
```bash
# Tag previous working commit
git tag -a v2.0.9-rollback -m "Emergency rollback"
git push origin v2.0.9-rollback

# Run release pipeline with rollback version
```

## Troubleshooting

### Common Issues

#### 1. Pipeline Fails on Docker Build

**Error**: `Cannot connect to Docker daemon`

**Solution**:
```yaml
# Add to pipeline YAML
variables:
  - name: DOCKER_BUILDKIT
    value: 1

# Or use Azure DevOps hosted agents
pool:
  vmImage: 'ubuntu-latest'
```

#### 2. Kubernetes Deployment Fails

**Error**: `ImagePullBackOff`

**Solution**:
- Verify ACR connection is configured
- Check image tag exists in ACR
- Ensure Kubernetes has ACR pull permissions

```bash
# Verify image exists
az acr repository show-tags --name citadelbuyprod --repository citadelbuy-api

# Grant AKS pull access
az aks update -n citadelbuy-aks-prod -g citadelbuy-prod --attach-acr citadelbuyprod
```

#### 3. Environment Variables Not Loading

**Error**: `Environment variable X is not defined`

**Solution**:
- Verify variable group is linked to pipeline
- Check variable is not marked as secret (if it should be accessible)
- Ensure Key Vault connection is configured

#### 4. Tests Fail Due to Missing Dependencies

**Error**: `Cannot find module 'X'`

**Solution**:
```yaml
# Ensure pnpm install runs before tests
- script: |
    npm install -g pnpm@10.23.0
    pnpm install --frozen-lockfile
  displayName: 'Install Dependencies'
```

#### 5. Terraform State Lock

**Error**: `Error locking state`

**Solution**:
```bash
# Force unlock (use with caution)
az storage blob lease break \
  --account-name citadelbuytfstate \
  --container-name tfstate \
  --blob-name prod.tfstate
```

### Pipeline Logs

Access detailed logs:

1. Go to **Pipelines** → Select pipeline
2. Click on the run
3. Click on the stage/job
4. View detailed logs

Download logs:
```bash
# Using Azure DevOps CLI
az pipelines runs show --id [RUN_ID] --open
```

### Getting Help

- **Azure DevOps Documentation**: https://docs.microsoft.com/azure/devops
- **Terraform Documentation**: https://www.terraform.io/docs
- **Kubernetes Documentation**: https://kubernetes.io/docs

## Security Best Practices

1. **Never commit secrets**: Always use Azure Key Vault
2. **Enable branch protection**: Require PR reviews
3. **Use service principals**: Don't use personal accounts for pipelines
4. **Enable audit logging**: Track all pipeline runs
5. **Rotate secrets regularly**: Update Key Vault secrets quarterly
6. **Scan for vulnerabilities**: Use Checkov and Trivy
7. **Implement RBAC**: Use least-privilege access

## Maintenance

### Regular Tasks

**Weekly**:
- Review failed pipeline runs
- Check for outdated dependencies
- Monitor resource usage

**Monthly**:
- Update pipeline agents
- Review and update variable groups
- Check for Azure DevOps updates

**Quarterly**:
- Rotate secrets and service principals
- Review and update approval gates
- Update Terraform version
- Security audit of all pipelines

## Additional Resources

- [Azure Pipelines YAML Schema](https://docs.microsoft.com/azure/devops/pipelines/yaml-schema)
- [Kubernetes Manifest Task](https://docs.microsoft.com/azure/devops/pipelines/tasks/deploy/kubernetes-manifest)
- [Terraform Task](https://marketplace.visualstudio.com/items?itemName=ms-devlabs.custom-terraform-tasks)
- [Container Registry Integration](https://docs.microsoft.com/azure/devops/pipelines/ecosystems/containers/acr-template)

## Support

For issues or questions:
1. Check this documentation
2. Review Azure DevOps logs
3. Contact DevOps team
4. Create ticket in Azure Boards

---

**Last Updated**: 2025-12-06
**Version**: 1.0.0
**Maintained by**: CitadelBuy DevOps Team
