# Security Module - Key Vault, WAF, DDoS Protection, Security Center
# Comprehensive security infrastructure for Azure

terraform {
  required_version = ">= 1.0"

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

# ============================================
# Azure Key Vault
# ============================================
resource "azurerm_key_vault" "main" {
  name                = "${var.project_name}-${var.environment}-kv"
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = var.tenant_id
  sku_name            = "standard"

  # Security settings
  enabled_for_deployment          = true
  enabled_for_disk_encryption     = true
  enabled_for_template_deployment = true
  enable_rbac_authorization       = true
  purge_protection_enabled        = var.environment == "prod"
  soft_delete_retention_days      = var.environment == "prod" ? 90 : 7

  # Network rules
  network_acls {
    bypass                     = "AzureServices"
    default_action             = var.environment == "prod" ? "Deny" : "Allow"
    ip_rules                   = var.allowed_ip_ranges
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  tags = var.tags
}

# Key Vault access for AKS
resource "azurerm_role_assignment" "aks_keyvault_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.aks_identity_principal_id
}

# Key Vault access for App Service
resource "azurerm_role_assignment" "app_service_keyvault" {
  count = var.app_service_principal_id != "" ? 1 : 0

  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.app_service_principal_id
}

# ============================================
# Key Vault Secrets
# ============================================
resource "azurerm_key_vault_secret" "database_connection" {
  name         = "database-connection-string"
  value        = var.database_connection_string
  key_vault_id = azurerm_key_vault.main.id

  content_type = "text/plain"

  tags = var.tags

  depends_on = [azurerm_role_assignment.aks_keyvault_secrets]
}

resource "azurerm_key_vault_secret" "redis_connection" {
  name         = "redis-connection-string"
  value        = var.redis_connection_string
  key_vault_id = azurerm_key_vault.main.id

  content_type = "text/plain"

  tags = var.tags

  depends_on = [azurerm_role_assignment.aks_keyvault_secrets]
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.main.id

  content_type = "text/plain"

  tags = var.tags

  depends_on = [azurerm_role_assignment.aks_keyvault_secrets]
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# ============================================
# Azure Front Door with WAF
# ============================================
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.project_name}-${var.environment}-fd"
  resource_group_name = var.resource_group_name
  sku_name            = var.environment == "prod" ? "Premium_AzureFrontDoor" : "Standard_AzureFrontDoor"

  tags = var.tags
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.project_name}-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  enabled                  = true

  tags = var.tags
}

# WAF Policy
resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                = replace("${var.project_name}${var.environment}waf", "-", "")
  resource_group_name = var.resource_group_name
  sku_name            = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled             = true
  mode                = var.environment == "prod" ? "Prevention" : "Detection"

  # OWASP managed rules
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"

    exclusion {
      match_variable = "RequestCookieNames"
      operator       = "Equals"
      selector       = "session"
    }
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  # Custom rules
  custom_rule {
    name                           = "RateLimitRule"
    enabled                        = true
    priority                       = 1
    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 100
    type                           = "RateLimitRule"
    action                         = "Block"

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = true
      match_values       = var.allowed_ip_ranges
    }
  }

  custom_rule {
    name     = "BlockMaliciousIPs"
    enabled  = true
    priority = 2
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable = "RemoteAddr"
      operator       = "IPMatch"
      match_values   = var.blocked_ip_ranges
    }
  }

  # Geo filtering (block certain countries if needed)
  custom_rule {
    name     = "GeoFilter"
    enabled  = var.enable_geo_filtering
    priority = 3
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable = "RemoteAddr"
      operator       = "GeoMatch"
      match_values   = var.blocked_countries
    }
  }

  tags = var.tags
}

# Security policy association
resource "azurerm_cdn_frontdoor_security_policy" "main" {
  name                     = "${var.project_name}-${var.environment}-security"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.main.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}

# ============================================
# DDoS Protection Plan
# ============================================
resource "azurerm_network_ddos_protection_plan" "main" {
  count = var.enable_ddos_protection && var.environment == "prod" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-ddos"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# ============================================
# Azure Security Center / Defender for Cloud
# ============================================
resource "azurerm_security_center_subscription_pricing" "defender_servers" {
  count = var.enable_defender ? 1 : 0

  tier          = "Standard"
  resource_type = "VirtualMachines"
}

resource "azurerm_security_center_subscription_pricing" "defender_containers" {
  count = var.enable_defender ? 1 : 0

  tier          = "Standard"
  resource_type = "Containers"
}

resource "azurerm_security_center_subscription_pricing" "defender_keyvault" {
  count = var.enable_defender ? 1 : 0

  tier          = "Standard"
  resource_type = "KeyVaults"
}

resource "azurerm_security_center_subscription_pricing" "defender_storage" {
  count = var.enable_defender ? 1 : 0

  tier          = "Standard"
  resource_type = "StorageAccounts"
}

resource "azurerm_security_center_subscription_pricing" "defender_sql" {
  count = var.enable_defender ? 1 : 0

  tier          = "Standard"
  resource_type = "SqlServers"
}

# ============================================
# Private Endpoints
# ============================================
resource "azurerm_private_endpoint" "keyvault" {
  count = var.enable_private_endpoints ? 1 : 0

  name                = "${var.project_name}-${var.environment}-kv-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.project_name}-${var.environment}-kv-psc"
    private_connection_resource_id = azurerm_key_vault.main.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "keyvault-dns"
    private_dns_zone_ids = [var.keyvault_private_dns_zone_id]
  }

  tags = var.tags
}

# ============================================
# Managed Identity for Applications
# ============================================
resource "azurerm_user_assigned_identity" "app" {
  name                = "${var.project_name}-${var.environment}-app-identity"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# Grant identity access to Key Vault
resource "azurerm_role_assignment" "app_identity_keyvault" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# ============================================
# Azure Policy Assignments (Governance)
# ============================================
resource "azurerm_subscription_policy_assignment" "require_https" {
  count = var.environment == "prod" ? 1 : 0

  name                 = "require-https-storage"
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae30-26a93ef643f9"
  subscription_id      = "/subscriptions/${var.subscription_id}"

  description  = "Require HTTPS for storage accounts"
  display_name = "Secure transfer to storage accounts should be enabled"
}

resource "azurerm_subscription_policy_assignment" "require_encryption" {
  count = var.environment == "prod" ? 1 : 0

  name                 = "require-sql-encryption"
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/a8bef009-a5c9-4d0f-90d7-6018734e8a16"
  subscription_id      = "/subscriptions/${var.subscription_id}"

  description  = "Require TDE on SQL databases"
  display_name = "Transparent Data Encryption on SQL databases should be enabled"
}
