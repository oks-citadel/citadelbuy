#!/bin/bash
# Broxiva Non-Production Shutdown Script
# Stops all non-production resources to save costs

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/shutdown-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN=false
ENVIRONMENT="development,staging"
EXCLUDE_RGS=""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

# Usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Shutdown non-production Azure resources to save costs.

OPTIONS:
    -e, --env ENVIRONMENTS     Comma-separated environments to shutdown (default: development,staging)
    -d, --dry-run             Perform dry run without actual changes
    -x, --exclude RGS         Comma-separated resource groups to exclude
    -h, --help                Show this help message

EXAMPLES:
    # Shutdown development environment
    $0 --env development

    # Dry run for staging
    $0 --env staging --dry-run

    # Shutdown both dev and staging, excluding specific RG
    $0 --env development,staging --exclude broxiva-monitoring

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -x|--exclude)
            EXCLUDE_RGS="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Convert comma-separated values to arrays
IFS=',' read -ra ENVS <<< "$ENVIRONMENT"
IFS=',' read -ra EXCLUDED <<< "$EXCLUDE_RGS"

# Verify Azure CLI login
if ! az account show &>/dev/null; then
    log_error "Not logged into Azure. Please run 'az login' first."
    exit 1
fi

# Display banner
echo "========================================"
echo "  Broxiva Non-Production Shutdown"
echo "========================================"
log "Environments: ${ENVIRONMENT}"
log "Dry Run: ${DRY_RUN}"
log "Log File: ${LOG_FILE}"
echo "========================================"

# Counters
VMS_STOPPED=0
AKS_SCALED=0
APPS_STOPPED=0
DBS_SCALED=0
CONTAINERS_STOPPED=0

# Get resource groups matching environments
log "Finding resource groups for environments: ${ENVS[*]}..."

RESOURCE_GROUPS=()
for env in "${ENVS[@]}"; do
    mapfile -t RGS < <(az group list --query "[?tags.env=='$env'].name" -o tsv)
    for rg in "${RGS[@]}"; do
        # Check if RG is excluded
        if [[ ! " ${EXCLUDED[@]} " =~ " ${rg} " ]]; then
            RESOURCE_GROUPS+=("$rg")
        fi
    done
done

# Also include resource groups with autoShutdown=true tag
mapfile -t AUTO_SHUTDOWN_RGS < <(az group list --query "[?tags.autoShutdown=='true'].name" -o tsv)
for rg in "${AUTO_SHUTDOWN_RGS[@]}"; do
    if [[ ! " ${EXCLUDED[@]} " =~ " ${rg} " ]] && [[ ! " ${RESOURCE_GROUPS[@]} " =~ " ${rg} " ]]; then
        RESOURCE_GROUPS+=("$rg")
    fi
done

log_success "Found ${#RESOURCE_GROUPS[@]} resource groups to process"

