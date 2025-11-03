# 🚀 Quick Start & Deployment Guide
## Global Commerce Platform

> **From zero to production in 4 hours**  
> Step-by-step deployment to Azure • Full automation • Production-ready

---

## 📋 Overview

### What You'll Deploy

```
INFRASTRUCTURE COMPONENTS
├─ Azure Front Door (CDN + WAF)
├─ API Gateway (Kong/APIM)
├─ AKS Cluster (Kubernetes)
├─ PostgreSQL Flexible Server (HA)
├─ Redis Cache (Premium)
├─ Azure Storage (GRS)
├─ Application Insights
├─ Key Vault
├─ Virtual Network
└─ 15+ Microservices

TIME REQUIRED
├─ Prerequisites: 30 min
├─ Infrastructure: 45-60 min
├─ Services: 30-45 min
├─ Verification: 15 min
└─ Total: ~2-3 hours
```

---

## ✅ Prerequisites

### Required Tools

```bash
# Check versions
terraform --version    # Required: >= 1.5.0
docker --version      # Required: >= 24.0.0
node --version        # Required: >= 18.0.0
kubectl version       # Required: >= 1.27.0
az --version          # Required: >= 2.50.0
git --version         # Required: >= 2.40.0

# Optional (for Go services)
go version            # Optional: >= 1.21.0
```

### Install Missing Tools

<details>
<summary><strong>macOS (Homebrew)</strong></summary>

```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install tools
brew install terraform
brew install docker
brew install node@18
brew install kubectl
brew install azure-cli
brew install git
brew install go  # optional
```
</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

```bash
# Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Git
sudo apt-get install git -y
```
</details>

<details>
<summary><strong>Windows (PowerShell)</strong></summary>

```powershell
# Install Chocolatey if needed
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install tools
choco install terraform -y
choco install docker-desktop -y
choco install nodejs-lts -y
choco install kubernetes-cli -y
choco install azure-cli -y
choco install git -y
choco install golang -y  # optional
```
</details>

### Azure Requirements

| Requirement | Details |
|-------------|---------|
| **Azure Subscription** | Active subscription with billing enabled |
| **Role** | Owner or Contributor + User Access Administrator |
| **Quotas** | Verify CPU/memory quotas in target regions |
| **Budget** | ~$23K/month for production |

---

## 🎯 Step-by-Step Deployment

### Step 1: Azure CLI Setup (5 min)

```bash
# 1. Login to Azure
az login

# 2. List subscriptions
az account list --output table

# 3. Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# 4. Verify current subscription
az account show --output table

# 5. Register required providers
az provider register --namespace Microsoft.ContainerService
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.Cache
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.Cdn

# Wait for registration (5-10 minutes)
az provider show --namespace Microsoft.ContainerService --query "registrationState"
```

### Step 2: Clone Repository (2 min)

```bash
# Clone repository
git clone https://github.com/your-org/global-commerce-platform.git
cd global-commerce-platform

# Verify structure
tree -L 2 -d
```

### Step 3: Terraform Backend Setup (10 min)

```bash
# Create resource group for Terraform state
az group create \
  --name tfstate-rg \
  --location eastus

# Create storage account (unique name required)
STORAGE_ACCOUNT_NAME="tfstate$(openssl rand -hex 4)"

az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group tfstate-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Get storage account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group tfstate-rg \
  --account-name $STORAGE_ACCOUNT_NAME \
  --query '[0].value' -o tsv)

# Create blob container
az storage container create \
  --name tfstate \
  --account-name $STORAGE_ACCOUNT_NAME \
  --account-key $ACCOUNT_KEY

# Save for later
echo "STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT_NAME" > .env
echo "ACCOUNT_KEY=$ACCOUNT_KEY" >> .env

echo "✅ Terraform backend created!"
echo "Storage Account: $STORAGE_ACCOUNT_NAME"
```

### Step 4: Configure Variables (10 min)

```bash
cd infrastructure/terraform

# Copy example configuration
cp environments/production/terraform.tfvars.example \
   environments/production/terraform.tfvars

# Edit configuration
nano environments/production/terraform.tfvars
```

**terraform.tfvars:**

```hcl
# Project Configuration
project_name = "global-commerce"
environment  = "production"
location     = "eastus"

# Secondary regions for multi-region deployment
secondary_locations = ["westeurope", "southeastasia"]

# Networking
vnet_address_space = ["10.0.0.0/16"]
allowed_ip_ranges  = ["YOUR_OFFICE_IP/32"]  # Your IP for admin access

# Database
db_admin_username = "dbadmin"
db_admin_password = "YourSecurePassword123!"  # CHANGE THIS!
db_sku_name       = "GP_Standard_D4s_v3"
db_storage_mb     = 131072  # 128 GB

# Monitoring
alert_email_addresses = ["ops@yourcompany.com"]

# Tags
common_tags = {
  Project     = "Global Commerce Platform"
  Environment = "production"
  CostCenter  = "Engineering"
  ManagedBy   = "Terraform"
}
```

