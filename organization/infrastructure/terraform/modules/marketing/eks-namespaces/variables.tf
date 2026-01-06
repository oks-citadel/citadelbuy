# =============================================================================
# Marketing EKS Namespaces Module - Variables
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------
variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, production."
  }
}

variable "common_labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Resource Quotas Configuration
# -----------------------------------------------------------------------------
variable "enable_resource_quotas" {
  description = "Enable resource quotas for namespaces"
  type        = bool
  default     = true
}

variable "default_resource_quota" {
  description = "Default resource quota configuration for namespaces"
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    pods            = string
    services        = string
    secrets         = string
    configmaps      = string
  })
  default = {
    requests_cpu    = "4"
    requests_memory = "8Gi"
    limits_cpu      = "8"
    limits_memory   = "16Gi"
    pods            = "50"
    services        = "20"
    secrets         = "50"
    configmaps      = "50"
  }
}

variable "resource_quotas" {
  description = "Per-namespace resource quota overrides"
  type = map(object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    pods            = string
    services        = string
    secrets         = string
    configmaps      = string
  }))
  default = {}
}

# -----------------------------------------------------------------------------
# Limit Ranges Configuration
# -----------------------------------------------------------------------------
variable "enable_limit_ranges" {
  description = "Enable limit ranges for namespaces"
  type        = bool
  default     = true
}

variable "container_default_limits" {
  description = "Default container limits"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "500m"
    memory = "512Mi"
  }
}

variable "container_default_requests" {
  description = "Default container requests"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "100m"
    memory = "128Mi"
  }
}

variable "container_max_limits" {
  description = "Maximum container limits"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "4"
    memory = "8Gi"
  }
}

variable "container_min_limits" {
  description = "Minimum container limits"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "50m"
    memory = "64Mi"
  }
}

variable "pvc_max_storage" {
  description = "Maximum PVC storage size"
  type        = string
  default     = "100Gi"
}

variable "pvc_min_storage" {
  description = "Minimum PVC storage size"
  type        = string
  default     = "1Gi"
}

# -----------------------------------------------------------------------------
# Network Policies Configuration
# -----------------------------------------------------------------------------
variable "enable_network_policies" {
  description = "Enable network policies for namespaces"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Service Account Configuration
# -----------------------------------------------------------------------------
variable "irsa_role_arns" {
  description = "Map of namespace keys to IRSA role ARNs"
  type        = map(string)
  default     = null
}

variable "automount_service_account_token" {
  description = "Automount service account token"
  type        = bool
  default     = false
}
