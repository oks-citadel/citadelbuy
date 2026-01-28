#!/bin/bash

################################################################################
# Broxiva Secrets Validation Script
################################################################################
# This script validates that all required secrets are present and properly
# configured in Kubernetes and Azure Key Vault
#
# Usage:
#   ./validate-secrets.sh --namespace broxiva-production
#   ./validate-secrets.sh --namespace broxiva-production --check-keyvault --vault-name broxiva-production-kv
#   ./validate-secrets.sh --check-required
#
# Author: DevOps Team
# Last Updated: 2025-12-13
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/../logs/secret-validation-$(date +%Y%m%d-%H%M%S).log"
NAMESPACE="broxiva-production"
SECRET_NAME="broxiva-secrets"
CHECK_KEYVAULT=false
CHECK_REQUIRED=false
VAULT_NAME=""
STRICT_MODE=false

# Create logs directory
mkdir -p "${SCRIPT_DIR}/../logs"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

################################################################################
# Helper Functions
################################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() {
    log "INFO" "${BLUE}$*${NC}"
}

success() {
    log "SUCCESS" "${GREEN}✓ $*${NC}"
    ((PASSED_CHECKS++))
}

warn() {
    log "WARN" "${YELLOW}⚠ $*${NC}"
    ((WARNING_CHECKS++))
}

error() {
    log "ERROR" "${RED}✗ $*${NC}"
    ((FAILED_CHECKS++))
}

check() {
    local description="$1"
    ((TOTAL_CHECKS++))
    info "Checking: $description"
}

################################################################################
# Required Secrets Definition
################################################################################

# Critical secrets required for production deployment
REQUIRED_SECRETS=(
    # Authentication & Session (CRITICAL)
    "JWT_SECRET:auth:critical:min64"
    "JWT_REFRESH_SECRET:auth:critical:min64"
    "SESSION_SECRET:auth:critical:min64"

    # Encryption Keys (NEVER ROTATE)
    "ENCRYPTION_KEY:encryption:critical:exact64"
    "KYC_ENCRYPTION_KEY:encryption:critical:exact64"

    # Database (CRITICAL)
    "POSTGRES_PASSWORD:database:critical:min32"
    "DATABASE_URL:database:critical:min20"

    # Cache/Redis (MEDIUM)
    "REDIS_PASSWORD:cache:medium:min32"
    "REDIS_URL:cache:medium:min20"

    # Internal Services (HIGH)
    "INTERNAL_API_KEY:internal:high:min40"
)

# Optional secrets (warn if missing, but not critical)
OPTIONAL_SECRETS=(
    # Payment Providers
    "STRIPE_SECRET_KEY:payment:high"
    "STRIPE_WEBHOOK_SECRET:payment:high"
    "PAYPAL_CLIENT_ID:payment:medium"
    "PAYPAL_CLIENT_SECRET:payment:medium"

    # Email Service
    "SENDGRID_API_KEY:email:high"

    # AI Services
    "OPENAI_API_KEY:ai:low"

    # OAuth
    "GOOGLE_CLIENT_ID:oauth:low"
    "GOOGLE_CLIENT_SECRET:oauth:low"
    "FACEBOOK_APP_ID:oauth:low"
    "FACEBOOK_APP_SECRET:oauth:low"

    # Monitoring
    "SENTRY_DSN:monitoring:low"
    "DATADOG_API_KEY:monitoring:low"

    # Webhooks
    "WEBHOOK_SECRET:internal:medium"
)

################################################################################
# Validation Functions
################################################################################

validate_secret_length() {
    local secret_name="$1"
    local secret_value="$2"
    local requirement="$3"

    local length=${#secret_value}

    case "$requirement" in
        min16)
            if [ $length -lt 16 ]; then
                error "Secret '$secret_name' is too short: $length chars (minimum: 16)"
                return 1
            fi
            ;;
        min32)
            if [ $length -lt 32 ]; then
                error "Secret '$secret_name' is too short: $length chars (minimum: 32)"
                return 1
            fi
            ;;
        min40)
            if [ $length -lt 40 ]; then
                error "Secret '$secret_name' is too short: $length chars (minimum: 40)"
                return 1
            fi
            ;;
        min64)
            if [ $length -lt 64 ]; then
                error "Secret '$secret_name' is too short: $length chars (minimum: 64)"
                return 1
            fi
            ;;
        exact64)
            if [ $length -ne 64 ]; then
                error "Secret '$secret_name' has wrong length: $length chars (required: exactly 64)"
                return 1
            fi
            ;;
        min20)
            if [ $length -lt 20 ]; then
                error "Secret '$secret_name' is too short: $length chars (minimum: 20)"
                return 1
            fi
            ;;
    esac

    return 0
}

