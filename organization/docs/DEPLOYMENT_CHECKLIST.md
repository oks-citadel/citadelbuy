# CitadelBuy Platform - Deployment Checklist

This comprehensive checklist guides you through deploying the CitadelBuy platform infrastructure and applications to Azure with Kubernetes (AKS).

## Table of Contents

1. [Pre-Deployment Requirements](#1-pre-deployment-requirements)
2. [Infrastructure Deployment Order](#2-infrastructure-deployment-order)
3. [Secret Configuration](#3-secret-configuration)
4. [Application Deployment](#4-application-deployment)
5. [Verification Steps](#5-verification-steps)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Pre-Deployment Requirements

### 1.1 Azure Access and Permissions

- [ ] Azure subscription with Owner or Contributor role
- [ ] Azure CLI installed (`az --version` >= 2.50.0)
- [ ] Logged in to Azure: `az login`
- [ ] Set correct subscription:
  ```bash
  az account set --subscription "YOUR_SUBSCRIPTION_ID"
  az account show  # Verify active subscription
  ```

### 1.2 Required Tools

- [ ] **Terraform** installed (>= 1.5.0)
  ```bash
  terraform --version
  ```

- [ ] **kubectl** installed and configured (>= 1.28.0)
  ```bash
  kubectl version --client
  ```

- [ ] **Docker** running locally
  ```bash
  docker --version
  docker ps  # Should connect successfully
  ```

- [ ] **Helm** installed (>= 3.12.0)
  ```bash
  helm version
  ```

- [ ] **PostgreSQL client** tools (for migrations)
  ```bash
  psql --version
  ```

### 1.3 Local Development Environment

- [ ] PostgreSQL running locally (port 5432)
  ```bash
  docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:15
  ```

- [ ] Redis running locally (port 6379)
  ```bash
  docker run -d --name redis -p 6379:6379 redis:7-alpine
  ```

- [ ] Node.js installed (>= 18.x)
  ```bash
  node --version
  ```

### 1.4 Repository Setup

- [ ] Clone repository and navigate to infrastructure directory
  ```bash
  cd C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization
  ```

- [ ] Install dependencies
  ```bash
  npm install
  ```

- [ ] Build all applications locally first (verify no errors)
  ```bash
  npm run build
  ```

---

## 2. Infrastructure Deployment Order

### 2.1 Remote State Storage (One-Time Setup)

Before deploying any environment, set up Terraform remote state:

- [ ] Create resource group for Terraform state
  ```bash
  az group create \
    --name citadelbuy-tfstate-rg \
    --location eastus
  ```

- [ ] Create storage account for state
  ```bash
  az storage account create \
    --name citadelbuytfstate \
    --resource-group citadelbuy-tfstate-rg \
    --location eastus \
    --sku Standard_LRS \
    --kind StorageV2
  ```

- [ ] Create blob container
  ```bash
  az storage container create \
    --name tfstate \
    --account-name citadelbuytfstate
  ```

### 2.2 Deploy Core Infrastructure (Per Environment)

Navigate to the appropriate environment directory:

```bash
cd infrastructure/terraform/environments/dev  # or staging, prod
```

#### Step 1: Initialize Terraform

- [ ] Initialize Terraform backend
  ```bash
  terraform init
  ```

- [ ] Verify initialization
  ```bash
  terraform validate
  ```

#### Step 2: Review Plan

- [ ] Create execution plan
  ```bash
  terraform plan -out=tfplan
  ```

- [ ] Review plan carefully for:
  - Resource counts match expectations
  - No unexpected deletions
  - Naming conventions are correct

#### Step 3: Deploy Base Infrastructure

- [ ] Deploy resource groups
  ```bash
  terraform apply -target=azurerm_resource_group.main
  ```

- [ ] Deploy networking module
  ```bash
  terraform apply -target=module.networking
  ```

- [ ] Verify VNet created:
  ```bash
  az network vnet list --resource-group citadelbuy-dev-rg
  ```

#### Step 4: Deploy Database Module

- [ ] Deploy PostgreSQL and Redis
  ```bash
  terraform apply -target=module.database
  ```

- [ ] Verify databases are running:
  ```bash
  az postgres flexible-server list --resource-group citadelbuy-dev-rg
  az redis list --resource-group citadelbuy-dev-rg
  ```

- [ ] Note down database endpoints from output:
  ```bash
  terraform output
  ```

#### Step 5: Deploy Compute Module (AKS)

- [ ] Deploy AKS cluster
  ```bash
  terraform apply -target=module.compute
  ```

- [ ] This takes 10-15 minutes. Verify cluster is ready:
  ```bash
  az aks list --resource-group citadelbuy-dev-rg
  ```

- [ ] Get cluster credentials
  ```bash
  az aks get-credentials \
    --resource-group citadelbuy-dev-rg \
    --name citadelbuy-dev-aks \
    --overwrite-existing
  ```

- [ ] Test cluster access
  ```bash
  kubectl cluster-info
  kubectl get nodes
  ```

#### Step 6: Deploy Storage Module

- [ ] Deploy storage accounts
  ```bash
  terraform apply -target=module.storage
  ```

- [ ] Verify storage accounts:
  ```bash
  az storage account list --resource-group citadelbuy-dev-rg
  ```

#### Step 7: Deploy Monitoring Module

- [ ] Deploy monitoring stack
  ```bash
  terraform apply -target=module.monitoring
  ```

- [ ] Verify Log Analytics workspace:
  ```bash
  az monitor log-analytics workspace list --resource-group citadelbuy-dev-rg
  ```

#### Step 8: Full Apply (Ensure Everything)

- [ ] Run complete apply to catch any dependencies
  ```bash
  terraform apply
  ```

- [ ] Confirm all resources deployed:
  ```bash
  terraform output
  ```

### 2.3 Deploy Key Vault Infrastructure

Navigate to Key Vault configuration:

```bash
cd ../../azure
```

#### Step 1: Deploy Key Vaults (Per-App Structure)

- [ ] Initialize and plan
  ```bash
  terraform init
  terraform plan -var="environment=dev"
  ```

- [ ] Apply Key Vault configuration
  ```bash
  terraform apply -var="environment=dev"
  ```

- [ ] Verify all vaults created:
  ```bash
  az keyvault list --resource-group citadelbuy-rg-keyvaults-dev
  ```

Expected vaults:
- `citadelbuy-dev-shared-kv` (shared secrets)
- `citadelbuy-dev-api-kv` (API-specific)
- `citadelbuy-dev-web-kv` (Web-specific)
- `citadelbuy-dev-mobile-kv` (Mobile-specific)
- `citadelbuy-dev-services-kv` (Services-specific)

### 2.4 Deploy IAM Policies and Managed Identities

- [ ] Deploy managed identities
  ```bash
  terraform apply -var="environment=dev" \
    -var="aks_cluster_name=citadelbuy-dev-aks" \
    -var="aks_resource_group=citadelbuy-dev-rg"
  ```

- [ ] Verify identities created:
  ```bash
  az identity list --resource-group citadelbuy-dev-rg
  ```

- [ ] Note down client IDs for later use:
  ```bash
  terraform output api_identity_client_id
  terraform output web_identity_client_id
  terraform output mobile_identity_client_id
  ```

### 2.5 Install External Secrets Operator

- [ ] Add External Secrets Helm repo
  ```bash
  helm repo add external-secrets https://charts.external-secrets.io
  helm repo update
  ```

- [ ] Create namespace
  ```bash
  kubectl create namespace external-secrets
  ```

- [ ] Install External Secrets Operator
  ```bash
  helm install external-secrets \
    external-secrets/external-secrets \
    --namespace external-secrets \
    --set installCRDs=true
  ```

- [ ] Verify installation
  ```bash
  kubectl get pods -n external-secrets
  kubectl get crd | grep external-secrets
  ```

### 2.6 Create Kubernetes Namespaces

- [ ] Create application namespaces
  ```bash
  kubectl create namespace citadelbuy-api
  kubectl create namespace citadelbuy-web
  kubectl create namespace citadelbuy-mobile
  kubectl create namespace citadelbuy-services
  ```

- [ ] Verify namespaces
  ```bash
  kubectl get namespaces
  ```

---

## 3. Secret Configuration

### 3.1 Overview of Secrets Architecture

The platform uses a per-app-per-environment Key Vault structure:

| Vault Name | Purpose | Apps with Access |
|------------|---------|------------------|
| `citadelbuy-{env}-shared-kv` | Cross-app secrets (DB, Redis) | API, Services |
| `citadelbuy-{env}-api-kv` | API-specific secrets | API only |
| `citadelbuy-{env}-web-kv` | Web-specific secrets | Web only |
| `citadelbuy-{env}-mobile-kv` | Mobile-specific secrets | Mobile only |
| `citadelbuy-{env}-services-kv` | Microservices secrets | Services only |

### 3.2 Shared Vault Secrets (Auto-Generated)

These are automatically created by Terraform:

- [x] `postgres-url` - PostgreSQL connection string
- [x] `postgres-password` - PostgreSQL password
- [x] `redis-url` - Redis connection string

**No action needed** - these are already populated.

### 3.3 API Vault Secrets

#### Auto-Generated Secrets (Already Set)

- [x] `jwt-access-secret` - JWT access token secret (64 chars)
- [x] `jwt-refresh-secret` - JWT refresh token secret (64 chars)
- [x] `kyc-encryption-key` - KYC data encryption (NEVER ROTATE)

#### Manual Secrets (Require Real Values)

Replace placeholder values with real credentials:

##### Stripe Payment Keys

- [ ] **stripe-secret-key** (production: `sk_live_...`, dev: `sk_test_...`)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-api-kv \
    --name stripe-secret-key \
    --value "sk_test_YOUR_STRIPE_SECRET_KEY"
  ```

- [ ] **stripe-webhook-secret** (format: `whsec_...`)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-api-kv \
    --name stripe-webhook-secret \
    --value "whsec_YOUR_WEBHOOK_SECRET"
  ```

##### SendGrid Email

- [ ] **sendgrid-api-key** (format: `SG.xxx`)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-api-kv \
    --name sendgrid-api-key \
    --value "SG.YOUR_SENDGRID_API_KEY"
  ```

##### OpenAI API

- [ ] **openai-api-key** (format: `sk-proj-xxx`)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-api-kv \
    --name openai-api-key \
    --value "sk-proj-YOUR_OPENAI_KEY"
  ```

### 3.4 Web Vault Secrets

#### Auto-Generated

- [x] `internal-api-key` - Web to API communication key

#### Manual Secrets

- [ ] **sentry-dsn** (format: `https://xxx@sentry.io/xxx`)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-web-kv \
    --name sentry-dsn \
    --value "https://YOUR_KEY@sentry.io/YOUR_PROJECT"
  ```

### 3.5 Mobile Vault Secrets

All mobile secrets require manual configuration:

- [ ] **apple-shared-secret** (from App Store Connect)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-mobile-kv \
    --name apple-shared-secret \
    --value "YOUR_APPLE_SHARED_SECRET"
  ```

- [ ] **google-play-service-account-key** (JSON from Google Play Console)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-mobile-kv \
    --name google-play-service-account-key \
    --file ./google-play-service-account.json
  ```

- [ ] **firebase-service-account** (JSON from Firebase Console)
  ```bash
  az keyvault secret set \
    --vault-name citadelbuy-dev-mobile-kv \
    --name firebase-service-account \
    --file ./firebase-service-account.json
  ```

### 3.6 Verify All Secrets Are Set

Use the validation script:

- [ ] Run secret validation
  ```bash
  bash scripts/validate-secrets.sh dev
  ```

- [ ] Check output for any missing secrets
- [ ] Resolve any PLACEHOLDER values before proceeding

---

## 4. Application Deployment

### 4.1 Container Registry Setup

- [ ] Create Azure Container Registry (if not exists)
  ```bash
  az acr create \
    --resource-group citadelbuy-dev-rg \
    --name citadelbuyacr \
    --sku Standard
  ```

- [ ] Login to ACR
  ```bash
  az acr login --name citadelbuyacr
  ```

- [ ] Attach ACR to AKS
  ```bash
  az aks update \
    --resource-group citadelbuy-dev-rg \
    --name citadelbuy-dev-aks \
    --attach-acr citadelbuyacr
  ```

### 4.2 Build and Push Docker Images

#### Build API Image

- [ ] Navigate to API directory
  ```bash
  cd apps/api
  ```

- [ ] Build Docker image
  ```bash
  docker build -t citadelbuyacr.azurecr.io/citadelbuy-api:latest .
  ```

- [ ] Push to ACR
  ```bash
  docker push citadelbuyacr.azurecr.io/citadelbuy-api:latest
  ```

#### Build Web Image

- [ ] Navigate to web directory
  ```bash
  cd ../web
  ```

- [ ] Build Docker image
  ```bash
  docker build -t citadelbuyacr.azurecr.io/citadelbuy-web:latest .
  ```

- [ ] Push to ACR
  ```bash
  docker push citadelbuyacr.azurecr.io/citadelbuy-web:latest
  ```

#### Build Mobile Backend (if applicable)

- [ ] Build and push mobile backend image
  ```bash
  # Adjust path based on mobile backend location
  docker build -t citadelbuyacr.azurecr.io/citadelbuy-mobile:latest .
  docker push citadelbuyacr.azurecr.io/citadelbuy-mobile:latest
  ```

### 4.3 Database Migration

**CRITICAL:** Run migrations before deploying applications.

- [ ] Set database connection from Key Vault
  ```bash
  export DATABASE_URL=$(az keyvault secret show \
    --vault-name citadelbuy-dev-shared-kv \
    --name postgres-url \
    --query value -o tsv)
  ```

- [ ] Test database connectivity
  ```bash
  psql $DATABASE_URL -c "SELECT version();"
  ```

- [ ] Run Prisma migrations
  ```bash
  cd apps/api
  npx prisma migrate deploy
  ```

- [ ] Verify migration status
  ```bash
  npx prisma migrate status
  ```

- [ ] Seed initial data (if needed)
  ```bash
  npx prisma db seed
  ```

### 4.4 Deploy External Secrets

This configures Kubernetes to pull secrets from Azure Key Vault.

- [ ] Get managed identity client IDs
  ```bash
  API_CLIENT_ID=$(az identity show \
    --name citadelbuy-dev-api-identity \
    --resource-group citadelbuy-dev-rg \
    --query clientId -o tsv)

  WEB_CLIENT_ID=$(az identity show \
    --name citadelbuy-dev-web-identity \
    --resource-group citadelbuy-dev-rg \
    --query clientId -o tsv)

  MOBILE_CLIENT_ID=$(az identity show \
    --name citadelbuy-dev-mobile-identity \
    --resource-group citadelbuy-dev-rg \
    --query clientId -o tsv)
  ```

- [ ] Replace placeholders in external-secrets YAML
  ```bash
  cd infrastructure/kubernetes

  # Use sed or manually edit the file
  export ENVIRONMENT=dev
  envsubst < external-secrets-per-app.yaml > external-secrets-dev.yaml
  ```

- [ ] Apply External Secrets configuration
  ```bash
  kubectl apply -f external-secrets-dev.yaml
  ```

- [ ] Verify SecretStores are ready
  ```bash
  kubectl get secretstore -A
  kubectl get clustersecretstore
  ```

- [ ] Verify ExternalSecrets are syncing
  ```bash
  kubectl get externalsecret -n citadelbuy-api
  kubectl get externalsecret -n citadelbuy-web
  kubectl get externalsecret -n citadelbuy-mobile
  ```

- [ ] Check that Kubernetes secrets were created
  ```bash
  kubectl get secrets -n citadelbuy-api
  kubectl get secrets -n citadelbuy-web
  ```

### 4.5 Deploy API Application

- [ ] Apply API deployment
  ```bash
  kubectl apply -f infrastructure/kubernetes/apps/api-deployment.yaml
  ```

- [ ] Watch rollout status
  ```bash
  kubectl rollout status deployment/citadelbuy-api -n citadelbuy-api
  ```

- [ ] Check pod status
  ```bash
  kubectl get pods -n citadelbuy-api
  ```

- [ ] Check pod logs for errors
  ```bash
  kubectl logs -n citadelbuy-api -l app=citadelbuy-api --tail=50
  ```

### 4.6 Deploy Web Application

- [ ] Apply web deployment
  ```bash
  kubectl apply -f infrastructure/kubernetes/apps/web-deployment.yaml
  ```

- [ ] Watch rollout status
  ```bash
  kubectl rollout status deployment/citadelbuy-web -n citadelbuy-web
  ```

- [ ] Check pod status
  ```bash
  kubectl get pods -n citadelbuy-web
  ```

### 4.7 Deploy Mobile Backend (if applicable)

- [ ] Apply mobile deployment
  ```bash
  kubectl apply -f infrastructure/kubernetes/apps/mobile-deployment.yaml
  ```

- [ ] Verify deployment
  ```bash
  kubectl get pods -n citadelbuy-mobile
  ```

### 4.8 Expose Services

- [ ] Apply ingress configuration (if using)
  ```bash
  kubectl apply -f infrastructure/kubernetes/ingress.yaml
  ```

- [ ] Get external IP
  ```bash
  kubectl get svc -n citadelbuy-api
  kubectl get ingress -A
  ```

- [ ] Configure DNS to point to ingress IP (if production)

---

## 5. Verification Steps

### 5.1 Verify Secret Accessibility

- [ ] Exec into API pod and check environment
  ```bash
  kubectl exec -it -n citadelbuy-api \
    $(kubectl get pod -n citadelbuy-api -l app=citadelbuy-api -o jsonpath='{.items[0].metadata.name}') \
    -- env | grep -E 'DATABASE_URL|REDIS_URL|JWT_SECRET'
  ```

- [ ] Verify secrets are NOT showing PLACEHOLDER values
  ```bash
  kubectl get secret database-secrets -n citadelbuy-api -o jsonpath='{.data.DATABASE_URL}' | base64 -d
  ```

### 5.2 API Health Checks

- [ ] Check API health endpoint
  ```bash
  kubectl port-forward -n citadelbuy-api svc/citadelbuy-api 4000:80
  ```

- [ ] In another terminal, test health:
  ```bash
  curl http://localhost:4000/api/health
  ```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-12T...",
  "database": "connected",
  "redis": "connected"
}
```

### 5.3 Database Connectivity

- [ ] Test database from API pod
  ```bash
  kubectl exec -it -n citadelbuy-api \
    $(kubectl get pod -n citadelbuy-api -l app=citadelbuy-api -o jsonpath='{.items[0].metadata.name}') \
    -- sh -c 'echo "SELECT 1;" | psql $DATABASE_URL'
  ```

### 5.4 Key Endpoints Testing

#### API Endpoints

- [ ] **GET /api/health** - Health check
  ```bash
  curl http://localhost:4000/api/health
  ```

- [ ] **POST /api/auth/register** - User registration
  ```bash
  curl -X POST http://localhost:4000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!"}'
  ```

- [ ] **POST /api/auth/login** - User login
  ```bash
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!"}'
  ```

- [ ] **GET /api/products** - List products
  ```bash
  curl http://localhost:4000/api/products
  ```

#### Web Application

- [ ] Port-forward web service
  ```bash
  kubectl port-forward -n citadelbuy-web svc/citadelbuy-web 3000:80
  ```

- [ ] Open browser to http://localhost:3000
- [ ] Verify homepage loads
- [ ] Check browser console for errors

### 5.5 Monitoring and Logs

- [ ] Check pod resource usage
  ```bash
  kubectl top pods -n citadelbuy-api
  kubectl top pods -n citadelbuy-web
  ```

- [ ] View recent logs
  ```bash
  kubectl logs -n citadelbuy-api -l app=citadelbuy-api --tail=100
  ```

- [ ] Check for error logs
  ```bash
  kubectl logs -n citadelbuy-api -l app=citadelbuy-api | grep -i error
  ```

### 5.6 External Secrets Sync Status

- [ ] Check ExternalSecret status
  ```bash
  kubectl describe externalsecret api-database-secrets -n citadelbuy-api
  kubectl describe externalsecret api-auth-secrets -n citadelbuy-api
  ```

- [ ] Look for sync errors:
  ```bash
  kubectl get externalsecret -A -o json | jq '.items[] | select(.status.conditions[].status == "False")'
  ```

---

## 6. Rollback Procedures

### 6.1 Rollback Kubernetes Deployments

If a deployment is failing:

- [ ] Rollback to previous revision
  ```bash
  kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-api
  ```

- [ ] Check rollout history
  ```bash
  kubectl rollout history deployment/citadelbuy-api -n citadelbuy-api
  ```

- [ ] Rollback to specific revision
  ```bash
  kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-api --to-revision=2
  ```

### 6.2 Rollback Terraform Changes

If infrastructure changes cause issues:

- [ ] Navigate to environment directory
  ```bash
  cd infrastructure/terraform/environments/dev
  ```

- [ ] List Terraform state
  ```bash
  terraform state list
  ```

- [ ] View current state of a resource
  ```bash
  terraform state show azurerm_resource_group.main
  ```

- [ ] Revert to previous state (if you have backup)
  ```bash
  # Copy from .terraform/terraform.tfstate.backup
  cp .terraform/terraform.tfstate.backup terraform.tfstate
  ```

- [ ] Re-apply previous configuration
  ```bash
  git checkout <previous-commit> -- *.tf
  terraform plan
  terraform apply
  ```

### 6.3 Rollback Database Migrations

**WARNING:** Database rollbacks can cause data loss.

- [ ] Check migration history
  ```bash
  cd apps/api
  npx prisma migrate status
  ```

- [ ] Rollback is manual with Prisma. You need to:
  1. Create a new migration that reverses changes
  2. Apply the new migration

  ```bash
  # Example: if you added a column, create migration to drop it
  npx prisma migrate dev --name rollback_column_addition
  ```

- [ ] For production, use down migrations carefully
  ```bash
  # Run SQL manually if needed
  psql $DATABASE_URL -c "ALTER TABLE users DROP COLUMN new_field;"
  ```

### 6.4 Restore Secrets

If secrets were accidentally overwritten:

- [ ] Check Key Vault audit logs
  ```bash
  az monitor activity-log list \
    --resource-group citadelbuy-rg-keyvaults-dev \
    --offset 7d
  ```

- [ ] Restore from soft-delete (if within retention period)
  ```bash
  az keyvault secret recover \
    --vault-name citadelbuy-dev-api-kv \
    --name stripe-secret-key
  ```

- [ ] Check secret versions
  ```bash
  az keyvault secret list-versions \
    --vault-name citadelbuy-dev-api-kv \
    --name stripe-secret-key
  ```

- [ ] Restore specific version
  ```bash
  az keyvault secret set-attributes \
    --vault-name citadelbuy-dev-api-kv \
    --name stripe-secret-key \
    --version <version-id> \
    --enabled true
  ```

---

## 7. Troubleshooting

### 7.1 Common Issues

#### Issue: External Secrets Not Syncing

**Symptoms:**
- Pods stuck in `CreateContainerConfigError`
- ExternalSecret shows `SecretSyncedError`

**Solution:**

- [ ] Check ExternalSecret status
  ```bash
  kubectl describe externalsecret api-database-secrets -n citadelbuy-api
  ```

- [ ] Verify SecretStore configuration
  ```bash
  kubectl describe secretstore citadelbuy-api-vault -n citadelbuy-api
  ```

- [ ] Check workload identity is configured
  ```bash
  kubectl get serviceaccount api-service-account -n citadelbuy-api -o yaml
  ```

- [ ] Verify identity has Key Vault access
  ```bash
  az role assignment list \
    --scope /subscriptions/YOUR_SUB/resourceGroups/citadelbuy-rg-keyvaults-dev/providers/Microsoft.KeyVault/vaults/citadelbuy-dev-api-kv
  ```

#### Issue: Database Connection Failed

**Symptoms:**
- API pod logs show "Connection refused" or "Authentication failed"

**Solution:**

- [ ] Verify PostgreSQL is running
  ```bash
  az postgres flexible-server show \
    --resource-group citadelbuy-dev-rg \
    --name citadelbuy-dev-postgres
  ```

- [ ] Check firewall rules allow AKS
  ```bash
  az postgres flexible-server firewall-rule list \
    --resource-group citadelbuy-dev-rg \
    --name citadelbuy-dev-postgres
  ```

- [ ] Test connection from AKS pod
  ```bash
  kubectl run -it --rm debug --image=postgres:15 --restart=Never -- bash
  # Inside pod:
  psql "postgresql://user:pass@host:5432/db"
  ```

#### Issue: Image Pull Failed

**Symptoms:**
- Pods show `ImagePullBackOff` or `ErrImagePull`

**Solution:**

- [ ] Verify ACR is attached to AKS
  ```bash
  az aks show \
    --resource-group citadelbuy-dev-rg \
    --name citadelbuy-dev-aks \
    --query servicePrincipalProfile.clientId -o tsv
  ```

- [ ] Check image exists in ACR
  ```bash
  az acr repository list --name citadelbuyacr
  az acr repository show-tags --name citadelbuyacr --repository citadelbuy-api
  ```

- [ ] Re-attach ACR
  ```bash
  az aks update \
    --resource-group citadelbuy-dev-rg \
    --name citadelbuy-dev-aks \
    --attach-acr citadelbuyacr
  ```

#### Issue: Pod Out of Memory (OOMKilled)

**Symptoms:**
- Pods restarting frequently
- Last state shows `OOMKilled`

**Solution:**

- [ ] Check resource limits
  ```bash
  kubectl describe pod <pod-name> -n citadelbuy-api
  ```

- [ ] Increase memory limits in deployment YAML
  ```yaml
  resources:
    limits:
      memory: "1Gi"  # Increase from 512Mi
  ```

- [ ] Apply updated deployment
  ```bash
  kubectl apply -f infrastructure/kubernetes/apps/api-deployment.yaml
  ```

### 7.2 Debugging Commands

- [ ] Get all resources in namespace
  ```bash
  kubectl get all -n citadelbuy-api
  ```

- [ ] Describe pod for events
  ```bash
  kubectl describe pod <pod-name> -n citadelbuy-api
  ```

- [ ] View pod logs (follow)
  ```bash
  kubectl logs -f <pod-name> -n citadelbuy-api
  ```

- [ ] Exec into running pod
  ```bash
  kubectl exec -it <pod-name> -n citadelbuy-api -- /bin/sh
  ```

- [ ] Check events in namespace
  ```bash
  kubectl get events -n citadelbuy-api --sort-by='.lastTimestamp'
  ```

### 7.3 Support Resources

- **Azure Support:** https://portal.azure.com > Support + troubleshooting
- **Terraform Docs:** https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- **External Secrets:** https://external-secrets.io/latest/
- **Kubernetes Docs:** https://kubernetes.io/docs/home/

---

## Success Criteria

Your deployment is successful when:

- [ ] All Terraform modules applied without errors
- [ ] All Key Vaults contain real (non-placeholder) secrets
- [ ] External Secrets Operator is syncing secrets successfully
- [ ] All application pods are in `Running` state
- [ ] Database migrations completed successfully
- [ ] API health endpoint returns 200 OK
- [ ] Web application loads in browser
- [ ] No errors in application logs
- [ ] Monitoring dashboards show healthy metrics

---

## Next Steps After Deployment

1. **Set up CI/CD pipelines** - Configure Azure Pipelines or GitHub Actions
2. **Configure monitoring alerts** - Set up alerts in Azure Monitor
3. **Enable auto-scaling** - Configure HPA for production traffic
4. **Set up backups** - Configure automated database backups
5. **Security scan** - Run vulnerability scans on containers
6. **Load testing** - Perform load tests to validate performance
7. **Documentation** - Update runbooks with environment-specific details

---

## Maintenance Schedule

- **Daily:** Check pod health and logs
- **Weekly:** Review monitoring dashboards and alerts
- **Monthly:** Rotate non-critical secrets
- **Quarterly:** Update Kubernetes version, review resource usage
- **Annually:** Review and update disaster recovery procedures

---

**Version:** 1.0
**Last Updated:** 2025-12-12
**Owner:** DevOps Team
**Contact:** devops@citadelbuy.com
