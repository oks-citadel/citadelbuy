# Broxiva Secrets Manager Setup Guide

This comprehensive guide covers the setup and configuration of secrets management for the Broxiva platform using three different providers: AWS Secrets Manager, Azure Key Vault, and HashiCorp Vault.

## Table of Contents

1. [Overview](#overview)
2. [Comparison of Options](#comparison-of-options)
3. [AWS Secrets Manager Setup](#aws-secrets-manager-setup)
4. [Azure Key Vault Setup](#azure-key-vault-setup)
5. [HashiCorp Vault Setup](#hashicorp-vault-setup)
6. [Kubernetes Integration](#kubernetes-integration)
7. [Secret Rotation](#secret-rotation)
8. [Access Control & Audit Logging](#access-control--audit-logging)
9. [Cost Considerations](#cost-considerations)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Overview

Broxiva requires secure management of sensitive configuration data including:

- Database credentials (PostgreSQL)
- Cache credentials (Redis)
- API keys (Stripe, OpenAI, AWS SES)
- OAuth credentials (Google, Facebook)
- JWT signing secrets
- Session secrets
- Search engine credentials (Elasticsearch)

This guide provides multiple options for secrets management to suit different infrastructure preferences and cloud providers.

## Comparison of Options

### Feature Comparison

| Feature | AWS Secrets Manager | Azure Key Vault | HashiCorp Vault |
|---------|-------------------|-----------------|-----------------|
| **Cloud Provider** | AWS | Azure | Cloud-agnostic |
| **Pricing Model** | Per secret + API calls | Per operation + transaction | License-based (or OSS free) |
| **High Availability** | Built-in | Built-in | Requires setup |
| **Secret Rotation** | Automated with Lambda | Manual or automated | Built-in dynamic secrets |
| **Encryption** | AWS KMS | Azure Key Vault HSM | Configurable (KMS, HSM) |
| **Versioning** | Yes | Yes | Yes |
| **Audit Logging** | CloudTrail | Azure Monitor | Built-in audit log |
| **K8s Integration** | External Secrets Operator | External Secrets Operator | Native + External Secrets |
| **Dynamic Secrets** | Limited | No | Yes (databases, cloud, SSH) |
| **On-Premises** | No | No | Yes |
| **Learning Curve** | Low | Low | Medium |
| **Multi-Cloud** | No | No | Yes |

### When to Use Each Option

#### AWS Secrets Manager
- **Best for:** AWS-native deployments, EKS clusters
- **Pros:**
  - Deep AWS integration
  - Simple setup if already using AWS
  - Automatic rotation with Lambda
  - Native IAM integration
- **Cons:**
  - Vendor lock-in
  - Higher cost for many secrets
  - Limited to AWS ecosystem

#### Azure Key Vault
- **Best for:** Azure-native deployments, AKS clusters
- **Pros:**
  - Deep Azure integration
  - RBAC with Azure AD
  - Hardware security module (HSM) support
  - Good pricing for high-volume operations
- **Cons:**
  - Vendor lock-in
  - Limited dynamic secrets
  - Azure-specific

#### HashiCorp Vault
- **Best for:** Multi-cloud, hybrid cloud, advanced secret management
- **Pros:**
  - Cloud-agnostic
  - Dynamic secrets for databases, cloud providers
  - Advanced features (transit encryption, PKI)
  - On-premises support
  - Multi-cloud compatibility
- **Cons:**
  - Requires dedicated infrastructure
  - More complex to operate
  - Enterprise features require license
  - Steeper learning curve

## AWS Secrets Manager Setup

### Prerequisites

- AWS CLI installed and configured
- Terraform >= 1.5.0
- AWS account with appropriate permissions
- EKS cluster (for Kubernetes integration)

### Step 1: Configure Terraform Variables

Create a `terraform.tfvars` file:

```hcl
environment     = "production"
project_name    = "broxiva"
aws_region      = "us-east-1"
enable_rotation = true
rotation_days   = 30
```

### Step 2: Deploy Infrastructure

```bash
cd infrastructure/aws

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### Step 3: Set Manual Secrets

Some secrets must be set manually after infrastructure creation:

```bash
# Set Stripe keys
aws secretsmanager put-secret-value \
  --secret-id broxiva/production/stripe/keys \
  --secret-string '{"secret_key":"sk_live_xxxxx","publishable_key":"pk_live_xxxxx","webhook_secret":"whsec_xxxxx"}' \
  --region us-east-1

# Set OpenAI key
aws secretsmanager put-secret-value \
  --secret-id broxiva/production/openai/key \
  --secret-string '{"api_key":"sk-xxxxx","model":"gpt-4"}' \
  --region us-east-1

# Set OAuth credentials
aws secretsmanager put-secret-value \
  --secret-id broxiva/production/oauth/google \
  --secret-string '{"client_id":"xxxxx.apps.googleusercontent.com","client_secret":"xxxxx"}' \
  --region us-east-1
```

### Step 4: Sync from .env File

Use the provided sync script to push secrets from your .env file:

```bash
# Make the script executable
chmod +x scripts/aws-secrets-sync.sh

# Push secrets to AWS
./scripts/aws-secrets-sync.sh push production

# Pull secrets from AWS (if needed)
./scripts/aws-secrets-sync.sh pull production

# List all secrets
./scripts/aws-secrets-sync.sh list production

# Backup secrets
./scripts/aws-secrets-sync.sh backup production
```

### Step 5: Configure Secret Rotation

For automatic rotation, deploy the Lambda function:

```bash
# Package the Lambda function
cd infrastructure/aws/lambda
zip -r rotate-secrets.zip index.py

# The Lambda is automatically created by Terraform if enable_rotation = true
```

### Step 6: Verify Setup

```bash
# Check secret exists
aws secretsmanager describe-secret \
  --secret-id broxiva/production/postgres/credentials \
  --region us-east-1

# Get secret value
aws secretsmanager get-secret-value \
  --secret-id broxiva/production/postgres/credentials \
  --region us-east-1
```

## Azure Key Vault Setup

### Prerequisites

- Azure CLI installed and logged in
- Terraform >= 1.5.0
- Azure subscription
- AKS cluster (for Kubernetes integration)

### Step 1: Login to Azure

```bash
# Login to Azure
az login

# Set the subscription
az account set --subscription <subscription-id>
```

### Step 2: Configure Terraform Variables

Create a `terraform.tfvars` file:

```hcl
environment              = "production"
project_name             = "broxiva"
location                 = "eastus"
resource_group_name      = "broxiva-rg"
enable_rbac              = true
soft_delete_retention_days = 7
```

### Step 3: Deploy Infrastructure

```bash
cd infrastructure/azure

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### Step 4: Configure Network Access

Update the Key Vault network rules to allow access from your IPs:

```bash
# Add your IP address
az keyvault network-rule add \
  --name broxiva-production-kv \
  --ip-address <your-ip-address>

# Add AKS subnet
az keyvault network-rule add \
  --name broxiva-production-kv \
  --subnet /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/<vnet>/subnets/<subnet>
```

### Step 5: Set Manual Secrets

```bash
# Set Stripe keys
az keyvault secret set \
  --vault-name broxiva-production-kv \
  --name stripe-secret-key \
  --value "sk_live_xxxxx"

# Set OpenAI key
az keyvault secret set \
  --vault-name broxiva-production-kv \
  --name openai-api-key \
  --value "sk-xxxxx"

# Set OAuth credentials
az keyvault secret set \
  --vault-name broxiva-production-kv \
  --name google-client-id \
  --value "xxxxx.apps.googleusercontent.com"
```

### Step 6: Sync from .env File

```bash
# Make the script executable
chmod +x scripts/azure-secrets-sync.sh

# Push secrets to Azure
./scripts/azure-secrets-sync.sh push production

# Pull secrets from Azure
./scripts/azure-secrets-sync.sh pull production

# List all secrets
./scripts/azure-secrets-sync.sh list production

# View audit logs
./scripts/azure-secrets-sync.sh audit production
```

### Step 7: Configure RBAC

```bash
# Grant access to service principal
az role assignment create \
  --assignee <service-principal-id> \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/<sub-id>/resourceGroups/broxiva-rg-production/providers/Microsoft.KeyVault/vaults/broxiva-production-kv
```

## HashiCorp Vault Setup

### Prerequisites

- Vault CLI installed
- Docker and Docker Compose (for local setup)
- Kubernetes cluster (for production setup)

### Option 1: Local Development Setup

```bash
# Start Vault in dev mode
docker run -d \
  --name vault-dev \
  -p 8200:8200 \
  -e VAULT_DEV_ROOT_TOKEN_ID="dev-root-token" \
  vault:latest

# Set environment variables
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='dev-root-token'

# Initialize Vault
./scripts/vault-secrets-sync.sh init
```

### Option 2: Production Setup with Docker Compose

Create `docker-compose.vault.yml`:

```yaml
version: '3.8'

services:
  vault:
    image: vault:1.15
    container_name: broxiva-vault
    ports:
      - "8200:8200"
    volumes:
      - ./infrastructure/vault/config.hcl:/vault/config/config.hcl
      - ./infrastructure/vault/policies:/vault/policies
      - vault-data:/vault/data
      - vault-logs:/vault/logs
      - ./certs:/vault/certs
    environment:
      VAULT_ADDR: 'https://0.0.0.0:8200'
    cap_add:
      - IPC_LOCK
    command: server
    restart: unless-stopped

  vault-ui:
    image: djenriquez/vault-ui:latest
    container_name: broxiva-vault-ui
    ports:
      - "8000:8000"
    environment:
      VAULT_URL_DEFAULT: http://vault:8200
      VAULT_AUTH_DEFAULT: TOKEN
    depends_on:
      - vault

volumes:
  vault-data:
  vault-logs:
```

### Step 3: Initialize and Unseal Vault

```bash
# Start Vault
docker-compose -f docker-compose.vault.yml up -d

# Initialize Vault (first time only)
vault operator init -key-shares=5 -key-threshold=3

# Save the unseal keys and root token securely!
# Unseal Vault (required after each restart)
vault operator unseal <unseal-key-1>
vault operator unseal <unseal-key-2>
vault operator unseal <unseal-key-3>

# Login with root token
vault login <root-token>

# Initialize Broxiva configuration
./scripts/vault-secrets-sync.sh init
```

### Step 4: Configure Kubernetes Authentication

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create a role for Broxiva
vault write auth/kubernetes/role/broxiva \
  bound_service_account_names=broxiva-api \
  bound_service_account_namespaces=broxiva \
  policies=broxiva \
  ttl=1h
```

### Step 5: Sync Secrets

```bash
# Export Vault address and token
export VAULT_ADDR='https://vault.broxiva.internal:8200'
export VAULT_TOKEN='<your-token>'

# Push secrets
./scripts/vault-secrets-sync.sh push production

# Pull secrets
./scripts/vault-secrets-sync.sh pull production

# List secrets
./scripts/vault-secrets-sync.sh list production
```

### Step 6: Enable Dynamic Database Secrets (Optional)

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/broxiva-postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="broxiva-api" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/broxiva?sslmode=disable" \
  username="vault_admin" \
  password="vault_admin_password"

# Create a role
vault write database/roles/broxiva-api \
  db_name=broxiva-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Get dynamic credentials
vault read database/creds/broxiva-api
```

## Kubernetes Integration

### External Secrets Operator Setup

The External Secrets Operator (ESO) synchronizes secrets from external secret stores to Kubernetes secrets.

#### Step 1: Install External Secrets Operator

```bash
# Add the Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install the operator
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace \
  --set installCRDs=true
```

#### Step 2: Configure SecretStore

See [infrastructure/kubernetes/base/external-secrets.yaml](../infrastructure/kubernetes/base/external-secrets.yaml) for complete examples.

**AWS Secrets Manager:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: broxiva
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

**Azure Key Vault:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: broxiva
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://broxiva-production-kv.vault.azure.net"
      serviceAccountRef:
        name: external-secrets-sa
```

**HashiCorp Vault:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault
  namespace: broxiva
spec:
  provider:
    vault:
      server: "https://vault.broxiva.internal:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "broxiva"
          serviceAccountRef:
            name: broxiva-api
```

#### Step 3: Create ExternalSecret Resources

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: broxiva-database
  namespace: broxiva
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager  # or azure-keyvault, or vault
    kind: SecretStore
  target:
    name: broxiva-database-secret
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: broxiva/production/postgres/credentials
        property: url
    - secretKey: POSTGRES_PASSWORD
      remoteRef:
        key: broxiva/production/postgres/credentials
        property: password
```

#### Step 4: Use Secrets in Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broxiva-api
spec:
  template:
    spec:
      containers:
        - name: api
          image: broxiva/api:latest
          envFrom:
            - secretRef:
                name: broxiva-database-secret
            - secretRef:
                name: broxiva-redis-secret
            - secretRef:
                name: broxiva-jwt-secret
```

## Secret Rotation

### AWS Secrets Manager Rotation

AWS Secrets Manager supports automatic rotation using Lambda functions:

```bash
# Enable rotation for a secret
aws secretsmanager rotate-secret \
  --secret-id broxiva/production/postgres/credentials \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:broxiva-production-rotate-secrets \
  --rotation-rules AutomaticallyAfterDays=30
```

### Azure Key Vault Rotation

Azure Key Vault rotation requires external automation:

```bash
# Use Azure Automation or Azure Functions
# See: https://docs.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation
```

### HashiCorp Vault Rotation

Vault supports automatic rotation for dynamic secrets:

```bash
# Dynamic database credentials automatically rotate
vault read database/creds/broxiva-api

# For static secrets, use:
vault write -f database/rotate-root/broxiva-postgres
```

### Manual Rotation Best Practices

1. **Schedule Regular Rotations**: Rotate secrets every 30-90 days
2. **Zero-Downtime Rotation**: Use dual-credentials during transition
3. **Automated Testing**: Verify new credentials before completing rotation
4. **Audit Logging**: Log all rotation events
5. **Rollback Plan**: Keep previous version accessible

### Rotation Procedure

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Add new secret (versioned)
./scripts/aws-secrets-sync.sh rotate production jwt

# 3. Update application to use new secret
kubectl rollout restart deployment/broxiva-api

# 4. Verify application health
kubectl rollout status deployment/broxiva-api

# 5. Remove old secret version (after confirmation)
# Only do this after ensuring the new secret works
```

## Access Control & Audit Logging

### AWS Secrets Manager

**IAM Policies:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:broxiva/production/*"
    }
  ]
}
```

**Audit Logging:**

```bash
# View CloudTrail logs
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::SecretsManager::Secret \
  --max-results 50
```

### Azure Key Vault

**RBAC Roles:**

- Key Vault Administrator: Full access
- Key Vault Secrets Officer: Manage secrets
- Key Vault Secrets User: Read secrets only

**Audit Logging:**

```bash
# Query audit logs
az monitor activity-log list \
  --resource-group broxiva-rg-production \
  --namespace Microsoft.KeyVault/vaults
```

### HashiCorp Vault

**Policies:**

See `infrastructure/vault/policies/` for policy examples.

**Audit Logging:**

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# View audit logs
tail -f /vault/logs/audit.log | jq
```

### Security Best Practices

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Use Service Accounts**: Avoid using personal credentials
3. **Enable MFA**: Require multi-factor authentication for admin access
4. **Monitor Access**: Set up alerts for suspicious activity
5. **Regular Audits**: Review access logs monthly
6. **Encrypt in Transit**: Always use TLS/SSL
7. **Encrypt at Rest**: Use KMS/HSM encryption
8. **Version Control**: Keep secret versions for rollback
9. **Separate Environments**: Use different secrets for dev/staging/production
10. **Document Access**: Maintain a record of who has access to what

## Cost Considerations

### AWS Secrets Manager Pricing (as of 2024)

- **Secret Storage**: $0.40 per secret per month
- **API Calls**: $0.05 per 10,000 API calls
- **Rotation Lambda**: Standard Lambda pricing

**Example Cost for Broxiva:**
- 15 secrets: $6/month
- 1M API calls: $5/month
- **Total**: ~$11/month

### Azure Key Vault Pricing

- **Standard Tier**: $0.03 per 10,000 operations
- **Premium Tier** (HSM): $1.00 per key + operations

**Example Cost for Broxiva:**
- 1M operations: $3/month
- **Total**: ~$3/month

### HashiCorp Vault Pricing

- **Open Source**: Free
- **Enterprise**: Contact HashiCorp for pricing
- **Infrastructure Costs**: ~$50-200/month for HA setup (3 nodes)

**Example Cost for Broxiva (OSS):**
- 3 t3.small instances: ~$50/month
- Load balancer: ~$20/month
- **Total**: ~$70/month (+ operational overhead)

### Cost Optimization Tips

1. **Batch API Calls**: Reduce the number of secret retrievals
2. **Cache Secrets**: Cache in-memory with reasonable TTL
3. **Use ClusterSecretStore**: Share secret stores across namespaces
4. **Consolidate Secrets**: Group related secrets to reduce count
5. **Monitor Usage**: Set up cost alerts and dashboards

## Best Practices

### Secret Naming Conventions

Use a consistent naming pattern:

```
{project}/{environment}/{category}/{name}

Examples:
- broxiva/production/database/postgres
- broxiva/staging/stripe/keys
- broxiva/dev/jwt/tokens
```

### Environment Separation

Always maintain separate secrets for each environment:

```
broxiva/dev/*
broxiva/staging/*
broxiva/production/*
```

### Secret Structure

For complex secrets, use JSON format:

```json
{
  "username": "admin",
  "password": "secure_password",
  "host": "db.example.com",
  "port": 5432,
  "database": "mydb",
  "connection_string": "postgresql://admin:secure_password@db.example.com:5432/mydb"
}
```

### Backup and Disaster Recovery

1. **Regular Backups**: Use the backup scripts weekly
2. **Store Backups Securely**: Encrypt backup files
3. **Test Restoration**: Verify backups can be restored
4. **Multi-Region**: Enable replication for critical secrets
5. **Document Procedures**: Maintain runbooks for recovery

### Monitoring and Alerting

Set up alerts for:

- Failed secret access attempts
- Secret rotation failures
- Unusual access patterns
- Secret changes in production
- API rate limit warnings

### Developer Workflow

```bash
# 1. Developer pulls secrets for local development
./scripts/aws-secrets-sync.sh pull dev

# 2. Developer updates .env file locally
# ... make changes ...

# 3. Developer pushes updated secrets (if authorized)
./scripts/aws-secrets-sync.sh push dev

# 4. CI/CD pipeline handles staging/production secrets
# No manual intervention required
```

## Troubleshooting

### AWS Secrets Manager

**Issue: Cannot retrieve secret**

```bash
# Check IAM permissions
aws sts get-caller-identity

# Check secret exists
aws secretsmanager describe-secret --secret-id <secret-name>

# Check KMS key permissions
aws kms describe-key --key-id <key-id>
```

**Issue: Rotation failed**

```bash
# Check Lambda logs
aws logs tail /aws/lambda/broxiva-production-rotate-secrets --follow

# Manually trigger rotation
aws secretsmanager rotate-secret --secret-id <secret-name>
```

### Azure Key Vault

**Issue: Access denied**

```bash
# Check your permissions
az keyvault secret list --vault-name broxiva-production-kv

# Check network rules
az keyvault network-rule list --vault-name broxiva-production-kv

# Add your IP if needed
az keyvault network-rule add --name broxiva-production-kv --ip-address $(curl -s ifconfig.me)
```

**Issue: Key Vault not found**

```bash
# Check if Key Vault exists
az keyvault show --name broxiva-production-kv

# Check if soft-deleted
az keyvault list-deleted
```

### HashiCorp Vault

**Issue: Vault is sealed**

```bash
# Check status
vault status

# Unseal with keys
vault operator unseal <key-1>
vault operator unseal <key-2>
vault operator unseal <key-3>
```

**Issue: Permission denied**

```bash
# Check token info
vault token lookup

# Check policy
vault policy read broxiva

# Login again
vault login <token>
```

**Issue: Cannot connect to Vault**

```bash
# Check Vault is running
docker ps | grep vault

# Check network connectivity
curl -k https://vault.broxiva.internal:8200/v1/sys/health

# Check certificate
openssl s_client -connect vault.broxiva.internal:8200
```

### External Secrets Operator

**Issue: ExternalSecret not syncing**

```bash
# Check ExternalSecret status
kubectl describe externalsecret broxiva-database -n broxiva

# Check SecretStore status
kubectl describe secretstore aws-secretsmanager -n broxiva

# Check operator logs
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets
```

**Issue: Authentication failed**

```bash
# Check service account
kubectl get serviceaccount external-secrets-sa -n broxiva

# For AWS: Check IRSA annotations
kubectl describe serviceaccount external-secrets-sa -n broxiva

# For Azure: Check workload identity
kubectl describe pod -n external-secrets -l app.kubernetes.io/name=external-secrets
```

## Additional Resources

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [External Secrets Operator](https://external-secrets.io/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## Support

For questions or issues:

1. Check this documentation first
2. Review the troubleshooting section
3. Check the respective provider's documentation
4. Contact the platform team: platform@broxiva.com
