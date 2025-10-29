terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.45"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = var.environment == "dev" ? true : false
    }
    resource_group {
      prevent_deletion_if_contains_resources = var.environment == "production" ? true : false
    }
  }
}

# Data sources
data "azurerm_client_config" "current" {}

# Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

# ===================================================================
# RESOURCE GROUP
# ===================================================================
resource "azurerm_resource_group" "main" {
  name     = "${local.resource_prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# ===================================================================
# NETWORKING
# ===================================================================
module "networking" {
  source = "./modules/networking"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  vnet_address_space          = var.vnet_address_space
  app_subnet_address_prefix   = var.app_subnet_address_prefix
  data_subnet_address_prefix  = var.data_subnet_address_prefix
  cache_subnet_address_prefix = var.cache_subnet_address_prefix
  apim_subnet_address_prefix  = var.apim_subnet_address_prefix
  
  enable_ddos_protection = var.environment == "production" ? true : false
  
  tags = local.common_tags
}

# ===================================================================
# SECURITY - KEY VAULT
# ===================================================================
module "security" {
  source = "./modules/security"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = data.azurerm_client_config.current.object_id
  
  subnet_id           = module.networking.data_subnet_id
  
  enable_private_endpoint = var.environment != "dev"
  
  tags = local.common_tags
}

# ===================================================================
# DATABASE - POSTGRESQL FLEXIBLE SERVER
# ===================================================================
module "database" {
  source = "./modules/database"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  subnet_id           = module.networking.data_subnet_id
  private_dns_zone_id = module.networking.postgres_private_dns_zone_id
  
  sku_name            = var.db_sku_name
  storage_mb          = var.db_storage_mb
  backup_retention_days = var.db_backup_retention_days
  
  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password
  
  database_names = [
    "auth_db",
    "user_db",
    "product_db",
    "order_db",
    "payment_db",
    "inventory_db",
    "analytics_db"
  ]
  
  enable_high_availability = var.environment == "production"
  
  tags = local.common_tags
}

# ===================================================================
# CACHE - REDIS
# ===================================================================
module "redis" {
  source = "./modules/redis"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  subnet_id           = module.networking.cache_subnet_id
  
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  
  enable_non_ssl_port = var.environment == "dev"
  
  tags = local.common_tags
}

# ===================================================================
# STORAGE
# ===================================================================
module "storage" {
  source = "./modules/storage"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  random_suffix       = random_string.suffix.result
  
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_replication_type
  
  enable_versioning        = var.environment == "production"
  enable_soft_delete       = true
  
  containers = [
    "product-images",
    "user-uploads",
    "invoice-documents",
    "analytics-exports",
    "ml-models",
    "backups"
  ]
  
  tags = local.common_tags
}

# ===================================================================
# CONTAINER REGISTRY
# ===================================================================
module "container_registry" {
  source = "./modules/container-registry"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  random_suffix       = random_string.suffix.result
  
  sku                 = var.acr_sku
  admin_enabled       = var.environment == "dev"
  
  enable_geo_replication = var.environment == "production"
  
  tags = local.common_tags
}

# ===================================================================
# EVENT HUB
# ===================================================================
module "event_hub" {
  source = "./modules/event-hub"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  sku                 = var.eventhub_sku
  capacity            = var.eventhub_capacity
  
  event_hubs = [
    {
      name              = "order-events"
      partition_count   = var.environment == "production" ? 8 : 2
      message_retention = var.environment == "production" ? 7 : 1
    },
    {
      name              = "payment-events"
      partition_count   = var.environment == "production" ? 8 : 2
      message_retention = var.environment == "production" ? 7 : 1
    },
    {
      name              = "inventory-events"
      partition_count   = var.environment == "production" ? 4 : 2
      message_retention = var.environment == "production" ? 3 : 1
    },
    {
      name              = "analytics-events"
      partition_count   = var.environment == "production" ? 16 : 2
      message_retention = var.environment == "production" ? 7 : 1
    }
  ]
  
  tags = local.common_tags
}

# ===================================================================
# APPLICATION INSIGHTS & MONITORING
# ===================================================================
module "monitoring" {
  source = "./modules/monitoring"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  retention_in_days   = var.appinsights_retention_days
  
  tags = local.common_tags
}

# ===================================================================
# API MANAGEMENT
# ===================================================================
module "api_management" {
  source = "./modules/api-management"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  subnet_id           = module.networking.apim_subnet_id
  
  sku_name            = var.apim_sku
  publisher_name      = var.apim_publisher_name
  publisher_email     = var.apim_publisher_email
  
  virtual_network_type = var.environment == "production" ? "Internal" : "None"
  
  tags = local.common_tags
}

# ===================================================================
# APP SERVICES - MICROSERVICES
# ===================================================================
module "app_services" {
  source = "./modules/app-service"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  subnet_id           = module.networking.app_subnet_id
  
  sku_name            = var.app_service_sku
  
  # Microservices configuration
  services = [
    {
      name                    = "api-gateway"
      docker_image           = "${module.container_registry.login_server}/api-gateway"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 3 : 1
      max_instances          = var.environment == "production" ? 10 : 3
    },
    {
      name                    = "auth-service"
      docker_image           = "${module.container_registry.login_server}/auth-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = true
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 5 : 2
    },
    {
      name                    = "user-service"
      docker_image           = "${module.container_registry.login_server}/user-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 8 : 3
    },
    {
      name                    = "product-service"
      docker_image           = "${module.container_registry.login_server}/product-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 3 : 1
      max_instances          = var.environment == "production" ? 10 : 3
    },
    {
      name                    = "order-service"
      docker_image           = "${module.container_registry.login_server}/order-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = true
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 3 : 1
      max_instances          = var.environment == "production" ? 15 : 3
    },
    {
      name                    = "payment-service"
      docker_image           = "${module.container_registry.login_server}/payment-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = true
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 3 : 1
      max_instances          = var.environment == "production" ? 12 : 3
    },
    {
      name                    = "inventory-service"
      docker_image           = "${module.container_registry.login_server}/inventory-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 8 : 3
    },
    {
      name                    = "shipping-service"
      docker_image           = "${module.container_registry.login_server}/shipping-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 6 : 2
    },
    {
      name                    = "notification-service"
      docker_image           = "${module.container_registry.login_server}/notification-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 8 : 3
    },
    {
      name                    = "search-service"
      docker_image           = "${module.container_registry.login_server}/search-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 10 : 3
    },
    {
      name                    = "analytics-service"
      docker_image           = "${module.container_registry.login_server}/analytics-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 6 : 2
    },
    {
      name                    = "ai-service"
      docker_image           = "${module.container_registry.login_server}/ai-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 8 : 3
    },
    {
      name                    = "vendor-service"
      docker_image           = "${module.container_registry.login_server}/vendor-service"
      docker_image_tag       = var.docker_image_tag
      always_on              = var.environment != "dev"
      health_check_path      = "/health"
      min_instances          = var.environment == "production" ? 2 : 1
      max_instances          = var.environment == "production" ? 5 : 2
    }
  ]
  
  # Common app settings
  common_app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = module.monitoring.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = module.monitoring.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    
    "POSTGRES_HOST"     = module.database.server_fqdn
    "POSTGRES_PORT"     = "5432"
    "POSTGRES_SSL_MODE" = "require"
    
    "REDIS_HOST"     = module.redis.hostname
    "REDIS_PORT"     = module.redis.ssl_port
    "REDIS_SSL"      = "true"
    
    "EVENTHUB_NAMESPACE" = module.event_hub.namespace_name
    
    "STORAGE_ACCOUNT_NAME" = module.storage.account_name
    
    "KEY_VAULT_URI" = module.security.key_vault_uri
    
    "ENVIRONMENT" = var.environment
  }
  
  tags = local.common_tags
  
  depends_on = [
    module.container_registry
  ]
}

