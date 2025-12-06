# CitadelBuy - Azure DevOps Pipelines Documentation

This document provides comprehensive documentation for all Azure DevOps pipelines in the CitadelBuy project.

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Pipeline Descriptions](#pipeline-descriptions)
4. [Setup Instructions](#setup-instructions)
5. [Variable Groups](#variable-groups)
6. [Service Connections](#service-connections)
7. [Environments](#environments)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Migration from GitHub Actions](#migration-from-github-actions)

## Overview

All Azure DevOps pipelines have been converted from GitHub Actions workflows. This directory contains YAML pipeline definitions for CI/CD, security scanning, and deployment automation.

### Pipeline Files

| Pipeline File | Purpose | Trigger |
|---------------|---------|---------|
| `ci-pipeline.yml` | Continuous Integration | Push to main/develop |
| `ci-cd-pipeline.yml` | Full CI/CD with deployment | Push to main/develop |
| `deploy-production.yml` | Production deployment | Push to main |
| `deploy-staging.yml` | Staging deployment | Push to develop |
| `security-scan.yml` | Security vulnerability scanning | Push, PR, Schedule |
| `security-pipeline.yml` | Comprehensive security checks | Push, PR, Schedule |
| `staging-deployment.yml` | Full staging deployment | Push to main/develop |
| `sentry-release.yml` | Sentry release management | Push, Tags |
| `dropshipping-services.yml` | Dropshipping services CI/CD | Path-based triggers |
| `organization-module.yml` | Organization module CI/CD | Path-based triggers |

## Pipeline Architecture

### CI/CD Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Code Push to Git                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼─────┐            ┌─────▼────┐
    │ CI       │            │ Security │
    │ Pipeline │            │ Scanning │
    └────┬─────┘            └──────────┘
         │
    ┌────▼─────┐
    │ Build    │
    │ Docker   │
    │ Images   │
    └────┬─────┘
         │
    ┌────▼─────────┐
    │ Deploy to    │
    │ Staging      │
    └────┬─────────┘
         │
    ┌────▼─────────┐
    │ E2E Tests    │
    └────┬─────────┘
         │
    ┌────▼─────────┐
    │ Deploy to    │
    │ Production   │
    │ (Approval)   │
    └──────────────┘
```

### Stage Breakdown

Most pipelines follow this stage pattern:

1. **Code Quality** - Linting and type checking
2. **Testing** - Unit and integration tests
3. **Security** - Vulnerability scanning
4. **Build** - Compile and package
5. **Deploy** - Environment deployment
6. **Verify** - Post-deployment checks

## Pipeline Descriptions

### 1. CI Pipeline (`ci-pipeline.yml`)

**Purpose:** Standard continuous integration for all code changes

**Stages:**
1. Code Quality (Lint + Type Check)
2. Testing (API + Web tests with services)
3. Security Scanning (Trivy)
4. Build (All packages)
5. Docker Build (main/develop only)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Key Features:**
- Parallel job execution for faster builds
- Service containers (PostgreSQL, Redis)
- Code coverage reporting
- Docker image building for deployable branches

**Usage:**
```bash
# Automatically triggered on push/PR
# Manual trigger:
az pipelines run --name "CI Pipeline" --branch main
```

### 2. Full CI/CD Pipeline (`ci-cd-pipeline.yml`)

**Purpose:** Complete CI/CD with Azure infrastructure deployment

**Stages:**
1. Lint & Type Check
2. Unit Tests
3. Build Docker Images
4. Deploy to Staging (develop branch)
5. Deploy to Production (main branch)
6. E2E Tests (staging only)
7. Terraform (Infrastructure as Code)

**Triggers:**
- Push to `main` or `develop`
- Pull requests

**Parameters:**
- `environment`: Choose deployment target (staging/production)

**Key Features:**
- Azure Container Registry integration
- AKS deployment
- Blue-green deployment for production
- Database migrations
- Terraform infrastructure management

**Usage:**
```bash
# Automatic deployment on push
# Manual deployment with parameter:
az pipelines run --name "CI/CD Pipeline" \
  --parameters environment=production
```

### 3. Production Deployment (`deploy-production.yml`)

**Purpose:** Deploy to production environment

**Stages:**
1. Pre-Deployment Tests
2. Deploy Frontend (Azure Static Web Apps)
3. Deploy Backend (Azure Web App)
4. Post-Deployment Verification

**Triggers:**
- Push to `main` branch only

**Key Features:**
- Pre-deployment test gate
- Parallel frontend/backend deployment
- Health checks
- Rollback capability

**Environment:** Requires `production` environment approval

### 4. Staging Deployment (`deploy-staging.yml`)

**Purpose:** Deploy to staging environment

**Stages:**
1. Pre-Deployment Tests
2. Deploy Frontend
3. Deploy Backend
4. Post-Deployment Verification

**Triggers:**
- Push to `develop` branch

**Key Features:**
- Automated testing before deployment
- No approval required
- Health checks and verification

### 5. Security Scanning (`security-scan.yml`)

**Purpose:** Comprehensive security vulnerability scanning

**Stages:**
1. Dependency Scanning (pnpm audit)
2. Secret Scanning (GitLeaks)
3. SAST Analysis (CodeQL)
4. Snyk Security Scan
5. Dependency Review (PR only)
6. Docker Security (Trivy)
7. License Compliance
8. Security Summary

**Triggers:**
- Push to main/develop
- Pull requests
- Daily schedule (2 AM UTC)

**Key Features:**
- Multiple scanning tools
- Automated vulnerability detection
- License compliance checking
- SARIF report generation

### 6. Security Pipeline (`security-pipeline.yml`)

**Purpose:** Enhanced security checks with additional tools

**Similar to security-scan.yml but includes:**
- ESLint security rules
- Security headers check
- Hardcoded secrets detection
- Additional CI/CD security best practices

### 7. Staging Deployment Pipeline (`staging-deployment.yml`)

**Purpose:** Full-featured staging deployment with K8s

**Stages:**
1. Lint and Test (optional)
2. Build Docker Images
3. Deploy to Staging (K8s)
4. Smoke Tests (optional)
5. Notifications

**Parameters:**
- `skipTests`: Skip linting and tests
- `skipSmokeTests`: Skip post-deployment smoke tests

**Key Features:**
- Kubernetes deployment
- ConfigMaps and Secrets management
- HPA (Horizontal Pod Autoscaling)
- Ingress configuration
- Slack notifications

### 8. Sentry Release (`sentry-release.yml`)

**Purpose:** Create Sentry releases and upload source maps

**Stages:**
1. Backend Release
2. Frontend Release (with source maps)
3. Notifications

**Triggers:**
- Push to main/develop
- Version tags (v*)

**Parameters:**
- `environment`: Target environment

**Key Features:**
- Automatic commit association
- Source map upload for error tracking
- Deployment tracking
- Environment-specific releases

### 9. Dropshipping Services (`dropshipping-services.yml`)

**Purpose:** CI/CD for Python-based dropshipping services

**Stages:**
1. Supplier Integration Tests (Python)
2. AI Engine Tests (Python)
3. Backend Dropshipping Tests (Node.js)
4. Build Docker Images
5. Deploy to Staging
6. Deploy to Production

**Path-based Triggers:**
- `apps/services/supplier-integration/**`
- `apps/services/ai-engine/**`
- `apps/api/src/modules/dropshipping/**`

**Key Features:**
- Python testing (pytest)
- Multi-language support
- Service-specific deployments

### 10. Organization Module (`organization-module.yml`)

**Purpose:** CI/CD for organization/banking modules

**Stages:**
1. Lint Organization Module
2. Test Organization Module
3. Build TypeScript
4. Docker Build
5. Deploy to Staging
6. Deploy to Production

**Path-based Triggers:**
- `apps/api/src/modules/organizations/**`
- `apps/api/src/modules/banking/**`
- `apps/api/src/modules/escrow/**`
- `apps/api/src/modules/compliance/**`

**Key Features:**
- Module-specific testing
- Banking encryption validation
- Compliance checks

## Setup Instructions

### Prerequisites

1. **Azure DevOps Organization**
   - Create or use existing organization
   - Create project for CitadelBuy

2. **Azure Resources**
   - Azure Container Registry
   - Azure Kubernetes Service (AKS)
   - Azure Static Web Apps
   - Azure Web Apps

3. **Service Connections**
   - Azure Resource Manager
   - Container Registry
   - Kubernetes
   - GitHub (for container registry)

### Step-by-Step Setup

#### 1. Import Repository

```bash
# Clone from GitHub
git clone https://github.com/your-org/citadelbuy.git

# Add Azure DevOps remote
git remote add azure https://dev.azure.com/your-org/citadelbuy/_git/citadelbuy

# Push to Azure DevOps
git push azure main
```

#### 2. Create Service Connections

Navigate to **Project Settings** > **Service Connections**

**Azure Resource Manager:**
```
Name: Azure-ServiceConnection
Subscription: [Your Azure Subscription]
Resource Group: citadelbuy-rg
```

**Docker Registry:**
```
Name: DockerHub
Registry: docker.io
Username: [DockerHub username]
Password: [DockerHub token]
```

**GitHub Container Registry:**
```
Name: GitHubContainerRegistry
Registry: ghcr.io
Username: [GitHub username]
Personal Access Token: [GitHub PAT with packages:read/write]
```

**Kubernetes:**
```
Name: Kubernetes-Staging
Authentication: Service Account
KubeConfig: [Your staging cluster config]
```

```
Name: Kubernetes-Production
Authentication: Service Account
KubeConfig: [Your production cluster config]
```

**Snyk:**
```
Name: Snyk
Service URL: https://snyk.io/api
API Token: [Your Snyk API token]
```

**Slack:**
```
Name: SlackWebhook
Webhook URL: [Your Slack webhook URL]
```

#### 3. Create Variable Groups

Navigate to **Pipelines** > **Library** > **Variable Groups**

**Variable Group: citadelbuy-common**
```yaml
NODE_VERSION: '20'
PNPM_VERSION: '8'
AZURE_CONTAINER_REGISTRY: 'citadelbuyacr.azurecr.io'
```

**Variable Group: citadelbuy-staging**
```yaml
STAGING_API_URL: 'https://staging-api.citadelbuy.com'
STAGING_WEB_URL: 'https://staging.citadelbuy.com'
STAGING_DATABASE_URL: '[Encrypted]'
STAGING_POSTGRES_PASSWORD: '[Encrypted]'
STAGING_JWT_SECRET: '[Encrypted]'
STAGING_JWT_REFRESH_SECRET: '[Encrypted]'
STAGING_STRIPE_SECRET_KEY: '[Encrypted]'
STAGING_SENDGRID_API_KEY: '[Encrypted]'
KUBE_CONFIG_STAGING: '[Encrypted]'
```

**Variable Group: citadelbuy-production**
```yaml
PRODUCTION_API_URL: 'https://api.citadelbuy.com'
PRODUCTION_WEB_URL: 'https://citadelbuy.com'
DATABASE_URL_PRODUCTION: '[Encrypted]'
AZURE_WEBAPP_NAME_PRODUCTION: 'citadelbuy-api-prod'
STRIPE_PUBLISHABLE_KEY_LIVE: '[Encrypted]'
KUBE_CONFIG_PRODUCTION: '[Encrypted]'
```

**Variable Group: citadelbuy-security**
```yaml
SENTRY_AUTH_TOKEN: '[Encrypted]'
SENTRY_ORG: 'citadelbuy'
SNYK_TOKEN: '[Encrypted]'
CODECOV_TOKEN: '[Encrypted]'
```

#### 4. Create Environments

Navigate to **Pipelines** > **Environments**

**Staging Environment:**
- Name: `staging`
- Add Kubernetes resource
- No approval required

**Production Environment:**
- Name: `production`
- Add Kubernetes resource
- **Approvals:** Add required approvers
- **Checks:** Add branch control (main only)

#### 5. Create Pipelines

For each pipeline file:

1. Go to **Pipelines** > **New Pipeline**
2. Select **Azure Repos Git**
3. Select your repository
4. Select **Existing Azure Pipelines YAML file**
5. Choose the pipeline file (e.g., `azure-pipelines/ci-pipeline.yml`)
6. Save and run

**Pipeline Names:**
- CI Pipeline
- CI/CD Pipeline
- Deploy to Production
- Deploy to Staging
- Security Scan
- Security Pipeline
- Staging Deployment
- Sentry Release
- Dropshipping Services
- Organization Module

#### 6. Configure Branch Policies

Navigate to **Repos** > **Branches** > **main** > **Branch Policies**

**Build Validation:**
- Add: CI Pipeline (required)
- Add: Security Scan (required)

**Status Checks:**
- Require minimum 1 reviewer
- Check for linked work items
- Check for comment resolution

**Automatically Include Reviewers:**
- Add team leads
- Add code owners

## Variable Groups

### Creating Variable Groups

```bash
# Using Azure CLI
az pipelines variable-group create \
  --organization https://dev.azure.com/your-org \
  --project citadelbuy \
  --name citadelbuy-common \
  --variables NODE_VERSION=20 PNPM_VERSION=8

# Add secret variable
az pipelines variable-group variable create \
  --organization https://dev.azure.com/your-org \
  --project citadelbuy \
  --group-id [group-id] \
  --name DATABASE_URL \
  --value "[secret-value]" \
  --secret true
```

### Linking Variable Groups to Pipelines

In your pipeline YAML:

```yaml
variables:
  - group: citadelbuy-common
  - group: citadelbuy-staging
  - group: citadelbuy-security
```

## Service Connections

### Required Service Connections

1. **Azure-ServiceConnection** (Azure Resource Manager)
   - Used for: AKS, ACR, Azure Web Apps, Static Web Apps
   - Permissions: Contributor on subscription

2. **DockerHub** (Docker Registry)
   - Used for: Public Docker images
   - Credentials: DockerHub account

3. **GitHubContainerRegistry** (Container Registry)
   - Used for: GitHub Container Registry
   - Credentials: GitHub PAT

4. **Kubernetes-Staging** (Kubernetes)
   - Used for: Staging deployments
   - Config: Staging cluster kubeconfig

5. **Kubernetes-Production** (Kubernetes)
   - Used for: Production deployments
   - Config: Production cluster kubeconfig

6. **Snyk** (Generic)
   - Used for: Security scanning
   - Credentials: Snyk API token

7. **SlackWebhook** (Incoming Webhook)
   - Used for: Notifications
   - Credentials: Slack webhook URL

### Creating Service Connections via CLI

```bash
# Azure Resource Manager
az devops service-endpoint azurerm create \
  --organization https://dev.azure.com/your-org \
  --project citadelbuy \
  --name Azure-ServiceConnection \
  --azure-rm-service-principal-id [sp-id] \
  --azure-rm-subscription-id [subscription-id] \
  --azure-rm-subscription-name [subscription-name] \
  --azure-rm-tenant-id [tenant-id]

# Docker Registry
az devops service-endpoint create \
  --organization https://dev.azure.com/your-org \
  --project citadelbuy \
  --service-endpoint-configuration docker-config.json
```

## Environments

### Staging Environment

**Configuration:**
- **Name:** staging
- **Resources:**
  - AKS cluster: citadelbuy-staging-aks
  - Namespace: citadelbuy-staging
- **Approvals:** None (automatic)
- **Checks:** None

### Production Environment

**Configuration:**
- **Name:** production
- **Resources:**
  - AKS cluster: citadelbuy-prod-aks
  - Namespace: citadelbuy-prod
- **Approvals:** Required (2 approvers)
- **Checks:**
  - Branch control (main only)
  - Business hours only
  - Invoke REST API (health check)

### Creating Environments

```bash
# Create environment
az devops environment create \
  --organization https://dev.azure.com/your-org \
  --project citadelbuy \
  --name production

# Add approval
az devops approval create \
  --organization https://dev.azure.com/your-org \
  --project citadelbuy \
  --environment-name production \
  --approvers [user-email]
```

## Best Practices

### 1. Pipeline Organization

- **One pipeline per purpose**: Don't try to do everything in one pipeline
- **Use templates**: Create reusable pipeline templates
- **Path-based triggers**: Only run pipelines when relevant files change
- **Parallel stages**: Run independent stages in parallel

### 2. Security

- **Never commit secrets**: Use variable groups with secret variables
- **Use managed identities**: Prefer managed identities over service principals
- **Scan dependencies**: Run security scans on every build
- **Least privilege**: Grant minimum required permissions

### 3. Performance

- **Cache dependencies**: Use pipeline caching for node_modules
- **Parallel jobs**: Run tests in parallel when possible
- **Incremental builds**: Only build what changed
- **Artifact management**: Clean up old artifacts

### 4. Reliability

- **Health checks**: Always verify deployments
- **Rollback plans**: Document and test rollback procedures
- **Blue-green deployments**: Use for production deployments
- **Smoke tests**: Run after every deployment

### 5. Observability

- **Logging**: Comprehensive logging in pipelines
- **Monitoring**: Monitor pipeline success rates
- **Alerts**: Set up alerts for failures
- **Metrics**: Track deployment frequency and lead time

## Troubleshooting

### Common Issues

#### 1. Pipeline Fails to Authenticate

**Symptom:** "401 Unauthorized" or "403 Forbidden"

**Solutions:**
```bash
# Verify service connection
az devops service-endpoint show \
  --organization https://dev.azure.com/your-org \
  --project citadelbuy \
  --id [service-endpoint-id]

# Refresh service connection
# Go to Project Settings > Service Connections > [Connection] > Edit > Verify
```

#### 2. Kubernetes Deployment Fails

**Symptom:** "Unable to connect to cluster" or "Unauthorized"

**Solutions:**
```bash
# Verify kubeconfig
kubectl cluster-info --kubeconfig [path-to-kubeconfig]

# Update service connection with new kubeconfig
# Project Settings > Service Connections > Kubernetes > Edit
```

#### 3. Docker Build Fails

**Symptom:** "Failed to push image" or "Authentication required"

**Solutions:**
```bash
# Verify Docker registry connection
docker login [registry-url]

# Refresh service connection credentials
# Project Settings > Service Connections > Container Registry > Edit
```

#### 4. Tests Fail in Pipeline but Pass Locally

**Symptom:** Tests pass locally but fail in pipeline

**Solutions:**
```yaml
# Check environment variables
- script: |
    echo "DATABASE_URL: $DATABASE_URL"
    echo "NODE_ENV: $NODE_ENV"
  displayName: 'Debug environment variables'

# Verify service container versions match
services:
  postgres:
    image: postgres:16-alpine  # Match local version
```

#### 5. Slow Pipeline Execution

**Solutions:**
```yaml
# Enable caching
- task: Cache@2
  inputs:
    key: 'pnpm | "$(Agent.OS)" | pnpm-lock.yaml'
    path: '$(PNPM_HOME)/store'

# Use parallel jobs
strategy:
  parallel: 4

# Reduce npm install time
- script: pnpm install --frozen-lockfile --prefer-offline
```

### Debug Mode

Enable debug logging:

```yaml
variables:
  system.debug: true
```

Or via Azure CLI:

```bash
az pipelines run \
  --name "CI Pipeline" \
  --variables system.debug=true
```

### Getting Help

1. **Azure DevOps Documentation**: https://docs.microsoft.com/azure/devops/
2. **Community Forum**: https://developercommunity.visualstudio.com/
3. **Stack Overflow**: Tag questions with `azure-devops`
4. **Internal Team**: Contact DevOps team

## Migration from GitHub Actions

### Key Differences

| Concept | GitHub Actions | Azure Pipelines |
|---------|----------------|-----------------|
| Workflow | workflow | pipeline |
| Job | job | job |
| Step | step | step/task |
| Runner | runs-on | pool/vmImage |
| Action | uses | task |
| Secret | secrets.NAME | $(SECRET_NAME) |
| Environment | environment | environment |
| Artifact | artifact | pipeline artifact |
| Matrix | strategy.matrix | strategy.matrix |

### Syntax Mapping

**GitHub Actions:**
```yaml
on:
  push:
    branches: [main]
```

**Azure Pipelines:**
```yaml
trigger:
  branches:
    include:
      - main
```

**GitHub Actions:**
```yaml
runs-on: ubuntu-latest
```

**Azure Pipelines:**
```yaml
pool:
  vmImage: 'ubuntu-latest'
```

**GitHub Actions:**
```yaml
uses: actions/checkout@v4
```

**Azure Pipelines:**
```yaml
- checkout: self
```

### Migration Checklist

- [ ] Create Azure DevOps project
- [ ] Import Git repository
- [ ] Create service connections
- [ ] Create variable groups
- [ ] Migrate secrets to variable groups
- [ ] Convert workflow files to pipeline files
- [ ] Create environments
- [ ] Configure branch policies
- [ ] Test each pipeline
- [ ] Update documentation
- [ ] Train team on Azure DevOps
- [ ] Decommission GitHub Actions (when ready)

### Automated Conversion Tools

There are community tools to help convert GitHub Actions to Azure Pipelines:

```bash
# Install converter
npm install -g github-actions-to-azure-pipelines

# Convert workflow
gh2az convert .github/workflows/ci.yml -o azure-pipelines/ci-pipeline.yml
```

**Note:** Automated conversion requires manual review and adjustment.

## Additional Resources

### Official Documentation

- [Azure Pipelines Documentation](https://docs.microsoft.com/azure/devops/pipelines/)
- [YAML Schema Reference](https://docs.microsoft.com/azure/devops/pipelines/yaml-schema)
- [Pipeline Tasks](https://docs.microsoft.com/azure/devops/pipelines/tasks/)
- [Expressions](https://docs.microsoft.com/azure/devops/pipelines/process/expressions)

### Tools and Extensions

- [Azure DevOps CLI](https://docs.microsoft.com/azure/devops/cli/)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-azure-devops.azure-pipelines)
- [Pipeline Decorators](https://docs.microsoft.com/azure/devops/extend/develop/add-pipeline-decorator)

### Community Resources

- [Azure DevOps Labs](https://azuredevopslabs.com/)
- [Awesome Azure DevOps](https://github.com/kasuken/awesome-azure-devops)
- [Azure DevOps Blog](https://devblogs.microsoft.com/devops/)

---

**Last Updated:** 2024-12-04
**Maintained By:** CitadelBuy DevOps Team
**Contact:** devops@citadelbuy.com
