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
