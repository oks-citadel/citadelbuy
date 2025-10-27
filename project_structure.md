# Project Structure

This document provides a comprehensive overview of the commerce platform project structure.

```
commerce-platform/
│
├── backend/                          # Go Backend Application
│   ├── cmd/
│   │   └── api/
│   │       └── main.go              # Application entry point
│   ├── internal/
│   │   ├── handlers/                # HTTP request handlers
│   │   │   ├── auth.go
│   │   │   ├── products.go
│   │   │   ├── orders.go
│   │   │   └── payments.go
│   │   ├── models/                  # Data models
│   │   │   ├── user.go
│   │   │   ├── product.go
│   │   │   ├── order.go
│   │   │   └── payment.go
│   │   ├── services/                # Business logic
│   │   │   ├── auth_service.go
│   │   │   ├── product_service.go
│   │   │   ├── order_service.go
│   │   │   └── payment_service.go
│   │   ├── repository/              # Data access layer
│   │   │   ├── user_repository.go
│   │   │   ├── product_repository.go
│   │   │   └── order_repository.go
│   │   ├── middleware/              # HTTP middleware
│   │   │   ├── auth.go
│   │   │   ├── cors.go
│   │   │   ├── logger.go
│   │   │   └── ratelimit.go
│   │   ├── utils/                   # Utility functions
│   │   │   ├── jwt.go
│   │   │   ├── validation.go
│   │   │   └── crypto.go
│   │   └── config/                  # Configuration
│   │       └── config.go
│   ├── pkg/                         # Public packages
│   │   ├── database/
│   │   ├── cache/
│   │   └── logger/
│   ├── migrations/                  # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_indexes.sql
│   │   └── 003_add_analytics.sql
│   ├── tests/                       # Tests
│   │   ├── integration/
│   │   └── unit/
│   ├── go.mod                       # Go module definition
│   ├── go.sum                       # Go module checksums
│   ├── Dockerfile                   # Production Dockerfile
│   ├── Dockerfile.dev               # Development Dockerfile
│   ├── .air.toml                    # Air config for hot reload
│   └── .golangci.yml                # Linting configuration
│
├── frontend/                         # Next.js Frontend Application
│   ├── pages/                       # Next.js pages
│   │   ├── index.tsx                # Homepage
│   │   ├── products/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── cart.tsx
│   │   ├── checkout.tsx
│   │   └── api/                     # API routes (BFF)
│   │       ├── health.ts
│   │       └── metrics.ts
│   ├── components/                  # React components
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── products/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductList.tsx
│   │   │   └── ProductDetail.tsx
│   │   └── checkout/
│   │       ├── CartSummary.tsx
│   │       └── PaymentForm.tsx
│   ├── lib/                         # Utility libraries
│   │   ├── api.ts                   # API client
│   │   ├── auth.ts                  # Authentication
│   │   └── hooks/                   # Custom React hooks
│   ├── styles/                      # CSS/Styling
│   │   ├── globals.css
│   │   └── components/
│   ├── public/                      # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── locales/                     # Translations
│   │   ├── en/
│   │   ├── es/
│   │   └── fr/
│   ├── next.config.js               # Next.js configuration
│   ├── tsconfig.json                # TypeScript configuration
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── package.json                 # NPM dependencies
│   ├── Dockerfile                   # Production Dockerfile
│   ├── Dockerfile.dev               # Development Dockerfile
│   └── .eslintrc.json               # ESLint configuration
│
├── nginx/                           # NGINX Configuration
│   ├── nginx.prod.conf              # Production config
│   ├── nginx.dev.conf               # Development config
│   └── conf.d/                      # Additional configs
│       ├── ssl.conf
│       ├── security.conf
│       └── compression.conf
│
├── database/                        # Database Scripts
│   ├── init/                        # Initialization scripts
│   │   ├── 01-init.sh              # Main init script
│   │   └── 02-seed.sql             # Sample data
│   ├── migrations/                  # Schema migrations
│   └── test-fixtures/              # Test data
│       └── test-data.sql
│
├── monitoring/                      # Monitoring Configuration
│   ├── prometheus/
│   │   ├── prometheus.dev.yml      # Dev Prometheus config
│   │   ├── prometheus.test.yml     # Test Prometheus config
│   │   ├── prometheus.prod.yml     # Prod Prometheus config
│   │   └── alerts.yml              # Alert rules
│   └── grafana/
│       ├── provisioning/           # Grafana provisioning
│       │   ├── datasources/
│       │   │   └── prometheus.yml
│       │   └── dashboards/
│       │       └── dashboard.yml
│       └── dashboards/             # Dashboard definitions
│           ├── system-overview.json
│           ├── application-metrics.json
│           └── business-metrics.json
│
├── scripts/                         # Utility Scripts
│   ├── deploy.sh                    # Deployment script
│   ├── backup.sh                    # Backup script
│   ├── restore.sh                   # Restore script
│   ├── smoke-test.sh                # Smoke testing
│   ├── load-test.js                 # Load testing (K6)
│   └── ssl-renew.sh                 # SSL renewal
│
├── tests/                           # Integration Tests
│   ├── api/                         # API tests
│   ├── e2e/                         # End-to-end tests
│   ├── load/                        # Load tests
│   ├── Dockerfile                   # Test runner
│   └── run-tests.sh                 # Test execution
│
├── terraform/                       # Infrastructure as Code
│   ├── main.tf                      # Main Terraform config
│   ├── variables.tf                 # Variables
│   ├── outputs.tf                   # Outputs
│   ├── modules/                     # Terraform modules
│   │   ├── vpc/
│   │   ├── database/
│   │   ├── storage/
│   │   └── monitoring/
│   └── environments/                # Environment configs
│       ├── dev/
│       ├── test/
│       └── prod/
│
├── docs/                            # Documentation
│   ├── api/                         # API documentation
│   │   ├── openapi.yaml
│   │   └── postman-collection.json
│   ├── architecture/                # Architecture docs
│   │   ├── diagrams/
│   │   └── decisions/               # ADRs
│   ├── deployment/                  # Deployment guides
│   └── development/                 # Development guides
│
├── .github/                         # GitHub Configuration
│   ├── workflows/                   # CI/CD workflows
│   │   ├── test.yml
│   │   ├── build.yml
│   │   ├── deploy-dev.yml
│   │   ├── deploy-test.yml
│   │   └── deploy-prod.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .vscode/                         # VS Code Configuration
│   ├── settings.json
│   ├── launch.json
│   └── extensions.json
│
├── backups/                         # Backup Storage
│   └── [date]/
│       ├── database-*.sql.gz
│       └── redis-*.rdb
│
├── certs/                           # SSL Certificates
│   ├── fullchain.pem
│   └── privkey.pem
│
├── logs/                            # Log Files (if local)
│   ├── backend/
│   ├── frontend/
│   └── nginx/
│
├── storage/                         # File Storage (local dev)
│   ├── uploads/
│   ├── temp/
│   └── exports/
│
├── docker-compose.dev.yml           # Development compose file
├── docker-compose.test.yml          # Test compose file
├── docker-compose.prod.yml          # Production compose file
│
├── .env.dev                         # Development environment vars
├── .env.test                        # Test environment vars
├── .env.prod                        # Production environment vars
│
├── .gitignore                       # Git ignore rules
├── .dockerignore                    # Docker ignore rules
│
├── Makefile                         # Make commands
├── README.md                        # Project README
├── DEPLOYMENT.md                    # Deployment guide
├── CONTRIBUTING.md                  # Contribution guide
├── LICENSE                          # License file
└── CHANGELOG.md                     # Change log
```

