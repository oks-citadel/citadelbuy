#!/bin/bash
# Broxiva Environment Resume Script
# Resumes a previously shutdown environment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/resume-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN=false
ENVIRONMENT="development"
RESOURCE_GROUP=""

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

Resume a previously shutdown Azure environment.

OPTIONS:
    -e, --env ENVIRONMENT     Environment to resume (development, staging)
    -g, --resource-group RG   Specific resource group to resume
    -d, --dry-run             Perform dry run without actual changes
    -h, --help                Show this help message

EXAMPLES:
    # Resume development environment
    $0 --env development

    # Resume specific resource group
    $0 --resource-group broxiva-dev-eastus

    # Dry run for staging
    $0 --env staging --dry-run

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
        -g|--resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
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

# Verify Azure CLI login
if ! az account show &>/dev/null; then
    log_error "Not logged into Azure. Please run 'az login' first."
    exit 1
fi

# Display banner
echo "========================================"
echo "  Broxiva Environment Resume"
echo "========================================"
log "Environment: ${ENVIRONMENT:-All}"
log "Resource Group: ${RESOURCE_GROUP:-All matching environment}"
log "Dry Run: ${DRY_RUN}"
log "Log File: ${LOG_FILE}"
echo "========================================"

# Counters
VMS_STARTED=0
AKS_SCALED=0
APPS_STARTED=0
DBS_SCALED=0

# Get resource groups
RESOURCE_GROUPS=()
if [ -n "$RESOURCE_GROUP" ]; then
    RESOURCE_GROUPS+=("$RESOURCE_GROUP")
else
    mapfile -t RESOURCE_GROUPS < <(az group list --query "[?tags.env=='$ENVIRONMENT'].name" -o tsv)
