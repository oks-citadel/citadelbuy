# Broxiva Production Environment Setup

This document provides step-by-step instructions for setting up the production Kubernetes environment with all necessary secrets and configurations.

## Prerequisites

- `kubectl` configured and authenticated to `broxiva-prod-eks` cluster
- `aws` CLI authenticated
- `openssl` installed
- Cluster admin permissions

## Environment Details

- **EKS Cluster**: broxiva-prod-eks
- **Namespace**: broxiva-production
- **ECR**: ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
- **Region**: us-east-1

## Quick Setup (Automated)

Run the automated setup script:

```bash
cd C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/production
chmod +x setup-production-secrets.sh
./setup-production-secrets.sh
```

The script will:
1. Verify namespace exists
2. Configure AKS-ACR integration
3. Generate all cryptographic secrets
4. Create Kubernetes secrets and configmaps
5. Apply RBAC configuration
6. Generate a secrets backup file

## Manual Setup (Step-by-Step)

### Step 1: Verify Namespace

```bash
kubectl get namespace broxiva-prod
```

If the namespace doesn't exist, create it:

```bash
kubectl create namespace broxiva-prod
kubectl label namespace broxiva-prod name=broxiva-prod environment=production team=platform app=broxiva
```

### Step 2: Configure AKS-ACR Integration

Check current integration:

```bash
az aks show --resource-group broxiva-rg --name broxiva-aks-prod --query "identityProfile" -o json
```

Attach ACR to AKS (if needed):

```bash
az aks update --name broxiva-aks-prod --resource-group broxiva-rg --attach-acr broxivaprodacr
```

### Step 3: Generate Cryptographic Secrets

Generate all required secrets:

```bash
# JWT and Session Secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
NEXTAUTH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -hex 32)
KYC_ENCRYPTION_KEY=$(openssl rand -hex 32)
INTERNAL_API_KEY=$(openssl rand -base64 48 | tr -d '\n')
WEBHOOK_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Database Passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
RABBITMQ_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')

# Storage Credentials
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
MINIO_ACCESS_KEY=$(openssl rand -base64 20 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
MINIO_SECRET_KEY=$(openssl rand -base64 40 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')

# Admin Passwords
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
PGADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
```

### Step 4: Create Application Secrets

