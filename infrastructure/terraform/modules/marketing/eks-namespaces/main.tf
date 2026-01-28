# =============================================================================
# Marketing EKS Namespaces Module
# Broxiva E-Commerce Platform - Marketing Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  namespaces = {
    seo = {
      name        = "broxiva-seo"
      description = "SEO services including sitemap generation, crawl management, and search optimization"
    }
    content = {
      name        = "broxiva-content"
      description = "Content management services for marketing assets and CMS"
    }
    analytics = {
      name        = "broxiva-analytics"
      description = "Marketing analytics, tracking, and reporting services"
    }
    personalization = {
      name        = "broxiva-personalization"
      description = "Personalization engine and recommendation services"
    }
    lifecycle = {
      name        = "broxiva-lifecycle"
      description = "Customer lifecycle marketing and automation services"
    }
    growth = {
      name        = "broxiva-growth"
      description = "Growth engineering and experimentation platform"
    }
    commerce = {
      name        = "broxiva-commerce"
      description = "Commerce marketing integrations and promotions"
    }
    ai_marketing = {
      name        = "broxiva-ai-marketing"
      description = "AI/ML marketing services including predictive analytics"
    }
  }

  common_labels = merge(var.common_labels, {
    "app.kubernetes.io/managed-by" = "terraform"
    "app.kubernetes.io/part-of"    = "broxiva-marketing"
    "broxiva.com/platform"         = "marketing"
    "broxiva.com/environment"      = var.environment
  })

  common_annotations = {
    "broxiva.com/terraform-module" = "marketing/eks-namespaces"
    "broxiva.com/created-by"       = "infrastructure-team"
  }
}

# -----------------------------------------------------------------------------
# Kubernetes Namespaces
# -----------------------------------------------------------------------------
resource "kubernetes_namespace_v1" "marketing" {
  for_each = local.namespaces

  metadata {
    name = each.value.name

    labels = merge(local.common_labels, {
      "app.kubernetes.io/name"      = each.value.name
      "app.kubernetes.io/component" = each.key
      "broxiva.com/service-domain"  = each.key
    })

    annotations = merge(local.common_annotations, {
      "broxiva.com/description" = each.value.description
    })
  }
}

# -----------------------------------------------------------------------------
# Resource Quotas for each namespace
# -----------------------------------------------------------------------------
resource "kubernetes_resource_quota_v1" "marketing" {
  for_each = var.enable_resource_quotas ? local.namespaces : {}

  metadata {
    name      = "${each.value.name}-quota"
    namespace = kubernetes_namespace_v1.marketing[each.key].metadata[0].name

    labels = local.common_labels
  }

  spec {
    hard = {
      "requests.cpu"    = lookup(var.resource_quotas, each.key, var.default_resource_quota).requests_cpu
      "requests.memory" = lookup(var.resource_quotas, each.key, var.default_resource_quota).requests_memory
      "limits.cpu"      = lookup(var.resource_quotas, each.key, var.default_resource_quota).limits_cpu
      "limits.memory"   = lookup(var.resource_quotas, each.key, var.default_resource_quota).limits_memory
      "pods"            = lookup(var.resource_quotas, each.key, var.default_resource_quota).pods
      "services"        = lookup(var.resource_quotas, each.key, var.default_resource_quota).services
      "secrets"         = lookup(var.resource_quotas, each.key, var.default_resource_quota).secrets
      "configmaps"      = lookup(var.resource_quotas, each.key, var.default_resource_quota).configmaps
    }
  }
}

# -----------------------------------------------------------------------------
# Limit Ranges for each namespace
# -----------------------------------------------------------------------------
resource "kubernetes_limit_range_v1" "marketing" {
  for_each = var.enable_limit_ranges ? local.namespaces : {}

  metadata {
    name      = "${each.value.name}-limits"
    namespace = kubernetes_namespace_v1.marketing[each.key].metadata[0].name

    labels = local.common_labels
  }

  spec {
    limit {
      type = "Container"
      default = {
        cpu    = var.container_default_limits.cpu
        memory = var.container_default_limits.memory
      }
      default_request = {
        cpu    = var.container_default_requests.cpu
        memory = var.container_default_requests.memory
      }
      max = {
        cpu    = var.container_max_limits.cpu
        memory = var.container_max_limits.memory
      }
      min = {
        cpu    = var.container_min_limits.cpu
        memory = var.container_min_limits.memory
      }
    }

    limit {
      type = "PersistentVolumeClaim"
      max = {
        storage = var.pvc_max_storage
      }
      min = {
        storage = var.pvc_min_storage
      }
    }
  }
}

# -----------------------------------------------------------------------------
# Network Policies - Default deny all ingress
# -----------------------------------------------------------------------------
resource "kubernetes_network_policy_v1" "deny_all_ingress" {
  for_each = var.enable_network_policies ? local.namespaces : {}

  metadata {
    name      = "default-deny-ingress"
    namespace = kubernetes_namespace_v1.marketing[each.key].metadata[0].name

    labels = local.common_labels
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress"]
  }
}

# -----------------------------------------------------------------------------
# Network Policies - Allow same namespace traffic
# -----------------------------------------------------------------------------
resource "kubernetes_network_policy_v1" "allow_same_namespace" {
  for_each = var.enable_network_policies ? local.namespaces : {}

  metadata {
    name      = "allow-same-namespace"
    namespace = kubernetes_namespace_v1.marketing[each.key].metadata[0].name

    labels = local.common_labels
  }

  spec {
    pod_selector {}

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "app.kubernetes.io/name" = each.value.name
          }
        }
      }
    }

    policy_types = ["Ingress"]
  }
}

# -----------------------------------------------------------------------------
# Network Policies - Allow from marketing platform namespaces
# -----------------------------------------------------------------------------
resource "kubernetes_network_policy_v1" "allow_marketing_platform" {
  for_each = var.enable_network_policies ? local.namespaces : {}

  metadata {
    name      = "allow-marketing-platform"
    namespace = kubernetes_namespace_v1.marketing[each.key].metadata[0].name

    labels = local.common_labels
  }

  spec {
    pod_selector {}

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "broxiva.com/platform" = "marketing"
          }
        }
      }
    }

    policy_types = ["Ingress"]
  }
}

# -----------------------------------------------------------------------------
# Service Accounts for each namespace
# -----------------------------------------------------------------------------
resource "kubernetes_service_account_v1" "marketing" {
  for_each = local.namespaces

  metadata {
    name      = "${each.key}-service-account"
    namespace = kubernetes_namespace_v1.marketing[each.key].metadata[0].name

    labels = merge(local.common_labels, {
      "app.kubernetes.io/component" = each.key
    })

    annotations = var.irsa_role_arns != null ? {
      "eks.amazonaws.com/role-arn" = lookup(var.irsa_role_arns, each.key, "")
    } : {}
  }

  automount_service_account_token = var.automount_service_account_token
}