### Step 5: Initialize Terraform (5 min)

```bash
# Load environment variables
source ../../.env

# Initialize Terraform with backend
terraform init \
  -backend-config="storage_account_name=$STORAGE_ACCOUNT_NAME" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=global-commerce.tfstate" \
  -backend-config="access_key=$ACCOUNT_KEY"

# Validate configuration
terraform validate

# Format configuration
terraform fmt -recursive
```

### Step 6: Plan Infrastructure (10 min)

```bash
# Create execution plan
terraform plan \
  -var-file="environments/production/terraform.tfvars" \
  -out=tfplan

# Review the plan
# Look for:
# - Number of resources to create (~50+)
# - Estimated costs
# - Any errors or warnings
```

### Step 7: Deploy Infrastructure (45-60 min)

```bash
# Apply Terraform configuration
terraform apply tfplan

# This will create:
# ├─ Virtual Network and Subnets
# ├─ Network Security Groups
# ├─ Azure Front Door (CDN)
# ├─ API Management / Kong
# ├─ AKS Cluster (takes ~10-15 min)
# ├─ PostgreSQL Flexible Server (takes ~10-15 min)
# ├─ Redis Cache Premium (takes ~10-15 min)
# ├─ Azure Storage Account
# ├─ Application Insights
# ├─ Key Vault
# ├─ Container Registry
# └─ Log Analytics Workspace

# Deployment progress will be shown
# Total time: ~45-60 minutes

# ✅ Infrastructure deployment complete!
```

### Step 8: Verify Infrastructure (5 min)

```bash
# Get outputs
terraform output

# Key outputs:
# - aks_cluster_name
# - acr_login_server
# - key_vault_name
# - postgresql_server_name
# - frontend_domain

# Connect to AKS cluster
az aks get-credentials \
  --resource-group rg-global-commerce-production-eastus \
  --name $(terraform output -raw aks_cluster_name)

# Verify cluster access
kubectl get nodes
kubectl get namespaces
```

---

## 🔐 Step 9: Configure Secrets (15 min)

### Store Secrets in Key Vault

```bash
# Get Key Vault name
KEY_VAULT_NAME=$(terraform output -raw key_vault_name)

# Database connection string
DB_HOST=$(terraform output -raw postgresql_server_name)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "db-connection-string" \
  --value "postgresql://dbadmin:PASSWORD@${DB_HOST}.postgres.database.azure.com/commerce_main?sslmode=require"

# JWT secret
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "jwt-secret" \
  --value "$(openssl rand -base64 32)"

# Stripe API key (get from Stripe dashboard)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "stripe-api-key" \
  --value "sk_test_YOUR_KEY"

# SendGrid API key (get from SendGrid)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "sendgrid-api-key" \
  --value "SG.YOUR_KEY"

# PayPal credentials
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "paypal-client-id" \
  --value "YOUR_CLIENT_ID"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "paypal-secret" \
  --value "YOUR_SECRET"
```

---

## 🐳 Step 10: Build & Deploy Services (30-45 min)

### Build Docker Images

```bash
cd ../../backend

# Build all services
./scripts/build-all.sh

# Or build individual services
docker build -t auth-service:latest ./services/auth-service
docker build -t product-service:latest ./services/product-service
docker build -t order-service:latest ./services/order-service
# ... etc
```

### Push to Container Registry

```bash
# Get ACR login server
ACR_NAME=$(cd ../infrastructure/terraform && terraform output -raw acr_login_server)

# Login to ACR
az acr login --name ${ACR_NAME%.azurecr.io}

# Tag and push images
for service in auth-service user-service product-service order-service payment-service inventory-service; do
  docker tag ${service}:latest $ACR_NAME/${service}:latest
  docker push $ACR_NAME/${service}:latest
done

echo "✅ Images pushed to ACR!"
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace production

# Deploy services using Helm (recommended)
cd ../infrastructure/kubernetes/helm-charts

# Deploy each service
helm install auth-service ./auth-service \
  --namespace production \
  --set image.repository=$ACR_NAME/auth-service \
  --set image.tag=latest

helm install product-service ./product-service \
  --namespace production \
  --set image.repository=$ACR_NAME/product-service \
  --set image.tag=latest

# ... deploy remaining services

# Or use kubectl directly
kubectl apply -f ../base/auth-service/ -n production
kubectl apply -f ../base/product-service/ -n production

# Monitor deployment
kubectl get pods -n production -w
```

