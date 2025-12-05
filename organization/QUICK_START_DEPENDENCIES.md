# Quick Start: Dependency Management

Quick reference guide for managing dependencies in CitadelBuy.

## Daily Commands

### Check for Issues
```bash
# Run comprehensive dependency check
pnpm deps:check

# Check for vulnerabilities
pnpm audit

# Check for outdated packages
pnpm deps:outdated
```

### Update Dependencies
```bash
# Update patch versions (safest)
pnpm update --patch

# Update minor versions
pnpm update --minor

# Update specific package
pnpm update <package-name>

# Update to latest (including major versions)
pnpm update --latest
```

### Fix Vulnerabilities
```bash
# Automatically fix vulnerabilities
pnpm audit --fix

# Check specific severity
pnpm audit --audit-level=high
```

## Workflow Integration

### Automated Security Scanning
- **Runs on**: Push to main/master/develop, Pull Requests, Daily at 2 AM UTC
- **Checks**: Dependencies, Secrets, SAST, License Compliance
- **Location**: `.github/workflows/security-scan.yml`

### Dependabot Updates
- **Schedule**: Weekly on Monday 9 AM UTC
- **Target**: `develop` branch
- **Config**: `.github/dependabot.yml`
- **Auto-merge**: PRs with `automerge` label

## Quick Troubleshooting

### Installation Issues
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Regenerate Prisma client
cd apps/api && pnpm prisma generate
```

### Build Failures
```bash
# Run in order
pnpm clean
pnpm install
pnpm type-check
pnpm lint
pnpm build
```

### Audit Failures
```bash
# Generate detailed report
pnpm audit --json > audit-report.json

# Override problematic transitive deps
# Add to package.json:
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "^safe-version"
    }
  }
}
```

## File Locations

| Purpose | Location |
|---------|----------|
| Comprehensive Docs | `docs/DEPENDENCY_MANAGEMENT.md` |
| Check Script (Linux/Mac) | `scripts/check-deps.sh` |
| Check Script (Windows) | `scripts/check-deps.bat` |
| Security Workflow | `.github/workflows/security-scan.yml` |
| Dependabot Config | `.github/dependabot.yml` |
| Full Update Summary | `DEPENDENCY_SECURITY_UPDATES.md` |

## Need Help?

1. Read: `docs/DEPENDENCY_MANAGEMENT.md`
2. Run: `pnpm deps:check`
3. Check: GitHub Actions logs
4. Contact: DevOps team

## Critical Security Response

If high/critical vulnerability found:

1. **Assess**: Review audit report
2. **Fix**: `pnpm audit --fix` or `pnpm update <package>`
3. **Test**: `pnpm test && pnpm test:e2e`
4. **Deploy**: Create hotfix branch and PR
5. **Document**: Update incident log

## Before Every Release

```bash
# Pre-release checklist
pnpm deps:check         # Check dependencies
pnpm audit              # Check vulnerabilities
pnpm test               # Run all tests
pnpm test:e2e           # Run E2E tests
pnpm type-check         # Check types
pnpm build              # Verify build
```

---

**Last Updated:** 2025-12-03
**Version:** 1.0.0
