# CitadelBuy Azure Key Vault Configuration
# This Terraform configuration manages secrets for the CitadelBuy platform using Azure Key Vault

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "citadelbuy"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "citadelbuy-rg"
}

variable "enable_rbac" {
  description = "Enable RBAC authorization for Key Vault"
  type        = bool
  default     = true
}

variable "enable_soft_delete" {
  description = "Enable soft delete for Key Vault"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Number of days to retain soft-deleted secrets"
  type        = number
  default     = 7
}

# Data sources
data "azurerm_client_config" "current" {}

data "azuread_service_principal" "aks" {
  display_name = "${var.project_name}-${var.environment}-aks"
}

# Resource Group
resource "azurerm_resource_group" "keyvault" {
  name     = "${var.resource_group_name}-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                       = "${var.project_name}-${var.environment}-kv"
  location                   = azurerm_resource_group.keyvault.location
  resource_group_name        = azurerm_resource_group.keyvault.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = var.soft_delete_retention_days
  purge_protection_enabled   = var.environment == "production" ? true : false
  enable_rbac_authorization  = var.enable_rbac

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"

    # Allow access from specific IPs (add your IPs here)
    ip_rules = []

    # Allow access from specific virtual networks
    virtual_network_subnet_ids = []
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Access Policies (if not using RBAC)
resource "azurerm_key_vault_access_policy" "terraform" {
  count        = var.enable_rbac ? 0 : 1
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
  ]

  key_permissions = [
    "Get", "List", "Create", "Delete", "Update", "Recover", "Backup", "Restore", "Purge"
  ]

  certificate_permissions = [
    "Get", "List", "Create", "Delete", "Update", "Recover", "Backup", "Restore", "Purge"
  ]
}

resource "azurerm_key_vault_access_policy" "aks" {
  count        = var.enable_rbac ? 0 : 1
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azuread_service_principal.aks.object_id

  secret_permissions = [
    "Get", "List"
  ]
}

# RBAC Role Assignments (if using RBAC)
resource "azurerm_role_assignment" "terraform_secrets_officer" {
  count                = var.enable_rbac ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "aks_secrets_user" {
  count                = var.enable_rbac ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = data.azuread_service_principal.aks.object_id
}

# Random passwords for auto-generated secrets
resource "random_password" "postgres" {
  length  = 32
  special = true
}

resource "random_password" "redis" {
  length  = 32
  special = true
}

resource "random_password" "jwt_access" {
  length  = 64
  special = true
}

resource "random_password" "jwt_refresh" {
  length  = 64
  special = true
}

resource "random_password" "session" {
  length  = 64
  special = true
}

# Database Secrets
resource "azurerm_key_vault_secret" "postgres_url" {
  name         = "postgres-url"
  value        = "postgresql://citadelbuy_admin:${random_password.postgres.result}@postgres.${var.environment}.citadelbuy.internal:5432/citadelbuy"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "database"
  }
}

resource "azurerm_key_vault_secret" "postgres_username" {
  name         = "postgres-username"
  value        = "citadelbuy_admin"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "database"
  }
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-password"
  value        = random_password.postgres.result
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "database"
  }
}

resource "azurerm_key_vault_secret" "postgres_host" {
  name         = "postgres-host"
  value        = "postgres.${var.environment}.citadelbuy.internal"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "database"
  }
}

resource "azurerm_key_vault_secret" "postgres_port" {
  name         = "postgres-port"
  value        = "5432"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "database"
  }
}

resource "azurerm_key_vault_secret" "postgres_database" {
  name         = "postgres-database"
  value        = "citadelbuy"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "database"
  }
}

# Redis Secrets
resource "azurerm_key_vault_secret" "redis_url" {
  name         = "redis-url"
  value        = "redis://:${random_password.redis.result}@redis.${var.environment}.citadelbuy.internal:6379"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "cache"
  }
}

resource "azurerm_key_vault_secret" "redis_password" {
  name         = "redis-password"
  value        = random_password.redis.result
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "cache"
  }
}

resource "azurerm_key_vault_secret" "redis_host" {
  name         = "redis-host"
  value        = "redis.${var.environment}.citadelbuy.internal"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "cache"
  }
}

