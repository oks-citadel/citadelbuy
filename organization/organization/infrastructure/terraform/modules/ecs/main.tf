# ==============================================================================
# ECS Fargate Module - Broxiva E-Commerce Platform
# ==============================================================================
# This module creates the complete ECS Fargate infrastructure including:
# - ECS Cluster with Fargate and Fargate Spot capacity providers
# - Application Load Balancer with HTTPS listeners
# - Target Groups for each service with health checks
# - Security Groups for ALB, ECS tasks, and inter-service communication
# - AWS Cloud Map namespace for service discovery
# - IAM roles for ECS task execution and tasks
# - Auto scaling configurations
# - CloudWatch monitoring and alarms
#
# Infrastructure Details:
# - AWS Account: 992382449461
# - Region: us-east-1
# - VPC CIDR: 10.0.0.0/16
# - 3 AZs with public, private, and database subnets
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ==============================================================================
# Data Sources
# ==============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  partition  = data.aws_partition.current.partition

  # Resource naming prefix
  name_prefix = "${var.project_name}-${var.environment}"

  # ECR base URL for container images
  ecr_base_url = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com/${var.project_name}"

  # Common tags for all resources
  common_tags = merge(var.tags, {
    Module      = "ecs"
    ManagedBy   = "Terraform"
    Project     = var.project_name
    Environment = var.environment
    Platform    = "broxiva"
  })

  # ============================================
  # Service Definitions for Broxiva E-Commerce
  # ============================================
  # Services are categorized as:
  # - Critical: Customer-facing (use Fargate On-Demand)
  # - Non-Critical: Background workers (use Fargate Spot)
  # ============================================
  service_configs = {
    # Core Customer-Facing Services (Critical - Fargate On-Demand)
    api = {
      name              = "api"
      container_port    = 4000
      health_check_path = "/health"
      priority          = 100
      path_patterns     = ["/api/*", "/graphql"]
      host_header       = var.api_domain
      cpu               = var.environment == "prod" ? 2048 : 512
      memory            = var.environment == "prod" ? 4096 : 1024
      desired_count     = var.environment == "prod" ? 5 : 2
      min_count         = var.environment == "prod" ? 5 : 2
      max_count         = var.environment == "prod" ? 20 : 5
      is_critical       = true
      is_public         = true
      runtime           = "nodejs"
    }

    web = {
      name              = "web"
      container_port    = 3000
      health_check_path = "/api/health"
      priority          = 200
      path_patterns     = ["/*"]
      host_header       = null # Uses web_domains variable
      cpu               = var.environment == "prod" ? 1024 : 256
      memory            = var.environment == "prod" ? 2048 : 512
      desired_count     = var.environment == "prod" ? 5 : 2
      min_count         = var.environment == "prod" ? 5 : 2
      max_count         = var.environment == "prod" ? 15 : 5
      is_critical       = true
      is_public         = true
      runtime           = "nodejs"
    }

    # AI/ML Services (Critical for recommendations)
    ai-engine = {
      name              = "ai-engine"
      container_port    = 8002
      health_check_path = "/health"
      priority          = 110
      path_patterns     = ["/ai/*"]
      host_header       = null
      cpu               = var.environment == "prod" ? 512 : 256
      memory            = var.environment == "prod" ? 1024 : 512
      desired_count     = var.environment == "prod" ? 3 : 1
      min_count         = var.environment == "prod" ? 2 : 1
      max_count         = var.environment == "prod" ? 10 : 3
      is_critical       = true
      is_public         = false
      runtime           = "python"
    }

    recommendation = {
      name              = "recommendation"
      container_port    = 8001
      health_check_path = "/health"
      priority          = 120
      path_patterns     = ["/recommendations/*"]
      host_header       = null
      cpu               = var.environment == "prod" ? 512 : 256
      memory            = var.environment == "prod" ? 1024 : 512
      desired_count     = var.environment == "prod" ? 3 : 1
      min_count         = var.environment == "prod" ? 2 : 1
      max_count         = var.environment == "prod" ? 10 : 3
      is_critical       = true
      is_public         = false
      runtime           = "python"
    }

    # Search Service
    search = {
      name              = "search"
      container_port    = 8003
      health_check_path = "/health"
      priority          = 130
      path_patterns     = ["/search/*"]
      host_header       = null
      cpu               = var.environment == "prod" ? 256 : 256
      memory            = var.environment == "prod" ? 512 : 512
      desired_count     = var.environment == "prod" ? 3 : 1
      min_count         = var.environment == "prod" ? 2 : 1
      max_count         = var.environment == "prod" ? 10 : 3
      is_critical       = true
      is_public         = false
      runtime           = "python"
    }

    # Notification Service
    notification = {
      name              = "notification"
      container_port    = 8009
      health_check_path = "/health"
      priority          = 140
      path_patterns     = ["/notifications/*"]
      host_header       = null
      cpu               = var.environment == "prod" ? 256 : 256
      memory            = var.environment == "prod" ? 512 : 512
      desired_count     = var.environment == "prod" ? 3 : 1
      min_count         = var.environment == "prod" ? 2 : 1
      max_count         = var.environment == "prod" ? 10 : 3
      is_critical       = false
      is_public         = false
      runtime           = "python"
    }

    # Inventory Service
    inventory = {
      name              = "inventory"
      container_port    = 8007
      health_check_path = "/health"
      priority          = 160
      path_patterns     = ["/inventory/*"]
      host_header       = null
      cpu               = var.environment == "prod" ? 256 : 256
      memory            = var.environment == "prod" ? 512 : 512
      desired_count     = var.environment == "prod" ? 3 : 1
      min_count         = var.environment == "prod" ? 2 : 1
      max_count         = var.environment == "prod" ? 10 : 3
      is_critical       = true
      is_public         = false
      runtime           = "python"
    }

    # Pricing Service
    pricing = {
      name              = "pricing"
      container_port    = 8006
      health_check_path = "/health"
      priority          = 170
      path_patterns     = ["/pricing/*"]
      host_header       = null
      cpu               = var.environment == "prod" ? 256 : 256
      memory            = var.environment == "prod" ? 512 : 512
      desired_count     = var.environment == "prod" ? 2 : 1
      min_count         = var.environment == "prod" ? 2 : 1
      max_count         = var.environment == "prod" ? 6 : 3
      is_critical       = true
      is_public         = false
      runtime           = "python"
    }
  }

  # Background Worker Services (Non-Critical - use Fargate Spot)
  worker_configs = {
    analytics = {
      name          = "analytics"
      cpu           = 256
      memory        = 512
      desired_count = var.environment == "prod" ? 2 : 1
      min_count     = var.environment == "prod" ? 1 : 1
      max_count     = var.environment == "prod" ? 5 : 2
      is_critical   = false
      runtime       = "python"
    }

    chatbot = {
      name          = "chatbot"
      cpu           = 256
      memory        = 512
      desired_count = var.environment == "prod" ? 2 : 1
      min_count     = var.environment == "prod" ? 1 : 1
      max_count     = var.environment == "prod" ? 5 : 2
      is_critical   = false
      runtime       = "python"
    }

    fraud-detection = {
      name          = "fraud-detection"
      cpu           = 256
      memory        = 512
      desired_count = var.environment == "prod" ? 2 : 1
      min_count     = var.environment == "prod" ? 1 : 1
      max_count     = var.environment == "prod" ? 5 : 2
      is_critical   = false
      runtime       = "python"
    }

    media = {
      name          = "media"
      cpu           = 256
      memory        = 512
      desired_count = var.environment == "prod" ? 2 : 1
      min_count     = var.environment == "prod" ? 1 : 1
      max_count     = var.environment == "prod" ? 5 : 2
      is_critical   = false
      runtime       = "python"
    }

    personalization = {
      name          = "personalization"
      cpu           = 256
      memory        = 512
      desired_count = var.environment == "prod" ? 2 : 1
      min_count     = var.environment == "prod" ? 1 : 1
      max_count     = var.environment == "prod" ? 5 : 2
      is_critical   = false
      runtime       = "python"
    }

    supplier-integration = {
      name          = "supplier-integration"
      cpu           = 256
      memory        = 512
      desired_count = var.environment == "prod" ? 2 : 1
      min_count     = var.environment == "prod" ? 1 : 1
      max_count     = var.environment == "prod" ? 5 : 2
      is_critical   = false
      runtime       = "python"
    }

    ai-agents = {
      name          = "ai-agents"
      cpu           = 256
      memory        = 512
      desired_count = var.environment == "prod" ? 2 : 1
      min_count     = var.environment == "prod" ? 1 : 1
      max_count     = var.environment == "prod" ? 5 : 2
      is_critical   = false
      runtime       = "python"
    }
  }

  # Filter enabled services based on variable
  enabled_api_services = {
    for k, v in local.service_configs : k => v
    if contains(var.enabled_services, k)
  }

  enabled_worker_services = {
    for k, v in local.worker_configs : k => v
    if contains(var.enabled_services, k)
  }

  # All enabled services combined
  all_enabled_services = merge(local.enabled_api_services, local.enabled_worker_services)
}

