# =============================================================================
# Marketing CDN (CloudFront SEO Distribution) Module
# Broxiva E-Commerce Platform - Marketing Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = merge(var.common_tags, {
    Module      = "marketing/cdn"
    Platform    = "broxiva-marketing"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  # SEO-specific paths
  seo_paths = [
    "/sitemap*.xml",
    "/robots.txt",
    "/manifest.json",
    "/.well-known/*"
  ]

  # Marketing asset paths
  marketing_asset_paths = [
    "/marketing/*",
    "/assets/marketing/*",
    "/images/marketing/*",
    "/landing/*"
  ]
}

# -----------------------------------------------------------------------------
# KMS Key for S3 Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "cdn" {
  description             = "KMS key for Broxiva marketing CDN encryption"
  deletion_window_in_days = var.kms_deletion_window_days
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudFront Service"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = local.account_id
          }
        }
      },
      {
        Sid    = "Allow S3 Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-cdn-kms"
  })
}

resource "aws_kms_alias" "cdn" {
  name          = "alias/${var.project_name}-${var.environment}-marketing-cdn"
  target_key_id = aws_kms_key.cdn.key_id
}

# -----------------------------------------------------------------------------
# S3 Bucket for Marketing Assets
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "marketing_assets" {
  bucket = "${var.project_name}-${var.environment}-marketing-assets-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-assets"
  })
}

