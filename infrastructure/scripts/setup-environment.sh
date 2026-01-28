#!/bin/bash

################################################################################
# Broxiva Environment Setup Script
#
# Description: Sets up and validates a Kubernetes environment for Broxiva
# Usage: ./setup-environment.sh [environment]
# Environments: dev, staging, prod
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

print_banner() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         Broxiva Environment Setup Script                   ║"
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

    if ! command -v kustomize &> /dev/null; then
        missing_tools+=("kustomize")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools and try again"
        exit 1
    fi

    log_success "All prerequisites met"
}

set_environment_variables() {
    local env=$1

    log_info "Setting environment variables for ${env}..."

    case $env in
        dev)
            export ENVIRONMENT="development"
            export NAMESPACE="broxiva-development"
            export AKS_CLUSTER="broxiva-dev-aks"
            export AKS_RESOURCE_GROUP="broxiva-dev-rg"
            export KUSTOMIZE_DIR="${PROJECT_ROOT}/infrastructure/kubernetes/overlays/development"
            export DOMAIN="dev.broxiva.com"
            export API_DOMAIN="api-dev.broxiva.com"
            ;;
        staging)
            export ENVIRONMENT="staging"
            export NAMESPACE="broxiva-staging"
            export AKS_CLUSTER="broxiva-staging-aks"
            export AKS_RESOURCE_GROUP="broxiva-staging-rg"
            export KUSTOMIZE_DIR="${PROJECT_ROOT}/infrastructure/kubernetes/overlays/staging"
            export DOMAIN="staging.broxiva.com"
            export API_DOMAIN="api-staging.broxiva.com"
            ;;
        prod)
            export ENVIRONMENT="production"
            export NAMESPACE="broxiva-production"
            export AKS_CLUSTER="broxiva-prod-aks"
            export AKS_RESOURCE_GROUP="broxiva-prod-rg"
            export KUSTOMIZE_DIR="${PROJECT_ROOT}/infrastructure/kubernetes/overlays/production"
            export DOMAIN="broxiva.com"
            export API_DOMAIN="api.broxiva.com"
            ;;
        *)
            log_error "Invalid environment: ${env}"
            log_info "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac

    log_success "Environment variables set for ${ENVIRONMENT}"
}

authenticate_azure() {
    log_info "Authenticating with Azure..."

    # Check if already logged in
    if az account show &> /dev/null; then
        log_success "Already authenticated with Azure"

        # Show current subscription
        local subscription=$(az account show --query name -o tsv)
        log_info "Current subscription: ${subscription}"
    else
        log_info "Please login to Azure..."
        az login
        log_success "Azure authentication successful"
    fi
}

connect_to_aks() {
    log_info "Connecting to AKS cluster: ${AKS_CLUSTER}..."

    # Get AKS credentials
    az aks get-credentials \
        --resource-group "${AKS_RESOURCE_GROUP}" \
        --name "${AKS_CLUSTER}" \
        --overwrite-existing

    # Verify connection
    if kubectl cluster-info &> /dev/null; then
        log_success "Successfully connected to ${AKS_CLUSTER}"
    else
        log_error "Failed to connect to AKS cluster"
        exit 1
    fi

    # Set namespace context
    kubectl config set-context --current --namespace="${NAMESPACE}"
    log_info "Set kubectl context to namespace: ${NAMESPACE}"
}

verify_cluster() {
    log_info "Verifying cluster configuration..."

    # Check cluster info
    echo ""
    echo "════════════════════════════════════════════════════════════"
    kubectl cluster-info
    echo "════════════════════════════════════════════════════════════"
    echo ""

    # Check node status
    log_info "Checking node status..."
    kubectl get nodes
    echo ""

    # Check node resources
    log_info "Node resource usage:"
    kubectl top nodes || log_warning "Metrics server not available"
    echo ""
}

create_namespace() {
    log_info "Creating namespace: ${NAMESPACE}..."

    if kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_warning "Namespace ${NAMESPACE} already exists"
    else
        kubectl create namespace "${NAMESPACE}"
        log_success "Namespace ${NAMESPACE} created"
    fi

    # Label namespace
    kubectl label namespace "${NAMESPACE}" \
        environment="${ENVIRONMENT}" \
        app=broxiva \
        managed-by=kustomize \
        --overwrite

    log_success "Namespace labeled"
}

setup_secrets() {
    log_info "Setting up secrets for ${ENVIRONMENT}..."

    # Check if External Secrets Operator is installed
    if kubectl get crd secretstores.external-secrets.io &> /dev/null; then
        log_success "External Secrets Operator detected"

        # Apply secret store configuration
        if [ -f "${KUSTOMIZE_DIR}/secret-store.yaml" ]; then
            kubectl apply -f "${KUSTOMIZE_DIR}/secret-store.yaml" -n "${NAMESPACE}"
            log_success "Secret store configured"
        else
            log_warning "Secret store configuration not found"
        fi
    else
        log_warning "External Secrets Operator not installed"
        log_info "Please install External Secrets Operator or create secrets manually"
    fi
}