# ==============================================================================
# ECS Cluster
# ==============================================================================

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = var.kms_key_id
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = var.kms_key_id != null
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-cluster"
  })
}

# ==============================================================================
# ECS Cluster Capacity Providers (Fargate + Fargate Spot)
# ==============================================================================
# Cost Optimization Strategy:
# - Critical services: 100% Fargate On-Demand for reliability
# - Non-critical services: Mix of On-Demand (20%) and Spot (80%)
# ==============================================================================

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # Default strategy for the cluster - primarily use Spot for cost savings
  default_capacity_provider_strategy {
    base              = var.fargate_base_count
    weight            = var.fargate_weight
    capacity_provider = "FARGATE"
  }

  dynamic "default_capacity_provider_strategy" {
    for_each = var.enable_fargate_spot ? [1] : []
    content {
      base              = 0
      weight            = var.fargate_spot_weight
      capacity_provider = "FARGATE_SPOT"
    }
  }
}

# ==============================================================================
# CloudWatch Log Groups
# ==============================================================================

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/aws/ecs/${local.name_prefix}/exec"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-exec-logs"
  })
}

resource "aws_cloudwatch_log_group" "services" {
  for_each = local.all_enabled_services

  name              = "/aws/ecs/${local.name_prefix}/${each.key}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-logs"
    Service = each.key
  })
}

