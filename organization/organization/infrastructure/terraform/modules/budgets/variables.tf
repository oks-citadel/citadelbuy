# Broxiva AWS Budgets Module - Variables
#
# Input variables for AWS Budgets infrastructure

# ============================================
# Naming and Tagging
# ============================================

variable "name_prefix" {
  description = "Prefix for resource names (e.g., 'broxiva-prod')"
  type        = string
  default     = "broxiva"
}

variable "display_name_prefix" {
  description = "Human-readable prefix for display names (e.g., 'Broxiva Production')"
  type        = string
  default     = "Broxiva"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ============================================
# Budget Configuration
# ============================================

variable "monthly_budget_amount" {
  description = "Monthly budget limit amount"
  type        = string

  validation {
    condition     = can(tonumber(var.monthly_budget_amount)) && tonumber(var.monthly_budget_amount) > 0
    error_message = "Monthly budget amount must be a positive number."
  }
}

variable "budget_currency" {
  description = "Currency for budget (USD, EUR, etc.)"
  type        = string
  default     = "USD"

  validation {
    condition     = contains(["USD", "EUR", "GBP", "JPY", "CAD", "AUD"], var.budget_currency)
    error_message = "Budget currency must be one of: USD, EUR, GBP, JPY, CAD, AUD."
  }
}

variable "budget_start_date" {
  description = "Start date for budget period (format: YYYY-MM-DD_HH:MM). Leave empty for no start date restriction."
  type        = string
  default     = null
}

variable "budget_end_date" {
  description = "End date for budget period (format: YYYY-MM-DD_HH:MM). Leave empty for ongoing budget."
  type        = string
  default     = null
}

# ============================================
# Threshold Configuration
# ============================================

variable "warning_threshold_percent" {
  description = "Warning threshold percentage for budget alerts (e.g., 80 for 80%)"
  type        = number
  default     = 80

  validation {
    condition     = var.warning_threshold_percent > 0 && var.warning_threshold_percent <= 100
    error_message = "Warning threshold must be between 1 and 100."
  }
}

variable "critical_threshold_percent" {
  description = "Critical threshold percentage for budget alerts (e.g., 100 for 100%)"
  type        = number
  default     = 100

  validation {
    condition     = var.critical_threshold_percent > 0 && var.critical_threshold_percent <= 200
    error_message = "Critical threshold must be between 1 and 200."
  }
}

variable "forecast_threshold_percent" {
  description = "Forecasted spend threshold percentage (e.g., 100 for 100%)"
  type        = number
  default     = 100

  validation {
    condition     = var.forecast_threshold_percent > 0 && var.forecast_threshold_percent <= 200
    error_message = "Forecast threshold must be between 1 and 200."
  }
}

# ============================================
# Notification Configuration
# ============================================

variable "notification_email_addresses" {
  description = "List of email addresses to receive budget alerts"
  type        = list(string)

  validation {
    condition     = length(var.notification_email_addresses) > 0
    error_message = "At least one notification email address is required."
  }
}

variable "kms_key_arn" {
  description = "KMS key ARN for SNS topic encryption. Leave empty for AWS managed key."
  type        = string
  default     = ""
}

# ============================================
# Cost Type Configuration
# ============================================

variable "include_credits" {
  description = "Include AWS credits in budget calculations"
  type        = bool
  default     = false
}

variable "include_discounts" {
  description = "Include discounts in budget calculations"
  type        = bool
  default     = true
}

variable "include_refunds" {
  description = "Include refunds in budget calculations"
  type        = bool
  default     = false
}

variable "include_support_costs" {
  description = "Include AWS Support costs in budget calculations"
  type        = bool
  default     = true
}

variable "include_taxes" {
  description = "Include taxes in budget calculations"
  type        = bool
  default     = true
}

variable "use_amortized_costs" {
  description = "Use amortized costs for Reserved Instances"
  type        = bool
  default     = false
}

variable "use_blended_costs" {
  description = "Use blended costs for consolidated billing"
  type        = bool
  default     = false
}

# ============================================
# Cost Filters (Optional)
# ============================================

variable "cost_filters" {
  description = "Map of cost filters to apply (e.g., Service, LinkedAccount, TagKeyValue)"
  type        = map(list(string))
  default     = {}

  # Example:
  # cost_filters = {
  #   "Service" = ["Amazon Elastic Compute Cloud - Compute"]
  #   "TagKeyValue" = ["user:Environment$production"]
  # }
}

# ============================================
# Service-Specific Budgets (Optional)
# ============================================

variable "service_budgets" {
  description = "Map of service-specific budgets"
  type = map(object({
    limit_amount = string
    services     = list(string)
  }))
  default = {}

  # Example:
  # service_budgets = {
  #   "ec2" = {
  #     limit_amount = "3000"
  #     services     = ["Amazon Elastic Compute Cloud - Compute"]
  #   }
  #   "rds" = {
  #     limit_amount = "2000"
  #     services     = ["Amazon Relational Database Service"]
  #   }
  # }
}

# ============================================
# Usage Budgets (Optional)
# ============================================

variable "usage_budgets" {
  description = "Map of usage-based budgets for tracking specific resource usage"
  type = map(object({
    limit_amount = string
    limit_unit   = string
    usage_types  = list(string)
  }))
  default = {}

  # Example:
  # usage_budgets = {
  #   "data_transfer" = {
  #     limit_amount = "1000"
  #     limit_unit   = "GB"
  #     usage_types  = ["USE2-DataTransfer-Out-Bytes"]
  #   }
  # }
}

# ============================================
# CloudWatch Integration
# ============================================

variable "enable_cloudwatch_alarm" {
  description = "Create CloudWatch alarm for budget exceeded events"
  type        = bool
  default     = false
}
