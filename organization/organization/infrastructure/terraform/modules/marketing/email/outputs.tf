# =============================================================================
# Marketing Email (SES) Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# KMS Outputs
# -----------------------------------------------------------------------------
output "kms_key_id" {
  description = "KMS key ID for SES encryption"
  value       = aws_kms_key.ses.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN for SES encryption"
  value       = aws_kms_key.ses.arn
}

output "kms_key_alias" {
  description = "KMS key alias"
  value       = aws_kms_alias.ses.name
}

# -----------------------------------------------------------------------------
# SES Domain Identity Outputs
# -----------------------------------------------------------------------------
output "domain_identity_arn" {
  description = "SES domain identity ARN"
  value       = aws_ses_domain_identity.marketing.arn
}

output "domain_identity_verification_token" {
  description = "Domain verification token for DNS TXT record"
  value       = aws_ses_domain_identity.marketing.verification_token
  sensitive   = true
}

output "dkim_tokens" {
  description = "DKIM tokens for DNS CNAME records"
  value       = aws_ses_domain_dkim.marketing.dkim_tokens
}

output "mail_from_domain" {
  description = "Mail-from domain"
  value       = aws_ses_domain_mail_from.marketing.mail_from_domain
}

# -----------------------------------------------------------------------------
# DNS Records Required
# -----------------------------------------------------------------------------
output "dns_records_required" {
  description = "DNS records required for SES configuration"
  value = {
    verification = {
      type  = "TXT"
      name  = "_amazonses.${var.email_domain}"
      value = aws_ses_domain_identity.marketing.verification_token
    }
    dkim = [
      for token in aws_ses_domain_dkim.marketing.dkim_tokens : {
        type  = "CNAME"
        name  = "${token}._domainkey.${var.email_domain}"
        value = "${token}.dkim.amazonses.com"
      }
    ]
    mail_from_mx = {
      type     = "MX"
      name     = "mail.${var.email_domain}"
      value    = "feedback-smtp.${data.aws_region.current.name}.amazonses.com"
      priority = 10
    }
    mail_from_txt = {
      type  = "TXT"
      name  = "mail.${var.email_domain}"
      value = "v=spf1 include:amazonses.com ~all"
    }
  }
}

# -----------------------------------------------------------------------------
# SES Configuration Set Outputs
# -----------------------------------------------------------------------------
output "configuration_set_name" {
  description = "SES configuration set name"
  value       = aws_ses_configuration_set.marketing.name
}

output "configuration_set_arn" {
  description = "SES configuration set ARN"
  value       = aws_ses_configuration_set.marketing.arn
}

# -----------------------------------------------------------------------------
# SNS Topic Outputs
# -----------------------------------------------------------------------------
output "ses_events_topic_arn" {
  description = "SNS topic ARN for SES events"
  value       = aws_sns_topic.ses_events.arn
}

output "ses_events_topic_name" {
  description = "SNS topic name for SES events"
  value       = aws_sns_topic.ses_events.name
}

# -----------------------------------------------------------------------------
# S3 Bucket Outputs
# -----------------------------------------------------------------------------
output "ses_events_bucket_id" {
  description = "S3 bucket ID for SES event logs"
  value       = aws_s3_bucket.ses_events.id
}

output "ses_events_bucket_arn" {
  description = "S3 bucket ARN for SES event logs"
  value       = aws_s3_bucket.ses_events.arn
}

# -----------------------------------------------------------------------------
# Firehose Outputs
# -----------------------------------------------------------------------------
output "firehose_delivery_stream_name" {
  description = "Firehose delivery stream name for SES events"
  value       = aws_kinesis_firehose_delivery_stream.ses_events.name
}

output "firehose_delivery_stream_arn" {
  description = "Firehose delivery stream ARN for SES events"
  value       = aws_kinesis_firehose_delivery_stream.ses_events.arn
}

# -----------------------------------------------------------------------------
# Email Template Outputs
# -----------------------------------------------------------------------------
output "email_template_names" {
  description = "Map of email template names"
  value = var.create_default_templates ? {
    for key, template in aws_ses_template.marketing : key => template.name
  } : {}
}

output "email_template_arns" {
  description = "Map of email template ARNs"
  value = var.create_default_templates ? {
    for key, template in aws_ses_template.marketing : key => template.arn
  } : {}
}

# -----------------------------------------------------------------------------
# SMTP Configuration
# -----------------------------------------------------------------------------
output "smtp_endpoint" {
  description = "SES SMTP endpoint"
  value       = "email-smtp.${data.aws_region.current.name}.amazonaws.com"
}

output "smtp_port_tls" {
  description = "SES SMTP TLS port"
  value       = 587
}

output "smtp_port_ssl" {
  description = "SES SMTP SSL port"
  value       = 465
}

# -----------------------------------------------------------------------------
# API Configuration
# -----------------------------------------------------------------------------
output "ses_region" {
  description = "AWS region for SES"
  value       = data.aws_region.current.name
}

output "from_email_address" {
  description = "Default from email address"
  value       = "noreply@${var.email_domain}"
}