# ==============================================================================
# Security Groups
# ==============================================================================

# ALB Security Group - Public Internet Access
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Security group for Application Load Balancer - allows HTTPS from internet"
  vpc_id      = var.vpc_id

  # HTTP inbound (will redirect to HTTPS)
  ingress {
    description = "HTTP from Internet (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS inbound
  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress to ECS tasks in private subnets
  egress {
    description = "Allow outbound to VPC"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ECS Tasks Security Group
resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name_prefix}-ecs-tasks-sg"
  description = "Security group for ECS Fargate tasks"
  vpc_id      = var.vpc_id

  # Allow traffic from ALB
  ingress {
    description     = "Traffic from ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow inter-service communication (service mesh)
  ingress {
    description = "Inter-service communication within ECS tasks"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # Allow traffic from VPC (for internal ALB and service discovery)
  ingress {
    description = "Traffic from VPC for service discovery"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Egress - allow all outbound (for pulling images, accessing databases, external APIs)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-tasks-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Service Discovery Security Group
resource "aws_security_group" "service_discovery" {
  name        = "${local.name_prefix}-service-discovery-sg"
  description = "Security group for AWS Cloud Map service discovery"
  vpc_id      = var.vpc_id

  # DNS queries over UDP
  ingress {
    description = "DNS UDP from VPC"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  # DNS queries over TCP
  ingress {
    description = "DNS TCP from VPC"
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Service-to-service communication
  ingress {
    description     = "Service mesh traffic from ECS tasks"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-service-discovery-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Database Access Security Group Rule
resource "aws_security_group_rule" "ecs_to_database" {
  count = var.database_security_group_id != "" ? 1 : 0

  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.database_security_group_id
  source_security_group_id = aws_security_group.ecs_tasks.id
  description              = "PostgreSQL access from ECS Fargate tasks"
}

# Redis/ElastiCache Access Security Group Rule
resource "aws_security_group_rule" "ecs_to_redis" {
  count = var.redis_security_group_id != "" ? 1 : 0

  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = var.redis_security_group_id
  source_security_group_id = aws_security_group.ecs_tasks.id
  description              = "Redis/ElastiCache access from ECS Fargate tasks"
}

# ==============================================================================
# Application Load Balancer (External - Internet Facing)
# ==============================================================================

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "prod" ? true : false
  enable_http2               = true
  idle_timeout               = 60
  drop_invalid_header_fields = true

  dynamic "access_logs" {
    for_each = var.alb_access_logs_bucket != "" ? [1] : []
    content {
      bucket  = var.alb_access_logs_bucket
      prefix  = "${local.name_prefix}-alb"
      enabled = true
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

# Internal ALB for service-to-service communication (optional)
resource "aws_lb" "internal" {
  count = var.enable_internal_alb ? 1 : 0

  name               = "${local.name_prefix}-internal-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.ecs_tasks.id]
  subnets            = var.private_subnet_ids

  enable_deletion_protection = var.environment == "prod" ? true : false
  enable_http2               = true
  idle_timeout               = 60

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-internal-alb"
  })
}

# ==============================================================================
# ALB Target Groups
# ==============================================================================

resource "aws_lb_target_group" "services" {
  for_each = local.enabled_api_services

  name                 = substr("${local.name_prefix}-${each.key}", 0, 32)
  port                 = each.value.container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = var.environment == "prod" ? 120 : 30

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = each.value.health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200-299"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = false
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-tg"
    Service = each.key
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ==============================================================================
# ALB Listeners
# ==============================================================================

# HTTP Listener (redirects to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-http-listener"
  })
}

# HTTPS Listener with SSL Certificate
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  # Default action - forward to web frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["web"].arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-https-listener"
  })
}

# ==============================================================================
# ALB Listener Rules (Path-based routing)
# ==============================================================================

# API Service Rule (priority 100)
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["api"].arn
  }

  # Route by host header (api.broxiva.com)
  dynamic "condition" {
    for_each = var.api_domain != "" ? [1] : []
    content {
      host_header {
        values = [var.api_domain]
      }
    }
  }

  # Also route by path pattern (/api/*, /graphql)
  condition {
    path_pattern {
      values = ["/api/*", "/graphql", "/graphql/*"]
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-api-rule"
    Service = "api"
  })
}

# Dynamic listener rules for other API services
resource "aws_lb_listener_rule" "services" {
  for_each = {
    for k, v in local.enabled_api_services : k => v
    if k != "api" && k != "web" && v.is_public == false
  }

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.key].arn
  }

  condition {
    path_pattern {
      values = each.value.path_patterns
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-rule"
    Service = each.key
  })
}

