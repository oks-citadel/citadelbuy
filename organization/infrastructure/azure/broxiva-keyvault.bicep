// Broxiva Production Key Vault - Bicep Template
// This creates Azure Key Vault for Broxiva production secrets
// Includes RBAC, diagnostic settings, and security best practices
//
// Deploy with:
//   az deployment group create --resource-group broxiva-production-rg \
//     --template-file broxiva-keyvault.bicep \
//     --parameters environment=production location=eastus

// ============================================================================
// PARAMETERS
// ============================================================================

@description('Environment name (production, staging, development)')
@allowed([
  'production'
  'staging'
  'development'
])
param environment string = 'production'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Project name (used in naming)')
param projectName string = 'broxiva'

@description('Tenant ID for Azure AD')
param tenantId string = subscription().tenantId

@description('Enable network restrictions (true for production)')
param enableNetworkRestrictions bool = true

@description('Allowed IP addresses for Key Vault access (if network restrictions enabled)')
param allowedIpAddresses array = []

@description('Allowed subnet IDs for Key Vault access')
param allowedSubnetIds array = []

@description('Enable purge protection (true for production)')
param enablePurgeProtection bool = true

@description('Soft delete retention days (90 for production, 7 for dev)')
@minValue(7)
@maxValue(90)
param softDeleteRetentionDays int = 90

@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  Project: projectName
  ManagedBy: 'Bicep'
  Purpose: 'Production Secrets'
}

@description('Enable diagnostic logging')
param enableDiagnostics bool = true

@description('Log Analytics Workspace ID for diagnostics')
param logAnalyticsWorkspaceId string = ''

@description('AKS cluster managed identity principal ID (for workload identity)')
param aksIdentityPrincipalId string = ''

// ============================================================================
// VARIABLES
// ============================================================================

var keyVaultName = '${projectName}-${environment}-kv'
var logAnalyticsName = '${projectName}-${environment}-kv-logs'

// Network ACL configuration
var networkAcls = enableNetworkRestrictions ? {
  defaultAction: 'Deny'
  bypass: 'AzureServices'
  ipRules: [for ip in allowedIpAddresses: {
    value: ip
  }]
  virtualNetworkRules: [for subnetId in allowedSubnetIds: {
    id: subnetId
    ignoreMissingVnetServiceEndpoint: false
  }]
} : {
  defaultAction: 'Allow'
  bypass: 'AzureServices'
  ipRules: []
  virtualNetworkRules: []
}

// ============================================================================
// LOG ANALYTICS WORKSPACE (if diagnostics enabled and workspace not provided)
// ============================================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = if (enableDiagnostics && empty(logAnalyticsWorkspaceId)) {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: environment == 'production' ? 365 : 90
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// ============================================================================
// AZURE KEY VAULT
// ============================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }

    // Access control - using RBAC instead of access policies
    enableRbacAuthorization: true

    // Security features
    enableSoftDelete: true
    softDeleteRetentionInDays: softDeleteRetentionDays
    enablePurgeProtection: enablePurgeProtection

    // Network security
    networkAcls: networkAcls
    publicNetworkAccess: enableNetworkRestrictions ? 'Disabled' : 'Enabled'

    // Additional security settings
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
  }
}

// ============================================================================
// DIAGNOSTIC SETTINGS
// ============================================================================

resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (enableDiagnostics) {
  name: 'kv-diagnostics'
  scope: keyVault
  properties: {
    workspaceId: enableDiagnostics ? (empty(logAnalyticsWorkspaceId) ? logAnalytics.id : logAnalyticsWorkspaceId) : ''
    logs: [
      {
        category: 'AuditEvent'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: environment == 'production' ? 365 : 90
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

// ============================================================================
// RBAC ASSIGNMENTS
// ============================================================================

// Grant current deployment principal Key Vault Secrets Officer role
// This allows the deployment pipeline to create and update secrets
resource deploymentSecretOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, 'deployment', 'Key Vault Secrets Officer')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7') // Key Vault Secrets Officer
    principalId: subscription().tenantId // Replace with actual deployment principal ID
    principalType: 'ServicePrincipal'
  }
}

// Grant AKS managed identity Key Vault Secrets User role (read-only)
// This allows pods with workload identity to read secrets
resource aksSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(aksIdentityPrincipalId)) {
  name: guid(keyVault.id, aksIdentityPrincipalId, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: aksIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================================================
// PLACEHOLDER SECRETS (managed by External Secrets Operator)
// These will be populated by the deployment pipeline or manually
// ============================================================================

// Authentication Secrets
resource jwtAccessSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'jwt-access-secret'
  tags: {
    Type: 'auth'
    RotationSchedule: '90-days'
    Critical: 'true'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

resource jwtRefreshSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'jwt-refresh-secret'
  tags: {
    Type: 'auth'
    RotationSchedule: '90-days'
    Critical: 'true'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

resource sessionSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'session-secret'
  tags: {
    Type: 'auth'
    RotationSchedule: '90-days'
    Critical: 'true'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// Encryption Keys (CRITICAL - NEVER rotate without data migration)
resource encryptionKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'encryption-key'
  tags: {
    Type: 'encryption'
    RotationSchedule: 'NEVER'
    Critical: 'true'
    Warning: 'DO NOT ROTATE - Data loss will occur'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

resource kycEncryptionKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'kyc-encryption-key'
  tags: {
    Type: 'encryption'
    RotationSchedule: 'NEVER'
    Critical: 'true'
    Warning: 'DO NOT ROTATE - Data loss will occur'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// Database Secrets
resource postgresPassword 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'postgres-password'
  tags: {
    Type: 'database'
    RotationSchedule: '90-days'
    Critical: 'true'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

resource postgresUrl 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'postgres-url'
  tags: {
    Type: 'database'
    RotationSchedule: '90-days'
    Critical: 'true'
  }
  properties: {
    value: 'postgresql://broxiva:REPLACE_PASSWORD@postgres.broxiva-production.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// Cache Secrets
resource redisPassword 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'redis-password'
  tags: {
    Type: 'cache'
    RotationSchedule: '90-days'
    Critical: 'medium'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

resource redisUrl 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'redis-url'
  tags: {
    Type: 'cache'
    RotationSchedule: '90-days'
    Critical: 'medium'
  }
  properties: {
    value: 'redis://:REPLACE_PASSWORD@redis.broxiva-production.svc.cluster.local:6379'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// Payment Provider Secrets (to be set manually)
resource stripeSecretKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'stripe-secret-key'
  tags: {
    Type: 'payment'
    RotationSchedule: 'as-needed'
    Critical: 'true'
    SetManually: 'true'
  }
  properties: {
    value: 'sk_live_REPLACE_WITH_LIVE_KEY_FROM_STRIPE_DASHBOARD'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

resource stripeWebhookSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'stripe-webhook-secret'
  tags: {
    Type: 'payment'
    RotationSchedule: 'as-needed'
    Critical: 'true'
    SetManually: 'true'
  }
  properties: {
    value: 'whsec_REPLACE_WITH_WEBHOOK_SECRET_FROM_STRIPE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// Email Service Secret
resource sendgridApiKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'sendgrid-api-key'
  tags: {
    Type: 'email'
    RotationSchedule: 'as-needed'
    Critical: 'high'
    SetManually: 'true'
  }
  properties: {
    value: 'SG.REPLACE_WITH_SENDGRID_API_KEY'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// AI Service Secrets
resource openaiApiKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'openai-api-key'
  tags: {
    Type: 'ai'
    RotationSchedule: 'as-needed'
    Critical: 'low'
    SetManually: 'true'
  }
  properties: {
    value: 'sk-proj-REPLACE_WITH_OPENAI_API_KEY'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// Internal API Keys
resource internalApiKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'internal-api-key'
  tags: {
    Type: 'internal'
    RotationSchedule: '90-days'
    Critical: 'true'
  }
  properties: {
    value: 'REPLACE_WITH_GENERATED_VALUE'
    attributes: {
      enabled: true
    }
    contentType: 'text/plain'
  }
}

// ============================================================================
// OUTPUTS
// ============================================================================

@description('Key Vault resource ID')
output keyVaultId string = keyVault.id

@description('Key Vault name')
output keyVaultName string = keyVault.name

@description('Key Vault URI')
output keyVaultUri string = keyVault.properties.vaultUri

@description('Log Analytics Workspace ID')
output logAnalyticsWorkspaceId string = enableDiagnostics ? (empty(logAnalyticsWorkspaceId) ? logAnalytics.id : logAnalyticsWorkspaceId) : ''

@description('Key Vault resource location')
output location string = location

@description('Resource group name')
output resourceGroupName string = resourceGroup().name
