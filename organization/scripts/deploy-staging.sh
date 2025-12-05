#!/bin/bash

# ============================================
# CitadelBuy Staging Deployment Script
# ============================================
# This script automates the deployment of CitadelBuy to staging environment
# It includes building, pushing, deploying, migrating, and testing

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly DEPLOYMENT_LOG="${PROJECT_ROOT}/logs/staging-deploy-${TIMESTAMP}.log"

# Container Registry Configuration
readonly REGISTRY="${REGISTRY:-ghcr.io}"
readonly IMAGE_NAME="${IMAGE_NAME:-citadelplatforms/citadelbuy}"
readonly IMAGE_TAG="${IMAGE_TAG:-staging-$(git rev-parse --short HEAD)}"

# Kubernetes Configuration
readonly K8S_NAMESPACE="${K8S_NAMESPACE:-citadelbuy-staging}"
readonly K8S_CONTEXT="${K8S_CONTEXT:-staging}"
readonly KUBECTL="${KUBECTL:-kubectl}"

# Health Check Configuration
readonly MAX_RETRIES=30
readonly RETRY_DELAY=10

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

# ============================================
# Utility Functions
# ============================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${message}"
            echo "[${timestamp}] [INFO] ${message}" >> "$DEPLOYMENT_LOG"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${message}"
            echo "[${timestamp}] [SUCCESS] ${message}" >> "$DEPLOYMENT_LOG"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${message}"
            echo "[${timestamp}] [WARNING] ${message}" >> "$DEPLOYMENT_LOG"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}"
            echo "[${timestamp}] [ERROR] ${message}" >> "$DEPLOYMENT_LOG"
            ;;
    esac
}

check_prerequisites() {
    log INFO "Checking prerequisites..."

    local missing_deps=()

    # Check required commands
    for cmd in docker git kubectl pnpm curl jq; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log ERROR "Missing required dependencies: ${missing_deps[*]}"
        log ERROR "Please install missing dependencies before running this script"
        return 1
    fi

    # Check Docker is running
    if ! docker info &> /dev/null; then
        log ERROR "Docker is not running. Please start Docker and try again"
        return 1
    fi

    # Check kubectl context
    local current_context
    current_context=$($KUBECTL config current-context 2>/dev/null || echo "")
    if [ -z "$current_context" ]; then
        log ERROR "No Kubernetes context configured"
        return 1
    fi

    log SUCCESS "All prerequisites satisfied"
    log INFO "Current kubectl context: $current_context"

    return 0
}

confirm_deployment() {
    log INFO "Deployment Configuration:"
    echo "  Registry:   $REGISTRY"
    echo "  Image:      $IMAGE_NAME:$IMAGE_TAG"
    echo "  Namespace:  $K8S_NAMESPACE"
    echo "  Context:    $($KUBECTL config current-context)"
    echo ""

    read -p "Proceed with staging deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log WARNING "Deployment cancelled by user"
        exit 0
    fi
}

# ============================================
# Build Functions
# ============================================

build_images() {
    log INFO "Building Docker images..."

    # Build API image
    log INFO "Building API image..."
    docker build \
        -t "${REGISTRY}/${IMAGE_NAME}-api:${IMAGE_TAG}" \
        -t "${REGISTRY}/${IMAGE_NAME}-api:staging-latest" \
        -f "${PROJECT_ROOT}/apps/api/Dockerfile" \
        --build-arg NODE_ENV=staging \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        "${PROJECT_ROOT}/apps/api" || {
            log ERROR "Failed to build API image"
            return 1
        }

    # Build Web image
    log INFO "Building Web image..."
    docker build \
        -t "${REGISTRY}/${IMAGE_NAME}-web:${IMAGE_TAG}" \
        -t "${REGISTRY}/${IMAGE_NAME}-web:staging-latest" \
        -f "${PROJECT_ROOT}/apps/web/Dockerfile" \
        --build-arg NODE_ENV=staging \
        --build-arg NEXT_PUBLIC_API_URL="${STAGING_API_URL:-https://staging-api.citadelbuy.com}" \
        "${PROJECT_ROOT}/apps/web" || {
            log ERROR "Failed to build Web image"
            return 1
        }

    log SUCCESS "Docker images built successfully"
    return 0
}