```bash
# Build connection URLs
DATABASE_URL="postgresql://broxiva:${POSTGRES_PASSWORD}@postgres.broxiva-prod.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis.broxiva-prod.svc.cluster.local:6379"
RABBITMQ_URL="amqp://broxiva:${RABBITMQ_PASSWORD}@rabbitmq.broxiva-prod.svc.cluster.local:5672"

# Create main secrets
kubectl create secret generic broxiva-secrets \
  -n broxiva-prod \
  --from-literal=NODE_ENV="production" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
  --from-literal=JWT_EXPIRES_IN="1h" \
  --from-literal=JWT_REFRESH_EXPIRES_IN="7d" \
  --from-literal=SESSION_SECRET="${SESSION_SECRET}" \
  --from-literal=NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
  --from-literal=ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
  --from-literal=KYC_ENCRYPTION_KEY="${KYC_ENCRYPTION_KEY}" \
  --from-literal=POSTGRES_USER="broxiva" \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --from-literal=POSTGRES_DB="broxiva_production" \
  --from-literal=POSTGRES_HOST="postgres.broxiva-prod.svc.cluster.local" \
  --from-literal=POSTGRES_PORT="5432" \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=REDIS_HOST="redis.broxiva-prod.svc.cluster.local" \
  --from-literal=REDIS_PORT="6379" \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
  --from-literal=REDIS_URL="${REDIS_URL}" \
  --from-literal=REDIS_TLS="false" \
  --from-literal=RABBITMQ_USER="broxiva" \
  --from-literal=RABBITMQ_PASSWORD="${RABBITMQ_PASSWORD}" \
  --from-literal=RABBITMQ_HOST="rabbitmq.broxiva-prod.svc.cluster.local" \
  --from-literal=RABBITMQ_PORT="5672" \
  --from-literal=RABBITMQ_URL="${RABBITMQ_URL}" \
  --from-literal=INTERNAL_API_KEY="${INTERNAL_API_KEY}" \
  --from-literal=WEBHOOK_SECRET="${WEBHOOK_SECRET}" \
  --from-literal=MINIO_ROOT_USER="broxiva_admin" \
  --from-literal=MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}" \
  --from-literal=MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY}" \
  --from-literal=MINIO_SECRET_KEY="${MINIO_SECRET_KEY}" \
  --from-literal=ELASTICSEARCH_USERNAME="elastic" \
  --from-literal=ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD}" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_REPLACE_WITH_LIVE_KEY" \
  --from-literal=STRIPE_PUBLISHABLE_KEY="pk_test_REPLACE_WITH_LIVE_KEY" \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_REPLACE_WITH_WEBHOOK_SECRET" \
  --from-literal=SENDGRID_API_KEY="SG.REPLACE_WITH_API_KEY" \
  --from-literal=SENTRY_DSN="https://REPLACE@sentry.io/0000000" \
  --from-literal=OPENAI_API_KEY="sk-proj-REPLACE_WITH_API_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 5: Create ConfigMaps

```bash
kubectl create configmap broxiva-config \
  -n broxiva-prod \
  --from-literal=NODE_ENV="production" \
  --from-literal=PORT="4000" \
  --from-literal=API_URL="https://api.broxiva.com" \
  --from-literal=WEB_URL="https://broxiva.com" \
  --from-literal=NEXT_PUBLIC_API_URL="https://api.broxiva.com" \
  --from-literal=LOG_LEVEL="info" \
  --from-literal=LOG_FORMAT="json" \
  --from-literal=CORS_ORIGIN="https://broxiva.com,https://www.broxiva.com" \
  --from-literal=ENABLE_ANALYTICS="true" \
  --from-literal=ENABLE_CACHING="true" \
  --from-literal=ENABLE_RATE_LIMITING="true" \
  --from-literal=METRICS_ENABLED="true" \
  --from-literal=METRICS_PORT="9090" \
  --from-literal=HEALTH_CHECK_INTERVAL="30000" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 6: Apply RBAC Configuration

```bash
kubectl apply -f C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/production/rbac.yaml
```

Note: The RBAC file references `broxiva-production` namespace. You may need to update it to `broxiva-prod`.

### Step 7: Create Database-Specific Secrets

```bash
# PostgreSQL secrets
kubectl create secret generic postgres-secrets \
  -n broxiva-prod \
  --from-literal=POSTGRES_USER="broxiva" \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --from-literal=POSTGRES_DB="broxiva_production" \
  --dry-run=client -o yaml | kubectl apply -f -

# Redis secrets
kubectl create secret generic redis-secrets \
  -n broxiva-prod \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 8: Verify Setup

```bash
# Check all secrets
kubectl get secrets -n broxiva-prod

# Check all configmaps
kubectl get configmaps -n broxiva-prod

# Check service accounts
kubectl get serviceaccounts -n broxiva-prod

# Verify secret contents (without exposing values)
kubectl describe secret broxiva-secrets -n broxiva-prod
```

## Post-Setup Tasks

### 1. Update External Service API Keys

Replace placeholder values with actual API keys:

```bash
# Stripe (LIVE keys only!)
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' -p='[{"op":"replace","path":"/data/STRIPE_SECRET_KEY","value":"'$(echo -n "sk_live_YOUR_KEY" | base64)'"}]'

kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' -p='[{"op":"replace","path":"/data/STRIPE_WEBHOOK_SECRET","value":"'$(echo -n "whsec_YOUR_SECRET" | base64)'"}]'

# SendGrid
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' -p='[{"op":"replace","path":"/data/SENDGRID_API_KEY","value":"'$(echo -n "SG.YOUR_KEY" | base64)'"}]'

