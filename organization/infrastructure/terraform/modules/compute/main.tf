# Compute Module - AKS, ACR, and App Service (Legacy Azure)
# Broxiva E-commerce Platform
# NOTE: For AWS deployments, use infrastructure/terraform/environments/aws-prod/

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
  }
}

# ============================================
# Azure Container Registry (ACR)
# ============================================
resource "azurerm_container_registry" "main" {
  name                = "${replace(var.project_name, "-", "")}${var.environment}acr"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Premium"
  admin_enabled       = false

  # Geo-replication for high availability
  dynamic "georeplications" {
    for_each = var.acr_geo_replications
    content {
      location                = georeplications.value.location
      zone_redundancy_enabled = georeplications.value.zone_redundancy
      tags                    = var.tags
    }
  }

  # Network rules
  # SECURITY: ACR network access is restricted to specific IP ranges and subnets.
  # Default action is Deny - only explicitly allowed sources can access the registry.
  # Configure var.acr_allowed_ip_ranges per environment (avoid 0.0.0.0/0 in production).
  network_rule_set {
    default_action = "Deny"

    # Dynamic IP rules - allow access from configured IP ranges
    # SECURITY WARNING: Overly permissive IP ranges (e.g., 0.0.0.0/0) expose the
    # container registry to the public internet. Use restrictive ranges:
    # - Internal networks: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    # - Office/VPN IPs: specific public IPs of your organization
    # - CI/CD runners: specific IPs of your build agents
    dynamic "ip_rule" {
      for_each = var.acr_allowed_ip_ranges
      content {
        action   = "Allow"
        ip_range = ip_rule.value
      }
    }

    dynamic "virtual_network" {
      for_each = var.allowed_subnet_ids
      content {
        action    = "Allow"
        subnet_id = virtual_network.value
      }
    }
  }

  retention_policy {
    days    = 30
    enabled = true
  }

  trust_policy {
    enabled = true
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-acr"
      Service = "Container Registry"
    }
  )
}

# ============================================
# AKS Cluster
# ============================================
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.project_name}-${var.environment}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  # System node pool
  default_node_pool {
    name                         = "system"
    node_count                   = var.system_node_count
    vm_size                      = var.system_node_size
    vnet_subnet_id               = var.aks_subnet_id
    enable_auto_scaling          = true
    min_count                    = var.system_node_min
    max_count                    = var.system_node_max
    max_pods                     = 110
    os_disk_size_gb              = 128
    os_disk_type                 = "Managed"
    type                         = "VirtualMachineScaleSets"
    only_critical_addons_enabled = true
    zones                        = ["1", "2", "3"]

    upgrade_settings {
      max_surge = "33%"
    }

    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
    }
  }

  # Identity
  identity {
    type = "SystemAssigned"
  }

  # Azure AD integration
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = var.aks_admin_group_ids
  }

  # Network configuration
  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    service_cidr      = "10.100.0.0/16"
    dns_service_ip    = "10.100.0.10"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
  }

  # Monitoring
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Defender
  microsoft_defender {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Key Vault secrets provider
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # Auto-upgrade channel
  automatic_channel_upgrade = "patch"

  # Maintenance window
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [3, 4, 5]
    }
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-aks"
      Service = "Kubernetes"
    }
  )

  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count,
      kubernetes_version
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
  enable_auto_scaling   = true
  min_count             = var.user_node_min
  max_count             = var.user_node_max
  max_pods              = 110
  os_disk_size_gb       = 128
  os_disk_type          = "Managed"
  zones                 = ["1", "2", "3"]

  upgrade_settings {
    max_surge = "33%"
  }

  node_labels = {
    "nodepool-type" = "user"
    "environment"   = var.environment
    "workload"      = "application"
  }

  node_taints = []

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-user-nodepool"
    }
  )

  lifecycle {
    ignore_changes = [node_count]
  }
}

# ============================================
# Spot Node Pool (Cost optimization)
# ============================================
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  count                 = var.enable_spot_nodes ? 1 : 0
  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.spot_node_size
  vnet_subnet_id        = var.aks_subnet_id
  enable_auto_scaling   = true
  min_count             = 0
  max_count             = var.spot_node_max
  max_pods              = 110
  os_disk_size_gb       = 128
  priority              = "Spot"
  eviction_policy       = "Delete"
  spot_max_price        = -1 # Pay up to on-demand price
  zones                 = ["1", "2", "3"]

  node_labels = {
    "nodepool-type"                         = "spot"
    "environment"                           = var.environment
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  node_taints = [
    "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
  ]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-spot-nodepool"
    }
  )

  lifecycle {
    ignore_changes = [node_count]
  }
}

