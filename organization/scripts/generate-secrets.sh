#!/bin/bash

################################################################################
# CitadelBuy Production Secrets Generator
################################################################################
# This script generates cryptographically secure secrets for production use.
#
# Usage:
#   ./generate-secrets.sh [OPTIONS]
#
# Options:
#   --output FILE    Write secrets to specified file (default: .env.secrets)
#   --format FORMAT  Output format: env, json, yaml (default: env)
#   --validate       Validate existing secrets instead of generating new ones
#   --help           Show this help message
#
# Security Requirements:
#   - JWT_SECRET: Minimum 64 characters (base64 encoded)
#   - JWT_REFRESH_SECRET: Minimum 64 characters (MUST differ from JWT_SECRET)
#   - ENCRYPTION_KEY: Exactly 64 hex characters (32 bytes for AES-256)
#   - All passwords: Minimum 32 characters
#
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
OUTPUT_FILE=".env.secrets"
OUTPUT_FORMAT="env"
VALIDATE_MODE=false

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BLUE}CitadelBuy Production Secrets Generator${NC}                        ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_section() {
    echo ""
    echo -e "${CYAN}═══ $1 ═══${NC}"
    echo ""
}

show_help() {
    cat << EOF
CitadelBuy Production Secrets Generator

Usage:
    ./generate-secrets.sh [OPTIONS]

Options:
    --output FILE       Write secrets to specified file (default: .env.secrets)
    --format FORMAT     Output format: env, json, yaml (default: env)
    --validate          Validate existing secrets instead of generating
    --help              Show this help message

Examples:
    # Generate secrets to default file
    ./generate-secrets.sh

    # Generate secrets to custom file
    ./generate-secrets.sh --output .env.production

    # Generate secrets in JSON format
    ./generate-secrets.sh --format json --output secrets.json

    # Validate existing secrets
    ./generate-secrets.sh --validate --output .env

Security Notes:
    - All secrets are generated using cryptographically secure methods
    - JWT secrets are 64+ characters (base64 encoded)
    - Encryption keys are 64 hex characters (32 bytes)
    - Passwords are 32+ characters with high entropy
    - NEVER commit generated secrets to version control
    - Store production secrets in a secure secrets manager

EOF
}

check_dependencies() {
    local missing_deps=()

    if ! command -v openssl &> /dev/null; then
        missing_deps+=("openssl")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_info "Please install missing dependencies and try again"
        exit 1
    fi

    print_success "All dependencies available"
}

################################################################################
# Secret Generation Functions
################################################################################

generate_jwt_secret() {
    # Generate 64-character base64 JWT secret
    openssl rand -base64 64 | tr -d '\n'
}

generate_encryption_key() {
    # Generate 64-character hex encryption key (32 bytes)
    openssl rand -hex 32 | tr -d '\n'
}

generate_password() {
    # Generate 32-character password with high entropy
    openssl rand -base64 32 | tr -d '\n' | head -c 32
}

generate_strong_password() {
    # Generate 48-character password for critical services
    openssl rand -base64 48 | tr -d '\n' | head -c 48
}

generate_api_key() {
    # Generate API key format (prefix + random string)
    local prefix=$1
    local random=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)
    echo "${prefix}_${random}"
}

################################################################################
# Validation Functions
################################################################################

