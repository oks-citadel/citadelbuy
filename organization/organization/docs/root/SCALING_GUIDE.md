# Broxiva Production Scaling Guide

**Version:** 1.0.0
**Last Updated:** December 4, 2025
**Owner:** Platform Engineering & SRE Team

---

## Table of Contents

1. [Overview](#overview)
2. [Horizontal Scaling Procedures](#horizontal-scaling-procedures)
3. [Vertical Scaling Procedures](#vertical-scaling-procedures)
4. [Database Scaling](#database-scaling)
5. [Cache Scaling (Redis)](#cache-scaling-redis)
6. [Load Balancer Configuration](#load-balancer-configuration)
7. [Auto-Scaling Setup](#auto-scaling-setup)
8. [Capacity Planning](#capacity-planning)
9. [Performance Benchmarking](#performance-benchmarking)

---

## Overview

This guide provides detailed procedures for scaling Broxiva's production infrastructure to handle increased traffic and workload demands.

### Scaling Philosophy

- **Scale Out, Not Up**: Prefer horizontal scaling over vertical scaling
- **Automate Everything**: Use auto-scaling wherever possible
- **Monitor Continuously**: Scale based on metrics, not guesses
- **Test Before Production**: Validate scaling procedures in staging
- **Plan Ahead**: Scale proactively based on forecasts

### Current Capacity

| Component | Current Capacity | Maximum Tested | Scaling Limit |
|-----------|-----------------|----------------|---------------|
| **API Pods** | 3-5 pods | 10 pods | 50 pods |
| **Web Pods** | 2-4 pods | 8 pods | 30 pods |
| **Database** | 4 vCores | 8 vCores | 64 vCores |
| **Redis** | 6 GB | 120 GB | Cluster mode |
| **Requests/sec** | 500 RPS | 2000 RPS | 10,000+ RPS |

---

## Horizontal Scaling Procedures

### 1. API Service Scaling

#### When to Scale

- CPU usage > 70% for 5+ minutes
- Memory usage > 80% for 5+ minutes
- Request queue depth > 100
- Response time P95 > 500ms

#### Manual Scaling

```bash
# Check current replica count
kubectl get deployment broxiva-api -n broxiva-prod

# Scale up to 10 replicas
kubectl scale deployment/broxiva-api -n broxiva-prod --replicas=10

# Verify scaling
kubectl get pods -n broxiva-prod -l app=broxiva-api -w

# Monitor resource usage
kubectl top pods -n broxiva-prod -l app=broxiva-api

# Check HPA status
kubectl get hpa broxiva-api-hpa -n broxiva-prod
```

#### Considerations

**Database Connection Pool**:
```bash
# Calculate required pool size
# Formula: (Pods × Connections per Pod) ≤ Max DB connections
# Example: 10 pods × 20 connections = 200 total connections

# Update connection pool size per pod
kubectl set env deployment/broxiva-api \
  DATABASE_POOL_SIZE=15 \
  -n broxiva-prod

# Verify database has capacity
# PostgreSQL max_connections should be at least 250
```

**Redis Connection Pool**:
```bash
# Ensure Redis can handle connections
# Default: 10,000 max clients
kubectl exec -it deployment/redis -n broxiva-prod -- \
  redis-cli CONFIG GET maxclients
```

#### Scaling Limits

- **Minimum pods**: 3 (for high availability)
- **Maximum pods**: 50 (cluster resource limits)
- **Recommended**: 3-10 pods for normal operation
- **Cost consideration**: Each pod costs ~$0.10/hour

### 2. Web Frontend Scaling

#### When to Scale

- High traffic to website (>1000 concurrent users)
- CDN cache miss rate > 30%
- Server-side rendering slow (>2s)

#### Manual Scaling

```bash
# Scale web frontend
kubectl scale deployment/broxiva-web -n broxiva-prod --replicas=8

# Verify
kubectl get pods -n broxiva-prod -l app=broxiva-web
```

#### Optimization Before Scaling

**1. Enable CDN Caching**:
```bash
# Configure Azure CDN / Cloudflare
# Static assets: 1 year
# API responses: 5 minutes
# HTML pages: 1 minute
```

**2. Pre-render Static Pages**:
```bash
cd apps/web
pnpm build
# Deploys pre-rendered pages
```

**3. Optimize Images**:
- Use Next.js Image component
- Implement WebP format
- Lazy load images below the fold

### 3. Worker Service Scaling

#### When to Scale

- Queue length > 1000 jobs
- Job processing time increasing
- Email/notification delays > 5 minutes

#### Manual Scaling

```bash
# Scale worker pods
kubectl scale deployment/broxiva-worker -n broxiva-prod --replicas=5

# Check queue status
kubectl exec -it deployment/broxiva-api -n broxiva-prod -- \
  npm run queue:status
```

#### Queue Monitoring

```bash
# Monitor queue metrics
kubectl exec -it deployment/redis -n broxiva-prod -- \
  redis-cli LLEN email-queue

kubectl exec -it deployment/redis -n broxiva-prod -- \
  redis-cli LLEN notification-queue
```

---

## Vertical Scaling Procedures

### 1. When to Scale Vertically

Scale vertically when:
- Application is single-threaded
- Database requires more memory for cache
- Elasticsearch needs larger heap
- Cost of many small instances > one large instance

### 2. API Service Vertical Scaling

```bash
# Check current resources
kubectl get deployment broxiva-api -n broxiva-prod \
  -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Increase CPU and memory
kubectl set resources deployment/broxiva-api -n broxiva-prod \
  --limits=cpu=2,memory=2Gi \
  --requests=cpu=1,memory=1Gi

# Monitor impact
kubectl top pods -n broxiva-prod -l app=broxiva-api
```

### Resource Sizing Matrix

| Workload | CPU | Memory | Use Case |
|----------|-----|---------|----------|
| **Small** | 250m | 256Mi | Development/testing |
| **Medium** | 500m | 512Mi | Production baseline (< 500 RPS) |
| **Large** | 1 | 1Gi | High traffic (500-1000 RPS) |
| **X-Large** | 2 | 2Gi | Peak traffic (> 1000 RPS) |

---

## Database Scaling

### 1. Read Replica Setup

#### When to Add Read Replicas

- Read-heavy workload (>70% reads)
- Database CPU > 60%
- Slow query performance on reads

#### Create Read Replica (Azure)

```bash
# Create read replica
az postgres flexible-server replica create \
  --resource-group broxiva-prod-rg \
  --name broxiva-db-replica-1 \
  --source-server broxiva-db-primary \
  --location westus

# Verify replication
az postgres flexible-server replica list \
  --resource-group broxiva-prod-rg \
  --name broxiva-db-primary
```

#### Application Configuration

Update connection string to use read replica for read operations:

```typescript
// apps/api/src/common/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readReplica: PrismaClient;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL, // Primary
        },
      },
    });

    // Read replica connection
    this.readReplica = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_READ_REPLICA_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.readReplica.$connect();
  }

  // Use for read-only queries
  getReadClient(): PrismaClient {
    return this.readReplica;
  }

  // Use for write operations
  getWriteClient(): PrismaClient {
    return this;
  }
}
```

### 2. Connection Pooling with PgBouncer

```bash
# Deploy PgBouncer
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: broxiva-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
      - name: pgbouncer
        image: edoburu/pgbouncer:latest
        env:
        - name: DATABASE_URL
          value: "postgres://broxiva:password@broxiva-db-primary.postgres.database.azure.com:5432/broxiva?sslmode=require"
        - name: POOL_MODE
          value: "transaction"
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "25"
        ports:
        - containerPort: 5432
EOF

# Create service
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer
  namespace: broxiva-prod
spec:
  selector:
    app: pgbouncer
  ports:
  - port: 5432
    targetPort: 5432
EOF

# Update application to use PgBouncer
kubectl set env deployment/broxiva-api \
  DATABASE_URL="postgresql://broxiva:password@pgbouncer:5432/broxiva" \
  -n broxiva-prod
```

### 3. Database Vertical Scaling

```bash
# Scale up database (Azure)
az postgres flexible-server update \
  --resource-group broxiva-prod-rg \
  --name broxiva-db-primary \
  --sku-name Standard_D8ds_v4 \
  --tier GeneralPurpose \
  --storage-size 512

# This operation takes 5-10 minutes
# Monitor progress
az postgres flexible-server show \
  --resource-group broxiva-prod-rg \
  --name broxiva-db-primary \
  --query state
```

---

## Cache Scaling (Redis)

### 1. When to Scale Redis

- Memory usage > 80%
- Cache hit rate < 85%
- Connection count near limit
- Eviction rate increasing

### 2. Vertical Scaling (Azure Cache for Redis)

```bash
# Scale up Redis cache tier
az redis update \
  --resource-group broxiva-prod-rg \
  --name broxiva-redis \
  --sku Premium \
  --vm-size P3

# This provides:
# - 26 GB memory
# - Higher throughput
# - Data persistence
```

### 3. Redis Cluster Mode (Horizontal Scaling)

For very high scale, deploy Redis Cluster:

```yaml
# redis-cluster-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: broxiva-prod
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis
      cluster: enabled
  template:
    metadata:
      labels:
        app: redis
        cluster: enabled
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /conf/redis.conf
        - --cluster-enabled yes
        - --cluster-config-file /data/nodes.conf
        - --cluster-node-timeout 5000
        - --appendonly yes
        - --maxmemory 2gb
        - --maxmemory-policy allkeys-lru
        ports:
        - containerPort: 6379
          name: client
        - containerPort: 16379
          name: gossip
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

```bash
# Initialize cluster
kubectl exec -it redis-cluster-0 -n broxiva-prod -- \
  redis-cli --cluster create \
  $(kubectl get pods -n broxiva-prod -l app=redis -o jsonpath='{range.items[*]}{.status.podIP}:6379 ') \
  --cluster-replicas 1

# Verify cluster
kubectl exec -it redis-cluster-0 -n broxiva-prod -- \
  redis-cli cluster info
```

---

## Load Balancer Configuration

### Azure Application Gateway Configuration

```bash
# Scale Application Gateway
az network application-gateway update \
  --resource-group broxiva-prod-rg \
  --name broxiva-appgw \
  --capacity 10 \
  --sku WAF_v2

# Configure backend pool
az network application-gateway address-pool create \
  --resource-group broxiva-prod-rg \
  --gateway-name broxiva-appgw \
  --name api-backend-pool \
  --servers api.broxiva.com

# Configure health probe
az network application-gateway probe create \
  --resource-group broxiva-prod-rg \
  --gateway-name broxiva-appgw \
  --name api-health-probe \
  --protocol https \
  --host api.broxiva.com \
  --path /api/health \
  --interval 30 \
  --timeout 30 \
  --threshold 3
```

### NGINX Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: broxiva-ingress
  namespace: broxiva-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    # Load balancing
    nginx.ingress.kubernetes.io/load-balance: "ewma"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$remote_addr"
spec:
  tls:
  - hosts:
    - broxiva.com
    - api.broxiva.com
    secretName: broxiva-tls
  rules:
  - host: api.broxiva.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: broxiva-api
            port:
              number: 80
```

---

## Auto-Scaling Setup

### 1. Horizontal Pod Autoscaler (HPA)

```yaml
# api-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: broxiva-api-hpa
  namespace: broxiva-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: broxiva-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  # CPU-based scaling
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory-based scaling
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  # Custom metric: request rate
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

```bash
# Apply HPA
kubectl apply -f api-hpa.yaml

# Monitor HPA
kubectl get hpa -n broxiva-prod -w

# View HPA events
kubectl describe hpa broxiva-api-hpa -n broxiva-prod
```

### 2. Cluster Autoscaler

```yaml
# cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=azure
        - --skip-nodes-with-local-storage=false
        - --nodes=3:10:aks-default-nodepool
        - --balance-similar-node-groups
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
        env:
        - name: ARM_SUBSCRIPTION_ID
          valueFrom:
            secretKeyRef:
              name: cluster-autoscaler-azure
              key: SubscriptionID
        - name: ARM_RESOURCE_GROUP
          valueFrom:
            secretKeyRef:
              name: cluster-autoscaler-azure
              key: ResourceGroup
        - name: ARM_TENANT_ID
          valueFrom:
            secretKeyRef:
              name: cluster-autoscaler-azure
              key: TenantID
        - name: ARM_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: cluster-autoscaler-azure
              key: ClientID
        - name: ARM_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: cluster-autoscaler-azure
              key: ClientSecret
        - name: ARM_VM_TYPE
          value: "vmss"
        - name: ARM_CLUSTER_NAME
          value: "broxiva-prod-aks"
```

---

## Capacity Planning

### Current Metrics (Baseline)

- **Daily Active Users**: 10,000
- **Peak Requests/Second**: 500
- **Average Response Time**: 150ms
- **Database Size**: 50GB
- **Redis Memory**: 4GB

### Growth Projections

| Timeframe | DAU | Peak RPS | DB Size | Redis | Estimated Cost |
|-----------|-----|----------|---------|-------|----------------|
| **Current** | 10,000 | 500 | 50GB | 4GB | $3,000/month |
| **3 Months** | 20,000 | 1,000 | 100GB | 8GB | $5,000/month |
| **6 Months** | 40,000 | 2,000 | 200GB | 16GB | $8,000/month |
| **12 Months** | 100,000 | 5,000 | 500GB | 32GB | $15,000/month |

### Resource Planning Formula

**API Pods Required**:
```
Pods = (Peak RPS / RPS per Pod) × Safety Factor
     = (5000 / 500) × 1.3
     = 13 pods
```

**Database Connections Required**:
```
Connections = Pods × Connections per Pod
            = 13 × 20
            = 260 connections

Ensure max_connections > 260 (recommend 350)
```

**Redis Memory Required**:
```
Memory = Active Users × Average Session Size
       = 100,000 × 10KB
       = 1GB (sessions only)

Add cache: 10GB
Add queues: 2GB
Total: 13GB minimum, provision 16GB
```

---

## Performance Benchmarking

### Load Testing with k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function () {
  const res = http.get('https://api.broxiva.com/api/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

```bash
# Run load test
k6 run load-test.js

# Run with Prometheus output
k6 run --out prometheus load-test.js
```

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Response Time (P50)** | <200ms | 150ms | ✅ |
| **Response Time (P95)** | <500ms | 350ms | ✅ |
| **Response Time (P99)** | <1000ms | 800ms | ✅ |
| **Error Rate** | <0.1% | 0.05% | ✅ |
| **Throughput** | >1000 RPS | 800 RPS | ⚠️ |
| **Database Query Time** | <100ms | 75ms | ✅ |
| **Cache Hit Rate** | >90% | 88% | ⚠️ |

---

**Document Version History:**

- v1.0.0 (December 4, 2025): Initial production scaling guide
