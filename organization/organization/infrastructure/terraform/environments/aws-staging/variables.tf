# ==============================================================================
# Broxiva E-Commerce Platform - AWS Staging Variables
# ==============================================================================

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.1.0.0/16"  # Different from prod (10.0.0.0/16)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.101.0/24", "10.1.102.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.1.201.0/24", "10.1.202.0/24"]
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

# SSL/TLS
variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for staging.broxiva.com"
  type        = string
  default     = ""
}

# Domain
variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "staging.broxiva.com"
}

# Notification
variable "alert_email_addresses" {
  description = "List of email addresses to receive alerts"
  type        = list(string)
  default     = ["staging-alerts@broxiva.com"]
}

# Container Image
variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
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
