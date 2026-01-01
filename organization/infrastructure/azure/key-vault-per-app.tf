# Broxiva Azure Key Vault - Per-App-Per-Environment Configuration
# This creates isolated vaults for each application (api, web, mobile) per environment
# Following the principle of least privilege and separation of concerns

# Additional variables specific to key vault configuration
variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "broxiva-rg"
}

variable "apps" {
  description = "List of applications requiring separate vaults"
  type = map(object({
    enabled              = bool
    service_principal_id = string
    secret_types         = list(string)
  }))
  default = {
    api = {
      enabled              = true
      service_principal_id = ""
      secret_types         = ["database", "cache", "auth", "payment", "email", "storage", "ai", "kyc"]
    }
    web = {
      enabled              = true
      service_principal_id = ""
      secret_types         = ["api", "analytics", "social"]
    }
    mobile = {
      enabled              = true
      service_principal_id = ""
      secret_types         = ["api", "push", "iap"]
    }
    services = {
      enabled              = true
      service_principal_id = ""
      secret_types         = ["database", "cache", "messaging", "ai"]
    }
  }
}

# Resource Group for all Key Vaults
resource "azurerm_resource_group" "keyvaults" {
  name     = "${var.resource_group_name}-keyvaults-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "Key Vault Storage"
  }
}

# Shared Key Vault for cross-app secrets
# Name format: cb-{env}-shared-kv (max 24 chars: cb-dev-shared-kv = 17 chars)
resource "azurerm_key_vault" "shared" {
  name                       = "cb-${var.environment}-shared-kv"
  location                   = azurerm_resource_group.keyvaults.location
  resource_group_name        = azurerm_resource_group.keyvaults.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = var.environment == "production" ? 90 : 7
  purge_protection_enabled   = var.environment == "production"
  enable_rbac_authorization  = true

  network_acls {
    default_action = var.environment == "production" ? "Deny" : "Allow"
    bypass         = "AzureServices"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    AppScope    = "shared"
  }
}

# Per-App Key Vaults
# Name format: cb-{env}-{app}-kv (max 24 chars: cb-dev-services-kv = 19 chars)
resource "azurerm_key_vault" "app" {
  for_each = { for k, v in var.apps : k => v if v.enabled }

  name                       = "cb-${var.environment}-${each.key}-kv"
  location                   = azurerm_resource_group.keyvaults.location
  resource_group_name        = azurerm_resource_group.keyvaults.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = var.environment == "production" ? 90 : 7
  purge_protection_enabled   = var.environment == "production"
  enable_rbac_authorization  = true

  network_acls {
    default_action = var.environment == "production" ? "Deny" : "Allow"
    bypass         = "AzureServices"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    AppScope    = each.key
  }
}

# RBAC: Terraform has full access to all vaults
resource "azurerm_role_assignment" "terraform_shared" {
  scope                = azurerm_key_vault.shared.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "terraform_apps" {
  for_each = azurerm_key_vault.app

  scope                = each.value.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# RBAC: Each app only has access to its own vault (read-only)
resource "azurerm_role_assignment" "app_secrets_user" {
  for_each = { for k, v in var.apps : k => v if v.enabled && v.service_principal_id != "" }

  scope                = azurerm_key_vault.app[each.key].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = each.value.service_principal_id
}

# RBAC: Apps can read shared secrets
resource "azurerm_role_assignment" "app_shared_read" {
  for_each = { for k, v in var.apps : k => v if v.enabled && v.service_principal_id != "" }

  scope                = azurerm_key_vault.shared.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = each.value.service_principal_id
}

# ============================================================
# SHARED SECRETS (cross-app)
# ============================================================

# Database credentials (shared between api and services)
resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
}

resource "azurerm_key_vault_secret" "shared_postgres_url" {
  name         = "postgres-url"
  value        = "postgresql://broxiva_admin:${random_password.postgres.result}@postgres.${var.environment}.broxiva.internal:5432/broxiva"
  key_vault_id = azurerm_key_vault.shared.id
  depends_on   = [azurerm_role_assignment.terraform_shared]

  tags = {
    Type        = "database"
    SharedWith  = "api,services"
    RotationDue = timeadd(timestamp(), "2160h") # 90 days
  }
}

resource "azurerm_key_vault_secret" "shared_postgres_password" {
  name         = "postgres-password"
  value        = random_password.postgres.result
  key_vault_id = azurerm_key_vault.shared.id
  depends_on   = [azurerm_role_assignment.terraform_shared]

  tags = {
    Type        = "database"
    SharedWith  = "api,services"
    RotationDue = timeadd(timestamp(), "2160h")
  }
}

# Redis credentials (shared)
resource "random_password" "redis" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
}

