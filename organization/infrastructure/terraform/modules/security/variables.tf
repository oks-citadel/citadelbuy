# Security Module Variables

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

variable "tenant_id" {
  description = "Azure AD tenant ID"
  type        = string
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

# Network Configuration
variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for network access"
  type        = list(string)
  default     = []
}

variable "blocked_ip_ranges" {
  description = "Blocked IP ranges"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "Allowed subnet IDs for Key Vault access"
  type        = list(string)
  default     = []
}

# Identity Configuration
variable "aks_identity_principal_id" {
  description = "AKS managed identity principal ID"
  type        = string
}

variable "app_service_principal_id" {
  description = "App Service managed identity principal ID"
  type        = string
  default     = ""
}

# Secrets
variable "database_connection_string" {
  description = "Database connection string"
  type        = string
  sensitive   = true
}

variable "redis_connection_string" {
  description = "Redis connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret (leave empty to auto-generate)"
  type        = string
  sensitive   = true
  default     = ""
}

# WAF Configuration
variable "enable_geo_filtering" {
  description = "Enable geo-based filtering"
  type        = bool
  default     = false
}

variable "blocked_countries" {
  description = "Countries to block (ISO 3166-1 alpha-2 codes)"
  type        = list(string)
  default     = []
}

# DDoS Protection
variable "enable_ddos_protection" {
  description = "Enable DDoS Protection Plan"
  type        = bool
  default     = false
}

# Defender for Cloud
variable "enable_defender" {
  description = "Enable Microsoft Defender for Cloud"
  type        = bool
  default     = true
}

# Private Endpoints
variable "enable_private_endpoints" {
  description = "Enable private endpoints"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoints"
  type        = string
  default     = ""
}

variable "keyvault_private_dns_zone_id" {
  description = "Private DNS zone ID for Key Vault"
  type        = string
  default     = ""
}
