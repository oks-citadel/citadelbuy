# AWS Database Module Outputs

# RDS PostgreSQL Outputs
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = var.cloud_provider == "aws" ? aws_db_instance.postgres[0].endpoint : null
}

output "rds_address" {
  description = "RDS PostgreSQL address"
  value       = var.cloud_provider == "aws" ? aws_db_instance.postgres[0].address : null
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = var.cloud_provider == "aws" ? aws_db_instance.postgres[0].port : null
}

output "rds_database_name" {
  description = "RDS database name"
  value       = var.cloud_provider == "aws" ? aws_db_instance.postgres[0].db_name : null
}

output "rds_username" {
  description = "RDS master username"
  value       = var.cloud_provider == "aws" ? aws_db_instance.postgres[0].username : null
  sensitive   = true
}

output "rds_connection_string" {
  description = "RDS PostgreSQL connection string"
  value       = var.cloud_provider == "aws" ? "postgresql://${aws_db_instance.postgres[0].username}:${local.rds_password}@${aws_db_instance.postgres[0].endpoint}/${aws_db_instance.postgres[0].db_name}" : null
  sensitive   = true
}

output "rds_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = var.cloud_provider == "aws" && var.create_read_replica ? aws_db_instance.postgres_replica[0].endpoint : null
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = var.cloud_provider == "aws" ? aws_security_group.rds[0].id : null
}

# ElastiCache Redis Outputs
output "redis_primary_endpoint_address" {
  description = "Redis primary endpoint address"
  value       = var.cloud_provider == "aws" ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : null
}

output "redis_reader_endpoint_address" {
  description = "Redis reader endpoint address"
  value       = var.cloud_provider == "aws" ? aws_elasticache_replication_group.redis[0].reader_endpoint_address : null
}

output "redis_port" {
  description = "Redis port"
  value       = var.cloud_provider == "aws" ? 6379 : null
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = var.cloud_provider == "aws" ? "rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:6379" : null
  sensitive   = true
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = var.cloud_provider == "aws" ? aws_security_group.redis[0].id : null
}
