# CitadelBuy Docker Infrastructure

Comprehensive Docker Compose setup for the CitadelBuy e-commerce platform with complete application stack and monitoring.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Docker Compose Files](#docker-compose-files)
- [Services](#services)
- [Monitoring Stack](#monitoring-stack)
- [Nginx Configuration](#nginx-configuration)
- [Redis Configuration](#redis-configuration)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This Docker infrastructure provides three deployment configurations:
- **Basic** (`docker-compose.yml`) - Database and cache services for local development
- **Full Stack** (`docker-compose.full.yml`) - Complete stack with monitoring for development
- **Production** (`docker-compose.production.yml`) - Production-ready configuration with all services

### Key Features

- **Multi-service architecture**: Backend, Frontend, PostgreSQL, Redis, MongoDB, RabbitMQ, Elasticsearch
- **Monitoring stack**: Prometheus, Grafana, Node Exporter, cAdvisor
- **Reverse proxy**: Nginx with caching, rate limiting, and SSL support
- **High availability**: Health checks, auto-restart policies, resource limits
- **Security**: Network isolation, secret management, security headers
- **Observability**: Structured logging, metrics collection, distributed tracing

## Directory Structure

```
docker/
├── docker-compose.yml              # Basic development stack
├── docker-compose.full.yml         # Full stack with monitoring
├── docker-compose.production.yml   # Production configuration
├── .env.example                    # Environment variables template
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml         # Prometheus configuration
│   │   └── alerts/
│   │       └── citadelbuy-alerts.yml  # Alert rules
│   └── grafana/
│       ├── datasources/
│       │   └── prometheus.yml     # Grafana datasource config
│       └── dashboards/
│           └── dashboard-provider.yml  # Dashboard provisioning
├── nginx/
│   ├── nginx.conf                 # Main Nginx configuration
│   ├── conf.d/
│   │   └── citadelbuy.conf       # Site-specific configuration
│   └── ssl/                       # SSL certificates (production)
└── redis/
    └── redis.conf                 # Redis configuration
```

## Docker Compose Files

### docker-compose.yml - Basic Development Stack

Minimal setup for local development with essential services only.

**Services:**
- PostgreSQL 16
- Redis 7
- pgAdmin 4 (optional)

**Use case:** Local backend/frontend development without monitoring overhead

**Start:**
```bash
docker compose up -d
```

**Features:**
- Lightweight footprint
- PostgreSQL with health checks
- Redis with AOF persistence
- pgAdmin for database management

### docker-compose.full.yml - Complete Development Stack

Full-featured development environment with application services and monitoring.

**Services:**
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Applications**: Backend (NestJS), Frontend (Next.js)
- **Proxy**: Nginx reverse proxy
- **Monitoring**: Prometheus, Grafana, Node Exporter, cAdvisor
- **Management**: pgAdmin

**Use case:** Local development with production-like monitoring and observability

**Start:**
```bash
docker compose -f docker-compose.full.yml up -d
```

**Features:**
- Complete application stack
- Metrics collection with Prometheus
- Grafana dashboards for visualization
- Container monitoring with cAdvisor
- System metrics with Node Exporter
- Nginx caching and rate limiting
- Structured logging (JSON)

**Architecture:**
```
Internet → Nginx (80/443)
              ├─→ Frontend (3000)
              └─→ Backend (4000)
                      ├─→ PostgreSQL (5432)
                      └─→ Redis (6379)

Monitoring ← Prometheus (9090) ← [Node Exporter, cAdvisor, Backend, Frontend]
                  └─→ Grafana (3001)
```

### docker-compose.production.yml - Production Configuration

Production-ready setup with advanced features, multiple databases, and message queuing.

**Services:**
- **Databases**: PostgreSQL 16, MongoDB 7
- **Cache**: Redis 7 with password protection
- **Message Queue**: RabbitMQ 3.12 with management UI
- **Search**: Elasticsearch 8.11
- **Applications**: Backend (NestJS), Frontend (Next.js)
- **Proxy**: Nginx with WAF-ready configuration
- **Monitoring**: Prometheus, Grafana

**Use case:** Production deployment with complete e-commerce infrastructure

**Start:**
```bash
docker compose -f docker-compose.production.yml up -d
```

**Features:**
- Multi-database architecture (PostgreSQL + MongoDB)
- RabbitMQ for async processing
- Elasticsearch for search and analytics
- Resource limits and reservations
- Advanced PostgreSQL tuning
- Production-grade security headers
- Geo-redundant storage support
- High availability configuration

**Key Differences from Full Stack:**
- Backend replicas (2 instances)
- Resource limits enforced
- MongoDB for document storage
- RabbitMQ for message queuing
- Elasticsearch integration
- Production environment variables
- SSL/TLS ready
- Advanced logging configuration

## Services

### Backend (NestJS)

**Image:** `citadelplatforms/citadelbuy-ecommerce:backend-latest`
**Port:** 4000
**Health check:** `http://localhost:4000/health`

**Environment Variables:**
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@postgres:5432/citadelbuy_prod
REDIS_URL=redis://:password@redis:6379
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1h
```

**Resource Limits (Production):**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
  replicas: 2
```

**Features:**
- RESTful API with GraphQL support
- WebSocket connections for real-time features
- Database connection pooling
- Redis caching layer
- Metrics endpoint (`/metrics`)
- Health check endpoint (`/health`)

### Frontend (Next.js)

**Image:** `citadelplatforms/citadelbuy-ecommerce:frontend-latest`
**Port:** 3000
**Health check:** `http://localhost:3000/health`

**Environment Variables:**
```bash
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_WS_URL=ws://localhost/ws
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_...
```

**Resource Limits (Production):**
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Features:**
- Server-side rendering (SSR)
- Static site generation (SSG)
- Image optimization
- Code splitting
- SEO optimization

### PostgreSQL 16

**Image:** `postgres:16-alpine`
**Port:** 5432
**Data volume:** `postgres-data`

**Default Configuration:**
```bash
POSTGRES_USER=citadelbuy
POSTGRES_PASSWORD=citadelbuy123  # Change in production!
POSTGRES_DB=citadelbuy_dev
```

**Production Tuning:**
```bash
max_connections=200
shared_buffers=512MB
effective_cache_size=2GB
maintenance_work_mem=128MB
checkpoint_completion_target=0.9
wal_buffers=16MB
default_statistics_target=100
random_page_cost=1.1
effective_io_concurrency=200
work_mem=2621kB
min_wal_size=1GB
max_wal_size=4GB
```

**Health Check:**
```bash
pg_isready -U citadelbuy
```

### Redis 7

**Image:** `redis:7-alpine`
**Port:** 6379
**Data volume:** `redis-data`

**Configuration highlights:**
- **Persistence**: AOF (Append Only File) enabled
- **Snapshots**: RDB every 900s, 300s, 60s based on changes
- **Max Memory**: 256MB with `allkeys-lru` eviction
- **Max Clients**: 10,000 connections
- **Replication**: Ready for master-slave setup

**Production features:**
- Password protection
- Persistence to disk
- Memory optimization
- Slow query logging

See [Redis Configuration](#redis-configuration) for details.

### MongoDB 7

**Image:** `mongo:7`
**Port:** 27017
**Data volume:** `mongodb-data`

**Use cases:**
- Product catalogs
- User activity logs
- Session storage
- Analytics data

**Configuration:**
```bash
MONGO_INITDB_ROOT_USERNAME=citadelbuy
MONGO_INITDB_ROOT_PASSWORD=secure_password
MONGO_INITDB_DATABASE=citadelbuy
```

### RabbitMQ 3.12

**Image:** `rabbitmq:3.12-management-alpine`
**Ports:**
- 5672 - AMQP protocol
- 15672 - Management UI

**Use cases:**
- Order processing
- Email notifications
- Background jobs
- Event-driven workflows

**Management UI:** http://localhost:15672
**Default credentials:** citadelbuy / password

### Elasticsearch 8.11

**Image:** `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`
**Ports:**
- 9200 - REST API
- 9300 - Node communication

**Use cases:**
- Product search
- Full-text search
- Analytics
- Log aggregation

**Configuration:**
```bash
discovery.type=single-node
xpack.security.enabled=false
ES_JAVA_OPTS=-Xms512m -Xmx512m
```

### Nginx Reverse Proxy

**Image:** `nginx:alpine` / `nginx:1.25-alpine`
**Ports:**
- 80 - HTTP
- 443 - HTTPS

**Features:**
- Load balancing with `least_conn` algorithm
- API caching (5 minutes)
- Static asset caching (7 days)
- Rate limiting (100 req/s API, 10 req/s auth)
- CORS support
- WebSocket proxying
- Gzip compression
- Security headers

See [Nginx Configuration](#nginx-configuration) for details.

### pgAdmin 4

**Image:** `dpage/pgadmin4:latest`
**Port:** 5050
**Web UI:** http://localhost:5050

**Default credentials:**
```bash
Email: admin@citadelbuy.com
Password: admin123  # Change in production!
```

**Use cases:**
- Database management
- Query execution
- Schema visualization
- Backup/restore operations

## Monitoring Stack

### Prometheus

**Image:** `prom/prometheus:latest`
**Port:** 9090
**Web UI:** http://localhost:9090

**Configuration:** `monitoring/prometheus/prometheus.yml`

**Scrape targets:**
- Prometheus itself (9090)
- Node Exporter (9100) - System metrics
- cAdvisor (8080) - Container metrics
- Backend (4000/metrics) - Application metrics
- Frontend (3000/api/metrics) - Frontend metrics
- PostgreSQL Exporter (9187)
- Redis Exporter (9121)
- Nginx Exporter (9113)

**Features:**
- 15-second scrape interval
- 30-day retention
- Alert rules from `/etc/prometheus/alerts/*.yml`
- Time-series database

**Key Metrics:**
- CPU and memory usage
- Request rates and latencies
- Error rates
- Database connections
- Cache hit rates

**Sample Queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Grafana

**Image:** `grafana/grafana:latest`
**Port:** 3001
**Web UI:** http://localhost:3001

**Default credentials:**
```bash
Username: admin
Password: admin123  # Change on first login!
```

**Features:**
- Pre-configured Prometheus datasource
- Dashboard provisioning
- Alerting
- User management
- Plugin support (grafana-clock-panel)

**Provisioned Resources:**
- **Datasource:** Prometheus (automatic)
- **Dashboards:** Located in `monitoring/grafana/dashboards/`

**Data location:** `grafana-data` volume

### Node Exporter

**Image:** `prom/node-exporter:latest`
**Port:** 9100

**Metrics collected:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- File system usage
- System load

**Use:** System-level monitoring

### cAdvisor

**Image:** `gcr.io/cadvisor/cadvisor:latest`
**Port:** 8080
**Web UI:** http://localhost:8080

**Metrics collected:**
- Container CPU usage
- Container memory usage
- Container network I/O
- Container disk I/O
- Container file system usage

**Use:** Container-level monitoring

**Privileges:** Runs as privileged container to access Docker socket

## Nginx Configuration

### Main Configuration

**File:** `nginx/nginx.conf`

**Key Settings:**

**Performance:**
```nginx
worker_processes auto;
worker_rlimit_nofile 65535;
worker_connections 4096;
use epoll;
multi_accept on;
```

**Compression:**
```nginx
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_types application/javascript application/json text/css ...
```

**Rate Limiting:**
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;
```

**Upstream Configuration:**
```nginx
upstream backend_api {
    least_conn;
    server backend:4000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream frontend_app {
    least_conn;
    server frontend:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

**Caching:**
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m
    max_size=1g inactive=60m use_temp_path=off;

proxy_cache_path /var/cache/nginx/static levels=1:2 keys_zone=static_cache:10m
    max_size=2g inactive=7d use_temp_path=off;
```

### Site Configuration

**File:** `nginx/conf.d/citadelbuy.conf`

**Route Configuration:**

**1. Health Check Endpoint:**
```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
}
```

**2. API Routes:**
```nginx
location /api/ {
    limit_req zone=api_limit burst=100 nodelay;
    proxy_pass http://backend_api;
    proxy_cache api_cache;
    proxy_cache_valid 200 302 5m;
}
```

**3. Authentication Routes (Strict Rate Limiting):**
```nginx
location ~* ^/api/(auth|login|register|reset-password) {
    limit_req zone=auth_limit burst=5 nodelay;
    proxy_pass http://backend_api;
    proxy_no_cache 1;
}
```

**4. WebSocket Routes:**
```nginx
location /ws/ {
    proxy_pass http://backend_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

**5. Static Assets:**
```nginx
location /_next/static/ {
    proxy_pass http://frontend_app;
    proxy_cache static_cache;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Security Headers:**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self' 'unsafe-inline'..." always;
```

**CORS Configuration:**
```nginx
add_header 'Access-Control-Allow-Origin' '$http_origin' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type...' always;
```

### SSL Configuration (Production)

Uncomment SSL blocks in `citadelbuy.conf` for production:

```nginx
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;
```

**Place certificates in:** `nginx/ssl/`

## Redis Configuration

**File:** `redis/redis.conf`

### Key Settings

**Network:**
```
bind 0.0.0.0
port 6379
tcp-keepalive 300
```

**Persistence - RDB Snapshots:**
```
save 900 1       # Save after 900 seconds if at least 1 key changed
save 300 10      # Save after 300 seconds if at least 10 keys changed
save 60 10000    # Save after 60 seconds if at least 10000 keys changed
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data
```

**Persistence - AOF (Append Only File):**
```
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**Memory Management:**
```
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5
```

**Limits:**
```
maxclients 10000
```

**Slow Query Logging:**
```
slowlog-log-slower-than 10000  # 10 milliseconds
slowlog-max-len 128
```

**Security (Production):**
```
requirepass yourpasswordhere  # Uncomment and set strong password
```

### Memory Eviction Policies

- `allkeys-lru` - Evict any key using LRU algorithm (recommended for cache)
- `volatile-lru` - Evict keys with TTL using LRU
- `allkeys-random` - Evict random keys
- `volatile-ttl` - Evict keys with shortest TTL
- `noeviction` - Return error when memory limit reached

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum (16GB recommended for full stack)
- 20GB free disk space

### Basic Development Setup

**1. Start database services:**
```bash
cd citadelbuy/infrastructure/docker
docker compose up -d
```

**2. Verify services:**
```bash
docker compose ps
```

**3. Check logs:**
```bash
docker compose logs -f postgres
docker compose logs -f redis
```

**4. Access pgAdmin:**
```
URL: http://localhost:5050
Email: admin@citadelbuy.com
Password: admin123
```

**5. Stop services:**
```bash
docker compose down
```

### Full Stack Development Setup

**1. Create environment file:**
```bash
cp .env.example .env
# Edit .env with your values
```

**2. Start all services:**
```bash
docker compose -f docker-compose.full.yml up -d
```

**3. Wait for services to be healthy:**
```bash
docker compose -f docker-compose.full.yml ps
```

**4. Access services:**
```
Frontend:    http://localhost:3000
Backend API: http://localhost:4000
pgAdmin:     http://localhost:5050
Prometheus:  http://localhost:9090
Grafana:     http://localhost:3001
cAdvisor:    http://localhost:8080
```

**5. View logs:**
```bash
# All services
docker compose -f docker-compose.full.yml logs -f

# Specific service
docker compose -f docker-compose.full.yml logs -f backend
```

**6. Restart a service:**
```bash
docker compose -f docker-compose.full.yml restart backend
```

**7. Stop all services:**
```bash
docker compose -f docker-compose.full.yml down
```

### Production Deployment

**1. Set production environment variables:**
```bash
cp .env.example .env.production

# Required production variables:
# - Strong passwords for all services
# - JWT secrets
# - Payment gateway credentials
# - Email service credentials
# - AWS/Cloud storage credentials
```

**2. Configure SSL certificates:**
```bash
# Place certificates in nginx/ssl/
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/
```

**3. Build application images:**
```bash
# Backend
cd ../../backend
docker build -t citadelplatforms/citadelbuy-ecommerce:backend-latest .

# Frontend
cd ../frontend
docker build -t citadelplatforms/citadelbuy-ecommerce:frontend-latest .

cd ../infrastructure/docker
```

**4. Start production stack:**
```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

**5. Verify deployment:**
```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=100
```

**6. Run database migrations:**
```bash
docker compose -f docker-compose.production.yml exec backend npm run migrate:deploy
```

**7. Monitor services:**
```
Grafana: http://localhost:3001
Prometheus: http://localhost:9090
```

## Environment Variables

### Required Variables

Create a `.env` file from `.env.example`:

```bash
# ==================================
# Database Configuration
# ==================================
POSTGRES_USER=citadelbuy
POSTGRES_PASSWORD=secure_password_here  # CHANGE THIS!
POSTGRES_DB=citadelbuy_prod

# ==================================
# Redis Configuration
# ==================================
REDIS_PASSWORD=secure_redis_password  # CHANGE THIS!

# ==================================
# MongoDB Configuration
# ==================================
MONGO_USER=citadelbuy
MONGO_PASSWORD=secure_mongo_password  # CHANGE THIS!

# ==================================
# RabbitMQ Configuration
# ==================================
RABBITMQ_USER=citadelbuy
RABBITMQ_PASSWORD=secure_rabbitmq_password  # CHANGE THIS!

# ==================================
# Application Configuration
# ==================================
NODE_ENV=production
JWT_SECRET=your_jwt_secret_min_32_chars  # CHANGE THIS!
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars  # CHANGE THIS!
JWT_REFRESH_EXPIRES_IN=7d

# ==================================
# Frontend Configuration
# ==================================
NEXT_PUBLIC_API_URL=https://api.citadelbuy.com
NEXT_PUBLIC_WS_URL=wss://api.citadelbuy.com/ws
NEXT_PUBLIC_APP_URL=https://citadelbuy.com

# ==================================
# Email Configuration
# ==================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@citadelbuy.com
EMAIL_PASSWORD=email_app_password  # CHANGE THIS!
EMAIL_FROM=CitadelBuy <noreply@citadelbuy.com>

# ==================================
# Payment Providers
# ==================================
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# ==================================
# External Services
# ==================================
# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=citadelbuy-uploads

# Algolia (Search)
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...

# Sentry (Error Tracking)
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Google Analytics
GOOGLE_ANALYTICS_ID=G-...
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-...

# ==================================
# Monitoring Configuration
# ==================================
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure_grafana_password  # CHANGE THIS!

# ==================================
# Database Admin Tools
# ==================================
PGADMIN_EMAIL=admin@citadelbuy.com
PGADMIN_PASSWORD=secure_pgadmin_password  # CHANGE THIS!

# ==================================
# CORS Configuration
# ==================================
CORS_ORIGIN=https://citadelbuy.com

# ==================================
# Database Connection Pooling
# ==================================
DATABASE_CONNECTION_LIMIT=20
DATABASE_POOL_TIMEOUT=10
```

### Environment-Specific Files

**Development:**
```bash
# .env.development
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000
DATABASE_URL=postgresql://citadelbuy:citadelbuy123@localhost:5432/citadelbuy_dev
```

**Staging:**
```bash
# .env.staging
NODE_ENV=staging
NEXT_PUBLIC_API_URL=https://staging-api.citadelbuy.com
DATABASE_URL=postgresql://citadelbuy:password@staging-db:5432/citadelbuy_staging
```

**Production:**
```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.citadelbuy.com
DATABASE_URL=postgresql://citadelbuy:strongpassword@prod-db:5432/citadelbuy_prod
```

## Usage Examples

### Starting Specific Services

```bash
# Start only database services
docker compose up -d postgres redis

# Start with monitoring
docker compose -f docker-compose.full.yml up -d prometheus grafana

# Start entire production stack
docker compose -f docker-compose.production.yml up -d
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend

# Follow logs with timestamps
docker compose logs -f -t backend

# Multiple services
docker compose logs -f backend frontend nginx
```

### Executing Commands in Containers

```bash
# Backend shell
docker compose exec backend sh

# Run migrations
docker compose exec backend npm run migrate:deploy

# Generate Prisma client
docker compose exec backend npx prisma generate

# PostgreSQL shell
docker compose exec postgres psql -U citadelbuy -d citadelbuy_dev

# Redis CLI
docker compose exec redis redis-cli

# MongoDB shell
docker compose -f docker-compose.production.yml exec mongodb mongosh

# RabbitMQ management
docker compose -f docker-compose.production.yml exec rabbitmq rabbitmqctl status
```

### Database Operations

**PostgreSQL:**
```bash
# Backup database
docker compose exec postgres pg_dump -U citadelbuy citadelbuy_dev > backup.sql

# Restore database
docker compose exec -T postgres psql -U citadelbuy citadelbuy_dev < backup.sql

# Create new database
docker compose exec postgres createdb -U citadelbuy new_database

# List databases
docker compose exec postgres psql -U citadelbuy -c "\l"

# Connect to database
docker compose exec postgres psql -U citadelbuy -d citadelbuy_dev
```

**Redis:**
```bash
# Check Redis info
docker compose exec redis redis-cli info

# Monitor commands
docker compose exec redis redis-cli monitor

# Get all keys (development only!)
docker compose exec redis redis-cli keys "*"

# Flush cache (DANGEROUS - development only!)
docker compose exec redis redis-cli flushall

# Get specific key
docker compose exec redis redis-cli get "user:session:123"
```

### Scaling Services

```bash
# Scale backend to 3 replicas
docker compose -f docker-compose.production.yml up -d --scale backend=3

# Scale down to 1 replica
docker compose -f docker-compose.production.yml up -d --scale backend=1
```

### Resource Usage

```bash
# View resource usage
docker stats

# Container disk usage
docker compose ps -q | xargs docker inspect --format='{{.Name}}: {{.SizeRootFs}}'

# Volume disk usage
docker volume ls -q | xargs docker volume inspect --format='{{.Name}}: {{.Mountpoint}}'
```

### Cleaning Up

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (DANGER: Deletes data!)
docker compose down -v

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Complete cleanup (DANGER: Removes all unused resources!)
docker system prune -a --volumes
```

### Health Checks

```bash
# Check health status
docker compose ps

# Detailed health check
docker inspect citadelbuy-backend | jq '.[0].State.Health'

# Test backend health endpoint
curl http://localhost:4000/health

# Test frontend health endpoint
curl http://localhost:3000/health

# Test through Nginx
curl http://localhost/health
```

### Troubleshooting Container Issues

```bash
# View container processes
docker compose top

# Inspect container
docker compose exec backend env

# Check container events
docker events --filter container=citadelbuy-backend

# Restart unhealthy containers
docker compose ps --filter "health=unhealthy" -q | xargs docker restart
```

## Best Practices

### Development

1. **Use volumes for hot reload:**
   ```yaml
   volumes:
     - ../../backend/src:/app/src:ro
   ```

2. **Keep services lightweight:**
   - Use `docker-compose.yml` for basic development
   - Only use full stack when needed

3. **Monitor resource usage:**
   ```bash
   docker stats
   ```

4. **Use health checks for reliability**

5. **Separate development and production configs**

### Production

1. **Use specific image tags:**
   ```yaml
   image: citadelplatforms/citadelbuy-ecommerce:backend-v2.0.0
   ```

2. **Set resource limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2.0'
         memory: 2G
   ```

3. **Enable restart policies:**
   ```yaml
   restart: unless-stopped
   ```

4. **Use secrets management:**
   ```yaml
   secrets:
     - db_password
   ```

5. **Implement logging drivers:**
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

6. **Network isolation:**
   ```yaml
   networks:
     - frontend-network
     - backend-network
   ```

7. **Regular backups:**
   ```bash
   # Automated backup script
   docker compose exec postgres pg_dump -U citadelbuy citadelbuy_prod | gzip > backup-$(date +%Y%m%d).sql.gz
   ```

8. **Monitor with Prometheus/Grafana**

9. **Use SSL/TLS:**
   - Configure SSL certificates in Nginx
   - Enable HTTPS redirect

10. **Security scanning:**
    ```bash
    docker scan citadelplatforms/citadelbuy-ecommerce:backend-latest
    ```

### Security

1. **Change default passwords:**
   - PostgreSQL
   - Redis
   - MongoDB
   - RabbitMQ
   - pgAdmin
   - Grafana

2. **Use environment variables for secrets**

3. **Enable Redis password protection:**
   ```bash
   requirepass your_secure_password
   ```

4. **Restrict network access:**
   ```yaml
   networks:
     citadelbuy-network:
       internal: true
   ```

5. **Regular security updates:**
   ```bash
   docker compose pull
   docker compose up -d
   ```

### Performance

1. **Use connection pooling:**
   - PostgreSQL: max_connections=200
   - Backend: DATABASE_CONNECTION_LIMIT=20

2. **Enable caching:**
   - Nginx proxy cache
   - Redis for application cache
   - Static asset caching

3. **Optimize PostgreSQL:**
   - Tune shared_buffers
   - Adjust work_mem
   - Configure effective_cache_size

4. **Monitor metrics:**
   - Use Prometheus queries
   - Set up Grafana alerts
   - Monitor resource usage

5. **Load balancing:**
   - Use Nginx upstream
   - Scale backend replicas

## Troubleshooting

### Common Issues

**1. Container Won't Start**
```bash
# Check logs
docker compose logs container_name

# Check if port is already in use
netstat -tuln | grep PORT_NUMBER

# Kill process using port
lsof -ti:PORT_NUMBER | xargs kill -9

# Rebuild container
docker compose build --no-cache container_name
docker compose up -d container_name
```

**2. Database Connection Errors**
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec backend psql postgresql://citadelbuy:password@postgres:5432/citadelbuy_dev

# Check logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

**3. Health Check Failing**
```bash
# Check health status
docker inspect citadelbuy-backend --format='{{json .State.Health}}' | jq

# Test health endpoint manually
docker compose exec backend curl http://localhost:4000/health

# Check application logs
docker compose logs backend
```

**4. Out of Memory**
```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Docker Desktop: Settings → Resources → Memory

# Set container memory limits
# Add to docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 1G
```

**5. Disk Space Issues**
```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Remove specific volumes
docker volume rm citadelbuy-postgres-data
```

**6. Network Issues**
```bash
# List networks
docker network ls

# Inspect network
docker network inspect citadelbuy_citadelbuy-network

# Recreate network
docker compose down
docker network rm citadelbuy_citadelbuy-network
docker compose up -d
```

**7. Redis Connection Issues**
```bash
# Test Redis connection
docker compose exec backend sh -c 'redis-cli -h redis ping'

# Check Redis logs
docker compose logs redis

# Verify Redis is accepting connections
docker compose exec redis redis-cli info clients
```

**8. Nginx 502 Bad Gateway**
```bash
# Check backend is running
docker compose ps backend

# Check Nginx logs
docker compose logs nginx

# Test backend health
curl http://localhost:4000/health

# Reload Nginx configuration
docker compose exec nginx nginx -s reload
```

**9. Permission Denied Errors**
```bash
# Fix volume permissions
docker compose down
sudo chown -R $USER:$USER ./volumes/
docker compose up -d

# Run as specific user
docker compose exec --user root container_name sh
```

**10. Prometheus Not Scraping Targets**
```bash
# Check Prometheus configuration
docker compose exec prometheus cat /etc/prometheus/prometheus.yml

# Check targets status
# Open: http://localhost:9090/targets

# Verify network connectivity
docker compose exec prometheus wget -O- http://backend:4000/metrics
```

### Debugging Commands

```bash
# Container status
docker compose ps
docker compose ps -a

# Detailed container info
docker inspect citadelbuy-backend

# Network connectivity test
docker compose exec backend ping postgres
docker compose exec backend nc -zv postgres 5432

# Environment variables
docker compose exec backend env

# Process list
docker compose top backend

# Resource usage
docker stats --no-stream

# File system changes
docker diff citadelbuy-backend
```

### Performance Issues

**Slow database queries:**
```bash
# Enable slow query logging in PostgreSQL
docker compose exec postgres psql -U citadelbuy -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
docker compose restart postgres

# Check slow queries
docker compose logs postgres | grep "duration:"
```

**High memory usage:**
```bash
# Check memory stats
docker stats --no-stream

# Adjust PostgreSQL shared_buffers
# Adjust Redis maxmemory
# Set container memory limits
```

**High CPU usage:**
```bash
# Check CPU stats
docker stats --no-stream

# Profile backend application
docker compose exec backend node --prof app.js

# Check for CPU-intensive processes
docker compose top backend
```

### Getting Help

**Logs Location:**
```
Container logs: /var/lib/docker/containers/
Nginx logs:     nginx-logs volume
PostgreSQL:     Check with docker compose logs postgres
```

**Useful Resources:**
- Docker Compose documentation: https://docs.docker.com/compose/
- PostgreSQL documentation: https://www.postgresql.org/docs/
- Nginx documentation: https://nginx.org/en/docs/
- Redis documentation: https://redis.io/documentation

**Check Service Status:**
```bash
# All services
docker compose ps

# With health status
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

## Additional Resources

- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Nginx Configuration Best Practices](https://www.nginx.com/blog/nginx-high-performance-caching/)
- [Redis Best Practices](https://redis.io/topics/admin)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Tutorials](https://grafana.com/tutorials/)

## Support

For issues or questions:
- Check logs: `docker compose logs service_name`
- Review configuration files
- Check GitHub issues: https://github.com/oks-citadel/citadelbuy/issues
- Contact: dev@citadelbuy.com

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.
