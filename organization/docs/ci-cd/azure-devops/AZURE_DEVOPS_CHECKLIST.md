# Azure DevOps Pipeline Setup Checklist

Use this checklist to set up and verify Azure DevOps pipelines for Broxiva/Broxiva.

---

## Pre-Flight Checks

### Azure Resources

- [ ] ACR exists and is accessible
  ```bash
  az acr show --name broxivaprodacr
  az acr repository list --name broxivaprodacr
  ```

- [ ] You have access to Azure subscription
  ```bash
  az account show
  ```

- [ ] You are logged into Azure CLI
  ```bash
  az login
  ```

- [ ] You have Azure DevOps CLI extension
  ```bash
  az extension add --name azure-devops
  ```

### Repository

- [ ] Code is pushed to Azure DevOps
  ```bash
  cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva
  git remote -v
  # Should show Azure DevOps origin
  ```

- [ ] Dockerfiles exist
  ```bash
  ls -la organization/apps/api/Dockerfile.production
  ls -la organization/apps/web/Dockerfile.production
  ```

---

## Setup Steps

### 1. Service Connections

#### Azure Resource Manager Connection

- [ ] Navigate to https://dev.azure.com/broxivacloudmanagement/Broxiva/_settings/adminservices
- [ ] Click "New service connection"
- [ ] Select "Azure Resource Manager"
- [ ] Authentication: "Service principal (automatic)"
- [ ] Subscription: Select your subscription
- [ ] Resource group: Leave empty
- [ ] Service connection name: `AzureServiceConnection`
- [ ] Grant access to all pipelines: ✓
- [ ] Click "Save"
- [ ] Test connection: Click "Verify"

#### ACR Service Connection

- [ ] Click "New service connection"
- [ ] Select "Docker Registry"
- [ ] Registry type: "Azure Container Registry"
- [ ] Subscription: Select your subscription
- [ ] Azure container registry: `broxivaprodacr`
- [ ] Service connection name: `BroxivaACR`
- [ ] Grant access to all pipelines: ✓
- [ ] Click "Save"
- [ ] Test connection: Click "Verify"

#### Verify Service Connections

- [ ] List service connections
  ```bash
  az devops service-endpoint list \
    --organization "https://dev.azure.com/broxivacloudmanagement" \
    --project "Broxiva" \
    -o table
  ```

- [ ] Should see:
  - AzureServiceConnection (azurerm)
  - BroxivaACR (dockerregistry)

### 2. Pipeline File

- [ ] Review `azure-pipelines-working.yml`
- [ ] Verify service connection names match (lines ~165, ~175, ~186)
- [ ] Update if needed:
  ```yaml
  azureSubscription: 'AzureServiceConnection'
  containerRegistry: 'BroxivaACR'
  ```

### 3. Commit and Push

- [ ] Add files to git
  ```bash
  git add azure-pipelines-working.yml
  git add AZURE_DEVOPS_*.md
  ```

- [ ] Commit
  ```bash
  git commit -m "Add working Azure DevOps pipeline"
  ```

- [ ] Push to Azure DevOps
  ```bash
  git push origin main
  ```

### 4. Create Pipeline

- [ ] Open https://dev.azure.com/broxivacloudmanagement/Broxiva/_build
- [ ] Click "New Pipeline" or edit existing
- [ ] Source: "Azure Repos Git"
- [ ] Repository: "Broxiva"
- [ ] Configuration: "Existing Azure Pipelines YAML file"
- [ ] Branch: "main"
- [ ] Path: `/azure-pipelines-working.yml`
- [ ] Click "Continue"
- [ ] Review pipeline YAML
- [ ] Click "Save" (or "Run" to test immediately)

---

## First Run

### Test Run (Build Only)

- [ ] Edit pipeline
- [ ] Click "Run pipeline"
- [ ] Set variables:
  - buildImages: true
  - pushToACR: false
- [ ] Click "Run"
- [ ] Monitor pipeline run
- [ ] Verify Stage 1 (Validate) succeeds
- [ ] Verify Stage 2 (BuildImages) succeeds
- [ ] Expected: Stages 3 & 4 skipped (pushToACR=false)

### Full Run (Build and Push)

- [ ] Click "Run pipeline"
- [ ] Set variables:
  - buildImages: true
  - pushToACR: true
- [ ] Click "Run"
- [ ] Monitor all 4 stages
- [ ] Verify all stages succeed:
  - ✓ Stage 1: Validate
  - ✓ Stage 2: BuildImages
  - ✓ Stage 3: PushToACR
  - ✓ Stage 4: VerifyACR

---

## Verification

### Pipeline Run Success

- [ ] Pipeline run shows green checkmarks
- [ ] All 4 stages completed
- [ ] No errors in logs
- [ ] Build duration < 20 minutes

### ACR Verification

- [ ] Check ACR via Azure CLI
  ```bash
  # Login
  az acr login --name broxivaprodacr

  # List repositories
  az acr repository list --name broxivaprodacr -o table

  # Check API images
  az acr repository show-tags \
    --name broxivaprodacr \
    --repository broxiva-api \
    --orderby time_desc \
    -o table

  # Check Web images
  az acr repository show-tags \
    --name broxivaprodacr \
    --repository broxiva-web \
    --orderby time_desc \
    -o table
  ```

