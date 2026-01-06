# =============================================================================
# Marketing IAM (IRSA Roles) Module - Variables
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
# EKS OIDC Configuration
# -----------------------------------------------------------------------------
variable "oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  type        = string
}

variable "oidc_provider_url" {
  description = "EKS OIDC provider URL"
  type        = string
}

# -----------------------------------------------------------------------------
# KMS Configuration
# -----------------------------------------------------------------------------
variable "kms_key_arns" {
  description = "List of KMS key ARNs for encryption/decryption"
  type        = list(string)
}

# -----------------------------------------------------------------------------
# S3 Bucket ARNs
# -----------------------------------------------------------------------------
variable "seo_bucket_arn" {
  description = "SEO files S3 bucket ARN"
  type        = string
}

variable "marketing_assets_bucket_arn" {
  description = "Marketing assets S3 bucket ARN"
  type        = string
}

variable "data_lake_raw_bucket_arn" {
  description = "Data lake raw bucket ARN"
  type        = string
}

variable "data_lake_curated_bucket_arn" {
  description = "Data lake curated bucket ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# DynamoDB Table ARNs
# -----------------------------------------------------------------------------
variable "marketing_events_table_arn" {
  description = "Marketing events DynamoDB table ARN"
  type        = string
}

variable "experiments_table_arn" {
  description = "Experiments DynamoDB table ARN"
  type        = string
}

variable "feature_flags_table_arn" {
  description = "Feature flags DynamoDB table ARN"
  type        = string
}

variable "user_profiles_table_arn" {
  description = "User profiles DynamoDB table ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# SQS Queue ARNs
# -----------------------------------------------------------------------------
variable "seo_crawl_queue_arn" {
  description = "SEO crawl queue ARN"
  type        = string
}

variable "email_send_queue_arn" {
  description = "Email send queue ARN"
  type        = string
}

variable "analytics_queue_arn" {
  description = "Analytics events queue ARN"
  type        = string
}

variable "experiment_events_queue_arn" {
  description = "Experiment events queue ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# SNS Topic ARNs
# -----------------------------------------------------------------------------
variable "marketing_events_topic_arn" {
  description = "Marketing events SNS topic ARN"
  type        = string
}

variable "experiment_events_topic_arn" {
  description = "Experiment events SNS topic ARN"
  type        = string
}

variable "personalization_events_topic_arn" {
  description = "Personalization events SNS topic ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# EventBridge Configuration
# -----------------------------------------------------------------------------
variable "event_bus_arn" {
  description = "EventBridge event bus ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# OpenSearch Configuration
# -----------------------------------------------------------------------------
variable "opensearch_domain_arn" {
  description = "OpenSearch domain ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# Kinesis Configuration
# -----------------------------------------------------------------------------
variable "kinesis_stream_arn" {
  description = "Kinesis data stream ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# CloudFront Configuration
# -----------------------------------------------------------------------------
variable "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# Athena Configuration
# -----------------------------------------------------------------------------
variable "athena_workgroup_arn" {
  description = "Athena workgroup ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# Glue Configuration
# -----------------------------------------------------------------------------
variable "glue_database_arn" {
  description = "Glue database ARN"
  type        = string
}

# -----------------------------------------------------------------------------
# SES Configuration
# -----------------------------------------------------------------------------
variable "ses_from_addresses" {
  description = "Allowed SES from email addresses"
  type        = list(string)
  default     = []
}
