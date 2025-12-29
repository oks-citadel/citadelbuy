# Broxiva GitHub Actions Workflow Inventory

## Vendor-Customer Global E-Commerce Platform

**CI/CD | Security | Infrastructure | Azure Deployment**

---

## 1. WORKFLOW OVERVIEW

### Workflow Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflows                      │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   CI Workflows  │  CD Workflows   │   Security & Operations     │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ • ci.yml        │ • cd-dev.yml    │ • sast.yml                  │
│ • ci-build-     │ • cd-staging.yml│ • secret-scan.yml           │
│   push.yml      │ • cd-prod.yml   │ • dependency-scan.yml       │
│ • e2e-tests.yml │ • cd-aks-       │ • container-scan.yml        │
│ • smoke-test.yml│   deploy.yml    │ • compliance-check.yml      │
│                 │ • deploy-prod-  │ • api-security-test.yml     │
│                 │   broxiva.yml   │ • drift-detection.yml       │
│                 │                 │ • secret-rotation.yml       │
│                 │                 │ • cost-optimization.yml     │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### Deployment Flow

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌────────────┐
│  Commit  │───▶│    CI    │───▶│  Staging  │───▶│ Production │
│          │    │  Build   │    │  Deploy   │    │   Deploy   │
└──────────┘    │  Test    │    │  Smoke    │    │ Blue-Green │
                │  Lint    │    │  Test     │    │  Rollback  │
                └──────────┘    └───────────┘    └────────────┘
                     │               │                 │
                     ▼               ▼                 ▼
               Security Scans   E2E Tests      Manual Approval
```

---

## 2. CI WORKFLOWS

### 2.1 Main CI Pipeline

**File:** `.github/workflows/ci.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push to `main`, `develop`; PRs to `main`, `develop` |
| **Runs On** | `ubuntu-latest` |
| **Node Version** | 20 |
| **Package Manager** | pnpm 10 |

#### Jobs

| Job | Description | Dependencies |
|-----|-------------|--------------|
| `setup` | Install dependencies, cache | None |
| `lint` | ESLint, Prettier checks | `setup` |
| `typecheck` | TypeScript compilation | `setup` |
| `test` | Unit tests with coverage | `setup` |
| `build` | Build all apps | `lint`, `typecheck`, `test` |

#### Cache Strategy

```yaml
cache:
  - pnpm store
  - node_modules (all apps/packages)
  - Turbo cache
```

---

### 2.2 CI Build & Push

**File:** `.github/workflows/ci-build-push.yml`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Build Docker images and push to registry |
| **Registry** | Azure Container Registry (ACR) |
| **Multi-arch** | linux/amd64, linux/arm64 |

#### Build Matrix

| App | Dockerfile | Image Name |
|-----|------------|------------|
| API | `apps/api/Dockerfile` | `broxiva-api` |
| Web | `apps/web/Dockerfile` | `broxiva-web` |
| Mobile (expo) | `apps/mobile/Dockerfile` | `broxiva-mobile` |

---

### 2.3 E2E Tests

**File:** `.github/workflows/e2e-tests.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push to `main`; Manual dispatch |
| **Environment** | Docker Compose (PostgreSQL, Redis, Elasticsearch) |
| **Test Framework** | Jest + Supertest |

#### Test Suites

| Suite | File | Timeout |
|-------|------|---------|
| Auth | `auth.e2e-spec.ts` | 5 min |
| Shopping | `shopping.e2e-spec.ts` | 10 min |
| Checkout | `checkout.e2e-spec.ts` | 10 min |
| Payments | `payment-flow.e2e-spec.ts` | 10 min |
| Orders | `order-lifecycle.e2e-spec.ts` | 10 min |
| Organization | `organization.e2e-spec.ts` | 10 min |
| User Registration | `user-registration.e2e-spec.ts` | 5 min |

---

### 2.4 Smoke Tests

**File:** `.github/workflows/smoke-test.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | After deployment; Manual dispatch |
| **Purpose** | Validate deployed environment |

