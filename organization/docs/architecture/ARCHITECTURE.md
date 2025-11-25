# CitadelBuy Platform Architecture

## Overview

CitadelBuy is an AI-powered e-commerce platform built on a modern microservices architecture with 300+ AI capabilities across 38 categories.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CDN (Azure CDN)                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                      Load Balancer (Azure LB)                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐           ┌───────▼───────┐           ┌───────▼───────┐
│   Web App     │           │   Admin App   │           │  Mobile API   │
│  (Next.js)    │           │  (Next.js)    │           │   Gateway     │
└───────────────┘           └───────────────┘           └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                     API Gateway (NestJS)                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐           ┌───────▼───────┐           ┌───────▼───────┐
│  Core API     │           │   AI Gateway  │           │  Event Bus    │
│  Services     │           │   Services    │           │   (Redis)     │
└───────────────┘           └───────────────┘           └───────────────┘
        │                           │
        │                   ┌───────┴───────────────────────────┐
        │                   │                                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────────┐   ┌───────▼───────┐
│  PostgreSQL   │   │ Recommendation│   │  Search   │   │    Fraud      │
│  Database     │   │   Service     │   │  Service  │   │  Detection    │
└───────────────┘   └───────────────┘   └───────────┘   └───────────────┘
                            │                   │               │
                    ┌───────▼───────┐   ┌───────▼───────┐   ┌───▼───┐
                    │ Personalization│  │   Analytics   │   │Pricing│
                    │   Service     │   │   Service     │   │Service│
                    └───────────────┘   └───────────────┘   └───────┘
```

## Technology Stack

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Application | Next.js 15, React 19 | Main customer-facing app |
| Admin Dashboard | Next.js 15, React 19 | Vendor & admin management |
| Mobile Apps | React Native, Expo | iOS & Android apps |
| UI Components | Tailwind CSS, Radix UI | Design system |
| State Management | Zustand, React Query | Client-side state |

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| API Server | NestJS 10 | Main REST/GraphQL API |
| Database | PostgreSQL 16 | Primary data store |
| ORM | Prisma | Database access layer |
| Cache | Redis 7 | Caching & sessions |
| Search | Elasticsearch 8 | Full-text search |
| Queue | Bull/BullMQ | Background jobs |

### AI/ML Services
| Service | Technology | Purpose |
|---------|------------|---------|
| Recommendation | Python, FastAPI | Product recommendations |
| Search | Python, FastAPI | Semantic & visual search |
| Personalization | Python, FastAPI | User personalization |
| Fraud Detection | Python, FastAPI | Transaction analysis |
| Chatbot | Python, FastAPI | Customer support AI |
| Analytics | Python, FastAPI | ML-powered insights |
| Pricing | Python, FastAPI | Dynamic pricing |

### Infrastructure
| Component | Technology | Purpose |
|-----------|------------|---------|
| Container Orchestration | Azure AKS | Kubernetes cluster |
| Container Registry | Azure ACR | Docker images |
| IaC | Terraform | Infrastructure provisioning |
| CI/CD | GitHub Actions | Automated pipelines |
| Monitoring | Azure Monitor, Prometheus | Observability |
| Logging | Azure Log Analytics, ELK | Centralized logging |

## Domain Architecture

### Core Domains

1. **Catalog Domain**
   - Product Management
   - Category Management
   - Inventory Tracking
   - Pricing Engine

2. **Order Domain**
   - Cart Management
   - Order Processing
   - Payment Processing
   - Shipping Integration

3. **User Domain**
   - Authentication/Authorization
   - Profile Management
   - Preferences
   - Address Book

4. **Vendor Domain**
   - Vendor Onboarding
   - Store Management
   - Payout Processing
   - Performance Analytics

5. **AI Domain**
   - Recommendation Engine
   - Search Intelligence
   - Fraud Detection
   - Demand Forecasting

## Data Flow

### Order Processing Flow

```
Customer → Web/Mobile App → API Gateway → Order Service
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              ┌─────▼─────┐            ┌──────▼──────┐           ┌──────▼──────┐
              │ Inventory │            │   Payment   │           │   Fraud     │
              │  Service  │            │   Service   │           │  Detection  │
              └───────────┘            └─────────────┘           └─────────────┘
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                                        ┌─────▼─────┐
                                        │   Queue   │
                                        │  (Bull)   │
                                        └─────┬─────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              ┌─────▼─────┐            ┌──────▼──────┐           ┌──────▼──────┐
              │ Shipping  │            │   Email     │           │  Analytics  │
              │  Service  │            │   Service   │           │   Service   │
              └───────────┘            └─────────────┘           └─────────────┘
```

## Security Architecture

### Authentication
- JWT-based authentication with refresh tokens
- OAuth 2.0 social login (Google, Apple, Facebook)
- Multi-factor authentication (MFA)
- Biometric authentication for mobile

### Authorization
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- API key management for service-to-service
- Webhook signature verification

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PCI DSS compliance for payment data
- GDPR compliance for user data

## Scalability

### Horizontal Scaling
- Kubernetes HPA for auto-scaling
- Database read replicas
- Redis cluster mode
- CDN for static assets

### Performance Targets
| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| Page Load Time | < 2s |
| Availability | 99.9% |
| Concurrent Users | 100,000+ |

## Monitoring & Observability

### Metrics
- Application metrics (Prometheus)
- Business metrics (custom dashboards)
- Infrastructure metrics (Azure Monitor)

### Logging
- Structured JSON logging
- Centralized log aggregation
- Log-based alerting

### Tracing
- Distributed tracing (OpenTelemetry)
- Request correlation IDs
- Service dependency mapping

## Deployment Strategy

### Environments
1. **Development** - Local/CI testing
2. **Staging** - Pre-production validation
3. **Production** - Live environment

### Release Process
- Blue-green deployments
- Canary releases for high-risk changes
- Feature flags for gradual rollout
- Automatic rollback on failure

## Further Reading

- [API Documentation](../api/README.md)
- [AI Features Guide](../ai-features/README.md)
- [Development Guide](../development/SETUP.md)
- [Deployment Guide](../deployment/README.md)
