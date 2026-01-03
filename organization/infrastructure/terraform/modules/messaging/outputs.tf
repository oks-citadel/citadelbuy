# Broxiva Messaging Module - Outputs
#
# Output values for AWS messaging infrastructure (SES, SNS, SQS)

# ============================================
# SES Outputs
# ============================================

output "ses_domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

output "ses_domain_verification_token" {
  description = "Verification token for SES domain (add as TXT record)"
  value       = aws_ses_domain_identity.main.verification_token
}

output "ses_dkim_tokens" {
  description = "DKIM tokens for SES (add as CNAME records)"
  value       = aws_ses_domain_dkim.main.dkim_tokens
}

output "ses_configuration_set_name" {
  description = "Name of the SES configuration set"
  value       = aws_ses_configuration_set.main.name
}

output "ses_mail_from_domain" {
  description = "Custom MAIL FROM domain (if enabled)"
  value       = var.enable_custom_mail_from ? "mail.${var.domain_name}" : null
}

# ============================================
# SNS Outputs
# ============================================

output "sns_topic_transactional_arn" {
  description = "ARN of the transactional notifications SNS topic"
  value       = aws_sns_topic.transactional.arn
}

output "sns_topic_marketing_arn" {
  description = "ARN of the marketing notifications SNS topic"
  value       = aws_sns_topic.marketing.arn
}

output "sns_topic_alerts_arn" {
  description = "ARN of the system alerts SNS topic"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_email_events_arn" {
  description = "ARN of the email events SNS topic"
  value       = aws_sns_topic.email_events.arn
}

# ============================================
# SQS Outputs - Main Queues
# ============================================

output "sqs_notifications_queue_url" {
  description = "URL of the main notifications SQS queue"
  value       = aws_sqs_queue.notifications.url
}

output "sqs_notifications_queue_arn" {
  description = "ARN of the main notifications SQS queue"
  value       = aws_sqs_queue.notifications.arn
}

output "sqs_email_queue_url" {
  description = "URL of the email processing SQS queue"
  value       = aws_sqs_queue.email.url
}

output "sqs_email_queue_arn" {
  description = "ARN of the email processing SQS queue"
  value       = aws_sqs_queue.email.arn
}

output "sqs_sms_queue_url" {
  description = "URL of the SMS processing SQS queue"
  value       = aws_sqs_queue.sms.url
}

output "sqs_sms_queue_arn" {
  description = "ARN of the SMS processing SQS queue"
  value       = aws_sqs_queue.sms.arn
}

output "sqs_webhooks_queue_url" {
  description = "URL of the webhooks processing SQS queue"
  value       = aws_sqs_queue.webhooks.url
}

output "sqs_webhooks_queue_arn" {
  description = "ARN of the webhooks processing SQS queue"
  value       = aws_sqs_queue.webhooks.arn
}

output "sqs_email_events_queue_url" {
  description = "URL of the email events SQS queue"
  value       = aws_sqs_queue.email_events.url
}

output "sqs_email_events_queue_arn" {
  description = "ARN of the email events SQS queue"
  value       = aws_sqs_queue.email_events.arn
}

# ============================================
# SQS Outputs - Dead Letter Queues
# ============================================

output "sqs_notifications_dlq_url" {
  description = "URL of the notifications dead letter queue"
  value       = aws_sqs_queue.notifications_dlq.url
}

output "sqs_notifications_dlq_arn" {
  description = "ARN of the notifications dead letter queue"
  value       = aws_sqs_queue.notifications_dlq.arn
}

output "sqs_email_dlq_url" {
  description = "URL of the email dead letter queue"
  value       = aws_sqs_queue.email_dlq.url
}

output "sqs_sms_dlq_url" {
  description = "URL of the SMS dead letter queue"
  value       = aws_sqs_queue.sms_dlq.url
}

output "sqs_webhooks_dlq_url" {
  description = "URL of the webhooks dead letter queue"
  value       = aws_sqs_queue.webhooks_dlq.url
}

# ============================================
# IAM Policy Outputs
# ============================================

output "iam_policy_ses_send_arn" {
  description = "ARN of the IAM policy for SES sending"
  value       = aws_iam_policy.ses_send.arn
}

output "iam_policy_sns_sms_arn" {
  description = "ARN of the IAM policy for SNS SMS"
  value       = aws_iam_policy.sns_sms.arn
}

output "iam_policy_sqs_access_arn" {
  description = "ARN of the IAM policy for SQS access"
  value       = aws_iam_policy.sqs_access.arn
}

output "iam_policy_messaging_full_arn" {
  description = "ARN of the full messaging access IAM policy"
  value       = aws_iam_policy.messaging_full.arn
}

# ============================================
# DNS Records Required
# ============================================

output "dns_records_required" {
  description = "DNS records that must be added for SES verification"
  value = {
    ses_verification = {
      type  = "TXT"
      name  = "_amazonses.${var.domain_name}"
      value = aws_ses_domain_identity.main.verification_token
    }
    dkim = [
      for token in aws_ses_domain_dkim.main.dkim_tokens : {
        type  = "CNAME"
        name  = "${token}._domainkey.${var.domain_name}"
        value = "${token}.dkim.amazonses.com"
      }
    ]
    mail_from_mx = var.enable_custom_mail_from ? {
      type     = "MX"
      name     = "mail.${var.domain_name}"
      value    = "10 feedback-smtp.${data.aws_region.current.name}.amazonses.com"
      priority = 10
    } : null
    mail_from_spf = var.enable_custom_mail_from ? {
      type  = "TXT"
      name  = "mail.${var.domain_name}"
      value = "v=spf1 include:amazonses.com ~all"
    } : null
  }
}

# ============================================
# Environment Variables for Application
# ============================================

output "application_env_vars" {
  description = "Environment variables to configure in the application"
  value = {
    AWS_SES_REGION               = data.aws_region.current.name
    AWS_SES_FROM_EMAIL           = "noreply@${var.domain_name}"
    AWS_SES_FROM_NAME            = var.name_prefix
    AWS_SES_CONFIGURATION_SET    = aws_ses_configuration_set.main.name
    AWS_SNS_REGION               = data.aws_region.current.name
    AWS_SNS_SENDER_ID            = var.sns_sms_sender_id
    AWS_SNS_DEFAULT_SMS_TYPE     = var.sns_sms_default_type
    AWS_SQS_REGION               = data.aws_region.current.name
    AWS_SQS_QUEUE_NAME           = aws_sqs_queue.notifications.name
    AWS_SQS_QUEUE_URL            = aws_sqs_queue.notifications.url
    AWS_SQS_DLQ_URL              = aws_sqs_queue.notifications_dlq.url
    AWS_SQS_EMAIL_QUEUE_URL      = aws_sqs_queue.email.url
    AWS_SQS_SMS_QUEUE_URL        = aws_sqs_queue.sms.url
    AWS_SQS_WEBHOOKS_QUEUE_URL   = aws_sqs_queue.webhooks.url
  }
  sensitive = false
}
