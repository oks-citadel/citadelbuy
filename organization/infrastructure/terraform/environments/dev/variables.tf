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
# SECURITY: Allowed IP ranges for development environment
# Note: Even in dev, avoid 0.0.0.0/0 to prevent accidental exposure.
# Use office IPs, VPN ranges, or developer home IPs.
variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for accessing resources. Avoid 0.0.0.0/0."
  type        = list(string)
  default     = [
    "10.0.0.0/8",        # Internal RFC1918 networks
    "172.16.0.0/12",     # Internal RFC1918 networks
    "192.168.0.0/16"     # Internal RFC1918 networks
    # Add your office/VPN IPs here, e.g.:
    # "203.0.113.0/24",  # Example office IP range
  ]
}

# SECURITY: ACR-specific IP ranges for development
# These IPs can access the container registry.
variable "acr_allowed_ip_ranges" {
  description = "IP ranges allowed to access ACR. Restrict to known sources."
  type        = list(string)
  default     = [
    "10.0.0.0/8"         # Internal networks only by default
    # Add CI/CD runner IPs and developer IPs as needed
  ]
}

# ============================================
# Monitoring Configuration
# ============================================
variable "oncall_email" {
  description = "On-call email for critical alerts"
  type        = string
  default     = "dev-oncall@broxiva.com"
}

variable "team_email" {
  description = "Team email for general alerts"
  type        = string
  default     = "dev-team@broxiva.com"
}
