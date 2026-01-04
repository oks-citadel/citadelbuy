# Extended Compute Module Variables for AWS Support

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

variable "eks_subnet_ids" {
  description = "Subnet IDs for EKS (AWS)"
  type        = list(string)
  default     = []
}

variable "eks_public_access" {
  description = "Enable public access to EKS API server"
  type        = bool
  default     = false
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (AWS)"
  type        = string
  default     = ""
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption (AWS)"
  type        = string
  default     = ""
}

variable "vpc_cni_version" {
  description = "VPC CNI addon version (AWS EKS)"
  type        = string
  default     = "v1.15.0-eksbuild.2"
}

variable "kube_proxy_version" {
  description = "Kube-proxy addon version (AWS EKS)"
  type        = string
  default     = "v1.28.1-eksbuild.1"
}

variable "coredns_version" {
  description = "CoreDNS addon version (AWS EKS)"
  type        = string
  default     = "v1.10.1-eksbuild.2"
}

variable "ebs_csi_version" {
  description = "EBS CSI driver addon version (AWS EKS)"
  type        = string
  default     = "v1.24.0-eksbuild.1"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days (AWS)"
  type        = number
  default     = 7
}
# ============================================
# Security - Network Access Control
# ============================================
# SECURITY: EKS cluster egress CIDR blocks
# Default allows all outbound which is often needed for:
# - Container image pulls
# - AWS API access
# - Package downloads
# For stricter security, use VPC endpoints and restrict ranges.
variable "eks_egress_cidr_blocks" {
  description = "CIDR blocks for EKS cluster egress. Use restrictive ranges in production."
  type        = list(string)
  default     = ["0.0.0.0/0"] # Required for most EKS operations
}
