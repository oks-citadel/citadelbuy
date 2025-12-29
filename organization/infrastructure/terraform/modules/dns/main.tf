# Broxiva Azure DNS Zone Module
# Creates DNS zone for broxiva.com with all required records
# Outputs Azure nameservers for GoDaddy configuration

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================
# Azure DNS Zone for broxiva.com
# ============================================
resource "azurerm_dns_zone" "main" {
  name                = var.domain_name
  resource_group_name = var.resource_group_name

  tags = merge(var.tags, {
    Purpose = "Primary DNS Zone"
    Domain  = var.domain_name
  })
}

# ============================================
# A Records - Root Domain (@)
# Points to Azure Front Door or Load Balancer
# ============================================
resource "azurerm_dns_a_record" "root" {
  count               = var.front_door_ip != "" ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = [var.front_door_ip]

  tags = var.tags
}

# A Record for www (if using IP instead of CNAME)
resource "azurerm_dns_a_record" "www_ip" {
  count               = var.front_door_ip != "" && !var.use_cname_for_www ? 1 : 0
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = [var.front_door_ip]

  tags = var.tags
}

# ============================================
# CNAME Records
# ============================================

# WWW subdomain pointing to root or Front Door
resource "azurerm_dns_cname_record" "www" {
  count               = var.use_cname_for_www ? 1 : 0
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.front_door_hostname != "" ? var.front_door_hostname : var.domain_name

  tags = var.tags
}

# API subdomain
resource "azurerm_dns_cname_record" "api" {
  count               = var.api_hostname != "" ? 1 : 0
  name                = "api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.api_hostname

  tags = var.tags
}

# CDN subdomain
resource "azurerm_dns_cname_record" "cdn" {
  count               = var.cdn_hostname != "" ? 1 : 0
  name                = "cdn"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.cdn_hostname

  tags = var.tags
}

# Staging subdomain
resource "azurerm_dns_cname_record" "staging" {
  count               = var.staging_hostname != "" ? 1 : 0
  name                = "staging"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.staging_hostname

  tags = var.tags
}

# Staging API subdomain
resource "azurerm_dns_cname_record" "staging_api" {
  count               = var.staging_api_hostname != "" ? 1 : 0
  name                = "staging-api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  record              = var.staging_api_hostname

  tags = var.tags
}

# ============================================
# TXT Records - Domain Verification
# ============================================

# Domain verification for Azure
resource "azurerm_dns_txt_record" "azure_verification" {
  count               = var.azure_verification_code != "" ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = var.azure_verification_code
  }

  tags = var.tags
}

# SPF Record for email
resource "azurerm_dns_txt_record" "spf" {
  count               = var.enable_email_records ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = var.spf_record != "" ? var.spf_record : "v=spf1 include:_spf.google.com include:sendgrid.net ~all"
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [record]
  }
}

# DKIM Record
resource "azurerm_dns_txt_record" "dkim" {
  count               = var.dkim_record != "" ? 1 : 0
  name                = "google._domainkey"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = var.dkim_record
  }

  tags = var.tags
}

# DMARC Record
resource "azurerm_dns_txt_record" "dmarc" {
  count               = var.enable_email_records ? 1 : 0
  name                = "_dmarc"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    value = var.dmarc_record != "" ? var.dmarc_record : "v=DMARC1; p=quarantine; rua=mailto:dmarc@${var.domain_name}"
  }

  tags = var.tags
}

# ============================================
# MX Records - Email
# ============================================
resource "azurerm_dns_mx_record" "main" {
  count               = var.enable_email_records ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  dynamic "record" {
    for_each = var.mx_records
    content {
      preference = record.value.preference
      exchange   = record.value.exchange
    }
  }

  tags = var.tags
}

# ============================================
# CAA Records - Certificate Authority Authorization
# ============================================
resource "azurerm_dns_caa_record" "main" {
  count               = var.enable_caa_records ? 1 : 0
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 3600

  record {
    flags = 0
    tag   = "issue"
    value = "letsencrypt.org"
  }

  record {
    flags = 0
    tag   = "issue"
    value = "digicert.com"
  }

  record {
    flags = 0
    tag   = "issuewild"
    value = "letsencrypt.org"
  }

  record {
    flags = 0
    tag   = "iodef"
    value = "mailto:security@${var.domain_name}"
  }

  tags = var.tags
}

# ============================================
# Health Check Subdomain
# ============================================
resource "azurerm_dns_cname_record" "health" {
  count               = var.health_check_hostname != "" ? 1 : 0
  name                = "health"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 60
  record              = var.health_check_hostname

  tags = var.tags
}

# ============================================
# Additional Custom Records
# ============================================
resource "azurerm_dns_cname_record" "custom" {
  for_each = var.custom_cname_records

  name                = each.key
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = each.value.ttl
  record              = each.value.record

  tags = var.tags
}

resource "azurerm_dns_a_record" "custom" {
  for_each = var.custom_a_records

  name                = each.key
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = each.value.ttl
  records             = each.value.records

  tags = var.tags
}