# Sentry
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' -p='[{"op":"replace","path":"/data/SENTRY_DSN","value":"'$(echo -n "https://YOUR_DSN@sentry.io/PROJECT" | base64)'"}]'

# OpenAI (if using AI features)
kubectl patch secret broxiva-secrets -n broxiva-prod \
  --type='json' -p='[{"op":"replace","path":"/data/OPENAI_API_KEY","value":"'$(echo -n "sk-proj-YOUR_KEY" | base64)'"}]'
```

### 2. Store Secrets in Azure Key Vault

```bash
# Store critical secrets in Azure Key Vault for backup
az keyvault secret set --vault-name broxiva-prod-kv --name encryption-key --value "${ENCRYPTION_KEY}"
az keyvault secret set --vault-name broxiva-prod-kv --name kyc-encryption-key --value "${KYC_ENCRYPTION_KEY}"
az keyvault secret set --vault-name broxiva-prod-kv --name jwt-secret --value "${JWT_SECRET}"
az keyvault secret set --vault-name broxiva-prod-kv --name postgres-password --value "${POSTGRES_PASSWORD}"
az keyvault secret set --vault-name broxiva-prod-kv --name redis-password --value "${REDIS_PASSWORD}"
```

### 3. Configure External Secrets Operator (Optional)

If using External Secrets Operator to sync from Azure Key Vault:

```bash
kubectl apply -f C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/production/external-secrets-broxiva.yaml
```

### 4. Set Up Monitoring

Apply monitoring configurations:

```bash
kubectl apply -f C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/kubernetes/production/servicemonitor.yaml
```

## Security Best Practices

1. **Never commit secrets to git** - All secrets should be generated locally and stored securely
2. **Rotate secrets regularly**:
   - High priority (90 days): JWT secrets, database passwords, API keys
   - Medium priority (180 days): OAuth secrets, admin passwords
   - Never rotate: Encryption keys (without data migration)
3. **Use Azure Key Vault** for secret backup and recovery
4. **Enable audit logging** for all secret access
5. **Use External Secrets Operator** for production secret management
6. **Implement secret rotation procedures** before deploying to production

## Troubleshooting

### Secrets Not Accessible by Pods

Check pod service account:
```bash
kubectl get pod POD_NAME -n broxiva-prod -o yaml | grep serviceAccountName
```

Verify RBAC permissions:
```bash
kubectl auth can-i get secrets --as=system:serviceaccount:broxiva-prod:broxiva-api -n broxiva-prod
```

### ACR Pull Errors

Verify ACR integration:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
```

### Database Connection Issues

Verify database secrets:
```bash
kubectl get secret postgres-secrets -n broxiva-prod -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d
```

Test connection from pod:
```bash
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n broxiva-prod -- \
  psql postgresql://broxiva:PASSWORD@postgres.broxiva-prod.svc.cluster.local:5432/broxiva_production
```

## Secret Rotation Procedures

### Rotating Database Passwords

1. Update the secret with new password
2. Perform rolling restart of database
3. Perform rolling restart of all application pods
4. Verify connectivity

### Rotating JWT Secrets

1. Generate new secret
2. Update Kubernetes secret
3. Perform rolling restart of API pods
4. Note: This will invalidate all existing user sessions

### Rotating Encryption Keys

**CRITICAL**: Never rotate encryption keys without a data migration plan!

1. Deploy dual-key support in application
2. Migrate encrypted data to new key
3. Verify all data is migrated
4. Remove old key support

## Compliance and Audit

- All secret creation and modifications are logged
- Secrets are reviewed quarterly
- Access to secrets is restricted to platform team
- Secret rotation is tracked in change management system

## Support

For issues or questions:
- Platform Team: devops@broxiva.com
- Documentation: https://docs.broxiva.com/infrastructure/production
- Incident Management: Create ticket in JIRA

---

**Last Updated**: 2025-12-14
**Maintained By**: Platform Engineering Team
