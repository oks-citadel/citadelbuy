// Enhanced Azure Monitor Alert Rules for Broxiva AKS Cluster
// This Bicep template creates comprehensive metric and log alerts

param aksClusterName string = 'broxiva-prod-aks'
param resourceGroupName string = 'broxiva-prod-rg'
param location string = resourceGroup().location
param logAnalyticsWorkspaceId string
param applicationGatewayName string = 'broxiva-appgw'
param keyVaultName string = 'broxiva-keyvault'
param tags object = {
  environment: 'production'
  application: 'broxiva'
  managedBy: 'bicep'
}

// Get reference to existing resources
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' existing = {
  name: aksClusterName
}

resource appGateway 'Microsoft.Network/applicationGateways@2023-06-01' existing = {
  name: applicationGatewayName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Critical Action Group (PagerDuty, SMS, Email)
resource criticalActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-critical-alerts'
  location: 'global'
  tags: tags
  properties: {
    groupShortName: 'BroxCrit'
    enabled: true
    emailReceivers: [
      {
        name: 'On-Call Engineer'
        emailAddress: 'oncall@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'DevOps Lead'
        emailAddress: 'devops-lead@broxiva.com'
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: [
      {
        name: 'On-Call SMS'
        countryCode: '1'
        phoneNumber: '5551234567'
      }
    ]
    webhookReceivers: [
      {
        name: 'PagerDuty'
        serviceUri: 'https://events.pagerduty.com/integration/YOUR_KEY/enqueue'
        useCommonAlertSchema: true
      }
      {
        name: 'Slack Critical'
        serviceUri: 'https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK'
        useCommonAlertSchema: true
      }
    ]
    armRoleReceivers: [
      {
        name: 'Monitoring Contributor'
        roleId: '749f88d5-cbae-40b8-bcfc-e573ddc772fa'
        useCommonAlertSchema: true
      }
    ]
  }
}

// Warning Action Group (Email, Slack)
resource warningActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-warning-alerts'
  location: 'global'
  tags: tags
  properties: {
    groupShortName: 'BroxWarn'
    enabled: true
    emailReceivers: [
      {
        name: 'DevOps Team'
        emailAddress: 'devops@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'Engineering Team'
        emailAddress: 'engineering@broxiva.com'
        useCommonAlertSchema: true
      }
    ]
    webhookReceivers: [
      {
        name: 'Slack Warnings'
        serviceUri: 'https://hooks.slack.com/services/YOUR/WARNING/WEBHOOK'
        useCommonAlertSchema: true
      }
      {
        name: 'Microsoft Teams'
        serviceUri: 'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK'
        useCommonAlertSchema: true
      }
    ]
  }
}

// Info Action Group (Slack only)
resource infoActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-info-alerts'
  location: 'global'
  tags: tags
  properties: {
    groupShortName: 'BroxInfo'
    enabled: true
    webhookReceivers: [
      {
        name: 'Slack Info'
        serviceUri: 'https://hooks.slack.com/services/YOUR/INFO/WEBHOOK'
        useCommonAlertSchema: true
      }
    ]
  }
}

// ===== AKS CLUSTER ALERTS =====

// High CPU Usage
resource cpuAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-high-cpu'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when AKS cluster CPU usage exceeds 80%'
    severity: 2
    enabled: true
    scopes: [aksCluster.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighCPUUsage'
          metricName: 'node_cpu_usage_percentage'
          metricNamespace: 'Insights.Container/nodes'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: [{actionGroupId: warningActionGroup.id}]
  }
}

// High Memory Usage
resource memoryAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-high-memory'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when AKS cluster memory usage exceeds 85%'
    severity: 2
    enabled: true
    scopes: [aksCluster.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighMemoryUsage'
          metricName: 'node_memory_working_set_percentage'
          metricNamespace: 'Insights.Container/nodes'
          operator: 'GreaterThan'
          threshold: 85
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: [{actionGroupId: warningActionGroup.id}]
  }
}

