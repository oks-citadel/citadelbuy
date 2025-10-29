# Setup & Deployment Guide

## 🚀 Quick Start Guide

This guide will help you set up and deploy the Global Commerce Platform on Azure.

---

## Prerequisites

### Required Tools

```bash
# Check versions
terraform --version    # >= 1.5.0
docker --version       # >= 24.0.0
node --version         # >= 18.0.0
go version            # >= 1.21.0 (if using Go backend)
kubectl version       # >= 1.27.0
az --version          # >= 2.50.0
git --version         # >= 2.40.0
```

### Azure Requirements

- Active Azure subscription
- Subscription Owner or Contributor role
- Sufficient quota for resources
- Azure CLI logged in

---

## 📋 Step-by-Step Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/global-commerce-platform.git
cd global-commerce-platform
```

### Step 2: Configure Azure CLI

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify
az account show
```

### Step 3: Create Terraform Backend

```bash
# Create resource group for Terraform state
az group create \
  --name tfstate-rg \
  --location eastus

# Create storage account for Terraform state
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

echo "Terraform backend created!"
echo "Storage Account: $STORAGE_ACCOUNT_NAME"
```

### Step 4: Configure Terraform Variables

```bash
cd infrastructure/terraform

# Copy example environment file
cp environments/production/terraform.tfvars.example \
   environments/production/terraform.tfvars

# Edit with your values
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
allowed_ip_ranges  = ["YOUR_OFFICE_IP/32"]

# Database
db_admin_username = "dbadmin"
db_admin_password = "YOUR_SECURE_PASSWORD"  # Use Azure Key Vault in production
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

### Step 5: Initialize Terraform

```bash
# Initialize Terraform
terraform init \
  -backend-config="storage_account_name=$STORAGE_ACCOUNT_NAME" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=global-commerce.tfstate" \
  -backend-config="access_key=$ACCOUNT_KEY"

# Validate configuration
terraform validate

# Plan deployment
terraform plan \
  -var-file="environments/production/terraform.tfvars" \
  -out=tfplan
```

### Step 6: Deploy Infrastructure

```bash
# Apply Terraform configuration
terraform apply tfplan

# This will create:
# - Virtual Network and Subnets
# - PostgreSQL Flexible Server
# - Azure Storage Account
# - Azure Container Registry
# - App Services
# - Redis Cache
# - Application Insights
# - Key Vault
# - Front Door (CDN)
# - And more...

# Deployment takes ~30-45 minutes
```

### Step 7: Configure Secrets

```bash
# Get Key Vault name
KEY_VAULT_NAME=$(terraform output -raw key_vault_name)

# Set database credentials
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "db-connection-string" \
  --value "postgresql://dbadmin:PASSWORD@SERVER.postgres.database.azure.com/commerce_main"

# Set Stripe API key
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "stripe-api-key" \
  --value "sk_live_YOUR_STRIPE_KEY"

# Set SendGrid API key
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "sendgrid-api-key" \
  --value "SG.YOUR_SENDGRID_KEY"

# Set JWT secret
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "jwt-secret" \
  --value "$(openssl rand -base64 32)"
```

---

## 🐳 Build and Deploy Services

### Step 1: Build Docker Images

```bash
cd backend

# Build all services
./scripts/build-all.sh

# Or build individual services
docker build -t api-gateway:latest ./api-gateway
docker build -t auth-service:latest ./services/auth-service
docker build -t product-service:latest ./services/product-service
# ... etc
```

### Step 2: Push to Azure Container Registry

```bash
# Get ACR login server
ACR_NAME=$(terraform output -raw container_registry_login_server)

# Login to ACR
az acr login --name $ACR_NAME

# Tag and push images
docker tag api-gateway:latest $ACR_NAME/api-gateway:latest
docker push $ACR_NAME/api-gateway:latest

docker tag auth-service:latest $ACR_NAME/auth-service:latest
docker push $ACR_NAME/auth-service:latest

# ... push all services
```

### Step 3: Deploy to App Service

```bash
# Deploy using Azure CLI
az webapp config container set \
  --name api-gateway \
  --resource-group rg-global-commerce-production-eastus \
  --docker-custom-image-name $ACR_NAME/api-gateway:latest \
  --docker-registry-server-url https://$ACR_NAME.azurecr.io

# Or use deployment script
./scripts/deploy-services.sh production
```

---

## 🗄️ Database Setup

### Step 1: Run Migrations

```bash
cd database

# Install migration tool
npm install -g db-migrate

# Configure database connection
export DATABASE_URL="postgresql://dbadmin:PASSWORD@SERVER.postgres.database.azure.com/commerce_main?sslmode=require"

# Run migrations
db-migrate up

# Or use built-in script
./scripts/migrate.sh up
```

### Step 2: Seed Data (Optional)

```bash
# Seed initial data
./scripts/seed.sh

# This will create:
# - Sample products
# - Categories
# - Sample users
# - Default settings
```

---

## 🌐 Frontend Deployment

### Option 1: Deploy to Azure Static Web Apps

```bash
cd frontend/web

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
  --output-location "out"
```

### Option 2: Deploy to Vercel

```bash
cd frontend/web

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 3: Deploy to Azure App Service (Container)

