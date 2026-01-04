# ==============================================================================
# AWS CodePipeline Infrastructure
# Broxiva E-Commerce Platform - CI/CD Pipeline Configuration
# ==============================================================================
# This Terraform configuration creates:
# - CodePipeline for orchestrating CI/CD
# - CodeBuild projects for Node.js and Python services
# - ECR repositories for all services
# - IAM roles and policies
# - GitHub connection via CodeStar
# ==============================================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "broxiva-terraform-state"
  #   key            = "cicd/pipeline.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "broxiva-terraform-locks"
  # }
}

# ==============================================================================
# Variables
# ==============================================================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "broxiva"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "github_owner" {
  description = "GitHub repository owner/organization"
  type        = string
  default     = "oks-broxiva"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "broxiva"
}

variable "github_branch" {
  description = "GitHub branch to monitor"
  type        = string
  default     = "main"
}

variable "notification_email" {
  description = "Email for pipeline notifications"
  type        = string
  default     = ""
}

variable "enable_microservices_pipeline" {
  description = "Enable separate pipeline for microservices"
  type        = bool
  default     = true
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster for deployments"
  type        = string
  default     = "broxiva-prod-eks"
}

variable "kubernetes_namespace" {
  description = "Kubernetes namespace for deployments"
  type        = string
  default     = "broxiva"
}

# ==============================================================================
# Provider Configuration
# ==============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Purpose     = "CI/CD Pipeline"
    }
  }
}

# ==============================================================================
# Data Sources
# ==============================================================================

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ==============================================================================
# Local Values
# ==============================================================================

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Service definitions
  nodejs_services = ["api", "web"]

  microservices = [
    "ai-agents",
    "ai-engine",
    "analytics",
    "chatbot",
    "fraud-detection",
    "inventory",
    "media",
    "notification",
    "personalization",
    "pricing",
    "recommendation",
    "search",
    "supplier-integration"
  ]

  all_services = concat(local.nodejs_services, local.microservices)

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ==============================================================================
# S3 Bucket for Pipeline Artifacts
# ==============================================================================

resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "${var.project_name}-pipeline-artifacts-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-pipeline-artifacts"
  })
}

resource "aws_s3_bucket_versioning" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    id     = "cleanup-old-artifacts"
    status = "Enabled"

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# ==============================================================================
# ECR Repositories
# ==============================================================================

resource "aws_ecr_repository" "services" {
  for_each = toset(local.all_services)

  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${each.key}"
    Service = each.key
  })
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = toset(local.all_services)
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "20"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ==============================================================================
# GitHub Connection (CodeStar Connections)
# ==============================================================================

resource "aws_codestarconnections_connection" "github" {
  name          = "${var.project_name}-github-connection"
  provider_type = "GitHub"

  tags = local.common_tags
}

# ==============================================================================
# IAM Role for CodePipeline
# ==============================================================================

resource "aws_iam_role" "codepipeline" {
  name = "${var.project_name}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "${var.project_name}-codepipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetBucketVersioning",
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "codestar-connections:UseConnection"
        ]
        Resource = aws_codestarconnections_connection.github.arn
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild",
          "codebuild:StopBuild"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = "*"
        Condition = {
          StringEqualsIfExists = {
            "iam:PassedToService" = [
              "ecs-tasks.amazonaws.com"
            ]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = "*"
      }
    ]
  })
}

# ==============================================================================
# IAM Role for CodeBuild
# ==============================================================================

resource "aws_iam_role" "codebuild" {
  name = "${var.project_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "codebuild" {
  name = "${var.project_name}-codebuild-policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/codebuild/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:GetAuthorizationToken",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${var.project_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:CreateReportGroup",
          "codebuild:CreateReport",
          "codebuild:UpdateReport",
          "codebuild:BatchPutTestCases",
          "codebuild:BatchPutCodeCoverages"
        ]
        Resource = "arn:aws:codebuild:${local.region}:${local.account_id}:report-group/*"
      }
    ]
  })
}

# ==============================================================================
# IAM Role for CodeBuild Deploy (EKS Access)
# ==============================================================================

