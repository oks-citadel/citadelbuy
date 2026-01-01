# Broxiva - Azure DevOps Unified Pipeline Architecture

## Overview

This directory contains the **Unified Master Pipeline** architecture for Broxiva's CI/CD operations in Azure DevOps.

**Organization:** broxivacloudmanagement
**Project:** Broxiva
**ACR:** broxivaacr.azurecr.io
**Service Connection:** BroxivaAzure

## Directory Structure

```
.azuredevops/
├── README.md                              # This file
├── pipelines/
│   ├── main.yml                          # MASTER pipeline entry point
│   ├── variables/
│   │   ├── common.yml                    # Shared variables
│   │   ├── dev.yml                       # Dev environment variables
│   │   ├── staging.yml                   # Staging environment variables
│   │   └── prod.yml                      # Production environment variables
│   └── templates/
│       └── stages/
│           ├── validate.yml              # Code quality & linting
│           ├── test.yml                  # Unit & integration tests
│           ├── security-scan.yml         # Security scanning
│           ├── build.yml                 # Application build
│           ├── docker-build.yml          # Docker image build & push
│           ├── deploy-dev.yml            # Dev deployment
│           ├── deploy-staging.yml        # Staging deployment
│           ├── deploy-production.yml     # Production deployment
│           ├── e2e-tests.yml             # End-to-end tests
│           ├── post-deploy-verify.yml    # Post-deployment checks
│           └── terraform.yml             # Infrastructure as Code
```

## Main Pipeline (`main.yml`)

The master pipeline orchestrates all CI/CD operations across multiple environments.

### Trigger Configuration

**Branch Triggers:**
- `main` - Production deployments
- `develop` - Staging/dev deployments
- `feature/*` - Feature branch validation and dev deployment
- `release/*` - Release candidate validation and staging deployment
- `hotfix/*` - Hotfix validation and production deployment

**Pull Request Triggers:**
- `main` - Full validation and security scans
- `develop` - Full validation and security scans

**Path Exclusions:**
- Documentation files (`**/*.md`, `docs/**`)
- GitHub workflows (`.github/**`)
- License and gitignore files

### Pipeline Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skipTests` | boolean | `false` | Skip all tests (not recommended) |
| `deployEnvironment` | string | `none` | Target deployment environment (none/dev/staging/prod) |
| `buildMicroservices` | string | `all` | Microservices to build (comma-separated or "all") |
| `runE2E` | boolean | `false` | Run E2E tests on staging |
| `terraformAction` | string | `none` | Terraform action (none/plan/apply/destroy) |
| `skipSecurityScan` | boolean | `false` | Skip security scanning (not recommended) |
| `pushToRegistry` | boolean | `true` | Push Docker images to ACR |

### Pipeline Stages

#### 1. Validate
**Purpose:** Code quality, linting, formatting, and type checking
**Dependencies:** None
**Condition:** Always runs on all triggers
**Template:** `templates/stages/validate.yml`

**Includes:**
- ESLint code quality checks
- Prettier formatting validation
- TypeScript type checking
- Code complexity analysis

---

#### 2. Test
**Purpose:** Unit and integration tests with service dependencies
**Dependencies:** Validate
**Condition:** Runs unless `skipTests` is true
**Template:** `templates/stages/test.yml`

**Services:**
- PostgreSQL 16 (alpine)
- Redis 7 (alpine)

**Includes:**
- Unit tests with Jest
- Integration tests
- Code coverage reporting
- Test result publishing

---

#### 3. SecurityScan
**Purpose:** Vulnerability scanning and security analysis
**Dependencies:** Validate
**Condition:** Runs unless `skipSecurityScan` is true
**Template:** `templates/stages/security-scan.yml`

**Includes:**
- Trivy container scanning
- NPM dependency audit
- SAST (Static Application Security Testing)
- Security report publishing

---

#### 4. Build
**Purpose:** Compile applications and prepare artifacts
**Dependencies:** Validate, Test
**Condition:** Runs for deployment-eligible branches
**Template:** `templates/stages/build.yml`

**Includes:**
- TypeScript compilation
- Next.js build
- NestJS build
- Artifact publishing

---

