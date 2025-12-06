# Global CDN Module - AWS CloudFront for Multi-Region Distribution
# Provides global content delivery, SSL termination, and intelligent routing

# ============================================
# CloudFront Origin Access Control
# ============================================
resource "aws_cloudfront_origin_access_control" "static" {
  count                             = var.cloud_provider == "aws" ? 1 : 0
  name                              = "${var.project_name}-${var.environment}-static-oac"
  description                       = "Origin Access Control for static assets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ============================================
# CloudFront Distribution for Static Assets
# ============================================
resource "aws_cloudfront_distribution" "static" {
  count   = var.cloud_provider == "aws" ? 1 : 0
  enabled = true
  comment = "${var.project_name} ${var.environment} static assets CDN"

  # Origins
  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = "S3-${var.project_name}-${var.environment}-static"
    origin_access_control_id = aws_cloudfront_origin_access_control.static[0].id
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${var.project_name}-${var.environment}-static"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400   # 1 day
    max_ttl                = 31536000 # 1 year
    compress               = true

    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.security_headers[0].arn
    }
  }

  # Cache behavior for images
  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${var.project_name}-${var.environment}-static"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 2592000  # 30 days
    max_ttl                = 31536000 # 1 year
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Cache behavior for CSS and JS
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${var.project_name}-${var.environment}-static"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 604800   # 7 days
    max_ttl                = 31536000 # 1 year
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Custom error responses
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 403
    response_page_path = "/403.html"
  }

  # Geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = var.enable_geo_blocking ? "whitelist" : "none"
      locations        = var.enable_geo_blocking ? var.allowed_countries : []
    }
  }

  # SSL/TLS certificate
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = "TLSv1.2_2021"
    cloudfront_default_certificate = var.acm_certificate_arn == ""
  }

  # Aliases/CNAMEs
  aliases = var.custom_domain != "" ? [var.custom_domain] : []

  # Price class
  price_class = var.cloudfront_price_class

  # Logging
  dynamic "logging_config" {
    for_each = var.enable_logging ? [1] : []
    content {
      include_cookies = false
      bucket          = var.logs_bucket_domain_name
      prefix          = "cloudfront/"
    }
  }

  # Web Application Firewall
  web_acl_id = var.waf_web_acl_arn

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-cdn"
      Purpose     = "Global CDN"
      Environment = var.environment
    }
  )
}

# ============================================
# CloudFront Function for Security Headers
# ============================================
resource "aws_cloudfront_function" "security_headers" {
  count   = var.cloud_provider == "aws" ? 1 : 0
  name    = "${var.project_name}-${var.environment}-security-headers"
  runtime = "cloudfront-js-1.0"
  comment = "Add security headers to responses"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var response = event.response;
      var headers = response.headers;

      // Security headers
      headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubDomains; preload' };
      headers['x-content-type-options'] = { value: 'nosniff' };
      headers['x-frame-options'] = { value: 'DENY' };
      headers['x-xss-protection'] = { value: '1; mode=block' };
      headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
      headers['content-security-policy'] = { value: "${var.csp_policy}" };

      return response;
    }
  EOT
}

# ============================================
# CloudFront Distribution for API (optional)
# ============================================
resource "aws_cloudfront_distribution" "api" {
  count   = var.cloud_provider == "aws" && var.enable_api_cdn ? 1 : 0
  enabled = true
  comment = "${var.project_name} ${var.environment} API CDN"

  origin {
    domain_name = var.api_domain_name
    origin_id   = "ALB-${var.project_name}-${var.environment}-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_verify_header
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALB-${var.project_name}-${var.environment}-api"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host", "CloudFront-Forwarded-Proto"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.api_acm_certificate_arn
    ssl_support_method       = var.api_acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = "TLSv1.2_2021"
    cloudfront_default_certificate = var.api_acm_certificate_arn == ""
  }

  aliases = var.api_custom_domain != "" ? [var.api_custom_domain] : []

  price_class = var.cloudfront_price_class

  web_acl_id = var.waf_web_acl_arn

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-api-cdn"
      Purpose     = "API CDN"
      Environment = var.environment
    }
  )
}

# ============================================
# CloudWatch Alarms for CloudFront
# ============================================
resource "aws_cloudwatch_metric_alarm" "cloudfront_error_rate" {
  count               = var.cloud_provider == "aws" && var.enable_monitoring ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-cloudfront-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "This metric monitors CloudFront 5xx error rate"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.static[0].id
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = var.tags
}
