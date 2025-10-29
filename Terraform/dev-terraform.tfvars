# ===================================================================
# DEVELOPMENT ENVIRONMENT CONFIGURATION
# ===================================================================

environment  = "dev"
project_name = "globalcommerce"
location     = "eastus"
cost_center  = "Engineering"

tags = {
  Environment = "Development"
  Owner       = "Platform Team"
  CostCenter  = "Engineering"
}

# ===================================================================
# NETWORKING
# ===================================================================
vnet_address_space          = ["10.0.0.0/16"]
app_subnet_address_prefix   = "10.0.1.0/24"
data_subnet_address_prefix  = "10.0.2.0/24"
cache_subnet_address_prefix = "10.0.3.0/24"
apim_subnet_address_prefix  = "10.0.4.0/24"

# ===================================================================
# DATABASE - Lower specs for dev
# ===================================================================
db_sku_name              = "B_Standard_B1ms"  # Burstable tier
db_storage_mb            = 32768               # 32 GB
db_backup_retention_days = 7

# ===================================================================
# REDIS CACHE - Basic tier for dev
# ===================================================================
redis_capacity = 0
redis_family   = "C"
redis_sku_name = "Basic"

# ===================================================================
# STORAGE - LRS for dev
# ===================================================================
storage_account_tier     = "Standard"
storage_replication_type = "LRS"

# ===================================================================
# CONTAINER REGISTRY - Basic tier
# ===================================================================
acr_sku = "Basic"

# ===================================================================
# EVENT HUB - Basic tier
# ===================================================================
eventhub_sku      = "Basic"
eventhub_capacity = 1

# ===================================================================
# APPLICATION INSIGHTS
# ===================================================================
appinsights_retention_days = 30  # Shorter retention for dev

# ===================================================================
# API MANAGEMENT - Developer tier
# ===================================================================
apim_sku            = "Developer_1"
apim_publisher_name = "Global Commerce Platform - Dev"
# apim_publisher_email set via environment variable or prompt

# ===================================================================
# APP SERVICE - Lower tier for dev
# ===================================================================
app_service_sku = "B2"  # Basic tier

# ===================================================================
# FRONT DOOR
# ===================================================================
frontdoor_sku = "Standard_AzureFrontDoor"

# ===================================================================
# DOCKER IMAGE TAG
# ===================================================================
docker_image_tag = "dev-latest"
