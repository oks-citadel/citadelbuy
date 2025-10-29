# ===================================================================
# GENERAL OUTPUTS
# ===================================================================
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.main.id
}

output "location" {
  description = "Azure region"
  value       = azurerm_resource_group.main.location
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# ===================================================================
# NETWORKING OUTPUTS
# ===================================================================
output "vnet_id" {
  description = "Virtual Network ID"
  value       = module.networking.vnet_id
}

output "vnet_name" {
  description = "Virtual Network name"
  value       = module.networking.vnet_name
}

output "app_subnet_id" {
  description = "Application subnet ID"
  value       = module.networking.app_subnet_id
}

output "data_subnet_id" {
  description = "Data subnet ID"
  value       = module.networking.data_subnet_id
}

output "apim_subnet_id" {
  description = "API Management subnet ID"
  value       = module.networking.apim_subnet_id
}

# ===================================================================
# SECURITY OUTPUTS
# ===================================================================
output "key_vault_id" {
  description = "Key Vault ID"
  value       = module.security.key_vault_id
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = module.security.key_vault_uri
}

output "key_vault_name" {
  description = "Key Vault name"
  value       = module.security.key_vault_name
}

# ===================================================================
# DATABASE OUTPUTS
# ===================================================================
output "postgres_server_id" {
  description = "PostgreSQL server ID"
  value       = module.database.server_id
}

output "postgres_server_name" {
  description = "PostgreSQL server name"
  value       = module.database.server_name
}

output "postgres_server_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = module.database.server_fqdn
  sensitive   = true
}

output "postgres_database_names" {
  description = "List of PostgreSQL database names"
  value       = module.database.database_names
}

# ===================================================================
# REDIS OUTPUTS
# ===================================================================
output "redis_id" {
  description = "Redis cache ID"
  value       = module.redis.id
}

output "redis_hostname" {
  description = "Redis hostname"
  value       = module.redis.hostname
  sensitive   = true
}

output "redis_ssl_port" {
  description = "Redis SSL port"
  value       = module.redis.ssl_port
}

output "redis_primary_access_key" {
  description = "Redis primary access key"
  value       = module.redis.primary_access_key
  sensitive   = true
}

# ===================================================================
# STORAGE OUTPUTS
# ===================================================================
output "storage_account_id" {
  description = "Storage account ID"
  value       = module.storage.account_id
}

output "storage_account_name" {
  description = "Storage account name"
  value       = module.storage.account_name
}

output "storage_primary_blob_endpoint" {
  description = "Storage primary blob endpoint"
  value       = module.storage.primary_blob_endpoint
}

output "storage_containers" {
  description = "List of storage containers"
  value       = module.storage.container_names
}

# ===================================================================
# CONTAINER REGISTRY OUTPUTS
# ===================================================================
output "acr_id" {
  description = "Container Registry ID"
  value       = module.container_registry.id
}

output "acr_name" {
  description = "Container Registry name"
  value       = module.container_registry.name
}

output "acr_login_server" {
  description = "Container Registry login server"
  value       = module.container_registry.login_server
}

output "acr_admin_username" {
  description = "Container Registry admin username"
  value       = module.container_registry.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "Container Registry admin password"
  value       = module.container_registry.admin_password
  sensitive   = true
}

# ===================================================================
# EVENT HUB OUTPUTS
# ===================================================================
output "eventhub_namespace_id" {
  description = "Event Hub namespace ID"
  value       = module.event_hub.namespace_id
}

output "eventhub_namespace_name" {
  description = "Event Hub namespace name"
  value       = module.event_hub.namespace_name
}

output "eventhub_names" {
  description = "List of Event Hub names"
  value       = module.event_hub.event_hub_names
}

# ===================================================================
# MONITORING OUTPUTS
# ===================================================================
output "appinsights_id" {
  description = "Application Insights ID"
  value       = module.monitoring.id
}

output "appinsights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.monitoring.instrumentation_key
  sensitive   = true
}

output "appinsights_connection_string" {
  description = "Application Insights connection string"
  value       = module.monitoring.connection_string
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = module.monitoring.log_analytics_workspace_id
}

# ===================================================================
# API MANAGEMENT OUTPUTS
# ===================================================================
output "apim_id" {
  description = "API Management ID"
  value       = module.api_management.id
}

output "apim_name" {
  description = "API Management name"
  value       = module.api_management.name
}

output "apim_gateway_url" {
  description = "API Management gateway URL"
  value       = module.api_management.gateway_url
}

output "apim_portal_url" {
  description = "API Management developer portal URL"
  value       = module.api_management.portal_url
}

# ===================================================================
# APP SERVICES OUTPUTS
# ===================================================================
output "app_service_plan_id" {
  description = "App Service Plan ID"
  value       = module.app_services.app_service_plan_id
}

output "app_service_ids" {
  description = "Map of App Service IDs"
  value       = module.app_services.app_service_ids
}

output "app_service_default_hostnames" {
  description = "Map of App Service default hostnames"
  value       = module.app_services.app_service_default_hostnames
  sensitive   = true
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = module.app_services.api_gateway_url
}

# ===================================================================
# FRONT DOOR (CDN) OUTPUTS
# ===================================================================
output "frontdoor_id" {
  description = "Front Door ID"
  value       = module.cdn.id
}

output "frontdoor_endpoint_hostname" {
  description = "Front Door endpoint hostname"
  value       = module.cdn.endpoint_hostname
}

output "frontdoor_endpoint_url" {
  description = "Front Door endpoint URL"
  value       = "https://${module.cdn.endpoint_hostname}"
}

# ===================================================================
# DEPLOYMENT INFORMATION
# ===================================================================
output "deployment_info" {
  description = "Deployment summary information"
  value = {
    environment             = var.environment
    region                  = var.location
    resource_group          = azurerm_resource_group.main.name
    api_gateway_url         = module.app_services.api_gateway_url
    cdn_url                 = "https://${module.cdn.endpoint_hostname}"
    apim_gateway_url        = module.api_management.gateway_url
    key_vault_name          = module.security.key_vault_name
    container_registry      = module.container_registry.login_server
    postgres_server         = module.database.server_name
    deployed_services_count = length(module.app_services.app_service_ids)
  }
}

# ===================================================================
# CONNECTION ENDPOINTS (for application configuration)
# ===================================================================
output "service_endpoints" {
  description = "Service endpoints for application configuration"
  value = {
    api_gateway      = "https://${module.app_services.api_gateway_default_hostname}"
    cdn_frontend     = "https://${module.cdn.endpoint_hostname}"
    apim_gateway     = module.api_management.gateway_url
    postgres_host    = module.database.server_fqdn
    redis_host       = module.redis.hostname
    storage_endpoint = module.storage.primary_blob_endpoint
    eventhub_ns      = "${module.event_hub.namespace_name}.servicebus.windows.net"
  }
  sensitive = true
}