---

## 🗄️ Step 11: Database Setup (10 min)

### Run Migrations

```bash
cd ../../database

# Install db-migrate globally
npm install -g db-migrate db-migrate-pg

# Configure database connection
export DATABASE_URL="postgresql://dbadmin:PASSWORD@SERVER.postgres.database.azure.com/commerce_main?sslmode=require"

# Run migrations
db-migrate up

# Or use custom script
./scripts/migrate.sh up

# Verify migrations
db-migrate status
```

### Seed Data (Optional)

```bash
# Seed initial data
./scripts/seed.sh

# This creates:
# - Sample products (100)
# - Categories (20)
# - Sample users (10)
# - Default settings
```

---

## 🌐 Step 12: Deploy Frontend (15 min)

### Option 1: Azure Static Web Apps

```bash
cd ../frontend/web

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Azure
az staticwebapp create \
  --name global-commerce-web \
  --resource-group rg-global-commerce-production-eastus \
  --source . \
  --location "East US 2" \
  --branch main \
  --app-location "/" \
  --output-location "out" \
  --token $(az account get-access-token --query accessToken -o tsv)
```

### Option 2: Azure App Service (Container)

```bash
# Build Docker image
docker build -t frontend:latest .

# Push to ACR
docker tag frontend:latest $ACR_NAME/frontend:latest
docker push $ACR_NAME/frontend:latest

# Deploy via Terraform or Azure CLI
az webapp config container set \
  --name global-commerce-web \
  --resource-group rg-global-commerce-production-eastus \
  --docker-custom-image-name $ACR_NAME/frontend:latest \
  --docker-registry-server-url https://$ACR_NAME
```

---

## ✅ Step 13: Verification (10 min)

### Health Checks

```bash
# Get API endpoint
API_URL=$(cd ../infrastructure/terraform && terraform output -raw api_gateway_url)

# Check API Gateway health
curl $API_URL/health
# Expected: {"status":"healthy","timestamp":"..."}

# Check individual services
curl $API_URL/api/v1/auth/health
curl $API_URL/api/v1/products/health
curl $API_URL/api/v1/orders/health
```

### Test Authentication

```bash
# Register new user
curl -X POST $API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'

# Login
TOKEN=$(curl -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }' | jq -r '.accessToken')

# Test authenticated request
curl $API_URL/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test Product API

```bash
# Get products
curl $API_URL/api/v1/products

# Create product (requires auth)
curl -X POST $API_URL/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "This is a test product",
    "price": 29.99,
    "currency": "USD",
    "stock": 100
  }'
```

### Check Monitoring

```bash
# Get Application Insights name
INSIGHTS_NAME=$(cd ../infrastructure/terraform && terraform output -raw app_insights_name)

# View recent traces
az monitor app-insights query \
  --app $INSIGHTS_NAME \
  --analytics-query "traces | take 10" \
  --output table

# View recent requests
az monitor app-insights query \
  --app $INSIGHTS_NAME \
  --analytics-query "requests | take 10" \
  --output table
```

---

## 🎛️ Step 14: Configure Monitoring (10 min)

### Set Up Alerts

```bash
# Create action group
az monitor action-group create \
  --name ops-team \
  --resource-group rg-global-commerce-production-eastus \
  --short-name ops \
  --email-receiver email ops ops@yourcompany.com

# API response time alert
az monitor metrics alert create \
  --name high-response-time \
  --resource-group rg-global-commerce-production-eastus \
  --scopes "/subscriptions/SUB_ID/resourceGroups/rg-global-commerce-production-eastus" \
  --condition "avg response_time > 500" \
  --description "Alert when API response time exceeds 500ms" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --action ops-team

# Error rate alert
az monitor metrics alert create \
  --name high-error-rate \
  --resource-group rg-global-commerce-production-eastus \
  --scopes "/subscriptions/SUB_ID/resourceGroups/rg-global-commerce-production-eastus" \
  --condition "avg error_rate > 1" \
  --description "Alert when error rate exceeds 1%" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --action ops-team
```

### Configure Dashboards

```bash
# Import pre-built dashboard
az portal dashboard import \
  --name "Global Commerce Dashboard" \
  --resource-group rg-global-commerce-production-eastus \
  --input-path ../scripts/monitoring/dashboard.json
```

---

## 🔄 Step 15: CI/CD Setup (15 min)

### GitHub Actions

```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "github-actions-global-commerce" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth

