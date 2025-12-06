# CitadelBuy Production Deployment Guide

**Version:** 1.0.0
**Last Updated:** December 4, 2025
**Owner:** Platform Engineering Team
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Infrastructure Requirements](#infrastructure-requirements)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Azure DevOps Pipeline Deployment](#azure-devops-pipeline-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Security Hardening](#security-hardening)
10. [Performance Optimization](#performance-optimization)
11. [Maintenance Windows](#maintenance-windows)
12. [Emergency Contacts](#emergency-contacts)

---

## Overview

This guide provides comprehensive instructions for deploying CitadelBuy to production environments. The deployment process uses Azure Kubernetes Service (AKS) with automated CI/CD pipelines through Azure DevOps.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │ Azure Front  │────────▶│    Azure     │                      │
│  │    Door      │         │ Load Balancer│                      │
│  └──────────────┘         └──────────────┘                      │
│         │                        │                               │
│         ▼                        ▼                               │
│  ┌────────────────────────────────────────┐                     │
│  │     Azure Kubernetes Service (AKS)     │                     │
│  ├────────────────────────────────────────┤                     │
│  │  ┌──────┐  ┌──────┐  ┌──────┐         │                     │
│  │  │ Web  │  │ API  │  │Worker│         │                     │
│  │  │ Pods │  │ Pods │  │ Pods │         │                     │
│  │  └──────┘  └──────┘  └──────┘         │                     │
│  └────────────────────────────────────────┘                     │
│         │                │                                       │
│         ▼                ▼                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │PostgreSQL│    │  Redis   │    │Elastic-  │                  │
│  │  (Azure  │    │  Cache   │    │ search   │                  │
│  │Database) │    │          │    │          │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │      Monitoring & Observability      │                       │
│  │  • Prometheus  • Grafana  • Sentry   │                       │
│  │  • Azure Monitor  • Log Analytics    │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

- **Zero-Downtime Deployments**: Blue-green deployment strategy
- **Auto-Scaling**: Horizontal pod autoscaling based on metrics
- **High Availability**: Multi-zone deployment with 99.9% SLA
- **Disaster Recovery**: Automated backups with 15-minute RPO
- **Security**: WAF, DDoS protection, network policies

---

## Pre-Deployment Checklist

### 1. Code Quality & Testing

- [ ] All unit tests passing (`pnpm test` - 400+ tests)
- [ ] E2E tests passing (`pnpm test:e2e` in apps/api)
- [ ] Frontend tests passing (`pnpm test` in apps/web)
- [ ] Code review completed (minimum 2 approvals)
- [ ] Security scan completed (no critical/high vulnerabilities)
- [ ] TypeScript compilation successful
- [ ] Linting checks passed
- [ ] Test coverage > 80%

### 2. Infrastructure Readiness

- [ ] Azure subscription active and configured
- [ ] AKS cluster provisioned (3+ nodes)
- [ ] Azure Database for PostgreSQL created
- [ ] Azure Cache for Redis provisioned
- [ ] Azure Container Registry (ACR) configured
- [ ] Azure Key Vault set up for secrets
- [ ] Virtual Network and subnets configured
- [ ] Network Security Groups (NSG) rules applied
- [ ] Azure Front Door configured
- [ ] Application Gateway with WAF enabled

### 3. Environment Configuration

- [ ] All environment variables documented in `.env.example`
- [ ] Production secrets stored in Azure Key Vault
- [ ] Database connection strings verified
- [ ] External API keys configured (Stripe, SendGrid, etc.)
- [ ] OAuth providers configured (Google, Facebook, Apple)
- [ ] CDN configured (Azure CDN/Cloudflare)
- [ ] SSL/TLS certificates obtained and configured
- [ ] DNS records configured and propagated
- [ ] CORS origins configured correctly

### 4. Database Preparation

- [ ] Database backup completed and verified
- [ ] Migration scripts tested in staging
- [ ] Rollback scripts prepared
- [ ] Database indexes optimized
- [ ] Connection pooling configured
- [ ] Database disk space verified (>30% free)
- [ ] Read replicas configured (if needed)
- [ ] Database performance baseline recorded

### 5. Third-Party Services

- [ ] Stripe production mode enabled and tested
- [ ] Stripe webhooks configured
- [ ] PayPal production credentials configured
- [ ] SendGrid production quota verified
- [ ] Twilio SMS quota verified
- [ ] AWS S3 bucket configured
- [ ] Elasticsearch cluster configured
- [ ] Algolia production app configured
- [ ] Social OAuth providers verified

### 6. Monitoring & Observability

- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Alert rules configured
- [ ] Sentry error tracking enabled
- [ ] Azure Monitor enabled
- [ ] Log Analytics workspace configured
- [ ] Application Insights configured
- [ ] PagerDuty integration configured
- [ ] Status page configured (status.citadelbuy.com)

### 7. Security Hardening

- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] DDoS protection enabled
- [ ] WAF rules configured
- [ ] Network policies applied
- [ ] Pod security policies enforced
- [ ] RBAC configured
- [ ] Secrets rotation policy implemented
- [ ] Vulnerability scanning enabled

### 8. Documentation & Communication

- [ ] Deployment scheduled and communicated
- [ ] Change management ticket created
- [ ] Deployment notification sent to team
- [ ] On-call engineer identified
- [ ] Rollback plan documented
- [ ] Customer notification prepared (if needed)
- [ ] Stakeholders informed

---

## Infrastructure Requirements

### Minimum Production Requirements

#### Compute Resources (AKS)

| Component | Min Nodes | Max Nodes | Node Size | vCPU | Memory |
|-----------|-----------|-----------|-----------|------|--------|
| **System Pool** | 3 | 5 | Standard_D4s_v3 | 4 | 16 GB |
| **API Pool** | 3 | 10 | Standard_D4s_v3 | 4 | 16 GB |
| **Web Pool** | 2 | 8 | Standard_D2s_v3 | 2 | 8 GB |
| **Worker Pool** | 2 | 5 | Standard_D2s_v3 | 2 | 8 GB |

**Total Estimated Monthly Cost**: $1,500 - $3,000

#### Database Resources

| Component | Tier | vCores | Storage | IOPS |
|-----------|------|--------|---------|------|
| **PostgreSQL** | General Purpose | 4 | 256 GB SSD | 3000 |
| **Redis Cache** | Premium P1 | 1 | 6 GB | N/A |

**Total Estimated Monthly Cost**: $500 - $800

#### Storage Resources

| Component | Type | Size | Redundancy |
|-----------|------|------|------------|
| **Container Registry** | Premium | 500 GB | Geo-replication |
| **Blob Storage** | Hot | 1 TB | GRS |
| **Backup Storage** | Cool | 500 GB | GRS |

**Total Estimated Monthly Cost**: $150 - $300

#### Networking

| Component | Type | Bandwidth |
|-----------|------|-----------|
| **Load Balancer** | Standard | 5 Gbps |
| **Application Gateway** | WAF_v2 | Auto-scale |
| **Azure Front Door** | Premium | Global |

**Total Estimated Monthly Cost**: $500 - $1,000

### Total Infrastructure Cost

**Estimated Monthly Cost**: $2,650 - $5,100
**Estimated Annual Cost**: $31,800 - $61,200

---

## Environment Configuration

### Required Environment Variables

Create a secure `.env` file or use Azure Key Vault:

```bash
# ========================================
# Application Configuration
# ========================================
NODE_ENV=production
PORT=4000
API_PREFIX=api
FRONTEND_URL=https://citadelbuy.com

# ========================================
# Database Configuration
# ========================================
DATABASE_URL=postgresql://citadelbuy:${DB_PASSWORD}@citadelbuy-prod.postgres.database.azure.com:5432/citadelbuy?ssl=true&sslmode=require
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=10
DATABASE_SSL_ENABLED=true

# ========================================
# Redis Configuration
# ========================================
REDIS_HOST=citadelbuy-prod.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_TLS=true

# ========================================
# JWT Authentication
# ========================================
JWT_SECRET=${JWT_SECRET}  # Min 64 characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=7d

# ========================================
# Email Configuration (SendGrid)
# ========================================
SENDGRID_API_KEY=${SENDGRID_API_KEY}
EMAIL_FROM=noreply@citadelbuy.com
EMAIL_FROM_NAME=CitadelBuy

# ========================================
# SMS Configuration (Twilio)
# ========================================
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}

# ========================================
# Payment Providers
# ========================================
# Stripe
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

# PayPal
PAYPAL_MODE=production
PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID}
PAYPAL_CLIENT_SECRET=${PAYPAL_CLIENT_SECRET}

# Flutterwave (Africa)
FLUTTERWAVE_PUBLIC_KEY=${FLUTTERWAVE_PUBLIC_KEY}
FLUTTERWAVE_SECRET_KEY=${FLUTTERWAVE_SECRET_KEY}
FLUTTERWAVE_ENCRYPTION_KEY=${FLUTTERWAVE_ENCRYPTION_KEY}

# Paystack (Nigeria)
PAYSTACK_PUBLIC_KEY=${PAYSTACK_PUBLIC_KEY}
PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}

# ========================================
# Cloud Storage (AWS S3)
# ========================================
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=us-east-1
AWS_S3_BUCKET=citadelbuy-prod-assets
AWS_CLOUDFRONT_URL=https://cdn.citadelbuy.com

# ========================================
# Search Services
# ========================================
# Elasticsearch
ELASTICSEARCH_NODE=https://citadelbuy-prod-es.azure.com:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}

# Algolia (Alternative/Backup)
ALGOLIA_APP_ID=${ALGOLIA_APP_ID}
ALGOLIA_API_KEY=${ALGOLIA_API_KEY}
ALGOLIA_INDEX_NAME=citadelbuy_products

# ========================================
# OAuth Providers
# ========================================
# Google
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_CALLBACK_URL=https://citadelbuy.com/api/auth/google/callback

# Facebook
FACEBOOK_APP_ID=${FACEBOOK_APP_ID}
FACEBOOK_APP_SECRET=${FACEBOOK_APP_SECRET}
FACEBOOK_CALLBACK_URL=https://citadelbuy.com/api/auth/facebook/callback

# Apple
APPLE_CLIENT_ID=${APPLE_CLIENT_ID}
APPLE_TEAM_ID=${APPLE_TEAM_ID}
APPLE_KEY_ID=${APPLE_KEY_ID}
APPLE_PRIVATE_KEY=${APPLE_PRIVATE_KEY}

# GitHub
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}

# ========================================
# Monitoring & Error Tracking
# ========================================
SENTRY_DSN=${SENTRY_DSN}
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Application Insights
APPINSIGHTS_INSTRUMENTATIONKEY=${APPINSIGHTS_KEY}

# ========================================
# Security Configuration
# ========================================
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15
HELMET_ENABLED=true

# ========================================
# Feature Flags
# ========================================
FEATURE_AI_RECOMMENDATIONS=true
FEATURE_VISUAL_SEARCH=true
FEATURE_LIVE_CHAT=true
FEATURE_SOCIAL_LOGIN=true

# ========================================
# Background Jobs
# ========================================
QUEUE_REDIS_URL=redis://citadelbuy-prod.redis.cache.windows.net:6380
QUEUE_CONCURRENCY=5
```

### Storing Secrets in Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name citadelbuy-prod-kv \
  --resource-group citadelbuy-prod-rg \
  --location eastus \
  --enable-rbac-authorization true

# Store secrets
az keyvault secret set --vault-name citadelbuy-prod-kv --name "DATABASE-PASSWORD" --value "${DB_PASSWORD}"
az keyvault secret set --vault-name citadelbuy-prod-kv --name "REDIS-PASSWORD" --value "${REDIS_PASSWORD}"
az keyvault secret set --vault-name citadelbuy-prod-kv --name "JWT-SECRET" --value "${JWT_SECRET}"
az keyvault secret set --vault-name citadelbuy-prod-kv --name "STRIPE-SECRET-KEY" --value "${STRIPE_SECRET_KEY}"

# Grant AKS access to Key Vault
az keyvault set-policy \
  --name citadelbuy-prod-kv \
  --spn <AKS-SERVICE-PRINCIPAL-ID> \
  --secret-permissions get list
```

---

## Deployment Steps

### Step 1: Build Docker Images

```bash
# Navigate to project root
cd /path/to/citadelbuy/organization

# Login to Azure Container Registry
az acr login --name citadelbuyacr

# Build and tag API image
docker build -t citadelbuyacr.azurecr.io/citadelbuy-api:v${VERSION} \
  -t citadelbuyacr.azurecr.io/citadelbuy-api:latest \
  -f apps/api/Dockerfile \
  apps/api

# Build and tag Web image
docker build -t citadelbuyacr.azurecr.io/citadelbuy-web:v${VERSION} \
  -t citadelbuyacr.azurecr.io/citadelbuy-web:latest \
  -f apps/web/Dockerfile \
  apps/web

# Push images
docker push citadelbuyacr.azurecr.io/citadelbuy-api:v${VERSION}
docker push citadelbuyacr.azurecr.io/citadelbuy-api:latest
docker push citadelbuyacr.azurecr.io/citadelbuy-web:v${VERSION}
docker push citadelbuyacr.azurecr.io/citadelbuy-web:latest
```

### Step 2: Configure Kubernetes

```bash
# Connect to AKS cluster
az aks get-credentials \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-prod-aks \
  --overwrite-existing

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### Step 3: Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace citadelbuy-prod

# Create secrets from Azure Key Vault
kubectl create secret generic citadelbuy-secrets \
  --from-literal=DATABASE_PASSWORD="${DB_PASSWORD}" \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}" \
  --namespace=citadelbuy-prod
```

### Step 4: Deploy Infrastructure Services

```bash
# Apply ConfigMaps
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml -n citadelbuy-prod

# Deploy PostgreSQL (if self-hosted)
kubectl apply -f infrastructure/kubernetes/base/postgres-deployment.yaml -n citadelbuy-prod

# Deploy Redis (if self-hosted)
kubectl apply -f infrastructure/kubernetes/base/redis-deployment.yaml -n citadelbuy-prod

# Deploy Elasticsearch
kubectl apply -f infrastructure/kubernetes/base/elasticsearch-deployment.yaml -n citadelbuy-prod

# Wait for services to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n citadelbuy-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n citadelbuy-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch -n citadelbuy-prod --timeout=300s
```

### Step 5: Run Database Migrations

```bash
# Create migration job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: citadelbuy-db-migration
  namespace: citadelbuy-prod
spec:
  template:
    spec:
      containers:
      - name: migration
        image: citadelbuyacr.azurecr.io/citadelbuy-api:v${VERSION}
        command: ["npx", "prisma", "migrate", "deploy"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: citadelbuy-secrets
              key: DATABASE_URL
      restartPolicy: OnFailure
  backoffLimit: 3
EOF

# Wait for migration to complete
kubectl wait --for=condition=complete job/citadelbuy-db-migration -n citadelbuy-prod --timeout=600s

# Verify migration
kubectl logs job/citadelbuy-db-migration -n citadelbuy-prod
```

### Step 6: Deploy Application Services

```bash
# Deploy API
kubectl apply -f infrastructure/kubernetes/production/api-deployment.yaml -n citadelbuy-prod
kubectl apply -f infrastructure/kubernetes/production/api-service.yaml -n citadelbuy-prod
kubectl apply -f infrastructure/kubernetes/production/api-hpa.yaml -n citadelbuy-prod

# Deploy Web Frontend
kubectl apply -f infrastructure/kubernetes/production/web-deployment.yaml -n citadelbuy-prod
kubectl apply -f infrastructure/kubernetes/production/web-service.yaml -n citadelbuy-prod
kubectl apply -f infrastructure/kubernetes/production/web-hpa.yaml -n citadelbuy-prod

# Deploy Worker
kubectl apply -f infrastructure/kubernetes/production/worker-deployment.yaml -n citadelbuy-prod

# Wait for rollouts
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-prod --timeout=600s
kubectl rollout status deployment/citadelbuy-web -n citadelbuy-prod --timeout=600s
kubectl rollout status deployment/citadelbuy-worker -n citadelbuy-prod --timeout=600s
```

### Step 7: Configure Ingress

```bash
# Deploy NGINX Ingress Controller (if not already installed)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Apply Ingress rules
kubectl apply -f infrastructure/kubernetes/production/ingress.yaml -n citadelbuy-prod

# Verify Ingress
kubectl get ingress -n citadelbuy-prod
```

### Step 8: Configure SSL/TLS

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@citadelbuy.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Certificate will be automatically provisioned via Ingress annotations
```

---

## Azure DevOps Pipeline Deployment

### Pipeline Configuration

The Azure DevOps pipeline automates the entire deployment process. See `docs/SAMPLE_AZURE_PIPELINE.yml` for the complete pipeline configuration.

### Pipeline Stages

1. **Code Quality** - Linting and type checking
2. **Unit Tests** - Run all test suites
3. **Security Scan** - Vulnerability scanning
4. **Build** - Build and push Docker images
5. **Deploy Staging** - Deploy to staging environment
6. **E2E Tests** - Run end-to-end tests on staging
7. **Deploy Production** - Deploy to production (requires manual approval)

### Triggering a Deployment

#### Automatic Deployment

```bash
# Push to main branch triggers production deployment
git checkout main
git pull origin main
git merge develop
git push origin main
```

#### Manual Deployment via Azure DevOps

1. Navigate to Azure DevOps
2. Go to Pipelines > CitadelBuy-Production
3. Click "Run pipeline"
4. Select branch: `main`
5. Review deployment plan
6. Approve production deployment stage

### Pipeline Variables

Configure these variable groups in Azure DevOps:

**citadelbuy-common**:
- NODE_VERSION: "20.x"
- PNPM_VERSION: "9.x"
- AZURE_CONTAINER_REGISTRY: "citadelbuyacr.azurecr.io"

**citadelbuy-prod**:
- API_URL: "https://api.citadelbuy.com"
- DATABASE_URL: (from Key Vault)
- REDIS_URL: (from Key Vault)
- All other production secrets

---

## Post-Deployment Verification

### Automated Verification

The deployment pipeline includes automated health checks:

```bash
# Health check endpoint
curl -f https://api.citadelbuy.com/api/health

# Detailed health check
curl https://api.citadelbuy.com/api/health/detailed | jq '.'
```

### Manual Verification Checklist

#### 1. Application Health (0-5 minutes)

```bash
# Check pod status
kubectl get pods -n citadelbuy-prod

# Check for errors in logs
kubectl logs -n citadelbuy-prod -l app=citadelbuy-api --tail=100 | grep -i error

# Verify all pods are running
kubectl get pods -n citadelbuy-prod | grep -E "(Running|Completed)"

# Check HPA status
kubectl get hpa -n citadelbuy-prod
```

#### 2. Service Endpoints (5-10 minutes)

- [ ] Homepage loads: https://citadelbuy.com
- [ ] API health check: https://api.citadelbuy.com/api/health
- [ ] Product listing: https://citadelbuy.com/products
- [ ] Search functionality: https://citadelbuy.com/search
- [ ] User authentication: https://citadelbuy.com/login
- [ ] Admin panel: https://citadelbuy.com/admin

#### 3. Critical User Flows (10-20 minutes)

- [ ] User registration works
- [ ] User login works
- [ ] Product search returns results
- [ ] Add to cart works
- [ ] Checkout process works
- [ ] Payment processing works (test mode)
- [ ] Order confirmation email sent
- [ ] Admin can view orders

#### 4. Database Connectivity (5 minutes)

```bash
# Test database connection from API pod
kubectl exec -it deployment/citadelbuy-api -n citadelbuy-prod -- \
  npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";"

# Verify read replica (if configured)
kubectl exec -it deployment/citadelbuy-api -n citadelbuy-prod -- \
  npx prisma db execute --stdin <<< "SELECT 1;"
```

#### 5. External Services (10 minutes)

- [ ] Stripe payment processing works
- [ ] PayPal payment processing works
- [ ] SendGrid email delivery works
- [ ] Twilio SMS delivery works
- [ ] AWS S3 file upload works
- [ ] Elasticsearch search works
- [ ] Redis cache works

#### 6. Performance Metrics (15-30 minutes)

```bash
# Check Grafana dashboards
# Open: https://grafana.citadelbuy.com

# Verify metrics:
# - API response time P95 < 500ms
# - Error rate < 0.1%
# - Database query time < 100ms
# - CPU usage < 70%
# - Memory usage < 80%
```

#### 7. Monitoring & Alerting (5 minutes)

- [ ] Prometheus collecting metrics
- [ ] Grafana dashboards loading
- [ ] Sentry receiving errors
- [ ] Azure Monitor enabled
- [ ] Alert rules active
- [ ] PagerDuty integration works

---

## Rollback Procedures

### Quick Rollback (Kubernetes)

```bash
# Rollback API to previous version
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-prod

# Rollback Web to previous version
kubectl rollout undo deployment/citadelbuy-web -n citadelbuy-prod

# Verify rollback
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-prod
kubectl rollout status deployment/citadelbuy-web -n citadelbuy-prod
```

### Rollback to Specific Version

```bash
# List deployment history
kubectl rollout history deployment/citadelbuy-api -n citadelbuy-prod

# Rollback to specific revision
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-prod --to-revision=5

# Verify
kubectl get pods -n citadelbuy-prod -l app=citadelbuy-api
```

### Database Rollback

```bash
# Stop application traffic
kubectl scale deployment/citadelbuy-api -n citadelbuy-prod --replicas=0

# Restore database from backup (see DISASTER_RECOVERY.md)
# Point-in-time recovery to before deployment

# Restart application
kubectl scale deployment/citadelbuy-api -n citadelbuy-prod --replicas=3
```

### When to Rollback

Immediately rollback if:
- Error rate > 5%
- API response time P95 > 2 seconds
- Critical functionality broken (checkout, payments)
- Database corruption detected
- Security vulnerability exposed

---

## Security Hardening

### Network Security

```bash
# Apply Network Policies
kubectl apply -f infrastructure/kubernetes/security/network-policies.yaml -n citadelbuy-prod

# Verify policies
kubectl get networkpolicies -n citadelbuy-prod
```

### Pod Security

```yaml
# Pod Security Standards
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

### Security Headers

Configured in Ingress:

```yaml
annotations:
  nginx.ingress.kubernetes.io/configuration-snippet: |
    more_set_headers "X-Frame-Options: DENY";
    more_set_headers "X-Content-Type-Options: nosniff";
    more_set_headers "X-XSS-Protection: 1; mode=block";
    more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
    more_set_headers "Content-Security-Policy: default-src 'self'";
    more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
```

---

## Performance Optimization

### CDN Configuration

```bash
# Configure Azure CDN
az cdn profile create \
  --name citadelbuy-cdn \
  --resource-group citadelbuy-prod-rg \
  --sku Standard_Microsoft

az cdn endpoint create \
  --name citadelbuy \
  --profile-name citadelbuy-cdn \
  --resource-group citadelbuy-prod-rg \
  --origin citadelbuy.com \
  --origin-host-header citadelbuy.com
```

### Caching Strategy

- **Static Assets**: 1 year (Cache-Control: public, max-age=31536000)
- **API Responses**: 5 minutes (Cache-Control: public, max-age=300)
- **HTML Pages**: 1 minute (Cache-Control: public, max-age=60)
- **User-Specific**: No cache (Cache-Control: private, no-cache)

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_created
  ON "Order" (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category
  ON "Product" (category_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search
  ON "Product" USING gin(to_tsvector('english', name || ' ' || description));

-- Analyze tables
ANALYZE "Order";
ANALYZE "Product";
ANALYZE "User";
```

---

## Maintenance Windows

### Scheduled Maintenance

**Frequency**: Monthly
**Duration**: 2-4 hours
**Time**: First Sunday of month, 2:00 AM - 6:00 AM UTC
**Advance Notice**: 2 weeks

### Maintenance Checklist

- [ ] Notify users via email and status page
- [ ] Schedule maintenance window in PagerDuty
- [ ] Create maintenance mode page
- [ ] Backup all databases
- [ ] Update system packages
- [ ] Update Kubernetes components
- [ ] Update application dependencies
- [ ] Run security patches
- [ ] Optimize databases
- [ ] Verify backups
- [ ] Test disaster recovery
- [ ] Update documentation

---

## Emergency Contacts

### On-Call Rotation

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| **Primary On-Call** | Check PagerDuty | Via PagerDuty | oncall@citadelbuy.com | 24/7 |
| **Platform Lead** | [Name] | +1-XXX-XXX-XXXX | platform-lead@citadelbuy.com | Business hours |
| **Engineering Manager** | [Name] | +1-XXX-XXX-XXXX | eng-manager@citadelbuy.com | On-call |
| **CTO** | [Name] | +1-XXX-XXX-XXXX | cto@citadelbuy.com | Escalation only |
| **DevOps Team** | N/A | N/A | devops@citadelbuy.com | 24/7 |
| **Security Team** | N/A | N/A | security@citadelbuy.com | 24/7 |

### External Service Support

| Service | Support URL | Priority Support Phone |
|---------|-------------|------------------------|
| **Azure** | https://portal.azure.com/#blade/Microsoft_Azure_Support | +1-800-642-7676 |
| **Stripe** | https://support.stripe.com | Via dashboard |
| **SendGrid** | https://support.sendgrid.com | Via dashboard |
| **AWS** | https://console.aws.amazon.com/support | Via business plan |

### Communication Channels

- **#incidents** - Slack channel for active incidents
- **#deployments** - Slack channel for deployment notifications
- **#alerts** - Slack channel for automated alerts
- **status.citadelbuy.com** - Public status page

---

## Appendix

### Useful Commands

```bash
# Quick health check
kubectl get pods -n citadelbuy-prod && curl -f https://api.citadelbuy.com/api/health

# View logs
kubectl logs -n citadelbuy-prod -l app=citadelbuy-api --tail=100 --timestamps

# Restart deployment
kubectl rollout restart deployment/citadelbuy-api -n citadelbuy-prod

# Scale deployment
kubectl scale deployment/citadelbuy-api -n citadelbuy-prod --replicas=5

# Port forward for debugging
kubectl port-forward -n citadelbuy-prod deployment/citadelbuy-api 4000:4000

# Execute command in pod
kubectl exec -it deployment/citadelbuy-api -n citadelbuy-prod -- /bin/sh
```

### Related Documentation

- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)
- [Monitoring and Alerting](./MONITORING_AND_ALERTING.md)
- [Scaling Guide](./SCALING_GUIDE.md)
- [Incident Response](./INCIDENT_RESPONSE.md)
- [Security Setup](./SECURITY_SETUP.md)

---

**Document Version History:**

- v1.0.0 (December 4, 2025): Initial production deployment guide
