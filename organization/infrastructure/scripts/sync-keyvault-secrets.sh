#!/bin/bash

################################################################################
# Broxiva Key Vault Secrets Synchronization Script
################################################################################
# This script syncs secrets from a local file to Azure Key Vault
# and optionally triggers Kubernetes ExternalSecret synchronization
#
# Usage:
#   ./sync-keyvault-secrets.sh --vault-name broxiva-production-kv --secrets-file secrets.env
#   ./sync-keyvault-secrets.sh --vault-name broxiva-production-kv --secrets-file secrets.env --validate --force-sync
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
LOG_FILE="${SCRIPT_DIR}/../logs/keyvault-sync-$(date +%Y%m%d-%H%M%S).log"
NAMESPACE="broxiva-production"
DRY_RUN=false
VALIDATE=false
FORCE_SYNC=false
BACKUP=true

# Create logs directory
mkdir -p "${SCRIPT_DIR}/../logs"

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
    log "SUCCESS" "${GREEN}$*${NC}"
}

warn() {
    log "WARN" "${YELLOW}$*${NC}"
}

error() {
    log "ERROR" "${RED}$*${NC}"
}

fatal() {
    error "$*"
    exit 1
}

################################################################################
# Validation Functions
################################################################################

validate_secret_value() {
    local name="$1"
    local value="$2"

    # Check if value is placeholder
    if [[ "$value" =~ ^REPLACE ]]; then
        warn "Secret '$name' has placeholder value: $value"
        return 1
    fi

    # Check minimum length based on secret type
    local min_length=16

    case "$name" in
        *PASSWORD*|*SECRET*|*KEY*)
            min_length=32
            ;;
        *ENCRYPTION*)
            min_length=64
            ;;
    esac

    if [ ${#value} -lt $min_length ]; then
        warn "Secret '$name' is too short (${#value} chars, minimum: $min_length)"
        return 1
    fi

    return 0
}

validate_secrets_file() {
    local secrets_file="$1"
    local errors=0

    info "Validating secrets file: $secrets_file"

    # Critical secrets that MUST be present
    local required_secrets=(
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "SESSION_SECRET"
        "ENCRYPTION_KEY"
        "KYC_ENCRYPTION_KEY"
        "POSTGRES_PASSWORD"
        "DATABASE_URL"
        "REDIS_PASSWORD"
        "INTERNAL_API_KEY"
    )

    # Check for required secrets
    for secret_name in "${required_secrets[@]}"; do
        if ! grep -q "^${secret_name}=" "$secrets_file"; then
            error "Missing required secret: $secret_name"
            ((errors++))
        fi
    done

    # Validate each secret value
    while IFS='=' read -r name value; do
        # Skip comments and empty lines
        [[ "$name" =~ ^#.*$ ]] && continue
        [[ -z "$name" ]] && continue

        # Remove quotes from value
        value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//')

        if ! validate_secret_value "$name" "$value"; then
            ((errors++))
        fi
    done < "$secrets_file"

    if [ $errors -gt 0 ]; then
        error "Validation failed with $errors error(s)"
        return 1
    fi

    success "Validation passed"
    return 0
}

################################################################################
# Backup Functions
################################################################################

backup_keyvault_secrets() {
    local vault_name="$1"
    local backup_file="${SCRIPT_DIR}/../backups/keyvault-${vault_name}-$(date +%Y%m%d-%H%M%S).json"

    mkdir -p "${SCRIPT_DIR}/../backups"

    info "Creating backup of Key Vault secrets..."

    local secrets=$(az keyvault secret list --vault-name "$vault_name" --query "[].name" -o tsv)
    local backup_data="{"

    while IFS= read -r secret_name; do
        local secret_value=$(az keyvault secret show --vault-name "$vault_name" --name "$secret_name" --query "value" -o tsv)
        backup_data="$backup_data\"$secret_name\":\"$secret_value\","
    done <<< "$secrets"

    # Remove trailing comma and close JSON
    backup_data="${backup_data%,}}"

    echo "$backup_data" > "$backup_file"
    chmod 600 "$backup_file"

    success "Backup created: $backup_file"
    warn "IMPORTANT: Store this backup in a secure location!"
}

################################################################################
# Sync Functions
################################################################################

convert_env_name_to_keyvault() {
    local env_name="$1"

    # Convert environment variable name to Key Vault secret name
    # Example: JWT_SECRET -> jwt-secret
    echo "$env_name" | tr '[:upper:]' '[:lower:]' | tr '_' '-'
}

sync_secret_to_keyvault() {
    local vault_name="$1"
    local secret_name="$2"
    local secret_value="$3"
    local tags="$4"

    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would sync secret: $secret_name"
        return 0
    fi

    # Check if secret already exists
    local existing_value=$(az keyvault secret show \
        --vault-name "$vault_name" \
        --name "$secret_name" \
        --query "value" \
        -o tsv 2>/dev/null || echo "")

    if [ -n "$existing_value" ]; then
        if [ "$existing_value" = "$secret_value" ]; then
            info "Secret '$secret_name' already up-to-date"
            return 0
        else
            warn "Secret '$secret_name' will be updated"
        fi
    fi

    # Set secret in Key Vault
    if az keyvault secret set \
        --vault-name "$vault_name" \
        --name "$secret_name" \
        --value "$secret_value" \
        --tags $tags \
        --output none 2>&1 | tee -a "$LOG_FILE"; then
        success "Synced secret: $secret_name"
        return 0
    else
        error "Failed to sync secret: $secret_name"
        return 1
    fi
}

get_secret_tags() {
    local secret_name="$1"
    local current_date=$(date +%Y-%m-%d)

    # Determine secret type and rotation schedule
    case "$secret_name" in
        jwt-*|session-*)
            echo "Type=auth RotationSchedule=90-days Critical=true LastUpdated=$current_date"
            ;;
        *encryption*)
            echo "Type=encryption RotationSchedule=NEVER Critical=true Warning=DO-NOT-ROTATE LastUpdated=$current_date"
            ;;
        postgres-*|database-*)
            echo "Type=database RotationSchedule=90-days Critical=true LastUpdated=$current_date"
            ;;
        redis-*)
            echo "Type=cache RotationSchedule=90-days Critical=medium LastUpdated=$current_date"
            ;;
        stripe-*|paypal-*)
            echo "Type=payment RotationSchedule=as-needed Critical=true SetManually=true LastUpdated=$current_date"
            ;;
        sendgrid-*|email-*)
            echo "Type=email RotationSchedule=as-needed Critical=high LastUpdated=$current_date"
            ;;
        openai-*|ai-*)
            echo "Type=ai RotationSchedule=as-needed Critical=low LastUpdated=$current_date"
            ;;
        internal-*|webhook-*)
            echo "Type=internal RotationSchedule=90-days Critical=true LastUpdated=$current_date"
            ;;
        *)
            echo "Type=general RotationSchedule=as-needed Critical=medium LastUpdated=$current_date"
            ;;
    esac
}

