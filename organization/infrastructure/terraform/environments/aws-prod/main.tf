# Broxiva E-Commerce Platform - AWS Production Environment
# Terraform configuration for AWS deployment

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "broxiva-terraform-state"
    key            = "prod/terraform.tfstate"
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
      Environment = "production"
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
  name_prefix = "broxiva-prod"
  common_tags = {
    Project     = "Broxiva"
    Environment = "production"
  }

  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)
}

# VPC Configuration
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs             = local.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true

  # Database subnet group
  create_database_subnet_group = true

  tags = local.common_tags

  public_subnet_tags = {
    "kubernetes.io/role/elb"                      = 1
    "kubernetes.io/cluster/${local.name_prefix}-eks" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"             = 1
    "kubernetes.io/cluster/${local.name_prefix}-eks" = "shared"
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${local.name_prefix}-eks"
  cluster_version = var.kubernetes_version

  vpc_id                          = module.vpc.vpc_id
  subnet_ids                      = module.vpc.private_subnets
  control_plane_subnet_ids        = module.vpc.private_subnets
  # SECURITY: Disable public endpoint - access only via VPN/bastion
  cluster_endpoint_public_access  = false
  cluster_endpoint_private_access = true

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent              = true
      before_compute           = true
      service_account_role_arn = module.vpc_cni_irsa.iam_role_arn
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  # Node groups
  eks_managed_node_groups = {
    app = {
      name           = "app-nodes"
      instance_types = var.app_node_instance_types
      min_size       = var.app_node_min_size
      max_size       = var.app_node_max_size
      desired_size   = var.app_node_desired_size

      disk_size = 100

      labels = {
        role = "app"
      }

      tags = {
        Name = "${local.name_prefix}-app-node"
      }
    }

    ai = {
      name           = "ai-nodes"
      instance_types = var.ai_node_instance_types
      min_size       = 1
      max_size       = 5
      desired_size   = 2

      disk_size = 200

      labels = {
        role = "ai"
      }

      taints = [{
        key    = "ai-workloads"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      tags = {
        Name = "${local.name_prefix}-ai-node"
      }
    }
  }

  # Enable IRSA
  enable_irsa = true

  tags = local.common_tags
}

# VPC CNI IRSA
module "vpc_cni_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name_prefix      = "${local.name_prefix}-vpc-cni"
  attach_vpc_cni_policy = true
  vpc_cni_enable_ipv4   = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-node"]
    }
  }

  tags = local.common_tags
}

# EBS CSI IRSA
module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name_prefix      = "${local.name_prefix}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }

  tags = local.common_tags
}

# RDS PostgreSQL
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name_prefix}-postgres"

  engine               = "postgres"
  engine_version       = var.postgres_version
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage

  db_name  = "broxiva"
  username = "broxiva_admin"
  port     = 5432

  multi_az               = true
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.db_security_group.security_group_id]

  maintenance_window              = "Mon:00:00-Mon:03:00"
  backup_window                   = "03:00-06:00"
  backup_retention_period         = 30
  skip_final_snapshot             = false
  final_snapshot_identifier_prefix = "${local.name_prefix}-final"
  deletion_protection             = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  create_monitoring_role                = true
  monitoring_interval                   = 60
  monitoring_role_name                  = "${local.name_prefix}-rds-monitoring"

  parameters = [
    {
      name  = "log_statement"
      value = "all"
    },
    {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  ]

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
      description              = "PostgreSQL from EKS"
      source_security_group_id = module.eks.cluster_security_group_id
    }
  ]

  tags = local.common_tags
}

# ElastiCache Redis
module "elasticache" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"

  cluster_id = "${local.name_prefix}-redis"

  engine               = "redis"
  engine_version       = var.redis_version
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_nodes
  parameter_group_name = "default.redis7"

  subnet_group_name = module.vpc.elasticache_subnet_group_name
  security_group_ids = [module.redis_security_group.security_group_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  maintenance_window = "sun:05:00-sun:09:00"
  snapshot_window    = "00:00-04:00"
  snapshot_retention_limit = 7

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
      description              = "Redis from EKS"
      source_security_group_id = module.eks.cluster_security_group_id
    }
  ]

  tags = local.common_tags
}