validate_jwt_secret() {
    local secret=$1
    local name=$2
    local length=${#secret}

    if [ $length -lt 64 ]; then
        print_error "${name}: Too short (${length} chars, minimum 64 required)"
        return 1
    fi

    # Check for common weak patterns
    if [[ "$secret" == *"changeme"* ]] || \
       [[ "$secret" == *"your-"* ]] || \
       [[ "$secret" == *"example"* ]] || \
       [[ "$secret" == *"test"* ]]; then
        print_error "${name}: Contains placeholder or weak pattern"
        return 1
    fi

    print_success "${name}: Valid (${length} chars)"
    return 0
}

validate_encryption_key() {
    local key=$1
    local length=${#key}

    if [ $length -ne 64 ]; then
        print_error "ENCRYPTION_KEY: Invalid length (${length} chars, must be exactly 64)"
        return 1
    fi

    # Check if valid hex
    if ! [[ "$key" =~ ^[0-9a-fA-F]{64}$ ]]; then
        print_error "ENCRYPTION_KEY: Not valid hexadecimal"
        return 1
    fi

    # Check for weak patterns
    if [[ "$key" =~ ^0+$ ]] || [[ "$key" =~ ^1+$ ]] || [[ "$key" =~ ^(01)+$ ]]; then
        print_error "ENCRYPTION_KEY: Contains weak pattern"
        return 1
    fi

    print_success "ENCRYPTION_KEY: Valid (64 hex chars)"
    return 0
}

validate_password() {
    local password=$1
    local name=$2
    local length=${#password}

    if [ $length -lt 32 ]; then
        print_error "${name}: Too short (${length} chars, minimum 32 required)"
        return 1
    fi

    # Check for common weak patterns
    if [[ "$password" == *"password"* ]] || \
       [[ "$password" == *"changeme"* ]] || \
       [[ "$password" == *"your_"* ]] || \
       [[ "$password" == *"admin"* ]]; then
        print_error "${name}: Contains weak or placeholder pattern"
        return 1
    fi

    print_success "${name}: Valid (${length} chars)"
    return 0
}

validate_secrets_file() {
    local file=$1

    if [ ! -f "$file" ]; then
        print_error "File not found: $file"
        return 1
    fi

    print_section "Validating Secrets File: $file"

    local validation_failed=false

    # Load environment variables from file
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        # Remove quotes and whitespace
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e 's/^'"'"'//' -e "s/'$//")

        case "$key" in
            JWT_SECRET)
                validate_jwt_secret "$value" "JWT_SECRET" || validation_failed=true
                ;;
            JWT_REFRESH_SECRET)
                validate_jwt_secret "$value" "JWT_REFRESH_SECRET" || validation_failed=true
                ;;
            ENCRYPTION_KEY|KYC_ENCRYPTION_KEY)
                validate_encryption_key "$value" || validation_failed=true
                ;;
            *PASSWORD*|*_PASSWORD)
                validate_password "$value" "$key" || validation_failed=true
                ;;
        esac
    done < "$file"

    # Check that JWT secrets are different
    if [ -f "$file" ]; then
        JWT_SECRET=$(grep "^JWT_SECRET=" "$file" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        JWT_REFRESH_SECRET=$(grep "^JWT_REFRESH_SECRET=" "$file" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

        if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" = "$JWT_REFRESH_SECRET" ]; then
            print_error "JWT_SECRET and JWT_REFRESH_SECRET must be different!"
            validation_failed=true
        fi
    fi

    echo ""
    if [ "$validation_failed" = true ]; then
        print_error "Validation failed! Please fix the issues above."
        return 1
    else
        print_success "All secrets validated successfully!"
        return 0
    fi
}

################################################################################
# Output Functions
################################################################################

output_env_format() {
    local output_file=$1

    cat > "$output_file" << EOF
################################################################################
# CitadelBuy Production Secrets
################################################################################
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
#
# SECURITY WARNING:
#   - NEVER commit this file to version control
#   - Store securely in production secrets manager
#   - Rotate secrets regularly (every 90 days recommended)
#   - Use different secrets for dev/staging/production
#
################################################################################

# =============================================================================
# JWT Authentication Secrets
# =============================================================================
# CRITICAL: These secrets sign and verify JWT tokens
# If compromised, attackers can forge authentication tokens
# Must be at least 64 characters, cryptographically random
# Must be different from each other
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# =============================================================================
# Encryption Keys
# =============================================================================
# CRITICAL: Used for encrypting sensitive data (KYC, PII)
# Must be exactly 64 hex characters (32 bytes for AES-256)
# If lost, encrypted data cannot be recovered
# If compromised, all encrypted data is at risk
ENCRYPTION_KEY=${ENCRYPTION_KEY}
KYC_ENCRYPTION_KEY=${KYC_ENCRYPTION_KEY}

# =============================================================================
# Database Credentials
# =============================================================================
# PostgreSQL database password
# Used in DATABASE_URL connection string
POSTGRES_USER=citadelbuy
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=citadelbuy_production

# Full database connection URL
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://citadelbuy:${POSTGRES_PASSWORD}@localhost:5432/citadelbuy_production?schema=public

# =============================================================================
# Redis Cache/Session Store
# =============================================================================
# Redis password for cache and session storage
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379

# =============================================================================
# Session Secret
# =============================================================================
# Used for session cookie signing
SESSION_SECRET=${SESSION_SECRET}

# =============================================================================
# Message Queue (RabbitMQ)
# =============================================================================
RABBITMQ_USER=citadelbuy
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
RABBITMQ_URL=amqp://citadelbuy:${RABBITMQ_PASSWORD}@localhost:5672

# =============================================================================
# Object Storage (MinIO/S3-compatible)
# =============================================================================
MINIO_ROOT_USER=citadelbuy_admin
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}

# =============================================================================
# Admin Dashboard Credentials
# =============================================================================
# Grafana monitoring dashboard
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}

