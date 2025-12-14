#!/bin/bash

################################################################################
# Broxiva Release Rollback Script
#
# Description: Rolls back a deployment to a previous version
# Usage: ./rollback-release.sh [environment] [target]
# Examples:
#   ./rollback-release.sh prod              # Rollback to previous version
#   ./rollback-release.sh prod previous     # Rollback to previous version
#   ./rollback-release.sh prod v2.1.5       # Rollback to specific version
#   ./rollback-release.sh prod revision-3   # Rollback to specific revision
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
CYAN='\033[0;36m'
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

log_critical() {
    echo -e "${RED}${CYAN}[CRITICAL]${NC} $1"
}

print_banner() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         Broxiva Release Rollback Script                    ║"
    echo "║         Version 1.0.0                                       ║"
    echo "║         ⚠️  USE WITH CAUTION ⚠️                            ║"
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

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    log_success "All prerequisites met"
}

set_environment_config() {
    local env=$1

    log_info "Setting environment configuration..."

    case $env in
        dev)
            export NAMESPACE="broxiva-development"
            export CLUSTER="broxiva-dev-aks"
            export RESOURCE_GROUP="broxiva-dev-rg"
            export ENVIRONMENT="development"
            ;;
        staging)
            export NAMESPACE="broxiva-staging"
            export CLUSTER="broxiva-staging-aks"
            export RESOURCE_GROUP="broxiva-staging-rg"
            export ENVIRONMENT="staging"
            ;;
        prod)
            export NAMESPACE="broxiva-production"
            export CLUSTER="broxiva-prod-aks"
            export RESOURCE_GROUP="broxiva-prod-rg"
            export ENVIRONMENT="production"
            ;;
        *)
            log_error "Invalid environment: ${env}"
            log_info "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac

    log_success "Environment set to: ${ENVIRONMENT}"
}

connect_to_cluster() {
    log_step "Connecting to AKS cluster: ${CLUSTER}..."

    az aks get-credentials \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${CLUSTER}" \
        --overwrite-existing > /dev/null 2>&1

    kubectl config set-context --current --namespace="${NAMESPACE}" > /dev/null 2>&1

    if kubectl cluster-info &> /dev/null; then
        log_success "Connected to ${CLUSTER}"
    else
        log_error "Failed to connect to cluster"
        exit 1
    fi
}

get_deployment_history() {
    local deployment=$1

    log_info "Fetching deployment history for ${deployment}..."

    echo ""
    echo "════════════════════════════════════════════════════════════"
    kubectl rollout history deployment/"${deployment}" -n "${NAMESPACE}"
    echo "════════════════════════════════════════════════════════════"
    echo ""
}

get_current_version() {
    local deployment=$1

    log_info "Current version of ${deployment}:"

    # Get current image
    local image=$(kubectl get deployment "${deployment}" \
        -n "${NAMESPACE}" \
        -o jsonpath='{.spec.template.spec.containers[0].image}')

    # Get current revision
    local revision=$(kubectl get deployment "${deployment}" \
        -n "${NAMESPACE}" \
        -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')

    echo "  • Image: ${image}"
    echo "  • Revision: ${revision}"
    echo ""
}

backup_current_state() {
    log_step "Creating backup of current state..."

    local backup_dir="${PROJECT_ROOT}/backups/rollback-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "${backup_dir}"

    # Backup all resources
    kubectl get all -n "${NAMESPACE}" -o yaml > "${backup_dir}/all-resources.yaml"
    kubectl get configmaps -n "${NAMESPACE}" -o yaml > "${backup_dir}/configmaps.yaml"
    kubectl get secrets -n "${NAMESPACE}" -o yaml > "${backup_dir}/secrets.yaml"
    kubectl get ingress -n "${NAMESPACE}" -o yaml > "${backup_dir}/ingress.yaml"

    # Backup deployment specs
    for deployment in $(kubectl get deployments -n "${NAMESPACE}" -o name); do
        kubectl get "${deployment}" -n "${NAMESPACE}" -o yaml > "${backup_dir}/$(basename ${deployment}).yaml"
    done

    log_success "Backup created at: ${backup_dir}"
    echo "${backup_dir}" > /tmp/last-backup-dir.txt
}

confirm_rollback() {
    local env=$1
    local target=$2

    echo ""
    log_critical "⚠️  ROLLBACK CONFIRMATION REQUIRED ⚠️"
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "Environment: ${ENVIRONMENT}"
    echo "Namespace: ${NAMESPACE}"
    echo "Target: ${target}"
    echo "Timestamp: $(date)"
    echo "User: $(whoami)"
    echo "════════════════════════════════════════════════════════════"
    echo ""

    if [ "${env}" == "prod" ]; then
        log_critical "PRODUCTION ROLLBACK - CRITICAL OPERATION"
        echo ""
        echo "Pre-Rollback Checklist:"
        echo "  • Have you identified the root cause?"
        echo "  • Is the incident documented?"
        echo "  • Have stakeholders been notified?"
        echo "  • Is a backup of current state created?"
        echo "  • Do you have approval for rollback?"
        echo ""
        read -p "Type 'ROLLBACK PRODUCTION' to confirm: " confirm
        if [ "${confirm}" != "ROLLBACK PRODUCTION" ]; then
            log_error "Rollback cancelled"
            exit 1
        fi
    else
        read -p "Type 'ROLLBACK' to confirm: " confirm
        if [ "${confirm}" != "ROLLBACK" ]; then
            log_error "Rollback cancelled"
            exit 1
        fi
    fi

    log_success "Rollback confirmed"
}

perform_rollback() {
    local deployment=$1
    local target=$2

    log_step "Performing rollback of ${deployment}..."

    if [ "${target}" == "previous" ] || [ "${target}" == "" ]; then
        # Rollback to previous revision
        log_info "Rolling back to previous revision..."
        kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}"
    elif [[ "${target}" =~ ^revision-([0-9]+)$ ]]; then
        # Rollback to specific revision number
        local revision="${BASH_REMATCH[1]}"
        log_info "Rolling back to revision ${revision}..."
        kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}" --to-revision="${revision}"
    else
        # Rollback to specific version tag
        log_info "Rolling back to version ${target}..."

        # Update image tag
        local registry="ghcr.io/broxiva"
        local image_name=$(echo "${deployment}" | sed 's/broxiva-//')
        kubectl set image deployment/"${deployment}" \
            "${image_name}=${registry}/${deployment}:${target}" \
            -n "${NAMESPACE}"
    fi

    log_success "Rollback initiated for ${deployment}"
}

