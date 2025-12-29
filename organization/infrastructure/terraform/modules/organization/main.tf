# Organization Module Terraform Configuration
# This module provisions infrastructure for the Organization domain

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Local variables
locals {
  name_prefix = "broxiva-org-${var.environment}"
  common_tags = merge(var.tags, {
    Module      = "organization"
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

# PostgreSQL Database for Organization data
resource "azurerm_postgresql_flexible_server" "organization_db" {
  name                   = "${local.name_prefix}-db"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = "15"
  delegated_subnet_id    = var.subnet_id
  private_dns_zone_id    = var.private_dns_zone_id
  administrator_login    = "broxiva_admin"
  administrator_password = var.db_password
  zone                   = "1"

  storage_mb = 32768

  sku_name = var.environment == "prod" ? "GP_Standard_D4s_v3" : "B_Standard_B2s"

  high_availability {
    mode                      = var.environment == "prod" ? "ZoneRedundant" : "Disabled"
    standby_availability_zone = var.environment == "prod" ? "2" : null
  }

  tags = local.common_tags
}

resource "azurerm_postgresql_flexible_server_database" "organization" {
  name      = "organization"
  server_id = azurerm_postgresql_flexible_server.organization_db.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Redis Cache for session and permission caching
resource "azurerm_redis_cache" "organization_cache" {
  name                = "${local.name_prefix}-redis"
  location            = var.location
  resource_group_name = var.resource_group_name
  capacity            = var.environment == "prod" ? 2 : 0
  family              = var.environment == "prod" ? "C" : "C"
  sku_name            = var.environment == "prod" ? "Standard" : "Basic"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_reserved = var.environment == "prod" ? 50 : 2
    maxmemory_delta    = var.environment == "prod" ? 50 : 2
    maxmemory_policy   = "volatile-lru"
  }

  tags = local.common_tags
}

# Storage Account for KYC documents
resource "azurerm_storage_account" "organization_storage" {
  name                     = replace("${local.name_prefix}storage", "-", "")
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "prod" ? "GRS" : "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  tags = local.common_tags
}

resource "azurerm_storage_container" "kyc_documents" {
  name                  = "kyc-documents"
  storage_account_name  = azurerm_storage_account.organization_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "audit_logs" {
  name                  = "audit-logs"
  storage_account_name  = azurerm_storage_account.organization_storage.name
  container_access_type = "private"
}

# Key Vault for secrets
resource "azurerm_key_vault" "organization_vault" {
  name                        = "${local.name_prefix}-kv"
  location                    = var.location
  resource_group_name         = var.resource_group_name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = var.environment == "prod"
  sku_name                    = "standard"

  tags = local.common_tags
}

# Outputs
output "database_host" {
  value     = azurerm_postgresql_flexible_server.organization_db.fqdn
  sensitive = true
}

output "redis_host" {
  value = azurerm_redis_cache.organization_cache.hostname
}

output "redis_primary_key" {
  value     = azurerm_redis_cache.organization_cache.primary_access_key
  sensitive = true
}

output "storage_account_name" {
  value = azurerm_storage_account.organization_storage.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.organization_vault.vault_uri
}

# Data sources
data "azurerm_client_config" "current" {}
