# Outputs for Asia-Pacific Region Infrastructure

# Primary Region (Singapore) Outputs
output "primary_resource_group_name" {
  description = "Name of the primary resource group"
  value       = azurerm_resource_group.primary.name
}

output "primary_resource_group_id" {
  description = "ID of the primary resource group"
  value       = azurerm_resource_group.primary.id
}

output "primary_vnet_id" {
  description = "ID of the primary VNet"
  value       = module.networking_primary.vnet_id
}

output "primary_vnet_name" {
  description = "Name of the primary VNet"
  value       = module.networking_primary.vnet_name
}

output "primary_aks_id" {
  description = "ID of the primary AKS cluster"
  value       = module.compute_primary.aks_id
}

output "primary_aks_name" {
  description = "Name of the primary AKS cluster"
  value       = module.compute_primary.aks_name
}

output "primary_aks_fqdn" {
  description = "FQDN of the primary AKS cluster"
  value       = module.compute_primary.aks_fqdn
}

# Secondary Region (Sydney) Outputs
output "secondary_resource_group_name" {
  description = "Name of the secondary resource group"
  value       = azurerm_resource_group.secondary.name
}

output "secondary_vnet_id" {
  description = "ID of the secondary VNet"
  value       = module.networking_secondary.vnet_id
}

output "secondary_aks_id" {
  description = "ID of the secondary AKS cluster"
  value       = module.compute_secondary.aks_id
}

output "secondary_aks_name" {
  description = "Name of the secondary AKS cluster"
  value       = module.compute_secondary.aks_name
}

# Tertiary Region (Tokyo) Outputs
output "tertiary_resource_group_name" {
  description = "Name of the tertiary resource group"
  value       = azurerm_resource_group.tertiary.name
}

output "tertiary_vnet_id" {
  description = "ID of the tertiary VNet"
  value       = module.networking_tertiary.vnet_id
}

# Database Outputs
output "primary_database_server_id" {
  description = "ID of the primary PostgreSQL server"
  value       = module.database_primary.postgresql_server_id
}

output "primary_database_server_fqdn" {
  description = "FQDN of the primary PostgreSQL server"
  value       = module.database_primary.postgresql_server_fqdn
}

output "secondary_database_server_id" {
  description = "ID of the secondary PostgreSQL server"
  value       = module.database_secondary.postgresql_server_id
}

output "secondary_database_server_fqdn" {
  description = "FQDN of the secondary PostgreSQL server"
  value       = module.database_secondary.postgresql_server_fqdn
}

# Storage Outputs
output "primary_storage_account_id" {
  description = "ID of the primary storage account"
  value       = module.storage_primary.storage_account_id
}

output "primary_storage_account_name" {
  description = "Name of the primary storage account"
  value       = module.storage_primary.storage_account_name
}

# Security Outputs
output "primary_key_vault_id" {
  description = "ID of the primary Key Vault"
  value       = module.security_primary.key_vault_id
}

output "primary_key_vault_uri" {
  description = "URI of the primary Key Vault"
  value       = module.security_primary.key_vault_uri
}

# Monitoring Outputs
output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = module.monitoring_primary.log_analytics_workspace_id
}

output "application_insights_id" {
  description = "ID of the Application Insights instance"
  value       = azurerm_application_insights.apac.id
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.apac.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Connection string for Application Insights"
  value       = azurerm_application_insights.apac.connection_string
  sensitive   = true
}

# Traffic Manager Outputs
output "traffic_manager_fqdn" {
  description = "FQDN of the Traffic Manager profile"
  value       = azurerm_traffic_manager_profile.apac.fqdn
}

output "traffic_manager_profile_id" {
  description = "ID of the Traffic Manager profile"
  value       = azurerm_traffic_manager_profile.apac.id
}

# Cosmos DB Outputs
output "cosmosdb_id" {
  description = "ID of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.apac.id
}

output "cosmosdb_endpoint" {
  description = "Endpoint of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.apac.endpoint
}

output "cosmosdb_primary_key" {
  description = "Primary key for Cosmos DB"
  value       = azurerm_cosmosdb_account.apac.primary_key
  sensitive   = true
}

output "cosmosdb_connection_strings" {
  description = "Connection strings for Cosmos DB"
  value       = azurerm_cosmosdb_account.apac.connection_strings
  sensitive   = true
}

# Redis Cache Outputs
output "redis_id" {
  description = "ID of the Redis cache"
  value       = azurerm_redis_cache.apac.id
}

output "redis_hostname" {
  description = "Hostname of the Redis cache"
  value       = azurerm_redis_cache.apac.hostname
}

output "redis_primary_access_key" {
  description = "Primary access key for Redis"
  value       = azurerm_redis_cache.apac.primary_access_key
  sensitive   = true
}

output "redis_connection_string" {
  description = "Connection string for Redis"
  value       = "${azurerm_redis_cache.apac.hostname}:6380,password=${azurerm_redis_cache.apac.primary_access_key},ssl=True,abortConnect=False"
  sensitive   = true
}

# Regional endpoints for CDN configuration
output "api_endpoint_singapore" {
  description = "API endpoint for Singapore"
  value       = "api-ap-southeast.broxiva.com"
}

output "api_endpoint_sydney" {
  description = "API endpoint for Sydney"
  value       = "api-ap-sydney.broxiva.com"
}

output "api_endpoint_tokyo" {
  description = "API endpoint for Tokyo"
  value       = "api-ap-tokyo.broxiva.com"
}

output "region_code" {
  description = "Region code for APAC"
  value       = "APAC"
}

output "data_residency_locations" {
  description = "Data residency locations"
  value       = ["Singapore", "Sydney", "Tokyo"]
}

output "compliance_standards" {
  description = "Compliance standards for APAC region"
  value       = ["GDPR", "PDPA", "APPI", "Privacy Act"]
}
