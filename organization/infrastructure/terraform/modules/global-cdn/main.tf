# Global CDN Module - Azure Front Door for Multi-Region Distribution
# Provides global content delivery, SSL termination, and intelligent routing

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Azure Front Door Profile
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.project_name}-${var.environment}-afd"
  resource_group_name = var.resource_group_name
  sku_name            = var.sku_name # Standard_AzureFrontDoor or Premium_AzureFrontDoor

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-afd"
      Purpose     = "Global CDN and Load Balancing"
      Environment = var.environment
    }
  )
}

# Front Door Endpoint
resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.project_name}-${var.environment}-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = var.tags
}

# Origin Groups for Multi-Region Backends
resource "azurerm_cdn_frontdoor_origin_group" "regional" {
  for_each                 = var.regional_endpoints
  name                     = "${var.project_name}-${each.key}-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  load_balancing {
    sample_size                        = 4
    successful_samples_required        = 3
    additional_latency_in_milliseconds = 50
  }

  health_probe {
    protocol            = "Https"
    request_type        = "HEAD"
    path                = "/health"
    interval_in_seconds = 30
  }

  session_affinity_enabled = each.value.session_affinity_enabled
}

# Origins for each regional endpoint
resource "azurerm_cdn_frontdoor_origin" "regional" {
  for_each                      = var.regional_endpoints
  name                          = "${var.project_name}-${each.key}-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.regional[each.key].id

  enabled                        = true
  host_name                      = each.value.hostname
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = each.value.hostname
  priority                       = each.value.priority
  weight                         = each.value.weight
  certificate_name_check_enabled = true
}

# Custom Domains
resource "azurerm_cdn_frontdoor_custom_domain" "main" {
  for_each                 = var.custom_domains
  name                     = replace(each.key, ".", "-")
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  dns_zone_id              = each.value.dns_zone_id
  host_name                = each.key

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

# WAF Policy for Premium SKU
resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  count               = var.sku_name == "Premium_AzureFrontDoor" ? 1 : 0
  name                = "${var.project_name}${var.environment}waf"
  resource_group_name = var.resource_group_name
  sku_name            = var.sku_name
  enabled             = true
  mode                = var.waf_mode # Prevention or Detection

  # OWASP Managed Rules
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  # Custom Rules
  # SECURITY: Rate limiting rule applies to all traffic to prevent abuse.
  # This is intentionally broad (all IPs) to provide DDoS protection.
  # The rate_limit_threshold controls how many requests per minute are allowed.
  # Note: 0.0.0.0/0 in a WAF rule is different from firewall rules -
  # it means "match all traffic" for rate limiting, not "allow all traffic".
  custom_rule {
    name     = "RateLimitRule"
    enabled  = true
    priority = 1
    type     = "RateLimitRule"
    action   = "Block"

    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = var.rate_limit_threshold

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = false
      # Match all IPs for rate limiting - this is security protective, not permissive
      match_values = var.rate_limit_ip_ranges
    }
  }

  custom_rule {
    name     = "GeoBlockingRule"
    enabled  = var.enable_geo_blocking
    priority = 2
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "GeoMatch"
      negation_condition = true
      match_values       = var.allowed_countries
    }
  }

  tags = var.tags
}

