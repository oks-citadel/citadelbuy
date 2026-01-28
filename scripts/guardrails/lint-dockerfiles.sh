#!/bin/bash
# ==========================================
# Guardrail: Dockerfile Linting
# Checks for unsafe patterns in Dockerfiles
# ==========================================

set -e

echo "Linting Dockerfiles for unsafe patterns..."

# Find all Dockerfiles
DOCKERFILES=$(find . -name "Dockerfile*" -type f -not -path "./.git/*" -not -path "./node_modules/*")

if [ -z "$DOCKERFILES" ]; then
    echo "No Dockerfiles found."
    exit 0
fi

ERRORS=0

# Patterns that indicate unsafe large file handling
UNSAFE_PATTERNS=(
    "sed.*assets"
    "sed.*models"
    "sed.*data"
    "sed.*datasets"
    "iconv.*assets"
    "iconv.*models"
    "iconv.*data"
    "dos2unix.*assets"
    "dos2unix.*models"
    "COPY.*assets/large"
    "ADD.*assets/large"
)

# Recommended patterns that should be present
RECOMMENDED_PATTERNS=(
    "LANG=C.UTF-8"
    "LC_ALL=C.UTF-8"
    "HEALTHCHECK"
    "USER"
)

# Check each Dockerfile
for dockerfile in $DOCKERFILES; do
    echo ""
    echo "Checking: $dockerfile"
    DOCKERFILE_ERRORS=0

    # Check for unsafe patterns
    for pattern in "${UNSAFE_PATTERNS[@]}"; do
        if grep -qE "$pattern" "$dockerfile" 2>/dev/null; then
            echo "  ERROR: Unsafe pattern found: $pattern"
            echo "         Large files should not be transformed in Dockerfile"
            DOCKERFILE_ERRORS=$((DOCKERFILE_ERRORS + 1))
            ERRORS=$((ERRORS + 1))
        fi
    done

    # Check for recommended patterns (warnings only)
    for pattern in "${RECOMMENDED_PATTERNS[@]}"; do
        if ! grep -q "$pattern" "$dockerfile" 2>/dev/null; then
            echo "  WARNING: Missing recommended pattern: $pattern"
        fi
    done

    # Check for Alpine with potential encoding issues
    if grep -q "FROM.*alpine" "$dockerfile" 2>/dev/null; then
        if ! grep -q "LC_ALL=C.UTF-8" "$dockerfile" 2>/dev/null; then
            echo "  WARNING: Alpine image without UTF-8 locale set"
        fi
    fi

    # Check for missing multi-stage build (for Node.js apps)
    if grep -q "node:" "$dockerfile" 2>/dev/null; then
        STAGES=$(grep -c "^FROM" "$dockerfile" 2>/dev/null || echo "1")
        if [ "$STAGES" -lt 2 ]; then
            echo "  WARNING: Node.js Dockerfile without multi-stage build"
        fi
    fi

    # Check for running as root
    if ! grep -q "USER" "$dockerfile" 2>/dev/null; then
        echo "  WARNING: No USER instruction - container may run as root"
    fi

    if [ $DOCKERFILE_ERRORS -eq 0 ]; then
        echo "  Passed."
    fi
done

echo ""
echo "================================================"
if [ $ERRORS -gt 0 ]; then
    echo "FAILED: $ERRORS error(s) found in Dockerfiles"
    exit 1
else
    echo "All Dockerfiles passed linting."
fi
