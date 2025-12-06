# Development Environment Configuration
# CitadelBuy E-commerce Platform - Multi-Cloud Infrastructure

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "citadelbuy-tfstate-rg"
    storage_account_name = "citadelbuytfstate"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
}

provider "aws" {
  region = var.aws_region
}

# ============================================
# Local Variables
# ============================================
locals {
  project_name     = "citadelbuy"
  environment      = "dev"
  cloud_provider   = var.cloud_provider # "azure" or "aws"
  location         = var.cloud_provider == "azure" ? "eastus" : null
  aws_region       = var.cloud_provider == "aws" ? var.aws_region : null

  tags = {
    Project     = "CitadelBuy"
    Environment = "Development"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
    Owner       = "Development Team"
  }
}

# ============================================
# Resource Group (Azure) or use existing VPC (AWS)
# ============================================
resource "azurerm_resource_group" "main" {
  count    = var.cloud_provider == "azure" ? 1 : 0
  name     = "${local.project_name}-${local.environment}-rg"
  location = local.location
  tags     = local.tags
}

# ============================================
# Networking Module
# ============================================
module "networking" {
  source = "../../modules/networking"

  cloud_provider      = local.cloud_provider
  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  region              = local.aws_region
  resource_group_name = var.cloud_provider == "azure" ? azurerm_resource_group.main[0].name : ""

  vnet_cidr          = "10.1.0.0/16"
  vpc_cidr           = "10.1.0.0/16"
  availability_zones = ["1", "2"]
  enable_nat_gateway = false # Disabled in dev to save costs
  enable_flow_logs   = false # Disabled in dev
  log_retention_days = 7

  tags = local.tags
}

# ============================================
# Database Module
# ============================================
module "database" {
  source = "../../modules/database"

  cloud_provider      = local.cloud_provider
  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = var.cloud_provider == "azure" ? azurerm_resource_group.main[0].name : ""

  # Azure PostgreSQL Configuration
  postgres_sku_name          = "B_Standard_B1ms" # Burstable tier for dev
  postgres_storage_mb        = 32768             # 32GB
  postgres_version           = "15"
  postgres_backup_retention  = 7
  postgres_geo_redundant     = false
  postgres_high_availability = false
  database_subnet_id         = var.cloud_provider == "azure" ? module.networking.database_subnet_ids[0] : null
  private_dns_zone_id        = var.cloud_provider == "azure" ? module.networking.postgresql_private_dns_zone_id : null

  # AWS RDS Configuration
  vpc_id                       = var.cloud_provider == "aws" ? module.networking.vpc_id : ""
  database_subnet_ids          = var.cloud_provider == "aws" ? module.networking.database_subnet_ids : []
  allowed_security_group_ids   = var.cloud_provider == "aws" ? [module.networking.app_security_group_id] : []
  rds_instance_class           = "db.t3.small"
  postgres_storage_gb          = 20
  postgres_max_storage_gb      = 100
  create_read_replica          = false

  # Azure Redis Configuration
  redis_sku_name  = "Basic"
  redis_family    = "C"
  redis_capacity  = 0 # 250MB
  redis_subnet_id = null

  # AWS ElastiCache Configuration
  redis_subnet_ids          = var.cloud_provider == "aws" ? module.networking.private_subnet_ids : []
  redis_node_type           = "cache.t3.micro"
  redis_num_cache_nodes     = 1
  redis_snapshot_retention_days = 1

  administrator_login    = "citadeladmin"
  administrator_password = var.db_admin_password

  tags = local.tags
}

# ============================================
# Compute Module
# ============================================
module "compute" {
  source = "../../modules/compute"

  cloud_provider      = local.cloud_provider
  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  region              = local.aws_region
  resource_group_name = var.cloud_provider == "azure" ? azurerm_resource_group.main[0].name : ""

  # Kubernetes Configuration
  kubernetes_version = "1.28"

  # Azure AKS Configuration
  aks_subnet_id       = var.cloud_provider == "azure" ? module.networking.aks_subnet_id : null
  aks_admin_group_ids = var.aks_admin_group_ids

  # AWS EKS Configuration
  vpc_id          = var.cloud_provider == "aws" ? module.networking.vpc_id : ""
  eks_subnet_ids  = var.cloud_provider == "aws" ? module.networking.private_subnet_ids : []
  eks_public_access = var.cloud_provider == "aws" ? true : null

  # Node Configuration (smaller for dev)
  system_node_count = 1
  system_node_size  = var.cloud_provider == "azure" ? "Standard_B2s" : "t3.medium"
  system_node_min   = 1
  system_node_max   = 2

  user_node_size = var.cloud_provider == "azure" ? "Standard_B2ms" : "t3.medium"
  user_node_min  = 1
  user_node_max  = 3

  enable_spot_nodes = false # Disabled in dev
  allowed_ip_ranges = var.allowed_ip_ranges

  # Disable App Service in dev
  enable_app_service = false

  log_analytics_workspace_id = var.cloud_provider == "azure" ? module.monitoring.log_analytics_workspace_id : null
  log_retention_days         = 7

  tags = local.tags
}

# ============================================
# Storage Module
# ============================================
module "storage" {
  source = "../../modules/storage"

  cloud_provider      = local.cloud_provider
  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  resource_group_name = var.cloud_provider == "azure" ? azurerm_resource_group.main[0].name : ""

  # Azure Storage Configuration
  account_tier             = "Standard"
  account_replication_type = "LRS" # Locally redundant for dev
  enable_versioning        = false
  enable_soft_delete       = false

  # AWS S3 Configuration
  enable_cdn                = false # Disabled in dev
  cors_allowed_origins      = ["http://localhost:3000", "http://localhost:4000"]
  allowed_subnet_ids        = var.cloud_provider == "azure" ? module.networking.private_subnet_ids : []
  log_retention_days        = 7

  tags = local.tags
}

# ============================================
# Monitoring Module
# ============================================
module "monitoring" {
  source = "../../modules/monitoring"

  cloud_provider      = local.cloud_provider
  project_name        = local.project_name
  environment         = local.environment
  location            = local.location
  region              = local.aws_region
  resource_group_name = var.cloud_provider == "azure" ? azurerm_resource_group.main[0].name : ""

  log_retention_days = 7

  # Alert Recipients
  oncall_email = var.oncall_email
  team_email   = var.team_email

  # Alert Thresholds (relaxed for dev)
  response_time_threshold_ms = 3000
  failed_requests_threshold  = 20
  exceptions_threshold       = 50

  # Resources to Monitor
  aks_cluster_id  = var.cloud_provider == "azure" ? module.compute.aks_id : null
  database_id     = var.cloud_provider == "azure" ? module.database.postgresql_server_id : null
  eks_cluster_name = var.cloud_provider == "aws" ? module.compute.eks_cluster_name : ""
  rds_instance_id  = var.cloud_provider == "aws" ? module.database.rds_endpoint : ""

  app_url = "https://dev.citadelbuy.com"

  tags = local.tags
}
