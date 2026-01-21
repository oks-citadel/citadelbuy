# Extended Global CDN Module Variables for AWS Support

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
# AWS CloudFront Configuration
# ============================================
variable "s3_bucket_regional_domain_name" {
  description = "S3 bucket regional domain name for CloudFront origin"
  type        = string
  default     = ""
}

variable "api_domain_name" {
  description = "API domain name for CloudFront origin (ALB)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain (AWS)"
  type        = string
  default     = ""
}

variable "api_acm_certificate_arn" {
  description = "ACM certificate ARN for API custom domain (AWS)"
  type        = string
  default     = ""
}

variable "api_custom_domain" {
  description = "Custom domain for API CloudFront distribution"
  type        = string
  default     = ""
}

variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_100"
}

variable "enable_api_cdn" {
  description = "Enable CloudFront distribution for API"
  type        = bool
  default     = false
}

variable "origin_verify_header" {
  description = "Custom header value for origin verification"
  type        = string
  sensitive   = true
  default     = ""
}

variable "waf_web_acl_arn" {
  description = "WAF Web ACL ARN for CloudFront"
  type        = string
  default     = ""
}

variable "logs_bucket_domain_name" {
  description = "S3 bucket domain name for CloudFront logs"
  type        = string
  default     = ""
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  type        = string
  default     = ""
}
