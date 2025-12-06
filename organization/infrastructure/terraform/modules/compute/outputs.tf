# Compute Module Outputs

# ACR Outputs
output "acr_id" {
  description = "ACR ID"
  value       = azurerm_container_registry.main.id
}

output "acr_name" {
  description = "ACR name"
  value       = azurerm_container_registry.main.name
}

output "acr_login_server" {
  description = "ACR login server"
  value       = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.main.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}

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
  description = "AKS kubeconfig"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "aks_kube_config_host" {
  description = "AKS API server host"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].host
}

output "aks_node_resource_group" {
  description = "AKS node resource group"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

output "aks_identity_principal_id" {
  description = "AKS managed identity principal ID"
  value       = azurerm_kubernetes_cluster.main.identity[0].principal_id
}

output "aks_kubelet_identity_object_id" {
  description = "AKS kubelet identity object ID"
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

output "aks_oidc_issuer_url" {
  description = "AKS OIDC issuer URL"
  value       = azurerm_kubernetes_cluster.main.oidc_issuer_url
}

# App Service Outputs
output "app_service_plan_id" {
  description = "App Service Plan ID"
  value       = var.enable_app_service ? azurerm_service_plan.main[0].id : null
}

output "api_app_id" {
  description = "API App Service ID"
  value       = var.enable_app_service ? azurerm_linux_web_app.api[0].id : null
}

output "api_app_default_hostname" {
  description = "API App default hostname"
  value       = var.enable_app_service ? azurerm_linux_web_app.api[0].default_hostname : null
}

output "api_app_identity_principal_id" {
  description = "API App managed identity principal ID"
  value       = var.enable_app_service ? azurerm_linux_web_app.api[0].identity[0].principal_id : null
}

output "web_app_id" {
  description = "Web App Service ID"
  value       = var.enable_app_service ? azurerm_linux_web_app.web[0].id : null
}

output "web_app_default_hostname" {
  description = "Web App default hostname"
  value       = var.enable_app_service ? azurerm_linux_web_app.web[0].default_hostname : null
}

output "app_service_principal_id" {
  description = "App Service principal ID (API)"
  value       = var.enable_app_service ? azurerm_linux_web_app.api[0].identity[0].principal_id : null
}
