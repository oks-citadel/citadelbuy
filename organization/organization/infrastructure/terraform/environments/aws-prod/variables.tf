# Broxiva E-Commerce Platform - AWS Production Variables

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.28"
}

variable "app_node_instance_types" {
  description = "Instance types for app node group"
  type        = list(string)
  default     = ["t3.large", "t3.xlarge"]
}

variable "app_node_min_size" {
  description = "Minimum number of app nodes"
  type        = number
  default     = 3
}

variable "app_node_max_size" {
  description = "Maximum number of app nodes"
  type        = number
  default     = 10
}

variable "app_node_desired_size" {
  description = "Desired number of app nodes"
  type        = number
  default     = 3
}

variable "ai_node_instance_types" {
  description = "Instance types for AI node group"
  type        = list(string)
  default     = ["c5.2xlarge", "c5.4xlarge"]
}

# RDS Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "db_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum storage in GB for autoscaling"
  type        = number
  default     = 500
}

# ElastiCache Configuration
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7.0"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 3
}

# SSL/TLS
variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for broxiva.com"
  type        = string
  default     = ""
}

# DNS
variable "create_dns_zone" {
  description = "Whether to create Route53 hosted zone"
  type        = bool
  default     = false
}

# Domain
variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "broxiva.com"
}

# Environment
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Notification
variable "alert_email" {
  description = "Email for alerts"
  type        = string
  default     = "ops@broxiva.com"
}

variable "alert_email_addresses" {
  description = "List of email addresses to receive alerts"
  type        = list(string)
  default     = ["ops@broxiva.com", "oncall@broxiva.com"]
}

# GitHub Configuration (for OIDC)
variable "github_org" {
  description = "GitHub organization name"
  type        = string
  default     = "broxiva"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "broxiva-platform"
}
