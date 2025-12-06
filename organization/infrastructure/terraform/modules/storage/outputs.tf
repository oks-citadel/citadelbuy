# Storage Module Outputs

# Storage Account Outputs
output "storage_account_id" {
  description = "Storage account ID"
  value       = azurerm_storage_account.main.id
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}

output "storage_primary_access_key" {
  description = "Storage primary access key"
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true
}

output "storage_primary_connection_string" {
  description = "Storage primary connection string"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

output "storage_primary_blob_endpoint" {
  description = "Storage primary blob endpoint"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "storage_primary_blob_host" {
  description = "Storage primary blob host"
  value       = azurerm_storage_account.main.primary_blob_host
}

output "storage_identity_principal_id" {
  description = "Storage account managed identity principal ID"
  value       = azurerm_storage_account.main.identity[0].principal_id
}

# Container Outputs
output "media_container_name" {
  description = "Media container name"
  value       = azurerm_storage_container.media.name
}

output "uploads_container_name" {
  description = "Uploads container name"
  value       = azurerm_storage_container.uploads.name
}

output "backups_container_name" {
  description = "Backups container name"
  value       = azurerm_storage_container.backups.name
}

output "static_container_name" {
  description = "Static assets container name"
  value       = azurerm_storage_container.static.name
}

output "exports_container_name" {
  description = "Exports container name"
  value       = azurerm_storage_container.exports.name
}

# CDN Outputs
output "cdn_profile_id" {
  description = "CDN profile ID"
  value       = var.enable_cdn ? azurerm_cdn_frontdoor_profile.main[0].id : null
}

output "cdn_profile_uuid" {
  description = "CDN profile UUID"
  value       = var.enable_cdn ? azurerm_cdn_frontdoor_profile.main[0].resource_guid : null
}

output "cdn_endpoint_hostname" {
  description = "CDN endpoint hostname"
  value       = var.enable_cdn ? azurerm_cdn_frontdoor_endpoint.main[0].host_name : null
}

output "cdn_custom_domain_hostname" {
  description = "CDN custom domain hostname"
  value       = var.enable_cdn && var.custom_domain != "" ? var.custom_domain : null
}

# URLs
output "static_assets_url" {
  description = "Static assets URL"
  value       = var.enable_cdn ? "https://${azurerm_cdn_frontdoor_endpoint.main[0].host_name}" : "https://${azurerm_storage_account.main.primary_blob_host}/static"
}
