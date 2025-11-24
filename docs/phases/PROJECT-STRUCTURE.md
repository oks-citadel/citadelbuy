# CitadelBuy E-Commerce Platform - Project Structure

**Version:** 2.0.0
**Last Updated:** 2025-11-21
**Status:** Production Ready

## Overview

This document describes the complete, standardized project structure for the CitadelBuy e-commerce platform. The structure is organized for scalability, maintainability, and production deployment.

---

## Table of Contents

1. [Root Directory Structure](#root-directory-structure)
2. [Backend Structure](#backend-structure)
3. [Frontend Structure](#frontend-structure)
4. [Infrastructure Structure](#infrastructure-structure)
5. [Documentation Structure](#documentation-structure)
6. [Environment Configuration](#environment-configuration)

---

## Root Directory Structure

```
CitadelBuy-Commerce/
├── citadelbuy/                    # Main monorepo
│   ├── backend/                   # NestJS Backend API
│   ├── frontend/                  # Next.js Frontend
│   ├── infrastructure/            # Docker, K8s, Terraform
│   ├── .github/workflows/         # CI/CD Pipelines
│   └── docs/                      # Project documentation
├── docs/                          # Root-level documentation
│   ├── architecture/              # Architecture diagrams
│   ├── deployment/                # Deployment guides
│   ├── api/                       # API documentation
│   └── completed/                 # Completed phase docs
├── .gitignore                     # Git ignore rules
├── PROJECT-STRUCTURE.md           # This file
└── README.md                      # Project overview
```

---

## Backend Structure

```
citadelbuy/backend/
├── src/
│   ├── common/                    # Shared utilities
│   │   ├── constants/             # Application constants
│   │   ├── controllers/           # Base controllers
│   │   ├── decorators/            # Custom decorators
│   │   ├── exceptions/            # Custom exceptions
│   │   ├── filters/               # Exception filters
│   │   ├── guards/                # Auth & role guards
│   │   ├── interceptors/          # Request/response interceptors
│   │   ├── middleware/            # HTTP middleware
│   │   ├── prisma/                # Database client
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── redis/                 # Cache service
│   │   │   ├── redis.module.ts
│   │   │   ├── redis.service.ts
│   │   │   ├── cache.decorator.ts
│   │   │   ├── cache.interceptor.ts
│   │   │   └── cache-invalidation.interceptor.ts
│   │   └── types/                 # Shared TypeScript types
│   │
│   ├── config/                    # Configuration modules
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── jwt.config.ts
│   │
│   ├── modules/                   # Feature modules (40+ modules)
│   │   ├── admin/                 # Admin management
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── dto/
│   │   ├── analytics/             # Analytics & reporting
│   │   ├── analytics-advanced/    # Advanced analytics
│   │   ├── analytics-dashboard/   # Dashboard stats
│   │   ├── auth/                  # Authentication & authorization
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   └── dto/
│   │   ├── advertisements/        # Ad management
│   │   ├── bnpl/                  # Buy Now Pay Later
│   │   ├── cart/                  # Shopping cart
│   │   ├── categories/            # Product categories
│   │   ├── coupons/               # Coupon management
│   │   ├── deals/                 # Deal/promotion management
│   │   ├── email/                 # Email service
│   │   ├── gift-cards/            # Gift card system
│   │   ├── health/                # Health checks
│   │   ├── i18n/                  # Internationalization
│   │   ├── inventory/             # Inventory management
│   │   ├── loyalty/               # Loyalty program
│   │   ├── mobile/                # Mobile API
│   │   ├── orders/                # Order management
│   │   ├── payments/              # Payment processing
│   │   ├── platform/              # Platform settings
│   │   ├── products/              # Product management
│   │   ├── recommendations/       # AI recommendations
│   │   ├── returns/               # Return management
│   │   ├── reviews/               # Product reviews
│   │   ├── search/                # Search (Elasticsearch)
│   │   ├── security/              # Security features
│   │   ├── seo/                   # SEO optimization
│   │   ├── shipping/              # Shipping management
│   │   ├── social/                # Social features
│   │   ├── subscriptions/         # Subscription management
│   │   ├── support/               # Customer support
│   │   ├── tax/                   # Tax calculation
│   │   ├── tracking/              # Order tracking
│   │   ├── users/                 # User management
│   │   ├── variants/              # Product variants
│   │   ├── vendors/               # Vendor management
│   │   └── wishlist/              # Wishlist management
│   │
│   ├── test/                      # Test utilities
│   │   ├── helpers/
│   │   │   └── test-utils.ts      # Testing helpers
│   │   └── factories/
│   │       └── entity.factory.ts  # Mock data factories
│   │
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Root controller
│   ├── app.service.ts             # Root service
│   └── main.ts                    # Application entry point
│
├── prisma/                        # Database schema & migrations
│   ├── schema.prisma              # Prisma schema
│   ├── migrations/                # Database migrations
│   ├── seed.ts                    # Database seed
│   └── seed.production.ts         # Production seed
│
├── test/                          # E2E tests
│   └── e2e/
│       └── *.e2e-spec.ts
│
├── dist/                          # Compiled output (gitignored)
├── coverage/                      # Test coverage (gitignored)
├── node_modules/                  # Dependencies (gitignored)
│
├── .env.example                   # Environment template
├── .env                           # Local environment (gitignored)
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── jest.config.js                 # Jest configuration
├── nest-cli.json                  # NestJS CLI configuration
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.build.json            # Build TypeScript configuration
├── Dockerfile                     # Production Dockerfile
└── README.md                      # Backend documentation
```

### Backend Module Pattern

Each module follows this structure:

```
module-name/
├── module-name.module.ts          # Module definition
├── module-name.controller.ts      # REST/GraphQL controller
├── module-name.service.ts         # Business logic
├── module-name.controller.spec.ts # Controller tests
├── module-name.service.spec.ts    # Service tests
├── dto/                           # Data Transfer Objects
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── query-*.dto.ts
├── entities/                      # TypeORM entities (if used)
│   └── *.entity.ts
└── interfaces/                    # TypeScript interfaces
    └── *.interface.ts
```

---

## Frontend Structure

```
citadelbuy/frontend/
├── public/                        # Static assets
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (routes)/              # Route groups
│   │   │   ├── account/
│   │   │   │   └── store-credit/page.tsx
│   │   │   ├── admin/             # Admin pages
│   │   │   │   ├── page.tsx
│   │   │   │   ├── i18n/
│   │   │   │   ├── orders/
│   │   │   │   ├── products/
│   │   │   │   ├── returns/
│   │   │   │   └── vendors/
│   │   │   ├── auth/              # Authentication pages
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── forgot-password/
│   │   │   │   └── reset-password/
│   │   │   ├── cart/              # Cart page
│   │   │   ├── categories/        # Category listings
│   │   │   ├── checkout/          # Checkout flow
│   │   │   ├── deals/             # Deals pages
│   │   │   ├── gift-cards/        # Gift card pages
│   │   │   ├── inventory/         # Inventory management
│   │   │   ├── loyalty/           # Loyalty program
│   │   │   ├── orders/            # Order history
│   │   │   ├── products/          # Product pages
│   │   │   ├── profile/           # User profile
│   │   │   ├── returns/           # Returns management
│   │   │   ├── vendor/            # Vendor dashboard
│   │   │   └── wishlist/          # Wishlist page
│   │   ├── api/                   # API routes
│   │   │   └── newsletter/
│   │   │       └── subscribe/route.ts
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Homepage
│   │   ├── providers.tsx          # Context providers
│   │   ├── root-layout-client.tsx # Client layout wrapper
│   │   └── not-found.tsx          # 404 page
│   │
│   ├── components/                # React components
│   │   ├── admin/                 # Admin-specific components
│   │   ├── advertisements/        # Ad components
│   │   ├── analytics/             # Analytics widgets
│   │   ├── auth/                  # Auth components
│   │   │   ├── auth-provider.tsx
│   │   │   └── protected-route.tsx
│   │   ├── bnpl/                  # BNPL components
│   │   ├── cart/                  # Cart components
│   │   ├── checkout/              # Checkout components
│   │   ├── deals/                 # Deal components
│   │   ├── gift-cards/            # Gift card components
│   │   ├── i18n/                  # Internationalization
│   │   ├── layout/                # Layout components
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── mobile-menu.tsx
│   │   ├── loyalty/               # Loyalty components
│   │   ├── newsletter/            # Newsletter components
│   │   ├── products/              # Product components
│   │   ├── providers/             # Context providers
│   │   ├── recommendations/       # Recommendation widgets
│   │   ├── reviews/               # Review components
│   │   ├── search/                # Search components
│   │   ├── subscriptions/         # Subscription components
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   ├── page-transition.tsx
│   │   │   ├── scroll-animations.tsx
│   │   │   └── skeleton-card.tsx
│   │   └── wishlist/              # Wishlist components
│   │
│   ├── contexts/                  # React contexts
│   │   ├── auth.context.tsx
│   │   ├── cart.context.tsx
│   │   ├── i18n.context.tsx
│   │   └── theme.context.tsx
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-cart.ts
│   │   ├── use-i18n.ts
│   │   └── use-toast.ts
│   │
│   ├── lib/                       # Utility libraries
│   │   ├── analytics/             # Analytics utilities
│   │   ├── api/                   # API client
│   │   │   └── client.ts
│   │   ├── constants/             # Constants
│   │   ├── i18n/                  # i18n utilities
│   │   ├── privacy/               # Privacy utilities
│   │   ├── security/              # Security utilities
│   │   └── validators/            # Form validators
│   │
│   ├── middleware/                # Next.js middleware
│   │   └── auth.middleware.ts
│   │
│   ├── schemas/                   # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── product.schema.ts
│   │   └── order.schema.ts
│   │
│   ├── services/                  # Service layer
│   │   ├── auth.service.ts
│   │   ├── cart.service.ts
│   │   ├── product.service.ts
│   │   └── order.service.ts
│   │
│   ├── store/                     # State management (if using Redux/Zustand)
│   │   ├── slices/
│   │   └── store.ts
│   │
│   ├── styles/                    # Global styles
│   │   ├── globals.css
│   │   └── nprogress.css
│   │
│   └── types/                     # TypeScript types
│       ├── api.types.ts
│       ├── auth.types.ts
│       ├── product.types.ts
│       └── order.types.ts
│
├── e2e/                           # E2E tests (Playwright)
│   └── *.spec.ts
│
├── .next/                         # Next.js build output (gitignored)
├── node_modules/                  # Dependencies (gitignored)
│
├── .env.local                     # Local environment (gitignored)
├── .env.example                   # Environment template
├── .eslintrc.json                 # ESLint configuration
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies & scripts
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── Dockerfile                     # Production Dockerfile
└── README.md                      # Frontend documentation
```

---

## Infrastructure Structure

```
citadelbuy/infrastructure/
├── docker/                        # Docker configuration
│   ├── docker-compose.yml         # Main compose file
│   ├── docker-compose.dev.yml     # Development overrides
│   ├── docker-compose.prod.yml    # Production overrides
│   ├── .env.example               # Environment template
│   ├── nginx/                     # NGINX configuration
│   │   ├── nginx.conf             # Main NGINX config
│   │   ├── conf.d/                # Site configurations
│   │   │   ├── api.conf           # API gateway
│   │   │   ├── frontend.conf      # Frontend routing
│   │   │   └── websocket.conf     # WebSocket routing
│   │   └── ssl/                   # SSL certificates (gitignored)
│   ├── postgres/                  # PostgreSQL initialization
│   │   └── init.sql
│   ├── mongodb/                   # MongoDB initialization
│   │   └── init.js
│   └── redis/                     # Redis configuration
│       └── redis.conf
│
├── kubernetes/                    # Kubernetes manifests
│   ├── base/                      # Base configurations
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   ├── deployments/               # Deployment manifests
│   │   ├── frontend.yaml
│   │   ├── backend.yaml
│   │   ├── postgres.yaml
│   │   ├── mongodb.yaml
│   │   └── redis.yaml
│   ├── services/                  # Service manifests
│   │   ├── frontend-service.yaml
│   │   ├── backend-service.yaml
│   │   └── ingress.yaml
│   └── kustomization.yaml
│
└── terraform/                     # Terraform IaC
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    ├── provider.tf
    ├── modules/
    │   ├── vpc/
    │   ├── eks/
    │   ├── rds/
    │   └── redis/
    └── environments/
        ├── dev/
        ├── staging/
        └── production/
```

---

## Documentation Structure

```
docs/
├── architecture/                  # Architecture documentation
│   ├── SYSTEM-ARCHITECTURE.md     # Overall system design
│   ├── DATABASE-SCHEMA.md         # Database design
│   ├── API-ARCHITECTURE.md        # API design patterns
│   └── diagrams/                  # Architecture diagrams
│       ├── system-overview.png
│       ├── data-flow.png
│       └── deployment.png
│
├── deployment/                    # Deployment guides
│   ├── DEPLOYMENT-GUIDE.md
│   ├── DOCKER-GUIDE.md
│   ├── KUBERNETES-GUIDE.md
│   └── RAILWAY-GUIDE.md
│
├── api/                           # API documentation
│   ├── REST-API.md
│   ├── GRAPHQL-API.md
│   ├── WEBSOCKET-API.md
│   └── postman/
│       └── collection.json
│
├── development/                   # Development guides
│   ├── SETUP-GUIDE.md
│   ├── CODING-STANDARDS.md
│   ├── TESTING-GUIDE.md
│   └── CONTRIBUTING.md
│
├── features/                      # Feature documentation
│   ├── authentication.md
│   ├── payment-processing.md
│   ├── search-system.md
│   └── analytics.md
│
└── completed/                     # Completed phase documentation
    ├── phase-27-gift-cards.md
    ├── phase-30-complete.md
    └── phase-50-complete.md
```

---

## Environment Configuration

### Backend (.env)

```env
# Application
NODE_ENV=development
PORT=4000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/citadelbuy
DATABASE_CONNECTION_LIMIT=10
DATABASE_POOL_TIMEOUT=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@citadelbuy.com

# Payment Providers
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# External Services
ELASTICSEARCH_NODE=http://localhost:9200
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=citadelbuy-assets

# Monitoring
SENTRY_DSN=...
GOOGLE_ANALYTICS_ID=...

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Frontend (.env.local)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_PWA=true

# External Services
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-...
NEXT_PUBLIC_SENTRY_DSN=...

# CDN
NEXT_PUBLIC_CDN_URL=https://cdn.citadelbuy.com
NEXT_PUBLIC_IMAGE_DOMAIN=images.citadelbuy.com
```

---

## Module Count Summary

### Backend Modules (40+)
- Core: auth, users, admin, health
- E-Commerce: products, orders, cart, checkout, payments
- Vendor: vendors, inventory, shipping, returns
- Marketing: deals, coupons, gift-cards, loyalty, subscriptions
- Content: reviews, recommendations, search, seo
- Advanced: analytics, analytics-advanced, analytics-dashboard
- Utilities: email, i18n, mobile, security, support, tax, tracking

### Frontend Pages (30+)
- Public: home, products, categories, deals
- Auth: login, register, forgot-password, reset-password
- User: profile, orders, wishlist, loyalty
- E-Commerce: cart, checkout
- Vendor: dashboard, products, orders, analytics, payouts
- Admin: dashboard, products, orders, vendors, returns, i18n

---

## Technology Stack

### Backend
- **Framework**: NestJS 10.3
- **Language**: TypeScript 5.3
- **Database**: PostgreSQL 16, Prisma ORM
- **Cache**: Redis 7
- **Search**: Elasticsearch 9
- **Queue**: (RabbitMQ/Kafka planned)
- **Testing**: Jest, Supertest

### Frontend
- **Framework**: Next.js 15.5.6
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3, shadcn/ui
- **State**: React Query, Context API
- **Animation**: Framer Motion
- **Testing**: Playwright, Jest

### Infrastructure
- **Containers**: Docker, Docker Compose
- **Orchestration**: Kubernetes (optional)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Deployment**: Railway, AWS, Self-hosted

---

## Project Statistics

- **Total Backend Modules**: 40+
- **Total Frontend Pages**: 30+
- **Total Components**: 100+
- **Database Models**: 60+
- **API Endpoints**: 200+
- **Test Coverage**: 73.89% (Target: 85%+)
- **Lines of Code**: 50,000+

---

## Next Steps

1. **Build Docker Images**: See `infrastructure/docker/README.md`
2. **Deploy to Production**: See `docs/deployment/DEPLOYMENT-GUIDE.md`
3. **Setup CI/CD**: See `.github/workflows/`
4. **Configure Monitoring**: See integration docs

---

## Conclusion

This structure provides a clean, scalable, and production-ready foundation for the CitadelBuy e-commerce platform. All components are organized logically, follow industry best practices, and are ready for deployment.

For detailed information on specific components, refer to the individual README files in each directory.