if [ ${#RESOURCE_GROUPS[@]} -eq 0 ]; then
    log_warning "No resource groups found. Exiting."
    exit 0
fi

# Process each resource group
for rg in "${RESOURCE_GROUPS[@]}"; do
    echo ""
    log "Processing Resource Group: $rg"
    echo "----------------------------------------"

    # 1. Stop Virtual Machines
    log "Checking for running VMs..."
    mapfile -t VMS < <(az vm list -g "$rg" --query "[].name" -o tsv)

    for vm in "${VMS[@]}"; do
        VM_STATE=$(az vm get-instance-view -g "$rg" -n "$vm" --query "instanceView.statuses[1].displayStatus" -o tsv)

        if [[ "$VM_STATE" == "VM running" ]]; then
            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY RUN] Would stop VM: $vm"
            else
                log "Stopping VM: $vm"
                if az vm deallocate -g "$rg" -n "$vm" --no-wait; then
                    log_success "VM shutdown initiated: $vm"
                    ((VMS_STOPPED++))
                else
                    log_error "Failed to stop VM: $vm"
                fi
            fi
        fi
    done

    # 2. Scale down AKS clusters
    log "Checking for AKS clusters..."
    mapfile -t AKS_CLUSTERS < <(az aks list -g "$rg" --query "[].name" -o tsv)

    for aks in "${AKS_CLUSTERS[@]}"; do
        log "Processing AKS cluster: $aks"
        mapfile -t NODE_POOLS < <(az aks nodepool list -g "$rg" --cluster-name "$aks" --query "[].name" -o tsv)

        for pool in "${NODE_POOLS[@]}"; do
            CURRENT_COUNT=$(az aks nodepool show -g "$rg" --cluster-name "$aks" -n "$pool" --query "count" -o tsv)

            if [ "$CURRENT_COUNT" -gt 0 ]; then
                if [ "$DRY_RUN" = true ]; then
                    log_warning "[DRY RUN] Would scale down AKS node pool: $aks/$pool to 0 (current: $CURRENT_COUNT)"
                else
                    # Save current count as tag for restoration
                    log "Scaling down AKS node pool: $aks/$pool from $CURRENT_COUNT to 0"

                    # Tag the cluster with current node count for later restoration
                    az aks update -g "$rg" -n "$aks" --tags "nodeCount_${pool}=${CURRENT_COUNT}" --no-wait 2>/dev/null || true

                    if az aks nodepool scale -g "$rg" --cluster-name "$aks" -n "$pool" --node-count 0 --no-wait; then
                        log_success "AKS node pool scale-down initiated: $aks/$pool"
                        ((AKS_SCALED++))
                    else
                        log_error "Failed to scale down AKS node pool: $aks/$pool"
                    fi
                fi
            fi
        done
    done

    # 3. Stop App Services
    log "Checking for running App Services..."
    mapfile -t WEB_APPS < <(az webapp list -g "$rg" --query "[].name" -o tsv)

    for app in "${WEB_APPS[@]}"; do
        APP_STATE=$(az webapp show -g "$rg" -n "$app" --query "state" -o tsv)

        if [[ "$APP_STATE" == "Running" ]]; then
            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY RUN] Would stop App Service: $app"
            else
                log "Stopping App Service: $app"
                if az webapp stop -g "$rg" -n "$app"; then
                    log_success "App Service stopped: $app"
                    ((APPS_STOPPED++))
                else
                    log_error "Failed to stop App Service: $app"
                fi
            fi
        fi
    done

    # 4. Scale down SQL Databases
    log "Checking for SQL Databases..."
    mapfile -t SQL_SERVERS < <(az sql server list -g "$rg" --query "[].name" -o tsv)

    for server in "${SQL_SERVERS[@]}"; do
        mapfile -t DATABASES < <(az sql db list -g "$rg" -s "$server" --query "[?name!='master'].name" -o tsv)

        for db in "${DATABASES[@]}"; do
            CURRENT_TIER=$(az sql db show -g "$rg" -s "$server" -n "$db" --query "currentServiceObjectiveName" -o tsv)

            if [[ "$CURRENT_TIER" != "Basic" ]]; then
                if [ "$DRY_RUN" = true ]; then
                    log_warning "[DRY RUN] Would scale down SQL Database: $db from $CURRENT_TIER to Basic"
                else
                    log "Scaling down SQL Database: $db from $CURRENT_TIER to Basic"

                    # Tag the database with current tier for restoration
                    az sql db update -g "$rg" -s "$server" -n "$db" --tags "originalTier=$CURRENT_TIER" --no-wait 2>/dev/null || true

                    if az sql db update -g "$rg" -s "$server" -n "$db" --edition Basic --service-objective Basic --no-wait; then
                        log_success "SQL Database scale-down initiated: $db"
                        ((DBS_SCALED++))
                    else
                        log_error "Failed to scale down SQL Database: $db"
                    fi
                fi
            fi
        done
    done

    # 5. Stop Container Instances
    log "Checking for Container Instances..."
    mapfile -t CONTAINERS < <(az container list -g "$rg" --query "[].name" -o tsv)

    for container in "${CONTAINERS[@]}"; do
        CONTAINER_STATE=$(az container show -g "$rg" -n "$container" --query "instanceView.state" -o tsv)

        if [[ "$CONTAINER_STATE" == "Running" ]]; then
            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY RUN] Would stop Container Instance: $container"
            else
                log "Stopping Container Instance: $container"
                if az container stop -g "$rg" -n "$container"; then
                    log_success "Container Instance stopped: $container"
                    ((CONTAINERS_STOPPED++))
                else
                    log_error "Failed to stop Container Instance: $container"
                fi
            fi
        fi
    done
done

# Summary
echo ""
echo "========================================"
echo "  Shutdown Summary"
echo "========================================"
log_success "Virtual Machines stopped: $VMS_STOPPED"
log_success "AKS node pools scaled down: $AKS_SCALED"
log_success "App Services stopped: $APPS_STOPPED"
log_success "SQL Databases scaled down: $DBS_SCALED"
log_success "Container Instances stopped: $CONTAINERS_STOPPED"
echo "========================================"
log "Completed at: $(date +'%Y-%m-%d %H:%M:%S')"
log "Full log: $LOG_FILE"
echo "========================================"

if [ "$DRY_RUN" = true ]; then
    echo ""
    log_warning "This was a DRY RUN. No resources were actually modified."
    log_warning "Run without --dry-run to execute the shutdown."
fi

exit 0
