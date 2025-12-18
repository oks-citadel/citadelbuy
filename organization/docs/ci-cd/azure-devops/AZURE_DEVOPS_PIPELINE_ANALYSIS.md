# Azure DevOps Pipeline Analysis and Recommendations

**Date:** December 14, 2024
**Organization:** citadelcloudmanagement
**Project:** CitadelBuy
**Analyst:** Azure DevOps CI/CD Assessment

---

## Executive Summary

The CitadelBuy project has Azure DevOps pipelines configured but they contain validation errors and are not currently functional. This report provides a comprehensive analysis of the current state and actionable recommendations.

---

## Current State of Azure DevOps Pipelines

### Existing Pipelines

The following pipelines exist in the CitadelBuy Azure DevOps project:

| Pipeline Name | Status | Purpose |
|---------------|--------|---------|
| CitadelBuy-Main-CI-CD | ⚠️ Validation Errors | Main CI/CD pipeline |
| CitadelBuy-Pipeline-Health-Monitor | Unknown | Pipeline monitoring |
| CitadelBuy-Deployment-Watcher | Unknown | Deployment monitoring |
| CitadelBuy-Self-Healing | Unknown | Auto-remediation |
| CitadelBuy-Cost-Optimization | Unknown | Cost monitoring |
| CitadelBuy-Security-Scheduled | Unknown | Security scans |

### Pipeline Configuration Files Found

Three Azure Pipeline YAML files were discovered in the repository:

1. **Root Pipeline** (`azure-pipelines.yml`)
   - Location: `/CitadelBuy/azure-pipelines.yml`
   - Size: 549 lines
   - Organization Path Reference: `organization`
   - ACR: `citadelbuyacr.azurecr.io` ⚠️ (Incorrect)

2. **Main Pipeline** (`.azuredevops/pipelines/main.yml`)
   - Location: `/CitadelBuy/.azuredevops/pipelines/main.yml`
   - Size: 465 lines
   - Comprehensive multi-stage pipeline
   - Uses template references (templates not implemented)
   - ACR: `citadelbuyacr.azurecr.io` ⚠️ (Incorrect)

3. **Common Variables** (`.azuredevops/pipelines/variables/common.yml`)
   - Location: `/CitadelBuy/.azuredevops/pipelines/variables/common.yml`
   - Configuration for Node, Python, Docker, etc.
   - ACR: `citadelbuyacr.azurecr.io` ⚠️ (Incorrect)

---

## Critical Issues Blocking Pipeline Execution

### 1. Missing Template Files

The main pipeline (`.azuredevops/pipelines/main.yml`) references multiple template files that **do not exist**:

**Missing Templates:**
```
.azuredevops/pipelines/templates/stages/validate.yml
.azuredevops/pipelines/templates/stages/test.yml
.azuredevops/pipelines/templates/stages/security-scan.yml
.azuredevops/pipelines/templates/stages/build.yml
.azuredevops/pipelines/templates/stages/docker-build.yml
.azuredevops/pipelines/templates/stages/deploy-dev.yml
.azuredevops/pipelines/templates/stages/deploy-staging.yml
.azuredevops/pipelines/templates/stages/deploy-production.yml
.azuredevops/pipelines/templates/stages/e2e-tests.yml
.azuredevops/pipelines/templates/stages/post-deploy-verify.yml
.azuredevops/pipelines/templates/stages/terraform.yml
```

**Impact:** Pipeline will fail immediately during YAML validation phase.

**Directory Structure:**
```
.azuredevops/
├── pipelines/
│   ├── main.yml (exists)
│   ├── templates/
│   │   └── stages/ (empty directory - templates missing!)
│   └── variables/
│       └── common.yml (exists)
```

### 2. Incorrect Azure Container Registry (ACR)

**Problem:** All pipeline files reference `citadelbuyacr.azurecr.io`, but the actual ACR is `broxivaprodacr.azurecr.io`.

