# Broxiva Production Specialized Key Vaults
# Function-based separation for enhanced security and compliance
# Created: 2025-12-13
# Purpose: Separate authentication, data, and payment secrets for PCI-DSS compliance

# =============================================================================
# PRODUCTION AUTHENTICATION KEY VAULT
# =============================================================================

resource "azurerm_key_vault" "prod_auth" {
  name                       = "broxiva-prod-auth-kv"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.keyvaults.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium" # Premium for HSM-backed keys
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  enable_rbac_authorization  = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"

    # Allow access from AKS subnet (update with actual subnet)
    # virtual_network_subnet_ids = [var.aks_subnet_id]
  }

  tags = {
    Environment = "production"
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "Authentication & Authorization Secrets"
    Compliance  = "SOC2,ISO27001"
    Criticality = "HIGH"
  }
}

# RBAC: Terraform admin access
resource "azurerm_role_assignment" "terraform_auth_kv" {
  scope                = azurerm_key_vault.prod_auth.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# RBAC: API pods read-only access (requires managed identity)
resource "azurerm_role_assignment" "api_auth_kv_reader" {
  count                = var.api_managed_identity_id != "" ? 1 : 0
  scope                = azurerm_key_vault.prod_auth.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.api_managed_identity_id
}

# Diagnostic settings for auth vault
resource "azurerm_monitor_diagnostic_setting" "auth_kv" {
  name                       = "auth-kv-diagnostics"
  target_resource_id         = azurerm_key_vault.prod_auth.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.keyvaults.id

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

# =============================================================================
# AUTHENTICATION SECRETS
# =============================================================================

# JWT Access Token Secret
resource "random_password" "jwt_access" {
  length           = 64
  special          = true
  override_special = "!@#$%^&*()-_=+[]{}<>:?"
}

resource "azurerm_key_vault_secret" "jwt_access_secret" {
  name         = "jwt-access-secret"
  value        = random_password.jwt_access.result
  key_vault_id = azurerm_key_vault.prod_auth.id
  depends_on   = [azurerm_role_assignment.terraform_auth_kv]

  tags = {
    Type        = "authentication"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "2160h") # 90 days
    Usage       = "JWT access token signing"
  }
}

# JWT Refresh Token Secret
resource "random_password" "jwt_refresh" {
  length           = 64
  special          = true
  override_special = "!@#$%^&*()-_=+[]{}<>:?"
}

resource "azurerm_key_vault_secret" "jwt_refresh_secret" {
  name         = "jwt-refresh-secret"
  value        = random_password.jwt_refresh.result
  key_vault_id = azurerm_key_vault.prod_auth.id
  depends_on   = [azurerm_role_assignment.terraform_auth_kv]

  tags = {
    Type        = "authentication"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "2160h") # 90 days
    Usage       = "JWT refresh token signing"
  }
}

# Session Secret
resource "random_password" "session_secret" {
  length  = 64
  special = true
}

resource "azurerm_key_vault_secret" "session_secret" {
  name         = "session-secret"
  value        = random_password.session_secret.result
  key_vault_id = azurerm_key_vault.prod_auth.id
  depends_on   = [azurerm_role_assignment.terraform_auth_kv]

  tags = {
    Type        = "authentication"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "2160h")
    Usage       = "Session encryption"
  }
}

# OAuth Google Client Secret (placeholder)
resource "azurerm_key_vault_secret" "oauth_google_secret" {
  name         = "oauth-google-client-secret"
  value        = "GOCSPX-REPLACE_WITH_ACTUAL_SECRET"
  key_vault_id = azurerm_key_vault.prod_auth.id
  depends_on   = [azurerm_role_assignment.terraform_auth_kv]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "oauth"
    Provider    = "google"
    SetManually = "true"
  }
}

# OAuth Facebook App Secret (placeholder)
resource "azurerm_key_vault_secret" "oauth_facebook_secret" {
  name         = "oauth-facebook-app-secret"
  value        = "REPLACE_WITH_ACTUAL_SECRET"
  key_vault_id = azurerm_key_vault.prod_auth.id
  depends_on   = [azurerm_role_assignment.terraform_auth_kv]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "oauth"
    Provider    = "facebook"
    SetManually = "true"
  }
}