#### Health Checks

| Endpoint | Expected |
|----------|----------|
| `/health` | 200 OK |
| `/health/database` | 200 OK |
| `/health/cache` | 200 OK |
| `/version` | Version string |

---

## 3. CD WORKFLOWS

### 3.1 Development Deployment

**File:** `.github/workflows/cd-dev.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push to `develop` |
| **Environment** | `development` |
| **Approval** | None (automatic) |
| **AKS Cluster** | `broxiva-dev-aks` |

#### Deployment Steps

1. Build Docker images
2. Push to ACR
3. Deploy to AKS dev namespace
4. Run smoke tests
5. Notify Slack

---

### 3.2 Staging Deployment

**File:** `.github/workflows/cd-staging.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push to `main`; Manual dispatch |
| **Environment** | `staging` |
| **Approval** | None (automatic) |
| **AKS Cluster** | `broxiva-staging-aks` |

#### Deployment Steps

1. Build Docker images with staging tag
2. Push to ACR
3. Deploy to AKS staging namespace
4. Run E2E tests
5. Run smoke tests
6. Generate deployment report

---

### 3.3 Production Deployment

**File:** `.github/workflows/cd-prod.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Manual dispatch only |
| **Environment** | `production` |
| **Approval** | Required (2 reviewers) |
| **Strategy** | Blue-Green deployment |
| **AKS Cluster** | `broxiva-prod-aks` |

#### Deployment Steps

1. Pre-deployment validation
2. Verify staging deployment
3. Security scan
4. Manual approval gate
5. Blue-green deployment
6. Health check validation
7. Traffic switch
8. Post-deployment smoke tests
9. Rollback capability (30 min window)

#### Blue-Green Strategy

```
┌─────────────┐         ┌─────────────┐
│   Blue      │◀────────│   Router    │
│  (Current)  │         │  (Ingress)  │
└─────────────┘         └─────────────┘
                              │
┌─────────────┐               │
│   Green     │◀──────────────┘
│   (New)     │    (After validation)
└─────────────┘
```

---

### 3.4 AKS Deployment

**File:** `.github/workflows/cd-aks-deploy.yml`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Unified AKS deployment workflow |
| **Auth** | Azure OIDC (Workload Identity) |
| **Tools** | kubectl, kustomize, helm |

#### Kustomize Overlays

| Environment | Path |
|-------------|------|
| Development | `infrastructure/kubernetes/overlays/dev` |
| Staging | `infrastructure/kubernetes/overlays/staging` |
| Production | `infrastructure/kubernetes/overlays/production` |

---

### 3.5 Production Deploy (Broxiva)

**File:** `.github/workflows/deploy-production-broxiva.yml`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Complete production deployment |
| **Includes** | Database migrations, cache warm-up |

---

## 4. SECURITY WORKFLOWS

### 4.1 SAST (Static Application Security Testing)

**File:** `.github/workflows/sast.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push, PR |
| **Tool** | CodeQL, Semgrep |
| **Languages** | TypeScript, JavaScript |

#### Scan Types

| Type | Description |
|------|-------------|
| CodeQL | GitHub-native security scanning |
| Semgrep | Custom rule scanning |
| ESLint Security | Security-focused lint rules |

---

### 4.2 Secret Scanning

**File:** `.github/workflows/secret-scan.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push, PR |
| **Tools** | Gitleaks, TruffleHog |

#### Detection Patterns

| Pattern | Examples |
|---------|----------|
| API Keys | `sk_live_`, `pk_live_` |
| AWS | `AKIA`, `AWS_SECRET` |
| Azure | `DefaultEndpointsProtocol` |
| Database | Connection strings |
| JWT | Private keys |

---

### 4.3 Dependency Scanning

**File:** `.github/workflows/dependency-scan.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push, PR, Schedule (daily) |
| **Tools** | npm audit, Snyk, Dependabot |

#### Severity Thresholds

