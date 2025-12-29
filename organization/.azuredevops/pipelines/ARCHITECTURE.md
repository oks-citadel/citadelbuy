# CitadelBuy Pipelines - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CitadelBuy Platform                                 │
│                      Azure DevOps CI/CD Architecture                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                             CODE REPOSITORY                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Azure Repos (Git)                                                     │  │
│  │  - main branch         (production releases)                           │  │
│  │  - develop branch      (development integration)                       │  │
│  │  - feature/* branches  (new features)                                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS INTEGRATION                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ci-main.yml - Triggered on Pull Requests                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   Lint &     │  │   Security   │  │   Build &    │                │  │
│  │  │  Type Check  │→ │   Scanning   │→ │     Test     │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │         ↓                  ↓                  ↓                        │  │
│  │  ESLint, TypeScript   pnpm audit     Jest, Playwright                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ (PR Approved & Merged)
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CONTINUOUS DEPLOYMENT                                  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                          BUILD STAGE                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   cd-api     │  │   cd-web     │  │ cd-services  │                │  │
│  │  │   .yml       │  │   .yml       │  │   .yml       │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │         │                  │                  │                        │  │
│  │         ▼                  ▼                  ▼                        │  │
│  │  Docker Build        Docker Build       Docker Build                  │  │
│  │  NestJS API          Next.js Web        Python Services               │  │
│  │         │                  │                  │                        │  │
│  │         └──────────────────┴──────────────────┘                        │  │
│  │                            │                                           │  │
│  │                            ▼                                           │  │
│  │              ┌─────────────────────────────┐                           │  │
│  │              │  Azure Container Registry   │                           │  │
│  │              │  citadelbuyprod.azurecr.io  │                           │  │
│  │              └─────────────────────────────┘                           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      DEPLOYMENT STAGES                                 │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │ DEVELOPMENT (dev)                                                │ │  │
│  │  │ - Namespace: citadelbuy-dev                                      │ │  │
│  │  │ - Trigger: Automatic on develop push                             │ │  │
│  │  │ - Approval: None                                                 │ │  │
│  │  │ - URL: https://dev.citadelbuy.com                                │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                            │                                           │  │
│  │                            ▼                                           │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │ STAGING (staging)                                                │ │  │
│  │  │ - Namespace: citadelbuy-staging                                  │ │  │
│  │  │ - Trigger: Automatic after dev success                           │ │  │
│  │  │ - Approval: 1 approver required                                  │ │  │
│  │  │ - E2E Tests: Playwright                                          │ │  │
│  │  │ - URL: https://staging.citadelbuy.com                            │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                            │                                           │  │
│  │                            ▼ (Manual Approval)                         │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │ PRODUCTION (prod)                                                │ │  │
│  │  │ - Namespace: citadelbuy-prod                                     │ │  │
│  │  │ - Trigger: Automatic after staging approval                      │ │  │
│  │  │ - Approval: 2 approvers required                                 │ │  │
│  │  │ - Strategy: Canary (25% → 100%)                                  │ │  │
│  │  │ - Smoke Tests: Critical endpoints                                │ │  │
│  │  │ - URL: https://citadelbuy.com                                    │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  infrastructure.yml - Terraform IaC                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   Validate   │→ │     Plan     │→ │    Apply     │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │         ↓                  ↓                  ↓                        │  │
│  │    Checkov Scan     Dev/Staging/Prod   AKS, ACR, Storage              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Azure Resources Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AZURE CLOUD INFRASTRUCTURE                            │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    Azure DevOps Organization                           │  │
│  │                    citadelcloudmanagement                              │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Project: CitadelBuy                                             │ │  │
│  │  │  - Repos (Git)                                                   │ │  │
│  │  │  - Pipelines (YAML)                                              │ │  │
│  │  │  - Environments (dev, staging, prod)                             │ │  │
│  │  │  - Variable Groups (secrets, configs)                            │ │  │
│  │  │  - Service Connections (Azure, ACR, AKS)                         │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    Azure Container Registry                            │  │
│  │                    citadelbuyprod.azurecr.io                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │ citadelbuy-  │  │ citadelbuy-  │  │ citadelbuy-  │                │  │
│  │  │     api      │  │     web      │  │  ai-agents   │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │ citadelbuy-  │  │ citadelbuy-  │  │ citadelbuy-  │                │  │
│  │  │  inventory   │  │    media     │  │notification  │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │              Azure Kubernetes Service (AKS) Clusters                   │  │
│  │                                                                        │  │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐ │  │
│  │  │  Dev Cluster       │  │ Staging Cluster    │  │  Prod Cluster    │ │  │
│  │  │  citadelbuy-aks-   │  │ citadelbuy-aks-    │  │ citadelbuy-aks-  │ │  │
│  │  │        dev         │  │     staging        │  │      prod        │ │  │
│  │  │                    │  │                    │  │                  │ │  │
│  │  │  Namespace:        │  │  Namespace:        │  │  Namespace:      │ │  │
│  │  │  citadelbuy-dev    │  │  citadelbuy-staging│  │  citadelbuy-prod │ │  │
│  │  │                    │  │                    │  │                  │ │  │
│  │  │  ┌──────────────┐  │  │  ┌──────────────┐  │  │  ┌────────────┐  │ │  │
│  │  │  │ API Pods     │  │  │  │ API Pods     │  │  │  │ API Pods   │  │ │  │
│  │  │  │ Web Pods     │  │  │  │ Web Pods     │  │  │  │ Web Pods   │  │ │  │
│  │  │  │ Service Pods │  │  │  │ Service Pods │  │  │  │Service Pods│  │ │  │
│  │  │  └──────────────┘  │  │  └──────────────┘  │  │  └────────────┘  │ │  │
│  │  └────────────────────┘  └────────────────────┘  └──────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      Azure Supporting Services                         │  │
│  │                                                                        │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │  │
│  │  │  Key Vault     │  │  Storage       │  │  PostgreSQL Database   │  │  │
│  │  │  (Secrets)     │  │  (Terraform)   │  │  (per environment)     │  │  │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │  │
│  │  │  App Insights  │  │  Log Analytics │  │  Azure Monitor         │  │  │
│  │  │  (Monitoring)  │  │  (Logs)        │  │  (Alerts)              │  │  │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Pipeline Dependencies                         │
└─────────────────────────────────────────────────────────────────────┘

ci-main.yml (CI Pipeline)
    │
    ├─→ Node.js 20.x
    ├─→ pnpm 10.23.0
    ├─→ TypeScript
    ├─→ ESLint
    ├─→ Jest
    ├─→ Playwright
    └─→ pnpm audit

cd-api.yml (API Deployment)
    │
    ├─→ ci-main.yml (implicit dependency)
    ├─→ Docker
    ├─→ Azure Container Registry
    ├─→ Azure Kubernetes Service
    ├─→ Prisma CLI
    ├─→ Variable Group: citadelbuy-dev
    ├─→ Variable Group: citadelbuy-staging
    ├─→ Variable Group: citadelbuy-production
    ├─→ Service Connection: citadelbuy-azure-connection
    ├─→ Service Connection: citadelbuy-acr-connection
    ├─→ Service Connection: citadelbuy-aks-dev
    ├─→ Service Connection: citadelbuy-aks-staging
    └─→ Service Connection: citadelbuy-aks-production

cd-web.yml (Web Deployment)
    │
    ├─→ ci-main.yml (implicit dependency)
    ├─→ Docker
    ├─→ Next.js
    ├─→ Azure Container Registry
    ├─→ Azure Kubernetes Service
    ├─→ Playwright (E2E tests)
    ├─→ Lighthouse CI
    ├─→ Variable Groups (same as API)
    └─→ Service Connections (same as API)

cd-services.yml (Services Deployment)
    │
    ├─→ ci-main.yml (implicit dependency)
    ├─→ Docker
    ├─→ Python 3.11
    ├─→ Azure Container Registry
    ├─→ Azure Kubernetes Service
    ├─→ Variable Groups (same as API)
    └─→ Service Connections (same as API)

infrastructure.yml (Terraform IaC)
    │
    ├─→ Terraform 1.6.0
    ├─→ Python 3.11 (for Checkov)
    ├─→ Checkov
    ├─→ Azure CLI
    ├─→ Variable Group: citadelbuy-terraform
    ├─→ Service Connection: citadelbuy-azure-connection
    └─→ Azure Storage (Terraform state backend)

release-pipeline.yml (Coordinated Release)
    │
    ├─→ cd-api.yml (can trigger)
    ├─→ cd-web.yml (can trigger)
    ├─→ cd-services.yml (can trigger)
    ├─→ All variable groups
    └─→ All service connections
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Data Flow                                   │
└─────────────────────────────────────────────────────────────────────┘

Developer
    │
    ▼
Feature Branch (local)
    │
    ▼
git push → Azure Repos
    │
    ▼
Pull Request Created
    │
    ▼
ci-main.yml triggers
    │
    ├─→ Install dependencies
    ├─→ Run linting
    ├─→ Run tests
    ├─→ Build apps
    │
    ▼
Test Results → Azure DevOps Test Results
    │
    ▼
Code Review → Approval
    │
    ▼
Merge to main/develop
    │
    ▼
CD Pipeline triggers (cd-api, cd-web, cd-services)
    │
    ├─→ Build Docker Images
    │       │
    │       ▼
    │   Push to Azure Container Registry
    │       │
    │       ▼
    │   Pull in AKS
    │
    ├─→ Deploy to Dev
    │       │
    │       ▼
    │   Health Checks
    │       │
    │       ▼
    │   Smoke Tests
    │
    ├─→ Deploy to Staging (if main)
    │       │
    │       ▼
    │   E2E Tests
    │       │
    │       ▼
    │   Manual Approval (1 approver)
    │
    └─→ Deploy to Production (if approved)
            │
            ├─→ Canary Deployment (25%)
            │       │
            │       ▼
            │   Smoke Tests
            │       │
            │       ▼
            │   Promote to 100%
            │
            ▼
        Production Traffic
            │
            ▼
        Application Insights & Monitoring
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Security Flow                                │
└─────────────────────────────────────────────────────────────────────┘

Code Commit
    │
    ▼
┌────────────────────────────────┐
│  Security Scanning (CI)        │
│  ├─ pnpm audit                 │
│  ├─ Dependency vulnerability   │
│  └─ License compliance         │
└────────────────────────────────┘
    │
    ▼
Docker Image Build
    │
    ▼
┌────────────────────────────────┐
│  Image Scanning                │
│  ├─ Trivy vulnerability scan   │
│  ├─ SBOM generation            │
│  └─ Layer analysis             │
└────────────────────────────────┘
    │
    ▼
Infrastructure Code
    │
    ▼
┌────────────────────────────────┐
│  Terraform Scanning            │
│  ├─ Checkov security checks    │
│  ├─ Policy compliance          │
│  └─ Best practices             │
└────────────────────────────────┘
    │
    ▼
Deployment
    │
    ▼
┌────────────────────────────────┐
│  Runtime Security              │
│  ├─ Key Vault secrets          │
│  ├─ Managed identities         │
│  ├─ Network policies           │
│  ├─ Pod security policies      │
│  └─ RBAC                       │
└────────────────────────────────┘
    │
    ▼
Monitoring
    │
    ▼
┌────────────────────────────────┐
│  Security Monitoring           │
│  ├─ Azure Security Center      │
│  ├─ Log Analytics              │
│  ├─ Audit logs                 │
│  └─ Alert rules                │
└────────────────────────────────┘
```

## High Availability Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│                   High Availability Architecture                     │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Azure Front Door  │
                    │   or App Gateway    │
                    └─────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐            ┌─────────────────┐
    │   Region 1      │            │   Region 2      │
    │   (Primary)     │            │   (Failover)    │
    └─────────────────┘            └─────────────────┘
              │                               │
              ▼                               ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  AKS Cluster    │            │  AKS Cluster    │
    │  ┌───────────┐  │            │  ┌───────────┐  │
    │  │ Node Pool │  │            │  │ Node Pool │  │
    │  │  (3 nodes)│  │            │  │  (3 nodes)│  │
    │  └───────────┘  │            │  └───────────┘  │
    │                 │            │                 │
    │  ┌───────────┐  │            │  ┌───────────┐  │
    │  │  API Pods │  │            │  │  API Pods │  │
    │  │  (3 reps) │  │            │  │  (3 reps) │  │
    │  └───────────┘  │            │  └───────────┘  │
    │                 │            │                 │
    │  ┌───────────┐  │            │  ┌───────────┐  │
    │  │  Web Pods │  │            │  │  Web Pods │  │
    │  │  (3 reps) │  │            │  │  (3 reps) │  │
    │  └───────────┘  │            │  └───────────┘  │
    └─────────────────┘            └─────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
                    ┌─────────────────────┐
                    │  Azure Database     │
                    │  PostgreSQL         │
                    │  (Geo-replicated)   │
                    └─────────────────────┘
```

## Monitoring and Observability

```
┌─────────────────────────────────────────────────────────────────────┐
│              Monitoring and Observability Stack                      │
└─────────────────────────────────────────────────────────────────────┘

Application Layer
    │
    ├─→ Application Insights
    │   ├─ Performance metrics
    │   ├─ Error tracking
    │   ├─ User analytics
    │   └─ Custom events
    │
    ├─→ Sentry
    │   ├─ Error reporting
    │   ├─ Stack traces
    │   └─ Release tracking
    │
    └─→ Custom Metrics
        ├─ Business KPIs
        └─ Application health

Infrastructure Layer
    │
    ├─→ Azure Monitor
    │   ├─ Resource metrics
    │   ├─ Activity logs
    │   └─ Diagnostic settings
    │
    ├─→ AKS Monitoring
    │   ├─ Container Insights
    │   ├─ Pod metrics
    │   ├─ Node health
    │   └─ Kubernetes events
    │
    └─→ Log Analytics
        ├─ Centralized logs
        ├─ Query capabilities
        └─ Retention policies

Pipeline Layer
    │
    ├─→ Azure DevOps Analytics
    │   ├─ Build duration
    │   ├─ Success rate
    │   ├─ Deployment frequency
    │   └─ Lead time
    │
    └─→ Test Results
        ├─ Test coverage
        ├─ Pass/fail rates
        └─ Performance trends

Alerting
    │
    ├─→ Production alerts → PagerDuty/Teams
    ├─→ Staging alerts → Slack/Email
    └─→ Dev alerts → Email
```

---

**Last Updated**: 2025-12-06
**Architecture Version**: 1.0.0
**Cloud Provider**: Microsoft Azure
**Container Orchestration**: Kubernetes (AKS)
**CI/CD Platform**: Azure DevOps
