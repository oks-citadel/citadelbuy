# CitadelBuy Production Deployment Guide

## Overview

This guide covers deploying the CitadelBuy platform to production using Docker containers. The platform uses multi-stage Docker builds for minimal image sizes and enhanced security.

## Files Created

### 1. apps/api/Dockerfile.production
**NestJS API Production Dockerfile**

- Multi-stage build with 4 stages (deps, builder, prod-deps, runner)
- Node.js 20 Alpine base (~200-300MB final image)
- Non-root user (nestjs:1001)
- Prisma client generation included
- Health check on port 4000
- Production dependencies only in final image

**Key Features:**
- Security: Non-root user, minimal attack surface
- Size: Production dependencies only, no source code
- Performance: Optimized build caching, dumb-init for signal handling
- Reliability: Health checks, proper shutdown handling

### 2. apps/web/Dockerfile.production
**Next.js Frontend Production Dockerfile**

- Multi-stage build with 3 stages (deps, builder, runner)
- Next.js standalone output mode (~150-250MB final image)
- Node.js 20 Alpine base
- Non-root user (nextjs:1001)
- Build-time environment variables for client-side code
- Health check on port 3000

**Key Features:**
- Security: Non-root user, no source code in final image
- Size: Standalone output with minimal dependencies
- Performance: Static file optimization, standalone server
- Build Args: Environment variables baked into bundle at build time

### 3. docker-compose.production.yml
**Production Docker Compose Configuration**

**Services:**
- NGINX: Reverse proxy and load balancer
- Web: Next.js frontend (2 replicas)
- API: NestJS backend (3 replicas)
- PostgreSQL: Primary database
- Redis: Cache and session store
- RabbitMQ: Message queue
- MongoDB: Document store
- Elasticsearch: Search engine
- Prometheus: Metrics collection
- Grafana: Monitoring dashboard

**Networks:**
- `frontend`: Web and NGINX only
- `backend`: API and services
- `database`: Database services (internal only)
- `monitoring`: Prometheus and Grafana

**Volumes:**
- Persistent storage for all databases
- Log volumes for debugging
- Bind mounts for configuration

## Quick Start

### 1. Prerequisites

```bash
# Required software
- Docker 24.0+
- Docker Compose 2.20+
- At least 16GB RAM
- 50GB disk space

# Verify installation
docker --version
docker-compose --version
```

### 2. Environment Setup

```bash
# Navigate to organization directory
cd C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization

# Create production environment file
cp apps/api/.env.example .env.production

# Generate secure secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
openssl rand -base64 32  # POSTGRES_PASSWORD
openssl rand -base64 32  # REDIS_PASSWORD
openssl rand -base64 32  # RABBITMQ_PASSWORD
openssl rand -base64 32  # MONGO_PASSWORD
openssl rand -base64 32  # ELASTICSEARCH_PASSWORD
```

### 3. Configure Environment Variables

Edit `.env.production` with your production values:

```env
# Application
NODE_ENV=production
VERSION=1.0.0

# Database
POSTGRES_USER=citadelbuy
POSTGRES_PASSWORD=<generated-secret>
POSTGRES_DB=citadelbuy_prod

# Redis
REDIS_PASSWORD=<generated-secret>

# MongoDB
MONGO_USER=citadelbuy
MONGO_PASSWORD=<generated-secret>

# RabbitMQ
RABBITMQ_USER=citadelbuy
RABBITMQ_PASSWORD=<generated-secret>

# Elasticsearch
ELASTICSEARCH_PASSWORD=<generated-secret>

# JWT
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email (use your SMTP provider)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@citadelbuy.com
EMAIL_PASSWORD=<your-email-password>
EMAIL_FROM=CitadelBuy <noreply@citadelbuy.com>

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# PayPal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=production

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=citadelbuy-prod

# Algolia
ALGOLIA_APP_ID=xxx
ALGOLIA_API_KEY=xxx
ALGOLIA_SEARCH_KEY=xxx

# OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx

FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
NEXT_PUBLIC_FACEBOOK_APP_ID=xxx

GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
NEXT_PUBLIC_GITHUB_CLIENT_ID=xxx

# URLs
NEXT_PUBLIC_API_URL=https://api.citadelbuy.com
NEXT_PUBLIC_WS_URL=wss://api.citadelbuy.com
NEXT_PUBLIC_APP_URL=https://citadelbuy.com
NEXT_PUBLIC_CDN_URL=https://cdn.citadelbuy.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<generated-secret>
GRAFANA_ROOT_URL=https://monitoring.citadelbuy.com

# CORS
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_AR_TRYON=true
NEXT_PUBLIC_ENABLE_VOICE_SEARCH=true
NEXT_PUBLIC_ENABLE_CHATBOT=true
```

