# ==============================================================================
# Broxiva E-Commerce Platform - AWS Staging Environment
# ==============================================================================
# ECS Fargate-based staging environment for pre-production testing.
# Uses smaller resources and Fargate Spot for cost optimization.
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "broxiva-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "broxiva-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Broxiva"
      Environment = "staging"
      ManagedBy   = "Terraform"
      Owner       = "DevOps"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local variables
locals {
  name_prefix = "broxiva-staging"
  common_tags = {
    Project     = "Broxiva"
    Environment = "staging"
  }

  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)
}

# ==============================================================================
# VPC Configuration
# ==============================================================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs              = local.availability_zones
  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  # Single NAT Gateway for cost savings in staging
  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true

  # Database subnet group
  create_database_subnet_group = true

  tags = local.common_tags
}

# ==============================================================================
# ECS Fargate Module (Primary Compute - Always Enabled for Staging)
# ==============================================================================
module "ecs" {
  source = "../../modules/ecs"

  project_name = "broxiva"
  environment  = "staging"

  # Network Configuration
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = var.vpc_cidr
  private_subnet_ids = module.vpc.private_subnets
  public_subnet_ids  = module.vpc.public_subnets

  # Cluster Configuration
  enable_container_insights = true
  enable_execute_command    = true  # Enable for debugging in staging
  enable_fargate_spot       = true  # Use Spot for cost savings
  fargate_base_count        = 1
  fargate_weight            = 1
  fargate_spot_weight       = 4     # 80% Spot in staging

  # Security & Encryption
  kms_key_id  = aws_kms_key.staging.id
  kms_key_arn = aws_kms_key.staging.arn

  # Load Balancer Configuration
  acm_certificate_arn = var.acm_certificate_arn

  # Domain Configuration
  api_domain  = "api.staging.broxiva.com"
  web_domains = ["staging.broxiva.com"]

  # Service Configuration - Enable core services only
  enabled_services = [
    "api",
    "web",
    "ai-engine",
    "recommendation",
    "search",
    "notification",
    "inventory",
    "pricing"
  ]

  # Image tag (overridden by CI/CD)
  image_tag = var.image_tag

  # Auto Scaling (smaller for staging)
  enable_autoscaling               = true
  autoscaling_cpu_threshold        = 70
  autoscaling_memory_threshold     = 80
  autoscaling_request_count_threshold = 500

  # Monitoring
  enable_cloudwatch_alarms = true
  alarm_sns_topic_arn      = aws_sns_topic.alerts.arn

  # Logging
  log_retention_days = 14  # Shorter retention for staging

  tags = local.common_tags
}

# ==============================================================================
# KMS Key for Encryption
# ==============================================================================
resource "aws_kms_key" "staging" {
  description             = "KMS key for Broxiva staging environment"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-kms"
  })
}

resource "aws_kms_alias" "staging" {
  name          = "alias/${local.name_prefix}"
  target_key_id = aws_kms_key.staging.key_id
}

# ==============================================================================
# RDS PostgreSQL (Smaller Instance for Staging)
# ==============================================================================
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name_prefix}-postgres"

  engine               = "postgres"
  engine_version       = var.postgres_version
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = "db.t3.medium"  # Smaller for staging

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = "broxiva"
  username = "broxiva_admin"
  port     = 5432

  multi_az               = false  # Single AZ for staging
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.db_security_group.security_group_id]

  maintenance_window      = "Mon:00:00-Mon:03:00"
  backup_window           = "03:00-06:00"
  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = false

  performance_insights_enabled = true
  create_monitoring_role       = true
  monitoring_interval          = 60
  monitoring_role_name         = "${local.name_prefix}-rds-monitoring"

  tags = local.common_tags
}

# Database Security Group
module "db_security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.0"

  name        = "${local.name_prefix}-db-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  ingress_with_source_security_group_id = [
    {
      from_port                = 5432
      to_port                  = 5432
      protocol                 = "tcp"
      description              = "PostgreSQL from ECS"
      source_security_group_id = module.ecs.ecs_tasks_security_group_id
    }
  ]

  tags = local.common_tags
}

# ==============================================================================
# ElastiCache Redis (Smaller for Staging)
# ==============================================================================
module "elasticache" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"

  cluster_id = "${local.name_prefix}-redis"

  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.t3.micro"  # Smallest for staging

  num_cache_nodes = 1  # Single node for staging

  subnet_group_name  = module.vpc.elasticache_subnet_group_name
  security_group_ids = [module.redis_security_group.security_group_id]

  snapshot_retention_limit = 1

  tags = local.common_tags
}

# Redis Security Group
module "redis_security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.0"

  name        = "${local.name_prefix}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id

  ingress_with_source_security_group_id = [
    {
      from_port                = 6379
      to_port                  = 6379
      protocol                 = "tcp"
      description              = "Redis from ECS"
      source_security_group_id = module.ecs.ecs_tasks_security_group_id
    }
  ]

  tags = local.common_tags
}

# ==============================================================================
# SNS Topic for Alerts
# ==============================================================================
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"
  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = length(var.alert_email_addresses)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# ==============================================================================
# ECR Repositories
# ==============================================================================
resource "aws_ecr_repository" "services" {
  for_each = toset([
    "api", "web", "ai-engine", "recommendation", "search",
    "notification", "inventory", "pricing"
  ])

  name                 = "broxiva/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

# ==============================================================================
# Outputs
# ==============================================================================
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs.cluster_arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.ecs.alb_dns_name
}

output "api_service_name" {
  description = "API ECS service name"
  value       = module.ecs.api_service_name
}

output "web_service_name" {
  description = "Web ECS service name"
  value       = module.ecs.web_service_name
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.cluster_address
  sensitive   = true
}
