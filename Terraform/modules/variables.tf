# ===================================================================
# GENERAL VARIABLES
# ===================================================================
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ecommerce"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
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
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "app_subnet_address_prefix" {
  description = "Address prefix for application subnet"
  type        = list(string)
  default     = ["10.0.1.0/24"]
}

variable "data_subnet_address_prefix" {
  description = "Address prefix for data subnet"
  type        = list(string)
  default     = ["10.0.2.0/24"]
}

variable "cache_subnet_address_prefix" {
  description = "Address prefix for cache subnet"
  type        = list(string)
  default     = ["10.0.3.0/24"]
}

variable "apim_subnet_address_prefix" {
  description = "Address prefix for API Management subnet"
  type        = list(string)
  default     = ["10.0.4.0/24"]
}

# ===================================================================
# DATABASE VARIABLES
# ===================================================================
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

variable "db_sku_name" {
  description = "PostgreSQL SKU name"
  type        = string
  default     = "GP_Standard_D4s_v3"
}

variable "db_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 262144
}

variable "db_backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 35
}

# ===================================================================
# REDIS CACHE VARIABLES
# ===================================================================
variable "redis_capacity" {
  description = "Redis cache capacity"
  type        = number
  default     = 2
}

variable "redis_family" {
  description = "Redis cache family"
  type        = string
  default     = "C"
}

variable "redis_sku_name" {
  description = "Redis cache SKU"
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
}

variable "storage_replication_type" {
  description = "Storage replication type"
  type        = string
  default     = "GRS"
}

# ===================================================================
# CONTAINER REGISTRY VARIABLES
# ===================================================================
variable "acr_sku" {
  description = "Container Registry SKU"
  type        = string
  default     = "Premium"
}

# ===================================================================
# EVENT HUB VARIABLES
# ===================================================================
variable "eventhub_sku" {
  description = "Event Hub namespace SKU"
  type        = string
  default     = "Standard"
}

variable "eventhub_capacity" {
  description = "Event Hub throughput units"
  type        = number
  default     = 2
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
# APP SERVICE VARIABLES
# ===================================================================
variable "app_service_sku" {
  description = "App Service Plan SKU"
  type        = string
  default     = "P2v3"
}

variable "docker_image_tag" {
  description = "Docker image tag for microservices"
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
}

# ===================================================================
# KEY VAULT VARIABLES
# ===================================================================
variable "tenant_id" {
  description = "Azure AD tenant ID"
  type        = string
}

variable "key_vault_admin_object_id" {
  description = "Object ID of the Key Vault administrator"
  type        = string
}
