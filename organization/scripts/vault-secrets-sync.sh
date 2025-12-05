#!/bin/bash

# CitadelBuy HashiCorp Vault Sync Script
# This script synchronizes secrets between local .env files and HashiCorp Vault
# Usage: ./vault-secrets-sync.sh [push|pull|list|backup|init] [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-citadelbuy}"
VAULT_ADDR="${VAULT_ADDR:-https://vault.citadelbuy.internal:8200}"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ROOT_DIR}/apps/api/.env"

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_vault_cli() {
    if ! command -v vault &> /dev/null; then
        print_error "Vault CLI is not installed. Please install it first."
        exit 1
    fi
}

check_jq() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it first."
        exit 1
    fi
}

validate_environment() {
    local env=$1
    if [[ ! "$env" =~ ^(dev|staging|production)$ ]]; then
        print_error "Invalid environment: $env. Must be dev, staging, or production."
        exit 1
    fi
}

check_vault_status() {
    if ! vault status &>/dev/null; then
        print_error "Cannot connect to Vault at $VAULT_ADDR"
        print_info "Please check VAULT_ADDR and VAULT_TOKEN environment variables"
        exit 1
    fi

    if vault status 2>&1 | grep -q "Sealed.*true"; then
        print_error "Vault is sealed. Please unseal it first."
        exit 1
    fi
}

check_vault_token() {
    if [[ -z "$VAULT_TOKEN" ]]; then
        print_error "VAULT_TOKEN environment variable is not set"
        print_info "Please run: export VAULT_TOKEN=<your-token>"
        exit 1
    fi
}

get_secret_path() {
    local env=$1
    local secret_type=$2
    echo "secret/data/${PROJECT_NAME}/${env}/${secret_type}"
}

get_secret() {
    local secret_path=$1
    vault kv get -format=json "$secret_path" 2>/dev/null | jq -r '.data.data // empty' || echo ""
}

put_secret() {
    local secret_path=$1
    shift
    local key_values=("$@")

    vault kv put "${secret_path/\/data\//\/}" "${key_values[@]}" > /dev/null
    print_success "Set secret: $secret_path"
}

init_vault() {
    print_info "Initializing Vault for CitadelBuy..."

    # Enable KV v2 secrets engine
    if ! vault secrets list | grep -q "secret/"; then
        print_info "Enabling KV v2 secrets engine..."
        vault secrets enable -path=secret kv-v2
        print_success "KV v2 secrets engine enabled"
    else
        print_info "KV v2 secrets engine already enabled"
    fi

    # Create policies
    print_info "Creating Vault policies..."

    if [[ -f "${ROOT_DIR}/infrastructure/vault/policies/citadelbuy.hcl" ]]; then
        vault policy write citadelbuy "${ROOT_DIR}/infrastructure/vault/policies/citadelbuy.hcl"
        print_success "Created citadelbuy policy"
    fi

    if [[ -f "${ROOT_DIR}/infrastructure/vault/policies/citadelbuy-admin.hcl" ]]; then
        vault policy write citadelbuy-admin "${ROOT_DIR}/infrastructure/vault/policies/citadelbuy-admin.hcl"
        print_success "Created citadelbuy-admin policy"
    fi

    # Enable Kubernetes auth if available
    if ! vault auth list | grep -q "kubernetes/"; then
        print_info "Enabling Kubernetes auth method..."
        vault auth enable kubernetes || print_warning "Failed to enable Kubernetes auth (may require additional setup)"
    fi

    # Enable database secrets engine
    if ! vault secrets list | grep -q "database/"; then
        print_info "Enabling database secrets engine..."
        vault secrets enable database || print_warning "Failed to enable database secrets engine"
    fi

    # Enable transit encryption engine
    if ! vault secrets list | grep -q "transit/"; then
        print_info "Enabling transit encryption engine..."
        vault secrets enable transit || print_warning "Failed to enable transit encryption engine"
    fi

    print_success "Vault initialization complete"
}

