# =============================================================================
# Marketing EKS Namespaces Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

output "namespaces" {
  description = "Map of created namespace names"
  value = {
    for key, ns in kubernetes_namespace_v1.marketing : key => ns.metadata[0].name
  }
}

output "namespace_uids" {
  description = "Map of namespace UIDs"
  value = {
    for key, ns in kubernetes_namespace_v1.marketing : key => ns.metadata[0].uid
  }
}

output "service_account_names" {
  description = "Map of service account names per namespace"
  value = {
    for key, sa in kubernetes_service_account_v1.marketing : key => sa.metadata[0].name
  }
}

output "seo_namespace" {
  description = "SEO namespace name"
  value       = kubernetes_namespace_v1.marketing["seo"].metadata[0].name
}

output "content_namespace" {
  description = "Content namespace name"
  value       = kubernetes_namespace_v1.marketing["content"].metadata[0].name
}

output "analytics_namespace" {
  description = "Analytics namespace name"
  value       = kubernetes_namespace_v1.marketing["analytics"].metadata[0].name
}

output "personalization_namespace" {
  description = "Personalization namespace name"
  value       = kubernetes_namespace_v1.marketing["personalization"].metadata[0].name
}

output "lifecycle_namespace" {
  description = "Lifecycle namespace name"
  value       = kubernetes_namespace_v1.marketing["lifecycle"].metadata[0].name
}

output "growth_namespace" {
  description = "Growth namespace name"
  value       = kubernetes_namespace_v1.marketing["growth"].metadata[0].name
}

output "commerce_namespace" {
  description = "Commerce namespace name"
  value       = kubernetes_namespace_v1.marketing["commerce"].metadata[0].name
}

output "ai_marketing_namespace" {
  description = "AI Marketing namespace name"
  value       = kubernetes_namespace_v1.marketing["ai_marketing"].metadata[0].name
}

output "resource_quotas" {
  description = "Map of resource quota names"
  value = var.enable_resource_quotas ? {
    for key, quota in kubernetes_resource_quota_v1.marketing : key => quota.metadata[0].name
  } : {}
}

output "limit_ranges" {
  description = "Map of limit range names"
  value = var.enable_limit_ranges ? {
    for key, lr in kubernetes_limit_range_v1.marketing : key => lr.metadata[0].name
  } : {}
}