fi

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

    # 1. Start Virtual Machines
    log "Checking for stopped VMs..."
    mapfile -t VMS < <(az vm list -g "$rg" --query "[].name" -o tsv)

    for vm in "${VMS[@]}"; do
        VM_STATE=$(az vm get-instance-view -g "$rg" -n "$vm" --query "instanceView.statuses[1].displayStatus" -o tsv 2>/dev/null || echo "Unknown")

        if [[ "$VM_STATE" == "VM deallocated" ]] || [[ "$VM_STATE" == "VM stopped" ]]; then
            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY RUN] Would start VM: $vm"
            else
                log "Starting VM: $vm"
                if az vm start -g "$rg" -n "$vm" --no-wait; then
                    log_success "VM startup initiated: $vm"
                    ((VMS_STARTED++))
                else
                    log_error "Failed to start VM: $vm"
                fi
            fi
        fi
    done

    # 2. Scale up AKS clusters
    log "Checking for scaled-down AKS clusters..."
    mapfile -t AKS_CLUSTERS < <(az aks list -g "$rg" --query "[].name" -o tsv)

    for aks in "${AKS_CLUSTERS[@]}"; do
        log "Processing AKS cluster: $aks"
        mapfile -t NODE_POOLS < <(az aks nodepool list -g "$rg" --cluster-name "$aks" --query "[].name" -o tsv)

        for pool in "${NODE_POOLS[@]}"; do
            CURRENT_COUNT=$(az aks nodepool show -g "$rg" --cluster-name "$aks" -n "$pool" --query "count" -o tsv)

            if [ "$CURRENT_COUNT" -eq 0 ]; then
                # Try to get original count from cluster tags
                ORIGINAL_COUNT=$(az aks show -g "$rg" -n "$aks" --query "tags.\"nodeCount_${pool}\"" -o tsv 2>/dev/null || echo "")

                # Default to 2 if no saved count
                TARGET_COUNT=${ORIGINAL_COUNT:-2}

                if [ "$DRY_RUN" = true ]; then
                    log_warning "[DRY RUN] Would scale up AKS node pool: $aks/$pool to $TARGET_COUNT"
                else
                    log "Scaling up AKS node pool: $aks/$pool from 0 to $TARGET_COUNT"

                    if az aks nodepool scale -g "$rg" --cluster-name "$aks" -n "$pool" --node-count "$TARGET_COUNT" --no-wait; then
                        log_success "AKS node pool scale-up initiated: $aks/$pool to $TARGET_COUNT nodes"
                        ((AKS_SCALED++))
                    else
                        log_error "Failed to scale up AKS node pool: $aks/$pool"
                    fi
                fi
            fi
        done
    done

    # 3. Start App Services
    log "Checking for stopped App Services..."
    mapfile -t WEB_APPS < <(az webapp list -g "$rg" --query "[].name" -o tsv)

    for app in "${WEB_APPS[@]}"; do
        APP_STATE=$(az webapp show -g "$rg" -n "$app" --query "state" -o tsv)

        if [[ "$APP_STATE" == "Stopped" ]]; then
            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY RUN] Would start App Service: $app"
            else
                log "Starting App Service: $app"
                if az webapp start -g "$rg" -n "$app"; then
                    log_success "App Service started: $app"
                    ((APPS_STARTED++))
                else
                    log_error "Failed to start App Service: $app"
                fi
            fi
        fi
    done

    # 4. Scale up SQL Databases
    log "Checking for scaled-down SQL Databases..."
    mapfile -t SQL_SERVERS < <(az sql server list -g "$rg" --query "[].name" -o tsv)

    for server in "${SQL_SERVERS[@]}"; do
        mapfile -t DATABASES < <(az sql db list -g "$rg" -s "$server" --query "[?name!='master'].name" -o tsv)

        for db in "${DATABASES[@]}"; do
            CURRENT_TIER=$(az sql db show -g "$rg" -s "$server" -n "$db" --query "currentServiceObjectiveName" -o tsv)

            if [[ "$CURRENT_TIER" == "Basic" ]]; then
                # Try to get original tier from tags
                ORIGINAL_TIER=$(az sql db show -g "$rg" -s "$server" -n "$db" --query "tags.originalTier" -o tsv 2>/dev/null || echo "")

                if [ -n "$ORIGINAL_TIER" ] && [ "$ORIGINAL_TIER" != "Basic" ]; then
                    if [ "$DRY_RUN" = true ]; then
                        log_warning "[DRY RUN] Would scale up SQL Database: $db from Basic to $ORIGINAL_TIER"
                    else
                        log "Scaling up SQL Database: $db from Basic to $ORIGINAL_TIER"

                        # Determine edition from tier
                        EDITION="GeneralPurpose"
                        if [[ "$ORIGINAL_TIER" == S* ]]; then
                            EDITION="Standard"
                        elif [[ "$ORIGINAL_TIER" == P* ]]; then
                            EDITION="Premium"
                        fi

                        if az sql db update -g "$rg" -s "$server" -n "$db" --edition "$EDITION" --service-objective "$ORIGINAL_TIER" --no-wait; then
                            log_success "SQL Database scale-up initiated: $db to $ORIGINAL_TIER"
                            ((DBS_SCALED++))
                        else
                            log_error "Failed to scale up SQL Database: $db"
                        fi
                    fi
                else
                    log_warning "No original tier found for database: $db (keeping Basic tier)"
                fi
            fi
        done
    done
done

# Summary
echo ""
echo "========================================"
echo "  Resume Summary"
echo "========================================"
log_success "Virtual Machines started: $VMS_STARTED"
log_success "AKS node pools scaled up: $AKS_SCALED"
log_success "App Services started: $APPS_STARTED"
log_success "SQL Databases scaled up: $DBS_SCALED"
echo "========================================"
log "Completed at: $(date +'%Y-%m-%d %H:%M:%S')"
log "Full log: $LOG_FILE"
echo "========================================"

if [ "$DRY_RUN" = true ]; then
    echo ""
    log_warning "This was a DRY RUN. No resources were actually modified."
    log_warning "Run without --dry-run to execute the resume."
fi

echo ""
log_warning "Note: It may take several minutes for all resources to fully start."
log "Check the Azure Portal for detailed status of each resource."

exit 0
