# Broxiva Messaging Infrastructure Module
# AWS SNS, SES, and SQS configuration for notification delivery
#
# This module provides:
# - AWS SES for transactional and marketing emails
# - AWS SNS for SMS notifications and event fan-out
# - AWS SQS for async message processing with DLQs
#
# NOTE: External messaging providers (Twilio, SendGrid, etc.) are NOT supported.
# All messaging MUST use these AWS-native services.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# ============================================
# AWS SES - Email Service
# ============================================

# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# SES Domain DKIM
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# SES Domain Mail From (optional, for better deliverability)
resource "aws_ses_domain_mail_from" "main" {
  count = var.enable_custom_mail_from ? 1 : 0

  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.domain_name}"
}

# SES Configuration Set for tracking
resource "aws_ses_configuration_set" "main" {
  name = "${var.name_prefix}-email-tracking"

  reputation_metrics_enabled = true
  sending_enabled            = true

  delivery_options {
    tls_policy = "REQUIRE"
  }
}

# SES Event Destination - Send events to SNS
resource "aws_ses_event_destination" "sns" {
  name                   = "${var.name_prefix}-email-events"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["bounce", "complaint", "delivery", "send", "reject"]

  sns_destination {
    topic_arn = aws_sns_topic.email_events.arn
  }
}

# SES Event Destination - Send events to CloudWatch
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "${var.name_prefix}-email-metrics"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["bounce", "complaint", "delivery", "send", "reject", "open", "click"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:source-ip"
    value_source   = "messageTag"
  }
}

# ============================================
# AWS SNS - Notification Topics
# ============================================

# SNS Topic for transactional notifications (order updates, shipping, etc.)
resource "aws_sns_topic" "transactional" {
  name         = "${var.name_prefix}-transactional-notifications"
  display_name = "Broxiva Transactional Notifications"

  # Enable encryption
  kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sns"

  tags = var.tags
}

# SNS Topic for marketing notifications
resource "aws_sns_topic" "marketing" {
  name         = "${var.name_prefix}-marketing-notifications"
  display_name = "Broxiva Marketing Notifications"

  kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sns"

  tags = var.tags
}

# SNS Topic for system alerts
resource "aws_sns_topic" "alerts" {
  name         = "${var.name_prefix}-system-alerts"
  display_name = "Broxiva System Alerts"

  kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sns"

  tags = var.tags
}

# SNS Topic for email events (bounces, complaints, etc.)
resource "aws_sns_topic" "email_events" {
  name         = "${var.name_prefix}-email-events"
  display_name = "Broxiva Email Events"

  kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sns"

  tags = var.tags
}

# SNS Topic Policy for SES
resource "aws_sns_topic_policy" "email_events" {
  arn = aws_sns_topic.email_events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSESPublish"
        Effect = "Allow"
        Principal = {
          Service = "ses.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.email_events.arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# ============================================
# AWS SQS - Message Queues
# ============================================

# Main notification processing queue
resource "aws_sqs_queue" "notifications" {
  name                       = "${var.name_prefix}-notifications"
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KB
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20      # Long polling
  visibility_timeout_seconds = 300     # 5 minutes

  # Enable encryption
  sqs_managed_sse_enabled = true

  # Dead-letter queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = 3
  })

  tags = var.tags
}

# Notifications Dead Letter Queue
resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "${var.name_prefix}-notifications-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = var.tags
}

# Email queue (for async email processing)
resource "aws_sqs_queue" "email" {
  name                       = "${var.name_prefix}-email-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 300

  sqs_managed_sse_enabled = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq.arn
    maxReceiveCount     = 3
  })

  tags = var.tags
}

# Email Dead Letter Queue
resource "aws_sqs_queue" "email_dlq" {
  name                      = "${var.name_prefix}-email-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = var.tags
}

# SMS queue (for async SMS processing)
resource "aws_sqs_queue" "sms" {
  name                       = "${var.name_prefix}-sms-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 300

  sqs_managed_sse_enabled = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sms_dlq.arn
    maxReceiveCount     = 3
  })

  tags = var.tags
}

