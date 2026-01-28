#!/bin/bash

# Broxiva Azure Key Vault Sync Script
# This script synchronizes secrets between local .env files and Azure Key Vault
# Usage: ./azure-secrets-sync.sh [push|pull|list|backup] [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-broxiva}"
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

check_az_cli() {
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
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

check_login() {
    if ! az account show &>/dev/null; then
        print_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
}

get_key_vault_name() {
    local env=$1
    echo "${PROJECT_NAME}-${env}-kv"
}

get_secret() {
    local vault_name=$1
    local secret_name=$2

    az keyvault secret show \
        --vault-name "$vault_name" \
        --name "$secret_name" \
        --query 'value' \
        --output tsv 2>/dev/null || echo ""
}

set_secret() {
    local vault_name=$1
    local secret_name=$2
    local secret_value=$3

    az keyvault secret set \
        --vault-name "$vault_name" \
        --name "$secret_name" \
        --value "$secret_value" \
        --output none

    print_success "Set secret: $secret_name"
}

push_secrets() {
    local env=$1
    validate_environment "$env"

    local vault_name=$(get_key_vault_name "$env")

    print_info "Pushing secrets to Azure Key Vault: $vault_name"

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
        set_secret "$vault_name" "postgres-url" "$DATABASE_URL"
    fi

    if [[ -n "$POSTGRES_USER" ]]; then
        set_secret "$vault_name" "postgres-username" "$POSTGRES_USER"
    fi

    if [[ -n "$POSTGRES_PASSWORD" ]]; then
        set_secret "$vault_name" "postgres-password" "$POSTGRES_PASSWORD"
    fi

    if [[ -n "$POSTGRES_HOST" ]]; then
        set_secret "$vault_name" "postgres-host" "$POSTGRES_HOST"
    fi

    if [[ -n "$POSTGRES_PORT" ]]; then
        set_secret "$vault_name" "postgres-port" "$POSTGRES_PORT"
    fi

    if [[ -n "$POSTGRES_DB" ]]; then
        set_secret "$vault_name" "postgres-database" "$POSTGRES_DB"
    fi

    # Redis credentials
    if [[ -n "$REDIS_URL" ]]; then
        set_secret "$vault_name" "redis-url" "$REDIS_URL"
    fi

    if [[ -n "$REDIS_PASSWORD" ]]; then
        set_secret "$vault_name" "redis-password" "$REDIS_PASSWORD"
    fi

    if [[ -n "$REDIS_HOST" ]]; then
        set_secret "$vault_name" "redis-host" "$REDIS_HOST"
    fi

    if [[ -n "$REDIS_PORT" ]]; then
        set_secret "$vault_name" "redis-port" "$REDIS_PORT"
    fi

    # JWT secrets
    if [[ -n "$JWT_SECRET" ]]; then
        set_secret "$vault_name" "jwt-access-secret" "$JWT_SECRET"
    fi

    if [[ -n "$JWT_REFRESH_SECRET" ]]; then
        set_secret "$vault_name" "jwt-refresh-secret" "$JWT_REFRESH_SECRET"
    fi

    if [[ -n "$JWT_EXPIRY" ]]; then
        set_secret "$vault_name" "jwt-access-expiry" "$JWT_EXPIRY"
    fi

    if [[ -n "$JWT_REFRESH_EXPIRY" ]]; then
        set_secret "$vault_name" "jwt-refresh-expiry" "$JWT_REFRESH_EXPIRY"
    fi

    # Stripe keys
    if [[ -n "$STRIPE_SECRET_KEY" ]]; then
        set_secret "$vault_name" "stripe-secret-key" "$STRIPE_SECRET_KEY"
    fi

    if [[ -n "$STRIPE_PUBLISHABLE_KEY" ]]; then
        set_secret "$vault_name" "stripe-publishable-key" "$STRIPE_PUBLISHABLE_KEY"
    fi

    if [[ -n "$STRIPE_WEBHOOK_SECRET" ]]; then
        set_secret "$vault_name" "stripe-webhook-secret" "$STRIPE_WEBHOOK_SECRET"
    fi

    # AWS SES credentials
    if [[ -n "$AWS_ACCESS_KEY_ID" ]]; then
        set_secret "$vault_name" "aws-access-key-id" "$AWS_ACCESS_KEY_ID"
    fi

    if [[ -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        set_secret "$vault_name" "aws-secret-access-key" "$AWS_SECRET_ACCESS_KEY"
    fi

    if [[ -n "$AWS_REGION" ]]; then
        set_secret "$vault_name" "aws-region" "$AWS_REGION"
    fi

    if [[ -n "$EMAIL_FROM" ]]; then
        set_secret "$vault_name" "email-from" "$EMAIL_FROM"
    fi

    # OpenAI API key
    if [[ -n "$OPENAI_API_KEY" ]]; then
        set_secret "$vault_name" "openai-api-key" "$OPENAI_API_KEY"
    fi

    if [[ -n "$OPENAI_MODEL" ]]; then
        set_secret "$vault_name" "openai-model" "$OPENAI_MODEL"
    fi

    # Google OAuth
    if [[ -n "$GOOGLE_CLIENT_ID" ]]; then
        set_secret "$vault_name" "google-client-id" "$GOOGLE_CLIENT_ID"
    fi

    if [[ -n "$GOOGLE_CLIENT_SECRET" ]]; then
        set_secret "$vault_name" "google-client-secret" "$GOOGLE_CLIENT_SECRET"
    fi

    # Facebook OAuth
    if [[ -n "$FACEBOOK_APP_ID" ]]; then
        set_secret "$vault_name" "facebook-app-id" "$FACEBOOK_APP_ID"
    fi

    if [[ -n "$FACEBOOK_APP_SECRET" ]]; then
        set_secret "$vault_name" "facebook-app-secret" "$FACEBOOK_APP_SECRET"
    fi

    # Elasticsearch credentials
    if [[ -n "$ELASTICSEARCH_NODE" ]]; then
        set_secret "$vault_name" "elasticsearch-node" "$ELASTICSEARCH_NODE"
    fi

    if [[ -n "$ELASTICSEARCH_USERNAME" ]]; then
        set_secret "$vault_name" "elasticsearch-username" "$ELASTICSEARCH_USERNAME"
    fi

    if [[ -n "$ELASTICSEARCH_PASSWORD" ]]; then
        set_secret "$vault_name" "elasticsearch-password" "$ELASTICSEARCH_PASSWORD"
    fi

    # Session secret
    if [[ -n "$SESSION_SECRET" ]]; then
        set_secret "$vault_name" "session-secret" "$SESSION_SECRET"
    fi

    print_success "All secrets pushed successfully to Azure Key Vault"
}

pull_secrets() {
    local env=$1
    validate_environment "$env"

    local vault_name=$(get_key_vault_name "$env")

    print_info "Pulling secrets from Azure Key Vault: $vault_name"

    local env_content="# Broxiva Environment Variables\n"
    env_content+="# Generated from Azure Key Vault on $(date)\n"
    env_content+="# Environment: $env\n\n"

    # PostgreSQL
    local postgres_url=$(get_secret "$vault_name" "postgres-url")
    if [[ -n "$postgres_url" ]]; then
        env_content+="# Database\n"
        env_content+="DATABASE_URL=${postgres_url}\n"

        local postgres_user=$(get_secret "$vault_name" "postgres-username")
        [[ -n "$postgres_user" ]] && env_content+="POSTGRES_USER=${postgres_user}\n"

        local postgres_pass=$(get_secret "$vault_name" "postgres-password")
        [[ -n "$postgres_pass" ]] && env_content+="POSTGRES_PASSWORD=${postgres_pass}\n"

        local postgres_host=$(get_secret "$vault_name" "postgres-host")
        [[ -n "$postgres_host" ]] && env_content+="POSTGRES_HOST=${postgres_host}\n"

        local postgres_port=$(get_secret "$vault_name" "postgres-port")
        [[ -n "$postgres_port" ]] && env_content+="POSTGRES_PORT=${postgres_port}\n"

        local postgres_db=$(get_secret "$vault_name" "postgres-database")
        [[ -n "$postgres_db" ]] && env_content+="POSTGRES_DB=${postgres_db}\n\n"
    fi

    # Redis
    local redis_url=$(get_secret "$vault_name" "redis-url")
    if [[ -n "$redis_url" ]]; then
        env_content+="# Redis\n"
        env_content+="REDIS_URL=${redis_url}\n"

        local redis_pass=$(get_secret "$vault_name" "redis-password")
        [[ -n "$redis_pass" ]] && env_content+="REDIS_PASSWORD=${redis_pass}\n"

        local redis_host=$(get_secret "$vault_name" "redis-host")
        [[ -n "$redis_host" ]] && env_content+="REDIS_HOST=${redis_host}\n"

        local redis_port=$(get_secret "$vault_name" "redis-port")
        [[ -n "$redis_port" ]] && env_content+="REDIS_PORT=${redis_port}\n\n"
    fi

    # JWT
    local jwt_access=$(get_secret "$vault_name" "jwt-access-secret")
    if [[ -n "$jwt_access" ]]; then
        env_content+="# JWT\n"
        env_content+="JWT_SECRET=${jwt_access}\n"

        local jwt_refresh=$(get_secret "$vault_name" "jwt-refresh-secret")
        [[ -n "$jwt_refresh" ]] && env_content+="JWT_REFRESH_SECRET=${jwt_refresh}\n"

        local jwt_access_expiry=$(get_secret "$vault_name" "jwt-access-expiry")
        [[ -n "$jwt_access_expiry" ]] && env_content+="JWT_EXPIRY=${jwt_access_expiry}\n"

        local jwt_refresh_expiry=$(get_secret "$vault_name" "jwt-refresh-expiry")
        [[ -n "$jwt_refresh_expiry" ]] && env_content+="JWT_REFRESH_EXPIRY=${jwt_refresh_expiry}\n\n"
    fi

    # Stripe
    local stripe_secret=$(get_secret "$vault_name" "stripe-secret-key")
    if [[ -n "$stripe_secret" ]]; then
        env_content+="# Stripe\n"
        env_content+="STRIPE_SECRET_KEY=${stripe_secret}\n"

        local stripe_public=$(get_secret "$vault_name" "stripe-publishable-key")
        [[ -n "$stripe_public" ]] && env_content+="STRIPE_PUBLISHABLE_KEY=${stripe_public}\n"

        local stripe_webhook=$(get_secret "$vault_name" "stripe-webhook-secret")
        [[ -n "$stripe_webhook" ]] && env_content+="STRIPE_WEBHOOK_SECRET=${stripe_webhook}\n\n"
    fi

    # AWS SES
    local aws_access=$(get_secret "$vault_name" "aws-access-key-id")
    if [[ -n "$aws_access" ]]; then
        env_content+="# AWS SES\n"
        env_content+="AWS_ACCESS_KEY_ID=${aws_access}\n"

        local aws_secret=$(get_secret "$vault_name" "aws-secret-access-key")
        [[ -n "$aws_secret" ]] && env_content+="AWS_SECRET_ACCESS_KEY=${aws_secret}\n"

        local aws_region=$(get_secret "$vault_name" "aws-region")
        [[ -n "$aws_region" ]] && env_content+="AWS_REGION=${aws_region}\n"

        local email_from=$(get_secret "$vault_name" "email-from")
        [[ -n "$email_from" ]] && env_content+="EMAIL_FROM=${email_from}\n\n"
    fi

    # OpenAI
    local openai_key=$(get_secret "$vault_name" "openai-api-key")
    if [[ -n "$openai_key" ]]; then
        env_content+="# OpenAI\n"
        env_content+="OPENAI_API_KEY=${openai_key}\n"

        local openai_model=$(get_secret "$vault_name" "openai-model")
        [[ -n "$openai_model" ]] && env_content+="OPENAI_MODEL=${openai_model}\n\n"
    fi

    # Google OAuth
    local google_id=$(get_secret "$vault_name" "google-client-id")
    if [[ -n "$google_id" ]]; then
        env_content+="# Google OAuth\n"
        env_content+="GOOGLE_CLIENT_ID=${google_id}\n"

        local google_secret=$(get_secret "$vault_name" "google-client-secret")
        [[ -n "$google_secret" ]] && env_content+="GOOGLE_CLIENT_SECRET=${google_secret}\n\n"
    fi

    # Facebook OAuth
    local facebook_id=$(get_secret "$vault_name" "facebook-app-id")
    if [[ -n "$facebook_id" ]]; then
        env_content+="# Facebook OAuth\n"
        env_content+="FACEBOOK_APP_ID=${facebook_id}\n"

        local facebook_secret=$(get_secret "$vault_name" "facebook-app-secret")
        [[ -n "$facebook_secret" ]] && env_content+="FACEBOOK_APP_SECRET=${facebook_secret}\n\n"
    fi

    # Elasticsearch
    local es_node=$(get_secret "$vault_name" "elasticsearch-node")
    if [[ -n "$es_node" ]]; then
        env_content+="# Elasticsearch\n"
        env_content+="ELASTICSEARCH_NODE=${es_node}\n"

        local es_user=$(get_secret "$vault_name" "elasticsearch-username")
        [[ -n "$es_user" ]] && env_content+="ELASTICSEARCH_USERNAME=${es_user}\n"

        local es_pass=$(get_secret "$vault_name" "elasticsearch-password")
        [[ -n "$es_pass" ]] && env_content+="ELASTICSEARCH_PASSWORD=${es_pass}\n\n"
    fi

    # Session
    local session=$(get_secret "$vault_name" "session-secret")
    if [[ -n "$session" ]]; then
        env_content+="# Session\n"
        env_content+="SESSION_SECRET=${session}\n\n"
    fi

    # Write to .env file
    echo -e "$env_content" > "$ENV_FILE"
    print_success "Secrets pulled successfully and written to $ENV_FILE"
}

list_secrets() {
    local env=$1
    validate_environment "$env"

    local vault_name=$(get_key_vault_name "$env")

    print_info "Listing secrets in Azure Key Vault: $vault_name"

    az keyvault secret list \
        --vault-name "$vault_name" \
        --query "[].{Name:name,Enabled:attributes.enabled,Created:attributes.created,Updated:attributes.updated}" \
        --output table
}

backup_secrets() {
    local env=$1
    validate_environment "$env"

    local vault_name=$(get_key_vault_name "$env")
    local backup_dir="${ROOT_DIR}/backups/secrets"
    mkdir -p "$backup_dir"

    local backup_file="${backup_dir}/secrets-${env}-$(date +%Y%m%d-%H%M%S).json"

    print_info "Backing up secrets to: $backup_file"

    az keyvault secret list \
        --vault-name "$vault_name" \
        --query "[].name" \
        --output json > /tmp/secret_names.json

    local secret_names=$(cat /tmp/secret_names.json | jq -r '.[]')

    echo "{" > "$backup_file"
    local first=true

    while IFS= read -r secret_name; do
        local secret_value=$(get_secret "$vault_name" "$secret_name")
        if [[ -n "$secret_value" ]]; then
            if [[ "$first" == false ]]; then
                echo "," >> "$backup_file"
            fi
            echo "  \"$secret_name\": \"$secret_value\"" >> "$backup_file"
            first=false
        fi
    done <<< "$secret_names"

    echo "}" >> "$backup_file"

    rm /tmp/secret_names.json

    print_success "Secrets backed up to: $backup_file"
}

show_audit_logs() {
    local env=$1
    validate_environment "$env"

    local vault_name=$(get_key_vault_name "$env")
    local resource_group="${PROJECT_NAME}-rg-${env}"

    print_info "Fetching audit logs for Key Vault: $vault_name"

    az monitor activity-log list \
        --resource-group "$resource_group" \
        --resource-id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${resource_group}/providers/Microsoft.KeyVault/vaults/${vault_name}" \
        --start-time "$(date -u -d '7 days ago' '+%Y-%m-%dT%H:%M:%SZ')" \
        --query "[].{Time:eventTimestamp,User:caller,Operation:operationName.localizedValue,Status:status.localizedValue}" \
        --output table
}

show_usage() {
    cat << EOF
Broxiva Azure Key Vault Sync Script

Usage: $0 [command] [environment] [options]

Commands:
    push        Push secrets from .env file to Azure Key Vault
    pull        Pull secrets from Azure Key Vault to .env file
    list        List all secrets in Azure Key Vault
    backup      Backup all secrets to a local JSON file
    audit       Show audit logs for Key Vault access

Environments:
    dev         Development environment
    staging     Staging environment
    production  Production environment

Options:
    -p, --project   Project name (default: broxiva)
    -h, --help      Show this help message

Examples:
    $0 push production
    $0 pull dev
    $0 list staging
    $0 backup production
    $0 audit production

Prerequisites:
    - Azure CLI installed and logged in (az login)
    - Appropriate permissions to access Key Vault
    - jq installed for JSON processing

Environment Variables:
    PROJECT_NAME    Project name prefix for Key Vault

EOF
}

# Main script
main() {
    local command=$1
    local environment=$2

    check_az_cli
    check_jq
    check_login

    case "$command" in
        push)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for push command"
                show_usage
                exit 1
            fi
            push_secrets "$environment"
            ;;
        pull)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for pull command"
                show_usage
                exit 1
            fi
            pull_secrets "$environment"
            ;;
        list)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for list command"
                show_usage
                exit 1
            fi
            list_secrets "$environment"
            ;;
        backup)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for backup command"
                show_usage
                exit 1
            fi
            backup_secrets "$environment"
            ;;
        audit)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for audit command"
                show_usage
                exit 1
            fi
            show_audit_logs "$environment"
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