// Pod Restart Alert
resource podRestartAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = {
  name: 'broxiva-pod-restart-alert'
  location: location
  tags: tags
  properties: {
    description: 'Alert when pods restart more than 3 times in 15 minutes'
    severity: 1
    enabled: true
    scopes: [logAnalyticsWorkspaceId]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
            KubePodInventory
            | where Namespace in ("broxiva", "broxiva-production")
            | where PodRestartCount > 3
            | summarize RestartCount = max(PodRestartCount) by PodName, Namespace
            | where RestartCount > 3
          '''
          timeAggregation: 'Maximum'
          dimensions: [
            {name: 'PodName', operator: 'Include', values: ['*']}
            {name: 'Namespace', operator: 'Include', values: ['*']}
          ]
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: false
    actions: {
      actionGroups: [criticalActionGroup.id]
    }
  }
}

// ===== HTTP ERROR RATE ALERTS =====

// Application Gateway 5xx Errors
resource appGateway5xxAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-appgw-5xx-errors'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when Application Gateway 5xx error rate exceeds 5%'
    severity: 1
    enabled: true
    scopes: [appGateway.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'High5xxRate'
          metricName: 'ResponseStatus'
          metricNamespace: 'Microsoft.Network/applicationGateways'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'HttpStatusGroup'
              operator: 'Include'
              values: ['5xx']
            }
          ]
        }
      ]
    }
    autoMitigate: true
    actions: [{actionGroupId: criticalActionGroup.id}]
  }
}

// Application Gateway 4xx Errors
resource appGateway4xxAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-appgw-4xx-errors'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when Application Gateway 4xx error rate is high'
    severity: 2
    enabled: true
    scopes: [appGateway.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'High4xxRate'
          metricName: 'ResponseStatus'
          metricNamespace: 'Microsoft.Network/applicationGateways'
          operator: 'GreaterThan'
          threshold: 100
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'HttpStatusGroup'
              operator: 'Include'
              values: ['4xx']
            }
          ]
        }
      ]
    }
    autoMitigate: true
    actions: [{actionGroupId: warningActionGroup.id}]
  }
}

// High HTTP Error Rate from Logs
resource httpErrorRateAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = {
  name: 'broxiva-http-error-rate'
  location: location
  tags: tags
  properties: {
    description: 'Alert when HTTP error rate exceeds 5% in application logs'
    severity: 1
    enabled: true
    scopes: [logAnalyticsWorkspaceId]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: '''
            ContainerLog
            | where Namespace in ("broxiva", "broxiva-production")
            | where LogEntry contains "HTTP" or LogEntry contains "status"
            | extend StatusCode = extract(@"status[=:]?\s*(\d{3})", 1, LogEntry)
            | where isnotempty(StatusCode)
            | summarize
                TotalRequests = count(),
                ErrorRequests = countif(StatusCode startswith "5")
            | extend ErrorRate = (ErrorRequests * 100.0) / TotalRequests
            | where ErrorRate > 5
          '''
          timeAggregation: 'Maximum'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: {
      actionGroups: [criticalActionGroup.id]
    }
  }
}

// ===== CERTIFICATE EXPIRY ALERTS =====

// Key Vault Certificate Near Expiry (30 days)
resource certExpiry30DaysAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = {
  name: 'broxiva-cert-expiry-30days'
  location: location
  tags: tags
  properties: {
    description: 'Alert when certificates will expire in 30 days'
    severity: 2
    enabled: true
    scopes: [logAnalyticsWorkspaceId]
    evaluationFrequency: 'PT1H'
    windowSize: 'PT1H'
    criteria: {
      allOf: [
        {
          query: '''
            AzureDiagnostics
            | where ResourceProvider == "MICROSOFT.KEYVAULT"
            | where OperationName == "SecretGet" or OperationName == "CertificateGet"
            | extend ExpiryDate = todatetime(properties_expiry_d)
            | where isnotempty(ExpiryDate)
            | extend DaysToExpiry = datetime_diff('day', ExpiryDate, now())
            | where DaysToExpiry <= 30 and DaysToExpiry > 0
            | summarize Count = count() by ResourceId, DaysToExpiry
          '''
          timeAggregation: 'Total'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: false
    actions: {
      actionGroups: [warningActionGroup.id]
    }
  }
}

// Key Vault Certificate Near Expiry (7 days) - CRITICAL
resource certExpiry7DaysAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = {
  name: 'broxiva-cert-expiry-7days'
  location: location
  tags: tags
  properties: {
    description: 'CRITICAL: Certificates will expire in 7 days'
    severity: 0
    enabled: true
    scopes: [logAnalyticsWorkspaceId]
    evaluationFrequency: 'PT1H'
    windowSize: 'PT1H'
    criteria: {
      allOf: [
        {
          query: '''
            AzureDiagnostics
            | where ResourceProvider == "MICROSOFT.KEYVAULT"
            | where OperationName == "SecretGet" or OperationName == "CertificateGet"
            | extend ExpiryDate = todatetime(properties_expiry_d)
            | where isnotempty(ExpiryDate)
            | extend DaysToExpiry = datetime_diff('day', ExpiryDate, now())
            | where DaysToExpiry <= 7 and DaysToExpiry > 0
            | summarize Count = count() by ResourceId, DaysToExpiry
          '''
          timeAggregation: 'Total'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: false
    actions: {
      actionGroups: [criticalActionGroup.id]
    }
  }
}

// Ingress Certificate Expiry Check
resource ingressCertExpiryAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = {
  name: 'broxiva-ingress-cert-expiry'
  location: location
  tags: tags
  properties: {
    description: 'Alert when Kubernetes Ingress certificates are near expiry'
    severity: 1
    enabled: true
    scopes: [logAnalyticsWorkspaceId]
    evaluationFrequency: 'PT6H'
    windowSize: 'PT6H'
    criteria: {
      allOf: [
        {
          query: '''
            KubeEvents
            | where Namespace in ("broxiva", "broxiva-production")
            | where ObjectKind == "Certificate"
            | where Reason contains "Expir" or Message contains "expir"
            | summarize Count = count() by Name, Namespace
          '''
          timeAggregation: 'Total'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: {
      actionGroups: [warningActionGroup.id]
    }
  }
}

// ===== ADDITIONAL CRITICAL ALERTS =====

// Node Not Ready
resource nodeNotReadyAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-node-not-ready'
  location: 'global'
  tags: tags
  properties: {
    description: 'CRITICAL: AKS nodes are not ready'
    severity: 0
    enabled: true
    scopes: [aksCluster.id]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'NodeNotReady'
          metricName: 'nodesCount'
          metricNamespace: 'Insights.Container/nodes'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'status'
              operator: 'Include'
              values: ['NotReady', 'Unknown']
            }
          ]
        }
      ]
    }
    autoMitigate: true
    actions: [{actionGroupId: criticalActionGroup.id}]
  }
}

// OOM Killed Containers
resource oomKilledAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-oom-killed'
  location: 'global'
  tags: tags
  properties: {
    description: 'Containers killed due to out of memory'
    severity: 1
    enabled: true
    scopes: [aksCluster.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'OOMKilled'
          metricName: 'oomKilledContainerCount'
          metricNamespace: 'Insights.Container/containers'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'kubernetes namespace'
              operator: 'Include'
              values: ['broxiva-production', 'broxiva']
            }
          ]
        }
      ]
    }
    autoMitigate: false
    actions: [{actionGroupId: criticalActionGroup.id}]
  }
}

// Database Connection Failures
resource dbConnectionFailureAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = {
  name: 'broxiva-db-connection-failure'
  location: location
  tags: tags
  properties: {
    description: 'Alert on database connection failures'
    severity: 1
    enabled: true
    scopes: [logAnalyticsWorkspaceId]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: '''
            ContainerLog
            | where Namespace in ("broxiva", "broxiva-production")
            | where LogEntry contains "database" or LogEntry contains "postgres" or LogEntry contains "connection"
            | where LogEntry contains "error" or LogEntry contains "failed" or LogEntry contains "timeout"
            | summarize ErrorCount = count() by ContainerName, Namespace
            | where ErrorCount > 5
          '''
          timeAggregation: 'Total'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: {
      actionGroups: [criticalActionGroup.id]
    }
  }
}

// Deployment Failures
resource deploymentFailureAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = {
  name: 'broxiva-deployment-failure'
  location: location
  tags: tags
  properties: {
    description: 'Alert on Kubernetes deployment failures'
    severity: 2
    enabled: true
    scopes: [logAnalyticsWorkspaceId]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
            KubeEvents
            | where Namespace in ("broxiva", "broxiva-production")
            | where ObjectKind == "Deployment"
            | where Reason in ("FailedCreate", "FailedUpdate", "ReplicaSetCreateError")
            | summarize FailureCount = count() by Name, Namespace, Reason
          '''
          timeAggregation: 'Total'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: {
      actionGroups: [warningActionGroup.id]
    }
  }
}

// Outputs
output criticalActionGroupId string = criticalActionGroup.id
output warningActionGroupId string = warningActionGroup.id
output infoActionGroupId string = infoActionGroup.id
output alertRuleIds array = [
  cpuAlertRule.id
  memoryAlertRule.id
  podRestartAlert.id
  appGateway5xxAlert.id
  appGateway4xxAlert.id
  httpErrorRateAlert.id
  certExpiry30DaysAlert.id
  certExpiry7DaysAlert.id
  ingressCertExpiryAlert.id
  nodeNotReadyAlert.id
  oomKilledAlert.id
  dbConnectionFailureAlert.id
  deploymentFailureAlert.id
]
