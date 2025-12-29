#!/bin/bash

################################################################################
# Broxiva Production Secrets Rotation Script
################################################################################
# This script automates the rotation of secrets in Azure Key Vault
# and triggers synchronization to Kubernetes via External Secrets Operator
#
# Usage:
#   ./rotate-secrets.sh --secret-type jwt --vault-name broxiva-production-kv
#   ./rotate-secrets.sh --secret-type all --vault-name broxiva-production-kv --dry-run
#   ./rotate-secrets.sh --emergency --vault-name broxiva-production-kv
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
LOG_FILE="${SCRIPT_DIR}/../logs/secret-rotation-$(date +%Y%m%d-%H%M%S).log"
NAMESPACE="broxiva-production"
DRY_RUN=false
EMERGENCY=false
FORCE_SYNC=false
RESTART_DEPLOYMENTS=false

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

confirm() {
    local message="$1"
    if [ "$DRY_RUN" = true ]; then
        warn "[DRY RUN] Would prompt: $message"
        return 0
    fi

    if [ "$EMERGENCY" = true ]; then
        warn "[EMERGENCY MODE] Skipping confirmation"
        return 0
    fi

    read -p "$message (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        warn "Operation cancelled by user"
        exit 0
    fi
}

################################################################################
# Secret Generation Functions
################################################################################

generate_jwt_secret() {
    openssl rand -base64 64 | tr -d '\n'
}

generate_session_secret() {
    openssl rand -base64 64 | tr -d '\n'
}

generate_encryption_key() {
    openssl rand -hex 32
}

generate_password() {
    local length="${1:-32}"
    openssl rand -base64 48 | tr -d '\n' | head -c "$length"
}

generate_api_key() {
    openssl rand -base64 60 | tr -d '\n' | head -c 40
}

################################################################################
# Key Vault Operations
################################################################################

set_keyvault_secret() {
    local vault_name="$1"
    local secret_name="$2"
    local secret_value="$3"
    local tags="$4"

    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would set secret: $secret_name in vault: $vault_name"
        return 0
    fi

    info "Setting secret: $secret_name in Key Vault: $vault_name"

    if az keyvault secret set \
        --vault-name "$vault_name" \
        --name "$secret_name" \
        --value "$secret_value" \
        --tags $tags \
        --output none 2>&1 | tee -a "$LOG_FILE"; then
        success "Successfully set secret: $secret_name"
        return 0
    else
        error "Failed to set secret: $secret_name"
        return 1
    fi
}

get_keyvault_secret() {
    local vault_name="$1"
    local secret_name="$2"

    az keyvault secret show \
        --vault-name "$vault_name" \
        --name "$secret_name" \
        --query "value" \
        --output tsv 2>/dev/null || echo ""
}

################################################################################
# Rotation Functions
################################################################################

rotate_jwt_secrets() {
    local vault_name="$1"
    local rotation_date=$(date +%Y-%m-%d)
    local next_rotation=$(date -d "+90 days" +%Y-%m-%d)

    info "Rotating JWT secrets..."

    # Generate new secrets
    local jwt_secret=$(generate_jwt_secret)
    local jwt_refresh_secret=$(generate_jwt_secret)

    # Set in Key Vault with tags
    set_keyvault_secret "$vault_name" "jwt-access-secret" "$jwt_secret" \
        "Type=auth RotationSchedule=90-days Critical=true LastRotated=$rotation_date NextRotation=$next_rotation"

    set_keyvault_secret "$vault_name" "jwt-refresh-secret" "$jwt_refresh_secret" \
        "Type=auth RotationSchedule=90-days Critical=true LastRotated=$rotation_date NextRotation=$next_rotation"

    success "JWT secrets rotated successfully"
}

rotate_session_secret() {
    local vault_name="$1"
    local rotation_date=$(date +%Y-%m-%d)
    local next_rotation=$(date -d "+90 days" +%Y-%m-%d)

    info "Rotating session secret..."

    local session_secret=$(generate_session_secret)

    set_keyvault_secret "$vault_name" "session-secret" "$session_secret" \
        "Type=auth RotationSchedule=90-days Critical=true LastRotated=$rotation_date NextRotation=$next_rotation"

    success "Session secret rotated successfully"
}

rotate_database_password() {
    local vault_name="$1"
    local rotation_date=$(date +%Y-%m-%d)
    local next_rotation=$(date -d "+90 days" +%Y-%m-%d)

    info "Rotating database password..."

    warn "IMPORTANT: This will require coordinated deployment to avoid downtime"
    confirm "Continue with database password rotation?"

    local db_password=$(generate_password 32)
    local db_url="postgresql://broxiva:${db_password}@postgres.broxiva-production.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require"

    set_keyvault_secret "$vault_name" "postgres-password" "$db_password" \
        "Type=database RotationSchedule=90-days Critical=true LastRotated=$rotation_date NextRotation=$next_rotation"

    set_keyvault_secret "$vault_name" "postgres-url" "$db_url" \
        "Type=database RotationSchedule=90-days Critical=true LastRotated=$rotation_date NextRotation=$next_rotation"

    warn "Database password rotated. You MUST update the actual PostgreSQL database password separately!"
    warn "Run: ALTER USER broxiva WITH PASSWORD '<new_password>';"

    success "Database secrets rotated in Key Vault"
}