wait_for_rollback() {
    local deployment=$1

    log_step "Waiting for rollback to complete..."

    if kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" --timeout=10m; then
        log_success "Rollback completed for ${deployment}"
    else
        log_error "Rollback failed for ${deployment}"
        return 1
    fi
}

verify_rollback() {
    local deployment=$1

    log_step "Verifying rollback for ${deployment}..."

    # Check pod status
    local ready=$(kubectl get deployment "${deployment}" \
        -n "${NAMESPACE}" \
        -o jsonpath='{.status.readyReplicas}')

    local desired=$(kubectl get deployment "${deployment}" \
        -n "${NAMESPACE}" \
        -o jsonpath='{.status.replicas}')

    echo "  • Ready Replicas: ${ready}/${desired}"

    if [ "${ready}" == "${desired}" ]; then
        log_success "All replicas are ready"
    else
        log_error "Not all replicas are ready"
        return 1
    fi

    # Get new version
    get_current_version "${deployment}"
}

run_health_checks() {
    log_step "Running health checks..."

    sleep 10

    # Check API health
    local api_pod=$(kubectl get pods -n "${NAMESPACE}" \
        -l app=broxiva-api \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -n "${api_pod}" ]; then
        log_info "Testing API health..."
        if kubectl exec -n "${NAMESPACE}" "${api_pod}" -- \
            curl -sf http://localhost:4000/api/health/live > /dev/null 2>&1; then
            log_success "API health check passed"
        else
            log_error "API health check failed"
            return 1
        fi
    fi

    # Check Web health
    local web_pod=$(kubectl get pods -n "${NAMESPACE}" \
        -l app=broxiva-web \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -n "${web_pod}" ]; then
        log_info "Testing Web health..."
        if kubectl exec -n "${NAMESPACE}" "${web_pod}" -- \
            curl -sf http://localhost:3000/health > /dev/null 2>&1; then
            log_success "Web health check passed"
        else
            log_error "Web health check failed"
            return 1
        fi
    fi

    log_success "All health checks passed"
}

check_error_rates() {
    log_step "Checking error rates..."

    # Get pod status
    local error_pods=$(kubectl get pods -n "${NAMESPACE}" \
        --field-selector=status.phase!=Running \
        -o json | jq '.items | length')

    if [ "${error_pods}" -gt 0 ]; then
        log_warning "Found ${error_pods} pods in error state"
        kubectl get pods -n "${NAMESPACE}" --field-selector=status.phase!=Running
    else
        log_success "No pods in error state"
    fi

    # Check for CrashLoopBackOff
    local crash_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -o json | jq '.items[] | select(.status.containerStatuses[]?.state.waiting?.reason=="CrashLoopBackOff") | .metadata.name' -r)

    if [ -n "${crash_pods}" ]; then
        log_error "Found pods in CrashLoopBackOff state:"
        echo "${crash_pods}"
        return 1
    fi

    log_success "No crash loops detected"
}

