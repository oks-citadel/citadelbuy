// Broxiva Production Specialized Key Vaults - Bicep Template
// Function-based separation for enhanced security and compliance
// Created: 2025-12-13
// Purpose: Separate authentication, data, and payment secrets for PCI-DSS compliance

@description('Azure region for all resources')
param location string = 'eastus'

@description('Environment name')
@allowed([
  'production'
])
param environment string = 'production'

@description('Project name')
param projectName string = 'broxiva'

@description('Tags for all resources')
param tags object = {
  Environment: 'production'
  Project: 'broxiva'
  ManagedBy: 'bicep'
}

@description('Object ID of the current user/service principal deploying')
param deployerObjectId string

@description('API Managed Identity Object ID')
param apiManagedIdentityId string = ''

@description('Worker Managed Identity Object ID')
param workerManagedIdentityId string = ''

@description('Payment Service Managed Identity Object ID')
param paymentServiceManagedIdentityId string = ''

@description('AKS Subnet ID for network rules')
param aksSubnetId string = ''

@description('Payment Service Subnet ID for network rules')
param paymentServiceSubnetId string = ''

@description('Log Analytics Workspace ID for diagnostics')
param logAnalyticsWorkspaceId string

// =============================================================================
// PRODUCTION AUTHENTICATION KEY VAULT
// =============================================================================

resource authKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${projectName}-prod-auth-kv'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'premium' // Premium for HSM-backed keys
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: aksSubnetId != '' ? [
        {
          id: aksSubnetId
        }
      ] : []
    }
  }
  tags: union(tags, {
    Purpose: 'Authentication & Authorization Secrets'
    Compliance: 'SOC2,ISO27001'
    Criticality: 'HIGH'
  })
}

// RBAC: Deployer admin access
resource authKvDeployerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(authKeyVault.id, deployerObjectId, 'Key Vault Secrets Officer')
  scope: authKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7') // Key Vault Secrets Officer
    principalId: deployerObjectId
    principalType: 'ServicePrincipal'
  }
}

// RBAC: API pods read-only access
resource authKvApiRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (apiManagedIdentityId != '') {
  name: guid(authKeyVault.id, apiManagedIdentityId, 'Key Vault Secrets User')
  scope: authKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: apiManagedIdentityId
    principalType: 'ServicePrincipal'
  }
}

// Diagnostics for auth vault
resource authKvDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'auth-kv-diagnostics'
  scope: authKeyVault
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AuditEvent'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 365
        }
      }
      {
        category: 'AzurePolicyEvaluationDetails'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
  }
}

// =============================================================================
// PRODUCTION DATA KEY VAULT
// =============================================================================

resource dataKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${projectName}-prod-data-kv'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'premium' // Premium for encryption keys
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: aksSubnetId != '' ? [
        {
          id: aksSubnetId
        }
      ] : []
    }
  }
  tags: union(tags, {
    Purpose: 'Data Layer Secrets & Encryption Keys'
    Compliance: 'GDPR,SOC2,ISO27001'
    Criticality: 'CRITICAL'
  })
}

// RBAC: Deployer admin access
resource dataKvDeployerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(dataKeyVault.id, deployerObjectId, 'Key Vault Secrets Officer')
  scope: dataKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7')
    principalId: deployerObjectId
    principalType: 'ServicePrincipal'
  }
}

// RBAC: API pods read-only access
resource dataKvApiRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (apiManagedIdentityId != '') {
  name: guid(dataKeyVault.id, apiManagedIdentityId, 'Key Vault Secrets User')
  scope: dataKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: apiManagedIdentityId
    principalType: 'ServicePrincipal'
  }
}

// RBAC: Worker pods read-only access
resource dataKvWorkerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (workerManagedIdentityId != '') {
  name: guid(dataKeyVault.id, workerManagedIdentityId, 'Key Vault Secrets User')
  scope: dataKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: workerManagedIdentityId
    principalType: 'ServicePrincipal'
  }
}

// Diagnostics for data vault
resource dataKvDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'data-kv-diagnostics'
  scope: dataKeyVault
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AuditEvent'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 365
        }
      }
      {
        category: 'AzurePolicyEvaluationDetails'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
  }
}

// =============================================================================
// PRODUCTION PAYMENT KEY VAULT
// =============================================================================

resource paymentKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${projectName}-prod-payment-kv'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'premium' // Premium required for PCI-DSS
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: paymentServiceSubnetId != '' ? [
        {
          id: paymentServiceSubnetId
        }
      ] : []
    }
  }
  tags: union(tags, {
    Purpose: 'Payment Processing Secrets'
    Compliance: 'PCI-DSS-Level-1,SOC2,ISO27001'
    Criticality: 'CRITICAL'
    PCIScope: 'true'
  })
}

// RBAC: Deployer admin access
resource paymentKvDeployerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(paymentKeyVault.id, deployerObjectId, 'Key Vault Secrets Officer')
  scope: paymentKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7')
    principalId: deployerObjectId
    principalType: 'ServicePrincipal'
  }
}

// RBAC: Payment service pods read-only access (ONLY payment service)
resource paymentKvPaymentServiceRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (paymentServiceManagedIdentityId != '') {
  name: guid(paymentKeyVault.id, paymentServiceManagedIdentityId, 'Key Vault Secrets User')
  scope: paymentKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: paymentServiceManagedIdentityId
    principalType: 'ServicePrincipal'
  }
}

// Diagnostics for payment vault (enhanced logging for PCI-DSS)
resource paymentKvDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'payment-kv-diagnostics'
  scope: paymentKeyVault
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AuditEvent'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 365 // Extended retention for PCI compliance
        }
      }
      {
        category: 'AzurePolicyEvaluationDetails'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 365
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 365
        }
      }
    ]
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

@description('Production Authentication Key Vault URI')
output authKeyVaultUri string = authKeyVault.properties.vaultUri

@description('Production Data Key Vault URI')
output dataKeyVaultUri string = dataKeyVault.properties.vaultUri

@description('Production Payment Key Vault URI')
output paymentKeyVaultUri string = paymentKeyVault.properties.vaultUri

@description('Production Authentication Key Vault Resource ID')
output authKeyVaultId string = authKeyVault.id

@description('Production Data Key Vault Resource ID')
output dataKeyVaultId string = dataKeyVault.id

@description('Production Payment Key Vault Resource ID')
output paymentKeyVaultId string = paymentKeyVault.id

@description('Production Authentication Key Vault Name')
output authKeyVaultName string = authKeyVault.name

@description('Production Data Key Vault Name')
output dataKeyVaultName string = dataKeyVault.name

@description('Production Payment Key Vault Name')
output paymentKeyVaultName string = paymentKeyVault.name

@description('Summary of all production key vaults')
output keyVaultSummary object = {
  authentication: {
    name: authKeyVault.name
    uri: authKeyVault.properties.vaultUri
    id: authKeyVault.id
  }
  data: {
    name: dataKeyVault.name
    uri: dataKeyVault.properties.vaultUri
    id: dataKeyVault.id
  }
  payment: {
    name: paymentKeyVault.name
    uri: paymentKeyVault.properties.vaultUri
    id: paymentKeyVault.id
  }
}