rotate_redis_password() {
    local vault_name="$1"
    local rotation_date=$(date +%Y-%m-%d)
    local next_rotation=$(date -d "+90 days" +%Y-%m-%d)

    info "Rotating Redis password..."

    local redis_password=$(generate_password 32)
    local redis_url="redis://:${redis_password}@redis.broxiva-production.svc.cluster.local:6379"

    set_keyvault_secret "$vault_name" "redis-password" "$redis_password" \
        "Type=cache RotationSchedule=90-days Critical=medium LastRotated=$rotation_date NextRotation=$next_rotation"

    set_keyvault_secret "$vault_name" "redis-url" "$redis_url" \
        "Type=cache RotationSchedule=90-days Critical=medium LastRotated=$rotation_date NextRotation=$next_rotation"

    warn "Redis password rotated. You MUST update the actual Redis password separately!"
    warn "Run: CONFIG SET requirepass '<new_password>';"

    success "Redis secrets rotated in Key Vault"
}

rotate_internal_api_key() {
    local vault_name="$1"
    local rotation_date=$(date +%Y-%m-%d)
    local next_rotation=$(date -d "+90 days" +%Y-%m-%d)

    info "Rotating internal API key..."

    local api_key=$(generate_api_key)

    set_keyvault_secret "$vault_name" "internal-api-key" "$api_key" \
        "Type=internal RotationSchedule=90-days Critical=true LastRotated=$rotation_date NextRotation=$next_rotation"

    success "Internal API key rotated successfully"
}

rotate_webhook_secret() {
    local vault_name="$1"
    local rotation_date=$(date +%Y-%m-%d)
    local next_rotation=$(date -d "+90 days" +%Y-%m-%d)

    info "Rotating webhook secret..."

    local webhook_secret=$(generate_jwt_secret)

    set_keyvault_secret "$vault_name" "webhook-secret" "$webhook_secret" \
        "Type=internal RotationSchedule=90-days Critical=true LastRotated=$rotation_date NextRotation=$next_rotation"

    success "Webhook secret rotated successfully"
}

################################################################################
# Kubernetes Operations
################################################################################

force_externalsecret_sync() {
    local namespace="$1"
    local externalsecret_name="$2"

    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would force sync ExternalSecret: $externalsecret_name"
        return 0
    fi

    info "Forcing sync of ExternalSecret: $externalsecret_name"

    if kubectl annotate externalsecret "$externalsecret_name" \
        -n "$namespace" \
        force-sync="$(date +%s)" \
        --overwrite 2>&1 | tee -a "$LOG_FILE"; then
        success "ExternalSecret sync triggered"
        return 0
    else
        error "Failed to trigger ExternalSecret sync"
        return 1
    fi
}

restart_deployment() {
    local namespace="$1"
    local deployment_name="$2"

    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would restart deployment: $deployment_name"
        return 0
    fi

    info "Restarting deployment: $deployment_name"

    if kubectl rollout restart deployment "$deployment_name" -n "$namespace" 2>&1 | tee -a "$LOG_FILE"; then
        kubectl rollout status deployment "$deployment_name" -n "$namespace" --timeout=5m
        success "Deployment restarted: $deployment_name"
        return 0
    else
        error "Failed to restart deployment: $deployment_name"
        return 1
    fi
}

################################################################################
# Main Rotation Logic
################################################################################

