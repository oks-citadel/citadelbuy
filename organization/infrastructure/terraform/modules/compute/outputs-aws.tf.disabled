# AWS Compute Module Outputs

# ECR Outputs
output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = var.cloud_provider == "aws" ? aws_ecr_repository.main[0].repository_url : null
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = var.cloud_provider == "aws" ? aws_ecr_repository.main[0].arn : null
}

# EKS Outputs
output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].id : null
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].name : null
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].endpoint : null
}

output "eks_cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = var.cloud_provider == "aws" ? aws_security_group.eks_cluster[0].id : null
}

output "eks_cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].certificate_authority[0].data : null
  sensitive   = true
}

output "eks_cluster_oidc_issuer_url" {
  description = "EKS cluster OIDC issuer URL"
  value       = var.cloud_provider == "aws" ? aws_eks_cluster.main[0].identity[0].oidc[0].issuer : null
}

output "eks_node_role_arn" {
  description = "EKS node IAM role ARN"
  value       = var.cloud_provider == "aws" ? aws_iam_role.eks_nodes[0].arn : null
}

output "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  value       = var.cloud_provider == "aws" ? aws_iam_openid_connect_provider.eks[0].arn : null
}