deploy_base_resources() {
    log_info "Deploying base resources..."

    # Check if kustomization exists
    if [ ! -d "${KUSTOMIZE_DIR}" ]; then
        log_error "Kustomize directory not found: ${KUSTOMIZE_DIR}"
        exit 1
    fi

    # Build kustomize manifests
    log_info "Building kustomize manifests..."
    kustomize build "${KUSTOMIZE_DIR}" > /tmp/manifests-${ENVIRONMENT}.yaml

    # Show manifest preview
    log_info "Manifest preview (first 50 lines):"
    head -n 50 /tmp/manifests-${ENVIRONMENT}.yaml
    echo "..."
    echo ""

    # Confirm deployment
    read -p "Do you want to deploy these resources? (yes/no): " confirm
    if [[ ! "${confirm}" =~ ^[Yy](es)?$ ]]; then
        log_warning "Deployment cancelled by user"
        exit 0
    fi

    # Apply manifests
    log_info "Applying manifests..."
    kubectl apply -f /tmp/manifests-${ENVIRONMENT}.yaml

    log_success "Base resources deployed"
}

verify_deployment() {
    log_info "Verifying deployment..."

    echo ""
    echo "════════════════════════════════════════════════════════════"
    log_info "Deployments:"
    kubectl get deployments -n "${NAMESPACE}"
    echo ""

    log_info "Pods:"
    kubectl get pods -n "${NAMESPACE}"
    echo ""

    log_info "Services:"
    kubectl get services -n "${NAMESPACE}"
    echo ""

    log_info "Ingress:"
    kubectl get ingress -n "${NAMESPACE}"
    echo ""

    log_info "ConfigMaps:"
    kubectl get configmaps -n "${NAMESPACE}"
    echo ""

    log_info "Secrets:"
    kubectl get secrets -n "${NAMESPACE}"
    echo "════════════════════════════════════════════════════════════"
    echo ""
}

wait_for_deployments() {
    log_info "Waiting for deployments to be ready..."

    # Get all deployments in namespace
    local deployments=$(kubectl get deployments -n "${NAMESPACE}" -o name)

    if [ -z "${deployments}" ]; then
        log_warning "No deployments found in namespace"
        return
    fi

    for deployment in ${deployments}; do
        log_info "Waiting for ${deployment}..."
        kubectl rollout status "${deployment}" -n "${NAMESPACE}" --timeout=5m || {
            log_error "Deployment ${deployment} failed to become ready"
            return 1
        }
    done

    log_success "All deployments are ready"
}

run_health_checks() {
    log_info "Running health checks..."

    # Wait a bit for services to stabilize
    sleep 10

    # Check API health (if deployed)
    local api_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=broxiva-api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -n "${api_pod}" ]; then
        log_info "Testing API health endpoint..."
        if kubectl exec -n "${NAMESPACE}" "${api_pod}" -- curl -sf http://localhost:4000/api/health/live > /dev/null; then
            log_success "API health check passed"
        else
            log_error "API health check failed"
        fi
    else
        log_warning "API pod not found, skipping health check"
    fi

    # Check Web health (if deployed)
    local web_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=broxiva-web -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -n "${web_pod}" ]; then
        log_info "Testing Web health endpoint..."
        if kubectl exec -n "${NAMESPACE}" "${web_pod}" -- curl -sf http://localhost:3000/health > /dev/null; then
            log_success "Web health check passed"
        else
            log_error "Web health check failed"
        fi
    else
        log_warning "Web pod not found, skipping health check"
    fi
}

print_summary() {
    local env=$1

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                  Setup Complete!                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Environment ${ENVIRONMENT} is ready!"
    echo ""
    echo "Environment Details:"
    echo "  • Environment: ${ENVIRONMENT}"
    echo "  • Namespace: ${NAMESPACE}"
    echo "  • Cluster: ${AKS_CLUSTER}"
    echo "  • Resource Group: ${AKS_RESOURCE_GROUP}"
    echo "  • Domain: ${DOMAIN}"
    echo "  • API Domain: ${API_DOMAIN}"
    echo ""
    echo "Useful Commands:"
    echo "  • View pods:        kubectl get pods -n ${NAMESPACE}"
    echo "  • View logs:        kubectl logs -f deployment/broxiva-api -n ${NAMESPACE}"
    echo "  • View services:    kubectl get services -n ${NAMESPACE}"
    echo "  • View ingress:     kubectl get ingress -n ${NAMESPACE}"
    echo "  • Scale deployment: kubectl scale deployment/broxiva-api --replicas=3 -n ${NAMESPACE}"
    echo ""
    echo "Next Steps:"
    echo "  1. Verify DNS records point to ingress IP"
    echo "  2. Configure SSL certificates (if not using cert-manager)"
    echo "  3. Run smoke tests"
    echo "  4. Monitor application logs and metrics"
    echo ""
}

################################################################################
# Main Script
################################################################################

main() {
    print_banner

    # Check arguments
    if [ $# -ne 1 ]; then
        log_error "Usage: $0 [environment]"
        log_info "Valid environments: dev, staging, prod"
        exit 1
    fi

    local environment=$1

    # Validate environment
    if [[ ! "${environment}" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: ${environment}"
        log_info "Valid environments: dev, staging, prod"
        exit 1
    fi

    # Run setup steps
    check_prerequisites
    set_environment_variables "${environment}"
    authenticate_azure
    connect_to_aks
    verify_cluster
    create_namespace
    setup_secrets
    deploy_base_resources
    verify_deployment
    wait_for_deployments
    run_health_checks
    print_summary "${environment}"

    log_success "Setup completed successfully!"
}

# Run main function
main "$@"
