# =============================================================================
# Marketing IAM (IRSA Roles) Module
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

data "aws_iam_policy_document" "irsa_assume_role" {
  for_each = local.marketing_services

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:broxiva-${each.key}:${each.key}-service-account"]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_provider_url, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = merge(var.common_tags, {
    Module      = "marketing/iam"
    Platform    = "broxiva-marketing"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  marketing_services = {
    seo = {
      description = "SEO service for sitemap generation and crawl management"
      namespace   = "broxiva-seo"
    }
    content = {
      description = "Content management service"
      namespace   = "broxiva-content"
    }
    analytics = {
      description = "Marketing analytics service"
      namespace   = "broxiva-analytics"
    }
    personalization = {
      description = "Personalization engine service"
      namespace   = "broxiva-personalization"
    }
    lifecycle = {
      description = "Customer lifecycle marketing service"
      namespace   = "broxiva-lifecycle"
    }
    growth = {
      description = "Growth engineering and experimentation service"
      namespace   = "broxiva-growth"
    }
    commerce = {
      description = "Commerce marketing integrations service"
      namespace   = "broxiva-commerce"
    }
    ai_marketing = {
      description = "AI/ML marketing service"
      namespace   = "broxiva-ai-marketing"
    }
  }
}

# -----------------------------------------------------------------------------
# SEO Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "seo" {
  name               = "${var.project_name}-${var.environment}-seo-irsa"
  description        = "IRSA role for SEO service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["seo"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-seo-irsa"
    Service = "seo"
  })
}

resource "aws_iam_role_policy" "seo" {
  name = "${var.project_name}-${var.environment}-seo-policy"
  role = aws_iam_role.seo.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3SEOAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.seo_bucket_arn,
          "${var.seo_bucket_arn}/*"
        ]
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [var.seo_crawl_queue_arn]
      },
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = [var.cloudfront_distribution_arn]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Content Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "content" {
  name               = "${var.project_name}-${var.environment}-content-irsa"
  description        = "IRSA role for Content service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["content"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-content-irsa"
    Service = "content"
  })
}

resource "aws_iam_role_policy" "content" {
  name = "${var.project_name}-${var.environment}-content-policy"
  role = aws_iam_role.content.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3MarketingAssetsAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.marketing_assets_bucket_arn,
          "${var.marketing_assets_bucket_arn}/*"
        ]
      },
      {
        Sid    = "OpenSearchAccess"
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpPost",
          "es:ESHttpPut",
          "es:ESHttpDelete"
        ]
        Resource = ["${var.opensearch_domain_arn}/*"]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Analytics Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "analytics" {
  name               = "${var.project_name}-${var.environment}-analytics-irsa"
  description        = "IRSA role for Analytics service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["analytics"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-analytics-irsa"
    Service = "analytics"
  })
}

resource "aws_iam_role_policy" "analytics" {
  name = "${var.project_name}-${var.environment}-analytics-policy"
  role = aws_iam_role.analytics.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KinesisPutRecords"
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords",
          "kinesis:DescribeStream"
        ]
        Resource = [var.kinesis_stream_arn]
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [var.analytics_queue_arn]
      },
      {
        Sid    = "DynamoDBEventsAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Query",
          "dynamodb:GetItem"
        ]
        Resource = [
          var.marketing_events_table_arn,
          "${var.marketing_events_table_arn}/index/*"
        ]
      },
      {
        Sid    = "AthenaQueryAccess"
        Effect = "Allow"
        Action = [
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "athena:StopQueryExecution"
        ]
        Resource = [var.athena_workgroup_arn]
      },
      {
        Sid    = "GlueReadAccess"
        Effect = "Allow"
        Action = [
          "glue:GetTable",
          "glue:GetTables",
          "glue:GetDatabase",
          "glue:GetPartitions"
        ]
        Resource = [
          "arn:aws:glue:${local.region}:${local.account_id}:catalog",
          var.glue_database_arn,
          "${var.glue_database_arn}/*"
        ]
      },
      {
        Sid    = "S3DataLakeReadAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.data_lake_raw_bucket_arn,
          "${var.data_lake_raw_bucket_arn}/*",
          var.data_lake_curated_bucket_arn,
          "${var.data_lake_curated_bucket_arn}/*"
        ]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Personalization Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "personalization" {
  name               = "${var.project_name}-${var.environment}-personalization-irsa"
  description        = "IRSA role for Personalization service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["personalization"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-personalization-irsa"
    Service = "personalization"
  })
}

