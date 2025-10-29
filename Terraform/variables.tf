# ===================================================================
# GENERAL VARIABLES
# ===================================================================
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "globalcommerce"
}

variable "environment" {
  description = "Environment name (dev, test, production)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "production"], var.environment)
    error_message = "Environment must be dev, test, or production."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "Engineering"
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

# ===================================================================
# NETWORKING VARIABLES
# ===================================================================
variable "vnet_address_space" {
  description = "Address space for virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "app_subnet_address_prefix" {
  description = "Address prefix for application subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "data_subnet_address_prefix" {
  description = "Address prefix for data services subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "cache_subnet_address_prefix" {
  description = "Address prefix for cache subnet"
  type        = string
  default     = "10.0.3.0/24"
}

variable "apim_subnet_address_prefix" {
  description = "Address prefix for API Management subnet"
  type        = string
  default     = "10.0.4.0/24"
}

# ===================================================================
# DATABASE VARIABLES
# ===================================================================
variable "db_sku_name" {
  description = "PostgreSQL SKU name"
  type        = string
  default     = "B_Standard_B2s"
  # Options: B_Standard_B1ms, B_Standard_B2s, GP_Standard_D2s_v3, GP_Standard_D4s_v3, etc.
}

variable "db_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 32768
}

variable "db_backup_retention_days" {
  description = "PostgreSQL backup retention in days"
  type        = number
  default     = 7
}

variable "db_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  sensitive   = true
}

variable "db_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

# ===================================================================
# REDIS CACHE VARIABLES
# ===================================================================
variable "redis_capacity" {
  description = "Redis cache capacity"
  type        = number
  default     = 1
}

variable "redis_family" {
  description = "Redis cache family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
}

variable "redis_sku_name" {
  description = "Redis SKU name (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

# ===================================================================
# STORAGE VARIABLES
# ===================================================================
variable "storage_account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
  # Options: Standard, Premium
}

variable "storage_replication_type" {
  description = "Storage account replication type"
  type        = string
  default     = "LRS"
  # Options: LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS
}

# ===================================================================
# CONTAINER REGISTRY VARIABLES
# ===================================================================
variable "acr_sku" {
  description = "Container Registry SKU"
  type        = string
  default     = "Standard"
  # Options: Basic, Standard, Premium
}

# ===================================================================
# EVENT HUB VARIABLES
# ===================================================================
variable "eventhub_sku" {
  description = "Event Hub namespace SKU"
  type        = string
  default     = "Standard"
  # Options: Basic, Standard, Premium
}

variable "eventhub_capacity" {
  description = "Event Hub namespace capacity (throughput units)"
  type        = number
  default     = 1
}

# ===================================================================
# APPLICATION INSIGHTS VARIABLES
# ===================================================================
variable "appinsights_retention_days" {
  description = "Application Insights data retention in days"
  type        = number
  default     = 90
}

# ===================================================================
# API MANAGEMENT VARIABLES
# ===================================================================
variable "apim_sku" {
  description = "API Management SKU"
  type        = string
  default     = "Developer_1"
  # Options: Developer_1, Basic_1, Standard_1, Premium_1
}

variable "apim_publisher_name" {
  description = "API Management publisher name"
  type        = string
  default     = "Global Commerce Platform"
}

variable "apim_publisher_email" {
  description = "API Management publisher email"
  type        = string
}

# ===================================================================
# APP SERVICE VARIABLES
# ===================================================================
variable "app_service_sku" {
  description = "App Service Plan SKU"
  type        = string
  default     = "P1v3"
  # Options: B1, B2, B3, S1, S2, S3, P1v2, P2v2, P3v2, P1v3, P2v3, P3v3
}

variable "docker_image_tag" {
  description = "Docker image tag for deployment"
  type        = string
  default     = "latest"
}

# ===================================================================
# FRONT DOOR VARIABLES
# ===================================================================
variable "frontdoor_sku" {
  description = "Azure Front Door SKU"
  type        = string
  default     = "Standard_AzureFrontDoor"
  # Options: Standard_AzureFrontDoor, Premium_AzureFrontDoor
}
