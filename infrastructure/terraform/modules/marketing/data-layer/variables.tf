# =============================================================================
# Marketing Data Layer Module - Variables
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "broxiva"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, production."
  }
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "apply_immediately" {
  description = "Apply changes immediately (use with caution in production)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Network Configuration
# -----------------------------------------------------------------------------
variable "vpc_id" {
  description = "VPC ID for resources"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to access resources"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# KMS Configuration
# -----------------------------------------------------------------------------
variable "kms_deletion_window_days" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 30

  validation {
    condition     = var.kms_deletion_window_days >= 7 && var.kms_deletion_window_days <= 30
    error_message = "KMS deletion window must be between 7 and 30 days."
  }
}

# -----------------------------------------------------------------------------
# OpenSearch Configuration
# -----------------------------------------------------------------------------
variable "create_opensearch_service_linked_role" {
  description = "Create OpenSearch service-linked role"
  type        = bool
  default     = false
}

variable "opensearch_subnet_ids" {
  description = "Subnet IDs for OpenSearch domain"
  type        = list(string)
}

variable "opensearch_master_user_arn" {
  description = "ARN of IAM user/role for OpenSearch master user"
  type        = string
}

variable "opensearch_engine_version" {
  description = "OpenSearch engine version"
  type        = string
  default     = "OpenSearch_2.11"
}

variable "opensearch_instance_type" {
  description = "OpenSearch instance type"
  type        = string
  default     = "r6g.large.search"
}

variable "opensearch_instance_count" {
  description = "Number of OpenSearch instances"
  type        = number
  default     = 2
}

variable "opensearch_dedicated_master_enabled" {
  description = "Enable dedicated master nodes"
  type        = bool
  default     = false
}

variable "opensearch_dedicated_master_type" {
  description = "Dedicated master instance type"
  type        = string
  default     = "r6g.large.search"
}

variable "opensearch_dedicated_master_count" {
  description = "Number of dedicated master nodes"
  type        = number
  default     = 3
}

variable "opensearch_zone_awareness_enabled" {
  description = "Enable zone awareness"
  type        = bool
  default     = true
}

variable "opensearch_availability_zone_count" {
  description = "Number of availability zones"
  type        = number
  default     = 2
}

variable "opensearch_warm_enabled" {
  description = "Enable UltraWarm storage"
  type        = bool
  default     = false
}

variable "opensearch_warm_type" {
  description = "UltraWarm instance type"
  type        = string
  default     = "ultrawarm1.medium.search"
}

variable "opensearch_warm_count" {
  description = "Number of UltraWarm instances"
  type        = number
  default     = 2
}

variable "opensearch_ebs_volume_type" {
  description = "EBS volume type"
  type        = string
  default     = "gp3"
}

variable "opensearch_ebs_volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 100
}

variable "opensearch_ebs_iops" {
  description = "EBS IOPS (for gp3)"
  type        = number
  default     = 3000
}

variable "opensearch_ebs_throughput" {
  description = "EBS throughput in MiB/s (for gp3)"
  type        = number
  default     = 125
}

variable "opensearch_auto_tune_enabled" {
  description = "Enable OpenSearch Auto-Tune"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# DynamoDB Configuration
# -----------------------------------------------------------------------------
variable "dynamodb_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB tables"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# ElastiCache Configuration
# -----------------------------------------------------------------------------
variable "elasticache_subnet_ids" {
  description = "Subnet IDs for ElastiCache"
  type        = list(string)
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "elasticache_num_cache_clusters" {
  description = "Number of cache clusters (nodes)"
  type        = number
  default     = 2
}

variable "elasticache_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "elasticache_parameter_group_family" {
  description = "ElastiCache parameter group family"
  type        = string
  default     = "redis7"
}

variable "elasticache_auth_token" {
  description = "Auth token for Redis (must be 16-128 characters)"
  type        = string
  sensitive   = true
}

variable "elasticache_snapshot_retention_limit" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "elasticache_snapshot_window" {
  description = "Daily time range for backup snapshots (UTC)"
  type        = string
  default     = "03:00-05:00"
}

variable "elasticache_maintenance_window" {
  description = "Weekly time range for maintenance (UTC)"
  type        = string
  default     = "sun:05:00-sun:07:00"
}

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}
