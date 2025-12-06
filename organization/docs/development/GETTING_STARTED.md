# Getting Started with CitadelBuy Development

This guide will help you set up your development environment and start contributing to CitadelBuy.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Environment](#development-environment)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## Prerequisites

### Required Software

Before you begin, ensure you have the following installed:

#### 1. Node.js (v20.0.0 or higher)

**Windows:**
- Download from [nodejs.org](https://nodejs.org/)
- Or use [nvm-windows](https://github.com/coreybutler/nvm-windows)

**macOS:**
```bash
# Using Homebrew
brew install node@20

# Or using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**Linux:**
```bash
# Using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

Verify installation:
```bash
node --version  # Should be v20.x.x or higher
npm --version   # Should be 10.x.x or higher
```

#### 2. pnpm (v10.0.0 or higher)

pnpm is our package manager of choice for better performance and disk space efficiency.

```bash
# Using npm
npm install -g pnpm@latest

# Or using Corepack (recommended)
corepack enable
corepack prepare pnpm@latest --activate
```

Verify installation:
```bash
pnpm --version  # Should be 10.x.x or higher
```

#### 3. Docker Desktop

**Windows & macOS:**
- Download from [docker.com](https://www.docker.com/products/docker-desktop/)

**Linux:**
```bash
# Follow Docker's official installation guide
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Verify installation:
```bash
docker --version
docker-compose --version
```

#### 4. Git

**Windows:**
- Download from [git-scm.com](https://git-scm.com/download/win)

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt-get install git  # Debian/Ubuntu
sudo yum install git      # CentOS/RHEL
```

Verify installation:
```bash
git --version
```

### Optional but Recommended

- **VS Code**: [Download here](https://code.visualstudio.com/)
- **PostgreSQL Client**: pgAdmin, DBeaver, or TablePlus
- **API Testing Tool**: Postman, Insomnia, or Thunder Client (VS Code extension)
- **Redis Client**: RedisInsight or Another Redis Desktop Manager

## Initial Setup

### 1. Fork and Clone Repository

```bash
# Fork the repository on GitHub first, then clone your fork
git clone https://github.com/YOUR_USERNAME/citadelbuy.git
cd citadelbuy/organization

# Add upstream remote
git remote add upstream https://github.com/citadelbuy/citadelbuy.git
```

### 2. Install Dependencies

```bash
# Install all dependencies (this may take a few minutes)
pnpm install
```

This will install dependencies for all workspaces (API, Web, packages).

### 3. Set Up Environment Variables

#### Backend (API)

```bash
# Navigate to API directory
cd apps/api

# Copy example environment file
cp .env.example .env

# Edit .env with your preferred editor
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/citadelbuy_dev"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# API Configuration
PORT=4000
NODE_ENV=development
API_URL=http://localhost:4000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Email (for development, use Mailtrap or similar)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASSWORD=your-mailtrap-password
EMAIL_FROM=noreply@citadelbuy.com

# Optional: Third-party services (can be added later)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=
```

#### Frontend (Web)

```bash
# Navigate to Web directory
cd ../web

# Copy example environment file
cp .env.example .env.local

# Edit .env.local
```

**Required Environment Variables:**

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Stripe (Public Key)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App Configuration
NEXT_PUBLIC_APP_NAME=CitadelBuy
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Infrastructure Services

Start PostgreSQL, Redis, and other services using Docker:

```bash
# From the organization directory
cd ../..
pnpm docker:up
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Elasticsearch on port 9200 (if configured)

Verify services are running:
```bash
docker ps
```

### 5. Set Up Database

```bash
# Run database migrations
pnpm db:migrate

# Seed database with initial data
pnpm db:seed
```

This will create:
- Test user accounts (see README.md for credentials)
- Sample products and categories
- Initial configuration data

### 6. Verify Setup

Check that everything is set up correctly:

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests (optional but recommended)
pnpm test
```

## Development Environment

### VS Code Setup

#### Recommended Extensions

Create `.vscode/extensions.json` (if not already present):

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",
    "christian-kohler.path-intellisense",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

#### Workspace Settings

The project includes `.vscode/settings.json` with:
- Auto-formatting on save
- ESLint auto-fix
- TypeScript configuration
- Editor preferences

### Git Configuration

Configure Git for the project:

```bash
# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Recommended aliases
git config alias.st status
git config alias.co checkout
git config alias.br branch
git config alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
```

## Running the Application

### Start All Services

```bash
# From the organization directory
pnpm dev
```

This starts:
- **API**: http://localhost:4000/api
- **Web**: http://localhost:3000
- **API Docs**: http://localhost:4000/api/docs

### Start Services Individually

```bash
# Backend only
pnpm dev:api

# Frontend only
pnpm dev:web

# Admin panel (if available)
pnpm dev:admin
```

### Accessing the Application

1. **Frontend**: Open http://localhost:3000 in your browser
2. **API Swagger Docs**: Open http://localhost:4000/api/docs
3. **Prisma Studio** (Database GUI):
   ```bash
   pnpm prisma:studio
   ```
   Opens at http://localhost:5555

### Test Accounts

Use these accounts to test the application:

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@citadelbuy.com | password123 |
| Admin | admin@citadelbuy.com | password123 |
| Vendor | vendor1@citadelbuy.com | password123 |

## Project Structure

```
organization/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── prisma/            # Database schema & migrations
│   │   ├── src/
│   │   │   ├── common/        # Shared utilities
│   │   │   ├── config/        # Configuration
│   │   │   ├── modules/       # Feature modules
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/              # E2E tests
│   │
│   ├── web/                    # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/           # Next.js pages (App Router)
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Utilities
│   │   │   ├── stores/        # State management
│   │   │   └── types/         # TypeScript types
│   │   └── public/            # Static assets
│   │
│   └── mobile/                 # React Native (future)
│
├── packages/                   # Shared packages
├── infrastructure/            # Docker, K8s, Terraform
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
└── tests/                     # Integration tests

```

## Common Tasks

### Database Operations

```bash
# Create a new migration
cd apps/api
npx prisma migrate dev --name add_new_field

# Reset database (WARNING: deletes all data)
pnpm db:migrate:reset

# View database in Prisma Studio
pnpm prisma:studio

# Generate Prisma Client after schema changes
pnpm prisma:generate
```

### Creating a New Feature Module (Backend)

```bash
# From apps/api directory
cd apps/api

# Generate module, controller, and service
npx nest g module modules/my-feature
npx nest g controller modules/my-feature
npx nest g service modules/my-feature
```

### Creating a New Page (Frontend)

```bash
# From apps/web directory
cd apps/web/src/app

# Create new route
mkdir my-page
cd my-page
touch page.tsx
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific workspace
pnpm test:api
pnpm test:web

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
cd apps/api
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

### Code Quality Checks

```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint --fix

# Type check
pnpm type-check

# Format code
pnpm format
```

### Building for Production

```bash
# Build all workspaces
pnpm build

# Build specific workspace
pnpm build:api
pnpm build:web
```

### Docker Operations

```bash
# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# View logs
pnpm docker:logs

# Rebuild images
pnpm docker:build

# Remove all containers and volumes
docker-compose down -v
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using port (Linux/Mac)
lsof -ti:4000  # API port
lsof -ti:3000  # Web port

# Kill process
kill -9 <PID>

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d citadelbuy_dev

# Reset database
pnpm db:migrate:reset
```

### Prisma Issues

```bash
# Regenerate Prisma Client
cd apps/api
npx prisma generate

# Reset Prisma
npx prisma migrate reset

# Format schema
npx prisma format
```

### Node Modules Issues

```bash
# Clear all node_modules and reinstall
pnpm clean
pnpm install

# Clear pnpm cache
pnpm store prune
```

### TypeScript Errors

```bash
# Check for TypeScript errors
pnpm type-check

# If using VS Code, restart TypeScript server
# Command Palette (Ctrl+Shift+P) → "TypeScript: Restart TS Server"
```

### Docker Issues

```bash
# Restart Docker Desktop

# Remove all containers and volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a

# Rebuild containers
pnpm docker:build
```

### Environment Variables Not Loading

```bash
# Check .env files exist
ls apps/api/.env
ls apps/web/.env.local

# Restart development servers after changing .env files
```

## Next Steps

Now that you have the development environment set up:

1. **Read the Documentation**:
   - [Contributing Guidelines](../../CONTRIBUTING.md)
   - [Git Workflow](./GIT_WORKFLOW.md)
   - [Coding Standards](./CODING_STANDARDS.md)

2. **Explore the Codebase**:
   - Browse through existing modules
   - Read the code to understand patterns
   - Look at test files for examples

3. **Pick a Task**:
   - Check GitHub Issues for "good first issue" labels
   - Look for TODO comments in the code
   - Ask maintainers for suggestions

4. **Make Your First Contribution**:
   - Start with documentation improvements
   - Fix a small bug
   - Add a test for existing functionality

5. **Join the Community**:
   - Participate in discussions
   - Ask questions when stuck
   - Help other contributors

## Useful Commands Reference

```bash
# Development
pnpm dev              # Start all services
pnpm dev:api          # Start API only
pnpm dev:web          # Start web only

# Testing
pnpm test             # Run all tests
pnpm test:e2e         # Run E2E tests
pnpm test:cov         # Run with coverage

# Code Quality
pnpm lint             # Lint code
pnpm format           # Format code
pnpm type-check       # Check types

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm prisma:studio    # Open Prisma Studio

# Docker
pnpm docker:up        # Start services
pnpm docker:down      # Stop services
pnpm docker:logs      # View logs

# Build
pnpm build            # Build all
pnpm build:api        # Build API
pnpm build:web        # Build web
```

## Getting Help

If you're stuck or have questions:

1. **Check Documentation**: Browse the `/docs` directory
2. **Search Issues**: Someone might have had the same problem
3. **Ask on Discussions**: Post on GitHub Discussions
4. **Contact Maintainers**: Reach out to project maintainers

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Welcome to the Team!

Thank you for contributing to CitadelBuy! We're excited to have you as part of the community.

Happy coding! 🚀
