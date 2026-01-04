# Database Module - Azure PostgreSQL Flexible Server and Redis Cache
# Broxiva E-commerce Platform

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# ============================================
# Random Password for Database (if not provided)
# ============================================
resource "random_password" "db_password" {
  count            = var.administrator_password == null ? 1 : 0
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

locals {
  db_password = var.administrator_password != null ? var.administrator_password : random_password.db_password[0].result
}

# ============================================
# PostgreSQL Flexible Server
# ============================================
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.project_name}-${var.environment}-postgres"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = var.postgres_version
  delegated_subnet_id    = var.database_subnet_id
  private_dns_zone_id    = var.private_dns_zone_id
  administrator_login    = var.administrator_login
  administrator_password = local.db_password

  storage_mb = var.postgres_storage_mb
  sku_name   = var.postgres_sku_name

  backup_retention_days        = var.postgres_backup_retention
  geo_redundant_backup_enabled = var.postgres_geo_redundant

  dynamic "high_availability" {
    for_each = var.postgres_high_availability ? [1] : []
    content {
      mode                      = "ZoneRedundant"
      standby_availability_zone = "2"
    }
  }

  maintenance_window {
    day_of_week  = 0 # Sunday
    start_hour   = 3 # 3 AM UTC
    start_minute = 0
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-postgres"
      Service = "Database"
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# ============================================
# PostgreSQL Databases
# ============================================
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "${var.project_name}_${var.environment}"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

resource "azurerm_postgresql_flexible_server_database" "test" {
  count     = var.environment == "prod" ? 0 : 1
  name      = "${var.project_name}_${var.environment}_test"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# ============================================
# PostgreSQL Server Configuration
# ============================================
resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "PGCRYPTO,UUID-OSSP,HSTORE,PG_TRGM"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_statement" {
  name      = "log_statement"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "ddl"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_duration" {
  name      = "log_duration"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_min_duration" {
  name      = "log_min_duration_statement"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "1000" # Log queries taking > 1 second
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_preload" {
  name      = "shared_preload_libraries"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "pg_stat_statements"
}

resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.postgres_max_connections
}

resource "azurerm_postgresql_flexible_server_configuration" "work_mem" {
  name      = "work_mem"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.postgres_work_mem
}

# ============================================
# Azure Cache for Redis
# ============================================
resource "azurerm_redis_cache" "main" {
  name                = "${var.project_name}-${var.environment}-redis"
  location            = var.location
  resource_group_name = var.resource_group_name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  subnet_id = var.redis_sku_name == "Premium" ? var.redis_subnet_id : null

  shard_count = var.redis_sku_name == "Premium" ? var.redis_shard_count : null

  redis_configuration {
    maxmemory_reserved              = var.redis_maxmemory_reserved
    maxmemory_delta                 = var.redis_maxmemory_delta
    maxmemory_policy                = "volatile-lru"
    notify_keyspace_events          = "KEA"
    enable_authentication           = true
    aof_backup_enabled              = var.redis_sku_name == "Premium" ? var.redis_aof_backup : false
    aof_storage_connection_string_0 = var.redis_sku_name == "Premium" && var.redis_aof_backup ? var.redis_aof_storage_connection : null
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 4
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-redis"
      Service = "Cache"
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# ============================================
# Redis Firewall Rules (for non-Premium SKU)
# ============================================
# SECURITY: Redis firewall rules control network access to the cache.
# For non-Premium SKUs, VNet integration is not available, so IP rules are used.
# 
# Azure Services Rule (0.0.0.0 - 0.0.0.0):
# This is a special Azure convention that allows Azure services to connect.
# While this is more permissive than specific IPs, it's required for many
# Azure PaaS services to connect. For tighter security, use Premium SKU with VNet.
#
# Custom IP rules below allow access from specified ranges.
resource "azurerm_redis_firewall_rule" "allow_azure" {
  count               = var.redis_sku_name != "Premium" && var.redis_allow_azure_services ? 1 : 0
  name                = "AllowAzureServices"
  redis_cache_name    = azurerm_redis_cache.main.name
  resource_group_name = var.resource_group_name
  start_ip            = "0.0.0.0"
  end_ip              = "0.0.0.0"
}

# Dynamic firewall rules for custom IP ranges
# SECURITY: Use specific IP ranges instead of broad ranges like 0.0.0.0/0
resource "azurerm_redis_firewall_rule" "custom" {
  for_each            = var.redis_sku_name != "Premium" ? { for idx, ip in var.redis_allowed_ip_ranges : idx => ip } : {}
  name                = "CustomRule${each.key}"
  redis_cache_name    = azurerm_redis_cache.main.name
  resource_group_name = var.resource_group_name
  start_ip            = each.value.start_ip
  end_ip              = each.value.end_ip
}

# ============================================
# Diagnostic Settings for PostgreSQL
# ============================================
resource "azurerm_monitor_diagnostic_setting" "postgresql" {
  count                      = var.log_analytics_workspace_id != null ? 1 : 0
  name                       = "${var.project_name}-${var.environment}-postgres-diag"
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  enabled_log {
    category = "PostgreSQLFlexDatabaseXacts"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# ============================================
# Diagnostic Settings for Redis
# ============================================
resource "azurerm_monitor_diagnostic_setting" "redis" {
  count                      = var.log_analytics_workspace_id != null ? 1 : 0
  name                       = "${var.project_name}-${var.environment}-redis-diag"
  target_resource_id         = azurerm_redis_cache.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "ConnectedClientList"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