## Key Directories Explained

### `/backend`
Contains the Go backend API with:
- **cmd/**: Application entry points
- **internal/**: Private application code
- **pkg/**: Public, reusable packages
- **migrations/**: Database schema migrations
- **tests/**: Unit and integration tests

### `/frontend`
Contains the Next.js frontend with:
- **pages/**: Next.js pages and API routes
- **components/**: Reusable React components
- **lib/**: Utility functions and custom hooks
- **public/**: Static assets
- **locales/**: Internationalization files

### `/database`
Database-related files:
- **init/**: Initialization scripts run on first start
- **migrations/**: Schema migration files
- **test-fixtures/**: Sample data for testing

### `/monitoring`
Observability configuration:
- **prometheus/**: Metrics collection config
- **grafana/**: Dashboard definitions

### `/scripts`
Utility scripts for:
- Deployment automation
- Backup and restore
- Testing
- Maintenance tasks

### `/terraform`
Infrastructure as Code:
- Cloud resource definitions
- Environment-specific configurations
- Reusable modules

## File Naming Conventions

- **Docker**: `Dockerfile`, `Dockerfile.dev`
- **Compose**: `docker-compose.[env].yml`
- **Env files**: `.env.[env]`
- **Config**: `[service].[env].conf`
- **Scripts**: `[action]-[target].sh`

## Environment Files

- `.env.dev`: Development configuration
- `.env.test`: Test configuration
- `.env.prod`: Production configuration
- `.env.*.local`: Local overrides (not in git)

## Important Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `DEPLOYMENT.md` | Comprehensive deployment guide |
| `Makefile` | Common commands and shortcuts |
| `docker-compose.*.yml` | Container orchestration |
| `.env.*` | Environment configuration |
| `package.json` | Frontend dependencies |
| `go.mod` | Backend dependencies |

## Data Flow

```
User Request
     ↓
  NGINX (Reverse Proxy)
     ↓
  ┌──────────┬──────────┐
  │          │          │
Frontend   Backend    WebSocket
  │          │          │
  └──────────┴──────────┘
     ↓
  ┌──────────┬──────────┐
  │          │          │
PostgreSQL  Redis    S3 Storage
```

## Development Workflow

1. Clone repository
2. Copy `.env.dev` to `.env.dev.local`
3. Update environment variables
4. Run `make dev` to start services
5. Access applications at:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8080
   - Swagger: http://localhost:8080/swagger

## Deployment Workflow

1. Build images: `make build`
2. Run tests: `make test`
3. Push images: `make push`
4. Deploy: `make prod-deploy`
5. Verify: `make health`

## Getting Help

- Use `make help` for available commands
- Check `DEPLOYMENT.md` for detailed procedures
- Review `docs/` for specific guides
- Open issues on GitHub for questions
