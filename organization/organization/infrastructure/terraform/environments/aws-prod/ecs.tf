# ============================================================================
# Broxiva E-Commerce Platform - ECS Production Configuration
# ============================================================================
# This file configures ECS Fargate as an alternative to EKS for container
# orchestration. The EKS configuration in main.tf is retained for rollback.
#
# To switch from EKS to ECS:
# 1. Set enable_ecs = true in terraform.tfvars
# 2. Update DNS records to point to the ECS ALB
# 3. Monitor traffic and gradually shift load
# 4. Once stable, optionally disable EKS resources
#
# ROLLBACK: To revert to EKS, set enable_ecs = false and update DNS records
# ============================================================================

# ============================================
# ECS Feature Flag
# ============================================
variable "enable_ecs" {
  description = "Enable ECS Fargate deployment (alternative to EKS)"
  type        = bool
  default     = false
}

# ============================================
# ECS-Specific Variables
# ============================================
variable "ecs_api_cpu" {
  description = "CPU units for API service (1024 = 1 vCPU)"
  type        = number
  default     = 1024 # 1 vCPU for production
}

variable "ecs_api_memory" {
  description = "Memory for API service in MB"
  type        = number
  default     = 2048 # 2 GB for production
}

variable "ecs_api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 3
}

variable "ecs_api_min_count" {
  description = "Minimum number of API tasks for auto scaling"
  type        = number
  default     = 3
}

variable "ecs_api_max_count" {
  description = "Maximum number of API tasks for auto scaling"
  type        = number
  default     = 20
}

variable "ecs_web_cpu" {
  description = "CPU units for web service (1024 = 1 vCPU)"
  type        = number
  default     = 512 # 0.5 vCPU for web frontend
}

variable "ecs_web_memory" {
  description = "Memory for web service in MB"
  type        = number
  default     = 1024 # 1 GB for web frontend
}

variable "ecs_web_desired_count" {
  description = "Desired number of web tasks"
  type        = number
  default     = 3
}

variable "ecs_web_min_count" {
  description = "Minimum number of web tasks for auto scaling"
  type        = number
  default     = 2
}

variable "ecs_web_max_count" {
  description = "Maximum number of web tasks for auto scaling"
  type        = number
  default     = 15
}

variable "ecs_worker_cpu" {
  description = "CPU units for worker service"
  type        = number
  default     = 1024 # 1 vCPU for background processing
}

variable "ecs_worker_memory" {
  description = "Memory for worker service in MB"
  type        = number
  default     = 2048 # 2 GB for background processing
}

variable "ecs_worker_desired_count" {
  description = "Desired number of worker tasks"
  type        = number
  default     = 2
}

variable "ecs_worker_min_count" {
  description = "Minimum number of worker tasks"
  type        = number
  default     = 1
}

variable "ecs_worker_max_count" {
  description = "Maximum number of worker tasks"
  type        = number
  default     = 10
}

variable "ecs_enable_fargate_spot" {
  description = "Enable Fargate Spot for cost savings (use with caution in production)"
  type        = bool
  default     = false
}

variable "ecs_api_image_tag" {
  description = "Docker image tag for API service"
  type        = string
  default     = "latest"
}

variable "ecs_web_image_tag" {
  description = "Docker image tag for web service"
  type        = string
  default     = "latest"
}

variable "ecs_worker_image_tag" {
  description = "Docker image tag for worker service"
  type        = string
  default     = "latest"
}

# ============================================
# ECS Module
# ============================================
module "ecs" {
  source = "../../modules/ecs"
  count  = var.enable_ecs ? 1 : 0

  # Required arguments
  project_name = "broxiva"
  environment  = "prod"
  name_prefix  = local.name_prefix
  tags         = local.common_tags

  # Network Configuration
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = var.vpc_cidr
  private_subnet_ids = module.vpc.private_subnets
  public_subnet_ids  = module.vpc.public_subnets

  # Cluster Configuration
  enable_container_insights = true
  enable_fargate_spot       = var.ecs_enable_fargate_spot
  fargate_base_count        = 1
  fargate_weight            = 1
  fargate_spot_weight       = var.ecs_enable_fargate_spot ? 1 : 0

  # Security & Encryption
  kms_key_id  = aws_kms_key.cloudtrail.id
  kms_key_arn = aws_kms_key.cloudtrail.arn
  secrets_manager_arns = [
    aws_secretsmanager_secret.app_secrets.arn,
    aws_secretsmanager_secret.database.arn
  ]

  # Load Balancer Configuration
  acm_certificate_arn        = var.acm_certificate_arn
  enable_deletion_protection = true
  alb_access_logs_bucket     = "" # Configure if needed for ALB access logs

