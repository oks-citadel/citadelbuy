# Broxiva Monitoring Stack Deployment Script (PowerShell)
# This script deploys the complete observability stack for Broxiva on Azure AKS

param(
    [string]$AksClusterName = "broxiva-prod-aks",
    [string]$ResourceGroup = "broxiva-prod-rg",
    [string]$NamespaceMonitoring = "broxiva-monitoring",
    [string]$NamespaceApp = "broxiva-production"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir = Split-Path -Parent $ScriptDir
$K8sDir = Join-Path $InfraDir "kubernetes"
$AzureDir = Join-Path $InfraDir "azure"

# Functions
function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Test-Prerequisites {
    Write-Header "Checking Prerequisites"

    # Check kubectl
    if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "kubectl is not installed"
        exit 1
    }
    Write-Success "kubectl is installed"

    # Check Azure CLI
    if (!(Get-Command az -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "Azure CLI is not installed"
        exit 1
    }
    Write-Success "Azure CLI is installed"

    # Check Helm
    if (!(Get-Command helm -ErrorAction SilentlyContinue)) {
        Write-Warning "Helm is not installed - some features may not work"
    } else {
        Write-Success "Helm is installed"
    }

    # Check Azure login
    try {
        az account show | Out-Null
        Write-Success "Logged in to Azure"
    } catch {
        Write-ErrorMsg "Not logged in to Azure. Run 'az login' first"
        exit 1
    }

    # Get AKS credentials
    Write-Info "Getting AKS credentials..."
    az aks get-credentials --name $AksClusterName --resource-group $ResourceGroup --overwrite-existing
    Write-Success "AKS credentials configured"
}

function Test-AksMonitoring {
    Write-Header "Checking AKS Monitoring Setup"

    Write-Info "Checking Azure Monitor Container Insights..."
    $insightsEnabled = az aks show --name $AksClusterName --resource-group $ResourceGroup --query "addonProfiles.omsagent.enabled" -o tsv

    if ($insightsEnabled -eq "true") {
        Write-Success "Container Insights is enabled"

        $workspaceId = az aks show --name $AksClusterName --resource-group $ResourceGroup --query "addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID" -o tsv
        Write-Info "Log Analytics Workspace: $workspaceId"
    } else {
        Write-Warning "Container Insights is not enabled"
        $response = Read-Host "Do you want to enable Container Insights? (Y/N)"
        if ($response -eq "Y" -or $response -eq "y") {
            Write-Info "Enabling Container Insights..."
            az aks enable-addons --name $AksClusterName --resource-group $ResourceGroup --addons monitoring
            Write-Success "Container Insights enabled"
        }
    }
}

function New-Namespaces {
    Write-Header "Creating Namespaces"

    # Create monitoring namespace
    try {
        kubectl get namespace $NamespaceMonitoring 2>&1 | Out-Null
        Write-Warning "Namespace $NamespaceMonitoring already exists"
    } catch {
        kubectl create namespace $NamespaceMonitoring
        kubectl label namespace $NamespaceMonitoring name=monitoring environment=production
        Write-Success "Created namespace $NamespaceMonitoring"
    }

    # Create application namespace
    try {
        kubectl get namespace $NamespaceApp 2>&1 | Out-Null
        Write-Success "Namespace $NamespaceApp exists"
    } catch {
        kubectl create namespace $NamespaceApp
        kubectl label namespace $NamespaceApp environment=production
        Write-Success "Created namespace $NamespaceApp"
    }
}

function Deploy-Prometheus {
    Write-Header "Deploying Prometheus"

    $prometheusFile = Join-Path $K8sDir "monitoring\prometheus-deployment.yaml"
    if (Test-Path $prometheusFile) {
        kubectl apply -f $prometheusFile
        Write-Success "Prometheus deployed"

        Write-Info "Waiting for Prometheus to be ready..."
        kubectl wait --for=condition=ready pod -l app=prometheus -n $NamespaceMonitoring --timeout=300s
        Write-Success "Prometheus is ready"
    } else {
        Write-ErrorMsg "Prometheus deployment file not found"
    }
}

function Deploy-PrometheusAlerts {
    Write-Header "Deploying Prometheus Alert Rules"

    $alertsFile = Join-Path $K8sDir "monitoring\prometheus-alerts.yaml"
    if (Test-Path $alertsFile) {
        kubectl apply -f $alertsFile
        Write-Success "Prometheus alert rules deployed"
    } else {
        Write-Warning "Prometheus alerts file not found"
    }
}

function Deploy-ServiceMonitors {
    Write-Header "Deploying ServiceMonitors"

    $serviceMonitorFile = Join-Path $K8sDir "monitoring\servicemonitor-broxiva.yaml"
    if (Test-Path $serviceMonitorFile) {
        kubectl apply -f $serviceMonitorFile
        Write-Success "ServiceMonitors deployed"
    } else {
        Write-Warning "ServiceMonitor file not found"
    }
}

function Deploy-Grafana {
    Write-Header "Deploying Grafana"

    $grafanaFile = Join-Path $K8sDir "monitoring\grafana-deployment.yaml"
    if (Test-Path $grafanaFile) {
        kubectl apply -f $grafanaFile
        Write-Success "Grafana deployed"

        Write-Info "Waiting for Grafana to be ready..."
        kubectl wait --for=condition=ready pod -l app=grafana -n $NamespaceMonitoring --timeout=300s
        Write-Success "Grafana is ready"

        Write-Info "Grafana admin credentials:"
        Write-Host "Username: admin"
        $password = kubectl get secret grafana-secrets -n $NamespaceMonitoring -o jsonpath='{.data.admin-password}'
        $decodedPassword = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($password))
        Write-Host "Password: $decodedPassword"
    } else {
        Write-ErrorMsg "Grafana deployment file not found"
    }
}