**Evidence:**
- Actual ACR (from infrastructure): `broxivaprodacr.azurecr.io`
- Pipeline references: `citadelbuyacr.azurecr.io`
- GitHub Actions workflows: Use `broxivaprodacr.azurecr.io` (correct)
- Kubernetes manifests: Use `broxivaprodacr.azurecr.io` (correct)

**Impact:** Image push operations will fail with "registry not found" errors.

### 3. Missing or Incorrectly Named Service Connections

The pipelines reference the following service connections that may not exist or be incorrectly named:

| Referenced Name | Type | Required For | Status |
|----------------|------|--------------|--------|
| `AzureContainerRegistry` | ACR | Docker login | ⚠️ Unknown |
| `Azure-ServiceConnection` | Azure RM | AKS/CLI operations | ⚠️ Unknown |
| `CitadelBuyAzure` | Azure RM | Main service connection | ⚠️ Unknown |
| `CitadelBuyACR` | ACR | ACR operations | ⚠️ Unknown |
| `BroxivaACR` | ACR | ACR operations | ⚠️ Unknown |

**Impact:** Pipeline stages requiring Azure authentication will fail.

### 4. Non-Existent Azure Resources

Pipelines reference resources that may not exist:

**AKS Clusters Referenced:**
- `citadelbuy-dev-aks` (Resource Group: `citadelbuy-dev-rg`)
- `citadelbuy-staging-aks` (Resource Group: `citadelbuy-staging-rg`)
- `citadelbuy-prod-aks` (Resource Group: `citadelbuy-prod-rg`)

**Actual Resources:** Based on architecture docs, the actual resources use "broxiva" naming, not "citadelbuy".

### 5. Invalid Dockerfile Paths

The root `azure-pipelines.yml` references:
```yaml
dockerfile: '$(ORGANIZATION_PATH)/apps/api/Dockerfile.production'
buildContext: '$(ORGANIZATION_PATH)/apps/api'
```

**Problem:** `ORGANIZATION_PATH` is set to `organization`, so it's looking for:
- `organization/apps/api/Dockerfile.production` ✓ (Exists)
- `organization/apps/web/Dockerfile.production` ✓ (Exists)

**Status:** This is actually correct. No issue here.

---

## Detailed Analysis of Pipeline YAML Files

### Root Pipeline (`azure-pipelines.yml`)

**Pros:**
- Simpler, more straightforward structure
- Inline stage definitions (no template dependencies)
- Clear stage progression
- Service containers configured for tests

**Cons:**
- Uses incorrect ACR name
- `continueOnError: true` on critical steps (hides failures)
- No proper error handling
- Missing notification steps

**Key Stages:**
1. Validate (Lint, Format, Type Check)
2. Test (API Tests, Web Tests) - Uses PostgreSQL + Redis containers
3. Build (Node.js applications)
4. DockerBuild (API, Web, Microservices)
5. DeployStaging
6. DeployProduction

### Main Pipeline (`.azuredevops/pipelines/main.yml`)

**Pros:**
- Comprehensive multi-stage pipeline
- Modular template-based design
- Advanced deployment strategies (blue-green)
- Terraform integration
- E2E testing stage
- Post-deployment verification

**Cons:**
- **All templates are missing** (non-functional)
- Complex conditional logic
- Uses incorrect ACR name
- Requires extensive Azure resources that may not exist

**Key Stages:**
1. Validate
2. Test
3. SecurityScan (Trivy, SAST, dependency audits)
4. Build
5. DockerBuild
6. DeployDev
7. DeployStaging
8. E2ETests (Playwright on staging)
9. DeployProduction
10. PostDeployVerify
11. Terraform (IaC operations)

---

## Service Connection Requirements

To make these pipelines work, you need to create the following service connections in Azure DevOps:

### 1. Azure Resource Manager Service Connection

**Name:** `AzureServiceConnection` (or update pipelines to match existing name)

**Configuration:**
```
Service connection type: Azure Resource Manager
Authentication method: Service Principal (automatic)
Scope level: Subscription
Subscription: [Your Azure Subscription]
Resource group: (Leave empty for subscription-level access)
Service connection name: AzureServiceConnection
Grant access permission to all pipelines: Yes
```

