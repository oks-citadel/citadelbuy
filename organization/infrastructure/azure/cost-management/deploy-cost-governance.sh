#!/bin/bash
# Broxiva Cost Governance Deployment Script
# Deploys all FinOps governance policies, budgets, and automation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBSCRIPTION_ID=""
LOCATION="eastus"
RESOURCE_GROUP="broxiva-ops"
AUTOMATION_ACCOUNT="broxiva-automation"
BUDGET_AMOUNT=5000
ALERT_EMAILS="finops@broxiva.com,devops@broxiva.com"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

# Usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Deploy Broxiva FinOps cost governance infrastructure.

OPTIONS:
    -s, --subscription ID     Azure subscription ID
    -l, --location LOCATION   Azure region (default: eastus)
    -r, --resource-group RG   Resource group for ops resources (default: broxiva-ops)
    -b, --budget AMOUNT       Monthly budget amount in USD (default: 5000)
    -e, --emails EMAILS       Comma-separated alert email addresses
    -h, --help                Show this help message

EXAMPLES:
    # Deploy with defaults
    $0 --subscription xxxxx-xxxx-xxxx

    # Deploy with custom budget
    $0 --subscription xxxxx-xxxx-xxxx --budget 10000

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--subscription)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        -l|--location)
            LOCATION="$2"
            shift 2
            ;;
        -r|--resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        -b|--budget)
            BUDGET_AMOUNT="$2"
            shift 2
            ;;
        -e|--emails)
            ALERT_EMAILS="$2"
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

# Validate required parameters
if [ -z "$SUBSCRIPTION_ID" ]; then
    SUBSCRIPTION_ID=$(az account show --query id -o tsv 2>/dev/null || echo "")
    if [ -z "$SUBSCRIPTION_ID" ]; then
        log_error "Subscription ID is required. Use --subscription option."
        exit 1
    fi
fi

# Set subscription
log "Setting Azure subscription..."
az account set --subscription "$SUBSCRIPTION_ID"
log_success "Using subscription: $(az account show --query name -o tsv)"

echo "========================================"
echo "  Broxiva Cost Governance Deployment"
echo "========================================"
echo "Subscription: $SUBSCRIPTION_ID"
echo "Location: $LOCATION"
echo "Resource Group: $RESOURCE_GROUP"
echo "Budget: \$${BUDGET_AMOUNT}"
echo "Alert Emails: $ALERT_EMAILS"
echo "========================================"
echo ""

# Step 1: Create resource group for ops resources
log "Step 1: Creating operations resource group..."
if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
    log_warning "Resource group $RESOURCE_GROUP already exists"
else
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --tags \
        env=shared \
        application=broxiva \
        costCenter=operations \
        autoShutdown=false
    log_success "Resource group created: $RESOURCE_GROUP"
fi

# Step 2: Deploy Azure Policies
log "Step 2: Deploying Azure Policies..."

# Mandatory tags policy
log "  Creating mandatory tags policy..."
az policy definition create \
    --name "broxiva-mandatory-tags" \
    --display-name "Broxiva - Require Mandatory Tags on Resources" \
    --description "Enforces mandatory tags for cost tracking" \
    --rules "${SCRIPT_DIR}/../policies/mandatory-tags-policy.json" \
    --mode Indexed \
    --subscription "$SUBSCRIPTION_ID" \
    2>/dev/null || log_warning "Policy broxiva-mandatory-tags may already exist"

az policy assignment create \
    --name "broxiva-tags-assignment" \
    --display-name "Broxiva Mandatory Tags" \
    --policy "broxiva-mandatory-tags" \
    --scope "/subscriptions/${SUBSCRIPTION_ID}" \
    2>/dev/null || log_warning "Policy assignment may already exist"

log_success "Mandatory tags policy deployed"

# SKU restriction policy
log "  Creating SKU restriction policy..."
az policy definition create \
    --name "broxiva-block-expensive-skus" \
    --display-name "Broxiva - Block Expensive SKUs in Non-Production" \
    --description "Prevents expensive SKUs in dev/staging" \
    --rules "${SCRIPT_DIR}/../policies/block-expensive-skus-nonprod.json" \
    --mode Indexed \
    --subscription "$SUBSCRIPTION_ID" \
    2>/dev/null || log_warning "Policy broxiva-block-expensive-skus may already exist"

az policy assignment create \
    --name "broxiva-sku-restriction" \
    --display-name "Broxiva SKU Restrictions" \
    --policy "broxiva-block-expensive-skus" \
    --scope "/subscriptions/${SUBSCRIPTION_ID}" \
    2>/dev/null || log_warning "Policy assignment may already exist"

log_success "SKU restriction policy deployed"