create_incident_report() {
    local env=$1
    local target=$2

    log_info "Creating incident report..."

    local report_file="${PROJECT_ROOT}/incidents/rollback-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p "$(dirname "${report_file}")"

    cat > "${report_file}" <<EOF
# Rollback Incident Report

## Summary
- **Date:** $(date)
- **Environment:** ${ENVIRONMENT}
- **Namespace:** ${NAMESPACE}
- **Performed By:** $(whoami)
- **Target:** ${target}

## Timeline
- **Rollback Initiated:** $(date)
- **Rollback Completed:** _TBD_

## Reason for Rollback
_Please fill in the reason for rollback_

## Root Cause
_Please fill in root cause analysis_

## Deployments Rolled Back
$(kubectl get deployments -n "${NAMESPACE}" -o name)

## Current State
\`\`\`
$(kubectl get all -n "${NAMESPACE}")
\`\`\`

## Actions Taken
1. Backup created
2. Rollback executed
3. Health checks performed
4. Monitoring resumed

## Follow-up Actions
- [ ] Root cause analysis completed
- [ ] Fix implemented and tested
- [ ] Stakeholders notified
- [ ] Post-mortem scheduled
- [ ] Documentation updated

## Notes
_Additional notes_
EOF

    log_success "Incident report created: ${report_file}"
}

send_notification() {
    local env=$1
    local status=$2

    log_info "Sending rollback notification..."

    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "ROLLBACK ${status}"
    echo "════════════════════════════════════════════════════════════"
    echo "Environment: ${ENVIRONMENT}"
    echo "Namespace: ${NAMESPACE}"
    echo "Performed By: $(whoami)"
    echo "Timestamp: $(date)"
    echo "════════════════════════════════════════════════════════════"
    echo ""

    # TODO: Integrate with Slack/Teams
    # curl -X POST "${SLACK_WEBHOOK_URL}" -d "{\"text\":\"Rollback ${status}\"}"
}

print_summary() {
    local env=$1
    local target=$2

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Rollback Complete                              ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Rollback completed successfully!"
    echo ""
    echo "Rollback Details:"
    echo "  • Environment: ${ENVIRONMENT}"
    echo "  • Namespace: ${NAMESPACE}"
    echo "  • Target: ${target}"
    echo "  • Timestamp: $(date)"
    echo ""
    echo "Next Steps:"
    echo "  1. Monitor application metrics and logs"
    echo "  2. Verify customer-facing functionality"
    echo "  3. Complete incident report"
    echo "  4. Investigate root cause"
    echo "  5. Plan corrective actions"
    echo "  6. Schedule post-mortem"
    echo ""
    echo "Monitoring Commands:"
    echo "  • View pods: kubectl get pods -n ${NAMESPACE}"
    echo "  • View logs: kubectl logs -f deployment/broxiva-api -n ${NAMESPACE}"
    echo "  • Check events: kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'"
    echo ""

    local backup_dir=$(cat /tmp/last-backup-dir.txt 2>/dev/null || echo "unknown")
    if [ "${backup_dir}" != "unknown" ]; then
        echo "Backup Location: ${backup_dir}"
        echo ""
    fi
}

################################################################################
# Main Script
################################################################################

main() {
    print_banner

    # Check arguments
    if [ $# -lt 1 ]; then
        log_error "Usage: $0 [environment] [target]"
        log_info "Valid environments: dev, staging, prod"
        log_info "Target options: previous, revision-N, v1.2.3"
        log_info ""
        log_info "Examples:"
        log_info "  $0 prod                    # Rollback to previous"
        log_info "  $0 prod previous           # Rollback to previous"
        log_info "  $0 prod revision-3         # Rollback to revision 3"
        log_info "  $0 prod v2.1.5             # Rollback to version v2.1.5"
        exit 1
    fi

    local environment=$1
    local target="${2:-previous}"

    # Run rollback steps
    check_prerequisites
    set_environment_config "${environment}"
    connect_to_cluster

    # Get deployments to rollback
    local deployments=$(kubectl get deployments -n "${NAMESPACE}" -o name | grep "broxiva-")

    if [ -z "${deployments}" ]; then
        log_error "No Broxiva deployments found in ${NAMESPACE}"
        exit 1
    fi

    # Show deployment history
    for deployment in ${deployments}; do
        deployment_name=$(basename "${deployment}")
        get_deployment_history "${deployment_name}"
        get_current_version "${deployment_name}"
    done

    # Backup current state
    backup_current_state

    # Confirm rollback
    confirm_rollback "${environment}" "${target}"

    # Perform rollback for all deployments
    for deployment in ${deployments}; do
        deployment_name=$(basename "${deployment}")
        perform_rollback "${deployment_name}" "${target}"
        wait_for_rollback "${deployment_name}"
        verify_rollback "${deployment_name}"
    done

    # Run health checks
    run_health_checks

    # Check error rates
    check_error_rates

    # Create incident report
    create_incident_report "${environment}" "${target}"

    # Send notification
    send_notification "${environment}" "COMPLETED"

    # Print summary
    print_summary "${environment}" "${target}"

    log_success "Rollback process completed successfully!"
}

# Run main function
main "$@"
