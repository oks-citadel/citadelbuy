# Broxiva Production Secrets Setup Script (PowerShell)
# This script creates all necessary secrets and configmaps for the production environment
# Usage: .\setup-production-secrets.ps1
# Last Updated: 2025-12-14

$ErrorActionPreference = "Stop"

# Configuration
$NAMESPACE = "broxiva-prod"
$AKS_CLUSTER = "broxiva-aks-prod"
$RESOURCE_GROUP = "broxiva-rg"
$ACR_NAME = "broxivaprodacr"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Broxiva Production Secrets Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Function to generate random base64 string
function Get-RandomBase64 {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Replace("+", "").Replace("/", "").Replace("=", "").Substring(0, $Length)
}

# Function to generate hex string
function Get-RandomHex {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

# Step 1: Verify namespace exists
Write-Host "[1/8] Verifying namespace..." -ForegroundColor Yellow
try {
    kubectl get namespace $NAMESPACE 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Namespace $NAMESPACE exists" -ForegroundColor Green
    } else {
        throw "Namespace not found"
    }
} catch {
    Write-Host "Namespace $NAMESPACE does not exist. Creating..." -ForegroundColor Red
    kubectl create namespace $NAMESPACE
    kubectl label namespace $NAMESPACE name=$NAMESPACE environment=production team=platform app=broxiva
}
Write-Host ""

