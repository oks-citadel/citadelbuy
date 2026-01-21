# =============================================================================
# Marketing Messaging Module
# Broxiva E-Commerce Platform - Marketing Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = merge(var.common_tags, {
    Module      = "marketing/messaging"
    Platform    = "broxiva-marketing"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  sqs_queues = {
    seo_crawl = {
      name                       = "seo-crawl-queue"
      visibility_timeout_seconds = 300
      message_retention_seconds  = 1209600 # 14 days
      max_message_size           = 262144  # 256 KB
      delay_seconds              = 0
      receive_wait_time_seconds  = 20
      fifo                       = false
      content_based_deduplication = false
    }
    email_send = {
      name                       = "email-send-queue"
      visibility_timeout_seconds = 60
      message_retention_seconds  = 345600 # 4 days
      max_message_size           = 262144
      delay_seconds              = 0
      receive_wait_time_seconds  = 10
      fifo                       = true
      content_based_deduplication = true
    }
    analytics_events = {
      name                       = "analytics-events-queue"
      visibility_timeout_seconds = 30
      message_retention_seconds  = 86400 # 1 day
      max_message_size           = 262144
      delay_seconds              = 0
      receive_wait_time_seconds  = 5
      fifo                       = false
      content_based_deduplication = false
    }
    experiment_events = {
      name                       = "experiment-events-queue"
      visibility_timeout_seconds = 30
      message_retention_seconds  = 345600 # 4 days
      max_message_size           = 262144
      delay_seconds              = 0
      receive_wait_time_seconds  = 10
      fifo                       = false
      content_based_deduplication = false
    }
  }

  sns_topics = {
    marketing_events = {
      name         = "marketing-events"
      display_name = "Broxiva Marketing Events"
    }
    seo_events = {
      name         = "seo-events"
      display_name = "Broxiva SEO Events"
    }
    email_events = {
      name         = "email-events"
      display_name = "Broxiva Email Events"
    }
    experiment_events = {
      name         = "experiment-events"
      display_name = "Broxiva Experiment Events"
    }
    personalization_events = {
      name         = "personalization-events"
      display_name = "Broxiva Personalization Events"
    }
  }
}

# -----------------------------------------------------------------------------
# KMS Key for Messaging Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "messaging" {
  description             = "KMS key for Broxiva marketing messaging encryption"
  deletion_window_in_days = var.kms_deletion_window_days
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow SQS Service"
        Effect = "Allow"
        Principal = {
          Service = "sqs.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow SNS Service"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow EventBridge Service"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${local.region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${local.region}:${local.account_id}:*"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-messaging-kms"
  })
}

resource "aws_kms_alias" "messaging" {
  name          = "alias/${var.project_name}-${var.environment}-marketing-messaging"
  target_key_id = aws_kms_key.messaging.key_id
}

# -----------------------------------------------------------------------------
# EventBridge Event Bus
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_bus" "marketing" {
  name = "${var.project_name}-${var.environment}-marketing-events"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-events"
  })
}

# -----------------------------------------------------------------------------
# EventBridge Archive
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_archive" "marketing" {
  name             = "${var.project_name}-${var.environment}-marketing-archive"
  event_source_arn = aws_cloudwatch_event_bus.marketing.arn
  retention_days   = var.eventbridge_archive_retention_days

  event_pattern = jsonencode({
    source = [{ prefix = "broxiva.marketing" }]
  })
}

