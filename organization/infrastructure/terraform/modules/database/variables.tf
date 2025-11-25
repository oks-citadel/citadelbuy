variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "delegated_subnet_id" {
  description = "Delegated subnet ID for PostgreSQL"
  type        = string
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID for PostgreSQL"
  type        = string
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  type        = string
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16"
}

variable "sku_name" {
  description = "SKU name for PostgreSQL Flexible Server"
  type        = string
  default     = "GP_Standard_D4s_v3"
}

variable "storage_mb" {
  description = "Storage size in MB"
  type        = number
  default     = 131072 # 128 GB
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "geo_redundant_backup" {
  description = "Enable geo-redundant backup"
  type        = bool
  default     = true
}

variable "availability_zone" {
  description = "Availability zone for primary server"
  type        = string
  default     = "1"
}

variable "standby_availability_zone" {
  description = "Availability zone for standby server"
  type        = string
  default     = "2"
}

variable "high_availability_mode" {
  description = "High availability mode (ZoneRedundant or SameZone)"
  type        = string
  default     = "ZoneRedundant"
}

variable "administrator_login" {
  description = "Administrator login"
  type        = string
  default     = "citadelbuy_admin"
}

variable "administrator_password" {
  description = "Administrator password"
  type        = string
  sensitive   = true
}

variable "database_name" {
  description = "Database name"
  type        = string
}

variable "max_connections" {
  description = "Maximum number of connections"
  type        = number
  default     = 500
}

variable "shared_buffers_mb" {
  description = "Shared buffers in MB"
  type        = number
  default     = 2048
}

variable "effective_cache_size_mb" {
  description = "Effective cache size in MB"
  type        = number
  default     = 8192
}

variable "slow_query_threshold_ms" {
  description = "Slow query threshold in milliseconds"
  type        = number
  default     = 1000
}

variable "log_statement" {
  description = "Log statement type (none, ddl, mod, all)"
  type        = string
  default     = "ddl"
}

variable "maintenance_window_day" {
  description = "Maintenance window day of week"
  type        = number
  default     = 0 # Sunday
}

variable "maintenance_window_start_hour" {
  description = "Maintenance window start hour"
  type        = number
  default     = 4
}

variable "create_read_replica" {
  description = "Create read replica"
  type        = bool
  default     = false
}

variable "replica_sku_name" {
  description = "SKU name for replica"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "replica_availability_zone" {
  description = "Availability zone for replica"
  type        = string
  default     = "3"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