# S3 Bucket for Media/Assets
module "s3_media" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.0"

  bucket = "${local.name_prefix}-media"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  cors_rule = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["https://broxiva.com", "https://*.broxiva.com"]
      max_age_seconds = 3600
    }
  ]

  lifecycle_rule = [
    {
      id      = "archive-old-versions"
      enabled = true

      noncurrent_version_transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]

      noncurrent_version_expiration = {
        days = 365
      }
    }
  ]

  tags = local.common_tags
}

# CloudFront Distribution
module "cloudfront" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "~> 3.0"

  aliases = ["cdn.broxiva.com"]

  comment             = "Broxiva CDN"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"
  retain_on_delete    = false
  wait_for_deployment = false

  origin = {
    s3_media = {
      domain_name = module.s3_media.s3_bucket_bucket_regional_domain_name
      origin_id   = "S3-${local.name_prefix}-media"

      s3_origin_config = {
        origin_access_identity = "origin-access-identity/cloudfront/${aws_cloudfront_origin_access_identity.media.id}"
      }
    }

    api = {
      domain_name = "api.broxiva.com"
      origin_id   = "API-Gateway"

      custom_origin_config = {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior = {
    target_origin_id       = "S3-${local.name_prefix}-media"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  viewer_certificate = {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.common_tags
}

resource "aws_cloudfront_origin_access_identity" "media" {
  comment = "OAI for Broxiva media bucket"
}

# ECR Repositories
resource "aws_ecr_repository" "api" {
  name                 = "broxiva/api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "web" {
  name                 = "broxiva/web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.common_tags
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${local.name_prefix}/app-secrets"
  description = "Broxiva application secrets"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret" "database" {
  name        = "${local.name_prefix}/database"
  description = "Broxiva database credentials"

  tags = local.common_tags
}

# Route53 (if managing DNS)
resource "aws_route53_zone" "main" {
  count = var.create_dns_zone ? 1 : 0
  name  = "broxiva.com"

  tags = local.common_tags
}

# NOTE: API DNS record should point to the Application Load Balancer, not EKS endpoint directly
# The EKS endpoint is private (cluster_endpoint_public_access = false)
# This record will be configured after ALB ingress controller is deployed
# resource "aws_route53_record" "api" {
#   count   = var.create_dns_zone ? 1 : 0
#   zone_id = aws_route53_zone.main[0].zone_id
#   name    = "api.broxiva.com"
#   type    = "A"
#
#   alias {
#     name                   = data.aws_lb.api_alb.dns_name
#     zone_id                = data.aws_lb.api_alb.zone_id
#     evaluate_target_health = true
#   }
# }

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${local.name_prefix}-eks/cluster"
  retention_in_days = 30

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/broxiva/app"
  retention_in_days = 30

  tags = local.common_tags
}

# ============================================
# Messaging Infrastructure (SES, SNS, SQS)
# ============================================
# AWS-native messaging services replace external providers (Twilio, SendGrid)
module "messaging" {
  source = "../../modules/messaging"

  name_prefix             = local.name_prefix
  domain_name             = "broxiva.com"
  enable_custom_mail_from = true

  ses_from_addresses = [
    "noreply@broxiva.com",
    "support@broxiva.com",
    "orders@broxiva.com",
    "notifications@broxiva.com"
  ]

  sns_sms_sender_id    = "Broxiva"
  sns_sms_default_type = "Transactional"

  alert_email_addresses = var.alert_email_addresses

  tags = local.common_tags
}

# CloudWatch Alarms - Using alerts topic from messaging module
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.name_prefix}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors EKS CPU utilization"
  alarm_actions       = [module.messaging.sns_topic_alerts_arn]

  dimensions = {
    ClusterName = module.eks.cluster_name
  }

  tags = local.common_tags
}
