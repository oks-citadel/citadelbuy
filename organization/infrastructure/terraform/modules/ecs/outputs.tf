# ==============================================================================
# ECS Fargate Module Outputs - Broxiva E-Commerce Platform
# ==============================================================================
# This file exports all relevant resource identifiers and attributes
# for use by other modules and the root configuration.
# ==============================================================================

# ==============================================================================
# ECS Cluster Outputs
# ==============================================================================

output "cluster_id" {
  description = "ECS Cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECS Cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.main.name
}

# ==============================================================================
# Application Load Balancer Outputs
# ==============================================================================

output "alb_id" {
  description = "Application Load Balancer ID"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metrics"
  value       = aws_lb.main.arn_suffix
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID for Route 53 alias records"
  value       = aws_lb.main.zone_id
}

output "alb_security_group_id" {
  description = "Security group ID attached to the ALB"
  value       = aws_security_group.alb.id
}

# Internal ALB outputs (conditional)
output "internal_alb_dns_name" {
  description = "Internal ALB DNS name for service-to-service communication"
  value       = var.enable_internal_alb ? aws_lb.internal[0].dns_name : null
}

output "internal_alb_arn" {
  description = "Internal ALB ARN"
  value       = var.enable_internal_alb ? aws_lb.internal[0].arn : null
}

# ==============================================================================
# HTTPS Listener Outputs
# ==============================================================================

output "https_listener_arn" {
  description = "HTTPS listener ARN"
  value       = aws_lb_listener.https.arn
}

output "http_listener_arn" {
  description = "HTTP listener ARN (redirects to HTTPS)"
  value       = aws_lb_listener.http.arn
}

# ==============================================================================
# Target Group Outputs
# ==============================================================================

output "target_group_arns" {
  description = "Map of service names to target group ARNs"
  value       = { for k, v in aws_lb_target_group.services : k => v.arn }
}

output "target_group_arn_suffixes" {
  description = "Map of service names to target group ARN suffixes (for CloudWatch)"
  value       = { for k, v in aws_lb_target_group.services : k => v.arn_suffix }
}

output "api_target_group_arn" {
  description = "API service target group ARN"
  value       = contains(var.enabled_services, "api") ? aws_lb_target_group.services["api"].arn : null
}

output "web_target_group_arn" {
  description = "Web service target group ARN"
  value       = contains(var.enabled_services, "web") ? aws_lb_target_group.services["web"].arn : null
}

# ==============================================================================
# Security Group Outputs
# ==============================================================================

output "ecs_tasks_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "service_discovery_security_group_id" {
  description = "Security group ID for service discovery"
  value       = aws_security_group.service_discovery.id
}

output "security_groups" {
  description = "Map of all security groups created by this module"
  value = {
    alb               = aws_security_group.alb.id
    ecs_tasks         = aws_security_group.ecs_tasks.id
    service_discovery = aws_security_group.service_discovery.id
  }
}

# ==============================================================================
# Service Discovery Outputs
# ==============================================================================

