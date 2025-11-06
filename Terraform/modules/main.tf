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

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatestorage"
    container_name       = "tfstate"
    key                  = "ecommerce.terraform.tfstate"
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

# ===================================================================
# RANDOM SUFFIX FOR GLOBALLY UNIQUE NAMES
# ===================================================================
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# ===================================================================
# RESOURCE GROUP
# ===================================================================
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location

  tags = merge(
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
# NETWORKING - VIRTUAL NETWORK
# ===================================================================
resource "azurerm_virtual_network" "main" {
  name                = "${var.project_name}-${var.environment}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

# Application Subnet
resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.app_subnet_address_prefix

  delegation {
    name = "app-service-delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Data Subnet
resource "azurerm_subnet" "data" {
  name                 = "data-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.data_subnet_address_prefix

  delegation {
    name = "postgres-delegation"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Cache Subnet
resource "azurerm_subnet" "cache" {
  name                 = "cache-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.cache_subnet_address_prefix
}

# API Management Subnet
resource "azurerm_subnet" "apim" {
  name                 = "apim-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.apim_subnet_address_prefix
}

# Network Security Group
resource "azurerm_network_security_group" "main" {
  name                = "${var.project_name}-${var.environment}-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = merge(
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
# POSTGRESQL FLEXIBLE SERVER
# ===================================================================
resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${var.project_name}-${var.environment}-psql-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password

  sku_name   = var.db_sku_name
  storage_mb = var.db_storage_mb
  version    = "14"

  backup_retention_days        = var.db_backup_retention_days
  geo_redundant_backup_enabled = var.environment == "production" ? true : false

  delegated_subnet_id = azurerm_subnet.data.id
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id

  high_availability {
    mode = var.environment == "production" ? "ZoneRedundant" : "Disabled"
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

# PostgreSQL Databases
resource "azurerm_postgresql_flexible_server_database" "auth_db" {
  name      = "auth_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "user_db" {
  name      = "user_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "product_db" {
  name      = "product_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "order_db" {
  name      = "order_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "payment_db" {
  name      = "payment_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "inventory_db" {
  name      = "inventory_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "analytics_db" {
  name      = "analytics_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.project_name}-${var.environment}-postgres-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

# ===================================================================
# REDIS CACHE
# ===================================================================
resource "azurerm_redis_cache" "main" {
  name                = "${var.project_name}-${var.environment}-redis-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  enable_non_ssl_port = var.environment == "dev"
  minimum_tls_version = "1.2"

  redis_configuration {
    enable_authentication = true
  }

  tags = merge(
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
# STORAGE ACCOUNT
# ===================================================================
resource "azurerm_storage_account" "main" {
  name                     = "${var.project_name}${var.environment}sa${random_string.suffix.result}"
  location                 = azurerm_resource_group.main.location
  resource_group_name      = azurerm_resource_group.main.name
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_replication_type

  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = var.environment == "production" ? true : false

    delete_retention_policy {
      days = 30
    }
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

# Storage Containers
resource "azurerm_storage_container" "product_images" {
  name                  = "product-images"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"
}

resource "azurerm_storage_container" "user_uploads" {
  name                  = "user-uploads"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "invoice_documents" {
  name                  = "invoice-documents"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "analytics_exports" {
  name                  = "analytics-exports"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "ml_models" {
  name                  = "ml-models"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# ===================================================================
# CONTAINER REGISTRY
# ===================================================================
resource "azurerm_container_registry" "main" {
  name                = "${var.project_name}${var.environment}acr${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.acr_sku
  admin_enabled       = var.environment == "dev"

  georeplications = var.environment == "production" ? [
    {
      location                = "westeurope"
      zone_redundancy_enabled = true
      tags                    = {}
    },
    {
      location                = "southeastasia"
      zone_redundancy_enabled = true
      tags                    = {}
    }
  ] : []

  tags = merge(
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
# EVENT HUB NAMESPACE
# ===================================================================
resource "azurerm_eventhub_namespace" "main" {
  name                = "${var.project_name}-${var.environment}-ehns-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.eventhub_sku
  capacity            = var.eventhub_capacity

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

# Event Hubs
resource "azurerm_eventhub" "order_events" {
  name                = "order-events"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.environment == "production" ? 8 : 2
  message_retention   = var.environment == "production" ? 7 : 1
}

resource "azurerm_eventhub" "payment_events" {
  name                = "payment-events"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.environment == "production" ? 8 : 2
  message_retention   = var.environment == "production" ? 7 : 1
}

resource "azurerm_eventhub" "inventory_events" {
  name                = "inventory-events"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.environment == "production" ? 4 : 2
  message_retention   = var.environment == "production" ? 3 : 1
}

resource "azurerm_eventhub" "analytics_events" {
  name                = "analytics-events"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.environment == "production" ? 16 : 2
  message_retention   = var.environment == "production" ? 7 : 1
}

# ===================================================================
# APPLICATION INSIGHTS
# ===================================================================
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-${var.environment}-law"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = var.appinsights_retention_days

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-${var.environment}-ai"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  tags = merge(
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
# KEY VAULT
# ===================================================================
resource "azurerm_key_vault" "main" {
  name                       = "${var.project_name}-${var.environment}-kv-${random_string.suffix.result}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 90
  purge_protection_enabled   = var.environment != "dev"

  access_policy {
    tenant_id = var.tenant_id
    object_id = var.key_vault_admin_object_id

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]

    key_permissions = [
      "Get", "List", "Create", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]
  }

  network_acls {
    bypass         = "AzureServices"
    default_action = var.environment == "production" ? "Deny" : "Allow"
  }

  tags = merge(
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
# APP SERVICE PLAN
# ===================================================================
resource "azurerm_service_plan" "main" {
  name                = "${var.project_name}-${var.environment}-asp"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.app_service_sku

  tags = merge(
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
# APP SERVICES - MICROSERVICES
# ===================================================================

# API Gateway
resource "azurerm_linux_web_app" "api_gateway" {
  name                = "${var.project_name}-${var.environment}-api-gateway"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/api-gateway"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "api-gateway"
    }
  )
}

# Auth Service
resource "azurerm_linux_web_app" "auth_service" {
  name                = "${var.project_name}-${var.environment}-auth-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/auth-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "auth-service"
    }
  )
}

# User Service
resource "azurerm_linux_web_app" "user_service" {
  name                = "${var.project_name}-${var.environment}-user-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/user-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "user-service"
    }
  )
}

# Product Service
resource "azurerm_linux_web_app" "product_service" {
  name                = "${var.project_name}-${var.environment}-product-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/product-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "product-service"
    }
  )
}

# Order Service
resource "azurerm_linux_web_app" "order_service" {
  name                = "${var.project_name}-${var.environment}-order-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/order-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "order-service"
    }
  )
}

# Payment Service
resource "azurerm_linux_web_app" "payment_service" {
  name                = "${var.project_name}-${var.environment}-payment-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/payment-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "payment-service"
    }
  )
}

# Inventory Service
resource "azurerm_linux_web_app" "inventory_service" {
  name                = "${var.project_name}-${var.environment}-inventory-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/inventory-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "inventory-service"
    }
  )
}

# Shipping Service
resource "azurerm_linux_web_app" "shipping_service" {
  name                = "${var.project_name}-${var.environment}-shipping-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/shipping-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "shipping-service"
    }
  )
}

# Notification Service
resource "azurerm_linux_web_app" "notification_service" {
  name                = "${var.project_name}-${var.environment}-notification-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/notification-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "notification-service"
    }
  )
}

# Search Service
resource "azurerm_linux_web_app" "search_service" {
  name                = "${var.project_name}-${var.environment}-search-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/search-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "search-service"
    }
  )
}

# Analytics Service
resource "azurerm_linux_web_app" "analytics_service" {
  name                = "${var.project_name}-${var.environment}-analytics-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/analytics-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "analytics-service"
    }
  )
}

