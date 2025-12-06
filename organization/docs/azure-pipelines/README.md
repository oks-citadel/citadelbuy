# CitadelBuy - Azure Pipelines Documentation

This directory contains Azure DevOps pipeline configurations for the CitadelBuy platform, replacing the previous GitHub Actions workflows.

## Table of Contents

- [Overview](#overview)
- [Pipeline Structure](#pipeline-structure)
- [Prerequisites](#prerequisites)
- [Azure DevOps Setup](#azure-devops-setup)
- [Pipeline Files](#pipeline-files)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Azure Pipelines setup provides comprehensive CI/CD automation for CitadelBuy, including:

- **Continuous Integration**: Lint, type-check, test, build, and security scanning
- **Continuous Deployment**: Automated deployment to staging and production environments
- **Multi-service support**: Node.js apps (API, Web) and Python services (AI Engine, Supplier Integration)
- **Kubernetes orchestration**: Automated AKS deployments with health checks
- **Rollback capability**: Automated rollback on deployment failures

---

## Pipeline Structure

```
azure-pipelines/
├── ci.yml                          # Main CI pipeline
├── deploy.yml                      # Deployment pipeline
├── templates/
│   ├── build-app.yml              # Reusable Docker build template
│   └── deploy-k8s.yml             # Reusable Kubernetes deploy template
├── variables/
│   ├── common.yml                 # Shared variables
│   ├── dev.yml                    # Development environment
│   ├── staging.yml                # Staging environment
│   └── prod.yml                   # Production environment
└── README.md                      # This file
```

---

## Prerequisites

### Required Azure Resources

1. **Azure DevOps Organization** with a project
2. **Azure Container Registry** (ACR) for Docker images
3. **Azure Kubernetes Service** (AKS) clusters:
   - Development: `citadelbuy-dev-aks`
   - Staging: `citadelbuy-staging-aks`
   - Production: `citadelbuy-prod-aks`
4. **Azure PostgreSQL** databases for each environment
5. **Azure Redis Cache** for each environment
6. **Azure Key Vault** for secrets management

### Required Software/Tools

- Azure CLI (`az`)
- kubectl (Kubernetes CLI)
- Docker
- Node.js 20.x
- Python 3.11
- pnpm 10.23.0

---

## Azure DevOps Setup

### Step 1: Create Service Connections

Navigate to **Project Settings > Service connections** and create:

#### 1. Azure Resource Manager Service Connection
- **Name**: `CitadelBuyAzure`
- **Type**: Service Principal (automatic)
- **Scope**: Subscription
- **Subscription**: Your Azure subscription
- **Resource Group**: Leave blank (access all resource groups)
- **Grant access permission to all pipelines**: ✓

#### 2. Azure Container Registry Service Connection
- **Name**: `CitadelBuyACR`
- **Type**: Docker Registry
- **Registry type**: Azure Container Registry
- **Subscription**: Your Azure subscription
- **Azure container registry**: `citadelbuyacr`
- **Grant access permission to all pipelines**: ✓

### Step 2: Create Variable Groups

Navigate to **Pipelines > Library > Variable groups** and create:

#### Variable Group: `citadelbuy-common`
```yaml
SLACK_WEBHOOK_SECRET: <your-slack-webhook-url>
CODECOV_TOKEN: <your-codecov-token>
```

#### Variable Group: `citadelbuy-staging-secrets`
```yaml
DATABASE_URL: <staging-postgres-connection-string>
REDIS_URL: <staging-redis-connection-string>
JWT_SECRET: <staging-jwt-secret>
STRIPE_SECRET_KEY: <stripe-test-key>
AZURE_STORAGE_CONNECTION_STRING: <staging-storage-connection>
SENDGRID_API_KEY: <sendgrid-api-key>
```

#### Variable Group: `citadelbuy-production-secrets`
```yaml
DATABASE_URL: <production-postgres-connection-string>
REDIS_URL: <production-redis-connection-string>
JWT_SECRET: <production-jwt-secret>
STRIPE_SECRET_KEY: <stripe-live-key>
AZURE_STORAGE_CONNECTION_STRING: <production-storage-connection>
SENDGRID_API_KEY: <sendgrid-api-key>
BANKING_ENCRYPTION_KEY: <32-character-encryption-key>
```

**Important**: Mark all sensitive values as "Secret" by clicking the lock icon.

### Step 3: Create Environments

Navigate to **Pipelines > Environments** and create:

#### 1. Development Environment
- **Name**: `development`
- **Description**: Development environment for testing
- **Approvals**: None

#### 2. Staging Environment
- **Name**: `staging`
- **Description**: Pre-production staging environment
- **Approvals**: None
- **Checks**: Add branch control (main, develop only)

#### 3. Production Environment
- **Name**: `production`
- **Description**: Production environment
- **Approvals**:
  - Add approval gate (minimum 1 approver)
  - Timeout: 24 hours
  - Approvers: DevOps team, Tech leads
- **Checks**:
  - Branch control (main only)
  - Business hours restriction (optional)

### Step 4: Configure Agent Pools

For best performance, configure:

1. **Microsoft-hosted agents**: Use `ubuntu-latest` (default)
2. **Self-hosted agents** (optional):
   - For faster builds with caching
   - Required capabilities: Docker, kubectl, az CLI

### Step 5: Set Up Branch Policies

Configure branch policies for `main` branch:

1. Go to **Repos > Branches**
2. Click `...` on `main` > **Branch policies**
3. Configure:
   - Require a minimum number of reviewers: 2
   - Check for linked work items: Optional
   - Build validation: Add `ci.yml` pipeline
   - Automatically include code reviewers: ✓

---

## Pipeline Files

### ci.yml - Main CI Pipeline

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Stages**:
1. **Lint** - Code quality checks (ESLint, TypeScript)
2. **Test** - Run unit tests for all services
3. **Build** - Build applications and publish artifacts
4. **SecurityScan** - Trivy security scanning
5. **DockerBuild** - Build and push Docker images (main/develop only)

**Parallelization**:
- Lint and TypeCheck run in parallel
- API tests, Web tests, and Python tests run in parallel
- Docker builds for all services run in parallel

### deploy.yml - Deployment Pipeline

**Triggers**:
- Push to `main` branch only

**Stages**:
1. **BuildImages** - Build all Docker images with production settings
2. **DeployStaging** - Deploy to staging environment with smoke tests
3. **DeployProduction** - Deploy to production with approval gate
4. **Rollback** - Automatic rollback on failure

**Features**:
- Blue-green deployment support
- Database migration execution
- Health checks and smoke tests
- Slack notifications
- Automatic rollback on failure

### templates/build-app.yml - Docker Build Template

Reusable template for building Docker images with:
- Multi-stage Docker builds
- Image tagging (build ID, SHA, latest)
- Push to Azure Container Registry
- Trivy security scanning
- Artifact publishing

### templates/deploy-k8s.yml - Kubernetes Deploy Template

Reusable template for Kubernetes deployments with:
- Namespace creation
- ConfigMap and Secret deployment
- Service and Ingress deployment
- Rolling updates
- Pod readiness checks
- Deployment status reporting

---

## Configuration

### Customizing Variables

Edit variable files in `azure-pipelines/variables/`:

- **common.yml**: Node version, pnpm version, agent settings
- **staging.yml**: Staging-specific configuration
- **prod.yml**: Production-specific configuration

### Customizing Build Steps

Edit pipeline templates in `azure-pipelines/templates/`:

- **build-app.yml**: Modify Docker build arguments, tags
- **deploy-k8s.yml**: Modify deployment strategy, health checks

### Adding New Services

To add a new service to the pipeline:

1. Add build job in `ci.yml`:
   ```yaml
   - job: BuildNewService
     steps:
       - template: templates/build-app.yml
         parameters:
           appName: 'new-service'
           dockerfilePath: 'apps/new-service/Dockerfile'
           dockerContext: 'apps/new-service'
           imageName: 'citadelbuy-new-service'
   ```

2. Add deployment in `templates/deploy-k8s.yml`:
   ```yaml
   - task: KubernetesManifest@1
     displayName: 'Deploy New Service'
     inputs:
       manifests: |
         ${{ parameters.manifestPath }}/${{ parameters.environment }}/new-service-deployment.yaml
   ```

---

## Usage

### Running the CI Pipeline

The CI pipeline runs automatically on:
- Every push to `main` or `develop`
- Every pull request to `main` or `develop`

**Manual trigger**:
1. Navigate to **Pipelines**
2. Select `ci` pipeline
3. Click **Run pipeline**
4. Select branch and click **Run**

### Running the Deployment Pipeline

The deployment pipeline runs automatically when code is pushed to `main`.

**Manual trigger**:
1. Navigate to **Pipelines**
2. Select `deploy` pipeline
3. Click **Run pipeline**
4. Select branch (`main`)
5. Click **Run**

**Approval flow**:
1. BuildImages stage completes
2. DeployStaging runs automatically
3. DeployProduction requires manual approval
4. Approver receives notification
5. After approval, production deployment proceeds

### Monitoring Pipeline Runs

1. Navigate to **Pipelines**
2. Click on pipeline run
3. View stages, jobs, and tasks
4. Click on task for detailed logs
5. View test results in **Tests** tab
6. View code coverage in **Code Coverage** tab

### Checking Deployment Status

After deployment:

1. **View Kubernetes resources**:
   ```bash
   az aks get-credentials --resource-group citadelbuy-prod-rg --name citadelbuy-prod-aks
   kubectl get pods -n citadelbuy-prod
   kubectl get svc -n citadelbuy-prod
   kubectl get ingress -n citadelbuy-prod
   ```

2. **Check application health**:
   ```bash
   curl https://citadelbuy.com/api/health
   ```

3. **View logs**:
   ```bash
   kubectl logs -l app=api -n citadelbuy-prod --tail=100
   ```

---

## Troubleshooting

### Common Issues

#### 1. Pipeline Fails at Docker Build

**Error**: `docker: permission denied`

**Solution**:
- Ensure Azure Container Registry service connection is configured
- Verify ACR credentials are valid
- Check that pipeline has access to ACR service connection

#### 2. Kubernetes Deployment Fails

**Error**: `Unable to connect to the server`

**Solution**:
- Verify AKS cluster is running
- Check Azure service connection has access to AKS resource group
- Ensure kubectl version is compatible

#### 3. Database Migration Fails

**Error**: `Connection refused` or `timeout`

**Solution**:
- Verify DATABASE_URL in variable group is correct
- Check database firewall rules allow AKS cluster IP
- Ensure database is running and accessible

#### 4. Tests Fail with Service Connection Issues

**Error**: `PostgreSQL service not available`

**Solution**:
- Check service container configuration
- Verify port mappings (5432 for PostgreSQL, 6379 for Redis)
- Ensure sufficient time for service containers to start

#### 5. Image Push Fails

**Error**: `unauthorized: authentication required`

**Solution**:
- Regenerate ACR service connection
- Verify ACR service connection name matches pipeline variable
- Check ACR admin user is enabled (if using admin credentials)

### Debug Mode

Enable verbose logging:

1. Edit pipeline YAML
2. Add system diagnostic variable:
   ```yaml
   variables:
     system.debug: true
   ```
3. Re-run pipeline

### Getting Help

- **Azure DevOps Docs**: https://docs.microsoft.com/azure/devops/
- **Azure Pipelines**: https://docs.microsoft.com/azure/devops/pipelines/
- **Kubernetes**: https://kubernetes.io/docs/
- **Internal**: Contact DevOps team on Slack #devops-support

---

## Best Practices

### Security

1. **Never commit secrets**: Use Azure Key Vault or Variable Groups
2. **Use managed identities**: Prefer managed identities over service principals
3. **Rotate credentials**: Regularly rotate secrets and connection strings
4. **Scan images**: Enable Trivy scanning for all images
5. **Limit permissions**: Grant minimum required permissions to service connections

### Performance

1. **Use caching**: Enable pnpm and pip caching for faster builds
2. **Parallel jobs**: Run independent jobs in parallel
3. **Self-hosted agents**: Consider self-hosted agents for better performance
4. **Docker layer caching**: Use BuildKit and cache layers

### Reliability

1. **Health checks**: Always implement health checks for deployments
2. **Rollback strategy**: Test rollback procedures regularly
3. **Monitoring**: Set up alerts for pipeline failures
4. **Testing**: Maintain high test coverage (>80%)
5. **Staging first**: Always deploy to staging before production

### Maintenance

1. **Keep pipelines DRY**: Use templates for reusable steps
2. **Version control**: Track all pipeline changes in git
3. **Documentation**: Keep this README updated
4. **Regular reviews**: Review and optimize pipelines quarterly

---

## Migration from GitHub Actions

Key differences from GitHub Actions:

| GitHub Actions | Azure Pipelines |
|---------------|----------------|
| `.github/workflows/` | `azure-pipelines/` |
| `jobs` | `jobs` (same) |
| `steps` | `steps` (same) |
| `uses: actions/...` | `task: ...@N` |
| `secrets.SECRET_NAME` | `$(SECRET_NAME)` from Variable Groups |
| `env:` | `variables:` |
| Environment secrets | Variable Groups + Environments |

### Migration Checklist

- [x] Create Azure DevOps project
- [x] Set up service connections
- [x] Create variable groups with secrets
- [x] Configure environments with approvals
- [x] Create CI pipeline
- [x] Create deployment pipeline
- [x] Test CI pipeline with PR
- [x] Test deployment to staging
- [x] Test deployment to production
- [x] Set up notifications
- [ ] Disable GitHub Actions
- [ ] Update team documentation
- [ ] Train team on Azure Pipelines

---

## Support

For issues or questions:
- **DevOps Team**: devops@citadelbuy.com
- **Slack**: #devops-support
- **Documentation**: https://docs.citadelbuy.com/devops

---

**Last Updated**: 2025-12-02
**Version**: 1.0.0
**Maintainer**: CitadelBuy DevOps Team
