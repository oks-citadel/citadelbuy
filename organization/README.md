# CitadelBuy E-Commerce Platform

A next-generation AI-powered e-commerce platform built with modern technologies and enterprise-grade architecture.

## Test User Accounts for Frontend Verification

```
╔═══════════════════════════════════════════════════════════════════════╗
║                    TEST USER ACCOUNT #1                                ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Email:     customer@citadelbuy.com                                    ║
║  Password:  password123                                                ║
║  Role:      CUSTOMER                                                   ║
║                                                                        ║
║  Pre-configured with:                                                  ║
║  • Shipping address (123 Main Street, New York, NY 10001)              ║
║  • Order history (delivered, shipped, processing orders)               ║
║  • Can browse products, add to cart, checkout                          ║
╚═══════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════╗
║                    TEST USER ACCOUNT #2                                ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Email:     jane@example.com                                           ║
║  Password:  password123                                                ║
║  Role:      CUSTOMER                                                   ║
║                                                                        ║
║  Pre-configured with:                                                  ║
║  • Shipping address (456 Oak Avenue, Los Angeles, CA 90001)            ║
║  • Order history (shipped, pending orders)                             ║
║  • Wishlist items, saved products                                      ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Additional Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@citadelbuy.com` | `password123` |
| Vendor 1 | `vendor1@citadelbuy.com` | `password123` |
| Vendor 2 | `vendor2@citadelbuy.com` | `password123` |

## URLs (Development)

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

---

## Project Structure

```
organization/
├── apps/                          # Frontend applications
│   ├── web-app/                   # Next.js web application
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
│   └── mobile-app/                # React Native mobile app
│       ├── src/                   # Source code
│       ├── android/               # Android native code
│       ├── ios/                   # iOS native code
│       ├── tests/e2e/            # Detox E2E tests
│       └── .github/workflows/     # Mobile CI/CD
│
├── backend/                       # NestJS API backend
│   ├── src/                       # Source code
│   │   ├── common/               # Shared utilities
│   │   └── modules/              # Feature modules
│   ├── prisma/                    # Database schema & migrations
│   ├── test/                      # Unit & integration tests
│   └── .github/workflows/         # Backend CI/CD
│
├── infrastructure/                # Infrastructure as Code
│   ├── terraform/                 # Terraform modules
│   │   ├── modules/              # Reusable modules
│   │   │   ├── compute/          # AKS, ACR, App Service
│   │   │   ├── database/         # PostgreSQL, Redis
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
│   ├── ansible/                   # Configuration management
│   └── tests/                     # Infrastructure tests
│
├── shared-libraries/              # Shared code packages
│   ├── api-clients/              # API client SDKs
│   ├── ui-components/            # Shared UI components
│   └── utilities/                # Common utilities
│
├── documentation/                 # Project documentation
│   ├── architecture/             # Technical architecture
│   ├── business/                 # Business documentation
│   ├── development/              # Development guides
│   ├── phases/                   # Phase completion reports
│   ├── adr/                      # Architecture Decision Records
│   ├── runbooks/                 # Operations runbooks
│   └── guides/                   # User guides
│
├── scripts/                       # Utility scripts
│   ├── deploy-docker.sh          # Docker deployment
│   └── fix-controllers.sh        # Controller fixes
│
└── .github/                       # GitHub configurations
    ├── workflows/                 # CI/CD workflows
    ├── ISSUE_TEMPLATE/           # Issue templates
    └── PULL_REQUEST_TEMPLATE/    # PR templates
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   cd organization
   npm install
   ```

2. **Start infrastructure services:**
   ```bash
   npm run docker:up
   ```

3. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   cp apps/web-app/.env.example apps/web-app/.env
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run dev:web` | Start web app only |
| `npm run dev:backend` | Start backend only |
| `npm run build` | Build all workspaces |
| `npm run test` | Run all tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:visual` | Run visual regression tests |
| `npm run test:a11y` | Run accessibility tests |
| `npm run lint` | Lint all workspaces |
| `npm run docker:up` | Start Docker services |
| `npm run db:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## Testing

### Web App Testing

```bash
# Unit tests
npm run test:web

# E2E tests (Playwright)
npm run test:e2e

# Visual regression
npm run test:visual

# Accessibility (WCAG 2.1 AA)
npm run test:a11y

# Mobile viewports
npm run test:mobile --workspace=apps/web-app
```

### Backend Testing

```bash
# Unit tests
npm run test:backend

# Integration tests
npm run test:e2e --workspace=backend
```

### Mobile App Testing

```bash
# Detox E2E (iOS)
cd apps/mobile-app
detox test -c ios.sim.debug

# Detox E2E (Android)
detox test -c android.emu.debug
```

## Infrastructure

### Terraform Deployment

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
npm run docker:build

# Deploy stack
npm run docker:up

# View logs
npm run docker:logs
```

## Architecture

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Mobile:** React Native, Expo
- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Caching:** Redis
- **Cloud:** Azure (AKS, App Service, Blob Storage)
- **CI/CD:** GitHub Actions
- **IaC:** Terraform, Ansible

## Documentation

- [Architecture Overview](./documentation/architecture/ARCHITECTURE.md)
- [Development Guide](./documentation/development/DEVELOPMENT-GUIDE.md)
- [Quick Start Guide](./documentation/development/Quick-Start-Guide.md)
- [Contributing](./documentation/CONTRIBUTING.md)
- [Security](./documentation/SECURITY.md)

## License

This project is proprietary. See [LICENSE](./documentation/LICENSE) for details.
