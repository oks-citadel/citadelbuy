# Broxiva Production Secrets Configuration - Complete

**Date:** 2025-12-13
**Status:** Ready for Deployment
**Environment:** Production (broxiva-production namespace)

## Overview

A comprehensive secrets management system has been configured for Broxiva production deployment, including:

1. Azure Key Vault infrastructure (Bicep templates)
2. External Secrets Operator configuration
3. Secrets Store CSI Driver configuration (alternative)
4. Comprehensive documentation
5. Automation scripts for rotation, sync, and validation

---

## Files Created

### 1. Kubernetes Configuration Files

#### `infrastructure/kubernetes/production/secrets-template.yaml`
- Complete template with all 60+ required and optional secrets
- Organized into 16 categories (auth, database, payment, email, etc.)
- Includes rotation schedules and criticality levels
- Detailed documentation for each secret's purpose
- Ready to use for manual secret creation

**Key Sections:**
- Authentication & Session (JWT, session secrets)
- Encryption Keys (CRITICAL - never rotate)
- Database credentials
- Cache/Redis
- Payment providers (Stripe, PayPal)
- Email service (SendGrid)
- OAuth providers (Google, Facebook, GitHub, Apple)
- Search services (Elasticsearch, Algolia)
- AI services (OpenAI)
- Monitoring (Sentry, DataDog)
- Admin tools (Grafana, pgAdmin)
- Internal API keys
- Analytics & marketing
- Mobile app (Apple IAP, Google Play)
- Cloud storage (Azure Blob)

#### `infrastructure/kubernetes/production/external-secrets-broxiva.yaml`
- External Secrets Operator configuration for Azure Key Vault
- SecretStore definition with Workload Identity
- Multiple ExternalSecret resources (by category)
- Combined ExternalSecret (all secrets in one)
- Prometheus monitoring and alerting
- RBAC configuration

**Features:**
- Auto-sync every 1 hour
- Workload Identity for secure authentication
- Separate ExternalSecrets by category (auth, database, payment, etc.)
- Alert rules for sync failures

#### `infrastructure/kubernetes/production/secret-provider-class.yaml`
- Secrets Store CSI Driver configuration (alternative to ESO)
- SecretProviderClass for each category
- Example deployment showing both methods
- Comparison guide: ESO vs CSI Driver

**When to use:**
- CSI Driver: Maximum security, secrets never in etcd
- ESO: Easier management, better for GitOps

---

### 2. Azure Infrastructure

#### `infrastructure/azure/broxiva-keyvault.bicep`
- Complete Bicep template for Azure Key Vault
- RBAC authorization (no access policies)
- Soft delete & purge protection
- Network restrictions
- Diagnostic logging to Log Analytics
- Placeholder secrets with proper tags

**Parameters:**
- Environment (production/staging/development)
- Network restrictions toggle
- Soft delete retention (90 days for production)
- Purge protection (enabled for production)

**Secrets Created:**
- Authentication: jwt-access-secret, jwt-refresh-secret, session-secret
- Encryption: encryption-key, kyc-encryption-key (NEVER rotate)
- Database: postgres-password, postgres-url
- Cache: redis-password, redis-url
- Payment: stripe-secret-key, stripe-webhook-secret
- Email: sendgrid-api-key
- AI: openai-api-key
- Internal: internal-api-key

**Deployment:**
```bash
az deployment group create \
  --resource-group broxiva-production-rg \
  --template-file infrastructure/azure/broxiva-keyvault.bicep \
  --parameters environment=production location=eastus
```

---

### 3. Documentation

#### `infrastructure/docs/SECRETS_MANAGEMENT.md`
Comprehensive 400+ line guide covering:

**Sections:**
1. Overview & Architecture
2. Secret Categories (10 categories with rotation schedules)
3. Required vs Optional Secrets
4. Setup Instructions (step-by-step)
5. Secret Rotation Procedures
6. Key Vault Integration (ESO vs CSI)
7. Troubleshooting Guide
8. Security Best Practices
9. Disaster Recovery

**Key Information:**
- Minimum 13 critical secrets required
- Rotation schedules by category
- Emergency rotation procedures
- Backup and recovery strategies
- Secret generation commands

---

### 4. Automation Scripts

#### `infrastructure/scripts/rotate-secrets.sh`
Automated secret rotation script with:

**Features:**
- Rotate specific secret types: jwt, session, database, redis, internal, all
- Dry-run mode for testing
- Emergency mode (skip confirmations)
- Automatic Key Vault updates
- Force ExternalSecret sync
- Deployment restart
- Comprehensive logging

