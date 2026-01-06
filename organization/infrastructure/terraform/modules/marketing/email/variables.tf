# =============================================================================
# Marketing Email (SES) Module - Variables
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
# SES Configuration
# -----------------------------------------------------------------------------
variable "email_domain" {
  description = "Email domain for SES identity"
  type        = string
}

variable "tracking_domain" {
  description = "Custom domain for email tracking (optional)"
  type        = string
  default     = null
}

variable "create_default_templates" {
  description = "Create default email templates"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Event Retention
# -----------------------------------------------------------------------------
variable "ses_event_retention_days" {
  description = "Number of days to retain SES event logs in S3"
  type        = number
  default     = 2555 # ~7 years for compliance
}

# -----------------------------------------------------------------------------
# Monitoring Configuration
# -----------------------------------------------------------------------------
variable "bounce_rate_threshold" {
  description = "Bounce rate threshold for alarm (0.0-1.0)"
  type        = number
  default     = 0.05 # 5%

  validation {
    condition     = var.bounce_rate_threshold >= 0 && var.bounce_rate_threshold <= 1
    error_message = "Bounce rate threshold must be between 0 and 1."
  }
}

variable "complaint_rate_threshold" {
  description = "Complaint rate threshold for alarm (0.0-1.0)"
  type        = number
  default     = 0.001 # 0.1%

  validation {
    condition     = var.complaint_rate_threshold >= 0 && var.complaint_rate_threshold <= 1
    error_message = "Complaint rate threshold must be between 0 and 1."
  }
}

variable "daily_send_quota_alarm_threshold" {
  description = "Daily send count to trigger quota warning alarm"
  type        = number
  default     = 40000 # Default SES quota is 50,000
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for alarm notifications"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}
