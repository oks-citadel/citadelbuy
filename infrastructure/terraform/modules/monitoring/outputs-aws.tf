# AWS Monitoring Module Outputs

# SNS Topics
output "critical_alerts_topic_arn" {
  description = "SNS topic ARN for critical alerts"
  value       = var.cloud_provider == "aws" ? aws_sns_topic.critical_alerts[0].arn : null
}

output "warning_alerts_topic_arn" {
  description = "SNS topic ARN for warning alerts"
  value       = var.cloud_provider == "aws" ? aws_sns_topic.warning_alerts[0].arn : null
}

# CloudWatch Log Groups
output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name for application logs"
  value       = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.application[0].name : null
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.application[0].arn : null
}

# CloudWatch Dashboard
output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = var.cloud_provider == "aws" ? aws_cloudwatch_dashboard.main[0].dashboard_name : null
}

# X-Ray
output "xray_sampling_rule_arn" {
  description = "X-Ray sampling rule ARN"
  value       = var.cloud_provider == "aws" && var.enable_xray ? aws_xray_sampling_rule.main[0].arn : null
}