# -----------------------------------------------------------------------------
# EventBridge Rules
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "seo_events" {
  name           = "${var.project_name}-${var.environment}-seo-events"
  description    = "Route SEO events to SQS"
  event_bus_name = aws_cloudwatch_event_bus.marketing.name

  event_pattern = jsonencode({
    source      = ["broxiva.marketing.seo"]
    detail-type = [{ prefix = "SEO" }]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_rule" "email_events" {
  name           = "${var.project_name}-${var.environment}-email-events"
  description    = "Route email events to SQS"
  event_bus_name = aws_cloudwatch_event_bus.marketing.name

  event_pattern = jsonencode({
    source      = ["broxiva.marketing.email"]
    detail-type = [{ prefix = "Email" }]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_rule" "analytics_events" {
  name           = "${var.project_name}-${var.environment}-analytics-events"
  description    = "Route analytics events to SQS"
  event_bus_name = aws_cloudwatch_event_bus.marketing.name

  event_pattern = jsonencode({
    source      = ["broxiva.marketing.analytics"]
    detail-type = [{ prefix = "Analytics" }]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_rule" "experiment_events" {
  name           = "${var.project_name}-${var.environment}-experiment-events"
  description    = "Route experiment events to SQS"
  event_bus_name = aws_cloudwatch_event_bus.marketing.name

  event_pattern = jsonencode({
    source      = ["broxiva.marketing.experiments"]
    detail-type = [{ prefix = "Experiment" }]
  })

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# SQS Dead Letter Queues
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "dlq" {
  for_each = local.sqs_queues

  name = each.value.fifo ? "${var.project_name}-${var.environment}-${each.value.name}-dlq.fifo" : "${var.project_name}-${var.environment}-${each.value.name}-dlq"

  fifo_queue                  = each.value.fifo
  message_retention_seconds   = 1209600 # 14 days
  kms_master_key_id           = aws_kms_key.messaging.id
  kms_data_key_reuse_period_seconds = 300

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.value.name}-dlq"
    Type = "dead-letter-queue"
  })
}

# -----------------------------------------------------------------------------
# SQS Queues
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "marketing" {
  for_each = local.sqs_queues

  name = each.value.fifo ? "${var.project_name}-${var.environment}-${each.value.name}.fifo" : "${var.project_name}-${var.environment}-${each.value.name}"

  visibility_timeout_seconds  = each.value.visibility_timeout_seconds
  message_retention_seconds   = each.value.message_retention_seconds
  max_message_size            = each.value.max_message_size
  delay_seconds               = each.value.delay_seconds
  receive_wait_time_seconds   = each.value.receive_wait_time_seconds
  fifo_queue                  = each.value.fifo
  content_based_deduplication = each.value.fifo ? each.value.content_based_deduplication : null

  kms_master_key_id                 = aws_kms_key.messaging.id
  kms_data_key_reuse_period_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = var.sqs_max_receive_count
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.value.name}"
    Type = "primary-queue"
  })
}

# -----------------------------------------------------------------------------
# SQS Queue Policies
# -----------------------------------------------------------------------------
resource "aws_sqs_queue_policy" "marketing" {
  for_each = local.sqs_queues

  queue_url = aws_sqs_queue.marketing[each.key].id

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
        Resource = aws_sqs_queue.marketing[each.key].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:sns:${local.region}:${local.account_id}:${var.project_name}-${var.environment}-*"
          }
        }
      },
      {
        Sid    = "AllowEventBridgePublish"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.marketing[each.key].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:events:${local.region}:${local.account_id}:rule/${var.project_name}-${var.environment}-*"
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# SNS Topics
# -----------------------------------------------------------------------------
resource "aws_sns_topic" "marketing" {
  for_each = local.sns_topics

  name         = "${var.project_name}-${var.environment}-${each.value.name}"
  display_name = each.value.display_name

  kms_master_key_id = aws_kms_key.messaging.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.value.name}"
  })
}

# -----------------------------------------------------------------------------
# SNS Topic Policies
# -----------------------------------------------------------------------------
resource "aws_sns_topic_policy" "marketing" {
  for_each = local.sns_topics

  arn = aws_sns_topic.marketing[each.key].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountPublish"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.marketing[each.key].arn
      },
      {
        Sid    = "AllowEventBridgePublish"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.marketing[each.key].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:events:${local.region}:${local.account_id}:rule/${var.project_name}-${var.environment}-*"
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# SNS Subscriptions (SNS to SQS fanout)
# -----------------------------------------------------------------------------
resource "aws_sns_topic_subscription" "seo_to_sqs" {
  topic_arn = aws_sns_topic.marketing["seo_events"].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.marketing["seo_crawl"].arn

  raw_message_delivery = true
}

resource "aws_sns_topic_subscription" "email_to_sqs" {
  topic_arn = aws_sns_topic.marketing["email_events"].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.marketing["email_send"].arn

  raw_message_delivery = true
}

resource "aws_sns_topic_subscription" "experiment_to_sqs" {
  topic_arn = aws_sns_topic.marketing["experiment_events"].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.marketing["experiment_events"].arn

  raw_message_delivery = true
}

# -----------------------------------------------------------------------------
# EventBridge Targets
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_target" "seo_to_sqs" {
  rule           = aws_cloudwatch_event_rule.seo_events.name
  event_bus_name = aws_cloudwatch_event_bus.marketing.name
  target_id      = "seo-crawl-queue"
  arn            = aws_sqs_queue.marketing["seo_crawl"].arn

  sqs_target {
    message_group_id = null
  }
}

resource "aws_cloudwatch_event_target" "email_to_sqs" {
  rule           = aws_cloudwatch_event_rule.email_events.name
  event_bus_name = aws_cloudwatch_event_bus.marketing.name
  target_id      = "email-send-queue"
  arn            = aws_sqs_queue.marketing["email_send"].arn

  sqs_target {
    message_group_id = "email-events"
  }
}

resource "aws_cloudwatch_event_target" "analytics_to_sqs" {
  rule           = aws_cloudwatch_event_rule.analytics_events.name
  event_bus_name = aws_cloudwatch_event_bus.marketing.name
  target_id      = "analytics-events-queue"
  arn            = aws_sqs_queue.marketing["analytics_events"].arn

  sqs_target {
    message_group_id = null
  }
}

resource "aws_cloudwatch_event_target" "experiment_to_sqs" {
  rule           = aws_cloudwatch_event_rule.experiment_events.name
  event_bus_name = aws_cloudwatch_event_bus.marketing.name
  target_id      = "experiment-events-queue"
  arn            = aws_sqs_queue.marketing["experiment_events"].arn

  sqs_target {
    message_group_id = null
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms for DLQ
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  for_each = local.sqs_queues

  alarm_name          = "${var.project_name}-${var.environment}-${each.value.name}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_alarm_threshold
  alarm_description   = "Messages in ${each.value.name} DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.dlq[each.key].name
  }

  alarm_actions = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  tags = local.common_tags
}