- [ ] Verify repositories exist:
  - broxiva-api
  - broxiva-web

- [ ] Verify tags exist for each image:
  - latest
  - main (or branch name)
  - <build-id>
  - <short-sha>

### Pull and Test Images

- [ ] Pull API image
  ```bash
  docker pull broxivaprodacr.azurecr.io/broxiva-api:latest
  ```

- [ ] Pull Web image
  ```bash
  docker pull broxivaprodacr.azurecr.io/broxiva-web:latest
  ```

- [ ] Inspect images
  ```bash
  docker images | grep broxiva
  ```

---

## Troubleshooting

### Pipeline Fails at Validate Stage

**Check:**
- [ ] Repository cloned successfully
- [ ] Files exist in workspace
- [ ] Azure DevOps agent has permissions

**Fix:**
```bash
# Verify files exist in repo
git ls-tree -r main --name-only | grep Dockerfile
```

### Pipeline Fails at Build Stage

**Check:**
- [ ] Dockerfile syntax is valid
- [ ] Build context is correct
- [ ] Dependencies can be resolved

**Fix:**
```bash
# Test Docker build locally
cd organization/apps/api
docker build -f Dockerfile.production -t test-api .
```

### Pipeline Fails at Push Stage

**Check:**
- [ ] Service connection exists
- [ ] Service connection has ACR push permissions
- [ ] ACR is accessible from Azure DevOps

**Fix:**
```bash
# Verify ACR access
az acr check-health --name broxivaprodacr
```

### Error: "Service connection not found"

**Problem:** Service connection name mismatch

**Fix:**
1. List service connections
   ```bash
   az devops service-endpoint list \
     --organization "https://dev.azure.com/broxivacloudmanagement" \
     --project "Broxiva" \
     --query "[].name" -o table
   ```
2. Update `azure-pipelines-working.yml` with correct names

### Error: "ACR not found"

**Problem:** ACR doesn't exist or wrong name

**Fix:**
```bash
# List all ACRs in subscription
az acr list -o table

# Verify specific ACR
az acr show --name broxivaprodacr
```

---

## Success Criteria

Pipeline is working correctly when:

- [x] All 4 stages complete successfully
- [x] Images appear in ACR
- [x] Images can be pulled from ACR
- [x] Pipeline runs automatically on push to main
- [x] Pipeline can be triggered manually
- [x] Build time is reasonable (< 20 minutes)
- [x] Logs are clear and helpful

---

## Next Steps

Once basic pipeline is working:

### Immediate (This Week)

- [ ] Set up pipeline triggers
  - Branch policies
  - PR validation
  - Scheduled runs

- [ ] Add pipeline badge to README
  ```markdown
  [![Build Status](https://dev.azure.com/broxivacloudmanagement/Broxiva/_apis/build/status/Broxiva-Main-CI-CD)](https://dev.azure.com/broxivacloudmanagement/Broxiva/_build/latest?definitionId=1)
  ```

- [ ] Configure retention policies
  - Pipeline runs: 30 days
  - Artifacts: 30 days

### Short Term (This Month)

- [ ] Add testing stages
  - Unit tests
  - Integration tests
  - E2E tests

- [ ] Add security scanning
  - Trivy container scan
  - Dependency scanning
  - SAST analysis

- [ ] Add deployment stages
  - Deploy to dev/staging
  - Manual approval for production

### Medium Term (Next Quarter)

- [ ] Implement blue-green deployments
- [ ] Add canary deployments
- [ ] Set up monitoring and alerts
- [ ] Create deployment dashboards
- [ ] Document runbooks

---

## Rollback Plan

If pipeline causes issues:

### Quick Rollback

- [ ] Disable pipeline triggers
  - Edit pipeline
  - Settings > Triggers
  - Disable continuous integration

### Full Rollback

- [ ] Delete pipeline
- [ ] Remove service connections
- [ ] Continue using GitHub Actions

### Hybrid Approach

- [ ] Keep GitHub Actions as primary CI/CD
- [ ] Use Azure Pipelines for Azure-specific tasks
- [ ] Both can coexist

---

## Cost Monitoring

### Free Tier Limits

- Microsoft-hosted agents: 1,800 minutes/month
- Self-hosted agents: Unlimited

### Cost Optimization

- [ ] Monitor pipeline usage
  - https://dev.azure.com/broxivacloudmanagement/Broxiva/_settings/pipelines

- [ ] Optimize build times
  - Use Docker layer caching
  - Parallelize jobs
  - Use self-hosted agents if needed

- [ ] Set up alerts
  - Near free tier limit: 1,500 minutes
  - Over budget: $50/month

---

## Documentation

- [ ] Update README with pipeline info
- [ ] Document service connections
- [ ] Create runbook for common tasks
- [ ] Share knowledge with team

---

## Contacts

- Azure DevOps Admin: [Your email]
- Azure Subscription Owner: [Owner email]
- Pipeline Support: https://dev.azure.com/broxivacloudmanagement/Broxiva/_wiki

---

**Checklist Version:** 1.0
**Last Updated:** December 14, 2024
**Status:** Ready to use
