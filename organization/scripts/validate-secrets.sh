#!/bin/bash

################################################################################
# CitadelBuy Secrets Validation Script
################################################################################
# Validates that all secrets meet security requirements and are production-ready
#
# Usage:
#   ./validate-secrets.sh [FILE]
#   ./validate-secrets.sh .env
#   ./validate-secrets.sh apps/api/.env
#
# Exit Codes:
#   0 - All validations passed
#   1 - Validation failures found
#   2 - File not found or invalid arguments
#
################################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BLUE}CitadelBuy Secrets Validation${NC}                                  ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNING_CHECKS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_section() {
    echo ""
    echo -e "${CYAN}═══ $1 ═══${NC}"
    echo ""
}

################################################################################
# Validation Functions
################################################################################

validate_jwt_secret() {
    local secret=$1
    local name=$2
    local length=${#secret}

    # Length check
    if [ $length -lt 64 ]; then
        print_error "${name}: Too short (${length} chars, minimum 64 required)"
        return 1
    fi

    # Check for placeholder patterns
    local weak_patterns=(
        "changeme"
        "your-"
        "your_"
        "example"
        "test"
        "placeholder"
        "replace"
        "generate"
        "minimum"
        "secret_key"
        "jwt_secret"
    )

    for pattern in "${weak_patterns[@]}"; do
        if [[ "$secret" == *"$pattern"* ]]; then
            print_error "${name}: Contains placeholder pattern '${pattern}'"
            return 1
        fi
    done

    # Check entropy (should have varied characters)
    local unique_chars=$(echo "$secret" | fold -w1 | sort -u | wc -l)
    if [ "$unique_chars" -lt 20 ]; then
        print_error "${name}: Low entropy (only ${unique_chars} unique characters)"
        return 1
    fi

    # Check for repeated patterns
    if echo "$secret" | grep -qE '(.)\1{5,}'; then
        print_error "${name}: Contains repeated character sequences"
        return 1
    fi

    print_success "${name}: Valid (${length} chars, high entropy)"
    return 0
}

validate_encryption_key() {
    local key=$1
    local name=$2
    local length=${#key}

    # Exact length check (64 hex chars = 32 bytes)
    if [ $length -ne 64 ]; then
        print_error "${name}: Invalid length (${length} chars, must be exactly 64)"
        return 1
    fi

    # Hex validation
    if ! [[ "$key" =~ ^[0-9a-fA-F]{64}$ ]]; then
        print_error "${name}: Not valid hexadecimal"
        return 1
    fi

    # Check for weak patterns
    if [[ "$key" =~ ^0+$ ]] || [[ "$key" =~ ^1+$ ]] || [[ "$key" =~ ^(01)+$ ]] || [[ "$key" =~ ^(00)+$ ]]; then
        print_error "${name}: Contains weak repetitive pattern"
        return 1
    fi

    # Check for placeholder patterns
    if [[ "$key" == *"your-"* ]] || [[ "$key" == *"changeme"* ]]; then
        print_error "${name}: Contains placeholder text"
        return 1
    fi

    # Entropy check
    local unique_chars=$(echo "$key" | fold -w1 | sort -u | wc -l)
    if [ "$unique_chars" -lt 8 ]; then
        print_error "${name}: Low entropy (only ${unique_chars} unique hex digits)"
        return 1
    fi

    print_success "${name}: Valid (64 hex chars, good entropy)"
    return 0
}

validate_password() {
    local password=$1
    local name=$2
    local length=${#password}

    # Length check
    if [ $length -lt 32 ]; then
        print_error "${name}: Too short (${length} chars, minimum 32 required)"
        return 1
    fi

    # Check for common weak passwords
    local weak_passwords=(
        "password"
        "changeme"
        "admin"
        "admin123"
        "your_"
        "your-"
        "example"
        "test123"
        "default"
        "password123"
    )

    for weak in "${weak_passwords[@]}"; do
        if [[ "$password" == *"$weak"* ]]; then
            print_error "${name}: Contains weak pattern '${weak}'"
            return 1
        fi
    done

    # Entropy check
    local unique_chars=$(echo "$password" | fold -w1 | sort -u | wc -l)
    if [ "$unique_chars" -lt 15 ]; then
        print_error "${name}: Low entropy (only ${unique_chars} unique characters)"
        return 1
    fi

    # Check for sequential patterns
    if echo "$password" | grep -qE '(abc|123|xyz|789|012)'; then
        print_warning "${name}: Contains sequential pattern (${length} chars)"
    else
        print_success "${name}: Valid (${length} chars, good entropy)"
    fi

    return 0
}

validate_database_url() {
    local url=$1

    # Check basic format
    if ! [[ "$url" =~ ^postgresql:// ]]; then
        print_error "DATABASE_URL: Invalid format (must start with postgresql://)"
        return 1
    fi

    # Check for placeholder patterns
    if [[ "$url" == *"your-"* ]] || \
       [[ "$url" == *"changeme"* ]] || \
       [[ "$url" == *"password_here"* ]] || \
       [[ "$url" == *"your_secure"* ]]; then
        print_error "DATABASE_URL: Contains placeholder password"
        return 1
    fi

    # Extract password from URL
    if [[ "$url" =~ postgresql://[^:]+:([^@]+)@ ]]; then
        local password="${BASH_REMATCH[1]}"
        local length=${#password}

        if [ $length -lt 32 ]; then
            print_error "DATABASE_URL: Embedded password too short (${length} chars)"
            return 1
        fi
    fi

    print_success "DATABASE_URL: Valid format with secure password"
    return 0
}

validate_api_key() {
    local key=$1
    local name=$2
    local length=${#key}

    # Check for Stripe test keys in production
    if [[ "$key" == sk_test_* ]] || [[ "$key" == pk_test_* ]]; then
        print_error "${name}: Using test key (should be production key)"
        return 1
    fi

    # Check for placeholder patterns
    if [[ "$key" == *"your_"* ]] || \
       [[ "$key" == *"CHANGE_ME"* ]] || \
       [[ "$key" == *"example"* ]]; then
        print_error "${name}: Contains placeholder value"
        return 1
    fi

    # Minimum length check
    if [ $length -lt 20 ]; then
        print_error "${name}: Too short (${length} chars)"
        return 1
    fi

    print_success "${name}: Appears valid (${length} chars)"
    return 0
}

validate_redis_url() {
    local url=$1

    # Check basic format
    if ! [[ "$url" =~ ^redis:// ]]; then
        print_error "REDIS_URL: Invalid format (must start with redis://)"
        return 1
    fi

    # Check if password is included
    if [[ "$url" =~ redis://:([^@]+)@ ]]; then
        local password="${BASH_REMATCH[1]}"
        local length=${#password}

        if [ $length -lt 32 ]; then
            print_warning "REDIS_URL: Password could be stronger (${length} chars)"
        else
            print_success "REDIS_URL: Valid with strong password"
        fi
    else
        print_warning "REDIS_URL: No password detected (acceptable for local dev only)"
    fi

    return 0
}

validate_email_config() {
    local email=$1
    local name=$2

    # Check for placeholder emails
    if [[ "$email" == *"example.com"* ]] || \
       [[ "$email" == *"your-"* ]] || \
       [[ "$email" == *"change"* ]]; then
        print_error "${name}: Contains placeholder email"
        return 1
    fi

    # Basic email format check
    if ! [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        print_error "${name}: Invalid email format"
        return 1
    fi

    print_success "${name}: Valid email format"
    return 0
}

################################################################################
# Main Validation Logic
################################################################################

validate_env_file() {
    local file=$1

    print_section "Loading Environment Variables"

    # Load variables
    declare -A env_vars
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        # Clean value (remove quotes)
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e 's/^'"'"'//' -e "s/'$//")
        env_vars["$key"]="$value"
    done < "$file"

    print_info "Loaded ${#env_vars[@]} environment variables"

    # Critical Secrets Validation
    print_section "Critical Secrets"

    # JWT Secrets
    if [ -n "${env_vars[JWT_SECRET]:-}" ]; then
        validate_jwt_secret "${env_vars[JWT_SECRET]}" "JWT_SECRET"
    else
        print_error "JWT_SECRET: Missing (REQUIRED)"
    fi

    if [ -n "${env_vars[JWT_REFRESH_SECRET]:-}" ]; then
        validate_jwt_secret "${env_vars[JWT_REFRESH_SECRET]}" "JWT_REFRESH_SECRET"
    else
        print_error "JWT_REFRESH_SECRET: Missing (REQUIRED)"
    fi

    # Verify JWT secrets are different
    if [ -n "${env_vars[JWT_SECRET]:-}" ] && [ -n "${env_vars[JWT_REFRESH_SECRET]:-}" ]; then
        if [ "${env_vars[JWT_SECRET]}" = "${env_vars[JWT_REFRESH_SECRET]}" ]; then
            print_error "JWT_SECRET and JWT_REFRESH_SECRET must be different!"
        else
            print_success "JWT secrets are properly differentiated"
        fi
    fi

    # Encryption Keys
    print_section "Encryption Keys"

    if [ -n "${env_vars[ENCRYPTION_KEY]:-}" ]; then
        validate_encryption_key "${env_vars[ENCRYPTION_KEY]}" "ENCRYPTION_KEY"
    else
        print_warning "ENCRYPTION_KEY: Not set (optional but recommended)"
    fi

    if [ -n "${env_vars[KYC_ENCRYPTION_KEY]:-}" ]; then
        validate_encryption_key "${env_vars[KYC_ENCRYPTION_KEY]}" "KYC_ENCRYPTION_KEY"
    else
        print_warning "KYC_ENCRYPTION_KEY: Not set (optional)"
    fi

    # Database
    print_section "Database Configuration"

    if [ -n "${env_vars[DATABASE_URL]:-}" ]; then
        validate_database_url "${env_vars[DATABASE_URL]}"
    else
        print_error "DATABASE_URL: Missing (REQUIRED)"
    fi

    if [ -n "${env_vars[POSTGRES_PASSWORD]:-}" ]; then
        validate_password "${env_vars[POSTGRES_PASSWORD]}" "POSTGRES_PASSWORD"
    else
        print_warning "POSTGRES_PASSWORD: Not set (may be embedded in DATABASE_URL)"
    fi

    # Redis
    print_section "Cache Configuration"

    if [ -n "${env_vars[REDIS_URL]:-}" ]; then
        validate_redis_url "${env_vars[REDIS_URL]}"
    else
        print_warning "REDIS_URL: Not set (optional but recommended for production)"
    fi

    if [ -n "${env_vars[REDIS_PASSWORD]:-}" ]; then
        validate_password "${env_vars[REDIS_PASSWORD]}" "REDIS_PASSWORD"
    fi

    # Passwords
    print_section "Service Passwords"

    for key in "${!env_vars[@]}"; do
        if [[ "$key" == *"PASSWORD"* ]] && [[ "$key" != "POSTGRES_PASSWORD" ]] && [[ "$key" != "REDIS_PASSWORD" ]]; then
            validate_password "${env_vars[$key]}" "$key"
        fi
    done

    # Payment Providers
    print_section "Payment Provider Configuration"

    if [ -n "${env_vars[STRIPE_SECRET_KEY]:-}" ]; then
        validate_api_key "${env_vars[STRIPE_SECRET_KEY]}" "STRIPE_SECRET_KEY"
    else
        print_warning "STRIPE_SECRET_KEY: Not set"
    fi

    if [ -n "${env_vars[PAYPAL_CLIENT_SECRET]:-}" ]; then
        validate_api_key "${env_vars[PAYPAL_CLIENT_SECRET]}" "PAYPAL_CLIENT_SECRET"
    else
        print_warning "PAYPAL_CLIENT_SECRET: Not set"
    fi

    # Email Configuration
    print_section "Email Configuration"

    if [ -n "${env_vars[EMAIL_FROM]:-}" ]; then
        validate_email_config "${env_vars[EMAIL_FROM]}" "EMAIL_FROM"
    fi

    if [ -n "${env_vars[SENDGRID_FROM_EMAIL]:-}" ]; then
        validate_email_config "${env_vars[SENDGRID_FROM_EMAIL]}" "SENDGRID_FROM_EMAIL"
    fi

    if [ -n "${env_vars[PGADMIN_DEFAULT_EMAIL]:-}" ]; then
        validate_email_config "${env_vars[PGADMIN_DEFAULT_EMAIL]}" "PGADMIN_DEFAULT_EMAIL"
    fi

    # Environment Type Check
    print_section "Environment Configuration"

    if [ -n "${env_vars[NODE_ENV]:-}" ]; then
        case "${env_vars[NODE_ENV]}" in
            production)
                print_success "NODE_ENV: production (correct for production deployment)"
                ;;
            development)
                print_warning "NODE_ENV: development (should be 'production' for production)"
                ;;
            *)
                print_warning "NODE_ENV: ${env_vars[NODE_ENV]} (unexpected value)"
                ;;
        esac
    else
        print_warning "NODE_ENV: Not set (should be 'production' for production)"
    fi
}

################################################################################
# Main Script
################################################################################

main() {
    print_header

    # Check arguments
    if [ $# -eq 0 ]; then
        print_error "Usage: $0 <env-file>"
        print_info "Example: $0 .env"
        exit 2
    fi

    local env_file=$1

    # Check file exists
    if [ ! -f "$env_file" ]; then
        print_error "File not found: $env_file"
        exit 2
    fi

    print_info "Validating: $env_file"
    echo ""

    # Run validation
    validate_env_file "$env_file"

    # Summary
    print_section "Validation Summary"

    echo -e "Total Checks:    ${TOTAL_CHECKS}"
    echo -e "${GREEN}Passed:${NC}          ${PASSED_CHECKS}"
    echo -e "${RED}Failed:${NC}          ${FAILED_CHECKS}"
    echo -e "${YELLOW}Warnings:${NC}        ${WARNING_CHECKS}"
    echo ""

    # Calculate score
    if [ $TOTAL_CHECKS -gt 0 ]; then
        local score=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
        echo -e "Score:           ${score}%"
        echo ""

        if [ $score -ge 90 ]; then
            echo -e "${GREEN}✓ Excellent!${NC} Your secrets are well-configured."
        elif [ $score -ge 70 ]; then
            echo -e "${YELLOW}⚠ Good${NC}, but some improvements recommended."
        else
            echo -e "${RED}✗ Needs Attention${NC} - Several issues must be fixed."
        fi
    fi

    echo ""

    # Exit based on failures
    if [ $FAILED_CHECKS -gt 0 ]; then
        print_error "Validation FAILED with ${FAILED_CHECKS} critical issue(s)"
        exit 1
    else
        print_success "Validation PASSED - All critical checks successful"
        if [ $WARNING_CHECKS -gt 0 ]; then
            print_warning "${WARNING_CHECKS} warning(s) - review recommended but not blocking"
        fi
        exit 0
    fi
}

# Run main function
main "$@"
