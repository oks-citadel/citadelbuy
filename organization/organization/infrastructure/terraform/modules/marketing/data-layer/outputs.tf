# =============================================================================
# Marketing Data Layer Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# KMS Outputs
# -----------------------------------------------------------------------------
output "kms_key_id" {
  description = "KMS key ID for data layer encryption"
  value       = aws_kms_key.data_layer.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN for data layer encryption"
  value       = aws_kms_key.data_layer.arn
}

output "kms_key_alias" {
  description = "KMS key alias"
  value       = aws_kms_alias.data_layer.name
}

# -----------------------------------------------------------------------------
# OpenSearch Outputs
# -----------------------------------------------------------------------------
output "opensearch_domain_id" {
  description = "OpenSearch domain ID"
  value       = aws_opensearch_domain.marketing.domain_id
}

output "opensearch_domain_name" {
  description = "OpenSearch domain name"
  value       = aws_opensearch_domain.marketing.domain_name
}

output "opensearch_domain_arn" {
  description = "OpenSearch domain ARN"
  value       = aws_opensearch_domain.marketing.arn
}

output "opensearch_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.marketing.endpoint
}

output "opensearch_dashboard_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = aws_opensearch_domain.marketing.dashboard_endpoint
}

output "opensearch_security_group_id" {
  description = "OpenSearch security group ID"
  value       = aws_security_group.opensearch.id
}

# -----------------------------------------------------------------------------
# DynamoDB Outputs
# -----------------------------------------------------------------------------
output "dynamodb_table_arns" {
  description = "Map of DynamoDB table ARNs"
  value = {
    for key, table in aws_dynamodb_table.marketing : key => table.arn
  }
}

output "dynamodb_table_names" {
  description = "Map of DynamoDB table names"
  value = {
    for key, table in aws_dynamodb_table.marketing : key => table.name
  }
}

output "dynamodb_table_ids" {
  description = "Map of DynamoDB table IDs"
  value = {
    for key, table in aws_dynamodb_table.marketing : key => table.id
  }
}

output "dynamodb_stream_arns" {
  description = "Map of DynamoDB stream ARNs (for tables with streams enabled)"
  value = {
    for key, table in aws_dynamodb_table.marketing : key => table.stream_arn
    if table.stream_enabled
  }
}

output "marketing_events_table_name" {
  description = "Marketing events DynamoDB table name"
  value       = aws_dynamodb_table.marketing["marketing_events"].name
}

output "marketing_events_table_arn" {
  description = "Marketing events DynamoDB table ARN"
  value       = aws_dynamodb_table.marketing["marketing_events"].arn
}

output "experiments_table_name" {
  description = "Experiments DynamoDB table name"
  value       = aws_dynamodb_table.marketing["experiments"].name
}

output "experiments_table_arn" {
  description = "Experiments DynamoDB table ARN"
  value       = aws_dynamodb_table.marketing["experiments"].arn
}

output "feature_flags_table_name" {
  description = "Feature flags DynamoDB table name"
  value       = aws_dynamodb_table.marketing["feature_flags"].name
}

output "feature_flags_table_arn" {
  description = "Feature flags DynamoDB table ARN"
  value       = aws_dynamodb_table.marketing["feature_flags"].arn
}

output "user_profiles_table_name" {
  description = "User profiles DynamoDB table name"
  value       = aws_dynamodb_table.marketing["user_profiles"].name
}

output "user_profiles_table_arn" {
  description = "User profiles DynamoDB table ARN"
  value       = aws_dynamodb_table.marketing["user_profiles"].arn
}

# -----------------------------------------------------------------------------
# ElastiCache Outputs
# -----------------------------------------------------------------------------
output "elasticache_replication_group_id" {
  description = "ElastiCache replication group ID"
  value       = aws_elasticache_replication_group.marketing.replication_group_id
}

output "elasticache_replication_group_arn" {
  description = "ElastiCache replication group ARN"
  value       = aws_elasticache_replication_group.marketing.arn
}

output "elasticache_primary_endpoint" {
  description = "ElastiCache primary endpoint address"
  value       = aws_elasticache_replication_group.marketing.primary_endpoint_address
}

output "elasticache_reader_endpoint" {
  description = "ElastiCache reader endpoint address"
  value       = aws_elasticache_replication_group.marketing.reader_endpoint_address
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = 6379
}

output "elasticache_security_group_id" {
  description = "ElastiCache security group ID"
  value       = aws_security_group.elasticache.id
}

# -----------------------------------------------------------------------------
# Connection Strings (for application configuration)
# -----------------------------------------------------------------------------
output "redis_connection_url" {
  description = "Redis connection URL (without auth token)"
  value       = "rediss://${aws_elasticache_replication_group.marketing.primary_endpoint_address}:6379"
  sensitive   = false
}

output "opensearch_connection_url" {
  description = "OpenSearch connection URL"
  value       = "https://${aws_opensearch_domain.marketing.endpoint}"
}
