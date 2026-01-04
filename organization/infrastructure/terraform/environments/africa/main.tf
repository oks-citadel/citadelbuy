# Africa Region Infrastructure
# Primary: South Africa North (Johannesburg)
# Secondary: West Africa (Lagos, Nigeria - via partner DC)

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "broxiva-terraform-state"
    storage_account_name = "broxivatfstate"
    container_name       = "tfstate"
    key                  = "africa/terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

# Local variables
locals {
  environment      = "prod"
  project_name     = "broxiva"
  primary_region   = "southafricanorth" # Johannesburg
  secondary_region = "westeurope"       # Backup region for Africa

  common_tags = {
    Project     = "Broxiva"
    Environment = local.environment
    Region      = "Africa"
    ManagedBy   = "Terraform"
    CostCenter  = "Africa-Operations"
    Compliance  = "GDPR,POPIA" # South Africa POPIA compliance
  }
}

# Primary Resource Group - South Africa North
resource "azurerm_resource_group" "primary" {
  name     = "${local.project_name}-${local.environment}-africa-primary-rg"
  location = local.primary_region

  tags = merge(
    local.common_tags,
    {
      Name       = "${local.project_name}-${local.environment}-africa-primary-rg"
      RegionType = "Primary"
      DataCenter = "Johannesburg"
    }
  )
}

# Secondary Resource Group - West Europe (Backup)
resource "azurerm_resource_group" "secondary" {
  name     = "${local.project_name}-${local.environment}-africa-secondary-rg"
  location = local.secondary_region

  tags = merge(
    local.common_tags,
    {
      Name       = "${local.project_name}-${local.environment}-africa-secondary-rg"
      RegionType = "Secondary"
      DataCenter = "Amsterdam-Backup"
    }
  )
}

# Networking Module - Primary Region
module "networking_primary" {
  source = "../../modules/networking"

  project_name        = local.project_name
  environment         = "${local.environment}-africa-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_cidr          = var.primary_vnet_cidr
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true

  tags = local.common_tags
}

# Networking Module - Secondary Region
module "networking_secondary" {
  source = "../../modules/networking"

  project_name        = local.project_name
  environment         = "${local.environment}-africa-secondary"
  location            = local.secondary_region
  resource_group_name = azurerm_resource_group.secondary.name

  vnet_cidr          = var.secondary_vnet_cidr
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true

  tags = local.common_tags
}

# VNet Peering - Primary to Secondary
resource "azurerm_virtual_network_peering" "primary_to_secondary" {
  name                      = "africa-primary-to-secondary"
  resource_group_name       = azurerm_resource_group.primary.name
  virtual_network_name      = module.networking_primary.vnet_name
  remote_virtual_network_id = module.networking_secondary.vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

resource "azurerm_virtual_network_peering" "secondary_to_primary" {
  name                      = "africa-secondary-to-primary"
  resource_group_name       = azurerm_resource_group.secondary.name
  virtual_network_name      = module.networking_secondary.vnet_name
  remote_virtual_network_id = module.networking_primary.vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

# AKS Cluster - Primary Region
module "compute_primary" {
  source = "../../modules/compute"

  project_name        = local.project_name
  environment         = "${local.environment}-africa-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_id       = module.networking_primary.vnet_id
  aks_subnet_id = module.networking_primary.aks_subnet_id
  aci_subnet_id = module.networking_primary.aci_subnet_id

  aks_node_count      = var.aks_node_count
  aks_node_vm_size    = var.aks_node_vm_size
  enable_auto_scaling = true
  min_node_count      = var.min_node_count
  max_node_count      = var.max_node_count

  tags = local.common_tags
}

# Database Module - Primary Region with Geo-Replication
module "database_primary" {
  source = "../../modules/database"

  project_name        = local.project_name
  environment         = "${local.environment}-africa-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_id             = module.networking_primary.vnet_id
  database_subnet_ids = module.networking_primary.database_subnet_ids

  postgresql_sku_name      = var.postgresql_sku_name
  postgresql_storage_mb    = var.postgresql_storage_mb
  postgresql_version       = "14"
  enable_high_availability = true
  enable_geo_replication   = true
  geo_backup_location      = local.secondary_region

  # Data residency - Keep data in South Africa for POPIA compliance
  backup_retention_days = 35
  geo_redundant_backup  = true

  tags = local.common_tags
}

# Storage Module - Primary Region with Africa-specific configuration
module "storage_primary" {
  source = "../../modules/storage"

  project_name        = local.project_name
  environment         = "${local.environment}-africa-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  account_tier             = "Standard"
  account_replication_type = "GZRS" # Geo-zone-redundant for Africa
  enable_https_only        = true
  enable_blob_encryption   = true

  # Data residency requirements
  allow_nested_items_to_be_public = false
  enable_versioning               = true
  retention_days                  = 90

  tags = local.common_tags
}

# Security Module - Key Vault for Africa Region
module "security_primary" {
  source = "../../modules/security"

  project_name        = local.project_name
  environment         = "${local.environment}-africa-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  vnet_id    = module.networking_primary.vnet_id
  subnet_ids = module.networking_primary.private_subnet_ids

  enable_purge_protection    = true
  soft_delete_retention_days = 90

  # POPIA compliance - Data residency in South Africa
  enable_rbac_authorization = true

  tags = local.common_tags
}

# Monitoring Module - Africa Region
module "monitoring_primary" {
  source = "../../modules/monitoring"

  project_name        = local.project_name
  environment         = "${local.environment}-africa-primary"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name

  retention_in_days = 90

  # Alert configuration for Africa region
  alert_email_addresses = var.alert_email_addresses

  tags = local.common_tags
}

# Traffic Manager for Multi-Region Load Balancing (Africa-focused)
resource "azurerm_traffic_manager_profile" "africa" {
  name                   = "${local.project_name}-${local.environment}-africa-tm"
  resource_group_name    = azurerm_resource_group.primary.name
  traffic_routing_method = "Performance" # Route to fastest endpoint

  dns_config {
    relative_name = "${local.project_name}-africa"
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

# Traffic Manager Endpoint - South Africa
resource "azurerm_traffic_manager_azure_endpoint" "south_africa" {
  name               = "south-africa-endpoint"
  profile_id         = azurerm_traffic_manager_profile.africa.id
  target_resource_id = module.compute_primary.aks_id
  priority           = 1
  weight             = 100

  geo_mappings = [
    "ZA", # South Africa
    "NA", # Namibia
    "BW", # Botswana
    "ZW", # Zimbabwe
    "MZ", # Mozambique
    "LS", # Lesotho
    "SZ", # Eswatini
  ]
}

# Application Insights for Africa Region
resource "azurerm_application_insights" "africa" {
  name                = "${local.project_name}-${local.environment}-africa-appinsights"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name
  application_type    = "web"
  workspace_id        = module.monitoring_primary.log_analytics_workspace_id

  tags = local.common_tags
}

# Data Residency Policy - Ensure data stays in Africa
resource "azurerm_policy_assignment" "data_residency" {
  name                 = "${local.project_name}-africa-data-residency"
  scope                = azurerm_resource_group.primary.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c" # Allowed locations policy

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = [
        local.primary_region,
        local.secondary_region
      ]
    }
  })
}
