# ================================
# Main Terraform Configuration
# Cross-Border Commerce Platform
# ================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }

  # Backend configuration for state management
  backend "s3" {
    bucket         = "commerce-platform-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# ================================
# Provider Configuration
# ================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  }
}

provider "docker" {
  host = var.docker_host
}

# ================================
# Data Sources
# ================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ================================
# Local Variables
# ================================

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner_email
  }

  az_count = min(length(data.aws_availability_zones.available.names), 3)

  # Resource naming
  name_prefix = "${var.project_name}-${var.environment}"

  # CIDR calculations
  availability_zones = slice(data.aws_availability_zones.available.names, 0, local.az_count)
}

# ================================
# VPC Module
# ================================

module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = local.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
  enable_vpn_gateway = var.enable_vpn_gateway

  tags = local.common_tags
}

# ================================
# Security Groups Module
# ================================

module "security_groups" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id

  allowed_cidr_blocks = var.allowed_cidr_blocks

  tags = local.common_tags
}

# ================================
# RDS PostgreSQL Module
# ================================

module "database" {
  source = "./modules/database"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  database_subnet_ids   = module.vpc.database_subnet_ids
  security_group_ids    = [module.security_groups.database_sg_id]
  
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  engine_version        = var.db_engine_version
  database_name         = var.db_name
  master_username       = var.db_username
  backup_retention      = var.db_backup_retention
  multi_az              = var.db_multi_az
  deletion_protection   = var.db_deletion_protection

  tags = local.common_tags
}

# ================================
# ElastiCache Redis Module
# ================================

module "redis" {
  source = "./modules/redis"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  cache_subnet_ids   = module.vpc.cache_subnet_ids
  security_group_ids = [module.security_groups.redis_sg_id]

  node_type          = var.redis_node_type
  num_cache_nodes    = var.redis_num_nodes
  engine_version     = var.redis_engine_version
  parameter_family   = var.redis_parameter_family

  tags = local.common_tags
}

# ================================
# S3 Storage Module
# ================================

module "storage" {
  source = "./modules/storage"

  project_name = var.project_name
  environment  = var.environment

  enable_versioning = var.s3_enable_versioning
  enable_encryption = var.s3_enable_encryption
  lifecycle_rules   = var.s3_lifecycle_rules

  tags = local.common_tags
}

# ================================
# ECS Cluster Module
# ================================

module "ecs" {
  source = "./modules/ecs"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id

  container_insights = var.ecs_container_insights

  tags = local.common_tags
}

# ================================
# Application Load Balancer Module
# ================================

module "alb" {
  source = "./modules/alb"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  security_group_ids = [module.security_groups.alb_sg_id]

  enable_deletion_protection = var.alb_deletion_protection
  enable_http2              = var.alb_enable_http2
  idle_timeout              = var.alb_idle_timeout

  ssl_certificate_arn = var.ssl_certificate_arn
  domain_name         = var.domain_name

  tags = local.common_tags
}

# ================================
# Backend Service Module
# ================================

module "backend_service" {
  source = "./modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "backend"
  
  cluster_id         = module.ecs.cluster_id
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.backend_sg_id]

  # Container configuration
  container_image    = var.backend_image
  container_port     = 8080
  cpu                = var.backend_cpu
  memory             = var.backend_memory
  desired_count      = var.backend_desired_count

  # Load balancer
  target_group_arn   = module.alb.backend_target_group_arn

  # Environment variables
  environment_variables = {
    APP_ENV              = var.environment
    DB_HOST              = module.database.endpoint
    DB_PORT              = "5432"
    DB_NAME              = var.db_name
    DB_USER              = var.db_username
    REDIS_HOST           = module.redis.endpoint
    REDIS_PORT           = "6379"
    S3_BUCKET            = module.storage.assets_bucket_name
    AWS_REGION           = var.aws_region
    LOG_LEVEL            = var.log_level
  }

  # Secrets from SSM Parameter Store
  secrets = {
    DB_PASSWORD      = aws_ssm_parameter.db_password.arn
    REDIS_PASSWORD   = aws_ssm_parameter.redis_password.arn
    JWT_SECRET       = aws_ssm_parameter.jwt_secret.arn
    STRIPE_SECRET    = aws_ssm_parameter.stripe_secret.arn
  }

  # Auto-scaling
  enable_autoscaling     = var.enable_autoscaling
  autoscaling_min        = var.backend_autoscaling_min
  autoscaling_max        = var.backend_autoscaling_max
  autoscaling_target_cpu = var.autoscaling_target_cpu

  tags = local.common_tags
}

