# Broxiva: Azure DevOps to GitHub Actions Migration Map

## Migration Overview

| Aspect | Azure DevOps | GitHub Actions |
|--------|--------------|----------------|
| **Organization** | broxivacloudmanagement | TBD (GitHub Org) |
| **Project** | Broxiva | Broxiva |
| **Repository** | Azure Repos | GitHub Repository |
| **CI/CD** | Azure Pipelines | GitHub Actions |
| **Secrets** | Variable Groups + Key Vault | GitHub Secrets + Key Vault |
| **Environments** | Azure Environments | GitHub Environments |
| **Artifacts** | Azure Artifacts | GitHub Packages |

---

## Pipeline Migration Mapping

### Azure DevOps Pipelines (Current)

| ID | Pipeline Name | YAML Path | GitHub Equivalent |
|----|---------------|-----------|-------------------|
| 30 | Broxiva-Main-CI-CD | `.azuredevops/pipelines/main.yml` | `ci.yml` + `cd-*.yml` |
| 31 | Broxiva-Pipeline-Health-Monitor | `.azuredevops/pipelines/monitoring/pipeline-health.yml` | `pipeline-health.yml` |
| 32 | Broxiva-Deployment-Watcher | `.azuredevops/pipelines/monitoring/deployment-watcher.yml` | `deployment-watcher.yml` |
| 33 | Broxiva-Self-Healing | `.azuredevops/pipelines/monitoring/self-healing.yml` | `self-healing.yml` |
| 34 | Broxiva-Cost-Optimization | `.azuredevops/pipelines/monitoring/cost-optimization.yml` | `cost-optimization.yml` |
| 35 | Broxiva-Security-Scheduled | `.azuredevops/pipelines/templates/pipelines/security-scheduled.yml` | `security-scheduled.yml` |

### Legacy Pipelines (azure-pipelines/ folder)

| Legacy Pipeline | Purpose | GitHub Migration |
|-----------------|---------|------------------|
| `ci.yml` | Basic CI | Merged into `ci.yml` |
| `ci-cd-pipeline.yml` | Full CI/CD | Split into `ci.yml` + `cd-*.yml` |
| `ci-pipeline.yml` | CI only | Merged into `ci.yml` |
| `deploy.yml` | Generic deploy | Split into `cd-dev.yml`, `cd-staging.yml`, `cd-prod.yml` |
| `deploy-production.yml` | Prod deploy | `cd-prod.yml` |
| `deploy-staging.yml` | Staging deploy | `cd-staging.yml` |
| `security-pipeline.yml` | Security scans | `sast.yml` + `dependency-scan.yml` + `container-scan.yml` |
| `security-scan.yml` | Security scans | Merged into security workflows |
| `terraform-infrastructure.yml` | Terraform | `terraform-plan.yml` + `terraform-apply-*.yml` |
| `staging-deployment.yml` | Staging | `cd-staging.yml` |
| `sentry-release.yml` | Sentry | `sentry-release.yml` |
| `dropshipping-services.yml` | Dropshipping | Merged into main CD workflows |
| `organization-module.yml` | Org module | Merged into CI |

---

## GitHub Actions Workflow Architecture

### Directory Structure
```
.github/
├── workflows/
│   ├── ci.yml                    # Continuous Integration
│   ├── cd-dev.yml                # Deploy to Development
│   ├── cd-staging.yml            # Deploy to Staging
│   ├── cd-prod.yml               # Deploy to Production
│   ├── terraform-plan.yml        # Terraform Plan (PRs)
│   ├── terraform-apply-dev.yml   # Terraform Apply Dev
│   ├── terraform-apply-staging.yml # Terraform Apply Staging
│   ├── terraform-apply-prod.yml  # Terraform Apply Production
│   ├── docker-build.yml          # Docker Build
│   ├── build-and-push-acr.yml    # ACR Push
│   ├── sast.yml                  # Static Analysis
│   ├── dependency-scan.yml       # Dependency Scanning
│   ├── container-scan.yml        # Container Scanning
│   ├── secret-scan.yml           # Secret Detection
│   ├── api-security-test.yml     # API Security
│   ├── compliance-check.yml      # Compliance Validation
│   ├── drift-detection.yml       # Infrastructure Drift
│   ├── drift-repair.yml          # Drift Remediation
│   ├── secret-rotation.yml       # Secret Rotation
│   ├── pipeline-health.yml       # Health Monitoring
│   ├── self-healing.yml          # Auto-remediation
│   └── cost-optimization.yml     # Cost Analysis
├── actions/                      # Reusable composite actions
│   ├── setup-node/
│   ├── setup-terraform/
│   ├── azure-login/
│   └── notify/
└── CODEOWNERS
```

