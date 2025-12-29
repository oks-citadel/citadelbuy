#!/bin/bash

###############################################################################
# Sentry Release Creation Script for Broxiva
#
# This script creates Sentry releases manually for both backend and frontend.
# Useful for local testing or manual deployments.
#
# Prerequisites:
#   - Sentry CLI installed: npm install -g @sentry/cli
#   - SENTRY_AUTH_TOKEN environment variable set
#   - SENTRY_ORG environment variable set (or use --org flag)
#
# Usage:
#   ./create-sentry-release.sh [options]
#
# Options:
#   -e, --environment  Environment (development, staging, production)
#   -v, --version      Release version (default: auto-generated from git)
#   -p, --project      Project type (backend, frontend, all)
#   -h, --help         Show this help message
#
# Examples:
#   # Create releases for both backend and frontend in production
#   ./create-sentry-release.sh -e production -p all
#
#   # Create only backend release for staging
#   ./create-sentry-release.sh -e staging -p backend
#
#   # Create release with custom version
#   ./create-sentry-release.sh -e production -v 1.2.3 -p all
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
PROJECT_TYPE="all"
VERSION=""
SENTRY_ORG="${SENTRY_ORG:-broxiva}"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to show help
show_help() {
    sed -n '/^###/,/^###/p' "$0" | sed 's/^# \?//'
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_TYPE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_info "Valid environments: development, staging, production"
    exit 1
fi

# Validate project type
if [[ ! "$PROJECT_TYPE" =~ ^(backend|frontend|all)$ ]]; then
    print_error "Invalid project type: $PROJECT_TYPE"
    print_info "Valid project types: backend, frontend, all"
    exit 1
fi

# Check if Sentry CLI is installed
if ! command -v sentry-cli &> /dev/null; then
    print_error "Sentry CLI is not installed"
    print_info "Install with: npm install -g @sentry/cli"
    exit 1
fi

# Check if SENTRY_AUTH_TOKEN is set
if [[ -z "$SENTRY_AUTH_TOKEN" ]]; then
    print_error "SENTRY_AUTH_TOKEN environment variable is not set"
    print_info "Get your token from: https://sentry.io/settings/account/api/auth-tokens/"
    exit 1
fi

# Determine version if not provided
if [[ -z "$VERSION" ]]; then
    if git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_SHA=$(git rev-parse --short HEAD)
        TIMESTAMP=$(date +%Y%m%d%H%M%S)
        VERSION="$GIT_SHA-$TIMESTAMP"
        print_info "Auto-generated version: $VERSION"
    else
        print_error "Not a git repository and no version specified"
        exit 1
    fi
fi

# Determine Sentry projects based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    BACKEND_PROJECT="broxiva-backend-prod"
    FRONTEND_PROJECT="broxiva-web-prod"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    BACKEND_PROJECT="broxiva-backend-staging"
    FRONTEND_PROJECT="broxiva-web-staging"
else
    BACKEND_PROJECT="broxiva-backend-dev"
    FRONTEND_PROJECT="broxiva-web-dev"
fi

# Function to create backend release
create_backend_release() {
    print_info "Creating backend release..."

    BACKEND_RELEASE="broxiva-backend@$VERSION"

    # Create release
    print_info "Creating release: $BACKEND_RELEASE"
    sentry-cli releases new "$BACKEND_RELEASE" \
        --org "$SENTRY_ORG" \
        --project "$BACKEND_PROJECT" || {
        print_error "Failed to create backend release"
        return 1
    }

    # Set commits (if git repository)
    if git rev-parse --git-dir > /dev/null 2>&1; then
        print_info "Associating commits with release..."
        sentry-cli releases set-commits "$BACKEND_RELEASE" \
            --auto \
            --org "$SENTRY_ORG" \
            --project "$BACKEND_PROJECT" || {
            print_warning "Failed to associate commits (continuing anyway)"
        }
    fi

    # Finalize release
    print_info "Finalizing backend release..."
    sentry-cli releases finalize "$BACKEND_RELEASE" \
        --org "$SENTRY_ORG" \
        --project "$BACKEND_PROJECT" || {
        print_error "Failed to finalize backend release"
        return 1
    }

    # Create deployment
    print_info "Creating backend deployment..."
    sentry-cli releases deploys "$BACKEND_RELEASE" new \
        --env "$ENVIRONMENT" \
        --org "$SENTRY_ORG" \
        --project "$BACKEND_PROJECT" || {
        print_error "Failed to create backend deployment"
        return 1
    }

    print_success "Backend release created: $BACKEND_RELEASE"
    return 0
}

# Function to create frontend release
create_frontend_release() {
    print_info "Creating frontend release..."

    FRONTEND_RELEASE="broxiva-web@$VERSION"

    # Create release
    print_info "Creating release: $FRONTEND_RELEASE"
    sentry-cli releases new "$FRONTEND_RELEASE" \
        --org "$SENTRY_ORG" \
        --project "$FRONTEND_PROJECT" || {
        print_error "Failed to create frontend release"
        return 1
    }

    # Set commits (if git repository)
    if git rev-parse --git-dir > /dev/null 2>&1; then
        print_info "Associating commits with release..."
        sentry-cli releases set-commits "$FRONTEND_RELEASE" \
            --auto \
            --org "$SENTRY_ORG" \
            --project "$FRONTEND_PROJECT" || {
            print_warning "Failed to associate commits (continuing anyway)"
        }
    fi

    # Upload source maps (if .next directory exists)
    if [[ -d "apps/web/.next/static" ]]; then
        print_info "Uploading source maps..."
        sentry-cli releases files "$FRONTEND_RELEASE" upload-sourcemaps \
            --org "$SENTRY_ORG" \
            --project "$FRONTEND_PROJECT" \
            apps/web/.next/static \
            --url-prefix '~/_next/static' \
            --validate \
            --strip-prefix apps/web/.next || {
            print_warning "Failed to upload source maps (continuing anyway)"
        }
    else
        print_warning "No .next directory found, skipping source map upload"
        print_info "Build the app first with: cd apps/web && npm run build"
    fi

    # Finalize release
    print_info "Finalizing frontend release..."
    sentry-cli releases finalize "$FRONTEND_RELEASE" \
        --org "$SENTRY_ORG" \
        --project "$FRONTEND_PROJECT" || {
        print_error "Failed to finalize frontend release"
        return 1
    }

    # Create deployment
    print_info "Creating frontend deployment..."
    sentry-cli releases deploys "$FRONTEND_RELEASE" new \
        --env "$ENVIRONMENT" \
        --org "$SENTRY_ORG" \
        --project "$FRONTEND_PROJECT" || {
        print_error "Failed to create frontend deployment"
        return 1
    }

    print_success "Frontend release created: $FRONTEND_RELEASE"
    return 0
}

# Main execution
print_info "==================== Sentry Release Creation ===================="
print_info "Environment: $ENVIRONMENT"
print_info "Version: $VERSION"
print_info "Organization: $SENTRY_ORG"
print_info "Project Type: $PROJECT_TYPE"
print_info "================================================================="

# Create releases based on project type
EXIT_CODE=0

if [[ "$PROJECT_TYPE" == "backend" || "$PROJECT_TYPE" == "all" ]]; then
    print_info ""
    print_info "--- Creating Backend Release ---"
    if ! create_backend_release; then
        EXIT_CODE=1
    fi
fi

if [[ "$PROJECT_TYPE" == "frontend" || "$PROJECT_TYPE" == "all" ]]; then
    print_info ""
    print_info "--- Creating Frontend Release ---"
    if ! create_frontend_release; then
        EXIT_CODE=1
    fi
fi

# Summary
print_info ""
print_info "==================== Summary ===================="
if [[ $EXIT_CODE -eq 0 ]]; then
    print_success "All releases created successfully!"
    print_info "View releases at: https://sentry.io/organizations/$SENTRY_ORG/releases/"
else
    print_error "Some releases failed to create"
fi
print_info "================================================="

exit $EXIT_CODE