# ================================
# Frontend Service Module
# ================================

module "frontend_service" {
  source = "./modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "frontend"
  
  cluster_id         = module.ecs.cluster_id
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.frontend_sg_id]

  # Container configuration
  container_image    = var.frontend_image
  container_port     = 3000
  cpu                = var.frontend_cpu
  memory             = var.frontend_memory
  desired_count      = var.frontend_desired_count

  # Load balancer
  target_group_arn   = module.alb.frontend_target_group_arn

  # Environment variables
  environment_variables = {
    NODE_ENV                = "production"
    NEXT_PUBLIC_API_URL     = "https://api.${var.domain_name}"
    NEXT_PUBLIC_CDN_URL     = module.storage.cloudfront_url
    NEXT_TELEMETRY_DISABLED = "1"
  }

  secrets = {}

  # Auto-scaling
  enable_autoscaling     = var.enable_autoscaling
  autoscaling_min        = var.frontend_autoscaling_min
  autoscaling_max        = var.frontend_autoscaling_max
  autoscaling_target_cpu = var.autoscaling_target_cpu

  tags = local.common_tags
}

# ================================
# Monitoring Module
# ================================

module "monitoring" {
  source = "./modules/monitoring"

  project_name = var.project_name
  environment  = var.environment

  cluster_name = module.ecs.cluster_name
  alb_arn      = module.alb.alb_arn

  enable_container_insights = var.ecs_container_insights
  log_retention_days        = var.log_retention_days

  # SNS topic for alerts
  alert_email = var.alert_email

  tags = local.common_tags
}

# ================================
# Secrets Management
# ================================

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.project_name}/${var.environment}/db/password"
  description = "Database master password"
  type        = "SecureString"
  value       = random_password.db_password.result

  tags = local.common_tags
}

resource "aws_ssm_parameter" "redis_password" {
  name        = "/${var.project_name}/${var.environment}/redis/password"
  description = "Redis auth token"
  type        = "SecureString"
  value       = random_password.redis_password.result

  tags = local.common_tags
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/${var.environment}/app/jwt-secret"
  description = "JWT signing secret"
  type        = "SecureString"
  value       = random_password.jwt_secret.result

  tags = local.common_tags
}

resource "aws_ssm_parameter" "stripe_secret" {
  name        = "/${var.project_name}/${var.environment}/stripe/secret-key"
  description = "Stripe secret key"
  type        = "SecureString"
  value       = var.stripe_secret_key

  tags = local.common_tags
}

# ================================
# CloudWatch Log Groups
# ================================

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-${var.environment}/backend"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}-${var.environment}/frontend"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# ================================
# IAM Roles for ECS Tasks
# ================================

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${local.name_prefix}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_ssm" {
  name = "ssm-access"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${local.name_prefix}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "s3-access"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          module.storage.assets_bucket_arn,
          "${module.storage.assets_bucket_arn}/*"
        ]
      }
    ]
  })
}

# ================================
# DNS Configuration (Route53)
# ================================

data "aws_route53_zone" "main" {
  count = var.create_route53_records ? 1 : 0
  name  = var.domain_name
}

resource "aws_route53_record" "api" {
  count   = var.create_route53_records ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  count   = var.create_route53_records ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}