---

## Variable Groups to GitHub Secrets Mapping

### Azure DevOps Variable Groups

| ID | Variable Group | GitHub Environment |
|----|---------------|-------------------|
| 25 | broxiva-secrets-common | Repository Secrets |
| 26 | broxiva-secrets-dev | `dev` Environment |
| 27 | broxiva-secrets-staging | `staging` Environment |
| 28 | broxiva-secrets-prod | `production` Environment |
| 29 | broxiva-terraform-shared | Repository Secrets |
| 30 | broxiva-monitoring | Repository Secrets |

### Secret Mapping

| Azure DevOps Variable | GitHub Secret | Scope |
|----------------------|---------------|-------|
| `ENVIRONMENT` | Auto-detected | Per Environment |
| `AKS_RESOURCE_GROUP` | `AKS_RESOURCE_GROUP` | Per Environment |
| `AKS_CLUSTER_NAME` | `AKS_CLUSTER_NAME` | Per Environment |
| `K8S_NAMESPACE` | `K8S_NAMESPACE` | Per Environment |
| `API_URL` | `API_URL` | Per Environment |
| `WEB_URL` | `WEB_URL` | Per Environment |
| `TF_VERSION` | `TF_VERSION` | Repository |
| `TF_BACKEND_RG` | `TF_BACKEND_RG` | Repository |
| `TF_BACKEND_STORAGE` | `TF_BACKEND_STORAGE` | Repository |
| `TF_BACKEND_CONTAINER` | `TF_BACKEND_CONTAINER` | Repository |
| `ARM_SUBSCRIPTION_ID` | `AZURE_SUBSCRIPTION_ID` | Repository |
| `ARM_CLIENT_ID` | `AZURE_CLIENT_ID` | Repository (OIDC) |
| `ARM_TENANT_ID` | `AZURE_TENANT_ID` | Repository (OIDC) |
| `SLACK_WEBHOOK_URL` | `SLACK_WEBHOOK_URL` | Repository |
| `TEAMS_WEBHOOK_URL` | `TEAMS_WEBHOOK_URL` | Repository |

---

## Environment Mapping

| Azure DevOps Environment | GitHub Environment | Approval Required |
|-------------------------|-------------------|-------------------|
| dev (ID: 22) | `dev` | No |
| staging (ID: 23) | `staging` | Optional |
| production (ID: 24) | `production` | Required |

### GitHub Environment Configuration

#### Development (`dev`)
- No protection rules
- Auto-deploy on push to `develop` branch
- Secrets: Dev-specific configuration

#### Staging (`staging`)
- Wait timer: 0 minutes (optional)
- Required reviewers: 0-1
- Branch restriction: `main`, `develop`
- Secrets: Staging-specific configuration

#### Production (`production`)
- Required reviewers: 1-2
- Wait timer: 5 minutes
- Branch restriction: `main` only
- Deployment branches: Protected
- Secrets: Production-specific configuration

---

## Service Connection Migration

### Azure DevOps Service Connections

| Connection Name | Type | GitHub Equivalent |
|----------------|------|-------------------|
| BroxivaAzure | Azure Resource Manager | OIDC Federated Credential |
| Broxiva-ACR | Docker Registry | OIDC + ACR Login Action |

