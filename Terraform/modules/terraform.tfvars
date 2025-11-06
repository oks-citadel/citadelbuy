# ===================================================================
# TERRAFORM VARIABLES - EXAMPLE
# Copy this file to terraform.tfvars and update with your values
# ===================================================================

# General Configuration
project_name = "ecommerce"
environment  = "production"
location     = "eastus"
cost_center  = "Engineering"

# Additional tags
tags = {
  Owner       = "DevOps Team"
  Compliance  = "PCI-DSS"
  Application = "E-Commerce Platform"
}

# Networking
vnet_address_space          = ["10.0.0.0/16"]
app_subnet_address_prefix   = ["10.0.1.0/24"]
data_subnet_address_prefix  = ["10.0.2.0/24"]
cache_subnet_address_prefix = ["10.0.3.0/24"]
apim_subnet_address_prefix  = ["10.0.4.0/24"]

# Database Configuration
db_admin_username       = "psqladmin"
db_admin_password       = "YourSecurePassword123!" # Store in Key Vault or Azure DevOps
db_sku_name             = "GP_Standard_D4s_v3"
db_storage_mb           = 262144
db_backup_retention_days = 35

# Redis Cache
redis_capacity = 2
redis_family   = "C"
redis_sku_name = "Standard"

# Storage Account
storage_account_tier     = "Standard"
storage_replication_type = "GRS"

# Container Registry
acr_sku = "Premium"

# Event Hub
eventhub_sku      = "Standard"
eventhub_capacity = 2

# Application Insights
appinsights_retention_days = 90

# App Service Plan
app_service_sku = "P2v3"

# Docker Images
docker_image_tag = "latest"

# Front Door
frontdoor_sku = "Standard_AzureFrontDoor"

# Key Vault
tenant_id                  = "00000000-0000-0000-0000-000000000000" # Your Azure AD Tenant ID
key_vault_admin_object_id = "00000000-0000-0000-0000-000000000000" # Your Object ID