push_images() {
    log INFO "Pushing Docker images to registry..."

    # Push API images
    log INFO "Pushing API image..."
    docker push "${REGISTRY}/${IMAGE_NAME}-api:${IMAGE_TAG}" || {
        log ERROR "Failed to push API image with tag ${IMAGE_TAG}"
        return 1
    }
    docker push "${REGISTRY}/${IMAGE_NAME}-api:staging-latest" || {
        log ERROR "Failed to push API image with tag staging-latest"
        return 1
    }

    # Push Web images
    log INFO "Pushing Web image..."
    docker push "${REGISTRY}/${IMAGE_NAME}-web:${IMAGE_TAG}" || {
        log ERROR "Failed to push Web image with tag ${IMAGE_TAG}"
        return 1
    }
    docker push "${REGISTRY}/${IMAGE_NAME}-web:staging-latest" || {
        log ERROR "Failed to push Web image with tag staging-latest"
        return 1
    }

    log SUCCESS "Docker images pushed successfully"
    return 0
}

# ============================================
# Deployment Functions
# ============================================

deploy_to_kubernetes() {
    log INFO "Deploying to Kubernetes cluster..."

    # Create namespace if it doesn't exist
    if ! $KUBECTL get namespace "$K8S_NAMESPACE" &> /dev/null; then
        log INFO "Creating namespace: $K8S_NAMESPACE"
        $KUBECTL create namespace "$K8S_NAMESPACE" || {
            log ERROR "Failed to create namespace"
            return 1
        }
    fi

    # Apply configurations
    log INFO "Applying Kubernetes configurations..."
    $KUBECTL apply -f "${PROJECT_ROOT}/infrastructure/kubernetes/staging/" -n "$K8S_NAMESPACE" || {
        log ERROR "Failed to apply Kubernetes configurations"
        return 1
    }

    # Update image tags
    log INFO "Updating deployment image tags..."
    $KUBECTL set image deployment/citadelbuy-api \
        api="${REGISTRY}/${IMAGE_NAME}-api:${IMAGE_TAG}" \
        -n "$K8S_NAMESPACE" || {
        log ERROR "Failed to update API deployment image"
        return 1
    }

    $KUBECTL set image deployment/citadelbuy-web \
        web="${REGISTRY}/${IMAGE_NAME}-web:${IMAGE_TAG}" \
        -n "$K8S_NAMESPACE" || {
        log ERROR "Failed to update Web deployment image"
        return 1
    }

    log SUCCESS "Kubernetes configurations applied"
    return 0
}

