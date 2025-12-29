# CitadelBuy Azure Pipelines - Complete Index

## Quick Navigation

- [Getting Started](#getting-started)
- [Pipeline Files](#pipeline-files)
- [Documentation](#documentation)
- [Templates](#templates)
- [Configuration](#configuration)

## Getting Started

### For New Users
1. Start with [QUICK_START.md](./QUICK_START.md) - 30-minute setup guide
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the system design
3. Read [README.md](./README.md) - Comprehensive documentation

### For Developers
- Daily workflow: [QUICK_START.md - Daily Workflow](./QUICK_START.md#daily-workflow)
- Troubleshooting: [README.md - Troubleshooting](./README.md#troubleshooting)
- Emergency procedures: [QUICK_START.md - Emergency Procedures](./QUICK_START.md#emergency-procedures)

### For DevOps Engineers
- Setup guide: [README.md - Initial Setup](./README.md#initial-setup)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Maintenance: [README.md - Maintenance](./README.md#maintenance)

## Pipeline Files

### Main Pipelines

#### 1. ci-main.yml
**Purpose**: Continuous Integration for pull requests
**Triggers**: PR to main/master/develop
**Duration**: ~8-12 minutes
**Key Features**:
- Linting and type checking
- Security scanning
- Unit and integration tests
- Build validation
- Test result publishing

**When to use**: Automatically runs on every PR

---

#### 2. cd-api.yml
**Purpose**: Deploy NestJS API to AKS
**Triggers**: Push to main/develop, changes in apps/api
**Duration**: ~10-15 minutes
**Environments**: dev → staging → production
**Key Features**:
- Docker image build and push
- Database migrations
- Canary deployments (production)
- Health checks
- Smoke tests

**When to use**: Automatically triggered on merge to main/develop

---

#### 3. cd-web.yml
**Purpose**: Deploy Next.js web frontend to AKS
**Triggers**: Push to main/develop, changes in apps/web
**Duration**: ~12-18 minutes
**Environments**: dev → staging → production
**Key Features**:
- Next.js optimized builds
- E2E tests with Playwright
- Lighthouse performance checks
- CDN cache purging
- Canary deployments

**When to use**: Automatically triggered on merge to main/develop

---

#### 4. cd-services.yml
**Purpose**: Deploy Python microservices to AKS
**Triggers**: Push to main/develop, changes in apps/services
**Duration**: ~15-20 minutes
**Services Deployed**:
- AI Agents
- Inventory
- Media
- Notification
- Personalization

**Key Features**:
- Parallel builds
- Multi-service orchestration
- Health monitoring

**When to use**: Automatically triggered on merge to main/develop

---

#### 5. infrastructure.yml
**Purpose**: Terraform-based infrastructure management
**Triggers**: Push to main, changes in infrastructure/terraform
**Duration**: ~5-10 minutes per environment
**Environments**: dev → staging → production
**Key Features**:
- Terraform validation
- Checkov security scanning
- State backup
- Approval gates (production)
- Infrastructure drift detection

**When to use**:
- Automatically on Terraform changes
- Manual trigger for infrastructure updates

---

#### 6. release-pipeline.yml
**Purpose**: Coordinated release orchestration
**Triggers**: Manual only
**Duration**: ~25-40 minutes
**Key Features**:
- Parameterized deployments
- Pre/post deployment validation
- Database migration management
- Canary promotion
- Rollback capabilities

**When to use**:
- Coordinated releases
- Production hotfixes
- Emergency deployments

## Documentation

### README.md (950 lines)
**Comprehensive setup and reference guide**

Sections:
- [Overview](./README.md#overview)
- [Pipeline Files](./README.md#pipeline-files)
- [Prerequisites](./README.md#prerequisites)
- [Initial Setup](./README.md#initial-setup)
- [Variable Groups Configuration](./README.md#variable-groups-configuration)
- [Service Connections](./README.md#service-connections)
- [Environments Setup](./README.md#environments-setup)
- [Pipeline Usage](./README.md#pipeline-usage)
- [Troubleshooting](./README.md#troubleshooting)
- [Security Best Practices](./README.md#security-best-practices)
- [Maintenance](./README.md#maintenance)

**When to use**: Complete reference for setup and configuration

---

### QUICK_START.md (450 lines)
**30-minute setup guide**

Sections:
- [Prerequisites Checklist](./QUICK_START.md#prerequisites-checklist)
- [5-Minute Setup](./QUICK_START.md#5-minute-setup)
- [Daily Workflow](./QUICK_START.md#daily-workflow)
- [Common Commands](./QUICK_START.md#common-commands)
- [Troubleshooting](./QUICK_START.md#troubleshooting)
- [Emergency Procedures](./QUICK_START.md#emergency-procedures)
- [Key URLs](./QUICK_START.md#key-urls)

**When to use**: First-time setup or quick reference

---

### ARCHITECTURE.md
**System architecture and design**

Sections:
- System Architecture Diagram
- Azure Resources Architecture
- Pipeline Dependencies
- Data Flow
- Security Flow
- High Availability Setup
- Monitoring and Observability

**When to use**: Understanding system design and architecture

---

### PIPELINE_SUMMARY.md
**Executive summary and statistics**

Sections:
- Overview
- Files Created
- Architecture
- Key Features
- Pipeline Statistics
- Variable Groups Summary
- Service Connections Required
- Deployment Strategy
- Best Practices Implemented

**When to use**: Project overview and metrics

## Templates

### templates/setup-node.yml
**Reusable Node.js and pnpm setup**

Parameters:
- `nodeVersion`: Node.js version (default: 20.x)
- `pnpmVersion`: pnpm version (default: 10.23.0)
- `enableCache`: Enable dependency caching (default: true)

Usage:
```yaml
steps:
  - template: templates/setup-node.yml
    parameters:
      nodeVersion: '20.x'
      pnpmVersion: '10.23.0'
      enableCache: true
```

---

### templates/docker-build-push.yml
**Reusable Docker build and push**

Parameters:
- `dockerfilePath`: Path to Dockerfile
- `imageRepository`: Image repository name
- `containerRegistry`: Registry URL
- `acrConnection`: ACR service connection
- `buildArgs`: Build arguments
- `tags`: Image tags

Usage:
```yaml
steps:
  - template: templates/docker-build-push.yml
    parameters:
      dockerfilePath: '$(Build.SourcesDirectory)/apps/api/Dockerfile.production'
      imageRepository: 'citadelbuy-api'
      tags:
        - '$(Build.BuildNumber)'
        - 'latest'
```

---

### templates/deploy-to-aks.yml
**Reusable AKS deployment**

Parameters:
- `environment`: Target environment (dev/staging/production)
- `namespace`: Kubernetes namespace
- `aksConnection`: AKS service connection
- `manifests`: List of manifest files
- `containerImage`: Container image to deploy
- `useCanary`: Enable canary deployment
- `canaryPercentage`: Canary traffic percentage

Usage:
```yaml
steps:
  - template: templates/deploy-to-aks.yml
    parameters:
      environment: 'production'
      namespace: 'citadelbuy-prod'
      aksConnection: 'citadelbuy-aks-production'
      useCanary: true
      canaryPercentage: 25
```

---

### templates/smoke-tests.yml
**Reusable smoke tests**

Parameters:
- `environment`: Target environment
- `endpoints`: List of endpoints to test

Usage:
```yaml
steps:
  - template: templates/smoke-tests.yml
    parameters:
      environment: 'production'
      endpoints:
        - path: '/api/health'
          expectedStatus: 200
        - path: '/api'
          expectedStatus: 200
```

## Configuration

### Variable Groups

| Group Name | Purpose | Environment |
|-----------|---------|-------------|
| citadelbuy-common | Shared settings | All |
| citadelbuy-acr | Container registry | All |
| citadelbuy-dev | Development config | Dev |
| citadelbuy-staging | Staging config | Staging |
| citadelbuy-production | Production config | Production |
| citadelbuy-terraform | Infrastructure config | All |
| citadelbuy-ci-variables | CI settings | CI only |

See [README.md - Variable Groups](./README.md#variable-groups-configuration) for details.

---

### Service Connections

| Connection Name | Type | Purpose |
|----------------|------|---------|
| citadelbuy-azure-connection | Azure RM | Azure resource management |
| citadelbuy-acr-connection | Docker Registry | Container image push/pull |
| citadelbuy-aks-dev | Kubernetes | Dev cluster deployment |
| citadelbuy-aks-staging | Kubernetes | Staging cluster deployment |
| citadelbuy-aks-production | Kubernetes | Production cluster deployment |

See [README.md - Service Connections](./README.md#service-connections) for setup.

---

### Environments

| Environment | Approvers | Namespace | URL |
|------------|-----------|-----------|-----|
| citadelbuy-dev | 0 (auto) | citadelbuy-dev | dev.citadelbuy.com |
| citadelbuy-staging | 1 | citadelbuy-staging | staging.citadelbuy.com |
| citadelbuy-production | 2 | citadelbuy-prod | citadelbuy.com |

See [README.md - Environments](./README.md#environments-setup) for configuration.

## Quick Reference

### Common Tasks

| Task | Command/Action |
|------|----------------|
| Create PR | Azure DevOps → Repos → New Pull Request |
| Run CI Pipeline | Automatic on PR creation |
| Deploy to Dev | Merge to develop branch |
| Deploy to Staging | Merge to main branch |
| Deploy to Production | Approve staging deployment |
| Manual Release | Pipelines → Release Pipeline → Run |
| Rollback | `kubectl rollout undo deployment/[name]` |
| Check Logs | Pipelines → Select run → View logs |

### URLs

| Resource | URL |
|---------|-----|
| Azure DevOps | https://dev.azure.com/citadelcloudmanagement/CitadelBuy |
| Pipelines | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build |
| Environments | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_environments |
| Dev Site | https://dev.citadelbuy.com |
| Staging Site | https://staging.citadelbuy.com |
| Production Site | https://citadelbuy.com |

### Support

| Issue Type | Action |
|-----------|--------|
| Pipeline failing | Check [Troubleshooting](./README.md#troubleshooting) |
| Setup questions | Read [QUICK_START.md](./QUICK_START.md) |
| Architecture questions | Review [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Emergency | Follow [Emergency Procedures](./QUICK_START.md#emergency-procedures) |

## File Structure

```
.azuredevops/pipelines/
├── ci-main.yml                      # Main CI pipeline
├── cd-api.yml                       # API deployment pipeline
├── cd-web.yml                       # Web deployment pipeline
├── cd-services.yml                  # Services deployment pipeline
├── infrastructure.yml               # Terraform infrastructure pipeline
├── release-pipeline.yml             # Coordinated release pipeline
├── README.md                        # Comprehensive documentation
├── QUICK_START.md                   # Quick setup guide
├── ARCHITECTURE.md                  # Architecture documentation
├── PIPELINE_SUMMARY.md              # Summary and statistics
├── INDEX.md                         # This file
└── templates/
    ├── setup-node.yml               # Node.js setup template
    ├── docker-build-push.yml        # Docker build template
    ├── deploy-to-aks.yml            # AKS deployment template
    └── smoke-tests.yml              # Smoke tests template
```

## Statistics

- **Total Pipeline Files**: 6
- **Total Documentation Files**: 5
- **Total Template Files**: 4
- **Total Lines of YAML**: ~4,000+
- **Total Lines of Documentation**: ~3,500+
- **Setup Time**: 30 minutes
- **Full Release Time**: 25-40 minutes

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-06 | Initial release with all pipelines |

## Feedback and Contributions

For questions, issues, or suggestions:
1. Create a work item in Azure Boards
2. Contact the DevOps team
3. Refer to documentation first

---

**Last Updated**: 2025-12-06
**Maintained by**: CitadelBuy DevOps Team
**Organization**: citadelcloudmanagement
**Project**: CitadelBuy
**Platform**: Azure DevOps
