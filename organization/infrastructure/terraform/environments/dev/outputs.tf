# Development Environment Outputs

# ============================================
# Networking Outputs
# ============================================
output "vpc_id" {
  description = "VPC/VNet ID"
  value       = module.networking.vpc_id != null ? module.networking.vpc_id : module.networking.vnet_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

# ============================================
# Compute Outputs
# ============================================
output "kubernetes_cluster_name" {
  description = "Kubernetes cluster name"
  value       = var.cloud_provider == "azure" ? module.compute.aks_name : module.compute.eks_cluster_name
}

output "kubernetes_cluster_endpoint" {
  description = "Kubernetes cluster endpoint"
  value       = var.cloud_provider == "azure" ? module.compute.aks_kube_config_host : module.compute.eks_cluster_endpoint
}

output "container_registry_url" {
  description = "Container registry URL"
  value       = var.cloud_provider == "azure" ? module.compute.acr_login_server : module.compute.ecr_repository_url
}

# ============================================
# Database Outputs
# ============================================
output "database_endpoint" {
  description = "Database endpoint"
  value       = var.cloud_provider == "azure" ? module.database.postgresql_fqdn : module.database.rds_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cache endpoint"
  value       = var.cloud_provider == "azure" ? module.database.redis_hostname : module.database.redis_primary_endpoint_address
  sensitive   = true
}

# ============================================
# Storage Outputs
# ============================================
output "storage_account_name" {
  description = "Storage account/bucket name"
  value       = var.cloud_provider == "azure" ? module.storage.storage_account_name : module.storage.s3_bucket_id
}

# ============================================
# Monitoring Outputs
# ============================================
output "log_workspace_id" {
  description = "Log Analytics/CloudWatch workspace ID"
  value       = var.cloud_provider == "azure" ? module.monitoring.log_analytics_workspace_id : module.monitoring.cloudwatch_log_group_name
}