### 4. Create Volume Directories

```bash
# Create persistent volume directories
mkdir -p volumes/postgres
mkdir -p volumes/mongodb
mkdir -p volumes/redis
mkdir -p volumes/rabbitmq
mkdir -p volumes/elasticsearch

# Set proper permissions
chmod 700 volumes/postgres
chmod 700 volumes/mongodb
```

### 5. Build Docker Images

```bash
# Build all images
docker-compose -f docker-compose.production.yml build

# Build specific service
docker-compose -f docker-compose.production.yml build api
docker-compose -f docker-compose.production.yml build web

# Build with no cache (clean build)
docker-compose -f docker-compose.production.yml build --no-cache
```

### 6. Start Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Start specific services
docker-compose -f docker-compose.production.yml up -d postgres redis
docker-compose -f docker-compose.production.yml up -d api web

# View startup logs
docker-compose -f docker-compose.production.yml logs -f
```

### 7. Run Database Migrations

```bash
# Wait for PostgreSQL to be ready
docker-compose -f docker-compose.production.yml exec postgres \
  pg_isready -U citadelbuy

# Run Prisma migrations
docker-compose -f docker-compose.production.yml exec api \
  npx prisma migrate deploy

# Seed production data (if needed)
docker-compose -f docker-compose.production.yml exec api \
  npm run db:seed:prod
```

### 8. Verify Deployment

```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# Check service health
docker-compose -f docker-compose.production.yml exec api \
  curl -f http://localhost:4000/api/health

docker-compose -f docker-compose.production.yml exec web \
  curl -f http://localhost:3000/api/health

# View logs
docker-compose -f docker-compose.production.yml logs -f api
docker-compose -f docker-compose.production.yml logs -f web
```

## Scaling

### Scale API Backend

```bash
# Scale to 5 API instances
docker-compose -f docker-compose.production.yml up -d --scale api=5

# Scale to 10 API instances
docker-compose -f docker-compose.production.yml up -d --scale api=10
```

### Scale Web Frontend

```bash
# Scale to 3 web instances
docker-compose -f docker-compose.production.yml up -d --scale web=3
```

## Monitoring

### Access Monitoring Tools

- **Grafana**: http://localhost:3001
  - Default credentials: admin / (from GRAFANA_ADMIN_PASSWORD)
  - Dashboards for metrics visualization

- **Prometheus**: http://localhost:9090
  - Metrics collection and querying
  - Alert configuration

- **RabbitMQ Management**: http://localhost:15672
  - Queue monitoring
  - Message tracking

### View Metrics

```bash
# View container stats
docker stats

# View resource usage
docker-compose -f docker-compose.production.yml top

# View logs
docker-compose -f docker-compose.production.yml logs -f --tail=100 api
```

## Backup Strategy

### PostgreSQL Backup

```bash
# Create backup
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U citadelbuy citadelbuy_prod > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore backup
cat backup-20250106-120000.sql | \
  docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U citadelbuy citadelbuy_prod
```

### MongoDB Backup

```bash
# Create backup
docker-compose -f docker-compose.production.yml exec mongodb \
  mongodump --out /backup --username citadelbuy --password <password>

# Restore backup
docker-compose -f docker-compose.production.yml exec mongodb \
  mongorestore /backup --username citadelbuy --password <password>
```

### Redis Backup

```bash
# Trigger save
docker-compose -f docker-compose.production.yml exec redis \
  redis-cli BGSAVE

# Copy RDB file
docker cp citadelbuy-redis-prod:/data/dump.rdb ./redis-backup.rdb
```

### Volume Backup

```bash
# Backup PostgreSQL volume
docker run --rm \
  -v citadelbuy_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz /data

# Backup all volumes
docker run --rm \
  -v citadelbuy_mongodb-data:/mongodb \
  -v citadelbuy_redis-data:/redis \
  -v citadelbuy_elasticsearch-data:/elasticsearch \
  -v $(pwd):/backup \
  alpine tar czf /backup/volumes-$(date +%Y%m%d).tar.gz /mongodb /redis /elasticsearch
