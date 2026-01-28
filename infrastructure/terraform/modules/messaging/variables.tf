# Broxiva Messaging Module - Variables
#
# Input variables for AWS messaging infrastructure (SES, SNS, SQS)

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "broxiva"
}

variable "domain_name" {
  description = "Domain name for SES email sending (e.g., broxiva.com)"
  type        = string
}

variable "enable_custom_mail_from" {
  description = "Enable custom MAIL FROM domain for better deliverability"
  type        = bool
  default     = true
}

variable "ses_from_addresses" {
  description = "List of allowed sender email addresses"
  type        = list(string)
  default = [
    "noreply@broxiva.com",
    "support@broxiva.com",
    "notifications@broxiva.com",
    "orders@broxiva.com"
  ]
}

variable "kms_key_arn" {
  description = "KMS key ARN for SNS topic encryption. Leave empty for AWS managed key."
  type        = string
  default     = ""
}

variable "sns_sms_sender_id" {
  description = "Sender ID for SMS messages (11 alphanumeric characters max)"
  type        = string
  default     = "Broxiva"
}

variable "sns_sms_default_type" {
  description = "Default SMS type: Transactional or Promotional"
  type        = string
  default     = "Transactional"

  validation {
    condition     = contains(["Transactional", "Promotional"], var.sns_sms_default_type)
    error_message = "SMS type must be either 'Transactional' or 'Promotional'."
  }
}

variable "sqs_message_retention_days" {
  description = "Number of days to retain messages in SQS queues"
  type        = number
  default     = 14
}

variable "sqs_visibility_timeout_seconds" {
  description = "Visibility timeout for SQS messages"
  type        = number
  default     = 300
}

variable "dlq_max_receive_count" {
  description = "Number of times a message can be received before moving to DLQ"
  type        = number
  default     = 3
}

variable "enable_cloudwatch_dashboard" {
  description = "Create CloudWatch dashboard for messaging metrics"
  type        = bool
  default     = true
}

variable "alert_email_addresses" {
  description = "Email addresses to subscribe to alert notifications"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
