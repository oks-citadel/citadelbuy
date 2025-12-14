# Broxiva Auto-Shutdown Runbook for Non-Production Environments
# This runbook automatically shuts down non-production resources to save costs

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development,staging",

    [Parameter(Mandatory=$false)]
    [string]$Action = "shutdown",  # shutdown or start

    [Parameter(Mandatory=$false)]
    [bool]$DryRun = $false
)

# Authenticate using Managed Identity
try {
    Write-Output "Connecting to Azure with Managed Identity..."
    Connect-AzAccount -Identity -ErrorAction Stop
} catch {
    Write-Error "Failed to authenticate with Managed Identity: $_"
    exit 1
}

# Configuration
$environments = $Environment -split ','
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Output "========================================"
Write-Output "Broxiva Auto-Shutdown Runbook"
Write-Output "Timestamp: $timestamp"
Write-Output "Action: $Action"
Write-Output "Environments: $environments"
Write-Output "Dry Run: $DryRun"
Write-Output "========================================"

function Stop-BroxivaResources {
    param([string[]]$Environments)

    $resourcesStopped = @()

    # Get all resource groups matching environment tags
    $resourceGroups = Get-AzResourceGroup | Where-Object {
        $_.Tags['env'] -in $Environments -or
        $_.Tags['autoShutdown'] -eq 'true'
    }

    Write-Output "`nFound $($resourceGroups.Count) resource groups to process"

    foreach ($rg in $resourceGroups) {
        Write-Output "`nProcessing Resource Group: $($rg.ResourceGroupName)"

        # 1. Stop Virtual Machines
        $vms = Get-AzVM -ResourceGroupName $rg.ResourceGroupName -Status |
               Where-Object { $_.PowerState -eq 'VM running' }

        foreach ($vm in $vms) {
            if ($DryRun) {
                Write-Output "  [DRY RUN] Would stop VM: $($vm.Name)"
            } else {
                Write-Output "  Stopping VM: $($vm.Name)"
                Stop-AzVM -ResourceGroupName $rg.ResourceGroupName -Name $vm.Name -Force -NoWait
                $resourcesStopped += "VM:$($vm.Name)"
            }
        }

        # 2. Scale down AKS clusters to 0
        $aksClusters = Get-AzAks -ResourceGroupName $rg.ResourceGroupName

        foreach ($aks in $aksClusters) {
            $nodePools = Get-AzAksNodePool -ResourceGroupName $rg.ResourceGroupName -ClusterName $aks.Name

            foreach ($nodePool in $nodePools) {
                if ($nodePool.Count -gt 0) {
                    if ($DryRun) {
                        Write-Output "  [DRY RUN] Would scale down AKS node pool: $($aks.Name)/$($nodePool.Name) to 0"
                    } else {
                        Write-Output "  Scaling down AKS node pool: $($aks.Name)/$($nodePool.Name) to 0"
                        Update-AzAksNodePool -ResourceGroupName $rg.ResourceGroupName `
                                            -ClusterName $aks.Name `
                                            -Name $nodePool.Name `
                                            -NodeCount 0 `
                                            -NoWait
                        $resourcesStopped += "AKS:$($aks.Name)/$($nodePool.Name)"
                    }
                }
            }
        }

        # 3. Stop App Services
        $webApps = Get-AzWebApp -ResourceGroupName $rg.ResourceGroupName |
                   Where-Object { $_.State -eq 'Running' }

        foreach ($app in $webApps) {
            if ($DryRun) {
                Write-Output "  [DRY RUN] Would stop App Service: $($app.Name)"
            } else {
                Write-Output "  Stopping App Service: $($app.Name)"
                Stop-AzWebApp -ResourceGroupName $rg.ResourceGroupName -Name $app.Name
                $resourcesStopped += "AppService:$($app.Name)"
            }
        }

        # 4. Stop SQL Databases (scale to lower tier)
        $sqlServers = Get-AzSqlServer -ResourceGroupName $rg.ResourceGroupName

        foreach ($server in $sqlServers) {
            $databases = Get-AzSqlDatabase -ResourceGroupName $rg.ResourceGroupName `
                                          -ServerName $server.ServerName |
                        Where-Object { $_.DatabaseName -ne 'master' }

            foreach ($db in $databases) {
                if ($db.CurrentServiceObjectiveName -ne 'Basic') {
                    if ($DryRun) {
                        Write-Output "  [DRY RUN] Would scale down SQL Database: $($db.DatabaseName) to Basic"
                    } else {
                        Write-Output "  Scaling down SQL Database: $($db.DatabaseName) to Basic"
                        Set-AzSqlDatabase -ResourceGroupName $rg.ResourceGroupName `
                                         -ServerName $server.ServerName `
                                         -DatabaseName $db.DatabaseName `
                                         -Edition "Basic" `
                                         -RequestedServiceObjectiveName "Basic"
                        $resourcesStopped += "SQLDatabase:$($db.DatabaseName)"
                    }
                }
            }
        }

        # 5. Stop Container Instances
        $containerGroups = Get-AzContainerGroup -ResourceGroupName $rg.ResourceGroupName |
                          Where-Object { $_.ProvisioningState -eq 'Succeeded' }

        foreach ($container in $containerGroups) {
            if ($DryRun) {
                Write-Output "  [DRY RUN] Would stop Container Instance: $($container.Name)"
            } else {
                Write-Output "  Stopping Container Instance: $($container.Name)"
                Stop-AzContainerGroup -ResourceGroupName $rg.ResourceGroupName -Name $container.Name
                $resourcesStopped += "Container:$($container.Name)"
            }
        }
    }

    return $resourcesStopped
}

function Start-BroxivaResources {
    param([string[]]$Environments)

    $resourcesStarted = @()

    $resourceGroups = Get-AzResourceGroup | Where-Object {
        $_.Tags['env'] -in $Environments
    }

    Write-Output "`nFound $($resourceGroups.Count) resource groups to process"

    foreach ($rg in $resourceGroups) {
        Write-Output "`nProcessing Resource Group: $($rg.ResourceGroupName)"

        # 1. Start Virtual Machines
        $vms = Get-AzVM -ResourceGroupName $rg.ResourceGroupName -Status |
               Where-Object { $_.PowerState -ne 'VM running' }

        foreach ($vm in $vms) {
            if ($DryRun) {
                Write-Output "  [DRY RUN] Would start VM: $($vm.Name)"
            } else {
                Write-Output "  Starting VM: $($vm.Name)"
                Start-AzVM -ResourceGroupName $rg.ResourceGroupName -Name $vm.Name -NoWait
                $resourcesStarted += "VM:$($vm.Name)"
            }
        }

        # 2. Scale up AKS clusters
        $aksClusters = Get-AzAks -ResourceGroupName $rg.ResourceGroupName

        foreach ($aks in $aksClusters) {
            # Get desired node count from tags
            $desiredCount = if ($aks.Tags['nodeCount']) { [int]$aks.Tags['nodeCount'] } else { 2 }

            $nodePools = Get-AzAksNodePool -ResourceGroupName $rg.ResourceGroupName -ClusterName $aks.Name

            foreach ($nodePool in $nodePools) {
                if ($nodePool.Count -eq 0) {
                    if ($DryRun) {
                        Write-Output "  [DRY RUN] Would scale up AKS node pool: $($aks.Name)/$($nodePool.Name) to $desiredCount"
                    } else {
                        Write-Output "  Scaling up AKS node pool: $($aks.Name)/$($nodePool.Name) to $desiredCount"
                        Update-AzAksNodePool -ResourceGroupName $rg.ResourceGroupName `
                                            -ClusterName $aks.Name `
                                            -Name $nodePool.Name `
                                            -NodeCount $desiredCount `
                                            -NoWait
                        $resourcesStarted += "AKS:$($aks.Name)/$($nodePool.Name)"
                    }
                }
            }
        }

        # 3. Start App Services
        $webApps = Get-AzWebApp -ResourceGroupName $rg.ResourceGroupName |
                   Where-Object { $_.State -eq 'Stopped' }

        foreach ($app in $webApps) {
            if ($DryRun) {
                Write-Output "  [DRY RUN] Would start App Service: $($app.Name)"
            } else {
                Write-Output "  Starting App Service: $($app.Name)"
                Start-AzWebApp -ResourceGroupName $rg.ResourceGroupName -Name $app.Name
                $resourcesStarted += "AppService:$($app.Name)"
            }
        }
    }

    return $resourcesStarted
}

# Execute the appropriate action
if ($Action -eq "shutdown") {
    $results = Stop-BroxivaResources -Environments $environments
} elseif ($Action -eq "start") {
    $results = Start-BroxivaResources -Environments $environments
} else {
    Write-Error "Invalid action: $Action. Must be 'shutdown' or 'start'"
    exit 1
}

# Summary
Write-Output "`n========================================"
Write-Output "Summary"
Write-Output "========================================"
Write-Output "Action: $Action"
Write-Output "Resources processed: $($results.Count)"
if ($results.Count -gt 0) {
    Write-Output "`nResources:"
    $results | ForEach-Object { Write-Output "  - $_" }
}
Write-Output "`nCompleted at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "========================================"
