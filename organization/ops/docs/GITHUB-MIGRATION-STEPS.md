# GitHub Migration - Final Steps

## Current Status

### Completed
- [x] 20 GitHub Actions workflow files created
- [x] 12 documentation files created
- [x] All workflows committed to Azure DevOps repository
- [x] Azure infrastructure ready (AKS, ACR, Key Vault)
- [x] Azure DevOps environments configured (dev, staging, production)

### Pending - Requires Manual Action
- [ ] Create GitHub repository
- [ ] Configure Azure OIDC for GitHub
- [ ] Set up GitHub secrets
- [ ] Create GitHub environments
- [ ] Push code to GitHub
- [ ] Trigger first deployment

---

## Step 1: Create GitHub Repository

### Option A: GitHub.com (Recommended)
```bash
# Using GitHub CLI
gh repo create broxiva/Broxiva --private --description "Broxiva E-Commerce Platform"

# Or via GitHub.com:
# 1. Go to https://github.com/new
# 2. Repository name: Broxiva
# 3. Visibility: Private
# 4. Create repository
```

### Option B: GitHub Enterprise
```bash
gh repo create YOUR_ORG/Broxiva --private
```

---

## Step 2: Configure Azure AD for GitHub OIDC

### 2.1 Create Azure AD App Registration
```bash
# Create the app registration
az ad app create --display-name "GitHub-Broxiva-OIDC"

# Get the App ID (save this - it's your AZURE_CLIENT_ID)
APP_ID=$(az ad app list --display-name "GitHub-Broxiva-OIDC" --query "[0].appId" -o tsv)
echo "AZURE_CLIENT_ID: $APP_ID"

# Create service principal
az ad sp create --id $APP_ID
```

### 2.2 Assign Azure Permissions
```bash
SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"

# Contributor role (for deployments)
az role assignment create \
  --assignee $APP_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# AcrPush role (for container registry)
az role assignment create \
  --assignee $APP_ID \
  --role "AcrPush" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/broxiva-acr-rg/providers/Microsoft.ContainerRegistry/registries/broxivaacr"

# AKS Cluster User role
az role assignment create \
  --assignee $APP_ID \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Storage Blob Data Contributor (for Terraform state)
az role assignment create \
  --assignee $APP_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/broxiva-tfstate-rg/providers/Microsoft.Storage/storageAccounts/broxivatfstate"
```

### 2.3 Create Federated Credentials
```bash
# Get App Object ID
APP_OBJECT_ID=$(az ad app show --id $APP_ID --query id -o tsv)

# Replace with your GitHub organization/username
GITHUB_ORG="YOUR_GITHUB_ORG"
GITHUB_REPO="Broxiva"

# Main branch
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Develop branch
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-develop",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':ref:refs/heads/develop",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Pull requests
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-pr",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':pull_request",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Dev environment
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-env-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':environment:dev",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Staging environment
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-env-staging",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':environment:staging",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Production environment
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-env-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

---

## Step 3: Configure GitHub Repository Secrets

Go to: `https://github.com/YOUR_ORG/Broxiva/settings/secrets/actions`

### Required Secrets
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_CLIENT_ID` | `<from step 2.1>` | Azure AD App ID |
| `AZURE_TENANT_ID` | `ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0` | Azure Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | `ba233460-2dbe-4603-a594-68f93ec9deb3` | Azure Subscription |

### Optional Secrets (Recommended)
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SLACK_WEBHOOK_URL` | `<your webhook>` | Slack notifications |
| `TEAMS_WEBHOOK_URL` | `<your webhook>` | Teams notifications |
| `SNYK_TOKEN` | `<your token>` | Enhanced dependency scanning |
| `INFRACOST_API_KEY` | `<your key>` | Terraform cost estimation |

---

## Step 4: Create GitHub Environments

Go to: `https://github.com/YOUR_ORG/Broxiva/settings/environments`

