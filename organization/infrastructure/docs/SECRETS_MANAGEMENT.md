# Broxiva Production Secrets Management Guide

**Last Updated:** 2025-12-13
**Version:** 1.0.0
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Secret Categories](#secret-categories)
3. [Architecture](#architecture)
4. [Required Secrets](#required-secrets)
5. [Setup Instructions](#setup-instructions)
6. [Secret Rotation](#secret-rotation)
7. [Key Vault Integration](#key-vault-integration)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)
10. [Disaster Recovery](#disaster-recovery)

---

## Overview

Broxiva uses a multi-layered secrets management approach combining:

- **Azure Key Vault** - Primary secret storage
- **External Secrets Operator** - Automated sync from Key Vault to Kubernetes
- **Secrets Store CSI Driver** - Alternative direct mount from Key Vault
- **Kubernetes Secrets** - Runtime secret delivery to pods

### Key Principles

1. **Separation of Concerns** - Secrets are categorized by function
2. **Least Privilege** - Each service only accesses required secrets
3. **Automated Rotation** - Secrets rotate on defined schedules
4. **Audit Trail** - All secret access is logged
5. **No Plaintext** - Secrets never committed to version control

---

## Secret Categories

### 1. Authentication & Session (CRITICAL)
**Rotation:** Every 90 days
**Impact if compromised:** Complete authentication bypass
**Secrets:**
- `JWT_SECRET` - Access token signing key
- `JWT_REFRESH_SECRET` - Refresh token signing key
- `SESSION_SECRET` - Session cookie signing key

### 2. Encryption Keys (NEVER ROTATE)
**Rotation:** NEVER (unless migrating data)
**Impact if lost:** Permanent data loss
**Secrets:**
- `ENCRYPTION_KEY` - AES-256 encryption key for sensitive data
- `KYC_ENCRYPTION_KEY` - KYC document encryption key

### 3. Database Credentials (CRITICAL)
**Rotation:** Every 90 days
**Impact if compromised:** Full database access
**Secrets:**
- `POSTGRES_PASSWORD` - Database password
- `DATABASE_URL` - Full connection string

### 4. Cache/Redis (MEDIUM)
**Rotation:** Every 90 days
**Impact if compromised:** Session hijacking, cache poisoning
**Secrets:**
- `REDIS_PASSWORD` - Redis authentication
- `REDIS_URL` - Redis connection string

### 5. Payment Providers (CRITICAL)
**Rotation:** As needed per provider policy
**Impact if compromised:** Financial fraud
**Secrets:**
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `PAYPAL_CLIENT_ID` - PayPal OAuth client
- `PAYPAL_CLIENT_SECRET` - PayPal OAuth secret

### 6. Email Service (HIGH)
**Rotation:** As needed
**Impact if compromised:** Email spoofing, spam
**Secrets:**
- `SENDGRID_API_KEY` - SendGrid API authentication

### 7. OAuth Providers (MEDIUM)
**Rotation:** As needed
**Impact if compromised:** Account takeover via social login
**Secrets:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`

### 8. AI Services (LOW)
**Rotation:** As needed
**Impact if compromised:** API abuse, cost increase
**Secrets:**
- `OPENAI_API_KEY` - OpenAI API key

### 9. Internal Services (HIGH)
**Rotation:** Every 90 days
**Impact if compromised:** Internal API access
**Secrets:**
- `INTERNAL_API_KEY` - Service-to-service authentication
- `WEBHOOK_SECRET` - Webhook signature verification

### 10. Monitoring (LOW)
**Rotation:** As needed
**Impact if compromised:** Monitoring data access
**Secrets:**
- `SENTRY_DSN` - Error tracking
- `DATADOG_API_KEY` - Monitoring service

---

## Architecture

### Three-Tier Secret Management

```
┌─────────────────────────────────────────────────────────┐
│                   Azure Key Vault                        │
│  (Primary Secret Store - Source of Truth)               │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
┌─────────▼─────────┐   ┌────────▼──────────┐
│ External Secrets  │   │  CSI Driver        │
│ Operator (ESO)    │   │  (Alternative)     │
└─────────┬─────────┘   └────────┬──────────┘
          │                      │
          └───────────┬──────────┘
                      │
          ┌───────────▼───────────┐
          │ Kubernetes Secrets    │
          │ (broxiva-secrets)     │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │    Application Pods   │
          │ (envFrom / env vars)  │
          └───────────────────────┘
```

### Secret Boundaries

**Auth Boundary:**
- JWT secrets
- Session secrets
- OAuth credentials

**Data Boundary:**
- Database credentials
- Encryption keys
- KYC encryption keys

**Payment Boundary:**
- Stripe keys
- PayPal credentials
- Apple/Google IAP keys

**Infrastructure Boundary:**
- Redis credentials
- RabbitMQ credentials
- Internal API keys

---

## Required Secrets

### Minimal Production Deployment

These secrets MUST be set before production deployment:

1. **Authentication (3 secrets)**
   ```bash
   JWT_SECRET
   JWT_REFRESH_SECRET
   SESSION_SECRET
   ```

2. **Encryption (2 secrets)**
   ```bash
   ENCRYPTION_KEY
   KYC_ENCRYPTION_KEY
   ```

3. **Database (2 secrets)**
   ```bash
   POSTGRES_PASSWORD
   DATABASE_URL
   ```

4. **Cache (2 secrets)**
   ```bash
   REDIS_PASSWORD
   REDIS_URL
   ```

5. **Payment (2 secrets minimum)**
   ```bash
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   ```

6. **Email (1 secret)**
   ```bash
   SENDGRID_API_KEY
   ```

7. **Internal (1 secret)**
   ```bash
   INTERNAL_API_KEY
   ```

**Total: 13 critical secrets minimum**

### Optional Secrets

Enable as features are deployed:
- OAuth provider secrets (social login)
- AI service keys (recommendations)
- Monitoring service keys (observability)

---

## Setup Instructions

### 1. Deploy Azure Key Vault

```bash
# Navigate to infrastructure directory
cd infrastructure/azure

# Deploy Key Vault using Bicep
az deployment group create \
  --resource-group broxiva-production-rg \
  --template-file broxiva-keyvault.bicep \
  --parameters environment=production \
  --parameters location=eastus \
  --parameters enablePurgeProtection=true \
  --parameters softDeleteRetentionDays=90
```

### 2. Generate Secrets

```bash
# Use the provided script to generate secure random values
./scripts/generate-secrets.sh --environment production --output secrets.env

# Review generated secrets
cat secrets.env

# DO NOT commit secrets.env to git!
```

### 3. Upload Secrets to Key Vault

```bash
# Use the sync script to upload secrets
./scripts/sync-keyvault-secrets.sh \
  --vault-name broxiva-production-kv \
  --secrets-file secrets.env \
  --validate

# Verify secrets are in Key Vault
az keyvault secret list --vault-name broxiva-production-kv
```

### 4. Configure Workload Identity

```bash
# Create managed identity for AKS
az identity create \
  --name broxiva-production-identity \
  --resource-group broxiva-production-rg

# Get identity client ID
IDENTITY_CLIENT_ID=$(az identity show \
  --name broxiva-production-identity \
  --resource-group broxiva-production-rg \
  --query clientId -o tsv)

# Grant Key Vault access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $IDENTITY_CLIENT_ID \
  --scope /subscriptions/{subscription-id}/resourceGroups/broxiva-production-rg/providers/Microsoft.KeyVault/vaults/broxiva-production-kv
```

### 5. Install External Secrets Operator

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io

# Install operator
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# Verify installation
kubectl get pods -n external-secrets-system
```

### 6. Deploy External Secrets Configuration

```bash
# Update external-secrets-broxiva.yaml with your values:
# - REPLACE_WITH_MANAGED_IDENTITY_CLIENT_ID
# - REPLACE_WITH_AZURE_TENANT_ID

# Apply configuration
kubectl apply -f infrastructure/kubernetes/production/external-secrets-broxiva.yaml

# Verify ExternalSecrets are syncing
kubectl get externalsecrets -n broxiva-production
kubectl describe externalsecret broxiva-all-secrets -n broxiva-production

# Verify Kubernetes secrets were created
kubectl get secrets -n broxiva-production
kubectl describe secret broxiva-secrets -n broxiva-production
```

### 7. Validate Secrets

```bash
# Run validation script
./scripts/validate-secrets.sh \
  --namespace broxiva-production \
  --secret-name broxiva-secrets

# Check for missing secrets
./scripts/validate-secrets.sh --check-required
```

---

## Secret Rotation

### Rotation Schedule

| Secret Type | Rotation Frequency | Automated | Risk Level |
|-------------|-------------------|-----------|------------|
| JWT Secrets | 90 days | Yes | CRITICAL |
| Session Secret | 90 days | Yes | CRITICAL |
| Database Password | 90 days | Yes | CRITICAL |
| Redis Password | 90 days | Yes | MEDIUM |
| Internal API Key | 90 days | Yes | HIGH |
| Encryption Keys | NEVER | No | CRITICAL |
| Payment Keys | As needed | No | CRITICAL |
| OAuth Secrets | 180 days | No | MEDIUM |
| Email API Key | As needed | No | HIGH |
| AI API Keys | As needed | No | LOW |

### Automated Rotation Process

#### Step 1: Generate New Secret

```bash
# Rotate JWT secrets (example)
./scripts/rotate-secrets.sh \
  --secret-type jwt \
  --namespace broxiva-production \
  --vault-name broxiva-production-kv \
  --dry-run

# Review changes, then execute
./scripts/rotate-secrets.sh \
  --secret-type jwt \
  --namespace broxiva-production \
  --vault-name broxiva-production-kv
```

#### Step 2: Update Key Vault

The rotation script automatically:
1. Generates new secret value
2. Updates Azure Key Vault
3. Tags with rotation date
4. Triggers External Secrets sync

#### Step 3: Verify Sync

```bash
# External Secrets Operator syncs within 1 hour (default)
# Force immediate sync:
kubectl annotate externalsecret broxiva-all-secrets \
  -n broxiva-production \
  force-sync="$(date +%s)"

# Verify new secret value
kubectl get secret broxiva-secrets -n broxiva-production -o yaml
```

#### Step 4: Rolling Restart

```bash
# Restart pods to pick up new secrets
kubectl rollout restart deployment broxiva-api -n broxiva-production
kubectl rollout status deployment broxiva-api -n broxiva-production
```

### Manual Rotation (Payment Providers)

For externally managed secrets (Stripe, PayPal):

1. **Generate new key in provider dashboard**
2. **Test with staging environment**
3. **Update Key Vault:**
   ```bash
   az keyvault secret set \
     --vault-name broxiva-production-kv \
     --name stripe-secret-key \
     --value "sk_live_NEW_KEY_VALUE"
   ```
4. **Wait for sync (or force)**
5. **Restart deployments**
6. **Revoke old key in provider dashboard**

### Emergency Rotation

If a secret is compromised:

```bash
# Emergency rotation (immediate)
./scripts/rotate-secrets.sh \
  --secret-type all \
  --namespace broxiva-production \
  --vault-name broxiva-production-kv \
  --emergency \
  --force-sync

# This will:
# 1. Generate all new secrets
# 2. Update Key Vault immediately
# 3. Force sync to Kubernetes
# 4. Restart all deployments
# 5. Send alerts to security team
```

---

## Key Vault Integration

### Access Patterns

#### Pattern 1: External Secrets Operator (Recommended)

**Use when:**
- Multiple pods need same secrets
- GitOps workflow (ArgoCD/Flux)
- Automated rotation required
- Standard deployment

**Configuration:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: broxiva-all-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault-broxiva
  target:
    name: broxiva-secrets
```

**Pros:**
- Easy to use
- Secrets available to all pods
- Good for GitOps

**Cons:**
- Secrets stored in etcd (encrypted)
- Requires operator installation

#### Pattern 2: CSI Driver

**Use when:**
- Maximum security required
- Secrets should never touch etcd
- Ephemeral secrets needed
- Critical encryption keys

**Configuration:**
```yaml
volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      volumeAttributes:
        secretProviderClass: "broxiva-all-secrets-csi"
```

**Pros:**
- Secrets never in etcd
- Direct from Key Vault
- More secure

**Cons:**
- More complex setup
- Each pod needs volume mount
- Harder to troubleshoot

### Hybrid Approach (Recommended)

Use both patterns:
- **ESO** for regular secrets (JWT, database, API keys)
- **CSI** for encryption keys (ENCRYPTION_KEY, KYC_ENCRYPTION_KEY)

```yaml
# Deployment with both methods
spec:
  containers:
    - name: api
      envFrom:
        - secretRef:
            name: broxiva-secrets  # From ESO
      volumeMounts:
        - name: encryption-keys
          mountPath: "/mnt/encryption"  # From CSI
  volumes:
    - name: encryption-keys
      csi:
        driver: secrets-store.csi.k8s.io
        volumeAttributes:
          secretProviderClass: "broxiva-encryption-keys-csi"
```

---

## Troubleshooting

### ExternalSecret Not Syncing

**Symptom:** ExternalSecret shows error status

**Check:**
```bash
kubectl describe externalsecret broxiva-all-secrets -n broxiva-production
```

**Common Issues:**

1. **Key Vault access denied**
   ```bash
   # Verify workload identity
   kubectl get serviceaccount broxiva-external-secrets-sa -n broxiva-production -o yaml

   # Check RBAC in Azure
   az role assignment list \
     --assignee <identity-client-id> \
     --scope /subscriptions/.../vaults/broxiva-production-kv
   ```

2. **Secret not found in Key Vault**
   ```bash
   # List all secrets
   az keyvault secret list --vault-name broxiva-production-kv

   # Check specific secret
   az keyvault secret show \
     --vault-name broxiva-production-kv \
     --name jwt-access-secret
   ```

3. **Network policy blocking access**
   ```bash
   # Check Key Vault firewall
   az keyvault network-rule list \
     --vault-name broxiva-production-kv
   ```

### Kubernetes Secret Not Created

**Symptom:** ExternalSecret is healthy but K8s secret doesn't exist

**Check:**
```bash
# Check External Secrets Operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets

# Check events
kubectl get events -n broxiva-production \
  --field-selector involvedObject.name=broxiva-all-secrets
```

### Pods Can't Access Secrets

**Symptom:** Application fails with "secret not found"

**Check:**
```bash
# Verify secret exists
kubectl get secret broxiva-secrets -n broxiva-production

# Check pod configuration
kubectl get pod <pod-name> -n broxiva-production -o yaml | grep -A 20 "envFrom"

# Check environment variables in pod
kubectl exec -it <pod-name> -n broxiva-production -- env | grep JWT_SECRET
```

### CSI Driver Issues

**Symptom:** Pod stuck in ContainerCreating with CSI mount error

**Check:**
```bash
# Check CSI driver pods
kubectl get pods -n kube-system -l app=csi-secrets-store

# Check pod events
kubectl describe pod <pod-name> -n broxiva-production

# Check SecretProviderClass
kubectl get secretproviderclass -n broxiva-production
kubectl describe secretproviderclass broxiva-all-secrets-csi -n broxiva-production
```

---

## Security Best Practices

### 1. Never Commit Secrets to Git

```bash
# Add to .gitignore
echo "*.env" >> .gitignore
echo "secrets.yaml" >> .gitignore
echo ".env.production" >> .gitignore

# Scan for accidentally committed secrets
git secrets --scan
```

### 2. Enable Audit Logging

All Key Vault access is logged to Log Analytics:

```bash
# Query Key Vault access logs
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.KEYVAULT'
    | where TimeGenerated > ago(24h)
    | project TimeGenerated, OperationName, CallerIPAddress, ResultType
  "
```

### 3. Use Least Privilege RBAC

```bash
# Only grant "Key Vault Secrets User" (read-only)
# Never grant "Key Vault Secrets Officer" to applications

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <identity> \
  --scope <key-vault-id>
```

### 4. Enable Soft Delete & Purge Protection

```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  properties: {
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true  // CRITICAL for production
  }
}
```

### 5. Network Restrictions

```bash
# Restrict Key Vault access to AKS subnet
az keyvault network-rule add \
  --name broxiva-production-kv \
  --subnet /subscriptions/.../subnets/aks-subnet
```

### 6. Monitor Secret Access

Set up alerts for:
- Failed secret access attempts
- Secret modifications
- ExternalSecret sync failures
- Unusual access patterns

### 7. Secret Rotation Reminders

```bash
# Set up automated rotation reminders
# Check secrets.yaml annotations for rotation-due dates
kubectl get externalsecrets -n broxiva-production -o yaml | grep "rotation-schedule"
```

---

## Disaster Recovery

### Backup Strategy

#### 1. Key Vault Backups

Azure Key Vault has built-in soft delete (90 days retention):

```bash
# List deleted secrets (recoverable)
az keyvault secret list-deleted --vault-name broxiva-production-kv

# Recover deleted secret
az keyvault secret recover \
  --vault-name broxiva-production-kv \
  --name jwt-access-secret
```

#### 2. Export Secrets (Encrypted Backup)

```bash
# Export all secrets to encrypted file (for DR purposes)
./scripts/backup-secrets.sh \
  --vault-name broxiva-production-kv \
  --output backups/secrets-$(date +%Y%m%d).enc \
  --encrypt-with-key /path/to/backup-key.pem

# Store encrypted backup in secure location (offline)
```

#### 3. Document Recovery Procedures

Keep printed copy of:
- Key Vault names and resource groups
- Managed identity client IDs
- Emergency access procedures
- Encryption key backup locations

### Recovery Scenarios

#### Scenario 1: Key Vault Accidentally Deleted

**Recovery Time:** < 1 hour

```bash
# Recover soft-deleted Key Vault
az keyvault recover \
  --name broxiva-production-kv \
  --resource-group broxiva-production-rg

# Verify all secrets are intact
az keyvault secret list --vault-name broxiva-production-kv
```

#### Scenario 2: Critical Secret Deleted

**Recovery Time:** < 15 minutes

```bash
# Recover specific secret
az keyvault secret recover \
  --vault-name broxiva-production-kv \
  --name jwt-access-secret

# Force ExternalSecret sync
kubectl annotate externalsecret broxiva-all-secrets \
  -n broxiva-production \
  force-sync="$(date +%s)"
```

#### Scenario 3: Complete Region Failure

**Recovery Time:** 2-4 hours

```bash
# Restore from encrypted backup
./scripts/restore-secrets.sh \
  --backup-file backups/secrets-20251213.enc \
  --decrypt-with-key /path/to/backup-key.pem \
  --vault-name broxiva-production-kv-dr \
  --region westus2

# Update ExternalSecret to point to DR vault
kubectl patch secretstore azure-keyvault-broxiva \
  -n broxiva-production \
  --type merge \
  -p '{"spec":{"provider":{"azurekv":{"vaultUrl":"https://broxiva-production-kv-dr.vault.azure.net"}}}}'
```

#### Scenario 4: Encryption Key Lost

**Impact:** PERMANENT DATA LOSS

**Prevention:**
1. NEVER rotate encryption keys without migration
2. Keep offline encrypted backup of encryption keys
3. Test recovery procedures quarterly
4. Document key locations in secure vault

**If Key is Lost:**
- Encrypted data is UNRECOVERABLE
- Must start fresh with new key
- Inform all affected users
- Implement data re-collection procedures

---

## Appendix

### Secret Generation Commands

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

### Useful Commands

```bash
# List all ExternalSecrets
kubectl get externalsecrets -A

# Force sync specific ExternalSecret
kubectl annotate externalsecret <name> -n <namespace> force-sync="$(date +%s)"

# View secret value (base64 decoded)
kubectl get secret <name> -n <namespace> -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Check External Secrets Operator health
kubectl get pods -n external-secrets-system
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets

# Verify Workload Identity configuration
kubectl get serviceaccount -n broxiva-production
kubectl describe serviceaccount broxiva-external-secrets-sa -n broxiva-production
```

### Support Contacts

- **Security Team:** security@broxiva.com
- **DevOps On-Call:** oncall@broxiva.com
- **Azure Support:** https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade

---

**Document Version:** 1.0.0
**Last Review:** 2025-12-13
**Next Review:** 2026-03-13