resource "aws_iam_role" "codebuild_deploy" {
  name = "${var.project_name}-codebuild-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "codebuild_deploy" {
  name = "${var.project_name}-codebuild-deploy-policy"
  role = aws_iam_role.codebuild_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/codebuild/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
          "ecr:ListImages"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "arn:aws:eks:${local.region}:${local.account_id}:cluster/${var.eks_cluster_name}"
      },
      {
        Effect = "Allow"
        Action = [
          "sts:AssumeRole"
        ]
        Resource = "arn:aws:iam::${local.account_id}:role/${var.project_name}-eks-deploy-role"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${var.project_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}/*"
      }
    ]
  })
}

# ==============================================================================
# IAM Role for EKS Deployment (Assumed by CodeBuild)
# ==============================================================================

resource "aws_iam_role" "eks_deploy" {
  name = "${var.project_name}-eks-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.codebuild_deploy.arn
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "eks_deploy" {
  name = "${var.project_name}-eks-deploy-policy"
  role = aws_iam_role.eks_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi"
        ]
        Resource = "arn:aws:eks:${local.region}:${local.account_id}:cluster/${var.eks_cluster_name}"
      }
    ]
  })
}

# ==============================================================================
# CodeBuild Project - Node.js Services (API & Web)
# ==============================================================================

resource "aws_codebuild_project" "nodejs" {
  name          = "${var.project_name}-nodejs-build"
  description   = "Build Node.js services (API and Web)"
  build_timeout = 30
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  cache {
    type  = "LOCAL"
    modes = ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = local.account_id
    }

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = local.region
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.project_name}-nodejs"
      stream_name = "build-log"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "organization/infrastructure/aws-cicd/buildspec.yml"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-nodejs-build"
    Type = "NodeJS"
  })
}

# ==============================================================================
# CodeBuild Project - Python Microservices
# ==============================================================================

resource "aws_codebuild_project" "microservices" {
  count = var.enable_microservices_pipeline ? 1 : 0

  name          = "${var.project_name}-microservices-build"
  description   = "Build Python microservices"
  build_timeout = 60
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  cache {
    type  = "LOCAL"
    modes = ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  }

  environment {
    compute_type                = "BUILD_GENERAL1_LARGE"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = local.account_id
    }

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = local.region
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.project_name}-microservices"
      stream_name = "build-log"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "organization/infrastructure/aws-cicd/buildspec-microservices.yml"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-microservices-build"
    Type = "Python"
  })
}

# ==============================================================================
# CodeBuild Project - EKS Deployment
# ==============================================================================

resource "aws_codebuild_project" "deploy" {
  name          = "${var.project_name}-eks-deploy"
  description   = "Deploy services to EKS cluster"
  build_timeout = 30
  service_role  = aws_iam_role.codebuild_deploy.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = false

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = local.account_id
    }

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = local.region
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "EKS_CLUSTER_NAME"
      value = var.eks_cluster_name
    }

    environment_variable {
      name  = "KUBERNETES_NAMESPACE"
      value = var.kubernetes_namespace
    }

    environment_variable {
      name  = "ECR_REGISTRY"
      value = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com"
    }

    environment_variable {
      name  = "PROJECT_NAME"
      value = var.project_name
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/${var.project_name}-eks-deploy"
      stream_name = "deploy-log"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "organization/infrastructure/aws-cicd/buildspec-deploy.yml"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-eks-deploy"
    Type = "Deployment"
  })
}

# ==============================================================================
# CloudWatch Log Group for EKS Deploy
# ==============================================================================

resource "aws_cloudwatch_log_group" "eks_deploy" {
  name              = "/aws/codebuild/${var.project_name}-eks-deploy"
  retention_in_days = 30

  tags = local.common_tags
}

# ==============================================================================
# CodePipeline - Main Pipeline
# ==============================================================================

resource "aws_codepipeline" "main" {
  name     = "${var.project_name}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  # Stage 1: Source from GitHub
  stage {
    name = "Source"

    action {
      name             = "GitHub_Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "${var.github_owner}/${var.github_repo}"
        BranchName       = var.github_branch
        DetectChanges    = "true"
      }
    }
  }

  # Stage 2: Build Node.js Services
  stage {
    name = "Build_NodeJS"

    action {
      name             = "Build_API_Web"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["nodejs_build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.nodejs.name
      }
    }
  }

  # Stage 3: Build Microservices (conditional)
  dynamic "stage" {
    for_each = var.enable_microservices_pipeline ? [1] : []

    content {
      name = "Build_Microservices"

      action {
        name             = "Build_Python_Services"
        category         = "Build"
        owner            = "AWS"
        provider         = "CodeBuild"
        input_artifacts  = ["source_output"]
        output_artifacts = ["microservices_build_output"]
        version          = "1"

        configuration = {
          ProjectName = aws_codebuild_project.microservices[0].name
        }
      }
    }
  }

  # Stage 4: Manual Approval (for production)
  dynamic "stage" {
    for_each = var.environment == "prod" ? [1] : []

    content {
      name = "Approval"

      action {
        name     = "Manual_Approval"
        category = "Approval"
        owner    = "AWS"
        provider = "Manual"
        version  = "1"

        configuration = {
          CustomData = "Please review the build artifacts and approve deployment to ${var.environment}"
        }
      }
    }
  }

  # Stage 5: Deploy to EKS
  stage {
    name = "Deploy"

    action {
      name            = "Deploy_to_EKS"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["source_output"]
      version         = "1"
      run_order       = 1

      configuration = {
        ProjectName = aws_codebuild_project.deploy.name
        EnvironmentVariables = jsonencode([
          {
            name  = "CODEBUILD_RESOLVED_SOURCE_VERSION"
            value = "#{codepipeline.PipelineExecutionId}"
            type  = "PLAINTEXT"
          }
        ])
      }
    }
  }

  tags = local.common_tags
}

# ==============================================================================
# SNS Topic for Pipeline Notifications
# ==============================================================================

resource "aws_sns_topic" "pipeline_notifications" {
  name = "${var.project_name}-pipeline-notifications"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.pipeline_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# ==============================================================================
# CloudWatch Event Rule for Pipeline Notifications
# ==============================================================================

resource "aws_cloudwatch_event_rule" "pipeline_events" {
  name        = "${var.project_name}-pipeline-events"
  description = "Capture CodePipeline state changes"

  event_pattern = jsonencode({
    source      = ["aws.codepipeline"]
    detail-type = ["CodePipeline Pipeline Execution State Change"]
    detail = {
      pipeline = [aws_codepipeline.main.name]
      state    = ["FAILED", "SUCCEEDED", "CANCELED"]
    }
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "pipeline_sns" {
  rule      = aws_cloudwatch_event_rule.pipeline_events.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.pipeline_notifications.arn

  input_transformer {
    input_paths = {
      pipeline = "$.detail.pipeline"
      state    = "$.detail.state"
      time     = "$.time"
    }
    input_template = "\"Pipeline <pipeline> changed to state <state> at <time>\""
  }
}

resource "aws_sns_topic_policy" "pipeline_notifications" {
  arn = aws_sns_topic.pipeline_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.pipeline_notifications.arn
      }
    ]
  })
}

# ==============================================================================
# CloudWatch Log Groups
# ==============================================================================

resource "aws_cloudwatch_log_group" "nodejs_build" {
  name              = "/aws/codebuild/${var.project_name}-nodejs"
  retention_in_days = 30

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "microservices_build" {
  count             = var.enable_microservices_pipeline ? 1 : 0
  name              = "/aws/codebuild/${var.project_name}-microservices"
  retention_in_days = 30

  tags = local.common_tags
}

# ==============================================================================
# Outputs
# ==============================================================================

output "pipeline_name" {
  description = "Name of the CodePipeline"
  value       = aws_codepipeline.main.name
}

output "pipeline_arn" {
  description = "ARN of the CodePipeline"
  value       = aws_codepipeline.main.arn
}

output "artifacts_bucket" {
  description = "S3 bucket for pipeline artifacts"
  value       = aws_s3_bucket.pipeline_artifacts.bucket
}

output "ecr_repositories" {
  description = "ECR repository URLs for all services"
  value = {
    for service, repo in aws_ecr_repository.services :
    service => repo.repository_url
  }
}

output "github_connection_arn" {
  description = "ARN of the GitHub connection (must be confirmed in AWS Console)"
  value       = aws_codestarconnections_connection.github.arn
}

output "github_connection_status" {
  description = "Status of the GitHub connection"
  value       = aws_codestarconnections_connection.github.connection_status
}

output "codebuild_nodejs_project" {
  description = "CodeBuild project for Node.js services"
  value       = aws_codebuild_project.nodejs.name
}

output "codebuild_microservices_project" {
  description = "CodeBuild project for Python microservices"
  value       = var.enable_microservices_pipeline ? aws_codebuild_project.microservices[0].name : null
}

output "codebuild_deploy_project" {
  description = "CodeBuild project for EKS deployment"
  value       = aws_codebuild_project.deploy.name
}

output "codebuild_deploy_role_arn" {
  description = "ARN of the IAM role for CodeBuild deployment"
  value       = aws_iam_role.codebuild_deploy.arn
}

output "eks_deploy_role_arn" {
  description = "ARN of the IAM role for EKS deployment (add to EKS aws-auth configmap)"
  value       = aws_iam_role.eks_deploy.arn
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for notifications"
  value       = aws_sns_topic.pipeline_notifications.arn
}

output "post_deployment_instructions" {
  description = "Post-deployment instructions"
  value       = <<-EOT

    =====================================================
    POST-DEPLOYMENT INSTRUCTIONS
    =====================================================

    1. GITHUB CONNECTION:
       The GitHub connection needs to be confirmed manually.
       Go to AWS Console > Developer Tools > Connections
       Connection ARN: ${aws_codestarconnections_connection.github.arn}
       Click "Update pending connection" and authorize GitHub access.

    2. PARAMETER STORE SECRETS:
       Create the following parameters in AWS Systems Manager Parameter Store:
       - /broxiva/docker/username
       - /broxiva/docker/password

    3. SNS SUBSCRIPTION:
       If you provided an email for notifications, confirm the subscription
       by clicking the link in the email sent to: ${var.notification_email != "" ? var.notification_email : "N/A"}

    4. ECR REPOSITORIES:
       The following repositories have been created:
       ${join("\n       ", [for service in local.all_services : "- ${var.project_name}/${service}"])}

    5. EKS CLUSTER CONFIGURATION:
       Add the deployment IAM role to your EKS aws-auth ConfigMap:

       kubectl edit configmap aws-auth -n kube-system

       Add the following under mapRoles:
       - rolearn: ${aws_iam_role.eks_deploy.arn}
         username: codebuild-deploy
         groups:
           - system:masters

    6. TRIGGER FIRST BUILD:
       Push a commit to the ${var.github_branch} branch to trigger the pipeline.

    =====================================================
  EOT
}
