# Broxiva Secrets Management - Quick Start Guide

**Time to complete:** 30-45 minutes
**Prerequisites:** Azure subscription, AKS cluster, kubectl, Azure CLI

---

## 1. Deploy Azure Key Vault (5 minutes)

```bash
# Navigate to infrastructure directory
cd infrastructure/azure

# Deploy Key Vault
az deployment group create \
  --resource-group broxiva-production-rg \
  --template-file broxiva-keyvault.bicep \
  --parameters environment=production \
  --parameters location=eastus \
  --parameters enablePurgeProtection=true

# Save the outputs
VAULT_NAME=$(az deployment group show \
  --resource-group broxiva-production-rg \
  --name broxiva-keyvault \
  --query properties.outputs.keyVaultName.value -o tsv)

echo "Key Vault created: $VAULT_NAME"
```

---

## 2. Generate Secrets (10 minutes)

Create a file `secrets.env` with the following content:

```bash
# Authentication & Session
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Encryption Keys (CRITICAL - backup offline!)
ENCRYPTION_KEY=$(openssl rand -hex 32)
KYC_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Database
POSTGRES_PASSWORD=$(openssl rand -base64 48 | tr -d '\n' | head -c 32)
DATABASE_URL=postgresql://broxiva:${POSTGRES_PASSWORD}@postgres.broxiva-production.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require

# Redis
REDIS_PASSWORD=$(openssl rand -base64 48 | tr -d '\n' | head -c 32)
REDIS_URL=redis://:${REDIS_PASSWORD}@redis.broxiva-production.svc.cluster.local:6379

# Internal
INTERNAL_API_KEY=$(openssl rand -base64 60 | tr -d '\n' | head -c 40)
WEBHOOK_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Payment (set these manually from provider dashboards)
STRIPE_SECRET_KEY=sk_live_REPLACE_WITH_REAL_VALUE
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_REAL_VALUE

# Email (set from SendGrid)
SENDGRID_API_KEY=SG.REPLACE_WITH_REAL_VALUE

# AI (optional - set from OpenAI)
OPENAI_API_KEY=sk-proj-REPLACE_WITH_REAL_VALUE
```

**Important:**
- Replace REPLACE_WITH_REAL_VALUE with actual values from provider dashboards
- Backup ENCRYPTION_KEY and KYC_ENCRYPTION_KEY securely offline
- Never commit secrets.env to Git

---

## 3. Sync Secrets to Key Vault (5 minutes)

```bash
cd infrastructure/scripts

# Validate secrets file
./sync-keyvault-secrets.sh \
  --vault-name $VAULT_NAME \
  --secrets-file ../secrets.env \
  --validate \
  --dry-run

# Sync to Key Vault (creates automatic backup)
./sync-keyvault-secrets.sh \
  --vault-name $VAULT_NAME \
  --secrets-file ../secrets.env \
  --validate

# Verify secrets in Key Vault
az keyvault secret list --vault-name $VAULT_NAME --query "[].name" -o table
```

---

## 4. Setup Workload Identity (10 minutes)

```bash
# Create managed identity for AKS
az identity create \
  --name broxiva-production-identity \
  --resource-group broxiva-production-rg \
  --location eastus

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show \
  --name broxiva-production-identity \
  --resource-group broxiva-production-rg \
  --query clientId -o tsv)

IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name broxiva-production-identity \
  --resource-group broxiva-production-rg \
  --query principalId -o tsv)

TENANT_ID=$(az account show --query tenantId -o tsv)

echo "Client ID: $IDENTITY_CLIENT_ID"
echo "Principal ID: $IDENTITY_PRINCIPAL_ID"
echo "Tenant ID: $TENANT_ID"

# Grant Key Vault access
VAULT_ID=$(az keyvault show \
  --name $VAULT_NAME \
  --query id -o tsv)

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --scope $VAULT_ID

# Enable workload identity on AKS (if not already enabled)
AKS_NAME=broxiva-production-aks
AKS_RG=broxiva-production-rg

az aks update \
  --resource-group $AKS_RG \
  --name $AKS_NAME \
  --enable-workload-identity \
  --enable-oidc-issuer

# Get OIDC issuer URL
OIDC_ISSUER=$(az aks show \
  --resource-group $AKS_RG \
  --name $AKS_NAME \
  --query oidcIssuerProfile.issuerUrl -o tsv)

# Create federated identity credential
az identity federated-credential create \
  --name broxiva-production-fed-credential \
  --identity-name broxiva-production-identity \
  --resource-group broxiva-production-rg \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:broxiva-production:broxiva-external-secrets-sa
```

---

## 5. Install External Secrets Operator (5 minutes)

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets Operator
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=external-secrets \
  -n external-secrets-system \
  --timeout=300s

