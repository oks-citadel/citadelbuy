# CitadelBuy - Pipeline Architecture Reference

## Quick Reference Card

### Pipeline Entry Point
```
.azuredevops/pipelines/main.yml
```

### Organization Details
```
Organization: citadelcloudmanagement
Project:      CitadelBuy
ACR:          citadelbuyacr.azurecr.io
Connection:   CitadelBuyAzure
```

---

## 11 Pipeline Stages

| # | Stage | Dependencies | Duration | Auto-Run Conditions |
|---|-------|--------------|----------|---------------------|
| 1 | **Validate** | None | ~3 min | Always |
| 2 | **Test** | Validate | ~7 min | Unless skipTests=true |
| 3 | **SecurityScan** | Validate | ~5 min | Unless skipSecurityScan=true |
| 4 | **Build** | Validate, Test | ~7 min | Deployment branches |
| 5 | **DockerBuild** | Build, SecurityScan | ~12 min | When pushToRegistry=true |
| 6 | **DeployDev** | DockerBuild | ~7 min | develop, feature/* branches |
| 7 | **DeployStaging** | DockerBuild, DeployDev | ~10 min | develop, release/* branches |
| 8 | **E2ETests** | DeployStaging | ~18 min | When runE2E=true or develop |
| 9 | **DeployProduction** | DockerBuild, DeployStaging, E2ETests | ~18 min | main, hotfix/* (requires approval) |
| 10 | **PostDeployVerify** | DeployProduction | ~8 min | After production deploy |
| 11 | **Terraform** | None (parallel) | ~15 min | When terraformAction≠none |

**Total Duration:** ~30-45 minutes (full pipeline)

---

## Branch Workflows

### Feature Branch → Dev
```
feature/* → Validate → Test → SecurityScan → Build → DockerBuild → DeployDev
```

### Develop → Staging
```
develop → Validate → Test → SecurityScan → Build → DockerBuild → DeployDev → DeployStaging → E2ETests
```

### Main → Production
```
main → Validate → Test → SecurityScan → Build → DockerBuild → DeployProduction → PostDeployVerify
                                                        ↓
                                                  (Manual Approval)
```

### Pull Request → Validation Only
```
PR → Validate → Test → SecurityScan (no deployments)
```

---

## Environment Matrix

| Environment | Cluster | Namespace | RG | Strategy | Approval |
|-------------|---------|-----------|----|--------------------|----------|
| **Dev** | citadelbuy-dev-aks | citadelbuy-dev | citadelbuy-dev-rg | Rolling | None |
| **Staging** | citadelbuy-staging-aks | citadelbuy-staging | citadelbuy-staging-rg | Rolling | Optional |
| **Production** | citadelbuy-prod-aks | citadelbuy-prod | citadelbuy-prod-rg | Blue-Green | Required |

---

## Parameters Quick Reference

```yaml
# Example Manual Run
parameters:
  skipTests: false                    # Don't skip tests
  deployEnvironment: staging          # Deploy to staging
  buildMicroservices: api,web,worker  # Build specific services
  runE2E: true                        # Run E2E tests
  terraformAction: plan               # Run terraform plan
  skipSecurityScan: false             # Don't skip security
  pushToRegistry: true                # Push to ACR
```

---

## Stage Details

### 1. Validate
**Purpose:** Code quality gates
**Checks:**
- ESLint (code quality)
- TypeScript (type checking)
- Prettier (formatting)
- Code complexity

**Fails on:**
- Linting errors
- Type errors
- Formatting violations

---

### 2. Test
**Purpose:** Unit and integration testing
**Services:**
- PostgreSQL 16-alpine
- Redis 7-alpine

**Executes:**
- Unit tests (Jest)
- Integration tests
- Code coverage collection

**Fails on:**
- Test failures
- Coverage below threshold

---

### 3. SecurityScan
**Purpose:** Vulnerability detection
**Tools:**
- Trivy (container scanning)
- npm audit (dependency scanning)
- SAST (static analysis)

**Fails on:**
- Critical vulnerabilities
- High vulnerabilities (configurable)

---

### 4. Build
**Purpose:** Application compilation
**Builds:**
- API (NestJS)
- Web (Next.js)
- Workers
- Microservices

**Output:**
- Compiled artifacts
- Build metadata

---

### 5. DockerBuild
**Purpose:** Container image creation
**Images:**
- citadelbuy-api
- citadelbuy-web
- citadelbuy-worker
- citadelbuy-notification
- citadelbuy-payment
- citadelbuy-inventory

**Tags:**
- BuildId: $(Build.BuildId)
- SHA: $(ShortSHA)
- Branch: $(BranchName)
- Latest: latest

**Registry:** citadelbuyacr.azurecr.io

---

### 6. DeployDev
**Purpose:** Development deployment
**Target:** citadelbuy-dev-aks
**Strategy:** Rolling update
**Auto-Deploy:** develop, feature/*

**Steps:**
1. Get AKS credentials
2. Apply K8s manifests
3. Update deployment images
4. Run migrations
5. Health checks

---

### 7. DeployStaging
**Purpose:** Staging deployment
**Target:** citadelbuy-staging-aks
**Strategy:** Rolling update
**Auto-Deploy:** develop, release/*

**Steps:**
1. Get AKS credentials
2. Apply K8s manifests
3. Update deployment images
4. Run migrations
5. Health checks
6. Service endpoint tests

---

### 8. E2ETests
**Purpose:** End-to-end validation
**Tool:** Playwright
**Target:** https://staging.citadelbuy.com
**Browsers:** Chromium, Firefox, WebKit

**Tests:**
- User workflows
- Critical paths
- Cross-browser compatibility
- Visual regression

---

### 9. DeployProduction
**Purpose:** Production deployment
**Target:** citadelbuy-prod-aks
**Strategy:** Blue-Green
**Auto-Deploy:** main, hotfix/* (with approval)

**Steps:**
1. Manual approval gate
2. Get AKS credentials
3. Deploy to green environment
4. Run migrations on green
5. Smoke tests on green
6. Switch traffic to green
7. Verify production endpoints
8. Keep blue for rollback

**Approval Timeout:** 24 hours

---

### 10. PostDeployVerify
**Purpose:** Production validation
**Checks:**
- API health: https://api.citadelbuy.com/health
- Web: https://citadelbuy.com
- Admin: https://admin.citadelbuy.com
- Performance metrics
- Error rates

**Rollback:** Automatic on failure

---

### 11. Terraform
**Purpose:** Infrastructure as Code
**Actions:** plan, apply, destroy
**Backend:** Azure Storage
**State:** citadelbuytfstate

**Approval Required:**
- apply: Yes
- destroy: Yes
- plan: No

---

## Variables Hierarchy

```
common.yml (All environments)
├── Node.js: 20.x
├── PNPM: 10.23.0
├── ACR: citadelbuyacr.azurecr.io
└── Service Connection: CitadelBuyAzure

dev.yml (Development)
├── Lower resources
├── Debug logging
└── Non-persistent storage

staging.yml (Staging)
├── Production-like config
├── Moderate resources
└── Extended logging

prod.yml (Production)
├── High availability
├── Optimized resources
└── Minimal logging
```

---

## Service Connections Required

### 1. CitadelBuyAzure (Azure Resource Manager)
**Permissions:**
- Subscription access
- AKS management
- Key Vault access
- Resource group management

### 2. CitadelBuyACR (Container Registry)
**Permissions:**
- Image push/pull
- Vulnerability scanning
- Tag management

---

## Secrets and Variables

### Variable Groups

**CitadelBuy-Common:**
- Shared configuration
- ACR credentials
- Build settings

**CitadelBuy-Dev:**
- Dev database URL
- Dev API keys
- Debug settings

**CitadelBuy-Staging:**
- Staging database URL
- Staging API keys
- Test credentials

**CitadelBuy-Production:**
- Production database URL
- Production API keys
- Encrypted secrets

### Azure Key Vault Integration
All sensitive secrets stored in Key Vault:
- Database credentials
- JWT secrets
- Third-party API keys
- Encryption keys

---

## Notification Channels

### Slack
**Channel:** #citadelbuy-deployments
**Notifications:**
- Pipeline start
- Pipeline complete
- Failures
- Approval requests
- Production deployments

### Microsoft Teams
**Channel:** CitadelBuy DevOps
**Same notifications as Slack**

### Email
**Recipients:** Development team
**Critical only:**
- Production failures
- Security vulnerabilities
- Approval requests

---

## Monitoring and Metrics

### Pipeline Metrics
- Success rate: Target >95%
- Duration: Target <45 min
- Deployment frequency: Multiple/day
- Lead time: Target <2 hours

### Quality Metrics
- Test coverage: >80%
- Security vulnerabilities: Zero critical
- Build success: >95%
- Deployment success: >99%

### Performance Metrics
- Build time: <15 min
- Test time: <10 min
- Deploy time: <10 min
- Rollback time: <5 min

---

## Common Commands

### Validate Pipeline YAML
```bash
az pipelines validate --yaml-path .azuredevops/pipelines/main.yml
```

### Run Pipeline
```bash
az pipelines run --name CitadelBuy-Unified-Pipeline
```

### Run with Parameters
```bash
az pipelines run --name CitadelBuy-Unified-Pipeline \
  --parameters deployEnvironment=staging runE2E=true
```

### Get Pipeline Status
```bash
az pipelines runs list --pipeline-ids <id> --status inProgress
```

### View Logs
```bash
az pipelines runs show --id <run-id> --open
```

---

## Troubleshooting Quick Guide

### Pipeline Won't Start
- Check trigger paths
- Verify branch names
- Check service connection

### Tests Failing
- Check test logs
- Verify database connection
- Check service containers

### Docker Build Fails
- Check Dockerfile syntax
- Verify base image availability
- Check ACR credentials

### Deployment Fails
- Check AKS credentials
- Verify namespace exists
- Check resource quotas
- Review pod logs

### Security Scan Blocks
- Review vulnerability details
- Update dependencies
- Add exceptions if needed

---

## Emergency Procedures

### Production Rollback
1. Access Azure DevOps pipeline
2. Locate blue environment pods
3. Execute traffic switch:
   ```bash
   kubectl patch service api-service -n citadelbuy-prod \
     -p '{"spec":{"selector":{"app":"api-blue"}}}'
   ```
4. Verify endpoints
5. Investigate green environment issues

### Hotfix Deployment
1. Create hotfix branch from main
2. Make critical fix
3. Push to trigger pipeline
4. Approve production deployment immediately
5. Monitor closely
6. Backport to develop

### Pipeline Emergency Stop
1. Go to Azure DevOps
2. Click pipeline run
3. Click "Cancel"
4. Verify no partial deployments
5. Clean up resources if needed

---

## Support and Resources

### Documentation
- **Main README:** `.azuredevops/README.md`
- **Quick Start:** `.azuredevops/QUICKSTART.md`
- **Templates Guide:** `.azuredevops/TEMPLATES_GUIDE.md`
- **Checklist:** `.azuredevops/PIPELINE_CHECKLIST.md`
- **Implementation:** `.azuredevops/IMPLEMENTATION_SUMMARY.md`
- **This Reference:** `.azuredevops/ARCHITECTURE.md`

### Support Channels
- **Slack:** #devops-support
- **Email:** devops@citadelbuy.com
- **Emergency:** [On-call phone]

### Azure DevOps
- **Pipeline URL:** https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build
- **Environments:** https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_environments
- **Service Connections:** https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_settings/adminservices

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-10 | Initial unified pipeline architecture | Pipeline Agent |

---

**Last Updated:** December 10, 2025
**Status:** Architecture Complete - Ready for Implementation
**Next Review:** After template implementation
