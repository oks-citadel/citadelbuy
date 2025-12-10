# CitadelBuy Azure DevOps Setup Instructions

## Completed Automatically

### Pipelines Registered
| ID | Pipeline Name | YAML Path |
|----|---------------|-----------|
| 30 | CitadelBuy-Main-CI-CD | `.azuredevops/pipelines/main.yml` |
| 31 | CitadelBuy-Pipeline-Health-Monitor | `.azuredevops/pipelines/monitoring/pipeline-health.yml` |
| 32 | CitadelBuy-Deployment-Watcher | `.azuredevops/pipelines/monitoring/deployment-watcher.yml` |
| 33 | CitadelBuy-Self-Healing | `.azuredevops/pipelines/monitoring/self-healing.yml` |
| 34 | CitadelBuy-Cost-Optimization | `.azuredevops/pipelines/monitoring/cost-optimization.yml` |
| 35 | CitadelBuy-Security-Scheduled | `.azuredevops/pipelines/templates/pipelines/security-scheduled.yml` |

### Variable Groups Created
| ID | Name | Description |
|----|------|-------------|
| 25 | citadelbuy-secrets-common | Common settings |
| 26 | citadelbuy-secrets-dev | Development environment |
| 27 | citadelbuy-secrets-staging | Staging environment |
| 28 | citadelbuy-secrets-prod | Production environment |
| 29 | citadelbuy-terraform-shared | Terraform configuration |
| 30 | citadelbuy-monitoring | Monitoring/alerting webhooks |

### Azure Resources Created
- **Resource Group**: `citadelbuy-tfstate-rg` (East US)
- **Storage Account**: `citadelbuytfstate`
- **Container**: `tfstate`

---

## Manual Steps Required

### 1. Create Service Connections

#### Azure Resource Manager Connection
1. Go to: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_settings/adminservices
2. Click **New service connection**
3. Select **Azure Resource Manager**
4. Choose **Service principal (automatic)** or **Service principal (manual)**
5. Configure:
   - **Connection name**: `CitadelBuyAzure`
   - **Subscription**: `ba233460-2dbe-4603-a594-68f93ec9deb3`
   - **Subscription name**: CitadelBuy Subscription
   - **Resource group**: (leave empty for subscription-level access)
6. Check **Grant access permission to all pipelines**
7. Click **Save**

#### Azure Container Registry Connection
1. Go to: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_settings/adminservices
2. Click **New service connection**
3. Select **Docker Registry**
4. Choose **Azure Container Registry**
5. Configure:
   - **Connection name**: `CitadelBuyACR`
   - **Azure subscription**: Select your subscription
   - **Azure container registry**: `citadelbuyacr`
6. Check **Grant access permission to all pipelines**
7. Click **Save**

---

### 2. Create Environments with Approval Gates

#### Development Environment (No Approval)
1. Go to: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_environments
2. Click **New environment**
3. Configure:
   - **Name**: `dev`
   - **Description**: Development environment - No approval required
   - **Resource**: None
4. Click **Create**

#### Staging Environment (Optional Approval)
1. Click **New environment**
2. Configure:
   - **Name**: `staging`
   - **Description**: Staging environment - Optional approval
   - **Resource**: None
3. Click **Create**
4. Click on the environment → **Approvals and checks** → **Add check**
5. Select **Approvals** (optional)
6. Add approvers if desired

#### Production Environment (Manual Approval Required)
1. Click **New environment**
2. Configure:
   - **Name**: `production`
   - **Description**: Production environment - Manual approval required
   - **Resource**: None
3. Click **Create**
4. Click on the environment → **Approvals and checks** → **Add check**
5. Select **Approvals**
6. Configure:
   - **Approvers**: Add team leads/managers
   - **Instructions**: Review deployment changes before approving
   - **Timeout**: 24 hours
7. Click **Create**

---

### 3. Add Secret Variables to Variable Groups

Go to: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_library

#### citadelbuy-secrets-common
Add these as **secret** variables:
- `JWT_SECRET` - Your JWT signing secret
- `ENCRYPTION_KEY` - Data encryption key

#### citadelbuy-secrets-dev/staging/prod
Add these as **secret** variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `STRIPE_SECRET_KEY` - Stripe API key
- `PAYPAL_CLIENT_SECRET` - PayPal secret
- `SENTRY_DSN` - Sentry error tracking DSN
- `SENDGRID_API_KEY` - Email service API key

#### citadelbuy-terraform-shared
Add these as **secret** variables:
- `ARM_CLIENT_ID` - Service Principal App ID
- `ARM_CLIENT_SECRET` - Service Principal Secret
- `ARM_TENANT_ID` - Azure Tenant ID

#### citadelbuy-monitoring
Update placeholder values:
- `SLACK_WEBHOOK_URL` - Real Slack webhook URL
- `TEAMS_WEBHOOK_URL` - Real Teams webhook URL

---

### 4. Create Azure Container Registry (if not exists)

```bash
# Create resource group for ACR
az group create --name citadelbuy-acr-rg --location eastus

# Create ACR
az acr create \
  --name citadelbuyacr \
  --resource-group citadelbuy-acr-rg \
  --sku Standard \
  --admin-enabled true

# Get ACR credentials (for service connection)
az acr credential show --name citadelbuyacr
```

---

### 5. Create AKS Clusters (if not exists)

#### Development AKS
```bash
az group create --name citadelbuy-dev-rg --location eastus

az aks create \
  --name citadelbuy-dev-aks \
  --resource-group citadelbuy-dev-rg \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --attach-acr citadelbuyacr \
  --generate-ssh-keys
```

#### Staging AKS
```bash
az group create --name citadelbuy-staging-rg --location eastus

az aks create \
  --name citadelbuy-staging-aks \
  --resource-group citadelbuy-staging-rg \
  --node-count 2 \
  --node-vm-size Standard_B2ms \
  --enable-managed-identity \
  --attach-acr citadelbuyacr \
  --generate-ssh-keys
```

#### Production AKS
```bash
az group create --name citadelbuy-prod-rg --location eastus

az aks create \
  --name citadelbuy-prod-aks \
  --resource-group citadelbuy-prod-rg \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-managed-identity \
  --attach-acr citadelbuyacr \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --generate-ssh-keys
```

---

### 6. Verify Pipeline Configuration

After completing the manual steps:

1. **Run Main Pipeline Manually**:
   - Go to: https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build?definitionId=30
   - Click **Run pipeline**
   - Select branch: `main`
   - Review parameters
   - Click **Run**

2. **Check Pipeline Logs** for any configuration errors

3. **Verify Environment Approvals** by triggering a staging/production deployment

---

## Pipeline URLs

| Pipeline | URL |
|----------|-----|
| Main CI/CD | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build?definitionId=30 |
| Pipeline Health | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build?definitionId=31 |
| Deployment Watcher | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build?definitionId=32 |
| Self-Healing | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build?definitionId=33 |
| Cost Optimization | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build?definitionId=34 |
| Security Scheduled | https://dev.azure.com/citadelcloudmanagement/CitadelBuy/_build?definitionId=35 |

## Support

For issues, check:
- Pipeline logs in Azure DevOps
- Documentation in `.azuredevops/README.md`
- Troubleshooting guide in `.azuredevops/QUICKSTART.md`
