# ===================================================================
# RESOURCE GROUP OUTPUTS
# ===================================================================
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

# ===================================================================
# NETWORKING OUTPUTS
# ===================================================================
output "vnet_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.main.name
}

output "app_subnet_id" {
  description = "ID of the application subnet"
  value       = azurerm_subnet.app.id
}

output "data_subnet_id" {
  description = "ID of the data subnet"
  value       = azurerm_subnet.data.id
}

output "cache_subnet_id" {
  description = "ID of the cache subnet"
  value       = azurerm_subnet.cache.id
}

output "apim_subnet_id" {
  description = "ID of the API Management subnet"
  value       = azurerm_subnet.apim.id
}

# ===================================================================
# DATABASE OUTPUTS
# ===================================================================
output "postgresql_server_id" {
  description = "ID of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.id
}

output "postgresql_server_fqdn" {
  description = "FQDN of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgresql_server_name" {
  description = "Name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "database_names" {
  description = "List of created databases"
  value = [
    azurerm_postgresql_flexible_server_database.auth_db.name,
    azurerm_postgresql_flexible_server_database.user_db.name,
    azurerm_postgresql_flexible_server_database.product_db.name,
    azurerm_postgresql_flexible_server_database.order_db.name,
    azurerm_postgresql_flexible_server_database.payment_db.name,
    azurerm_postgresql_flexible_server_database.inventory_db.name,
    azurerm_postgresql_flexible_server_database.analytics_db.name
  ]
}

# ===================================================================
# REDIS CACHE OUTPUTS
# ===================================================================
output "redis_cache_id" {
  description = "ID of the Redis cache"
  value       = azurerm_redis_cache.main.id
}

output "redis_cache_hostname" {
  description = "Hostname of the Redis cache"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_cache_ssl_port" {
  description = "SSL port of the Redis cache"
  value       = azurerm_redis_cache.main.ssl_port
}

output "redis_cache_primary_key" {
  description = "Primary access key for Redis cache"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "redis_cache_connection_string" {
  description = "Primary connection string for Redis cache"
  value       = azurerm_redis_cache.main.primary_connection_string
  sensitive   = true
}

# ===================================================================
# STORAGE OUTPUTS
# ===================================================================
output "storage_account_id" {
  description = "ID of the storage account"
  value       = azurerm_storage_account.main.id
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "storage_account_primary_endpoint" {
  description = "Primary blob endpoint"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "storage_account_primary_connection_string" {
  description = "Primary connection string for storage account"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

output "storage_containers" {
  description = "List of created storage containers"
  value = [
    azurerm_storage_container.product_images.name,
    azurerm_storage_container.user_uploads.name,
    azurerm_storage_container.invoice_documents.name,
    azurerm_storage_container.analytics_exports.name,
    azurerm_storage_container.ml_models.name,
    azurerm_storage_container.backups.name
  ]
}

# ===================================================================
# CONTAINER REGISTRY OUTPUTS
# ===================================================================
output "container_registry_id" {
  description = "ID of the container registry"
  value       = azurerm_container_registry.main.id
}

output "container_registry_name" {
  description = "Name of the container registry"
  value       = azurerm_container_registry.main.name
}

output "container_registry_login_server" {
  description = "Login server URL for the container registry"
  value       = azurerm_container_registry.main.login_server
}

output "container_registry_admin_username" {
  description = "Admin username for the container registry"
  value       = azurerm_container_registry.main.admin_username
  sensitive   = true
}

output "container_registry_admin_password" {
  description = "Admin password for the container registry"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}

# ===================================================================
# EVENT HUB OUTPUTS
# ===================================================================
output "eventhub_namespace_id" {
  description = "ID of the Event Hub namespace"
  value       = azurerm_eventhub_namespace.main.id
}

output "eventhub_namespace_name" {
  description = "Name of the Event Hub namespace"
  value       = azurerm_eventhub_namespace.main.name
}

output "eventhub_namespace_connection_string" {
  description = "Primary connection string for Event Hub namespace"
  value       = azurerm_eventhub_namespace.main.default_primary_connection_string
  sensitive   = true
}

output "eventhub_names" {
  description = "List of created Event Hubs"
  value = [
    azurerm_eventhub.order_events.name,
    azurerm_eventhub.payment_events.name,
    azurerm_eventhub.inventory_events.name,
    azurerm_eventhub.analytics_events.name
  ]
}

# ===================================================================
# APPLICATION INSIGHTS OUTPUTS
# ===================================================================
output "application_insights_id" {
  description = "ID of Application Insights"
  value       = azurerm_application_insights.main.id
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Connection string for Application Insights"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "ID of Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

# ===================================================================
# KEY VAULT OUTPUTS
# ===================================================================
output "key_vault_id" {
  description = "ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

# ===================================================================
# APP SERVICE PLAN OUTPUTS
# ===================================================================
output "app_service_plan_id" {
  description = "ID of the App Service Plan"
  value       = azurerm_service_plan.main.id
}

output "app_service_plan_name" {
  description = "Name of the App Service Plan"
  value       = azurerm_service_plan.main.name
}

# ===================================================================
# MICROSERVICES OUTPUTS
# ===================================================================
output "api_gateway_id" {
  description = "ID of API Gateway App Service"
  value       = azurerm_linux_web_app.api_gateway.id
}

output "api_gateway_hostname" {
  description = "Default hostname of API Gateway"
  value       = azurerm_linux_web_app.api_gateway.default_hostname
}

output "auth_service_id" {
  description = "ID of Auth Service App Service"
  value       = azurerm_linux_web_app.auth_service.id
}

output "auth_service_hostname" {
  description = "Default hostname of Auth Service"
  value       = azurerm_linux_web_app.auth_service.default_hostname
}

output "user_service_id" {
  description = "ID of User Service App Service"
  value       = azurerm_linux_web_app.user_service.id
}

output "user_service_hostname" {
  description = "Default hostname of User Service"
  value       = azurerm_linux_web_app.user_service.default_hostname
}

output "product_service_id" {
  description = "ID of Product Service App Service"
  value       = azurerm_linux_web_app.product_service.id
}

output "product_service_hostname" {
  description = "Default hostname of Product Service"
  value       = azurerm_linux_web_app.product_service.default_hostname
}

output "order_service_id" {
  description = "ID of Order Service App Service"
  value       = azurerm_linux_web_app.order_service.id
}

output "order_service_hostname" {
  description = "Default hostname of Order Service"
  value       = azurerm_linux_web_app.order_service.default_hostname
}

output "payment_service_id" {
  description = "ID of Payment Service App Service"
  value       = azurerm_linux_web_app.payment_service.id
}

output "payment_service_hostname" {
  description = "Default hostname of Payment Service"
  value       = azurerm_linux_web_app.payment_service.default_hostname
}

output "inventory_service_id" {
  description = "ID of Inventory Service App Service"
  value       = azurerm_linux_web_app.inventory_service.id
}

output "inventory_service_hostname" {
  description = "Default hostname of Inventory Service"
  value       = azurerm_linux_web_app.inventory_service.default_hostname
}

output "shipping_service_id" {
  description = "ID of Shipping Service App Service"
  value       = azurerm_linux_web_app.shipping_service.id
}

output "shipping_service_hostname" {
  description = "Default hostname of Shipping Service"
  value       = azurerm_linux_web_app.shipping_service.default_hostname
}

output "notification_service_id" {
  description = "ID of Notification Service App Service"
  value       = azurerm_linux_web_app.notification_service.id
}

output "notification_service_hostname" {
  description = "Default hostname of Notification Service"
  value       = azurerm_linux_web_app.notification_service.default_hostname
}

output "search_service_id" {
  description = "ID of Search Service App Service"
  value       = azurerm_linux_web_app.search_service.id
}

output "search_service_hostname" {
  description = "Default hostname of Search Service"
  value       = azurerm_linux_web_app.search_service.default_hostname
}

output "analytics_service_id" {
  description = "ID of Analytics Service App Service"
  value       = azurerm_linux_web_app.analytics_service.id
}

output "analytics_service_hostname" {
  description = "Default hostname of Analytics Service"
  value       = azurerm_linux_web_app.analytics_service.default_hostname
}

output "ai_service_id" {
  description = "ID of AI Service App Service"
  value       = azurerm_linux_web_app.ai_service.id
}

output "ai_service_hostname" {
  description = "Default hostname of AI Service"
  value       = azurerm_linux_web_app.ai_service.default_hostname
}

output "vendor_service_id" {
  description = "ID of Vendor Service App Service"
  value       = azurerm_linux_web_app.vendor_service.id
}

output "vendor_service_hostname" {
  description = "Default hostname of Vendor Service"
  value       = azurerm_linux_web_app.vendor_service.default_hostname
}

# ===================================================================
# FRONT DOOR OUTPUTS
# ===================================================================
output "front_door_profile_id" {
  description = "ID of the Front Door profile"
  value       = azurerm_cdn_frontdoor_profile.main.id
}

output "front_door_endpoint_hostname" {
  description = "Hostname of the Front Door endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "front_door_endpoint_url" {
  description = "Full URL of the Front Door endpoint"
  value       = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
}

# ===================================================================
# SUMMARY OUTPUTS
# ===================================================================
output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    environment              = var.environment
    project_name            = var.project_name
    resource_group          = azurerm_resource_group.main.name
    location                = azurerm_resource_group.main.location
    front_door_url          = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
    api_gateway_url         = "https://${azurerm_linux_web_app.api_gateway.default_hostname}"
    postgres_server         = azurerm_postgresql_flexible_server.main.fqdn
    redis_hostname          = azurerm_redis_cache.main.hostname
    container_registry      = azurerm_container_registry.main.login_server
    eventhub_namespace      = azurerm_eventhub_namespace.main.name
    storage_account         = azurerm_storage_account.main.name
    key_vault_uri           = azurerm_key_vault.main.vault_uri
    application_insights_id = azurerm_application_insights.main.id
    microservices_deployed  = 13
  }
}
