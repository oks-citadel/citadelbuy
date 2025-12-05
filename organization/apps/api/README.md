# CitadelBuy Backend API

The CitadelBuy Backend API is a comprehensive, enterprise-grade NestJS application that powers the entire CitadelBuy e-commerce platform. It provides robust REST and WebSocket APIs for multi-vendor marketplace functionality, AI-powered features, advanced analytics, and seamless integrations with payment providers, shipping carriers, and third-party services.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Module Overview](#module-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

## Overview

### Key Features

- **Multi-Vendor Marketplace**: Complete vendor management with organization-level controls
- **Advanced Authentication**: JWT-based auth with 2FA, social login (Google, Facebook, Apple, GitHub)
- **Payment Processing**: Integrated with Stripe, PayPal, Flutterwave, and Paystack
- **AI-Powered Features**: Product recommendations, visual search, chatbot, dynamic pricing
- **Real-Time Communication**: WebSocket support for live chat, notifications, and updates
- **Advanced Search**: Elasticsearch and Algolia integration with full-text search
- **Comprehensive Analytics**: Customer insights, vendor dashboards, and business intelligence
- **Cart Abandonment**: Automated email campaigns with queue-based processing
- **Tax & Shipping**: Multi-carrier shipping integration and automated tax calculation
- **Security**: Rate limiting, encryption, KYC verification, and audit logging

### Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Search**: Elasticsearch / Algolia
- **Queue**: Bull (Redis-based)
- **Real-time**: Socket.IO
- **Email**: Nodemailer with Handlebars templates
- **Testing**: Jest with Supertest

## Architecture

### Design Patterns

- **Modular Architecture**: Feature-based modules with clear boundaries
- **Domain-Driven Design**: Business logic encapsulated in service layers
- **CQRS Pattern**: Separation of read and write operations where applicable
- **Event-Driven**: Event emitters for cross-module communication
- **Queue-Based Processing**: Asynchronous tasks via Bull queues

### Core Components

```
src/
├── common/           # Shared utilities, guards, interceptors
├── modules/          # Feature modules (48 modules)
├── main.ts          # Application bootstrap
└── app.module.ts    # Root module
```

## Module Overview

The API consists of 48 specialized modules organized by domain:

### Core Modules

- **auth**: Authentication & authorization (JWT, OAuth, 2FA)
- **users**: User management and profiles
- **organizations**: Multi-vendor organization management
- **products**: Product catalog and management
- **categories**: Hierarchical product categorization
- **variants**: Product variants and SKU management

### Commerce Modules

- **cart**: Shopping cart with session management
- **checkout**: Order processing and payment orchestration
- **orders**: Order lifecycle management
- **payments**: Multi-provider payment processing
- **shipping**: Multi-carrier shipping integration
- **tax**: Automated tax calculation (US sales tax, VAT, GST)
- **coupons**: Discount codes and promotions
- **deals**: Flash sales and special offers
- **gift-cards**: Gift card issuance and redemption

### Advanced Features

- **ai**: AI-powered recommendations and visual search
- **search**: Elasticsearch/Algolia integration
- **recommendations**: Personalized product suggestions
- **reviews**: Product reviews and ratings
- **wishlist**: User wishlists and favorites
- **loyalty**: Loyalty points and rewards program
- **subscriptions**: Recurring billing and subscriptions
- **bnpl**: Buy Now, Pay Later integration

### Analytics & Insights

- **analytics**: Core analytics engine
- **analytics-advanced**: Advanced business intelligence
- **analytics-dashboard**: Dashboard data aggregation
- **tracking**: User behavior and conversion tracking
- **seo**: SEO optimization and sitemap generation

### Communication

- **email**: Transactional email with templates
- **notifications**: Multi-channel notifications (push, email, SMS)
- **support**: Customer support ticketing
- **social**: Social media integration

### Organization Features

- **organization-roles**: Role-based access control (RBAC)
- **organization-billing**: Organization billing and invoicing
- **organization-kyc**: KYC verification for vendors
- **organization-audit**: Audit logging and compliance

### Infrastructure

- **health**: Health checks and monitoring
- **webhooks**: Webhook management for integrations
- **platform**: Platform-wide settings and configuration
- **security**: Security features (rate limiting, IP blocking)
- **privacy**: GDPR compliance and data privacy
- **i18n**: Internationalization and localization

### Vendor & Mobile

- **vendors**: Vendor-specific operations
- **mobile**: Mobile app-specific endpoints
- **advertisements**: Ad management for vendors
- **inventory**: Stock management and tracking
- **returns**: Return and refund processing

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher (LTS recommended)
- **pnpm**: v8.x or higher (package manager)
- **PostgreSQL**: v14.x or higher
- **Redis**: v7.x or higher
- **Docker** (optional): For running services locally

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd citadelbuy-master/organization
   ```

2. **Install dependencies**:
   ```bash
   # From the organization root
   pnpm install

   # Or from apps/api directory
   cd apps/api
   pnpm install
   ```

3. **Generate Prisma Client**:
   ```bash
   pnpm prisma:generate
   ```

## Environment Configuration

Create a `.env` file in `apps/api/` by copying the example:

```bash
cp .env.example .env
```

### Critical Environment Variables

#### Database
```env
DATABASE_URL="postgresql://user:password@localhost:5432/citadelbuy_dev?schema=public"
REDIS_URL="redis://localhost:6379"
```

#### Security (MUST CHANGE!)
```bash
# Generate secure JWT secrets:
openssl rand -base64 64
```

```env
JWT_SECRET=<your-generated-secret>
JWT_REFRESH_SECRET=<different-generated-secret>
KYC_ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
```

#### Application
```env
NODE_ENV=development
PORT=4000
API_PREFIX=/api
FRONTEND_URL=http://localhost:3000
```

#### Payment Providers
```env
# Stripe
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_ENABLED=true
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox
```

#### Storage
```env
STORAGE_PROVIDER=S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=citadelbuy-uploads
```

#### Search
```env
SEARCH_PROVIDER=auto
ELASTICSEARCH_NODE=http://localhost:9200
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...
```

#### AI Features
```env
OPENAI_API_KEY=sk-proj-...
GOOGLE_CLOUD_PROJECT_ID=...
```

#### Social Login
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```

See `.env.example` for the complete list of environment variables with detailed documentation.

## Database Setup

### 1. Start PostgreSQL

**Using Docker**:
```bash
docker run --name citadelbuy-postgres \
  -e POSTGRES_USER=citadelbuy \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=citadelbuy_dev \
  -p 5432:5432 \
  -d postgres:14
```

**Or use docker-compose** from project root:
```bash
docker-compose up -d postgres
```

### 2. Run Migrations

```bash
# Apply all pending migrations
pnpm migrate

# Or use Prisma CLI directly
pnpm prisma migrate deploy
```

### 3. Seed the Database

```bash
# Seed with development data
pnpm db:seed

# Seed categories
pnpm db:seed:categories

# Seed subscription tiers
pnpm db:seed:tiers

# Seed organization module data
pnpm db:seed:organization
```

### 4. Open Prisma Studio (optional)

View and edit database records:
```bash
pnpm prisma:studio
```

Access at: http://localhost:5555

## Running the Application

### Development Mode

Start the API with hot-reload:
```bash
pnpm dev
```

API will be available at: http://localhost:4000

### Debug Mode

Start with Node.js debugger attached:
```bash
pnpm start:debug
```

Attach your debugger to port 9229.

### Production Build

```bash
# Build the application
pnpm build

# Run production build
pnpm start:prod
```

### Using Docker

Build and run with Docker:
```bash
# From project root
docker-compose up api

# Or build separately
docker build -t citadelbuy-api -f infrastructure/docker/Dockerfile .
docker run -p 4000:4000 citadelbuy-api
```

## Testing

### Unit Tests

Run all unit tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Run with coverage report:
```bash
pnpm test:cov
```

Coverage reports will be generated in `coverage/` directory.

### E2E Tests

Run end-to-end tests:
```bash
pnpm test:e2e
```

Run E2E tests with coverage:
```bash
pnpm test:e2e:cov
```

Available E2E test suites:
- `test/auth.e2e-spec.ts` - Authentication flows
- `test/checkout.e2e-spec.ts` - Checkout process
- `test/shopping.e2e-spec.ts` - Shopping flows
- `test/organization.e2e-spec.ts` - Organization management

### Running Specific Tests

```bash
# Run specific test file
pnpm test auth.service.spec.ts

# Run tests matching pattern
pnpm test --testNamePattern="should authenticate user"
```

## API Documentation

### Swagger UI

The API includes comprehensive Swagger/OpenAPI documentation:

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Access Swagger UI at:
   ```
   http://localhost:4000/api/docs
   ```

### API Endpoints Overview

- **Authentication**: `/api/auth/*`
- **Users**: `/api/users/*`
- **Products**: `/api/products/*`
- **Cart**: `/api/cart/*`
- **Checkout**: `/api/checkout/*`
- **Orders**: `/api/orders/*`
- **Organizations**: `/api/organizations/*`
- **Analytics**: `/api/analytics/*`
- **AI Features**: `/api/ai/*`

### WebSocket Events

The API supports WebSocket connections for real-time features:

**Connect to WebSocket**:
```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' }
});
```

**Available Events**:
- `cart:updated` - Cart changes
- `order:status` - Order status updates
- `notification:new` - New notifications
- `chat:message` - Live chat messages

## Common Development Tasks

### Add a New Module

```bash
# Generate a new module
nest generate module modules/my-feature
nest generate service modules/my-feature
nest generate controller modules/my-feature
```

### Update Database Schema

1. Edit `prisma/schema.prisma`
2. Create migration:
   ```bash
   pnpm prisma migrate dev --name add-new-field
   ```
3. Migration will be applied automatically

### Add New Environment Variable

1. Add to `.env.example` with documentation
2. Add to validation schema in `src/common/config/env.validation.ts`
3. Access in code via `ConfigService`:
   ```typescript
   constructor(private configService: ConfigService) {}

   someMethod() {
     const value = this.configService.get('MY_VAR');
   }
   ```

### Run Database Migrations in Production

```bash
pnpm migrate:deploy
```

### Reset Database

```bash
# WARNING: This will delete all data!
pnpm migrate:reset
```

### Format Code

```bash
# Format all files
pnpm format

# Lint and fix issues
pnpm lint
```

### View Logs

Logs are output to console in development. In production, configure a logging service:

```typescript
// Access logger in any service
constructor(private logger: Logger) {}

this.logger.log('Info message');
this.logger.error('Error message');
this.logger.warn('Warning message');
```

## Troubleshooting

### Port Already in Use

If port 4000 is already in use:
```bash
# Change port in .env
PORT=4001
```

Or kill the process:
```bash
# Find process
lsof -i :4000

# Kill it
kill -9 <PID>
```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Test connection:
   ```bash
   psql -h localhost -U citadelbuy -d citadelbuy_dev
   ```

3. Check `DATABASE_URL` in `.env`

### Redis Connection Issues

1. Verify Redis is running:
   ```bash
   docker ps | grep redis
   # Or
   redis-cli ping
   ```

2. Check `REDIS_URL` in `.env`

### Prisma Issues

Clear Prisma cache and regenerate:
```bash
rm -rf node_modules/.prisma
pnpm prisma:generate
```

### Elasticsearch Not Working

1. Check Elasticsearch is running:
   ```bash
   curl http://localhost:9200
   ```

2. Set fallback in `.env`:
   ```env
   SEARCH_PROVIDER=auto
   ```

   This will try Elasticsearch, then Algolia, then internal search.

### Tests Failing

1. Ensure test database is set up:
   ```bash
   NODE_ENV=test pnpm migrate:deploy
   ```

2. Clear Jest cache:
   ```bash
   pnpm test --clearCache
   ```

3. Run tests with verbose output:
   ```bash
   pnpm test --verbose
   ```

### Memory Issues

Increase Node.js memory:
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm dev
```

### Module Import Errors

Rebuild and restart:
```bash
rm -rf dist
pnpm build
pnpm dev
```

## Project Structure

```
apps/api/
├── prisma/
│   ├── migrations/           # Database migrations
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Seed script
│   └── seeds/               # Modular seed scripts
├── src/
│   ├── common/              # Shared code
│   │   ├── config/          # Configuration
│   │   ├── decorators/      # Custom decorators
│   │   ├── guards/          # Auth guards
│   │   ├── interceptors/    # HTTP interceptors
│   │   ├── pipes/           # Validation pipes
│   │   └── redis/           # Redis service
│   ├── modules/             # Feature modules (48 total)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── orders/
│   │   └── ...
│   ├── app.module.ts        # Root module
│   └── main.ts              # Entry point
├── test/
│   ├── helpers/             # Test utilities
│   ├── auth.e2e-spec.ts
│   ├── checkout.e2e-spec.ts
│   └── ...
├── .env.example             # Environment template
├── nest-cli.json            # NestJS CLI config
├── package.json
├── tsconfig.json
└── README.md
```

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [API Swagger Docs](http://localhost:4000/api/docs) (when running)
- [Project Wiki](#) (link to your wiki)
- [Contributing Guidelines](../../CONTRIBUTING.md)

## Support

For issues and questions:

- Create an issue on GitHub
- Check existing documentation
- Contact the development team
- Review Swagger API docs

## License

[Your License Here]
