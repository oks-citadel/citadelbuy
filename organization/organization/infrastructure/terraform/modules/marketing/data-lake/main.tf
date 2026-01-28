# =============================================================================
# Marketing Data Lake Module
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
    Module      = "marketing/data-lake"
    Platform    = "broxiva-marketing"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  s3_buckets = {
    raw = {
      name   = "broxiva-marketing-raw"
      prefix = "raw"
    }
    curated = {
      name   = "broxiva-marketing-curated"
      prefix = "curated"
    }
  }
}

# -----------------------------------------------------------------------------
# KMS Key for Data Lake Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "data_lake" {
  description             = "KMS key for Broxiva marketing data lake encryption"
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
      },
      {
        Sid    = "Allow Kinesis Service"
        Effect = "Allow"
        Principal = {
          Service = "kinesis.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow Firehose Service"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow Glue Service"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${local.region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${local.region}:${local.account_id}:*"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-data-lake-kms"
  })
}

resource "aws_kms_alias" "data_lake" {
  name          = "alias/${var.project_name}-${var.environment}-marketing-data-lake"
  target_key_id = aws_kms_key.data_lake.key_id
}

# -----------------------------------------------------------------------------
# S3 Buckets
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "data_lake" {
  for_each = local.s3_buckets

  bucket = "${var.project_name}-${var.environment}-${each.value.name}-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.value.name}"
    Type = each.key
  })
}

