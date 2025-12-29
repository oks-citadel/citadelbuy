# Broxiva E-Commerce Platform

A next-generation AI-powered premium global e-commerce platform built with modern technologies and enterprise-grade architecture.

**Domain:** www.broxiva.com
**Cloud Provider:** Microsoft Azure
**DNS Registrar:** GoDaddy

## Test User Accounts for Frontend Verification

```
+-----------------------------------------------------------------------+
|                    TEST USER ACCOUNT #1                                |
+-----------------------------------------------------------------------+
|  Email:     customer@broxiva.com                                       |
|  Password:  password123                                                |
|  Role:      CUSTOMER                                                   |
|                                                                        |
|  Pre-configured with:                                                  |
|  - Shipping address (123 Main Street, New York, NY 10001)              |
|  - Order history (delivered, shipped, processing orders)               |
|  - Can browse products, add to cart, checkout                          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
|                    TEST USER ACCOUNT #2                                |
+-----------------------------------------------------------------------+
|  Email:     jane@example.com                                           |
|  Password:  password123                                                |
|  Role:      CUSTOMER                                                   |
|                                                                        |
|  Pre-configured with:                                                  |
|  - Shipping address (456 Oak Avenue, Los Angeles, CA 90001)            |
|  - Order history (shipped, pending orders)                             |
|  - Wishlist items, saved products                                      |
+-----------------------------------------------------------------------+
```

### Additional Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@broxiva.com` | `password123` |
| Vendor 1 | `vendor1@broxiva.com` | `password123` |
| Vendor 2 | `vendor2@broxiva.com` | `password123` |

## URLs

### Development
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### Production
- **Website**: https://www.broxiva.com
- **API**: https://api.broxiva.com
- **CDN**: https://cdn.broxiva.com
- **Status**: https://status.broxiva.com

---

## Project Structure

```
broxiva/
├── apps/                          # Frontend applications
│   ├── web/                       # Next.js web application
│   │   ├── src/                   # Source code
│   │   │   ├── app/              # Next.js App Router pages
│   │   │   ├── components/       # React components
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── lib/              # Utility libraries
│   │   │   ├── services/         # API services
│   │   │   └── types/            # TypeScript types
│   │   ├── tests/                # Test suites
│   │   │   ├── e2e/              # Playwright E2E tests
│   │   │   ├── visual/           # Visual regression tests
│   │   │   └── accessibility/    # WCAG accessibility tests
│   │   └── .github/workflows/    # CI/CD pipelines
│   │
│   └── mobile/                    # React Native mobile app
│       ├── src/                   # Source code
│       ├── android/               # Android native code
│       ├── ios/                   # iOS native code
│       ├── tests/e2e/            # Detox E2E tests
│       └── .github/workflows/     # Mobile CI/CD
│
├── apps/api/                      # NestJS API backend
│   ├── src/                       # Source code
│   │   ├── common/               # Shared utilities
│   │   └── modules/              # Feature modules
│   ├── prisma/                    # Database schema & migrations
│   ├── test/                      # Unit & integration tests
│   └── .github/workflows/         # Backend CI/CD
│
├── apps/services/                 # Microservices
│   ├── ai-agents/                # AI Agent orchestration
│   ├── ai-engine/                # AI/ML processing
│   ├── analytics/                # Analytics service
│   ├── chatbot/                  # AI Chatbot
│   ├── fraud-detection/          # Fraud detection
│   ├── inventory/                # Inventory management
│   ├── media/                    # Media processing
│   ├── notification/             # Notifications
│   ├── personalization/          # User personalization
│   ├── pricing/                  # Dynamic pricing
│   ├── recommendation/           # Product recommendations
│   ├── search/                   # Search service
│   └── supplier-integration/     # Supplier integrations
│
├── packages/                      # Shared packages
│   ├── ai-sdk/                   # AI SDK
│   ├── types/                    # Shared TypeScript types
│   ├── ui/                       # Shared UI components
│   └── utils/                    # Common utilities
│
├── infrastructure/                # Infrastructure as Code
│   ├── terraform/                 # Terraform modules
│   │   ├── modules/              # Reusable modules
│   │   │   ├── compute/          # AKS, ACR, App Service
│   │   │   ├── database/         # PostgreSQL, Redis
│   │   │   ├── dns/              # Azure DNS Zone
│   │   │   ├── networking/       # VNet, Subnets, NSG
│   │   │   ├── security/         # Key Vault, WAF, DDoS
│   │   │   ├── monitoring/       # Log Analytics, App Insights
│   │   │   └── storage/          # Storage accounts, CDN
│   │   └── environments/         # Environment configs
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   ├── kubernetes/                # K8s manifests
│   ├── docker/                    # Docker configs
│   └── azure/                     # Azure-specific configs
│
├── docs/                          # Project documentation
│   ├── architecture/             # Technical architecture
│   ├── development/              # Development guides
│   ├── infrastructure/           # Infrastructure docs
│   └── compliance/               # Compliance documentation
│
├── tests/                         # Test suites
│   ├── e2e/                      # End-to-end tests
│   ├── load/                     # Load testing
│   ├── smoke/                    # Smoke tests
│   └── agents/                   # AI agent tests
│
├── scripts/                       # Utility scripts
│
└── .github/                       # GitHub configurations
    ├── workflows/                 # CI/CD workflows
    ├── actions/                   # Composite actions
    └── ISSUE_TEMPLATE/           # Issue templates
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/broxiva/broxiva-platform.git
   cd broxiva-platform
   pnpm install
   ```

