// Broxiva Cost Management - Budget Alerts and Notifications
// This Bicep template creates budget alerts for cost governance

targetScope = 'subscription'

@description('Name of the budget')
param budgetName string = 'broxiva-monthly-budget'

@description('Budget amount in USD')
param budgetAmount int = 5000

@description('Start date for the budget (YYYY-MM-DD)')
param startDate string = '2025-01-01'

@description('Email addresses for budget alerts')
param alertEmails array = [
  'finops@broxiva.com'
  'devops@broxiva.com'
]

@description('Resource Group filter (optional)')
param resourceGroupFilter string = ''

@description('Tag filters for cost allocation')
param tagFilters object = {
  env: 'production'
}

// Monthly Budget with Multiple Thresholds
resource monthlyBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: budgetName
  properties: {
    category: 'Cost'
    amount: budgetAmount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    filter: {
      and: [
        {
          dimensions: {
            name: 'ResourceGroupName'
            operator: 'In'
            values: !empty(resourceGroupFilter) ? [resourceGroupFilter] : []
          }
        }
        {
          tags: {
            name: 'env'
            operator: 'In'
            values: [tagFilters.env]
          }
        }
      ]
    }
    notifications: {
      Actual_50_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 50
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        thresholdType: 'Actual'
      }
      Actual_75_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 75
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        thresholdType: 'Actual'
      }
      Actual_90_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 90
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        thresholdType: 'Actual'
      }
      Forecasted_100_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        thresholdType: 'Forecasted'
      }
    }
  }
}

// Development Environment Budget
resource devBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: '${budgetName}-development'
  properties: {
    category: 'Cost'
    amount: budgetAmount * 20 / 100  // 20% of total budget
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    filter: {
      tags: {
        name: 'env'
        operator: 'In'
        values: ['development', 'dev']
      }
    }
    notifications: {
      Actual_80_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        contactEmails: alertEmails
        thresholdType: 'Actual'
      }
      Actual_100_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: alertEmails
        thresholdType: 'Actual'
      }
    }
  }
}

// Staging Environment Budget
resource stagingBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: '${budgetName}-staging'
  properties: {
    category: 'Cost'
    amount: budgetAmount * 30 / 100  // 30% of total budget
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    filter: {
      tags: {
        name: 'env'
        operator: 'In'
        values: ['staging', 'stage']
      }
    }
    notifications: {
      Actual_80_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        contactEmails: alertEmails
        thresholdType: 'Actual'
      }
      Actual_100_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: alertEmails
        thresholdType: 'Actual'
      }
    }
  }
}

// Production Environment Budget
resource prodBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: '${budgetName}-production'
  properties: {
    category: 'Cost'
    amount: budgetAmount * 50 / 100  // 50% of total budget
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    filter: {
      tags: {
        name: 'env'
        operator: 'In'
        values: ['production', 'prod']
      }
    }
    notifications: {
      Actual_70_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 70
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        thresholdType: 'Actual'
      }
      Actual_85_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 85
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        thresholdType: 'Actual'
      }
      Forecasted_100_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: alertEmails
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        thresholdType: 'Forecasted'
      }
    }
  }
}

// AKS-specific Budget
resource aksBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: '${budgetName}-aks'
  properties: {
    category: 'Cost'
    amount: budgetAmount * 40 / 100  // 40% of total budget for AKS
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    filter: {
      dimensions: {
        name: 'ResourceType'
        operator: 'In'
        values: [
          'microsoft.containerservice/managedclusters'
        ]
      }
    }
    notifications: {
      Actual_75_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 75
        contactEmails: alertEmails
        thresholdType: 'Actual'
      }
      Actual_90_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 90
        contactEmails: alertEmails
        thresholdType: 'Actual'
      }
    }
  }
}

output budgetId string = monthlyBudget.id
output devBudgetId string = devBudget.id
output stagingBudgetId string = stagingBudget.id
output prodBudgetId string = prodBudget.id
output aksBudgetId string = aksBudget.id
