# =============================================================================
# ECS Fargate Task Definitions - Broxiva E-Commerce Platform
# =============================================================================
# This file defines ECS Fargate task definitions for all 15 microservices
# Image source: 992382449461.dkr.ecr.us-east-1.amazonaws.com/broxiva/{service}
#
# Services defined:
#  1. broxiva-api           - NestJS Backend API (Port 4000)
#  2. broxiva-web           - Next.js Frontend (Port 3000)
#  3. broxiva-ai-agents     - Python FastAPI AI Agents (Port 8020)
#  4. broxiva-ai-engine     - Python FastAPI AI Engine (Port 8002)
#  5. broxiva-analytics     - Python Analytics Worker (No Port)
#  6. broxiva-chatbot       - Python Chatbot Worker (No Port)
#  7. broxiva-fraud-detection - Python Fraud Detection Worker (No Port)
#  8. broxiva-inventory     - Python FastAPI Inventory (Port 8007)
#  9. broxiva-media         - Python Media Worker (No Port)
# 10. broxiva-notification  - Python FastAPI Notification (Port 8009)
# 11. broxiva-personalization - Python Personalization Worker (No Port)
# 12. broxiva-pricing       - Python FastAPI Pricing (Port 8006)
# 13. broxiva-recommendation - Python FastAPI Recommendation (Port 8001)
# 14. broxiva-search        - Python FastAPI Search (Port 8007)
# 15. broxiva-supplier-integration - Python Supplier Worker (No Port)
# =============================================================================

