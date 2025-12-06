# Database Module Variables

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

# PostgreSQL Variables
variable "postgres_sku_name" {
  description = "PostgreSQL SKU name"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 32768  # 32GB
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "postgres_backup_retention" {
  description = "Backup retention days"
  type        = number
  default     = 7
}

variable "postgres_geo_redundant" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = false
}

variable "postgres_high_availability" {
  description = "Enable high availability"
  type        = bool
  default     = false
}

variable "postgres_max_connections" {
  description = "Maximum connections"
  type        = string
  default     = "100"
}

variable "postgres_work_mem" {
  description = "Work memory in KB"
  type        = string
  default     = "4096"  # 4MB
}

variable "database_subnet_id" {
  description = "Subnet ID for PostgreSQL"
  type        = string
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID for PostgreSQL"
  type        = string
}

variable "administrator_login" {
  description = "Database administrator login"
  type        = string
  default     = "citadeladmin"
}

variable "administrator_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
  default     = null
}

# Redis Variables
variable "redis_sku_name" {
  description = "Redis SKU name (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "redis_family" {
  description = "Redis family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
}

variable "redis_capacity" {
  description = "Redis capacity (size)"
  type        = number
  default     = 1
}

variable "redis_shard_count" {
  description = "Number of shards (Premium only)"
  type        = number
  default     = 0
}

variable "redis_subnet_id" {
  description = "Subnet ID for Redis (Premium only)"
  type        = string
  default     = null
}

variable "redis_maxmemory_reserved" {
  description = "Reserved memory for non-cache operations (MB)"
  type        = number
  default     = 50
}

variable "redis_maxmemory_delta" {
  description = "Memory delta for replication"
  type        = number
  default     = 50
}

variable "redis_aof_backup" {
  description = "Enable AOF persistence (Premium only)"
  type        = bool
  default     = false
}

variable "redis_aof_storage_connection" {
  description = "Storage connection for AOF backup"
  type        = string
  default     = null
  sensitive   = true
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = null
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
