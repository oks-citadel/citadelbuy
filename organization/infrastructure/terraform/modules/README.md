# Terraform Modules

Reusable, multi-cloud infrastructure modules for the CitadelBuy platform.

## Module Index

| Module | Description | Azure | AWS |
|--------|-------------|-------|-----|
| [compute](./compute/) | Kubernetes clusters and container registries | AKS, ACR | EKS, ECR |
| [database](./database/) | PostgreSQL and Redis | Flexible Server, Azure Cache | RDS, ElastiCache |
| [networking](./networking/) | Network infrastructure | VNet, NSG | VPC, Security Groups |
| [storage](./storage/) | Object storage | Blob Storage | S3 |
| [global-cdn](./global-cdn/) | Content delivery network | Front Door | CloudFront |
| [monitoring](./monitoring/) | Observability and alerts | App Insights, Log Analytics | CloudWatch, X-Ray |
| [security](./security/) | Security and secrets | Key Vault, Defender | Secrets Manager, WAF |

## Module Structure

Each module follows this standard structure:

```
module/
├── main.tf                  # Azure resources (default)
├── main-aws.tf              # AWS resources
├── variables.tf             # Common variables
├── variables-extended.tf    # Cloud-specific variables
├── outputs.tf               # Azure outputs
├── outputs-aws.tf           # AWS outputs
└── README.md                # Module documentation
```

## Usage Example

### Azure Deployment

```hcl
module "database" {
  source = "../../modules/database"

  cloud_provider      = "azure"
  project_name        = "myproject"
  environment         = "prod"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.main.name

  postgres_sku_name = "GP_Standard_D4s_v3"
  postgres_storage_mb = 131072

  database_subnet_id  = module.networking.database_subnet_ids[0]
  private_dns_zone_id = module.networking.postgresql_private_dns_zone_id

  tags = local.tags
}
```

### AWS Deployment

```hcl
module "database" {
  source = "../../modules/database"

  cloud_provider = "aws"
  project_name   = "myproject"
  environment    = "prod"
  region         = "us-east-1"

  vpc_id              = module.networking.vpc_id
  database_subnet_ids = module.networking.database_subnet_ids
  allowed_security_group_ids = [module.networking.app_security_group_id]

  rds_instance_class  = "db.r6g.xlarge"
  postgres_storage_gb = 100

  tags = local.tags
}
```

## Multi-Cloud Design

Modules support both Azure and AWS through:

1. **Cloud Provider Variable**: Set `cloud_provider = "azure"` or `"aws"`
2. **Conditional Resources**: Resources created based on cloud provider
3. **Consistent Interfaces**: Similar variable names and outputs
4. **Separate Files**: Azure in `main.tf`, AWS in `main-aws.tf`

## Best Practices

### Naming Conventions

```hcl
# Resource names
"${var.project_name}-${var.environment}-${resource_type}"

# Examples
citadelbuy-prod-aks
citadelbuy-prod-postgres
citadelbuy-staging-s3
```

### Tags

Always include standard tags:

```hcl
tags = {
  Project     = "CitadelBuy"
  Environment = var.environment
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
  Owner       = "Platform Team"
}
```

### Outputs

Provide comprehensive outputs for module composition:

```hcl
output "database_endpoint" {
  description = "Database connection endpoint"
  value       = var.cloud_provider == "azure" ?
    azurerm_postgresql_flexible_server.main.fqdn :
    aws_db_instance.postgres[0].endpoint
}
```

### Variables

Use sensible defaults and validation:

```hcl
variable "cloud_provider" {
  description = "Cloud provider (azure or aws)"
  type        = string
  validation {
    condition     = contains(["azure", "aws"], var.cloud_provider)
    error_message = "cloud_provider must be either 'azure' or 'aws'"
  }
}
```

## Testing

Test modules in isolation:

```bash
cd modules/database
terraform init
terraform plan -var="cloud_provider=azure" -var="project_name=test"
```

## Version Compatibility

| Module Version | Terraform | Azure Provider | AWS Provider |
|----------------|-----------|----------------|--------------|
| 1.x.x          | >= 1.0    | ~> 3.0         | ~> 5.0       |

## Contributing

When adding new modules or updating existing ones:

1. Follow the standard module structure
2. Support both Azure and AWS when applicable
3. Add comprehensive variable descriptions
4. Include example usage in README
5. Test in dev environment before production
6. Update this index

## Support

For module-specific issues:
- Check module README
- Review examples in environments/
- Contact #infrastructure team
