# AWS Networking Module Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = var.cloud_provider == "aws" ? aws_vpc.main[0].id : null
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = var.cloud_provider == "aws" ? aws_vpc.main[0].cidr_block : null
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = var.cloud_provider == "aws" ? aws_subnet.public[*].id : []
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = var.cloud_provider == "aws" ? aws_subnet.private[*].id : []
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = var.cloud_provider == "aws" ? aws_subnet.database[*].id : []
}

output "nat_gateway_ips" {
  description = "NAT Gateway public IPs"
  value       = var.cloud_provider == "aws" && var.enable_nat_gateway ? aws_eip.nat[*].public_ip : []
}

output "alb_security_group_id" {
  description = "Application Load Balancer security group ID"
  value       = var.cloud_provider == "aws" ? aws_security_group.alb[0].id : null
}

output "app_security_group_id" {
  description = "Application security group ID"
  value       = var.cloud_provider == "aws" ? aws_security_group.app[0].id : null
}

output "vpc_endpoints_security_group_id" {
  description = "VPC endpoints security group ID"
  value       = var.cloud_provider == "aws" ? aws_security_group.vpc_endpoints[0].id : null
}