resource "azurerm_key_vault_secret" "shared_redis_url" {
  name         = "redis-url"
  value        = "redis://:${random_password.redis.result}@redis.${var.environment}.broxiva.internal:6379"
  key_vault_id = azurerm_key_vault.shared.id
  depends_on   = [azurerm_role_assignment.terraform_shared]

  tags = {
    Type        = "cache"
    SharedWith  = "api,services"
    RotationDue = timeadd(timestamp(), "2160h")
  }
}

# ============================================================
# API-SPECIFIC SECRETS
# ============================================================

# JWT Secrets (API only)
resource "random_password" "jwt_access" {
  length           = 64
  special          = true
  override_special = "!@#$%^&*"
}

resource "random_password" "jwt_refresh" {
  length           = 64
  special          = true
  override_special = "!@#$%^&*"
}

resource "azurerm_key_vault_secret" "api_jwt_access_secret" {
  count        = var.apps.api.enabled ? 1 : 0
  name         = "jwt-access-secret"
  value        = random_password.jwt_access.result
  key_vault_id = azurerm_key_vault.app["api"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  tags = {
    Type        = "auth"
    RotationDue = timeadd(timestamp(), "2160h")
  }
}

resource "azurerm_key_vault_secret" "api_jwt_refresh_secret" {
  count        = var.apps.api.enabled ? 1 : 0
  name         = "jwt-refresh-secret"
  value        = random_password.jwt_refresh.result
  key_vault_id = azurerm_key_vault.app["api"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  tags = {
    Type        = "auth"
    RotationDue = timeadd(timestamp(), "2160h")
  }
}

# KYC Encryption Key (API only - CRITICAL, never rotate)
resource "random_password" "kyc_encryption" {
  length  = 64
  special = false
}

resource "azurerm_key_vault_secret" "api_kyc_encryption_key" {
  count        = var.apps.api.enabled ? 1 : 0
  name         = "kyc-encryption-key"
  value        = random_password.kyc_encryption.result
  key_vault_id = azurerm_key_vault.app["api"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    prevent_destroy = true # CRITICAL: Data loss if rotated
  }

  tags = {
    Type     = "encryption"
    Critical = "true"
    Warning  = "DO NOT ROTATE - Data loss will occur"
  }
}

# Stripe Keys (API only - placeholders)
resource "azurerm_key_vault_secret" "api_stripe_secret_key" {
  count        = var.apps.api.enabled ? 1 : 0
  name         = "stripe-secret-key"
  value        = var.environment == "production" ? "sk_live_REPLACE_ME" : "sk_test_REPLACE_ME"
  key_vault_id = azurerm_key_vault.app["api"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "payment"
    SetManually = "true"
  }
}

resource "azurerm_key_vault_secret" "api_stripe_webhook_secret" {
  count        = var.apps.api.enabled ? 1 : 0
  name         = "stripe-webhook-secret"
  value        = "whsec_REPLACE_ME"
  key_vault_id = azurerm_key_vault.app["api"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "payment"
    SetManually = "true"
  }
}

# Email Service (API only)
resource "azurerm_key_vault_secret" "api_sendgrid_api_key" {
  count        = var.apps.api.enabled ? 1 : 0
  name         = "sendgrid-api-key"
  value        = "SG.REPLACE_ME"
  key_vault_id = azurerm_key_vault.app["api"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "email"
    SetManually = "true"
  }
}

# OpenAI (API only)
resource "azurerm_key_vault_secret" "api_openai_api_key" {
  count        = var.apps.api.enabled ? 1 : 0
  name         = "openai-api-key"
  value        = "sk-proj-REPLACE_ME"
  key_vault_id = azurerm_key_vault.app["api"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "ai"
    SetManually = "true"
  }
}

# ============================================================
# WEB-SPECIFIC SECRETS
# ============================================================

# Internal API Key for web -> api communication
resource "random_password" "web_api_key" {
  length  = 32
  special = false
}

resource "azurerm_key_vault_secret" "web_internal_api_key" {
  count        = var.apps.web.enabled ? 1 : 0
  name         = "internal-api-key"
  value        = random_password.web_api_key.result
  key_vault_id = azurerm_key_vault.app["web"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  tags = {
    Type        = "api"
    RotationDue = timeadd(timestamp(), "2160h")
  }
}

# Sentry DSN (Web specific)
resource "azurerm_key_vault_secret" "web_sentry_dsn" {
  count        = var.apps.web.enabled ? 1 : 0
  name         = "sentry-dsn"
  value        = "https://REPLACE_ME@sentry.io/REPLACE_ME"
  key_vault_id = azurerm_key_vault.app["web"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "monitoring"
    SetManually = "true"
  }
}

# ============================================================
# MOBILE-SPECIFIC SECRETS
# ============================================================

# Apple IAP (Mobile only)
resource "azurerm_key_vault_secret" "mobile_apple_shared_secret" {
  count        = var.apps.mobile.enabled ? 1 : 0
  name         = "apple-shared-secret"
  value        = "REPLACE_ME"
  key_vault_id = azurerm_key_vault.app["mobile"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "iap"
    SetManually = "true"
  }
}

# Google Play Service Account (Mobile only)
resource "azurerm_key_vault_secret" "mobile_google_play_key" {
  count        = var.apps.mobile.enabled ? 1 : 0
  name         = "google-play-service-account-key"
  value        = "{\"type\":\"service_account\",\"project_id\":\"REPLACE_ME\"}"
  key_vault_id = azurerm_key_vault.app["mobile"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "iap"
    SetManually = "true"
  }
}

# Firebase/Push Notification Config (Mobile only)
resource "azurerm_key_vault_secret" "mobile_firebase_config" {
  count        = var.apps.mobile.enabled ? 1 : 0
  name         = "firebase-service-account"
  value        = "{\"type\":\"service_account\",\"project_id\":\"REPLACE_ME\"}"
  key_vault_id = azurerm_key_vault.app["mobile"].id
  depends_on   = [azurerm_role_assignment.terraform_apps]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "push"
    SetManually = "true"
  }
}

# ============================================================
# DIAGNOSTIC SETTINGS & MONITORING
# ============================================================

resource "azurerm_log_analytics_workspace" "keyvaults" {
  name                = "${var.project_name}-${var.environment}-kv-logs"
  location            = azurerm_resource_group.keyvaults.location
  resource_group_name = azurerm_resource_group.keyvaults.name
  sku                 = "PerGB2018"
  retention_in_days   = var.environment == "production" ? 365 : 90

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Diagnostic settings for shared vault
resource "azurerm_monitor_diagnostic_setting" "shared" {
  name                       = "shared-kv-diagnostics"
  target_resource_id         = azurerm_key_vault.shared.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.keyvaults.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Diagnostic settings for per-app vaults
resource "azurerm_monitor_diagnostic_setting" "apps" {
  for_each = azurerm_key_vault.app

  name                       = "${each.key}-kv-diagnostics"
  target_resource_id         = each.value.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.keyvaults.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# ============================================================
# OUTPUTS
# ============================================================

output "shared_vault_uri" {
  description = "Shared Key Vault URI"
  value       = azurerm_key_vault.shared.vault_uri
}

output "shared_vault_id" {
  description = "Shared Key Vault ID"
  value       = azurerm_key_vault.shared.id
}

output "app_vault_uris" {
  description = "Per-App Key Vault URIs"
  value       = { for k, v in azurerm_key_vault.app : k => v.vault_uri }
}

output "app_vault_ids" {
  description = "Per-App Key Vault IDs"
  value       = { for k, v in azurerm_key_vault.app : k => v.id }
}

output "resource_group_name" {
  description = "Resource Group containing all Key Vaults"
  value       = azurerm_resource_group.keyvaults.name
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for all Key Vault logs"
  value       = azurerm_log_analytics_workspace.keyvaults.id
}
