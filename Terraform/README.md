# Global Commerce Platform - Infrastructure Setup

This repository contains the Infrastructure as Code (IaC) for deploying the Global Commerce Platform to Azure using Terraform and Azure DevOps.

## 📋 Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Environments](#environments)
- [CI/CD Pipeline](#cicd-pipeline)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Global Commerce Platform is a cloud-native, microservices-based e-commerce solution built on Azure. This infrastructure code provisions:

- **13 Microservices**: API Gateway, Auth, User, Product, Order, Payment, Inventory, Shipping, Notification, Search, Analytics, AI, and Vendor services
- **Database Layer**: PostgreSQL Flexible Server with 7 dedicated databases
- **Caching Layer**: Redis Cache (Premium in production)
- **Event Streaming**: Azure Event Hub with 4 event topics
- **Storage**: Azure Blob Storage for media and documents
- **Container Registry**: Azure Container Registry for Docker images
- **API Management**: Azure APIM for API versioning and rate limiting
- **CDN**: Azure Front Door with WAF
- **Monitoring**: Application Insights and Log Analytics
- **Security**: Azure Key Vault for secrets management

## 🔧 Prerequisites

### Required Tools
```bash
# Terraform
terraform >= 1.5.0

# Azure CLI
az cli >= 2.50.0

# Docker (for local development)
docker >= 20.10.0

# Node.js (for services)
node >= 18.x
```

### Azure Subscription
- An active Azure subscription with Contributor role
- Azure DevOps organization (for CI/CD)
- Service Principal with appropriate permissions

### Environment Variables
Create a `.env` file with:
```bash
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"

export TF_VAR_db_admin_username="dbadmin"
export TF_VAR_db_admin_password="YourStrongPassword123!"
export TF_VAR_apim_publisher_email="admin@company.com"
```

## 🏗️ Architecture

```
Azure Front Door (CDN + WAF)
         ↓
   API Management
         ↓
    API Gateway (App Service)
         ↓
   ┌─────────────────────────────┐
   │   Microservices Layer       │
   │  (13 containerized services)│
   └─────────────────────────────┘
         ↓
   ┌─────────────────────────────┐
   │     Data Layer              │
   │ • PostgreSQL (7 databases)  │
   │ • Redis Cache               │
   │ • Blob Storage              │
   │ • Event Hub                 │
   └─────────────────────────────┘
```

See [DATA_FLOW_GUIDE.md](./DATA_FLOW_GUIDE.md) for detailed data flows.

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/global-commerce-platform.git
cd global-commerce-platform/infrastructure/terraform
```

### 2. Initialize Terraform Backend
First, create a storage account for Terraform state:

```bash
# Create resource group for Terraform state
az group create \
  --name terraform-state-rg \
  --location eastus

# Create storage account
az storage account create \
  --name tfstateglobalcommerce \
  --resource-group terraform-state-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name tfstateglobalcommerce
```

### 3. Configure Backend
Create `backend.tf`:
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstateglobalcommerce"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"  # Change per environment
  }
}
```

### 4. Initialize Terraform
```bash
terraform init
```

## 📦 Deployment

### Manual Deployment

#### Development Environment
```bash
# Plan
terraform plan \
  -var-file="terraform.dev.tfvars" \
  -var="db_admin_username=${TF_VAR_db_admin_username}" \
  -var="db_admin_password=${TF_VAR_db_admin_password}" \
  -var="apim_publisher_email=${TF_VAR_apim_publisher_email}" \
  -out=tfplan

# Apply
terraform apply tfplan
```

#### Test Environment
```bash
terraform workspace new test  # Create workspace
terraform workspace select test

terraform plan \
  -var-file="terraform.test.tfvars" \
  -var="db_admin_username=${TF_VAR_db_admin_username}" \
  -var="db_admin_password=${TF_VAR_db_admin_password}" \
  -var="apim_publisher_email=${TF_VAR_apim_publisher_email}" \
  -out=tfplan

terraform apply tfplan
```

#### Production Environment
```bash
terraform workspace new production
terraform workspace select production

# IMPORTANT: Review plan carefully before production deployment
terraform plan \
  -var-file="terraform.production.tfvars" \
  -var="db_admin_username=${TF_VAR_db_admin_username}" \
  -var="db_admin_password=${TF_VAR_db_admin_password}" \
  -var="apim_publisher_email=${TF_VAR_apim_publisher_email}" \
  -out=tfplan

# Requires manual approval
terraform apply tfplan
```

### Outputs
After deployment, view outputs:
```bash
terraform output

# Or specific output
terraform output api_gateway_url
terraform output frontdoor_endpoint_url
```

## 🌍 Environments

### Development (dev)
- **Purpose**: Active development and testing
- **Resources**: Minimal tier (Basic/Burstable)
- **Cost**: ~$300-500/month
- **Auto-scaling**: Disabled
- **Backup retention**: 7 days
- **Deployment**: Automated on `develop` branch push

**Configuration**: `terraform.dev.tfvars`

### Test (test)
- **Purpose**: Integration testing and QA
- **Resources**: Standard tier
- **Cost**: ~$800-1200/month
- **Auto-scaling**: Limited (2-5 instances)
- **Backup retention**: 7 days
- **Deployment**: Automated after dev deployment succeeds

**Configuration**: `terraform.test.tfvars`

### Production (production)
- **Purpose**: Live customer traffic
- **Resources**: Premium/General Purpose tier
- **Cost**: ~$2500-4000/month
- **Auto-scaling**: Full (3-15 instances)
- **High Availability**: Enabled
- **Backup retention**: 35 days
- **Geo-redundancy**: Enabled
- **Deployment**: Requires manual approval, blue-green deployment

**Configuration**: `terraform.production.tfvars`

## 🔄 CI/CD Pipeline

### Azure DevOps Pipeline
The pipeline is defined in `azure-pipelines.yml` and includes:

1. **Build Stage**: Compile and test all microservices
2. **Docker Build Stage**: Build and push Docker images to ACR
3. **Deploy Dev Stage**: Deploy to development environment
4. **Deploy Test Stage**: Deploy to test environment
5. **Deploy Production Stage**: Deploy to production (with approval)

### Pipeline Setup

1. **Import Pipeline**:
   ```bash
   # In Azure DevOps
   Pipelines → New Pipeline → Azure Repos Git → Select repo → Existing Azure Pipelines YAML file
   ```

2. **Configure Variable Groups**:
   Create three variable groups in Azure DevOps:
   
   - `dev-environment-variables`
   - `test-environment-variables`
   - `production-environment-variables`
   
   Each with:
   ```
   DB_ADMIN_USERNAME (secret)
   DB_ADMIN_PASSWORD (secret)
   APIM_PUBLISHER_EMAIL
   acrLoginServer (e.g., yourregistry.azurecr.io)
   ```

3. **Configure Service Connections**:
   - `Azure-Production-Subscription`: Azure Resource Manager connection
   - `ACR-ServiceConnection`: Azure Container Registry connection

4. **Set Branch Policies**:
   - `develop` branch: Auto-deploy to dev → test
   - `main` branch: Auto-deploy to production (with approval)

### Pipeline Triggers
- **Push to `develop`**: Deploy to dev → test
- **Push to `main`**: Deploy to production (requires approval)
- **Pull Request**: Run tests only

### Deployment Approval
Production deployments require manual approval:
```
Azure DevOps → Environments → production → Approvals and checks
```

## ⚙️ Configuration

### Scaling Configuration

**App Services** (`terraform.*.tfvars`):
```hcl
# Development
app_service_sku = "B2"  # 2 vCPU, 3.5 GB RAM

# Test
app_service_sku = "S2"  # 2 vCPU, 3.5 GB RAM

# Production
app_service_sku = "P2v3"  # 4 vCPU, 8 GB RAM
```

**Database** (`terraform.*.tfvars`):
```hcl
# Development
db_sku_name = "B_Standard_B1ms"  # 1 vCore, burstable
db_storage_mb = 32768  # 32 GB

# Production
db_sku_name = "GP_Standard_D4s_v3"  # 4 vCores, General Purpose
db_storage_mb = 262144  # 256 GB
```

### Network Configuration
- **Dev**: Single VNet (10.0.0.0/16)
- **Test**: Dedicated VNet (10.1.0.0/16)
- **Production**: Dedicated VNet (10.2.0.0/16) with NSGs

### Monitoring Configuration
```hcl
# Application Insights retention
appinsights_retention_days = 90  # Production
appinsights_retention_days = 30  # Dev
```

## 🔍 Monitoring

### Application Insights
```bash
# View logs
az monitor app-insights query \
  --app globalcommerce-production-appinsights \
  --analytics-query "requests | where timestamp > ago(1h)" \
  --output table

# View metrics
az monitor metrics list \
  --resource globalcommerce-production-api-gateway \
  --metric "Requests" \
  --output table
```

### Key Metrics
- **Availability**: 99.9% SLA target
- **Latency**: p95 < 200ms
- **Error Rate**: < 0.1%
- **Throughput**: 10,000+ req/sec (production)

### Alerts
Alerts are configured for:
- High error rate (>1%)
- High latency (p95 >500ms)
- Low availability (<99%)
- Database connection failures
- High memory/CPU usage (>80%)

## 🔐 Security

### Secrets Management
All secrets stored in Azure Key Vault:
- Database credentials
- API keys
- Connection strings
- Certificates

**Accessing Secrets**:
```bash
# List secrets
az keyvault secret list --vault-name globalcommerce-prod-kv

# Get secret value
az keyvault secret show \
  --vault-name globalcommerce-prod-kv \
  --name db-admin-password \
  --query value -o tsv
```

### Network Security
- Private endpoints for databases
- Network Security Groups (NSGs) restrict traffic
- Azure Front Door WAF protects against attacks
- DDoS Protection enabled in production

### Compliance
- **GDPR/CCPA**: Data retention policies configured
- **PCI-DSS**: Payment data not stored, tokenized via gateways
- **SOC 2**: Audit logs enabled
- **ISO 27001**: Encryption at rest and in transit

## 🐛 Troubleshooting

### Common Issues

#### 1. Terraform State Lock
```bash
# If state is locked
az storage blob lease break \
  --account-name tfstateglobalcommerce \
  --container-name tfstate \
  --blob-name dev.terraform.tfstate
```

#### 2. Database Connection Failures
```bash
# Check database status
az postgres flexible-server show \
  --resource-group globalcommerce-dev-rg \
  --name globalcommerce-dev-postgres

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group globalcommerce-dev-rg \
  --server-name globalcommerce-dev-postgres
```

#### 3. App Service Not Starting
```bash
# View logs
az webapp log tail \
  --name globalcommerce-dev-api-gateway \
  --resource-group globalcommerce-dev-rg

# Check app settings
az webapp config appsettings list \
  --name globalcommerce-dev-api-gateway \
  --resource-group globalcommerce-dev-rg
```

#### 4. Container Registry Access Denied
```bash
# Login to ACR
az acr login --name globalcommercedevacr

# Check permissions
az acr show \
  --name globalcommercedevacr \
  --query "{loginServer:loginServer,adminUserEnabled:adminUserEnabled}"
```

### Getting Help
- **Documentation**: See `docs/` directory
- **Issues**: Open issue on GitHub
- **Support**: Contact platform-team@company.com

## 📚 Additional Resources

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Detailed architecture documentation
- [DATA_FLOW_GUIDE.md](./DATA_FLOW_GUIDE.md) - Data flow diagrams and patterns
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [docs/api/](../docs/api/) - API documentation
- [docs/runbooks/](../docs/runbooks/) - Operational runbooks

## 🧹 Cleanup

To destroy all infrastructure:

```bash
# Development
terraform workspace select dev
terraform destroy -var-file="terraform.dev.tfvars"

# Test
terraform workspace select test
terraform destroy -var-file="terraform.test.tfvars"

# Production (use with EXTREME caution)
terraform workspace select production
terraform destroy -var-file="terraform.production.tfvars"
```

**Warning**: This will permanently delete all resources and data!

## 📝 License

See [LICENSE](../LICENSE) file for details.

## 👥 Contributors

- Platform Team <platform-team@company.com>

---

**Last Updated**: October 2025
**Terraform Version**: 1.5.7
**Azure Provider Version**: 3.80+
