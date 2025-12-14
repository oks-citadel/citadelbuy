# Staging Environment Variables

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
  default     = []
}

# Security Configuration
variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for network access"
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

variable "slack_webhook_url" {
  description = "Slack webhook URL"
  type        = string
  sensitive   = true
  default     = ""
}
