# Broxiva Backend API

NestJS-based REST API for the Broxiva e-commerce platform.

## Prerequisites

- Node.js 20+ (LTS recommended)
- PostgreSQL 16+
- Redis 7+
- pnpm 10+ (package manager)

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Generate Prisma client**
   ```bash
   pnpm prisma:generate
   ```

4. **Run database migrations**
   ```bash
   pnpm migrate
   ```

5. **Seed the database (optional)**
   ```bash
   pnpm db:seed
   ```

## Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment: development, production, test |
| `PORT` | API port (default: 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret (min 64 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `AWS_S3_BUCKET` | S3 bucket for file uploads |

**Security Note:** Generate secrets with `openssl rand -base64 64`

## Development

```bash
# Start development server with hot reload
pnpm dev

# Start production server
pnpm start:prod

# Debug mode
pnpm start:debug
```

## Database Migrations

```bash
# Create and apply migrations (development)
pnpm migrate

# Apply migrations (production)
pnpm migrate:deploy

# Reset database (WARNING: destroys all data)
pnpm migrate:reset

# Push schema changes without migration
pnpm db:push

# Open Prisma Studio
pnpm prisma:studio
```

### Seeding

```bash
pnpm db:seed              # General seed data
pnpm db:seed:categories   # Product categories
pnpm db:seed:tiers        # Subscription tiers
pnpm db:seed:prod         # Production seed data
```

## Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

# Run e2e tests with coverage
pnpm test:e2e:cov
```

## Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format
```

## API Documentation

Swagger documentation is available at `/api/docs` when the server is running.

```
http://localhost:4000/api/docs
```

## Project Structure

```
src/
├── common/              # Shared utilities, guards, decorators
│   ├── guards/          # JwtAuthGuard, AdminGuard, RolesGuard
│   ├── decorators/      # Custom decorators (@Roles, @Public)
│   ├── interceptors/    # Logging, caching, idempotency
│   ├── filters/         # Exception filters, Sentry integration
│   └── monitoring/      # Prometheus metrics
├── modules/             # Feature modules (59+)
│   ├── auth/            # JWT authentication, OAuth, MFA
│   ├── users/           # User management, GDPR compliance
│   ├── products/        # Product catalog with variants
│   ├── orders/          # Order processing & fulfillment
│   ├── payments/        # Stripe, PayPal, Flutterwave, Paystack
│   ├── cart/            # Shopping cart with abandonment recovery
│   ├── checkout/        # Multi-step checkout flows
│   ├── shipping/        # EasyPost integration (UPS, FedEx, USPS, DHL)
│   ├── returns/         # RMA system with refunds
│   ├── reviews/         # Product reviews & ratings
│   ├── ai/              # AI/ML modules (12 submodules)
│   │   ├── smart-search/
│   │   ├── recommendations/
│   │   ├── chatbot/
│   │   ├── fraud-detection/
│   │   ├── pricing-engine/
│   │   └── ...
│   ├── admin/           # Admin dashboard, impersonation
│   ├── vendors/         # Multi-vendor marketplace
│   ├── analytics/       # Business analytics
│   ├── marketing/       # Campaigns, email marketing
│   ├── loyalty/         # Rewards & points system
│   ├── compliance/      # GDPR, KYC/KYB
│   ├── billing-audit/   # Financial compliance
│   └── ...
└── prisma/              # Database client
prisma/
├── schema.prisma        # Database schema (100+ models)
├── migrations/          # Migration files
└── seeds/               # Seed scripts
test/
└── *.e2e-spec.ts        # E2E tests
```

## Backend Modules (70+ Active)

### Core E-Commerce
`products` `orders` `cart` `checkout` `payments` `shipping` `returns` `reviews` `categories` `variants` `inventory` `wishlist` `coupons` `gift-cards` `subscriptions`

### AI/ML (12 modules)
`smart-search` `recommendations` `chatbot` `fraud-detection` `pricing-engine` `demand-forecasting` `personalization` `content-generation` `ar-tryon` `cart-abandonment` `conversational` `revenue-optimization`

### Business
`vendors` `analytics` `marketing` `loyalty` `deals` `enterprise` `growth` `cross-border` `bnpl` `tax` `compliance` `support`

### Platform
`auth` `users` `admin` `notifications` `webhooks` `health` `seo` `i18n` `privacy` `tracking` `organization` `billing-audit` `recaptcha`

### Marketing Platform (11 modules, 150+ endpoints)
`marketing-seo` `marketing-content` `marketing-growth` `marketing-lifecycle` `marketing-analytics` `marketing-personalization` `experiments` `marketing-reputation` `marketing-localization` `marketing-commerce` `marketing-ai`

## Key Technologies

| Category | Technologies |
|----------|--------------|
| **Framework** | NestJS 10.4 with TypeScript |
| **Database** | PostgreSQL 16 with Prisma ORM 6.2 |
| **Caching** | Redis 7 with Bull queues |
| **Authentication** | JWT with Passport, OAuth 2.0, MFA (TOTP) |
| **Payments** | Stripe, PayPal, Flutterwave, Paystack, Apple/Google IAP |
| **Shipping** | EasyPost (UPS, FedEx, USPS, DHL) |
| **Search** | Elasticsearch 9, Algolia |
| **File Storage** | AWS S3, Azure Blob |
| **Email** | AWS SES with Handlebars templates |
| **Monitoring** | Sentry, Prometheus, health checks |

## Security Features

- JWT authentication with refresh token rotation
- Role-based access control (RBAC): Customer, Vendor, Admin, SuperAdmin
- Rate limiting on all endpoints
- MFA with TOTP and backup codes
- Account lockout (5 attempts, exponential backoff)
- IDOR protection on all resource endpoints
- Input validation with class-validator
- SQL injection prevention via Prisma ORM
- CORS and CSRF protection
