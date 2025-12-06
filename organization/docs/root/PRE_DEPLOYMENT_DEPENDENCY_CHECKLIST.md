# Pre-Deployment Dependency Checklist

Use this checklist before deploying to production to ensure all dependencies are properly configured and secure.

## Overview

This checklist should be completed:
- Before every production deployment
- After major dependency updates
- During security audits
- When onboarding new team members

**Estimated Time:** 20-30 minutes

---

## Pre-Flight Checks

### Environment Verification

- [ ] **Node.js Version**
  ```bash
  node --version  # Should be >= 20.0.0
  ```
  - Current: `_____`
  - Required: `>= 20.0.0`
  - Status: ✓ / ✗

- [ ] **pnpm Version**
  ```bash
  pnpm --version  # Should be >= 10.0.0
  ```
  - Current: `_____`
  - Required: `>= 10.0.0`
  - Status: ✓ / ✗

- [ ] **Git Status Clean**
  ```bash
  git status  # Should show clean working tree
  ```
  - Status: ✓ / ✗

---

## Dependency Installation

### 1. Fresh Installation

- [ ] **Clean Install**
  ```bash
  # Remove existing node_modules
  rm -rf node_modules apps/*/node_modules packages/*/node_modules

  # Remove lockfile (only if needed for clean slate)
  # rm pnpm-lock.yaml

  # Fresh install
  pnpm install
  ```
  - Duration: `_____`
  - Errors: ✓ / ✗
  - Warnings: ✓ / ✗

- [ ] **Lockfile Status**
  ```bash
  git status pnpm-lock.yaml
  ```
  - [ ] Lockfile is committed
  - [ ] Lockfile is up to date
  - [ ] No uncommitted changes

---

## Dependency Verification

### 2. Package Integrity