| Severity | Action |
|----------|--------|
| Critical | Block PR |
| High | Block PR |
| Medium | Warning |
| Low | Info |

---

### 4.4 Container Scanning

**File:** `.github/workflows/container-scan.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | After image build |
| **Tools** | Trivy, Snyk Container |

#### Scan Targets

| Image | Scan |
|-------|------|
| Base images | Node:20-alpine, Python:3.11 |
| App images | broxiva-api, broxiva-web |
| Sidecar images | nginx, redis |

---

### 4.5 API Security Testing

**File:** `.github/workflows/api-security-test.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | PR, Schedule (weekly) |
| **Tools** | OWASP ZAP, Nuclei |

#### Test Categories

| Category | Tests |
|----------|-------|
| Authentication | Token bypass, session hijacking |
| Authorization | IDOR, privilege escalation |
| Injection | SQL, NoSQL, Command |
| XSS | Reflected, Stored |
| CSRF | Token validation |

---

### 4.6 Compliance Check

**File:** `.github/workflows/compliance-check.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | PR, Schedule (weekly) |
| **Standards** | SOC2, GDPR, PCI-DSS |

#### Compliance Areas

| Area | Checks |
|------|--------|
| Data Protection | Encryption at rest/transit |
| Access Control | RBAC enforcement |
| Audit Logging | Log completeness |
| Privacy | PII handling |

---

## 5. INFRASTRUCTURE WORKFLOWS

### 5.1 Terraform Plan

**File:** `.github/workflows/terraform-plan.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | PR to `main` (infrastructure changes) |
| **Output** | Plan summary in PR comment |

#### Terraform Modules

| Module | Path |
|--------|------|
| AKS | `infrastructure/terraform/modules/aks` |
| ACR | `infrastructure/terraform/modules/acr` |
| PostgreSQL | `infrastructure/terraform/modules/postgresql` |
| Redis | `infrastructure/terraform/modules/redis` |
| Key Vault | `infrastructure/terraform/modules/keyvault` |
| Networking | `infrastructure/terraform/modules/networking` |
| Monitoring | `infrastructure/terraform/modules/monitoring` |

---

### 5.2 Terraform Apply (Per Environment)

**Files:**
- `.github/workflows/terraform-apply-dev.yml`
- `.github/workflows/terraform-apply-staging.yml`
- `.github/workflows/terraform-apply-prod.yml`

| Environment | Approval | Auto-Apply |
|-------------|----------|------------|
| Development | None | Yes |
| Staging | None | Yes |
| Production | Required | No |

---

### 5.3 Drift Detection

**File:** `.github/workflows/drift-detection.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Schedule (every 6 hours) |
| **Purpose** | Detect infrastructure drift |

#### Detection Scope

| Resource | Check |
|----------|-------|
| AKS | Node count, version |
| ACR | SKU, replication |
| PostgreSQL | Config, version |
| Redis | Cache size, config |
| Key Vault | Access policies |

---

### 5.4 Drift Repair

**File:** `.github/workflows/drift-repair.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Manual dispatch |
| **Purpose** | Auto-remediate drift |
| **Safety** | Plan review required |

---

### 5.5 Terraform Drift Detection

**File:** `.github/workflows/terraform-drift-detection.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Schedule (daily) |
| **Report** | Slack notification |

---

## 6. OPERATIONS WORKFLOWS

### 6.1 Secret Rotation

**File:** `.github/workflows/secret-rotation.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Schedule (monthly); Manual |
| **Scope** | Database, Redis, API keys |

#### Rotation Schedule

| Secret Type | Rotation Period |
|-------------|-----------------|
| Database passwords | 90 days |
| API keys | 90 days |
| JWT secrets | 30 days |
| Service principals | 180 days |

---

### 6.2 Cost Optimization

