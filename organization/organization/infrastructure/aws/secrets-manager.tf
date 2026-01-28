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

# Lambda rotation function Python code
locals {
  rotation_lambda_code = <<-PYTHON
import boto3
import json
import logging
import os
import string
import secrets as py_secrets
import psycopg2

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    AWS Secrets Manager rotation handler for RDS PostgreSQL credentials.
    Handles the four-step rotation workflow:
    - createSecret: Generate new credentials
    - setSecret: Set credentials in the database
    - testSecret: Verify the new credentials work
    - finishSecret: Mark the new version as current
    """
    arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    secrets_client = boto3.client('secretsmanager')

    # Verify the secret exists and has the correct version stage
    metadata = secrets_client.describe_secret(SecretId=arn)
    if not metadata['RotationEnabled']:
        logger.error(f"Secret {arn} is not enabled for rotation")
        raise ValueError(f"Secret {arn} is not enabled for rotation")

    versions = metadata['VersionIdsToStages']
    if token not in versions:
        logger.error(f"Secret version {token} has no stage for rotation of secret {arn}")
        raise ValueError(f"Secret version {token} has no stage for rotation of secret {arn}")

    if "AWSCURRENT" in versions[token]:
        logger.info(f"Secret version {token} already set as AWSCURRENT for secret {arn}")
        return
    elif "AWSPENDING" not in versions[token]:
        logger.error(f"Secret version {token} not set as AWSPENDING for rotation of secret {arn}")
        raise ValueError(f"Secret version {token} not set as AWSPENDING for rotation of secret {arn}")

    # Route to the appropriate step
    if step == "createSecret":
        create_secret(secrets_client, arn, token)
    elif step == "setSecret":
        set_secret(secrets_client, arn, token)
    elif step == "testSecret":
        test_secret(secrets_client, arn, token)
    elif step == "finishSecret":
        finish_secret(secrets_client, arn, token)
    else:
        raise ValueError(f"Invalid step parameter: {step}")


def generate_password(length=32):
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+-="
    # Ensure at least one of each required character type
    password = [
        py_secrets.choice(string.ascii_lowercase),
        py_secrets.choice(string.ascii_uppercase),
        py_secrets.choice(string.digits),
        py_secrets.choice("!@#$%^&*()_+-=")
    ]
    # Fill the rest with random characters
    password += [py_secrets.choice(alphabet) for _ in range(length - 4)]
    # Shuffle the password
    py_secrets.SystemRandom().shuffle(password)
    return ''.join(password)


def create_secret(secrets_client, arn, token):
    """Create a new secret version with a new password."""
    # Get the current secret value
    current_secret = secrets_client.get_secret_value(
        SecretId=arn,
        VersionStage="AWSCURRENT"
    )
    secret_dict = json.loads(current_secret['SecretString'])

    # Check if pending secret already exists (idempotency)
    try:
        secrets_client.get_secret_value(
            SecretId=arn,
            VersionId=token,
            VersionStage="AWSPENDING"
        )
        logger.info(f"createSecret: Successfully retrieved existing pending secret for {arn}")
        return
    except secrets_client.exceptions.ResourceNotFoundException:
        pass

    # Generate new password
    new_password = generate_password()
    secret_dict['password'] = new_password

    # Update the URL if present
    if 'url' in secret_dict:
        secret_dict['url'] = f"postgresql://{secret_dict['username']}:{new_password}@{secret_dict['host']}:{secret_dict['port']}/{secret_dict['database']}"

    # Store the new secret version
    secrets_client.put_secret_value(
        SecretId=arn,
        ClientRequestToken=token,
        SecretString=json.dumps(secret_dict),
        VersionStages=['AWSPENDING']
    )
    logger.info(f"createSecret: Successfully created new pending secret for {arn}")


def set_secret(secrets_client, arn, token):
    """Set the new password in the database."""
    # Get the pending secret
    pending_secret = secrets_client.get_secret_value(
        SecretId=arn,
        VersionId=token,
        VersionStage="AWSPENDING"
    )
    pending_dict = json.loads(pending_secret['SecretString'])

    # Get the current secret for connection
    current_secret = secrets_client.get_secret_value(
        SecretId=arn,
        VersionStage="AWSCURRENT"
    )
    current_dict = json.loads(current_secret['SecretString'])

    # Connect using current credentials and set new password
    try:
        conn = psycopg2.connect(
            host=current_dict['host'],
            port=current_dict.get('port', 5432),
            database=current_dict.get('database', 'postgres'),
            user=current_dict['username'],
            password=current_dict['password'],
            connect_timeout=5
        )
        conn.autocommit = True

        with conn.cursor() as cursor:
            # Use ALTER USER to change the password
            cursor.execute(
                "ALTER USER %s WITH PASSWORD %s",
                (pending_dict['username'], pending_dict['password'])
            )

        conn.close()
        logger.info(f"setSecret: Successfully set password for user {pending_dict['username']} in database")
    except psycopg2.Error as e:
        logger.error(f"setSecret: Failed to set password in database: {e}")
        raise


def test_secret(secrets_client, arn, token):
    """Test the new credentials by connecting to the database."""
    # Get the pending secret
    pending_secret = secrets_client.get_secret_value(
        SecretId=arn,
        VersionId=token,
        VersionStage="AWSPENDING"
    )
    pending_dict = json.loads(pending_secret['SecretString'])

    # Try to connect with the new credentials
    try:
        conn = psycopg2.connect(
            host=pending_dict['host'],
            port=pending_dict.get('port', 5432),
            database=pending_dict.get('database', 'postgres'),
            user=pending_dict['username'],
            password=pending_dict['password'],
            connect_timeout=5
        )

        # Execute a simple query to verify the connection
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result[0] != 1:
                raise ValueError("Database test query returned unexpected result")

        conn.close()
        logger.info(f"testSecret: Successfully tested new credentials for {arn}")
    except psycopg2.Error as e:
        logger.error(f"testSecret: Failed to test new credentials: {e}")
        raise


def finish_secret(secrets_client, arn, token):
    """Finish the rotation by marking the pending secret as current."""
    # Get the current version
    metadata = secrets_client.describe_secret(SecretId=arn)
    current_version = None

    for version, stages in metadata['VersionIdsToStages'].items():
        if "AWSCURRENT" in stages:
            if version == token:
                logger.info(f"finishSecret: Version {token} already marked as AWSCURRENT for {arn}")
                return
            current_version = version
            break

    # Move the AWSCURRENT stage to the new version
    secrets_client.update_secret_version_stage(
        SecretId=arn,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version
    )
    logger.info(f"finishSecret: Successfully set AWSCURRENT stage to version {token} for {arn}")
PYTHON
}

# Create the Lambda deployment package
data "archive_file" "rotate_secrets" {
  count       = var.enable_rotation ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda_rotation.zip"

  source {
    content  = local.rotation_lambda_code
    filename = "index.py"
  }
}

# Lambda function for automatic secret rotation
resource "aws_lambda_function" "rotate_secrets" {
  count            = var.enable_rotation ? 1 : 0
  filename         = data.archive_file.rotate_secrets[0].output_path
  source_code_hash = data.archive_file.rotate_secrets[0].output_base64sha256
  function_name    = "${var.project_name}-${var.environment}-rotate-secrets"
  role             = aws_iam_role.lambda_rotation[0].arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 256

  # Lambda layer for psycopg2
  layers = [
    "arn:aws:lambda:${var.aws_region}:898466741470:layer:psycopg2-py311:1"
  ]

  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT     = var.project_name
    }
  }

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [aws_security_group.lambda_rotation[0].id]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rotate-secrets"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Security group for Lambda rotation function
resource "aws_security_group" "lambda_rotation" {
  count       = var.enable_rotation ? 1 : 0
  name        = "${var.project_name}-${var.environment}-lambda-rotation-sg"
  description = "Security group for Lambda secret rotation function"
  vpc_id      = data.aws_vpc.main.id

  # SECURITY FIX: Restrict egress to VPC CIDR - Secrets Manager accessed via VPC endpoint
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
    description = "HTTPS for Secrets Manager API via VPC endpoint"
  }

  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
    description = "PostgreSQL database access within VPC"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-rotation-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Lambda permission for Secrets Manager to invoke
resource "aws_lambda_permission" "secrets_manager" {
  count         = var.enable_rotation ? 1 : 0
  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotate_secrets[0].function_name
  principal     = "secretsmanager.amazonaws.com"
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_rotation" {
  count             = var.enable_rotation ? 1 : 0
  name              = "/aws/lambda/${var.project_name}-${var.environment}-rotate-secrets"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-rotation-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Secret rotation schedule for PostgreSQL credentials
resource "aws_secretsmanager_secret_rotation" "postgres" {
  count               = var.enable_rotation ? 1 : 0
  secret_id           = aws_secretsmanager_secret.postgres_credentials.id
  rotation_lambda_arn = aws_lambda_function.rotate_secrets[0].arn

  rotation_rules {
    automatically_after_days = var.rotation_days
  }

  depends_on = [aws_lambda_permission.secrets_manager]
}

# Data sources for VPC configuration
data "aws_vpc" "main" {
  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Type = "private"
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

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-rotation-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "lambda_rotation_basic" {
  count      = var.enable_rotation ? 1 : 0
  role       = aws_iam_role.lambda_rotation[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_rotation_vpc" {
  count      = var.enable_rotation ? 1 : 0
  role       = aws_iam_role.lambda_rotation[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# IAM Policy for Lambda rotation function with full rotation permissions
resource "aws_iam_policy" "lambda_rotation" {
  count       = var.enable_rotation ? 1 : 0
  name        = "${var.project_name}-${var.environment}-lambda-rotation-policy"
  description = "Policy for Lambda secret rotation function"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerRotation"
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
      },
      {
        Sid    = "SecretsManagerGetRandomPassword"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetRandomPassword"
        ]
        Resource = "*"
      },
      {
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_rotation_secrets" {
  count      = var.enable_rotation ? 1 : 0
  role       = aws_iam_role.lambda_rotation[0].name
  policy_arn = aws_iam_policy.lambda_rotation[0].arn
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

output "rotation_lambda_arn" {
  description = "ARN of the secret rotation Lambda function"
  value       = var.enable_rotation ? aws_lambda_function.rotate_secrets[0].arn : null
}
