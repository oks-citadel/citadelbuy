# ==============================================================================
# ECS Fargate Module Variables - Broxiva E-Commerce Platform
# ==============================================================================
# This file defines all input variables for the ECS Fargate module.
# Variables are organized by category for clarity.
# ==============================================================================

# ==============================================================================
# General Configuration
# ==============================================================================

variable "project_name" {
  description = "Project name used for resource naming (e.g., broxiva)"
  type        = string
  default     = "broxiva"
}

variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment must be one of: prod, staging, dev."
  }
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ==============================================================================
# Network Configuration
# ==============================================================================

variable "vpc_id" {
  description = "VPC ID where ECS resources will be deployed"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block (e.g., 10.0.0.0/16)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for Application Load Balancer"
  type        = list(string)
}

variable "database_security_group_id" {
  description = "Security group ID for database access (PostgreSQL)"
  type        = string
  default     = ""
}

variable "redis_security_group_id" {
  description = "Security group ID for Redis/ElastiCache access"
  type        = string
  default     = ""
}

# ==============================================================================
# ECS Cluster Configuration
# ==============================================================================

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights for enhanced monitoring"
  type        = bool
  default     = true
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging containers (allows SSH-like access)"
  type        = bool
  default     = true
}

# ==============================================================================
# Fargate Capacity Provider Configuration
# ==============================================================================

variable "fargate_base_count" {
  description = "Base count for Fargate On-Demand capacity provider"
  type        = number
  default     = 1
}

variable "fargate_weight" {
  description = "Weight for Fargate On-Demand capacity provider (relative to Spot)"
  type        = number
  default     = 1
}

variable "enable_fargate_spot" {
  description = "Enable Fargate Spot capacity provider for cost optimization"
  type        = bool
  default     = true
}

variable "fargate_spot_weight" {
  description = "Weight for Fargate Spot capacity provider (relative to On-Demand)"
  type        = number
  default     = 3
}

# ==============================================================================
# Service Configuration
# ==============================================================================

variable "enabled_services" {
  description = "List of services to enable (api, web, ai-engine, recommendation, search, notification, inventory, pricing, analytics, chatbot, fraud-detection, media, personalization, supplier-integration, ai-agents)"
  type        = list(string)
  default     = ["api", "web"]
}

variable "image_tag" {
  description = "Docker image tag to deploy (e.g., latest, v1.0.0, sha-abc123)"
  type        = string
  default     = "latest"
}

variable "broxiva_image_tag" {
  description = "Docker image tag for all 15 Broxiva services (defaults to image_tag)"
  type        = string
  default     = ""
}

variable "cpu_architecture" {
  description = "CPU architecture for Fargate tasks (X86_64 or ARM64)"
  type        = string
  default     = "X86_64"
  validation {
    condition     = contains(["X86_64", "ARM64"], var.cpu_architecture)
    error_message = "CPU architecture must be either X86_64 or ARM64."
  }
}

# ==============================================================================
# Load Balancer Configuration
# ==============================================================================

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS listener (SSL/TLS)"
  type        = string
}

variable "alb_access_logs_bucket" {
  description = "S3 bucket name for ALB access logs (leave empty to disable)"
  type        = string
  default     = ""
}

variable "enable_internal_alb" {
  description = "Create internal ALB for service-to-service communication"
  type        = bool
  default     = false
}

# ==============================================================================
# Domain Configuration
# ==============================================================================

variable "api_domain" {
  description = "Domain for API service (e.g., api.broxiva.com)"
  type        = string
  default     = ""
}

variable "web_domains" {
  description = "List of domains for web service (e.g., [\"broxiva.com\", \"www.broxiva.com\"])"
  type        = list(string)
  default     = []
}

# ==============================================================================
# Security & Encryption
# ==============================================================================

variable "kms_key_id" {
  description = "KMS key ID for encrypting CloudWatch logs (optional)"
  type        = string
  default     = null
}

variable "kms_key_arn" {
  description = "KMS key ARN for decrypting secrets"
  type        = string
  default     = ""
}

variable "enable_secrets_injection" {
  description = "Enable automatic secrets injection from Secrets Manager"
  type        = bool
  default     = false
}

# ==============================================================================
# Logging Configuration
# ==============================================================================

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch retention value."
  }
}

# ==============================================================================
# Auto Scaling Configuration
# ==============================================================================

variable "enable_autoscaling" {
  description = "Enable Application Auto Scaling for ECS services"
  type        = bool
  default     = true
}

variable "autoscaling_cpu_threshold" {
  description = "Target CPU utilization percentage for auto scaling"
  type        = number
  default     = 70
  validation {
    condition     = var.autoscaling_cpu_threshold >= 10 && var.autoscaling_cpu_threshold <= 90
    error_message = "CPU threshold must be between 10 and 90."
  }
}

variable "autoscaling_memory_threshold" {
  description = "Target memory utilization percentage for auto scaling"
  type        = number
  default     = 80
  validation {
    condition     = var.autoscaling_memory_threshold >= 10 && var.autoscaling_memory_threshold <= 90
    error_message = "Memory threshold must be between 10 and 90."
  }
}

variable "autoscaling_request_count_threshold" {
  description = "Target request count per target for ALB-based auto scaling"
  type        = number
  default     = 1000
}

# ==============================================================================
# Monitoring & Alerting
# ==============================================================================

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms for service monitoring"
  type        = bool
  default     = true
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarm notifications"
  type        = string
  default     = ""
}

# ==============================================================================
# Production vs Staging Defaults
# These are used internally based on environment variable
# ==============================================================================

