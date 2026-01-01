# Broxiva Deployment Runbook

**Version:** 1.0.0
**Last Updated:** 2025-12-03
**Owner:** Platform Engineering Team

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Database Migration Procedures](#database-migration-procedures)
4. [Rollback Procedures](#rollback-procedures)
5. [Smoke Test Procedures](#smoke-test-procedures)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Blue-Green Deployment](#blue-green-deployment)
8. [Canary Deployment](#canary-deployment)
9. [Emergency Procedures](#emergency-procedures)

---

## Pre-Deployment Checklist

### 1. Code Quality & Testing

- [ ] All unit tests passing (`pnpm test` in apps/api)
- [ ] All E2E tests passing (`pnpm test:e2e` in apps/api)
- [ ] Frontend tests passing (`pnpm test` in apps/web)
- [ ] Code review completed and approved (minimum 2 reviewers)
- [ ] Security scan completed (no critical/high vulnerabilities)
- [ ] TypeScript compilation successful with no errors
- [ ] Linting checks passed (`pnpm lint`)

### 2. Environment Configuration

- [ ] Environment variables verified in deployment environment
- [ ] Secrets rotated if required (database passwords, API keys)
- [ ] ConfigMaps and Secrets updated in Kubernetes cluster
- [ ] SSL/TLS certificates valid and not expiring within 30 days
- [ ] DNS records configured and propagated
- [ ] CDN cache invalidation plan prepared

### 3. Database

- [ ] Database backup completed and verified
- [ ] Migration scripts reviewed and tested in staging
- [ ] Rollback migration scripts prepared
- [ ] Database connections scaled appropriately
- [ ] Index optimization completed if needed
- [ ] Database disk space verified (>30% free space)

### 4. Infrastructure

- [ ] Resource quotas checked (CPU, memory, storage)
- [ ] Auto-scaling policies configured correctly
- [ ] Load balancer health checks configured
- [ ] Monitoring alerts configured and tested
- [ ] Log aggregation verified
- [ ] Redis cache warmed up (if applicable)
- [ ] Elasticsearch indices optimized

### 5. Third-Party Services

- [ ] Payment gateway (Stripe) in production mode and tested
- [ ] Email service (SendGrid) quota verified
- [ ] SMS service quota verified
- [ ] Storage service (S3/MinIO) accessible
- [ ] External APIs tested and rate limits verified
- [ ] OAuth providers configured correctly

### 6. Communication & Documentation

- [ ] Deployment scheduled and communicated to stakeholders
- [ ] Deployment notification sent to team channels
- [ ] On-call engineer identified and available
- [ ] Rollback plan documented and reviewed
- [ ] Customer notification prepared (if user-facing changes)
- [ ] Change ticket created and approved

### 7. Monitoring & Observability

- [ ] Grafana dashboards reviewed
- [ ] Prometheus alerts verified
- [ ] Log levels configured appropriately
- [ ] Error tracking (Sentry) enabled
- [ ] Performance monitoring configured
- [ ] Synthetic monitoring tests updated

---

## Deployment Procedures

### Standard Deployment (Rolling Update)

**Deployment Window:** Off-peak hours (typically 2:00 AM - 5:00 AM UTC)

#### Step 1: Pre-Deployment Preparation

```bash
# 1. Verify current cluster status
kubectl get nodes
kubectl get pods -n broxiva
kubectl top nodes

# 2. Check application health
curl https://api.broxiva.com/api/health
curl https://api.broxiva.com/api/health/ready

# 3. Create deployment snapshot
kubectl get deployment broxiva-api -n broxiva -o yaml > deployment-backup-$(date +%Y%m%d-%H%M%S).yaml
kubectl get deployment broxiva-web -n broxiva -o yaml > web-deployment-backup-$(date +%Y%m%d-%H%M%S).yaml
```

#### Step 2: Database Migration (if applicable)

See [Database Migration Procedures](#database-migration-procedures)

#### Step 3: Build and Push Images

```bash
# Navigate to project root
cd /path/to/broxiva

# Build API image
cd organization/apps/api
docker build -t broxivaplatforms/broxiva-ecommerce:backend-v${VERSION} .
docker tag broxivaplatforms/broxiva-ecommerce:backend-v${VERSION} broxivaplatforms/broxiva-ecommerce:backend-latest

# Build Web image
cd ../web
docker build -t broxivaplatforms/broxiva-ecommerce:frontend-v${VERSION} .
docker tag broxivaplatforms/broxiva-ecommerce:frontend-v${VERSION} broxivaplatforms/broxiva-ecommerce:frontend-latest

# Push to registry
docker push broxivaplatforms/broxiva-ecommerce:backend-v${VERSION}
docker push broxivaplatforms/broxiva-ecommerce:backend-latest
docker push broxivaplatforms/broxiva-ecommerce:frontend-v${VERSION}
docker push broxivaplatforms/broxiva-ecommerce:frontend-latest
```

#### Step 4: Update Kubernetes Configurations

```bash
# Update ConfigMaps (if changed)
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml

# Update Secrets (if changed)
kubectl apply -f infrastructure/kubernetes/organization/secrets.yaml

# Note: Wait 10 seconds for changes to propagate
sleep 10
```

#### Step 5: Deploy Application

```bash
# Deploy API
kubectl set image deployment/broxiva-api \
  api=broxivaplatforms/broxiva-ecommerce:backend-v${VERSION} \
  -n broxiva

# Watch rollout status
kubectl rollout status deployment/broxiva-api -n broxiva

# Deploy Web frontend
kubectl set image deployment/broxiva-web \
  web=broxivaplatforms/broxiva-ecommerce:frontend-v${VERSION} \
  -n broxiva

kubectl rollout status deployment/broxiva-web -n broxiva
```

#### Step 6: Verify Deployment

```bash
# Check pod status
kubectl get pods -n broxiva -l app=broxiva-api
kubectl get pods -n broxiva -l app=broxiva-web

# Check logs for errors
kubectl logs -n broxiva -l app=broxiva-api --tail=100
kubectl logs -n broxiva -l app=broxiva-web --tail=100

# Verify health endpoints
kubectl run curl-test --image=curlimages/curl:latest --rm -it --restart=Never -- \
  curl http://broxiva-api.broxiva.svc.cluster.local/api/health

# Check HPA status
kubectl get hpa -n broxiva
```

#### Step 7: Post-Deployment Verification

See [Post-Deployment Verification](#post-deployment-verification)

---

## Database Migration Procedures

### Pre-Migration Checklist

- [ ] Database backup completed (see DATABASE_BACKUP_STRATEGY.md)
- [ ] Migration tested in staging environment
- [ ] Migration estimated execution time < 5 minutes
- [ ] Rollback migration prepared and tested
- [ ] Database connection pool settings optimized
- [ ] Long-running queries killed (if necessary)

### Migration Execution

#### Method 1: Automated Migration (Prisma)

```bash
# 1. Connect to API pod
kubectl exec -it deployment/broxiva-api -n broxiva -- /bin/sh

# 2. Run migration
cd /app
npx prisma migrate deploy

# 3. Verify migration
npx prisma migrate status

# 4. Exit pod
exit
```

#### Method 2: Manual Migration (SQL)

```bash
# 1. Create migration SQL file
cat > migration-${VERSION}.sql << EOF
-- Migration: Add new indexes for performance
BEGIN;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id_created_at
  ON "Order" (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_price
  ON "Product" (category_id, price);

COMMIT;
EOF

# 2. Apply migration
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.broxiva.svc.cluster.local -U broxiva -d broxiva_production -f /tmp/migration.sql

# 3. Verify migration
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.broxiva.svc.cluster.local -U broxiva -d broxiva_production \
  -c "\d+ Order" -c "\d+ Product"
```

### Zero-Downtime Migration Strategy

For large table modifications:

1. **Add new column** (nullable)
2. **Deploy code** that writes to both old and new columns
3. **Backfill data** in batches
4. **Deploy code** that reads from new column
5. **Remove old column** after verification

Example:

```sql
-- Step 1: Add new column
ALTER TABLE "Product" ADD COLUMN new_price_cents INTEGER;

-- Step 2: Backfill in batches
DO $$
DECLARE
  batch_size INTEGER := 1000;
  offset_val INTEGER := 0;
BEGIN
  LOOP
    UPDATE "Product"
    SET new_price_cents = (price * 100)::INTEGER
    WHERE id IN (
      SELECT id FROM "Product"
      WHERE new_price_cents IS NULL
      LIMIT batch_size
    );

    IF NOT FOUND THEN
      EXIT;
    END IF;

    offset_val := offset_val + batch_size;
    RAISE NOTICE 'Processed % rows', offset_val;

    PERFORM pg_sleep(0.1); -- Prevent lock contention
  END LOOP;
END $$;

-- Step 3: Make column NOT NULL
ALTER TABLE "Product" ALTER COLUMN new_price_cents SET NOT NULL;

-- Step 4: Drop old column (after code deployment)
-- ALTER TABLE "Product" DROP COLUMN price;
```

### Migration Rollback

```bash
# Using Prisma
kubectl exec -it deployment/broxiva-api -n broxiva -- /bin/sh
npx prisma migrate resolve --rolled-back ${MIGRATION_NAME}

# Manual rollback
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.broxiva.svc.cluster.local -U broxiva -d broxiva_production \
  -f /tmp/rollback-migration.sql
```

---

## Rollback Procedures

### When to Rollback

Immediately rollback if:
- Error rate increases by >10%
- Response time increases by >50%
- Health checks failing on >20% of pods
- Critical functionality broken
- Database corruption detected
- Security vulnerability introduced

### Quick Rollback (Kubernetes)

```bash
# 1. Rollback to previous deployment
kubectl rollout undo deployment/broxiva-api -n broxiva
kubectl rollout undo deployment/broxiva-web -n broxiva

# 2. Verify rollback status
kubectl rollout status deployment/broxiva-api -n broxiva
kubectl rollout status deployment/broxiva-web -n broxiva

# 3. Check pods are healthy
kubectl get pods -n broxiva
kubectl logs -n broxiva -l app=broxiva-api --tail=50
```

### Rollback to Specific Version

```bash
# 1. List revision history
kubectl rollout history deployment/broxiva-api -n broxiva

# 2. Rollback to specific revision
kubectl rollout undo deployment/broxiva-api -n broxiva --to-revision=5

# 3. Verify
kubectl rollout status deployment/broxiva-api -n broxiva
```

### Database Rollback

```bash
# 1. Stop application traffic to database
kubectl scale deployment/broxiva-api -n broxiva --replicas=0

# 2. Restore from backup (see DATABASE_BACKUP_STRATEGY.md)
# Point-in-time recovery example:
pg_restore -h postgres.broxiva.svc.cluster.local \
  -U broxiva -d broxiva_production \
  -c /backups/broxiva-backup-YYYYMMDD-HHMMSS.dump

# 3. Verify database integrity
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.broxiva.svc.cluster.local -U broxiva -d broxiva_production \
  -c "SELECT COUNT(*) FROM \"User\";" \
  -c "SELECT COUNT(*) FROM \"Product\";" \
  -c "SELECT COUNT(*) FROM \"Order\";"

# 4. Restart application
kubectl scale deployment/broxiva-api -n broxiva --replicas=3
```

### Post-Rollback Actions

1. **Document the incident** in INCIDENT_RESPONSE.md format
2. **Notify stakeholders** of rollback completion
3. **Investigate root cause** and create post-incident review
4. **Fix issues** before attempting redeployment
5. **Update runbook** with lessons learned

---

## Smoke Test Procedures

### Automated Smoke Tests

```bash
# Run automated test suite
cd organization/apps/web
pnpm test:e2e:smoke

# Run API integration tests
cd ../api
pnpm test:integration:smoke
```

### Manual Smoke Tests

#### 1. Health & Monitoring

```bash
# Health check endpoint
curl -f https://api.broxiva.com/api/health || echo "FAIL: Health check"
curl -f https://api.broxiva.com/api/health/ready || echo "FAIL: Readiness check"

# Detailed health
curl https://api.broxiva.com/api/health/detailed | jq '.'
```

#### 2. Authentication Flow

```bash
# Test user registration
curl -X POST https://api.broxiva.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoketest+${RANDOM}@broxiva.com",
    "password": "Test1234!",
    "name": "Smoke Test User"
  }'

# Test login
curl -X POST https://api.broxiva.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@broxiva.com",
    "password": "Test1234!"
  }'
```

#### 3. Core E-Commerce Functionality

```bash
# List products
curl https://api.broxiva.com/api/products?limit=10

# Get product details
curl https://api.broxiva.com/api/products/1

# Search products
curl https://api.broxiva.com/api/search?q=laptop

# Get categories
curl https://api.broxiva.com/api/categories
```

#### 4. Cart & Checkout (Authenticated)

```bash
# Get JWT token first
TOKEN=$(curl -X POST https://api.broxiva.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@broxiva.com","password":"Test1234!"}' \
  | jq -r '.token')

# Add item to cart
curl -X POST https://api.broxiva.com/api/cart/items \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"productId": "1", "quantity": 1}'

# View cart
curl https://api.broxiva.com/api/cart \
  -H "Authorization: Bearer ${TOKEN}"
```

#### 5. Payment Processing (Test Mode)

```bash
# Create test checkout session
curl -X POST https://api.broxiva.com/api/checkout/create-session \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "1", "quantity": 1}],
    "test": true
  }'
```

#### 6. Database Connectivity

```bash
# Check database response time
kubectl exec -it deployment/broxiva-api -n broxiva -- /bin/sh -c \
  "time npx prisma db execute --stdin <<< 'SELECT COUNT(*) FROM \"User\";'"
```

#### 7. Redis Cache

```bash
# Test Redis connectivity
kubectl run redis-test --rm -it --restart=Never \
  --image=redis:7-alpine \
  -- redis-cli -h redis.broxiva.svc.cluster.local PING
```

#### 8. Frontend Tests

- [ ] Homepage loads without errors
- [ ] Product listing page displays products
- [ ] Product detail page shows correct information
- [ ] Search functionality works
- [ ] Cart functionality works
- [ ] User can login/logout
- [ ] Responsive design works on mobile
- [ ] No console errors in browser

---

## Post-Deployment Verification

### Immediate Verification (0-15 minutes)

```bash
# 1. Check all pods are running
kubectl get pods -n broxiva

# 2. Check for pod restarts
kubectl get pods -n broxiva -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'

# 3. Monitor error logs
kubectl logs -n broxiva -l app=broxiva-api --tail=200 | grep -i error

# 4. Check metrics
curl https://api.broxiva.com/metrics | grep -E "(http_requests_total|http_request_duration)"

# 5. Verify HPA scaling
kubectl get hpa -n broxiva
```

### Short-term Verification (15-60 minutes)

1. **Monitor Error Rates**
   - Grafana Dashboard: HTTP Error Rate < 0.1%
   - No 5xx errors in last 15 minutes
   - 4xx error rate within normal range

2. **Performance Metrics**
   - P95 response time < 500ms
   - P99 response time < 1000ms
   - Database query time < 100ms average

3. **Business Metrics**
   - Order completion rate normal
   - Payment success rate > 98%
   - User registration working

4. **Infrastructure Health**
   - CPU usage < 70%
   - Memory usage < 80%
   - No disk space warnings
   - Network connectivity stable

### Long-term Verification (1-24 hours)

1. **Monitor Trends**
   - Check daily active users trend
   - Monitor conversion rate
   - Review revenue metrics
   - Check cart abandonment rate

2. **Background Jobs**
   - Email queue processing normally
   - Cart abandonment emails sending
   - Inventory sync working
   - Analytics data processing

3. **Security**
   - No suspicious authentication attempts
   - Rate limiting working correctly
   - CORS policies enforced

---

## Blue-Green Deployment

Blue-Green deployment allows zero-downtime deployments by running two identical environments.

### Architecture

```
[Load Balancer]
       |
       ├─> [Blue Environment]  ← Current production
       └─> [Green Environment] ← New version (idle)
```

### Implementation Steps

#### Step 1: Prepare Green Environment

```bash
# 1. Create green deployment
cat > green-deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broxiva-api-green
  namespace: broxiva
  labels:
    app: broxiva-api
    environment: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: broxiva-api
      environment: green
  template:
    metadata:
      labels:
        app: broxiva-api
        environment: green
    spec:
      containers:
      - name: api
        image: broxivaplatforms/broxiva-ecommerce:backend-v${NEW_VERSION}
        # ... rest of container spec
EOF

kubectl apply -f green-deployment.yaml
```

#### Step 2: Verify Green Environment

```bash
# Wait for green pods to be ready
kubectl wait --for=condition=ready pod \
  -l app=broxiva-api,environment=green \
  -n broxiva \
  --timeout=300s

# Test green environment internally
kubectl port-forward -n broxiva \
  deployment/broxiva-api-green 8080:3000 &

curl http://localhost:8080/api/health
# Run smoke tests against localhost:8080
```

#### Step 3: Switch Traffic to Green

```bash
# Update service to point to green
kubectl patch service broxiva-api -n broxiva -p \
  '{"spec":{"selector":{"environment":"green"}}}'

# Verify traffic switch
kubectl get service broxiva-api -n broxiva -o yaml
```

#### Step 4: Monitor Green Environment

```bash
# Watch metrics for 15-30 minutes
# Monitor error rates, response times, throughput

# If issues detected, rollback immediately:
kubectl patch service broxiva-api -n broxiva -p \
  '{"spec":{"selector":{"environment":"blue"}}}'
```

#### Step 5: Decommission Blue Environment

```bash
# After confirming green is stable (24-48 hours):
kubectl delete deployment broxiva-api-blue -n broxiva

# Update labels for next deployment
kubectl patch deployment broxiva-api-green -n broxiva \
  --type merge -p '{"metadata":{"labels":{"environment":"blue"}}}'
```

### Blue-Green Database Considerations

For database migrations:
1. Ensure both environments can work with same database schema
2. Use backward-compatible migrations
3. Run migration before switching traffic
4. Keep migration reversible

---

## Canary Deployment

Canary deployment gradually rolls out changes to a subset of users.

### Architecture

```
[Load Balancer]
       |
       ├─> 90% → [Stable Version]
       └─> 10% → [Canary Version]
```

### Implementation Steps

#### Step 1: Deploy Canary

```bash
# 1. Create canary deployment (10% of stable replicas)
cat > canary-deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broxiva-api-canary
  namespace: broxiva
  labels:
    app: broxiva-api
    track: canary
spec:
  replicas: 1  # 10% of 10 stable replicas
  selector:
    matchLabels:
      app: broxiva-api
      track: canary
  template:
    metadata:
      labels:
        app: broxiva-api
        track: canary
        version: v${NEW_VERSION}
    spec:
      containers:
      - name: api
        image: broxivaplatforms/broxiva-ecommerce:backend-v${NEW_VERSION}
        # ... rest of container spec
EOF

kubectl apply -f canary-deployment.yaml
```

#### Step 2: Configure Traffic Split

```bash
# Service already selects all pods with app=broxiva-api
# Traffic is automatically split based on pod count

# Verify split
kubectl get pods -n broxiva -l app=broxiva-api \
  -o custom-columns=NAME:.metadata.name,TRACK:.metadata.labels.track
```

#### Step 3: Monitor Canary Metrics

```bash
# Monitor canary-specific metrics
kubectl logs -n broxiva -l track=canary --tail=100 -f

# Compare error rates
# Stable error rate:
kubectl logs -n broxiva -l track=stable | grep -c ERROR

# Canary error rate:
kubectl logs -n broxiva -l track=canary | grep -c ERROR
```

Use Grafana to create comparison dashboard:
- Response time: Canary vs Stable
- Error rate: Canary vs Stable
- Request count: Canary vs Stable

#### Step 4: Gradual Rollout

```bash
# If canary healthy after 1 hour, increase to 25%
kubectl scale deployment broxiva-api-canary -n broxiva --replicas=3

# If still healthy after 2 hours, increase to 50%
kubectl scale deployment broxiva-api-canary -n broxiva --replicas=5

# If still healthy after 4 hours, complete rollout
kubectl set image deployment/broxiva-api-stable \
  api=broxivaplatforms/broxiva-ecommerce:backend-v${NEW_VERSION} \
  -n broxiva

# Delete canary
kubectl delete deployment broxiva-api-canary -n broxiva
```

#### Step 5: Automated Canary Analysis

```bash
# Example Prometheus query for automated decision
# Error rate difference between canary and stable
abs(
  rate(http_requests_total{track="canary",status=~"5.."}[5m])
  -
  rate(http_requests_total{track="stable",status=~"5.."}[5m])
) > 0.01

# If query returns true, automatic rollback
```

### Canary Rollback

```bash
# Immediately scale canary to 0
kubectl scale deployment broxiva-api-canary -n broxiva --replicas=0

# Or delete entirely
kubectl delete deployment broxiva-api-canary -n broxiva
```

---

## Emergency Procedures

### Emergency Rollback

```bash
# IMMEDIATE ROLLBACK - Use when production is down
kubectl rollout undo deployment/broxiva-api -n broxiva
kubectl rollout undo deployment/broxiva-web -n broxiva

# Scale down if necessary
kubectl scale deployment/broxiva-api -n broxiva --replicas=0
```

### Circuit Breaker Activation

```bash
# Disable specific endpoints via ConfigMap
kubectl create configmap circuit-breaker -n broxiva \
  --from-literal=DISABLE_CHECKOUT=true \
  --from-literal=DISABLE_PAYMENTS=true \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up config
kubectl rollout restart deployment/broxiva-api -n broxiva
```

### Database Emergency Procedures

```bash
# Kill long-running queries
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.broxiva.svc.cluster.local -U broxiva -d broxiva_production \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';"

# Enable read-only mode
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.broxiva.svc.cluster.local -U broxiva -d broxiva_production \
  -c "ALTER DATABASE broxiva_production SET default_transaction_read_only = on;"
```

### Contact Information

- **On-Call Engineer:** Check PagerDuty rotation
- **Platform Lead:** platform-lead@broxiva.com
- **CTO:** cto@broxiva.com
- **Emergency Hotline:** +1-XXX-XXX-XXXX

---

## Appendix

### Deployment Checklist Template

```markdown
# Deployment: v${VERSION} - ${DATE}

**Deployment Lead:** [Name]
**On-Call Engineer:** [Name]

## Pre-Deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Database backup verified
- [ ] Staging deployment successful
- [ ] Stakeholders notified

## Deployment
- [ ] Migration completed (if applicable)
- [ ] Images built and pushed
- [ ] Kubernetes configs updated
- [ ] Application deployed
- [ ] Health checks passing

## Verification
- [ ] Smoke tests completed
- [ ] Error rates normal
- [ ] Performance metrics normal
- [ ] Business metrics normal

## Post-Deployment
- [ ] Monitoring confirmed
- [ ] Documentation updated
- [ ] Team notified of completion
- [ ] Deployment ticket closed

## Issues Encountered
[Document any issues and resolutions]

## Notes
[Any additional notes or observations]
```

### Useful Commands Reference

```bash
# Quick health check
kubectl get pods -n broxiva && \
curl -f https://api.broxiva.com/api/health

# View recent logs
kubectl logs -n broxiva -l app=broxiva-api --tail=100 --timestamps

# Check resource usage
kubectl top pods -n broxiva

# Describe problematic pod
kubectl describe pod <pod-name> -n broxiva

# Execute command in pod
kubectl exec -it deployment/broxiva-api -n broxiva -- /bin/sh

# Port forward for local testing
kubectl port-forward -n broxiva deployment/broxiva-api 4000:3000
```

---

**Document Version History:**

- v1.0.0 (2025-12-03): Initial deployment runbook
