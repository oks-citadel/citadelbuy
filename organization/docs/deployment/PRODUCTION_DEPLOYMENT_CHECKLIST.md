# Broxiva Production Deployment Checklist

## Document Information

**Version:** 1.0.0
**Last Updated:** 2025-12-17
**Environment:** Production (Azure AKS)
**Platform:** Broxiva E-Commerce Platform

---

## Overview

This checklist provides a comprehensive step-by-step guide for deploying the Broxiva e-commerce platform to production on Azure Kubernetes Service (AKS). The platform consists of:

- **Frontend:** Next.js web application
- **Backend:** NestJS API
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Container Registry:** Azure Container Registry (broxivaprodacr)
- **Orchestration:** Azure Kubernetes Service (broxiva-prod-aks)
- **Namespace:** broxiva-production

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Monitoring and Alerts](#monitoring-and-alerts)
6. [Troubleshooting](#troubleshooting)

---

# Pre-Deployment Checklist

## 1. Environment Variables Verification

### 1.1 Azure Key Vault Configuration

- [ ] **Azure Key Vault exists:** `broxiva-kv`
- [ ] **Resource Group:** `broxiva-prod-rg`
- [ ] **Verify Key Vault accessible:**
  ```bash
  az keyvault show --name broxiva-kv --resource-group broxiva-prod-rg
  ```

### 1.2 Required Secrets in Azure Key Vault

#### Authentication Secrets (Critical - Rotate every 90 days)
- [ ] `jwt-access-secret` - JWT access token secret
- [ ] `jwt-refresh-secret` - JWT refresh token secret
- [ ] `session-secret` - Session encryption secret
- [ ] `encryption-key` - General encryption key
- [ ] `kyc-encryption-key` - KYC data encryption key

#### Database Secrets (Critical - Rotate every 90 days)
- [ ] `postgres-password` - PostgreSQL password
- [ ] `postgres-url` - PostgreSQL connection URL

#### Cache Secrets (Medium - Rotate every 90 days)
- [ ] `redis-password` - Redis authentication password
- [ ] `redis-url` - Redis connection URL

#### Payment Provider Secrets (Critical - Rotate as needed)
- [ ] `stripe-secret-key` - Stripe secret API key
- [ ] `stripe-webhook-secret` - Stripe webhook signing secret
- [ ] `paypal-client-id` - PayPal client ID (optional)
- [ ] `paypal-client-secret` - PayPal client secret (optional)

#### Email Service Secrets (High - Rotate as needed)
- [ ] `sendgrid-api-key` - SendGrid API key

#### AI Service Secrets (Low - Rotate as needed)
- [ ] `openai-api-key` - OpenAI API key

#### Internal Secrets (Critical - Rotate every 90 days)
- [ ] `internal-api-key` - Internal service API key
- [ ] `webhook-secret` - Webhook validation secret (optional)

#### OAuth Secrets (Medium - Rotate as needed)
- [ ] `google-oauth-client-id` - Google OAuth client ID (optional)
- [ ] `google-oauth-client-secret` - Google OAuth client secret (optional)
- [ ] `facebook-app-id` - Facebook app ID (optional)
- [ ] `facebook-app-secret` - Facebook app secret (optional)

#### Monitoring Secrets (Low - Rotate as needed)
- [ ] `sentry-dsn` - Sentry DSN for error tracking (optional)
- [ ] `datadog-api-key` - Datadog API key (optional)

### 1.3 Verify External Secrets Operator

- [ ] **External Secrets Operator installed:**
  ```bash
  kubectl get pods -n external-secrets-system
  ```
- [ ] **SecretStore configured:**
  ```bash
  kubectl get secretstore azure-keyvault-broxiva -n broxiva-production
  ```
- [ ] **ExternalSecrets syncing:**
  ```bash
  kubectl get externalsecrets -n broxiva-production
  kubectl describe externalsecret broxiva-all-secrets -n broxiva-production
  ```
- [ ] **Kubernetes secrets created:**
  ```bash
  kubectl get secret broxiva-secrets -n broxiva-production
  ```

### 1.4 ConfigMap Verification

- [ ] **ConfigMap exists:**
  ```bash
  kubectl get configmap broxiva-config -n broxiva-production
  ```
- [ ] **Verify key configuration values:**
  - `PORT` - API port (4000)
  - `REDIS_HOST` - Redis service name
  - `REDIS_PORT` - Redis port (6379)
  - `JWT_EXPIRATION` - Token expiration time
  - `CORS_ORIGIN` - Allowed CORS origins
  - `NEXT_PUBLIC_API_URL` - Public API URL
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
  - `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` - GA tracking ID

---

## 2. Database Migration Status

### 2.1 Pre-Migration Checks

- [ ] **PostgreSQL is accessible:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- psql -U broxiva -d broxiva -c "SELECT version();"
  ```
- [ ] **Current database version recorded:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- psql -U broxiva -d broxiva -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"
  ```
- [ ] **Database disk space checked:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- df -h /var/lib/postgresql/data
  ```

### 2.2 Backup Before Migration

- [ ] **Create database backup:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- pg_dump -U broxiva broxiva > backup-$(date +%Y%m%d-%H%M%S).sql
  ```
- [ ] **Verify backup file created and size is reasonable**
- [ ] **Upload backup to Azure Blob Storage:**
  ```bash
  az storage blob upload \
    --account-name broxivastorage \
    --container-name database-backups \
    --name backup-$(date +%Y%m%d-%H%M%S).sql \
    --file backup-$(date +%Y%m%d-%H%M%S).sql
  ```

### 2.3 Migration Execution

- [ ] **Review pending migrations:**
  ```bash
  # In API pod
  kubectl exec -it deployment/broxiva-api -n broxiva-production -- npm run migration:show
  ```
- [ ] **Test migrations in staging first**
- [ ] **Run migrations:**
  ```bash
  kubectl exec -it deployment/broxiva-api -n broxiva-production -- npm run migration:run
  ```
- [ ] **Verify migration success:**
  ```bash
  kubectl logs deployment/broxiva-api -n broxiva-production | grep -i migration
  ```

---

## 3. Secret Rotation Status

### 3.1 Review Secret Age

- [ ] **Check secret last rotation dates in Key Vault:**
  ```bash
  az keyvault secret list --vault-name broxiva-kv --query "[].{name:name, updated:attributes.updated}" -o table
  ```
- [ ] **Identify secrets older than 90 days**

### 3.2 Critical Secrets to Rotate (if > 90 days old)

- [ ] JWT secrets (jwt-access-secret, jwt-refresh-secret)
- [ ] Session secret
- [ ] Encryption keys
- [ ] Database password
- [ ] Redis password
- [ ] Internal API key

### 3.3 Secret Rotation Procedure

For each secret to rotate:

1. [ ] **Generate new secret value:**
   ```bash
   openssl rand -base64 32
   ```
2. [ ] **Update in Azure Key Vault:**
   ```bash
   az keyvault secret set --vault-name broxiva-kv --name <secret-name> --value <new-value>
   ```
3. [ ] **Wait for External Secrets sync (up to 1 hour)**
4. [ ] **Force sync if needed:**
   ```bash
   kubectl annotate externalsecret broxiva-all-secrets -n broxiva-production \
     force-sync="$(date +%s)" --overwrite
   ```
5. [ ] **Restart affected pods:**
   ```bash
   kubectl rollout restart deployment/broxiva-api -n broxiva-production
   kubectl rollout restart deployment/broxiva-web -n broxiva-production
   ```

---

## 4. Backup Verification

### 4.1 Database Backup

- [ ] **Latest automated backup exists:**
  ```bash
  az storage blob list \
    --account-name broxivastorage \
    --container-name database-backups \
    --query "[].{name:name, lastModified:properties.lastModified}" \
    -o table | head -10
  ```
- [ ] **Backup is recent (< 24 hours old)**
- [ ] **Backup size is reasonable (> 1MB)**

### 4.2 Redis Backup

- [ ] **Redis RDB snapshot exists:**
  ```bash
  kubectl exec -it redis-0 -n broxiva-production -- ls -lh /data/dump.rdb
  ```
- [ ] **AOF file is present:**
  ```bash
  kubectl exec -it redis-0 -n broxiva-production -- ls -lh /data/appendonly.aof
  ```

### 4.3 Persistent Volume Snapshots

- [ ] **PVC snapshots exist:**
  ```bash
  kubectl get volumesnapshot -n broxiva-production
  ```
- [ ] **Snapshots are recent (< 7 days old)**

### 4.4 Container Image Backup

- [ ] **Current production images exist in ACR:**
  ```bash
  az acr repository show-tags \
    --name broxivaprodacr \
    --repository broxiva-api \
    --orderby time_desc \
    --output table | head -10
  ```
- [ ] **At least 3 previous versions available for rollback**

---

# Deployment Steps

## 1. Docker Image Build and Push

### 1.1 Pre-Build Verification

- [ ] **Clean working directory:**
  ```bash
  git status
  ```
- [ ] **On correct branch (main):**
  ```bash
  git branch --show-current
  ```
- [ ] **All tests passing locally:**
  ```bash
  cd organization && pnpm test
  ```
- [ ] **Docker daemon running:**
  ```bash
  docker info
  ```

### 1.2 Azure Container Registry Login

- [ ] **Login to Azure:**
  ```bash
  az login
  ```
- [ ] **Set correct subscription:**
  ```bash
  az account set --subscription <subscription-id>
  ```
- [ ] **Login to ACR:**
  ```bash
  az acr login --name broxivaprodacr
  ```

### 1.3 Build Docker Images

**Option A: Using CI/CD Pipeline (Recommended)**

- [ ] **Push to main branch:**
  ```bash
  git push origin main
  ```
- [ ] **Monitor GitHub Actions:**
  - Go to: https://github.com/<org>/broxiva/actions
  - Watch "Broxiva Production Pipeline"
- [ ] **Verify pipeline stages:**
  - [ ] Setup - Complete
  - [ ] Lint - Passed
  - [ ] Type Check - Passed
  - [ ] Unit Tests - Passed
  - [ ] Build - Successful
  - [ ] Docker Build - Images pushed
  - [ ] Deploy Production - Deployed
  - [ ] Smoke Tests - Passed

**Option B: Manual Build**

- [ ] **Build API image:**
  ```bash
  cd organization
  docker build -f apps/api/Dockerfile \
    -t broxivaprodacr.azurecr.io/broxiva-api:$(git rev-parse --short HEAD) \
    -t broxivaprodacr.azurecr.io/broxiva-api:production-latest \
    .
  ```
- [ ] **Build Web image:**
  ```bash
  docker build -f apps/web/Dockerfile \
    -t broxivaprodacr.azurecr.io/broxiva-web:$(git rev-parse --short HEAD) \
    -t broxivaprodacr.azurecr.io/broxiva-web:production-latest \
    .
  ```
- [ ] **Verify images built:**
  ```bash
  docker images | grep broxivaprodacr
  ```

### 1.4 Push Images to ACR

- [ ] **Push API image:**
  ```bash
  docker push broxivaprodacr.azurecr.io/broxiva-api:$(git rev-parse --short HEAD)
  docker push broxivaprodacr.azurecr.io/broxiva-api:production-latest
  ```
- [ ] **Push Web image:**
  ```bash
  docker push broxivaprodacr.azurecr.io/broxiva-web:$(git rev-parse --short HEAD)
  docker push broxivaprodacr.azurecr.io/broxiva-web:production-latest
  ```
- [ ] **Verify images in ACR:**
  ```bash
  az acr repository show-tags --name broxivaprodacr --repository broxiva-api --output table
  az acr repository show-tags --name broxivaprodacr --repository broxiva-web --output table
  ```

---

## 2. Kubernetes Deployment

### 2.1 Pre-Deployment Checks

- [ ] **Connect to AKS cluster:**
  ```bash
  az aks get-credentials \
    --resource-group broxiva-prod-rg \
    --name broxiva-prod-aks \
    --overwrite-existing
  ```
- [ ] **Verify connection:**
  ```bash
  kubectl cluster-info
  kubectl get nodes
  ```
- [ ] **Check namespace exists:**
  ```bash
  kubectl get namespace broxiva-production
  ```
- [ ] **Review current deployment status:**
  ```bash
  kubectl get deployments -n broxiva-production
  kubectl get pods -n broxiva-production
  ```

### 2.2 Database and Cache Status

- [ ] **PostgreSQL is healthy:**
  ```bash
  kubectl get statefulset postgres -n broxiva-production
  kubectl exec -it postgres-0 -n broxiva-production -- pg_isready -U broxiva
  ```
- [ ] **Redis is healthy:**
  ```bash
  kubectl get statefulset redis -n broxiva-production
  kubectl exec -it redis-0 -n broxiva-production -- redis-cli ping
  ```

### 2.3 Apply Kubernetes Configurations

**Option A: Using kubectl set image (Rolling Update)**

- [ ] **Update API deployment:**
  ```bash
  kubectl set image deployment/broxiva-api \
    api=broxivaprodacr.azurecr.io/broxiva-api:$(git rev-parse --short HEAD) \
    -n broxiva-production
  ```
- [ ] **Update Web deployment:**
  ```bash
  kubectl set image deployment/broxiva-web \
    web=broxivaprodacr.azurecr.io/broxiva-web:$(git rev-parse --short HEAD) \
    -n broxiva-production
  ```

**Option B: Using kubectl apply (Full Configuration)**

- [ ] **Apply production configurations:**
  ```bash
  kubectl apply -k organization/infrastructure/kubernetes/production/
  ```

### 2.4 Monitor Rollout

- [ ] **Watch API rollout:**
  ```bash
  kubectl rollout status deployment/broxiva-api -n broxiva-production --timeout=600s
  ```
- [ ] **Watch Web rollout:**
  ```bash
  kubectl rollout status deployment/broxiva-web -n broxiva-production --timeout=600s
  ```
- [ ] **Monitor pod status:**
  ```bash
  kubectl get pods -n broxiva-production -w
  ```
- [ ] **Check for errors:**
  ```bash
  kubectl get events -n broxiva-production --sort-by='.lastTimestamp' | tail -20
  ```

### 2.5 Verify Rollout Success

- [ ] **All API pods running:**
  ```bash
  kubectl get pods -l app=broxiva-api -n broxiva-production
  ```
  - Expected: 5/5 pods Running (minReplicas: 5, maxReplicas: 20)
- [ ] **All Web pods running:**
  ```bash
  kubectl get pods -l app=broxiva-web -n broxiva-production
  ```
  - Expected: 5/5 pods Running (minReplicas: 5, maxReplicas: 15)
- [ ] **No pods in CrashLoopBackOff or Error state**
- [ ] **Pod restart count is 0 or minimal**

---

## 3. Health Check Verification

### 3.1 Pod-Level Health Checks

- [ ] **API liveness probes passing:**
  ```bash
  kubectl get pods -l app=broxiva-api -n broxiva-production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}'
  ```
- [ ] **API readiness probes passing**
- [ ] **Web liveness probes passing:**
  ```bash
  kubectl get pods -l app=broxiva-web -n broxiva-production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}'
  ```
- [ ] **Web readiness probes passing**

### 3.2 Service-Level Health Checks

- [ ] **API service endpoints:**
  ```bash
  kubectl get endpoints broxiva-api -n broxiva-production
  ```
- [ ] **Web service endpoints:**
  ```bash
  kubectl get endpoints broxiva-web -n broxiva-production
  ```
- [ ] **Test API health endpoint (internal):**
  ```bash
  kubectl run curl-test --rm -it --image=curlimages/curl --restart=Never -n broxiva-production -- \
    curl -f http://broxiva-api:4000/api/health/live
  ```
- [ ] **Test Web health endpoint (internal):**
  ```bash
  kubectl run curl-test --rm -it --image=curlimages/curl --restart=Never -n broxiva-production -- \
    curl -f http://broxiva-web:3000/api/health
  ```

---

## 4. DNS/SSL Verification

### 4.1 Ingress Configuration

- [ ] **Ingress resources exist:**
  ```bash
  kubectl get ingress -n broxiva-production
  ```
- [ ] **Verify ingress IPs assigned:**
  ```bash
  kubectl get ingress broxiva-api-ingress -n broxiva-production -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
  kubectl get ingress broxiva-web-ingress -n broxiva-production -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
  ```

### 4.2 DNS Configuration

- [ ] **API DNS record points to ingress IP:**
  ```bash
  nslookup api.broxiva.com
  ```
  - Expected: Should resolve to ingress IP
- [ ] **Web DNS record points to ingress IP:**
  ```bash
  nslookup broxiva.com
  nslookup www.broxiva.com
  ```
  - Expected: Should resolve to ingress IP
- [ ] **DNS propagation complete:**
  ```bash
  dig api.broxiva.com +short
  dig broxiva.com +short
  ```

### 4.3 SSL/TLS Certificates

- [ ] **Certificate secrets exist:**
  ```bash
  kubectl get secret broxiva-api-tls-production -n broxiva-production
  kubectl get secret broxiva-web-tls-production -n broxiva-production
  ```
- [ ] **Certificates are valid:**
  ```bash
  kubectl get certificate -n broxiva-production
  ```
  - Expected: Ready=True for all certificates
- [ ] **cert-manager issuer is ready:**
  ```bash
  kubectl get clusterissuer letsencrypt-production
  ```

### 4.4 External SSL Verification

- [ ] **API SSL certificate valid:**
  ```bash
  curl -vI https://api.broxiva.com 2>&1 | grep -E "SSL certificate verify|subject:|issuer:"
  ```
  - Expected: SSL certificate verify ok, Let's Encrypt issuer
- [ ] **Web SSL certificate valid:**
  ```bash
  curl -vI https://broxiva.com 2>&1 | grep -E "SSL certificate verify|subject:|issuer:"
  ```
- [ ] **Certificate expiry > 30 days:**
  ```bash
  echo | openssl s_client -servername api.broxiva.com -connect api.broxiva.com:443 2>/dev/null | openssl x509 -noout -dates
  echo | openssl s_client -servername broxiva.com -connect broxiva.com:443 2>/dev/null | openssl x509 -noout -dates
  ```

---

# Post-Deployment Verification

## 1. API Health Endpoints

### 1.1 Basic Health Checks

- [ ] **API health endpoint (external):**
  ```bash
  curl -f https://api.broxiva.com/api/health/live
  ```
  - Expected: HTTP 200, { "status": "ok" }
- [ ] **API readiness endpoint:**
  ```bash
  curl -f https://api.broxiva.com/api/health/ready
  ```
  - Expected: HTTP 200, database and cache connected

### 1.2 Functional API Tests

- [ ] **API version endpoint:**
  ```bash
  curl https://api.broxiva.com/api/version
  ```
  - Expected: Returns version info with correct commit SHA
- [ ] **API documentation accessible:**
  ```bash
  curl -I https://api.broxiva.com/api/docs
  ```
  - Expected: HTTP 200 (if enabled) or 404 (if disabled in production)

---

## 2. Web Application Accessibility

### 2.1 Frontend Health Checks

- [ ] **Homepage loads:**
  ```bash
  curl -f https://broxiva.com
  ```
  - Expected: HTTP 200, HTML content
- [ ] **WWW redirect works:**
  ```bash
  curl -I https://www.broxiva.com
  ```
  - Expected: HTTP 301/308 redirect to https://broxiva.com
- [ ] **Health endpoint:**
  ```bash
  curl -f https://broxiva.com/api/health
  ```
  - Expected: HTTP 200

### 2.2 Static Assets

- [ ] **JavaScript bundles load:**
  ```bash
  curl -I https://broxiva.com/_next/static/chunks/main.js
  ```
  - Expected: HTTP 200, cache headers present
- [ ] **CSS stylesheets load:**
  ```bash
  curl -I https://broxiva.com/_next/static/css/
  ```
  - Expected: HTTP 200
- [ ] **Images load:**
  ```bash
  curl -I https://broxiva.com/images/logo.png
  ```
  - Expected: HTTP 200

### 2.3 Browser Testing

- [ ] **Open https://broxiva.com in browser**
- [ ] **No console errors**
- [ ] **No 404 errors in Network tab**
- [ ] **SSL certificate shows as valid (green lock icon)**
- [ ] **Footer displays correct build information:**
  - Version number
  - Git commit SHA
  - Environment: production

---

## 3. Database Connectivity

### 3.1 Connection Tests

- [ ] **API can connect to database:**
  ```bash
  kubectl logs deployment/broxiva-api -n broxiva-production | grep -i "database.*connect"
  ```
  - Expected: No connection errors
- [ ] **Test query from API pod:**
  ```bash
  kubectl exec -it deployment/broxiva-api -n broxiva-production -- \
    node -e "console.log('DB test')" # Replace with actual DB query
  ```

### 3.2 Database Metrics

- [ ] **Database connections are within limits:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- \
    psql -U broxiva -d broxiva -c "SELECT count(*) FROM pg_stat_activity;"
  ```
  - Expected: < 200 connections (max_connections: 200)
- [ ] **No long-running queries:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- \
    psql -U broxiva -d broxiva -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 5;"
  ```
- [ ] **Database size is reasonable:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- \
    psql -U broxiva -d broxiva -c "SELECT pg_size_pretty(pg_database_size('broxiva'));"
  ```

---

## 4. Cache Connectivity

### 4.1 Redis Connection Tests

- [ ] **API can connect to Redis:**
  ```bash
  kubectl logs deployment/broxiva-api -n broxiva-production | grep -i "redis.*connect"
  ```
  - Expected: No connection errors
- [ ] **Test Redis from API pod:**
  ```bash
  kubectl exec -it deployment/broxiva-api -n broxiva-production -- \
    node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(console.log);"
  ```
  - Expected: "PONG"

### 4.2 Redis Metrics

- [ ] **Redis memory usage:**
  ```bash
  kubectl exec -it redis-0 -n broxiva-production -- \
    redis-cli info memory | grep used_memory_human
  ```
  - Expected: < 1GB (maxmemory: 1gb)
- [ ] **Connected clients:**
  ```bash
  kubectl exec -it redis-0 -n broxiva-production -- \
    redis-cli info clients | grep connected_clients
  ```
  - Expected: Reasonable number based on API pods
- [ ] **Cache hit rate:**
  ```bash
  kubectl exec -it redis-0 -n broxiva-production -- \
    redis-cli info stats | grep keyspace
  ```

---

## 5. Monitoring Alerts Setup

### 5.1 Prometheus Metrics

- [ ] **ServiceMonitors exist:**
  ```bash
  kubectl get servicemonitor -n broxiva-production
  ```
- [ ] **Prometheus scraping targets:**
  - Check Prometheus UI: Targets should show broxiva-api and broxiva-web as UP
- [ ] **Custom metrics available:**
  ```bash
  # Check if custom business metrics are being collected
  # http://prometheus.broxiva.com/graph?g0.expr=broxiva_api_requests_total
  ```

### 5.2 Alert Rules

- [ ] **PrometheusRules configured:**
  ```bash
  kubectl get prometheusrule -n broxiva-production
  ```
- [ ] **Critical alerts:**
  - [ ] API pod down
  - [ ] Web pod down
  - [ ] Database connection failures
  - [ ] Redis connection failures
  - [ ] High error rate (>5%)
  - [ ] High response time (>1s p95)
  - [ ] External secrets sync failed
  - [ ] Certificate expiring (<30 days)

### 5.3 Alertmanager Configuration

- [ ] **Alertmanager is running:**
  ```bash
  kubectl get pods -l app=alertmanager -n monitoring
  ```
- [ ] **Notification channels configured:**
  - [ ] Email alerts
  - [ ] Slack alerts
  - [ ] PagerDuty (for critical alerts)

### 5.4 Grafana Dashboards

- [ ] **Grafana accessible**
- [ ] **Broxiva dashboards imported:**
  - [ ] API Performance Dashboard
  - [ ] Web Performance Dashboard
  - [ ] Database Metrics Dashboard
  - [ ] Redis Metrics Dashboard
  - [ ] Business Metrics Dashboard
- [ ] **Dashboards displaying data correctly**

### 5.5 Azure Monitor Integration

- [ ] **AKS cluster sending logs to Azure Monitor:**
  ```bash
  az aks show --resource-group broxiva-prod-rg --name broxiva-prod-aks --query "addonProfiles.omsagent.enabled"
  ```
  - Expected: true
- [ ] **Container Insights enabled**
- [ ] **Application Insights connected**

### 5.6 Sentry Error Tracking

- [ ] **Sentry DSN configured in secrets**
- [ ] **Test error sent to Sentry:**
  - Trigger a test error and verify it appears in Sentry dashboard
- [ ] **Error alerts configured**

---

# Rollback Procedures

## 1. AKS Deployment Rollback

### 1.1 Quick Rollback (Previous Version)

**When to use:** Immediately after deployment if critical issues detected

- [ ] **Rollback API deployment:**
  ```bash
  kubectl rollout undo deployment/broxiva-api -n broxiva-production
  ```
- [ ] **Rollback Web deployment:**
  ```bash
  kubectl rollout undo deployment/broxiva-web -n broxiva-production
  ```
- [ ] **Monitor rollback:**
  ```bash
  kubectl rollout status deployment/broxiva-api -n broxiva-production
  kubectl rollout status deployment/broxiva-web -n broxiva-production
  ```
- [ ] **Verify pods are healthy:**
  ```bash
  kubectl get pods -n broxiva-production
  ```

### 1.2 Rollback to Specific Version

**When to use:** Need to rollback to a specific known-good version

- [ ] **Check deployment history:**
  ```bash
  kubectl rollout history deployment/broxiva-api -n broxiva-production
  kubectl rollout history deployment/broxiva-web -n broxiva-production
  ```
- [ ] **Identify target revision number**
- [ ] **Rollback to specific revision:**
  ```bash
  kubectl rollout undo deployment/broxiva-api -n broxiva-production --to-revision=<revision-number>
  kubectl rollout undo deployment/broxiva-web -n broxiva-production --to-revision=<revision-number>
  ```

### 1.3 Rollback Using Image Tags

**When to use:** Known good commit SHA or image tag

- [ ] **Identify previous working image tag:**
  ```bash
  az acr repository show-tags --name broxivaprodacr --repository broxiva-api --orderby time_desc -o table
  ```
- [ ] **Update deployment with previous image:**
  ```bash
  kubectl set image deployment/broxiva-api \
    api=broxivaprodacr.azurecr.io/broxiva-api:<previous-tag> \
    -n broxiva-production

  kubectl set image deployment/broxiva-web \
    web=broxivaprodacr.azurecr.io/broxiva-web:<previous-tag> \
    -n broxiva-production
  ```
- [ ] **Monitor rollout:**
  ```bash
  kubectl rollout status deployment/broxiva-api -n broxiva-production
  kubectl rollout status deployment/broxiva-web -n broxiva-production
  ```

### 1.4 Emergency Rollback (Scale Down New, Scale Up Old)

**When to use:** Rollback is failing, need immediate recovery

- [ ] **Check current replica sets:**
  ```bash
  kubectl get rs -n broxiva-production | grep broxiva-api
  ```
- [ ] **Scale down new replica set:**
  ```bash
  kubectl scale rs <new-replicaset-name> --replicas=0 -n broxiva-production
  ```
- [ ] **Scale up old replica set:**
  ```bash
  kubectl scale rs <old-replicaset-name> --replicas=5 -n broxiva-production
  ```

### 1.5 Post-Rollback Verification

- [ ] **All pods running with old version**
- [ ] **Health checks passing**
- [ ] **API responding correctly**
- [ ] **Web application accessible**
- [ ] **No errors in logs**
- [ ] **Create incident report documenting:**
  - Issue that triggered rollback
  - Time of rollback
  - Version rolled back from/to
  - Root cause analysis
  - Prevention measures

---

## 2. Database Rollback Considerations

### 2.1 Migration Rollback Strategy

**IMPORTANT:** Database rollbacks are complex and risky. Plan carefully.

#### For Additive Changes (Safe)
- New columns, tables, indexes
- Generally safe to keep even after application rollback

#### For Breaking Changes (Dangerous)
- Removed columns, tables
- Changed column types
- May cause application errors if rolled back

### 2.2 Database Rollback Procedure

**Option A: Rollback Migrations (if supported)**

- [ ] **Connect to database:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- psql -U broxiva broxiva
  ```
- [ ] **Check migration status:**
  ```bash
  SELECT * FROM migrations ORDER BY id DESC;
  ```
- [ ] **Run migration rollback (if tool supports it):**
  ```bash
  kubectl exec -it deployment/broxiva-api -n broxiva-production -- npm run migration:revert
  ```
- [ ] **Verify rollback:**
  ```bash
  kubectl logs deployment/broxiva-api -n broxiva-production | grep -i migration
  ```

**Option B: Restore from Backup (nuclear option)**

- [ ] **Put application in maintenance mode:**
  ```bash
  kubectl scale deployment/broxiva-api --replicas=0 -n broxiva-production
  kubectl scale deployment/broxiva-web --replicas=0 -n broxiva-production
  ```
- [ ] **Download backup:**
  ```bash
  az storage blob download \
    --account-name broxivastorage \
    --container-name database-backups \
    --name backup-<timestamp>.sql \
    --file restore.sql
  ```
- [ ] **Restore database:**
  ```bash
  kubectl exec -i postgres-0 -n broxiva-production -- \
    psql -U broxiva broxiva < restore.sql
  ```
- [ ] **Verify restore:**
  ```bash
  kubectl exec -it postgres-0 -n broxiva-production -- \
    psql -U broxiva -d broxiva -c "SELECT COUNT(*) FROM users;"
  ```
- [ ] **Scale applications back up:**
  ```bash
  kubectl scale deployment/broxiva-api --replicas=5 -n broxiva-production
  kubectl scale deployment/broxiva-web --replicas=5 -n broxiva-production
  ```

### 2.3 Data Loss Considerations

- [ ] **Document any data loss window (time between backup and rollback)**
- [ ] **Communicate impact to stakeholders**
- [ ] **Review transaction logs for critical data to manually restore**

---

## 3. DNS Failover

### 3.1 DNS Rollback to Previous Environment

**When to use:** Production completely broken, need to route traffic elsewhere

- [ ] **Identify backup environment (staging with production-like data)**
- [ ] **Update DNS A records:**
  ```bash
  # In your DNS provider (Azure DNS, Cloudflare, etc.)
  # Change A record for api.broxiva.com to staging IP
  # Change A record for broxiva.com to staging IP
  ```
- [ ] **Or use Azure DNS CLI:**
  ```bash
  az network dns record-set a update \
    --resource-group broxiva-dns-rg \
    --zone-name broxiva.com \
    --name api \
    --set aRecords[0].ipv4Address=<staging-ip>
  ```
- [ ] **Verify DNS propagation:**
  ```bash
  dig api.broxiva.com +short
  ```
  - Note: DNS TTL affects propagation time (typically 5-60 minutes)

### 3.2 Traffic Shifting with Ingress

**When to use:** Want to gradually shift traffic back

- [ ] **Use weighted ingress rules or traffic splitting:**
  - Update ingress annotations for traffic splitting
  - Gradually shift from 100% old version to 0%
  - Monitor error rates at each step

### 3.3 Maintenance Page

**When to use:** Need to take site offline for emergency fixes

- [ ] **Deploy maintenance page:**
  ```bash
  kubectl apply -f organization/infrastructure/kubernetes/production/maintenance-mode.yaml
  ```
- [ ] **Update ingress to route to maintenance page**
- [ ] **Verify maintenance page is displayed**

---

# Monitoring and Alerts

## Key Metrics to Monitor Post-Deployment

### Application Metrics
- [ ] **API Response Time:** p50, p95, p99 < 200ms, 500ms, 1s
- [ ] **API Error Rate:** < 1%
- [ ] **API Request Rate:** Stable, no unexpected spikes/drops
- [ ] **Web Page Load Time:** < 3s
- [ ] **Web Core Web Vitals:** LCP, FID, CLS within good range

### Infrastructure Metrics
- [ ] **CPU Usage:** < 70% average
- [ ] **Memory Usage:** < 80% average
- [ ] **Disk Usage:** < 80%
- [ ] **Network I/O:** Stable

### Database Metrics
- [ ] **Connection Pool:** < 80% utilized
- [ ] **Query Performance:** No slow queries (> 1s)
- [ ] **Database CPU:** < 70%
- [ ] **Database Memory:** < 80%

### Cache Metrics
- [ ] **Cache Hit Rate:** > 80%
- [ ] **Cache Memory:** < 90%
- [ ] **Cache Evictions:** Minimal

---

# Troubleshooting

## Common Issues and Solutions

### Issue: Pods Not Starting

**Symptoms:** Pods stuck in Pending, ContainerCreating, or CrashLoopBackOff

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n broxiva-production
kubectl logs <pod-name> -n broxiva-production --previous
```

**Solutions:**
- [ ] **Insufficient resources:** Check node capacity
- [ ] **Image pull errors:** Verify ACR credentials, image exists
- [ ] **Config/Secret errors:** Verify secrets and configmaps exist
- [ ] **Health check failures:** Review liveness/readiness probe configuration

### Issue: High Error Rate

**Symptoms:** 5xx errors, failing health checks

**Diagnosis:**
```bash
kubectl logs deployment/broxiva-api -n broxiva-production --tail=100
kubectl logs deployment/broxiva-web -n broxiva-production --tail=100
```

**Solutions:**
- [ ] **Database connection issues:** Check database connectivity
- [ ] **Redis connection issues:** Check cache connectivity
- [ ] **External API failures:** Check third-party service status
- [ ] **Code bugs:** Review logs for exceptions, rollback if needed

### Issue: SSL Certificate Not Valid

**Symptoms:** Browser shows SSL warning

**Diagnosis:**
```bash
kubectl get certificate -n broxiva-production
kubectl describe certificate broxiva-web-tls-production -n broxiva-production
```

**Solutions:**
- [ ] **Certificate not ready:** Wait for cert-manager to issue certificate
- [ ] **DNS validation failing:** Check DNS records are correct
- [ ] **Rate limiting:** cert-manager hit Let's Encrypt rate limits

### Issue: Database Migration Failed

**Symptoms:** Migration errors in API logs

**Diagnosis:**
```bash
kubectl logs deployment/broxiva-api -n broxiva-production | grep -i migration
kubectl exec -it postgres-0 -n broxiva-production -- psql -U broxiva -d broxiva -c "SELECT * FROM migrations;"
```

**Solutions:**
- [ ] **Rollback migration:** Run migration revert
- [ ] **Fix migration:** Correct migration file and rerun
- [ ] **Manual intervention:** Connect to database and fix manually

---

## Emergency Contacts

- **DevOps Lead:** [Name] - [Email] - [Phone]
- **Backend Lead:** [Name] - [Email] - [Phone]
- **Frontend Lead:** [Name] - [Email] - [Phone]
- **DBA:** [Name] - [Email] - [Phone]
- **Security Team:** [Email] - [Slack Channel]
- **On-Call Engineer:** [PagerDuty/Slack]

---

## Deployment Sign-Off

- [ ] **Pre-deployment checklist complete**
- [ ] **Deployment executed successfully**
- [ ] **Post-deployment verification passed**
- [ ] **Monitoring and alerts confirmed working**
- [ ] **Rollback procedures tested and documented**
- [ ] **Team notified of deployment**
- [ ] **Documentation updated**

**Deployed By:** _______________
**Date:** _______________
**Time:** _______________
**Version/Commit SHA:** _______________
**Notes:** _____________________________________________

---

**Document Version:** 1.0.0
**Last Reviewed:** 2025-12-17
**Next Review:** 2026-01-17
