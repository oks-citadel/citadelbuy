# Asia-Pacific Region Infrastructure
# Primary: Southeast Asia (Singapore)
# Secondary: Australia East (Sydney)
# Tertiary: Japan East (Tokyo)

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "citadelbuy-terraform-state"
    storage_account_name = "citadelbuytfstate"
    container_name       = "tfstate"
    key                  = "asia/terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

# Local variables
locals {
  environment       = "prod"
  project_name      = "citadelbuy"
  primary_region    = "southeastasia"  # Singapore
  secondary_region  = "australiaeast"  # Sydney
  tertiary_region   = "japaneast"      # Tokyo

  common_tags = {
    Project     = "CitadelBuy"
    Environment = local.environment
    Region      = "Asia-Pacific"
    ManagedBy   = "Terraform"
    CostCenter  = "APAC-Operations"
    Compliance  = "GDPR,PDPA,APPI"  # Singapore PDPA, Japan APPI
  }
}

# Primary Resource Group - Southeast Asia (Singapore)
resource "azurerm_resource_group" "primary" {
  name     = "${local.project_name}-${local.environment}-apac-primary-rg"
  location = local.primary_region

  tags = merge(
    local.common_tags,
    {
      Name        = "${local.project_name}-${local.environment}-apac-primary-rg"
      RegionType  = "Primary"
      DataCenter  = "Singapore"
    }
  )
}

# Secondary Resource Group - Australia East (Sydney)
resource "azurerm_resource_group" "secondary" {
  name     = "${local.project_name}-${local.environment}-apac-secondary-rg"
  location = local.secondary_region

  tags = merge(
    local.common_tags,
    {
      Name        = "${local.project_name}-${local.environment}-apac-secondary-rg"
      RegionType  = "Secondary"
      DataCenter  = "Sydney"
    }
  )
}

# Tertiary Resource Group - Japan East (Tokyo)
resource "azurerm_resource_group" "tertiary" {
  name     = "${local.project_name}-${local.environment}-apac-tertiary-rg"
  location = local.tertiary_region

  tags = merge(
    local.common_tags,
    {
      Name        = "${local.project_name}-${local.environment}-apac-tertiary-rg"
      RegionType  = "Tertiary"
      DataCenter  = "Tokyo"
    }
  )
}

# Networking Module - Primary Region (Singapore)
module "networking_primary" {
  source = "../../modules/networking"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_cidr          = var.primary_vnet_cidr
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true

  tags = local.common_tags
}

# Networking Module - Secondary Region (Sydney)
module "networking_secondary" {
  source = "../../modules/networking"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-secondary"
  location            = local.secondary_region
  resource_group_name = azurerm_resource_group.secondary.name

  vnet_cidr          = var.secondary_vnet_cidr
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true

  tags = local.common_tags
}

# Networking Module - Tertiary Region (Tokyo)
module "networking_tertiary" {
  source = "../../modules/networking"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-tertiary"
  location            = local.tertiary_region
  resource_group_name = azurerm_resource_group.tertiary.name

  vnet_cidr          = var.tertiary_vnet_cidr
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true

  tags = local.common_tags
}

