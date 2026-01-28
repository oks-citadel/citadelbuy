#!/bin/bash
# ==========================================
# Guardrail: Large File Detection
# Fails CI if large files are tracked in git
# ==========================================

set -e

# Configuration
MAX_FILE_SIZE_MB="${MAX_FILE_SIZE_MB:-50}"
MAX_FILE_SIZE_BYTES=$((MAX_FILE_SIZE_MB * 1024 * 1024))

# Allowlisted paths (relative to repo root)
ALLOWLIST=(
    ".git"
    "node_modules"
    ".pnpm-store"
    "*.lock"
    "pnpm-lock.yaml"
    "package-lock.json"
)

echo "Checking for large files (> ${MAX_FILE_SIZE_MB}MB)..."

# Build find exclude arguments
FIND_EXCLUDES=""
for path in "${ALLOWLIST[@]}"; do
    FIND_EXCLUDES="$FIND_EXCLUDES -not -path './$path/*' -not -path '*/$path/*' -not -name '$path'"
done

# Find large files
LARGE_FILES=$(find . -type f -size +${MAX_FILE_SIZE_BYTES}c $FIND_EXCLUDES 2>/dev/null || true)

if [ -n "$LARGE_FILES" ]; then
    echo ""
    echo "ERROR: Large files detected (> ${MAX_FILE_SIZE_MB}MB):"
    echo "================================================"
    echo "$LARGE_FILES" | while read -r file; do
        SIZE=$(ls -lh "$file" 2>/dev/null | awk '{print $5}')
        echo "  $file ($SIZE)"
    done
    echo ""
    echo "These files should be:"
    echo "  1. Stored in Azure Blob Storage (recommended)"
    echo "  2. Tracked with Git LFS"
    echo "  3. Added to .gitignore"
    echo ""
    echo "See: docs/ASSET_RUNTIME_STRATEGY.md"
    exit 1
fi

echo "No large files detected. Check passed."