# SMS Dead Letter Queue
resource "aws_sqs_queue" "sms_dlq" {
  name                      = "${var.name_prefix}-sms-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = var.tags
}

# Webhook processing queue
resource "aws_sqs_queue" "webhooks" {
  name                       = "${var.name_prefix}-webhooks"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 300

  sqs_managed_sse_enabled = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.webhooks_dlq.arn
    maxReceiveCount     = 5
  })

  tags = var.tags
}

# Webhooks Dead Letter Queue
resource "aws_sqs_queue" "webhooks_dlq" {
  name                      = "${var.name_prefix}-webhooks-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = var.tags
}

# Email bounce/complaint handling queue
resource "aws_sqs_queue" "email_events" {
  name                       = "${var.name_prefix}-email-events"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 60

  sqs_managed_sse_enabled = true

  tags = var.tags
}

# SNS to SQS Subscription for email events
resource "aws_sns_topic_subscription" "email_events_to_sqs" {
  topic_arn = aws_sns_topic.email_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.email_events.arn
}

# SQS Policy to allow SNS to send messages
resource "aws_sqs_queue_policy" "email_events" {
  queue_url = aws_sqs_queue.email_events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSNSPublish"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.email_events.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.email_events.arn
          }
        }
      }
    ]
  })
}

# ============================================
# IAM - Service Access Policies
# ============================================

# IAM Policy for sending emails via SES
resource "aws_iam_policy" "ses_send" {
  name        = "${var.name_prefix}-ses-send"
  description = "Policy for sending emails via SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
          "ses:SendBulkTemplatedEmail"
        ]
        Resource = [
          # SES domain identity ARN
          "arn:aws:ses:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:identity/${var.domain_name}",
          # SES configuration set ARN
          "arn:aws:ses:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:configuration-set/${aws_ses_configuration_set.main.name}"
        ]
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_from_addresses
          }
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for SNS SMS
resource "aws_iam_policy" "sns_sms" {
  name        = "${var.name_prefix}-sns-sms"
  description = "Policy for sending SMS via SNS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SNSPublishToTopics"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        # Scope to specific SNS topics created in this module
        Resource = [
          aws_sns_topic.transactional.arn,
          aws_sns_topic.marketing.arn,
          aws_sns_topic.alerts.arn,
          aws_sns_topic.email_events.arn
        ]
      },
      {
        Sid    = "SNSPublishSMS"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        # For direct SMS publishing to phone numbers, must use * but with protocol condition
        Resource = "arn:aws:sns:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
        Condition = {
          StringEquals = {
            "sns:Protocol" = "sms"
          }
        }
      },
      {
        Sid    = "SNSSMSAccountAttributes"
        Effect = "Allow"
        Action = [
          "sns:SetSMSAttributes",
          "sns:GetSMSAttributes",
          "sns:CheckIfPhoneNumberIsOptedOut"
        ]
        # Account-level SMS operations - scoped to account
        Resource = "arn:aws:sns:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for SQS access
resource "aws_iam_policy" "sqs_access" {
  name        = "${var.name_prefix}-sqs-access"
  description = "Policy for accessing SQS queues"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.notifications.arn,
          aws_sqs_queue.email.arn,
          aws_sqs_queue.sms.arn,
          aws_sqs_queue.webhooks.arn,
          aws_sqs_queue.email_events.arn
        ]
      }
    ]
  })

  tags = var.tags
}

