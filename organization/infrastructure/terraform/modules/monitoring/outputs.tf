# Monitoring Module Outputs

# Log Analytics
output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.main.id
}

output "log_analytics_workspace_name" {
  description = "Log Analytics Workspace name"
  value       = azurerm_log_analytics_workspace.main.name
}

output "log_analytics_workspace_key" {
  description = "Log Analytics Workspace primary key"
  value       = azurerm_log_analytics_workspace.main.primary_shared_key
  sensitive   = true
}

# Application Insights
output "app_insights_id" {
  description = "Application Insights ID"
  value       = azurerm_application_insights.main.id
}

output "app_insights_name" {
  description = "Application Insights name"
  value       = azurerm_application_insights.main.name
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "app_insights_app_id" {
  description = "Application Insights app ID"
  value       = azurerm_application_insights.main.app_id
}

# Action Groups
output "critical_action_group_id" {
  description = "Critical alerts action group ID"
  value       = azurerm_monitor_action_group.critical.id
}

output "warning_action_group_id" {
  description = "Warning alerts action group ID"
  value       = azurerm_monitor_action_group.warning.id
}

# Dashboard
output "dashboard_id" {
  description = "Azure Portal Dashboard ID"
  value       = azurerm_portal_dashboard.main.id
}
