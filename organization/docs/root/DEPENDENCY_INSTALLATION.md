# Dependency Installation Guide

Complete guide for installing and managing dependencies in the Broxiva platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Installation](#step-by-step-installation)
- [Workspace Structure](#workspace-structure)
- [Common Issues and Fixes](#common-issues-and-fixes)
- [Updating Dependencies](#updating-dependencies)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended Version | Check Command |
|----------|----------------|---------------------|---------------|
| Node.js  | 20.0.0         | 20.x.x (LTS)       | `node --version` |
| pnpm     | 10.0.0         | 10.23.0+           | `pnpm --version` |
| Git      | 2.x            | Latest             | `git --version` |

### Installing Prerequisites

#### Install Node.js

**Windows:**
```bash
# Using winget
winget install OpenJS.NodeJS.LTS

# Or download from https://nodejs.org/
```

**macOS:**
```bash
# Using Homebrew
brew install node@20
```

**Linux:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### Install pnpm

```bash
# Using npm (after Node.js is installed)
npm install -g pnpm@10.23.0

# Or using corepack (built into Node.js 16.13+)
corepack enable
corepack prepare pnpm@10.23.0 --activate
```

### System Requirements

- **RAM:** Minimum 8GB (16GB recommended for development)
- **Disk Space:** At least 5GB free
- **OS:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

---

## Quick Start

For experienced developers who want to get started immediately:

```bash
# Clone the repository
git clone <repository-url>
cd broxiva-master/organization

# Install all dependencies
pnpm install

# Verify installation
pnpm run deps:check

# Build all packages
pnpm build

# Start development
pnpm dev
```

---

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd broxiva-master/organization
```

### 2. Verify Prerequisites

```bash
# Check Node.js version (should be 20+)
node --version

# Check pnpm version (should be 10+)
pnpm --version

# If pnpm is not installed
npm install -g pnpm
```

### 3. Install Dependencies

```bash
# From the project root (organization/)
pnpm install
```

This command will:
- Install all root-level dependencies
- Install dependencies for all workspaces (apps/api, apps/web, apps/mobile, packages/*)
- Create/update the lockfile (pnpm-lock.yaml)
- Link workspace dependencies

**Expected Output:**
```
Scope: all 7 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved X, reused Y, downloaded 0, added Z
```

### 4. Verify Installation

Run the dependency verification script:

```bash
# Full verification (includes build check)
bash scripts/verify-deps.sh

# Quick verification (skip build)
bash scripts/verify-deps.sh --skip-build

# Fix issues automatically
bash scripts/verify-deps.sh --fix
```

### 5. Build All Packages

Packages must be built before apps can use them:

```bash
# Build all packages
pnpm run build:packages

# Or build everything
pnpm build
```

---

## Workspace Structure

The project uses pnpm workspaces for monorepo management:

```
organization/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js web application
│   └── mobile/       # React Native mobile app
├── packages/
│   ├── ai-sdk/       # AI SDK library
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   └── utils/        # Shared utilities
└── services/         # Microservices (if any)
```

### Workspace Dependencies

Internal workspace packages are referenced using `workspace:*` protocol:

```json
{
  "dependencies": {
    "@broxiva/types": "workspace:*",
    "@broxiva/utils": "workspace:*"
  }
}
```

---

## Common Issues and Fixes

### Issue 1: pnpm-lock.yaml Conflicts

**Problem:** Git merge conflicts in pnpm-lock.yaml

**Solution:**
```bash
# Accept your version or theirs
git checkout --ours pnpm-lock.yaml  # or --theirs

# Regenerate lockfile
rm pnpm-lock.yaml
pnpm install
```

### Issue 2: Node Version Mismatch

**Problem:** `Error: The engine "node" is incompatible with this module`

**Solution:**
```bash
# Check required version in package.json "engines" field
cat package.json | grep -A 2 "engines"

# Install correct version using nvm
nvm install 20
nvm use 20
```

### Issue 3: Missing Bull Queue Package

**Problem:** `Cannot find module 'bull'`

**Solution:**
```bash
cd apps/api
pnpm add bull @types/bull
```

### Issue 4: Peer Dependency Warnings

**Problem:** `WARN ... requires a peer of react@^18.0.0 but none is installed`

**Solution:**
```bash
# Install peer dependencies automatically
pnpm install --fix-peer-dependencies

# Or install manually
cd apps/web
pnpm add react@18.3.1 react-dom@18.3.1
```

### Issue 5: TypeScript Version Conflicts

**Problem:** Multiple TypeScript versions causing compilation errors

**Solution:**
The project uses pnpm overrides to ensure consistent versions:

```json
// In root package.json
{
  "pnpm": {
    "overrides": {
      "typescript": "^5.7.2",
      "@types/react": "^18.3.12",
      "@types/react-dom": "^18.3.1"
    }
  }
}
```

If issues persist:
```bash
# Clear node_modules and reinstall
pnpm clean
pnpm install
```

### Issue 6: Prisma Client Not Generated

**Problem:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
cd apps/api
pnpm prisma generate
```

### Issue 7: Build Fails with Memory Error

**Problem:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm build

# Or on Windows
set NODE_OPTIONS=--max-old-space-size=8192 && pnpm build
```

### Issue 8: EACCES Permission Errors (Linux/Mac)

**Problem:** Permission denied errors during installation

**Solution:**
```bash
# Fix npm global directory permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

---

## Updating Dependencies

### Check for Updates

```bash
# Check all outdated packages
pnpm outdated

# Check specific workspace
cd apps/api
pnpm outdated
```

### Update Strategies

#### Patch Updates (Bug Fixes)
Safe to apply, minimal risk:
```bash
pnpm update
```

#### Minor Updates (New Features)
Moderate risk, test thoroughly:
```bash
pnpm update --latest
```

#### Major Updates (Breaking Changes)
High risk, requires careful review:
```bash
# Update specific package
pnpm update --latest <package-name>

# Example
pnpm update --latest next
```

### Update Workflow

1. **Create a new branch:**
   ```bash
   git checkout -b deps/update-packages
   ```

2. **Update dependencies:**
   ```bash
   pnpm update --latest
   ```

3. **Verify updates:**
   ```bash
   # Run verification script
   bash scripts/verify-deps.sh

   # Run tests
   pnpm test

   # Run E2E tests
   pnpm test:e2e

   # Check TypeScript
   pnpm type-check

   # Build everything
   pnpm build
   ```

4. **Commit changes:**
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "chore: update dependencies"
   ```

5. **Create pull request and review changes**

### Updating Specific Workspaces

```bash
# Update API dependencies
cd apps/api
pnpm update

# Update Web dependencies
cd apps/web
pnpm update
```

---

## Security Best Practices

### Regular Security Audits

```bash
# Check for vulnerabilities
pnpm audit

# View detailed report
pnpm audit --json > audit-report.json

# Fix automatically (be cautious in production)
pnpm audit --fix
```

### Security Audit Levels

- **Low:** Minimal risk, can be addressed in regular updates
- **Moderate:** Should be addressed soon
- **High:** Address immediately, critical fix
- **Critical:** Emergency fix required

### Handling Vulnerabilities

1. **Check impact:**
   ```bash
   pnpm why <vulnerable-package>
   ```

2. **Look for updates:**
   ```bash
   pnpm update <vulnerable-package>
   ```

3. **Use overrides if needed:**
   ```json
   // In package.json
   {
     "pnpm": {
       "overrides": {
         "vulnerable-package": "^safe-version"
       }
     }
   }
   ```

4. **Document known issues:**
   - Add to SECURITY.md
   - Create tracking issue
   - Plan mitigation strategy

### Dependency Review Checklist

Before adding new dependencies:

- [ ] Check package popularity and maintenance
- [ ] Review package size (use bundlephobia.com)
- [ ] Check license compatibility
- [ ] Review security vulnerabilities
- [ ] Consider alternative packages
- [ ] Check bundle impact on build size

---

## Troubleshooting

### Clear Cache and Reinstall

```bash
# Clear pnpm cache
pnpm store prune

# Remove all node_modules
pnpm clean

# Reinstall everything
pnpm install
```

### Debug Installation Issues

```bash
# Verbose logging
pnpm install --loglevel debug

# Check what's installed
pnpm list --depth 0

# Check specific package
pnpm why <package-name>
```

### Network Issues

```bash
# Use different registry
pnpm config set registry https://registry.npmjs.org/

# Or use npm mirror (China)
pnpm config set registry https://registry.npmmirror.com/

# Check current registry
pnpm config get registry
```

### Windows-Specific Issues

#### Issue: Long Path Names

**Solution:** Enable long paths in Windows:
```bash
# Run as Administrator
git config --system core.longpaths true
```

#### Issue: Line Ending Problems

**Solution:**
```bash
# Configure Git to handle line endings
git config --global core.autocrlf input
```

### Reset to Clean State

```bash
# Complete reset
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
pnpm build
```

---

## Verification Checklist

Before committing or deploying, verify:

- [ ] `pnpm install` completes without errors
- [ ] `pnpm build` succeeds for all workspaces
- [ ] `pnpm test` passes all tests
- [ ] `pnpm type-check` has no TypeScript errors
- [ ] `pnpm audit` shows no critical vulnerabilities
- [ ] `pnpm outdated` is reviewed
- [ ] All workspace dependencies are properly linked
- [ ] Lockfile is committed and up to date

---

## Getting Help

### Resources

- **pnpm Documentation:** https://pnpm.io/
- **Node.js Documentation:** https://nodejs.org/docs/
- **Project Issues:** Create an issue in the repository

### Useful Commands Reference

```bash
# Installation
pnpm install                    # Install all dependencies
pnpm install <pkg>             # Add new dependency
pnpm add -D <pkg>              # Add dev dependency
pnpm remove <pkg>              # Remove dependency

# Workspace Management
pnpm -r <command>              # Run command in all workspaces
pnpm --filter <workspace> <cmd> # Run in specific workspace
pnpm -w add <pkg>              # Add to root workspace

# Information
pnpm list                      # List installed packages
pnpm why <pkg>                 # Why is package installed
pnpm outdated                  # Check for updates

# Maintenance
pnpm update                    # Update dependencies
pnpm audit                     # Security audit
pnpm store prune               # Clean cache

# Build & Dev
pnpm build                     # Build all packages
pnpm dev                       # Start development
pnpm test                      # Run tests
```

---

## Next Steps

After successful installation:

1. **Configure environment variables:** See `.env.example` files
2. **Setup database:** See `docs/DATABASE_SETUP.md`
3. **Start development:** See `docs/DEVELOPMENT.md`
4. **Run verification script:** `bash scripts/verify-deps.sh`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-04 | Initial documentation | System |

---

**Need Help?** If you encounter issues not covered in this guide, please:
1. Check existing GitHub issues
2. Run `bash scripts/verify-deps.sh` for automated diagnostics
3. Create a new issue with the verification report attached
