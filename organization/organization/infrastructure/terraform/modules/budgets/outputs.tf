# Broxiva AWS Budgets Module - Outputs
#
# Output values for AWS Budgets infrastructure

# ============================================
# SNS Topic Outputs
# ============================================

output "sns_topic_arn" {
  description = "ARN of the SNS topic for budget alerts"
  value       = aws_sns_topic.budget_alerts.arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic for budget alerts"
  value       = aws_sns_topic.budget_alerts.name
}

output "sns_topic_id" {
  description = "ID of the SNS topic for budget alerts"
  value       = aws_sns_topic.budget_alerts.id
}

# ============================================
# Monthly Cost Budget Outputs
# ============================================

output "monthly_cost_budget_arn" {
  description = "ARN of the monthly cost budget"
  value       = aws_budgets_budget.monthly_cost.arn
}

output "monthly_cost_budget_id" {
  description = "ID of the monthly cost budget"
  value       = aws_budgets_budget.monthly_cost.id
}

output "monthly_cost_budget_name" {
  description = "Name of the monthly cost budget"
  value       = aws_budgets_budget.monthly_cost.name
}

# ============================================
# Service Budget Outputs
# ============================================

output "service_budget_arns" {
  description = "Map of service budget names to ARNs"
  value = {
    for k, v in aws_budgets_budget.service_budgets : k => v.arn
  }
}

output "service_budget_ids" {
  description = "Map of service budget names to IDs"
  value = {
    for k, v in aws_budgets_budget.service_budgets : k => v.id
  }
}

# ============================================
# Usage Budget Outputs
# ============================================

output "usage_budget_arns" {
  description = "Map of usage budget names to ARNs"
  value = {
    for k, v in aws_budgets_budget.usage_budgets : k => v.arn
  }
}

output "usage_budget_ids" {
  description = "Map of usage budget names to IDs"
  value = {
    for k, v in aws_budgets_budget.usage_budgets : k => v.id
  }
}

# ============================================
# CloudWatch Alarm Outputs
# ============================================

output "cloudwatch_alarm_arn" {
  description = "ARN of the CloudWatch alarm for budget exceeded (if enabled)"
  value       = var.enable_cloudwatch_alarm ? aws_cloudwatch_metric_alarm.budget_exceeded[0].arn : null
}

output "cloudwatch_alarm_id" {
  description = "ID of the CloudWatch alarm for budget exceeded (if enabled)"
  value       = var.enable_cloudwatch_alarm ? aws_cloudwatch_metric_alarm.budget_exceeded[0].id : null
}

# ============================================
# Summary Outputs
# ============================================

output "budget_summary" {
  description = "Summary of all budgets created"
  value = {
    monthly_cost_budget = {
      name   = aws_budgets_budget.monthly_cost.name
      amount = "${var.monthly_budget_amount} ${var.budget_currency}"
      thresholds = {
        warning  = "${var.warning_threshold_percent}%"
        critical = "${var.critical_threshold_percent}%"
        forecast = "${var.forecast_threshold_percent}%"
      }
    }
    service_budgets = {
      for k, v in aws_budgets_budget.service_budgets : k => {
        name   = v.name
        amount = "${var.service_budgets[k].limit_amount} ${var.budget_currency}"
      }
    }
    usage_budgets = {
      for k, v in aws_budgets_budget.usage_budgets : k => {
        name   = v.name
        amount = "${var.usage_budgets[k].limit_amount} ${var.usage_budgets[k].limit_unit}"
      }
    }
    notification_topic  = aws_sns_topic.budget_alerts.arn
    notification_emails = var.notification_email_addresses
  }
}

# ============================================
# Integration Helper Outputs
# ============================================

output "notification_configuration" {
  description = "Configuration details for integrating with other systems"
  value = {
    sns_topic_arn         = aws_sns_topic.budget_alerts.arn
    sns_topic_name        = aws_sns_topic.budget_alerts.name
    notification_emails   = var.notification_email_addresses
    warning_threshold     = var.warning_threshold_percent
    critical_threshold    = var.critical_threshold_percent
    monthly_budget_amount = var.monthly_budget_amount
    budget_currency       = var.budget_currency
  }
}
