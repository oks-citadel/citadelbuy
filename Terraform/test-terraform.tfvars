# ===================================================================
# TEST ENVIRONMENT CONFIGURATION
# ===================================================================

environment  = "test"
project_name = "globalcommerce"
location     = "eastus"
cost_center  = "Engineering"

tags = {
  Environment = "Test"
  Owner       = "Platform Team"
  CostCenter  = "Engineering"
}

# ===================================================================
# NETWORKING
# ===================================================================
vnet_address_space          = ["10.1.0.0/16"]
app_subnet_address_prefix   = "10.1.1.0/24"
data_subnet_address_prefix  = "10.1.2.0/24"
cache_subnet_address_prefix = "10.1.3.0/24"
apim_subnet_address_prefix  = "10.1.4.0/24"

# ===================================================================
# DATABASE - Medium specs for test
# ===================================================================
db_sku_name              = "B_Standard_B2s"  # Burstable tier
db_storage_mb            = 65536              # 64 GB
db_backup_retention_days = 7

# ===================================================================
# REDIS CACHE - Standard tier for test
# ===================================================================
redis_capacity = 1
redis_family   = "C"
redis_sku_name = "Standard"

# ===================================================================
# STORAGE - LRS for test
# ===================================================================
storage_account_tier     = "Standard"
storage_replication_type = "LRS"

# ===================================================================
# CONTAINER REGISTRY - Standard tier
# ===================================================================
acr_sku = "Standard"

# ===================================================================
# EVENT HUB - Standard tier
# ===================================================================
eventhub_sku      = "Standard"
eventhub_capacity = 2

# ===================================================================
# APPLICATION INSIGHTS
# ===================================================================
appinsights_retention_days = 60

# ===================================================================
# API MANAGEMENT - Basic tier
# ===================================================================
apim_sku            = "Basic_1"
apim_publisher_name = "Global Commerce Platform - Test"
# apim_publisher_email set via environment variable or prompt

# ===================================================================
# APP SERVICE - Standard tier for test
# ===================================================================
app_service_sku = "S2"  # Standard tier

# ===================================================================
# FRONT DOOR
# ===================================================================
frontdoor_sku = "Standard_AzureFrontDoor"

# ===================================================================
# DOCKER IMAGE TAG
# ===================================================================
docker_image_tag = "test-latest"
