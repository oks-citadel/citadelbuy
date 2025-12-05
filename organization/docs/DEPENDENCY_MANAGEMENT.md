# Dependency Management Guide

This guide covers best practices for managing dependencies in the CitadelBuy platform, including checking for vulnerabilities, updating packages safely, and handling security updates.

## Table of Contents

- [Overview](#overview)
- [Checking for Vulnerabilities](#checking-for-vulnerabilities)
- [Updating Dependencies](#updating-dependencies)
- [Security Update Procedures](#security-update-procedures)
- [Testing Requirements](#testing-requirements)
- [Automated Dependency Updates](#automated-dependency-updates)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

CitadelBuy uses [pnpm](https://pnpm.io/) as the package manager for its monorepo structure. The platform consists of multiple workspaces:

- **Root workspace**: Build tools, CI/CD tools, and shared development dependencies
- **apps/api**: NestJS backend API
- **apps/web**: Next.js frontend application
- **packages/***: Shared packages (if any)

## Checking for Vulnerabilities

### Manual Vulnerability Checks

#### Check all workspaces
```bash
# From root directory
pnpm audit
```

#### Check specific workspace
```bash
# API vulnerabilities
cd apps/api
pnpm audit

# Web vulnerabilities
cd apps/web
pnpm audit
```

#### Check with different severity levels
```bash
# Only show high and critical vulnerabilities
pnpm audit --audit-level=high

# Only show critical vulnerabilities
pnpm audit --audit-level=critical

# Show all vulnerabilities (including low and moderate)
pnpm audit --audit-level=low
```

### Using the Check Script

We provide a convenience script that checks dependencies across all workspaces:

```bash
# From root directory
pnpm deps:check
```

This script will:
1. Check for security vulnerabilities
2. List outdated packages
3. Generate a summary report

### Automated Vulnerability Scanning

Our CI/CD pipeline automatically scans for vulnerabilities on:
- Every push to `main`, `master`, or `develop` branches
- Every pull request
- Daily at 2 AM UTC (scheduled scan)

The security scanning workflow checks:
- Dependency vulnerabilities (pnpm audit)
- Secret scanning (Gitleaks)
- Static analysis (CodeQL)
- Docker image vulnerabilities (Trivy)
- License compliance

## Updating Dependencies

### Checking for Outdated Packages

```bash
# Check all workspaces
pnpm outdated

# Check specific workspace
cd apps/api
pnpm outdated
```

### Safe Update Strategy

#### 1. Patch Updates (Recommended)
Patch updates (e.g., 1.0.1 → 1.0.2) are generally safe and include bug fixes:

```bash
# Update patch versions only
pnpm update --patch
```

#### 2. Minor Updates (Use with Caution)
Minor updates (e.g., 1.0.0 → 1.1.0) may include new features:

```bash
# Update minor versions
pnpm update --minor
```

#### 3. Major Updates (Requires Testing)
Major updates (e.g., 1.0.0 → 2.0.0) may include breaking changes:

```bash
# Update to latest versions (including major)
pnpm update --latest

# Update specific package to latest
pnpm update <package-name> --latest
```

### Updating Specific Dependencies

#### Update a single package
```bash
pnpm update <package-name>
```

#### Update a single package to a specific version
```bash
pnpm add <package-name>@<version>
```

#### Update all dependencies in a workspace
```bash
cd apps/api  # or apps/web
pnpm update
```

### Framework-Specific Updates

#### NestJS Updates
```bash
cd apps/api
pnpm update @nestjs/common @nestjs/core @nestjs/platform-express
```

#### Next.js Updates
```bash
cd apps/web
pnpm update next react react-dom
```

#### Prisma Updates
```bash
cd apps/api
pnpm update prisma @prisma/client
pnpm prisma generate
```

## Security Update Procedures

### Critical Security Vulnerability Response

When a critical vulnerability is discovered:

#### 1. Assess the Impact
```bash
# Get detailed vulnerability information
pnpm audit --json > audit-report.json
```

Review the report to understand:
- Severity level
- Affected packages
- Available patches
- Exploitation risk

#### 2. Apply Security Patches

```bash
# Automatically fix vulnerabilities where possible
pnpm audit --fix

# For high/critical issues that can't be auto-fixed
pnpm update <vulnerable-package> --latest
```

#### 3. Test the Application

After applying patches, run the full test suite:

```bash
# From root
pnpm test

# Run E2E tests
pnpm test:e2e

# Run API tests
pnpm test:api

# Run web tests
pnpm test:web
```

#### 4. Deploy the Patch

```bash
# Create a hotfix branch
git checkout -b hotfix/security-patch-YYYY-MM-DD

# Commit changes
git add .
git commit -m "security: patch critical vulnerability in <package-name>"

# Push and create PR
git push origin hotfix/security-patch-YYYY-MM-DD
```

### Non-Critical Security Updates

For moderate or low severity vulnerabilities:

1. Create an issue in your issue tracker
2. Schedule the update for the next sprint
3. Follow the standard update procedure
4. Include in regular release cycle

## Testing Requirements

### Before Updating Dependencies

Always test thoroughly before merging dependency updates:

#### 1. Unit Tests
```bash
pnpm test
```

#### 2. E2E Tests
```bash
pnpm test:e2e
```

#### 3. Type Checking
```bash
pnpm type-check
```

#### 4. Linting
```bash
pnpm lint
```

#### 5. Build Verification
```bash
pnpm build
```

#### 6. Manual Testing Checklist

- [ ] User authentication flow works
- [ ] Product browsing and search works
- [ ] Cart functionality works
- [ ] Checkout process works
- [ ] Admin dashboard accessible
- [ ] API endpoints respond correctly
- [ ] WebSocket connections stable
- [ ] Email notifications sent

### Testing Matrix

| Update Type | Required Tests | Manual Testing |
|-------------|----------------|----------------|
| Patch | Unit tests | Optional |
| Minor | Unit + E2E tests | Recommended |
| Major | All tests | Required |
| Security | All tests | Required |

## Automated Dependency Updates

### Dependabot Configuration

Dependabot is configured to automatically create PRs for dependency updates:

- **Schedule**: Weekly on Monday at 09:00 UTC
- **Target Branch**: `develop`
- **PR Limit**: 10 per ecosystem
- **Grouping**: Related packages are grouped together

#### Dependabot Update Categories

1. **Root Dependencies**: Build tools, linters, formatters
2. **API Dependencies**: NestJS, Prisma, backend libraries
3. **Web Dependencies**: Next.js, React, frontend libraries
4. **Docker Images**: Base images and build containers
5. **GitHub Actions**: CI/CD workflow dependencies

### Reviewing Dependabot PRs

When reviewing a Dependabot PR:

1. Check the changelog of the updated package
2. Review breaking changes (if any)
3. Wait for CI checks to pass
4. Review security scan results
5. Approve and merge if all checks pass

### Auto-merge Rules

PRs with the `automerge` label will be automatically merged if:
- All CI checks pass
- No conflicts exist
- Security scans pass
- Tests pass

## Best Practices

### 1. Regular Updates

- Update dependencies at least monthly
- Prioritize security updates
- Keep major frameworks up to date

### 2. Use Lock Files

- Always commit `pnpm-lock.yaml`
- Never manually edit lock files
- Use `pnpm install --frozen-lockfile` in CI

### 3. Version Pinning

```json
{
  "dependencies": {
    "exact-version": "1.2.3",        // Exact version
    "caret": "^1.2.3",                // Compatible (recommended)
    "tilde": "~1.2.3",                // Patch updates only
    "range": ">=1.2.3 <2.0.0",       // Version range
    "latest": "*"                     // Not recommended
  }
}
```

### 4. Dependency Overrides

Use pnpm overrides for:
- Fixing transitive dependency vulnerabilities
- Enforcing consistent versions across workspaces

```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "^1.2.3",
      "@types/react": "^18.3.12"
    }
  }
}
```

### 5. Workspace Protocol

For internal packages, use workspace protocol:

```json
{
  "dependencies": {
    "@citadelbuy/shared": "workspace:*"
  }
}
```

## Troubleshooting

### Peer Dependency Conflicts

```bash
# Install with legacy peer deps
pnpm install --legacy-peer-deps

# Or add to .npmrc
legacy-peer-deps=true
```

### Lock File Conflicts

```bash
# Regenerate lock file
rm pnpm-lock.yaml
pnpm install
```

### Audit Fix Failures

```bash
# Force update breaking changes
pnpm update <package> --latest

# Override transitive dependencies
# Add to package.json:
{
  "pnpm": {
    "overrides": {
      "transitive-package": "^x.x.x"
    }
  }
}
```

### Build Failures After Updates

```bash
# Clear all caches
pnpm clean
rm -rf node_modules
rm pnpm-lock.yaml

# Reinstall
pnpm install

# Regenerate Prisma client (if applicable)
cd apps/api
pnpm prisma generate
```

### Type Errors After Updates

```bash
# Ensure TypeScript version is compatible
pnpm update typescript

# Check for @types packages
pnpm add -D @types/<package-name>

# Verify tsconfig.json settings
pnpm type-check
```

## Additional Resources

- [pnpm Documentation](https://pnpm.io/)
- [npm Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [GitHub Advisory Database](https://github.com/advisories)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

## Support

For questions or issues related to dependency management:

1. Check this documentation
2. Search existing issues in the repository
3. Contact the DevOps team
4. Create a new issue with the `dependencies` label

## Version History

- **1.0.0** (2025-12-03): Initial documentation
