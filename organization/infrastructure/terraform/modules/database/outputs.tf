output "server_id" {
  description = "PostgreSQL server ID"
  value       = azurerm_postgresql_flexible_server.main.id
}

output "server_name" {
  description = "PostgreSQL server name"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "server_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_name" {
  description = "Database name"
  value       = azurerm_postgresql_flexible_server_database.main.name
}

output "administrator_login" {
  description = "Administrator login"
  value       = azurerm_postgresql_flexible_server.main.administrator_login
  sensitive   = true
}

output "connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${azurerm_postgresql_flexible_server.main.administrator_login}@${azurerm_postgresql_flexible_server.main.name}:${var.administrator_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${azurerm_postgresql_flexible_server_database.main.name}?sslmode=require"
  sensitive   = true
}

output "replica_server_id" {
  description = "Read replica server ID"
  value       = var.create_read_replica ? azurerm_postgresql_flexible_server.replica[0].id : null
}

output "replica_server_fqdn" {
  description = "Read replica server FQDN"
  value       = var.create_read_replica ? azurerm_postgresql_flexible_server.replica[0].fqdn : null
}