# pgAdmin database management
PGADMIN_DEFAULT_EMAIL=admin@citadelbuy.com
PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}

# =============================================================================
# API Keys (Internal Services)
# =============================================================================
# Internal API keys for service-to-service communication
INTERNAL_API_KEY=${INTERNAL_API_KEY}
WEBHOOK_SECRET=${WEBHOOK_SECRET}

# =============================================================================
# Elasticsearch (Search Service)
# =============================================================================
ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}

# =============================================================================
# NOTES
# =============================================================================
# 1. Copy this file to your secure location
# 2. Add to .gitignore to prevent accidental commits
# 3. In production, store in secrets manager:
#    - AWS Secrets Manager
#    - Azure Key Vault
#    - Google Secret Manager
#    - HashiCorp Vault
# 4. Set up secret rotation schedule (90 days recommended)
# 5. Monitor for unauthorized access attempts
# 6. Keep backups in secure, encrypted storage
#
################################################################################
EOF

    print_success "Secrets written to: $output_file"
}

output_json_format() {
    local output_file=$1

    cat > "$output_file" << EOF
{
  "_meta": {
    "generated": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
    "version": "1.0.0",
    "warning": "NEVER commit this file to version control"
  },
  "authentication": {
    "jwt_secret": "${JWT_SECRET}",
    "jwt_refresh_secret": "${JWT_REFRESH_SECRET}",
    "jwt_expires_in": "7d",
    "jwt_refresh_expires_in": "30d",
    "session_secret": "${SESSION_SECRET}"
  },
  "encryption": {
    "encryption_key": "${ENCRYPTION_KEY}",
    "kyc_encryption_key": "${KYC_ENCRYPTION_KEY}"
  },
  "database": {
    "postgres_user": "citadelbuy",
    "postgres_password": "${POSTGRES_PASSWORD}",
    "postgres_db": "citadelbuy_production",
    "database_url": "postgresql://citadelbuy:${POSTGRES_PASSWORD}@localhost:5432/citadelbuy_production?schema=public"
  },
  "cache": {
    "redis_password": "${REDIS_PASSWORD}",
    "redis_url": "redis://:${REDIS_PASSWORD}@localhost:6379"
  },
  "message_queue": {
    "rabbitmq_user": "citadelbuy",
    "rabbitmq_password": "${RABBITMQ_PASSWORD}",
    "rabbitmq_url": "amqp://citadelbuy:${RABBITMQ_PASSWORD}@localhost:5672"
  },
  "storage": {
    "minio_root_user": "citadelbuy_admin",
    "minio_root_password": "${MINIO_ROOT_PASSWORD}",
    "minio_access_key": "${MINIO_ACCESS_KEY}",
    "minio_secret_key": "${MINIO_SECRET_KEY}"
  },
  "admin_tools": {
    "grafana_admin_user": "admin",
    "grafana_admin_password": "${GRAFANA_ADMIN_PASSWORD}",
    "pgadmin_default_email": "admin@citadelbuy.com",
    "pgadmin_default_password": "${PGADMIN_DEFAULT_PASSWORD}"
  },
  "internal": {
    "internal_api_key": "${INTERNAL_API_KEY}",
    "webhook_secret": "${WEBHOOK_SECRET}"
  },
  "search": {
    "elasticsearch_password": "${ELASTICSEARCH_PASSWORD}"
  }
}
EOF

    print_success "Secrets written to: $output_file (JSON format)"
}

