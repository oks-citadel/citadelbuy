# Broxiva E-Commerce Platform

A next-generation AI-powered premium global e-commerce platform built with modern technologies and enterprise-grade architecture.

**Domain:** www.broxiva.com
**Cloud Provider:** AWS (Primary) / Azure (Secondary)
**DNS Registrar:** GoDaddy

## Platform Status

| Component | Status | Version |
|-----------|--------|---------|
| API Backend | Production Ready | 2.0.0 |
| Web Frontend | Production Ready | 2.0.0 |
| Mobile App | Production Ready | 2.0.0 |
| Infrastructure | Deployed | Terraform v1.5+ |

## Key Features

### E-Commerce Core
- Multi-vendor marketplace with 70+ backend modules
- Product catalog with variants, categories, and search
- Shopping cart with abandonment recovery
- Multi-step checkout (standard, express, guest)
- Order management with full lifecycle tracking
- Returns and refunds with RMA system
- Inventory management with real-time sync

### AI-Powered Features
- **Smart Search** - Typo-tolerant, semantic search with Elasticsearch & Algolia
- **Recommendations** - Collaborative filtering, similar products
- **AI Chatbot** - 24/7 support with sentiment analysis and human handoff
- **Fraud Detection** - ML-based transaction risk scoring
- **Dynamic Pricing** - Competitive pricing engine
- **Demand Forecasting** - Inventory optimization
- **Visual Search** - Image-based product discovery with Google Vision, AWS Rekognition, and Clarifai integration

### Marketing Platform (11 Modules, 150+ Endpoints)
Self-hosted marketing automation with no external dependencies:

- **SEO & Discoverability** - Dynamic sitemaps, robots.txt, JSON-LD schemas, Core Web Vitals monitoring
- **Content Management** - CMS with versioning, scheduling, and media optimization
- **Growth & Acquisition** - Campaigns, landing pages, referral programs, affiliate management
- **Lifecycle Marketing** - Email lists, segments, triggers, drip campaigns, broadcasts
- **Self-Hosted Analytics** - Event ingestion, funnels, cohorts, attribution (no Google Analytics)
- **Personalization** - User profiles, rules engine, next-best-action recommendations
- **Experimentation** - A/B testing, feature flags, statistical significance analysis
- **Reputation** - Reviews aggregation, testimonials, NPS/CSAT surveys
- **Localization** - Geo pricing, currency conversion, PPP adjustments
- **Commerce Integration** - Upsells, cross-sells, coupons, banners, popups
- **AI Marketing** - Lead scoring, churn prediction, content generation, lookalike audiences

### Payment Integrations
- Stripe (cards, Apple Pay, Google Pay)
- PayPal
- Flutterwave (Africa)
- Paystack (Africa)
- Buy Now Pay Later (BNPL)

### Security & Compliance
- WCAG 2.1 AA accessibility compliance
- GDPR/CCPA data privacy compliance
- PCI DSS compliant payment processing
- SOC 2 Type II ready architecture
- Rate limiting and DDoS protection
- CodeQL SAST in CI/CD pipeline

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

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React 18, TypeScript, Tailwind CSS, Radix UI |
| **Mobile** | React Native, Expo 50, NativeWind |
| **Backend** | NestJS 10, Prisma ORM, PostgreSQL 16 |
| **Caching** | Redis 7, ElastiCache |
| **Search** | Elasticsearch 9, Algolia |
| **Cloud** | AWS (EKS, RDS, S3, CloudFront) |
| **CI/CD** | GitHub Actions with CodeQL SAST |
| **IaC** | Terraform 1.5+, Kubernetes |
| **Monitoring** | Prometheus, Grafana, Sentry |

### Backend Modules (70+)

**Core E-Commerce:** products, orders, cart, checkout, payments, shipping, returns, reviews, categories, variants, inventory, wishlist, coupons, gift-cards, subscriptions

**AI/ML (12 modules):** smart-search, recommendations, chatbot, fraud-detection, pricing-engine, demand-forecasting, personalization, content-generation, ar-tryon, cart-abandonment, conversational, revenue-optimization

**Business:** vendors, analytics, marketing, loyalty, deals, enterprise, growth, cross-border, bnpl, tax, compliance, support

**Platform:** auth, users, admin, notifications, webhooks, health, seo, i18n, privacy, tracking, organization, experiments, billing-audit

**Marketing Platform (11 modules):** seo, content, growth, lifecycle, analytics, personalization, experiments, reputation, localization, commerce, ai-marketing

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
