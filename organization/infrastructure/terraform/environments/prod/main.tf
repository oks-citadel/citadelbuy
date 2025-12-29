# Production Environment Configuration
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
    key                  = "prod.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
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
  environment  = "prod"
  location     = "eastus"

  tags = {
    Project     = "Broxiva"
    Environment = "Production"
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

  vnet_cidr          = "10.0.0.0/16"
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true
  log_retention_days = 90

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

  # PostgreSQL Configuration
  postgres_sku_name           = "GP_Standard_D4s_v3"
  postgres_storage_mb         = 131072 # 128GB
  postgres_version            = "15"
  postgres_backup_retention   = 35
  postgres_geo_redundant      = true
  postgres_high_availability  = true
  database_subnet_id          = module.networking.database_subnet_ids[0]
  private_dns_zone_id         = module.networking.postgresql_private_dns_zone_id

  # Redis Configuration
  redis_sku_name     = "Premium"
  redis_family       = "P"
  redis_capacity     = 1
  redis_shard_count  = 2
  redis_subnet_id    = module.networking.private_subnet_ids[0]

  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password

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

  # AKS Configuration
  kubernetes_version  = "1.28"
  aks_subnet_id       = module.networking.aks_subnet_id
  aks_admin_group_ids = var.aks_admin_group_ids

  system_node_count = 3
  system_node_size  = "Standard_DS3_v2"
  system_node_min   = 3
  system_node_max   = 5

  user_node_size = "Standard_DS4_v2"
  user_node_min  = 3
  user_node_max  = 20

  enable_spot_nodes = true
  spot_node_size    = "Standard_DS4_v2"
  spot_node_max     = 10

  # ACR Configuration
  acr_geo_replications = [
    { location = "westus2", zone_redundancy = true },
    { location = "westeurope", zone_redundancy = true }
  ]
  allowed_ip_ranges = var.allowed_ip_ranges

  # App Service (backup/alternative)
  enable_app_service = true
  app_service_sku    = "P2v3"
  api_url            = "https://api.broxiva.com"
  staging_api_url    = "https://staging-api.broxiva.com"
  front_door_id      = module.security.front_door_profile_uuid

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
  blocked_ip_ranges  = var.blocked_ip_ranges
  allowed_subnet_ids = concat(
    module.networking.private_subnet_ids,
    [module.networking.aks_subnet_id]
  )

  # Identity
  aks_identity_principal_id = module.compute.aks_identity_principal_id
  app_service_principal_id  = module.compute.app_service_principal_id

  # Secrets
  database_connection_string = module.database.postgresql_connection_string
  redis_connection_string    = module.database.redis_connection_string
  jwt_secret                 = var.jwt_secret

  # WAF Configuration
  enable_geo_filtering = true
  blocked_countries    = var.blocked_countries

  # Security Features
  enable_ddos_protection   = true
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

  log_retention_days = 90

  # Alert Recipients
  oncall_email            = var.oncall_email
  team_email              = var.team_email
  additional_alert_emails = var.additional_alert_emails
  pagerduty_webhook_url   = var.pagerduty_webhook_url
  slack_webhook_url       = var.slack_webhook_url

  # Alert Thresholds (stricter for prod)
  response_time_threshold_ms = 1500
  failed_requests_threshold  = 5
  exceptions_threshold       = 25
  error_spike_threshold      = 50

  # Resources to Monitor
  aks_cluster_id = module.compute.aks_id
  database_id    = module.database.postgresql_server_id
  app_url        = "https://broxiva.com"

  tags = local.tags
}

# ============================================
# Storage Module (for static assets, backups)
# ============================================
module "storage" {
  source = "../../modules/storage"

  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name

  account_tier             = "Standard"
  account_replication_type = "GRS"
  enable_versioning        = true
  enable_soft_delete       = true
  soft_delete_days         = 90

  # CDN for static assets
  enable_cdn        = true
  cdn_sku           = "Premium_AzureFrontDoor"
  custom_domain     = "cdn.broxiva.com"

  allowed_subnet_ids = module.networking.private_subnet_ids

  tags = local.tags
}

# ============================================
# DNS Module - Azure DNS Zone for broxiva.com
# ============================================
module "dns" {
  source = "../../modules/dns"

  domain_name         = "broxiva.com"
  resource_group_name = azurerm_resource_group.main.name

  # Front Door Configuration
  front_door_hostname = module.security.front_door_endpoint_hostname
  use_cname_for_www   = true

  # API and CDN Endpoints
  api_hostname     = module.compute.app_service_hostname
  cdn_hostname     = module.storage.cdn_endpoint_hostname
  staging_hostname = module.compute.staging_app_service_hostname
  staging_api_hostname = module.compute.staging_api_hostname

  # Email Configuration
  enable_email_records = true
  # MX records default to Google Workspace
  # SPF, DKIM, DMARC records will be created with defaults

  # Security
  enable_caa_records = true

  # Domain Verification (to be populated after Azure generates the code)
  azure_verification_code = var.azure_verification_code

  tags = merge(local.tags, {
    Domain = "broxiva.com"
    Purpose = "Primary DNS Zone"
  })
}