# -----------------------------------------------------------------------------
# Local Variables - Service Configurations for All 15 Services
# Note: ecr_base_url is defined in main.tf and reused here
# -----------------------------------------------------------------------------
locals {
  # Image tag for Broxiva services - fallback to image_tag if broxiva_image_tag not set
  effective_image_tag = var.broxiva_image_tag != "" ? var.broxiva_image_tag : var.image_tag

  # Secrets Manager ARN pattern for service secrets
  secrets_base_arn = length(var.secrets_manager_arns) > 0 ? var.secrets_manager_arns[0] : "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:broxiva"

  # Common environment tag
  environment_tag = var.name_prefix != "" ? var.name_prefix : "${var.project_name}-${var.environment}"

  # =============================================================================
  # Service Definitions for all 15 Broxiva services
  # =============================================================================
  broxiva_service_definitions = {
    # -------------------------------------------------------------------------
    # 1. broxiva-api - NestJS Backend API
    # -------------------------------------------------------------------------
    "broxiva-api" = {
      name           = "broxiva-api"
      cpu            = var.api_cpu
      memory         = var.api_memory
      container_port = var.api_container_port
      host_port      = var.api_container_port
      protocol       = "tcp"
      essential      = true
      runtime        = "nodejs"
      is_critical    = true
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.api_container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      environment = concat(var.api_environment_variables, [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.api_container_port) },
        { name = "TZ", value = "UTC" }
      ])
      secrets = concat(var.api_secrets, [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" },
        { name = "JWT_SECRET", valueFrom = "${local.secrets_base_arn}:JWT_SECRET::" },
        { name = "JWT_REFRESH_SECRET", valueFrom = "${local.secrets_base_arn}:JWT_REFRESH_SECRET::" },
        { name = "STRIPE_SECRET_KEY", valueFrom = "${local.secrets_base_arn}:STRIPE_SECRET_KEY::" },
        { name = "STRIPE_WEBHOOK_SECRET", valueFrom = "${local.secrets_base_arn}:STRIPE_WEBHOOK_SECRET::" },
        { name = "AWS_S3_BUCKET", valueFrom = "${local.secrets_base_arn}:AWS_S3_BUCKET::" },
        { name = "SENDGRID_API_KEY", valueFrom = "${local.secrets_base_arn}:SENDGRID_API_KEY::" }
      ])
      ulimits = [
        { name = "nofile", softLimit = 65536, hardLimit = 65536 }
      ]
    }

    # -------------------------------------------------------------------------
    # 2. broxiva-web - Next.js Frontend
    # -------------------------------------------------------------------------
    "broxiva-web" = {
      name           = "broxiva-web"
      cpu            = var.web_cpu
      memory         = var.web_memory
      container_port = var.web_container_port
      host_port      = var.web_container_port
      protocol       = "tcp"
      essential      = true
      runtime        = "nodejs"
      is_critical    = true
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.web_container_port}/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      environment = concat(var.web_environment_variables, [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.web_container_port) },
        { name = "NEXT_TELEMETRY_DISABLED", value = "1" },
        { name = "TZ", value = "UTC" }
      ])
      secrets = concat(var.web_secrets, [
        { name = "NEXT_PUBLIC_API_URL", valueFrom = "${local.secrets_base_arn}:API_URL::" },
        { name = "NEXTAUTH_SECRET", valueFrom = "${local.secrets_base_arn}:NEXTAUTH_SECRET::" },
        { name = "NEXTAUTH_URL", valueFrom = "${local.secrets_base_arn}:NEXTAUTH_URL::" }
      ])
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 3. broxiva-ai-agents - Python FastAPI AI Agents Service
    # -------------------------------------------------------------------------
    "broxiva-ai-agents" = {
      name           = "broxiva-ai-agents"
      cpu            = 256
      memory         = 512
      container_port = 8020
      host_port      = 8020
      protocol       = "tcp"
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8020/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 45
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "PORT", value = "8020" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "OPENAI_API_KEY", valueFrom = "${local.secrets_base_arn}:OPENAI_API_KEY::" },
        { name = "ANTHROPIC_API_KEY", valueFrom = "${local.secrets_base_arn}:ANTHROPIC_API_KEY::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" },
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 4. broxiva-ai-engine - Python FastAPI AI Engine Service
    # -------------------------------------------------------------------------
    "broxiva-ai-engine" = {
      name           = "broxiva-ai-engine"
      cpu            = 512
      memory         = 1024
      container_port = 8002
      host_port      = 8002
      protocol       = "tcp"
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8002/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "PORT", value = "8002" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "MODEL_CACHE_DIR", value = "/tmp/models" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "OPENAI_API_KEY", valueFrom = "${local.secrets_base_arn}:OPENAI_API_KEY::" },
        { name = "ANTHROPIC_API_KEY", valueFrom = "${local.secrets_base_arn}:ANTHROPIC_API_KEY::" },
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 5. broxiva-analytics - Python Analytics Service (Worker - No Port)
    # -------------------------------------------------------------------------
    "broxiva-analytics" = {
      name           = "broxiva-analytics"
      cpu            = 256
      memory         = 512
      container_port = null
      host_port      = null
      protocol       = null
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "python -c 'import sys; sys.exit(0)'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "WORKER_TYPE", value = "analytics" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" },
        { name = "AWS_S3_BUCKET", valueFrom = "${local.secrets_base_arn}:AWS_S3_BUCKET::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 6. broxiva-chatbot - Python Chatbot Service (Worker - No Port)
    # -------------------------------------------------------------------------
    "broxiva-chatbot" = {
      name           = "broxiva-chatbot"
      cpu            = 256
      memory         = 512
      container_port = null
      host_port      = null
      protocol       = null
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "python -c 'import sys; sys.exit(0)'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "WORKER_TYPE", value = "chatbot" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "OPENAI_API_KEY", valueFrom = "${local.secrets_base_arn}:OPENAI_API_KEY::" },
        { name = "ANTHROPIC_API_KEY", valueFrom = "${local.secrets_base_arn}:ANTHROPIC_API_KEY::" },
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 7. broxiva-fraud-detection - Python Fraud Detection Service (Worker)
    # -------------------------------------------------------------------------
    "broxiva-fraud-detection" = {
      name           = "broxiva-fraud-detection"
      cpu            = 256
      memory         = 512
      container_port = null
      host_port      = null
      protocol       = null
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "python -c 'import sys; sys.exit(0)'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "WORKER_TYPE", value = "fraud-detection" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" },
        { name = "ML_MODEL_BUCKET", valueFrom = "${local.secrets_base_arn}:ML_MODEL_BUCKET::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 8. broxiva-inventory - Python FastAPI Inventory Service
    # -------------------------------------------------------------------------
    "broxiva-inventory" = {
      name           = "broxiva-inventory"
      cpu            = 256
      memory         = 512
      container_port = 8007
      host_port      = 8007
      protocol       = "tcp"
      essential      = true
      runtime        = "python"
      is_critical    = true
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8007/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 45
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "PORT", value = "8007" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 9. broxiva-media - Python Media Processing Service (Worker - No Port)
    # -------------------------------------------------------------------------
    "broxiva-media" = {
      name           = "broxiva-media"
      cpu            = 256
      memory         = 512
      container_port = null
      host_port      = null
      protocol       = null
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "python -c 'import sys; sys.exit(0)'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "WORKER_TYPE", value = "media" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "AWS_S3_BUCKET", valueFrom = "${local.secrets_base_arn}:AWS_S3_BUCKET::" },
        { name = "AWS_CLOUDFRONT_URL", valueFrom = "${local.secrets_base_arn}:AWS_CLOUDFRONT_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 10. broxiva-notification - Python FastAPI Notification Service
    # -------------------------------------------------------------------------
    "broxiva-notification" = {
      name           = "broxiva-notification"
      cpu            = 256
      memory         = 512
      container_port = 8009
      host_port      = 8009
      protocol       = "tcp"
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8009/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 45
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "PORT", value = "8009" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "SENDGRID_API_KEY", valueFrom = "${local.secrets_base_arn}:SENDGRID_API_KEY::" },
        { name = "TWILIO_ACCOUNT_SID", valueFrom = "${local.secrets_base_arn}:TWILIO_ACCOUNT_SID::" },
        { name = "TWILIO_AUTH_TOKEN", valueFrom = "${local.secrets_base_arn}:TWILIO_AUTH_TOKEN::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" },
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 11. broxiva-personalization - Python Personalization Service (Worker)
    # -------------------------------------------------------------------------
    "broxiva-personalization" = {
      name           = "broxiva-personalization"
      cpu            = 256
      memory         = 512
      container_port = null
      host_port      = null
      protocol       = null
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "python -c 'import sys; sys.exit(0)'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "WORKER_TYPE", value = "personalization" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 12. broxiva-pricing - Python FastAPI Pricing Service
    # -------------------------------------------------------------------------
    "broxiva-pricing" = {
      name           = "broxiva-pricing"
      cpu            = 256
      memory         = 512
      container_port = 8006
      host_port      = 8006
      protocol       = "tcp"
      essential      = true
      runtime        = "python"
      is_critical    = true
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8006/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 45
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "PORT", value = "8006" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 13. broxiva-recommendation - Python FastAPI Recommendation Service
    # -------------------------------------------------------------------------
    "broxiva-recommendation" = {
      name           = "broxiva-recommendation"
      cpu            = 512
      memory         = 1024
      container_port = 8001
      host_port      = 8001
      protocol       = "tcp"
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8001/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "PORT", value = "8001" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "MODEL_CACHE_DIR", value = "/tmp/models" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 14. broxiva-search - Python FastAPI Search Service
    # -------------------------------------------------------------------------
    "broxiva-search" = {
      name           = "broxiva-search"
      cpu            = 256
      memory         = 512
      container_port = 8007
      host_port      = 8007
      protocol       = "tcp"
      essential      = true
      runtime        = "python"
      is_critical    = true
      health_check = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8007/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 45
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "PORT", value = "8007" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "ELASTICSEARCH_URL", valueFrom = "${local.secrets_base_arn}:ELASTICSEARCH_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" },
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" }
      ]
      ulimits = []
    }

    # -------------------------------------------------------------------------
    # 15. broxiva-supplier-integration - Python Supplier Integration (Worker)
    # -------------------------------------------------------------------------
    "broxiva-supplier-integration" = {
      name           = "broxiva-supplier-integration"
      cpu            = 256
      memory         = 512
      container_port = null
      host_port      = null
      protocol       = null
      essential      = true
      runtime        = "python"
      is_critical    = false
      health_check = {
        command     = ["CMD-SHELL", "python -c 'import sys; sys.exit(0)'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "LOG_LEVEL", value = "INFO" },
        { name = "PYTHONUNBUFFERED", value = "1" },
        { name = "WORKER_TYPE", value = "supplier-integration" },
        { name = "TZ", value = "UTC" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.secrets_base_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${local.secrets_base_arn}:REDIS_URL::" }
      ]
      ulimits = []
    }
  }

  # Filter services that have container ports (API/Web services)
  broxiva_api_services = {
    for k, v in local.broxiva_service_definitions : k => v
    if v.container_port != null
  }

  # Filter services that are workers (no container ports)
  broxiva_worker_services = {
    for k, v in local.broxiva_service_definitions : k => v
    if v.container_port == null
  }
}

# =============================================================================
# CloudWatch Log Groups for All 15 ECS Services
# =============================================================================
resource "aws_cloudwatch_log_group" "broxiva_services" {
  for_each = local.broxiva_service_definitions

  name              = "/ecs/${var.name_prefix}/${each.key}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(var.tags, {
    Name        = "${each.key}-logs"
    Service     = each.key
    Runtime     = each.value.runtime
    ServiceType = each.value.container_port != null ? "api" : "worker"
  })
}

# =============================================================================
# ECS Task Definitions for All 15 Broxiva Services
# =============================================================================
resource "aws_ecs_task_definition" "broxiva_services" {
  for_each = local.broxiva_service_definitions

  family                   = "${var.name_prefix}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    merge(
      {
        name      = each.key
        image     = "${local.ecr_base_url}/${each.key}:${local.effective_image_tag}"
        essential = each.value.essential

        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.broxiva_services[each.key].name
            "awslogs-region"        = data.aws_region.current.name
            "awslogs-stream-prefix" = "ecs"
          }
        }

        healthCheck = {
          command     = each.value.health_check.command
          interval    = each.value.health_check.interval
          timeout     = each.value.health_check.timeout
          retries     = each.value.health_check.retries
          startPeriod = each.value.health_check.startPeriod
        }

        environment = each.value.environment
        secrets     = each.value.secrets
      },
      # Only add portMappings if container_port is defined (API services)
      each.value.container_port != null ? {
        portMappings = [
          {
            containerPort = each.value.container_port
            hostPort      = each.value.host_port
            protocol      = each.value.protocol
          }
        ]
      } : {},
      # Add ulimits if defined
      length(each.value.ulimits) > 0 ? {
        ulimits = each.value.ulimits
      } : {}
    )
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = merge(var.tags, {
    Name        = "${each.key}-task-definition"
    Service     = each.key
    Runtime     = each.value.runtime
    IsCritical  = each.value.is_critical
    HasPort     = each.value.container_port != null
    ServiceType = each.value.container_port != null ? "api" : "worker"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# Task Definition Outputs for All 15 Services
# =============================================================================

output "broxiva_task_definition_arns" {
  description = "Map of all 15 Broxiva service names to their task definition ARNs"
  value = {
    for k, v in aws_ecs_task_definition.broxiva_services : k => v.arn
  }
}

output "broxiva_task_definition_families" {
  description = "Map of all 15 Broxiva service names to their task definition families"
  value = {
    for k, v in aws_ecs_task_definition.broxiva_services : k => v.family
  }
}

output "broxiva_task_definition_revisions" {
  description = "Map of all 15 Broxiva service names to their task definition revisions"
  value = {
    for k, v in aws_ecs_task_definition.broxiva_services : k => v.revision
  }
}

output "broxiva_log_group_names" {
  description = "Map of all 15 Broxiva service names to their CloudWatch Log Group names"
  value = {
    for k, v in aws_cloudwatch_log_group.broxiva_services : k => v.name
  }
}

output "broxiva_log_group_arns" {
  description = "Map of all 15 Broxiva service names to their CloudWatch Log Group ARNs"
  value = {
    for k, v in aws_cloudwatch_log_group.broxiva_services : k => v.arn
  }
}

output "broxiva_api_service_names" {
  description = "List of API/Web service names (services with exposed ports)"
  value       = keys(local.broxiva_api_services)
}

output "broxiva_worker_service_names" {
  description = "List of worker service names (services without exposed ports)"
  value       = keys(local.broxiva_worker_services)
}

output "broxiva_service_definitions" {
  description = "Full service definitions map for use by other modules"
  value       = local.broxiva_service_definitions
}

output "broxiva_critical_services" {
  description = "List of critical service names"
  value = [
    for k, v in local.broxiva_service_definitions : k if v.is_critical
  ]
}

output "broxiva_service_ports" {
  description = "Map of service names to their container ports (null for workers)"
  value = {
    for k, v in local.broxiva_service_definitions : k => v.container_port
  }
}

output "broxiva_service_cpu_memory" {
  description = "Map of service names to their CPU and memory configurations"
  value = {
    for k, v in local.broxiva_service_definitions : k => {
      cpu    = v.cpu
      memory = v.memory
    }
  }
}