#### 5. DockerBuild
**Purpose:** Build Docker images and push to Azure Container Registry
**Dependencies:** Build, SecurityScan
**Condition:** Runs when `pushToRegistry` is true
**Template:** `templates/stages/docker-build.yml`

**Includes:**
- Multi-stage Docker builds
- Image tagging (BuildId, SHA, Branch, Latest)
- ACR authentication
- Image vulnerability scanning
- Registry push

---

#### 6. DeployDev
**Purpose:** Deploy to Development AKS cluster
**Dependencies:** DockerBuild
**Condition:** Auto-deploy on `develop` or `feature/*` branches
**Template:** `templates/stages/deploy-dev.yml`

**Cluster:**
- Resource Group: `broxiva-dev-rg`
- AKS Cluster: `broxiva-dev-aks`
- Namespace: `broxiva-dev`

**Includes:**
- Kubernetes manifest deployment
- Database migrations
- Health checks
- Rollout verification

---

#### 7. DeployStaging
**Purpose:** Deploy to Staging AKS cluster
**Dependencies:** DockerBuild, DeployDev
**Condition:** Auto-deploy on `develop` or `release/*` branches
**Template:** `templates/stages/deploy-staging.yml`

**Cluster:**
- Resource Group: `broxiva-staging-rg`
- AKS Cluster: `broxiva-staging-aks`
- Namespace: `broxiva-staging`

**Includes:**
- Kubernetes manifest deployment
- Database migrations
- Health checks
- Rollout verification
- Service endpoint testing

---

#### 8. E2ETests
**Purpose:** End-to-end testing on Staging environment
**Dependencies:** DeployStaging
**Condition:** Runs when `runE2E` is true or on `develop` branch
**Template:** `templates/stages/e2e-tests.yml`

**Includes:**
- Playwright browser tests
- Cross-browser testing (Chromium, Firefox, WebKit)
- Visual regression testing
- Test report publishing
- Screenshot/video artifacts

---

#### 9. DeployProduction
**Purpose:** Deploy to Production AKS cluster with manual approval
**Dependencies:** DockerBuild, DeployStaging, E2ETests
**Condition:** Runs on `main` or `hotfix/*` branches
**Template:** `templates/stages/deploy-production.yml`

**Cluster:**
- Resource Group: `broxiva-prod-rg`
- AKS Cluster: `broxiva-prod-aks`
- Namespace: `broxiva-prod`

**Strategy:** Blue-Green Deployment

**Includes:**
- Manual approval gate (24-hour timeout)
- Blue-Green deployment
- Database migrations
- Smoke tests on green environment
- Traffic switching
- Health verification

---

#### 10. PostDeployVerify
**Purpose:** Post-deployment health checks and validation
**Dependencies:** DeployProduction
**Condition:** Runs after successful production deployment
**Template:** `templates/stages/post-deploy-verify.yml`

**Includes:**
- API health endpoint checks
- Web application availability
- Admin portal verification
- Performance metrics validation
- Automated rollback on failure

---

#### 11. Terraform
**Purpose:** Infrastructure as Code provisioning
**Dependencies:** None (parallel stage)
**Condition:** Runs when `terraformAction` is not 'none'
**Template:** `templates/stages/terraform.yml`

**Includes:**
- Terraform initialization
- Infrastructure planning
- Apply/Destroy with approval
- State management in Azure Storage
- Infrastructure drift detection

---

## Usage Examples

### Standard Development Workflow

**Feature branch push:**
```bash
git checkout -b feature/new-feature
# ... make changes ...
git push origin feature/new-feature
```
**Pipeline behavior:**
- Runs: Validate → Test → SecurityScan → Build → DockerBuild → DeployDev

---

### Deploy to Staging Manually

**Trigger manual pipeline run:**
1. Go to Azure DevOps → Pipelines → Broxiva-Main
2. Click "Run pipeline"
3. Set parameters:
   - `deployEnvironment`: staging
   - `runE2E`: true (optional)
4. Click "Run"

**Pipeline behavior:**
- Runs: Full validation → DockerBuild → DeployStaging → E2ETests

---

### Production Deployment

**Merge to main branch:**
```bash
git checkout main
git merge develop
git push origin main
```

