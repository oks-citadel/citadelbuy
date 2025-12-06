# Dependency Quick Reference Guide

Quick commands and solutions for common dependency tasks.

---

## Essential Commands

### Installation
```bash
pnpm install                    # Install all dependencies
pnpm install <package>          # Add dependency
pnpm add -D <package>          # Add dev dependency
pnpm remove <package>          # Remove dependency
```

### Verification
```bash
bash scripts/verify-deps.sh     # Full verification
bash scripts/verify-deps.sh --skip-build  # Quick check
bash scripts/verify-deps.sh --fix         # Auto-fix issues
```

### Updates
```bash
pnpm outdated                   # Check for updates
pnpm update                     # Update to latest patch
pnpm update --latest           # Update to latest version
pnpm update <package> --latest # Update specific package
```

### Security
```bash
pnpm audit                      # Security audit
pnpm audit --fix               # Fix vulnerabilities
pnpm audit --json > audit.json # Detailed report
```

### Build
```bash
pnpm build                      # Build everything
pnpm run build:packages        # Build packages only
pnpm run build:api            # Build API only
pnpm run build:web            # Build web only
```

### Type Checking
```bash
pnpm type-check                # Check all workspaces
cd apps/api && npx tsc --noEmit    # Check API
cd apps/web && npx tsc --noEmit    # Check web
```

---

## Common Issues & Quick Fixes

### Issue: Missing Bull Package
```bash
cd apps/api
pnpm add bull @types/bull
```

### Issue: Prisma Client Not Found
```bash
cd apps/api
pnpm prisma generate
```

### Issue: Workspace Dependencies Not Found
```bash
pnpm run build:packages
```

### Issue: Lockfile Out of Sync
```bash
pnpm install --no-frozen-lockfile
```

### Issue: TypeScript Errors
```bash
rm -rf apps/*/tsconfig.tsbuildinfo packages/*/tsconfig.tsbuildinfo
pnpm type-check
```

### Issue: Out of Memory
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm build
```

### Issue: Stale Cache
```bash
pnpm store prune
pnpm clean
pnpm install
```

---

## Critical Missing Dependencies

### API Workspace
- **bull** - Queue system (REQUIRED)
  ```bash
  cd apps/api
  pnpm add bull @types/bull
  ```

---

## Version Conflicts to Fix

### TypeScript
```bash
pnpm update typescript@^5.7.2 -r
```

### React (if updating mobile)
```bash
cd apps/mobile
pnpm add react@18.3.1 react-dom@18.3.1
```

### Zustand (sync versions)
```bash
cd apps/mobile
pnpm add zustand@^5.0.8
```

---

## Pre-Deployment Quick Check

```bash
# 1. Verify dependencies
bash scripts/verify-deps.sh

# 2. Run tests
pnpm test

# 3. Check types
pnpm type-check

# 4. Build everything
pnpm build

# 5. Security audit
pnpm audit --audit-level=high
```

---

## Workspace Commands

```bash
# Run in all workspaces
pnpm -r <command>

# Run in specific workspace
pnpm --filter <workspace> <command>

# Examples:
pnpm --filter @citadelbuy/web dev
pnpm --filter @citadelbuy/api test
```

---

## Emergency Reset

```bash
# Nuclear option - complete reset
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
pnpm build
```

---

## Links to Full Documentation

- **Installation Guide:** `docs/DEPENDENCY_INSTALLATION.md`
- **Analysis Report:** `docs/DEPENDENCY_ANALYSIS.md`
- **Build Report:** `docs/BUILD_VERIFICATION_REPORT.md`
- **Deployment Checklist:** `docs/PRE_DEPLOYMENT_DEPENDENCY_CHECKLIST.md`
- **Verification Script:** `scripts/verify-deps.sh`

---

## Support

If issues persist after trying quick fixes:
1. Check full documentation
2. Run verification script with `--fix` flag
3. Review generated report
4. Create GitHub issue with report attached
