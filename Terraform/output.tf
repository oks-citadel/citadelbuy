# ================================
# Terraform Outputs
# Cross-Border Commerce Platform
# ================================

# ================================
# VPC Outputs
# ================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

# ================================
# Database Outputs
# ================================

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = module.database.database_name
}

output "database_port" {
  description = "Database port"
  value       = module.database.port
}

# ================================
# Redis Outputs
# ================================

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

# ================================
# Storage Outputs
# ================================

output "assets_bucket_name" {
  description = "S3 assets bucket name"
  value       = module.storage.assets_bucket_name
}

output "assets_bucket_arn" {
  description = "S3 assets bucket ARN"
  value       = module.storage.assets_bucket_arn
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = module.storage.cloudfront_url
}

# ================================
# Load Balancer Outputs
# ================================

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer Zone ID"
  value       = module.alb.alb_zone_id
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = module.alb.alb_arn
}

# ================================
# ECS Outputs
# ================================

output "ecs_cluster_id" {
  description = "ECS cluster ID"
  value       = module.ecs.cluster_id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs.cluster_arn
}

# ================================
# Service Outputs
# ================================

output "backend_service_name" {
  description = "Backend ECS service name"
  value       = module.backend_service.service_name
}

output "backend_task_definition_arn" {
  description = "Backend task definition ARN"
  value       = module.backend_service.task_definition_arn
}

output "frontend_service_name" {
  description = "Frontend ECS service name"
  value       = module.frontend_service.service_name
}

output "frontend_task_definition_arn" {
  description = "Frontend task definition ARN"
  value       = module.frontend_service.task_definition_arn
}

# ================================
# Monitoring Outputs
# ================================

output "cloudwatch_log_group_backend" {
  description = "CloudWatch log group for backend"
  value       = aws_cloudwatch_log_group.backend.name
}

output "cloudwatch_log_group_frontend" {
  description = "CloudWatch log group for frontend"
  value       = aws_cloudwatch_log_group.frontend.name
}

# ================================
# IAM Outputs
# ================================

output "ecs_task_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task_role.arn
}

# ================================
# DNS Outputs
# ================================

output "api_domain" {
  description = "API domain name"
  value       = var.create_route53_records ? "https://api.${var.domain_name}" : "https://${module.alb.alb_dns_name}"
}

output "frontend_domain" {
  description = "Frontend domain name"
  value       = var.create_route53_records ? "https://www.${var.domain_name}" : "https://${module.alb.alb_dns_name}"
}

# ================================
# Secret Outputs
# ================================

output "ssm_parameter_db_password" {
  description = "SSM parameter name for DB password"
  value       = aws_ssm_parameter.db_password.name
  sensitive   = true
}

output "ssm_parameter_redis_password" {
  description = "SSM parameter name for Redis password"
  value       = aws_ssm_parameter.redis_password.name
  sensitive   = true
}

output "ssm_parameter_jwt_secret" {
  description = "SSM parameter name for JWT secret"
  value       = aws_ssm_parameter.jwt_secret.name
  sensitive   = true
}

# ================================
# Connection Information
# ================================

output "connection_info" {
  description = "Connection information for services"
  value = {
    frontend_url = var.create_route53_records ? "https://www.${var.domain_name}" : "https://${module.alb.alb_dns_name}"
    api_url      = var.create_route53_records ? "https://api.${var.domain_name}" : "https://${module.alb.alb_dns_name}/api"
    cdn_url      = module.storage.cloudfront_url
  }
}

# ================================
# Summary Output
# ================================

output "deployment_summary" {
  description = "Deployment summary"
  value = {
    environment     = var.environment
    region          = var.aws_region
    vpc_id          = module.vpc.vpc_id
    cluster_name    = module.ecs.cluster_name
    frontend_url    = var.create_route53_records ? "https://www.${var.domain_name}" : "https://${module.alb.alb_dns_name}"
    api_url         = var.create_route53_records ? "https://api.${var.domain_name}" : "https://${module.alb.alb_dns_name}/api"
    database_endpoint = "Available in SSM Parameter Store"
    redis_endpoint    = "Available in SSM Parameter Store"
  }
}