# AI Service
resource "azurerm_linux_web_app" "ai_service" {
  name                = "${var.project_name}-${var.environment}-ai-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/ai-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "ai-service"
    }
  )
}

# Vendor Service
resource "azurerm_linux_web_app" "vendor_service" {
  name                = "${var.project_name}-${var.environment}-vendor-service"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment != "dev"

    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/vendor-service"
      docker_image_tag = var.docker_image_tag
    }

    health_check_path = "/health"
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.main.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "POSTGRES_HOST"                              = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"                              = "5432"
    "POSTGRES_SSL_MODE"                          = "require"
    "REDIS_HOST"                                 = azurerm_redis_cache.main.hostname
    "REDIS_PORT"                                 = azurerm_redis_cache.main.ssl_port
    "REDIS_SSL"                                  = "true"
    "EVENTHUB_NAMESPACE"                         = azurerm_eventhub_namespace.main.name
    "STORAGE_ACCOUNT_NAME"                       = azurerm_storage_account.main.name
    "KEY_VAULT_URI"                              = azurerm_key_vault.main.vault_uri
    "ENVIRONMENT"                                = var.environment
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME"            = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD"            = azurerm_container_registry.main.admin_password
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
      Service     = "vendor-service"
    }
  )
}

# ===================================================================
# AZURE FRONT DOOR
# ===================================================================
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.project_name}-${var.environment}-fd-profile"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = var.frontdoor_sku

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.project_name}-${var.environment}-fd-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  )
}