# OAuth Apple Client Secret (placeholder)
resource "azurerm_key_vault_secret" "oauth_apple_secret" {
  name         = "oauth-apple-client-secret"
  value        = "REPLACE_WITH_ACTUAL_SECRET"
  key_vault_id = azurerm_key_vault.prod_auth.id
  depends_on   = [azurerm_role_assignment.terraform_auth_kv]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "oauth"
    Provider    = "apple"
    SetManually = "true"
  }
}

# =============================================================================
# PRODUCTION DATA KEY VAULT
# =============================================================================

resource "azurerm_key_vault" "prod_data" {
  name                       = "broxiva-prod-data-kv"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.keyvaults.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium" # Premium for encryption keys
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  enable_rbac_authorization  = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"

    # Allow access from AKS subnet (update with actual subnet)
    # virtual_network_subnet_ids = [var.aks_subnet_id]
  }

  tags = {
    Environment = "production"
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "Data Layer Secrets & Encryption Keys"
    Compliance  = "GDPR,SOC2,ISO27001"
    Criticality = "CRITICAL"
  }
}

# RBAC: Terraform admin access
resource "azurerm_role_assignment" "terraform_data_kv" {
  scope                = azurerm_key_vault.prod_data.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# RBAC: API pods read-only access
resource "azurerm_role_assignment" "api_data_kv_reader" {
  count                = var.api_managed_identity_id != "" ? 1 : 0
  scope                = azurerm_key_vault.prod_data.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.api_managed_identity_id
}

# RBAC: Worker pods read-only access
resource "azurerm_role_assignment" "worker_data_kv_reader" {
  count                = var.worker_managed_identity_id != "" ? 1 : 0
  scope                = azurerm_key_vault.prod_data.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.worker_managed_identity_id
}

# Diagnostic settings for data vault
resource "azurerm_monitor_diagnostic_setting" "data_kv" {
  name                       = "data-kv-diagnostics"
  target_resource_id         = azurerm_key_vault.prod_data.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.keyvaults.id

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

# =============================================================================
# DATA LAYER SECRETS
# =============================================================================

# PostgreSQL Password
resource "random_password" "postgres_password" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-password"
  value        = random_password.postgres_password.result
  key_vault_id = azurerm_key_vault.prod_data.id
  depends_on   = [azurerm_role_assignment.terraform_data_kv]

  tags = {
    Type        = "database"
    Service     = "postgresql"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "2160h") # 90 days
  }
}

# PostgreSQL Connection URL
resource "azurerm_key_vault_secret" "postgres_url" {
  name         = "postgres-url"
  value        = "postgresql://broxiva_admin:${random_password.postgres_password.result}@postgres.production.broxiva.internal:5432/broxiva"
  key_vault_id = azurerm_key_vault.prod_data.id
  depends_on   = [azurerm_role_assignment.terraform_data_kv]

  tags = {
    Type    = "database"
    Service = "postgresql"
  }
}

# Redis Password
resource "random_password" "redis_password" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
}

resource "azurerm_key_vault_secret" "redis_password" {
  name         = "redis-password"
  value        = random_password.redis_password.result
  key_vault_id = azurerm_key_vault.prod_data.id
  depends_on   = [azurerm_role_assignment.terraform_data_kv]

  tags = {
    Type        = "cache"
    Service     = "redis"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "2160h")
  }
}

# Redis Connection URL
resource "azurerm_key_vault_secret" "redis_url" {
  name         = "redis-url"
  value        = "redis://:${random_password.redis_password.result}@redis.production.broxiva.internal:6379"
  key_vault_id = azurerm_key_vault.prod_data.id
  depends_on   = [azurerm_role_assignment.terraform_data_kv]

  tags = {
    Type    = "cache"
    Service = "redis"
  }
}

# KYC Encryption Key (CRITICAL - DO NOT ROTATE)
resource "random_password" "kyc_encryption_key" {
  length  = 64
  special = false # Hex only for encryption key
}

