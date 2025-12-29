# Extended Networking Module Variables for AWS Support

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

variable "enable_flow_logs" {
  description = "Enable VPC flow logs (AWS)"
  type        = bool
  default     = true
}
# ============================================
# Security - Network Access Control
# ============================================
# SECURITY: ALB ingress CIDR blocks
# For public-facing ALBs, 0.0.0.0/0 is intentional to allow internet traffic.
# For internal ALBs, restrict to VPC or specific CIDRs.
variable "alb_ingress_cidr_blocks" {
  description = "CIDR blocks for ALB ingress. Use 0.0.0.0/0 for public, restrict for internal."
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Public-facing by default
}

# SECURITY: Application egress CIDR blocks
# Applications often need outbound access for external APIs, package downloads.
# Consider using VPC endpoints to reduce exposure.
variable "app_egress_cidr_blocks" {
  description = "CIDR blocks for application egress. Consider restricting in production."
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Required for most applications
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days (AWS)"
  type        = number
  default     = 7
}