output "service_discovery_namespace_id" {
  description = "AWS Cloud Map namespace ID"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "service_discovery_namespace_arn" {
  description = "AWS Cloud Map namespace ARN"
  value       = aws_service_discovery_private_dns_namespace.main.arn
}

output "service_discovery_namespace_name" {
  description = "AWS Cloud Map namespace name (e.g., broxiva-prod.local)"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "service_discovery_hosted_zone_id" {
  description = "Route 53 hosted zone ID for service discovery"
  value       = aws_service_discovery_private_dns_namespace.main.hosted_zone
}

output "service_discovery_service_arns" {
  description = "Map of service names to service discovery ARNs"
  value = merge(
    { for k, v in aws_service_discovery_service.api_services : k => v.arn },
    { for k, v in aws_service_discovery_service.worker_services : k => v.arn }
  )
}

# ==============================================================================
# ECS Service Outputs
# ==============================================================================

output "api_service_arns" {
  description = "Map of API service names to ECS service ARNs"
  value       = { for k, v in aws_ecs_service.api_services : k => v.id }
}

output "worker_service_arns" {
  description = "Map of worker service names to ECS service ARNs"
  value       = { for k, v in aws_ecs_service.worker_services : k => v.id }
}

output "api_service_names" {
  description = "List of API service names"
  value       = [for k, v in aws_ecs_service.api_services : v.name]
}

output "worker_service_names" {
  description = "List of worker service names"
  value       = [for k, v in aws_ecs_service.worker_services : v.name]
}

output "service_names" {
  description = "Map of all service types to their names"
  value = {
    api_services    = [for k, v in aws_ecs_service.api_services : v.name]
    worker_services = [for k, v in aws_ecs_service.worker_services : v.name]
  }
}

# Legacy outputs for backward compatibility
output "api_service_name" {
  description = "API ECS service name (legacy - use api_service_names instead)"
  value       = contains(var.enabled_services, "api") ? aws_ecs_service.api_services["api"].name : null
}

output "api_service_id" {
  description = "API ECS service ID (legacy - use api_service_arns instead)"
  value       = contains(var.enabled_services, "api") ? aws_ecs_service.api_services["api"].id : null
}

output "web_service_name" {
  description = "Web ECS service name (legacy - use api_service_names instead)"
  value       = contains(var.enabled_services, "web") ? aws_ecs_service.api_services["web"].name : null
}

output "web_service_id" {
  description = "Web ECS service ID (legacy - use api_service_arns instead)"
  value       = contains(var.enabled_services, "web") ? aws_ecs_service.api_services["web"].id : null
}

# ==============================================================================
# Task Definition Outputs
# ==============================================================================

output "api_task_definition_arns" {
  description = "Map of API service names to task definition ARNs"
  value       = { for k, v in aws_ecs_task_definition.api_services : k => v.arn }
}

output "worker_task_definition_arns" {
  description = "Map of worker service names to task definition ARNs"
  value       = { for k, v in aws_ecs_task_definition.worker_services : k => v.arn }
}

output "task_definition_families" {
  description = "Map of all services to their task definition families"
  value = merge(
    { for k, v in aws_ecs_task_definition.api_services : k => v.family },
    { for k, v in aws_ecs_task_definition.worker_services : k => v.family }
  )
}

# Legacy outputs for backward compatibility
output "api_task_definition_arn" {
  description = "API task definition ARN (legacy - use api_task_definition_arns instead)"
  value       = contains(var.enabled_services, "api") ? aws_ecs_task_definition.api_services["api"].arn : null
}

output "web_task_definition_arn" {
  description = "Web task definition ARN (legacy - use api_task_definition_arns instead)"
  value       = contains(var.enabled_services, "web") ? aws_ecs_task_definition.api_services["web"].arn : null
}

# ==============================================================================
# IAM Role Outputs
# ==============================================================================

output "ecs_task_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_execution_role_name" {
  description = "ECS task execution role name"
  value       = aws_iam_role.ecs_task_execution.name
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN (application permissions)"
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_task_role_name" {
  description = "ECS task role name"
  value       = aws_iam_role.ecs_task.name
}

# Legacy outputs for backward compatibility
output "task_execution_role_arn" {
  description = "ECS task execution role ARN (legacy - use ecs_task_execution_role_arn)"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_execution_role_name" {
  description = "ECS task execution role name (legacy - use ecs_task_execution_role_name)"
  value       = aws_iam_role.ecs_task_execution.name
}

output "task_role_arn" {
  description = "ECS task role ARN (legacy - use ecs_task_role_arn)"
  value       = aws_iam_role.ecs_task.arn
}

output "task_role_name" {
  description = "ECS task role name (legacy - use ecs_task_role_name)"
  value       = aws_iam_role.ecs_task.name
}

# ==============================================================================
# CloudWatch Log Group Outputs
# ==============================================================================

output "log_group_names" {
  description = "Map of service names to CloudWatch log group names"
  value       = { for k, v in aws_cloudwatch_log_group.services : k => v.name }
}

output "log_group_arns" {
  description = "Map of service names to CloudWatch log group ARNs"
  value       = { for k, v in aws_cloudwatch_log_group.services : k => v.arn }
}

output "ecs_exec_log_group_name" {
  description = "CloudWatch log group name for ECS Exec sessions"
  value       = aws_cloudwatch_log_group.ecs_exec.name
}

# Legacy outputs for backward compatibility
output "api_log_group_name" {
  description = "API CloudWatch log group name (legacy - use log_group_names)"
  value       = contains(var.enabled_services, "api") ? aws_cloudwatch_log_group.services["api"].name : null
}

output "api_log_group_arn" {
  description = "API CloudWatch log group ARN (legacy - use log_group_arns)"
  value       = contains(var.enabled_services, "api") ? aws_cloudwatch_log_group.services["api"].arn : null
}

output "web_log_group_name" {
  description = "Web CloudWatch log group name (legacy - use log_group_names)"
  value       = contains(var.enabled_services, "web") ? aws_cloudwatch_log_group.services["web"].name : null
}

output "web_log_group_arn" {
  description = "Web CloudWatch log group ARN (legacy - use log_group_arns)"
  value       = contains(var.enabled_services, "web") ? aws_cloudwatch_log_group.services["web"].arn : null
}

# ==============================================================================
# Auto Scaling Outputs
# ==============================================================================

output "autoscaling_target_arns" {
  description = "Map of service names to auto scaling target resource IDs"
  value = merge(
    { for k, v in aws_appautoscaling_target.api_services : k => v.resource_id },
    { for k, v in aws_appautoscaling_target.worker_services : k => v.resource_id }
  )
}

# ==============================================================================
# CloudWatch Alarm Outputs
# ==============================================================================

output "cpu_alarm_arns" {
  description = "Map of service names to CPU high alarm ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.cpu_high : k => v.arn }
}

output "memory_alarm_arns" {
  description = "Map of service names to memory high alarm ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.memory_high : k => v.arn }
}

output "alb_5xx_alarm_arn" {
  description = "ALB 5xx error alarm ARN"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.alb_5xx[0].arn : null
}

output "alb_latency_alarm_arn" {
  description = "ALB high latency alarm ARN"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.alb_latency[0].arn : null
}

# ==============================================================================
# Connection Strings and Endpoints
# ==============================================================================

output "service_endpoints" {
  description = "Service discovery endpoints for internal service communication"
  value = {
    for k, v in merge(local.enabled_api_services, local.enabled_worker_services) :
    k => "${k}.${aws_service_discovery_private_dns_namespace.main.name}"
  }
}

output "api_endpoint" {
  description = "API service endpoint via ALB"
  value       = "https://${aws_lb.main.dns_name}"
}

output "web_endpoint" {
  description = "Web service endpoint via ALB"
  value       = "https://${aws_lb.main.dns_name}"
}

# Legacy DNS configuration output
output "alb_dns_config" {
  description = "ALB DNS configuration for Route53 (legacy)"
  value = {
    dns_name = aws_lb.main.dns_name
    zone_id  = aws_lb.main.zone_id
  }
}

# ==============================================================================
# Module Summary Output
# ==============================================================================

output "module_summary" {
  description = "Summary of all resources created by this module"
  value = {
    cluster = {
      name = aws_ecs_cluster.main.name
      arn  = aws_ecs_cluster.main.arn
    }
    alb = {
      dns_name       = aws_lb.main.dns_name
      zone_id        = aws_lb.main.zone_id
      security_group = aws_security_group.alb.id
    }
    service_discovery = {
      namespace      = aws_service_discovery_private_dns_namespace.main.name
      hosted_zone_id = aws_service_discovery_private_dns_namespace.main.hosted_zone
    }
    services = {
      api_services    = keys(aws_ecs_service.api_services)
      worker_services = keys(aws_ecs_service.worker_services)
    }
    security_groups = {
      alb               = aws_security_group.alb.id
      ecs_tasks         = aws_security_group.ecs_tasks.id
      service_discovery = aws_security_group.service_discovery.id
    }
    iam_roles = {
      task_execution = aws_iam_role.ecs_task_execution.arn
      task           = aws_iam_role.ecs_task.arn
    }
    capacity_providers = {
      fargate_enabled      = true
      fargate_spot_enabled = var.enable_fargate_spot
    }
  }
}

# ==============================================================================
# Deployment Information
# ==============================================================================

output "deployment_info" {
  description = "Information useful for CI/CD deployments"
  value = {
    cluster_name = aws_ecs_cluster.main.name
    service_names = concat(
      [for k, v in aws_ecs_service.api_services : v.name],
      [for k, v in aws_ecs_service.worker_services : v.name]
    )
    task_families = merge(
      { for k, v in aws_ecs_task_definition.api_services : k => v.family },
      { for k, v in aws_ecs_task_definition.worker_services : k => v.family }
    )
    ecr_repository_prefix = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/${var.project_name}"
  }
}
