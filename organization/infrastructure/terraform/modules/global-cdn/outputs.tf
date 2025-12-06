# Outputs for Global CDN Module

output "frontdoor_profile_id" {
  description = "ID of the Azure Front Door profile"
  value       = azurerm_cdn_frontdoor_profile.main.id
}

output "frontdoor_endpoint_id" {
  description = "ID of the Front Door endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.main.id
}

output "frontdoor_endpoint_hostname" {
  description = "Hostname of the Front Door endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "cdn_url" {
  description = "CDN URL for the primary endpoint"
  value       = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
}

output "regional_cdn_urls" {
  description = "Map of regional CDN URLs"
  value = {
    for region, config in var.regional_endpoints :
    region => "https://${config.hostname}"
  }
}

output "custom_domain_urls" {
  description = "Map of custom domain URLs"
  value = {
    for domain, config in azurerm_cdn_frontdoor_custom_domain.main :
    domain => "https://${config.host_name}"
  }
}

output "origin_group_ids" {
  description = "Map of origin group IDs by region"
  value = {
    for region, group in azurerm_cdn_frontdoor_origin_group.regional :
    region => group.id
  }
}

output "waf_policy_id" {
  description = "ID of the WAF policy (if enabled)"
  value       = var.sku_name == "Premium_AzureFrontDoor" ? azurerm_cdn_frontdoor_firewall_policy.main[0].id : null
}

output "api_route_id" {
  description = "ID of the API route"
  value       = azurerm_cdn_frontdoor_route.api.id
}

output "static_route_id" {
  description = "ID of the static assets route"
  value       = azurerm_cdn_frontdoor_route.static.id
}

output "geo_routing_rule_set_id" {
  description = "ID of the geo-routing rule set (if enabled)"
  value       = var.enable_geo_routing ? azurerm_cdn_frontdoor_rule_set.geo_routing[0].id : null
}