push_secrets() {
    local env=$1
    validate_environment "$env"

    print_info "Pushing secrets to Vault for environment: $env"

    if [[ ! -f "$ENV_FILE" ]]; then
        print_error ".env file not found at: $ENV_FILE"
        exit 1
    fi

    # Source the .env file
    set -a
    source "$ENV_FILE"
    set +a

    # PostgreSQL credentials
    if [[ -n "$DATABASE_URL" ]]; then
        local secret_path=$(get_secret_path "$env" "database/postgres")
        put_secret "$secret_path" \
            url="$DATABASE_URL" \
            username="${POSTGRES_USER:-citadelbuy_admin}" \
            password="${POSTGRES_PASSWORD:-}" \
            host="${POSTGRES_HOST:-localhost}" \
            port="${POSTGRES_PORT:-5432}" \
            database="${POSTGRES_DB:-citadelbuy}"
    fi

    # Redis credentials
    if [[ -n "$REDIS_URL" ]]; then
        local secret_path=$(get_secret_path "$env" "redis/connection")
        put_secret "$secret_path" \
            url="$REDIS_URL" \
            password="${REDIS_PASSWORD:-}" \
            host="${REDIS_HOST:-localhost}" \
            port="${REDIS_PORT:-6379}"
    fi

    # JWT secrets
    if [[ -n "$JWT_SECRET" ]]; then
        local secret_path=$(get_secret_path "$env" "jwt/tokens")
        put_secret "$secret_path" \
            access_token_secret="$JWT_SECRET" \
            refresh_token_secret="${JWT_REFRESH_SECRET:-$JWT_SECRET}" \
            access_token_expiry="${JWT_EXPIRY:-15m}" \
            refresh_token_expiry="${JWT_REFRESH_EXPIRY:-7d}"
    fi

    # Stripe keys
    if [[ -n "$STRIPE_SECRET_KEY" ]]; then
        local secret_path=$(get_secret_path "$env" "stripe/keys")
        put_secret "$secret_path" \
            secret_key="$STRIPE_SECRET_KEY" \
            publishable_key="${STRIPE_PUBLISHABLE_KEY:-}" \
            webhook_secret="${STRIPE_WEBHOOK_SECRET:-}"
    fi

    # AWS credentials
    if [[ -n "$AWS_ACCESS_KEY_ID" ]] && [[ -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        local secret_path=$(get_secret_path "$env" "aws/credentials")
        put_secret "$secret_path" \
            access_key_id="$AWS_ACCESS_KEY_ID" \
            secret_access_key="$AWS_SECRET_ACCESS_KEY" \
            region="${AWS_REGION:-us-east-1}" \
            email_from="${EMAIL_FROM:-noreply@citadelbuy.com}"
    fi

    # OpenAI API key
    if [[ -n "$OPENAI_API_KEY" ]]; then
        local secret_path=$(get_secret_path "$env" "openai/api")
        put_secret "$secret_path" \
            api_key="$OPENAI_API_KEY" \
            model="${OPENAI_MODEL:-gpt-4}"
    fi

    # Google OAuth
    if [[ -n "$GOOGLE_CLIENT_ID" ]] && [[ -n "$GOOGLE_CLIENT_SECRET" ]]; then
        local secret_path=$(get_secret_path "$env" "oauth/google")
        put_secret "$secret_path" \
            client_id="$GOOGLE_CLIENT_ID" \
            client_secret="$GOOGLE_CLIENT_SECRET"
    fi

    # Facebook OAuth
    if [[ -n "$FACEBOOK_APP_ID" ]] && [[ -n "$FACEBOOK_APP_SECRET" ]]; then
        local secret_path=$(get_secret_path "$env" "oauth/facebook")
        put_secret "$secret_path" \
            app_id="$FACEBOOK_APP_ID" \
            app_secret="$FACEBOOK_APP_SECRET"
    fi

    # Elasticsearch credentials
    if [[ -n "$ELASTICSEARCH_NODE" ]]; then
        local secret_path=$(get_secret_path "$env" "elasticsearch/connection")
        put_secret "$secret_path" \
            node="$ELASTICSEARCH_NODE" \
            username="${ELASTICSEARCH_USERNAME:-elastic}" \
            password="${ELASTICSEARCH_PASSWORD:-}"
    fi

    # Session secret
    if [[ -n "$SESSION_SECRET" ]]; then
        local secret_path=$(get_secret_path "$env" "session/secret")
        put_secret "$secret_path" \
            secret="$SESSION_SECRET"
    fi

    print_success "All secrets pushed successfully to Vault"
}

pull_secrets() {
    local env=$1
    validate_environment "$env"

    print_info "Pulling secrets from Vault for environment: $env"

    local env_content="# CitadelBuy Environment Variables\n"
    env_content+="# Generated from HashiCorp Vault on $(date)\n"
    env_content+="# Environment: $env\n\n"

    # PostgreSQL
    local postgres_path=$(get_secret_path "$env" "database/postgres")
    local postgres=$(get_secret "$postgres_path")
    if [[ -n "$postgres" ]]; then
        env_content+="# Database\n"
        env_content+="DATABASE_URL=$(echo "$postgres" | jq -r '.url // empty')\n"
        env_content+="POSTGRES_USER=$(echo "$postgres" | jq -r '.username // empty')\n"
        env_content+="POSTGRES_PASSWORD=$(echo "$postgres" | jq -r '.password // empty')\n"
        env_content+="POSTGRES_HOST=$(echo "$postgres" | jq -r '.host // empty')\n"
        env_content+="POSTGRES_PORT=$(echo "$postgres" | jq -r '.port // empty')\n"
        env_content+="POSTGRES_DB=$(echo "$postgres" | jq -r '.database // empty')\n\n"
    fi

    # Redis
    local redis_path=$(get_secret_path "$env" "redis/connection")
    local redis=$(get_secret "$redis_path")
    if [[ -n "$redis" ]]; then
        env_content+="# Redis\n"
        env_content+="REDIS_URL=$(echo "$redis" | jq -r '.url // empty')\n"
        env_content+="REDIS_PASSWORD=$(echo "$redis" | jq -r '.password // empty')\n"
        env_content+="REDIS_HOST=$(echo "$redis" | jq -r '.host // empty')\n"
        env_content+="REDIS_PORT=$(echo "$redis" | jq -r '.port // empty')\n\n"
    fi

    # JWT
    local jwt_path=$(get_secret_path "$env" "jwt/tokens")
    local jwt=$(get_secret "$jwt_path")
    if [[ -n "$jwt" ]]; then
        env_content+="# JWT\n"
        env_content+="JWT_SECRET=$(echo "$jwt" | jq -r '.access_token_secret // empty')\n"
        env_content+="JWT_REFRESH_SECRET=$(echo "$jwt" | jq -r '.refresh_token_secret // empty')\n"
        env_content+="JWT_EXPIRY=$(echo "$jwt" | jq -r '.access_token_expiry // empty')\n"
        env_content+="JWT_REFRESH_EXPIRY=$(echo "$jwt" | jq -r '.refresh_token_expiry // empty')\n\n"
    fi

    # Stripe
    local stripe_path=$(get_secret_path "$env" "stripe/keys")
    local stripe=$(get_secret "$stripe_path")
    if [[ -n "$stripe" ]]; then
        env_content+="# Stripe\n"
        env_content+="STRIPE_SECRET_KEY=$(echo "$stripe" | jq -r '.secret_key // empty')\n"
        env_content+="STRIPE_PUBLISHABLE_KEY=$(echo "$stripe" | jq -r '.publishable_key // empty')\n"
        env_content+="STRIPE_WEBHOOK_SECRET=$(echo "$stripe" | jq -r '.webhook_secret // empty')\n\n"
    fi

    # AWS
    local aws_path=$(get_secret_path "$env" "aws/credentials")
    local aws=$(get_secret "$aws_path")
    if [[ -n "$aws" ]]; then
        env_content+="# AWS\n"
        env_content+="AWS_ACCESS_KEY_ID=$(echo "$aws" | jq -r '.access_key_id // empty')\n"
        env_content+="AWS_SECRET_ACCESS_KEY=$(echo "$aws" | jq -r '.secret_access_key // empty')\n"
        env_content+="AWS_REGION=$(echo "$aws" | jq -r '.region // empty')\n"
        env_content+="EMAIL_FROM=$(echo "$aws" | jq -r '.email_from // empty')\n\n"
    fi

    # OpenAI
    local openai_path=$(get_secret_path "$env" "openai/api")
    local openai=$(get_secret "$openai_path")
    if [[ -n "$openai" ]]; then
        env_content+="# OpenAI\n"
        env_content+="OPENAI_API_KEY=$(echo "$openai" | jq -r '.api_key // empty')\n"
        env_content+="OPENAI_MODEL=$(echo "$openai" | jq -r '.model // empty')\n\n"
    fi

    # Google OAuth
    local google_path=$(get_secret_path "$env" "oauth/google")
    local google=$(get_secret "$google_path")
    if [[ -n "$google" ]]; then
        env_content+="# Google OAuth\n"
        env_content+="GOOGLE_CLIENT_ID=$(echo "$google" | jq -r '.client_id // empty')\n"
        env_content+="GOOGLE_CLIENT_SECRET=$(echo "$google" | jq -r '.client_secret // empty')\n\n"
    fi

    # Facebook OAuth
    local facebook_path=$(get_secret_path "$env" "oauth/facebook")
    local facebook=$(get_secret "$facebook_path")
    if [[ -n "$facebook" ]]; then
        env_content+="# Facebook OAuth\n"
        env_content+="FACEBOOK_APP_ID=$(echo "$facebook" | jq -r '.app_id // empty')\n"
        env_content+="FACEBOOK_APP_SECRET=$(echo "$facebook" | jq -r '.app_secret // empty')\n\n"
    fi

    # Elasticsearch
    local es_path=$(get_secret_path "$env" "elasticsearch/connection")
    local elasticsearch=$(get_secret "$es_path")
    if [[ -n "$elasticsearch" ]]; then
        env_content+="# Elasticsearch\n"
        env_content+="ELASTICSEARCH_NODE=$(echo "$elasticsearch" | jq -r '.node // empty')\n"
        env_content+="ELASTICSEARCH_USERNAME=$(echo "$elasticsearch" | jq -r '.username // empty')\n"
        env_content+="ELASTICSEARCH_PASSWORD=$(echo "$elasticsearch" | jq -r '.password // empty')\n\n"
    fi

    # Session
    local session_path=$(get_secret_path "$env" "session/secret")
    local session=$(get_secret "$session_path")
    if [[ -n "$session" ]]; then
        env_content+="# Session\n"
        env_content+="SESSION_SECRET=$(echo "$session" | jq -r '.secret // empty')\n\n"
    fi

    # Write to .env file
    echo -e "$env_content" > "$ENV_FILE"
    print_success "Secrets pulled successfully and written to $ENV_FILE"
}

list_secrets() {
    local env=$1
    validate_environment "$env"

    print_info "Listing secrets in Vault for environment: $env"

    vault kv list -format=json "secret/${PROJECT_NAME}/${env}" 2>/dev/null | jq -r '.[]' | while read -r path; do
        echo "secret/${PROJECT_NAME}/${env}/${path}"
        vault kv list -format=json "secret/${PROJECT_NAME}/${env}/${path}" 2>/dev/null | jq -r '.[]' | while read -r subpath; do
            echo "  └── ${subpath}"
        done
    done
}

backup_secrets() {
    local env=$1
    validate_environment "$env"

    local backup_dir="${ROOT_DIR}/backups/secrets"
    mkdir -p "$backup_dir"

    local backup_file="${backup_dir}/vault-secrets-${env}-$(date +%Y%m%d-%H%M%S).json"

    print_info "Backing up secrets to: $backup_file"

    # Export all secrets for the environment
    vault kv get -format=json -mount=secret "${PROJECT_NAME}/${env}" > "$backup_file" 2>/dev/null || {
        # If direct export fails, iterate through paths
        echo "{" > "$backup_file"
        local first=true

        vault kv list -format=json "secret/${PROJECT_NAME}/${env}" 2>/dev/null | jq -r '.[]' | while read -r category; do
            vault kv list -format=json "secret/${PROJECT_NAME}/${env}/${category}" 2>/dev/null | jq -r '.[]' | while read -r secret_name; do
                local secret_path="secret/${PROJECT_NAME}/${env}/${category}/${secret_name}"
                local secret_data=$(vault kv get -format=json "$secret_path" 2>/dev/null | jq -r '.data.data')

                if [[ -n "$secret_data" ]]; then
                    if [[ "$first" == false ]]; then
                        echo "," >> "$backup_file"
                    fi
                    echo "  \"${category}/${secret_name}\": $secret_data" >> "$backup_file"
                    first=false
                fi
            done
        done

        echo "}" >> "$backup_file"
    }

    print_success "Secrets backed up to: $backup_file"
}

show_usage() {
    cat << EOF
CitadelBuy HashiCorp Vault Sync Script

Usage: $0 [command] [environment] [options]

Commands:
    init        Initialize Vault with required engines and policies
    push        Push secrets from .env file to Vault
    pull        Pull secrets from Vault to .env file
    list        List all secrets in Vault
    backup      Backup all secrets to a local JSON file

Environments:
    dev         Development environment
    staging     Staging environment
    production  Production environment

Options:
    -h, --help      Show this help message

Examples:
    $0 init
    $0 push production
    $0 pull dev
    $0 list staging
    $0 backup production

Prerequisites:
    - Vault CLI installed
    - VAULT_ADDR environment variable set
    - VAULT_TOKEN environment variable set
    - jq installed for JSON processing

Environment Variables:
    VAULT_ADDR      Vault server address (default: https://vault.citadelbuy.internal:8200)
    VAULT_TOKEN     Vault authentication token
    VAULT_NAMESPACE Vault namespace (for Vault Enterprise)
    PROJECT_NAME    Project name prefix for secrets (default: citadelbuy)

EOF
}

# Main script
main() {
    local command=$1
    local environment=$2

    check_vault_cli
    check_jq

    case "$command" in
        init)
            check_vault_token
            check_vault_status
            init_vault
            ;;
        push)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for push command"
                show_usage
                exit 1
            fi
            check_vault_token
            check_vault_status
            push_secrets "$environment"
            ;;
        pull)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for pull command"
                show_usage
                exit 1
            fi
            check_vault_token
            check_vault_status
            pull_secrets "$environment"
            ;;
        list)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for list command"
                show_usage
                exit 1
            fi
            check_vault_token
            check_vault_status
            list_secrets "$environment"
            ;;
        backup)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for backup command"
                show_usage
                exit 1
            fi
            check_vault_token
            check_vault_status
            backup_secrets "$environment"
            ;;
        -h|--help|help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Invalid command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