variable "api_cpu" {
  description = "CPU units for API service (overrides default based on environment)"
  type        = number
  default     = null
}

variable "api_memory" {
  description = "Memory in MB for API service (overrides default based on environment)"
  type        = number
  default     = null
}

variable "web_cpu" {
  description = "CPU units for Web service (overrides default based on environment)"
  type        = number
  default     = null
}

variable "web_memory" {
  description = "Memory in MB for Web service (overrides default based on environment)"
  type        = number
  default     = null
}

# ==============================================================================
# Legacy Compatibility Variables
# (Kept for backward compatibility with existing configurations)
# ==============================================================================

variable "name_prefix" {
  description = "[DEPRECATED] Use project_name and environment instead"
  type        = string
  default     = ""
}

variable "api_image" {
  description = "[DEPRECATED] Image is now constructed from ECR repository and image_tag"
  type        = string
  default     = ""
}

variable "web_image" {
  description = "[DEPRECATED] Image is now constructed from ECR repository and image_tag"
  type        = string
  default     = ""
}

variable "worker_image" {
  description = "[DEPRECATED] Image is now constructed from ECR repository and image_tag"
  type        = string
  default     = ""
}

variable "api_container_port" {
  description = "[DEPRECATED] Port is now defined in service_configs"
  type        = number
  default     = 4000
}

variable "web_container_port" {
  description = "[DEPRECATED] Port is now defined in service_configs"
  type        = number
  default     = 3000
}

variable "api_health_check_path" {
  description = "[DEPRECATED] Health check path is now defined in service_configs"
  type        = string
  default     = "/health"
}

variable "web_health_check_path" {
  description = "[DEPRECATED] Health check path is now defined in service_configs"
  type        = string
  default     = "/api/health"
}

variable "api_desired_count" {
  description = "[DEPRECATED] Desired count is now determined by environment"
  type        = number
  default     = 3
}

variable "web_desired_count" {
  description = "[DEPRECATED] Desired count is now determined by environment"
  type        = number
  default     = 3
}

variable "api_min_count" {
  description = "[DEPRECATED] Min count is now defined in service_configs"
  type        = number
  default     = 2
}

variable "api_max_count" {
  description = "[DEPRECATED] Max count is now defined in service_configs"
  type        = number
  default     = 10
}

variable "web_min_count" {
  description = "[DEPRECATED] Min count is now defined in service_configs"
  type        = number
  default     = 2
}

variable "web_max_count" {
  description = "[DEPRECATED] Max count is now defined in service_configs"
  type        = number
  default     = 10
}

variable "api_cpu_target" {
  description = "[DEPRECATED] Use autoscaling_cpu_threshold instead"
  type        = number
  default     = 70
}

variable "api_memory_target" {
  description = "[DEPRECATED] Use autoscaling_memory_threshold instead"
  type        = number
  default     = 80
}

variable "web_cpu_target" {
  description = "[DEPRECATED] Use autoscaling_cpu_threshold instead"
  type        = number
  default     = 70
}

variable "enable_deletion_protection" {
  description = "[DEPRECATED] Deletion protection is now based on environment"
  type        = bool
  default     = true
}

variable "secrets_manager_arns" {
  description = "[DEPRECATED] Secrets access is now based on project_name pattern"
  type        = list(string)
  default     = []
}

variable "s3_bucket_arns" {
  description = "[DEPRECATED] S3 access is now based on project_name pattern"
  type        = list(string)
  default     = []
}

variable "sqs_queue_arns" {
  description = "[DEPRECATED] SQS access is now based on project_name pattern"
  type        = list(string)
  default     = []
}

variable "sns_topic_arns" {
  description = "[DEPRECATED] SNS access is now based on project_name pattern"
  type        = list(string)
  default     = []
}

variable "enable_ses_access" {
  description = "[DEPRECATED] SES access is now enabled by default"
  type        = bool
  default     = true
}

variable "ses_from_addresses" {
  description = "[DEPRECATED] SES from addresses"
  type        = list(string)
  default     = []
}

variable "enable_worker_service" {
  description = "[DEPRECATED] Use enabled_services list instead"
  type        = bool
  default     = false
}

variable "worker_cpu" {
  description = "[DEPRECATED] Worker CPU is now defined in worker_configs"
  type        = number
  default     = 512
}

variable "worker_memory" {
  description = "[DEPRECATED] Worker memory is now defined in worker_configs"
  type        = number
  default     = 1024
}

variable "worker_desired_count" {
  description = "[DEPRECATED] Worker count is now defined in worker_configs"
  type        = number
  default     = 2
}

variable "worker_min_count" {
  description = "[DEPRECATED] Worker min count is now defined in worker_configs"
  type        = number
  default     = 1
}

variable "worker_max_count" {
  description = "[DEPRECATED] Worker max count is now defined in worker_configs"
  type        = number
  default     = 5
}

variable "worker_environment_variables" {
  description = "[DEPRECATED] Environment variables are now defined in task definitions"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "worker_secrets" {
  description = "[DEPRECATED] Secrets are now injected automatically"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "worker_cpu_target" {
  description = "[DEPRECATED] Use autoscaling_cpu_threshold instead"
  type        = number
  default     = 70
}

variable "api_environment_variables" {
  description = "[DEPRECATED] Environment variables are now defined in task definitions"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "api_secrets" {
  description = "[DEPRECATED] Secrets are now injected automatically"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "web_environment_variables" {
  description = "[DEPRECATED] Environment variables are now defined in task definitions"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "web_secrets" {
  description = "[DEPRECATED] Secrets are now injected automatically"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}
