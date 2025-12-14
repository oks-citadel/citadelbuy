#!/bin/bash
# Broxiva Production Secrets Setup Script
# This script creates all necessary secrets and configmaps for the production environment
# Usage: ./setup-production-secrets.sh
# Last Updated: 2025-12-14

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="broxiva-prod"
AKS_CLUSTER="broxiva-aks-prod"
RESOURCE_GROUP="broxiva-rg"
ACR_NAME="broxivaprodacr"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Broxiva Production Secrets Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Verify namespace exists
echo -e "${YELLOW}[1/8] Verifying namespace...${NC}"
if kubectl get namespace ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✓ Namespace ${NAMESPACE} exists${NC}"
else
    echo -e "${RED}✗ Namespace ${NAMESPACE} does not exist. Creating...${NC}"
    kubectl create namespace ${NAMESPACE}
    kubectl label namespace ${NAMESPACE} name=${NAMESPACE} environment=production team=platform app=broxiva
fi
echo ""

# Step 2: Check AKS-ACR integration
echo -e "${YELLOW}[2/8] Checking AKS-ACR integration...${NC}"
ACR_INTEGRATION=$(az aks show --resource-group ${RESOURCE_GROUP} --name ${AKS_CLUSTER} --query "identityProfile.kubeletidentity.objectId" -o tsv 2>/dev/null || echo "")
if [ -n "$ACR_INTEGRATION" ]; then
    echo -e "${GREEN}✓ AKS has managed identity configured${NC}"
    echo "Attempting to attach ACR to AKS..."
    az aks update --name ${AKS_CLUSTER} --resource-group ${RESOURCE_GROUP} --attach-acr ${ACR_NAME} 2>/dev/null && echo -e "${GREEN}✓ ACR attached successfully${NC}" || echo -e "${YELLOW}Note: ACR may already be attached${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify AKS managed identity${NC}"
fi
echo ""

# Step 3: Generate cryptographic secrets
echo -e "${YELLOW}[3/8] Generating cryptographic secrets...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
NEXTAUTH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -hex 32)
KYC_ENCRYPTION_KEY=$(openssl rand -hex 32)
INTERNAL_API_KEY=$(openssl rand -base64 48 | tr -d '\n')
WEBHOOK_SECRET=$(openssl rand -base64 64 | tr -d '\n')
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
RABBITMQ_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
MINIO_ACCESS_KEY=$(openssl rand -base64 20 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
MINIO_SECRET_KEY=$(openssl rand -base64 40 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
PGADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')

echo -e "${GREEN}✓ Generated all cryptographic secrets${NC}"
echo ""

# Step 4: Create main application secrets
echo -e "${YELLOW}[4/8] Creating application secrets...${NC}"

# Build DATABASE_URL and REDIS_URL
DATABASE_URL="postgresql://broxiva:${POSTGRES_PASSWORD}@postgres.${NAMESPACE}.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis.${NAMESPACE}.svc.cluster.local:6379"
RABBITMQ_URL="amqp://broxiva:${RABBITMQ_PASSWORD}@rabbitmq.${NAMESPACE}.svc.cluster.local:5672"

kubectl create secret generic broxiva-secrets \
  -n ${NAMESPACE} \
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
  --from-literal=POSTGRES_HOST="postgres.${NAMESPACE}.svc.cluster.local" \
  --from-literal=POSTGRES_PORT="5432" \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=REDIS_HOST="redis.${NAMESPACE}.svc.cluster.local" \
  --from-literal=REDIS_PORT="6379" \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
  --from-literal=REDIS_URL="${REDIS_URL}" \
  --from-literal=REDIS_TLS="false" \
  --from-literal=RABBITMQ_USER="broxiva" \
  --from-literal=RABBITMQ_PASSWORD="${RABBITMQ_PASSWORD}" \
  --from-literal=RABBITMQ_HOST="rabbitmq.${NAMESPACE}.svc.cluster.local" \
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

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Application secrets created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create application secrets${NC}"
    exit 1
fi
echo ""

# Step 5: Create ConfigMap
echo -e "${YELLOW}[5/8] Creating application ConfigMap...${NC}"
kubectl create configmap broxiva-config \
  -n ${NAMESPACE} \
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

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ConfigMap created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create ConfigMap${NC}"
    exit 1
fi
echo ""

# Step 6: Apply RBAC configuration
echo -e "${YELLOW}[6/8] Applying RBAC configuration...${NC}"
# Update namespace references in RBAC file
sed "s/namespace: broxiva-production/namespace: ${NAMESPACE}/g" \
  C:/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization/infrastructure/kubernetes/production/rbac.yaml | \
  kubectl apply -f -

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ RBAC configuration applied${NC}"
else
    echo -e "${YELLOW}⚠ RBAC configuration may have issues, check manually${NC}"
fi
echo ""

# Step 7: Create database secrets separately
echo -e "${YELLOW}[7/8] Creating database-specific secrets...${NC}"
kubectl create secret generic postgres-secrets \
  -n ${NAMESPACE} \
  --from-literal=POSTGRES_USER="broxiva" \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --from-literal=POSTGRES_DB="broxiva_production" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-secrets \
  -n ${NAMESPACE} \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ Database secrets created${NC}"
echo ""

# Step 8: Verify all resources
echo -e "${YELLOW}[8/8] Verifying created resources...${NC}"
echo ""
echo "Secrets in ${NAMESPACE}:"
kubectl get secrets -n ${NAMESPACE} | grep -E "broxiva|postgres|redis"
echo ""
echo "ConfigMaps in ${NAMESPACE}:"
kubectl get configmaps -n ${NAMESPACE} | grep -v "kube-root"
echo ""
echo "ServiceAccounts in ${NAMESPACE}:"
kubectl get serviceaccounts -n ${NAMESPACE}
echo ""

# Save generated passwords to a secure file
SECRETS_FILE="./production-secrets-$(date +%Y%m%d-%H%M%S).env"
cat > ${SECRETS_FILE} <<EOF
# Broxiva Production Secrets
# Generated: $(date)
# IMPORTANT: Store this file securely and delete after importing to password manager

# Authentication
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
KYC_ENCRYPTION_KEY=${KYC_ENCRYPTION_KEY}

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=${DATABASE_URL}

# Cache
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=${REDIS_URL}

# Message Queue
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
RABBITMQ_URL=${RABBITMQ_URL}

# Storage
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}

# Search
ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}

# Admin Tools
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}

# Internal
INTERNAL_API_KEY=${INTERNAL_API_KEY}
WEBHOOK_SECRET=${WEBHOOK_SECRET}

# External Services (REPLACE THESE)
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_WEBHOOK_SECRET
SENDGRID_API_KEY=SG.REPLACE_WITH_API_KEY
SENTRY_DSN=https://REPLACE@sentry.io/0000000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_API_KEY
EOF

chmod 600 ${SECRETS_FILE}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Production Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo "1. Review and securely store: ${SECRETS_FILE}"
echo "2. Update external service API keys (Stripe, SendGrid, etc.)"
echo "3. Import secrets to Azure Key Vault or password manager"
echo "4. Delete the secrets file: rm ${SECRETS_FILE}"
echo "5. Verify deployments can access secrets"
echo ""
echo -e "${YELLOW}To update external service keys:${NC}"
echo "kubectl patch secret broxiva-secrets -n ${NAMESPACE} -p '{\"data\":{\"STRIPE_SECRET_KEY\":\"BASE64_VALUE\"}}'"
echo ""
echo -e "${RED}WARNING: Keep the generated secrets file secure!${NC}"
