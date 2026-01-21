# Broxiva Staging Deployment - Quick Start Guide

**Date:** 2025-12-05
**Status:** ✅ READY FOR DEPLOYMENT

---

## Prerequisites Check

✅ Docker 28.5.1 - AVAILABLE
✅ Docker Compose v2.40.3 - AVAILABLE
✅ kubectl v1.34.1 - AVAILABLE
✅ Node.js v25.1.0 - AVAILABLE
✅ pnpm 10.23.0 - AVAILABLE

---

## Quick Deploy Options

### Option A: Docker Compose (Fastest - 5 Minutes)

```bash
# 1. Go to project root
cd C:/Users/citad/OneDrive/Documents/broxiva-master/organization

# 2. Create .env file (CRITICAL!)
cp .env.example .env
# Edit .env and set secure passwords using: openssl rand -base64 32

# 3. Start all services
docker-compose up -d

# 4. Run migrations
docker-compose exec api npx prisma migrate deploy

# 5. Verify deployment
curl http://localhost:4000/api/health
# Open http://localhost:3000 in browser
```

### Option B: Kubernetes (Production-Like)

```bash
# 1. Go to project root
cd C:/Users/citad/OneDrive/Documents/broxiva-master/organization

# 2. Run automated deployment
./scripts/deploy-staging.sh

# 3. Monitor progress
kubectl get pods -n broxiva-staging -w

# 4. Verify deployment
kubectl get all -n broxiva-staging
```

### Option C: Local Development (No Docker)

```bash
# 1. Go to project root
cd C:/Users/citad/OneDrive/Documents/broxiva-master/organization

# 2. Install dependencies
pnpm install

# 3. Setup database
pnpm db:migrate
pnpm db:seed

# 4. Start dev servers
pnpm dev  # Starts both API and Web

# API: http://localhost:4000
# Web: http://localhost:3000
```

---

## Service Ports (Docker Compose)

| Service | Port | URL |
|---------|------|-----|
| Web (Next.js) | 3000 | http://localhost:3000 |
| API (NestJS) | 4000 | http://localhost:4000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Elasticsearch | 9200 | http://localhost:9200 |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| RabbitMQ AMQP | 5672 | localhost:5672 |
| RabbitMQ Mgmt | 15672 | http://localhost:15672 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |
| Nginx | 80, 443 | http://localhost |

---

## Critical Environment Variables

**MUST SET IN .env FILE:**

```bash
# Database (32+ chars)
POSTGRES_PASSWORD=<generate with: openssl rand -base64 32>

# JWT (64+ chars each, MUST be different)
JWT_SECRET=<generate with: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate with: openssl rand -base64 64>

# Services (32+ chars each)
MINIO_ROOT_PASSWORD=<generate with: openssl rand -base64 32>
GRAFANA_ADMIN_PASSWORD=<generate with: openssl rand -base64 32>
RABBITMQ_PASSWORD=<generate with: openssl rand -base64 32>
```

---

## Common Commands

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs (all)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api

# Check service status
docker-compose ps

# Restart service
docker-compose restart api

# Rebuild and restart
docker-compose up -d --build api

# Remove everything (CAUTION: Data loss!)
docker-compose down -v
```

### Database Management

```bash
# Run migrations
docker-compose exec api npx prisma migrate deploy

# Seed database
docker-compose exec api npm run db:seed

# Access database shell
docker-compose exec postgres psql -U broxiva -d broxiva_dev

# Check migration status
docker-compose exec api npx prisma migrate status

# Open Prisma Studio
docker-compose exec api npx prisma studio
```

### Development

```bash
# Start development servers (both)
pnpm dev

# Start API only
pnpm dev:api

# Start Web only
pnpm dev:web

# Build all
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Kubernetes

```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Check pods
kubectl get pods -n broxiva-staging

# Check services
kubectl get svc -n broxiva-staging

# View logs
kubectl logs -f deployment/broxiva-api -n broxiva-staging

# Run migrations
kubectl exec deployment/broxiva-api -n broxiva-staging -- npx prisma migrate deploy

# Rollback
kubectl rollout undo deployment/broxiva-api -n broxiva-staging
```

---

## Health Checks

```bash
# API Health
curl http://localhost:4000/api/health

# PostgreSQL
docker-compose exec postgres pg_isready -U broxiva

# Redis
docker-compose exec redis redis-cli ping

# Elasticsearch
curl http://localhost:9200/_cluster/health

# RabbitMQ
curl http://localhost:15672/api/healthchecks/node

# All services status
docker-compose ps
```

---

## Troubleshooting

### Port Conflicts

```bash
# Find process using port
netstat -ano | findstr "3000"

# Kill process
taskkill /PID <PID> /F
```

### Service Won't Start

```bash
# View logs
docker-compose logs <service-name>

# Rebuild
docker-compose build --no-cache <service-name>

# Remove and recreate
docker-compose rm -f <service-name>
docker-compose up -d <service-name>
```

### Database Issues

```bash
# Reset database (CAUTION!)
docker-compose exec api npx prisma migrate reset

# Check connection
docker-compose exec postgres pg_isready -U broxiva

# View database logs
docker-compose logs postgres
```

### Clear Everything

```bash
# Stop and remove all containers, networks, volumes
docker-compose down -v

# Remove all Docker resources
docker system prune -a --volumes

# Restart fresh
docker-compose up -d
```

---

## Access Web Interfaces

**After Docker Compose Deployment:**

1. **Application:** http://localhost:3000
2. **API Documentation:** http://localhost:4000/api/docs
3. **Grafana:** http://localhost:3001 (admin / password from .env)
4. **Prometheus:** http://localhost:9090
5. **RabbitMQ:** http://localhost:15672 (broxiva / password from .env)
6. **MinIO:** http://localhost:9001 (broxiva_admin / password from .env)

---

## Testing Checklist

After deployment, verify:

- [ ] Web frontend loads: http://localhost:3000
- [ ] API health check: http://localhost:4000/api/health
- [ ] User registration works
- [ ] User login works
- [ ] Product browsing works
- [ ] Search functionality works
- [ ] Add to cart works
- [ ] No errors in logs
- [ ] All services healthy: `docker-compose ps`

---

## Emergency Rollback

### Docker Compose

```bash
# Stop everything
docker-compose down

# Restore from backup (if you created one)
# Restart with previous version
```

### Kubernetes

```bash
# Rollback API
kubectl rollout undo deployment/broxiva-api -n broxiva-staging

# Rollback Web
kubectl rollout undo deployment/broxiva-web -n broxiva-staging

# Verify rollback
kubectl rollout status deployment/broxiva-api -n broxiva-staging
```

---

## Documentation Links

- **Full Readiness Report:** `STAGING_DEPLOYMENT_READINESS_REPORT.md`
- **Deployment Checklist:** `STAGING_DEPLOYMENT_CHECKLIST.md`
- **Staging Guide:** `docs/STAGING_DEPLOYMENT.md`
- **Docker Guide:** `infrastructure/docker/README.md`
- **Kubernetes Guide:** `infrastructure/kubernetes/README.md`

---

## Support

For issues:
1. Check logs: `docker-compose logs <service>`
2. Review documentation in `docs/`
3. Check `docs/TROUBLESHOOTING.md`
4. Review existing deployment checklists

---

**Ready to Deploy?**

1. Configure `.env` file with secure passwords
2. Choose deployment method (Docker Compose recommended for staging)
3. Follow commands above
4. Verify with health checks
5. Start testing!

**Status:** ✅ ALL SYSTEMS GO
