#!/bin/bash
# Terraform Governance Enforcement Script
# This script validates Terraform configurations against organizational policies
# Exit codes: 0 = pass, 1 = fail

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_ROOT="${SCRIPT_DIR}/.."
ERRORS=0

echo "====================================================="
echo "   Terraform Governance Enforcement"
echo "   Broxiva E-Commerce Platform"
echo "====================================================="
echo ""

# Function to log success
pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

# Function to log failure
fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ERRORS=$((ERRORS + 1))
}

# Function to log warning
warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check 1: Terraform version file exists
echo "Check 1: Terraform version pinning"
if [ -f "${TF_ROOT}/.terraform-version" ]; then
    TF_VERSION=$(cat "${TF_ROOT}/.terraform-version")
    pass "Terraform version pinned to ${TF_VERSION}"
else
    fail "Missing .terraform-version file"
fi

# Check 2: Provider lock files exist in environments
echo ""
echo "Check 2: Provider lock files"
for env_dir in "${TF_ROOT}/environments"/*; do
    if [ -d "$env_dir" ] && [ -f "$env_dir/main.tf" ]; then
        env_name=$(basename "$env_dir")
        if [ -f "$env_dir/.terraform.lock.hcl" ]; then
            pass "Lock file exists: environments/${env_name}"
        else
            warn "Missing lock file: environments/${env_name} (run terraform init)"
        fi
    fi
done

# Check 3: Format compliance
echo ""
echo "Check 3: Terraform format compliance"
if terraform fmt -check -recursive "${TF_ROOT}" > /dev/null 2>&1; then
    pass "All Terraform files are properly formatted"
else
    fail "Format violations found. Run 'terraform fmt -recursive' to fix"
fi

# Check 4: Backend configuration (remote state)
echo ""
echo "Check 4: Remote state backend configuration"
for env_dir in "${TF_ROOT}/environments"/*; do
    if [ -d "$env_dir" ] && [ -f "$env_dir/main.tf" ]; then
        env_name=$(basename "$env_dir")
        if grep -q 'backend "s3"\|backend "azurerm"\|backend "gcs"' "$env_dir/main.tf" 2>/dev/null; then
            pass "Remote backend configured: environments/${env_name}"
        else
            fail "No remote backend: environments/${env_name}"
        fi
    fi
done

# Check 5: Sensitive output marking
echo ""
echo "Check 5: Sensitive output marking"
SENSITIVE_KEYWORDS="password|secret|key|token|credential|connection_string"
for output_file in $(find "${TF_ROOT}" -name "outputs*.tf" -type f); do
    relative_path="${output_file#$TF_ROOT/}"
    while IFS= read -r line; do
        if echo "$line" | grep -qiE "output.*($SENSITIVE_KEYWORDS)"; then
            # Get the output block and check for sensitive = true
            OUTPUT_NAME=$(echo "$line" | grep -oE '"[^"]*"' | head -1)
            if ! awk "/output ${OUTPUT_NAME}/,/^}/" "$output_file" | grep -q "sensitive.*=.*true"; then
                warn "Output ${OUTPUT_NAME} in ${relative_path} may need sensitive = true"
            fi
        fi
    done < "$output_file"
done
pass "Sensitive output check completed (warnings above may need review)"

# Check 6: Module source pinning
echo ""
echo "Check 6: Module version pinning"
UNPINNED=0
while IFS= read -r line; do
    if echo "$line" | grep -qE 'source\s*=.*terraform-aws-modules|source\s*=.*Azure'; then
        FILE=$(echo "$line" | cut -d: -f1)
        if ! grep -A5 "$line" | grep -q 'version\s*='; then
            warn "Unpinned registry module in $FILE"
            UNPINNED=$((UNPINNED + 1))
        fi
    fi
done < <(grep -rn 'source.*=' "${TF_ROOT}" --include="*.tf" 2>/dev/null)
if [ $UNPINNED -eq 0 ]; then
    pass "All registry modules have version constraints"
fi

# Check 7: Required providers block
echo ""
echo "Check 7: Required providers validation"
for tf_file in $(find "${TF_ROOT}" -name "main.tf" -type f); do
    relative_path="${tf_file#$TF_ROOT/}"
    if grep -q "required_providers" "$tf_file"; then
        pass "Required providers defined: ${relative_path}"
    fi
done

# Check 8: Variable validation blocks
echo ""
echo "Check 8: Variable validation coverage"
VAR_COUNT=$(grep -r "^variable" "${TF_ROOT}" --include="*.tf" 2>/dev/null | wc -l)
VAL_COUNT=$(grep -r "validation {" "${TF_ROOT}" --include="*.tf" 2>/dev/null | wc -l)
echo "    Variables: ${VAR_COUNT}, Validations: ${VAL_COUNT}"
COVERAGE=$(echo "scale=0; ${VAL_COUNT} * 100 / ${VAR_COUNT}" | bc 2>/dev/null || echo "0")
if [ "$COVERAGE" -ge 10 ]; then
    pass "Validation coverage: ${COVERAGE}%"
else
    warn "Low validation coverage: ${COVERAGE}%"
fi

# Check 9: Security scan for hardcoded secrets
echo ""
echo "Check 9: Hardcoded secrets scan"
SECRET_PATTERN="(password|secret|api_key|access_key)\s*=\s*\"[^\"]+\""
FOUND_SECRETS=$(grep -rniE "$SECRET_PATTERN" "${TF_ROOT}" --include="*.tf" 2>/dev/null | grep -v "var\." | grep -v "local\." | head -5 || true)
if [ -z "$FOUND_SECRETS" ]; then
    pass "No hardcoded secrets detected"
else
    fail "Potential hardcoded secrets found:"
    echo "$FOUND_SECRETS"
fi

# Summary
echo ""
echo "====================================================="
echo "   Governance Check Summary"
echo "====================================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All governance checks passed!${NC}"
    exit 0
else
    echo -e "${RED}${ERRORS} governance check(s) failed${NC}"
    exit 1
fi
