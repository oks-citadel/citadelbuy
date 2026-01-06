# =============================================================================
# Marketing Email (SES) Module
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
    Module      = "marketing/email"
    Platform    = "broxiva-marketing"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  email_templates = {
    welcome = {
      name    = "welcome"
      subject = "Welcome to Broxiva!"
      html    = <<-HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>Welcome, {{name}}!</h1>
          <p>Thank you for joining Broxiva. We're excited to have you on board.</p>
          <p>Get started by exploring our latest products.</p>
          <a href="{{cta_url}}">Start Shopping</a>
        </body>
        </html>
      HTML
      text    = "Welcome, {{name}}! Thank you for joining Broxiva. Get started at {{cta_url}}"
    }
    order_confirmation = {
      name    = "order-confirmation"
      subject = "Order Confirmed - #{{order_id}}"
      html    = <<-HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>Order Confirmed!</h1>
          <p>Hi {{name}},</p>
          <p>Your order #{{order_id}} has been confirmed.</p>
          <p>Total: {{total}}</p>
          <a href="{{tracking_url}}">Track Your Order</a>
        </body>
        </html>
      HTML
      text    = "Hi {{name}}, Your order #{{order_id}} has been confirmed. Total: {{total}}. Track at {{tracking_url}}"
    }
    abandoned_cart = {
      name    = "abandoned-cart"
      subject = "You left something behind!"
      html    = <<-HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>Complete Your Purchase</h1>
          <p>Hi {{name}},</p>
          <p>You have items waiting in your cart!</p>
          <p>{{cart_items}}</p>
          <a href="{{cart_url}}">Complete Purchase</a>
        </body>
        </html>
      HTML
      text    = "Hi {{name}}, You have items in your cart! Complete your purchase at {{cart_url}}"
    }
    promotional = {
      name    = "promotional"
      subject = "{{promo_subject}}"
      html    = <<-HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>{{headline}}</h1>
          <p>{{body_content}}</p>
          <a href="{{cta_url}}">{{cta_text}}</a>
          <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
        </body>
        </html>
      HTML
      text    = "{{headline}}\n\n{{body_content}}\n\n{{cta_text}}: {{cta_url}}\n\nUnsubscribe: {{unsubscribe_url}}"
    }
    password_reset = {
      name    = "password-reset"
      subject = "Reset Your Password"
      html    = <<-HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>Password Reset Request</h1>
          <p>Hi {{name}},</p>
          <p>Click the link below to reset your password. This link expires in 24 hours.</p>
          <a href="{{reset_url}}">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        </body>
        </html>
      HTML
      text    = "Hi {{name}}, Reset your password at {{reset_url}}. Link expires in 24 hours."
    }
    newsletter = {
      name    = "newsletter"
      subject = "{{newsletter_subject}}"
      html    = <<-HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>{{headline}}</h1>
          {{content}}
          <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Manage Preferences</a></small></p>
        </body>
        </html>
      HTML
      text    = "{{headline}}\n\n{{content_text}}\n\nUnsubscribe: {{unsubscribe_url}}"
    }
  }
}

# -----------------------------------------------------------------------------
# KMS Key for SES Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "ses" {
  description             = "KMS key for Broxiva SES email encryption"
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
        Sid    = "Allow SES Service"
        Effect = "Allow"
        Principal = {
          Service = "ses.amazonaws.com"
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
        Sid    = "Allow S3 Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
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
        Sid    = "Allow Firehose Service"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-ses-kms"
  })
}

resource "aws_kms_alias" "ses" {
  name          = "alias/${var.project_name}-${var.environment}-ses"
  target_key_id = aws_kms_key.ses.key_id
}

# -----------------------------------------------------------------------------
# SES Domain Identity
# -----------------------------------------------------------------------------
resource "aws_ses_domain_identity" "marketing" {
  domain = var.email_domain
}

resource "aws_ses_domain_dkim" "marketing" {
  domain = aws_ses_domain_identity.marketing.domain
}

resource "aws_ses_domain_mail_from" "marketing" {
  domain           = aws_ses_domain_identity.marketing.domain
  mail_from_domain = "mail.${var.email_domain}"
}

# -----------------------------------------------------------------------------
# SES Configuration Set
# -----------------------------------------------------------------------------
resource "aws_ses_configuration_set" "marketing" {
  name = "${var.project_name}-${var.environment}-marketing"

  reputation_metrics_enabled = true
  sending_enabled            = true

  delivery_options {
    tls_policy = "REQUIRE"
  }

  tracking_options {
    custom_redirect_domain = var.tracking_domain != null ? var.tracking_domain : null
  }
}

# -----------------------------------------------------------------------------
# SES Event Destinations - SNS for Real-time Events
# -----------------------------------------------------------------------------
resource "aws_sns_topic" "ses_events" {
  name              = "${var.project_name}-${var.environment}-ses-events"
  kms_master_key_id = aws_kms_key.ses.id

  tags = local.common_tags
}

resource "aws_sns_topic_policy" "ses_events" {
  arn = aws_sns_topic.ses_events.arn

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
        Resource = aws_sns_topic.ses_events.arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = local.account_id
          }
        }
      }
    ]
  })
}