```bash
# Build Docker image
docker build -t global-commerce-web:latest .

# Push to ACR
docker tag global-commerce-web:latest $ACR_NAME/global-commerce-web:latest
docker push $ACR_NAME/global-commerce-web:latest

# Deploy
az webapp config container set \
  --name global-commerce-web \
  --resource-group rg-global-commerce-production-eastus \
  --docker-custom-image-name $ACR_NAME/global-commerce-web:latest
```

---

## 🔐 Configure Authentication

### Auth0 Setup

```bash
# 1. Create Auth0 account at https://auth0.com
# 2. Create a new application (Single Page Application)
# 3. Configure allowed callbacks:
#    - https://yourdomain.com/callback
#    - http://localhost:3000/callback (for development)

# 4. Add to Key Vault
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "auth0-domain" \
  --value "your-tenant.auth0.com"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "auth0-client-id" \
  --value "YOUR_CLIENT_ID"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "auth0-client-secret" \
  --value "YOUR_CLIENT_SECRET"
```

---

## 💳 Configure Payment Gateways

### Stripe Setup

```bash
# 1. Create Stripe account at https://stripe.com
# 2. Get API keys from dashboard
# 3. Configure webhook endpoint: https://api.yourdomain.com/webhooks/stripe

# Add keys to Key Vault
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "stripe-api-key" \
  --value "sk_live_YOUR_KEY"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "stripe-webhook-secret" \
  --value "whsec_YOUR_SECRET"
```

### PayPal Setup

```bash
# 1. Create PayPal Business account
# 2. Get API credentials
# 3. Configure IPN endpoint

# Add keys
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

## 📧 Configure Email Service

### SendGrid Setup

```bash
# 1. Create SendGrid account
# 2. Create API key with full permissions
# 3. Verify sender domain

# Add to Key Vault
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "sendgrid-api-key" \
  --value "SG.YOUR_KEY"

# Configure templates in SendGrid dashboard
```

---

## 📊 Configure Monitoring

### Application Insights

```bash
# Get instrumentation key
INSTRUMENTATION_KEY=$(terraform output -raw app_insights_instrumentation_key)

# Configure in application
export APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=$INSTRUMENTATION_KEY"
```

### Set Up Alerts

```bash
# Create action group for alerts
az monitor action-group create \
  --name ops-team \
  --resource-group rg-global-commerce-production-eastus \
  --short-name ops \
  --email-receiver email ops ops@yourcompany.com

# Create metric alert for API response time
az monitor metrics alert create \
  --name high-response-time \
  --resource-group rg-global-commerce-production-eastus \
  --scopes /subscriptions/SUB_ID/resourceGroups/rg-global-commerce-production-eastus \
  --condition "avg response_time > 500" \
  --description "Alert when API response time exceeds 500ms" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --action ops-team
```

---

## 🔄 Configure CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Build and Push Docker Images
        run: |
          az acr login --name ${{ secrets.ACR_NAME }}
          docker build -t ${{ secrets.ACR_NAME }}.azurecr.io/api-gateway:${{ github.sha }} ./backend/api-gateway
          docker push ${{ secrets.ACR_NAME }}.azurecr.io/api-gateway:${{ github.sha }}
      
      - name: Deploy to App Service
        run: |
          az webapp config container set \
            --name api-gateway \
            --resource-group ${{ secrets.RESOURCE_GROUP }} \
            --docker-custom-image-name ${{ secrets.ACR_NAME }}.azurecr.io/api-gateway:${{ github.sha }}
```

---

## ✅ Verify Deployment

### Health Checks

```bash
# Check API Gateway
curl https://api.yourdomain.com/health

# Check services
curl https://api.yourdomain.com/api/v1/products
curl https://api.yourdomain.com/api/v1/orders

# Check frontend
curl https://yourdomain.com
```

### Test Authentication

```bash
# Test login endpoint
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Payment

```bash
# Test Stripe payment (test mode)
curl -X POST https://api.yourdomain.com/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 1000,
    "currency": "usd",
    "payment_method": "pm_card_visa"
  }'
```

---

## 🎯 Performance Testing

### Load Testing with k6

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Ubuntu

# Run load test
cd scripts/load-tests
k6 run --vus 100 --duration 5m api-load-test.js

# Monitor results in Grafana
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue: Cannot connect to database**
```bash
# Check network connectivity
az postgres flexible-server show \
  --resource-group rg-global-commerce-production-eastus \
  --name postgres-global-commerce-production

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group rg-global-commerce-production-eastus \
  --name postgres-global-commerce-production
```

**Issue: Container fails to start**
```bash
# Check logs
az webapp log tail \
  --name api-gateway \
  --resource-group rg-global-commerce-production-eastus

# Check container logs
docker logs CONTAINER_ID
```

**Issue: High latency**
```bash
# Check Application Insights
az monitor app-insights query \
  --app APPLICATION_INSIGHTS_ID \
  --analytics-query "requests | summarize avg(duration) by bin(timestamp, 1h)"
```

---

## 📚 Additional Resources

- [Azure Documentation](https://docs.microsoft.com/azure)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)

---

## 🆘 Support

- **Email**: devops@yourcompany.com
- **Slack**: #platform-ops
- **On-Call**: PagerDuty rotation
- **Documentation**: https://docs.yourcompany.com

---

*Last Updated: December 2024*
