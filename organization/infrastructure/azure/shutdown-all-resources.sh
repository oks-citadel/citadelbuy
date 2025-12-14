#!/bin/bash

# =============================================================================
# Azure Resource Shutdown Script - Save Costs
# =============================================================================
# Purpose: Stop/Deallocate all compute resources to minimize Azure costs
# Preserves: Key Vaults, Terraform State Storage, DNS Zones, Container Registry
# =============================================================================

set -e

# Configuration
SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
ENVIRONMENTS=("dev" "staging" "prod")
PROJECT_PREFIX="broxiva"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() { echo -e "\n${GREEN}========================================${NC}"; echo -e "${GREEN} $1${NC}"; echo -e "${GREEN}========================================${NC}\n"; }

# Check if running in dry-run mode
DRY_RUN=${DRY_RUN:-false}
if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "Running in DRY-RUN mode - no changes will be made"
fi

# Function to execute or simulate command
execute() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: $*"
    else
        "$@"
    fi
}

# =============================================================================
# Pre-flight Checks
# =============================================================================
log_section "Pre-flight Checks"

# Verify Azure CLI is installed
if ! command -v az &> /dev/null; then
    log_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Verify logged in to Azure
log_info "Checking Azure login status..."
if ! az account show &> /dev/null; then
    log_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Set subscription
log_info "Setting subscription to $SUBSCRIPTION_ID"
az account set --subscription "$SUBSCRIPTION_ID"
log_success "Subscription set successfully"

# Get current account info
ACCOUNT_INFO=$(az account show --query "{name:name, id:id}" -o tsv)
log_info "Working with subscription: $ACCOUNT_INFO"

# =============================================================================
# Stop AKS Clusters
# =============================================================================
log_section "Stopping AKS Clusters"

# Find and stop all AKS clusters
log_info "Searching for AKS clusters..."
AKS_CLUSTERS=$(az aks list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, state:powerState.code}" -o tsv 2>/dev/null || echo "")

if [[ -z "$AKS_CLUSTERS" ]]; then
    log_warning "No AKS clusters found"
else
    while IFS=$'\t' read -r name rg state; do
        if [[ "$state" == "Running" ]]; then
            log_info "Stopping AKS cluster: $name in resource group: $rg"
            execute az aks stop --name "$name" --resource-group "$rg" --no-wait
            log_success "Stop command sent for AKS cluster: $name"
        else
            log_info "AKS cluster $name is already stopped (state: $state)"
        fi
    done <<< "$AKS_CLUSTERS"
fi

# =============================================================================
# Stop PostgreSQL Flexible Servers
# =============================================================================
log_section "Stopping PostgreSQL Flexible Servers"

log_info "Searching for PostgreSQL Flexible Servers..."
PG_SERVERS=$(az postgres flexible-server list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, state:state}" -o tsv 2>/dev/null || echo "")

if [[ -z "$PG_SERVERS" ]]; then
    log_warning "No PostgreSQL Flexible Servers found"
else
    while IFS=$'\t' read -r name rg state; do
        if [[ "$state" == "Ready" ]]; then
            log_info "Stopping PostgreSQL server: $name in resource group: $rg"
            execute az postgres flexible-server stop --name "$name" --resource-group "$rg" --no-wait
            log_success "Stop command sent for PostgreSQL server: $name"
        else
            log_info "PostgreSQL server $name is already stopped (state: $state)"
        fi
    done <<< "$PG_SERVERS"
fi

# =============================================================================
# Stop Azure Cache for Redis
# =============================================================================
log_section "Stopping Azure Cache for Redis"

log_info "Searching for Redis caches..."
# Note: Only Enterprise tier Redis can be stopped. Standard/Premium will show a warning.
REDIS_CACHES=$(az redis list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, provisioningState:provisioningState, sku:sku.name}" -o tsv 2>/dev/null || echo "")

if [[ -z "$REDIS_CACHES" ]]; then
    log_warning "No Redis caches found"
else
    while IFS=$'\t' read -r name rg state sku; do
        log_warning "Redis cache $name (SKU: $sku) cannot be stopped - consider scaling down or deleting if not needed"
        log_info "To delete: az redis delete --name $name --resource-group $rg"
    done <<< "$REDIS_CACHES"
fi

# =============================================================================
# Stop Virtual Machines
# =============================================================================
log_section "Stopping Virtual Machines"

log_info "Searching for Virtual Machines..."
VMS=$(az vm list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup}" -o tsv 2>/dev/null || echo "")

if [[ -z "$VMS" ]]; then
    log_warning "No Virtual Machines found"
else
    while IFS=$'\t' read -r name rg; do
        log_info "Deallocating VM: $name in resource group: $rg"
        execute az vm deallocate --name "$name" --resource-group "$rg" --no-wait
        log_success "Deallocate command sent for VM: $name"
    done <<< "$VMS"
fi

# =============================================================================
# Stop App Services / Function Apps
# =============================================================================
log_section "Stopping App Services"

