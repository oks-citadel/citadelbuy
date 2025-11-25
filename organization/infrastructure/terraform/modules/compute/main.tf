# Compute Module - AKS, App Service, Container Instances
# Azure Kubernetes Service and related compute resources

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================
# Azure Kubernetes Service (AKS)
# ============================================
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.project_name}-${var.environment}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  # Default node pool (system)
  default_node_pool {
    name                = "system"
    node_count          = var.system_node_count
    vm_size             = var.system_node_size
    vnet_subnet_id      = var.aks_subnet_id
    os_disk_size_gb     = 100
    os_disk_type        = "Managed"
    type                = "VirtualMachineScaleSets"
    enable_auto_scaling = true
    min_count           = var.system_node_min
    max_count           = var.system_node_max
    max_pods            = 110

    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
    }

    tags = var.tags
  }

  identity {
    type = "SystemAssigned"
  }

  # Network configuration
  network_profile {
    network_plugin     = "azure"
    network_policy     = "calico"
    dns_service_ip     = "10.0.0.10"
    service_cidr       = "10.0.0.0/16"
    load_balancer_sku  = "standard"
    outbound_type      = "loadBalancer"
  }

  # Azure AD RBAC
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = var.aks_admin_group_ids
  }

  # Key Vault integration
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # Monitoring
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Auto-upgrade
  automatic_channel_upgrade = var.environment == "prod" ? "stable" : "rapid"

  # Maintenance window
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [0, 1, 2, 3, 4]
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-aks"
    }
  )

  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count
    ]
  }
}

# ============================================
# User Node Pool (Application workloads)
# ============================================
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.user_node_size
  vnet_subnet_id        = var.aks_subnet_id
  os_disk_size_gb       = 100
  os_disk_type          = "Managed"
  enable_auto_scaling   = true
  min_count             = var.user_node_min
  max_count             = var.user_node_max
  max_pods              = 110
  mode                  = "User"

  node_labels = {
    "nodepool-type" = "user"
    "environment"   = var.environment
    "workload"      = "application"
  }

  node_taints = []

  tags = var.tags
}

# ============================================
# Spot Node Pool (Cost optimization)
# ============================================
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  count = var.enable_spot_nodes ? 1 : 0

  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.spot_node_size
  vnet_subnet_id        = var.aks_subnet_id
  os_disk_size_gb       = 100
  enable_auto_scaling   = true
  min_count             = 0
  max_count             = var.spot_node_max
  priority              = "Spot"
  eviction_policy       = "Delete"
  spot_max_price        = -1 # Pay up to on-demand price
  mode                  = "User"

  node_labels = {
    "nodepool-type"                       = "spot"
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  node_taints = [
    "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
  ]

  tags = var.tags
}

# ============================================
# Azure Container Registry
# ============================================
resource "azurerm_container_registry" "main" {
  name                = replace("${var.project_name}${var.environment}acr", "-", "")
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.environment == "prod" ? "Premium" : "Standard"
  admin_enabled       = false

  # Geo-replication (Premium only)
  dynamic "georeplications" {
    for_each = var.environment == "prod" ? var.acr_geo_replications : []
    content {
      location                = georeplications.value.location
      zone_redundancy_enabled = georeplications.value.zone_redundancy
      tags                    = var.tags
    }
  }

  # Network rules (Premium only)
  dynamic "network_rule_set" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      default_action = "Deny"

      ip_rule {
        action   = "Allow"
        ip_range = var.allowed_ip_ranges[0]
      }

      virtual_network {
        action    = "Allow"
        subnet_id = var.aks_subnet_id
      }
    }
  }

  tags = var.tags
}

# ACR Pull permission for AKS
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.main.id
  skip_service_principal_aad_check = true
}

# ============================================
# Azure App Service Plan (Web App fallback)
# ============================================
resource "azurerm_service_plan" "main" {
  count = var.enable_app_service ? 1 : 0

  name                = "${var.project_name}-${var.environment}-asp"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku

  tags = var.tags
}

# ============================================
# Azure Web App (Next.js Frontend)
# ============================================
resource "azurerm_linux_web_app" "frontend" {
  count = var.enable_app_service ? 1 : 0

  name                = "${var.project_name}-${var.environment}-web"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main[0].id
  https_only          = true

  site_config {
    always_on                = var.environment == "prod"
    http2_enabled            = true
    minimum_tls_version      = "1.2"
    ftps_state               = "Disabled"
    health_check_path        = "/api/health"
    health_check_eviction_time_in_min = 5

    application_stack {
      node_version = "20-lts"
    }

    ip_restriction {
      service_tag               = "AzureFrontDoor.Backend"
      name                      = "Allow Front Door"
      priority                  = 100
      action                    = "Allow"
      headers {
        x_azure_fdid = [var.front_door_id]
      }
    }
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
    "NEXT_PUBLIC_API_URL"                 = var.api_url
    "NODE_ENV"                            = var.environment == "prod" ? "production" : var.environment
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = var.app_insights_connection_string
  }

  identity {
    type = "SystemAssigned"
  }

  # Deployment slots
  dynamic "sticky_settings" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      app_setting_names = ["SLOT_SETTING"]
    }
  }

  tags = var.tags
}

# ============================================
# Web App Staging Slot (Production only)
# ============================================
resource "azurerm_linux_web_app_slot" "staging" {
  count = var.enable_app_service && var.environment == "prod" ? 1 : 0

  name           = "staging"
  app_service_id = azurerm_linux_web_app.frontend[0].id
  https_only     = true

  site_config {
    always_on           = true
    http2_enabled       = true
    minimum_tls_version = "1.2"
    health_check_path   = "/api/health"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
    "NEXT_PUBLIC_API_URL"                 = var.staging_api_url
    "NODE_ENV"                            = "staging"
    "SLOT_SETTING"                        = "staging"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

# ============================================
# Auto-scaling for Web App
# ============================================
resource "azurerm_monitor_autoscale_setting" "web_app" {
  count = var.enable_app_service && var.environment == "prod" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-autoscale"
  resource_group_name = var.resource_group_name
  location            = var.location
  target_resource_id  = azurerm_service_plan.main[0].id

  profile {
    name = "default"

    capacity {
      default = 2
      minimum = 2
      maximum = 10
    }

    # Scale out on high CPU
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main[0].id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    # Scale in on low CPU
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main[0].id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }

    # Scale out on high memory
    rule {
      metric_trigger {
        metric_name        = "MemoryPercentage"
        metric_resource_id = azurerm_service_plan.main[0].id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 80
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }

  notification {
    email {
      send_to_subscription_administrator    = true
      send_to_subscription_co_administrator = true
    }
  }

  tags = var.tags
}