resource "azurerm_key_vault_secret" "redis_port" {
  name         = "redis-port"
  value        = "6379"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "cache"
  }
}

# JWT Secrets
resource "azurerm_key_vault_secret" "jwt_access_secret" {
  name         = "jwt-access-secret"
  value        = random_password.jwt_access.result
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "auth"
  }
}

resource "azurerm_key_vault_secret" "jwt_refresh_secret" {
  name         = "jwt-refresh-secret"
  value        = random_password.jwt_refresh.result
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "auth"
  }
}

resource "azurerm_key_vault_secret" "jwt_access_expiry" {
  name         = "jwt-access-expiry"
  value        = "15m"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "auth"
  }
}

resource "azurerm_key_vault_secret" "jwt_refresh_expiry" {
  name         = "jwt-refresh-expiry"
  value        = "7d"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "auth"
  }
}

# Stripe Secrets (placeholders - set actual values manually)
resource "azurerm_key_vault_secret" "stripe_secret_key" {
  name         = "stripe-secret-key"
  value        = "sk_${var.environment}_REPLACE_WITH_ACTUAL_KEY"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Environment = var.environment
    Type        = "payment"
  }
}

resource "azurerm_key_vault_secret" "stripe_publishable_key" {
  name         = "stripe-publishable-key"
  value        = "pk_${var.environment}_REPLACE_WITH_ACTUAL_KEY"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Environment = var.environment
    Type        = "payment"
  }
}

resource "azurerm_key_vault_secret" "stripe_webhook_secret" {
  name         = "stripe-webhook-secret"
  value        = "whsec_REPLACE_WITH_ACTUAL_SECRET"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Environment = var.environment
    Type        = "payment"
  }
}

# OpenAI Secret (placeholder)
resource "azurerm_key_vault_secret" "openai_api_key" {
  name         = "openai-api-key"
  value        = "sk-REPLACE_WITH_ACTUAL_KEY"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Environment = var.environment
    Type        = "ai"
  }
}

# Session Secret
resource "azurerm_key_vault_secret" "session_secret" {
  name         = "session-secret"
  value        = random_password.session.result
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.terraform,
    azurerm_role_assignment.terraform_secrets_officer
  ]

  tags = {
    Environment = var.environment
    Type        = "session"
  }
}

# Diagnostic Settings for audit logging
resource "azurerm_log_analytics_workspace" "keyvault" {
  name                = "${var.project_name}-${var.environment}-kv-logs"
  location            = azurerm_resource_group.keyvault.location
  resource_group_name = azurerm_resource_group.keyvault.name
  sku                 = "PerGB2018"
  retention_in_days   = 90

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "${var.project_name}-${var.environment}-kv-diagnostics"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.keyvault.id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_log {
    category = "AzurePolicyEvaluationDetails"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Azure Monitor Alert for unauthorized access attempts
resource "azurerm_monitor_metric_alert" "unauthorized_access" {
  name                = "${var.project_name}-${var.environment}-kv-unauthorized-access"
  resource_group_name = azurerm_resource_group.keyvault.name
  scopes              = [azurerm_key_vault.main.id]
  description         = "Alert when there are unauthorized access attempts to Key Vault"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.KeyVault/vaults"
    metric_name      = "ServiceApiResult"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 5

    dimension {
      name     = "ActivityName"
      operator = "Include"
      values   = ["SecretGet", "SecretList"]
    }

    dimension {
      name     = "StatusCode"
      operator = "Include"
      values   = ["403"]
    }
  }

  action {
    action_group_id = azurerm_monitor_action_group.keyvault_alerts.id
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Action Group for alerts
resource "azurerm_monitor_action_group" "keyvault_alerts" {
  name                = "${var.project_name}-${var.environment}-kv-alerts"
  resource_group_name = azurerm_resource_group.keyvault.name
  short_name          = "kv-alerts"

  email_receiver {
    name                    = "Security Team"
    email_address           = "security@citadelbuy.com"
    use_common_alert_schema = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Outputs
output "key_vault_id" {
  description = "Key Vault ID"
  value       = azurerm_key_vault.main.id
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.main.name
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.keyvault.id
}

output "resource_group_name" {
  description = "Resource Group name"
  value       = azurerm_resource_group.keyvault.name
}