```

## Security

### SSL/TLS Configuration

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `infrastructure/nginx/ssl/`
3. Update NGINX configuration to use HTTPS

```bash
# Using Let's Encrypt with Certbot
certbot certonly --standalone -d citadelbuy.com -d www.citadelbuy.com
cp /etc/letsencrypt/live/citadelbuy.com/fullchain.pem infrastructure/nginx/ssl/
cp /etc/letsencrypt/live/citadelbuy.com/privkey.pem infrastructure/nginx/ssl/
```

### Security Checklist

- [ ] All passwords are strong and unique
- [ ] Environment variables are not committed to Git
- [ ] SSL/TLS certificates are installed
- [ ] Firewall rules are configured
- [ ] Database ports are not exposed publicly
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] Monitoring and alerting are active
- [ ] Backups are automated
- [ ] Security updates are applied regularly

### Secrets Management

For production, use Docker Swarm secrets or Kubernetes secrets:

```bash
# Docker Swarm example
echo "mypassword" | docker secret create postgres_password -

# Then reference in docker-compose.yml
secrets:
  - postgres_password

environment:
  - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
```

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
docker-compose -f docker-compose.production.yml logs api

# Check container status
docker-compose -f docker-compose.production.yml ps

# Restart service
docker-compose -f docker-compose.production.yml restart api

# Rebuild and restart
docker-compose -f docker-compose.production.yml up -d --build api
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.production.yml exec postgres \
  pg_isready -U citadelbuy

# Test connection from API
docker-compose -f docker-compose.production.yml exec api \
  npx prisma db push --skip-generate

# Check network connectivity
docker-compose -f docker-compose.production.yml exec api \
  ping postgres
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase container memory limits in docker-compose.production.yml
deploy:
  resources:
    limits:
      memory: 4G

# Restart with new limits
docker-compose -f docker-compose.production.yml up -d
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up unused Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a

# Check volume sizes
docker system df -v
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.production.yml build

# Apply changes with zero downtime
docker-compose -f docker-compose.production.yml up -d --no-deps --build api
docker-compose -f docker-compose.production.yml up -d --no-deps --build web
```

### Update Dependencies

```bash
# Update API dependencies
cd apps/api
pnpm update
cd ../..

# Update Web dependencies
cd apps/web
pnpm update
cd ../..

# Rebuild images
docker-compose -f docker-compose.production.yml build
```

### Database Migrations

```bash
# Create new migration
docker-compose -f docker-compose.production.yml exec api \
  npx prisma migrate dev --name add_new_feature

# Apply migration to production
docker-compose -f docker-compose.production.yml exec api \
  npx prisma migrate deploy

# Check migration status
docker-compose -f docker-compose.production.yml exec api \
  npx prisma migrate status
```

## Performance Optimization

### Resource Allocation

Adjust resource limits in `docker-compose.production.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4G
    reservations:
      cpus: '1.0'
      memory: 2G
```

### Database Tuning

PostgreSQL configuration is optimized for production workloads. Adjust based on your hardware:

- `shared_buffers`: 25% of RAM
- `effective_cache_size`: 75% of RAM
- `max_connections`: Based on expected load
- `work_mem`: Divide available RAM by max_connections

### Redis Configuration

Redis is configured with:
- `maxmemory`: 512MB (adjust based on needs)
- `maxmemory-policy`: allkeys-lru
- AOF persistence with fsync everysec

## High Availability

### Database Replication

For production HA, consider:
- PostgreSQL streaming replication
- MongoDB replica sets
- Redis Sentinel or Cluster

### Load Balancing

NGINX is configured as a reverse proxy. For HA:
- Use multiple NGINX instances
- Implement HAProxy or cloud load balancer
- Configure session persistence

### Auto-Healing

Docker Compose restart policies ensure services recover from failures:

```yaml
restart: unless-stopped

deploy:
  restart_policy:
    condition: on-failure
    delay: 5s
    max_attempts: 3
```

## Cost Optimization

### Image Size Comparison

- **API**: ~200-300MB (vs ~1.5GB without multi-stage)
- **Web**: ~150-250MB (vs ~1GB without standalone)

### Resource Usage

Minimum recommended resources:
- 4 CPU cores
- 16GB RAM
- 100GB SSD storage

Production recommended:
- 8+ CPU cores
- 32GB+ RAM
- 500GB SSD storage

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review documentation in `/docs`
- Check health endpoints
- Monitor Grafana dashboards

## License

Copyright (c) 2025 CitadelBuy. All rights reserved.
