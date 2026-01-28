# =============================================================================
# ECS Fargate IAM Roles and Policies (Enhanced)
# Broxiva E-Commerce Platform - AWS Infrastructure
# =============================================================================
#
# This file provides ENHANCED IAM configurations for ECS Fargate with:
# 1. Least privilege permissions
# 2. Resource-level restrictions
# 3. Condition keys for additional security
# 4. GitHub Actions ECS deployment policy
#
# NOTE: This file extends the basic IAM roles defined in main.tf with
# additional security-hardened policies. The base roles in main.tf are
# used, and this file adds supplementary policies.
# =============================================================================

# -----------------------------------------------------------------------------
# Local Variables for IAM
# -----------------------------------------------------------------------------
locals {
  iam_account_id = data.aws_caller_identity.current.account_id
  iam_region     = data.aws_region.current.name

  # ECR repository ARN pattern - includes both current account and specified ECR account
  ecr_broxiva_arn = "arn:aws:ecr:${local.iam_region}:${local.iam_account_id}:repository/broxiva/*"
  ecr_shared_arn  = "arn:aws:ecr:${local.iam_region}:992382449461:repository/broxiva/*"

  # Secrets Manager ARN patterns for broxiva secrets
  # Format: broxiva/{environment}/* as specified in requirements
  secrets_env_pattern    = "arn:aws:secretsmanager:${local.iam_region}:${local.iam_account_id}:secret:broxiva/${local.environment}/*"
  secrets_prefix_pattern = "arn:aws:secretsmanager:${local.iam_region}:${local.iam_account_id}:secret:${var.name_prefix}/*"

  # KMS key alias for secrets encryption
  # Format: broxiva-{environment}-secrets-key as specified
  kms_secrets_key_alias = "alias/broxiva-${local.environment}-secrets-key"

  # CloudWatch Logs ARN pattern
  ecs_logs_arn_pattern = "arn:aws:logs:${local.iam_region}:${local.iam_account_id}:log-group:/aws/ecs/${var.name_prefix}/*"

  # S3 bucket ARNs - broxiva-prod-media and broxiva-prod-storage as specified
  s3_media_bucket_arn   = "arn:aws:s3:::broxiva-${local.environment}-media"
  s3_storage_bucket_arn = "arn:aws:s3:::broxiva-${local.environment}-storage"

  # Extract environment from name_prefix (e.g., "broxiva-prod" -> "prod")
  environment = length(regexall("-", var.name_prefix)) > 0 ? element(split("-", var.name_prefix), length(split("-", var.name_prefix)) - 1) : "prod"
}

# =============================================================================
# ENHANCED ECS TASK EXECUTION ROLE POLICIES
# =============================================================================
# These policies extend the basic execution role with security-hardened
# permissions following the principle of least privilege.
# =============================================================================

# Enhanced ECR access with specific repository restrictions
resource "aws_iam_role_policy" "execution_ecr_enhanced" {
  name = "${var.name_prefix}-execution-ecr-enhanced"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuthToken"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = local.iam_region
          }
        }
      },
      {
        Sid    = "ECRPullBroxivaImages"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages"
        ]
        Resource = [
          local.ecr_broxiva_arn,
          local.ecr_shared_arn
        ]
      }
    ]
  })
}

# Enhanced Secrets Manager access with environment scoping
resource "aws_iam_role_policy" "execution_secrets_enhanced" {
  name = "${var.name_prefix}-execution-secrets-enhanced"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerGetSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          local.secrets_env_pattern,
          local.secrets_prefix_pattern
        ]
      },
      {
        Sid    = "SecretsManagerDescribe"
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetResourcePolicy"
        ]
        Resource = [
          local.secrets_env_pattern,
          local.secrets_prefix_pattern
        ]
      }
    ]
  })
}

# Enhanced KMS decryption for secrets with key alias restrictions
resource "aws_iam_role_policy" "execution_kms_enhanced" {
  name = "${var.name_prefix}-execution-kms-enhanced"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSDecryptSecrets"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey*"
        ]
        Resource = [
          "arn:aws:kms:${local.iam_region}:${local.iam_account_id}:key/*"
        ]
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${local.iam_region}.amazonaws.com"
          }
          "ForAnyValue:StringLike" = {
            "kms:ResourceAliases" = [
              local.kms_secrets_key_alias,
              "alias/broxiva-${local.environment}-*"
            ]
          }
        }
      }
    ]
  })
}