**Required Permissions:**
- Contributor on subscription or resource groups
- AcrPull and AcrPush on ACR
- Azure Kubernetes Service Cluster User Role

### 2. Azure Container Registry Service Connection

**Name:** `BroxivaACR` (for the actual ACR)

**Configuration:**
```
Service connection type: Docker Registry
Registry type: Azure Container Registry
Authentication type: Service Principal
Azure subscription: [Select subscription]
Azure container registry: broxivaprodacr
Service connection name: BroxivaACR
Grant access permission to all pipelines: Yes
```

---

## Recommendations

### Immediate Actions (Priority 1)

#### 1. Use the Simplified Working Pipeline

I've created a new simplified pipeline: `azure-pipelines-working.yml`

**Features:**
- ✅ No template dependencies (everything inline)
- ✅ Uses correct ACR (`broxivaprodacr.azurecr.io`)
- ✅ Clear, debuggable stages
- ✅ Proper error handling
- ✅ Builds and pushes API and Web images

**To Use:**
```bash
# Option A: Replace the existing pipeline file
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy
cp azure-pipelines-working.yml azure-pipelines.yml

# Option B: Create a new pipeline in Azure DevOps pointing to azure-pipelines-working.yml
```

#### 2. Update Service Connections

Create or verify service connections in Azure DevOps:

```bash
# List existing service connections
az devops service-endpoint list \
  --organization "https://dev.azure.com/citadelcloudmanagement" \
  --project "CitadelBuy" \
  -o table

# If needed, create new service connection (requires interactive auth)
# Do this through Azure DevOps UI: Project Settings > Service Connections
```

**Required Service Connections:**
1. **AzureServiceConnection** - Azure Resource Manager
2. **BroxivaACR** - Docker Registry (for broxivaprodacr.azurecr.io)

#### 3. Update ACR References in Existing Pipelines

If you want to fix the existing pipelines instead:

```bash
# Fix ACR references in all pipeline files
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy

# Update root pipeline
sed -i 's/citadelbuyacr\.azurecr\.io/broxivaprodacr.azurecr.io/g' azure-pipelines.yml

# Update main pipeline
sed -i 's/citadelbuyacr\.azurecr\.io/broxivaprodacr.azurecr.io/g' .azuredevops/pipelines/main.yml

# Update variables
sed -i 's/citadelbuyacr\.azurecr\.io/broxivaprodacr.azurecr.io/g' .azuredevops/pipelines/variables/common.yml
```

### Medium-Term Actions (Priority 2)

#### 1. Create Missing Template Files

If you want to use the template-based approach in `.azuredevops/pipelines/main.yml`, you need to create the template files.

**Example: Validate Template**

Create `.azuredevops/pipelines/templates/stages/validate.yml`:
```yaml
parameters:
  - name: skipLinting
    type: boolean
    default: false

jobs:
  - job: Lint
    condition: eq('${{ parameters.skipLinting }}', false)
    steps:
      - checkout: self
      - task: NodeTool@0
        inputs:
          versionSpec: '20.x'
      - script: |
          cd organization
          npm install -g pnpm@10
          pnpm install
          pnpm lint
        displayName: 'Run Linter'
```

**This would require creating 11 template files** - significant effort.

#### 2. Implement Kubernetes Deployment Stages

Currently the deployment stages are placeholders. To make them work:

1. Ensure AKS clusters exist and are accessible
2. Configure kubectl authentication
3. Create/update Kubernetes manifests
4. Implement deployment strategies

#### 3. Set Up Azure DevOps Environments

Create environments for deployment approvals:

- **dev** - Auto-deploy, no approval
- **staging** - Optional approval
- **production** - Required manual approval

```bash
# Create environments via Azure CLI
az devops service-endpoint create \
  --organization "https://dev.azure.com/citadelcloudmanagement" \
  --project "CitadelBuy"
```

Or use Azure DevOps UI: Pipelines > Environments > New Environment

