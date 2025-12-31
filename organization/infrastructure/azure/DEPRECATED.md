# DEPRECATED - Azure Infrastructure

**Status:** DEPRECATED as of 2025-12-30

This directory contains legacy Azure infrastructure configurations that are no longer in active use. The Broxiva platform has migrated to AWS.

## Migration Details

- **New Infrastructure Location:** `infrastructure/terraform/environments/aws-prod/`
- **New Container Registry:** AWS ECR (`${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com`)
- **New Kubernetes:** AWS EKS (`broxiva-prod-eks`)
- **New Secrets Manager:** AWS Secrets Manager

## AWS Resources

| Azure Service | AWS Equivalent |
|---------------|----------------|
| Azure Container Registry (ACR) | Amazon ECR |
| Azure Kubernetes Service (AKS) | Amazon EKS |
| Azure Key Vault | AWS Secrets Manager + KMS |
| Azure Storage | Amazon S3 |
| Azure Database for PostgreSQL | Amazon RDS PostgreSQL |
| Azure Cache for Redis | Amazon ElastiCache |
| Azure Monitor | Amazon CloudWatch |
| Azure Front Door | Amazon CloudFront |
| Azure DNS | Amazon Route 53 |

## Files in This Directory

These files are kept for reference but should NOT be used for new deployments:

- `provider.tf` - Azure provider configuration
- `key-vault-per-app.tf` - Azure Key Vault setup
- `key-vault-production-specialized.tf` - Production Key Vaults
- `secrets-manager.tf` - Azure secrets management
- Various Bicep templates and PowerShell scripts

## For New Deployments

Use the AWS Terraform configurations in:
```
infrastructure/terraform/environments/aws-prod/
  - main.tf
  - variables.tf
  - outputs.tf
```

And AWS Secrets Manager configuration in:
```
infrastructure/aws/
  - secrets-manager.tf
```

## Questions

Contact: devops@broxiva.com
