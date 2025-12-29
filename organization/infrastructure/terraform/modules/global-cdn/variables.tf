# Variables for Global CDN Module

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (prod, staging, dev)"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "sku_name" {
  description = "SKU for Azure Front Door (Standard_AzureFrontDoor or Premium_AzureFrontDoor)"
  type        = string
  default     = "Premium_AzureFrontDoor"

  validation {
    condition     = contains(["Standard_AzureFrontDoor", "Premium_AzureFrontDoor"], var.sku_name)
    error_message = "SKU must be either Standard_AzureFrontDoor or Premium_AzureFrontDoor"
  }
}

variable "regional_endpoints" {
  description = "Map of regional endpoints and their configurations"
  type = map(object({
    hostname                   = string
    priority                   = number
    weight                     = number
    session_affinity_enabled   = bool
  }))

  default = {
    primary = {
      hostname                 = "api-us-east.broxiva.com"
      priority                 = 1
      weight                   = 1000
      session_affinity_enabled = false
    }
    europe = {
      hostname                 = "api-eu-west.broxiva.com"
      priority                 = 1
      weight                   = 1000
      session_affinity_enabled = false
    }
    africa = {
      hostname                 = "api-af-south.broxiva.com"
      priority                 = 1
      weight                   = 1000
      session_affinity_enabled = false
    }
    asia = {
      hostname                 = "api-ap-southeast.broxiva.com"
      priority                 = 1
      weight                   = 1000
      session_affinity_enabled = false
    }
  }
}

variable "custom_domains" {
  description = "Map of custom domains to configure"
  type = map(object({
    dns_zone_id = string
  }))
  default = {}
}

variable "waf_mode" {
  description = "WAF mode (Prevention or Detection)"
  type        = string
  default     = "Prevention"

  validation {
    condition     = contains(["Prevention", "Detection"], var.waf_mode)
    error_message = "WAF mode must be either Prevention or Detection"
  }
}

variable "rate_limit_threshold" {
  description = "Rate limit threshold (requests per minute)"
  type        = number
  default     = 1000
}

# SECURITY: IP ranges for rate limiting
# Note: For rate limiting, matching all IPs (0.0.0.0/0) is a protective measure,
# not a permissive one. It ensures all traffic is subject to rate limits.
# Only customize this if you want to exempt certain IPs from rate limiting.
variable "rate_limit_ip_ranges" {
  description = "IP ranges to apply rate limiting to. Default matches all traffic for protection."
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Match all traffic for rate limiting (protective)
}

variable "enable_geo_blocking" {
  description = "Enable geographic blocking based on allowed countries"
  type        = bool
  default     = false
}

variable "allowed_countries" {
  description = "List of allowed country codes for geo-blocking (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = []
}

variable "enable_geo_routing" {
  description = "Enable intelligent geo-routing to nearest region"
  type        = bool
  default     = true
}

variable "csp_policy" {
  description = "Content Security Policy header value"
  type        = string
  default     = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
}

variable "enable_diagnostics" {
  description = "Enable diagnostic logging"
  type        = bool
  default     = true
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
