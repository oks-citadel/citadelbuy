#!/bin/bash

# =============================================================================
# Azure Resource Startup Script - Go Live
# =============================================================================
# Purpose: Start all stopped compute resources when ready to deploy
# =============================================================================

set -e

# Configuration
SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() { echo -e "\n${GREEN}========================================${NC}"; echo -e "${GREEN} $1${NC}"; echo -e "${GREEN}========================================${NC}\n"; }

# Environment selection
ENVIRONMENT=${1:-"all"}

log_section "Azure Resource Startup Script"
log_info "Starting resources for environment: $ENVIRONMENT"

# Verify Azure CLI and login
if ! az account show &> /dev/null; then
    log_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

az account set --subscription "$SUBSCRIPTION_ID"
log_success "Subscription set: $SUBSCRIPTION_ID"

# =============================================================================
# Start AKS Clusters
# =============================================================================
log_section "Starting AKS Clusters"

AKS_CLUSTERS=$(az aks list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, state:powerState.code}" -o tsv 2>/dev/null || echo "")

if [[ -z "$AKS_CLUSTERS" ]]; then
    log_warning "No AKS clusters found"
else
    while IFS=$'\t' read -r name rg state; do
        if [[ "$ENVIRONMENT" != "all" && ! "$name" =~ $ENVIRONMENT ]]; then
            log_info "Skipping $name (not matching environment filter)"
            continue
        fi

        if [[ "$state" == "Stopped" ]]; then
            log_info "Starting AKS cluster: $name"
            az aks start --name "$name" --resource-group "$rg" --no-wait
            log_success "Start command sent for: $name"
        else
            log_info "AKS cluster $name is already running (state: $state)"
        fi
    done <<< "$AKS_CLUSTERS"
fi

# =============================================================================
# Start PostgreSQL Flexible Servers
# =============================================================================
log_section "Starting PostgreSQL Servers"

PG_SERVERS=$(az postgres flexible-server list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, state:state}" -o tsv 2>/dev/null || echo "")

if [[ -z "$PG_SERVERS" ]]; then
    log_warning "No PostgreSQL servers found"
else
    while IFS=$'\t' read -r name rg state; do
        if [[ "$ENVIRONMENT" != "all" && ! "$name" =~ $ENVIRONMENT ]]; then
            continue
        fi

        if [[ "$state" == "Stopped" ]]; then
            log_info "Starting PostgreSQL server: $name"
            az postgres flexible-server start --name "$name" --resource-group "$rg" --no-wait
            log_success "Start command sent for: $name"
        else
            log_info "PostgreSQL server $name is already running"
        fi
    done <<< "$PG_SERVERS"
fi

# =============================================================================
# Start Virtual Machines
# =============================================================================
log_section "Starting Virtual Machines"

VMS=$(az vm list --subscription "$SUBSCRIPTION_ID" -d --query "[].{name:name, rg:resourceGroup, state:powerState}" -o tsv 2>/dev/null || echo "")

if [[ -z "$VMS" ]]; then
    log_warning "No VMs found"
else
    while IFS=$'\t' read -r name rg state; do
        if [[ "$ENVIRONMENT" != "all" && ! "$name" =~ $ENVIRONMENT ]]; then
            continue
        fi

        if [[ "$state" == "VM deallocated" ]]; then
            log_info "Starting VM: $name"
            az vm start --name "$name" --resource-group "$rg" --no-wait
            log_success "Start command sent for: $name"
        else
            log_info "VM $name is already running"
        fi
    done <<< "$VMS"
fi

# =============================================================================
# Start App Services
# =============================================================================
log_section "Starting App Services"

APP_SERVICES=$(az webapp list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, state:state}" -o tsv 2>/dev/null || echo "")

if [[ -z "$APP_SERVICES" ]]; then
    log_warning "No App Services found"
else
    while IFS=$'\t' read -r name rg state; do
        if [[ "$ENVIRONMENT" != "all" && ! "$name" =~ $ENVIRONMENT ]]; then
            continue
        fi

        if [[ "$state" == "Stopped" ]]; then
            log_info "Starting App Service: $name"
            az webapp start --name "$name" --resource-group "$rg"
            log_success "Started: $name"
        else
            log_info "App Service $name is already running"
        fi
    done <<< "$APP_SERVICES"
fi

# =============================================================================
# Start Function Apps
# =============================================================================
log_section "Starting Function Apps"

FUNCTION_APPS=$(az functionapp list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup}" -o tsv 2>/dev/null || echo "")

if [[ -z "$FUNCTION_APPS" ]]; then
    log_warning "No Function Apps found"
else
    while IFS=$'\t' read -r name rg; do
        if [[ "$ENVIRONMENT" != "all" && ! "$name" =~ $ENVIRONMENT ]]; then
            continue
        fi

        log_info "Starting Function App: $name"
        az functionapp start --name "$name" --resource-group "$rg"
        log_success "Started: $name"
    done <<< "$FUNCTION_APPS"
fi

# =============================================================================
# Wait for Resources to Start
# =============================================================================
log_section "Waiting for Resources to Start"

log_info "Resources are starting in the background..."
log_info "AKS clusters may take 5-10 minutes to fully start"
log_info "PostgreSQL servers may take 2-5 minutes"
echo ""

# Poll AKS status
log_info "Checking AKS cluster status..."
AKS_CLUSTERS=$(az aks list --subscription "$SUBSCRIPTION_ID" --query "[].{name:name, rg:resourceGroup, state:powerState.code}" -o tsv 2>/dev/null || echo "")
while IFS=$'\t' read -r name rg state; do
    echo "  - $name: $state"
done <<< "$AKS_CLUSTERS"

log_section "Startup Complete"
log_success "All resource start commands have been sent!"
echo ""
log_info "Next steps:"
echo "  1. Wait for resources to fully start (5-10 minutes)"
echo "  2. Verify services are healthy"
echo "  3. Run deployment pipelines"
echo ""
log_info "Monitor startup with:"
echo "  az aks list --query \"[].{name:name, state:powerState.code}\" -o table"
echo "  az postgres flexible-server list --query \"[].{name:name, state:state}\" -o table"
