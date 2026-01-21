# Broxiva Development Setup Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-20
**Audience**: Developers, DevOps Engineers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Testing Instructions](#testing-instructions)
5. [Deployment Process](#deployment-process)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended | Installation |
|----------|----------------|-------------|--------------|
| Node.js | 20.0.0 | 20.11.0+ | https://nodejs.org/ |
| pnpm | 10.0.0 | 10.23.0+ | `npm install -g pnpm` |
| Docker Desktop | 24.0.0 | Latest | https://www.docker.com/products/docker-desktop |
| Docker Compose | 2.20.0 | Latest | Included with Docker Desktop |
| Git | 2.40.0 | Latest | https://git-scm.com/ |
| PostgreSQL | 16.0 | 16.2+ | Via Docker or https://www.postgresql.org/ |
| Redis | 7.0 | 7.2+ | Via Docker or https://redis.io/ |
| Python | 3.11 | 3.11+ | https://www.python.org/ (for AI services) |

### Optional Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| VS Code | Recommended IDE | https://code.visualstudio.com/ |
| Postman | API testing | https://www.postman.com/ |
| pgAdmin | PostgreSQL GUI | https://www.pgadmin.org/ |
| Redis Commander | Redis GUI | `npm install -g redis-commander` |
| kubectl | Kubernetes CLI | https://kubernetes.io/docs/tasks/tools/ |
| Azure CLI | Azure management | https://docs.microsoft.com/en-us/cli/azure/ |

### System Requirements

**Minimum**:
- CPU: 4 cores
- RAM: 8 GB
- Storage: 20 GB free space
- OS: Windows 10/11, macOS 12+, Ubuntu 20.04+

**Recommended**:
- CPU: 8+ cores
- RAM: 16+ GB
- Storage: 50+ GB SSD
- OS: Latest stable version

---

## Environment Configuration

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/oks-broxiva/broxiva.git
cd broxiva/organization

# Verify you're on the correct branch
git checkout develop

# Pull latest changes
git pull origin develop
```

### 2. Install Dependencies

```bash
# Install pnpm globally if not already installed
npm install -g pnpm@latest

# Install all workspace dependencies
pnpm install

# Verify installation
pnpm --version  # Should be 10.23.0 or higher
node --version  # Should be 20.11.0 or higher
```

### 3. Environment Variables Setup

#### Root Environment (.env)

```bash
# Copy root environment template
cp .env.example .env
```

Edit `.env`:

```env
# Environment
NODE_ENV=development

# Application
APP_NAME=Broxiva
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://broxiva:broxiva123@localhost:5432/broxiva_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Session
SESSION_SECRET=your-session-secret-change-this-in-production
SESSION_EXPIRATION=86400

# Monitoring
ENABLE_MONITORING=true
LOG_LEVEL=debug
```

#### API Environment (apps/api/.env)

```bash
# Copy API environment template
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
# Application
PORT=4000
NODE_ENV=development
API_PREFIX=api

# Database
DATABASE_URL=postgresql://broxiva:broxiva123@localhost:5432/broxiva_dev

# JWT Authentication
JWT_SECRET=your-jwt-secret-change-this-in-production-must-be-at-least-32-characters
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret-change-this-in-production-must-be-at-least-32-characters
JWT_REFRESH_EXPIRATION=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# AWS SES (Email) - NOTE: External email providers (SendGrid, Twilio) are NOT supported.
# All messaging must use AWS services (SES, SNS, SQS) per infrastructure policy.
AWS_SES_ACCESS_KEY_ID=your_aws_ses_access_key
AWS_SES_SECRET_ACCESS_KEY=your_aws_ses_secret_key
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@broxiva.com
AWS_SES_FROM_NAME=Broxiva

# AWS SNS (SMS)
AWS_SNS_ACCESS_KEY_ID=your_aws_sns_access_key
AWS_SNS_SECRET_ACCESS_KEY=your_aws_sns_secret_key
AWS_SNS_REGION=us-east-1
AWS_SNS_SENDER_ID=Broxiva

# AWS S3 (Optional - use local storage for dev)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=broxiva-dev

# Storage (local for development)
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads

# AI Services
AI_RECOMMENDATION_URL=http://localhost:8001
AI_SEARCH_URL=http://localhost:8002
AI_FRAUD_URL=http://localhost:8003
AI_PRICING_URL=http://localhost:8004
AI_PERSONALIZATION_URL=http://localhost:8005
AI_API_KEY=dev-api-key-change-in-production

# Feature Flags
ENABLE_RECOMMENDATIONS=true
ENABLE_FRAUD_DETECTION=true
ENABLE_DYNAMIC_PRICING=false
ENABLE_AI_CHATBOT=true

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Monitoring
SENTRY_DSN=your_sentry_dsn
ENABLE_SENTRY=false

# Search
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
```

#### Web Environment (apps/web/.env)

```bash
# Copy web environment template
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env.local`:

```env
# Application
NEXT_PUBLIC_APP_NAME=Broxiva
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Stripe (Publishable key only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Google Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Feature Flags
NEXT_PUBLIC_ENABLE_RECOMMENDATIONS=true
NEXT_PUBLIC_ENABLE_WISHLIST=true
NEXT_PUBLIC_ENABLE_REVIEWS=true

# Environment
NODE_ENV=development
```

---

## Local Development Setup

### Option 1: Full Docker Setup (Recommended for Beginners)

This option runs everything in Docker containers, including the database, Redis, and application services.

```bash
# Start all services
pnpm docker:up

# View logs
pnpm docker:logs

# Stop all services
pnpm docker:down

# Clean up (removes volumes)
pnpm docker:clean
```

### Option 2: Hybrid Setup (Recommended for Active Development)

This option runs infrastructure (PostgreSQL, Redis) in Docker, but runs application code locally for faster development.

#### Step 1: Start Infrastructure Services

```bash
# Start PostgreSQL and Redis only
docker compose up -d postgres redis

# Verify services are running
docker compose ps

# Check logs
docker compose logs postgres
docker compose logs redis
```

#### Step 2: Database Setup

```bash
# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm db:migrate

# Seed database with sample data
pnpm db:seed

# (Optional) Open Prisma Studio to view data
pnpm prisma:studio
```

**Verify Database**:

```bash
# Connect to PostgreSQL
docker exec -it broxiva-postgres psql -U broxiva -d broxiva_dev

# Check tables
\dt

# Count users
SELECT COUNT(*) FROM "User";

# Exit
\q
```

#### Step 3: Start Development Servers

**Option A: Start All Services**

```bash
# Start API, Web, and Admin simultaneously
pnpm dev
```

**Option B: Start Individual Services**

```bash
# Terminal 1: API Server
pnpm dev:api
# Runs on http://localhost:4000
# API Docs: http://localhost:4000/api/docs

# Terminal 2: Web Application
pnpm dev:web
# Runs on http://localhost:3000

# Terminal 3: Admin Dashboard (Optional)
pnpm dev:admin
# Runs on http://localhost:3001
```

#### Step 4: Start AI Services (Optional)

```bash
# Navigate to AI service
cd apps/services/recommendation

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
uvicorn main:app --reload --port 8001
```

Repeat for other AI services (search, fraud-detection, etc.) on different ports.

---

## Testing Instructions

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run tests for specific module
pnpm test:api
pnpm test:web
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration

# Run API integration tests
cd apps/api
pnpm test:integration
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode
pnpm test:e2e:ui

# Run specific E2E test file
pnpm test:e2e tests/e2e/web/checkout.spec.ts

# Run E2E tests in different browsers
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Load Tests

```bash
# Install k6 (first time only)
# On macOS:
brew install k6
# On Windows:
choco install k6
# On Linux:
snap install k6

# Run load tests
cd tests/load
k6 run load-test.js

# Run with custom parameters
k6 run --vus 100 --duration 30s load-test.js
```

### Linting & Type Checking

```bash
# Run ESLint
pnpm lint

# Fix ESLint errors automatically
pnpm lint:fix

# Run TypeScript type checking
pnpm type-check

# Run both lint and type-check
pnpm validate
```

---

## Deployment Process

### Local Build

```bash
# Build all packages and apps
pnpm build

# Build specific app
pnpm build:api
pnpm build:web
pnpm build:admin
```

### Docker Build

```bash
# Build API Docker image
cd apps/api
docker build -t broxiva/api:latest -f Dockerfile.production .

# Build Web Docker image
cd apps/web
docker build -t broxiva/web:latest -f Dockerfile.production .

# Test Docker images locally
docker run -p 4000:4000 --env-file .env.production broxiva/api:latest
docker run -p 3000:3000 --env-file .env.production broxiva/web:latest
```

### Staging Deployment

```bash
# Deploy to staging
pnpm deploy:staging

# Or manually
cd infrastructure/kubernetes
kubectl apply -f staging/
```

### Production Deployment

**Important**: Never deploy directly to production without following the deployment runbook.

See [DEPLOYMENT_RUNBOOK.md](./root/DEPLOYMENT_RUNBOOK.md) for complete deployment procedures.

```bash
# Deploy to production (requires approval)
pnpm deploy:production

# Or use GitHub Actions
# Create PR to main branch
# After approval and merge, deployment runs automatically
```

---

## Troubleshooting

### Database Connection Issues

**Problem**: `Error: Can't reach database server`

**Solutions**:

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL if not running
docker compose up -d postgres

# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker exec -it broxiva-postgres psql -U broxiva -d broxiva_dev

# If still not working, reset database
docker compose down -v
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::4000`

**Solutions**:

```bash
# Find process using port (on macOS/Linux)
lsof -i :4000

# Find process using port (on Windows)
netstat -ano | findstr :4000

# Kill process
# On macOS/Linux:
kill -9 <PID>
# On Windows:
taskkill /PID <PID> /F

# Or change port in .env file
PORT=4001
```

### Prisma Client Generation Issues

**Problem**: `@prisma/client did not initialize yet`

**Solutions**:

```bash
# Regenerate Prisma client
pnpm prisma:generate

# If still not working, clean and reinstall
rm -rf node_modules
rm -rf apps/api/node_modules
rm pnpm-lock.yaml
pnpm install
pnpm prisma:generate
```

### Redis Connection Issues

**Problem**: `Error: Redis connection refused`

**Solutions**:

```bash
# Check if Redis is running
docker ps | grep redis

# Start Redis
docker compose up -d redis

# Test Redis connection
docker exec -it broxiva-redis redis-cli PING
# Should return: PONG

# Check Redis logs
docker compose logs redis
```

### Docker Build Failures

**Problem**: `Docker build fails with memory errors`

**Solutions**:

```bash
# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory → 8GB+

# Clean Docker cache
docker system prune -a

# Build with no cache
docker build --no-cache -t broxiva/api:latest .
```

### Module Not Found Errors

**Problem**: `Cannot find module '@broxiva/types'`

**Solutions**:

```bash
# Rebuild workspace
pnpm install

# Build shared packages
pnpm build:packages

# Or build specific package
pnpm --filter @broxiva/types build
```

### TypeScript Errors After Git Pull

**Problem**: TypeScript errors after pulling latest code

**Solutions**:

```bash
# Clean TypeScript cache
rm -rf apps/api/dist
rm -rf apps/web/.next

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build
```

---

## Advanced Configuration

### VSCode Setup

Install recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
```

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Custom pnpm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev:all": "concurrently \"pnpm dev:api\" \"pnpm dev:web\"",
    "clean": "pnpm -r exec rm -rf dist .next node_modules",
    "reset": "pnpm clean && pnpm install",
    "db:reset": "pnpm db:drop && pnpm db:create && pnpm db:migrate && pnpm db:seed",
    "docker:rebuild": "docker compose down -v && docker compose build --no-cache && docker compose up -d"
  }
}
```

### Environment-Specific Configurations

Create environment-specific files:

- `.env.local` - Local development (gitignored)
- `.env.development` - Development environment
- `.env.staging` - Staging environment
- `.env.production` - Production environment

Load with:

```bash
# Development
NODE_ENV=development pnpm dev

# Staging
NODE_ENV=staging pnpm start

# Production
NODE_ENV=production pnpm start
```

### Database Seeding Options

```bash
# Seed with minimal data (default)
pnpm db:seed

# Seed with full sample data
pnpm db:seed:full

# Seed specific data
pnpm db:seed:users
pnpm db:seed:products
pnpm db:seed:orders

# Reset and seed
pnpm db:reset
```

### Running with Different Package Managers

While pnpm is recommended, you can use npm or yarn:

```bash
# With npm
npm install
npm run dev

# With yarn
yarn install
yarn dev
```

**Note**: pnpm is strongly recommended for workspaces and performance.

---

## Next Steps

After completing setup:

1. **Explore the Application**
   - Visit http://localhost:3000 (Web App)
   - Visit http://localhost:4000/api/docs (API Documentation)
   - Visit http://localhost:3001 (Admin Dashboard)

2. **Review Documentation**
   - [API Reference](./API_REFERENCE.md)
   - [Architecture Guide](./architecture/ARCHITECTURE.md)
   - [Testing Guide](./root/TESTING_SETUP_GUIDE.md)

3. **Join Development**
   - Review open issues on GitHub
   - Check development board
   - Join team communication channels

4. **Read Operational Docs**
   - [Deployment Runbook](./root/DEPLOYMENT_RUNBOOK.md)
   - [Incident Response](./root/INCIDENT_RESPONSE.md)
   - [Operations Manual](./OPERATIONS_MANUAL.md)

---

## Support

### Getting Help

- **Documentation**: Check docs/ directory
- **GitHub Issues**: https://github.com/oks-broxiva/broxiva/issues
- **Email**: dev@broxiva.com
- **Slack**: #engineering, #help

### Reporting Issues

When reporting issues, include:

1. Error message (full stack trace)
2. Steps to reproduce
3. Environment (OS, Node version, etc.)
4. Relevant logs
5. Screenshots (if applicable)

---

**Last Updated**: 2026-01-20
**Maintained By**: Platform Engineering Team
**Version**: 1.0.0
