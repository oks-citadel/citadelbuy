# CitadelBuy Global B2B Enterprise Marketplace

## Platform Overview

CitadelBuy is an AI-powered global B2B enterprise marketplace platform with 300+ AI capabilities across 38 categories, designed for multi-tenant enterprise operations, cross-border commerce, and intelligent automation.

### Key Features

- **AI-Powered Intelligence**: 300+ AI capabilities including fraud detection, personalization, dynamic pricing, demand forecasting, and conversational commerce
- **Enterprise Multi-Tenancy**: Organization-based architecture with departments, teams, roles, and permissions
- **Global Commerce**: Multi-currency support, cross-border payments, international shipping, tax compliance
- **Vendor Marketplace**: Complete vendor onboarding, product management, commission tracking, and payout systems
- **Advanced Analytics**: Real-time dashboards, predictive analytics, category insights, and performance metrics
- **Marketing Automation**: Cart abandonment recovery, dynamic pricing, targeted campaigns, and personalization
- **Mobile-First**: React Native apps for iOS/Android with deep linking and push notifications
- **Security & Compliance**: PCI DSS, GDPR, CCPA compliance with comprehensive security features

### Technology Stack

**Frontend**
- Next.js 15 + React 19 (Web applications)
- React Native + Expo (Mobile apps)
- Tailwind CSS + Radix UI (Design system)
- Zustand + React Query (State management)

**Backend**
- NestJS 10 (API server)
- PostgreSQL 16 (Primary database)
- Prisma ORM (Database layer)
- Redis 7 (Caching & sessions)
- Bull Queue (Background jobs)
- Elasticsearch 8 (Search engine)

**AI/ML Services** (Python FastAPI)
- Recommendation Engine
- Smart Search (Semantic + Visual)
- Fraud Detection
- Personalization
- Dynamic Pricing
- Demand Forecasting
- Chatbot & Conversational AI

**Infrastructure**
- Azure Kubernetes Service (AKS)
- Terraform (Infrastructure as Code)
- Docker + Azure Container Registry
- GitHub Actions (CI/CD)
- Prometheus + Grafana (Monitoring)

---

## Quick Start Guide

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Docker** & Docker Compose
- **PostgreSQL** 16+
- **Redis** 7+
- **Python** 3.11+ (for AI services)

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/oks-citadel/citadelbuy.git
cd citadelbuy/organization

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Start infrastructure (PostgreSQL, Redis, etc.)
pnpm docker:up

# 5. Setup database
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed

# 6. Start development servers
pnpm dev
```

**Access Points:**
- Web App: http://localhost:3000
- API: http://localhost:4000
- Admin Dashboard: http://localhost:3001
- API Docs: http://localhost:4000/api/docs

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## Architecture Summary

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 CDN (Azure CDN)                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│          Load Balancer (Azure App Gateway)              │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐      ┌─────▼────┐     ┌────▼─────┐
│  Web  │      │  Mobile  │     │  Admin   │
│  App  │      │   API    │     │   App    │
└───┬───┘      └─────┬────┘     └────┬─────┘
    │                │                │
    └────────────────┼────────────────┘
                     │
         ┌───────────▼───────────┐
         │   API Gateway (NestJS) │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐     ┌─────▼─────┐    ┌────▼────┐
│  Core  │     │AI Services│    │  Event  │
│  API   │     │  Gateway  │    │   Bus   │
└───┬────┘     └─────┬─────┘    └────┬────┘
    │                │                │
    ▼                ▼                ▼
┌─────────┐    ┌──────────┐     ┌─────────┐
│PostgreSQL│   │  Python  │     │  Redis  │
│    +     │   │AI Services│     │ Queue   │
│  Prisma  │   └──────────┘     └─────────┘
└─────────┘
```

### Core Domains

1. **Catalog & Inventory**: Products, categories, variants, inventory management
2. **Orders & Checkout**: Cart, checkout, payments, order fulfillment
3. **Users & Auth**: Authentication, authorization, profiles, permissions
4. **Vendors**: Onboarding, store management, commissions, payouts
5. **Organizations**: Multi-tenant structure, departments, teams, roles
6. **AI & Intelligence**: Recommendations, search, fraud, pricing, forecasting
7. **Marketing**: Campaigns, coupons, deals, abandoned cart recovery
8. **Analytics**: Dashboards, insights, reporting, KPIs

For detailed architecture, see [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md)

---

## Feature List

### E-Commerce Core
- Product Catalog with Categories & Filters
- Advanced Search & Filtering
- Shopping Cart & Wishlist
- Multi-step Checkout Flow
- Order Management & Tracking
- Returns & Refunds
- Product Reviews & Ratings
- Inventory Management
- Product Variants & Options

### Payments & Financial
- Stripe Integration (Cards, Wallets)
- PayPal Integration
- Buy Now Pay Later (BNPL)
- Multi-Currency Support
- International Payments
- Automated Refunds
- Commission Tracking
- Vendor Payouts
- Gift Cards & Store Credit

