# Broxiva E-Commerce Platform - AWS Production Outputs

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

# EKS Outputs
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks.cluster_security_group_id
}

output "eks_oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA"
  value       = module.eks.oidc_provider_arn
}

output "eks_cluster_certificate_authority_data" {
  description = "EKS cluster CA certificate"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_instance_endpoint
}

output "rds_port" {
  description = "RDS port"
  value       = module.rds.db_instance_port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.db_instance_name
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.cluster_address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = module.elasticache.port
}

# S3 Outputs
output "s3_media_bucket" {
  description = "S3 media bucket name"
  value       = module.s3_media.s3_bucket_id
}

output "s3_media_bucket_arn" {
  description = "S3 media bucket ARN"
  value       = module.s3_media.s3_bucket_arn
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = module.cloudfront.cloudfront_distribution_domain_name
}

# ECR Outputs
output "ecr_api_repository_url" {
  description = "ECR API repository URL"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_repository_url" {
  description = "ECR Web repository URL"
  value       = aws_ecr_repository.web.repository_url
}

# Secrets Manager Outputs
output "secrets_manager_app_arn" {
  description = "Secrets Manager ARN for app secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "secrets_manager_database_arn" {
  description = "Secrets Manager ARN for database"
  value       = aws_secretsmanager_secret.database.arn
}

# SNS Outputs
output "sns_alerts_topic_arn" {
  description = "SNS alerts topic ARN"
  value       = aws_sns_topic.alerts.arn
}

# CloudWatch Outputs
output "cloudwatch_log_group_eks" {
  description = "CloudWatch log group for EKS"
  value       = aws_cloudwatch_log_group.eks.name
}

output "cloudwatch_log_group_app" {
  description = "CloudWatch log group for app"
  value       = aws_cloudwatch_log_group.app.name
}

# Kubeconfig command
output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# Connection strings (for reference - use Secrets Manager in production)
output "database_connection_string" {
  description = "Database connection string template"
  value       = "postgresql://broxiva_admin:<password>@${module.rds.db_instance_endpoint}/broxiva"
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string template"
  value       = "redis://${module.elasticache.cluster_address}:${module.elasticache.port}"
  sensitive   = true
}

# ============================================
# Messaging Infrastructure Outputs (SES, SNS, SQS)
# ============================================

output "ses_domain_verification_token" {
  description = "SES domain verification token (add as TXT record)"
  value       = module.messaging.ses_domain_verification_token
}

output "ses_dkim_tokens" {
  description = "SES DKIM tokens (add as CNAME records)"
  value       = module.messaging.ses_dkim_tokens
}

output "ses_configuration_set" {
  description = "SES configuration set name"
  value       = module.messaging.ses_configuration_set_name
}

output "sns_transactional_topic_arn" {
  description = "SNS topic ARN for transactional notifications"
  value       = module.messaging.sns_topic_transactional_arn
}

output "sns_marketing_topic_arn" {
  description = "SNS topic ARN for marketing notifications"
  value       = module.messaging.sns_topic_marketing_arn
}

output "sqs_notifications_queue_url" {
  description = "SQS notifications queue URL"
  value       = module.messaging.sqs_notifications_queue_url
}

output "sqs_email_queue_url" {
  description = "SQS email queue URL"
  value       = module.messaging.sqs_email_queue_url
}

output "sqs_sms_queue_url" {
  description = "SQS SMS queue URL"
  value       = module.messaging.sqs_sms_queue_url
}

output "messaging_iam_policy_arn" {
  description = "IAM policy ARN for full messaging access"
  value       = module.messaging.iam_policy_messaging_full_arn
}

output "messaging_env_vars" {
  description = "Environment variables for application messaging configuration"
  value       = module.messaging.application_env_vars
}

output "dns_records_required" {
  description = "DNS records required for SES verification"
  value       = module.messaging.dns_records_required
}
