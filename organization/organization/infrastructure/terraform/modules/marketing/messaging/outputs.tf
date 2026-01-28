# =============================================================================
# Marketing Messaging Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# KMS Outputs
# -----------------------------------------------------------------------------
output "kms_key_id" {
  description = "KMS key ID for messaging encryption"
  value       = aws_kms_key.messaging.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN for messaging encryption"
  value       = aws_kms_key.messaging.arn
}

output "kms_key_alias" {
  description = "KMS key alias"
  value       = aws_kms_alias.messaging.name
}

# -----------------------------------------------------------------------------
# EventBridge Outputs
# -----------------------------------------------------------------------------
output "event_bus_name" {
  description = "EventBridge event bus name"
  value       = aws_cloudwatch_event_bus.marketing.name
}

output "event_bus_arn" {
  description = "EventBridge event bus ARN"
  value       = aws_cloudwatch_event_bus.marketing.arn
}

output "event_archive_name" {
  description = "EventBridge archive name"
  value       = aws_cloudwatch_event_archive.marketing.name
}

output "event_archive_arn" {
  description = "EventBridge archive ARN"
  value       = aws_cloudwatch_event_archive.marketing.arn
}

# -----------------------------------------------------------------------------
# SQS Queue Outputs
# -----------------------------------------------------------------------------
output "sqs_queue_urls" {
  description = "Map of SQS queue URLs"
  value = {
    for key, queue in aws_sqs_queue.marketing : key => queue.url
  }
}

output "sqs_queue_arns" {
  description = "Map of SQS queue ARNs"
  value = {
    for key, queue in aws_sqs_queue.marketing : key => queue.arn
  }
}

output "sqs_queue_names" {
  description = "Map of SQS queue names"
  value = {
    for key, queue in aws_sqs_queue.marketing : key => queue.name
  }
}

output "sqs_dlq_urls" {
  description = "Map of SQS DLQ URLs"
  value = {
    for key, queue in aws_sqs_queue.dlq : key => queue.url
  }
}

output "sqs_dlq_arns" {
  description = "Map of SQS DLQ ARNs"
  value = {
    for key, queue in aws_sqs_queue.dlq : key => queue.arn
  }
}

output "seo_crawl_queue_url" {
  description = "SEO crawl queue URL"
  value       = aws_sqs_queue.marketing["seo_crawl"].url
}

output "seo_crawl_queue_arn" {
  description = "SEO crawl queue ARN"
  value       = aws_sqs_queue.marketing["seo_crawl"].arn
}

output "email_send_queue_url" {
  description = "Email send queue URL"
  value       = aws_sqs_queue.marketing["email_send"].url
}

output "email_send_queue_arn" {
  description = "Email send queue ARN"
  value       = aws_sqs_queue.marketing["email_send"].arn
}

output "analytics_events_queue_url" {
  description = "Analytics events queue URL"
  value       = aws_sqs_queue.marketing["analytics_events"].url
}

output "analytics_events_queue_arn" {
  description = "Analytics events queue ARN"
  value       = aws_sqs_queue.marketing["analytics_events"].arn
}

output "experiment_events_queue_url" {
  description = "Experiment events queue URL"
  value       = aws_sqs_queue.marketing["experiment_events"].url
}

output "experiment_events_queue_arn" {
  description = "Experiment events queue ARN"
  value       = aws_sqs_queue.marketing["experiment_events"].arn
}

# -----------------------------------------------------------------------------
# SNS Topic Outputs
# -----------------------------------------------------------------------------
output "sns_topic_arns" {
  description = "Map of SNS topic ARNs"
  value = {
    for key, topic in aws_sns_topic.marketing : key => topic.arn
  }
}

output "sns_topic_names" {
  description = "Map of SNS topic names"
  value = {
    for key, topic in aws_sns_topic.marketing : key => topic.name
  }
}

output "marketing_events_topic_arn" {
  description = "Marketing events SNS topic ARN"
  value       = aws_sns_topic.marketing["marketing_events"].arn
}

output "seo_events_topic_arn" {
  description = "SEO events SNS topic ARN"
  value       = aws_sns_topic.marketing["seo_events"].arn
}

output "email_events_topic_arn" {
  description = "Email events SNS topic ARN"
  value       = aws_sns_topic.marketing["email_events"].arn
}

output "experiment_events_topic_arn" {
  description = "Experiment events SNS topic ARN"
  value       = aws_sns_topic.marketing["experiment_events"].arn
}

output "personalization_events_topic_arn" {
  description = "Personalization events SNS topic ARN"
  value       = aws_sns_topic.marketing["personalization_events"].arn
}

# -----------------------------------------------------------------------------
# EventBridge Rule Outputs
# -----------------------------------------------------------------------------
output "event_rule_arns" {
  description = "Map of EventBridge rule ARNs"
  value = {
    seo         = aws_cloudwatch_event_rule.seo_events.arn
    email       = aws_cloudwatch_event_rule.email_events.arn
    analytics   = aws_cloudwatch_event_rule.analytics_events.arn
    experiments = aws_cloudwatch_event_rule.experiment_events.arn
  }
}
