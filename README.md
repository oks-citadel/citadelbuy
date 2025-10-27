# Cross-Border Commerce Platform

## 📋 Table of Contents
- [Overview](#overview)
- [Technical Architecture](#technical-architecture)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Configuration Management](#configuration-management)
- [API Documentation](#api-documentation)
- [Monitoring & Observability](#monitoring--observability)
- [Security](#security)
- [Performance Optimization](#performance-optimization)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Overview

Enterprise-grade e-commerce platform designed for cross-border commerce with multi-currency support, multilingual content, global logistics integration, and AI-powered capabilities. Built with containerization-first approach for seamless deployment across dev, test, and production environments.

### Key Capabilities
- **Global Commerce**: Multi-currency payments, international shipping, tax compliance
- **Enterprise Security**: OAuth2/SAML, JWT, RBAC, PCI-DSS compliance
- **High Availability**: 99.9% uptime SLA, auto-scaling, disaster recovery
- **AI-Powered**: Product discovery, conversational commerce, predictive analytics
- **Developer-Friendly**: Full Docker support, comprehensive API documentation

---

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER                               │
│                     (NGINX / Cloud LB)                              │
└────────────────┬────────────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼─────────────┐    ┌─────▼──────────┐
│   FRONTEND      │    │   BACKEND      │
│   Next.js       │◄───┤   Go API       │
│   (Port 3000)   │    │   (Port 8080)  │
└─────────────────┘    └────┬───────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
         ┌──────▼─────┐ ┌───▼─────┐ ┌───▼──────┐
         │ PostgreSQL │ │  Redis  │ │  Object  │
         │  Database  │ │  Cache  │ │ Storage  │
         │ (Port 5432)│ │(Port 6379)│ (S3/Azure)│
         └────────────┘ └─────────┘ └──────────┘
                │
         ┌──────┴──────┐
         │             │
    ┌────▼─────┐  ┌───▼──────┐
    │Prometheus│  │ Grafana  │
    │(Port 9090)│  │(Port 3001)│
    └──────────┘  └──────────┘
```

### Component Architecture

#### 1. Frontend Layer (Next.js)
```
┌─────────────────────────────────────┐
│        Next.js Application          │
├─────────────────────────────────────┤
│ • Pages & Components                │
│ • Static Site Generation (SSG)      │
│ • Server-Side Rendering (SSR)       │
│ • API Routes (Backend for Frontend) │
│ • i18n (Internationalization)       │
│ • Image Optimization                │
└─────────────────────────────────────┘
```

**Key Features:**
- React 18+ with TypeScript
- Tailwind CSS for styling
- next-i18next for multi-language support
- SWR/React Query for data fetching
- NextAuth.js for authentication
- Dynamic imports for code splitting

#### 2. Backend Layer (Go)
```
┌─────────────────────────────────────┐
│          Go Backend API             │
├─────────────────────────────────────┤
│ API Gateway (Gin/Echo Framework)    │
├─────────────────────────────────────┤
│ Business Logic Layer                │
│ ├─ User Management                  │
│ ├─ Product Catalog                  │
│ ├─ Order Processing                 │
│ ├─ Payment Integration              │
│ ├─ Inventory Management             │
│ └─ Analytics Engine                 │
├─────────────────────────────────────┤
│ Data Access Layer (GORM/sqlx)       │
├─────────────────────────────────────┤
│ External Integrations               │
│ ├─ Payment Gateways                 │
│ ├─ Shipping Providers               │
│ ├─ Tax Calculation                  │
│ └─ Email Services                   │
└─────────────────────────────────────┘
```

**Technology Stack:**
- Go 1.21+ with Go modules
- Gin or Echo web framework
- GORM for ORM
- JWT for authentication
- OpenAPI/Swagger documentation
- Structured logging (zerolog/zap)

#### 3. Data Layer

**PostgreSQL Database Schema:**
```sql
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │────▶│   orders     │◀────│   products   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ email        │     │ user_id      │     │ sku          │
│ password_hash│     │ status       │     │ name_i18n    │
│ role         │     │ total_amount │     │ price_usd    │
│ created_at   │     │ currency     │     │ stock_qty    │
└──────────────┘     │ created_at   │     │ created_at   │
                     └──────────────┘     └──────────────┘
                            │
                     ┌──────▼──────┐
                     │   payments  │
                     ├─────────────┤
                     │ id          │
                     │ order_id    │
                     │ gateway     │
                     │ status      │
                     │ amount      │
                     └─────────────┘
```

**Redis Cache Strategy:**
- Session storage (TTL: 24h)
- Product catalog cache (TTL: 1h)
- Rate limiting counters
- Real-time inventory locks

#### 4. Infrastructure Layer

**Container Architecture:**
```
┌─────────────────────────────────────────────────────┐
│                 Docker Host                         │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │  frontend    │  │   backend    │  │   nginx  │  │
│  │  (Next.js)   │  │    (Go)      │  │  (proxy) │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │  postgres    │  │    redis     │  │prometheus│  │
│  │  (database)  │  │   (cache)    │  │ (metrics)│  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────┤
│           Docker Network (bridge mode)              │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with SSR/SSG |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first CSS |
| next-i18next | Latest | Internationalization |
| Zustand/Redux | Latest | State management |
| React Query | Latest | Server state management |
| Axios | Latest | HTTP client |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.21+ | Backend language |
| Gin/Echo | Latest | Web framework |
| GORM | Latest | ORM |
| JWT-Go | Latest | Authentication |
| Viper | Latest | Configuration |
| Zap/Zerolog | Latest | Structured logging |
| Testify | Latest | Testing framework |

### Database & Cache
| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 16.x | Primary database |
| Redis | 7.x | Caching & sessions |
| pgAdmin | Latest | DB management (dev) |

### DevOps & Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24.x | Containerization |
| Docker Compose | 2.x | Multi-container orchestration |
| NGINX | Latest | Reverse proxy |
| Prometheus | Latest | Metrics collection |
| Grafana | Latest | Metrics visualization |
| Terraform | 1.6+ | Infrastructure as Code |

---

## Core Features

### 1. User Management
- OAuth2/SAML authentication
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- User profile management
- Activity logging

### 2. Product Catalog
- Multi-language product descriptions
- Dynamic pricing by currency
- Inventory tracking
- Category management
- Product search & filtering
- Image optimization & CDN

### 3. Order Management
- Shopping cart functionality
- Order processing workflow
- Order status tracking
- Email notifications
- Invoice generation

### 4. Payment Processing
- Multi-currency support
- Payment gateway integrations:
  - Stripe
  - PayPal
  - Adyen
- PCI-DSS compliance
- Refund processing
- Payment reconciliation

### 5. Shipping & Logistics
- Multi-carrier integration
- Real-time shipping rates
- International shipping support
- Tracking number generation
- Delivery notifications

### 6. Tax Compliance
- Automatic tax calculation
- Integration with tax services:
  - Avalara
  - TaxJar
- Multi-jurisdiction support
- Tax reporting

### 7. Analytics & Reporting
- Conversion tracking
- Customer behavior analytics
- Revenue reports
- Inventory reports
- Custom dashboards

### 8. AI Capabilities (Future)
- Visual product search
- Conversational commerce chatbot
- Predictive inventory management
- Dynamic pricing optimization
- Automated content generation
- Fraud detection

---

## Environment Setup

### Prerequisites
- Docker 24.x or higher
- Docker Compose 2.x or higher
- Git
- Node.js 20+ (for local development)
- Go 1.21+ (for local development)
- PostgreSQL client (optional)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourorg/commerce-platform.git
cd commerce-platform

# Choose your environment
# Development
docker-compose -f docker-compose.dev.yml up -d

# Testing
docker-compose -f docker-compose.test.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-Specific Details

#### Development Environment
- **Purpose**: Local development with hot reload
- **Port Mappings**:
  - Frontend: http://localhost:3000
  - Backend: http://localhost:8080
  - PostgreSQL: localhost:5432
  - Redis: localhost:6379
  - pgAdmin: http://localhost:5050
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3001

**Features:**
- Hot module replacement (HMR)
- Source maps enabled
- Debug logging
- Sample data seeding
- Development certificates

#### Test Environment
- **Purpose**: Integration testing and QA
- **Port Mappings**:
  - Frontend: http://localhost:3100
  - Backend: http://localhost:8180
  - PostgreSQL: localhost:5532
  - Redis: localhost:6479

**Features:**
- Isolated test database
- Mock payment gateways
- Test data fixtures
- CI/CD integration
- Test coverage reporting

#### Production Environment
- **Purpose**: Live production deployment
- **Port Mappings**:
  - Frontend: http://localhost:80 (behind NGINX)
  - Backend: Internal only
  - PostgreSQL: Internal only
  - Redis: Internal only

**Features:**
- HTTPS/TLS enabled
- Production optimizations
- Minified assets
- CDN integration
- Health checks & monitoring
- Auto-restart policies
- Resource limits

---

## Docker Deployment

### Project Structure
```
.
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go
│   ├── internal/
│   │   ├── handlers/
│   │   ├── models/
│   │   ├── services/
│   │   └── repository/
│   ├── go.mod
│   ├── go.sum
│   └── Dockerfile
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── public/
│   ├── styles/
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.dev.yml
├── docker-compose.test.yml
├── docker-compose.prod.yml
├── .env.dev
├── .env.test
├── .env.prod
└── README.md
```

### Building Images

```bash
# Build backend
docker build -t commerce-backend:latest ./backend

# Build frontend
docker build -t commerce-frontend:latest ./frontend

# Build all services
docker-compose -f docker-compose.prod.yml build
```

### Running Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Health Checks

```bash
# Check backend health
curl http://localhost:8080/health

# Check frontend
curl http://localhost:3000/api/health

# Check database connection
docker-compose exec postgres pg_isready -U admin
```

---

## Configuration Management

### Environment Variables

#### Common Variables
```bash
# Application
APP_ENV=production
APP_NAME=commerce-platform
APP_VERSION=1.0.0
LOG_LEVEL=info

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=commerce_db
DB_USER=admin
DB_PASSWORD=<secure-password>
DB_SSL_MODE=require

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>
REDIS_DB=0

# JWT
JWT_SECRET=<strong-random-secret>
JWT_EXPIRY=24h

# API Keys
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@yourplatform.com

# Storage
S3_BUCKET=commerce-platform-assets
S3_REGION=us-east-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# External APIs
AVALARA_API_KEY=xxx
TAXJAR_API_KEY=xxx
SHIPSTATION_API_KEY=xxx

# Monitoring
PROMETHEUS_ENABLED=true
METRICS_PORT=9090
```

#### Development-Specific
```bash
# Debug
DEBUG=true
HOT_RELOAD=true
CORS_ORIGINS=http://localhost:3000

# Sample Data
SEED_DATABASE=true
```

#### Production-Specific
```bash
# Security
HTTPS_ENABLED=true
SSL_CERT_PATH=/certs/fullchain.pem
SSL_KEY_PATH=/certs/privkey.pem

# Performance
ENABLE_CACHE=true
CACHE_TTL=3600
CDN_URL=https://cdn.yourplatform.com

# Scaling
MAX_CONNECTIONS=100
WORKER_POOL_SIZE=10
```

### Secrets Management

**For Production:**
1. Use Docker Secrets:
```bash
echo "my-db-password" | docker secret create db_password -
```

2. Or use external secret managers:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault

3. Never commit secrets to version control
4. Use `.env.example` files as templates

---

## API Documentation

### Base URLs
- Development: `http://localhost:8080/api/v1`
- Testing: `http://localhost:8180/api/v1`
- Production: `https://api.yourplatform.com/v1`

### Authentication

All API requests require authentication via JWT token:

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "expires_in": 86400
}

# Use token in subsequent requests
curl -X GET http://localhost:8080/api/v1/products \
  -H "Authorization: Bearer <token>"
```

### Key Endpoints

#### Products
```bash
GET    /api/v1/products           # List products
GET    /api/v1/products/:id       # Get product details
POST   /api/v1/products           # Create product (admin)
PUT    /api/v1/products/:id       # Update product (admin)
DELETE /api/v1/products/:id       # Delete product (admin)
```

#### Orders
```bash
GET    /api/v1/orders             # List user orders
GET    /api/v1/orders/:id         # Get order details
POST   /api/v1/orders             # Create order
PUT    /api/v1/orders/:id/status  # Update order status (admin)
```

#### Payments
```bash
POST   /api/v1/payments/create    # Create payment intent
POST   /api/v1/payments/confirm   # Confirm payment
GET    /api/v1/payments/:id       # Get payment status
POST   /api/v1/payments/refund    # Process refund
```

#### Users
```bash
GET    /api/v1/users/me           # Get current user
PUT    /api/v1/users/me           # Update profile
POST   /api/v1/users/change-password  # Change password
```

### OpenAPI/Swagger Documentation

Access interactive API documentation:
- Development: http://localhost:8080/swagger
- Production: https://api.yourplatform.com/swagger

---

## Monitoring & Observability

### Metrics (Prometheus)

Access Prometheus at: http://localhost:9090

**Key Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `db_query_duration_seconds` - Database query time
- `cache_hit_rate` - Redis cache hit rate
- `order_processing_time` - Order processing duration

### Dashboards (Grafana)

Access Grafana at: http://localhost:3001
- Default credentials: admin/admin (change immediately)

**Pre-configured Dashboards:**
1. System Overview
2. Application Performance
3. Database Metrics
4. API Response Times
5. Business Metrics (orders, revenue)

### Logging

**Log Levels:**
- `ERROR` - System errors requiring immediate attention
- `WARN` - Warning conditions
- `INFO` - Informational messages
- `DEBUG` - Debug-level messages (dev only)

**View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Follow logs from specific time
docker-compose logs --since 2024-01-01T10:00:00 backend
```

### Alerting

Configure alerts in Prometheus (`prometheus/alerts.yml`):
- High error rate (> 5%)
- Slow API responses (> 2s)
- Database connection issues
- High memory usage (> 80%)
- Disk space low (< 10%)

---

## Security

### Best Practices

1. **Authentication & Authorization**
   - Use strong JWT secrets
   - Implement refresh token rotation
   - Enable MFA for admin accounts
   - Rate limit authentication endpoints

2. **Data Protection**
   - Encrypt sensitive data at rest
   - Use TLS 1.3 for data in transit
   - Implement proper CORS policies
   - Sanitize all user inputs

3. **Infrastructure**
   - Keep Docker images updated
   - Use non-root users in containers
   - Implement network segmentation
   - Regular security audits

4. **Compliance**
   - GDPR compliance for EU customers
   - PCI-DSS for payment processing
   - Regular penetration testing
   - Incident response plan

### Security Headers

NGINX configuration includes:
```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000";
add_header Content-Security-Policy "default-src 'self'";
```

---

## Performance Optimization

### Frontend
- Code splitting with dynamic imports
- Image optimization (WebP, lazy loading)
- CDN for static assets
- Service worker caching
- Minification and compression

### Backend
- Database connection pooling
- Query optimization with indexes
- Redis caching strategy
- Request rate limiting
- Response compression (gzip)

### Database
- Proper indexing strategy
- Query plan analysis
- Connection pooling
- Read replicas for scaling
- Automated vacuuming

### Caching Strategy
```
┌─────────────────────────────────────┐
│   Request Flow with Caching         │
├─────────────────────────────────────┤
│ 1. Check Redis cache                │
│    ├─ HIT: Return cached data       │
│    └─ MISS: Continue to step 2      │
│                                     │
│ 2. Query Database                   │
│    └─ Store result in Redis cache   │
│                                     │
│ 3. Return response                  │
└─────────────────────────────────────┘
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: docker-compose -f docker-compose.test.yml up --abort-on-container-exit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: docker-compose build
      - name: Push to registry
        run: docker-compose push

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

### Deployment Checklist

- [ ] Run all tests
- [ ] Build Docker images
- [ ] Tag images with version
- [ ] Push to container registry
- [ ] Backup database
- [ ] Update environment variables
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor logs and metrics
- [ ] Verify health checks

---

## Troubleshooting

### Common Issues

**1. Database Connection Refused**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres
```

**2. Frontend Not Loading**
```bash
# Check build logs
docker-compose logs frontend

# Rebuild with no cache
docker-compose build --no-cache frontend
```

**3. Backend API Errors**
```bash
# Check environment variables
docker-compose exec backend env

# Check Go module dependencies
docker-compose exec backend go mod verify
```

**4. Cache Issues**
```bash
# Flush Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Restart Redis
docker-compose restart redis
```

**5. Port Conflicts**
```bash
# Check what's using the port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Debug Mode

Enable debug logging:
```bash
# Set in .env file
LOG_LEVEL=debug
DEBUG=true

# Restart services
docker-compose restart
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Clean up Docker
docker system prune -a
```

---

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards

**Go:**
- Follow standard Go conventions
- Use `gofmt` for formatting
- Run `golint` and `go vet`
- Write unit tests (aim for >80% coverage)

**JavaScript/TypeScript:**
- Use ESLint with Airbnb config
- Use Prettier for formatting
- Write unit tests with Jest
- Use TypeScript for type safety

### Testing

```bash
# Run all tests
make test

# Run backend tests
cd backend && go test ./...

# Run frontend tests
cd frontend && npm test

# Run integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## License

MIT License - see LICENSE file for details

---

## Support

- Documentation: https://docs.yourplatform.com
- Email: support@yourplatform.com
- Slack: https://yourplatform.slack.com
- Issue Tracker: https://github.com/yourorg/commerce-platform/issues

---

## Roadmap

### Q1 2025
- [ ] Advanced analytics dashboard
- [ ] Multi-warehouse support
- [ ] Enhanced search with Elasticsearch

### Q2 2025
- [ ] Mobile app (React Native)
- [ ] AI-powered product recommendations
- [ ] Advanced inventory forecasting

### Q3 2025
- [ ] Marketplace functionality
- [ ] Subscription management
- [ ] Advanced fraud detection

### Q4 2025
- [ ] Voice commerce integration
- [ ] AR product visualization
- [ ] Blockchain payment options

---

**Built with ❤️ for global commerce**
