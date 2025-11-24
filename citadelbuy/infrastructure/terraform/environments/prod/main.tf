# CitadelBuy Production Environment - Azure
# Terraform configuration for production infrastructure on Azure

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "citadelbuy-terraform-state-rg"
    storage_account_name = "citadelbuytfstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }

    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }

  skip_provider_registration = false
}

locals {
  project_name = "citadelbuy"
  environment  = "prod"
  location     = var.location

  common_tags = {
    Project     = "CitadelBuy"
    Environment = "production"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
  }
}

# Network Module
module "network" {
  source = "../../modules/network"

  project_name       = local.project_name
  environment        = local.environment
  location           = local.location
  vnet_cidr          = "10.0.0.0/16"
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true
  log_retention_days = 30

  tags = local.common_tags
}

# Database Module
module "database" {
  source = "../../modules/database"

  project_name           = local.project_name
  environment            = local.environment
  resource_group_name    = module.network.resource_group_name
  location               = local.location
  delegated_subnet_id    = module.network.database_subnet_ids[0]
  private_dns_zone_id    = module.network.postgresql_private_dns_zone_id
  log_analytics_workspace_id = module.network.log_analytics_workspace_id

  postgres_version       = "16"
  sku_name               = "GP_Standard_D4s_v3"
  storage_mb             = 131072 # 128 GB
  backup_retention_days  = 30
  geo_redundant_backup   = true

  availability_zone          = "1"
  standby_availability_zone  = "2"
  high_availability_mode     = "ZoneRedundant"

  administrator_login    = "citadelbuy_admin"
  administrator_password = var.db_admin_password
  database_name          = "citadelbuy_prod"

  max_connections            = 500
  shared_buffers_mb          = 2048
  effective_cache_size_mb    = 8192
  slow_query_threshold_ms    = 1000

  create_read_replica        = true
  replica_sku_name           = "GP_Standard_D2s_v3"
  replica_availability_zone  = "3"

  tags = local.common_tags

  depends_on = [module.network]
}

# Storage Module
module "storage" {
  source = "../../modules/storage"

  project_name           = local.project_name
  environment            = local.environment
  resource_group_name    = module.network.resource_group_name
  location               = local.location
  log_analytics_workspace_id = module.network.log_analytics_workspace_id
  private_endpoint_subnet_id = module.network.private_subnet_ids[0]

  account_tier           = "Standard"
  replication_type       = "GRS"
  blob_retention_days    = 30
  container_retention_days = 30
  file_share_quota_gb    = 100

  allowed_subnet_ids = concat(
    module.network.private_subnet_ids,
    [module.network.aks_subnet_id]
  )

  # Redis Configuration
  redis_sku              = "Premium"
  redis_family           = "P"
  redis_capacity         = 2
  redis_maxmemory_reserved = 50
  redis_maxmemory_delta    = 50
  redis_backup_enabled     = true
  redis_backup_frequency   = 60

  tags = local.common_tags

  depends_on = [module.network]
}

# Azure Kubernetes Service (AKS)
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${local.project_name}-${local.environment}-aks"
  location            = local.location
  resource_group_name = module.network.resource_group_name
  dns_prefix          = "${local.project_name}-${local.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = 3
    vm_size             = "Standard_D4s_v3"
    vnet_subnet_id      = module.network.aks_subnet_id
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 10
    max_pods            = 110
    os_disk_size_gb     = 128
    zones               = ["1", "2", "3"]

    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = "azure"
    network_policy     = "azure"
    load_balancer_sku  = "standard"
    service_cidr       = "172.16.0.0/16"
    dns_service_ip     = "172.16.0.10"
    docker_bridge_cidr = "172.17.0.1/16"
  }

  oms_agent {
    log_analytics_workspace_id = module.network.log_analytics_workspace_id
  }

  azure_policy_enabled = true

  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [4, 5]
    }
  }

  tags = local.common_tags
}

# Additional Node Pool for Application Workloads
resource "azurerm_kubernetes_cluster_node_pool" "apps" {
  name                  = "apps"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D2s_v3"
  node_count            = 3
  enable_auto_scaling   = true
  min_count             = 2
  max_count             = 20
  vnet_subnet_id        = module.network.aks_subnet_id
  zones                 = ["1", "2", "3"]

  node_labels = {
    "workload-type" = "applications"
  }

  tags = local.common_tags
}

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "${local.project_name}${local.environment}acr"
  resource_group_name = module.network.resource_group_name
  location            = local.location
  sku                 = "Premium"
  admin_enabled       = false

  georeplications {
    location                = "West US"
    zone_redundancy_enabled = true
  }

  network_rule_set {
    default_action = "Deny"

    virtual_network {
      action    = "Allow"
      subnet_id = module.network.aks_subnet_id
    }
  }

  retention_policy {
    days    = 30
    enabled = true
  }

  trust_policy {
    enabled = true
  }

  tags = local.common_tags
}

# Grant AKS access to ACR
resource "azurerm_role_assignment" "aks_acr" {
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.main.id
  skip_service_principal_aad_check = true
}

# Application Gateway
resource "azurerm_public_ip" "appgw" {
  name                = "${local.project_name}-${local.environment}-appgw-pip"
  resource_group_name = module.network.resource_group_name
  location            = local.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]

  tags = local.common_tags
}

resource "azurerm_application_gateway" "main" {
  name                = "${local.project_name}-${local.environment}-appgw"
  resource_group_name = module.network.resource_group_name
  location            = local.location
  zones               = ["1", "2", "3"]

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = module.network.public_subnet_ids[0]
  }

  frontend_port {
    name = "http-port"
    port = 80
  }

  frontend_port {
    name = "https-port"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "frontend-ip-config"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }

  backend_address_pool {
    name = "aks-backend-pool"
  }

  backend_http_settings {
    name                  = "http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
  }

  http_listener {
    name                           = "http-listener"
    frontend_ip_configuration_name = "frontend-ip-config"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
  }

  request_routing_rule {
    name                       = "routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "http-listener"
    backend_address_pool_name  = "aks-backend-pool"
    backend_http_settings_name = "http-settings"
    priority                   = 100
  }

  waf_configuration {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
  }

  tags = local.common_tags
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                        = "${local.project_name}-${local.environment}-kv"
  location                    = local.location
  resource_group_name         = module.network.resource_group_name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  sku_name                    = "premium"

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    virtual_network_subnet_ids = module.network.private_subnet_ids
  }

  tags = local.common_tags
}

# Grant AKS access to Key Vault
resource "azurerm_key_vault_access_policy" "aks" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Store database password in Key Vault
resource "azurerm_key_vault_secret" "db_password" {
  name         = "database-admin-password"
  value        = var.db_admin_password
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [
    azurerm_key_vault_access_policy.aks
  ]
}

# Data Sources
data "azurerm_client_config" "current" {}

# Outputs
output "resource_group_name" {
  value = module.network.resource_group_name
}

output "vnet_id" {
  value = module.network.vnet_id
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_fqdn" {
  value = azurerm_kubernetes_cluster.main.fqdn
}

output "database_fqdn" {
  value = module.database.server_fqdn
}

output "redis_hostname" {
  value = module.storage.redis_hostname
}

output "storage_account_name" {
  value = module.storage.storage_account_name
}

output "application_gateway_public_ip" {
  value = azurerm_public_ip.appgw.ip_address
}

output "container_registry_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "application_insights_connection_string" {
  value     = module.network.application_insights_connection_string
  sensitive = true
}