sync_all_secrets() {
    local vault_name="$1"
    local secrets_file="$2"

    info "==================================================="
    info "Starting secrets synchronization"
    info "Vault: $vault_name"
    info "Source: $secrets_file"
    info "Dry Run: $DRY_RUN"
    info "==================================================="

    local synced=0
    local errors=0

    # Create backup if enabled
    if [ "$BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
        backup_keyvault_secrets "$vault_name"
    fi

    # Read and sync each secret
    while IFS='=' read -r name value; do
        # Skip comments and empty lines
        [[ "$name" =~ ^#.*$ ]] && continue
        [[ -z "$name" ]] && continue

        # Remove whitespace and quotes
        name=$(echo "$name" | xargs)
        value=$(echo "$value" | xargs | sed 's/^["'\'']//' | sed 's/["'\'']$//')

        # Convert environment variable name to Key Vault secret name
        local kv_secret_name=$(convert_env_name_to_keyvault "$name")

        # Get appropriate tags for this secret
        local tags=$(get_secret_tags "$kv_secret_name")

        # Sync to Key Vault
        if sync_secret_to_keyvault "$vault_name" "$kv_secret_name" "$value" "$tags"; then
            ((synced++))
        else
            ((errors++))
        fi

    done < "$secrets_file"

    info "==================================================="
    info "Synchronization Summary:"
    info "  Synced: $synced"
    info "  Errors: $errors"
    info "==================================================="

    if [ $errors -gt 0 ]; then
        error "Synchronization completed with errors"
        return 1
    fi

    success "All secrets synchronized successfully"
    return 0
}

################################################################################
# Kubernetes Sync Functions
################################################################################

force_externalsecret_sync() {
    local namespace="$1"

    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would force sync ExternalSecrets in namespace: $namespace"
        return 0
    fi

    info "Forcing ExternalSecret synchronization in namespace: $namespace"

    # Get all ExternalSecrets in namespace
    local externalsecrets=$(kubectl get externalsecrets -n "$namespace" -o name 2>/dev/null || echo "")

    if [ -z "$externalsecrets" ]; then
        warn "No ExternalSecrets found in namespace: $namespace"
        return 0
    fi

    # Force sync each ExternalSecret
    while IFS= read -r es; do
        local es_name=$(echo "$es" | cut -d'/' -f2)
        info "Forcing sync: $es_name"

        kubectl annotate externalsecret "$es_name" \
            -n "$namespace" \
            force-sync="$(date +%s)" \
            --overwrite 2>&1 | tee -a "$LOG_FILE"
    done <<< "$externalsecrets"

    success "ExternalSecret sync triggered"

    # Wait for sync to complete
    info "Waiting 30 seconds for secrets to sync..."
    sleep 30

    # Verify secrets exist
    verify_kubernetes_secrets "$namespace"
}

verify_kubernetes_secrets() {
    local namespace="$1"

    info "Verifying Kubernetes secrets..."

    local secret_name="broxiva-secrets"

    if ! kubectl get secret "$secret_name" -n "$namespace" &>/dev/null; then
        error "Secret '$secret_name' not found in namespace '$namespace'"
        return 1
    fi

    # Check if secret has required keys
    local required_keys=(
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "DATABASE_URL"
        "REDIS_URL"
    )

    local missing_keys=()

    for key in "${required_keys[@]}"; do
        if ! kubectl get secret "$secret_name" -n "$namespace" \
            -o jsonpath="{.data.$key}" &>/dev/null; then
            missing_keys+=("$key")
        fi
    done

    if [ ${#missing_keys[@]} -gt 0 ]; then
        error "Missing keys in secret '$secret_name':"
        printf '%s\n' "${missing_keys[@]}" | tee -a "$LOG_FILE"
        return 1
    fi

    success "Kubernetes secrets verified successfully"
    return 0
}

################################################################################
# Usage and Argument Parsing
################################################################################

usage() {
    cat << EOF
Broxiva Key Vault Secrets Synchronization Script

Usage: $0 [OPTIONS]

Options:
    --vault-name NAME          Azure Key Vault name (required)
    --secrets-file FILE        Path to secrets file (.env format) (required)
    --namespace NAME           Kubernetes namespace (default: broxiva-production)
    --dry-run                  Preview changes without applying them
    --validate                 Validate secrets file before syncing
    --force-sync               Force immediate ExternalSecret synchronization
    --no-backup                Skip creating backup before sync
    --help                     Show this help message

Examples:
    # Sync secrets with validation (dry run)
    $0 --vault-name broxiva-production-kv --secrets-file secrets.env --validate --dry-run

    # Sync secrets and trigger Kubernetes sync
    $0 --vault-name broxiva-production-kv --secrets-file secrets.env --force-sync

    # Sync without backup (not recommended)
    $0 --vault-name broxiva-production-kv --secrets-file secrets.env --no-backup

Secrets File Format:
    The secrets file should be in .env format:

    JWT_SECRET=your-jwt-secret-value
    JWT_REFRESH_SECRET=your-refresh-secret-value
    DATABASE_URL=postgresql://user:pass@host:5432/db
    # Comments are ignored

    Variable names will be converted to Key Vault format:
    JWT_SECRET -> jwt-secret
    DATABASE_URL -> database-url

Notes:
    - Secrets file should NEVER be committed to version control
    - A backup is automatically created before sync (unless --no-backup)
    - Use --validate to check for missing or invalid secrets
    - Use --force-sync to immediately sync to Kubernetes
    - All operations are logged to infrastructure/logs/

EOF
}

# Parse arguments
VAULT_NAME=""
SECRETS_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --vault-name)
            VAULT_NAME="$2"
            shift 2
            ;;
        --secrets-file)
            SECRETS_FILE="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --validate)
            VALIDATE=true
            shift
            ;;
        --force-sync)
            FORCE_SYNC=true
            shift
            ;;
        --no-backup)
            BACKUP=false
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

# Validate required arguments
if [ -z "$VAULT_NAME" ]; then
    error "Missing required argument: --vault-name"
    usage
    exit 1
fi

if [ -z "$SECRETS_FILE" ]; then
    error "Missing required argument: --secrets-file"
    usage
    exit 1
fi

# Check prerequisites
info "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    fatal "Azure CLI (az) not found. Please install it first."
fi

if [ "$FORCE_SYNC" = true ]; then
    if ! command -v kubectl &> /dev/null; then
        fatal "kubectl not found. Please install it first."
    fi
fi

# Verify Azure login
if ! az account show &> /dev/null; then
    fatal "Not logged in to Azure. Run 'az login' first."
fi

# Verify Key Vault exists
if ! az keyvault show --name "$VAULT_NAME" &> /dev/null; then
    fatal "Key Vault not found: $VAULT_NAME"
fi

# Verify secrets file exists
if [ ! -f "$SECRETS_FILE" ]; then
    fatal "Secrets file not found: $SECRETS_FILE"
fi

# Validate secrets file if requested
if [ "$VALIDATE" = true ]; then
    if ! validate_secrets_file "$SECRETS_FILE"; then
        fatal "Secrets file validation failed. Fix errors and try again."
    fi
fi

# Sync secrets
if ! sync_all_secrets "$VAULT_NAME" "$SECRETS_FILE"; then
    fatal "Secrets synchronization failed"
fi

# Force Kubernetes sync if requested
if [ "$FORCE_SYNC" = true ]; then
    force_externalsecret_sync "$NAMESPACE"
fi

success "==================================================="
success "Sync completed successfully!"
success "Log file: $LOG_FILE"
success "==================================================="

if [ "$BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    warn ""
    warn "A backup was created. Store it securely and delete after verification."
    warn ""
fi