# Tag inheritance policy
log "  Creating tag inheritance policy..."
for tag in "env" "application" "owner" "costCenter"; do
    az policy definition create \
        --name "broxiva-tag-inherit-${tag}" \
        --display-name "Broxiva - Inherit ${tag} Tag" \
        --description "Inherit ${tag} tag from resource group" \
        --rules "${SCRIPT_DIR}/../policies/enforce-tag-inheritance.json" \
        --mode Indexed \
        --subscription "$SUBSCRIPTION_ID" \
        --params "{\"tagName\": {\"value\": \"${tag}\"}}" \
        2>/dev/null || log_warning "Policy may already exist"

    az policy assignment create \
        --name "broxiva-inherit-${tag}" \
        --display-name "Inherit ${tag} Tag" \
        --policy "broxiva-tag-inherit-${tag}" \
        --scope "/subscriptions/${SUBSCRIPTION_ID}" \
        2>/dev/null || log_warning "Assignment may already exist"
done

log_success "Tag inheritance policies deployed"

# Step 3: Deploy Budgets
log "Step 3: Deploying budget alerts..."

# Convert comma-separated emails to JSON array
EMAIL_ARRAY=$(echo "[$ALERT_EMAILS]" | sed "s/,/','/g" | sed "s/^/['/;s/$/']/" | sed "s/\['\[/\[/;s/\]'\]/\]/")

az deployment sub create \
    --location "$LOCATION" \
    --template-file "${SCRIPT_DIR}/budget-alerts.bicep" \
    --parameters \
        budgetName="broxiva-monthly-budget" \
        budgetAmount="$BUDGET_AMOUNT" \
        startDate="$(date +%Y-%m-01)" \
        alertEmails="$EMAIL_ARRAY"

log_success "Budget alerts deployed"

# Step 4: Create Automation Account
log "Step 4: Creating Azure Automation Account..."

if az automation account show --name "$AUTOMATION_ACCOUNT" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    log_warning "Automation account $AUTOMATION_ACCOUNT already exists"
else
    az automation account create \
        --name "$AUTOMATION_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags \
            env=shared \
            application=broxiva \
            costCenter=operations

    # Enable managed identity
    az automation account update \
        --name "$AUTOMATION_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --assign-identity

    log_success "Automation account created"
fi

# Grant Contributor role to managed identity
PRINCIPAL_ID=$(az automation account show \
    --name "$AUTOMATION_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query identity.principalId -o tsv)

if [ -n "$PRINCIPAL_ID" ]; then
    log "  Assigning Contributor role to automation account..."
    az role assignment create \
        --assignee "$PRINCIPAL_ID" \
        --role "Contributor" \
        --scope "/subscriptions/${SUBSCRIPTION_ID}" \
        2>/dev/null || log_warning "Role assignment may already exist"

    log_success "Permissions configured"
fi

# Step 5: Import Runbook
log "Step 5: Importing auto-shutdown runbook..."

# First, create the runbook
az automation runbook create \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --name "auto-shutdown-runbook" \
    --type "PowerShell" \
    2>/dev/null || log_warning "Runbook may already exist"

# Import the runbook content
az automation runbook replace-content \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --name "auto-shutdown-runbook" \
    --content "@${SCRIPT_DIR}/../automation/auto-shutdown-runbook.ps1"

# Publish the runbook
az automation runbook publish \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --name "auto-shutdown-runbook"

log_success "Runbook imported and published"

# Step 6: Deploy Logic Apps
log "Step 6: Deploying auto-shutdown Logic Apps..."

az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "${SCRIPT_DIR}/../automation/auto-shutdown-logic-app.json" \
    --parameters \
        logicAppName="broxiva-auto-shutdown" \
        automationAccountName="$AUTOMATION_ACCOUNT" \
        location="$LOCATION"

log_success "Logic Apps deployed"

# Step 7: Deploy Cost Dashboard
log "Step 7: Deploying cost dashboard..."

# Update subscription ID in dashboard JSON
TEMP_DASHBOARD=$(mktemp)
sed "s/{subscriptionId}/${SUBSCRIPTION_ID}/g" "${SCRIPT_DIR}/cost-dashboard.json" > "$TEMP_DASHBOARD"

az portal dashboard create \
    --resource-group "$RESOURCE_GROUP" \
    --name "broxiva-cost-dashboard" \
    --input-path "$TEMP_DASHBOARD" \
    --location "$LOCATION"

rm -f "$TEMP_DASHBOARD"

log_success "Cost dashboard deployed"

# Summary
echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
log_success "All cost governance components deployed successfully"
echo ""
echo "Next Steps:"
echo "1. Review and tag existing resources: az resource list --query \"[?tags.env==null]\""
echo "2. Test auto-shutdown in dry-run mode: az automation runbook start --parameters DryRun=true"
echo "3. Access cost dashboard in Azure Portal"
echo "4. Configure notification webhooks (Slack/Teams) in Logic Apps"
echo "5. Review and adjust budget thresholds if needed"
echo ""
echo "Documentation: infrastructure/docs/FINOPS_GOVERNANCE.md"
echo "========================================"

exit 0
