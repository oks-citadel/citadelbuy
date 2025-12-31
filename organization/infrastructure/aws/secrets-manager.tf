# Broxiva AWS Secrets Manager Configuration
# This Terraform configuration manages secrets for the Broxiva platform using AWS Secrets Manager

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "broxiva"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "enable_rotation" {
  description = "Enable automatic secret rotation"
  type        = bool
  default     = true
}

variable "rotation_days" {
  description = "Number of days between automatic rotation"
  type        = number
  default     = 30
}

# KMS Key for encrypting secrets
resource "aws_kms_key" "secrets" {
  description             = "${var.project_name}-${var.environment} secrets encryption key"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-secrets-key"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project_name}-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# Database Secrets
resource "aws_secretsmanager_secret" "postgres_credentials" {
  name                    = "${var.project_name}/${var.environment}/postgres/credentials"
  description             = "PostgreSQL database credentials"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-postgres-credentials"
    Environment = var.environment
    Project     = var.project_name
    Type        = "database"
  }
}

resource "aws_secretsmanager_secret_version" "postgres_credentials" {
  secret_id = aws_secretsmanager_secret.postgres_credentials.id
  secret_string = jsonencode({
    username = "broxiva_admin"
    password = random_password.postgres.result
    host     = "postgres.${var.environment}.broxiva.internal"
    port     = 5432
    database = "broxiva"
    url      = "postgresql://broxiva_admin:${random_password.postgres.result}@postgres.${var.environment}.broxiva.internal:5432/broxiva"
  })
}

# Redis Secrets
resource "aws_secretsmanager_secret" "redis_credentials" {
  name                    = "${var.project_name}/${var.environment}/redis/credentials"
  description             = "Redis credentials"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-credentials"
    Environment = var.environment
    Project     = var.project_name
    Type        = "cache"
  }
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    password = random_password.redis.result
    host     = "redis.${var.environment}.broxiva.internal"
    port     = 6379
    url      = "redis://:${random_password.redis.result}@redis.${var.environment}.broxiva.internal:6379"
  })
}

# JWT Secrets
resource "aws_secretsmanager_secret" "jwt_secrets" {
  name                    = "${var.project_name}/${var.environment}/jwt/secrets"
  description             = "JWT signing secrets"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-jwt-secrets"
    Environment = var.environment
    Project     = var.project_name
    Type        = "auth"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secrets" {
  secret_id = aws_secretsmanager_secret.jwt_secrets.id
  secret_string = jsonencode({
    access_token_secret  = random_password.jwt_access.result
    refresh_token_secret = random_password.jwt_refresh.result
    access_token_expiry  = "15m"
    refresh_token_expiry = "7d"
  })
}

# Stripe API Keys
resource "aws_secretsmanager_secret" "stripe_keys" {
  name                    = "${var.project_name}/${var.environment}/stripe/keys"
  description             = "Stripe API keys"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-stripe-keys"
    Environment = var.environment
    Project     = var.project_name
    Type        = "payment"
  }
}

# Note: Set these values manually after creation
resource "aws_secretsmanager_secret_version" "stripe_keys" {
  secret_id = aws_secretsmanager_secret.stripe_keys.id
  secret_string = jsonencode({
    secret_key      = "sk_${var.environment}_REPLACE_WITH_ACTUAL_KEY"
    publishable_key = "pk_${var.environment}_REPLACE_WITH_ACTUAL_KEY"
    webhook_secret  = "whsec_REPLACE_WITH_ACTUAL_SECRET"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# AWS SES Credentials
resource "aws_secretsmanager_secret" "ses_credentials" {
  name                    = "${var.project_name}/${var.environment}/ses/credentials"
  description             = "AWS SES SMTP credentials"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-ses-credentials"
    Environment = var.environment
    Project     = var.project_name
    Type        = "email"
  }
}

# OpenAI API Key
resource "aws_secretsmanager_secret" "openai_key" {
  name                    = "${var.project_name}/${var.environment}/openai/key"
  description             = "OpenAI API key"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-openai-key"
    Environment = var.environment
    Project     = var.project_name
    Type        = "ai"
  }
}

# Google OAuth Credentials
resource "aws_secretsmanager_secret" "google_oauth" {
  name                    = "${var.project_name}/${var.environment}/oauth/google"
  description             = "Google OAuth credentials"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-google-oauth"
    Environment = var.environment
    Project     = var.project_name
    Type        = "oauth"
  }
}

# Facebook OAuth Credentials
resource "aws_secretsmanager_secret" "facebook_oauth" {
  name                    = "${var.project_name}/${var.environment}/oauth/facebook"
  description             = "Facebook OAuth credentials"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-facebook-oauth"
    Environment = var.environment
    Project     = var.project_name
    Type        = "oauth"
  }
}

# Elasticsearch Credentials
resource "aws_secretsmanager_secret" "elasticsearch_credentials" {
  name                    = "${var.project_name}/${var.environment}/elasticsearch/credentials"
  description             = "Elasticsearch credentials"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-elasticsearch-credentials"
    Environment = var.environment
    Project     = var.project_name
    Type        = "search"
  }
}