resource "aws_ses_event_destination" "sns" {
  name                   = "sns-events"
  configuration_set_name = aws_ses_configuration_set.marketing.name
  enabled                = true

  matching_types = [
    "send",
    "reject",
    "bounce",
    "complaint",
    "delivery",
    "open",
    "click",
    "renderingFailure"
  ]

  sns_destination {
    topic_arn = aws_sns_topic.ses_events.arn
  }
}

# -----------------------------------------------------------------------------
# SES Event Destinations - CloudWatch for Metrics
# -----------------------------------------------------------------------------
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "cloudwatch-metrics"
  configuration_set_name = aws_ses_configuration_set.marketing.name
  enabled                = true

  matching_types = [
    "send",
    "reject",
    "bounce",
    "complaint",
    "delivery",
    "open",
    "click"
  ]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "campaign"
    value_source   = "messageTag"
  }

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "template"
    value_source   = "messageTag"
  }
}

# -----------------------------------------------------------------------------
# S3 Bucket for SES Event Logs
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "ses_events" {
  bucket = "${var.project_name}-${var.environment}-ses-events-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-ses-events"
  })
}

resource "aws_s3_bucket_versioning" "ses_events" {
  bucket = aws_s3_bucket.ses_events.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ses_events" {
  bucket = aws_s3_bucket.ses_events.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.ses.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "ses_events" {
  bucket = aws_s3_bucket.ses_events.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "ses_events" {
  bucket = aws_s3_bucket.ses_events.id

  rule {
    id     = "archive-old-events"
    status = "Enabled"

    filter {
      prefix = ""
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    expiration {
      days = var.ses_event_retention_days
    }
  }
}

# -----------------------------------------------------------------------------
# IAM Role for Kinesis Firehose
# -----------------------------------------------------------------------------
resource "aws_iam_role" "ses_firehose" {
  name = "${var.project_name}-${var.environment}-ses-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = local.account_id
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "ses_firehose" {
  name = "${var.project_name}-${var.environment}-ses-firehose-policy"
  role = aws_iam_role.ses_firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.ses_events.arn,
          "${aws_s3_bucket.ses_events.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.ses.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.ses_firehose.arn}:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for Firehose
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "ses_firehose" {
  name              = "/aws/kinesisfirehose/${var.project_name}-${var.environment}-ses-events"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.ses.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_stream" "ses_firehose" {
  name           = "S3Delivery"
  log_group_name = aws_cloudwatch_log_group.ses_firehose.name
}

# -----------------------------------------------------------------------------
# Kinesis Firehose for Event Storage
# -----------------------------------------------------------------------------
resource "aws_kinesis_firehose_delivery_stream" "ses_events" {
  name        = "${var.project_name}-${var.environment}-ses-events"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn            = aws_iam_role.ses_firehose.arn
    bucket_arn          = aws_s3_bucket.ses_events.arn
    prefix              = "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/!{firehose:error-output-type}/"

    buffering_size     = 5
    buffering_interval = 300

    compression_format = "GZIP"

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.ses_firehose.name
      log_stream_name = aws_cloudwatch_log_stream.ses_firehose.name
    }
  }

  server_side_encryption {
    enabled  = true
    key_type = "CUSTOMER_MANAGED_CMK"
    key_arn  = aws_kms_key.ses.arn
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-ses-events-firehose"
  })
}

# -----------------------------------------------------------------------------
# SES Event Destination - Firehose for Long-term Storage
# -----------------------------------------------------------------------------
resource "aws_ses_event_destination" "firehose" {
  name                   = "firehose-archive"
  configuration_set_name = aws_ses_configuration_set.marketing.name
  enabled                = true

  matching_types = [
    "send",
    "reject",
    "bounce",
    "complaint",
    "delivery",
    "open",
    "click",
    "renderingFailure"
  ]

  kinesis_destination {
    stream_arn = aws_kinesis_firehose_delivery_stream.ses_events.arn
    role_arn   = aws_iam_role.ses_firehose.arn
  }
}

# -----------------------------------------------------------------------------
# SES Email Templates
# -----------------------------------------------------------------------------
resource "aws_ses_template" "marketing" {
  for_each = var.create_default_templates ? local.email_templates : {}

  name    = "${var.project_name}-${var.environment}-${each.value.name}"
  subject = each.value.subject
  html    = each.value.html
  text    = each.value.text
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms for SES Metrics
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "bounce_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-ses-bounce-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.BounceRate"
  namespace           = "AWS/SES"
  period              = 300
  statistic           = "Average"
  threshold           = var.bounce_rate_threshold
  alarm_description   = "SES bounce rate is above threshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "complaint_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-ses-complaint-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.ComplaintRate"
  namespace           = "AWS/SES"
  period              = 300
  statistic           = "Average"
  threshold           = var.complaint_rate_threshold
  alarm_description   = "SES complaint rate is above threshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "send_quota" {
  alarm_name          = "${var.project_name}-${var.environment}-ses-send-quota"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Send"
  namespace           = "AWS/SES"
  period              = 86400 # 24 hours
  statistic           = "Sum"
  threshold           = var.daily_send_quota_alarm_threshold
  alarm_description   = "SES daily send volume approaching quota"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  tags = local.common_tags
}
