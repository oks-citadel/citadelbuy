# Local Development Guide

This guide explains how to run the Broxiva platform locally for development.

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 9+ (`npm install -g pnpm`)
- **Docker** & Docker Compose
- **Git** with autocrlf enabled (for Windows)

### Optional
- **Azure CLI** (for cloud resource access)
- **kubectl** (for Kubernetes development)
- **Helm** (for chart development)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/broxiva/broxiva.git
cd broxiva/organization

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp .env.docker.example .env.docker

# Start development
pnpm dev
```

## Environment Setup

### 1. Environment Files

Create the following files from examples:

```bash
# Main application environment
cp .env.example .env

# Docker-specific environment
cp .env.docker.example .env.docker

# Payment providers (optional)
cp .env.payment.example .env.payment
```

### 2. Required Environment Variables

Edit `.env` with your local settings:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/broxiva_dev"
REDIS_URL="redis://localhost:6379"

# API URLs
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_WEB_URL="http://localhost:3000"

# Auth (generate your own secrets)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-chars"

# Asset configuration
ASSET_SOURCE="local"
ASSET_PATH="./assets"
```

## Running the Application

### Option 1: Docker Compose (Recommended)

Full stack with all services:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Elasticsearch (port 9200)
- API (port 4000)
- Web (port 3000)

### Option 2: Local Development (Faster iteration)

```bash
# Terminal 1: Start infrastructure only
docker compose up -d postgres redis elasticsearch

# Terminal 2: Run API in watch mode
cd apps/api
pnpm dev

# Terminal 3: Run Web in watch mode
cd apps/web
pnpm dev
```

### Option 3: Individual Services

```bash
# API only
pnpm --filter @broxiva/api dev

# Web only
pnpm --filter @broxiva/web dev

# Specific service
pnpm --filter @broxiva/notification dev
```

## Asset Mounting for Development

In development, large assets are mounted locally instead of from Azure:

### Local Asset Structure

```
organization/
├── assets/
│   ├── small/          # Git tracked (icons, configs)
│   └── large/          # NOT tracked (models, datasets)
└── ...
```

### Downloading Assets for Development

```bash
# If you have Azure access
az storage blob download-batch \
  --account-name broxivadevstorage \
  --source assets-dev \
  --destination ./assets/large

# Or mount directly (macOS/Linux)
# See: docs/ASSET_RUNTIME_STRATEGY.md
```

### Docker Compose Asset Mount

In `docker-compose.yml`, assets are mounted:

```yaml
services:
  api:
    volumes:
      - ./assets:/app/assets:ro
```

## Database Setup

### Initial Setup

```bash
# Run database migrations
cd apps/api
pnpm prisma migrate dev

# Seed development data
pnpm prisma db seed
```

### Database Reset

```bash
# Reset and reseed
pnpm prisma migrate reset
```

### Prisma Studio (GUI)

```bash
pnpm prisma studio
# Opens at http://localhost:5555
```

## Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @broxiva/api test

# E2E tests
pnpm --filter @broxiva/web test:e2e

# With coverage
pnpm test -- --coverage
```

## Building Docker Images Locally

```bash
# Build all images
docker compose build

# Build specific image
docker compose build api
docker compose build web

# Build with BuildKit cache
DOCKER_BUILDKIT=1 docker build \
  -f apps/api/Dockerfile \
  -t broxiva-api:local \
  .
```

## Useful Commands

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Check affected components
node scripts/detect-affected-components.js --list

# Run guardrails
bash scripts/guardrails/run-all.sh
```

## Troubleshooting

### Port Conflicts

```bash
# Check what's using a port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process on port
kill -9 $(lsof -t -i:3000)  # macOS/Linux
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Connect directly
docker compose exec postgres psql -U postgres -d broxiva_dev
```

### Docker Build Failures

```bash
# Clean Docker cache
docker builder prune -a

# Rebuild without cache
docker compose build --no-cache

# Check Docker disk space
docker system df
```

### Node.js Memory Issues

```bash
# Increase memory for builds
export NODE_OPTIONS="--max_old_space_size=4096"
pnpm build
```

### Windows Line Ending Issues

```bash
# Configure Git autocrlf
git config --global core.autocrlf true

# Fix existing files
git rm --cached -r .
git reset --hard
```

## IDE Setup

### VS Code Extensions

Recommended extensions (in `.vscode/extensions.json`):
- ESLint
- Prettier
- Prisma
- Docker
- GitLens
- Tailwind CSS IntelliSense

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────────────┐ │
│  │   Web   │  │ Mobile  │  │    External Integrations    │ │
│  │ :3000   │  │  Expo   │  │      (Webhooks, APIs)       │ │
│  └────┬────┘  └────┬────┘  └──────────────┬──────────────┘ │
└───────┼────────────┼───────────────────────┼───────────────┘
        │            │                       │
        └────────────┴───────────┬───────────┘
                                 │
┌────────────────────────────────┴────────────────────────────┐
│                     API Gateway                             │
│                        :4000                                │
└────────────────────────────────┬────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────┴───────┐    ┌───────────┴───────────┐    ┌──────┴──────┐
│   Services    │    │      Databases        │    │   External  │
│ (13 services) │    │                       │    │  Services   │
│ :5001-5013    │    │  PostgreSQL :5432     │    │             │
│               │    │  Redis      :6379     │    │  Stripe     │
│ - ai-agents   │    │  Elastic    :9200     │    │  PayPal     │
│ - analytics   │    │                       │    │  SendGrid   │
│ - inventory   │    └───────────────────────┘    │  Twilio     │
│ - search      │                                 └─────────────┘
│ - etc.        │
└───────────────┘
```

## Next Steps

1. Read the [Architecture Documentation](./ARCHITECTURE.md)
2. Review [API Documentation](./API_DOCUMENTATION.md)
3. Check [Contributing Guidelines](../CONTRIBUTING.md)
4. Set up [IDE Extensions](#ide-setup)
