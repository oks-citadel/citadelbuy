# =============================================================================
# Marketing Infrastructure Root Module - Variables
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
  description = "Common tags to apply to all AWS resources"
  type        = map(string)
  default     = {}
}

variable "common_labels" {
  description = "Common labels to apply to all Kubernetes resources"
  type        = map(string)
  default     = {}
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

variable "opensearch_subnet_ids" {
  description = "Subnet IDs for OpenSearch domain"
  type        = list(string)
}

variable "elasticache_subnet_ids" {
  description = "Subnet IDs for ElastiCache"
  type        = list(string)
}

# -----------------------------------------------------------------------------
# EKS Configuration
# -----------------------------------------------------------------------------
variable "create_irsa_roles" {
  description = "Create IRSA roles for marketing services"
  type        = bool
  default     = true
}

variable "oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  type        = string
  default     = ""
}

variable "oidc_provider_url" {
  description = "EKS OIDC provider URL"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Namespace Configuration
# -----------------------------------------------------------------------------
variable "enable_resource_quotas" {
  description = "Enable resource quotas for namespaces"
  type        = bool
  default     = true
}

variable "enable_limit_ranges" {
  description = "Enable limit ranges for namespaces"
  type        = bool
  default     = true
}

variable "enable_network_policies" {
  description = "Enable network policies for namespaces"
  type        = bool
  default     = true
}

variable "default_resource_quota" {
  description = "Default resource quota configuration for namespaces"
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    pods            = string
    services        = string
    secrets         = string
    configmaps      = string
  })
  default = {
    requests_cpu    = "4"
    requests_memory = "8Gi"
    limits_cpu      = "8"
    limits_memory   = "16Gi"
    pods            = "50"
    services        = "20"
    secrets         = "50"
    configmaps      = "50"
  }
}

variable "container_default_limits" {
  description = "Default container limits"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "500m"
    memory = "512Mi"
  }
}

variable "container_default_requests" {
  description = "Default container requests"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "100m"
    memory = "128Mi"
  }
}

# -----------------------------------------------------------------------------
# Data Layer Configuration
# -----------------------------------------------------------------------------
variable "opensearch_master_user_arn" {
  description = "ARN of IAM user/role for OpenSearch master user"
  type        = string
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

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "elasticache_auth_token" {
  description = "Auth token for Redis"
  type        = string
  sensitive   = true
}

variable "dynamodb_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB tables"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Messaging Configuration
# -----------------------------------------------------------------------------
variable "sqs_max_receive_count" {
  description = "Maximum number of times a message can be received before DLQ"
  type        = number
  default     = 3
}

variable "eventbridge_archive_retention_days" {
  description = "EventBridge archive retention in days"
  type        = number
  default     = 30
}

# -----------------------------------------------------------------------------
# Data Lake Configuration
# -----------------------------------------------------------------------------
variable "kinesis_stream_mode" {
  description = "Kinesis stream mode (ON_DEMAND or PROVISIONED)"
  type        = string
  default     = "ON_DEMAND"
}

variable "kinesis_retention_hours" {
  description = "Kinesis data retention in hours"
  type        = number
  default     = 24
}

variable "firehose_buffer_size" {
  description = "Firehose buffer size in MB"
  type        = number
  default     = 128
}

variable "firehose_buffer_interval" {
  description = "Firehose buffer interval in seconds"
  type        = number
  default     = 300
}

variable "glue_version" {
  description = "Glue version"
  type        = string
  default     = "4.0"
}

variable "glue_worker_type" {
  description = "Glue worker type"
  type        = string
  default     = "G.1X"
}

variable "glue_number_of_workers" {
  description = "Number of Glue workers"
  type        = number
  default     = 2
}

variable "athena_bytes_scanned_cutoff" {
  description = "Maximum bytes scanned per Athena query"
  type        = number
  default     = 10737418240 # 10 GB
}

variable "s3_logging_bucket" {
  description = "S3 bucket for access logging"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Email Configuration
# -----------------------------------------------------------------------------
variable "email_domain" {
  description = "Email domain for SES identity"
  type        = string
}

variable "email_tracking_domain" {
  description = "Custom domain for email tracking"
  type        = string
  default     = null
}

variable "create_email_templates" {
  description = "Create default email templates"
  type        = bool
  default     = true
}

variable "bounce_rate_threshold" {
  description = "Bounce rate threshold for alarm"
  type        = number
  default     = 0.05
}

variable "complaint_rate_threshold" {
  description = "Complaint rate threshold for alarm"
  type        = number
  default     = 0.001
}

variable "daily_send_quota_alarm_threshold" {
  description = "Daily send count to trigger quota warning"
  type        = number
  default     = 40000
}

variable "ses_from_addresses" {
  description = "Allowed SES from email addresses"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# CDN Configuration
# -----------------------------------------------------------------------------
variable "cdn_domain_aliases" {
  description = "Domain aliases for CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "cdn_acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront (must be in us-east-1)"
  type        = string
  default     = null
}

variable "cdn_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "waf_web_acl_arn" {
  description = "WAF Web ACL ARN for CloudFront"
  type        = string
  default     = null
}

variable "app_origin_domain" {
  description = "Application origin domain for CloudFront"
  type        = string
  default     = null
}

variable "app_origin_custom_headers" {
  description = "Custom headers for application origin"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "cors_allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "geo_restriction_type" {
  description = "Geo restriction type (none, whitelist, blacklist)"
  type        = string
  default     = "none"
}

variable "geo_restriction_locations" {
  description = "Country codes for geo restriction"
  type        = list(string)
  default     = []
}

variable "cdn_log_retention_days" {
  description = "CDN access log retention in days"
  type        = number
  default     = 365
}

# -----------------------------------------------------------------------------
# Monitoring Configuration
# -----------------------------------------------------------------------------
variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for alarm notifications"
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}
