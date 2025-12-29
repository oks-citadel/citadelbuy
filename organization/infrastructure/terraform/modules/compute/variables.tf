# Compute Module Variables

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

# AKS Variables
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "aks_subnet_id" {
  description = "Subnet ID for AKS"
  type        = string
}

variable "aks_admin_group_ids" {
  description = "Azure AD group IDs for AKS admins"
  type        = list(string)
  default     = []
}

variable "system_node_count" {
  description = "Initial system node count"
  type        = number
  default     = 3
}

variable "system_node_size" {
  description = "System node VM size"
  type        = string
  default     = "Standard_DS2_v2"
}

variable "system_node_min" {
  description = "Minimum system nodes"
  type        = number
  default     = 2
}

variable "system_node_max" {
  description = "Maximum system nodes"
  type        = number
  default     = 5
}

variable "user_node_size" {
  description = "User node VM size"
  type        = string
  default     = "Standard_DS3_v2"
}

variable "user_node_min" {
  description = "Minimum user nodes"
  type        = number
  default     = 2
}

variable "user_node_max" {
  description = "Maximum user nodes"
  type        = number
  default     = 10
}

variable "enable_spot_nodes" {
  description = "Enable spot node pool"
  type        = bool
  default     = false
}

variable "spot_node_size" {
  description = "Spot node VM size"
  type        = string
  default     = "Standard_DS3_v2"
}

variable "spot_node_max" {
  description = "Maximum spot nodes"
  type        = number
  default     = 5
}

# ACR Variables
variable "acr_geo_replications" {
  description = "ACR geo-replication configuration"
  type = list(object({
    location        = string
    zone_redundancy = bool
  }))
  default = []
}

variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for ACR (DEPRECATED: use acr_allowed_ip_ranges)"
  type        = list(string)
  default     = []
}

# SECURITY: ACR IP ranges variable with secure defaults
# WARNING: Avoid using 0.0.0.0/0 which exposes the registry to the entire internet.
# Recommended values:
# - Production: Use specific office/VPN IPs and CI/CD runner IPs only
# - Staging: Use office IPs and limited external access
# - Dev: Can be more permissive but still avoid 0.0.0.0/0
variable "acr_allowed_ip_ranges" {
  description = "Allowed IP ranges for ACR network access. Use restrictive ranges to limit exposure."
  type        = list(string)
  default     = ["10.0.0.0/8"]  # Default: internal networks only
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs for ACR"
  type        = list(string)
  default     = []
}

# App Service Variables
variable "enable_app_service" {
  description = "Enable App Service (backup deployment option)"
  type        = bool
  default     = false
}

variable "app_service_sku" {
  description = "App Service SKU"
  type        = string
  default     = "P1v3"
}

variable "api_url" {
  description = "API URL for web app"
  type        = string
  default     = ""
}

variable "staging_api_url" {
  description = "Staging API URL"
  type        = string
  default     = ""
}

variable "front_door_id" {
  description = "Azure Front Door profile ID"
  type        = string
  default     = ""
}

variable "app_insights_connection_string" {
  description = "Application Insights connection string"
  type        = string
  default     = ""
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
