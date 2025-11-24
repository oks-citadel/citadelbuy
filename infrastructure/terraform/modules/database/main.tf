# Database Module - Azure Database for PostgreSQL Flexible Server

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.project_name}-${var.environment}-postgres"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = var.postgres_version
  delegated_subnet_id    = var.delegated_subnet_id
  private_dns_zone_id    = var.private_dns_zone_id
  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password
  zone                   = var.availability_zone

  storage_mb            = var.storage_mb
  sku_name              = var.sku_name
  backup_retention_days = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup

  high_availability {
    mode                      = var.high_availability_mode
    standby_availability_zone = var.standby_availability_zone
  }

  maintenance_window {
    day_of_week  = var.maintenance_window_day
    start_hour   = var.maintenance_window_start_hour
    start_minute = 0
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-postgres"
    }
  )

  lifecycle {
    ignore_changes = [
      zone,
      high_availability[0].standby_availability_zone
    ]
  }

  depends_on = [
    var.private_dns_zone_id
  ]
}

# PostgreSQL Flexible Server Configuration
resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "pg_stat_statements,pgcrypto"
}

resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.max_connections
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name      = "shared_buffers"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.shared_buffers_mb
}

resource "azurerm_postgresql_flexible_server_configuration" "effective_cache_size" {
  name      = "effective_cache_size"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.effective_cache_size_mb
}

resource "azurerm_postgresql_flexible_server_configuration" "log_min_duration_statement" {
  name      = "log_min_duration_statement"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.slow_query_threshold_ms
}

resource "azurerm_postgresql_flexible_server_configuration" "log_statement" {
  name      = "log_statement"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.log_statement
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# Read Replica (Optional)
resource "azurerm_postgresql_flexible_server" "replica" {
  count                     = var.create_read_replica ? 1 : 0
  name                      = "${var.project_name}-${var.environment}-postgres-replica"
  resource_group_name       = var.resource_group_name
  location                  = var.location
  version                   = var.postgres_version
  delegated_subnet_id       = var.delegated_subnet_id
  private_dns_zone_id       = var.private_dns_zone_id
  create_mode               = "Replica"
  source_server_id          = azurerm_postgresql_flexible_server.main.id
  zone                      = var.replica_availability_zone

  storage_mb = var.storage_mb
  sku_name   = var.replica_sku_name

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-postgres-replica"
    }
  )
}

# Firewall Rules for Azure Services
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "database" {
  name                       = "${var.project_name}-${var.environment}-postgres-diagnostics"
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  enabled_log {
    category = "PostgreSQLFlexSessions"
  }

  enabled_log {
    category = "PostgreSQLFlexQueryStoreRuntime"
  }

  enabled_log {
    category = "PostgreSQLFlexQueryStoreWaitStats"
  }

  enabled_log {
    category = "PostgreSQLFlexTableStats"
  }

  enabled_log {
    category = "PostgreSQLFlexDatabaseXacts"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Alerts
resource "azurerm_monitor_metric_alert" "cpu_alert" {
  name                = "${var.project_name}-${var.environment}-postgres-cpu-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  description         = "Alert when CPU exceeds 80%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "memory_alert" {
  name                = "${var.project_name}-${var.environment}-postgres-memory-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  description         = "Alert when memory exceeds 85%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "memory_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "storage_alert" {
  name                = "${var.project_name}-${var.environment}-postgres-storage-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  description         = "Alert when storage exceeds 85%"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "storage_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "connection_alert" {
  name                = "${var.project_name}-${var.environment}-postgres-connection-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  description         = "Alert when active connections exceed threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "active_connections"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = var.max_connections * 0.8
  }

  tags = var.tags
}
