# Compute Module Variables

variable "project_name" {
  description = "Name of the project"
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
  description = "Name of the resource group"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# AKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "aks_subnet_id" {
  description = "Subnet ID for AKS nodes"
  type        = string
}

variable "aks_admin_group_ids" {
  description = "Azure AD group IDs for AKS admin access"
  type        = list(string)
  default     = []
}

variable "system_node_count" {
  description = "Initial number of system nodes"
  type        = number
  default     = 2
}

variable "system_node_size" {
  description = "VM size for system nodes"
  type        = string
  default     = "Standard_DS2_v2"
}

variable "system_node_min" {
  description = "Minimum number of system nodes"
  type        = number
  default     = 2
}

variable "system_node_max" {
  description = "Maximum number of system nodes"
  type        = number
  default     = 5
}

variable "user_node_size" {
  description = "VM size for user nodes"
  type        = string
  default     = "Standard_DS3_v2"
}

variable "user_node_min" {
  description = "Minimum number of user nodes"
  type        = number
  default     = 2
}

variable "user_node_max" {
  description = "Maximum number of user nodes"
  type        = number
  default     = 10
}

variable "enable_spot_nodes" {
  description = "Enable spot instance node pool"
  type        = bool
  default     = false
}

variable "spot_node_size" {
  description = "VM size for spot nodes"
  type        = string
  default     = "Standard_DS3_v2"
}

variable "spot_node_max" {
  description = "Maximum number of spot nodes"
  type        = number
  default     = 5
}

# ACR Configuration
variable "acr_geo_replications" {
  description = "ACR geo-replication locations"
  type = list(object({
    location        = string
    zone_redundancy = bool
  }))
  default = []
}

variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for ACR"
  type        = list(string)
  default     = []
}

# App Service Configuration
variable "enable_app_service" {
  description = "Enable Azure App Service for web hosting"
  type        = bool
  default     = false
}

variable "app_service_sku" {
  description = "App Service Plan SKU"
  type        = string
  default     = "P1v3"
}

variable "api_url" {
  description = "API URL for frontend"
  type        = string
}

variable "staging_api_url" {
  description = "Staging API URL"
  type        = string
  default     = ""
}

variable "front_door_id" {
  description = "Azure Front Door ID for IP restriction"
  type        = string
  default     = ""
}

variable "app_insights_connection_string" {
  description = "Application Insights connection string"
  type        = string
  default     = ""
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for AKS monitoring"
  type        = string
}