  # Domain Configuration
  api_domain  = "api.broxiva.com"
  web_domains = ["broxiva.com", "www.broxiva.com"]

  # API Service Configuration
  api_image         = "${aws_ecr_repository.api.repository_url}:${var.ecs_api_image_tag}"
  api_container_port = 3000
  api_cpu           = var.ecs_api_cpu
  api_memory        = var.ecs_api_memory
  api_desired_count = var.ecs_api_desired_count
  api_min_count     = var.ecs_api_min_count
  api_max_count     = var.ecs_api_max_count
  api_health_check_path = "/health"
  api_cpu_target    = 70
  api_memory_target = 80

  api_environment_variables = [
    {
      name  = "NODE_ENV"
      value = "production"
    },
    {
      name  = "PORT"
      value = "3000"
    },
    {
      name  = "DATABASE_HOST"
      value = split(":", module.rds.db_instance_endpoint)[0]
    },
    {
      name  = "DATABASE_PORT"
      value = "5432"
    },
    {
      name  = "DATABASE_NAME"
      value = "broxiva"
    },
    {
      name  = "REDIS_HOST"
      value = module.elasticache.cluster_address
    },
    {
      name  = "REDIS_PORT"
      value = "6379"
    },
    {
      name  = "REDIS_TLS"
      value = "true"
    },
    {
      name  = "AWS_REGION"
      value = var.aws_region
    },
    {
      name  = "S3_MEDIA_BUCKET"
      value = module.s3_media.s3_bucket_id
    },
    {
      name  = "CLOUDFRONT_URL"
      value = "https://cdn.broxiva.com"
    },
    {
      name  = "LOG_LEVEL"
      value = "info"
    },
    {
      name  = "CORS_ORIGINS"
      value = "https://broxiva.com,https://www.broxiva.com"
    }
  ]

  api_secrets = [
    {
      name      = "DATABASE_USERNAME"
      valueFrom = "${aws_secretsmanager_secret.database.arn}:username::"
    },
    {
      name      = "DATABASE_PASSWORD"
      valueFrom = "${aws_secretsmanager_secret.database.arn}:password::"
    },
    {
      name      = "JWT_SECRET"
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:jwt_secret::"
    },
    {
      name      = "ENCRYPTION_KEY"
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:encryption_key::"
    }
  ]

  # Web Service Configuration
  web_image         = "${aws_ecr_repository.web.repository_url}:${var.ecs_web_image_tag}"
  web_container_port = 3000
  web_cpu           = var.ecs_web_cpu
  web_memory        = var.ecs_web_memory
  web_desired_count = var.ecs_web_desired_count
  web_min_count     = var.ecs_web_min_count
  web_max_count     = var.ecs_web_max_count
  web_health_check_path = "/"
  web_cpu_target    = 70

  web_environment_variables = [
    {
      name  = "NODE_ENV"
      value = "production"
    },
    {
      name  = "PORT"
      value = "3000"
    },
    {
      name  = "API_URL"
      value = "https://api.broxiva.com"
    },
    {
      name  = "NEXT_PUBLIC_API_URL"
      value = "https://api.broxiva.com"
    },
    {
      name  = "NEXT_PUBLIC_CDN_URL"
      value = "https://cdn.broxiva.com"
    }
  ]

  web_secrets = []

  # Worker Service Configuration
  enable_worker_service = true
  worker_image          = "${aws_ecr_repository.api.repository_url}:${var.ecs_worker_image_tag}"
  worker_cpu            = var.ecs_worker_cpu
  worker_memory         = var.ecs_worker_memory
  worker_desired_count  = var.ecs_worker_desired_count
  worker_min_count      = var.ecs_worker_min_count
  worker_max_count      = var.ecs_worker_max_count
  worker_cpu_target     = 70

  worker_environment_variables = [
    {
      name  = "NODE_ENV"
      value = "production"
    },
    {
      name  = "WORKER_MODE"
      value = "true"
    },
    {
      name  = "DATABASE_HOST"
      value = split(":", module.rds.db_instance_endpoint)[0]
    },
    {
      name  = "DATABASE_PORT"
      value = "5432"
    },
    {
      name  = "DATABASE_NAME"
      value = "broxiva"
    },
    {
      name  = "REDIS_HOST"
      value = module.elasticache.cluster_address
    },
    {
      name  = "REDIS_PORT"
      value = "6379"
    },
    {
      name  = "REDIS_TLS"
      value = "true"
    },
    {
      name  = "AWS_REGION"
      value = var.aws_region
    },
    {
      name  = "S3_MEDIA_BUCKET"
      value = module.s3_media.s3_bucket_id
    },
    {
      name  = "SQS_NOTIFICATIONS_QUEUE_URL"
      value = module.messaging.sqs_notifications_queue_url
    },
    {
      name  = "SQS_EMAIL_QUEUE_URL"
      value = module.messaging.sqs_email_queue_url
    },
    {
      name  = "SQS_SMS_QUEUE_URL"
      value = module.messaging.sqs_sms_queue_url
    }
  ]