### AI & Intelligence
- Product Recommendations (Collaborative, Content-based)
- Smart Search (Semantic, Visual, Voice)
- Dynamic Pricing Engine
- Demand Forecasting
- Fraud Detection & Prevention
- Personalization Engine
- Chatbot & Virtual Assistant
- AR Try-On (Future)
- Sentiment Analysis

### Marketing & Growth
- Cart Abandonment Recovery
- Email Marketing Campaigns
- Discount Coupons & Promotions
- Flash Deals & Limited Offers
- Loyalty Programs
- Referral Programs
- Social Media Integration
- SEO Optimization
- A/B Testing

### Enterprise Features
- Multi-Tenant Organizations
- Department Management
- Team Collaboration
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Audit Logging
- KYC/KYB Verification
- Enterprise Billing
- API Key Management

### Vendor Platform
- Vendor Registration & Onboarding
- Store Customization
- Product Management
- Order Fulfillment
- Analytics Dashboard
- Commission Management
- Payout Scheduling
- Bulk Upload Tools
- Performance Metrics

### Global & Localization
- Multi-Currency (150+ currencies)
- Multi-Language (i18n)
- International Shipping
- Tax Calculation (Regional)
- Currency Conversion
- Localized Content
- Regional Payment Methods

### Mobile Features
- iOS & Android Apps
- Push Notifications
- Deep Linking
- Offline Support
- Biometric Authentication
- Mobile Payments
- QR Code Scanning

### Analytics & Reporting
- Real-time Dashboards
- Sales Analytics
- Customer Insights
- Product Performance
- Vendor Analytics
- Category Analytics
- Conversion Tracking
- Custom Reports

### Security & Compliance
- PCI DSS Compliance
- GDPR Compliance
- CCPA Compliance
- Data Encryption (AES-256)
- TLS 1.3
- Rate Limiting
- DDoS Protection
- Security Headers
- Vulnerability Scanning
- Privacy Controls

---

## Deployment Guide Links

### Development
- [Development Setup](./development/SETUP.md)
- [Environment Configuration](./development/ENVIRONMENT.md)
- [Testing Guide](./root/TESTING_SETUP_GUIDE.md)

### Infrastructure
- [Kubernetes Deployment](./infrastructure/kubernetes/DEPLOYMENT_CHECKLIST.md)
- [Docker Setup](./infrastructure/docker/README.md)
- [Terraform Infrastructure](./infrastructure/terraform/README.md)

### Operations
- [Deployment Runbook](./root/DEPLOYMENT_RUNBOOK.md)
- [Incident Response](./root/INCIDENT_RESPONSE.md)
- [Operations Checklist](./root/OPERATIONS_CHECKLIST.md)
- [Scaling Guidelines](./root/SCALING_GUIDELINES.md)

### Database
- [Database Maintenance](./root/DATABASE_MAINTENANCE.md)
- [Backup Strategy](./root/DATABASE_BACKUP_STRATEGY.md)
- [Performance Optimization](./root/DATABASE_PERFORMANCE_SUMMARY.md)

### Security
- [Security Setup](./root/SECURITY_SETUP.md)
- [Security Testing](./root/SECURITY_TESTING.md)
- [PCI DSS Compliance](./root/PCI_DSS_COMPLIANCE.md)
- [Privacy Compliance](./root/PRIVACY_COMPLIANCE.md)

### Monitoring
- [Monitoring Setup](./root/MONITORING_SETUP.md)
- [Monitoring Quick Start](./root/MONITORING_QUICK_START.md)
- [Troubleshooting](./root/TROUBLESHOOTING.md)

---

## API Documentation

### REST API
- **Base URL**: `https://api.citadelbuy.com/api`
- **Authentication**: JWT Bearer tokens
- **Rate Limiting**: 100 requests/minute (authenticated), 20 requests/minute (anonymous)
- **API Documentation**: `/api/docs` (Swagger UI)

### Core Endpoints

