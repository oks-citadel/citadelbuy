# Broxiva - DNS Only Configuration (for initial nameserver setup)
# This file can be used standalone to quickly set up Route53

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "broxiva-terraform-state"
    key            = "dns/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "broxiva-terraform-locks"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "Broxiva"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

# Route53 Hosted Zone for broxiva.com
resource "aws_route53_zone" "main" {
  name    = "broxiva.com"
  comment = "Broxiva E-Commerce Platform DNS"

  tags = {
    Project     = "Broxiva"
    Environment = "production"
  }
}

# Output nameservers
output "nameservers" {
  description = "Nameservers for broxiva.com - Update your domain registrar with these"
  value       = aws_route53_zone.main.name_servers
}

output "zone_id" {
  description = "Route53 Zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "domain" {
  description = "Domain name"
  value       = aws_route53_zone.main.name
}