  worker_secrets = [
    {
      name      = "DATABASE_USERNAME"
      valueFrom = "${aws_secretsmanager_secret.database.arn}:username::"
    },
    {
      name      = "DATABASE_PASSWORD"
      valueFrom = "${aws_secretsmanager_secret.database.arn}:password::"
    },
    {
      name      = "JWT_SECRET"
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:jwt_secret::"
    },
    {
      name      = "ENCRYPTION_KEY"
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:encryption_key::"
    }
  ]

  # Logging Configuration
  log_retention_days = 30

  # S3 Access
  s3_bucket_arns = [module.s3_media.s3_bucket_arn]

  # SES Access for emails
  enable_ses_access  = true
  ses_from_addresses = [
    "noreply@broxiva.com",
    "support@broxiva.com",
    "orders@broxiva.com",
    "notifications@broxiva.com"
  ]

  # SQS Access for queues
  sqs_queue_arns = [
    module.messaging.sqs_notifications_queue_arn,
    module.messaging.sqs_email_queue_arn,
    module.messaging.sqs_sms_queue_arn
  ]

  # SNS Access for notifications
  sns_topic_arns = [
    module.messaging.sns_topic_transactional_arn,
    module.messaging.sns_topic_alerts_arn
  ]
}

# ============================================
# Security Group Rules for Database Access (ECS)
# ============================================
# Allow ECS tasks to connect to RDS
resource "aws_security_group_rule" "ecs_to_rds" {
  count                    = var.enable_ecs ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  description              = "PostgreSQL from ECS tasks"
  security_group_id        = module.db_security_group.security_group_id
  source_security_group_id = module.ecs[0].ecs_tasks_security_group_id
}

# Allow ECS tasks to connect to Redis
resource "aws_security_group_rule" "ecs_to_redis" {
  count                    = var.enable_ecs ? 1 : 0
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  description              = "Redis from ECS tasks"
  security_group_id        = module.redis_security_group.security_group_id
  source_security_group_id = module.ecs[0].ecs_tasks_security_group_id
}

