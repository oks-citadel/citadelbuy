# CitadelBuy Infrastructure

This directory contains infrastructure-as-code configurations for the CitadelBuy platform.

## Directory Structure

```
infrastructure/
├── aws/                          # AWS-specific configurations
│   └── secrets-manager.tf        # AWS Secrets Manager Terraform config
├── azure/                        # Azure-specific configurations
│   └── key-vault.tf              # Azure Key Vault Terraform config
├── vault/                        # HashiCorp Vault configurations
│   ├── config.hcl                # Vault server configuration
│   └── policies/                 # Vault access policies
│       ├── citadelbuy.hcl        # Application policy
│       └── citadelbuy-admin.hcl  # Admin policy
├── kubernetes/                   # Kubernetes configurations
│   └── base/
│       ├── external-secrets.yaml          # Basic External Secrets config
│       └── external-secrets-enhanced.yaml # Comprehensive examples
├── docker/                       # Docker configurations
└── terraform/                    # Shared Terraform modules
```

## Secrets Management

CitadelBuy supports three secrets management solutions:

1. **AWS Secrets Manager** - Best for AWS-native deployments
2. **Azure Key Vault** - Best for Azure-native deployments
3. **HashiCorp Vault** - Best for multi-cloud or advanced requirements

### Quick Start

#### 1. Choose Your Secrets Manager

Read the [Secrets Manager Selection Guide](../docs/SECRETS_MANAGER_SELECTION_GUIDE.md) to choose the right option.

#### 2. Deploy Infrastructure

**For AWS Secrets Manager:**
```bash
cd infrastructure/aws
terraform init
terraform plan
terraform apply
```

**For Azure Key Vault:**
```bash
cd infrastructure/azure
terraform init
terraform plan
terraform apply
```

**For HashiCorp Vault:**
```bash
cd infrastructure/vault
# See docs/SECRETS_MANAGER_SETUP.md for detailed instructions
```

#### 3. Sync Secrets

Use the provided sync scripts to manage secrets:

```bash
# AWS
./scripts/aws-secrets-sync.sh push production

# Azure
./scripts/azure-secrets-sync.sh push production

# Vault
./scripts/vault-secrets-sync.sh push production
```

#### 4. Configure Kubernetes

Install External Secrets Operator:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

Apply the External Secrets configuration:

```bash
# Basic configuration
kubectl apply -f infrastructure/kubernetes/base/external-secrets.yaml

# Or use the enhanced version with more examples
kubectl apply -f infrastructure/kubernetes/base/external-secrets-enhanced.yaml
```

## Documentation

Comprehensive documentation is available:

- [Secrets Manager Setup Guide](../docs/SECRETS_MANAGER_SETUP.md) - Complete setup instructions for all providers
- [Secrets Manager Selection Guide](../docs/SECRETS_MANAGER_SELECTION_GUIDE.md) - Help choosing the right solution
- [Security Setup](../docs/SECURITY_SETUP.md) - General security configuration

## Scripts

Helper scripts for secrets management:

- `scripts/aws-secrets-sync.sh` - Sync secrets with AWS Secrets Manager
- `scripts/azure-secrets-sync.sh` - Sync secrets with Azure Key Vault
- `scripts/vault-secrets-sync.sh` - Sync secrets with HashiCorp Vault

### Script Usage

All scripts support the following commands:

```bash
# Push secrets from .env to secret store
./scripts/{provider}-secrets-sync.sh push {environment}

# Pull secrets from secret store to .env
./scripts/{provider}-secrets-sync.sh pull {environment}

# List all secrets
./scripts/{provider}-secrets-sync.sh list {environment}

# Backup secrets
./scripts/{provider}-secrets-sync.sh backup {environment}
```

## Environments

The infrastructure supports three environments:

- **dev** - Development environment
- **staging** - Staging environment
- **production** - Production environment

Secrets are isolated per environment using path prefixes:
- AWS: `citadelbuy/{environment}/...`
- Azure: Key Vault names include environment
- Vault: `secret/citadelbuy/{environment}/...`

## Security Best Practices

1. **Never commit secrets to version control**
   - Use `.gitignore` for `.env` files
   - Use secrets managers for all sensitive data

2. **Use workload identity where possible**
   - AWS: IAM Roles for Service Accounts (IRSA)
   - Azure: Workload Identity
   - Vault: Kubernetes authentication

3. **Enable audit logging**
   - All secret access should be logged
   - Review logs regularly

4. **Rotate secrets regularly**
   - Database credentials: Every 30 days
   - API keys: Every 90 days
   - JWT secrets: Every 90 days

5. **Use separate secrets per environment**
   - Never share secrets between dev/staging/production
   - Use different API keys for each environment

6. **Enable secret versioning**
   - Keep previous versions for rollback
   - Set retention policies

## Terraform State Management

Terraform state should be stored remotely:

**AWS:**
```hcl
terraform {
  backend "s3" {
    bucket = "citadelbuy-terraform-state"
    key    = "secrets-manager/terraform.tfstate"
    region = "us-east-1"
  }
}
```

**Azure:**
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "citadelbuy-terraform-state"
    storage_account_name = "citadelbuytfstate"
    container_name       = "tfstate"
    key                  = "keyvault.terraform.tfstate"
  }
}
```

## Monitoring

### External Secrets Operator

Monitor External Secrets sync status:

```bash
# Check ExternalSecret status
kubectl get externalsecrets -n citadelbuy

# View detailed status
kubectl describe externalsecret citadelbuy-database -n citadelbuy

# Check operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets
```

### Metrics

If using Prometheus, the following metrics are available:

- `external_secrets_sync_calls_total` - Total sync operations
- `external_secrets_sync_calls_error` - Failed sync operations
- `external_secrets_status_condition` - Current status of ExternalSecrets

## Troubleshooting

### Common Issues

**ExternalSecret not syncing:**
```bash
# Check SecretStore
kubectl describe secretstore aws-secretsmanager -n citadelbuy

# Check service account annotations
kubectl describe sa external-secrets-sa -n citadelbuy

# View operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets --tail=100
```

**Authentication failures:**

For AWS:
```bash
# Verify IAM role
aws sts get-caller-identity

# Check IAM role trust policy
aws iam get-role --role-name citadelbuy-production-external-secrets
```

For Azure:
```bash
# Verify login
az account show

# Check Key Vault access
az keyvault secret list --vault-name citadelbuy-production-kv
```

For Vault:
```bash
# Check Vault status
vault status

# Verify authentication
vault token lookup
```

## Cost Optimization

### AWS Secrets Manager
- Consolidate secrets to reduce secret count
- Use longer refresh intervals (1-24 hours)
- Cache secrets in application memory
- Consider Vault for 50+ secrets

### Azure Key Vault
- Use Standard tier unless HSM required
- Batch operations when possible
- Use managed identities (no cost)

### HashiCorp Vault
- Use smallest instance sizes that meet performance needs
- Consider single-node for non-production
- Use cloud-managed PostgreSQL for storage
- Optimize refresh intervals

## Support

For issues or questions:

1. Check the [troubleshooting section](../docs/SECRETS_MANAGER_SETUP.md#troubleshooting)
2. Review provider documentation
3. Check External Secrets Operator docs: https://external-secrets.io/
4. Contact the platform team

## Contributing

When adding new secrets:

1. Update the relevant Terraform configuration
2. Update the sync scripts
3. Update ExternalSecret definitions
4. Update documentation
5. Test in dev environment first
6. Create PR for review

## License

Proprietary - CitadelBuy Platform
