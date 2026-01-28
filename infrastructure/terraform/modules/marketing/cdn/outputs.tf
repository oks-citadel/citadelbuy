# =============================================================================
# Marketing CDN Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# KMS Outputs
# -----------------------------------------------------------------------------
output "kms_key_id" {
  description = "KMS key ID for CDN encryption"
  value       = aws_kms_key.cdn.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN for CDN encryption"
  value       = aws_kms_key.cdn.arn
}

output "kms_key_alias" {
  description = "KMS key alias"
  value       = aws_kms_alias.cdn.name
}

# -----------------------------------------------------------------------------
# S3 Bucket Outputs
# -----------------------------------------------------------------------------
output "marketing_assets_bucket_id" {
  description = "Marketing assets S3 bucket ID"
  value       = aws_s3_bucket.marketing_assets.id
}

output "marketing_assets_bucket_arn" {
  description = "Marketing assets S3 bucket ARN"
  value       = aws_s3_bucket.marketing_assets.arn
}

output "marketing_assets_bucket_domain" {
  description = "Marketing assets S3 bucket domain name"
  value       = aws_s3_bucket.marketing_assets.bucket_regional_domain_name
}

output "seo_files_bucket_id" {
  description = "SEO files S3 bucket ID"
  value       = aws_s3_bucket.seo_files.id
}

output "seo_files_bucket_arn" {
  description = "SEO files S3 bucket ARN"
  value       = aws_s3_bucket.seo_files.arn
}

output "seo_files_bucket_domain" {
  description = "SEO files S3 bucket domain name"
  value       = aws_s3_bucket.seo_files.bucket_regional_domain_name
}

output "access_logs_bucket_id" {
  description = "Access logs S3 bucket ID"
  value       = aws_s3_bucket.access_logs.id
}

output "access_logs_bucket_arn" {
  description = "Access logs S3 bucket ARN"
  value       = aws_s3_bucket.access_logs.arn
}

# -----------------------------------------------------------------------------
# CloudFront Distribution Outputs
# -----------------------------------------------------------------------------
output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.marketing.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.marketing.arn
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.marketing.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID (for Route53)"
  value       = aws_cloudfront_distribution.marketing.hosted_zone_id
}

output "distribution_status" {
  description = "CloudFront distribution status"
  value       = aws_cloudfront_distribution.marketing.status
}

# -----------------------------------------------------------------------------
# Origin Access Control Outputs
# -----------------------------------------------------------------------------
output "marketing_oac_id" {
  description = "Marketing origin access control ID"
  value       = aws_cloudfront_origin_access_control.marketing.id
}

output "seo_oac_id" {
  description = "SEO origin access control ID"
  value       = aws_cloudfront_origin_access_control.seo.id
}

# -----------------------------------------------------------------------------
# Cache Policy Outputs
# -----------------------------------------------------------------------------
output "seo_cache_policy_id" {
  description = "SEO cache policy ID"
  value       = aws_cloudfront_cache_policy.seo.id
}

output "marketing_assets_cache_policy_id" {
  description = "Marketing assets cache policy ID"
  value       = aws_cloudfront_cache_policy.marketing_assets.id
}

# -----------------------------------------------------------------------------
# CloudFront Function Outputs
# -----------------------------------------------------------------------------
output "seo_rewrite_function_arn" {
  description = "SEO rewrite CloudFront function ARN"
  value       = aws_cloudfront_function.seo_rewrite.arn
}

# -----------------------------------------------------------------------------
# URL Outputs
# -----------------------------------------------------------------------------
output "cdn_url" {
  description = "CDN URL (CloudFront domain)"
  value       = "https://${aws_cloudfront_distribution.marketing.domain_name}"
}

output "sitemap_url" {
  description = "Sitemap URL"
  value       = "https://${aws_cloudfront_distribution.marketing.domain_name}/sitemap.xml"
}

output "robots_url" {
  description = "Robots.txt URL"
  value       = "https://${aws_cloudfront_distribution.marketing.domain_name}/robots.txt"
}

output "manifest_url" {
  description = "Manifest.json URL"
  value       = "https://${aws_cloudfront_distribution.marketing.domain_name}/manifest.json"
}

# -----------------------------------------------------------------------------
# DNS Configuration (for custom domains)
# -----------------------------------------------------------------------------
output "dns_configuration" {
  description = "DNS configuration for custom domains"
  value = {
    cname_target = aws_cloudfront_distribution.marketing.domain_name
    alias_target = {
      dns_name    = aws_cloudfront_distribution.marketing.domain_name
      zone_id     = aws_cloudfront_distribution.marketing.hosted_zone_id
      eval_target = false
    }
  }
}