# ==============================================================================
# AWS Cloud Map - Service Discovery
# ==============================================================================

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${local.name_prefix}.local"
  description = "Service discovery namespace for ${var.project_name} ${var.environment} environment"
  vpc         = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-namespace"
  })
}

# Service Discovery Services for API services
resource "aws_service_discovery_service" "api_services" {
  for_each = local.enabled_api_services

  name = each.key

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }

    dns_records {
      ttl  = 10
      type = "SRV"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-discovery"
    Service = each.key
  })
}

# Service Discovery Services for Worker services
resource "aws_service_discovery_service" "worker_services" {
  for_each = local.enabled_worker_services

  name = each.key

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-discovery"
    Service = each.key
  })
}

# ==============================================================================
# IAM Roles
# ==============================================================================

# ECS Task Execution Role (for ECS agent operations)
resource "aws_iam_role" "ecs_task_execution" {
  name        = "${local.name_prefix}-ecs-task-execution"
  description = "ECS Task Execution Role for ${var.project_name} ${var.environment}"
  path        = "/ecs/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECSTasksAssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:${local.partition}:ecs:${local.region}:${local.account_id}:*"
          }
          StringEquals = {
            "aws:SourceAccount" = local.account_id
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-task-execution"
    Role = "task-execution"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Custom policy for secrets access
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${local.name_prefix}-ecs-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}/*",
          "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}-${var.environment}/*"
        ]
      },
      {
        Sid    = "GetSSMParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:${local.partition}:ssm:${local.region}:${local.account_id}:parameter/${var.project_name}/*",
          "arn:${local.partition}:ssm:${local.region}:${local.account_id}:parameter/${var.project_name}-${var.environment}/*"
        ]
      },
      {
        Sid    = "DecryptSecrets"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = var.kms_key_arn != "" ? [var.kms_key_arn] : ["*"]
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${local.region}.amazonaws.com"
          }
        }
      },
      {
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Task Role (for application container permissions)
resource "aws_iam_role" "ecs_task" {
  name        = "${local.name_prefix}-ecs-task"
  description = "ECS Task Role for ${var.project_name} ${var.environment} application containers"
  path        = "/ecs/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECSTasksAssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:${local.partition}:ecs:${local.region}:${local.account_id}:*"
          }
          StringEquals = {
            "aws:SourceAccount" = local.account_id
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-task"
    Role = "task"
  })
}

# Task role policies
resource "aws_iam_role_policy" "ecs_task_permissions" {
  name = "${local.name_prefix}-ecs-task-permissions"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:${local.partition}:s3:::${var.project_name}-${var.environment}-*",
          "arn:${local.partition}:s3:::${var.project_name}-${var.environment}-*/*"
        ]
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = "arn:${local.partition}:sqs:${local.region}:${local.account_id}:${var.project_name}-${var.environment}-*"
      },
      {
        Sid    = "SNSAccess"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = "arn:${local.partition}:sns:${local.region}:${local.account_id}:${var.project_name}-${var.environment}-*"
      },
      {
        Sid    = "SESAccess"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/aws/ecs/${local.name_prefix}/*"
      },
      {
        Sid    = "XRayTracing"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECSExecSSM"
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}

# ==============================================================================
# ECS Task Definitions - API Services
# ==============================================================================

resource "aws_ecs_task_definition" "api_services" {
  for_each = local.enabled_api_services

  family                   = "${local.name_prefix}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${local.ecr_base_url}/${each.key}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          name          = each.key
          containerPort = each.value.container_port
          hostPort      = each.value.container_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${each.value.container_port}${each.value.health_check_path} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      environment = [
        { name = "NODE_ENV", value = var.environment == "prod" ? "production" : var.environment },
        { name = "ENVIRONMENT", value = var.environment },
        { name = "PORT", value = tostring(each.value.container_port) },
        { name = "AWS_REGION", value = local.region },
        { name = "SERVICE_NAME", value = each.key },
        { name = "SERVICE_DISCOVERY_NAMESPACE", value = "${local.name_prefix}.local" },
        { name = "LOG_LEVEL", value = var.environment == "prod" ? "info" : "debug" }
      ]

      secrets = var.enable_secrets_injection ? [
        {
          name      = "DATABASE_URL"
          valueFrom = "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}-${var.environment}/database-url"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}-${var.environment}/redis-url"
        }
      ] : []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services[each.key].name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      linuxParameters = {
        initProcessEnabled = true
      }

      ulimits = each.value.runtime == "nodejs" ? [
        {
          name      = "nofile"
          softLimit = 65536
          hardLimit = 65536
        }
      ] : []
    }
  ])

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-task"
    Service = each.key
    Runtime = each.value.runtime
  })
}

# ==============================================================================
# ECS Task Definitions - Worker Services
# ==============================================================================

resource "aws_ecs_task_definition" "worker_services" {
  for_each = local.enabled_worker_services

  family                   = "${local.name_prefix}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${local.ecr_base_url}/${each.key}:${var.image_tag}"
      essential = true

      healthCheck = {
        command     = ["CMD-SHELL", "python -c 'import sys; sys.exit(0)'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      environment = [
        { name = "ENVIRONMENT", value = var.environment },
        { name = "AWS_REGION", value = local.region },
        { name = "SERVICE_NAME", value = each.key },
        { name = "WORKER_TYPE", value = each.key },
        { name = "LOG_LEVEL", value = var.environment == "prod" ? "INFO" : "DEBUG" },
        { name = "PYTHONUNBUFFERED", value = "1" }
      ]

      secrets = var.enable_secrets_injection ? [
        {
          name      = "DATABASE_URL"
          valueFrom = "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}-${var.environment}/database-url"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:${var.project_name}-${var.environment}/redis-url"
        }
      ] : []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services[each.key].name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      linuxParameters = {
        initProcessEnabled = true
      }
    }
  ])

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-task"
    Service = each.key
    Runtime = each.value.runtime
  })
}

# ==============================================================================
# ECS Services - API Services (with Load Balancer)
# ==============================================================================

resource "aws_ecs_service" "api_services" {
  for_each = local.enabled_api_services

  name                               = "${local.name_prefix}-${each.key}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.api_services[each.key].arn
  desired_count                      = each.value.desired_count
  deployment_minimum_healthy_percent = each.value.is_critical ? 100 : 50
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = each.value.is_critical ? 120 : 60
  enable_execute_command             = var.enable_execute_command
  propagate_tags                     = "SERVICE"
  enable_ecs_managed_tags            = true

  # Capacity provider strategy based on service criticality
  dynamic "capacity_provider_strategy" {
    for_each = each.value.is_critical ? [
      { provider = "FARGATE", base = each.value.min_count, weight = 100 }
    ] : [
      { provider = "FARGATE", base = 1, weight = var.fargate_weight },
      { provider = "FARGATE_SPOT", base = 0, weight = var.fargate_spot_weight }
    ]

    content {
      capacity_provider = capacity_provider_strategy.value.provider
      base              = capacity_provider_strategy.value.base
      weight            = capacity_provider_strategy.value.weight
    }
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id, aws_security_group.service_discovery.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services[each.key].arn
    container_name   = each.key
    container_port   = each.value.container_port
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.api_services[each.key].arn
    container_name = each.key
    container_port = each.value.container_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy.ecs_task_execution_secrets
  ]

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-${each.key}-service"
    Service     = each.key
    ServiceType = each.value.is_critical ? "critical" : "standard"
    SpotEnabled = !each.value.is_critical
  })
}

# ==============================================================================
# ECS Services - Worker Services (without Load Balancer)
# ==============================================================================

resource "aws_ecs_service" "worker_services" {
  for_each = local.enabled_worker_services

  name                               = "${local.name_prefix}-${each.key}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.worker_services[each.key].arn
  desired_count                      = each.value.desired_count
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  enable_execute_command             = var.enable_execute_command
  propagate_tags                     = "SERVICE"
  enable_ecs_managed_tags            = true

  # Worker services use Fargate Spot for cost optimization
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 1
    weight            = 20
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    base              = 0
    weight            = 80
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id, aws_security_group.service_discovery.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.worker_services[each.key].arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [
    aws_iam_role_policy.ecs_task_execution_secrets
  ]

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-${each.key}-service"
    Service     = each.key
    ServiceType = "worker"
    SpotEnabled = true
  })
}

# ==============================================================================
# Auto Scaling - API Services
# ==============================================================================

resource "aws_appautoscaling_target" "api_services" {
  for_each = var.enable_autoscaling ? local.enabled_api_services : {}

  max_capacity       = each.value.max_count
  min_capacity       = each.value.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api_services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [aws_ecs_service.api_services]
}

# CPU-based Auto Scaling
resource "aws_appautoscaling_policy" "api_cpu" {
  for_each = var.enable_autoscaling ? local.enabled_api_services : {}

  name               = "${local.name_prefix}-${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.api_services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.autoscaling_cpu_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Memory-based Auto Scaling
resource "aws_appautoscaling_policy" "api_memory" {
  for_each = var.enable_autoscaling ? local.enabled_api_services : {}

  name               = "${local.name_prefix}-${each.key}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.api_services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.autoscaling_memory_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ALB Request Count Based Scaling
resource "aws_appautoscaling_policy" "api_requests" {
  for_each = var.enable_autoscaling ? local.enabled_api_services : {}

  name               = "${local.name_prefix}-${each.key}-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.api_services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.services[each.key].arn_suffix}"
    }
    target_value       = var.autoscaling_request_count_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ==============================================================================
# Auto Scaling - Worker Services
# ==============================================================================

resource "aws_appautoscaling_target" "worker_services" {
  for_each = var.enable_autoscaling ? local.enabled_worker_services : {}

  max_capacity       = each.value.max_count
  min_capacity       = each.value.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.worker_services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [aws_ecs_service.worker_services]
}

resource "aws_appautoscaling_policy" "worker_cpu" {
  for_each = var.enable_autoscaling ? local.enabled_worker_services : {}

  name               = "${local.name_prefix}-${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.worker_services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker_services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 75
    scale_in_cooldown  = 300
    scale_out_cooldown = 120
  }
}

# ==============================================================================
# CloudWatch Alarms
# ==============================================================================

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  for_each = var.enable_cloudwatch_alarms ? local.enabled_api_services : {}

  alarm_name          = "${local.name_prefix}-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization exceeded 80% for ${each.key}"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api_services[each.key].name
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-cpu-high-alarm"
    Service = each.key
  })
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  for_each = var.enable_cloudwatch_alarms ? local.enabled_api_services : {}

  alarm_name          = "${local.name_prefix}-${each.key}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Memory utilization exceeded 80% for ${each.key}"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api_services[each.key].name
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-memory-high-alarm"
    Service = each.key
  })
}

# ALB 5xx Error Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB is returning 5xx errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-5xx-errors-alarm"
  })
}

# ALB Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 2
  alarm_description   = "ALB response time exceeded 2 seconds"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-high-latency-alarm"
  })
}