**Pipeline behavior:**
- Runs: Full validation → DockerBuild → DeployProduction (requires approval)
- Manual approval required before production deployment
- Blue-Green deployment with traffic switching
- Post-deployment verification

---

### Terraform Infrastructure Changes

**Trigger manual pipeline run:**
1. Go to Azure DevOps → Pipelines → Broxiva-Main
2. Click "Run pipeline"
3. Set parameters:
   - `terraformAction`: plan (or apply)
   - `deployEnvironment`: none
4. Click "Run"

**Pipeline behavior:**
- Runs: Terraform stage only (parallel to other stages)
- Plan: Preview infrastructure changes
- Apply: Requires approval, applies changes

---

## Environment Variables

### Common Variables (`variables/common.yml`)

Shared across all environments:
- Node.js version: 20.x
- PNPM version: 10.23.0
- Docker BuildKit: Enabled
- ACR: broxivaacr.azurecr.io

### Environment-Specific Variables

**Dev** (`variables/dev.yml`)
- Lower resource limits
- Debug logging enabled
- Non-persistent storage

**Staging** (`variables/staging.yml`)
- Production-like configuration
- Moderate resource limits
- Extended logging

**Production** (`variables/prod.yml`)
- High availability settings
- Optimized resource limits
- Security hardening
- Minimal logging

---

## Security Considerations

### Secrets Management

**Azure Key Vault Integration:**
- Database credentials
- API keys
- JWT secrets
- Third-party service credentials

**Variable Groups:**
- `Broxiva-Common` - Shared secrets
- `Broxiva-Dev` - Dev environment secrets
- `Broxiva-Staging` - Staging environment secrets
- `Broxiva-Production` - Production environment secrets

### Service Connections

**Required Service Connections:**
1. `BroxivaAzure` - Azure Resource Manager
   - Subscription access
   - AKS management
   - Key Vault access

2. `BroxivaACR` - Azure Container Registry
   - Image push/pull permissions
   - Vulnerability scanning

### Security Scanning

**Automated Scans:**
- Container vulnerability scanning (Trivy)
- Dependency vulnerability scanning (npm audit)
- Static code analysis (ESLint security rules)
- Secret detection in commits

---

## Monitoring and Notifications

### Pipeline Notifications

**Configured Channels:**
- Slack: `#broxiva-deployments`
- Microsoft Teams: Broxiva DevOps channel
- Email: Development team distribution list

**Notification Triggers:**
- Pipeline failures
- Security vulnerabilities (High/Critical)
- Production deployment starts
- Production deployment completions
- Manual approval requests

### Metrics and Dashboards

**Azure DevOps Dashboards:**
- Pipeline success rate
- Average deployment duration
- Test coverage trends
- Security vulnerability trends

---

## Troubleshooting

### Common Issues

**1. Tests Failing Due to Database Connection**
- Verify PostgreSQL service container is healthy
- Check `TEST_DATABASE_URL` variable
- Review migration scripts

**2. Docker Build Timeout**
- Increase agent timeout
- Optimize Dockerfile layer caching
- Check network connectivity to base images

**3. Kubernetes Deployment Fails**
- Verify AKS credentials
- Check resource quotas
- Review pod logs: `kubectl logs -n <namespace> <pod-name>`

**4. Security Scan Blocking Pipeline**
- Review Trivy scan results
- Update vulnerable dependencies
- Add exceptions for false positives (with justification)

### Debug Mode

Enable verbose logging:
```yaml
variables:
  system.debug: true
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review security scan results
- Monitor pipeline performance
- Check artifact storage usage

**Monthly:**
- Update base Docker images
- Review and update dependencies
- Audit service connection permissions
- Test disaster recovery procedures

**Quarterly:**
- Review and optimize pipeline stages
- Update documentation
- Audit security policies
- Performance benchmarking

---

## Contact and Support

**Pipeline Owners:**
- DevOps Team: devops@broxiva.com
- Platform Team: platform@broxiva.com

**Documentation:**
- Internal Wiki: https://wiki.broxiva.com/azure-devops
- Runbooks: https://runbooks.broxiva.com

**Support Channels:**
- Slack: #devops-support
- Email: devops-support@broxiva.com
