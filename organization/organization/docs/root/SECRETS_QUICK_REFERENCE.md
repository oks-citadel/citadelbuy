# Broxiva Secrets Management Quick Reference

This is a quick reference guide for common secrets management operations.

## Common Commands

### AWS Secrets Manager

```bash
# List all secrets
aws secretsmanager list-secrets --region us-east-1

# Get a secret
aws secretsmanager get-secret-value \
  --secret-id broxiva/production/postgres/credentials \
  --region us-east-1

# Create a secret
aws secretsmanager create-secret \
  --name broxiva/production/new-secret \
  --secret-string '{"key":"value"}' \
  --region us-east-1

# Update a secret
aws secretsmanager put-secret-value \
  --secret-id broxiva/production/new-secret \
  --secret-string '{"key":"new-value"}' \
  --region us-east-1

# Delete a secret (with recovery period)
aws secretsmanager delete-secret \
  --secret-id broxiva/production/old-secret \
  --recovery-window-in-days 7 \
  --region us-east-1

# Rotate a secret
aws secretsmanager rotate-secret \
  --secret-id broxiva/production/postgres/credentials \
  --region us-east-1

# Using sync script
./scripts/aws-secrets-sync.sh push production
./scripts/aws-secrets-sync.sh pull production
./scripts/aws-secrets-sync.sh list production
./scripts/aws-secrets-sync.sh backup production
```

### Azure Key Vault

```bash
# List all secrets
az keyvault secret list --vault-name broxiva-production-kv

# Get a secret
az keyvault secret show \
  --vault-name broxiva-production-kv \
  --name postgres-password

# Create a secret
az keyvault secret set \
  --vault-name broxiva-production-kv \
  --name new-secret \
  --value "secret-value"

# Update a secret (same as create)
az keyvault secret set \
  --vault-name broxiva-production-kv \
  --name existing-secret \
  --value "new-value"

# Delete a secret
az keyvault secret delete \
  --vault-name broxiva-production-kv \
  --name old-secret

# Recover a deleted secret
az keyvault secret recover \
  --vault-name broxiva-production-kv \
  --name recovered-secret

# Using sync script
./scripts/azure-secrets-sync.sh push production
./scripts/azure-secrets-sync.sh pull production
./scripts/azure-secrets-sync.sh list production
./scripts/azure-secrets-sync.sh audit production
./scripts/azure-secrets-sync.sh backup production
```

### HashiCorp Vault

```bash
# Set environment variables
export VAULT_ADDR='https://vault.broxiva.internal:8200'
export VAULT_TOKEN='your-token'

# Check status
vault status

# Login
vault login <token>

# List secrets
vault kv list secret/broxiva/production

# Get a secret
vault kv get secret/broxiva/production/database/postgres

# Create/update a secret
vault kv put secret/broxiva/production/new-secret \
  key1=value1 \
  key2=value2

# Delete a secret
vault kv delete secret/broxiva/production/old-secret

# View secret versions
vault kv metadata get secret/broxiva/production/database/postgres

# Get a specific version
vault kv get -version=2 secret/broxiva/production/database/postgres

# Using sync script
export VAULT_TOKEN='your-token'
./scripts/vault-secrets-sync.sh init
./scripts/vault-secrets-sync.sh push production
./scripts/vault-secrets-sync.sh pull production
./scripts/vault-secrets-sync.sh list production
./scripts/vault-secrets-sync.sh backup production
```

## Kubernetes External Secrets

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace

# Check operator status
kubectl get pods -n external-secrets-system

# List SecretStores
kubectl get secretstores -n broxiva

# List ExternalSecrets
kubectl get externalsecrets -n broxiva

# Check ExternalSecret status
kubectl describe externalsecret broxiva-database -n broxiva

# View synced Kubernetes secret
kubectl get secret broxiva-database-secret -n broxiva -o yaml

# Force sync
kubectl annotate externalsecret broxiva-database \
  force-sync=$(date +%s) \
  -n broxiva

