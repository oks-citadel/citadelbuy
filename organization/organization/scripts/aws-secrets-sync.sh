#!/bin/bash

# Broxiva AWS Secrets Manager Sync Script
# This script synchronizes secrets between local .env files and AWS Secrets Manager
# Usage: ./aws-secrets-sync.sh [push|pull|list|rotate] [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-broxiva}"
AWS_REGION="${AWS_REGION:-us-east-1}"
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

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
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

get_secret() {
    local secret_name=$1
    aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --region "$AWS_REGION" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo ""
}

put_secret() {
    local secret_name=$1
    local secret_value=$2

    # Check if secret exists
    if aws secretsmanager describe-secret \
        --secret-id "$secret_name" \
        --region "$AWS_REGION" &>/dev/null; then
        # Update existing secret
        aws secretsmanager put-secret-value \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
        print_success "Updated secret: $secret_name"
    else
        print_warning "Secret does not exist: $secret_name. Creating it..."
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
        print_success "Created secret: $secret_name"
    fi
}

push_secrets() {
    local env=$1
    validate_environment "$env"

    print_info "Pushing secrets to AWS Secrets Manager for environment: $env"

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
        local postgres_secret=$(jq -n \
            --arg url "$DATABASE_URL" \
            --arg user "${POSTGRES_USER:-broxiva_admin}" \
            --arg pass "${POSTGRES_PASSWORD:-}" \
            --arg host "${POSTGRES_HOST:-localhost}" \
            --arg port "${POSTGRES_PORT:-5432}" \
            --arg db "${POSTGRES_DB:-broxiva}" \
            '{username: $user, password: $pass, host: $host, port: ($port|tonumber), database: $db, url: $url}')

        put_secret "$PROJECT_NAME/$env/postgres/credentials" "$postgres_secret"
    fi

    # Redis credentials
    if [[ -n "$REDIS_URL" ]]; then
        local redis_secret=$(jq -n \
            --arg url "$REDIS_URL" \
            --arg pass "${REDIS_PASSWORD:-}" \
            --arg host "${REDIS_HOST:-localhost}" \
            --arg port "${REDIS_PORT:-6379}" \
            '{password: $pass, host: $host, port: ($port|tonumber), url: $url}')

        put_secret "$PROJECT_NAME/$env/redis/credentials" "$redis_secret"
    fi

    # JWT secrets
    if [[ -n "$JWT_SECRET" ]]; then
        local jwt_secret=$(jq -n \
            --arg access "$JWT_SECRET" \
            --arg refresh "${JWT_REFRESH_SECRET:-$JWT_SECRET}" \
            --arg access_expiry "${JWT_EXPIRY:-15m}" \
            --arg refresh_expiry "${JWT_REFRESH_EXPIRY:-7d}" \
            '{access_token_secret: $access, refresh_token_secret: $refresh, access_token_expiry: $access_expiry, refresh_token_expiry: $refresh_expiry}')

        put_secret "$PROJECT_NAME/$env/jwt/secrets" "$jwt_secret"
    fi

    # Stripe keys
    if [[ -n "$STRIPE_SECRET_KEY" ]]; then
        local stripe_secret=$(jq -n \
            --arg secret "$STRIPE_SECRET_KEY" \
            --arg public "${STRIPE_PUBLISHABLE_KEY:-}" \
            --arg webhook "${STRIPE_WEBHOOK_SECRET:-}" \
            '{secret_key: $secret, publishable_key: $public, webhook_secret: $webhook}')

        put_secret "$PROJECT_NAME/$env/stripe/keys" "$stripe_secret"
    fi

    # AWS SES credentials
    if [[ -n "$AWS_ACCESS_KEY_ID" ]] && [[ -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        local ses_secret=$(jq -n \
            --arg access "$AWS_ACCESS_KEY_ID" \
            --arg secret "$AWS_SECRET_ACCESS_KEY" \
            --arg region "${AWS_REGION:-us-east-1}" \
            --arg from "${EMAIL_FROM:-noreply@broxiva.com}" \
            '{access_key_id: $access, secret_access_key: $secret, region: $region, from_email: $from}')

        put_secret "$PROJECT_NAME/$env/ses/credentials" "$ses_secret"
    fi

    # OpenAI API key
    if [[ -n "$OPENAI_API_KEY" ]]; then
        local openai_secret=$(jq -n \
            --arg key "$OPENAI_API_KEY" \
            --arg model "${OPENAI_MODEL:-gpt-4}" \
            '{api_key: $key, model: $model}')

        put_secret "$PROJECT_NAME/$env/openai/key" "$openai_secret"
    fi

    # Google OAuth
    if [[ -n "$GOOGLE_CLIENT_ID" ]] && [[ -n "$GOOGLE_CLIENT_SECRET" ]]; then
        local google_secret=$(jq -n \
            --arg id "$GOOGLE_CLIENT_ID" \
            --arg secret "$GOOGLE_CLIENT_SECRET" \
            '{client_id: $id, client_secret: $secret}')

        put_secret "$PROJECT_NAME/$env/oauth/google" "$google_secret"
    fi

    # Facebook OAuth
    if [[ -n "$FACEBOOK_APP_ID" ]] && [[ -n "$FACEBOOK_APP_SECRET" ]]; then
        local facebook_secret=$(jq -n \
            --arg id "$FACEBOOK_APP_ID" \
            --arg secret "$FACEBOOK_APP_SECRET" \
            '{app_id: $id, app_secret: $secret}')

        put_secret "$PROJECT_NAME/$env/oauth/facebook" "$facebook_secret"
    fi

    # Elasticsearch credentials
    if [[ -n "$ELASTICSEARCH_NODE" ]]; then
        local es_secret=$(jq -n \
            --arg node "$ELASTICSEARCH_NODE" \
            --arg user "${ELASTICSEARCH_USERNAME:-elastic}" \
            --arg pass "${ELASTICSEARCH_PASSWORD:-}" \
            '{node: $node, username: $user, password: $pass}')

        put_secret "$PROJECT_NAME/$env/elasticsearch/credentials" "$es_secret"
    fi

    # Session secret
    if [[ -n "$SESSION_SECRET" ]]; then
        local session_secret=$(jq -n \
            --arg secret "$SESSION_SECRET" \
            '{secret: $secret}')

        put_secret "$PROJECT_NAME/$env/session/secret" "$session_secret"
    fi

    print_success "All secrets pushed successfully to AWS Secrets Manager"
}

pull_secrets() {
    local env=$1
    validate_environment "$env"

    print_info "Pulling secrets from AWS Secrets Manager for environment: $env"

    local env_content="# Broxiva Environment Variables\n"
    env_content+="# Generated from AWS Secrets Manager on $(date)\n"
    env_content+="# Environment: $env\n\n"

    # PostgreSQL
    local postgres=$(get_secret "$PROJECT_NAME/$env/postgres/credentials")
    if [[ -n "$postgres" ]]; then
        env_content+="# Database\n"
        env_content+="DATABASE_URL=$(echo "$postgres" | jq -r '.url')\n"
        env_content+="POSTGRES_USER=$(echo "$postgres" | jq -r '.username')\n"
        env_content+="POSTGRES_PASSWORD=$(echo "$postgres" | jq -r '.password')\n"
        env_content+="POSTGRES_HOST=$(echo "$postgres" | jq -r '.host')\n"
        env_content+="POSTGRES_PORT=$(echo "$postgres" | jq -r '.port')\n"
        env_content+="POSTGRES_DB=$(echo "$postgres" | jq -r '.database')\n\n"
    fi

    # Redis
    local redis=$(get_secret "$PROJECT_NAME/$env/redis/credentials")
    if [[ -n "$redis" ]]; then
        env_content+="# Redis\n"
        env_content+="REDIS_URL=$(echo "$redis" | jq -r '.url')\n"
        env_content+="REDIS_HOST=$(echo "$redis" | jq -r '.host')\n"
        env_content+="REDIS_PORT=$(echo "$redis" | jq -r '.port')\n"
        env_content+="REDIS_PASSWORD=$(echo "$redis" | jq -r '.password')\n\n"
    fi

    # JWT
    local jwt=$(get_secret "$PROJECT_NAME/$env/jwt/secrets")
    if [[ -n "$jwt" ]]; then
        env_content+="# JWT\n"
        env_content+="JWT_SECRET=$(echo "$jwt" | jq -r '.access_token_secret')\n"
        env_content+="JWT_REFRESH_SECRET=$(echo "$jwt" | jq -r '.refresh_token_secret')\n"
        env_content+="JWT_EXPIRY=$(echo "$jwt" | jq -r '.access_token_expiry')\n"
        env_content+="JWT_REFRESH_EXPIRY=$(echo "$jwt" | jq -r '.refresh_token_expiry')\n\n"
    fi

    # Stripe
    local stripe=$(get_secret "$PROJECT_NAME/$env/stripe/keys")
    if [[ -n "$stripe" ]]; then
        env_content+="# Stripe\n"
        env_content+="STRIPE_SECRET_KEY=$(echo "$stripe" | jq -r '.secret_key')\n"
        env_content+="STRIPE_PUBLISHABLE_KEY=$(echo "$stripe" | jq -r '.publishable_key')\n"
        env_content+="STRIPE_WEBHOOK_SECRET=$(echo "$stripe" | jq -r '.webhook_secret')\n\n"
    fi

    # AWS SES
    local ses=$(get_secret "$PROJECT_NAME/$env/ses/credentials")
    if [[ -n "$ses" ]]; then
        env_content+="# AWS SES\n"
        env_content+="AWS_ACCESS_KEY_ID=$(echo "$ses" | jq -r '.access_key_id')\n"
        env_content+="AWS_SECRET_ACCESS_KEY=$(echo "$ses" | jq -r '.secret_access_key')\n"
        env_content+="AWS_REGION=$(echo "$ses" | jq -r '.region')\n"
        env_content+="EMAIL_FROM=$(echo "$ses" | jq -r '.from_email')\n\n"
    fi

    # OpenAI
    local openai=$(get_secret "$PROJECT_NAME/$env/openai/key")
    if [[ -n "$openai" ]]; then
        env_content+="# OpenAI\n"
        env_content+="OPENAI_API_KEY=$(echo "$openai" | jq -r '.api_key')\n"
        env_content+="OPENAI_MODEL=$(echo "$openai" | jq -r '.model')\n\n"
    fi

    # Google OAuth
    local google=$(get_secret "$PROJECT_NAME/$env/oauth/google")
    if [[ -n "$google" ]]; then
        env_content+="# Google OAuth\n"
        env_content+="GOOGLE_CLIENT_ID=$(echo "$google" | jq -r '.client_id')\n"
        env_content+="GOOGLE_CLIENT_SECRET=$(echo "$google" | jq -r '.client_secret')\n\n"
    fi

    # Facebook OAuth
    local facebook=$(get_secret "$PROJECT_NAME/$env/oauth/facebook")
    if [[ -n "$facebook" ]]; then
        env_content+="# Facebook OAuth\n"
        env_content+="FACEBOOK_APP_ID=$(echo "$facebook" | jq -r '.app_id')\n"
        env_content+="FACEBOOK_APP_SECRET=$(echo "$facebook" | jq -r '.app_secret')\n\n"
    fi

    # Elasticsearch
    local elasticsearch=$(get_secret "$PROJECT_NAME/$env/elasticsearch/credentials")
    if [[ -n "$elasticsearch" ]]; then
        env_content+="# Elasticsearch\n"
        env_content+="ELASTICSEARCH_NODE=$(echo "$elasticsearch" | jq -r '.node')\n"
        env_content+="ELASTICSEARCH_USERNAME=$(echo "$elasticsearch" | jq -r '.username')\n"
        env_content+="ELASTICSEARCH_PASSWORD=$(echo "$elasticsearch" | jq -r '.password')\n\n"
    fi

    # Session
    local session=$(get_secret "$PROJECT_NAME/$env/session/secret")
    if [[ -n "$session" ]]; then
        env_content+="# Session\n"
        env_content+="SESSION_SECRET=$(echo "$session" | jq -r '.secret')\n\n"
    fi

    # Write to .env file
    echo -e "$env_content" > "$ENV_FILE"
    print_success "Secrets pulled successfully and written to $ENV_FILE"
}

list_secrets() {
    local env=$1
    validate_environment "$env"

    print_info "Listing secrets in AWS Secrets Manager for environment: $env"

    aws secretsmanager list-secrets \
        --region "$AWS_REGION" \
        --query "SecretList[?starts_with(Name, '${PROJECT_NAME}/${env}/')].{Name:Name,Description:Description,LastChanged:LastChangedDate}" \
        --output table
}

rotate_secret() {
    local env=$1
    local secret_type=$2

    validate_environment "$env"

    if [[ -z "$secret_type" ]]; then
        print_error "Secret type is required. Options: postgres, redis, jwt, session"
        exit 1
    fi

    local secret_name="$PROJECT_NAME/$env/$secret_type"

    print_info "Rotating secret: $secret_name"

    aws secretsmanager rotate-secret \
        --secret-id "$secret_name" \
        --region "$AWS_REGION"

    print_success "Secret rotation initiated for: $secret_name"
    print_info "Note: Rotation may take a few minutes to complete"
}

backup_secrets() {
    local env=$1
    validate_environment "$env"

    local backup_dir="${ROOT_DIR}/backups/secrets"
    mkdir -p "$backup_dir"

    local backup_file="${backup_dir}/secrets-${env}-$(date +%Y%m%d-%H%M%S).json"

    print_info "Backing up secrets to: $backup_file"

    local secrets=$(aws secretsmanager list-secrets \
        --region "$AWS_REGION" \
        --query "SecretList[?starts_with(Name, '${PROJECT_NAME}/${env}/')].Name" \
        --output json | jq -r '.[]')

    echo "{" > "$backup_file"
    local first=true

    while IFS= read -r secret_name; do
        local secret_value=$(get_secret "$secret_name")
        if [[ -n "$secret_value" ]]; then
            if [[ "$first" == false ]]; then
                echo "," >> "$backup_file"
            fi
            echo "  \"$secret_name\": $secret_value" >> "$backup_file"
            first=false
        fi
    done <<< "$secrets"

    echo "}" >> "$backup_file"

    print_success "Secrets backed up to: $backup_file"
}

show_usage() {
    cat << EOF
Broxiva AWS Secrets Manager Sync Script

Usage: $0 [command] [environment] [options]

Commands:
    push        Push secrets from .env file to AWS Secrets Manager
    pull        Pull secrets from AWS Secrets Manager to .env file
    list        List all secrets in AWS Secrets Manager
    rotate      Rotate a specific secret
    backup      Backup all secrets to a local JSON file

Environments:
    dev         Development environment
    staging     Staging environment
    production  Production environment

Options:
    -r, --region    AWS region (default: us-east-1)
    -p, --project   Project name (default: broxiva)
    -h, --help      Show this help message

Examples:
    $0 push production
    $0 pull dev
    $0 list staging
    $0 rotate production jwt
    $0 backup production

Environment Variables:
    AWS_REGION      AWS region to use
    PROJECT_NAME    Project name prefix for secrets

EOF
}

# Main script
main() {
    local command=$1
    local environment=$2

    check_aws_cli
    check_jq

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
        rotate)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for rotate command"
                show_usage
                exit 1
            fi
            rotate_secret "$environment" "$3"
            ;;
        backup)
            if [[ -z "$environment" ]]; then
                print_error "Environment is required for backup command"
                show_usage
                exit 1
            fi
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
