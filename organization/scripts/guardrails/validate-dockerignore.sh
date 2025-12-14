#!/bin/bash
# ==========================================
# Guardrail: .dockerignore Validation
# Ensures required exclusions are present
# ==========================================

set -e

DOCKERIGNORE_FILE="${1:-.dockerignore}"

echo "Validating .dockerignore: $DOCKERIGNORE_FILE"

if [ ! -f "$DOCKERIGNORE_FILE" ]; then
    echo "ERROR: .dockerignore file not found at $DOCKERIGNORE_FILE"
    exit 1
fi

# Required patterns that must be in .dockerignore
REQUIRED_PATTERNS=(
    "assets/large"
    "node_modules"
    "*.tfstate"
    "models/"
    "datasets/"
    "data/"
    ".git"
    "*.zip"
    "*.tar"
    "*.pkl"
    "*.h5"
    "*.pt"
    "*.onnx"
)

MISSING_PATTERNS=()

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$pattern" "$DOCKERIGNORE_FILE"; then
        MISSING_PATTERNS+=("$pattern")
    fi
done

if [ ${#MISSING_PATTERNS[@]} -gt 0 ]; then
    echo ""
    echo "ERROR: .dockerignore missing required patterns:"
    echo "================================================"
    for pattern in "${MISSING_PATTERNS[@]}"; do
        echo "  - $pattern"
    done
    echo ""
    echo "Add these patterns to .dockerignore to prevent large files"
    echo "from being included in the Docker build context."
    exit 1
fi

echo ".dockerignore validation passed. All required patterns present."
