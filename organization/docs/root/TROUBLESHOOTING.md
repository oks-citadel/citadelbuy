# CitadelBuy Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-03
**Owner:** Platform Engineering Team

## Table of Contents

1. [Common Errors and Fixes](#common-errors-and-fixes)
2. [Log Locations and Analysis](#log-locations-and-analysis)
3. [Health Check Endpoints](#health-check-endpoints)
4. [Database Troubleshooting](#database-troubleshooting)
5. [Payment Processing Issues](#payment-processing-issues)
6. [Performance Troubleshooting](#performance-troubleshooting)
7. [Authentication & Authorization](#authentication--authorization)
8. [Cache Issues](#cache-issues)
9. [Search & Elasticsearch](#search--elasticsearch)
10. [Email & Notifications](#email--notifications)
11. [Network & Connectivity](#network--connectivity)

---

## Common Errors and Fixes

### Error: "Cannot connect to database"

**Symptoms:**
```
Error: P1001: Can't reach database server at `postgres:5432`
```

**Diagnosis:**
```bash
# Check if PostgreSQL pod is running
kubectl get pods -n citadelbuy -l app=postgres

# Check PostgreSQL logs
kubectl logs -n citadelbuy -l app=postgres --tail=50

# Test database connectivity
kubectl run psql-test --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.citadelbuy.svc.cluster.local -U citadelbuy -d citadelbuy_production -c "SELECT 1;"
```

**Solutions:**

1. **Database pod not running:**
   ```bash
   kubectl describe pod postgres-0 -n citadelbuy
   kubectl rollout restart statefulset/postgres -n citadelbuy
   ```

2. **Network connectivity issue:**
   ```bash
   # Verify service exists
   kubectl get service postgres -n citadelbuy

   # Check endpoints
   kubectl get endpoints postgres -n citadelbuy
   ```

3. **Wrong credentials:**
   ```bash
   # Verify secret
   kubectl get secret citadelbuy-secrets -n citadelbuy -o jsonpath='{.data.DATABASE_URL}' | base64 -d

   # Update if needed
   kubectl create secret generic citadelbuy-secrets \
     --from-literal=DATABASE_URL="postgresql://user:pass@postgres:5432/db" \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

---

### Error: "ECONNREFUSED" (Redis connection refused)

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Diagnosis:**
```bash
# Check Redis pod
kubectl get pods -n citadelbuy -l app=redis

# Test Redis connection
kubectl run redis-test --rm -it --restart=Never \
  --image=redis:7-alpine \
  -- redis-cli -h redis.citadelbuy.svc.cluster.local PING

# Check logs
kubectl logs -n citadelbuy -l app=redis --tail=100
```

**Solutions:**

1. **Redis not running:**
   ```bash
   kubectl rollout restart deployment/redis -n citadelbuy
   ```

2. **Wrong Redis URL:**
   ```bash
   # Check environment variable
   kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- env | grep REDIS

   # Update if needed
   kubectl set env deployment/citadelbuy-api \
     REDIS_URL=redis://redis.citadelbuy.svc.cluster.local:6379 \
     -n citadelbuy
   ```

3. **Redis out of memory:**
   ```bash
   # Check memory usage
   kubectl exec -it deployment/redis -n citadelbuy -- \
     redis-cli INFO memory

   # Clear cache if needed
   kubectl exec -it deployment/redis -n citadelbuy -- \
     redis-cli FLUSHDB
   ```

---

### Error: "Container OOMKilled"

**Symptoms:**
```
Last State: Terminated
Reason: OOMKilled
Exit Code: 137
```

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n citadelbuy

# Check memory usage
kubectl top pod <pod-name> -n citadelbuy

# Check memory limits
kubectl get pod <pod-name> -n citadelbuy -o jsonpath='{.spec.containers[0].resources}'
```

**Solutions:**

1. **Increase memory limits:**
   ```bash
   kubectl set resources deployment/citadelbuy-api -n citadelbuy \
     --limits=memory=1Gi \
     --requests=memory=512Mi
   ```

2. **Find memory leak:**
   ```bash
   # Enable heap profiling
   kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
     node --inspect=0.0.0.0:9229 dist/main.js

   # Connect with Chrome DevTools
   kubectl port-forward deployment/citadelbuy-api 9229:9229 -n citadelbuy
   # Open chrome://inspect in Chrome
   ```

3. **Optimize application code:**
   - Check for memory leaks in code
   - Review large data processing
   - Implement pagination
   - Clear unused objects

---

### Error: "429 Too Many Requests"

**Symptoms:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Diagnosis:**
```bash
# Check rate limiting configuration
kubectl get configmap citadelbuy-config -n citadelbuy -o yaml | grep -i throttle

# Check logs for throttled requests
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i "429\|throttle"
```

**Solutions:**

1. **Legitimate traffic spike - increase limits:**
   ```bash
   kubectl set env deployment/citadelbuy-api \
     THROTTLE_TTL=60 \
     THROTTLE_LIMIT=100 \
     -n citadelbuy
   ```

2. **Identify source of requests:**
   ```bash
   # Check access logs
   kubectl logs -n citadelbuy -l app=nginx | grep " 429 "

   # Block IP if malicious
   kubectl exec -it deployment/nginx -n citadelbuy -- \
     nginx -s reload
   ```

3. **Implement IP whitelisting:**
   ```typescript
   // apps/api/src/common/guards/enhanced-throttler.guard.ts
   const WHITELISTED_IPS = ['1.2.3.4', '5.6.7.8'];
   ```

---

### Error: "413 Payload Too Large"

**Symptoms:**
```
Error: Request entity too large
```

**Diagnosis:**
```bash
# Check NGINX configuration
kubectl exec -it deployment/nginx -n citadelbuy -- \
  cat /etc/nginx/nginx.conf | grep client_max_body_size
```

**Solutions:**

1. **Increase NGINX limit:**
   ```bash
   # Update ingress annotation
   kubectl annotate ingress citadelbuy-ingress \
     nginx.ingress.kubernetes.io/proxy-body-size=50m \
     -n citadelbuy
   ```

2. **Increase NestJS limit:**
   ```typescript
   // apps/api/src/main.ts
   app.use(json({ limit: '50mb' }));
   app.use(urlencoded({ extended: true, limit: '50mb' }));
   ```

---

### Error: "Prisma Client Not Generated"

**Symptoms:**
```
Error: @prisma/client did not initialize yet.
Please run "prisma generate" and try to import it again.
```

**Solutions:**

```bash
# Generate Prisma client
cd apps/api
npx prisma generate

# Or in pod
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npx prisma generate

# Rebuild Docker image
docker build -t citadelplatforms/citadelbuy-ecommerce:backend-latest .
docker push citadelplatforms/citadelbuy-ecommerce:backend-latest

# Restart deployment
kubectl rollout restart deployment/citadelbuy-api -n citadelbuy
```

---

## Log Locations and Analysis

### Application Logs

**View real-time API logs:**
```bash
# All API pods
kubectl logs -n citadelbuy -l app=citadelbuy-api -f --tail=100

# Specific pod
kubectl logs -n citadelbuy <pod-name> -f

# Previous container logs (if pod restarted)
kubectl logs -n citadelbuy <pod-name> --previous
```

**Filter logs by severity:**
```bash
# Errors only
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i error

# Warnings
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i warn

# With timestamps
kubectl logs -n citadelbuy -l app=citadelbuy-api --timestamps
```

**Search for specific patterns:**
```bash
# Payment errors
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i "stripe\|payment"

# Database errors
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i "prisma\|database\|postgresql"

# Authentication errors
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i "auth\|jwt\|login"
```

### Database Logs

```bash
# PostgreSQL logs
kubectl logs -n citadelbuy -l app=postgres --tail=200

# Check for slow queries
kubectl logs -n citadelbuy -l app=postgres | grep "duration:"

# Connection errors
kubectl logs -n citadelbuy -l app=postgres | grep -i "connection\|fatal"
```

### NGINX Access Logs

```bash
# Access logs
kubectl logs -n citadelbuy -l app=nginx -f

# Filter by status code
kubectl logs -n citadelbuy -l app=nginx | grep " 500 "
kubectl logs -n citadelbuy -l app=nginx | grep " 404 "

# Top IP addresses
kubectl logs -n citadelbuy -l app=nginx | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Requests per minute
kubectl logs -n citadelbuy -l app=nginx | \
  awk '{print $4}' | cut -d: -f2 | sort | uniq -c
```

### Redis Logs

```bash
# Redis logs
kubectl logs -n citadelbuy -l app=redis --tail=100

# Check for memory warnings
kubectl logs -n citadelbuy -l app=redis | grep -i "memory\|oom"
```

### Log Aggregation (if using ELK/Loki)

```bash
# Query logs in Kibana
# Navigate to: https://kibana.citadelbuy.com

# Loki query examples
{namespace="citadelbuy",app="citadelbuy-api"} |= "error"
{namespace="citadelbuy",app="citadelbuy-api"} |= "timeout"
{namespace="citadelbuy"} | json | level="error"
```

---

## Health Check Endpoints

### Available Health Endpoints

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `/api/health` | Overall health | 200 if all systems healthy |
| `/api/health/live` | Liveness probe | 200 if app is alive |
| `/api/health/ready` | Readiness probe | 200 if ready for traffic |
| `/api/health/detailed` | Detailed metrics | JSON with all health checks |

### Testing Health Endpoints

```bash
# Basic health check
curl -f https://api.citadelbuy.com/api/health

# Detailed health (includes timing)
curl https://api.citadelbuy.com/api/health/detailed | jq '.'

# From within cluster
kubectl run curl-test --rm -it --restart=Never \
  --image=curlimages/curl:latest -- \
  curl http://citadelbuy-api.citadelbuy.svc.cluster.local/api/health
```

### Interpreting Health Check Results

**Healthy Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

**Unhealthy Response:**
```json
{
  "status": "error",
  "info": {
    "redis": {
      "status": "up"
    }
  },
  "error": {
    "database": {
      "status": "down",
      "message": "timeout"
    }
  },
  "details": {
    "database": {
      "status": "down",
      "message": "timeout"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

**Detailed Health Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 45
    },
    "redis": {
      "status": "up",
      "responseTime": 12
    },
    "memory": {
      "heap": 156,
      "rss": 245,
      "external": 12
    },
    "uptime": 86400,
    "timestamp": "2025-12-03T10:30:00.000Z"
  }
}
```

---

## Database Troubleshooting

### Slow Queries

**Identify slow queries:**
```bash
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres.citadelbuy.svc.cluster.local -U citadelbuy -d citadelbuy_production << 'EOF'
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
EOF
```

**Enable query logging:**
```sql
-- Enable slow query logging (queries > 100ms)
ALTER SYSTEM SET log_min_duration_statement = 100;

-- Reload configuration
SELECT pg_reload_conf();

-- View logs
-- kubectl logs -n citadelbuy -l app=postgres | grep "duration:"
```

**Analyze query plan:**
```sql
EXPLAIN ANALYZE
SELECT * FROM "Product" WHERE category_id = 'electronics' ORDER BY price DESC LIMIT 10;
```

### Connection Pool Issues

**Check active connections:**
```bash
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres -U citadelbuy -d citadelbuy_production -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

**Check connection limits:**
```sql
-- Current connections vs max
SELECT
  (SELECT count(*) FROM pg_stat_activity) as current_connections,
  (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_connections;
```

**Kill idle connections:**
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes'
  AND pid != pg_backend_pid();
```

### Lock Troubleshooting

**Check for locks:**
```sql
SELECT
  l.pid,
  l.mode,
  l.granted,
  a.query,
  a.state,
  a.query_start
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY a.query_start;
```

**Check for blocking queries:**
```sql
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Database Disk Space

**Check database size:**
```sql
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

**Check table sizes:**
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

**Clean up:**
```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex if needed
REINDEX DATABASE citadelbuy_production;
```

---

## Payment Processing Issues

### Stripe Webhook Failures

**Symptoms:**
- Orders stuck in "processing" status
- Payment confirmations not received
- Webhook error emails from Stripe

**Diagnosis:**
```bash
# Check Stripe webhook logs
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i stripe

# Check Stripe dashboard
# https://dashboard.stripe.com/webhooks
# Look for failed webhook deliveries

# Test webhook endpoint
curl -X POST https://api.citadelbuy.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type":"test.event"}'
```

**Solutions:**

1. **Verify webhook signature:**
   ```bash
   # Check webhook secret
   kubectl get secret citadelbuy-secrets -n citadelbuy \
     -o jsonpath='{.data.STRIPE_WEBHOOK_SECRET}' | base64 -d
   ```

2. **Re-register webhook:**
   ```bash
   # Using Stripe CLI
   stripe listen --forward-to https://api.citadelbuy.com/api/webhooks/stripe
   ```

3. **Process failed webhooks manually:**
   ```bash
   kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
     npm run stripe:process-failed-webhooks
   ```

### Payment Intent Failures

**Common errors:**

1. **"Your card was declined"**
   - Test with different test card
   - Check Stripe dashboard for decline reason
   - Verify card details are correct

2. **"Authentication required"**
   - Implement 3D Secure (SCA)
   - Use Stripe Elements with card authentication

3. **"API key invalid"**
   ```bash
   # Verify API key
   kubectl get secret citadelbuy-secrets -n citadelbuy \
     -o jsonpath='{.data.STRIPE_SECRET_KEY}' | base64 -d

   # Update if needed
   kubectl create secret generic citadelbuy-secrets \
     --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

### Refund Issues

**Process manual refund:**
```bash
# Using Stripe CLI
stripe refunds create --payment-intent=pi_xxx --amount=1000

# Or via API
curl https://api.stripe.com/v1/refunds \
  -u "${STRIPE_SECRET_KEY}:" \
  -d payment_intent=pi_xxx \
  -d amount=1000
```

---

## Performance Troubleshooting

### High Response Times

**Diagnosis:**
```bash
# Check current response times
kubectl logs -n citadelbuy -l app=citadelbuy-api | \
  grep "duration" | awk '{print $NF}' | sort -n | tail -20

# Check resource usage
kubectl top pods -n citadelbuy

# Check database performance
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres -U citadelbuy -d citadelbuy_production -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions:**

1. **Scale up pods:**
   ```bash
   kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=10
   ```

2. **Add database indexes:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_products_category
     ON "Product"(category_id);

   CREATE INDEX CONCURRENTLY idx_orders_user_created
     ON "Order"(user_id, created_at DESC);
   ```

3. **Enable caching:**
   ```typescript
   // Add Redis caching to expensive queries
   @Cacheable({ ttl: 300 })
   async getProducts() {
     return this.prisma.product.findMany();
   }
   ```

### Memory Leaks

**Identify memory leak:**
```bash
# Monitor memory usage over time
watch kubectl top pods -n citadelbuy -l app=citadelbuy-api

# Enable heap profiling
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  node --inspect=0.0.0.0:9229 --heap-prof dist/main.js

# Port forward and connect with Chrome DevTools
kubectl port-forward deployment/citadelbuy-api 9229:9229 -n citadelbuy
```

**Common causes:**
- Event listeners not removed
- Large arrays not cleared
- Circular references
- Unclosed database connections
- Caching without TTL

### Database Connection Leaks

**Check for leaked connections:**
```sql
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  state_change,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

**Fix:**
```typescript
// Ensure connections are properly closed
try {
  await prisma.user.findMany();
} finally {
  await prisma.$disconnect();
}
```

---

## Authentication & Authorization

### JWT Token Issues

**Error: "Invalid token"**

**Diagnosis:**
```bash
# Decode JWT to check expiration
echo "eyJhbGc..." | cut -d. -f2 | base64 -d | jq '.'

# Check JWT secret
kubectl get secret citadelbuy-secrets -n citadelbuy \
  -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

**Solutions:**
1. Token expired - request new token
2. Wrong secret - verify JWT_SECRET matches
3. Token corrupted - clear cookies and re-login

### OAuth/Social Login Issues

**Google OAuth not working:**

**Check configuration:**
```bash
# Verify Google OAuth credentials
kubectl get secret citadelbuy-secrets -n citadelbuy \
  -o jsonpath='{.data.GOOGLE_CLIENT_ID}' | base64 -d

# Check redirect URI
# Must match: https://api.citadelbuy.com/api/auth/google/callback
```

**Common issues:**
1. Redirect URI mismatch in Google Console
2. OAuth consent screen not configured
3. API credentials incorrect

### Password Reset Not Working

**Diagnosis:**
```bash
# Check if reset token was created
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres -U citadelbuy -d citadelbuy_production -c \
  "SELECT * FROM \"PasswordReset\" WHERE email = 'user@example.com' ORDER BY created_at DESC LIMIT 1;"

# Check if email was sent
kubectl logs -n citadelbuy -l app=citadelbuy-api | grep -i "password reset"
```

---

## Cache Issues

### Redis Cache Miss Rate High

**Check cache statistics:**
```bash
kubectl exec -it deployment/redis -n citadelbuy -- \
  redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

**Calculate hit rate:**
```bash
# Hit rate should be > 90%
# Hit rate = hits / (hits + misses)
```

**Improve cache hit rate:**
1. Increase TTL for stable data
2. Warm cache on startup
3. Implement cache prefetching
4. Review cache invalidation strategy

### Redis Running Out of Memory

**Check memory usage:**
```bash
kubectl exec -it deployment/redis -n citadelbuy -- \
  redis-cli INFO memory
```

**Solutions:**

1. **Increase memory limit:**
   ```bash
   kubectl set resources deployment/redis -n citadelbuy \
     --limits=memory=4Gi
   ```

2. **Set eviction policy:**
   ```bash
   kubectl exec -it deployment/redis -n citadelbuy -- \
     redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

3. **Clear old data:**
   ```bash
   kubectl exec -it deployment/redis -n citadelbuy -- \
     redis-cli --scan --pattern "cache:old:*" | xargs redis-cli DEL
   ```

---

## Search & Elasticsearch

### Search Returning No Results

**Check Elasticsearch health:**
```bash
curl https://elasticsearch.citadelbuy.com/_cluster/health | jq '.'

# Check indices
curl https://elasticsearch.citadelbuy.com/_cat/indices?v
```

**Reindex products:**
```bash
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npm run search:reindex
```

### Elasticsearch Node Down

**Check nodes:**
```bash
curl https://elasticsearch.citadelbuy.com/_cat/nodes?v

# Check node health
curl https://elasticsearch.citadelbuy.com/_nodes/stats | jq '.nodes'
```

**Restart Elasticsearch:**
```bash
kubectl rollout restart statefulset/elasticsearch -n citadelbuy
```

---

## Email & Notifications

### Emails Not Sending

**Check queue:**
```bash
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npm run queue:email:status
```

**Check SendGrid status:**
```bash
curl https://status.sendgrid.com/api/v2/status.json
```

**Verify API key:**
```bash
kubectl get secret citadelbuy-secrets -n citadelbuy \
  -o jsonpath='{.data.SENDGRID_API_KEY}' | base64 -d
```

**Retry failed emails:**
```bash
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npm run queue:email:retry
```

---

## Network & Connectivity

### CORS Errors

**Error:** "Access-Control-Allow-Origin"

**Solution:**
```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    'https://citadelbuy.com',
    'https://www.citadelbuy.com',
    'http://localhost:3000',
  ],
  credentials: true,
});
```

### SSL Certificate Issues

**Check certificate:**
```bash
kubectl get certificate -n citadelbuy

# Describe certificate
kubectl describe certificate citadelbuy-tls -n citadelbuy

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

**Renew certificate:**
```bash
kubectl delete certificate citadelbuy-tls -n citadelbuy
kubectl apply -f infrastructure/kubernetes/base/certificates.yaml
```

---

## Quick Diagnostic Script

```bash
#!/bin/bash
# quick-diagnostic.sh

echo "=== CitadelBuy Health Check ==="

echo -e "\n1. Pod Status:"
kubectl get pods -n citadelbuy

echo -e "\n2. Health Endpoints:"
curl -f https://api.citadelbuy.com/api/health || echo "FAIL"

echo -e "\n3. Recent Errors:"
kubectl logs -n citadelbuy -l app=citadelbuy-api --tail=50 | grep -i error | tail -10

echo -e "\n4. Resource Usage:"
kubectl top pods -n citadelbuy

echo -e "\n5. Database Connections:"
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres -U citadelbuy -d citadelbuy_production \
  -c "SELECT count(*) FROM pg_stat_activity;"

echo -e "\n6. Redis Status:"
kubectl run redis-test --rm -it --restart=Never \
  --image=redis:7-alpine \
  -- redis-cli -h redis PING

echo -e "\n=== Diagnostic Complete ==="
```

---

**Document Version History:**

- v1.0.0 (2025-12-03): Initial troubleshooting guide