rotate_secrets() {
    local vault_name="$1"
    local secret_type="$2"

    info "==================================================="
    info "Starting secret rotation"
    info "Vault: $vault_name"
    info "Secret Type: $secret_type"
    info "Dry Run: $DRY_RUN"
    info "Emergency: $EMERGENCY"
    info "==================================================="

    case "$secret_type" in
        jwt)
            rotate_jwt_secrets "$vault_name"
            ;;
        session)
            rotate_session_secret "$vault_name"
            ;;
        database)
            rotate_database_password "$vault_name"
            ;;
        redis)
            rotate_redis_password "$vault_name"
            ;;
        internal)
            rotate_internal_api_key "$vault_name"
            rotate_webhook_secret "$vault_name"
            ;;
        all)
            warn "Rotating ALL secrets! This is a major operation."
            confirm "Are you absolutely sure you want to rotate ALL secrets?"

            rotate_jwt_secrets "$vault_name"
            rotate_session_secret "$vault_name"
            rotate_internal_api_key "$vault_name"
            rotate_webhook_secret "$vault_name"

            if [ "$EMERGENCY" = true ]; then
                warn "Emergency mode: Also rotating database and Redis"
                rotate_database_password "$vault_name"
                rotate_redis_password "$vault_name"
            fi
            ;;
        *)
            fatal "Unknown secret type: $secret_type"
            ;;
    esac

    # Force sync if requested
    if [ "$FORCE_SYNC" = true ]; then
        info "Forcing ExternalSecret synchronization..."
        force_externalsecret_sync "$NAMESPACE" "broxiva-all-secrets"

        # Wait for sync to complete
        info "Waiting for secrets to sync..."
        sleep 10
    fi

    # Restart deployments if requested
    if [ "$RESTART_DEPLOYMENTS" = true ]; then
        info "Restarting deployments to pick up new secrets..."
        restart_deployment "$NAMESPACE" "broxiva-api"
        restart_deployment "$NAMESPACE" "broxiva-web"
    fi

    success "==================================================="
    success "Secret rotation completed successfully!"
    success "Log file: $LOG_FILE"
    success "==================================================="

    if [ "$secret_type" = "database" ] || [ "$secret_type" = "redis" ] || [ "$secret_type" = "all" ]; then
        warn ""
        warn "IMPORTANT POST-ROTATION STEPS:"
        warn "1. Update actual database/Redis passwords to match new values"
        warn "2. Verify application connectivity"
        warn "3. Monitor logs for authentication errors"
        warn ""
    fi
}

################################################################################
# Usage and Argument Parsing
################################################################################

usage() {
    cat << EOF
Broxiva Production Secrets Rotation Script

Usage: $0 [OPTIONS]

Options:
    --vault-name NAME          Azure Key Vault name (required)
    --secret-type TYPE         Type of secret to rotate: jwt, session, database, redis, internal, all (required)
    --namespace NAME           Kubernetes namespace (default: broxiva-production)
    --dry-run                  Preview changes without applying them
    --emergency                Emergency rotation mode (skips confirmations, rotates critical secrets)
    --force-sync               Force immediate ExternalSecret synchronization
    --restart-deployments      Restart deployments after rotation
    --help                     Show this help message

Examples:
    # Rotate JWT secrets (dry run)
    $0 --vault-name broxiva-production-kv --secret-type jwt --dry-run

    # Rotate all secrets in emergency
    $0 --vault-name broxiva-production-kv --secret-type all --emergency --force-sync --restart-deployments

    # Rotate internal API keys with sync
    $0 --vault-name broxiva-production-kv --secret-type internal --force-sync

Secret Types:
    jwt        - JWT access and refresh tokens
    session    - Session secret
    database   - Database password (requires manual DB update)
    redis      - Redis password (requires manual Redis update)
    internal   - Internal API key and webhook secret
    all        - All rotatable secrets (excludes encryption keys)

Notes:
    - Encryption keys (ENCRYPTION_KEY, KYC_ENCRYPTION_KEY) are NEVER rotated automatically
    - Database and Redis rotations require manual password updates on the actual services
    - Emergency mode bypasses all confirmations - use with caution
    - All operations are logged to infrastructure/logs/

EOF
}

# Parse arguments
VAULT_NAME=""
SECRET_TYPE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --vault-name)
            VAULT_NAME="$2"
            shift 2
            ;;
        --secret-type)
            SECRET_TYPE="$2"
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
        --emergency)
            EMERGENCY=true
            FORCE_SYNC=true
            RESTART_DEPLOYMENTS=true
            shift
            ;;
        --force-sync)
            FORCE_SYNC=true
            shift
            ;;
        --restart-deployments)
            RESTART_DEPLOYMENTS=true
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

if [ -z "$SECRET_TYPE" ]; then
    error "Missing required argument: --secret-type"
    usage
    exit 1
fi

# Check prerequisites
info "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    fatal "Azure CLI (az) not found. Please install it first."
fi

if ! command -v kubectl &> /dev/null; then
    fatal "kubectl not found. Please install it first."
fi

if ! command -v openssl &> /dev/null; then
    fatal "openssl not found. Please install it first."
fi

# Verify Azure login
if ! az account show &> /dev/null; then
    fatal "Not logged in to Azure. Run 'az login' first."
fi

# Verify Key Vault exists
if ! az keyvault show --name "$VAULT_NAME" &> /dev/null; then
    fatal "Key Vault not found: $VAULT_NAME"
fi

# Verify kubectl context
current_context=$(kubectl config current-context)
info "Current kubectl context: $current_context"
confirm "Is this the correct Kubernetes cluster?"

# Start rotation
rotate_secrets "$VAULT_NAME" "$SECRET_TYPE"
