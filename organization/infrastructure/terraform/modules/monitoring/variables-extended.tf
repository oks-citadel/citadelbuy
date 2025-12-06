# Extended Monitoring Module Variables for AWS Support

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

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# ============================================
# AWS CloudWatch Configuration
# ============================================
variable "alb_arn" {
  description = "Application Load Balancer ARN (AWS)"
  type        = string
  default     = ""
}

variable "eks_cluster_name" {
  description = "EKS cluster name (AWS)"
  type        = string
  default     = ""
}

variable "rds_instance_id" {
  description = "RDS instance ID (AWS)"
  type        = string
  default     = ""
}

variable "redis_cluster_id" {
  description = "ElastiCache cluster ID (AWS)"
  type        = string
  default     = ""
}

variable "enable_xray" {
  description = "Enable AWS X-Ray distributed tracing"
  type        = bool
  default     = false
}
