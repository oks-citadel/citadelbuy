# PHASE 1: CI/CD Pipeline Forensics Report

**Generated:** 2025-12-13
**Repository:** Broxiva Organization
**Analyzed Workflows:** 18 workflow files

---

## Executive Summary

The CI/CD pipeline has **widespread failures** due to fundamental infrastructure issues. This report identifies the **Top 10 Root Failure Patterns** with specific file+line references and fix plans.

---

## Top 10 Root Failure Patterns

### 1. CRITICAL: Package Manager Mismatch

**What:** Project uses pnpm 10 but workflows use npm commands
**Why:** Actions fail with "npm ci" when only pnpm-lock.yaml exists
**Where:**
- `ci.yml:66` - Uses `npm ci` should be `pnpm install --frozen-lockfile`
- `sast.yml:66` - Uses `npm ci --ignore-scripts`
- `api-security-test.yml:54` - Uses `npm ci`
- `compliance-check.yml:636` - Uses `npm ci`
- `cd-dev.yml:54` - Uses `npm ci`

**Fix:**
```yaml
# BEFORE (broken)
- name: Install dependencies
  run: npm ci

# AFTER (fixed)
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 10

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

---

### 2. HIGH: Missing/Wrong Cache Configuration

**What:** Workflows use `cache: 'npm'` but project uses pnpm
**Why:** Cache is never restored, causing slow builds and potential failures
**Where:**
- `sast.yml:63` - `cache: 'npm'`
- `api-security-test.yml:51` - `cache: 'npm'`
- `compliance-check.yml:632` - `cache: 'npm'`

**Fix:**
```yaml
# BEFORE (broken)
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

# AFTER (fixed)
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'
```

---

### 3. HIGH: Job State Not Shared (API Security Tests)

**What:** `setup-test-environment` job starts app but subsequent jobs can't access it
**Why:** Each GitHub Actions job runs on a fresh runner - no state sharing
**Where:**
- `api-security-test.yml:37-74` - Setup job starts app
- `api-security-test.yml:78-151` - ZAP scan job can't reach app

**Fix:** Each job must start its own app instance OR use services/containers

```yaml
# Each job needs its own app startup
steps:
  - name: Checkout & Setup
    uses: actions/checkout@v4

  - name: Install and start application
    run: |
      pnpm install --frozen-lockfile
      nohup pnpm start &
      # Wait for ready
      timeout 120 bash -c 'until curl -f http://localhost:3000/health; do sleep 2; done'
```

---

### 4. HIGH: Missing Permissions Blocks

**What:** Workflows don't declare required permissions
**Why:** GitHub restricts GITHUB_TOKEN by default; workflows fail silently
**Where:**
- `ci.yml` - No permissions block
- Many other workflows rely on implicit permissions

**Fix:**
```yaml
permissions:
  contents: read
  packages: write
  security-events: write
  pull-requests: write
  id-token: write  # For OIDC