**Usage:**
```bash
# Dry run - rotate JWT secrets
./rotate-secrets.sh --vault-name broxiva-production-kv --secret-type jwt --dry-run

# Emergency rotation - all secrets
./rotate-secrets.sh --vault-name broxiva-production-kv --secret-type all --emergency --force-sync

# Rotate internal API keys
./rotate-secrets.sh --vault-name broxiva-production-kv --secret-type internal --force-sync --restart-deployments
```

**Secret Types:**
- `jwt` - JWT access and refresh tokens
- `session` - Session secret
- `database` - Database password (requires manual DB update)
- `redis` - Redis password (requires manual Redis update)
- `internal` - Internal API key and webhook secret
- `all` - All rotatable secrets

#### `infrastructure/scripts/sync-keyvault-secrets.sh`
Sync secrets from local file to Azure Key Vault:

**Features:**
- Sync from .env file format
- Automatic backup before sync
- Validation of secret values
- Check for placeholder values
- Minimum length validation
- Force Kubernetes sync
- Automatic tag generation

**Usage:**
```bash
# Validate and sync (dry run)
./sync-keyvault-secrets.sh --vault-name broxiva-production-kv \
  --secrets-file secrets.env --validate --dry-run

# Sync and trigger Kubernetes sync
./sync-keyvault-secrets.sh --vault-name broxiva-production-kv \
  --secrets-file secrets.env --force-sync

# Sync without backup (not recommended)
./sync-keyvault-secrets.sh --vault-name broxiva-production-kv \
  --secrets-file secrets.env --no-backup
```

**Validations:**
- Required secrets present
- No placeholder values (REPLACE_WITH_*)
- Minimum length requirements
- No test values

#### `infrastructure/scripts/validate-secrets.sh`
Comprehensive validation of all secrets:

**Features:**
- Validate Kubernetes secrets
- Validate Azure Key Vault secrets
- Check ExternalSecret sync status
- Verify secret lengths
- Check for placeholder values
- Strict mode (validate optional secrets)
- Detailed reporting

**Usage:**
```bash
# Validate Kubernetes secrets only
./validate-secrets.sh --namespace broxiva-production

# Validate both Kubernetes and Key Vault
./validate-secrets.sh --namespace broxiva-production \
  --check-keyvault --vault-name broxiva-production-kv

# List required secrets
./validate-secrets.sh --check-required

# Strict validation (including optional secrets)
./validate-secrets.sh --namespace broxiva-production --strict-mode
```

**Checks:**
- 13 critical secrets present
- Secret length requirements
- No placeholder values
- ExternalSecret sync status
- Key Vault secret metadata

---

## Secret Boundaries

### Authentication Boundary
- JWT_SECRET
- JWT_REFRESH_SECRET
- SESSION_SECRET
- OAuth credentials

### Data Boundary
- POSTGRES_PASSWORD / DATABASE_URL
- ENCRYPTION_KEY (NEVER rotate)
- KYC_ENCRYPTION_KEY (NEVER rotate)

### Payment Boundary
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- PAYPAL_CLIENT_SECRET
- Apple/Google IAP keys

### Infrastructure Boundary
- REDIS_PASSWORD
- INTERNAL_API_KEY
- WEBHOOK_SECRET

---

## Rotation Schedule

| Secret Type | Frequency | Automated | Risk Level |
|-------------|-----------|-----------|------------|
| JWT Secrets | 90 days | Yes | CRITICAL |
| Session Secret | 90 days | Yes | CRITICAL |
| Database Password | 90 days | Yes* | CRITICAL |
| Redis Password | 90 days | Yes* | MEDIUM |
| Internal API Key | 90 days | Yes | HIGH |
| **Encryption Keys** | **NEVER** | **No** | **CRITICAL** |
| Payment Keys | As needed | No | CRITICAL |
| OAuth Secrets | 180 days | No | MEDIUM |
| Email API Key | As needed | No | HIGH |
| AI API Keys | As needed | No | LOW |

\* Requires manual update of actual service password

---

## Deployment Checklist

### Prerequisites
- [ ] Azure subscription with sufficient permissions
- [ ] AKS cluster with Workload Identity enabled
- [ ] External Secrets Operator installed
- [ ] kubectl configured for production cluster
- [ ] Azure CLI installed and authenticated

### Step 1: Deploy Azure Key Vault
```bash
cd infrastructure/azure
az deployment group create \
  --resource-group broxiva-production-rg \
  --template-file broxiva-keyvault.bicep \
  --parameters environment=production
```

### Step 2: Generate Secrets
```bash
cd infrastructure/scripts
# Review secrets-template.yaml for required secrets
# Generate secrets using OpenSSL or other secure methods
```

### Step 3: Sync Secrets to Key Vault
```bash
./sync-keyvault-secrets.sh \
  --vault-name broxiva-production-kv \
  --secrets-file secrets.env \
  --validate
```