resource "aws_s3_bucket_versioning" "marketing_assets" {
  bucket = aws_s3_bucket.marketing_assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "marketing_assets" {
  bucket = aws_s3_bucket.marketing_assets.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.cdn.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "marketing_assets" {
  bucket = aws_s3_bucket.marketing_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "marketing_assets" {
  bucket = aws_s3_bucket.marketing_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# -----------------------------------------------------------------------------
# S3 Bucket for SEO Files
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "seo_files" {
  bucket = "${var.project_name}-${var.environment}-seo-files-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-seo-files"
  })
}

resource "aws_s3_bucket_versioning" "seo_files" {
  bucket = aws_s3_bucket.seo_files.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "seo_files" {
  bucket = aws_s3_bucket.seo_files.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.cdn.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "seo_files" {
  bucket = aws_s3_bucket.seo_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# CloudFront Origin Access Control
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "marketing" {
  name                              = "${var.project_name}-${var.environment}-marketing-oac"
  description                       = "OAC for marketing assets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "seo" {
  name                              = "${var.project_name}-${var.environment}-seo-oac"
  description                       = "OAC for SEO files"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# S3 Bucket Policies for CloudFront
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "marketing_assets" {
  bucket = aws_s3_bucket.marketing_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.marketing_assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.marketing.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_policy" "seo_files" {
  bucket = aws_s3_bucket.seo_files.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.seo_files.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.marketing.arn
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CloudFront Cache Policies
# -----------------------------------------------------------------------------
resource "aws_cloudfront_cache_policy" "seo" {
  name        = "${var.project_name}-${var.environment}-seo-cache-policy"
  comment     = "Cache policy for SEO files (sitemap, robots.txt)"
  default_ttl = var.seo_cache_ttl
  max_ttl     = var.seo_cache_max_ttl
  min_ttl     = var.seo_cache_min_ttl

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

resource "aws_cloudfront_cache_policy" "marketing_assets" {
  name        = "${var.project_name}-${var.environment}-marketing-assets-cache-policy"
  comment     = "Cache policy for marketing assets"
  default_ttl = var.assets_cache_ttl
  max_ttl     = var.assets_cache_max_ttl
  min_ttl     = var.assets_cache_min_ttl

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["v", "version"]
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# CloudFront Origin Request Policy
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_request_policy" "marketing" {
  name    = "${var.project_name}-${var.environment}-marketing-origin-request-policy"
  comment = "Origin request policy for marketing distribution"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
    }
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

# -----------------------------------------------------------------------------
# CloudFront Response Headers Policy
# -----------------------------------------------------------------------------
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.project_name}-${var.environment}-security-headers-policy"
  comment = "Security headers policy for marketing distribution"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = var.cors_allowed_origins
    }

    access_control_max_age_sec = 3600
    origin_override            = true
  }

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "public, max-age=31536000, immutable"
      override = false
    }
  }
}

# -----------------------------------------------------------------------------
# CloudFront Function for SEO Rewrites
# -----------------------------------------------------------------------------
resource "aws_cloudfront_function" "seo_rewrite" {
  name    = "${var.project_name}-${var.environment}-seo-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite SEO file requests"
  publish = true
  code    = <<-JS
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Handle sitemap index
      if (uri === '/sitemap.xml') {
        request.uri = '/sitemaps/sitemap-index.xml';
      }
      // Handle numbered sitemaps
      else if (uri.match(/^\/sitemap-(\d+)\.xml$/)) {
        var num = uri.match(/^\/sitemap-(\d+)\.xml$/)[1];
        request.uri = '/sitemaps/sitemap-' + num + '.xml';
      }
      // Handle robots.txt
      else if (uri === '/robots.txt') {
        request.uri = '/robots.txt';
      }
      // Handle manifest.json
      else if (uri === '/manifest.json') {
        request.uri = '/manifest.json';
      }

      return request;
    }
  JS
}

# -----------------------------------------------------------------------------
# CloudFront Distribution
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "marketing" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Broxiva marketing and SEO CDN distribution"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = var.domain_aliases
  web_acl_id          = var.waf_web_acl_arn

  # SEO Files Origin (S3)
  origin {
    domain_name              = aws_s3_bucket.seo_files.bucket_regional_domain_name
    origin_id                = "seo-files"
    origin_access_control_id = aws_cloudfront_origin_access_control.seo.id
  }

  # Marketing Assets Origin (S3)
  origin {
    domain_name              = aws_s3_bucket.marketing_assets.bucket_regional_domain_name
    origin_id                = "marketing-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.marketing.id
  }

  # Application Origin (if provided)
  dynamic "origin" {
    for_each = var.app_origin_domain != null ? [1] : []
    content {
      domain_name = var.app_origin_domain
      origin_id   = "app-origin"

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }

      dynamic "custom_header" {
        for_each = var.app_origin_custom_headers
        content {
          name  = custom_header.value.name
          value = custom_header.value.value
        }
      }
    }
  }

  # Default cache behavior (app origin or marketing assets)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = var.app_origin_domain != null ? "app-origin" : "marketing-assets"

    cache_policy_id            = aws_cloudfront_cache_policy.marketing_assets.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.marketing.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # SEO files cache behavior - sitemap*.xml
  ordered_cache_behavior {
    path_pattern     = "/sitemap*.xml"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "seo-files"

    cache_policy_id            = aws_cloudfront_cache_policy.seo.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.marketing.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.seo_rewrite.arn
    }
  }

  # SEO files cache behavior - robots.txt
  ordered_cache_behavior {
    path_pattern     = "/robots.txt"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "seo-files"

    cache_policy_id            = aws_cloudfront_cache_policy.seo.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.marketing.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # SEO files cache behavior - manifest.json
  ordered_cache_behavior {
    path_pattern     = "/manifest.json"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "seo-files"

    cache_policy_id            = aws_cloudfront_cache_policy.seo.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.marketing.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Well-known files (security.txt, etc.)
  ordered_cache_behavior {
    path_pattern     = "/.well-known/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "seo-files"

    cache_policy_id            = aws_cloudfront_cache_policy.seo.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.marketing.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Marketing assets
  ordered_cache_behavior {
    path_pattern     = "/marketing/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "marketing-assets"

    cache_policy_id            = aws_cloudfront_cache_policy.marketing_assets.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.marketing.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Landing pages assets
  ordered_cache_behavior {
    path_pattern     = "/landing/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "marketing-assets"

    cache_policy_id            = aws_cloudfront_cache_policy.marketing_assets.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.marketing.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = var.geo_restriction_type
      locations        = var.geo_restriction_locations
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != null ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.acm_certificate_arn == null
  }

  logging_config {
    bucket          = aws_s3_bucket.access_logs.bucket_domain_name
    prefix          = "cloudfront/"
    include_cookies = false
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-cdn"
  })
}

# -----------------------------------------------------------------------------
# S3 Bucket for CloudFront Access Logs
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "access_logs" {
  bucket = "${var.project_name}-${var.environment}-cdn-logs-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-cdn-logs"
  })
}

resource "aws_s3_bucket_ownership_controls" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "access_logs" {
  depends_on = [aws_s3_bucket_ownership_controls.access_logs]
  bucket     = aws_s3_bucket.access_logs.id
  acl        = "private"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    id     = "archive-logs"
    status = "Enabled"

    filter {
      prefix = ""
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = var.log_retention_days
    }
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-cdn-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = var.error_rate_threshold
  alarm_description   = "CloudFront 5xx error rate is above threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.marketing.id
    Region         = "Global"
  }

  alarm_actions = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  tags = local.common_tags
}