```

---

### 5. MEDIUM: Deprecated Action Versions

**What:** Using old action versions
**Why:** May have bugs, security issues, or missing features
**Where:**
- `drift-detection.yml:102` - `azure/login@v1` should be `@v2`
- `drift-detection.yml:259,261,389,495,578` - All `azure/login@v1`

**Fix:** Update to latest stable versions

---

### 6. FOUNDATION: No Composite Bootstrap Action

**What:** Same setup code (checkout, node, pnpm, cache) duplicated everywhere
**Why:** DRY violation, maintenance nightmare, inconsistent setups
**Impact:** All workflows

**Fix:** Create `.github/actions/bootstrap/action.yml`

---

### 7. FOUNDATION: No Environment/Secret Validation

**What:** No validation that required secrets exist before jobs run
**Why:** Workflows fail mid-execution with cryptic errors
**Impact:** All workflows using secrets

**Fix:** Create validation composite actions and env.schema.json

---

### 8. MEDIUM: Inconsistent Artifact Publishing

**What:** Not all jobs publish reports with `if: always()`
**Why:** On failure, no diagnostic artifacts available
**Where:**
- Various jobs missing `if: always()` on upload-artifact steps

**Fix:** Standardize with `publish-report` composite action

---

### 9. HIGH: Working Directory Issues (Monorepo)

**What:** Commands run from wrong directory
**Why:** This is a monorepo - `apps/`, `packages/`, `services/` subdirectories
**Where:**
- `cd-dev.yml:54` - `working-directory: ./apps/api` but uses npm
- Various other path issues

**Fix:** Ensure all commands reference correct paths relative to repo root

---

### 10. MEDIUM: No Reusable Workflows

**What:** No workflow reuse - all workflows standalone
**Why:** Same patterns repeated, no standardization
**Impact:** Difficult maintenance, inconsistent behavior

**Fix:** Create `_reusable-*.yml` workflows in `.github/workflows/`

---

## Required Secrets Inventory

Based on workflow analysis, these secrets must be configured:

| Secret Name | Used In | Purpose |
|-------------|---------|---------|
| `AZURE_CLIENT_ID` | cd-*, drift-*, build-* | Azure OIDC auth |
| `AZURE_TENANT_ID` | cd-*, drift-*, build-* | Azure OIDC auth |
| `AZURE_SUBSCRIPTION_ID` | cd-*, drift-*, build-* | Azure OIDC auth |
| `DEV_DATABASE_URL` | cd-dev | Prisma migrations |
| `STAGING_DATABASE_URL` | cd-staging | Prisma migrations |
| `PROD_DATABASE_URL` | cd-prod | Prisma migrations |
| `TF_STATE_RESOURCE_GROUP` | drift-detection | Terraform backend |
| `TF_STATE_STORAGE_ACCOUNT` | drift-detection | Terraform backend |
| `TF_STATE_CONTAINER` | drift-detection | Terraform backend |
| `SLACK_WEBHOOK_URL` | notifications | Slack alerts |
| `SLACK_SECURITY_WEBHOOK` | security scans | Security alerts |
| `TEAMS_SECURITY_WEBHOOK` | security scans | Teams alerts |
| `TURBO_TOKEN` | ci | Turborepo remote cache |
| `TURBO_TEAM` | ci | Turborepo team |
| `GITLEAKS_LICENSE` | secret-scan | Gitleaks enterprise |

---

## Fix Plan Summary

### Wave 1: Foundation (Immediate)
1. Create composite actions: `bootstrap`, `validate-env`, `validate-secrets`, `publish-report`
2. Create `env.schema.json` for dev/staging/prod
3. Fix package manager (pnpm) in all workflows

### Wave 2: Security Scans
1. Fix SAST workflow (pnpm, permissions)
2. Fix secret scanning workflow
3. Fix API security tests (job isolation)
4. Fix compliance checks

### Wave 3: Build & Infrastructure
1. Fix drift detection (action versions)
2. Fix build-and-push-acr
3. Add runtime self-healing

### Wave 4: Testing
1. Create E2E test workflow
2. Add webhook monitoring
3. Add accessibility tests
4. Add contract tests

### Wave 5: Deployment
1. Fix CD dev with gates
2. Fix CD prod with approvals, backup, rollback
3. Generate master report

---

## Files to Create

```
.github/
  actions/
    bootstrap/
      action.yml
    validate-env/
      action.yml
    validate-secrets/
      action.yml
    publish-report/
      action.yml
  workflows/
    _reusable-bootstrap.yml
    _reusable-security-scan.yml
    _reusable-sast.yml
    _reusable-build.yml
    _reusable-deploy.yml

env/
  env.schema.dev.json
  env.schema.staging.json
  env.schema.prod.json
  secrets.schema.json
```

---

## Next Steps

Proceeding to create foundation files and fix workflows in order.