resource "aws_iam_role_policy" "personalization" {
  name = "${var.project_name}-${var.environment}-personalization-policy"
  role = aws_iam_role.personalization.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBUserProfilesAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.user_profiles_table_arn,
          "${var.user_profiles_table_arn}/index/*"
        ]
      },
      {
        Sid    = "DynamoDBFeatureFlagsRead"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          var.feature_flags_table_arn,
          "${var.feature_flags_table_arn}/index/*"
        ]
      },
      {
        Sid    = "OpenSearchAccess"
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpPost"
        ]
        Resource = ["${var.opensearch_domain_arn}/*"]
      },
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = [var.personalization_events_topic_arn]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Lifecycle Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "lifecycle" {
  name               = "${var.project_name}-${var.environment}-lifecycle-irsa"
  description        = "IRSA role for Lifecycle marketing service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["lifecycle"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-lifecycle-irsa"
    Service = "lifecycle"
  })
}

resource "aws_iam_role_policy" "lifecycle" {
  name = "${var.project_name}-${var.environment}-lifecycle-policy"
  role = aws_iam_role.lifecycle.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SESEmailAccess"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendTemplatedEmail",
          "ses:SendBulkTemplatedEmail",
          "ses:GetTemplate",
          "ses:ListTemplates"
        ]
        Resource = ["*"]
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_from_addresses
          }
        }
      },
      {
        Sid    = "SQSEmailQueueAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [var.email_send_queue_arn]
      },
      {
        Sid    = "DynamoDBUserProfilesRead"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          var.user_profiles_table_arn,
          "${var.user_profiles_table_arn}/index/*"
        ]
      },
      {
        Sid    = "EventBridgePutEvents"
        Effect = "Allow"
        Action = ["events:PutEvents"]
        Resource = [var.event_bus_arn]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Growth Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "growth" {
  name               = "${var.project_name}-${var.environment}-growth-irsa"
  description        = "IRSA role for Growth engineering service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["growth"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-growth-irsa"
    Service = "growth"
  })
}

resource "aws_iam_role_policy" "growth" {
  name = "${var.project_name}-${var.environment}-growth-policy"
  role = aws_iam_role.growth.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBExperimentsAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.experiments_table_arn,
          "${var.experiments_table_arn}/index/*"
        ]
      },
      {
        Sid    = "DynamoDBFeatureFlagsAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          var.feature_flags_table_arn,
          "${var.feature_flags_table_arn}/index/*"
        ]
      },
      {
        Sid    = "SQSExperimentEventsAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [var.experiment_events_queue_arn]
      },
      {
        Sid    = "SNSExperimentEventsPublish"
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = [var.experiment_events_topic_arn]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Commerce Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "commerce" {
  name               = "${var.project_name}-${var.environment}-commerce-irsa"
  description        = "IRSA role for Commerce marketing service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["commerce"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-commerce-irsa"
    Service = "commerce"
  })
}

resource "aws_iam_role_policy" "commerce" {
  name = "${var.project_name}-${var.environment}-commerce-policy"
  role = aws_iam_role.commerce.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBRead"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          var.user_profiles_table_arn,
          "${var.user_profiles_table_arn}/index/*",
          var.feature_flags_table_arn,
          "${var.feature_flags_table_arn}/index/*"
        ]
      },
      {
        Sid    = "EventBridgePutEvents"
        Effect = "Allow"
        Action = ["events:PutEvents"]
        Resource = [var.event_bus_arn]
      },
      {
        Sid    = "SNSMarketingEventsPublish"
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = [var.marketing_events_topic_arn]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# AI Marketing Service IRSA Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "ai_marketing" {
  name               = "${var.project_name}-${var.environment}-ai-marketing-irsa"
  description        = "IRSA role for AI Marketing service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume_role["ai_marketing"].json

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-ai-marketing-irsa"
    Service = "ai-marketing"
  })
}

resource "aws_iam_role_policy" "ai_marketing" {
  name = "${var.project_name}-${var.environment}-ai-marketing-policy"
  role = aws_iam_role.ai_marketing.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3DataLakeAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.data_lake_raw_bucket_arn,
          "${var.data_lake_raw_bucket_arn}/*",
          var.data_lake_curated_bucket_arn,
          "${var.data_lake_curated_bucket_arn}/*"
        ]
      },
      {
        Sid    = "DynamoDBFullAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.user_profiles_table_arn,
          "${var.user_profiles_table_arn}/index/*",
          var.marketing_events_table_arn,
          "${var.marketing_events_table_arn}/index/*"
        ]
      },
      {
        Sid    = "OpenSearchFullAccess"
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpPost",
          "es:ESHttpPut",
          "es:ESHttpDelete"
        ]
        Resource = ["${var.opensearch_domain_arn}/*"]
      },
      {
        Sid    = "KinesisPutRecords"
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = [var.kinesis_stream_arn]
      },
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = ["arn:aws:bedrock:${local.region}::foundation-model/*"]
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = local.region
          }
        }
      },
      {
        Sid    = "SageMakerEndpointInvoke"
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint",
          "sagemaker:InvokeEndpointAsync"
        ]
        Resource = ["arn:aws:sagemaker:${local.region}:${local.account_id}:endpoint/${var.project_name}-${var.environment}-*"]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      }
    ]
  })
}
