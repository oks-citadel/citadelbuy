output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Resource group location"
  value       = azurerm_resource_group.main.location
}

output "vnet_id" {
  description = "VNet ID"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "VNet name"
  value       = azurerm_virtual_network.main.name
}

output "vnet_cidr" {
  description = "VNet CIDR block"
  value       = azurerm_virtual_network.main.address_space[0]
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = azurerm_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = azurerm_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of database subnet IDs"
  value       = azurerm_subnet.database[*].id
}

output "aks_subnet_id" {
  description = "AKS subnet ID"
  value       = azurerm_subnet.aks.id
}

output "aci_subnet_id" {
  description = "ACI subnet ID"
  value       = azurerm_subnet.aci.id
}

output "alb_nsg_id" {
  description = "ALB NSG ID"
  value       = azurerm_network_security_group.alb.id
}

output "app_nsg_id" {
  description = "App NSG ID"
  value       = azurerm_network_security_group.app.id
}

output "database_nsg_id" {
  description = "Database NSG ID"
  value       = azurerm_network_security_group.database.id
}

output "redis_nsg_id" {
  description = "Redis NSG ID"
  value       = azurerm_network_security_group.redis.id
}

output "nat_gateway_ip" {
  description = "NAT Gateway public IP"
  value       = var.enable_nat_gateway ? azurerm_public_ip.nat[0].ip_address : null
}

output "postgresql_private_dns_zone_id" {
  description = "PostgreSQL private DNS zone ID"
  value       = azurerm_private_dns_zone.postgresql.id
}

output "application_insights_id" {
  description = "Application Insights ID"
  value       = azurerm_application_insights.main.id
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.main.id
}

output "log_analytics_workspace_key" {
  description = "Log Analytics workspace primary shared key"
  value       = azurerm_log_analytics_workspace.main.primary_shared_key
  sensitive   = true
}

output "keyvault_private_dns_zone_id" {
  description = "Key Vault private DNS zone ID"
  value       = azurerm_private_dns_zone.keyvault.id
}
