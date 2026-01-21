#!/bin/bash

################################################################################
# Broxiva Release Promotion Script
#
# Description: Promotes a release from one environment to another
# Usage: ./promote-release.sh [from-env] [to-env]
# Example: ./promote-release.sh staging prod
#
# Author: DevOps Team
# Version: 1.0.0
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

################################################################################
# Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

print_banner() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         Broxiva Release Promotion Script                   ║"
    echo "║         Version 1.0.0                                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_tools=()

    # Check for required tools
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v az &> /dev/null; then
        missing_tools+=("azure-cli")
    fi

    if ! command -v gh &> /dev/null; then
        missing_tools+=("github-cli")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools and try again"
        exit 1
    fi

    log_success "All prerequisites met"
}

validate_environments() {
    local from_env=$1
    local to_env=$2

    log_info "Validating environment promotion path..."

    # Valid promotion paths
    case "${from_env}->${to_env}" in
        "dev->staging")
            log_success "Valid promotion: Development → Staging"
            ;;
        "staging->prod")
            log_success "Valid promotion: Staging → Production"
            ;;
        "dev->prod")
            log_error "Cannot promote directly from dev to prod"
            log_info "Please promote dev → staging → prod"
            exit 1
            ;;
        *)
            log_error "Invalid promotion path: ${from_env} → ${to_env}"
            log_info "Valid paths: dev → staging, staging → prod"
            exit 1
            ;;
    esac
}

set_environment_config() {
    local env=$1

    case $env in
        dev)
            echo "broxiva-development|broxiva-dev-aks|broxiva-dev-rg|develop"
            ;;
        staging)
            echo "broxiva-staging|broxiva-staging-aks|broxiva-staging-rg|staging"
            ;;
        prod)
            echo "broxiva-production|broxiva-prod-aks|broxiva-prod-rg|main"
            ;;
        *)
            log_error "Invalid environment: ${env}"
            exit 1
            ;;
    esac
}

get_current_image_tags() {
    local namespace=$1
    local cluster=$2
    local resource_group=$3

    log_info "Fetching current image tags from ${namespace}..."

    # Connect to cluster
    az aks get-credentials \
        --resource-group "${resource_group}" \
        --name "${cluster}" \
        --overwrite-existing > /dev/null 2>&1

    # Get API image tag
    local api_image=$(kubectl get deployment broxiva-api \
        -n "${namespace}" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")

    # Get Web image tag
    local web_image=$(kubectl get deployment broxiva-web \
        -n "${namespace}" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")

    # Get Worker image tag
    local worker_image=$(kubectl get deployment broxiva-worker \
        -n "${namespace}" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")

    # Extract tags
    local api_tag=$(echo "${api_image}" | cut -d: -f2)
    local web_tag=$(echo "${web_image}" | cut -d: -f2)
    local worker_tag=$(echo "${worker_image}" | cut -d: -f2)

    echo "${api_tag}|${web_tag}|${worker_tag}"
}

verify_source_environment() {
    local namespace=$1
    local cluster=$2
    local resource_group=$3

    log_step "Verifying source environment health..."

    # Connect to cluster
    az aks get-credentials \
        --resource-group "${resource_group}" \
        --name "${cluster}" \
        --overwrite-existing > /dev/null 2>&1

    # Check if deployments exist
    if ! kubectl get deployment broxiva-api -n "${namespace}" &> /dev/null; then
        log_error "API deployment not found in ${namespace}"
        exit 1
    fi

    # Check deployment health
    local unhealthy=$(kubectl get pods -n "${namespace}" \
        --field-selector=status.phase!=Running \
        -o json | jq '.items | length')

    if [ "${unhealthy}" -gt 0 ]; then
        log_warning "Found ${unhealthy} unhealthy pods in ${namespace}"
        kubectl get pods -n "${namespace}" --field-selector=status.phase!=Running
        read -p "Continue anyway? (yes/no): " confirm
        if [[ ! "${confirm}" =~ ^[Yy](es)?$ ]]; then
            log_error "Promotion cancelled"
            exit 1
        fi
    fi

    log_success "Source environment verified"
}

check_promotion_approval() {
    local from_env=$1
    local to_env=$2
    local image_tag=$3

    log_step "Checking promotion approval..."

    if [ "${to_env}" == "prod" ]; then
        echo ""
        echo "════════════════════════════════════════════════════════════"
        log_warning "PRODUCTION PROMOTION REQUIRES APPROVAL"
        echo "════════════════════════════════════════════════════════════"
        echo ""
        echo "Promotion Details:"
        echo "  • From: ${from_env}"
        echo "  • To: ${to_env}"
        echo "  • Image Tag: ${image_tag}"
        echo "  • Current User: $(whoami)"
        echo "  • Timestamp: $(date)"
        echo ""
        echo "Pre-Promotion Checklist:"
        echo "  ✓ Staging tests passed?"
        echo "  ✓ Security scan completed?"
        echo "  ✓ Change request approved?"
        echo "  ✓ Rollback plan documented?"
        echo "  ✓ On-call engineer notified?"
        echo ""
        read -p "Have all checks passed? (YES/no): " approval
        if [[ ! "${approval}" == "YES" ]]; then
            log_error "Production promotion requires explicit 'YES' confirmation"
            exit 1
        fi
        log_success "Approval confirmed"
    fi
}

create_git_tag() {
    local image_tag=$1
    local to_env=$2

    log_step "Creating git tag for release..."

    # Get current commit
    local commit=$(git rev-parse HEAD)

    # Create tag name
    local tag_name="${to_env}-${image_tag}-$(date +%Y%m%d-%H%M%S)"

    # Create git tag
    git tag -a "${tag_name}" -m "Promoted to ${to_env}: ${image_tag}"

    log_success "Created git tag: ${tag_name}"

    # Push tag to remote
    read -p "Push tag to remote? (yes/no): " push_tag
    if [[ "${push_tag}" =~ ^[Yy](es)?$ ]]; then
        git push origin "${tag_name}"
        log_success "Tag pushed to remote"
    fi
}

trigger_deployment_workflow() {
    local to_env=$1
    local image_tag=$2

    log_step "Triggering deployment workflow..."

    # Determine workflow file
    local workflow_file=""
    case $to_env in
        staging)
            workflow_file="cd-staging.yml"
            ;;
        prod)
            workflow_file="cd-prod.yml"
            ;;
        *)
            log_error "No workflow defined for ${to_env}"
            exit 1
            ;;
    esac

    log_info "Triggering workflow: ${workflow_file}"

    # Trigger GitHub Actions workflow
    gh workflow run "${workflow_file}" \
        --ref main \
        -f image_tag="${image_tag}"

    log_success "Workflow triggered"

    # Wait for workflow to start
    sleep 5

    # Get latest workflow run
    log_info "Fetching workflow run details..."
    local run_url=$(gh run list --workflow="${workflow_file}" --limit=1 --json url --jq '.[0].url')

    echo ""
    log_success "Deployment workflow started!"
    echo "  Workflow URL: ${run_url}"
    echo ""

    # Ask if user wants to watch
    read -p "Watch workflow progress? (yes/no): " watch
    if [[ "${watch}" =~ ^[Yy](es)?$ ]]; then
        gh run watch
    fi
}

