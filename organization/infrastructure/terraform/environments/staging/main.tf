# Staging Environment Configuration
# Broxiva E-commerce Platform - Azure Infrastructure

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "broxiva-tfstate-rg"
    storage_account_name = "broxivatfstate"
    container_name       = "tfstate"
    key                  = "staging.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

provider "azuread" {
  tenant_id = var.tenant_id
}

# ============================================
# Local Variables
# ============================================
locals {
  project_name = "broxiva"
  environment  = "staging"
  location     = "eastus"

  tags = {
    Project     = "Broxiva"
    Environment = "Staging"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
    Owner       = "Platform Team"
  }
}

# ============================================
# Resource Group
# ============================================
resource "azurerm_resource_group" "main" {
  name     = "${local.project_name}-${local.environment}-rg"
  location = local.location
  tags     = local.tags
}

# ============================================
# Networking Module
# ============================================
module "networking" {
  source = "../../modules/networking"

  project_name       = local.project_name
  environment        = local.environment
  location           = local.location
  resource_group_name = azurerm_resource_group.main.name

  vnet_cidr          = "10.1.0.0/16"  # Different CIDR from prod
  availability_zones = ["1", "2"]
  enable_nat_gateway = true
  log_retention_days = 30

  tags = local.tags
}

# ============================================
# Database Module
# ============================================
module "database" {
  source = "../../modules/database"

  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name

  # PostgreSQL Configuration (smaller for staging)
  postgres_sku_name           = "GP_Standard_D2s_v3"
  postgres_storage_mb         = 32768 # 32GB
  postgres_version            = "15"
  postgres_backup_retention   = 7
  postgres_geo_redundant      = false
  postgres_high_availability  = false
  database_subnet_id          = module.networking.database_subnet_ids[0]
  private_dns_zone_id         = module.networking.postgresql_private_dns_zone_id

  # Redis Configuration (smaller for staging)
  redis_sku_name     = "Standard"
  redis_family       = "C"
  redis_capacity     = 1
  redis_shard_count  = 0
  redis_subnet_id    = null

  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password

  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id

  tags = local.tags
}

# ============================================
# Compute Module
# ============================================
module "compute" {
  source = "../../modules/compute"

  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name

  # AKS Configuration (smaller for staging)
  kubernetes_version  = "1.28"
  aks_subnet_id       = module.networking.aks_subnet_id
  aks_admin_group_ids = var.aks_admin_group_ids

  system_node_count = 2
  system_node_size  = "Standard_DS2_v2"
  system_node_min   = 2
  system_node_max   = 3

  user_node_size = "Standard_DS2_v2"
  user_node_min  = 1
  user_node_max  = 5

  enable_spot_nodes = false

  # ACR Configuration (no geo-replication for staging)
  acr_geo_replications = []
  allowed_ip_ranges    = var.allowed_ip_ranges

  # App Service disabled for staging (AKS only)
  enable_app_service = false

  app_insights_connection_string = module.monitoring.app_insights_connection_string
  log_analytics_workspace_id     = module.monitoring.log_analytics_workspace_id

  tags = local.tags
}

# ============================================
# Security Module
# ============================================
module "security" {
  source = "../../modules/security"

  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = var.tenant_id
  subscription_id     = var.subscription_id

  # Network Configuration
  allowed_ip_ranges  = var.allowed_ip_ranges
  blocked_ip_ranges  = []
  allowed_subnet_ids = concat(
    module.networking.private_subnet_ids,
    [module.networking.aks_subnet_id]
  )

  # Identity
  aks_identity_principal_id = module.compute.aks_identity_principal_id
  app_service_principal_id  = ""

  # Secrets
  database_connection_string = module.database.postgresql_connection_string
  redis_connection_string    = module.database.redis_connection_string
  jwt_secret                 = var.jwt_secret

  # WAF Configuration (less strict for staging)
  enable_geo_filtering = false
  blocked_countries    = []

  # Security Features (some disabled for staging)
  enable_ddos_protection   = false
  enable_defender          = true
  enable_private_endpoints = true
  private_endpoint_subnet_id    = module.networking.private_subnet_ids[0]
  keyvault_private_dns_zone_id  = module.networking.keyvault_private_dns_zone_id

  tags = local.tags
}

# ============================================
# Monitoring Module
# ============================================
module "monitoring" {
  source = "../../modules/monitoring"

  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name

  log_retention_days = 30

  # Alert Recipients
  oncall_email            = var.oncall_email
  team_email              = var.team_email
  additional_alert_emails = []
  pagerduty_webhook_url   = ""
  slack_webhook_url       = var.slack_webhook_url

  # Alert Thresholds (more lenient for staging)
  response_time_threshold_ms = 3000
  failed_requests_threshold  = 20
  exceptions_threshold       = 100
  error_spike_threshold      = 100

  # Resources to Monitor
  aks_cluster_id = module.compute.aks_id
  database_id    = module.database.postgresql_server_id
  app_url        = "https://staging.broxiva.com"

  tags = local.tags
}

# ============================================
# Storage Module
# ============================================
module "storage" {
  source = "../../modules/storage"

  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name

  account_tier             = "Standard"
  account_replication_type = "LRS"  # Local redundancy only for staging
  enable_versioning        = true
  enable_soft_delete       = true
  soft_delete_days         = 7

  # No CDN for staging
  enable_cdn = false

  allowed_subnet_ids = module.networking.private_subnet_ids

  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id

  tags = local.tags
}
