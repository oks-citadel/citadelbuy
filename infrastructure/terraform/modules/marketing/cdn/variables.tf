# =============================================================================
# Marketing CDN Module - Variables
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "broxiva"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, production."
  }
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# KMS Configuration
# -----------------------------------------------------------------------------
variable "kms_deletion_window_days" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 30

  validation {
    condition     = var.kms_deletion_window_days >= 7 && var.kms_deletion_window_days <= 30
    error_message = "KMS deletion window must be between 7 and 30 days."
  }
}

# -----------------------------------------------------------------------------
# CloudFront Configuration
# -----------------------------------------------------------------------------
variable "domain_aliases" {
  description = "List of domain aliases for CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain (must be in us-east-1)"
  type        = string
  default     = null
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "waf_web_acl_arn" {
  description = "WAF Web ACL ARN to associate with CloudFront"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Origin Configuration
# -----------------------------------------------------------------------------
variable "app_origin_domain" {
  description = "Application origin domain (for dynamic content)"
  type        = string
  default     = null
}

variable "app_origin_custom_headers" {
  description = "Custom headers to send to application origin"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

# -----------------------------------------------------------------------------
# Cache Configuration
# -----------------------------------------------------------------------------
variable "seo_cache_ttl" {
  description = "Default TTL for SEO files (seconds)"
  type        = number
  default     = 3600 # 1 hour
}

variable "seo_cache_max_ttl" {
  description = "Maximum TTL for SEO files (seconds)"
  type        = number
  default     = 86400 # 24 hours
}

variable "seo_cache_min_ttl" {
  description = "Minimum TTL for SEO files (seconds)"
  type        = number
  default     = 0
}

variable "assets_cache_ttl" {
  description = "Default TTL for marketing assets (seconds)"
  type        = number
  default     = 86400 # 24 hours
}

variable "assets_cache_max_ttl" {
  description = "Maximum TTL for marketing assets (seconds)"
  type        = number
  default     = 31536000 # 1 year
}

variable "assets_cache_min_ttl" {
  description = "Minimum TTL for marketing assets (seconds)"
  type        = number
  default     = 0
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
variable "cors_allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

# -----------------------------------------------------------------------------
# Geo Restriction
# -----------------------------------------------------------------------------
variable "geo_restriction_type" {
  description = "Geo restriction type (none, whitelist, blacklist)"
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "whitelist", "blacklist"], var.geo_restriction_type)
    error_message = "Geo restriction type must be none, whitelist, or blacklist."
  }
}

variable "geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
variable "log_retention_days" {
  description = "Access log retention in days"
  type        = number
  default     = 365
}

# -----------------------------------------------------------------------------
# Monitoring Configuration
# -----------------------------------------------------------------------------
variable "error_rate_threshold" {
  description = "5xx error rate threshold for alarm (percentage)"
  type        = number
  default     = 5
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for alarm notifications"
  type        = string
  default     = null
}
