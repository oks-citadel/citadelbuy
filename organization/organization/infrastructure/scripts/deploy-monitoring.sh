#!/bin/bash
# Broxiva Monitoring Stack Deployment Script
# This script deploys the complete observability stack for Broxiva on Azure AKS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AKS_CLUSTER_NAME="${AKS_CLUSTER_NAME:-broxiva-prod-aks}"
RESOURCE_GROUP="${RESOURCE_GROUP:-broxiva-prod-rg}"
NAMESPACE_MONITORING="${NAMESPACE_MONITORING:-broxiva-monitoring}"
NAMESPACE_APP="${NAMESPACE_APP:-broxiva-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$INFRA_DIR/kubernetes"
AZURE_DIR="$INFRA_DIR/azure"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    print_success "kubectl is installed"

    # Check if az CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        exit 1
    fi
    print_success "Azure CLI is installed"

    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        print_warning "Helm is not installed - some features may not work"
    else
        print_success "Helm is installed"
    fi

    # Check Azure login
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure. Run 'az login' first"
        exit 1
    fi
    print_success "Logged in to Azure"

    # Get AKS credentials
    print_info "Getting AKS credentials..."
    az aks get-credentials --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" --overwrite-existing
    print_success "AKS credentials configured"
}

check_aks_monitoring() {
    print_header "Checking AKS Monitoring Setup"

    # Check if Container Insights is enabled
    print_info "Checking Azure Monitor Container Insights..."
    INSIGHTS_ENABLED=$(az aks show --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" \
        --query "addonProfiles.omsagent.enabled" -o tsv)

    if [ "$INSIGHTS_ENABLED" == "true" ]; then
        print_success "Container Insights is enabled"

        # Get Log Analytics Workspace ID
        WORKSPACE_ID=$(az aks show --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID" -o tsv)
        print_info "Log Analytics Workspace: $WORKSPACE_ID"
    else
        print_warning "Container Insights is not enabled"
        read -p "Do you want to enable Container Insights? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Enabling Container Insights..."
            az aks enable-addons --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" --addons monitoring
            print_success "Container Insights enabled"
        fi
    fi

    # Check monitoring pods in kube-system
    print_info "Checking monitoring pods in kube-system..."
    kubectl get pods -n kube-system | grep -i monitor || print_warning "No monitoring pods found in kube-system"
}

create_namespaces() {
    print_header "Creating Namespaces"

    # Create monitoring namespace
    if kubectl get namespace "$NAMESPACE_MONITORING" &> /dev/null; then
        print_warning "Namespace $NAMESPACE_MONITORING already exists"
    else
        kubectl create namespace "$NAMESPACE_MONITORING"
        kubectl label namespace "$NAMESPACE_MONITORING" name=monitoring environment=production
        print_success "Created namespace $NAMESPACE_MONITORING"
    fi

    # Create application namespace if it doesn't exist
    if kubectl get namespace "$NAMESPACE_APP" &> /dev/null; then
        print_success "Namespace $NAMESPACE_APP exists"
    else
        kubectl create namespace "$NAMESPACE_APP"
        kubectl label namespace "$NAMESPACE_APP" environment=production
        print_success "Created namespace $NAMESPACE_APP"
    fi
}

deploy_prometheus() {
    print_header "Deploying Prometheus"

    # Deploy Prometheus
    if [ -f "$K8S_DIR/monitoring/prometheus-deployment.yaml" ]; then
        kubectl apply -f "$K8S_DIR/monitoring/prometheus-deployment.yaml"
        print_success "Prometheus deployed"
    else
        print_error "Prometheus deployment file not found"
        return 1
    fi

    # Wait for Prometheus to be ready
    print_info "Waiting for Prometheus to be ready..."
    kubectl wait --for=condition=ready pod -l app=prometheus -n "$NAMESPACE_MONITORING" --timeout=300s
    print_success "Prometheus is ready"
}

deploy_prometheus_alerts() {
    print_header "Deploying Prometheus Alert Rules"

    if [ -f "$K8S_DIR/monitoring/prometheus-alerts.yaml" ]; then
        kubectl apply -f "$K8S_DIR/monitoring/prometheus-alerts.yaml"
        print_success "Prometheus alert rules deployed"
    else
        print_warning "Prometheus alerts file not found"
    fi
}

deploy_servicemonitors() {
    print_header "Deploying ServiceMonitors"

    if [ -f "$K8S_DIR/monitoring/servicemonitor-broxiva.yaml" ]; then
        kubectl apply -f "$K8S_DIR/monitoring/servicemonitor-broxiva.yaml"
        print_success "ServiceMonitors deployed"
    else
        print_warning "ServiceMonitor file not found"
    fi

    # Also deploy production servicemonitor if exists
    if [ -f "$K8S_DIR/production/servicemonitor.yaml" ]; then
        kubectl apply -f "$K8S_DIR/production/servicemonitor.yaml"
        print_success "Production ServiceMonitor deployed"
    fi
}

deploy_grafana() {
    print_header "Deploying Grafana"

    if [ -f "$K8S_DIR/monitoring/grafana-deployment.yaml" ]; then
        kubectl apply -f "$K8S_DIR/monitoring/grafana-deployment.yaml"
        print_success "Grafana deployed"

        # Wait for Grafana to be ready
        print_info "Waiting for Grafana to be ready..."
        kubectl wait --for=condition=ready pod -l app=grafana -n "$NAMESPACE_MONITORING" --timeout=300s
        print_success "Grafana is ready"

        # Get Grafana admin password
        print_info "Grafana admin credentials:"
        echo "Username: admin"
        kubectl get secret grafana-secrets -n "$NAMESPACE_MONITORING" -o jsonpath='{.data.admin-password}' | base64 -d
        echo
    else
        print_error "Grafana deployment file not found"
        return 1
    fi
}

deploy_alertmanager() {
    print_header "Deploying AlertManager"

    if [ -f "$K8S_DIR/monitoring/alertmanager-deployment.yaml" ]; then
        # Check if secrets need to be updated
        print_warning "Please ensure AlertManager secrets are configured in alertmanager-deployment.yaml"
        read -p "Have you updated the AlertManager webhook URLs and API keys? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Skipping AlertManager deployment. Please update secrets first."
            return 0
        fi

        kubectl apply -f "$K8S_DIR/monitoring/alertmanager-deployment.yaml"
        print_success "AlertManager deployed"

        # Wait for AlertManager to be ready
        print_info "Waiting for AlertManager to be ready..."
        kubectl wait --for=condition=ready pod -l app=alertmanager -n "$NAMESPACE_MONITORING" --timeout=300s
        print_success "AlertManager is ready"
    else
        print_warning "AlertManager deployment file not found"
    fi
}

deploy_exporters() {
    print_header "Deploying Metric Exporters"

    # PostgreSQL Exporter
    print_info "Deploying PostgreSQL exporter..."
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-exporter
  namespace: $NAMESPACE_APP
  labels:
    app: postgres-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-exporter
  template:
    metadata:
      labels:
        app: postgres-exporter
    spec:
      containers:
      - name: postgres-exporter
        image: prometheuscommunity/postgres-exporter:latest
        ports:
        - containerPort: 9187
          name: metrics
        env:
        - name: DATA_SOURCE_NAME
          valueFrom:
            secretKeyRef:
              name: postgres-connection
              key: connection-string
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
EOF
    print_success "PostgreSQL exporter deployed"

    # Redis Exporter
    print_info "Deploying Redis exporter..."
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: $NAMESPACE_APP
  labels:
    app: redis-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
    spec:
      containers:
      - name: redis-exporter
        image: oliver006/redis_exporter:latest
        ports:
        - containerPort: 9121
          name: metrics
        env:
        - name: REDIS_ADDR
          value: "redis.${NAMESPACE_APP}.svc.cluster.local:6379"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
EOF
    print_success "Redis exporter deployed"
}

deploy_azure_alerts() {
    print_header "Deploying Azure Monitor Alert Rules"

    if [ -f "$AZURE_DIR/monitoring/alert-rules-enhanced.bicep" ]; then
        print_info "Getting Log Analytics Workspace ID..."
        WORKSPACE_ID=$(az aks show --name "$AKS_CLUSTER_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID" -o tsv)

        if [ -z "$WORKSPACE_ID" ]; then
            print_warning "Log Analytics Workspace not found. Skipping Azure alert deployment."
            return 0
        fi

        print_info "Deploying Azure Monitor alerts via Bicep..."
        az deployment group create \
            --resource-group "$RESOURCE_GROUP" \
            --template-file "$AZURE_DIR/monitoring/alert-rules-enhanced.bicep" \
            --parameters \
                aksClusterName="$AKS_CLUSTER_NAME" \
                logAnalyticsWorkspaceId="$WORKSPACE_ID" \
                applicationGatewayName="broxiva-appgw" \
                keyVaultName="broxiva-keyvault"

        print_success "Azure Monitor alerts deployed"
    else
        print_warning "Azure alert rules Bicep file not found"
    fi
}

configure_dashboards() {
    print_header "Configuring Grafana Dashboards"

    if [ -f "$K8S_DIR/monitoring/grafana-dashboards.json" ]; then
        print_info "Dashboard JSON file found. Import manually via Grafana UI."
        print_info "Dashboard file: $K8S_DIR/monitoring/grafana-dashboards.json"
    fi
}

display_access_info() {
    print_header "Access Information"

    # Get Prometheus service
    print_info "Prometheus:"
    kubectl get svc prometheus -n "$NAMESPACE_MONITORING" -o jsonpath='{.spec.clusterIP}'
    echo " (ClusterIP - Use port-forward: kubectl port-forward -n $NAMESPACE_MONITORING svc/prometheus 9090:9090)"

    # Get Grafana service
    print_info "Grafana:"
    kubectl get svc grafana -n "$NAMESPACE_MONITORING" -o jsonpath='{.spec.clusterIP}'
    echo " (ClusterIP - Use port-forward: kubectl port-forward -n $NAMESPACE_MONITORING svc/grafana 3000:3000)"

    # Get AlertManager service
    print_info "AlertManager:"
    kubectl get svc alertmanager -n "$NAMESPACE_MONITORING" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "Not deployed"
    echo " (ClusterIP - Use port-forward: kubectl port-forward -n $NAMESPACE_MONITORING svc/alertmanager 9093:9093)"
}

verify_deployment() {
    print_header "Verifying Deployment"

    print_info "Checking pod status in $NAMESPACE_MONITORING..."
    kubectl get pods -n "$NAMESPACE_MONITORING"

    print_info "\nChecking services in $NAMESPACE_MONITORING..."
    kubectl get svc -n "$NAMESPACE_MONITORING"

    print_info "\nChecking ServiceMonitors..."
    kubectl get servicemonitors -n "$NAMESPACE_MONITORING" 2>/dev/null || print_warning "ServiceMonitor CRD not found"

    print_success "Deployment verification complete"
}

# Main execution
main() {
    print_header "Broxiva Monitoring Stack Deployment"

    check_prerequisites
    check_aks_monitoring
    create_namespaces

    # Deploy core monitoring components
    deploy_prometheus
    deploy_prometheus_alerts
    deploy_servicemonitors
    deploy_grafana
    deploy_alertmanager

    # Deploy metric exporters
    deploy_exporters

    # Deploy Azure alerts
    deploy_azure_alerts

    # Configure dashboards
    configure_dashboards

    # Verify and display info
    verify_deployment
    display_access_info

    print_header "Deployment Complete"
    print_success "Monitoring stack deployed successfully!"
    print_info "\nNext steps:"
    echo "1. Access Grafana: kubectl port-forward -n $NAMESPACE_MONITORING svc/grafana 3000:3000"
    echo "2. Import dashboards from: $K8S_DIR/monitoring/grafana-dashboards.json"
    echo "3. Configure AlertManager secrets in: $K8S_DIR/monitoring/alertmanager-deployment.yaml"
    echo "4. Review alert rules in Azure Portal"
    echo "5. See MONITORING_GUIDE.md for detailed documentation"
}

# Run main function
main "$@"