function Deploy-AlertManager {
    Write-Header "Deploying AlertManager"

    $alertManagerFile = Join-Path $K8sDir "monitoring\alertmanager-deployment.yaml"
    if (Test-Path $alertManagerFile) {
        Write-Warning "Please ensure AlertManager secrets are configured"
        $response = Read-Host "Have you updated the AlertManager webhook URLs and API keys? (Y/N)"
        if ($response -ne "Y" -and $response -ne "y") {
            Write-Warning "Skipping AlertManager deployment"
            return
        }

        kubectl apply -f $alertManagerFile
        Write-Success "AlertManager deployed"

        Write-Info "Waiting for AlertManager to be ready..."
        kubectl wait --for=condition=ready pod -l app=alertmanager -n $NamespaceMonitoring --timeout=300s
        Write-Success "AlertManager is ready"
    } else {
        Write-Warning "AlertManager deployment file not found"
    }
}

function Deploy-AzureAlerts {
    Write-Header "Deploying Azure Monitor Alert Rules"

    $bicepFile = Join-Path $AzureDir "monitoring\alert-rules-enhanced.bicep"
    if (Test-Path $bicepFile) {
        Write-Info "Getting Log Analytics Workspace ID..."
        $workspaceId = az aks show --name $AksClusterName --resource-group $ResourceGroup --query "addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID" -o tsv

        if ([string]::IsNullOrEmpty($workspaceId)) {
            Write-Warning "Log Analytics Workspace not found. Skipping Azure alert deployment."
            return
        }

        Write-Info "Deploying Azure Monitor alerts via Bicep..."
        az deployment group create `
            --resource-group $ResourceGroup `
            --template-file $bicepFile `
            --parameters `
                aksClusterName=$AksClusterName `
                logAnalyticsWorkspaceId=$workspaceId `
                applicationGatewayName="broxiva-appgw" `
                keyVaultName="broxiva-keyvault"

        Write-Success "Azure Monitor alerts deployed"
    } else {
        Write-Warning "Azure alert rules Bicep file not found"
    }
}

function Show-AccessInfo {
    Write-Header "Access Information"

    Write-Info "Prometheus:"
    $prometheusIp = kubectl get svc prometheus -n $NamespaceMonitoring -o jsonpath='{.spec.clusterIP}'
    Write-Host "$prometheusIp (Use: kubectl port-forward -n $NamespaceMonitoring svc/prometheus 9090:9090)"

    Write-Info "Grafana:"
    $grafanaIp = kubectl get svc grafana -n $NamespaceMonitoring -o jsonpath='{.spec.clusterIP}'
    Write-Host "$grafanaIp (Use: kubectl port-forward -n $NamespaceMonitoring svc/grafana 3000:3000)"

    Write-Info "AlertManager:"
    try {
        $alertmanagerIp = kubectl get svc alertmanager -n $NamespaceMonitoring -o jsonpath='{.spec.clusterIP}' 2>$null
        Write-Host "$alertmanagerIp (Use: kubectl port-forward -n $NamespaceMonitoring svc/alertmanager 9093:9093)"
    } catch {
        Write-Host "Not deployed"
    }
}

function Test-Deployment {
    Write-Header "Verifying Deployment"

    Write-Info "Checking pod status in $NamespaceMonitoring..."
    kubectl get pods -n $NamespaceMonitoring

    Write-Info "`nChecking services in $NamespaceMonitoring..."
    kubectl get svc -n $NamespaceMonitoring

    Write-Success "Deployment verification complete"
}

# Main execution
function Main {
    Write-Header "Broxiva Monitoring Stack Deployment"

    Test-Prerequisites
    Test-AksMonitoring
    New-Namespaces

    Deploy-Prometheus
    Deploy-PrometheusAlerts
    Deploy-ServiceMonitors
    Deploy-Grafana
    Deploy-AlertManager
    Deploy-AzureAlerts

    Test-Deployment
    Show-AccessInfo

    Write-Header "Deployment Complete"
    Write-Success "Monitoring stack deployed successfully!"
    Write-Info "`nNext steps:"
    Write-Host "1. Access Grafana: kubectl port-forward -n $NamespaceMonitoring svc/grafana 3000:3000"
    Write-Host "2. Import dashboards from: $K8sDir\monitoring\grafana-dashboards.json"
    Write-Host "3. Configure AlertManager secrets"
    Write-Host "4. Review alert rules in Azure Portal"
    Write-Host "5. See MONITORING_GUIDE.md for detailed documentation"
}

# Run main
Main
