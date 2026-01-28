# Broxiva AWS Budgets Module
# Cost monitoring and alerting infrastructure
#
# This module provides:
# - Monthly cost budget with configurable thresholds (80%, 100%)
# - Forecasted cost budget alerts
# - SNS topic for budget notifications
# - Email subscriber for alerts
#
# NOTE: AWS Budgets requires IAM permissions: budgets:*

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# ============================================
# Data Sources
# ============================================

data "aws_caller_identity" "current" {}

# ============================================
# SNS Topic for Budget Notifications
# ============================================

resource "aws_sns_topic" "budget_alerts" {
  name         = "${var.name_prefix}-budget-alerts"
  display_name = "${var.display_name_prefix} Budget Alerts"

  # Enable encryption
  kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sns"

  tags = var.tags
}

# SNS Topic Policy to allow AWS Budgets to publish
resource "aws_sns_topic_policy" "budget_alerts" {
  arn = aws_sns_topic.budget_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBudgetsPublish"
        Effect = "Allow"
        Principal = {
          Service = "budgets.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.budget_alerts.arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Email subscriptions for budget alerts
resource "aws_sns_topic_subscription" "budget_email" {
  for_each = toset(var.notification_email_addresses)

  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# ============================================
# Monthly Cost Budget
# ============================================

resource "aws_budgets_budget" "monthly_cost" {
  name         = "${var.name_prefix}-monthly-cost"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_amount
  limit_unit   = var.budget_currency
  time_unit    = "MONTHLY"

  # Optional: Set budget period
  time_period_start = var.budget_start_date
  time_period_end   = var.budget_end_date

  # Cost filters (optional - can filter by service, linked account, etc.)
  dynamic "cost_filter" {
    for_each = var.cost_filters
    content {
      name   = cost_filter.key
      values = cost_filter.value
    }
  }

  # Cost types configuration
  cost_types {
    include_credit             = var.include_credits
    include_discount           = var.include_discounts
    include_other_subscription = true
    include_recurring          = true
    include_refund             = var.include_refunds
    include_subscription       = true
    include_support            = var.include_support_costs
    include_tax                = var.include_taxes
    include_upfront            = true
    use_amortized              = var.use_amortized_costs
    use_blended                = var.use_blended_costs
  }

  # 80% threshold notification (ACTUAL spend)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.warning_threshold_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
    subscriber_email_addresses = var.notification_email_addresses
  }

  # 100% threshold notification (ACTUAL spend)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.critical_threshold_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
    subscriber_email_addresses = var.notification_email_addresses
  }

  # Forecasted 100% threshold notification
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.forecast_threshold_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
    subscriber_email_addresses = var.notification_email_addresses
  }

  tags = var.tags
}

# ============================================
# Service-Specific Budgets (Optional)
# ============================================

resource "aws_budgets_budget" "service_budgets" {
  for_each = var.service_budgets

  name         = "${var.name_prefix}-${each.key}-budget"
  budget_type  = "COST"
  limit_amount = each.value.limit_amount
  limit_unit   = var.budget_currency
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = each.value.services
  }

  cost_types {
    include_credit             = var.include_credits
    include_discount           = var.include_discounts
    include_other_subscription = true
    include_recurring          = true
    include_refund             = var.include_refunds
    include_subscription       = true
    include_support            = var.include_support_costs
    include_tax                = var.include_taxes
    include_upfront            = true
    use_amortized              = var.use_amortized_costs
    use_blended                = var.use_blended_costs
  }

  # Warning threshold
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.warning_threshold_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
    subscriber_email_addresses = var.notification_email_addresses
  }

  # Critical threshold
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.critical_threshold_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
    subscriber_email_addresses = var.notification_email_addresses
  }

  tags = var.tags
}

# ============================================
# Usage Budget (Optional - for tracking specific usage)
# ============================================

resource "aws_budgets_budget" "usage_budgets" {
  for_each = var.usage_budgets

  name         = "${var.name_prefix}-${each.key}-usage"
  budget_type  = "USAGE"
  limit_amount = each.value.limit_amount
  limit_unit   = each.value.limit_unit
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "UsageType"
    values = each.value.usage_types
  }

  # Warning threshold
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.warning_threshold_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
    subscriber_email_addresses = var.notification_email_addresses
  }

  tags = var.tags
}

# ============================================
# CloudWatch Alarm for Budget Alerts (Optional)
# ============================================

resource "aws_cloudwatch_metric_alarm" "budget_exceeded" {
  count = var.enable_cloudwatch_alarm ? 1 : 0

  alarm_name          = "${var.name_prefix}-budget-exceeded"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BudgetExceeded"
  namespace           = "AWS/Billing"
  period              = 21600 # 6 hours
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Alarm when monthly budget is exceeded"

  alarm_actions = [aws_sns_topic.budget_alerts.arn]

  dimensions = {
    BudgetName = aws_budgets_budget.monthly_cost.name
  }

  tags = var.tags
}