resource "azurerm_key_vault_secret" "kyc_encryption_key" {
  name         = "kyc-encryption-key"
  value        = random_password.kyc_encryption_key.result
  key_vault_id = azurerm_key_vault.prod_data.id
  depends_on   = [azurerm_role_assignment.terraform_data_kv]

  lifecycle {
    prevent_destroy = true # CRITICAL: Data loss if rotated
  }

  tags = {
    Type         = "encryption"
    Usage        = "KYC data encryption"
    Rotation     = "NEVER"
    Criticality  = "CRITICAL"
    DataLossSisk = "HIGH if deleted or rotated"
    Warning      = "DO NOT ROTATE - Existing encrypted data cannot be decrypted"
  }
}

# Data Encryption Master Key
resource "random_password" "data_encryption_key" {
  length  = 64
  special = false
}

resource "azurerm_key_vault_secret" "data_encryption_key" {
  name         = "data-encryption-master-key"
  value        = random_password.data_encryption_key.result
  key_vault_id = azurerm_key_vault.prod_data.id
  depends_on   = [azurerm_role_assignment.terraform_data_kv]

  lifecycle {
    prevent_destroy = true # CRITICAL: Data loss if rotated
  }

  tags = {
    Type        = "encryption"
    Usage       = "PII data encryption"
    Rotation    = "key-versioning-only"
    Criticality = "CRITICAL"
  }
}

# Elasticsearch Password (if using)
resource "random_password" "elasticsearch_password" {
  length  = 32
  special = true
}

resource "azurerm_key_vault_secret" "elasticsearch_password" {
  name         = "elasticsearch-password"
  value        = random_password.elasticsearch_password.result
  key_vault_id = azurerm_key_vault.prod_data.id
  depends_on   = [azurerm_role_assignment.terraform_data_kv]

  tags = {
    Type        = "search"
    Service     = "elasticsearch"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "2160h")
  }
}

# =============================================================================
# PRODUCTION PAYMENT KEY VAULT
# =============================================================================

resource "azurerm_key_vault" "prod_payment" {
  name                       = "broxiva-prod-payment-kv"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.keyvaults.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium" # Premium required for PCI-DSS
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  enable_rbac_authorization  = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"

    # Restrict to payment service subnet only
    # virtual_network_subnet_ids = [var.payment_service_subnet_id]
  }

  tags = {
    Environment = "production"
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "Payment Processing Secrets"
    Compliance  = "PCI-DSS-Level-1,SOC2,ISO27001"
    Criticality = "CRITICAL"
    PCIScope    = "true"
  }
}

# RBAC: Terraform admin access
resource "azurerm_role_assignment" "terraform_payment_kv" {
  scope                = azurerm_key_vault.prod_payment.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# RBAC: Payment service pods read-only access (ONLY payment service)
resource "azurerm_role_assignment" "payment_service_kv_reader" {
  count                = var.payment_service_managed_identity_id != "" ? 1 : 0
  scope                = azurerm_key_vault.prod_payment.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.payment_service_managed_identity_id
}

# Diagnostic settings for payment vault (enhanced logging for PCI-DSS)
resource "azurerm_monitor_diagnostic_setting" "payment_kv" {
  name                       = "payment-kv-diagnostics"
  target_resource_id         = azurerm_key_vault.prod_payment.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.keyvaults.id

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

# =============================================================================
# PAYMENT SECRETS
# =============================================================================

# Stripe Secret Key (placeholder - set manually)
resource "azurerm_key_vault_secret" "stripe_secret_key" {
  name         = "stripe-secret-key"
  value        = "sk_live_REPLACE_WITH_ACTUAL_STRIPE_KEY"
  key_vault_id = azurerm_key_vault.prod_payment.id
  depends_on   = [azurerm_role_assignment.terraform_payment_kv]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "payment-gateway"
    Provider    = "stripe"
    SetManually = "true"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "1440h") # 60 days (PCI requirement)
    PCIScope    = "true"
  }
}

# Stripe Publishable Key (placeholder)
resource "azurerm_key_vault_secret" "stripe_publishable_key" {
  name         = "stripe-publishable-key"
  value        = "pk_live_REPLACE_WITH_ACTUAL_KEY"
  key_vault_id = azurerm_key_vault.prod_payment.id
  depends_on   = [azurerm_role_assignment.terraform_payment_kv]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "payment-gateway"
    Provider    = "stripe"
    SetManually = "true"
  }
}

