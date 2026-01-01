# Broxiva Scripts Directory

This directory contains utility scripts for building, deploying, and managing the Broxiva platform.

---

## Quick Reference

| Script | Purpose | Priority |
|--------|---------|----------|
| `verify-deps.sh` | Comprehensive dependency verification | ⭐ HIGH |
| `check-deps.sh` | Quick dependency check | MEDIUM |
| `build.sh` | Build all workspaces | HIGH |
| `deploy.sh` | Deploy to environment | HIGH |
| `setup.sh` | Initial setup | HIGH |

---

## Dependency Management Scripts

### `verify-deps.sh` ⭐ NEW - Comprehensive Verification

**Full dependency verification and build system check**

```bash
bash scripts/verify-deps.sh [options]
```

**Options:**
- `--fix` - Attempt to automatically fix issues
- `--skip-audit` - Skip security audit (faster)
- `--skip-build` - Skip build verification

**Features:**
- Validates all package.json files
- Checks for missing dependencies
- Verifies peer dependencies
- Identifies version conflicts
- Runs security audit
- Verifies TypeScript compilation
- Tests build process
- Generates comprehensive report

**Output:** `dependency-verification-report-[timestamp].txt`

**Example:**
```bash
# Full verification
bash scripts/verify-deps.sh

# Quick check (skip build)
bash scripts/verify-deps.sh --skip-build

# Auto-fix issues
bash scripts/verify-deps.sh --fix
```

---

### `check-deps.sh` / `check-deps.bat`

Quick dependency and security check across all workspaces.

**Usage:**
```bash
bash scripts/check-deps.sh
# or via pnpm:
pnpm deps:check
```

**Output:** `dependency-check-report.txt`

---

## Documentation

For detailed information, see:
- `docs/DEPENDENCY_INSTALLATION.md` - Complete installation guide
- `docs/DEPENDENCY_ANALYSIS.md` - Detailed dependency analysis
- `docs/BUILD_VERIFICATION_REPORT.md` - Build status and issues
- `docs/PRE_DEPLOYMENT_DEPENDENCY_CHECKLIST.md` - Deployment checklist
- `docs/DEPENDENCY_QUICK_REFERENCE.md` - Quick command reference
- `DEPENDENCY_VERIFICATION_SUMMARY.md` - Executive summary

---

## Script Requirements

All scripts require:
- **Node.js:** 20.0.0+
- **pnpm:** 10.0.0+
- **Bash:** 4.0+ (or Git Bash on Windows)

---

## Quick Command Reference

```bash
# Comprehensive verification
bash scripts/verify-deps.sh

# Quick dependency check
bash scripts/check-deps.sh

# Build all workspaces
bash scripts/build.sh

# Setup development environment
bash scripts/setup.sh

# Deploy to staging
bash scripts/deploy-staging.sh
```

---

**For complete script documentation, see the scripts themselves or the documentation in `docs/` directory.**

**Last Updated:** 2025-12-04