### Step 4: Configure Workload Identity
```bash
# Create managed identity
az identity create \
  --name broxiva-production-identity \
  --resource-group broxiva-production-rg

# Grant Key Vault access
# (See SECRETS_MANAGEMENT.md for details)
```

### Step 5: Deploy External Secrets
```bash
# Update external-secrets-broxiva.yaml with your values
# - REPLACE_WITH_MANAGED_IDENTITY_CLIENT_ID
# - REPLACE_WITH_AZURE_TENANT_ID

kubectl apply -f infrastructure/kubernetes/production/external-secrets-broxiva.yaml
```

### Step 6: Validate Secrets
```bash
./validate-secrets.sh \
  --namespace broxiva-production \
  --check-keyvault \
  --vault-name broxiva-production-kv
```

### Step 7: Deploy Applications
```bash
# Applications will automatically pick up secrets from
# broxiva-secrets Kubernetes secret
kubectl apply -f infrastructure/kubernetes/production/
```

---

## Quick Reference

### Generate Secret Values

```bash
# JWT Secret (64 chars, base64)
openssl rand -base64 64 | tr -d '\n'

# Encryption Key (32 bytes = 64 hex chars)
openssl rand -hex 32

# Database Password (32 chars)
openssl rand -base64 48 | tr -d '\n' | head -c 32

# Internal API Key (40 chars)
openssl rand -base64 60 | tr -d '\n' | head -c 40
```

### Force ExternalSecret Sync

```bash
kubectl annotate externalsecret broxiva-all-secrets \
  -n broxiva-production \
  force-sync="$(date +%s)"
```

### View Secret Value

```bash
# Kubernetes
kubectl get secret broxiva-secrets -n broxiva-production \
  -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Azure Key Vault
az keyvault secret show \
  --vault-name broxiva-production-kv \
  --name jwt-access-secret \
  --query "value" -o tsv
```

### Check ExternalSecret Status

```bash
kubectl get externalsecrets -n broxiva-production
kubectl describe externalsecret broxiva-all-secrets -n broxiva-production
```

---

## Security Best Practices

1. **NEVER commit secrets to Git**
   - Add `.env`, `secrets.yaml` to `.gitignore`
   - Use git-secrets or similar tools

2. **Enable audit logging**
   - All Key Vault access logged to Log Analytics
   - Monitor for unusual access patterns

3. **Use least privilege RBAC**
   - Applications only get "Key Vault Secrets User" (read-only)
   - Humans use "Key Vault Secrets Officer" (full access)

4. **Rotate regularly**
   - Critical secrets: 90 days
   - Non-critical: 180 days
   - Never rotate encryption keys without migration

5. **Backup encryption keys**
   - ENCRYPTION_KEY and KYC_ENCRYPTION_KEY must be backed up offline
   - If lost, data is UNRECOVERABLE

---

## Disaster Recovery

### Scenario 1: Key Vault Deleted
**Recovery Time:** < 1 hour

```bash
az keyvault recover \
  --name broxiva-production-kv \
  --resource-group broxiva-production-rg
```

### Scenario 2: Secret Deleted
**Recovery Time:** < 15 minutes

```bash
az keyvault secret recover \
  --vault-name broxiva-production-kv \
  --name jwt-access-secret
```

### Scenario 3: Region Failure
**Recovery Time:** 2-4 hours
- Deploy Key Vault in DR region
- Restore from encrypted backup
- Update ExternalSecret to point to DR vault

---

## Support

- **Documentation:** `infrastructure/docs/SECRETS_MANAGEMENT.md`
- **Security Team:** security@broxiva.com
- **DevOps On-Call:** oncall@broxiva.com

---

## Next Steps

1. Review all configuration files
2. Generate production secrets
3. Deploy Azure Key Vault
4. Sync secrets to Key Vault
5. Configure Workload Identity
6. Deploy External Secrets Operator configuration
7. Validate all secrets
8. Deploy applications

---

## Files Summary

**Configuration:**
- `infrastructure/kubernetes/production/secrets-template.yaml` - Kubernetes secret template
- `infrastructure/kubernetes/production/external-secrets-broxiva.yaml` - External Secrets Operator config
- `infrastructure/kubernetes/production/secret-provider-class.yaml` - CSI Driver config
- `infrastructure/azure/broxiva-keyvault.bicep` - Azure Key Vault Bicep template

**Documentation:**
- `infrastructure/docs/SECRETS_MANAGEMENT.md` - Comprehensive guide (400+ lines)

**Scripts:**
- `infrastructure/scripts/rotate-secrets.sh` - Automated rotation
- `infrastructure/scripts/sync-keyvault-secrets.sh` - Sync to Key Vault
- `infrastructure/scripts/validate-secrets.sh` - Validation

**Total:** 7 files created

---

**Status:** Production Ready
**Last Updated:** 2025-12-13
**Review Date:** 2026-03-13