- [ ] **Validate package.json Files**
  ```bash
  bash scripts/verify-deps.sh --skip-build --skip-audit
  ```
  - Root package.json: ✓ / ✗
  - apps/api/package.json: ✓ / ✗
  - apps/web/package.json: ✓ / ✗
  - apps/mobile/package.json: ✓ / ✗
  - All packages/*/package.json: ✓ / ✗

- [ ] **Check for Missing Dependencies**
  ```bash
  pnpm list --depth 0
  ```
  - [ ] No missing peer dependencies
  - [ ] All required packages installed
  - [ ] No broken symlinks

### 3. Known Dependency Issues

Check for and document any required manual installations:

- [ ] **Bull Queue (if using)**
  ```bash
  cd apps/api
  pnpm list bull
  # If missing: pnpm add bull @types/bull
  ```
  - Status: Installed / Not Needed / Missing

- [ ] **Prisma Client Generated**
  ```bash
  cd apps/api
  pnpm prisma generate
  ```
  - Status: ✓ / ✗

- [ ] **Workspace Dependencies Linked**
  ```bash
  pnpm list @citadelbuy/types @citadelbuy/utils @citadelbuy/ui @citadelbuy/ai-sdk
  ```
  - @citadelbuy/types: ✓ / ✗
  - @citadelbuy/utils: ✓ / ✗
  - @citadelbuy/ui: ✓ / ✗
  - @citadelbuy/ai-sdk: ✓ / ✗

---

## Security Audit

### 4. Vulnerability Scanning

- [ ] **Run Security Audit**
  ```bash
  pnpm audit --audit-level=moderate
  ```
  - Critical vulnerabilities: `_____`
  - High vulnerabilities: `_____`
  - Moderate vulnerabilities: `_____`
  - Low vulnerabilities: `_____`

- [ ] **Review Vulnerability Details**
  ```bash
  pnpm audit --json > audit-report.json
  ```
  - [ ] All critical issues resolved
  - [ ] High issues documented/resolved
  - [ ] Moderate issues reviewed
  - [ ] Low issues acknowledged

- [ ] **Attempt Automatic Fixes**
  ```bash
  pnpm audit --fix
  ```
  - Fixed automatically: `_____`
  - Manual fixes needed: `_____`

- [ ] **Document Unresolved Issues**
  - Issue #1: `_________________`
  - Severity: `_________________`
  - Mitigation: `_________________`
  - Tracking: `_________________`

---

## Version Management

### 5. Dependency Versions

- [ ] **Check for Outdated Packages**
  ```bash
  pnpm outdated
  ```
  - Major updates available: `_____`
  - Minor updates available: `_____`
  - Patch updates available: `_____`

- [ ] **Verify Version Consistency**

  **React Versions:**
  ```bash
  pnpm why react
  ```
  - apps/web: `_____`
  - apps/mobile: `_____`
  - packages/ui: `_____`
  - Consistent? ✓ / ✗

  **TypeScript Versions:**
  ```bash
  pnpm why typescript
  ```
  - Root: `_____`
  - apps/api: `_____`
  - apps/web: `_____`
  - Consistent? ✓ / ✗

- [ ] **Check Deprecated Packages**
  ```bash
  pnpm list --depth 0 2>&1 | grep -i deprecated
  ```
  - Deprecated packages found: `_____`
  - Action plan: `_________________`

---

## Build Verification

### 6. TypeScript Compilation

- [ ] **API TypeScript Check**
  ```bash
  cd apps/api
  pnpm type-check
  # or: npx tsc --noEmit
  ```
  - Errors: `_____`
  - Warnings: `_____`
  - Status: ✓ / ✗

- [ ] **Web TypeScript Check**
  ```bash
  cd apps/web
  pnpm type-check
  # or: npx tsc --noEmit
  ```
  - Errors: `_____`
  - Warnings: `_____`
  - Status: ✓ / ✗

- [ ] **Mobile TypeScript Check**
  ```bash
  cd apps/mobile
  pnpm typecheck
  ```
  - Errors: `_____`
  - Warnings: `_____`
  - Status: ✓ / ✗

### 7. Build Process

- [ ] **Build Packages First**
  ```bash
  cd ../../  # Back to root
  pnpm run build:packages
  ```
  - Duration: `_____`
  - Status: ✓ / ✗
  - Issues: `_________________`

- [ ] **Build API**
  ```bash
  pnpm run build:api
  ```
  - Duration: `_____`
  - Status: ✓ / ✗
  - Issues: `_________________`

- [ ] **Build Web**
  ```bash
  pnpm run build:web
  ```
  - Duration: `_____`
  - Status: ✓ / ✗
  - Issues: `_________________`

- [ ] **Full Build**
  ```bash
  pnpm build
  ```
  - Duration: `_____`
  - Status: ✓ / ✗
  - Total size: `_____`

---

## Testing

### 8. Test Suite Execution

- [ ] **Unit Tests**
  ```bash
  pnpm test
  ```
  - Passed: `_____`
  - Failed: `_____`
  - Skipped: `_____`
  - Coverage: `_____%`
  - Status: ✓ / ✗

- [ ] **E2E Tests**
  ```bash
  pnpm test:e2e
  ```
  - Passed: `_____`
  - Failed: `_____`
  - Skipped: `_____`
  - Status: ✓ / ✗

- [ ] **Linting**
  ```bash
  pnpm lint
  ```
  - Errors: `_____`
  - Warnings: `_____`
  - Status: ✓ / ✗

---

## Performance & Size

### 9. Bundle Analysis

- [ ] **Check Bundle Sizes**
  ```bash
  # For Next.js
  cd apps/web
  pnpm build
  # Review output for bundle sizes
  ```
  - Total size: `_____`
  - First load JS: `_____`
  - Status: ✓ / ✗ (within limits)

- [ ] **Node Modules Size**
  ```bash
  du -sh node_modules apps/*/node_modules packages/*/node_modules
  ```
  - Total size: `_____`
  - Acceptable? ✓ / ✗

---

## Documentation

### 10. Documentation Check

- [ ] **Dependencies Documented**
  - [ ] All new dependencies added to documentation
  - [ ] Breaking changes documented
  - [ ] Migration guides created (if needed)
  - [ ] README.md updated

- [ ] **Environment Variables**
  - [ ] .env.example files updated
  - [ ] All required variables documented
  - [ ] Secure defaults provided

---

## Production Readiness

### 11. Production Configuration

- [ ] **Environment Check**
  - [ ] NODE_ENV=production
  - [ ] Production dependencies only
  - [ ] Dev dependencies excluded from production

- [ ] **Database Migrations**
  ```bash
  cd apps/api
  pnpm prisma migrate deploy
  ```
  - Status: ✓ / ✗

- [ ] **Prisma Client for Production**
  ```bash
  pnpm prisma generate
  ```
  - Status: ✓ / ✗

### 12. Docker Verification (if applicable)

- [ ] **Docker Build**
  ```bash
  docker-compose -f infrastructure/docker/docker-compose.production.yml build
  ```
  - Status: ✓ / ✗
  - Image size: `_____`

- [ ] **Docker Run Test**
  ```bash
  docker-compose -f infrastructure/docker/docker-compose.production.yml up -d
  docker-compose ps
  ```
  - All services running: ✓ / ✗

---

## Final Verification

### 13. Complete Verification Script

- [ ] **Run Full Verification**
  ```bash
  bash scripts/verify-deps.sh
  ```
  - Exit code: `_____` (0 = success)
  - Warnings: `_____`
  - Errors: `_____`
  - Report location: `_________________`

### 14. Manual Verification

- [ ] **Import Resolution**
  - [ ] All imports resolve correctly
  - [ ] No circular dependencies
  - [ ] Workspace dependencies work

- [ ] **Runtime Verification**
  - [ ] API starts without errors
  - [ ] Web app loads successfully
  - [ ] No console errors
  - [ ] All critical features work

---

## Sign-Off

### Deployment Approval

**Checklist Completed By:** `_________________`

**Date:** `_________________`

**Time:** `_________________`

**Summary:**

Total Checks: `_____`
Passed: `_____`
Failed: `_____`
Warnings: `_____`

**Critical Issues:**
1. `_________________`
2. `_________________`

**Known Issues (Non-blocking):**
1. `_________________`
2. `_________________`

**Deployment Decision:**

- [ ] ✅ APPROVED - All checks passed, ready for deployment
- [ ] ⚠️ APPROVED WITH WARNINGS - Deploy with monitoring
- [ ] ❌ REJECTED - Critical issues found, do not deploy

**Approved By:** `_________________`

**Approval Date:** `_________________`

**Deployment Target:**
- [ ] Production
- [ ] Staging
- [ ] Development

---

## Post-Deployment Verification

### After Deployment

- [ ] **Smoke Tests**
  - [ ] Health check endpoint responds
  - [ ] Database connection successful
  - [ ] API endpoints accessible
  - [ ] Frontend loads correctly

- [ ] **Monitoring**
  - [ ] No error spikes in logs
  - [ ] Performance metrics normal
  - [ ] No dependency-related errors
  - [ ] Memory usage normal

- [ ] **Rollback Plan**
  - [ ] Previous version documented
  - [ ] Rollback procedure tested
  - [ ] Database backup confirmed

---

## Troubleshooting Quick Reference

### If Checks Fail

**Build Failures:**
```bash
# Clear and rebuild
pnpm clean
pnpm install
pnpm build
```

**Test Failures:**
```bash
# Run specific test
pnpm test -- <test-name>

# Debug mode
pnpm test:debug
```

**Security Issues:**
```bash
# Try automatic fix
pnpm audit --fix

# Manual review
pnpm audit --json > audit.json
```

**Type Errors:**
```bash
# Regenerate types
cd apps/api
pnpm prisma generate

# Clear TS cache
rm -rf apps/*/tsconfig.tsbuildinfo
pnpm type-check
```

---

## Resources

- Full Installation Guide: `docs/DEPENDENCY_INSTALLATION.md`
- Verification Script: `scripts/verify-deps.sh`
- Security Guidelines: `docs/SECURITY_SETUP.md`
- Deployment Guide: `docs/DEPLOYMENT.md` (if exists)

---

## Checklist Version

**Version:** 1.0.0
**Last Updated:** 2025-12-04
**Next Review:** 2025-03-04

---

## Notes

Use this space for deployment-specific notes:

```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```
