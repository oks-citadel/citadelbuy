// Application Insights and Log Analytics Workspace for Broxiva
// This Bicep template creates comprehensive observability infrastructure

param location string = resourceGroup().location
param environment string = 'production'
param workspaceName string = 'broxiva-prod-logs'
param appInsightsName string = 'broxiva-prod-appinsights'
param aksClusterName string = 'broxiva-prod-aks'
param retentionInDays int = 90
param dailyQuotaGb int = 10

param tags object = {
  environment: environment
  application: 'broxiva'
  managedBy: 'bicep'
  purpose: 'observability'
}

// ===== LOG ANALYTICS WORKSPACE =====

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
      disableLocalAuth: false
    }
    workspaceCapping: {
      dailyQuotaGb: dailyQuotaGb
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ===== APPLICATION INSIGHTS =====

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    RetentionInDays: retentionInDays
    DisableIpMasking: false
    SamplingPercentage: 100
  }
}

// ===== AKS CONTAINER INSIGHTS SOLUTION =====

resource containerInsightsSolution 'Microsoft.OperationsManagement/solutions@2015-11-01-preview' = {
  name: 'ContainerInsights(${workspaceName})'
  location: location
  tags: tags
  plan: {
    name: 'ContainerInsights(${workspaceName})'
    product: 'OMSGallery/ContainerInsights'
    promotionCode: ''
    publisher: 'Microsoft'
  }
  properties: {
    workspaceResourceId: logAnalyticsWorkspace.id
  }
}

// ===== DATA COLLECTION RULES =====

