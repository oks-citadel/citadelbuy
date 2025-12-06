# Production Environment Outputs

# Resource Group
output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "Resource group ID"
  value       = azurerm_resource_group.main.id
}

# Networking
output "vnet_id" {
  description = "Virtual Network ID"
  value       = module.networking.vnet_id
}

output "aks_subnet_id" {
  description = "AKS subnet ID"
  value       = module.networking.aks_subnet_id
}

# Database
output "postgresql_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = module.database.postgresql_fqdn
}

output "redis_hostname" {
  description = "Redis cache hostname"
  value       = module.database.redis_hostname
}

# Compute
output "aks_name" {
  description = "AKS cluster name"
  value       = module.compute.aks_name
}

output "aks_fqdn" {
  description = "AKS cluster FQDN"
  value       = module.compute.aks_fqdn
}

output "acr_login_server" {
  description = "ACR login server"
  value       = module.compute.acr_login_server
}

output "app_service_hostname" {
  description = "App Service hostname"
  value       = module.compute.api_app_default_hostname
}

# Security
output "key_vault_uri" {
  description = "Key Vault URI"
  value       = module.security.key_vault_uri
}

output "front_door_endpoint" {
  description = "Front Door endpoint hostname"
  value       = module.security.front_door_endpoint_hostname
}

# Monitoring
output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.monitoring.app_insights_instrumentation_key
  sensitive   = true
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = module.monitoring.app_insights_connection_string
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = module.monitoring.log_analytics_workspace_id
}

# Storage
output "storage_account_name" {
  description = "Storage account name"
  value       = module.storage.storage_account_name
}

output "cdn_endpoint" {
  description = "CDN endpoint hostname"
  value       = module.storage.cdn_endpoint_hostname
}
