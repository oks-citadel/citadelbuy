# Broxiva Platform - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Setup](#database-setup)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v20.x LTS or later
- **PNPM**: v8.x or later (package manager)
- **Docker**: v24.x or later (for containerized deployment)
- **PostgreSQL**: v15.x or later
- **Redis**: v7.x or later

### Optional (for AI features)

- OpenAI API key
- Google Cloud credentials (for Vision API)
- Elasticsearch v8.x (for advanced search)
- Algolia account (alternative search)

---

## Environment Setup

### 1. Clone and Install Dependencies

```bash
cd organization
pnpm install
```

### 2. Configure Environment Variables

**Backend API** (`apps/api/.env`):
```bash
cp apps/api/.env.example apps/api/.env
# Edit .env with your configuration
```

**Web Frontend** (`apps/web/.env.local`):
```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your configuration
```

**Mobile App** (`apps/mobile/.env`):
```bash
cp apps/mobile/.env.example apps/mobile/.env
# Edit .env with your configuration
```

### 3. Essential Environment Variables

#### Backend (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/broxiva` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT tokens | Use a 256-bit random string |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Use a different 256-bit random string |
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

#### Frontend (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000/api` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |

---

## Local Development

### Start All Services

```bash
# Start Docker services (PostgreSQL, Redis)
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Run database migrations
cd apps/api && pnpm prisma migrate dev && cd ../..

# Seed the database (optional)
cd apps/api && pnpm prisma db seed && cd ../..

# Start all apps in development mode
pnpm dev
```

### Start Individual Apps

```bash
# Backend API (port 4000)
pnpm dev:api

# Web Frontend (port 3000)
pnpm dev:web

# Mobile App (Expo)
pnpm dev:mobile
```

### Access Points

- **Web App**: http://localhost:3000
- **API**: http://localhost:4000
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:4000/api/health

---

## Docker Deployment

### Build Docker Images

```bash
# Build backend
docker build -t broxiva/api:latest ./apps/api

# Build frontend
docker build -t broxiva/web:latest ./apps/web
```

### Run with Docker Compose

```bash
# Development
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Production
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d
```

### Docker Image Tags

- `broxiva/api:latest` - Latest backend build
- `broxiva/web:latest` - Latest frontend build
- `broxiva/api:v2.0-stable` - Stable release
- `broxiva/web:v2.0-stable` - Stable release

---

## Production Deployment

### Option 1: Docker + Docker Compose

```bash
# 1. Set production environment variables
export NODE_ENV=production

# 2. Build production images
docker build -t broxiva/api:prod ./apps/api
docker build -t broxiva/web:prod ./apps/web

# 3. Deploy with Docker Compose
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d
```

### Option 2: Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/k8s/

# Or use Helm
helm install broxiva ./infrastructure/helm/broxiva
```

### Option 3: Platform-as-a-Service

#### Railway

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-detects and deploys both services

#### Vercel (Frontend Only)

```bash
cd apps/web
vercel --prod
```

#### Fly.io (Backend)

```bash
cd apps/api
flyctl deploy
```

### SSL/HTTPS Configuration

For production, ensure:
- HTTPS is enabled on all endpoints
- Update `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to use `https://`
- Configure SSL certificates (Let's Encrypt recommended)

---

## Database Setup

### PostgreSQL Setup

```bash
# Create database
createdb broxiva_dev

# Create user
psql -c "CREATE USER broxiva WITH PASSWORD 'your_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE broxiva_dev TO broxiva;"
```

### Run Migrations

```bash
cd apps/api

# Development
pnpm prisma migrate dev

# Production
pnpm prisma migrate deploy
```

### Seed Data

```bash
cd apps/api

# Development seed (includes test data)
pnpm prisma db seed

# Production seed (minimal required data)
pnpm prisma db seed -- --production
```

### Database Backup

```bash
# Backup
pg_dump -U broxiva broxiva_prod > backup.sql

# Restore
psql -U broxiva broxiva_prod < backup.sql
```

---

## Mobile App Deployment

### Generate Production Build

```bash
cd apps/mobile

# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### App Store Submission

1. Configure `app.json` with proper bundle identifiers
2. Update version numbers
3. Build production releases
4. Submit through EAS or App Store Connect / Google Play Console

---

## Health Checks

### API Health Endpoint

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker compose ps

# Check connection string
echo $DATABASE_URL
```

#### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping
```

#### Build Failures

```bash
# Clear cache and rebuild
pnpm clean
pnpm install
pnpm build
```

#### Port Already in Use

```bash
# Find process using port
lsof -i :4000

# Kill process
kill -9 <PID>
```

### Logs

```bash
# Docker logs
docker compose logs -f api
docker compose logs -f web

# Application logs
tail -f apps/api/logs/app.log
```

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/broxiva/broxiva/issues
- Documentation: https://docs.broxiva.com