// Data Collection Endpoint
resource dataCollectionEndpoint 'Microsoft.Insights/dataCollectionEndpoints@2022-06-01' = {
  name: 'broxiva-dce'
  location: location
  tags: tags
  kind: 'Linux'
  properties: {
    networkAcls: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// Data Collection Rule for Container Insights
resource containerInsightsDCR 'Microsoft.Insights/dataCollectionRules@2022-06-01' = {
  name: 'broxiva-container-insights-dcr'
  location: location
  tags: tags
  kind: 'Linux'
  properties: {
    dataCollectionEndpointId: dataCollectionEndpoint.id
    dataSources: {
      extensions: [
        {
          name: 'ContainerInsightsExtension'
          streams: [
            'Microsoft-ContainerInsights-Group-Default'
          ]
          extensionName: 'ContainerInsights'
          extensionSettings: {
            dataCollectionSettings: {
              interval: '1m'
              namespaceFilteringMode: 'Include'
              namespaces: [
                'broxiva'
                'broxiva-production'
                'broxiva-monitoring'
                'broxiva-ai'
                'kube-system'
              ]
              enableContainerLogV2: true
            }
          }
        }
      ]
      syslog: [
        {
          name: 'sysLogsDataSource'
          streams: [
            'Microsoft-Syslog'
          ]
          facilityNames: [
            'auth'
            'authpriv'
            'cron'
            'daemon'
            'kern'
            'syslog'
          ]
          logLevels: [
            'Warning'
            'Error'
            'Critical'
            'Alert'
            'Emergency'
          ]
        }
      ]
    }
    destinations: {
      logAnalytics: [
        {
          name: 'broxiva-logs-destination'
          workspaceResourceId: logAnalyticsWorkspace.id
        }
      ]
    }
    dataFlows: [
      {
        streams: [
          'Microsoft-ContainerInsights-Group-Default'
        ]
        destinations: [
          'broxiva-logs-destination'
        ]
      }
      {
        streams: [
          'Microsoft-Syslog'
        ]
        destinations: [
          'broxiva-logs-destination'
        ]
      }
    ]
  }
}

// ===== DIAGNOSTIC SETTINGS FOR AKS =====

resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' existing = {
  name: aksClusterName
}

resource aksDiagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'broxiva-aks-diagnostics'
  scope: aksCluster
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      {
        category: 'kube-apiserver'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
      {
        category: 'kube-audit'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
      {
        category: 'kube-audit-admin'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
      {
        category: 'kube-controller-manager'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
      {
        category: 'kube-scheduler'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
      {
        category: 'cluster-autoscaler'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
      {
        category: 'guard'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: retentionInDays
        }
      }
    ]
  }
}

// ===== SAVED QUERIES FOR LOG ANALYTICS =====

// High Error Rate Query
resource highErrorRateQuery 'Microsoft.OperationalInsights/workspaces/savedSearches@2020-08-01' = {
  name: 'HighErrorRate'
  parent: logAnalyticsWorkspace
  properties: {
    category: 'Broxiva Monitoring'
    displayName: 'High Error Rate Detection'
    query: '''
      ContainerLog
      | where Namespace in ("broxiva", "broxiva-production")
      | where LogEntry contains "error" or LogEntry contains "ERROR"
      | summarize ErrorCount = count() by bin(TimeGenerated, 5m), ContainerName, Namespace
      | where ErrorCount > 10
      | order by TimeGenerated desc
    '''
    version: 2
  }
}

// Slow API Response Query
resource slowAPIQuery 'Microsoft.OperationalInsights/workspaces/savedSearches@2020-08-01' = {
  name: 'SlowAPIResponses'
  parent: logAnalyticsWorkspace
  properties: {
    category: 'Broxiva Monitoring'
    displayName: 'Slow API Responses (P95 > 2s)'
    query: '''
      AppRequests
      | where AppRoleName contains "api"
      | summarize P95Duration = percentile(DurationMs, 95) by bin(TimeGenerated, 5m), OperationName
      | where P95Duration > 2000
      | order by TimeGenerated desc
    '''
    version: 2
  }
}

// Pod Restart Frequency Query
resource podRestartQuery 'Microsoft.OperationalInsights/workspaces/savedSearches@2020-08-01' = {
  name: 'PodRestartFrequency'
  parent: logAnalyticsWorkspace
  properties: {
    category: 'Broxiva Monitoring'
    displayName: 'Pod Restart Frequency Analysis'
    query: '''
      KubePodInventory
      | where Namespace in ("broxiva", "broxiva-production")
      | summarize RestartCount = max(PodRestartCount) by PodName, Namespace, bin(TimeGenerated, 15m)
      | where RestartCount > 3
      | order by TimeGenerated desc, RestartCount desc
    '''
    version: 2
  }
}

// Resource Utilization Query
resource resourceUtilizationQuery 'Microsoft.OperationalInsights/workspaces/savedSearches@2020-08-01' = {
  name: 'ResourceUtilization'
  parent: logAnalyticsWorkspace
  properties: {
    category: 'Broxiva Monitoring'
    displayName: 'Container Resource Utilization'
    query: '''
      Perf
      | where ObjectName == "K8SContainer"
      | where CounterName in ("cpuUsageNanoCores", "memoryWorkingSetBytes")
      | summarize
          AvgCPU = avg(iif(CounterName == "cpuUsageNanoCores", CounterValue, 0)),
          AvgMemory = avg(iif(CounterName == "memoryWorkingSetBytes", CounterValue, 0))
        by bin(TimeGenerated, 5m), InstanceName
      | order by TimeGenerated desc
    '''
    version: 2
  }
}

// Database Performance Query
resource databasePerfQuery 'Microsoft.OperationalInsights/workspaces/savedSearches@2020-08-01' = {
  name: 'DatabasePerformance'
  parent: logAnalyticsWorkspace
  properties: {
    category: 'Broxiva Monitoring'
    displayName: 'Database Query Performance'
    query: '''
      ContainerLog
      | where Namespace in ("broxiva", "broxiva-production")
      | where LogEntry contains "query" or LogEntry contains "database"
      | extend QueryDuration = extract(@"duration[=:]?\s*(\d+\.?\d*)(?:ms|s)", 1, LogEntry)
      | where isnotempty(QueryDuration)
      | extend QueryDurationMs = toreal(QueryDuration)
      | summarize
          AvgDuration = avg(QueryDurationMs),
          P95Duration = percentile(QueryDurationMs, 95),
          QueryCount = count()
        by bin(TimeGenerated, 5m), ContainerName
      | where P95Duration > 1000
      | order by TimeGenerated desc
    '''
    version: 2
  }
}

// Availability Tracking Query
resource availabilityQuery 'Microsoft.OperationalInsights/workspaces/savedSearches@2020-08-01' = {
  name: 'ServiceAvailability'
  parent: logAnalyticsWorkspace
  properties: {
    category: 'Broxiva Monitoring'
    displayName: 'Service Availability Tracking'
    query: '''
      let UpMetric = KubePodInventory
      | where Namespace in ("broxiva", "broxiva-production")
      | where PodStatus == "Running"
      | summarize UpPods = count() by bin(TimeGenerated, 1m), Name;
      let TotalMetric = KubePodInventory
      | where Namespace in ("broxiva", "broxiva-production")
      | summarize TotalPods = count() by bin(TimeGenerated, 1m), Name;
      UpMetric
      | join kind=inner (TotalMetric) on TimeGenerated, Name
      | extend AvailabilityPercent = (UpPods * 100.0) / TotalPods
      | where AvailabilityPercent < 99.9
      | project TimeGenerated, Name, UpPods, TotalPods, AvailabilityPercent
      | order by TimeGenerated desc
    '''
    version: 2
  }
}

// ===== WORKBOOK FOR AZURE MONITOR =====

resource broxivaWorkbook 'Microsoft.Insights/workbooks@2022-04-01' = {
  name: guid('broxiva-monitoring-workbook')
  location: location
  tags: tags
  kind: 'shared'
  properties: {
    displayName: 'Broxiva Production Monitoring Dashboard'
    serializedData: string({
      version: 'Notebook/1.0'
      items: [
        {
          type: 1
          content: {
            json: '## Broxiva Production Observability Dashboard\n\nComprehensive monitoring for all Broxiva services and infrastructure.'
          }
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'KubePodInventory\n| where Namespace in ("broxiva", "broxiva-production")\n| summarize PodCount = count() by PodStatus\n| render piechart'
            size: 3
            title: 'Pod Status Distribution'
            timeContext: {
              durationMs: 3600000
            }
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'Perf\n| where ObjectName == "K8SNode"\n| where CounterName == "cpuUsageNanoCores"\n| summarize AvgCPU = avg(CounterValue) by bin(TimeGenerated, 5m)\n| render timechart'
            size: 3
            title: 'Cluster CPU Usage Over Time'
            timeContext: {
              durationMs: 3600000
            }
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'AppRequests\n| summarize\n    TotalRequests = count(),\n    FailedRequests = countif(Success == false),\n    AvgDuration = avg(DurationMs)\n  by bin(TimeGenerated, 5m)\n| extend ErrorRate = (FailedRequests * 100.0) / TotalRequests\n| render timechart'
            size: 3
            title: 'Request Volume and Error Rate'
            timeContext: {
              durationMs: 3600000
            }
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
        }
      ]
      isLocked: false
    })
    category: 'workbook'
    sourceId: logAnalyticsWorkspace.id
  }
}

// ===== OUTPUTS =====

output workspaceId string = logAnalyticsWorkspace.id
output workspaceName string = logAnalyticsWorkspace.name
output workspaceCustomerId string = logAnalyticsWorkspace.properties.customerId
output appInsightsId string = applicationInsights.id
output appInsightsName string = applicationInsights.name
output appInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey
output appInsightsConnectionString string = applicationInsights.properties.ConnectionString
output dataCollectionEndpointId string = dataCollectionEndpoint.id
output containerInsightsDCRId string = containerInsightsDCR.id
output workbookId string = broxivaWorkbook.id
