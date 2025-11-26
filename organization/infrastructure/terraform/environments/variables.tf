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

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  type        = string
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
}

variable "account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
}

variable "replication_type" {
  description = "Storage replication type"
  type        = string
  default     = "GRS"
}

variable "blob_retention_days" {
  description = "Blob retention days"
  type        = number
  default     = 30
}

variable "container_retention_days" {
  description = "Container retention days"
  type        = number
  default     = 30
}

variable "allowed_ips" {
  description = "Allowed IP addresses"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs"
  type        = list(string)
  default     = []
}

variable "file_share_quota_gb" {
  description = "File share quota in GB"
  type        = number
  default     = 100
}

# Redis Variables
variable "redis_sku" {
  description = "Redis SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "redis_family" {
  description = "Redis family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
}

variable "redis_capacity" {
  description = "Redis capacity (0-6 for C family, 1-5 for P family)"
  type        = number
  default     = 2
}

variable "redis_maxmemory_reserved" {
  description = "Redis maxmemory reserved in MB"
  type        = number
  default     = 50
}

variable "redis_maxmemory_delta" {
  description = "Redis maxmemory delta in MB"
  type        = number
  default     = 50
}

variable "redis_backup_enabled" {
  description = "Enable Redis RDB backup"
  type        = bool
  default     = true
}

variable "redis_backup_frequency" {
  description = "Redis backup frequency in minutes (15, 30, 60, 360, 720, 1440)"
  type        = number
  default     = 60
}

variable "redis_backup_max_snapshots" {
  description = "Maximum number of Redis backup snapshots"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
