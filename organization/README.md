# Broxiva - AI-Powered E-Commerce Platform

> Enterprise-grade e-commerce platform with advanced AI capabilities for intelligent product discovery, hyper-personalization, and automated operations.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/broxiva/broxiva)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10.0.0-orange.svg)](https://pnpm.io/)

---

## Executive Summary

**Broxiva** is a comprehensive, AI-powered multi-vendor e-commerce marketplace built for scale and modern commerce. The platform combines a robust NestJS backend with Next.js and React Native frontends, delivering a seamless shopping experience across web and mobile.

### Key Differentiators

- **57+ Backend Modules** providing comprehensive e-commerce functionality
- **14 AI/ML Features** including visual search, personalization, fraud detection, and chatbot
- **Multi-Platform Support** with web (Next.js 15), mobile (React Native/Expo), and API access
- **Enterprise-Grade Security** with MFA, account lockout, token blacklisting, and GDPR/CCPA compliance
- **Scalable Architecture** using Turborepo, Docker, Kubernetes, and AWS/Railway deployment

### Current Version & Status

- **Version:** 2.0.0
- **Status:** Production-Ready
- **Last Updated:** January 2026

---

## Project Structure

```
organization/
├── apps/
│   ├── api/                    # NestJS Backend API (57+ modules)
│   ├── web/                    # Next.js 15 Web Application
│   ├── mobile/                 # React Native/Expo Mobile App
│   └── services/               # Microservices
│       ├── ai-agents/          # AI Agent orchestration
│       ├── ai-engine/          # Python ML/AI processing
│       ├── analytics/          # Analytics processing
│       ├── chatbot/            # Conversational AI
│       ├── fraud-detection/    # Fraud scoring service
│       ├── inventory/          # Inventory management
│       ├── media/              # Media processing
│       ├── notification/       # Push/Email notifications
│       ├── personalization/    # User personalization
│       ├── pricing/            # Dynamic pricing
│       ├── recommendation/     # Product recommendations
│       ├── search/             # Search service
│       └── supplier-integration/ # Supplier APIs
│
├── packages/
│   ├── ai-sdk/                 # AI SDK for client applications
│   ├── types/                  # Shared TypeScript types
│   ├── ui/                     # Shared UI component library
│   └── utils/                  # Shared utility functions
│
├── infrastructure/
│   ├── docker/                 # Docker configurations
│   ├── kubernetes/             # K8s manifests (staging/production)
│   ├── terraform/              # Infrastructure as Code (AWS)
│   ├── helm/                   # Helm charts
│   ├── grafana/                # Monitoring dashboards
│   ├── prometheus/             # Metrics collection
│   └── nginx/                  # Reverse proxy configs
│
├── docs/                       # Documentation
├── tests/                      # E2E and integration tests
├── scripts/                    # Utility scripts
└── .github/
    └── workflows/              # CI/CD pipelines
```

---

## Architecture Overview

### High-Level Architecture

```
                                    ┌─────────────────────────────────────────────┐
                                    │              CDN (CloudFlare)               │
                                    └─────────────────────────────────────────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────────────────────┐
                    │                                    │                                    │
                    ▼                                    ▼                                    ▼
         ┌─────────────────┐                  ┌─────────────────┐                  ┌─────────────────┐
         │   Next.js Web   │                  │  React Native   │                  │   Third Party   │
         │   (Vercel)      │                  │  Mobile App     │                  │   Integrations  │
         └────────┬────────┘                  └────────┬────────┘                  └────────┬────────┘
                  │                                    │                                    │
                  └────────────────────────────────────┼────────────────────────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────┐
                                    │         Nginx Load Balancer         │
                                    └──────────────────┬──────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────┐
                                    │         NestJS API Gateway          │
                                    │         (Railway / ECS)             │
                                    └──────────────────┬──────────────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────────────────────┐
                    │                                  │                                  │
                    ▼                                  ▼                                  ▼
         ┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐
         │   PostgreSQL    │                │     Redis       │                │  Elasticsearch  │
         │   (Primary DB)  │                │ (Cache/Queue)   │                │    (Search)     │
         └─────────────────┘                └─────────────────┘                └─────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────┐
                                    │       AI/ML Microservices           │
                                    │  (Python - Recommendations, Fraud,  │
                                    │   Personalization, Chatbot)         │
                                    └─────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌───────────────┐     ┌─────────────┐
│  User   │────▶│  Frontend   │────▶│  Auth Module  │────▶│   Prisma    │
└─────────┘     └─────────────┘     └───────────────┘     └─────────────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
               ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
               │  JWT Tokens  │   │  MFA/2FA     │   │  Session     │
               │  (Access +   │   │  (TOTP via   │   │  Management  │
               │   Refresh)   │   │   Speakeasy) │   │  (Redis)     │
               └──────────────┘   └──────────────┘   └──────────────┘
```

### Key Integrations

| Service | Purpose | Provider |
|---------|---------|----------|
| Payments | Card processing, BNPL | Stripe, PayPal |
| Search | Product discovery | Elasticsearch, Algolia |
| Email | Transactional emails | Nodemailer (SMTP) |
| Storage | Media/assets | AWS S3, MinIO |
| AI/ML | OpenAI, Claude | Recommendations, chatbot |
| Monitoring | Observability | Sentry, Prometheus, Grafana |

---

## Tech Stack

### Backend (apps/api)

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.4.x | Core framework |
| Prisma | 6.2.x | ORM & database migrations |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Caching, sessions, queues |
| Elasticsearch | 8.11 | Full-text search |
| Bull | 4.x | Job queue processing |
| Passport | 0.7.x | Authentication strategies |
| JWT | - | Token-based auth |
| Stripe | 17.x | Payment processing |
| Socket.io | 4.8.x | Real-time features |

### Web Frontend (apps/web)

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5.x | React framework (App Router) |
| React | 18.3.x | UI library |
| TypeScript | 5.7.x | Type safety |
| Tailwind CSS | 3.4.x | Styling |
| Radix UI | Various | Accessible components |
| TanStack Query | 5.90.x | Data fetching & caching |
| Zustand | 5.0.x | State management |
| React Hook Form | 7.54.x | Form handling |
| Zod | 3.24.x | Schema validation |
| Framer Motion | 11.x | Animations |

### Mobile App (apps/mobile)

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.73.x | Cross-platform mobile |
| Expo | 50.x | Development toolchain |
| React Navigation | 6.x | Navigation |
| NativeWind | 2.x | Tailwind for RN |
| TanStack Query | 5.x | Data fetching |
| Zustand | 4.x | State management |

### Shared Packages

| Package | Purpose |
|---------|---------|
| `@broxiva/ai-sdk` | AI service client libraries (recommendation, search, personalization, fraud, chatbot) |
| `@broxiva/types` | Shared TypeScript interfaces (User, Product, Order, Cart, etc.) |
| `@broxiva/ui` | Reusable UI components (Button, Card, Input, ProductCard, etc.) |
| `@broxiva/utils` | Utility functions (date formatting, currency, validation schemas) |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Kubernetes | Container orchestration |
| Terraform | Infrastructure as Code (AWS) |
| Helm | K8s package management |
| GitHub Actions | CI/CD pipelines |
| Vercel | Web frontend hosting |
| Railway | API hosting |
| AWS ECS/EKS | Production orchestration |

---

## Core Features

### E-Commerce Essentials

- **Product Management** - Full CRUD, variants, categories, bulk upload, search
- **Shopping Cart** - Persistent cart, guest cart, abandonment recovery
- **Checkout** - Multi-step flow, guest checkout, address management
- **Orders** - Complete lifecycle, tracking, email notifications, invoices
- **Payments** - Stripe integration, PayPal, BNPL support
- **Shipping** - Multiple carriers, real-time tracking, rate calculation
- **Inventory** - Stock management, reservations, low-stock alerts
- **Returns & Refunds** - Self-service returns, refund processing

### Multi-Vendor Marketplace

- **Vendor Registration** - Self-service signup with KYC
- **Vendor Dashboard** - Sales analytics, product management
- **Commission System** - Configurable commission rates
- **Payout Management** - Automated vendor payouts
- **Vendor Ratings** - Customer reviews and ratings

### AI-Powered Features

- **Visual Search** - Camera-based product recognition
- **Conversational Commerce** - Natural language product search
- **Personalization Engine** - Behavioral tracking, personalized recommendations
- **Intelligent Chatbot** - 24/7 automated support with human handoff
- **Dynamic Pricing** - Demand-based price optimization
- **Fraud Detection** - ML-powered transaction risk scoring
- **Search Intelligence** - Semantic search, auto-suggestions

### Business Features

- **Analytics Dashboard** - Sales, traffic, conversion metrics
- **Customer Segmentation** - RFM analysis, cohort tracking
- **Loyalty Program** - Points, tiers, rewards
- **Gift Cards** - Purchase, redemption, balance tracking
- **Coupons & Promotions** - Discount codes, flash sales
- **Subscriptions** - Recurring billing, subscription tiers
- **Reviews & Ratings** - Verified reviews, helpful votes

### Security & Compliance

- **JWT Authentication** - Access and refresh tokens
- **MFA/2FA** - TOTP-based two-factor authentication
- **Account Lockout** - Brute force protection
- **Token Blacklisting** - Secure logout
- **RBAC** - Role-based access control (Customer, Vendor, Admin, etc.)
- **Rate Limiting** - Tiered throttling
- **GDPR/CCPA** - Data export, deletion requests, consent management

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **PostgreSQL** >= 16
- **Redis** >= 7
- **Docker** (optional, for containerized development)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/broxiva/broxiva.git
   cd broxiva/organization
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   **Critical environment variables:**
   ```bash
   # Generate secure secrets
   openssl rand -base64 64  # For JWT_SECRET
   openssl rand -base64 32  # For passwords
   openssl rand -hex 32     # For encryption keys
   ```

4. **Start infrastructure (Docker)**
   ```bash
   pnpm docker:up
   ```

5. **Run database migrations**
   ```bash
   cd apps/api
   pnpm prisma:generate
   pnpm migrate
   pnpm db:seed
   ```

### Local Development

**Start all services (Turborepo):**
```bash
pnpm dev
```

**Start individual apps:**
```bash
# API only
pnpm dev:api

# Web only
pnpm dev:web

# Mobile
cd apps/mobile
pnpm start
```

**Access points:**
- Web: http://localhost:3000
- API: http://localhost:4000
- API Docs (Swagger): http://localhost:4000/api/docs
- Prisma Studio: `pnpm prisma:studio`

### Running Tests

```bash
# All tests
pnpm test

# API tests
pnpm test:api

# E2E tests
pnpm test:e2e

# Smoke tests
pnpm test:smoke

# UI tests (Playwright)
pnpm test:ui
```

---

## Deployment

### Staging

**Automatic deployment** on push to `develop` branch via GitHub Actions.

**Manual deployment:**
```bash
# Build all apps
pnpm build

# Deploy to staging K8s
kubectl apply -k infrastructure/kubernetes/overlays/staging
```

### Production

**Deployment options:**

1. **Railway (API)**
   ```bash
   # Uses railway.json configuration
   railway up
   ```

2. **Vercel (Web)**
   ```bash
   # Automatic deployment on push to main
   # Manual: vercel --prod
   ```

3. **AWS ECS/EKS**
   ```bash
   # Via unified pipeline
   # Manual K8s deployment
   kubectl apply -k infrastructure/kubernetes/overlays/production
   ```

4. **Docker Compose (Production)**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

### CI/CD Pipeline

The unified pipeline (`.github/workflows/unified-pipeline.yml`) includes:

- **Phase 0:** Security Analysis (CodeQL, Gitleaks, Dependency Audit)
- **Phase 1:** Application CI (Lint, Type Check, Test, Build)
- **Phase 2:** Infrastructure Validation (Terraform)
- **Phase 3:** Docker Build & Push to ECR
- **Phase 4:** Deploy to Staging
- **Phase 5:** Infrastructure Apply
- **Phase 6:** Deploy to Production (scheduled/manual)
- **Phase 7:** Smoke Tests & Verification

**Trigger production deployment:**
- Scheduled: Configurable via cron
- Manual: GitHub Actions workflow dispatch

---

## API Documentation

### Swagger/OpenAPI

Interactive API documentation is available at:
- **Development:** http://localhost:4000/api/docs
- **Production:** https://api.broxiva.com/api/docs

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User authentication |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/products` | GET | List products |
| `/api/products/:id` | GET | Get product details |
| `/api/cart` | GET/POST/PATCH | Cart operations |
| `/api/checkout` | POST | Create checkout session |
| `/api/orders` | GET/POST | Order management |
| `/api/search` | GET | Product search |
| `/api/recommendations` | GET | AI recommendations |
| `/api/health` | GET | Health check |

### Authentication

All authenticated endpoints require a Bearer token:
```bash
Authorization: Bearer <access_token>
```

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Write tests for new features
   - Update documentation as needed
4. **Run checks**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   ```
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   ```
6. **Push and create a Pull Request**

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Database Schema

The platform uses PostgreSQL with Prisma ORM. The schema includes 100+ models covering:

- User management (users, profiles, sessions, MFA)
- Products (products, variants, categories, inventory)
- Orders (orders, items, payments, shipping)
- Vendor marketplace (vendors, commissions, payouts)
- AI features (recommendations, search queries, personalization)
- Compliance (consent logs, data deletion requests)

View the full schema: `apps/api/prisma/schema.prisma`

Generate Prisma client:
```bash
pnpm prisma:generate
```

---

## Monitoring & Observability

- **Sentry** - Error tracking and performance monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Dashboards and visualization
- **Health checks** - `/api/health` endpoint

---

## License

This project is **UNLICENSED** - proprietary software. All rights reserved.

---

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** GitHub Issues
- **Email:** support@broxiva.com

---

## Acknowledgments

Built with:
- [NestJS](https://nestjs.com/)
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Turborepo](https://turbo.build/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Version 2.0.0** | **January 2026**
