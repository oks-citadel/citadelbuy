# Storage Module - AWS S3 and CloudFront
# CitadelBuy E-commerce Platform - AWS Infrastructure

# ============================================
# S3 Bucket for Main Storage
# ============================================
resource "aws_s3_bucket" "main" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-storage"

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-storage"
      Service = "Storage"
    }
  )
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "main" {
  count  = var.cloud_provider == "aws" && var.enable_versioning ? 1 : 0
  bucket = aws_s3_bucket.main[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = aws_s3_bucket.main[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != "" ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : null
    }
    bucket_key_enabled = var.kms_key_arn != "" ? true : false
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "main" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = aws_s3_bucket.main[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket CORS Configuration
resource "aws_s3_bucket_cors_configuration" "main" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = aws_s3_bucket.main[0].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 86400
  }
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = aws_s3_bucket.main[0].id

  rule {
    id     = "MoveToIA"
    status = "Enabled"

    filter {
      prefix = "backups/"
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
      days = 365
    }
  }

  rule {
    id     = "CleanupLogs"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90
    }
  }

  rule {
    id     = "CleanupExports"
    status = "Enabled"

    filter {
      prefix = "exports/"
    }

    expiration {
      days = 7
    }
  }

  rule {
    id     = "CleanupTempUploads"
    status = "Enabled"

    filter {
      prefix = "uploads/temp/"
    }

    expiration {
      days = 1
    }
  }
}

# ============================================
# S3 Bucket for Static Assets
# ============================================
resource "aws_s3_bucket" "static" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-static"

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-static"
      Service = "Static Assets"
    }
  )
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = aws_s3_bucket.static[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "static" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  bucket = aws_s3_bucket.static[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy for CloudFront Access
resource "aws_s3_bucket_policy" "static" {
  count  = var.cloud_provider == "aws" && var.enable_cdn ? 1 : 0
  bucket = aws_s3_bucket.static[0].id

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
        Resource = "${aws_s3_bucket.static[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.static[0].arn
          }
        }
      }
    ]
  })
}

# ============================================
# CloudWatch Log Group for S3
# ============================================
resource "aws_cloudwatch_log_group" "s3" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/aws/s3/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}
