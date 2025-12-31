# AWS Storage Module Outputs

# S3 Main Bucket Outputs
output "s3_bucket_id" {
  description = "S3 main bucket ID"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.main[0].id : null
}

output "s3_bucket_arn" {
  description = "S3 main bucket ARN"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.main[0].arn : null
}

output "s3_bucket_domain_name" {
  description = "S3 main bucket domain name"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.main[0].bucket_domain_name : null
}

output "s3_bucket_regional_domain_name" {
  description = "S3 main bucket regional domain name"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.main[0].bucket_regional_domain_name : null
}

# S3 Static Bucket Outputs
output "s3_static_bucket_id" {
  description = "S3 static bucket ID"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.static[0].id : null
}

output "s3_static_bucket_arn" {
  description = "S3 static bucket ARN"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.static[0].arn : null
}

output "s3_static_bucket_domain_name" {
  description = "S3 static bucket domain name"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.static[0].bucket_domain_name : null
}

output "s3_static_bucket_regional_domain_name" {
  description = "S3 static bucket regional domain name"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.static[0].bucket_regional_domain_name : null
}