### GitHub OIDC Configuration

```yaml
# Required GitHub Secrets for OIDC
AZURE_CLIENT_ID: <App Registration Client ID>
AZURE_TENANT_ID: ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0
AZURE_SUBSCRIPTION_ID: ba233460-2dbe-4603-a594-68f93ec9deb3
```

---

## Trigger Migration

### Azure DevOps Triggers → GitHub Triggers

| Azure DevOps | GitHub Actions |
|--------------|----------------|
| `trigger: - main` | `on: push: branches: [main]` |
| `trigger: - develop` | `on: push: branches: [develop]` |
| `pr: - main` | `on: pull_request: branches: [main]` |
| `schedules: - cron` | `on: schedule: - cron` |
| `resources: pipelines` | `on: workflow_run` |

---

## Task/Action Mapping

| Azure DevOps Task | GitHub Action |
|-------------------|---------------|
| `UseDotNet@2` | `actions/setup-dotnet@v4` |
| `NodeTool@0` | `actions/setup-node@v4` |
| `Npm@1` | Native npm commands |
| `Docker@2` | `docker/build-push-action@v5` |
| `Kubernetes@1` | `azure/k8s-deploy@v4` |
| `AzureCLI@2` | `azure/cli@v2` |
| `TerraformInstaller@1` | `hashicorp/setup-terraform@v3` |
| `TerraformTaskV4@4` | Native terraform commands |
| `PublishBuildArtifacts@1` | `actions/upload-artifact@v4` |
| `DownloadBuildArtifacts@1` | `actions/download-artifact@v4` |
| `Bash@3` | `run:` with shell: bash |
| `PowerShell@2` | `run:` with shell: pwsh |

---

## Migration Checklist

### Pre-Migration
- [x] Inventory all Azure DevOps pipelines
- [x] Map variable groups to GitHub secrets
- [x] Identify service connections
- [x] Document environment configurations
- [ ] Create GitHub repository
- [ ] Configure OIDC federation in Azure AD
- [ ] Create GitHub environments with protection rules

### Migration Steps
- [ ] Create CI workflow
- [ ] Create CD workflows (dev, staging, prod)
- [ ] Create Terraform workflows
- [ ] Create Docker/ACR workflows
- [ ] Create security scanning workflows
- [ ] Create drift detection workflows
- [ ] Create secret rotation workflow
- [ ] Create monitoring workflows

### Post-Migration
- [ ] Validate all workflows execute successfully
- [ ] Deploy to dev environment
- [ ] Deploy to staging environment
- [ ] Deploy to production environment
- [ ] Decommission Azure DevOps pipelines
- [ ] Update documentation
- [ ] Team training on GitHub Actions

---

## Azure Infrastructure (Unchanged)

The following Azure resources remain unchanged during migration:

| Resource | Name | Resource Group |
|----------|------|----------------|
| AKS Dev | broxiva-dev-aks | broxiva-dev-rg |
| AKS Staging | broxiva-staging-aks | broxiva-staging-rg |
| AKS Production | broxiva-prod-aks | broxiva-prod-rg |
| ACR | broxivaacr | broxiva-acr-rg |
| Terraform State | broxivatfstate | broxiva-tfstate-rg |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Service interruption during migration | Run both systems in parallel until validated |
| Secret exposure | Use OIDC, no long-lived credentials in GitHub |
| Permission issues | Pre-configure Azure AD app registration |
| Workflow syntax errors | Test in feature branches first |
| Environment drift | Keep Azure infrastructure unchanged |

---

## Timeline

1. **Phase 1**: Create all GitHub workflows (current)
2. **Phase 2**: Configure GitHub repository and secrets
3. **Phase 3**: Deploy to Dev environment
4. **Phase 4**: Deploy to Staging environment
5. **Phase 5**: Deploy to Production environment
6. **Phase 6**: Decommission Azure DevOps
7. **Phase 7**: DNS cutover notification

---

*Document Generated: 2025-12-10*
*Migration Status: In Progress*
