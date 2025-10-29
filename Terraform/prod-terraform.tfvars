# ===================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ===================================================================

environment  = "production"
project_name = "globalcommerce"
location     = "eastus"
cost_center  = "Production"

tags = {
  Environment = "Production"
  Owner       = "Platform Team"
  CostCenter  = "Production"
  Compliance  = "Required"
}

# ===================================================================
# NETWORKING
# ===================================================================
vnet_address_space          = ["10.2.0.0/16"]
app_subnet_address_prefix   = "10.2.1.0/24"
data_subnet_address_prefix  = "10.2.2.0/24"
cache_subnet_address_prefix = "10.2.3.0/24"
apim_subnet_address_prefix  = "10.2.4.0/24"

# ===================================================================
# DATABASE - Production specs with high availability
# ===================================================================
db_sku_name              = "GP_Standard_D4s_v3"  # General Purpose tier
db_storage_mb            = 262144                 # 256 GB
db_backup_retention_days = 35                     # 5 weeks retention

# ===================================================================
# REDIS CACHE - Premium tier for production
# ===================================================================
redis_capacity = 2
redis_family   = "P"
redis_sku_name = "Premium"

# ===================================================================
# STORAGE - GRS for production
# ===================================================================
storage_account_tier     = "Standard"
storage_replication_type = "GRS"  # Geo-redundant storage

# ===================================================================
# CONTAINER REGISTRY - Premium tier
# ===================================================================
acr_sku = "Premium"

# ===================================================================
# EVENT HUB - Standard tier with higher capacity
# ===================================================================
eventhub_sku      = "Standard"
eventhub_capacity = 4

# ===================================================================
# APPLICATION INSIGHTS
# ===================================================================
appinsights_retention_days = 90

# ===================================================================
# API MANAGEMENT - Standard tier (or Premium for mission-critical)
# ===================================================================
apim_sku            = "Standard_1"
apim_publisher_name = "Global Commerce Platform"
# apim_publisher_email set via environment variable or prompt

# ===================================================================
# APP SERVICE - Premium tier for production
# ===================================================================
app_service_sku = "P2v3"  # Premium v3 tier

# ===================================================================
# FRONT DOOR
# ===================================================================
frontdoor_sku = "Premium_AzureFrontDoor"  # Premium for WAF

# ===================================================================
# DOCKER IMAGE TAG
# ===================================================================
docker_image_tag = "stable"
