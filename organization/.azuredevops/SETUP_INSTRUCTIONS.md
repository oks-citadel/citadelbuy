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

### Azure Container Registry Created
- **Resource Group**: `citadelbuy-acr-rg` (East US)
- **Registry Name**: `citadelbuyacr`
- **SKU**: Standard

### AKS Clusters Created
| Cluster | Resource Group | Nodes | VM Size | Autoscale |
|---------|----------------|-------|---------|-----------|
| citadelbuy-dev-aks | citadelbuy-dev-rg | 2 | Standard_B2s | No |
| citadelbuy-staging-aks | citadelbuy-staging-rg | 2 | Standard_B2ms | No |
| citadelbuy-prod-aks | citadelbuy-prod-rg | 1-3 | Standard_B2s | Yes |

**Note**: Production cluster was created with reduced capacity due to vCPU quota limits. To scale up production, request quota increase at: https://learn.microsoft.com/en-us/azure/quotas/view-quotas

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

### 4. Verify Pipeline Configuration

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
