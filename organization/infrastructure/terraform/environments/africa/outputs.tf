# Outputs for Africa Region Infrastructure

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

output "primary_database_server_id" {
  description = "ID of the primary PostgreSQL server"
  value       = module.database_primary.postgresql_server_id
}

output "primary_database_server_fqdn" {
  description = "FQDN of the primary PostgreSQL server"
  value       = module.database_primary.postgresql_server_fqdn
}

output "primary_storage_account_id" {
  description = "ID of the primary storage account"
  value       = module.storage_primary.storage_account_id
}

output "primary_storage_account_name" {
  description = "Name of the primary storage account"
  value       = module.storage_primary.storage_account_name
}

output "primary_key_vault_id" {
  description = "ID of the primary Key Vault"
  value       = module.security_primary.key_vault_id
}

output "primary_key_vault_uri" {
  description = "URI of the primary Key Vault"
  value       = module.security_primary.key_vault_uri
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = module.monitoring_primary.log_analytics_workspace_id
}

output "application_insights_id" {
  description = "ID of the Application Insights instance"
  value       = azurerm_application_insights.africa.id
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.africa.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Connection string for Application Insights"
  value       = azurerm_application_insights.africa.connection_string
  sensitive   = true
}

output "traffic_manager_fqdn" {
  description = "FQDN of the Traffic Manager profile"
  value       = azurerm_traffic_manager_profile.africa.fqdn
}

output "traffic_manager_profile_id" {
  description = "ID of the Traffic Manager profile"
  value       = azurerm_traffic_manager_profile.africa.id
}

output "secondary_resource_group_name" {
  description = "Name of the secondary resource group"
  value       = azurerm_resource_group.secondary.name
}

output "secondary_vnet_id" {
  description = "ID of the secondary VNet"
  value       = module.networking_secondary.vnet_id
}

# Regional endpoints for CDN configuration
output "api_endpoint" {
  description = "API endpoint for Africa region"
  value       = "api-af-south.broxiva.com"
}

output "region_code" {
  description = "Region code for Africa"
  value       = "AF-SA"
}

output "data_residency_location" {
  description = "Data residency location"
  value       = "South Africa North (Johannesburg)"
}

output "compliance_standards" {
  description = "Compliance standards for Africa region"
  value       = ["GDPR", "POPIA"]
}
