# Development Setup Guide

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose
- PostgreSQL 16+ (via Docker)
- Redis 7+ (via Docker)
- Python 3.11+ (for AI services)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/oks-broxiva/broxiva.git
cd broxiva/organization
```

### 2. Install Dependencies

```bash
# Install pnpm if not installed
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### 3. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Configure the environment variables:

```env
# Database
DATABASE_URL=postgresql://broxiva:broxiva123@localhost:5432/broxiva_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# AI Services
AI_SERVICE_URL=http://localhost:8000
AI_API_KEY=your-ai-api-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# AWS/Azure (for file storage)
STORAGE_PROVIDER=local
```

### 4. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and other services
pnpm docker:up
```

### 5. Database Setup

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm db:migrate

# Seed database with sample data
pnpm db:seed
```

### 6. Start Development Servers

```bash
# Start all services in development mode
pnpm dev

# Or start individual services
pnpm dev:api      # API server on http://localhost:4000
pnpm dev:web      # Web app on http://localhost:3000
pnpm dev:admin    # Admin app on http://localhost:3001
```

## Project Structure

```
organization/
├── apps/
│   ├── web/           # Next.js web application
│   ├── mobile/        # React Native mobile app
│   ├── admin/         # Admin dashboard
│   └── api/           # NestJS API server
├── packages/
│   ├── ui/            # Shared UI components
│   ├── types/         # Shared TypeScript types
│   ├── utils/         # Shared utilities
│   ├── config/        # Shared configuration
│   └── ai-sdk/        # AI service client SDK
├── services/
│   ├── recommendation/  # Recommendation AI service
│   ├── search/          # Search AI service
│   ├── fraud-detection/ # Fraud detection service
│   ├── chatbot/         # Chatbot AI service
│   ├── analytics/       # Analytics service
│   └── pricing/         # Dynamic pricing service
├── infrastructure/
│   ├── terraform/       # Infrastructure as code
│   ├── kubernetes/      # K8s manifests
│   ├── docker/          # Docker configurations
│   └── helm/            # Helm charts
├── tests/
│   ├── e2e/             # End-to-end tests
│   ├── integration/     # Integration tests
│   └── load/            # Load tests
└── docs/                # Documentation
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all services in dev mode |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database |
| `pnpm prisma:studio` | Open Prisma Studio |

## Development Workflow

### Creating a New Feature

1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards

3. Run tests and linting:
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. Push and create a PR:
   ```bash
   git push -u origin feature/your-feature-name
   ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Code Style

- Use TypeScript for all code
- Follow ESLint and Prettier configurations
- Write unit tests for new features
- Document public APIs

## AI Services Development

### Starting AI Services Locally

```bash
# Navigate to AI service
cd services/recommendation

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Start service
uvicorn src.api:app --reload --port 8001
```

### AI SDK Development

The AI SDK (`packages/ai-sdk`) provides TypeScript clients for all AI services:

```bash
# Build AI SDK
pnpm --filter @broxiva/ai-sdk build

# Run tests
pnpm --filter @broxiva/ai-sdk test
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps

# View PostgreSQL logs
docker compose logs postgres
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using a port
lsof -i :3000

# Kill process using the port
kill -9 <PID>
```

### Cache Issues

```bash
# Clear Turbo cache
pnpm clean

# Clear node_modules
rm -rf node_modules
pnpm install
```

## Getting Help

- Check the [FAQ](./FAQ.md)
- Search existing [GitHub Issues](https://github.com/oks-broxiva/broxiva/issues)
- Join our Discord server
- Email: dev@broxiva.com
