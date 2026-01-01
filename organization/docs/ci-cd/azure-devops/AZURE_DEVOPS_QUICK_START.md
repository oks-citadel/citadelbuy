# Azure DevOps Pipeline - Quick Start Guide

## TL;DR

**Status:** Azure Pipelines exist but are non-functional due to:
1. Missing template files
2. Incorrect ACR name (broxivaacr vs broxivaprodacr)
3. Unverified service connections

**Solution:** Use the new `azure-pipelines-working.yml` file.

---

## Quick Setup (15 minutes)

### Step 1: Create Service Connections (5 min)

Go to Azure DevOps: https://dev.azure.com/broxivacloudmanagement/Broxiva/_settings/adminservices

#### Create Azure Resource Manager Connection

1. Click "New service connection"
2. Select "Azure Resource Manager"
3. Select "Service principal (automatic)"
4. Choose your subscription
5. Leave resource group empty (subscription-level access)
6. **Name:** `AzureServiceConnection`
7. Check "Grant access permission to all pipelines"
8. Click "Save"

#### Create ACR Service Connection

1. Click "New service connection"
2. Select "Docker Registry"
3. Select "Azure Container Registry"
4. Choose your subscription
5. Select ACR: `broxivaprodacr`
6. **Name:** `BroxivaACR`
7. Check "Grant access permission to all pipelines"
8. Click "Save"

### Step 2: Update Pipeline File (2 min)

Edit `azure-pipelines-working.yml` and verify these lines match your service connection names:

```yaml
# Line ~165
azureSubscription: 'AzureServiceConnection'  # ← Must match your connection name

# Lines ~175 and ~186
containerRegistry: 'BroxivaACR'  # ← Must match your ACR connection name
```

### Step 3: Commit and Push (1 min)

```bash
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva
git add azure-pipelines-working.yml AZURE_DEVOPS_PIPELINE_ANALYSIS.md AZURE_DEVOPS_QUICK_START.md
git commit -m "Add working Azure DevOps pipeline with documentation"
git push origin main
```

### Step 4: Create Pipeline in Azure DevOps (5 min)

1. Go to https://dev.azure.com/broxivacloudmanagement/Broxiva/_build
2. Click "New Pipeline"
3. Select "Azure Repos Git"
4. Select "Broxiva" repository
5. Select "Existing Azure Pipelines YAML file"
6. Path: `/azure-pipelines-working.yml`
7. Click "Continue"
8. Click "Run"

### Step 5: Monitor Pipeline

Watch the pipeline run at:
https://dev.azure.com/broxivacloudmanagement/Broxiva/_build

---

## Pipeline Stages

The pipeline runs in 4 stages:

### Stage 1: Validate ✓
- Checks repository structure
- Verifies Dockerfiles exist
- Displays build information

### Stage 2: Build Images 🐳
- Builds API Docker image
- Builds Web Docker image
- Tags images with multiple tags (build ID, SHA, branch, latest)

### Stage 3: Push to ACR 📤
- Pushes API image to broxivaprodacr.azurecr.io
- Pushes Web image to broxivaprodacr.azurecr.io
- Only runs on main/develop branches (skips PRs)

### Stage 4: Verify ACR ✓
- Lists all repositories in ACR
- Shows recent tags for broxiva-api
- Shows recent tags for broxiva-web

---

## Pipeline Parameters

When running manually, you can set:

- **Build Docker Images:** true/false (default: true)
- **Push to ACR:** true/false (default: true)

---

## Verify ACR Images

After successful pipeline run:

```bash
# Login to ACR
az acr login --name broxivaprodacr

# List repositories
az acr repository list --name broxivaprodacr -o table

# Check API tags
az acr repository show-tags --name broxivaprodacr --repository broxiva-api --orderby time_desc -o table

# Check Web tags
az acr repository show-tags --name broxivaprodacr --repository broxiva-web --orderby time_desc -o table
```

---

## Expected Output

After successful run, you should see these images in ACR:

```
broxivaprodacr.azurecr.io/broxiva-api:latest
broxivaprodacr.azurecr.io/broxiva-api:main
broxivaprodacr.azurecr.io/broxiva-api:<build-id>
broxivaprodacr.azurecr.io/broxiva-api:<short-sha>

broxivaprodacr.azurecr.io/broxiva-web:latest
broxivaprodacr.azurecr.io/broxiva-web:main
broxivaprodacr.azurecr.io/broxiva-web:<build-id>
broxivaprodacr.azurecr.io/broxiva-web:<short-sha>
```

---

## Troubleshooting

### Error: "Service connection not found"

**Fix:** Update service connection names in `azure-pipelines-working.yml` to match what you created in Step 1.

### Error: "ACR not found: broxivaprodacr"

**Fix:** Verify ACR exists:
```bash
az acr list -o table
```

### Error: "Dockerfile not found"

**Fix:** Verify you're running from the correct directory:
```bash
ls -la organization/apps/api/Dockerfile.production
ls -la organization/apps/web/Dockerfile.production
```

### Error: "unauthorized: authentication required"

**Fix:** Service connection needs ACR push permissions. Recreate the BroxivaACR service connection.

---

## Run Pipeline via CLI

```bash
# List pipelines
az pipelines list \
  --organization "https://dev.azure.com/broxivacloudmanagement" \
  --project "Broxiva" \
  -o table

# Run pipeline
az pipelines run \
  --name "Broxiva-Working-Pipeline" \
  --organization "https://dev.azure.com/broxivacloudmanagement" \
  --project "Broxiva" \
  --branch main
```

---

## Next Steps

After getting this basic pipeline working:

1. **Add tests** - Uncomment test stages once ready
2. **Add deployment** - Configure AKS deployment stages
3. **Add notifications** - Set up Slack/Teams webhooks
4. **Add security scanning** - Integrate Trivy for image scanning

---

## Comparison with GitHub Actions

| Feature | GitHub Actions | Azure Pipelines |
|---------|---------------|-----------------|
| Status | ✅ Working | 🟡 Needs setup |
| Complexity | Low | Medium |
| Free minutes | 2,000/month | 1,800/month |
| ACR integration | Via OIDC | Native |

**Recommendation:** Use GitHub Actions as primary CI/CD. Use Azure Pipelines for Azure-specific operations or as backup.

---

## Files Reference

- **azure-pipelines-working.yml** - Working pipeline (use this!)
- **azure-pipelines.yml** - Original pipeline (has issues)
- **.azuredevops/pipelines/main.yml** - Advanced pipeline (missing templates)
- **AZURE_DEVOPS_PIPELINE_ANALYSIS.md** - Full analysis and recommendations

---

## Support

- Azure DevOps Project: https://dev.azure.com/broxivacloudmanagement/Broxiva
- Pipeline Runs: https://dev.azure.com/broxivacloudmanagement/Broxiva/_build
- Service Connections: https://dev.azure.com/broxivacloudmanagement/Broxiva/_settings/adminservices

---

**Last Updated:** December 14, 2024