# VNet Peering - Primary to Secondary
resource "azurerm_virtual_network_peering" "primary_to_secondary" {
  name                      = "apac-primary-to-secondary"
  resource_group_name       = azurerm_resource_group.primary.name
  virtual_network_name      = module.networking_primary.vnet_name
  remote_virtual_network_id = module.networking_secondary.vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

resource "azurerm_virtual_network_peering" "secondary_to_primary" {
  name                      = "apac-secondary-to-primary"
  resource_group_name       = azurerm_resource_group.secondary.name
  virtual_network_name      = module.networking_secondary.vnet_name
  remote_virtual_network_id = module.networking_primary.vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

# VNet Peering - Primary to Tertiary
resource "azurerm_virtual_network_peering" "primary_to_tertiary" {
  name                      = "apac-primary-to-tertiary"
  resource_group_name       = azurerm_resource_group.primary.name
  virtual_network_name      = module.networking_primary.vnet_name
  remote_virtual_network_id = module.networking_tertiary.vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

resource "azurerm_virtual_network_peering" "tertiary_to_primary" {
  name                      = "apac-tertiary-to-primary"
  resource_group_name       = azurerm_resource_group.tertiary.name
  virtual_network_name      = module.networking_tertiary.vnet_name
  remote_virtual_network_id = module.networking_primary.vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

# AKS Cluster - Primary Region (Singapore)
module "compute_primary" {
  source = "../../modules/compute"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_id            = module.networking_primary.vnet_id
  aks_subnet_id      = module.networking_primary.aks_subnet_id
  aci_subnet_id      = module.networking_primary.aci_subnet_id

  aks_node_count     = var.aks_node_count
  aks_node_vm_size   = var.aks_node_vm_size
  enable_auto_scaling = true
  min_node_count     = var.min_node_count
  max_node_count     = var.max_node_count

  tags = local.common_tags
}

# AKS Cluster - Secondary Region (Sydney)
module "compute_secondary" {
  source = "../../modules/compute"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-secondary"
  location            = local.secondary_region
  resource_group_name = azurerm_resource_group.secondary.name

  vnet_id            = module.networking_secondary.vnet_id
  aks_subnet_id      = module.networking_secondary.aks_subnet_id
  aci_subnet_id      = module.networking_secondary.aci_subnet_id

  aks_node_count     = var.aks_node_count
  aks_node_vm_size   = var.aks_node_vm_size
  enable_auto_scaling = true
  min_node_count     = var.min_node_count
  max_node_count     = var.max_node_count

  tags = local.common_tags
}

# Database Module - Primary Region with Multi-Region Replication
module "database_primary" {
  source = "../../modules/database"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_id             = module.networking_primary.vnet_id
  database_subnet_ids = module.networking_primary.database_subnet_ids

  postgresql_sku_name        = var.postgresql_sku_name
  postgresql_storage_mb      = var.postgresql_storage_mb
  postgresql_version         = "14"
  enable_high_availability   = true
  enable_geo_replication     = true
  geo_backup_location        = local.secondary_region

  # Data residency for APAC
  backup_retention_days      = 35
  geo_redundant_backup       = true

  tags = local.common_tags
}

# Database Module - Secondary Region (Read Replica)
module "database_secondary" {
  source = "../../modules/database"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-secondary"
  location            = local.secondary_region
  resource_group_name = azurerm_resource_group.secondary.name

  vnet_id             = module.networking_secondary.vnet_id
  database_subnet_ids = module.networking_secondary.database_subnet_ids

  postgresql_sku_name        = var.postgresql_sku_name
  postgresql_storage_mb      = var.postgresql_storage_mb
  postgresql_version         = "14"
  enable_high_availability   = true

  backup_retention_days      = 35
  geo_redundant_backup       = true

  tags = local.common_tags
}

# Storage Module - Primary Region with APAC-specific configuration
module "storage_primary" {
  source = "../../modules/storage"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  account_tier             = "Standard"
  account_replication_type = "GZRS"  # Geo-zone-redundant for APAC
  enable_https_only        = true
  enable_blob_encryption   = true

  # Data residency requirements
  allow_nested_items_to_be_public = false
  enable_versioning               = true
  retention_days                  = 90

  tags = local.common_tags
}

# Security Module - Key Vault for APAC Region
module "security_primary" {
  source = "../../modules/security"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_id             = module.networking_primary.vnet_id
  subnet_ids          = module.networking_primary.private_subnet_ids

  enable_purge_protection = true
  soft_delete_retention_days = 90

  # PDPA/APPI compliance
  enable_rbac_authorization = true

  tags = local.common_tags
}

# Monitoring Module - APAC Region
module "monitoring_primary" {
  source = "../../modules/monitoring"

  project_name        = local.project_name
  environment         = "${local.environment}-apac-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  retention_in_days = 90

  # Alert configuration for APAC region
  alert_email_addresses = var.alert_email_addresses

  tags = local.common_tags
}

# Traffic Manager for Multi-Region Load Balancing (APAC-focused)
resource "azurerm_traffic_manager_profile" "apac" {
  name                   = "${local.project_name}-${local.environment}-apac-tm"
  resource_group_name    = azurerm_resource_group.primary.name
  traffic_routing_method = "Performance"  # Route to fastest endpoint

  dns_config {
    relative_name = "${local.project_name}-apac"
    ttl           = 30
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }

  tags = local.common_tags
}

# Traffic Manager Endpoint - Singapore
resource "azurerm_traffic_manager_azure_endpoint" "singapore" {
  name               = "singapore-endpoint"
  profile_id         = azurerm_traffic_manager_profile.apac.id
  target_resource_id = module.compute_primary.aks_id
  priority           = 1
  weight             = 100

  geo_mappings = [
    "SG",  # Singapore
    "MY",  # Malaysia
    "TH",  # Thailand
    "VN",  # Vietnam
    "ID",  # Indonesia
    "PH",  # Philippines
  ]
}

# Traffic Manager Endpoint - Sydney
resource "azurerm_traffic_manager_azure_endpoint" "sydney" {
  name               = "sydney-endpoint"
  profile_id         = azurerm_traffic_manager_profile.apac.id
  target_resource_id = module.compute_secondary.aks_id
  priority           = 2
  weight             = 100

  geo_mappings = [
    "AU",  # Australia
    "NZ",  # New Zealand
  ]
}

# Application Insights for APAC Region
resource "azurerm_application_insights" "apac" {
  name                = "${local.project_name}-${local.environment}-apac-appinsights"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name
  application_type    = "web"
  workspace_id        = module.monitoring_primary.log_analytics_workspace_id

  tags = local.common_tags
}

# Cosmos DB for Multi-Region, Low-Latency Data Access
resource "azurerm_cosmosdb_account" "apac" {
  name                = "${local.project_name}-${local.environment}-apac-cosmos"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  enable_automatic_failover = true
  enable_multiple_write_locations = true

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  # Multi-region replication
  geo_location {
    location          = local.primary_region
    failover_priority = 0
  }

  geo_location {
    location          = local.secondary_region
    failover_priority = 1
  }

  geo_location {
    location          = local.tertiary_region
    failover_priority = 2
  }

  tags = local.common_tags
}

# Azure Cache for Redis - APAC Premium with Geo-Replication
resource "azurerm_redis_cache" "apac" {
  name                = "${local.project_name}-${local.environment}-apac-redis"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name
  capacity            = 2
  family              = "P"  # Premium
  sku_name            = "Premium"

  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    enable_authentication = true
  }

  zones = ["1", "2", "3"]

  tags = local.common_tags
}

# Data Residency Policy - Ensure data stays in APAC
resource "azurerm_policy_assignment" "data_residency" {
  name                 = "${local.project_name}-apac-data-residency"
  scope                = azurerm_resource_group.primary.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c"  # Allowed locations policy

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = [
        local.primary_region,
        local.secondary_region,
        local.tertiary_region
      ]
    }
  })
}
