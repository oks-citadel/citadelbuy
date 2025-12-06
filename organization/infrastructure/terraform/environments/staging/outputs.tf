# Staging Environment Outputs

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = module.compute.aks_name
}

output "aks_kube_config" {
  description = "AKS kubeconfig"
  value       = module.compute.aks_kube_config
  sensitive   = true
}

output "acr_login_server" {
  description = "ACR login server"
  value       = module.compute.acr_login_server
}

output "postgresql_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = module.database.postgresql_fqdn
}

output "postgresql_connection_string" {
  description = "PostgreSQL connection string"
  value       = module.database.postgresql_connection_string
  sensitive   = true
}

output "redis_hostname" {
  description = "Redis hostname"
  value       = module.database.redis_hostname
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = module.database.redis_connection_string
  sensitive   = true
}

output "storage_account_name" {
  description = "Storage account name"
  value       = module.storage.storage_account_name
}

output "storage_primary_blob_endpoint" {
  description = "Storage primary blob endpoint"
  value       = module.storage.storage_primary_blob_endpoint
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = module.monitoring.app_insights_connection_string
  sensitive   = true
}