resource "aws_s3_bucket_versioning" "data_lake" {
  for_each = local.s3_buckets

  bucket = aws_s3_bucket.data_lake[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data_lake" {
  for_each = local.s3_buckets

  bucket = aws_s3_bucket.data_lake[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.data_lake.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "data_lake" {
  for_each = local.s3_buckets

  bucket = aws_s3_bucket.data_lake[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  for_each = local.s3_buckets

  bucket = aws_s3_bucket.data_lake[each.key].id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    filter {
      prefix = ""
    }

    transition {
      days          = var.s3_transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.s3_transition_to_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.s3_expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.s3_noncurrent_expiration_days
    }
  }

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_logging" "data_lake" {
  for_each = var.s3_logging_bucket != null ? local.s3_buckets : {}

  bucket = aws_s3_bucket.data_lake[each.key].id

  target_bucket = var.s3_logging_bucket
  target_prefix = "s3-access-logs/${var.project_name}-${var.environment}-${each.value.name}/"
}

# -----------------------------------------------------------------------------
# Kinesis Data Stream for Real-Time Events
# -----------------------------------------------------------------------------
resource "aws_kinesis_stream" "marketing_events" {
  name             = "${var.project_name}-${var.environment}-marketing-events"
  retention_period = var.kinesis_retention_hours

  stream_mode_details {
    stream_mode = var.kinesis_stream_mode
  }

  shard_count = var.kinesis_stream_mode == "PROVISIONED" ? var.kinesis_shard_count : null

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.data_lake.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-events-stream"
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Groups for Firehose
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "firehose" {
  name              = "/aws/kinesisfirehose/${var.project_name}-${var.environment}-marketing"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.data_lake.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_stream" "firehose_s3" {
  name           = "S3Delivery"
  log_group_name = aws_cloudwatch_log_group.firehose.name
}

# -----------------------------------------------------------------------------
# IAM Role for Kinesis Firehose
# -----------------------------------------------------------------------------
resource "aws_iam_role" "firehose" {
  name = "${var.project_name}-${var.environment}-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = local.account_id
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "firehose" {
  name = "${var.project_name}-${var.environment}-firehose-policy"
  role = aws_iam_role.firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.data_lake["raw"].arn,
          "${aws_s3_bucket.data_lake["raw"].arn}/*"
        ]
      },
      {
        Sid    = "KinesisAccess"
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:GetShardIterator",
          "kinesis:GetRecords",
          "kinesis:ListShards"
        ]
        Resource = aws_kinesis_stream.marketing_events.arn
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.data_lake.arn
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.firehose.arn}:*"
      },
      {
        Sid    = "GlueAccess"
        Effect = "Allow"
        Action = [
          "glue:GetTable",
          "glue:GetTableVersion",
          "glue:GetTableVersions"
        ]
        Resource = [
          "arn:aws:glue:${local.region}:${local.account_id}:catalog",
          "arn:aws:glue:${local.region}:${local.account_id}:database/${aws_glue_catalog_database.marketing.name}",
          "arn:aws:glue:${local.region}:${local.account_id}:table/${aws_glue_catalog_database.marketing.name}/*"
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Kinesis Firehose Delivery Stream
# -----------------------------------------------------------------------------
resource "aws_kinesis_firehose_delivery_stream" "marketing_events" {
  name        = "${var.project_name}-${var.environment}-marketing-events"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.marketing_events.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  extended_s3_configuration {
    role_arn            = aws_iam_role.firehose.arn
    bucket_arn          = aws_s3_bucket.data_lake["raw"].arn
    prefix              = "marketing-events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/"
    error_output_prefix = "marketing-events-errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/!{firehose:error-output-type}/"

    buffering_size     = var.firehose_buffer_size
    buffering_interval = var.firehose_buffer_interval

    compression_format = "GZIP"

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = aws_cloudwatch_log_stream.firehose_s3.name
    }

    data_format_conversion_configuration {
      enabled = true

      input_format_configuration {
        deserializer {
          open_x_json_ser_de {}
        }
      }

      output_format_configuration {
        serializer {
          parquet_ser_de {
            compression = "SNAPPY"
          }
        }
      }

      schema_configuration {
        database_name = aws_glue_catalog_database.marketing.name
        table_name    = aws_glue_catalog_table.marketing_events.name
        role_arn      = aws_iam_role.firehose.arn
      }
    }

    processing_configuration {
      enabled = false
    }

    s3_backup_mode = "Disabled"
  }

  server_side_encryption {
    enabled  = true
    key_type = "CUSTOMER_MANAGED_CMK"
    key_arn  = aws_kms_key.data_lake.arn
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-events-firehose"
  })
}

# -----------------------------------------------------------------------------
# Glue Catalog Database
# -----------------------------------------------------------------------------
resource "aws_glue_catalog_database" "marketing" {
  name        = "${replace(var.project_name, "-", "_")}_${var.environment}_marketing"
  description = "Broxiva marketing data lake database"

  create_table_default_permission {
    permissions = ["ALL"]

    principal {
      data_lake_principal_identifier = "IAM_ALLOWED_PRINCIPALS"
    }
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Glue Catalog Table for Marketing Events
# -----------------------------------------------------------------------------
resource "aws_glue_catalog_table" "marketing_events" {
  name          = "marketing_events"
  database_name = aws_glue_catalog_database.marketing.name
  description   = "Marketing events raw data table"
  table_type    = "EXTERNAL_TABLE"

  parameters = {
    classification        = "parquet"
    "parquet.compression" = "SNAPPY"
    EXTERNAL              = "TRUE"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.data_lake["raw"].id}/marketing-events/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"

      parameters = {
        "serialization.format" = "1"
      }
    }

    columns {
      name = "event_id"
      type = "string"
    }

    columns {
      name = "event_type"
      type = "string"
    }

    columns {
      name = "user_id"
      type = "string"
    }

    columns {
      name = "session_id"
      type = "string"
    }

    columns {
      name = "timestamp"
      type = "timestamp"
    }

    columns {
      name = "event_data"
      type = "string"
    }

    columns {
      name = "source"
      type = "string"
    }

    columns {
      name = "device_type"
      type = "string"
    }

    columns {
      name = "browser"
      type = "string"
    }

    columns {
      name = "country"
      type = "string"
    }

    columns {
      name = "region"
      type = "string"
    }
  }

  partition_keys {
    name = "year"
    type = "string"
  }

  partition_keys {
    name = "month"
    type = "string"
  }

  partition_keys {
    name = "day"
    type = "string"
  }

  partition_keys {
    name = "hour"
    type = "string"
  }
}

# -----------------------------------------------------------------------------
# IAM Role for Glue ETL
# -----------------------------------------------------------------------------
resource "aws_iam_role" "glue_etl" {
  name = "${var.project_name}-${var.environment}-glue-etl-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "glue_service" {
  role       = aws_iam_role.glue_etl.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

resource "aws_iam_role_policy" "glue_etl" {
  name = "${var.project_name}-${var.environment}-glue-etl-policy"
  role = aws_iam_role.glue_etl.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.data_lake["raw"].arn,
          "${aws_s3_bucket.data_lake["raw"].arn}/*",
          aws_s3_bucket.data_lake["curated"].arn,
          "${aws_s3_bucket.data_lake["curated"].arn}/*"
        ]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.data_lake.arn
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws-glue/*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Glue ETL Job - Marketing Events Processing
# -----------------------------------------------------------------------------
resource "aws_glue_job" "marketing_events_etl" {
  name     = "${var.project_name}-${var.environment}-marketing-events-etl"
  role_arn = aws_iam_role.glue_etl.arn

  command {
    script_location = "s3://${aws_s3_bucket.data_lake["curated"].id}/glue-scripts/marketing_events_etl.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"                     = "python"
    "--job-bookmark-option"              = "job-bookmark-enable"
    "--enable-metrics"                   = "true"
    "--enable-continuous-cloudwatch-log" = "true"
    "--enable-glue-datacatalog"          = "true"
    "--TempDir"                          = "s3://${aws_s3_bucket.data_lake["curated"].id}/glue-temp/"
    "--source_database"                  = aws_glue_catalog_database.marketing.name
    "--source_table"                     = aws_glue_catalog_table.marketing_events.name
    "--target_bucket"                    = aws_s3_bucket.data_lake["curated"].id
    "--encryption_key"                   = aws_kms_key.data_lake.arn
  }

  glue_version      = var.glue_version
  worker_type       = var.glue_worker_type
  number_of_workers = var.glue_number_of_workers
  timeout           = var.glue_job_timeout

  execution_property {
    max_concurrent_runs = 1
  }

  security_configuration = aws_glue_security_configuration.marketing.name

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-events-etl"
  })
}

# -----------------------------------------------------------------------------
# Glue Crawler for Auto-Discovery
# -----------------------------------------------------------------------------
resource "aws_glue_crawler" "marketing_raw" {
  name          = "${var.project_name}-${var.environment}-marketing-raw-crawler"
  database_name = aws_glue_catalog_database.marketing.name
  role          = aws_iam_role.glue_etl.arn

  s3_target {
    path = "s3://${aws_s3_bucket.data_lake["raw"].id}/marketing-events/"
  }

  schema_change_policy {
    delete_behavior = "LOG"
    update_behavior = "UPDATE_IN_DATABASE"
  }

  recrawl_policy {
    recrawl_behavior = "CRAWL_EVERYTHING"
  }

  security_configuration = aws_glue_security_configuration.marketing.name

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Glue Security Configuration
# -----------------------------------------------------------------------------
resource "aws_glue_security_configuration" "marketing" {
  name = "${var.project_name}-${var.environment}-marketing-security-config"

  encryption_configuration {
    cloudwatch_encryption {
      cloudwatch_encryption_mode = "SSE-KMS"
      kms_key_arn                = aws_kms_key.data_lake.arn
    }

    job_bookmarks_encryption {
      job_bookmarks_encryption_mode = "CSE-KMS"
      kms_key_arn                   = aws_kms_key.data_lake.arn
    }

    s3_encryption {
      s3_encryption_mode = "SSE-KMS"
      kms_key_arn        = aws_kms_key.data_lake.arn
    }
  }
}

# -----------------------------------------------------------------------------
# Athena Workgroup
# -----------------------------------------------------------------------------
resource "aws_athena_workgroup" "marketing" {
  name        = "${var.project_name}-${var.environment}-marketing"
  description = "Athena workgroup for marketing analytics"
  state       = "ENABLED"

  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true
    bytes_scanned_cutoff_per_query     = var.athena_bytes_scanned_cutoff

    result_configuration {
      output_location = "s3://${aws_s3_bucket.data_lake["curated"].id}/athena-results/"

      encryption_configuration {
        encryption_option = "SSE_KMS"
        kms_key_arn       = aws_kms_key.data_lake.arn
      }
    }

    engine_version {
      selected_engine_version = "Athena engine version 3"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-athena"
  })
}

# -----------------------------------------------------------------------------
# Athena Named Queries (Saved Queries)
# -----------------------------------------------------------------------------
resource "aws_athena_named_query" "daily_events_summary" {
  name        = "daily_events_summary"
  workgroup   = aws_athena_workgroup.marketing.name
  database    = aws_glue_catalog_database.marketing.name
  description = "Daily marketing events summary"
  query       = <<-SQL
    SELECT
      year,
      month,
      day,
      event_type,
      COUNT(*) as event_count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM ${aws_glue_catalog_table.marketing_events.name}
    WHERE year = CAST(year(current_date) AS VARCHAR)
      AND month = LPAD(CAST(month(current_date) AS VARCHAR), 2, '0')
      AND day = LPAD(CAST(day(current_date) AS VARCHAR), 2, '0')
    GROUP BY year, month, day, event_type
    ORDER BY event_count DESC
  SQL
}