2. **Start infrastructure services:**
   ```bash
   pnpm run docker:up
   ```

3. **Set up environment variables:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Run database migrations:**
   ```bash
   pnpm run db:migrate
   pnpm run db:seed
   ```

5. **Start development servers:**
   ```bash
   pnpm run dev
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start all services in development mode |
| `pnpm run dev:web` | Start web app only |
| `pnpm run dev:api` | Start backend only |
| `pnpm run build` | Build all workspaces |
| `pnpm run test` | Run all tests |
| `pnpm run test:e2e` | Run E2E tests |
| `pnpm run test:visual` | Run visual regression tests |
| `pnpm run test:a11y` | Run accessibility tests |
| `pnpm run lint` | Lint all workspaces |
| `pnpm run docker:up` | Start Docker services |
| `pnpm run db:migrate` | Run database migrations |
| `pnpm run prisma:studio` | Open Prisma Studio |

## Testing

### Web App Testing

```bash
# Unit tests
pnpm run test:web

# E2E tests (Playwright)
pnpm run test:e2e

# Visual regression
pnpm run test:visual

# Accessibility (WCAG 2.1 AA)
pnpm run test:a11y

# Mobile viewports
pnpm run test:mobile --filter=apps/web
```

### Backend Testing

```bash
# Unit tests
pnpm run test:api

# Integration tests
pnpm run test:e2e --filter=apps/api
```

## Infrastructure

### Azure Production Deployment

```bash
cd infrastructure/terraform/environments/prod

# Initialize
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

### Docker Deployment

```bash
# Build images
pnpm run docker:build

# Deploy stack
pnpm run docker:up

# View logs
pnpm run docker:logs
```

## Architecture

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Mobile:** React Native, Expo
- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Caching:** Redis
- **Cloud:** Microsoft Azure (AKS, Front Door, Blob Storage)
- **CI/CD:** GitHub Actions
- **IaC:** Terraform

## Production URLs

| Service | URL |
|---------|-----|
| Website | https://www.broxiva.com |
| API | https://api.broxiva.com |
| CDN | https://cdn.broxiva.com |
| API Docs | https://api.broxiva.com/docs |
| Status | https://status.broxiva.com |

## Support & Contacts

- **Website**: https://www.broxiva.com
- **API Documentation**: https://api.broxiva.com/docs
- **Support Email**: support@broxiva.com
- **Status Page**: https://status.broxiva.com

## License

This project is proprietary. All rights reserved.

---

**Broxiva** - Premium Global E-Commerce Platform