# ============================================
# ACR Pull Role Assignment for AKS
# ============================================
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# ============================================
# App Service Plan (Optional backup/alternative)
# ============================================
resource "azurerm_service_plan" "main" {
  count               = var.enable_app_service ? 1 : 0
  name                = "${var.project_name}-${var.environment}-plan"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-plan"
      Service = "App Service"
    }
  )
}

# ============================================
# App Service - API
# ============================================
resource "azurerm_linux_web_app" "api" {
  count               = var.enable_app_service ? 1 : 0
  name                = "${var.project_name}-${var.environment}-api"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main[0].id
  https_only          = true

  site_config {
    always_on                               = true
    minimum_tls_version                     = "1.2"
    http2_enabled                           = true
    ftps_state                              = "Disabled"
    vnet_route_all_enabled                  = true
    container_registry_use_managed_identity = true

    application_stack {
      docker_image_name   = "${azurerm_container_registry.main.login_server}/api:v2.0.0"
      docker_registry_url = "https://${azurerm_container_registry.main.login_server}"
    }

    # SECURITY: Only allow traffic from Azure Front Door with specific header validation.
    # This ensures all traffic flows through the WAF for protection.
    ip_restriction {
      name        = "FrontDoor"
      priority    = 100
      action      = "Allow"
      service_tag = "AzureFrontDoor.Backend"
      headers {
        x_azure_fdid = [var.front_door_id]
      }
    }

    # SECURITY: Default deny rule - blocks all direct access to the App Service.
    # Traffic must flow through Front Door for WAF protection and SSL termination.
    # Using "Any" instead of "0.0.0.0/0" for clarity in deny rules.
    ip_restriction {
      name       = "DenyAll"
      priority   = 1000
      action     = "Deny"
      ip_address = "Any"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE"        = "false"
    "DOCKER_REGISTRY_SERVER_URL"                 = "https://${azurerm_container_registry.main.login_server}"
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = var.app_insights_connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
  }

  logs {
    application_logs {
      file_system_level = "Warning"
    }

    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 100
      }
    }
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-api"
      Service = "API"
    }
  )
}

# ============================================
# App Service - Web
# ============================================
resource "azurerm_linux_web_app" "web" {
  count               = var.enable_app_service ? 1 : 0
  name                = "${var.project_name}-${var.environment}-web"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main[0].id
  https_only          = true

  site_config {
    always_on                               = true
    minimum_tls_version                     = "1.2"
    http2_enabled                           = true
    ftps_state                              = "Disabled"
    vnet_route_all_enabled                  = true
    container_registry_use_managed_identity = true

    application_stack {
      docker_image_name   = "${azurerm_container_registry.main.login_server}/web:v2.0.0"
      docker_registry_url = "https://${azurerm_container_registry.main.login_server}"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE"   = "false"
    "DOCKER_REGISTRY_SERVER_URL"            = "https://${azurerm_container_registry.main.login_server}"
    "NEXT_PUBLIC_API_URL"                   = var.api_url
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = var.app_insights_connection_string
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-web"
      Service = "Web"
    }
  )
}

# ============================================
# Staging Slots
# ============================================
resource "azurerm_linux_web_app_slot" "api_staging" {
  count          = var.enable_app_service ? 1 : 0
  name           = "staging"
  app_service_id = azurerm_linux_web_app.api[0].id
  https_only     = true

  site_config {
    always_on                               = true
    minimum_tls_version                     = "1.2"
    http2_enabled                           = true
    ftps_state                              = "Disabled"
    container_registry_use_managed_identity = true

    application_stack {
      docker_image_name   = "${azurerm_container_registry.main.login_server}/api:staging"
      docker_registry_url = "https://${azurerm_container_registry.main.login_server}"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE"   = "false"
    "DOCKER_REGISTRY_SERVER_URL"            = "https://${azurerm_container_registry.main.login_server}"
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = var.app_insights_connection_string
  }

  tags = var.tags
}

# ============================================
# ACR Pull Role for App Services
# ============================================
resource "azurerm_role_assignment" "api_acr_pull" {
  count                = var.enable_app_service ? 1 : 0
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.api[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "web_acr_pull" {
  count                = var.enable_app_service ? 1 : 0
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.web[0].identity[0].principal_id
}
