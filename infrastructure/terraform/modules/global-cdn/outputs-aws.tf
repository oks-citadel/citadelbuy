# AWS Global CDN Module Outputs

# CloudFront Static Distribution
output "cloudfront_static_distribution_id" {
  description = "CloudFront static distribution ID"
  value       = var.cloud_provider == "aws" ? aws_cloudfront_distribution.static[0].id : null
}

output "cloudfront_static_distribution_arn" {
  description = "CloudFront static distribution ARN"
  value       = var.cloud_provider == "aws" ? aws_cloudfront_distribution.static[0].arn : null
}

output "cloudfront_static_domain_name" {
  description = "CloudFront static distribution domain name"
  value       = var.cloud_provider == "aws" ? aws_cloudfront_distribution.static[0].domain_name : null
}

output "cloudfront_static_hosted_zone_id" {
  description = "CloudFront static distribution hosted zone ID"
  value       = var.cloud_provider == "aws" ? aws_cloudfront_distribution.static[0].hosted_zone_id : null
}

# CloudFront API Distribution
output "cloudfront_api_distribution_id" {
  description = "CloudFront API distribution ID"
  value       = var.cloud_provider == "aws" && var.enable_api_cdn ? aws_cloudfront_distribution.api[0].id : null
}

output "cloudfront_api_distribution_arn" {
  description = "CloudFront API distribution ARN"
  value       = var.cloud_provider == "aws" && var.enable_api_cdn ? aws_cloudfront_distribution.api[0].arn : null
}

output "cloudfront_api_domain_name" {
  description = "CloudFront API distribution domain name"
  value       = var.cloud_provider == "aws" && var.enable_api_cdn ? aws_cloudfront_distribution.api[0].domain_name : null
}

# CloudFront Function
output "cloudfront_function_arn" {
  description = "CloudFront Function ARN for security headers"
  value       = var.cloud_provider == "aws" ? aws_cloudfront_function.security_headers[0].arn : null
}