# Security Policy (links WAF to endpoint)
resource "azurerm_cdn_frontdoor_security_policy" "main" {
  count                    = var.sku_name == "Premium_AzureFrontDoor" ? 1 : 0
  name                     = "${var.project_name}-${var.environment}-security-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main[0].id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.main.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}

# Route for API traffic
resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.regional["primary"].id
  cdn_frontdoor_origin_ids = [
    for origin in azurerm_cdn_frontdoor_origin.regional : origin.id
  ]

  enabled                = true
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/api/*"]
  supported_protocols    = ["Http", "Https"]

  cdn_frontdoor_custom_domain_ids = [
    for domain in azurerm_cdn_frontdoor_custom_domain.main : domain.id
  ]

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreSpecifiedQueryStrings"
    query_strings                 = ["utm_source", "utm_medium", "utm_campaign"]
    compression_enabled           = true
    content_types_to_compress = [
      "application/json",
      "application/javascript",
      "text/css",
      "text/html",
      "text/javascript",
      "text/xml"
    ]
  }

  # Add custom rule for geo-routing
  cdn_frontdoor_rule_set_ids = var.enable_geo_routing ? [azurerm_cdn_frontdoor_rule_set.geo_routing[0].id] : []
}

# Route for static assets
resource "azurerm_cdn_frontdoor_route" "static" {
  name                          = "static-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.regional["primary"].id
  cdn_frontdoor_origin_ids = [
    for origin in azurerm_cdn_frontdoor_origin.regional : origin.id
  ]

  enabled                = true
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/static/*", "/assets/*", "/images/*"]
  supported_protocols    = ["Http", "Https"]

  cdn_frontdoor_custom_domain_ids = [
    for domain in azurerm_cdn_frontdoor_custom_domain.main : domain.id
  ]

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "application/javascript",
      "text/css",
      "text/html",
      "text/javascript",
      "image/svg+xml"
    ]
  }
}

# Rule Set for Geo-Routing
resource "azurerm_cdn_frontdoor_rule_set" "geo_routing" {
  count                    = var.enable_geo_routing ? 1 : 0
  name                     = "GeoRoutingRules"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

# Geo-routing rules - Route to nearest region
resource "azurerm_cdn_frontdoor_rule" "geo_route_africa" {
  count                     = var.enable_geo_routing ? 1 : 0
  name                      = "RouteToAfrica"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.geo_routing[0].id
  order                     = 1
  behavior_on_match         = "Continue"

  conditions {
    remote_address_condition {
      operator         = "GeoMatch"
      negate_condition = false
      match_values     = ["ZA", "NG", "KE", "GH", "EG"] # South Africa, Nigeria, Kenya, Ghana, Egypt
    }
  }

  actions {
    route_configuration_override_action {
      cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.regional["africa"].id
      forwarding_protocol           = "HttpsOnly"
      cache_behavior                = "HonorOrigin"
    }
  }
}

resource "azurerm_cdn_frontdoor_rule" "geo_route_asia" {
  count                     = var.enable_geo_routing ? 1 : 0
  name                      = "RouteToAsia"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.geo_routing[0].id
  order                     = 2
  behavior_on_match         = "Continue"

  conditions {
    remote_address_condition {
      operator         = "GeoMatch"
      negate_condition = false
      match_values     = ["SG", "IN", "JP", "AU", "NZ", "MY", "TH", "VN", "ID", "PH"] # Asia-Pacific countries
    }
  }

  actions {
    route_configuration_override_action {
      cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.regional["asia"].id
      forwarding_protocol           = "HttpsOnly"
      cache_behavior                = "HonorOrigin"
    }
  }
}

# Rule for adding security headers
resource "azurerm_cdn_frontdoor_rule" "security_headers" {
  count                     = var.enable_geo_routing ? 1 : 0
  name                      = "AddSecurityHeaders"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.geo_routing[0].id
  order                     = 10
  behavior_on_match         = "Continue"

  actions {
    response_header_action {
      header_action = "Append"
      header_name   = "X-Frame-Options"
      value         = "DENY"
    }

    response_header_action {
      header_action = "Append"
      header_name   = "X-Content-Type-Options"
      value         = "nosniff"
    }

    response_header_action {
      header_action = "Append"
      header_name   = "Strict-Transport-Security"
      value         = "max-age=31536000; includeSubDomains"
    }

    response_header_action {
      header_action = "Append"
      header_name   = "Content-Security-Policy"
      value         = var.csp_policy
    }
  }
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "frontdoor" {
  count                      = var.enable_diagnostics ? 1 : 0
  name                       = "${var.project_name}-${var.environment}-afd-diagnostics"
  target_resource_id         = azurerm_cdn_frontdoor_profile.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "FrontDoorAccessLog"
  }

  enabled_log {
    category = "FrontDoorHealthProbeLog"
  }

  enabled_log {
    category = "FrontDoorWebApplicationFirewallLog"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
