# Production Environment Variables

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
}

# Database Configuration
variable "db_admin_username" {
  description = "Database administrator username"
  type        = string
  default     = "broxiva_admin"
}

variable "db_admin_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

# AKS Configuration
variable "aks_admin_group_ids" {
  description = "Azure AD group IDs for AKS admin access"
  type        = list(string)
}

# Security Configuration
variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for network access"
  type        = list(string)
  default     = []
}

variable "blocked_ip_ranges" {
  description = "Blocked IP ranges"
  type        = list(string)
  default     = []
}

variable "blocked_countries" {
  description = "Countries to block (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = []
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

# Monitoring Configuration
variable "oncall_email" {
  description = "On-call email for critical alerts"
  type        = string
}

variable "team_email" {
  description = "Team email for warning alerts"
  type        = string
}

variable "additional_alert_emails" {
  description = "Additional email addresses for alerts"
  type        = list(string)
  default     = []
}

variable "pagerduty_webhook_url" {
  description = "PagerDuty webhook URL"
  type        = string
  sensitive   = true
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL"
  type        = string
  sensitive   = true
  default     = ""
}

# DNS Configuration
variable "azure_verification_code" {
  description = "Azure domain verification code for broxiva.com (TXT record)"
  type        = string
  default     = ""
}