# Session Secret
resource "aws_secretsmanager_secret" "session_secret" {
  name                    = "${var.project_name}/${var.environment}/session/secret"
  description             = "Session secret for cookie signing"
  kms_key_id              = aws_kms_key.secrets.key_id
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-session-secret"
    Environment = var.environment
    Project     = var.project_name
    Type        = "session"
  }
}

resource "aws_secretsmanager_secret_version" "session_secret" {
  secret_id = aws_secretsmanager_secret.session_secret.id
  secret_string = jsonencode({
    secret = random_password.session.result
  })
}

# Random passwords for auto-generated secrets
resource "random_password" "postgres" {
  length  = 32
  special = true
}

resource "random_password" "redis" {
  length  = 32
  special = true
}

resource "random_password" "jwt_access" {
  length  = 64
  special = true
}

resource "random_password" "jwt_refresh" {
  length  = 64
  special = true
}

resource "random_password" "session" {
  length  = 64
  special = true
}

# IAM Role for Kubernetes External Secrets Operator
resource "aws_iam_role" "external_secrets" {
  name = "${var.project_name}-${var.environment}-external-secrets"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}"
        }
        Condition = {
          StringEquals = {
            "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:external-secrets:external-secrets"
            "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-external-secrets-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Policy for External Secrets Operator
resource "aws_iam_policy" "external_secrets" {
  name        = "${var.project_name}-${var.environment}-external-secrets-policy"
  description = "Policy for External Secrets Operator to read secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecrets"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.external_secrets.arn
}

# Lambda function for automatic secret rotation
resource "aws_lambda_function" "rotate_secrets" {
  count         = var.enable_rotation ? 1 : 0
  filename      = "lambda/rotate-secrets.zip"
  function_name = "${var.project_name}-${var.environment}-rotate-secrets"
  role          = aws_iam_role.lambda_rotation[0].arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 300

  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT     = var.project_name
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rotate-secrets"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Role for Lambda rotation function
resource "aws_iam_role" "lambda_rotation" {
  count = var.enable_rotation ? 1 : 0
  name  = "${var.project_name}-${var.environment}-lambda-rotation"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_rotation_basic" {
  count      = var.enable_rotation ? 1 : 0
  role       = aws_iam_role.lambda_rotation[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_rotation_secrets" {
  count      = var.enable_rotation ? 1 : 0
  role       = aws_iam_role.lambda_rotation[0].name
  policy_arn = aws_iam_policy.external_secrets.arn
}

# Data sources
data "aws_caller_identity" "current" {}

data "aws_eks_cluster" "cluster" {
  name = "${var.project_name}-${var.environment}"
}

# CloudWatch Log Group for audit logging
resource "aws_cloudwatch_log_group" "secrets_audit" {
  name              = "/aws/secretsmanager/${var.project_name}/${var.environment}"
  retention_in_days = 90

  tags = {
    Name        = "${var.project_name}-${var.environment}-secrets-audit"
    Environment = var.environment
    Project     = var.project_name
  }
}

# EventBridge rule for secret access monitoring
resource "aws_cloudwatch_event_rule" "secret_access" {
  name        = "${var.project_name}-${var.environment}-secret-access"
  description = "Monitor secret access events"

  event_pattern = jsonencode({
    source      = ["aws.secretsmanager"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["secretsmanager.amazonaws.com"]
      eventName = [
        "GetSecretValue",
        "PutSecretValue",
        "DeleteSecret",
        "RotateSecret"
      ]
      requestParameters = {
        secretId = [{
          prefix = "${var.project_name}/${var.environment}/"
        }]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "secret_access_log" {
  rule      = aws_cloudwatch_event_rule.secret_access.name
  target_id = "SendToCloudWatchLogs"
  arn       = aws_cloudwatch_log_group.secrets_audit.arn
}

# Outputs
output "kms_key_id" {
  description = "KMS key ID for secrets encryption"
  value       = aws_kms_key.secrets.id
}

output "kms_key_arn" {
  description = "KMS key ARN for secrets encryption"
  value       = aws_kms_key.secrets.arn
}

output "external_secrets_role_arn" {
  description = "IAM role ARN for External Secrets Operator"
  value       = aws_iam_role.external_secrets.arn
}

output "secret_arns" {
  description = "Map of secret names to ARNs"
  value = {
    postgres_credentials      = aws_secretsmanager_secret.postgres_credentials.arn
    redis_credentials         = aws_secretsmanager_secret.redis_credentials.arn
    jwt_secrets               = aws_secretsmanager_secret.jwt_secrets.arn
    stripe_keys               = aws_secretsmanager_secret.stripe_keys.arn
    ses_credentials           = aws_secretsmanager_secret.ses_credentials.arn
    openai_key                = aws_secretsmanager_secret.openai_key.arn
    google_oauth              = aws_secretsmanager_secret.google_oauth.arn
    facebook_oauth            = aws_secretsmanager_secret.facebook_oauth.arn
    elasticsearch_credentials = aws_secretsmanager_secret.elasticsearch_credentials.arn
    session_secret            = aws_secretsmanager_secret.session_secret.arn
  }
}

output "audit_log_group" {
  description = "CloudWatch log group for audit logging"
  value       = aws_cloudwatch_log_group.secrets_audit.name
}
