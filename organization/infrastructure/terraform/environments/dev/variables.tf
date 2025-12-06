# Development Environment Variables

# ============================================
# Cloud Provider Selection
# ============================================
variable "cloud_provider" {
  description = "Cloud provider to use (azure or aws)"
  type        = string
  default     = "azure"
  validation {
    condition     = contains(["azure", "aws"], var.cloud_provider)
    error_message = "cloud_provider must be either 'azure' or 'aws'"
  }
}

# ============================================
# Azure Configuration
# ============================================
variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = ""
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
  default     = ""
}

# ============================================
# AWS Configuration
# ============================================
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# ============================================
# Database Configuration
# ============================================
variable "db_admin_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

# ============================================
# Kubernetes Configuration
# ============================================
variable "aks_admin_group_ids" {
  description = "Azure AD group IDs for AKS admins"
  type        = list(string)
  default     = []
}

# ============================================
# Network Configuration
# ============================================
variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for accessing resources"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Wide open for dev - restrict in production
}

# ============================================
# Monitoring Configuration
# ============================================
variable "oncall_email" {
  description = "On-call email for critical alerts"
  type        = string
  default     = "dev-oncall@citadelbuy.com"
}

variable "team_email" {
  description = "Team email for general alerts"
  type        = string
  default     = "dev-team@citadelbuy.com"
}