# ===================================================================
# FRONT DOOR (CDN)
# ===================================================================
module "cdn" {
  source = "./modules/cdn"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  resource_prefix     = local.resource_prefix
  
  sku_name            = var.frontdoor_sku
  
  backend_address     = module.app_services.api_gateway_default_hostname
  
  enable_waf          = var.environment == "production"
  
  tags = local.common_tags
}

# ===================================================================
# SECRETS - Store sensitive data in Key Vault
# ===================================================================
resource "azurerm_key_vault_secret" "db_connection_strings" {
  for_each = toset([
    "auth_db",
    "user_db",
    "product_db",
    "order_db",
    "payment_db",
    "inventory_db",
    "analytics_db"
  ])

  name         = "${each.key}-connection-string"
  value        = "postgresql://${var.db_admin_username}@${module.database.server_name}:${var.db_admin_password}@${module.database.server_fqdn}:5432/${each.key}?sslmode=require"
  key_vault_id = module.security.key_vault_id
  
  depends_on = [
    module.security
  ]
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "redis-connection-string"
  value        = module.redis.primary_connection_string
  key_vault_id = module.security.key_vault_id
  
  depends_on = [
    module.security
  ]
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = module.storage.primary_connection_string
  key_vault_id = module.security.key_vault_id
  
  depends_on = [
    module.security
  ]
}

resource "azurerm_key_vault_secret" "eventhub_connection_strings" {
  for_each = toset([
    "order-events",
    "payment-events",
    "inventory-events",
    "analytics-events"
  ])

  name         = "${each.key}-connection-string"
  value        = module.event_hub.connection_strings[each.key]
  key_vault_id = module.security.key_vault_id
  
  depends_on = [
    module.security
  ]
}