output_yaml_format() {
    local output_file=$1

    cat > "$output_file" << EOF
# CitadelBuy Production Secrets
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# WARNING: NEVER commit this file to version control

meta:
  generated: "$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  version: "1.0.0"

authentication:
  jwt_secret: "${JWT_SECRET}"
  jwt_refresh_secret: "${JWT_REFRESH_SECRET}"
  jwt_expires_in: "7d"
  jwt_refresh_expires_in: "30d"
  session_secret: "${SESSION_SECRET}"

encryption:
  encryption_key: "${ENCRYPTION_KEY}"
  kyc_encryption_key: "${KYC_ENCRYPTION_KEY}"

database:
  postgres_user: "citadelbuy"
  postgres_password: "${POSTGRES_PASSWORD}"
  postgres_db: "citadelbuy_production"
  database_url: "postgresql://citadelbuy:${POSTGRES_PASSWORD}@localhost:5432/citadelbuy_production?schema=public"

cache:
  redis_password: "${REDIS_PASSWORD}"
  redis_url: "redis://:${REDIS_PASSWORD}@localhost:6379"

message_queue:
  rabbitmq_user: "citadelbuy"
  rabbitmq_password: "${RABBITMQ_PASSWORD}"
  rabbitmq_url: "amqp://citadelbuy:${RABBITMQ_PASSWORD}@localhost:5672"

storage:
  minio_root_user: "citadelbuy_admin"
  minio_root_password: "${MINIO_ROOT_PASSWORD}"
  minio_access_key: "${MINIO_ACCESS_KEY}"
  minio_secret_key: "${MINIO_SECRET_KEY}"

admin_tools:
  grafana_admin_user: "admin"
  grafana_admin_password: "${GRAFANA_ADMIN_PASSWORD}"
  pgadmin_default_email: "admin@citadelbuy.com"
  pgadmin_default_password: "${PGADMIN_DEFAULT_PASSWORD}"

internal:
  internal_api_key: "${INTERNAL_API_KEY}"
  webhook_secret: "${WEBHOOK_SECRET}"

search:
  elasticsearch_password: "${ELASTICSEARCH_PASSWORD}"
EOF

    print_success "Secrets written to: $output_file (YAML format)"
}

################################################################################
# Main Generation Logic
################################################################################

