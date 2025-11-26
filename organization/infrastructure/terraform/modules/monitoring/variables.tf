# Monitoring Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Retention
variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Alert Recipients
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
  description = "PagerDuty webhook URL for critical alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

# Alert Thresholds
variable "response_time_threshold_ms" {
  description = "Response time threshold in milliseconds"
  type        = number
  default     = 2000
}

variable "failed_requests_threshold" {
  description = "Failed requests count threshold"
  type        = number
  default     = 10
}

variable "exceptions_threshold" {
  description = "Exceptions count threshold"
  type        = number
  default     = 50
}

variable "error_spike_threshold" {
  description = "Error spike threshold count"
  type        = number
  default     = 100
}

# Resource IDs for Monitoring
variable "aks_cluster_id" {
  description = "AKS cluster ID for monitoring"
  type        = string
  default     = ""
}

variable "database_id" {
  description = "Database server ID for monitoring"
  type        = string
  default     = ""
}

variable "app_url" {
  description = "Application URL for availability tests"
  type        = string
}