# ============================================
# Route53 Records for ECS ALB
# ============================================
resource "aws_route53_record" "ecs_api" {
  count   = var.enable_ecs && var.create_dns_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "api.broxiva.com"
  type    = "A"

  alias {
    name                   = module.ecs[0].alb_dns_name
    zone_id                = module.ecs[0].alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "ecs_web" {
  count   = var.enable_ecs && var.create_dns_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "broxiva.com"
  type    = "A"

  alias {
    name                   = module.ecs[0].alb_dns_name
    zone_id                = module.ecs[0].alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "ecs_web_www" {
  count   = var.enable_ecs && var.create_dns_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.broxiva.com"
  type    = "A"

  alias {
    name                   = module.ecs[0].alb_dns_name
    zone_id                = module.ecs[0].alb_zone_id
    evaluate_target_health = true
  }
}

# ============================================
# CloudWatch Alarms for ECS Services
# ============================================
resource "aws_cloudwatch_metric_alarm" "ecs_api_cpu_high" {
  count               = var.enable_ecs ? 1 : 0
  alarm_name          = "${local.name_prefix}-ecs-api-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS API CPU utilization is too high"
  alarm_actions       = [module.messaging.sns_topic_alerts_arn]
  ok_actions          = [module.messaging.sns_topic_alerts_arn]

  dimensions = {
    ClusterName = module.ecs[0].cluster_name
    ServiceName = module.ecs[0].api_service_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_api_memory_high" {
  count               = var.enable_ecs ? 1 : 0
  alarm_name          = "${local.name_prefix}-ecs-api-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS API memory utilization is too high"
  alarm_actions       = [module.messaging.sns_topic_alerts_arn]
  ok_actions          = [module.messaging.sns_topic_alerts_arn]

  dimensions = {
    ClusterName = module.ecs[0].cluster_name
    ServiceName = module.ecs[0].api_service_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_web_cpu_high" {
  count               = var.enable_ecs ? 1 : 0
  alarm_name          = "${local.name_prefix}-ecs-web-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS Web CPU utilization is too high"
  alarm_actions       = [module.messaging.sns_topic_alerts_arn]
  ok_actions          = [module.messaging.sns_topic_alerts_arn]

  dimensions = {
    ClusterName = module.ecs[0].cluster_name
    ServiceName = module.ecs[0].web_service_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_alb_5xx_errors" {
  count               = var.enable_ecs ? 1 : 0
  alarm_name          = "${local.name_prefix}-ecs-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ECS ALB is returning 5xx errors"
  alarm_actions       = [module.messaging.sns_topic_alerts_arn]
  ok_actions          = [module.messaging.sns_topic_alerts_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    # ALB dimension requires the suffix: app/<alb-name>/<alb-id>
    LoadBalancer = regex("loadbalancer/(.+)$", module.ecs[0].alb_arn)[0]
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_alb_target_response_time" {
  count               = var.enable_ecs ? 1 : 0
  alarm_name          = "${local.name_prefix}-ecs-alb-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = 2 # 2 seconds
  alarm_description   = "ECS ALB target response time is too high"
  alarm_actions       = [module.messaging.sns_topic_alerts_arn]
  ok_actions          = [module.messaging.sns_topic_alerts_arn]

  dimensions = {
    # ALB dimension requires the suffix: app/<alb-name>/<alb-id>
    LoadBalancer = regex("loadbalancer/(.+)$", module.ecs[0].alb_arn)[0]
  }

  tags = local.common_tags
}

# ============================================
# GitHub Actions IAM Policy for ECS Deployment
# ============================================
resource "aws_iam_role_policy" "github_actions_ecs" {
  count = var.enable_ecs ? 1 : 0
  name  = "ecs-deploy-policy"
  role  = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECSDescribe"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeClusters",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:ListServices"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECSUpdateService"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition"
        ]
        Resource = [
          "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${local.name_prefix}-cluster",
          "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:service/${local.name_prefix}-cluster/*",
          "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/${local.name_prefix}-*"
        ]
      },
      {
        Sid    = "PassRoleToECS"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          module.ecs[0].task_execution_role_arn,
          module.ecs[0].task_role_arn
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      }
    ]
  })
}

# ============================================
# ECS Outputs
# ============================================
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = var.enable_ecs ? module.ecs[0].cluster_name : null
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = var.enable_ecs ? module.ecs[0].cluster_arn : null
}

output "ecs_alb_dns_name" {
  description = "ECS ALB DNS name"
  value       = var.enable_ecs ? module.ecs[0].alb_dns_name : null
}

output "ecs_alb_zone_id" {
  description = "ECS ALB hosted zone ID (for Route53 alias records)"
  value       = var.enable_ecs ? module.ecs[0].alb_zone_id : null
}

output "ecs_api_service_name" {
  description = "ECS API service name"
  value       = var.enable_ecs ? module.ecs[0].api_service_name : null
}

output "ecs_web_service_name" {
  description = "ECS Web service name"
  value       = var.enable_ecs ? module.ecs[0].web_service_name : null
}

output "ecs_worker_service_name" {
  description = "ECS Worker service name"
  value       = var.enable_ecs ? module.ecs[0].worker_service_name : null
}

output "ecs_service_discovery_namespace" {
  description = "ECS service discovery namespace"
  value       = var.enable_ecs ? module.ecs[0].service_discovery_namespace_name : null
}

output "ecs_api_log_group" {
  description = "ECS API CloudWatch log group"
  value       = var.enable_ecs ? module.ecs[0].api_log_group_name : null
}

output "ecs_web_log_group" {
  description = "ECS Web CloudWatch log group"
  value       = var.enable_ecs ? module.ecs[0].web_log_group_name : null
}

output "ecs_worker_log_group" {
  description = "ECS Worker CloudWatch log group"
  value       = var.enable_ecs ? module.ecs[0].worker_log_group_name : null
}

# ============================================
# ECS Deployment Commands (for reference)
# ============================================
output "ecs_deployment_commands" {
  description = "Commands for ECS deployment"
  value = var.enable_ecs ? {
    update_api_service    = "aws ecs update-service --cluster ${module.ecs[0].cluster_name} --service ${module.ecs[0].api_service_name} --force-new-deployment"
    update_web_service    = "aws ecs update-service --cluster ${module.ecs[0].cluster_name} --service ${module.ecs[0].web_service_name} --force-new-deployment"
    update_worker_service = "aws ecs update-service --cluster ${module.ecs[0].cluster_name} --service ${module.ecs[0].worker_service_name} --force-new-deployment"
    view_api_logs         = "aws logs tail /aws/ecs/${local.name_prefix}/api --follow"
    view_web_logs         = "aws logs tail /aws/ecs/${local.name_prefix}/web --follow"
    view_worker_logs      = "aws logs tail /aws/ecs/${local.name_prefix}/worker --follow"
  } : null
}