# Combined messaging policy
resource "aws_iam_policy" "messaging_full" {
  name        = "${var.name_prefix}-messaging-full"
  description = "Full access to messaging services (SES, SNS, SQS)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SESSendAccess"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
          "ses:SendBulkTemplatedEmail"
        ]
        # Scoped to specific SES identity and configuration set
        Resource = [
          "arn:aws:ses:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:identity/${var.domain_name}",
          "arn:aws:ses:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:configuration-set/${aws_ses_configuration_set.main.name}"
        ]
      },
      {
        Sid    = "SESAccountAccess"
        Effect = "Allow"
        Action = [
          "ses:GetSendQuota",
          "ses:GetSendStatistics"
        ]
        # Account-level SES operations - these require * but are read-only
        Resource = "*"
      },
      {
        Sid    = "SNSTopicAccess"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.transactional.arn,
          aws_sns_topic.marketing.arn,
          aws_sns_topic.alerts.arn,
          aws_sns_topic.email_events.arn
        ]
      },
      {
        Sid    = "SNSSMSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        # For direct SMS to phone numbers - scoped to account with protocol condition
        Resource = "arn:aws:sns:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
        Condition = {
          StringEquals = {
            "sns:Protocol" = "sms"
          }
        }
      },
      {
        Sid    = "SNSSMSAttributes"
        Effect = "Allow"
        Action = [
          "sns:SetSMSAttributes",
          "sns:GetSMSAttributes",
          "sns:CheckIfPhoneNumberIsOptedOut"
        ]
        # Account-level SMS attribute operations
        Resource = "arn:aws:sns:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          aws_sqs_queue.notifications.arn,
          aws_sqs_queue.email.arn,
          aws_sqs_queue.sms.arn,
          aws_sqs_queue.webhooks.arn,
          aws_sqs_queue.email_events.arn
        ]
      }
    ]
  })

  tags = var.tags
}

# ============================================
# CloudWatch Monitoring
# ============================================

# CloudWatch Dashboard for Messaging
resource "aws_cloudwatch_dashboard" "messaging" {
  dashboard_name = "${var.name_prefix}-messaging"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "SQS Queue Depths"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", aws_sqs_queue.notifications.name],
            [".", ".", ".", aws_sqs_queue.email.name],
            [".", ".", ".", aws_sqs_queue.sms.name],
            [".", ".", ".", aws_sqs_queue.webhooks.name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "DLQ Message Counts"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", aws_sqs_queue.notifications_dlq.name],
            [".", ".", ".", aws_sqs_queue.email_dlq.name],
            [".", ".", ".", aws_sqs_queue.sms_dlq.name],
            [".", ".", ".", aws_sqs_queue.webhooks_dlq.name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "SES Sending Statistics"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/SES", "Send", "ConfigurationSetName", aws_ses_configuration_set.main.name],
            [".", "Delivery", ".", "."],
            [".", "Bounce", ".", "."],
            [".", "Complaint", ".", "."]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "SNS Published Messages"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/SNS", "NumberOfMessagesPublished", "TopicName", aws_sns_topic.transactional.name],
            [".", ".", ".", aws_sns_topic.marketing.name],
            [".", ".", ".", aws_sns_topic.alerts.name]
          ]
        }
      }
    ]
  })
}

# CloudWatch Alarms for DLQ
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  for_each = {
    notifications = aws_sqs_queue.notifications_dlq.name
    email         = aws_sqs_queue.email_dlq.name
    sms           = aws_sqs_queue.sms_dlq.name
    webhooks      = aws_sqs_queue.webhooks_dlq.name
  }

  alarm_name          = "${var.name_prefix}-${each.key}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Messages in ${each.key} DLQ - indicates processing failures"

  dimensions = {
    QueueName = each.value
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# SES Bounce/Complaint Alarm
resource "aws_cloudwatch_metric_alarm" "ses_bounce_rate" {
  alarm_name          = "${var.name_prefix}-ses-bounce-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.BounceRate"
  namespace           = "AWS/SES"
  period              = 300
  statistic           = "Average"
  threshold           = 5 # 5% bounce rate
  alarm_description   = "SES bounce rate is too high"

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ses_complaint_rate" {
  alarm_name          = "${var.name_prefix}-ses-complaint-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.ComplaintRate"
  namespace           = "AWS/SES"
  period              = 300
  statistic           = "Average"
  threshold           = 0.1 # 0.1% complaint rate
  alarm_description   = "SES complaint rate is too high"

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