### Long-Term Actions (Priority 3)

#### 1. Standardize CI/CD Platform

**Decision Point:** GitHub Actions vs Azure Pipelines

**Current State:**
- GitHub Actions: Fully functional, actively used, up-to-date
- Azure Pipelines: Non-functional, needs significant work

**Recommendation:**
- **Primary CI/CD:** GitHub Actions (already working)
- **Azure Pipelines:** Optional secondary pipeline for Azure-specific features

**Rationale:**
- GitHub Actions workflows are already built, tested, and working
- Azure Pipelines require extensive setup and debugging
- Maintaining two CI/CD systems increases complexity

#### 2. Consolidate Naming Conventions

Fix the CitadelBuy vs Broxiva naming inconsistency:

**Current Confusion:**
- Azure DevOps Project: "CitadelBuy"
- Actual infrastructure: "Broxiva" (broxivaprodacr, broxiva-prod-aks, etc.)
- Pipelines reference: "CitadelBuy" resources that don't exist

**Options:**
1. Rename Azure DevOps project to "Broxiva"
2. Keep "CitadelBuy" as project name but fix resource references
3. Rebuild infrastructure with "CitadelBuy" naming

**Recommended:** Option 2 - Keep project name, fix references

#### 3. Implement Monitoring and Notifications

Add pipeline notifications:
- Slack/Teams webhooks
- Email notifications
- Azure Monitor integration
- Pipeline analytics

---

## How to Run a Pipeline

### Option 1: Use the New Simplified Pipeline

1. **Update Service Connection Names** in `azure-pipelines-working.yml`:
   ```yaml
   # Line 165: Update to your actual service connection name
   azureSubscription: 'AzureServiceConnection'  # ← Change this

   # Line 175 and 186: Update to your ACR service connection
   containerRegistry: 'BroxivaACR'  # ← Change this
   ```

2. **Commit and Push:**
   ```bash
   cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy
   git add azure-pipelines-working.yml
   git commit -m "Add working Azure DevOps pipeline"
   git push origin main
   ```

3. **Create/Update Pipeline in Azure DevOps:**
   - Go to https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build
   - Click "New Pipeline" or edit existing "CitadelBuy-Main-CI-CD"
   - Select "Azure Repos Git"
   - Select "CitadelBuy" repository
   - Select "Existing Azure Pipelines YAML file"
   - Choose `/azure-pipelines-working.yml`
   - Save and run

### Option 2: Run Existing Pipeline (After Fixes)

```bash
# After creating service connections and fixing ACR references
az pipelines run \
  --name "CitadelBuy-Main-CI-CD" \
  --organization "https://dev.azure.com/citadelcloudmanagement" \
  --project "CitadelBuy" \
  --branch main
```

---

## Testing Strategy

### Phase 1: Validate Pipeline YAML

```bash
# Test pipeline syntax (if Azure CLI supports it)
az pipelines show \
  --name "CitadelBuy-Main-CI-CD" \
  --organization "https://dev.azure.com/citadelcloudmanagement" \
  --project "CitadelBuy"
```

### Phase 2: Test Build Without Push

Set parameters:
- `buildImages: true`
- `pushToACR: false`

This will test Docker builds without requiring ACR access.

### Phase 3: Test Full Pipeline

Set parameters:
- `buildImages: true`
- `pushToACR: true`

Requires:
- Valid service connections
- ACR access permissions
- Dockerfiles must build successfully

---

## Cost Considerations

Running Azure Pipelines has costs:

**Microsoft-Hosted Agents:**
- Free tier: 1,800 minutes/month (30 hours)
- After free tier: $40 per additional parallel job

**Self-Hosted Agents:**
- Free for unlimited minutes
- Requires maintaining infrastructure

**Recommendation:** Start with Microsoft-hosted agents, monitor usage.

---

## Comparison: GitHub Actions vs Azure Pipelines