# Check operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets \
  --tail=100 -f
```

## Terraform Operations

```bash
# Initialize Terraform
cd infrastructure/aws  # or azure, or vault
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy resources (careful!)
terraform destroy

# Import existing resource
terraform import aws_secretsmanager_secret.example \
  broxiva/production/existing-secret

# Show current state
terraform show

# List resources
terraform state list

# Get output values
terraform output
```

## Secret Naming Convention

```
{project}/{environment}/{category}/{name}

Examples:
broxiva/production/database/postgres
broxiva/staging/redis/connection
broxiva/dev/stripe/keys
broxiva/production/oauth/google
broxiva/production/jwt/tokens
```

## Secret Categories

- `database/` - Database credentials
- `redis/` - Redis credentials
- `jwt/` - JWT signing secrets
- `stripe/` - Stripe API keys
- `oauth/` - OAuth credentials (Google, Facebook)
- `aws/` - AWS credentials (SES, S3)
- `openai/` - OpenAI API keys
- `elasticsearch/` - Elasticsearch credentials
- `session/` - Session secrets

## Common Secret Structures

### Database
```json
{
  "username": "dbuser",
  "password": "secure_password",
  "host": "db.example.com",
  "port": 5432,
  "database": "dbname",
  "url": "postgresql://dbuser:secure_password@db.example.com:5432/dbname"
}
```

### Redis
```json
{
  "password": "redis_password",
  "host": "redis.example.com",
  "port": 6379,
  "url": "redis://:redis_password@redis.example.com:6379"
}
```

### JWT
```json
{
  "access_token_secret": "long_random_string",
  "refresh_token_secret": "another_long_random_string",
  "access_token_expiry": "15m",
  "refresh_token_expiry": "7d"
}
```

### Stripe
```json
{
  "secret_key": "sk_live_...",
  "publishable_key": "pk_live_...",
  "webhook_secret": "whsec_..."
}
```

### OAuth
```json
{
  "client_id": "app-id.apps.googleusercontent.com",
  "client_secret": "secret_value"
}
```

## Environment Variables Mapping

| Environment Variable | Secret Path (AWS) | Secret Key (Azure) | Secret Path (Vault) |
|---------------------|-------------------|-------------------|---------------------|
| DATABASE_URL | broxiva/{env}/postgres/credentials | postgres-url | broxiva/{env}/database/postgres |
| POSTGRES_PASSWORD | broxiva/{env}/postgres/credentials | postgres-password | broxiva/{env}/database/postgres |
| REDIS_URL | broxiva/{env}/redis/credentials | redis-url | broxiva/{env}/redis/connection |
| REDIS_PASSWORD | broxiva/{env}/redis/credentials | redis-password | broxiva/{env}/redis/connection |
| JWT_SECRET | broxiva/{env}/jwt/secrets | jwt-access-secret | broxiva/{env}/jwt/tokens |
| JWT_REFRESH_SECRET | broxiva/{env}/jwt/secrets | jwt-refresh-secret | broxiva/{env}/jwt/tokens |
| STRIPE_SECRET_KEY | broxiva/{env}/stripe/keys | stripe-secret-key | broxiva/{env}/stripe/keys |
| OPENAI_API_KEY | broxiva/{env}/openai/key | openai-api-key | broxiva/{env}/openai/api |
| SESSION_SECRET | broxiva/{env}/session/secret | session-secret | broxiva/{env}/session/secret |

## Troubleshooting Checklist

### ExternalSecret Not Syncing

- [ ] Check ExternalSecret status: `kubectl describe externalsecret <name>`
- [ ] Verify SecretStore: `kubectl describe secretstore <name>`
- [ ] Check operator logs: `kubectl logs -n external-secrets-system ...`
- [ ] Verify authentication (IAM role, service principal, Vault token)
- [ ] Confirm secret exists in provider
- [ ] Check network connectivity
- [ ] Verify secret path/name is correct

### Authentication Issues (AWS)

- [ ] Check IAM role: `aws sts get-caller-identity`
- [ ] Verify IRSA annotation on service account
- [ ] Check IAM policy permissions
- [ ] Verify trust relationship on IAM role
- [ ] Check EKS OIDC provider

### Authentication Issues (Azure)

- [ ] Check login: `az account show`
- [ ] Verify workload identity annotation
- [ ] Check Key Vault access policies or RBAC
- [ ] Verify network rules allow access
- [ ] Check service principal permissions

### Authentication Issues (Vault)

- [ ] Check Vault status: `vault status`
- [ ] Verify token: `vault token lookup`
- [ ] Check if Vault is sealed
- [ ] Verify Kubernetes auth is configured
- [ ] Check policy permissions
- [ ] Confirm service account can authenticate

## Security Best Practices Checklist

- [ ] Never commit secrets to git
- [ ] Use workload identity (IRSA, Workload Identity, Kubernetes auth)
- [ ] Enable audit logging
- [ ] Rotate secrets regularly (30-90 days)
- [ ] Use separate secrets per environment
- [ ] Enable secret versioning
- [ ] Set up monitoring and alerts
- [ ] Use encryption at rest and in transit
- [ ] Implement least privilege access
- [ ] Document access procedures
- [ ] Regular security audits
- [ ] Backup secrets regularly
- [ ] Test disaster recovery procedures

## Emergency Procedures

### Secret Compromised

1. **Immediate Action:**
   ```bash
   # Rotate the compromised secret immediately
   # AWS example:
   aws secretsmanager rotate-secret \
     --secret-id broxiva/production/compromised-secret
   ```

2. **Verify New Secret:**
   ```bash
   # Check that new secret is generated
   # Force sync in Kubernetes
   kubectl annotate externalsecret <name> force-sync=$(date +%s)
   ```

3. **Restart Services:**
   ```bash
   # Restart pods to pick up new secret
   kubectl rollout restart deployment/<name> -n broxiva
   ```

4. **Audit Access:**
   ```bash
   # Check who accessed the secret
   # AWS: Check CloudTrail
   # Azure: Check Activity Log
   # Vault: Check audit log
   ```

5. **Document Incident:**
   - What was compromised
   - When it was detected
   - Actions taken
   - Lessons learned

### Vault Sealed

```bash
# Unseal Vault with threshold number of keys
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