resource "azurerm_cdn_frontdoor_origin_group" "main" {
  name                     = "${var.project_name}-${var.environment}-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }

  health_probe {
    path                = "/health"
    protocol            = "Https"
    interval_in_seconds = 30
    request_type        = "GET"
  }
}

resource "azurerm_cdn_frontdoor_origin" "main" {
  name                          = "${var.project_name}-${var.environment}-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  enabled                       = true

  host_name          = azurerm_linux_web_app.api_gateway.default_hostname
  http_port          = 80
  https_port         = 443
  origin_host_header = azurerm_linux_web_app.api_gateway.default_hostname
  priority           = 1
  weight             = 1000
}

resource "azurerm_cdn_frontdoor_route" "main" {
  name                          = "${var.project_name}-${var.environment}-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.main.id]

  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpsOnly"
  link_to_default_domain = true
  https_redirect_enabled = true
}

# ===================================================================
# KEY VAULT SECRETS
# ===================================================================
resource "azurerm_key_vault_secret" "db_connection_string_auth" {
  name         = "auth-db-connection-string"
  value        = "postgresql://${var.db_admin_username}@${azurerm_postgresql_flexible_server.main.name}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/auth_db?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_connection_string_user" {
  name         = "user-db-connection-string"
  value        = "postgresql://${var.db_admin_username}@${azurerm_postgresql_flexible_server.main.name}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/user_db?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_connection_string_product" {
  name         = "product-db-connection-string"
  value        = "postgresql://${var.db_admin_username}@${azurerm_postgresql_flexible_server.main.name}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/product_db?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_connection_string_order" {
  name         = "order-db-connection-string"
  value        = "postgresql://${var.db_admin_username}@${azurerm_postgresql_flexible_server.main.name}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/order_db?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_connection_string_payment" {
  name         = "payment-db-connection-string"
  value        = "postgresql://${var.db_admin_username}@${azurerm_postgresql_flexible_server.main.name}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/payment_db?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_connection_string_inventory" {
  name         = "inventory-db-connection-string"
  value        = "postgresql://${var.db_admin_username}@${azurerm_postgresql_flexible_server.main.name}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/inventory_db?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_connection_string_analytics" {
  name         = "analytics-db-connection-string"
  value        = "postgresql://${var.db_admin_username}@${azurerm_postgresql_flexible_server.main.name}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/analytics_db?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "redis-connection-string"
  value        = azurerm_redis_cache.main.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.main.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "eventhub_connection_string" {
  name         = "eventhub-connection-string"
  value        = azurerm_eventhub_namespace.main.default_primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}