### Development Environment
1. Click "New environment"
2. Name: `dev`
3. No protection rules required
4. Add environment secrets if needed

### Staging Environment
1. Click "New environment"
2. Name: `staging`
3. Protection rules:
   - Required reviewers: 1 (optional)
   - Wait timer: 0 minutes
4. Deployment branches: `main`, `develop`, `staging`

### Production Environment
1. Click "New environment"
2. Name: `production`
3. Protection rules:
   - Required reviewers: 2
   - Wait timer: 5 minutes
4. Deployment branches: `main` only
5. Add environment-specific secrets

---

## Step 5: Push Code to GitHub

```bash
# Navigate to project
cd C:\Users\Dell\OneDrive\Documents\Broxivabuy\Broxiva\organization

# Add GitHub as a remote
git remote add github https://github.com/YOUR_ORG/Broxiva.git

# Push all branches
git push github main
git push github develop  # if exists

# Or push all branches at once
git push github --all
git push github --tags
```

---

## Step 6: Trigger First Deployment

### Option A: Manual Trigger
1. Go to Actions tab in GitHub
2. Select "CD - Development" workflow
3. Click "Run workflow"
4. Select branch: `main` or `develop`
5. Click "Run workflow"

### Option B: Push to Trigger
```bash
# Make a small change and push
echo "# Deployment trigger" >> README.md
git add README.md
git commit -m "chore: trigger initial deployment"
git push github main
```

---

## Step 7: Verify Deployment

### Check GitHub Actions
1. Go to: `https://github.com/YOUR_ORG/Broxiva/actions`
2. Monitor workflow runs
3. Check for any failures

### Check AKS Deployment
```bash
# Get AKS credentials
az aks get-credentials --resource-group broxiva-dev-rg --name broxiva-dev-aks

# Check pods
kubectl get pods -n broxiva-dev

# Check services
kubectl get svc -n broxiva-dev

# Check deployments
kubectl get deployments -n broxiva-dev
```

### Check Application Health
```bash
# Dev environment
curl https://dev.broxiva.com/api/health

# Staging environment (after staging deployment)
curl https://staging.broxiva.com/api/health
```

---

## Step 8: Production Deployment

After successful dev and staging deployments:

1. Create a release branch or tag
2. Merge to `main`
3. GitHub Actions will trigger `cd-prod.yml`
4. Approve the deployment in GitHub
5. Monitor Blue-Green deployment
6. Verify production health

---

## Post-Migration Tasks

### Decommission Azure DevOps
After GitHub is fully operational:

1. Disable Azure DevOps pipeline triggers
2. Archive Azure DevOps pipelines
3. Update documentation
4. Notify team of migration completion

### Monitor & Maintain
- Review drift detection reports (daily)
- Monitor security scan results (weekly)
- Check secret rotation status (monthly)
- Update dependencies (quarterly)

---

## Troubleshooting

### OIDC Authentication Fails
```
Error: AADSTS70021: No matching federated identity record found
```
- Verify GitHub org/repo name in federated credentials
- Check subject claim format matches exactly

### AKS Deployment Fails
```bash
# Check AKS cluster status
az aks show --resource-group broxiva-dev-rg --name broxiva-dev-aks --query provisioningState

# Check kubeconfig
az aks get-credentials --resource-group broxiva-dev-rg --name broxiva-dev-aks --overwrite-existing
```

### Container Push Fails
```bash
# Verify ACR permissions
az role assignment list --assignee $APP_ID --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/broxiva-acr-rg/providers/Microsoft.ContainerRegistry/registries/broxivaacr

# Test ACR access
az acr login --name broxivaacr
```

---

## Support

- GitHub Actions Docs: https://docs.github.com/en/actions
- Azure OIDC Docs: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure
- AKS Docs: https://docs.microsoft.com/en-us/azure/aks/

---

*Document Created: 2025-12-10*
*Migration Status: Workflows Ready - Pending GitHub Setup*
