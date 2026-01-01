#!/bin/bash
# =========================================================================
# Broxiva Security Check Script
# =========================================================================
# Purpose: Check if .env files have been committed to git history
# Usage: ./scripts/check-env-security.sh
# =========================================================================

set -e

echo "=========================================="
echo "Broxiva .env Security Check"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Not in a git repository${NC}"
    exit 1
fi

echo "1. Checking for .env files in git history..."
echo ""

# Check for .env files in history
ENV_COMMITS=$(git log --all --full-history --pretty=format:"%H" -- ".env" "**/.env" ".env.*" "**/.env.*" 2>/dev/null | wc -l)

if [ "$ENV_COMMITS" -gt 0 ]; then
    echo -e "${RED}WARNING: Found $ENV_COMMITS commit(s) containing .env files!${NC}"
    echo ""
    echo "Commits that touched .env files:"
    git log --all --full-history --pretty=format:"%h | %ai | %an | %s" -- ".env" "**/.env" ".env.*" "**/.env.*" | head -20
    echo ""
    echo -e "${RED}ACTION REQUIRED: Credentials may be exposed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Read: docs/SECURITY_INCIDENT_RESPONSE_SUMMARY.md"
    echo "2. Rotate ALL credentials: docs/CREDENTIAL_ROTATION_CHECKLIST.md"
    echo "3. Remove from history: docs/SECURITY_ENV_REMOVAL.md"
    echo ""
    HISTORY_ISSUE=true
else
    echo -e "${GREEN}✓ No .env files found in git history${NC}"
    echo ""
    HISTORY_ISSUE=false
fi

echo "2. Checking current .gitignore configuration..."
echo ""

# Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo -e "${RED}ERROR: .gitignore file not found!${NC}"
    exit 1
fi

# Check if .env is ignored
if git check-ignore -q .env; then
    echo -e "${GREEN}✓ .env is properly ignored by .gitignore${NC}"
else
    echo -e "${RED}WARNING: .env is NOT in .gitignore!${NC}"
    echo "Add these lines to .gitignore:"
    echo "  .env"
    echo "  .env.*"
    echo "  !.env.example"
fi

# Check if .env files exist in working directory
echo ""
echo "3. Checking for .env files in working directory..."
echo ""

ENV_FILES=$(find . -type f -name ".env" -o -name ".env.local" -o -name ".env.production" -o -name ".env.staging" 2>/dev/null | grep -v node_modules || true)

if [ -n "$ENV_FILES" ]; then
    echo -e "${YELLOW}Found .env files in working directory:${NC}"
    echo "$ENV_FILES"
    echo ""
    echo "These files should be in .gitignore (they likely are)"
else
    echo -e "${GREEN}✓ No .env files in working directory${NC}"
fi

echo ""
echo "4. Checking git status..."
echo ""

# Check if any .env files are staged
STAGED_ENV=$(git diff --cached --name-only | grep -E "\.env$|\.env\." || true)

if [ -n "$STAGED_ENV" ]; then
    echo -e "${RED}ERROR: .env files are staged for commit!${NC}"
    echo "Staged files:"
    echo "$STAGED_ENV"
    echo ""
    echo "Remove from staging:"
    echo "  git reset HEAD .env"
    exit 1
else
    echo -e "${GREEN}✓ No .env files staged for commit${NC}"
fi

echo ""
echo "5. Searching for potential secrets in recent commits..."
echo ""

# Search for common secret patterns in recent commits
SECRET_PATTERNS=("DATABASE_URL" "JWT_SECRET" "STRIPE_SECRET" "AWS_ACCESS_KEY" "PRIVATE_KEY")
SECRETS_FOUND=false

for pattern in "${SECRET_PATTERNS[@]}"; do
    COMMITS=$(git log --all -S "$pattern" --pretty=format:"%h" --since="1 month ago" 2>/dev/null | wc -l)
    if [ "$COMMITS" -gt 0 ]; then
        echo -e "${YELLOW}Found $COMMITS commit(s) mentioning $pattern in the last month${NC}"
        SECRETS_FOUND=true
    fi
done

if [ "$SECRETS_FOUND" = false ]; then
    echo -e "${GREEN}✓ No obvious secret patterns found in recent commits${NC}"
fi

echo ""
echo "=========================================="
echo "Security Check Summary"
echo "=========================================="
echo ""

if [ "$HISTORY_ISSUE" = true ]; then
    echo -e "${RED}STATUS: CRITICAL SECURITY ISSUE DETECTED${NC}"
    echo ""
    echo "IMMEDIATE ACTIONS REQUIRED:"
    echo "1. Review: docs/SECURITY_INCIDENT_RESPONSE_SUMMARY.md"
    echo "2. Rotate credentials: docs/CREDENTIAL_ROTATION_CHECKLIST.md"
    echo "3. Clean history: docs/SECURITY_ENV_REMOVAL.md"
    echo ""
    exit 1
else
    echo -e "${GREEN}STATUS: No .env files in git history${NC}"
    echo ""
    echo "Recommended preventative measures:"
    echo "1. Update .gitignore: cp .gitignore.enhanced .gitignore"
    echo "2. Install git hooks (see docs/SECURITY_ENV_REMOVAL.md)"
    echo "3. Set up secret scanning in CI/CD"
    echo "4. Use .env.production.template for production"
    echo ""
    exit 0
fi
