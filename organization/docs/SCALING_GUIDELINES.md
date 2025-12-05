# CitadelBuy Scaling Guidelines

**Version:** 1.0.0
**Last Updated:** 2025-12-03
**Owner:** Platform Engineering Team

## Table of Contents

1. [Overview](#overview)
2. [Horizontal Scaling Procedures](#horizontal-scaling-procedures)
3. [Vertical Scaling Considerations](#vertical-scaling-considerations)
4. [Database Scaling Strategies](#database-scaling-strategies)
5. [Cache Scaling (Redis Cluster)](#cache-scaling-redis-cluster)
6. [Load Balancer Configuration](#load-balancer-configuration)
7. [Auto-Scaling Setup](#auto-scaling-setup)
8. [Capacity Planning Guidelines](#capacity-planning-guidelines)
9. [Performance Benchmarks](#performance-benchmarks)

---

## Overview

### Scaling Philosophy

CitadelBuy is designed for horizontal scalability across all tiers:
- **Stateless Services:** API, Web frontend, Workers
- **Stateful Services:** PostgreSQL, Redis, Elasticsearch
- **Storage:** S3-compatible object storage (MinIO/AWS S3)

### Current Architecture Limits

| Component | Current Capacity | Scaling Limit | Notes |
|-----------|-----------------|---------------|-------|
| API Pods | 3-10 | 50 | CPU-bound |
| Web Pods | 2-8 | 30 | Memory-bound |
| PostgreSQL | Single instance | Read replicas | Primary + 5 replicas |
| Redis | Single instance | Cluster mode | Up to 6 shards |
| Elasticsearch | 3 nodes | 20 nodes | Data + master nodes |

### Scaling Triggers

Scale when:
- **CPU utilization** > 70% for 5 minutes
- **Memory utilization** > 80% for 5 minutes
- **Response time P95** > 500ms
- **Error rate** > 1%
- **Database connections** > 70% of pool
- **Redis memory** > 80% of limit

---

## Horizontal Scaling Procedures

### API Service Scaling

**When to Scale:**
- High request volume (>1000 req/sec)
- CPU usage consistently >70%
- Response times degrading

**Manual Scaling:**

```bash
# Scale up to 10 replicas
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=10

# Verify scaling
kubectl get pods -n citadelbuy -l app=citadelbuy-api

# Monitor resource usage
kubectl top pods -n citadelbuy -l app=citadelbuy-api

# Check if scaling helped
# Monitor Grafana dashboard for 5-10 minutes
```

**Scaling Considerations:**

1. **Database Connection Pool:**
   ```bash
   # Calculate required pool size
   # Formula: (Number of API pods) × (Connections per pod) ≤ Max DB connections
   # Example: 10 pods × 20 connections = 200 total connections
   # PostgreSQL default max_connections = 100 (need to increase)

   # Update database connection pool size per pod
   kubectl set env deployment/citadelbuy-api \
     DATABASE_POOL_SIZE=15 \
     -n citadelbuy
   ```

2. **Redis Connection Pool:**
   ```bash
   # Ensure Redis can handle connections
   # Default: 10000 max clients
   kubectl exec -it deployment/redis -n citadelbuy -- \
     redis-cli CONFIG GET maxclients
   ```

3. **Session Affinity:**
   - Not required (stateless design)
   - Load balanced round-robin

**Scaling Limits:**

- **Maximum pods:** 50 (cluster resource limits)
- **Cost consideration:** Each pod costs ~$X/month
- **Diminishing returns:** Beyond 20 pods, focus on optimization

---

### Web Frontend Scaling

**When to Scale:**
- High traffic to website
- CDN cache miss rate high
- Server-side rendering slow

**Manual Scaling:**

```bash
# Scale web frontend
kubectl scale deployment/citadelbuy-web -n citadelbuy --replicas=8

# Verify
kubectl get pods -n citadelbuy -l app=citadelbuy-web
```

**Optimization Before Scaling:**

1. **Enable CDN caching:**
   ```bash
   # Configure CloudFront/Cloudflare to cache:
   # - Static assets: 1 year
   # - API responses: 5 minutes (if cacheable)
   # - HTML pages: 1 minute
   ```

2. **Static Site Generation:**
   ```bash
   # Pre-render static pages
   cd apps/web
   pnpm build
   # Deploys pre-rendered pages
   ```

3. **Image Optimization:**
   - Use Next.js Image component
   - Implement WebP format
   - Lazy load images

---

### Worker Service Scaling

**When to Scale:**
- Background job queue length >1000
- Job processing time increasing
- Email/notification delays

**Manual Scaling:**

```bash
# Scale worker pods
kubectl scale deployment/citadelbuy-worker -n citadelbuy --replicas=5

# Check queue status
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npm run queue:status
```

**Queue-Based Scaling:**

```yaml
# Scale based on queue length
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: citadelbuy-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: citadelbuy-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: queue_length
      target:
        type: AverageValue
        averageValue: "100"
```

---

## Vertical Scaling Considerations

### When to Scale Vertically

Scale vertically when:
- Application is single-threaded or not horizontally scalable
- Database requires more memory for cache
- Elasticsearch needs larger heap
- Cost of multiple small instances > one large instance

### API Service Vertical Scaling

```bash
# Current resources
kubectl get deployment citadelbuy-api -n citadelbuy \
  -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Increase CPU and memory
kubectl set resources deployment/citadelbuy-api -n citadelbuy \
  --limits=cpu=2,memory=2Gi \
  --requests=cpu=1,memory=1Gi

# Monitor impact
kubectl top pods -n citadelbuy -l app=citadelbuy-api
```

### Resource Sizing Matrix

| Workload | CPU | Memory | Notes |
|----------|-----|---------|-------|
| **Small** (< 100 req/sec) | 250m | 256Mi | Development/testing |
| **Medium** (100-500 req/sec) | 500m | 512Mi | Production baseline |
| **Large** (500-1000 req/sec) | 1 | 1Gi | High traffic |
| **X-Large** (> 1000 req/sec) | 2 | 2Gi | Peak traffic |

### Vertical Scaling Limits

- **Maximum pod size:** 4 CPU, 8Gi memory (node capacity)
- **Cost efficiency:** Beyond 2 CPU, horizontal scaling is more cost-effective
- **Availability:** Vertical scaling requires pod restart

---

## Database Scaling Strategies

### Read Replica Configuration

**When to Add Read Replicas:**
- Read-heavy workload (>70% reads)
- Database CPU >60%
- Slow query performance on reads

**Setup Read Replica:**

```yaml
# PostgreSQL Read Replica Deployment
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-replica
  namespace: citadelbuy
spec:
  serviceName: postgres-replica
  replicas: 2
  selector:
    matchLabels:
      app: postgres
      role: replica
  template:
    metadata:
      labels:
        app: postgres
        role: replica
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

**Configure Replication:**

```sql
-- On primary database
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secure-password';

-- In postgresql.conf
wal_level = replica
max_wal_senders = 5
max_replication_slots = 5
hot_standby = on

-- In pg_hba.conf
host replication replicator <replica-ip>/32 md5
```

**Application Configuration:**

```typescript
// Prisma configuration for read replicas
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
}
```

### Connection Pooling

**PgBouncer for Connection Pooling:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: citadelbuy
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
          value: "postgres://citadelbuy:password@postgres:5432/citadelbuy_production"
        - name: POOL_MODE
          value: "transaction"
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "25"
        ports:
        - containerPort: 5432
```

**Update Application to Use PgBouncer:**

```bash
# Update DATABASE_URL to point to PgBouncer
kubectl set env deployment/citadelbuy-api \
  DATABASE_URL="postgresql://citadelbuy:password@pgbouncer:5432/citadelbuy_production" \
  -n citadelbuy
```

### Database Partitioning

**Time-Based Partitioning for Orders:**

```sql
-- Create parent table
CREATE TABLE orders (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(50),
    total DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE orders_2025_02 PARTITION OF orders
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Create index on each partition
CREATE INDEX idx_orders_2025_01_user_id ON orders_2025_01(user_id);
CREATE INDEX idx_orders_2025_02_user_id ON orders_2025_02(user_id);

-- Automate partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    partition_name := 'orders_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := partition_date::TEXT;
    end_date := (partition_date + INTERVAL '1 month')::TEXT;

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
```

### Vertical Scaling (Database)

```bash
# Stop application
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=0

# Backup database
kubectl exec -it postgres-0 -n citadelbuy -- \
  pg_dump -U citadelbuy citadelbuy_production > backup.sql

# Update PostgreSQL StatefulSet resources
kubectl set resources statefulset/postgres -n citadelbuy \
  --limits=cpu=4,memory=8Gi \
  --requests=cpu=2,memory=4Gi

# Restart database
kubectl rollout restart statefulset/postgres -n citadelbuy

# Wait for database to be ready
kubectl wait --for=condition=ready pod/postgres-0 -n citadelbuy --timeout=300s

# Restore application
kubectl scale deployment/citadelbuy-api -n citadelbuy --replicas=3
```

---

## Cache Scaling (Redis Cluster)

### When to Scale Redis

Scale when:
- Memory usage >80%
- Cache hit rate <85%
- Connection count near limit
- Eviction rate increasing

### Redis Cluster Setup

**Convert from Single Instance to Cluster:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: citadelbuy
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
        - name: conf
          mountPath: /conf
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

**Initialize Cluster:**

```bash
# Create cluster
kubectl exec -it redis-cluster-0 -n citadelbuy -- \
  redis-cli --cluster create \
  $(kubectl get pods -n citadelbuy -l app=redis -o jsonpath='{range.items[*]}{.status.podIP}:6379 ') \
  --cluster-replicas 1

# Verify cluster status
kubectl exec -it redis-cluster-0 -n citadelbuy -- \
  redis-cli cluster info
```

### Redis Memory Optimization

```bash
# Configure memory policies
kubectl exec -it deployment/redis -n citadelbuy -- \
  redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Set maximum memory
kubectl exec -it deployment/redis -n citadelbuy -- \
  redis-cli CONFIG SET maxmemory 2gb

# Enable compression (if using Redis 7+)
kubectl exec -it deployment/redis -n citadelbuy -- \
  redis-cli CONFIG SET lazyfree-lazy-eviction yes
```

### Application Configuration for Redis Cluster

```typescript
// apps/api/src/common/redis/redis.service.ts
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly client: Redis.Cluster | Redis;

  constructor() {
    if (process.env.REDIS_CLUSTER_ENABLED === 'true') {
      // Redis Cluster
      this.client = new Redis.Cluster([
        { host: 'redis-cluster-0.redis-cluster', port: 6379 },
        { host: 'redis-cluster-1.redis-cluster', port: 6379 },
        { host: 'redis-cluster-2.redis-cluster', port: 6379 },
      ], {
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
        },
      });
    } else {
      // Single Redis instance
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      });
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }
}
```

### Cache Warming Strategy

```bash
# Pre-populate cache with frequently accessed data
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npm run cache:warm

# Script example: apps/api/scripts/warm-cache.ts
```

```typescript
// apps/api/scripts/warm-cache.ts
import { PrismaClient } from '@prisma/client';
import { RedisService } from '../src/common/redis/redis.service';

async function warmCache() {
  const prisma = new PrismaClient();
  const redis = new RedisService();

  // Cache top 100 products
  const products = await prisma.product.findMany({
    take: 100,
    orderBy: { views: 'desc' },
  });

  for (const product of products) {
    await redis.set(
      `product:${product.id}`,
      JSON.stringify(product),
      3600, // 1 hour TTL
    );
  }

  console.log('Cache warmed with top 100 products');
}

warmCache();
```

---

## Load Balancer Configuration

### NGINX Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: citadelbuy-ingress
  namespace: citadelbuy
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - citadelbuy.com
    - api.citadelbuy.com
    secretName: citadelbuy-tls
  rules:
  - host: citadelbuy.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: citadelbuy-web
            port:
              number: 80
  - host: api.citadelbuy.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: citadelbuy-api
            port:
              number: 80
```

### Load Balancing Algorithms

**Round Robin (Default):**
```yaml
# Distributes requests evenly across all pods
# Good for: Uniform workloads
```

**Least Connections:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: citadelbuy-api
  annotations:
    service.kubernetes.io/topology-aware-hints: "auto"
spec:
  selector:
    app: citadelbuy-api
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

**IP Hash (Session Affinity):**
```yaml
# Use when sessions are not shared via Redis
apiVersion: v1
kind: Service
metadata:
  name: citadelbuy-api
spec:
  sessionAffinity: ClientIP
```

### Health Check Configuration

```yaml
# Kubernetes Service with health checks
apiVersion: v1
kind: Service
metadata:
  name: citadelbuy-api
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/api/health"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-timeout: "5"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: "2"
```

---

## Auto-Scaling Setup

### Horizontal Pod Autoscaler (HPA)

**CPU-Based Autoscaling:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: citadelbuy-api-hpa
  namespace: citadelbuy
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: citadelbuy-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
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

**Custom Metrics Autoscaling:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: citadelbuy-api-custom-hpa
  namespace: citadelbuy
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: citadelbuy-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  # Request per second
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  # Response time
  - type: Pods
    pods:
      metric:
        name: http_request_duration_p95
      target:
        type: AverageValue
        averageValue: "500m"
```

### Vertical Pod Autoscaler (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: citadelbuy-api-vpa
  namespace: citadelbuy
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: citadelbuy-api
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 2
        memory: 2Gi
      controlledResources:
      - cpu
      - memory
```

### Cluster Autoscaler

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler
  namespace: kube-system
data:
  cluster-autoscaler: |
    --balance-similar-node-groups
    --skip-nodes-with-system-pods=false
    --scale-down-enabled=true
    --scale-down-delay-after-add=10m
    --scale-down-unneeded-time=10m
    --min-replica-count=3
    --max-node-provision-time=15m
```

---

## Capacity Planning Guidelines

### Traffic Forecasting

**Current Metrics (Baseline):**
- Daily Active Users: 10,000
- Peak Requests/Second: 500
- Average Response Time: 150ms
- Database Size: 50GB
- Redis Memory: 4GB

**Growth Projections:**

| Metric | 3 Months | 6 Months | 12 Months |
|--------|----------|----------|-----------|
| DAU | 20,000 | 40,000 | 100,000 |
| Peak RPS | 1,000 | 2,000 | 5,000 |
| DB Size | 100GB | 200GB | 500GB |
| Redis Memory | 8GB | 16GB | 32GB |

### Resource Planning Formula

**API Pods Required:**
```
Pods = (Peak RPS / RPS per Pod) × Safety Factor
     = (5000 / 500) × 1.3
     = 13 pods
```

**Database Connections Required:**
```
Connections = Pods × Connections per Pod
            = 13 × 20
            = 260 connections

Ensure max_connections > 260 (recommend 350)
```

**Redis Memory Required:**
```
Memory = Active Users × Average Session Size
       = 100,000 × 10KB
       = 1GB (sessions only)

Add cache: 10GB
Add queues: 2GB
Total: 13GB minimum, provision 16GB
```

### Cost Optimization

**Resource Right-Sizing:**

```bash
# Analyze actual resource usage over 30 days
kubectl top pods -n citadelbuy --containers | \
  awk '{sum+=$3} END {print "Avg CPU: " sum/NR "m"}'

# Adjust based on actual usage
# Target: 60-70% utilization during normal load
```

**Reserved Capacity:**
- Reserve 30% for baseline workload
- Save 20-40% on compute costs
- Lock in for 1-3 years

**Spot Instances for Non-Critical:**
- Use for worker pods
- Save 70-90% on compute
- Implement graceful shutdown

### Monitoring Capacity Metrics

```yaml
# Prometheus alerts for capacity planning
groups:
- name: capacity
  rules:
  - alert: HighCPUUsage
    expr: avg(rate(container_cpu_usage_seconds_total[5m])) > 0.7
    for: 15m
    annotations:
      summary: "CPU usage high, consider scaling"

  - alert: HighMemoryUsage
    expr: avg(container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.8
    for: 15m
    annotations:
      summary: "Memory usage high, consider scaling"

  - alert: DatabaseStorageHigh
    expr: (pg_database_size_bytes / pg_database_size_limit_bytes) > 0.8
    for: 1h
    annotations:
      summary: "Database storage >80%, expand soon"
```

---

## Performance Benchmarks

### Load Testing Setup

```bash
# Install k6 for load testing
brew install k6  # macOS
# OR
choco install k6  # Windows

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function () {
  const res = http.get('https://api.citadelbuy.com/api/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Response Time (P50) | <200ms | 150ms | ✅ |
| Response Time (P95) | <500ms | 350ms | ✅ |
| Response Time (P99) | <1000ms | 800ms | ✅ |
| Error Rate | <0.1% | 0.05% | ✅ |
| Throughput | >1000 RPS | 800 RPS | ⚠️ |
| Database Query Time | <100ms | 75ms | ✅ |
| Cache Hit Rate | >90% | 88% | ⚠️ |

### Bottleneck Identification

```bash
# Profile API endpoints
kubectl exec -it deployment/citadelbuy-api -n citadelbuy -- \
  npm run profile

# Analyze slow queries
kubectl run psql-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h postgres -U citadelbuy -d citadelbuy_production \
  -c "SELECT query, calls, mean_exec_time, max_exec_time
      FROM pg_stat_statements
      ORDER BY mean_exec_time DESC
      LIMIT 20;"

# Check Redis slowlog
kubectl exec -it deployment/redis -n citadelbuy -- \
  redis-cli SLOWLOG GET 10
```

---

## Appendix

### Scaling Decision Tree

```
Start
  │
  ├─ High CPU/Memory? ─Yes─> Scale Horizontally (add pods)
  │                    └No──┐
  │                          │
  ├─ Slow database? ────Yes─> Add read replicas / optimize queries
  │                    └No──┐
  │                          │
  ├─ Cache miss rate high? ─Yes─> Increase Redis memory / add nodes
  │                         └No──┐
  │                               │
  ├─ High request latency? ─Yes─> Check network / add CDN
  │                         └No──┐
  │                               │
  └─ Optimize application code ──┘
```

### Useful Commands

```bash
# Check HPA status
kubectl get hpa -n citadelbuy

# View pod resource usage
kubectl top pods -n citadelbuy

# View node resource usage
kubectl top nodes

# Check cluster capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Drain node for maintenance
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Uncordon node
kubectl uncordon <node-name>
```

---

**Document Version History:**

- v1.0.0 (2025-12-03): Initial scaling guidelines
