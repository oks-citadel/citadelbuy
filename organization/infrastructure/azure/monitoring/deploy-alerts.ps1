# PowerShell script to deploy Azure Monitor alert rules for Broxiva AKS cluster
# Usage: .\deploy-alerts.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "broxiva-prod-rg",

    [Parameter(Mandatory=$false)]
    [string]$AksClusterName = "broxiva-prod-aks",

    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",

    [Parameter(Mandatory=$false)]
    [string]$TemplateFile = "alert-rules.bicep"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check if Azure CLI is installed
Write-ColorOutput "Checking Azure CLI installation..." -Color Cyan
try {
    $azVersion = az version | ConvertFrom-Json
    Write-ColorOutput "Azure CLI version: $($azVersion.'azure-cli')" -Color Green
} catch {
    Write-ColorOutput "ERROR: Azure CLI is not installed or not in PATH" -Color Red
    exit 1
}

# Check if logged in to Azure
Write-ColorOutput "`nChecking Azure login status..." -Color Cyan
try {
    $account = az account show | ConvertFrom-Json
    Write-ColorOutput "Logged in as: $($account.user.name)" -Color Green
    Write-ColorOutput "Subscription: $($account.name) ($($account.id))" -Color Green
} catch {
    Write-ColorOutput "ERROR: Not logged in to Azure. Please run 'az login'" -Color Red
    exit 1
}

# Verify resource group exists
Write-ColorOutput "`nVerifying resource group..." -Color Cyan
try {
    $rg = az group show --name $ResourceGroupName | ConvertFrom-Json
    Write-ColorOutput "Resource group '$ResourceGroupName' found in location: $($rg.location)" -Color Green
} catch {
    Write-ColorOutput "ERROR: Resource group '$ResourceGroupName' not found" -Color Red
    exit 1
}

# Verify AKS cluster exists
Write-ColorOutput "`nVerifying AKS cluster..." -Color Cyan
try {
    $aks = az aks show --name $AksClusterName --resource-group $ResourceGroupName | ConvertFrom-Json
    Write-ColorOutput "AKS cluster '$AksClusterName' found" -Color Green
    Write-ColorOutput "Kubernetes version: $($aks.kubernetesVersion)" -Color Green
    Write-ColorOutput "Node count: $($aks.agentPoolProfiles[0].count)" -Color Green
} catch {
    Write-ColorOutput "ERROR: AKS cluster '$AksClusterName' not found" -Color Red
    exit 1
}

# Check if monitoring addon is enabled
Write-ColorOutput "`nChecking Azure Monitor addon status..." -Color Cyan
$monitoringEnabled = $aks.addonProfiles.omsagent.enabled
if ($monitoringEnabled -eq $true) {
    Write-ColorOutput "Azure Monitor addon is enabled" -Color Green
    $workspaceId = $aks.addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID
    Write-ColorOutput "Log Analytics Workspace: $workspaceId" -Color Green
} else {
    Write-ColorOutput "WARNING: Azure Monitor addon is not enabled" -Color Yellow
    Write-ColorOutput "Enabling Azure Monitor addon..." -Color Cyan

    try {
        az aks enable-addons `
            --name $AksClusterName `
            --resource-group $ResourceGroupName `
            --addons monitoring

        Write-ColorOutput "Azure Monitor addon enabled successfully" -Color Green
    } catch {
        Write-ColorOutput "ERROR: Failed to enable Azure Monitor addon" -Color Red
        exit 1
    }
}

# Deploy Bicep template
Write-ColorOutput "`nDeploying alert rules from Bicep template..." -Color Cyan

$deploymentName = "broxiva-alerts-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-ColorOutput "Deployment name: $deploymentName" -Color Cyan
Write-ColorOutput "Template file: $TemplateFile" -Color Cyan

try {
    $deployment = az deployment group create `
        --name $deploymentName `
        --resource-group $ResourceGroupName `
        --template-file $TemplateFile `
        --parameters aksClusterName=$AksClusterName `
                     resourceGroupName=$ResourceGroupName `
                     location=$Location `
        --output json | ConvertFrom-Json

    Write-ColorOutput "`nDeployment completed successfully!" -Color Green
    Write-ColorOutput "Deployment ID: $($deployment.id)" -Color Green

    # Display outputs
    if ($deployment.properties.outputs) {
        Write-ColorOutput "`nDeployment Outputs:" -Color Cyan
        Write-ColorOutput "Action Group ID: $($deployment.properties.outputs.actionGroupId.value)" -Color White
        Write-ColorOutput "Action Group Name: $($deployment.properties.outputs.actionGroupName.value)" -Color White

        Write-ColorOutput "`nAlert Rules Created:" -Color Cyan
        foreach ($alertRule in $deployment.properties.outputs.alertRuleNames.value) {
            Write-ColorOutput "  - $alertRule" -Color White
        }
    }

} catch {
    Write-ColorOutput "`nERROR: Deployment failed" -Color Red
    Write-ColorOutput $_.Exception.Message -Color Red
    exit 1
}

# Verify alert rules
Write-ColorOutput "`nVerifying alert rules..." -Color Cyan
try {
    $alertRules = az monitor metrics alert list `
        --resource-group $ResourceGroupName `
        --output json | ConvertFrom-Json

    $broxivaAlerts = $alertRules | Where-Object { $_.name -like "broxiva-aks-*" }

    Write-ColorOutput "Found $($broxivaAlerts.Count) Broxiva alert rules:" -Color Green
    foreach ($alert in $broxivaAlerts) {
        $status = if ($alert.enabled) { "Enabled" } else { "Disabled" }
        Write-ColorOutput "  - $($alert.name) (Severity: $($alert.severity), Status: $status)" -Color White
    }

} catch {
    Write-ColorOutput "WARNING: Could not verify alert rules" -Color Yellow
}

# Summary
Write-ColorOutput "`n========================================" -Color Cyan
Write-ColorOutput "Deployment Summary" -Color Cyan
Write-ColorOutput "========================================" -Color Cyan
Write-ColorOutput "Resource Group: $ResourceGroupName" -Color White
Write-ColorOutput "AKS Cluster: $AksClusterName" -Color White
Write-ColorOutput "Deployment: $deploymentName" -Color White
Write-ColorOutput "Status: SUCCESS" -Color Green
Write-ColorOutput "========================================" -Color Cyan

# Next steps
Write-ColorOutput "`nNext Steps:" -Color Cyan
Write-ColorOutput "1. Test alert rules:" -Color White
Write-ColorOutput "   az monitor metrics alert list --resource-group $ResourceGroupName" -Color Gray
Write-ColorOutput "`n2. View alerts in Azure Portal:" -Color White
Write-ColorOutput "   https://portal.azure.com/#@/resource$($aks.id)/alerts" -Color Gray
Write-ColorOutput "`n3. Configure action group:" -Color White
Write-ColorOutput "   - Update email addresses, phone numbers, and webhooks" -Color Gray
Write-ColorOutput "   - Test notifications" -Color Gray
Write-ColorOutput "`n4. Monitor alert status:" -Color White
Write-ColorOutput "   az monitor metrics alert show --name broxiva-aks-high-cpu --resource-group $ResourceGroupName" -Color Gray
Write-ColorOutput "`n5. View alert history:" -Color White
Write-ColorOutput "   az monitor activity-log list --resource-group $ResourceGroupName --max-events 50" -Color Gray

Write-ColorOutput "`nSetup completed successfully!" -Color Green
