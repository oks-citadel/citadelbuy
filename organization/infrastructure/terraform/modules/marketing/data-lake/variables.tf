# =============================================================================
# Marketing Data Lake Module - Variables
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
# S3 Configuration
# -----------------------------------------------------------------------------
variable "s3_logging_bucket" {
  description = "S3 bucket for access logging (optional)"
  type        = string
  default     = null
}

variable "s3_transition_to_ia_days" {
  description = "Days before transitioning to Infrequent Access"
  type        = number
  default     = 90
}

variable "s3_transition_to_glacier_days" {
  description = "Days before transitioning to Glacier"
  type        = number
  default     = 365
}

variable "s3_expiration_days" {
  description = "Days before object expiration"
  type        = number
  default     = 2555 # ~7 years
}

variable "s3_noncurrent_expiration_days" {
  description = "Days before noncurrent version expiration"
  type        = number
  default     = 90
}

# -----------------------------------------------------------------------------
# Kinesis Configuration
# -----------------------------------------------------------------------------
variable "kinesis_stream_mode" {
  description = "Kinesis stream mode (ON_DEMAND or PROVISIONED)"
  type        = string
  default     = "ON_DEMAND"

  validation {
    condition     = contains(["ON_DEMAND", "PROVISIONED"], var.kinesis_stream_mode)
    error_message = "Kinesis stream mode must be ON_DEMAND or PROVISIONED."
  }
}

variable "kinesis_shard_count" {
  description = "Number of shards (only for PROVISIONED mode)"
  type        = number
  default     = 2
}

variable "kinesis_retention_hours" {
  description = "Data retention period in hours"
  type        = number
  default     = 24

  validation {
    condition     = var.kinesis_retention_hours >= 24 && var.kinesis_retention_hours <= 8760
    error_message = "Kinesis retention must be between 24 and 8760 hours."
  }
}

# -----------------------------------------------------------------------------
# Firehose Configuration
# -----------------------------------------------------------------------------
variable "firehose_buffer_size" {
  description = "Firehose buffer size in MB"
  type        = number
  default     = 128

  validation {
    condition     = var.firehose_buffer_size >= 1 && var.firehose_buffer_size <= 128
    error_message = "Firehose buffer size must be between 1 and 128 MB."
  }
}

variable "firehose_buffer_interval" {
  description = "Firehose buffer interval in seconds"
  type        = number
  default     = 300

  validation {
    condition     = var.firehose_buffer_interval >= 60 && var.firehose_buffer_interval <= 900
    error_message = "Firehose buffer interval must be between 60 and 900 seconds."
  }
}

# -----------------------------------------------------------------------------
# Glue Configuration
# -----------------------------------------------------------------------------
variable "glue_version" {
  description = "Glue version"
  type        = string
  default     = "4.0"
}

variable "glue_worker_type" {
  description = "Glue worker type"
  type        = string
  default     = "G.1X"

  validation {
    condition     = contains(["Standard", "G.1X", "G.2X", "G.025X", "G.4X", "G.8X", "Z.2X"], var.glue_worker_type)
    error_message = "Invalid Glue worker type."
  }
}

variable "glue_number_of_workers" {
  description = "Number of Glue workers"
  type        = number
  default     = 2

  validation {
    condition     = var.glue_number_of_workers >= 2
    error_message = "Glue requires at least 2 workers."
  }
}

variable "glue_job_timeout" {
  description = "Glue job timeout in minutes"
  type        = number
  default     = 60
}

# -----------------------------------------------------------------------------
# Athena Configuration
# -----------------------------------------------------------------------------
variable "athena_bytes_scanned_cutoff" {
  description = "Maximum bytes scanned per query (cost control)"
  type        = number
  default     = 10737418240 # 10 GB
}

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}