# Copy output and add to GitHub Secrets:
# - AZURE_CREDENTIALS
# - ACR_NAME
# - RESOURCE_GROUP
```

**Add to GitHub Secrets:**

1. Go to repository Settings → Secrets → Actions
2. Add secrets:
   - `AZURE_CREDENTIALS` - Output from service principal
   - `ACR_NAME` - Container registry name
   - `RESOURCE_GROUP` - Resource group name
   - `STRIPE_SECRET_KEY` - Stripe API key
   - `SLACK_WEBHOOK_URL` - For notifications

---

## 🎉 Deployment Complete!

### Access Your Platform

```
Web Application:    https://your-domain.com
Admin Dashboard:    https://admin.your-domain.com
API Gateway:        https://api.your-domain.com
API Documentation:  https://api.your-domain.com/docs
Monitoring:         https://portal.azure.com (Application Insights)
```

### Next Steps

- [ ] Configure custom domain (Azure DNS or your provider)
- [ ] Set up SSL certificates (Let's Encrypt or purchased)
- [ ] Configure Auth0 or Azure AD B2C
- [ ] Add payment gateway credentials (Stripe, PayPal)
- [ ] Configure email service (SendGrid)
- [ ] Set up backup policies
- [ ] Create runbooks for operations
- [ ] Train team on operations

---

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><strong>Issue: Cannot connect to database</strong></summary>

```bash
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group rg-global-commerce-production-eastus \
  --name postgres-global-commerce-production

# Add your IP
az postgres flexible-server firewall-rule create \
  --resource-group rg-global-commerce-production-eastus \
  --name postgres-global-commerce-production \
  --rule-name allow-my-ip \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```
</details>

<details>
<summary><strong>Issue: Container fails to start</strong></summary>

```bash
# Check pod logs
kubectl logs -n production <pod-name>

# Describe pod for events
kubectl describe pod -n production <pod-name>

# Check service status
kubectl get pods -n production
kubectl get services -n production
```
</details>

<details>
<summary><strong>Issue: High latency</strong></summary>

```bash
# Check Application Insights
az monitor app-insights query \
  --app $INSIGHTS_NAME \
  --analytics-query "requests | summarize avg(duration) by bin(timestamp, 1h)" \
  --output table

# Check pod resource usage
kubectl top pods -n production

# Scale up if needed
kubectl scale deployment <service-name> --replicas=5 -n production
```
</details>

<details>
<summary><strong>Issue: Terraform state lock</strong></summary>

```bash
# Force unlock (use with caution)
terraform force-unlock <LOCK_ID>

# Or delete lock from storage
az storage blob delete \
  --account-name $STORAGE_ACCOUNT_NAME \
  --account-key $ACCOUNT_KEY \
  --container-name tfstate \
  --name global-commerce.tfstate.lock
```
</details>

---

## 📚 Additional Resources

### Documentation

- [Complete Architecture](../architecture/ARCHITECTURE.md)
- [Technology Stack](../TECH-STACK.md)
- [Platform Requirements](../PLATFORM-REQUIREMENTS.md)
- [API Documentation](../api/README.md)

### External Links

- [Azure Documentation](https://docs.microsoft.com/azure)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### Support

- **Email:** devops@yourcompany.com
- **Slack:** #platform-ops
- **On-Call:** PagerDuty rotation
- **Status:** https://status.yourcompany.com

---

## 📊 Deployment Checklist

### Pre-Deployment

- [ ] Azure subscription active
- [ ] All tools installed
- [ ] Service accounts created
- [ ] Secrets prepared
- [ ] Budget approved

### Infrastructure

- [ ] Terraform backend created
- [ ] Variables configured
- [ ] Infrastructure deployed
- [ ] Outputs verified
- [ ] Networking tested

### Services

- [ ] Docker images built
- [ ] Images pushed to ACR
- [ ] Services deployed to AKS
- [ ] Health checks passing
- [ ] Logs available

### Data

- [ ] Database migrations run
- [ ] Seed data loaded (if needed)
- [ ] Backups configured
- [ ] Connection pooling enabled

### Security

- [ ] Secrets in Key Vault
- [ ] Firewall rules configured
- [ ] WAF enabled
- [ ] SSL certificates installed
- [ ] RBAC configured

### Monitoring

- [ ] Application Insights configured
- [ ] Alerts set up
- [ ] Dashboards created
- [ ] Log aggregation working

### Post-Deployment

- [ ] Health checks passing
- [ ] Performance tests run
- [ ] Load tests completed
- [ ] Disaster recovery tested
- [ ] Documentation updated

---

**🎉 Congratulations! Your Global Commerce Platform is live! 🚀**

---

*Quick Start Guide Version: 2.0 (Redesigned)*  
*Last Updated: December 2024*  
*Maintained By: Platform DevOps Team*  
*Next Review: March 2025*