**File:** `.github/workflows/cost-optimization-shutdown.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Schedule (nights/weekends for dev) |
| **Purpose** | Scale down non-prod environments |

#### Shutdown Schedule (Dev)

| Day | Action |
|-----|--------|
| Mon-Fri 8PM | Scale to 0 |
| Mon-Fri 7AM | Scale to normal |
| Weekends | Scale to 0 |

---

### 6.3 Cost Anomaly Detection

**File:** `.github/workflows/cost-anomaly-detection.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Schedule (daily) |
| **Threshold** | 20% increase |
| **Alert** | Slack, Email |

---

### 6.4 Webhook Monitoring

**File:** `.github/workflows/webhook-monitoring.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Schedule (every 15 min) |
| **Purpose** | Monitor webhook health |

#### Monitored Webhooks

| Provider | Endpoint |
|----------|----------|
| Stripe | `/payments/webhook` |
| PayPal | `/payments/paypal/webhook` |
| KYC | `/organization-kyc/webhook` |

---

### 6.5 Guardrails

**File:** `.github/workflows/guardrails.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | PR |
| **Purpose** | Enforce development standards |

#### Guardrail Checks

| Check | Enforcement |
|-------|-------------|
| PR size | Max 500 lines |
| Test coverage | Min 80% |
| Commit message | Conventional commits |
| Branch naming | feature/, bugfix/, hotfix/ |

---

## 7. DOCKER WORKFLOWS

### 7.1 Docker Build