# Stripe Webhook Secret (placeholder)
resource "azurerm_key_vault_secret" "stripe_webhook_secret" {
  name         = "stripe-webhook-secret"
  value        = "whsec_REPLACE_WITH_ACTUAL_SECRET"
  key_vault_id = azurerm_key_vault.prod_payment.id
  depends_on   = [azurerm_role_assignment.terraform_payment_kv]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "webhook"
    Provider    = "stripe"
    SetManually = "true"
    PCIScope    = "true"
  }
}

# PayPal Client Secret (placeholder)
resource "azurerm_key_vault_secret" "paypal_client_secret" {
  name         = "paypal-client-secret"
  value        = "REPLACE_WITH_ACTUAL_PAYPAL_SECRET"
  key_vault_id = azurerm_key_vault.prod_payment.id
  depends_on   = [azurerm_role_assignment.terraform_payment_kv]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Type        = "payment-gateway"
    Provider    = "paypal"
    SetManually = "true"
    Rotation    = "required"
    RotationDue = timeadd(timestamp(), "1440h") # 60 days
    PCIScope    = "true"
  }
}

# Payment Encryption Key (for tokenization)
resource "random_password" "payment_encryption_key" {
  length  = 64
  special = false
}

resource "azurerm_key_vault_secret" "payment_encryption_key" {
  name         = "payment-encryption-key"
  value        = random_password.payment_encryption_key.result
  key_vault_id = azurerm_key_vault.prod_payment.id
  depends_on   = [azurerm_role_assignment.terraform_payment_kv]

  lifecycle {
    prevent_destroy = true # CRITICAL for PCI compliance
  }

  tags = {
    Type        = "encryption"
    Usage       = "Payment card tokenization"
    Rotation    = "key-versioning-only"
    Criticality = "CRITICAL"
    PCIScope    = "true"
  }
}

# =============================================================================
# ADDITIONAL VARIABLES
# =============================================================================

variable "api_managed_identity_id" {
  description = "Managed Identity Object ID for API pods"
  type        = string
  default     = ""
}

variable "worker_managed_identity_id" {
  description = "Managed Identity Object ID for Worker pods"
  type        = string
  default     = ""
}

variable "payment_service_managed_identity_id" {
  description = "Managed Identity Object ID for Payment Service pods"
  type        = string
  default     = ""
}

variable "aks_subnet_id" {
  description = "AKS subnet ID for network ACL rules"
  type        = string
  default     = ""
}

variable "payment_service_subnet_id" {
  description = "Dedicated subnet ID for payment service (PCI compliance)"
  type        = string
  default     = ""
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "prod_auth_kv_uri" {
  description = "Production Authentication Key Vault URI"
  value       = azurerm_key_vault.prod_auth.vault_uri
}

output "prod_data_kv_uri" {
  description = "Production Data Key Vault URI"
  value       = azurerm_key_vault.prod_data.vault_uri
}

output "prod_payment_kv_uri" {
  description = "Production Payment Key Vault URI"
  value       = azurerm_key_vault.prod_payment.vault_uri
}

output "prod_auth_kv_id" {
  description = "Production Authentication Key Vault ID"
  value       = azurerm_key_vault.prod_auth.id
}

output "prod_data_kv_id" {
  description = "Production Data Key Vault ID"
  value       = azurerm_key_vault.prod_data.id
}

output "prod_payment_kv_id" {
  description = "Production Payment Key Vault ID"
  value       = azurerm_key_vault.prod_payment.id
}

output "key_vault_summary" {
  description = "Summary of all production key vaults"
  value = {
    authentication = {
      name = azurerm_key_vault.prod_auth.name
      uri  = azurerm_key_vault.prod_auth.vault_uri
    }
    data = {
      name = azurerm_key_vault.prod_data.name
      uri  = azurerm_key_vault.prod_data.vault_uri
    }
    payment = {
      name = azurerm_key_vault.prod_payment.name
      uri  = azurerm_key_vault.prod_payment.vault_uri
    }
  }
}