log_info "Searching for App Services..."
APP_SERVICES=$(az webapp list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, state:state}" -o tsv 2>/dev/null || echo "")

if [[ -z "$APP_SERVICES" ]]; then
    log_warning "No App Services found"
else
    while IFS=$'\t' read -r name rg state; do
        if [[ "$state" == "Running" ]]; then
            log_info "Stopping App Service: $name in resource group: $rg"
            execute az webapp stop --name "$name" --resource-group "$rg"
            log_success "Stopped App Service: $name"
        else
            log_info "App Service $name is already stopped"
        fi
    done <<< "$APP_SERVICES"
fi

# Stop Function Apps
log_info "Searching for Function Apps..."
FUNCTION_APPS=$(az functionapp list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup}" -o tsv 2>/dev/null || echo "")

if [[ -z "$FUNCTION_APPS" ]]; then
    log_warning "No Function Apps found"
else
    while IFS=$'\t' read -r name rg; do
        log_info "Stopping Function App: $name in resource group: $rg"
        execute az functionapp stop --name "$name" --resource-group "$rg"
        log_success "Stopped Function App: $name"
    done <<< "$FUNCTION_APPS"
fi

# =============================================================================
# Stop Azure Container Instances
# =============================================================================
log_section "Stopping Azure Container Instances"

log_info "Searching for Container Instances..."
CONTAINER_GROUPS=$(az container list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup}" -o tsv 2>/dev/null || echo "")

if [[ -z "$CONTAINER_GROUPS" ]]; then
    log_warning "No Container Instances found"
else
    while IFS=$'\t' read -r name rg; do
        log_info "Stopping Container Instance: $name in resource group: $rg"
        execute az container stop --name "$name" --resource-group "$rg"
        log_success "Stopped Container Instance: $name"
    done <<< "$CONTAINER_GROUPS"
fi

# =============================================================================
# Stop Azure Synapse / Data Factory
# =============================================================================
log_section "Stopping Data Services"

# Stop Azure Data Factory triggers
log_info "Searching for Data Factories..."
DATA_FACTORIES=$(az datafactory list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup}" -o tsv 2>/dev/null || echo "")

if [[ -z "$DATA_FACTORIES" ]]; then
    log_warning "No Data Factories found"
else
    while IFS=$'\t' read -r name rg; do
        log_info "Found Data Factory: $name - Please manually stop triggers if needed"
    done <<< "$DATA_FACTORIES"
fi

# =============================================================================
# Summary of Preserved Resources
# =============================================================================
log_section "Preserved Resources (Not Stopped)"

log_info "The following resources are preserved and NOT stopped:"
echo ""

# Key Vaults
log_info "Key Vaults (preserved for secrets):"
az keyvault list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup}" -o table 2>/dev/null || echo "  No Key Vaults found"
echo ""

# Storage Accounts (including Terraform state)
log_info "Storage Accounts (preserved, including Terraform state):"
az storage account list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, sku:sku.name}" -o table 2>/dev/null || echo "  No Storage Accounts found"
echo ""

# DNS Zones
log_info "DNS Zones (preserved):"
az network dns zone list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup}" -o table 2>/dev/null || echo "  No DNS Zones found"
echo ""

# Container Registry
log_info "Container Registries (preserved):"
az acr list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, sku:sku.name}" -o table 2>/dev/null || echo "  No Container Registries found"
echo ""

# =============================================================================
# Cost Savings Estimate
# =============================================================================
log_section "Shutdown Complete - Cost Savings"

log_success "All compute resources have been stopped/deallocated!"
echo ""
log_info "Expected cost savings:"
echo "  - AKS Clusters: ~90% reduction (only storage costs remain)"
echo "  - PostgreSQL: ~100% reduction (stopped servers don't incur compute costs)"
echo "  - VMs: ~100% reduction (only storage costs remain)"
echo "  - App Services: Depends on plan tier"
echo ""
log_info "Resources still incurring costs (minimal):"
echo "  - Storage Accounts: ~\$0.02/GB/month"
echo "  - Key Vaults: ~\$0.03/10,000 operations"
echo "  - DNS Zones: ~\$0.50/month per zone"
echo "  - Container Registry: ~\$5/month (Standard)"
echo ""

# =============================================================================
# Restart Instructions
# =============================================================================
log_section "How to Restart Resources"

cat << 'EOF'
To restart all resources when ready to go live:

1. Start AKS Clusters:
   az aks start --name <cluster-name> --resource-group <rg-name>

2. Start PostgreSQL Servers:
   az postgres flexible-server start --name <server-name> --resource-group <rg-name>

3. Start VMs:
   az vm start --name <vm-name> --resource-group <rg-name>

4. Start App Services:
   az webapp start --name <app-name> --resource-group <rg-name>

Or run the companion script:
   ./startup-all-resources.sh

EOF

log_success "Shutdown script completed successfully!"
echo ""
log_info "Run with DRY_RUN=true to preview changes without executing"
