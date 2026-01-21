# Extended Storage Module Variables for AWS Support

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
# AWS S3 Configuration
# ============================================
variable "kms_key_arn" {
  description = "KMS key ARN for S3 encryption (AWS)"
  type        = string
  default     = ""
}

variable "s3_bucket_regional_domain_name" {
  description = "S3 bucket regional domain name (AWS)"
  type        = string
  default     = ""
}