run_database_migrations() {
    log INFO "Running database migrations..."

    # Get the first API pod
    local api_pod
    api_pod=$($KUBECTL get pods -n "$K8S_NAMESPACE" -l app=citadelbuy-api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$api_pod" ]; then
        log ERROR "No API pod found to run migrations"
        return 1
    fi

    log INFO "Running migrations in pod: $api_pod"
    $KUBECTL exec -n "$K8S_NAMESPACE" "$api_pod" -- npx prisma migrate deploy || {
        log ERROR "Failed to run database migrations"
        return 1
    }

    log SUCCESS "Database migrations completed"
    return 0
}

wait_for_rollout() {
    log INFO "Waiting for deployments to roll out..."

    # Wait for API deployment
    log INFO "Waiting for API deployment..."
    $KUBECTL rollout status deployment/citadelbuy-api \
        -n "$K8S_NAMESPACE" \
        --timeout=300s || {
        log ERROR "API deployment rollout failed or timed out"
        return 1
    }

    # Wait for Web deployment
    log INFO "Waiting for Web deployment..."
    $KUBECTL rollout status deployment/citadelbuy-web \
        -n "$K8S_NAMESPACE" \
        --timeout=300s || {
        log ERROR "Web deployment rollout failed or timed out"
        return 1
    }

    log SUCCESS "All deployments rolled out successfully"
    return 0
}

check_pod_health() {
    log INFO "Checking pod health..."

    # Check API pods
    local api_pods_ready
    api_pods_ready=$($KUBECTL get deployment citadelbuy-api -n "$K8S_NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local api_pods_desired
    api_pods_desired=$($KUBECTL get deployment citadelbuy-api -n "$K8S_NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")

    log INFO "API pods: ${api_pods_ready}/${api_pods_desired} ready"

    # Check Web pods
    local web_pods_ready
    web_pods_ready=$($KUBECTL get deployment citadelbuy-web -n "$K8S_NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local web_pods_desired
    web_pods_desired=$($KUBECTL get deployment citadelbuy-web -n "$K8S_NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")

    log INFO "Web pods: ${web_pods_ready}/${web_pods_desired} ready"

    if [ "$api_pods_ready" -eq "$api_pods_desired" ] && [ "$web_pods_ready" -eq "$web_pods_desired" ]; then
        log SUCCESS "All pods are healthy"
        return 0
    else
        log WARNING "Some pods are not ready yet"
        return 1
    fi
}

# ============================================
# Smoke Tests
# ============================================

run_smoke_tests() {
    log INFO "Running smoke tests..."

    # Run smoke test script
    if [ -f "${SCRIPT_DIR}/smoke-tests.sh" ]; then
        bash "${SCRIPT_DIR}/smoke-tests.sh" "$K8S_NAMESPACE" || {
            log ERROR "Smoke tests failed"
            return 1
        }
    else
        log WARNING "Smoke test script not found, skipping smoke tests"
    fi

    log SUCCESS "Smoke tests passed"
    return 0
}

# ============================================
# Reporting Functions
# ============================================

generate_deployment_report() {
    log INFO "Generating deployment report..."

    local report_file="${PROJECT_ROOT}/logs/staging-deploy-report-${TIMESTAMP}.txt"

    cat > "$report_file" << EOF
CitadelBuy Staging Deployment Report
====================================
Timestamp: $(date)
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git rev-parse --abbrev-ref HEAD)

Docker Images:
  API: ${REGISTRY}/${IMAGE_NAME}-api:${IMAGE_TAG}
  Web: ${REGISTRY}/${IMAGE_NAME}-web:${IMAGE_TAG}

Kubernetes Deployment:
  Namespace: $K8S_NAMESPACE
  Context: $($KUBECTL config current-context)

Pod Status:
EOF

    $KUBECTL get pods -n "$K8S_NAMESPACE" >> "$report_file"

    cat >> "$report_file" << EOF

Service Status:
EOF

    $KUBECTL get services -n "$K8S_NAMESPACE" >> "$report_file"

    cat >> "$report_file" << EOF

Ingress Status:
EOF

    $KUBECTL get ingress -n "$K8S_NAMESPACE" >> "$report_file"

    log SUCCESS "Deployment report saved to: $report_file"

    # Display summary
    echo ""
    echo "======================================"
    echo "Deployment Summary"
    echo "======================================"
    cat "$report_file"
}

# ============================================
# Rollback Functions
# ============================================

rollback_deployment() {
    log WARNING "Rolling back deployment..."

    # Rollback API deployment
    log INFO "Rolling back API deployment..."
    $KUBECTL rollout undo deployment/citadelbuy-api -n "$K8S_NAMESPACE" || {
        log ERROR "Failed to rollback API deployment"
    }

    # Rollback Web deployment
    log INFO "Rolling back Web deployment..."
    $KUBECTL rollout undo deployment/citadelbuy-web -n "$K8S_NAMESPACE" || {
        log ERROR "Failed to rollback Web deployment"
    }

    log SUCCESS "Rollback initiated"
}

# ============================================
# Main Deployment Flow
# ============================================

main() {
    log INFO "Starting CitadelBuy staging deployment..."
    log INFO "Deployment log: $DEPLOYMENT_LOG"

    # Check prerequisites
    if ! check_prerequisites; then
        log ERROR "Prerequisites check failed"
        exit 1
    fi

    # Confirm deployment
    if [ "${SKIP_CONFIRMATION:-false}" != "true" ]; then
        confirm_deployment
    fi

    # Build Docker images
    if ! build_images; then
        log ERROR "Docker image build failed"
        exit 1
    fi

    # Push Docker images
    if ! push_images; then
        log ERROR "Docker image push failed"
        exit 1
    fi

    # Deploy to Kubernetes
    if ! deploy_to_kubernetes; then
        log ERROR "Kubernetes deployment failed"
        rollback_deployment
        exit 1
    fi

    # Wait for rollout
    if ! wait_for_rollout; then
        log ERROR "Deployment rollout failed"
        rollback_deployment
        exit 1
    fi

    # Run database migrations
    if ! run_database_migrations; then
        log ERROR "Database migrations failed"
        log WARNING "Deployment succeeded but migrations failed - manual intervention required"
        generate_deployment_report
        exit 1
    fi

    # Check pod health
    sleep 10 # Give pods a moment to stabilize
    if ! check_pod_health; then
        log WARNING "Some pods may not be fully healthy yet"
    fi

    # Run smoke tests
    if ! run_smoke_tests; then
        log ERROR "Smoke tests failed"
        log WARNING "Deployment succeeded but smoke tests failed - investigate before promoting"
        generate_deployment_report
        exit 1
    fi

    # Generate deployment report
    generate_deployment_report

    log SUCCESS "Staging deployment completed successfully!"
    log INFO "Staging environment is ready for testing"

    return 0
}

# ============================================
# Script Entry Point
# ============================================

# Trap errors and exit
trap 'log ERROR "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"

exit $?