# Verify unsealed
vault status
```

### Lost Access to Secrets

1. Use backup:
   ```bash
   # Restore from backup
   # AWS example:
   aws secretsmanager restore-secret \
     --secret-id broxiva/production/lost-secret
   ```

2. Or recreate from `.env.example` and update values

## Monitoring Queries

### Prometheus Queries

```promql
# ExternalSecret sync failures
increase(external_secrets_sync_calls_error[5m]) > 0

# Stale ExternalSecrets
time() - external_secrets_sync_calls_total > 7200

# Secret store errors
external_secrets_externalsecret_status_condition{condition="SecretSynced",status="False"}
```

### CloudWatch Queries (AWS)

```
fields @timestamp, @message
| filter eventSource = "secretsmanager.amazonaws.com"
| filter eventName in ["GetSecretValue", "PutSecretValue", "DeleteSecret"]
| sort @timestamp desc
```

### Azure Monitor Queries

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName in ("SecretGet", "SecretSet", "SecretDelete")
| order by TimeGenerated desc
```

## Quick Links

- [Full Setup Guide](./SECRETS_MANAGER_SETUP.md)
- [Selection Guide](./SECRETS_MANAGER_SELECTION_GUIDE.md)
- [External Secrets Docs](https://external-secrets.io/)
- [AWS Secrets Manager Docs](https://docs.aws.amazon.com/secretsmanager/)
- [Azure Key Vault Docs](https://docs.microsoft.com/azure/key-vault/)
- [HashiCorp Vault Docs](https://www.vaultproject.io/docs)

## Support Contacts

- Platform Team: platform@broxiva.com
- Security Team: security@broxiva.com
- On-Call: Use PagerDuty
