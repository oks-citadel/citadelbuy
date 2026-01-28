#!/bin/bash
# ==========================================
# Master Guardrail Runner
# Runs all guardrail checks before build
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "================================================"
echo "Running Broxiva Build Guardrails"
echo "================================================"
echo ""

FAILED=0

# 1. Check for large files
echo "[1/4] Checking for large files..."
if bash "$SCRIPT_DIR/check-large-files.sh"; then
    echo "Large files check passed."
else
    echo "Large files check failed."
    FAILED=$((FAILED + 1))
fi
echo ""

# 2. Validate .dockerignore
echo "[2/4] Validating .dockerignore..."
if bash "$SCRIPT_DIR/validate-dockerignore.sh" ".dockerignore"; then
    echo ".dockerignore validation passed."
else
    echo ".dockerignore validation failed."
    FAILED=$((FAILED + 1))
fi
echo ""

# 3. Lint Dockerfiles
echo "[3/4] Linting Dockerfiles..."
if bash "$SCRIPT_DIR/lint-dockerfiles.sh"; then
    echo "Dockerfile linting passed."
else
    echo "Dockerfile linting failed."
    FAILED=$((FAILED + 1))
fi
echo ""

# 4. Check assets/large directory
echo "[4/4] Checking assets/large directory..."
if [ -d "assets/large" ]; then
    LARGE_ASSETS=$(find assets/large -type f -not -name ".gitkeep" -not -name "README.md" 2>/dev/null | wc -l)
    if [ "$LARGE_ASSETS" -gt 0 ]; then
        echo "ERROR: assets/large should be empty in the repository"
        echo "Found $LARGE_ASSETS file(s) that should be in Azure Blob Storage"
        find assets/large -type f -not -name ".gitkeep" -not -name "README.md" 2>/dev/null
        FAILED=$((FAILED + 1))
    else
        echo "assets/large directory is clean."
    fi
else
    echo "assets/large directory not found (creating structure recommended)"
fi
echo ""

# Summary
echo "================================================"
echo "Guardrail Results"
echo "================================================"
if [ $FAILED -eq 0 ]; then
    echo "All guardrails passed! Ready for build."
    exit 0
else
    echo "FAILED: $FAILED guardrail(s) did not pass."
    echo ""
    echo "Please fix the issues above before proceeding with the build."
    echo "See: docs/ASSET_RUNTIME_STRATEGY.md for guidance on large files."
    exit 1
fi
