# Security Module Outputs

# Key Vault Outputs
output "key_vault_id" {
  description = "Key Vault ID"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

# Front Door Outputs
output "front_door_id" {
  description = "Front Door profile ID"
  value       = azurerm_cdn_frontdoor_profile.main.id
}

output "front_door_endpoint_hostname" {
  description = "Front Door endpoint hostname"
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "front_door_profile_uuid" {
  description = "Front Door profile UUID (for X-Azure-FDID header)"
  value       = azurerm_cdn_frontdoor_profile.main.resource_guid
}

# WAF Outputs
output "waf_policy_id" {
  description = "WAF policy ID"
  value       = azurerm_cdn_frontdoor_firewall_policy.main.id
}

# DDoS Protection
output "ddos_protection_plan_id" {
  description = "DDoS Protection Plan ID"
  value       = var.enable_ddos_protection && var.environment == "prod" ? azurerm_network_ddos_protection_plan.main[0].id : null
}

# Managed Identity
output "app_identity_id" {
  description = "Application managed identity ID"
  value       = azurerm_user_assigned_identity.app.id
}

output "app_identity_principal_id" {
  description = "Application managed identity principal ID"
  value       = azurerm_user_assigned_identity.app.principal_id
}

output "app_identity_client_id" {
  description = "Application managed identity client ID"
  value       = azurerm_user_assigned_identity.app.client_id
}

# Secret References (for use in app config)
output "database_secret_uri" {
  description = "Database connection string secret URI"
  value       = azurerm_key_vault_secret.database_connection.id
}

output "redis_secret_uri" {
  description = "Redis connection string secret URI"
  value       = azurerm_key_vault_secret.redis_connection.id
}

output "jwt_secret_uri" {
  description = "JWT secret URI"
  value       = azurerm_key_vault_secret.jwt_secret.id
}