# Verify installation
kubectl get pods -n external-secrets-system
```

---

## 6. Deploy External Secrets Configuration (5 minutes)

```bash
cd infrastructure/kubernetes/production

# Update external-secrets-broxiva.yaml with your values
sed -i "s/REPLACE_WITH_MANAGED_IDENTITY_CLIENT_ID/$IDENTITY_CLIENT_ID/g" external-secrets-broxiva.yaml
sed -i "s/REPLACE_WITH_AZURE_TENANT_ID/$TENANT_ID/g" external-secrets-broxiva.yaml
sed -i "s/broxiva-production-kv/$VAULT_NAME/g" external-secrets-broxiva.yaml

# Apply configuration
kubectl apply -f external-secrets-broxiva.yaml

# Wait for secrets to sync (may take 1-2 minutes)
kubectl wait --for=condition=Ready externalsecret/broxiva-all-secrets \
  -n broxiva-production \
  --timeout=300s

# Verify ExternalSecret status
kubectl get externalsecrets -n broxiva-production
kubectl describe externalsecret broxiva-all-secrets -n broxiva-production

# Verify Kubernetes secret was created
kubectl get secret broxiva-secrets -n broxiva-production
```

---

## 7. Validate Everything (5 minutes)

```bash
cd infrastructure/scripts

# Run full validation
./validate-secrets.sh \
  --namespace broxiva-production \
  --check-keyvault \
  --vault-name $VAULT_NAME

# Expected output:
# ✓ All critical validations passed!
```

---

## 8. Deploy Applications

Your applications can now access secrets:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broxiva-api
  namespace: broxiva-production
spec:
  template:
    spec:
      containers:
        - name: api
          image: broxivaacr.azurecr.io/broxiva-api:latest
          # Option 1: Load all secrets
          envFrom:
            - secretRef:
                name: broxiva-secrets

          # Option 2: Load specific secrets
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: broxiva-secrets
                  key: JWT_SECRET
```

---

## Troubleshooting

### ExternalSecret not syncing

```bash
# Check External Secrets Operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets \
  --tail=100

# Check ExternalSecret events
kubectl get events -n broxiva-production \
  --field-selector involvedObject.name=broxiva-all-secrets

# Force sync
kubectl annotate externalsecret broxiva-all-secrets \
  -n broxiva-production \
  force-sync="$(date +%s)"
```

### Workload Identity not working

```bash
# Verify service account annotations
kubectl get serviceaccount broxiva-external-secrets-sa \
  -n broxiva-production -o yaml

# Should show:
# annotations:
#   azure.workload.identity/client-id: <your-client-id>
#   azure.workload.identity/tenant-id: <your-tenant-id>

# Verify federated credential
az identity federated-credential list \
  --identity-name broxiva-production-identity \
  --resource-group broxiva-production-rg
```

### Key Vault access denied

```bash
# Check RBAC assignment
az role assignment list \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --scope $VAULT_ID

# Should show "Key Vault Secrets User" role

# Check Key Vault network rules
az keyvault network-rule list --name $VAULT_NAME
```

---

## Next Steps

1. **Set Real Values**: Update provider-managed secrets (Stripe, SendGrid, etc.)
2. **Backup Encryption Keys**: Store ENCRYPTION_KEY and KYC_ENCRYPTION_KEY offline
3. **Setup Rotation**: Schedule rotation using cron or Azure Functions
4. **Monitor**: Setup alerts for ExternalSecret sync failures
5. **Deploy Apps**: Deploy your applications that use the secrets

---

## Maintenance

### Rotate Secrets (every 90 days)

```bash
cd infrastructure/scripts

# Rotate JWT secrets
./rotate-secrets.sh \
  --vault-name $VAULT_NAME \
  --secret-type jwt \
  --force-sync \
  --restart-deployments

# Rotate all secrets (emergency)
./rotate-secrets.sh \
  --vault-name $VAULT_NAME \
  --secret-type all \
  --emergency
```

### Update Provider Secrets

```bash
# Example: Update Stripe secret
az keyvault secret set \
  --vault-name $VAULT_NAME \
  --name stripe-secret-key \
  --value "sk_live_NEW_VALUE"

# Force sync
kubectl annotate externalsecret broxiva-all-secrets \
  -n broxiva-production \
  force-sync="$(date +%s)"
```

---

## Reference

- **Full Documentation**: `infrastructure/docs/SECRETS_MANAGEMENT.md`
- **Scripts Help**: Run any script with `--help` flag
- **Kubernetes Docs**: https://external-secrets.io/
- **Azure Key Vault**: https://learn.microsoft.com/en-us/azure/key-vault/

---

**You're all set!** Your secrets are now securely managed with automatic sync from Azure Key Vault to Kubernetes.