# Enhanced CloudWatch Logs with specific log group restrictions
resource "aws_iam_role_policy" "execution_logs_enhanced" {
  name = "${var.name_prefix}-execution-logs-enhanced"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogsCreateStream"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          local.ecs_logs_arn_pattern,
          "${local.ecs_logs_arn_pattern}:log-stream:*",
          "arn:aws:logs:${local.iam_region}:${local.iam_account_id}:log-group:/ecs/${var.name_prefix}/*",
          "arn:aws:logs:${local.iam_region}:${local.iam_account_id}:log-group:/ecs/${var.name_prefix}/*:log-stream:*"
        ]
      },
      {
        Sid    = "CloudWatchLogsDescribe"
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:${local.iam_region}:${local.iam_account_id}:log-group:/aws/ecs/*",
          "arn:aws:logs:${local.iam_region}:${local.iam_account_id}:log-group:/ecs/*"
        ]
      }
    ]
  })
}

# =============================================================================
# ENHANCED ECS TASK ROLE POLICIES
# =============================================================================
# These policies provide application-level permissions with fine-grained
# access controls for S3, SQS, SNS, DynamoDB, and other AWS services.
# =============================================================================

# Enhanced S3 access for media and storage buckets
resource "aws_iam_role_policy" "task_s3_enhanced" {
  name = "${var.name_prefix}-task-s3-enhanced"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3MediaBucketObjectAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
          "s3:GetObjectTagging",
          "s3:PutObjectTagging",
          "s3:GetObjectAcl",
          "s3:PutObjectAcl"
        ]
        Resource = [
          "${local.s3_media_bucket_arn}/*"
        ]
        Condition = {
          StringEquals = {
            "s3:ResourceAccount" = local.iam_account_id
          }
        }
      },
      {
        Sid    = "S3MediaBucketList"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:ListBucketVersions"
        ]
        Resource = [
          local.s3_media_bucket_arn
        ]
      },
      {
        Sid    = "S3StorageBucketObjectAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "${local.s3_storage_bucket_arn}/*"
        ]
        Condition = {
          StringEquals = {
            "s3:ResourceAccount" = local.iam_account_id
          }
        }
      },
      {
        Sid    = "S3StorageBucketList"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          local.s3_storage_bucket_arn
        ]
      }
    ]
  })
}

# Enhanced SQS access with queue pattern restrictions
resource "aws_iam_role_policy" "task_sqs_enhanced" {
  name = "${var.name_prefix}-task-sqs-enhanced"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SQSSendReceiveMessages"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility",
          "sqs:PurgeQueue"
        ]
        Resource = [
          "arn:aws:sqs:${local.iam_region}:${local.iam_account_id}:${var.name_prefix}-*",
          "arn:aws:sqs:${local.iam_region}:${local.iam_account_id}:broxiva-${local.environment}-*"
        ]
      },
      {
        Sid    = "SQSListQueues"
        Effect = "Allow"
        Action = [
          "sqs:ListQueues"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = local.iam_region
          }
        }
      }
    ]
  })
}

# Enhanced SNS access with topic pattern restrictions
resource "aws_iam_role_policy" "task_sns_enhanced" {
  name = "${var.name_prefix}-task-sns-enhanced"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SNSPublishToTopics"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          "arn:aws:sns:${local.iam_region}:${local.iam_account_id}:${var.name_prefix}-*",
          "arn:aws:sns:${local.iam_region}:${local.iam_account_id}:broxiva-${local.environment}-*"
        ]
      },
      {
        Sid    = "SNSSubscribeManage"
        Effect = "Allow"
        Action = [
          "sns:Subscribe",
          "sns:Unsubscribe",
          "sns:ListSubscriptionsByTopic"
        ]
        Resource = [
          "arn:aws:sns:${local.iam_region}:${local.iam_account_id}:${var.name_prefix}-*"
        ]
      },
      {
        Sid    = "SNSListTopics"
        Effect = "Allow"
        Action = [
          "sns:ListTopics"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = local.iam_region
          }
        }
      }
    ]
  })
}

# DynamoDB access policy (conditional based on existing variable)
resource "aws_iam_role_policy" "task_dynamodb_enhanced" {
  count = var.enable_dynamodb_access ? 1 : 0

  name = "${var.name_prefix}-task-dynamodb-enhanced"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:ConditionCheckItem"
        ]
        Resource = [
          "arn:aws:dynamodb:${local.iam_region}:${local.iam_account_id}:table/${var.name_prefix}-*",
          "arn:aws:dynamodb:${local.iam_region}:${local.iam_account_id}:table/${var.name_prefix}-*/index/*",
          "arn:aws:dynamodb:${local.iam_region}:${local.iam_account_id}:table/broxiva-${local.environment}-*",
          "arn:aws:dynamodb:${local.iam_region}:${local.iam_account_id}:table/broxiva-${local.environment}-*/index/*"
        ]
      },
      {
        Sid    = "DynamoDBDescribe"
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:DescribeTimeToLive"
        ]
        Resource = [
          "arn:aws:dynamodb:${local.iam_region}:${local.iam_account_id}:table/${var.name_prefix}-*",
          "arn:aws:dynamodb:${local.iam_region}:${local.iam_account_id}:table/broxiva-${local.environment}-*"
        ]
      }
    ]
  })
}

# Runtime Secrets Manager access for applications
resource "aws_iam_role_policy" "task_secrets_runtime" {
  name = "${var.name_prefix}-task-secrets-runtime"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerReadRuntime"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          local.secrets_env_pattern,
          local.secrets_prefix_pattern
        ]
      }
    ]
  })
}

# KMS decryption for application-level encryption
resource "aws_iam_role_policy" "task_kms_application" {
  name = "${var.name_prefix}-task-kms-application"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSDecryptForServices"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = [
          "arn:aws:kms:${local.iam_region}:${local.iam_account_id}:key/*"
        ]
        Condition = {
          StringEquals = {
            "kms:ViaService" = [
              "s3.${local.iam_region}.amazonaws.com",
              "sqs.${local.iam_region}.amazonaws.com",
              "sns.${local.iam_region}.amazonaws.com",
              "secretsmanager.${local.iam_region}.amazonaws.com",
              "dynamodb.${local.iam_region}.amazonaws.com"
            ]
          }
          "ForAnyValue:StringLike" = {
            "kms:ResourceAliases" = [
              local.kms_secrets_key_alias,
              "alias/broxiva-${local.environment}-*",
              "alias/${var.name_prefix}-*"
            ]
          }
        }
      }
    ]
  })
}

# CloudWatch custom metrics policy
resource "aws_iam_role_policy" "task_cloudwatch_metrics" {
  name = "${var.name_prefix}-task-cloudwatch-metrics"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchPutMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = [
              "Broxiva/${local.environment}",
              "Broxiva/ECS",
              "ECS/ContainerInsights",
              "${var.name_prefix}"
            ]
          }
        }
      }
    ]
  })
}

# X-Ray tracing policy (optional)
resource "aws_iam_role_policy" "task_xray" {
  count = var.enable_xray_tracing ? 1 : 0

  name = "${var.name_prefix}-task-xray"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "XRayDaemonWrite"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ]
        Resource = "*"
      }
    ]
  })
}

# =============================================================================
# GITHUB ACTIONS ECS DEPLOYMENT POLICY
# =============================================================================
# This policy enables GitHub Actions to deploy to ECS Fargate:
# - Update ECS services
# - Register new task definitions
# - Describe ECS clusters and services
# - Pass IAM roles to ECS tasks
# =============================================================================

resource "aws_iam_policy" "github_actions_ecs_deploy" {
  name        = "${var.name_prefix}-github-actions-ecs-deploy"
  description = "Policy for GitHub Actions to deploy to ECS Fargate for Broxiva ${local.environment}"
  path        = "/ci-cd/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECSTaskDefinitions"
        Effect = "Allow"
        Action = [
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTaskDefinitions",
          "ecs:ListTaskDefinitionFamilies"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = local.iam_region
          }
        }
      },
      {
        Sid    = "ECSServiceManagement"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:ListServices"
        ]
        Resource = [
          "arn:aws:ecs:${local.iam_region}:${local.iam_account_id}:service/${var.name_prefix}-cluster/*"
        ]
      },
      {
        Sid    = "ECSClusterDescribe"
        Effect = "Allow"
        Action = [
          "ecs:DescribeClusters",
          "ecs:ListClusters"
        ]
        Resource = [
          "arn:aws:ecs:${local.iam_region}:${local.iam_account_id}:cluster/${var.name_prefix}-cluster"
        ]
      },
      {
        Sid    = "ECSTaskOperations"
        Effect = "Allow"
        Action = [
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RunTask",
          "ecs:StopTask"
        ]
        Resource = [
          "arn:aws:ecs:${local.iam_region}:${local.iam_account_id}:task/${var.name_prefix}-cluster/*",
          "arn:aws:ecs:${local.iam_region}:${local.iam_account_id}:task-definition/${var.name_prefix}-*:*"
        ]
      },
      {
        Sid    = "PassRoleToECS"
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_iam_role.ecs_task_execution.arn,
          aws_iam_role.ecs_task.arn
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
      {
        Sid    = "CloudWatchLogsForDeployment"
        Effect = "Allow"
        Action = [
          "logs:GetLogEvents",
          "logs:DescribeLogStreams",
          "logs:FilterLogEvents"
        ]
        Resource = [
          local.ecs_logs_arn_pattern,
          "${local.ecs_logs_arn_pattern}:log-stream:*",
          "arn:aws:logs:${local.iam_region}:${local.iam_account_id}:log-group:/ecs/${var.name_prefix}/*",
          "arn:aws:logs:${local.iam_region}:${local.iam_account_id}:log-group:/ecs/${var.name_prefix}/*:log-stream:*"
        ]
      },
      {
        Sid    = "ECSServiceLinkedRole"
        Effect = "Allow"
        Action = [
          "iam:CreateServiceLinkedRole"
        ]
        Resource = "arn:aws:iam::${local.iam_account_id}:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
        Condition = {
          StringEquals = {
            "iam:AWSServiceName" = "ecs.amazonaws.com"
          }
        }
      },
      {
        Sid    = "ApplicationAutoScaling"
        Effect = "Allow"
        Action = [
          "application-autoscaling:DescribeScalableTargets",
          "application-autoscaling:DescribeScalingActivities",
          "application-autoscaling:DescribeScalingPolicies"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = local.iam_region
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.name_prefix}-github-actions-ecs-deploy"
    Purpose     = "ci-cd"
    Environment = local.environment
  })
}

# Attach the ECS deployment policy to GitHub Actions role if specified
resource "aws_iam_role_policy_attachment" "github_actions_ecs_deploy" {
  count = var.github_actions_role_name != "" ? 1 : 0

  role       = var.github_actions_role_name
  policy_arn = aws_iam_policy.github_actions_ecs_deploy.arn
}

# =============================================================================
# ADDITIONAL VARIABLES FOR IAM
# =============================================================================
# These variables are used by the IAM policies defined in this file

variable "enable_dynamodb_access" {
  description = "Enable DynamoDB access for the ECS Task Role"
  type        = bool
  default     = false
}

variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing permissions for the ECS Task Role"
  type        = bool
  default     = false
}

variable "github_actions_role_name" {
  description = "Name of the existing GitHub Actions IAM role to attach ECS deployment policy to. Leave empty to skip."
  type        = string
  default     = ""
}

# =============================================================================
# IAM-SPECIFIC OUTPUTS
# =============================================================================

output "github_actions_ecs_policy_arn" {
  description = "ARN of the GitHub Actions ECS deployment policy"
  value       = aws_iam_policy.github_actions_ecs_deploy.arn
}

output "github_actions_ecs_policy_name" {
  description = "Name of the GitHub Actions ECS deployment policy"
  value       = aws_iam_policy.github_actions_ecs_deploy.name
}