send_notification() {
    local from_env=$1
    local to_env=$2
    local image_tag=$3
    local status=$4

    log_info "Sending notification..."

    # Create notification message
    local message="Release Promotion ${status}\n"
    message+="• From: ${from_env}\n"
    message+="• To: ${to_env}\n"
    message+="• Image Tag: ${image_tag}\n"
    message+="• By: $(whoami)\n"
    message+="• Time: $(date)"

    # Log notification (could integrate with Slack/Teams/etc)
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo -e "${message}"
    echo "════════════════════════════════════════════════════════════"
    echo ""

    # TODO: Integrate with actual notification system
    # curl -X POST https://hooks.slack.com/services/... -d "..."
}

print_summary() {
    local from_env=$1
    local to_env=$2
    local image_tag=$3

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Release Promotion Summary                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Promotion initiated successfully!"
    echo ""
    echo "Promotion Details:"
    echo "  • From Environment: ${from_env}"
    echo "  • To Environment: ${to_env}"
    echo "  • Image Tag: ${image_tag}"
    echo "  • Initiated By: $(whoami)"
    echo "  • Timestamp: $(date)"
    echo ""
    echo "Next Steps:"
    echo "  1. Monitor deployment workflow in GitHub Actions"
    echo "  2. Verify deployment health in target environment"
    echo "  3. Run smoke tests"
    echo "  4. Update release notes"
    echo "  5. Notify stakeholders"
    echo ""
    echo "Useful Commands:"
    echo "  • Check deployment: kubectl get deployments -n broxiva-${to_env}"
    echo "  • View logs: kubectl logs -f deployment/broxiva-api -n broxiva-${to_env}"
    echo "  • Rollback: ./rollback-release.sh ${to_env}"
    echo ""
}

################################################################################
# Main Script
################################################################################

main() {
    print_banner

    # Check arguments
    if [ $# -lt 2 ]; then
        log_error "Usage: $0 [from-env] [to-env]"
        log_info "Valid environments: dev, staging, prod"
        log_info "Examples:"
        log_info "  ./promote-release.sh dev staging"
        log_info "  ./promote-release.sh staging prod"
        exit 1
    fi

    local from_env=$1
    local to_env=$2

    # Run promotion steps
    check_prerequisites
    validate_environments "${from_env}" "${to_env}"

    # Get source environment config
    IFS='|' read -r from_namespace from_cluster from_rg from_branch <<< "$(set_environment_config "${from_env}")"

    # Get target environment config
    IFS='|' read -r to_namespace to_cluster to_rg to_branch <<< "$(set_environment_config "${to_env}")"

    log_info "Promotion: ${from_env} (${from_namespace}) → ${to_env} (${to_namespace})"

    # Verify source environment
    verify_source_environment "${from_namespace}" "${from_cluster}" "${from_rg}"

    # Get current image tags from source
    IFS='|' read -r api_tag web_tag worker_tag <<< "$(get_current_image_tags "${from_namespace}" "${from_cluster}" "${from_rg}")"

    log_info "Current image tags in ${from_env}:"
    echo "  • API: ${api_tag}"
    echo "  • Web: ${web_tag}"
    echo "  • Worker: ${worker_tag}"
    echo ""

    # Use API tag as the release tag
    local image_tag="${api_tag}"

    # Check approval
    check_promotion_approval "${from_env}" "${to_env}" "${image_tag}"

    # Create git tag
    create_git_tag "${image_tag}" "${to_env}"

    # Trigger deployment
    trigger_deployment_workflow "${to_env}" "${image_tag}"

    # Send notification
    send_notification "${from_env}" "${to_env}" "${image_tag}" "INITIATED"

    # Print summary
    print_summary "${from_env}" "${to_env}" "${image_tag}"

    log_success "Promotion process completed!"
}

# Run main function
main "$@"
