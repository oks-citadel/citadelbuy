// Azure Monitor Alert Rules for Broxiva AKS Cluster
// This Bicep template creates metric alerts for the broxiva-prod-aks cluster

param aksClusterName string = 'broxiva-prod-aks'
param resourceGroupName string = 'broxiva-prod-rg'
param location string = resourceGroup().location
param actionGroupName string = 'broxiva-alerts-action-group'
param tags object = {
  environment: 'production'
  application: 'broxiva'
  managedBy: 'bicep'
}

// Get reference to existing AKS cluster
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' existing = {
  name: aksClusterName
}

// Action Group for Alert Notifications
resource actionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: actionGroupName
  location: 'global'
  tags: tags
  properties: {
    groupShortName: 'BroxAlerts'
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
    smsReceivers: [
      {
        name: 'On-Call Engineer'
        countryCode: '1'
        phoneNumber: '5551234567'
      }
    ]
    webhookReceivers: [
      {
        name: 'Slack Integration'
        serviceUri: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        useCommonAlertSchema: true
      }
    ]
    azureAppPushReceivers: []
    armRoleReceivers: [
      {
        name: 'Monitoring Contributor'
        roleId: '749f88d5-cbae-40b8-bcfc-e573ddc772fa'
        useCommonAlertSchema: true
      }
    ]
  }
}

// Alert Rule: High CPU Usage
resource cpuAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-high-cpu'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when AKS cluster CPU usage exceeds 80%'
    severity: 2
    enabled: true
    scopes: [
      aksCluster.id
    ]
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
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: High Memory Usage
resource memoryAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-high-memory'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when AKS cluster memory usage exceeds 85%'
    severity: 2
    enabled: true
    scopes: [
      aksCluster.id
    ]
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
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: Pod Crashes
resource podCrashAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-pod-crashes'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when pods are crash looping'
    severity: 1
    enabled: true
    scopes: [
      aksCluster.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'PodCrashLooping'
          metricName: 'restartingcontainercount'
          metricNamespace: 'Insights.Container/pods'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'kubernetes namespace'
              operator: 'Include'
              values: [
                'broxiva-production'
                'broxiva'
              ]
            }
          ]
        }
      ]
    }
    autoMitigate: false
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: Failed Pods
resource failedPodsAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-failed-pods'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when pods are in failed state'
    severity: 1
    enabled: true
    scopes: [
      aksCluster.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'FailedPods'
          metricName: 'PodCount'
          metricNamespace: 'Insights.Container/pods'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'phase'
              operator: 'Include'
              values: [
                'Failed'
              ]
            }
            {
              name: 'kubernetes namespace'
              operator: 'Include'
              values: [
                'broxiva-production'
                'broxiva'
              ]
            }
          ]
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: Node Not Ready
resource nodeNotReadyAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-node-not-ready'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when nodes are not in ready state'
    severity: 0
    enabled: true
    scopes: [
      aksCluster.id
    ]
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
              values: [
                'NotReady'
                'Unknown'
              ]
            }
          ]
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: High Disk Usage
resource diskUsageAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-high-disk-usage'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when disk usage exceeds 85%'
    severity: 2
    enabled: true
    scopes: [
      aksCluster.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighDiskUsage'
          metricName: 'node_disk_usage_percentage'
          metricNamespace: 'Insights.Container/nodes'
          operator: 'GreaterThan'
          threshold: 85
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: OOM Killed Containers
resource oomKilledAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-oom-killed'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when containers are killed due to out of memory'
    severity: 1
    enabled: true
    scopes: [
      aksCluster.id
    ]
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
              values: [
                'broxiva-production'
                'broxiva'
              ]
            }
          ]
        }
      ]
    }
    autoMitigate: false
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: Container CPU Throttling
resource cpuThrottlingAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-cpu-throttling'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when containers are experiencing CPU throttling'
    severity: 2
    enabled: true
    scopes: [
      aksCluster.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CPUThrottling'
          metricName: 'cpuThrottledPercentage'
          metricNamespace: 'Insights.Container/containers'
          operator: 'GreaterThan'
          threshold: 25
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'kubernetes namespace'
              operator: 'Include'
              values: [
                'broxiva-production'
                'broxiva'
              ]
            }
          ]
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: Persistent Volume Usage
resource pvUsageAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'broxiva-aks-pv-usage'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when persistent volume usage exceeds 80%'
    severity: 2
    enabled: true
    scopes: [
      aksCluster.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighPVUsage'
          metricName: 'pvUsageExceededPercentage'
          metricNamespace: 'Insights.Container/persistentvolumes'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule: Cluster Health
resource clusterHealthAlertRule 'Microsoft.Insights/activityLogAlerts@2020-10-01' = {
  name: 'broxiva-aks-cluster-health'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert on AKS cluster health events'
    enabled: true
    scopes: [
      aksCluster.id
    ]
    condition: {
      allOf: [
        {
          field: 'category'
          equals: 'ResourceHealth'
        }
        {
          field: 'resourceType'
          equals: 'Microsoft.ContainerService/managedClusters'
        }
        {
          anyOf: [
            {
              field: 'properties.currentHealthStatus'
              equals: 'Unavailable'
            }
            {
              field: 'properties.currentHealthStatus'
              equals: 'Degraded'
            }
          ]
        }
      ]
    }
    actions: {
      actionGroups: [
        {
          actionGroupId: actionGroup.id
        }
      ]
    }
  }
}

// Outputs
output actionGroupId string = actionGroup.id
output actionGroupName string = actionGroup.name
output alertRuleNames array = [
  cpuAlertRule.name
  memoryAlertRule.name
  podCrashAlertRule.name
  failedPodsAlertRule.name
  nodeNotReadyAlertRule.name
  diskUsageAlertRule.name
  oomKilledAlertRule.name
  cpuThrottlingAlertRule.name
  pvUsageAlertRule.name
  clusterHealthAlertRule.name
]
