# =============================================================================
# Marketing Data Lake Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# KMS Outputs
# -----------------------------------------------------------------------------
output "kms_key_id" {
  description = "KMS key ID for data lake encryption"
  value       = aws_kms_key.data_lake.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN for data lake encryption"
  value       = aws_kms_key.data_lake.arn
}

output "kms_key_alias" {
  description = "KMS key alias"
  value       = aws_kms_alias.data_lake.name
}

# -----------------------------------------------------------------------------
# S3 Bucket Outputs
# -----------------------------------------------------------------------------
output "raw_bucket_id" {
  description = "Raw data bucket ID"
  value       = aws_s3_bucket.data_lake["raw"].id
}

output "raw_bucket_arn" {
  description = "Raw data bucket ARN"
  value       = aws_s3_bucket.data_lake["raw"].arn
}

output "raw_bucket_domain_name" {
  description = "Raw data bucket domain name"
  value       = aws_s3_bucket.data_lake["raw"].bucket_domain_name
}

output "curated_bucket_id" {
  description = "Curated data bucket ID"
  value       = aws_s3_bucket.data_lake["curated"].id
}

output "curated_bucket_arn" {
  description = "Curated data bucket ARN"
  value       = aws_s3_bucket.data_lake["curated"].arn
}

output "curated_bucket_domain_name" {
  description = "Curated data bucket domain name"
  value       = aws_s3_bucket.data_lake["curated"].bucket_domain_name
}

output "s3_bucket_arns" {
  description = "Map of all S3 bucket ARNs"
  value = {
    for key, bucket in aws_s3_bucket.data_lake : key => bucket.arn
  }
}

output "s3_bucket_ids" {
  description = "Map of all S3 bucket IDs"
  value = {
    for key, bucket in aws_s3_bucket.data_lake : key => bucket.id
  }
}

# -----------------------------------------------------------------------------
# Kinesis Outputs
# -----------------------------------------------------------------------------
output "kinesis_stream_name" {
  description = "Kinesis data stream name"
  value       = aws_kinesis_stream.marketing_events.name
}

output "kinesis_stream_arn" {
  description = "Kinesis data stream ARN"
  value       = aws_kinesis_stream.marketing_events.arn
}

output "kinesis_stream_id" {
  description = "Kinesis data stream ID"
  value       = aws_kinesis_stream.marketing_events.id
}

# -----------------------------------------------------------------------------
# Firehose Outputs
# -----------------------------------------------------------------------------
output "firehose_delivery_stream_name" {
  description = "Firehose delivery stream name"
  value       = aws_kinesis_firehose_delivery_stream.marketing_events.name
}

output "firehose_delivery_stream_arn" {
  description = "Firehose delivery stream ARN"
  value       = aws_kinesis_firehose_delivery_stream.marketing_events.arn
}

output "firehose_role_arn" {
  description = "Firehose IAM role ARN"
  value       = aws_iam_role.firehose.arn
}

# -----------------------------------------------------------------------------
# Glue Outputs
# -----------------------------------------------------------------------------
output "glue_database_name" {
  description = "Glue catalog database name"
  value       = aws_glue_catalog_database.marketing.name
}

output "glue_database_arn" {
  description = "Glue catalog database ARN"
  value       = aws_glue_catalog_database.marketing.arn
}

output "glue_marketing_events_table_name" {
  description = "Glue marketing events table name"
  value       = aws_glue_catalog_table.marketing_events.name
}

output "glue_etl_job_name" {
  description = "Glue ETL job name"
  value       = aws_glue_job.marketing_events_etl.name
}

output "glue_etl_job_arn" {
  description = "Glue ETL job ARN"
  value       = aws_glue_job.marketing_events_etl.arn
}

output "glue_crawler_name" {
  description = "Glue crawler name"
  value       = aws_glue_crawler.marketing_raw.name
}

output "glue_etl_role_arn" {
  description = "Glue ETL IAM role ARN"
  value       = aws_iam_role.glue_etl.arn
}

output "glue_security_configuration_name" {
  description = "Glue security configuration name"
  value       = aws_glue_security_configuration.marketing.name
}

# -----------------------------------------------------------------------------
# Athena Outputs
# -----------------------------------------------------------------------------
output "athena_workgroup_name" {
  description = "Athena workgroup name"
  value       = aws_athena_workgroup.marketing.name
}

output "athena_workgroup_arn" {
  description = "Athena workgroup ARN"
  value       = aws_athena_workgroup.marketing.arn
}

output "athena_results_location" {
  description = "Athena query results S3 location"
  value       = "s3://${aws_s3_bucket.data_lake["curated"].id}/athena-results/"
}

# -----------------------------------------------------------------------------
# Connection Information
# -----------------------------------------------------------------------------
output "kinesis_connection_info" {
  description = "Kinesis connection information for applications"
  value = {
    stream_name = aws_kinesis_stream.marketing_events.name
    stream_arn  = aws_kinesis_stream.marketing_events.arn
    region      = data.aws_region.current.name
  }
}

output "athena_connection_info" {
  description = "Athena connection information for applications"
  value = {
    workgroup = aws_athena_workgroup.marketing.name
    database  = aws_glue_catalog_database.marketing.name
    region    = data.aws_region.current.name
  }
}
