# Compute Module Outputs

# AKS Outputs
output "aks_id" {
  description = "AKS cluster ID"
  value       = azurerm_kubernetes_cluster.main.id
}

output "aks_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_fqdn" {
  description = "AKS cluster FQDN"
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "aks_kube_config" {
  description = "AKS kubeconfig (sensitive)"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "aks_kube_config_host" {
  description = "AKS API server host"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].host
  sensitive   = true
}

output "aks_identity_principal_id" {
  description = "AKS managed identity principal ID"
  value       = azurerm_kubernetes_cluster.main.identity[0].principal_id
}

output "aks_kubelet_identity_object_id" {
  description = "AKS kubelet identity object ID"
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

output "aks_node_resource_group" {
  description = "AKS node resource group name"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

# ACR Outputs
output "acr_id" {
  description = "Container Registry ID"
  value       = azurerm_container_registry.main.id
}

output "acr_name" {
  description = "Container Registry name"
  value       = azurerm_container_registry.main.name
}

output "acr_login_server" {
  description = "Container Registry login server"
  value       = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  description = "Container Registry admin username"
  value       = azurerm_container_registry.main.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "Container Registry admin password"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}

# App Service Outputs
output "app_service_id" {
  description = "App Service ID"
  value       = var.enable_app_service ? azurerm_linux_web_app.frontend[0].id : null
}

output "app_service_name" {
  description = "App Service name"
  value       = var.enable_app_service ? azurerm_linux_web_app.frontend[0].name : null
}

output "app_service_default_hostname" {
  description = "App Service default hostname"
  value       = var.enable_app_service ? azurerm_linux_web_app.frontend[0].default_hostname : null
}

output "app_service_principal_id" {
  description = "App Service managed identity principal ID"
  value       = var.enable_app_service ? azurerm_linux_web_app.frontend[0].identity[0].principal_id : null
}

output "app_service_staging_hostname" {
  description = "App Service staging slot hostname"
  value       = var.enable_app_service && var.environment == "prod" ? azurerm_linux_web_app_slot.staging[0].default_hostname : null
}