# Step 2: Check AKS-ACR integration
Write-Host "[2/8] Checking AKS-ACR integration..." -ForegroundColor Yellow
try {
    $acrIntegration = az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query "identityProfile.kubeletidentity.objectId" -o tsv 2>$null
    if ($acrIntegration) {
        Write-Host "AKS has managed identity configured" -ForegroundColor Green
        Write-Host "Attempting to attach ACR to AKS..." -ForegroundColor Cyan
        az aks update --name $AKS_CLUSTER --resource-group $RESOURCE_GROUP --attach-acr $ACR_NAME 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "ACR attached successfully" -ForegroundColor Green
        } else {
            Write-Host "Note: ACR may already be attached" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Could not verify AKS managed identity" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Generate cryptographic secrets
Write-Host "[3/8] Generating cryptographic secrets..." -ForegroundColor Yellow
$JWT_SECRET = Get-RandomBase64 -Length 64
$JWT_REFRESH_SECRET = Get-RandomBase64 -Length 64
$SESSION_SECRET = Get-RandomBase64 -Length 64
$NEXTAUTH_SECRET = Get-RandomBase64 -Length 64
$ENCRYPTION_KEY = Get-RandomHex -Length 32
$KYC_ENCRYPTION_KEY = Get-RandomHex -Length 32
$INTERNAL_API_KEY = Get-RandomBase64 -Length 48
$WEBHOOK_SECRET = Get-RandomBase64 -Length 64
$POSTGRES_PASSWORD = Get-RandomBase64 -Length 32
$REDIS_PASSWORD = Get-RandomBase64 -Length 32
$RABBITMQ_PASSWORD = Get-RandomBase64 -Length 32
$MINIO_ROOT_PASSWORD = Get-RandomBase64 -Length 32
$MINIO_ACCESS_KEY = Get-RandomBase64 -Length 20
$MINIO_SECRET_KEY = Get-RandomBase64 -Length 40
$ELASTICSEARCH_PASSWORD = Get-RandomBase64 -Length 32
$GRAFANA_ADMIN_PASSWORD = Get-RandomBase64 -Length 32
$PGADMIN_PASSWORD = Get-RandomBase64 -Length 32

Write-Host "Generated all cryptographic secrets" -ForegroundColor Green
Write-Host ""

# Step 4: Create main application secrets
Write-Host "[4/8] Creating application secrets..." -ForegroundColor Yellow

# Build DATABASE_URL and REDIS_URL
$DATABASE_URL = "postgresql://broxiva:${POSTGRES_PASSWORD}@postgres.${NAMESPACE}.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require"
$REDIS_URL = "redis://:${REDIS_PASSWORD}@redis.${NAMESPACE}.svc.cluster.local:6379"
$RABBITMQ_URL = "amqp://broxiva:${RABBITMQ_PASSWORD}@rabbitmq.${NAMESPACE}.svc.cluster.local:5672"

# Create secret
$secretCmd = @"
kubectl create secret generic broxiva-secrets ``
  -n $NAMESPACE ``
  --from-literal=NODE_ENV="production" ``
  --from-literal=JWT_SECRET="$JWT_SECRET" ``
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" ``
  --from-literal=JWT_EXPIRES_IN="1h" ``
  --from-literal=JWT_REFRESH_EXPIRES_IN="7d" ``
  --from-literal=SESSION_SECRET="$SESSION_SECRET" ``
  --from-literal=NEXTAUTH_SECRET="$NEXTAUTH_SECRET" ``
  --from-literal=ENCRYPTION_KEY="$ENCRYPTION_KEY" ``
  --from-literal=KYC_ENCRYPTION_KEY="$KYC_ENCRYPTION_KEY" ``
  --from-literal=POSTGRES_USER="broxiva" ``
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" ``
  --from-literal=POSTGRES_DB="broxiva_production" ``
  --from-literal=POSTGRES_HOST="postgres.$NAMESPACE.svc.cluster.local" ``
  --from-literal=POSTGRES_PORT="5432" ``
  --from-literal=DATABASE_URL="$DATABASE_URL" ``
  --from-literal=REDIS_HOST="redis.$NAMESPACE.svc.cluster.local" ``
  --from-literal=REDIS_PORT="6379" ``
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" ``
  --from-literal=REDIS_URL="$REDIS_URL" ``
  --from-literal=REDIS_TLS="false" ``
  --from-literal=RABBITMQ_USER="broxiva" ``
  --from-literal=RABBITMQ_PASSWORD="$RABBITMQ_PASSWORD" ``
  --from-literal=RABBITMQ_HOST="rabbitmq.$NAMESPACE.svc.cluster.local" ``
  --from-literal=RABBITMQ_PORT="5672" ``
  --from-literal=RABBITMQ_URL="$RABBITMQ_URL" ``
  --from-literal=INTERNAL_API_KEY="$INTERNAL_API_KEY" ``
  --from-literal=WEBHOOK_SECRET="$WEBHOOK_SECRET" ``
  --from-literal=MINIO_ROOT_USER="broxiva_admin" ``
  --from-literal=MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" ``
  --from-literal=MINIO_ACCESS_KEY="$MINIO_ACCESS_KEY" ``
  --from-literal=MINIO_SECRET_KEY="$MINIO_SECRET_KEY" ``
  --from-literal=ELASTICSEARCH_USERNAME="elastic" ``
  --from-literal=ELASTICSEARCH_PASSWORD="$ELASTICSEARCH_PASSWORD" ``
  --from-literal=STRIPE_SECRET_KEY="sk_test_REPLACE_WITH_LIVE_KEY" ``
  --from-literal=STRIPE_PUBLISHABLE_KEY="pk_test_REPLACE_WITH_LIVE_KEY" ``
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_REPLACE_WITH_WEBHOOK_SECRET" ``
  --from-literal=SENDGRID_API_KEY="SG.REPLACE_WITH_API_KEY" ``
  --from-literal=SENTRY_DSN="https://REPLACE@sentry.io/0000000" ``
  --from-literal=OPENAI_API_KEY="sk-proj-REPLACE_WITH_API_KEY" ``
  --dry-run=client -o yaml | kubectl apply -f -
"@

Invoke-Expression $secretCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "Application secrets created successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to create application secrets" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Create ConfigMap
Write-Host "[5/8] Creating application ConfigMap..." -ForegroundColor Yellow
$configCmd = @"
kubectl create configmap broxiva-config ``
  -n $NAMESPACE ``
  --from-literal=NODE_ENV="production" ``
  --from-literal=PORT="4000" ``
  --from-literal=API_URL="https://api.broxiva.com" ``
  --from-literal=WEB_URL="https://broxiva.com" ``
  --from-literal=NEXT_PUBLIC_API_URL="https://api.broxiva.com" ``
  --from-literal=LOG_LEVEL="info" ``
  --from-literal=LOG_FORMAT="json" ``
  --from-literal=CORS_ORIGIN="https://broxiva.com,https://www.broxiva.com" ``
  --from-literal=ENABLE_ANALYTICS="true" ``
  --from-literal=ENABLE_CACHING="true" ``
  --from-literal=ENABLE_RATE_LIMITING="true" ``
  --from-literal=METRICS_ENABLED="true" ``
  --from-literal=METRICS_PORT="9090" ``
  --from-literal=HEALTH_CHECK_INTERVAL="30000" ``
  --dry-run=client -o yaml | kubectl apply -f -
"@

Invoke-Expression $configCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "ConfigMap created successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to create ConfigMap" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Apply RBAC configuration
Write-Host "[6/8] Applying RBAC configuration..." -ForegroundColor Yellow
kubectl apply -f "C:/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization/infrastructure/kubernetes/production/rbac-broxiva-prod.yaml"

if ($LASTEXITCODE -eq 0) {
    Write-Host "RBAC configuration applied" -ForegroundColor Green
} else {
    Write-Host "RBAC configuration may have issues, check manually" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Create database secrets separately
Write-Host "[7/8] Creating database-specific secrets..." -ForegroundColor Yellow
kubectl create secret generic postgres-secrets `
  -n $NAMESPACE `
  --from-literal=POSTGRES_USER="broxiva" `
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" `
  --from-literal=POSTGRES_DB="broxiva_production" `
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-secrets `
  -n $NAMESPACE `
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" `
  --dry-run=client -o yaml | kubectl apply -f -

Write-Host "Database secrets created" -ForegroundColor Green
Write-Host ""

# Step 8: Verify all resources
Write-Host "[8/8] Verifying created resources..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Secrets in $NAMESPACE:" -ForegroundColor Cyan
kubectl get secrets -n $NAMESPACE | Select-String -Pattern "broxiva|postgres|redis"
Write-Host ""
Write-Host "ConfigMaps in $NAMESPACE:" -ForegroundColor Cyan
kubectl get configmaps -n $NAMESPACE | Select-String -Pattern "broxiva" -NotMatch "kube-root"
Write-Host ""
Write-Host "ServiceAccounts in $NAMESPACE:" -ForegroundColor Cyan
kubectl get serviceaccounts -n $NAMESPACE
Write-Host ""

# Save generated passwords to a secure file
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$SECRETS_FILE = ".\production-secrets-$timestamp.env"

$secretsContent = @"
# Broxiva Production Secrets
# Generated: $(Get-Date)
# IMPORTANT: Store this file securely and delete after importing to password manager

# Authentication
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SESSION_SECRET=$SESSION_SECRET
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
KYC_ENCRYPTION_KEY=$KYC_ENCRYPTION_KEY

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=$DATABASE_URL

# Cache
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=$REDIS_URL

# Message Queue
RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD
RABBITMQ_URL=$RABBITMQ_URL

# Storage
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY

# Search
ELASTICSEARCH_PASSWORD=$ELASTICSEARCH_PASSWORD

# Admin Tools
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
PGADMIN_PASSWORD=$PGADMIN_PASSWORD

# Internal
INTERNAL_API_KEY=$INTERNAL_API_KEY
WEBHOOK_SECRET=$WEBHOOK_SECRET

# External Services (REPLACE THESE)
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_WEBHOOK_SECRET
SENDGRID_API_KEY=SG.REPLACE_WITH_API_KEY
SENTRY_DSN=https://REPLACE@sentry.io/0000000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_API_KEY
"@

$secretsContent | Out-File -FilePath $SECRETS_FILE -Encoding UTF8

# Secure the file (Windows equivalent of chmod 600)
$acl = Get-Acl $SECRETS_FILE
$acl.SetAccessRuleProtection($true, $false)
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "Allow")
$acl.SetAccessRule($accessRule)
Set-Acl $SECRETS_FILE $acl

Write-Host "========================================" -ForegroundColor Green
Write-Host "Production Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Review and securely store: $SECRETS_FILE"
Write-Host "2. Update external service API keys (Stripe, SendGrid, etc.)"
Write-Host "3. Import secrets to Azure Key Vault or password manager"
Write-Host "4. Delete the secrets file: Remove-Item $SECRETS_FILE"
Write-Host "5. Verify deployments can access secrets"
Write-Host ""
Write-Host "To update external service keys:" -ForegroundColor Yellow
Write-Host "kubectl patch secret broxiva-secrets -n $NAMESPACE -p '{`"data`":{`"STRIPE_SECRET_KEY`":`"BASE64_VALUE`"}}'"
Write-Host ""
Write-Host "WARNING: Keep the generated secrets file secure!" -ForegroundColor Red