**File:** `.github/workflows/docker-build.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | PR (for validation) |
| **Purpose** | Validate Docker builds |

---

### 7.2 Docker Build & Push ACR

**File:** `.github/workflows/docker-build-and-push-acr.yml`

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push to `main` |
| **Registry** | Azure Container Registry |
| **Tags** | `latest`, `sha-{commit}`, `v{version}` |

---

### 7.3 Build and Push ACR

**File:** `.github/workflows/build-and-push-acr.yml`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Production image builds |
| **Signing** | Cosign image signing |

---

## 8. WORKFLOW SECRETS

### Required Secrets

| Secret | Purpose | Scope |
|--------|---------|-------|
| `AZURE_CLIENT_ID` | Azure OIDC auth | All |
| `AZURE_TENANT_ID` | Azure tenant | All |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription | All |
| `ACR_LOGIN_SERVER` | Container registry URL | CD |
| `ACR_USERNAME` | Registry auth | CD |
| `ACR_PASSWORD` | Registry auth | CD |
| `TURBO_TOKEN` | Turbo cache | CI |
| `TURBO_TEAM` | Turbo team | CI |
| `SLACK_WEBHOOK_URL` | Notifications | All |
| `SNYK_TOKEN` | Vulnerability scanning | Security |
| `CODECOV_TOKEN` | Coverage reports | CI |

### Environment Secrets

| Environment | Additional Secrets |
|-------------|-------------------|
| Development | `DEV_DATABASE_URL`, `DEV_REDIS_URL` |
| Staging | `STAGING_DATABASE_URL`, `STAGING_REDIS_URL` |
| Production | `PROD_DATABASE_URL`, `PROD_REDIS_URL`, `SENTRY_DSN` |

---

## 9. WORKFLOW MATRIX

### Trigger Summary

| Workflow | Push | PR | Schedule | Manual |
|----------|------|-----|----------|--------|
| CI | ✅ | ✅ | ❌ | ❌ |
| CD Dev | ✅ | ❌ | ❌ | ✅ |
| CD Staging | ✅ | ❌ | ❌ | ✅ |
| CD Prod | ❌ | ❌ | ❌ | ✅ |
| E2E Tests | ✅ | ❌ | ❌ | ✅ |
| Smoke Tests | ❌ | ❌ | ❌ | ✅ |
| SAST | ✅ | ✅ | ❌ | ❌ |
| Secret Scan | ✅ | ✅ | ❌ | ❌ |
| Dependency Scan | ✅ | ✅ | ✅ | ❌ |
| Container Scan | ✅ | ❌ | ❌ | ❌ |
| API Security | ❌ | ✅ | ✅ | ❌ |
| Compliance | ❌ | ✅ | ✅ | ❌ |
| Terraform Plan | ❌ | ✅ | ❌ | ❌ |
| Terraform Apply | ❌ | ❌ | ❌ | ✅ |
| Drift Detection | ❌ | ❌ | ✅ | ❌ |
| Secret Rotation | ❌ | ❌ | ✅ | ✅ |
| Cost Optimization | ❌ | ❌ | ✅ | ✅ |

---

## 10. WORKFLOW FILES SUMMARY

### CI/CD Workflows (12 files)

| File | Purpose |
|------|---------|
| `ci.yml` | Main CI pipeline |
| `ci-build-push.yml` | Build and push images |
| `cd-dev.yml` | Deploy to development |
| `cd-staging.yml` | Deploy to staging |
| `cd-prod.yml` | Deploy to production |
| `cd-aks-deploy.yml` | AKS deployment |
| `deploy-production-broxiva.yml` | Production deploy |
| `e2e-tests.yml` | E2E test suite |
| `smoke-test.yml` | Smoke tests |
| `docker-build.yml` | Docker validation |
| `docker-build-and-push-acr.yml` | ACR push |
| `build-and-push-acr.yml` | Production images |

### Security Workflows (6 files)

| File | Purpose |
|------|---------|
| `sast.yml` | Static analysis |
| `secret-scan.yml` | Secret detection |
| `dependency-scan.yml` | Dependency audit |
| `container-scan.yml` | Container security |
| `api-security-test.yml` | API security |
| `compliance-check.yml` | Compliance |

### Infrastructure Workflows (7 files)

| File | Purpose |
|------|---------|
| `terraform-plan.yml` | Plan changes |
| `terraform-apply-dev.yml` | Apply to dev |
| `terraform-apply-staging.yml` | Apply to staging |
| `terraform-apply-prod.yml` | Apply to prod |
| `terraform-drift-detection.yml` | Detect drift |
| `drift-detection.yml` | K8s drift |
| `drift-repair.yml` | Auto-remediate |

### Operations Workflows (5 files)

| File | Purpose |
|------|---------|
| `secret-rotation.yml` | Rotate secrets |
| `cost-optimization-shutdown.yml` | Cost savings |
| `cost-anomaly-detection.yml` | Cost alerts |
| `webhook-monitoring.yml` | Webhook health |
| `guardrails.yml` | PR guardrails |

---

## 11. BEST PRACTICES IMPLEMENTED

### Performance

- ✅ Dependency caching (pnpm, node_modules)
- ✅ Turbo remote caching
- ✅ Parallel job execution
- ✅ Concurrency controls
- ✅ Conditional job execution

### Security

- ✅ OIDC authentication (no stored credentials)
- ✅ Least-privilege permissions
- ✅ Secret masking in logs
- ✅ Signed container images
- ✅ Multi-layer security scanning

### Reliability

- ✅ Blue-green deployments
- ✅ Automatic rollback capability
- ✅ Health check validation
- ✅ Smoke test verification
- ✅ Manual approval for production

### Observability

- ✅ Slack notifications
- ✅ Deployment tracking
- ✅ Cost monitoring
- ✅ Drift detection
- ✅ Webhook health monitoring

---

## 12. DOCUMENTATION

### Workflow Documentation

| Document | Path |
|----------|------|
| Deployment Flow | `.github/workflows/DEPLOYMENT_FLOW.md` |
| Security Architecture | `.github/workflows/SECURITY-ARCHITECTURE.md` |
| Security Setup | `.github/workflows/SECURITY-SETUP-CHECKLIST.md` |
| Quick Reference | `.github/workflows/QUICK-REFERENCE.md` |
| AKS Deployment | `.github/workflows/AKS_DEPLOYMENT_README.md` |
| Terraform Workflows | `.github/workflows/README-TERRAFORM-WORKFLOWS.md` |

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-17
**Total Workflows:** 30+
**Status:** Production-Ready
