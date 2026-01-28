#!/bin/bash
#
# Broxiva AKS Monitoring Setup Script
# This script sets up comprehensive monitoring and alerting for the broxiva-prod-aks cluster
#
# Usage: ./setup-aks-monitoring.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AKS_CLUSTER_NAME="broxiva-prod-aks"
RESOURCE_GROUP="broxiva-prod-rg"
MONITORING_NAMESPACE="broxiva-monitoring"
PRODUCTION_NAMESPACE="broxiva-production"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_MONITORING_DIR="$(dirname "$SCRIPT_DIR")/kubernetes/monitoring"

# Helper functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if az CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI (az) is not installed. Please install it first."
        exit 1
    fi

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first."
        exit 1
    fi

    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Run 'az login' first."
        exit 1
    fi

    log_success "All prerequisites met"
}

get_aks_credentials() {
    log_info "Getting AKS cluster credentials..."

    if az aks get-credentials \
        --name "$AKS_CLUSTER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --overwrite-existing; then
        log_success "AKS credentials retrieved successfully"
    else
        log_error "Failed to get AKS credentials"
        exit 1
    fi
}

check_monitoring_addon() {
    log_info "Checking if Azure Monitor addon is enabled..."

    ADDON_STATUS=$(az aks show \
        --name "$AKS_CLUSTER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "addonProfiles.omsagent.enabled" \
        -o tsv)

    if [ "$ADDON_STATUS" == "true" ]; then
        log_success "Azure Monitor addon is enabled"

        # Get workspace ID
        WORKSPACE_ID=$(az aks show \
            --name "$AKS_CLUSTER_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --query "addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID" \
            -o tsv)

        log_info "Log Analytics Workspace: $WORKSPACE_ID"
        return 0
    else
        log_warning "Azure Monitor addon is not enabled"
        return 1
    fi
}

enable_monitoring_addon() {
    log_info "Enabling Azure Monitor addon..."

    if az aks enable-addons \
        --name "$AKS_CLUSTER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --addons monitoring; then
        log_success "Azure Monitor addon enabled successfully"
        sleep 10  # Wait for addon to initialize
    else
        log_error "Failed to enable Azure Monitor addon"
        exit 1
    fi
}

create_namespaces() {
    log_info "Creating namespaces..."

    # Create monitoring namespace
    if kubectl get namespace "$MONITORING_NAMESPACE" &> /dev/null; then
        log_info "Namespace $MONITORING_NAMESPACE already exists"
    else
        kubectl create namespace "$MONITORING_NAMESPACE"
        log_success "Created namespace: $MONITORING_NAMESPACE"
    fi

    # Create production namespace if not exists
    if kubectl get namespace "$PRODUCTION_NAMESPACE" &> /dev/null; then
        log_info "Namespace $PRODUCTION_NAMESPACE already exists"
    else
        kubectl create namespace "$PRODUCTION_NAMESPACE"
        log_success "Created namespace: $PRODUCTION_NAMESPACE"
    fi
}

deploy_metrics_server() {
    log_info "Deploying metrics-server..."

    # Check if metrics-server already exists
    if kubectl get deployment metrics-server -n kube-system &> /dev/null; then
        log_warning "metrics-server already exists, updating..."
        kubectl delete deployment metrics-server -n kube-system --ignore-not-found=true
        sleep 5
    fi

    # Deploy from manifest file if exists, otherwise use official release
    if [ -f "$K8S_MONITORING_DIR/metrics-server.yaml" ]; then
        log_info "Deploying metrics-server from local manifest..."
        kubectl apply -f "$K8S_MONITORING_DIR/metrics-server.yaml"
    else
        log_info "Deploying metrics-server from official release..."
        kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

        # Patch for AKS
        log_info "Patching metrics-server for AKS compatibility..."
        kubectl patch deployment metrics-server -n kube-system --type='json' \
            -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
    fi

    log_success "metrics-server deployed"
}

wait_for_metrics_server() {
    log_info "Waiting for metrics-server to be ready..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if kubectl get apiservice v1beta1.metrics.k8s.io -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep -q "True"; then
            log_success "metrics-server is ready"
            return 0
        fi

        attempt=$((attempt + 1))
        log_info "Waiting... (attempt $attempt/$max_attempts)"
        sleep 10
    done

    log_error "metrics-server did not become ready in time"
    return 1
}

verify_metrics() {
    log_info "Verifying metrics collection..."

    # Wait a bit for metrics to populate
    sleep 30

    # Test node metrics
    log_info "Testing 'kubectl top nodes'..."
    if kubectl top nodes &> /dev/null; then
        log_success "Node metrics are available"
        kubectl top nodes
    else
        log_warning "Node metrics not yet available (may take a few minutes)"
    fi

    echo ""

    # Test pod metrics
    log_info "Testing 'kubectl top pods'..."
    if kubectl top pods -A &> /dev/null; then
        log_success "Pod metrics are available"
        kubectl top pods -A | head -n 10
    else
        log_warning "Pod metrics not yet available (may take a few minutes)"
    fi
}

deploy_prometheus() {
    log_info "Deploying Prometheus..."

    if [ -f "$K8S_MONITORING_DIR/prometheus-deployment.yaml" ]; then
        kubectl apply -f "$K8S_MONITORING_DIR/prometheus-deployment.yaml"
        log_success "Prometheus deployed"
    else
        log_warning "Prometheus deployment file not found at $K8S_MONITORING_DIR/prometheus-deployment.yaml"
    fi
}

deploy_grafana() {
    log_info "Deploying Grafana..."

    if [ -f "$K8S_MONITORING_DIR/grafana-deployment.yaml" ]; then
        kubectl apply -f "$K8S_MONITORING_DIR/grafana-deployment.yaml"
        log_success "Grafana deployed"
    else
        log_warning "Grafana deployment file not found at $K8S_MONITORING_DIR/grafana-deployment.yaml"
    fi
}

deploy_prometheus_alerts() {
    log_info "Deploying Prometheus alerts..."

    if [ -f "$K8S_MONITORING_DIR/prometheus-alerts.yaml" ]; then
        kubectl apply -f "$K8S_MONITORING_DIR/prometheus-alerts.yaml"
        log_success "Prometheus alerts deployed"
    else
        log_warning "Prometheus alerts file not found at $K8S_MONITORING_DIR/prometheus-alerts.yaml"
    fi
}

deploy_service_monitors() {
    log_info "Deploying ServiceMonitors..."

    if [ -f "$(dirname "$K8S_MONITORING_DIR")/production/servicemonitor.yaml" ]; then
        kubectl apply -f "$(dirname "$K8S_MONITORING_DIR")/production/servicemonitor.yaml"
        log_success "ServiceMonitors deployed"
    else
        log_warning "ServiceMonitor file not found"
    fi
}

apply_azure_monitor_config() {
    log_info "Applying Azure Monitor configuration..."

    if [ -f "$K8S_MONITORING_DIR/azure-monitor-integration.yaml" ]; then
        kubectl apply -f "$K8S_MONITORING_DIR/azure-monitor-integration.yaml"
        log_success "Azure Monitor configuration applied"
    else
        log_warning "Azure Monitor integration file not found at $K8S_MONITORING_DIR/azure-monitor-integration.yaml"
    fi
}

show_monitoring_status() {
    log_info "Monitoring Status Summary"
    echo "========================================"

    echo -e "\n${BLUE}Namespaces:${NC}"
    kubectl get namespaces | grep -E "(NAME|monitoring|production)" || true

    echo -e "\n${BLUE}Metrics Server:${NC}"
    kubectl get deployment metrics-server -n kube-system || echo "Not deployed"

    echo -e "\n${BLUE}Prometheus:${NC}"
    kubectl get deployment prometheus -n "$MONITORING_NAMESPACE" || echo "Not deployed"

    echo -e "\n${BLUE}Grafana:${NC}"
    kubectl get deployment grafana -n "$MONITORING_NAMESPACE" || echo "Not deployed"

    echo -e "\n${BLUE}ServiceMonitors:${NC}"
    kubectl get servicemonitor -n "$PRODUCTION_NAMESPACE" || echo "Not deployed"

    echo -e "\n${BLUE}Azure Monitor OMS Agent:${NC}"
    kubectl get daemonset omsagent -n kube-system || echo "Not deployed"

    echo -e "\n${BLUE}API Services:${NC}"
    kubectl get apiservice | grep metrics || true

    echo "========================================"
}

generate_report() {
    log_info "Generating monitoring setup report..."

    REPORT_FILE="monitoring-setup-report-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "Broxiva AKS Monitoring Setup Report"
        echo "===================================="
        echo "Generated: $(date)"
        echo "Cluster: $AKS_CLUSTER_NAME"
        echo "Resource Group: $RESOURCE_GROUP"
        echo ""

        echo "1. Azure Monitor Addon Status:"
        az aks show --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "addonProfiles.omsagent" -o json || echo "Error retrieving addon status"
        echo ""

        echo "2. Kubernetes Components:"
        kubectl get all -n "$MONITORING_NAMESPACE" || echo "No resources in monitoring namespace"
        echo ""

        echo "3. Metrics Server Status:"
        kubectl get deployment metrics-server -n kube-system -o wide || echo "Metrics server not found"
        echo ""

        echo "4. Node Metrics:"
        kubectl top nodes || echo "Metrics not available yet"
        echo ""

        echo "5. Pod Metrics (Top 20):"
        kubectl top pods -A | head -n 20 || echo "Metrics not available yet"
        echo ""

        echo "6. AlertManager Rules:"
        kubectl get prometheusrules -A || echo "No Prometheus rules configured"
        echo ""

        echo "End of Report"
    } > "$REPORT_FILE"

    log_success "Report generated: $REPORT_FILE"
}

show_next_steps() {
    echo ""
    log_info "Next Steps:"
    echo "========================================"
    echo "1. Access Azure Monitor Container Insights:"
    echo "   - Go to Azure Portal"
    echo "   - Navigate to: AKS cluster > Insights"
    echo "   - View Cluster, Nodes, Controllers, Containers tabs"
    echo ""
    echo "2. Configure Alert Rules in Azure Monitor:"
    echo "   - Go to: AKS cluster > Alerts > New alert rule"
    echo "   - Set up critical alerts for:"
    echo "     * High CPU/Memory usage"
    echo "     * Pod crashes and restarts"
    echo "     * Node health issues"
    echo ""
    echo "3. Access Prometheus (if deployed):"
    echo "   kubectl port-forward -n $MONITORING_NAMESPACE svc/prometheus 9090:9090"
    echo "   Open: http://localhost:9090"
    echo ""
    echo "4. Access Grafana (if deployed):"
    echo "   kubectl port-forward -n $MONITORING_NAMESPACE svc/grafana 3000:3000"
    echo "   Open: http://localhost:3000"
    echo "   Default credentials: admin/changeme"
    echo ""
    echo "5. Test Metrics:"
    echo "   kubectl top nodes"
    echo "   kubectl top pods -A"
    echo "   kubectl top pods -n $PRODUCTION_NAMESPACE"
    echo ""
    echo "6. View Logs:"
    echo "   kubectl logs -n $MONITORING_NAMESPACE -l app=prometheus"
    echo "   kubectl logs -n kube-system -l app=metrics-server"
    echo "========================================"
}

# Main execution
main() {
    echo ""
    log_info "Starting Broxiva AKS Monitoring Setup"
    echo "========================================"
    echo ""

    check_prerequisites
    get_aks_credentials

    # Check and enable Azure Monitor addon
    if ! check_monitoring_addon; then
        enable_monitoring_addon
        check_monitoring_addon
    fi

    # Create namespaces
    create_namespaces

    # Apply Azure Monitor configuration
    apply_azure_monitor_config

    # Deploy metrics-server
    deploy_metrics_server
    wait_for_metrics_server

    # Deploy monitoring stack
    deploy_prometheus_alerts
    deploy_prometheus
    deploy_grafana
    deploy_service_monitors

    # Verify setup
    verify_metrics

    # Show status
    echo ""
    show_monitoring_status

    # Generate report
    generate_report

    # Show next steps
    show_next_steps

    echo ""
    log_success "Monitoring setup completed successfully!"
    echo ""
}

# Run main function
main "$@"