**Authentication**
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login
POST   /api/auth/refresh       - Refresh token
POST   /api/auth/logout        - Logout
GET    /api/auth/me            - Get current user
```

**Products**
```
GET    /api/products           - List products
GET    /api/products/:id       - Get product details
GET    /api/products/search    - Search products
GET    /api/products/:id/related - Get related products
POST   /api/products           - Create product (authenticated)
PUT    /api/products/:id       - Update product (authenticated)
DELETE /api/products/:id       - Delete product (authenticated)
```

**Cart & Checkout**
```
GET    /api/cart               - Get cart
POST   /api/cart/items         - Add item to cart
PUT    /api/cart/items/:id     - Update cart item
DELETE /api/cart/items/:id     - Remove cart item
POST   /api/checkout           - Create checkout session
POST   /api/checkout/complete  - Complete checkout
```

**Orders**
```
GET    /api/orders             - List user orders
GET    /api/orders/:id         - Get order details
POST   /api/orders/:id/cancel  - Cancel order
GET    /api/orders/:id/track   - Track order
```

**Vendors**
```
GET    /api/vendors            - List vendors
GET    /api/vendors/:id        - Get vendor details
POST   /api/vendors            - Register vendor
GET    /api/vendors/:id/products - Get vendor products
```

**Organizations**
```
GET    /api/organizations      - List organizations
POST   /api/organizations      - Create organization
GET    /api/organizations/:id  - Get organization
PUT    /api/organizations/:id  - Update organization
GET    /api/organizations/:id/members - List members
```

For complete API documentation, see [API_REFERENCE.md](./API_REFERENCE.md)

---

## Project Structure

```
organization/
├── apps/
│   ├── api/                    # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── common/         # Shared code
│   │   │   ├── config/         # Configuration
│   │   │   └── main.ts         # Application entry
│   │   ├── prisma/             # Database schema
│   │   └── test/               # API tests
│   │
│   ├── web/                    # Next.js web app
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Utilities
│   │   │   └── services/       # API clients
│   │   └── public/             # Static assets
│   │
│   ├── mobile/                 # React Native app
│   │   ├── src/
│   │   │   ├── screens/        # Mobile screens
│   │   │   ├── components/     # React Native components
│   │   │   ├── navigation/     # Navigation setup
│   │   │   └── services/       # API clients
│   │
│   └── services/               # Microservices
│       ├── recommendation/     # AI recommendation service
│       ├── search/             # AI search service
│       ├── fraud-detection/    # Fraud detection service
│       ├── personalization/    # Personalization service
│       ├── pricing/            # Dynamic pricing service
│       └── analytics/          # Analytics service
│
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Shared utilities
│   ├── config/                 # Shared configuration
│   └── ai-sdk/                 # AI service client SDK
│
├── infrastructure/
│   ├── terraform/              # Infrastructure as code
│   ├── kubernetes/             # K8s manifests & Helm charts
│   ├── docker/                 # Docker configurations
│   └── scripts/                # Deployment scripts
│
├── tests/
│   ├── e2e/                    # End-to-end tests
│   ├── integration/            # Integration tests
│   ├── load/                   # Load & performance tests
│   └── security/               # Security tests
│
└── docs/                       # Documentation
    ├── api/                    # API documentation
    ├── architecture/           # Architecture docs
    ├── development/            # Development guides
    ├── infrastructure/         # Infrastructure docs
    ├── diagrams/               # Architecture diagrams
    └── runbooks/               # Operational runbooks
```

---

## Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow TypeScript best practices
   - Write tests for new features
   - Update documentation

3. **Test Your Changes**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm test:e2e
   ```

4. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push -u origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Fill out PR template
   - Request code review
   - Address feedback

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style/formatting
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

### Code Standards

- **TypeScript**: All code must be TypeScript
- **ESLint**: Follow ESLint configuration
- **Prettier**: Code formatting
- **Tests**: Write unit tests for business logic
- **Documentation**: Document public APIs

---

## Support & Resources

### Documentation
- [Development Guide](./development/SETUP.md)
- [API Reference](./API_REFERENCE.md)
- [Operations Manual](./OPERATIONS_MANUAL.md)
- [Architecture Guide](./architecture/ARCHITECTURE.md)

### External Resources
- **Kubernetes**: https://kubernetes.io/docs/
- **NestJS**: https://docs.nestjs.com/
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Stripe**: https://stripe.com/docs

### Community
- **GitHub Issues**: https://github.com/oks-citadel/citadelbuy/issues
- **Discussions**: https://github.com/oks-citadel/citadelbuy/discussions
- **Discord**: [Join our Discord](#)
- **Email**: dev@citadelbuy.com

### Support Channels
- **#engineering** - General engineering discussions
- **#incidents** - Production incident response
- **#devops** - Infrastructure and deployment
- **#alerts** - Automated monitoring alerts

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 200ms | ~150ms |
| Page Load Time | < 2s | ~1.8s |
| Time to Interactive | < 3s | ~2.5s |
| Availability | 99.9% | 99.95% |
| Error Rate | < 0.1% | ~0.05% |
| Concurrent Users | 100,000+ | Tested to 50,000 |

---

## Security

### Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please email: **security@citadelbuy.com**

We will respond within 24 hours and provide a timeline for resolution.

### Security Features

- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- JWT authentication with refresh tokens
- Rate limiting and DDoS protection
- CSRF protection
- XSS prevention
- SQL injection prevention
- Security headers (CSP, HSTS, etc.)
- Regular security audits
- Dependency vulnerability scanning

---

## License

Copyright © 2024-2025 CitadelBuy Global Enterprise Marketplace

All rights reserved. Proprietary and confidential.

---

## Changelog

### Recent Updates

**v1.0.0 (2025-12-06)**
- Initial comprehensive documentation release
- Complete platform architecture documentation
- API reference documentation
- Operations manual and runbooks
- E2E test coverage
- Deployment automation

For full changelog, see [CHANGELOG.md](../CHANGELOG.md)

---

**Last Updated**: 2025-12-06
**Maintained By**: Platform Engineering & Documentation Team
**Version**: 1.0.0