validate_secret_value() {
    local secret_name="$1"
    local secret_value="$2"

    # Check for placeholder values
    if [[ "$secret_value" =~ ^REPLACE ]]; then
        error "Secret '$secret_name' has placeholder value (starts with 'REPLACE')"
        return 1
    fi

    # Check for common test/example values
    local test_patterns=(
        "test"
        "example"
        "changeme"
        "password"
        "secret"
        "12345"
    )

    for pattern in "${test_patterns[@]}"; do
        if [[ "$secret_value" =~ $pattern ]]; then
            warn "Secret '$secret_name' may contain test value: contains '$pattern'"
        fi
    done

    # Check if value is empty
    if [ -z "$secret_value" ]; then
        error "Secret '$secret_name' is empty"
        return 1
    fi

    return 0
}

################################################################################
# Kubernetes Secret Validation
################################################################################

check_kubernetes_secret_exists() {
    local namespace="$1"
    local secret_name="$2"

    check "Kubernetes secret exists: $secret_name in namespace $namespace"

    if kubectl get secret "$secret_name" -n "$namespace" &>/dev/null; then
        success "Secret exists"
        return 0
    else
        error "Secret not found"
        return 1
    fi
}

check_kubernetes_secret_keys() {
    local namespace="$1"
    local secret_name="$2"
    local required_keys=("${!3}")

    info "Checking required keys in Kubernetes secret..."

    local missing_keys=()
    local found_keys=0

    for key_spec in "${required_keys[@]}"; do
        IFS=':' read -r key_name key_type key_priority key_requirement <<< "$key_spec"

        check "Secret key exists: $key_name ($key_priority priority)"

        # Check if key exists in secret
        if ! kubectl get secret "$secret_name" -n "$namespace" \
            -o jsonpath="{.data.$key_name}" &>/dev/null; then

            if [ "$key_priority" = "critical" ]; then
                error "Missing critical key: $key_name"
                missing_keys+=("$key_name")
            else
                warn "Missing optional key: $key_name (priority: $key_priority)"
            fi
        else
            # Get secret value (base64 decoded)
            local secret_value=$(kubectl get secret "$secret_name" -n "$namespace" \
                -o jsonpath="{.data.$key_name}" | base64 -d 2>/dev/null || echo "")

            # Validate value
            if validate_secret_value "$key_name" "$secret_value"; then
                # Validate length if requirement specified
                if [ -n "$key_requirement" ]; then
                    if validate_secret_length "$key_name" "$secret_value" "$key_requirement"; then
                        success "Key valid: $key_name"
                        ((found_keys++))
                    fi
                else
                    success "Key exists: $key_name"
                    ((found_keys++))
                fi
            fi
        fi
    done

    if [ ${#missing_keys[@]} -gt 0 ]; then
        error "Missing ${#missing_keys[@]} critical keys"
        return 1
    fi

    success "All required keys present ($found_keys keys validated)"
    return 0
}

################################################################################
# Key Vault Validation
################################################################################

check_keyvault_exists() {
    local vault_name="$1"

    check "Azure Key Vault exists: $vault_name"

    if az keyvault show --name "$vault_name" &>/dev/null; then
        success "Key Vault exists"
        return 0
    else
        error "Key Vault not found"
        return 1
    fi
}

check_keyvault_secrets() {
    local vault_name="$1"
    local required_keys=("${!2}")

    info "Checking secrets in Azure Key Vault..."

    local missing_keys=()
    local found_keys=0

    for key_spec in "${required_keys[@]}"; do
        IFS=':' read -r key_name key_type key_priority key_requirement <<< "$key_spec"

        # Convert environment variable name to Key Vault format
        local kv_key_name=$(echo "$key_name" | tr '[:upper:]' '[:lower:]' | tr '_' '-')

        check "Key Vault secret exists: $kv_key_name ($key_priority priority)"

        # Check if secret exists in Key Vault
        if ! az keyvault secret show \
            --vault-name "$vault_name" \
            --name "$kv_key_name" &>/dev/null; then

            if [ "$key_priority" = "critical" ]; then
                error "Missing critical secret: $kv_key_name"
                missing_keys+=("$kv_key_name")
            else
                warn "Missing optional secret: $kv_key_name (priority: $key_priority)"
            fi
        else
            # Get secret value
            local secret_value=$(az keyvault secret show \
                --vault-name "$vault_name" \
                --name "$kv_key_name" \
                --query "value" \
                -o tsv 2>/dev/null || echo "")

            # Validate value
            if validate_secret_value "$kv_key_name" "$secret_value"; then
                # Validate length if requirement specified
                if [ -n "$key_requirement" ]; then
                    if validate_secret_length "$kv_key_name" "$secret_value" "$key_requirement"; then
                        success "Secret valid: $kv_key_name"
                        ((found_keys++))
                    fi
                else
                    success "Secret exists: $kv_key_name"
                    ((found_keys++))
                fi
            fi

            # Check secret metadata
            local tags=$(az keyvault secret show \
                --vault-name "$vault_name" \
                --name "$kv_key_name" \
                --query "tags" \
                -o json 2>/dev/null || echo "{}")

            # Check rotation schedule tag
            if echo "$tags" | jq -e '.RotationSchedule' &>/dev/null; then
                local rotation_schedule=$(echo "$tags" | jq -r '.RotationSchedule')
                info "  Rotation schedule: $rotation_schedule"
            fi
        fi
    done

    if [ ${#missing_keys[@]} -gt 0 ]; then
        error "Missing ${#missing_keys[@]} critical secrets in Key Vault"
        return 1
    fi

    success "All required secrets present in Key Vault ($found_keys secrets validated)"
    return 0
}

################################################################################
# ExternalSecret Validation
################################################################################

check_externalsecrets() {
    local namespace="$1"

    check "ExternalSecret resources exist in namespace $namespace"

    local externalsecrets=$(kubectl get externalsecrets -n "$namespace" -o name 2>/dev/null || echo "")

    if [ -z "$externalsecrets" ]; then
        warn "No ExternalSecrets found in namespace"
        return 1
    fi

    local es_count=$(echo "$externalsecrets" | wc -l)
    success "Found $es_count ExternalSecret(s)"

    # Check status of each ExternalSecret
    info "Checking ExternalSecret sync status..."

    while IFS= read -r es; do
        local es_name=$(echo "$es" | cut -d'/' -f2)

        check "ExternalSecret status: $es_name"

        local status=$(kubectl get externalsecret "$es_name" -n "$namespace" \
            -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "Unknown")

        if [ "$status" = "True" ]; then
            success "ExternalSecret ready: $es_name"
        else
            error "ExternalSecret not ready: $es_name (status: $status)"

            # Get last sync error
            local error_msg=$(kubectl get externalsecret "$es_name" -n "$namespace" \
                -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}' 2>/dev/null || echo "")

            if [ -n "$error_msg" ]; then
                error "  Error: $error_msg"
            fi
        fi
    done <<< "$externalsecrets"

    return 0
}

################################################################################
# Summary and Reporting
################################################################################

print_summary() {
    echo ""
    echo "=================================================================="
    echo "                    VALIDATION SUMMARY"
    echo "=================================================================="
    echo ""
    printf "Total Checks:   %d\n" $TOTAL_CHECKS
    printf "${GREEN}Passed:         %d${NC}\n" $PASSED_CHECKS
    printf "${YELLOW}Warnings:       %d${NC}\n" $WARNING_CHECKS
    printf "${RED}Failed:         %d${NC}\n" $FAILED_CHECKS
    echo ""
    echo "=================================================================="
    echo ""

    if [ $FAILED_CHECKS -eq 0 ]; then
        success "All critical validations passed!"
        if [ $WARNING_CHECKS -gt 0 ]; then
            warn "There are $WARNING_CHECKS warning(s) - review recommended"
        fi
        return 0
    else
        error "Validation failed with $FAILED_CHECKS error(s)"
        return 1
    fi
}

################################################################################
# Main Validation
################################################################################

run_validation() {
    info "==================================================="
    info "Starting Broxiva Secrets Validation"
    info "Namespace: $NAMESPACE"
    info "Secret Name: $SECRET_NAME"
    info "==================================================="
    echo ""

    # Check Kubernetes secret
    if check_kubernetes_secret_exists "$NAMESPACE" "$SECRET_NAME"; then
        check_kubernetes_secret_keys "$NAMESPACE" "$SECRET_NAME" REQUIRED_SECRETS[@]

        # Check optional secrets if in strict mode
        if [ "$STRICT_MODE" = true ]; then
            check_kubernetes_secret_keys "$NAMESPACE" "$SECRET_NAME" OPTIONAL_SECRETS[@]
        fi
    fi

    echo ""

    # Check ExternalSecrets
    check_externalsecrets "$NAMESPACE"

    echo ""

    # Check Key Vault if requested
    if [ "$CHECK_KEYVAULT" = true ] && [ -n "$VAULT_NAME" ]; then
        if check_keyvault_exists "$VAULT_NAME"; then
            check_keyvault_secrets "$VAULT_NAME" REQUIRED_SECRETS[@]

            # Check optional secrets if in strict mode
            if [ "$STRICT_MODE" = true ]; then
                check_keyvault_secrets "$VAULT_NAME" OPTIONAL_SECRETS[@]
            fi
        fi
        echo ""
    fi

    # Print summary
    print_summary
}

check_required_only() {
    info "==================================================="
    info "Checking Required Secrets Only"
    info "==================================================="
    echo ""

    echo "The following secrets are REQUIRED for production deployment:"
    echo ""

    for key_spec in "${REQUIRED_SECRETS[@]}"; do
        IFS=':' read -r key_name key_type key_priority key_requirement <<< "$key_spec"
        printf "  %-30s Type: %-12s Priority: %-8s\n" "$key_name" "$key_type" "$key_priority"
    done

    echo ""
    echo "Total required secrets: ${#REQUIRED_SECRETS[@]}"
    echo ""
}

################################################################################
# Usage and Argument Parsing
################################################################################

usage() {
    cat << EOF
Broxiva Secrets Validation Script

Usage: $0 [OPTIONS]

Options:
    --namespace NAME           Kubernetes namespace (default: broxiva-production)
    --secret-name NAME         Kubernetes secret name (default: broxiva-secrets)
    --check-keyvault           Also validate secrets in Azure Key Vault
    --vault-name NAME          Azure Key Vault name (required with --check-keyvault)
    --check-required           List required secrets without validation
    --strict-mode              Also validate optional secrets
    --help                     Show this help message

Examples:
    # Validate Kubernetes secrets only
    $0 --namespace broxiva-production

    # Validate both Kubernetes and Key Vault
    $0 --namespace broxiva-production --check-keyvault --vault-name broxiva-production-kv

    # List required secrets
    $0 --check-required

    # Strict validation (including optional secrets)
    $0 --namespace broxiva-production --strict-mode

Exit Codes:
    0 - All validations passed
    1 - One or more validations failed

Notes:
    - Critical secrets must be present for production deployment
    - Optional secrets generate warnings if missing
    - Use --strict-mode to enforce validation of optional secrets
    - Validation results are logged to infrastructure/logs/

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --secret-name)
            SECRET_NAME="$2"
            shift 2
            ;;
        --check-keyvault)
            CHECK_KEYVAULT=true
            shift
            ;;
        --vault-name)
            VAULT_NAME="$2"
            shift 2
            ;;
        --check-required)
            CHECK_REQUIRED=true
            shift
            ;;
        --strict-mode)
            STRICT_MODE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Check if just listing required secrets
if [ "$CHECK_REQUIRED" = true ]; then
    check_required_only
    exit 0
fi

# Validate arguments
if [ "$CHECK_KEYVAULT" = true ] && [ -z "$VAULT_NAME" ]; then
    error "Missing required argument: --vault-name (required with --check-keyvault)"
    usage
    exit 1
fi

# Check prerequisites
info "Checking prerequisites..."

if ! command -v kubectl &> /dev/null; then
    fatal "kubectl not found. Please install it first."
fi

if [ "$CHECK_KEYVAULT" = true ]; then
    if ! command -v az &> /dev/null; then
        fatal "Azure CLI (az) not found. Please install it first."
    fi

    if ! az account show &> /dev/null; then
        fatal "Not logged in to Azure. Run 'az login' first."
    fi
fi

# Run validation
if run_validation; then
    success "Log file: $LOG_FILE"
    exit 0
else
    error "Log file: $LOG_FILE"
    exit 1
fi