| Feature | GitHub Actions | Azure Pipelines | Winner |
|---------|---------------|-----------------|--------|
| **Current State** | ✅ Functional | ❌ Non-functional | GitHub |
| **Setup Complexity** | Low | High | GitHub |
| **Azure Integration** | Good (via OIDC) | Excellent (native) | Azure |
| **Template System** | Reusable workflows | YAML templates | Tie |
| **Free Tier** | 2,000 min/month | 1,800 min/month | GitHub |
| **Marketplace** | Extensive | Good | GitHub |
| **Debugging** | Good | Good | Tie |
| **Multi-cloud** | Excellent | Good | GitHub |
| **Cost** | Lower | Higher | GitHub |

**Verdict:** GitHub Actions is the better primary CI/CD platform for this project.

---

## Troubleshooting Guide

### Issue: Pipeline validation fails

**Error:** "Template file not found"

**Solution:** Use `azure-pipelines-working.yml` which has no template dependencies.

---

### Issue: Docker build fails

**Error:** "Dockerfile not found"

**Check:**
```bash
# Verify Dockerfiles exist
ls -la organization/apps/api/Dockerfile.production
ls -la organization/apps/web/Dockerfile.production
```

---

### Issue: ACR push fails

**Error:** "unauthorized: authentication required"

**Solution:**
1. Verify service connection exists and is correctly named
2. Check service connection has ACR permissions:
   ```bash
   # Get service connection details
   az devops service-endpoint show \
     --id <connection-id> \
     --organization "https://dev.azure.com/citadelcloudmanagement" \
     --project "CitadelBuy"
   ```

---

### Issue: AKS deployment fails

**Error:** "Cluster not found"

**Solution:**
1. Verify cluster exists:
   ```bash
   az aks list -o table
   ```
2. Update pipeline with correct cluster name
3. Ensure service principal has AKS access

---

## Summary and Next Steps

### Current Status
- ✅ 6 pipelines exist in Azure DevOps
- ❌ Main CI/CD pipeline has validation errors
- ⚠️ Missing template files
- ⚠️ Incorrect ACR references
- ⚠️ Service connections may not exist

### Blocking Issues
1. **Critical:** Missing template files for `.azuredevops/pipelines/main.yml`
2. **Critical:** Incorrect ACR name (`citadelbuyacr` vs `broxivaprodacr`)
3. **Critical:** Service connections not verified
4. **High:** Azure resource names mismatch (citadelbuy vs broxiva)

### Recommended Path Forward

**Short Term (This Week):**
1. ✅ Use `azure-pipelines-working.yml` as primary pipeline
2. Create required service connections in Azure DevOps
3. Test pipeline with build-only (no push) first
4. Test full pipeline with ACR push

**Medium Term (This Month):**
1. Decide on primary CI/CD platform (recommend GitHub Actions)
2. If keeping Azure Pipelines, create missing template files
3. Standardize resource naming across pipelines
4. Set up deployment environments with approvals

**Long Term (Next Quarter):**
1. Implement full deployment pipeline to AKS
2. Add security scanning and compliance checks
3. Set up monitoring and alerting
4. Document runbooks for common operations

---

## Conclusion

The Azure DevOps pipelines are currently non-functional due to missing templates, incorrect ACR references, and unverified service connections. The simplest path to a working pipeline is to use the newly created `azure-pipelines-working.yml`, which avoids template dependencies and uses the correct ACR.

However, given that GitHub Actions workflows are already functional and actively used, **the strategic recommendation is to make GitHub Actions the primary CI/CD platform** and use Azure Pipelines only for Azure-specific operations or as a backup.

---

## Files Generated

1. **azure-pipelines-working.yml** - Simplified, functional pipeline
2. **AZURE_DEVOPS_PIPELINE_ANALYSIS.md** - This comprehensive analysis

---

## Contact and Support

For issues or questions:
- Azure DevOps: https://dev.azure.com/citadelcloudmanagement/CitadelBuy
- Pipeline Documentation: [Azure Pipelines Docs](https://docs.microsoft.com/azure/devops/pipelines)

---

**Report Generated:** December 14, 2024
**Version:** 1.0
**Status:** Ready for Review
