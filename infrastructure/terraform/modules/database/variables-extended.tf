# Extended Database Module Variables for AWS Support

# ============================================
# Cloud Provider Configuration
# ============================================
variable "cloud_provider" {
  description = "Cloud provider (azure or aws)"
  type        = string
  default     = "azure"
  validation {
    condition     = contains(["azure", "aws"], var.cloud_provider)
    error_message = "cloud_provider must be either 'azure' or 'aws'"
  }
}

# ============================================
# AWS-specific Variables
# ============================================
variable "vpc_id" {
  description = "VPC ID (AWS)"
  type        = string
  default     = ""
}

variable "database_subnet_ids" {
  description = "Subnet IDs for database (AWS)"
  type        = list(string)
  default     = []
}

variable "redis_subnet_ids" {
  description = "Subnet IDs for Redis (AWS)"
  type        = list(string)
  default     = []
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access database (AWS)"
  type        = list(string)
  default     = []
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption (AWS)"
  type        = string
  default     = ""
}

# RDS PostgreSQL
variable "rds_instance_class" {
  description = "RDS instance class (AWS)"
  type        = string
  default     = "db.t3.medium"
}

variable "postgres_storage_gb" {
  description = "PostgreSQL storage in GB (AWS)"
  type        = number
  default     = 100
}

variable "postgres_max_storage_gb" {
  description = "PostgreSQL max storage in GB for autoscaling (AWS)"
  type        = number
  default     = 500
}

variable "create_read_replica" {
  description = "Create read replica for production (AWS)"
  type        = bool
  default     = false
}

# ElastiCache Redis
variable "redis_node_type" {
  description = "ElastiCache node type (AWS)"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_engine_version" {
  description = "Redis engine version (AWS)"
  type        = string
  default     = "7.0"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes (AWS)"
  type        = number
  default     = 2
}

variable "redis_auth_token" {
  description = "Redis AUTH token (AWS)"
  type        = string
  sensitive   = true
  default     = null
}

variable "redis_snapshot_retention_days" {
  description = "Redis snapshot retention in days (AWS)"
  type        = number
  default     = 7
}
# ============================================
# Security - Network Access Control
# ============================================
# SECURITY: Database egress CIDR blocks
# Databases typically don't need outbound access.
# Default allows all for compatibility but should be restricted in production.
variable "database_egress_cidr_blocks" {
  description = "CIDR blocks for database egress. Restrict in production."
  type        = list(string)
  default     = [] # SECURITY FIX: No internet egress by default
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days (AWS)"
  type        = number
  default     = 7
}
