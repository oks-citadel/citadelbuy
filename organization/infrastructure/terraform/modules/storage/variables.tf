# Storage Module Variables

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

# Storage Account Variables
variable "account_tier" {
  description = "Storage account tier (Standard or Premium)"
  type        = string
  default     = "Standard"
}

variable "account_replication_type" {
  description = "Storage replication type (LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS)"
  type        = string
  default     = "LRS"
}

variable "enable_versioning" {
  description = "Enable blob versioning"
  type        = bool
  default     = true
}

variable "enable_soft_delete" {
  description = "Enable soft delete for blobs and containers"
  type        = bool
  default     = true
}

variable "soft_delete_days" {
  description = "Soft delete retention days"
  type        = number
  default     = 7
}

variable "cors_allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs for network rules"
  type        = list(string)
  default     = []
}

variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for network rules"
  type        = list(string)
  default     = []
}

# CDN Variables
variable "enable_cdn" {
  description = "Enable Azure Front Door CDN"
  type        = bool
  default     = false
}

variable "cdn_sku" {
  description = "CDN SKU (Standard_AzureFrontDoor or Premium_AzureFrontDoor)"
  type        = string
  default     = "Standard_AzureFrontDoor"
}

variable "custom_domain" {
  description = "Custom domain for CDN"
  type        = string
  default     = ""
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