generate_all_secrets() {
    print_section "Generating Cryptographically Secure Secrets"

    # JWT Authentication
    print_info "Generating JWT secrets (64+ characters)..."
    JWT_SECRET=$(generate_jwt_secret)
    JWT_REFRESH_SECRET=$(generate_jwt_secret)

    # Ensure JWT secrets are different
    while [ "$JWT_SECRET" = "$JWT_REFRESH_SECRET" ]; do
        JWT_REFRESH_SECRET=$(generate_jwt_secret)
    done

    print_success "JWT secrets generated"

    # Encryption Keys
    print_info "Generating encryption keys (64 hex characters)..."
    ENCRYPTION_KEY=$(generate_encryption_key)
    KYC_ENCRYPTION_KEY=$(generate_encryption_key)
    print_success "Encryption keys generated"

    # Database
    print_info "Generating database password..."
    POSTGRES_PASSWORD=$(generate_strong_password)
    print_success "Database password generated"

    # Redis
    print_info "Generating Redis password..."
    REDIS_PASSWORD=$(generate_strong_password)
    print_success "Redis password generated"

    # Session
    print_info "Generating session secret..."
    SESSION_SECRET=$(generate_jwt_secret)
    print_success "Session secret generated"

    # Message Queue
    print_info "Generating RabbitMQ password..."
    RABBITMQ_PASSWORD=$(generate_strong_password)
    print_success "RabbitMQ password generated"

    # Storage
    print_info "Generating storage credentials..."
    MINIO_ROOT_PASSWORD=$(generate_strong_password)
    MINIO_ACCESS_KEY=$(generate_password)
    MINIO_SECRET_KEY=$(generate_strong_password)
    print_success "Storage credentials generated"

    # Admin Tools
    print_info "Generating admin tool passwords..."
    GRAFANA_ADMIN_PASSWORD=$(generate_strong_password)
    PGADMIN_DEFAULT_PASSWORD=$(generate_strong_password)
    print_success "Admin tool passwords generated"

    # Internal APIs
    print_info "Generating internal API keys..."
    INTERNAL_API_KEY=$(generate_api_key "cby_int")
    WEBHOOK_SECRET=$(generate_jwt_secret)
    print_success "Internal API keys generated"

    # Search
    print_info "Generating Elasticsearch password..."
    ELASTICSEARCH_PASSWORD=$(generate_strong_password)
    print_success "Elasticsearch password generated"

    print_success "All secrets generated successfully!"
}

################################################################################
# Main Script
################################################################################

main() {
    print_header

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            --format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            --validate)
                VALIDATE_MODE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Check dependencies
    check_dependencies

    # Validation mode
    if [ "$VALIDATE_MODE" = true ]; then
        validate_secrets_file "$OUTPUT_FILE"
        exit $?
    fi

    # Check if output file exists
    if [ -f "$OUTPUT_FILE" ]; then
        print_warning "Output file already exists: $OUTPUT_FILE"
        read -p "Overwrite? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy]([Ee][Ss])?$ ]]; then
            print_info "Operation cancelled"
            exit 0
        fi
    fi

    # Generate secrets
    generate_all_secrets

    # Output in requested format
    print_section "Writing Secrets to File"

    case "$OUTPUT_FORMAT" in
        env)
            output_env_format "$OUTPUT_FILE"
            ;;
        json)
            output_json_format "$OUTPUT_FILE"
            ;;
        yaml)
            output_yaml_format "$OUTPUT_FILE"
            ;;
        *)
            print_error "Unknown format: $OUTPUT_FORMAT"
            print_info "Supported formats: env, json, yaml"
            exit 1
            ;;
    esac

    # Set secure permissions
    chmod 600 "$OUTPUT_FILE"
    print_success "File permissions set to 600 (owner read/write only)"

    # Final instructions
    print_section "Next Steps"
    echo -e "${GREEN}Success!${NC} Your secrets have been generated securely."
    echo ""
    echo "Important next steps:"
    echo "  1. Review the generated file: $OUTPUT_FILE"
    echo "  2. Copy secrets to your actual .env file or secrets manager"
    echo "  3. Validate secrets: ./generate-secrets.sh --validate --output $OUTPUT_FILE"
    echo "  4. Secure the file or delete after copying"
    echo "  5. NEVER commit this file to version control"
    echo ""
    print_warning "Add to .gitignore: echo '$OUTPUT_FILE' >> .gitignore"
    echo ""
}

# Run main function
main "$@"
