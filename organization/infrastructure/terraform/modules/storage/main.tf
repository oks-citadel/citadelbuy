# Storage Module - Azure Storage Account, CDN, and Blob Containers
# Broxiva E-commerce Platform

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
# Storage Account
# ============================================
resource "azurerm_storage_account" "main" {
  name                            = "${replace(var.project_name, "-", "")}${var.environment}storage"
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = var.account_tier
  account_replication_type        = var.account_replication_type
  account_kind                    = "StorageV2"
  access_tier                     = "Hot"
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  blob_properties {
    versioning_enabled = var.enable_versioning

    dynamic "delete_retention_policy" {
      for_each = var.enable_soft_delete ? [1] : []
      content {
        days = var.soft_delete_days
      }
    }

    dynamic "container_delete_retention_policy" {
      for_each = var.enable_soft_delete ? [1] : []
      content {
        days = var.soft_delete_days
      }
    }

    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "OPTIONS"]
      allowed_origins    = var.cors_allowed_origins
      exposed_headers    = ["*"]
      max_age_in_seconds = 86400
    }
  }

  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    virtual_network_subnet_ids = var.allowed_subnet_ids
    ip_rules                   = var.allowed_ip_ranges
  }

  identity {
    type = "SystemAssigned"
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-storage"
      Service = "Storage"
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# ============================================
# Blob Containers
# ============================================
resource "azurerm_storage_container" "media" {
  name                  = "media"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "logs" {
  name                  = "logs"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "static" {
  name                  = "static"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"  # Public read access for static assets
}

resource "azurerm_storage_container" "exports" {
  name                  = "exports"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# ============================================
# Lifecycle Management Policy
# ============================================
resource "azurerm_storage_management_policy" "main" {
  storage_account_id = azurerm_storage_account.main.id

  rule {
    name    = "MoveToArchive"
    enabled = true

    filters {
      prefix_match = ["backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }
    }
  }

  rule {
    name    = "CleanupLogs"
    enabled = true

    filters {
      prefix_match = ["logs/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 30
        delete_after_days_since_modification_greater_than       = 90
      }
    }
  }

  rule {
    name    = "CleanupExports"
    enabled = true

    filters {
      prefix_match = ["exports/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 7
      }
    }
  }

  rule {
    name    = "CleanupUploads"
    enabled = true

    filters {
      prefix_match = ["uploads/temp/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 1
      }
    }
  }
}

# ============================================
# Azure Front Door Profile (CDN)
# ============================================
resource "azurerm_cdn_frontdoor_profile" "main" {
  count               = var.enable_cdn ? 1 : 0
  name                = "${var.project_name}-${var.environment}-cdn"
  resource_group_name = var.resource_group_name
  sku_name            = var.cdn_sku

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-cdn"
      Service = "CDN"
    }
  )
}

# ============================================
# Front Door Endpoint
# ============================================
resource "azurerm_cdn_frontdoor_endpoint" "main" {
  count                    = var.enable_cdn ? 1 : 0
  name                     = "${var.project_name}-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main[0].id

  tags = var.tags
}

# ============================================
# Front Door Origin Group - Storage
# ============================================
resource "azurerm_cdn_frontdoor_origin_group" "storage" {
  count                                                    = var.enable_cdn ? 1 : 0
  name                                                     = "storage-origin-group"
  cdn_frontdoor_profile_id                                 = azurerm_cdn_frontdoor_profile.main[0].id
  session_affinity_enabled                                 = false
  restore_traffic_time_to_healed_or_new_endpoint_in_minutes = 10

  health_probe {
    interval_in_seconds = 100
    path                = "/"
    protocol            = "Https"
    request_type        = "HEAD"
  }

  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

# ============================================
# Front Door Origin - Storage
# ============================================
resource "azurerm_cdn_frontdoor_origin" "storage" {
  count                          = var.enable_cdn ? 1 : 0
  name                           = "storage-origin"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.storage[0].id
  enabled                        = true
  host_name                      = azurerm_storage_account.main.primary_blob_host
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = azurerm_storage_account.main.primary_blob_host
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

# ============================================
# Front Door Route
# ============================================
resource "azurerm_cdn_frontdoor_route" "static" {
  count                         = var.enable_cdn ? 1 : 0
  name                          = "static-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main[0].id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.storage[0].id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.storage[0].id]
  enabled                       = true
  forwarding_protocol           = "HttpsOnly"
  https_redirect_enabled        = true
  patterns_to_match             = ["/*"]
  supported_protocols           = ["Http", "Https"]
  link_to_default_domain        = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "application/javascript",
      "application/json",
      "application/xml",
      "text/css",
      "text/html",
      "text/javascript",
      "text/plain",
      "text/xml",
      "image/svg+xml"
    ]
  }
}

# ============================================
# Custom Domain (Optional)
# ============================================
resource "azurerm_cdn_frontdoor_custom_domain" "cdn" {
  count                    = var.enable_cdn && var.custom_domain != "" ? 1 : 0
  name                     = replace(var.custom_domain, ".", "-")
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main[0].id
  host_name                = var.custom_domain

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "cdn" {
  count                          = var.enable_cdn && var.custom_domain != "" ? 1 : 0
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.cdn[0].id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.static[0].id]
}

# ============================================
# Diagnostic Settings
# ============================================
resource "azurerm_monitor_diagnostic_setting" "storage" {
  count                      = var.log_analytics_workspace_id != null ? 1 : 0
  name                       = "${var.project_name}-${var.environment}-storage-diag"
  target_resource_id         = "${azurerm_storage_account.main.id}/blobServices/default"
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "StorageRead"
  }

  enabled_log {
    category = "StorageWrite"
  }

  enabled_log {
    category = "StorageDelete"
  }

  metric {
    category = "Transaction"
    enabled  = true
  }

  metric {
    category = "Capacity"
    enabled  = true
  }
}
