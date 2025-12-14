# Broxiva Production Key Vaults Deployment Guide

This guide provides step-by-step instructions for deploying the specialized production Key Vaults for authentication, data, and payment secrets.

## Overview

Three specialized Key Vaults are created for production:

1. **broxiva-prod-auth-kv** - Authentication & Authorization secrets
2. **broxiva-prod-data-kv** - Data layer secrets & encryption keys
3. **broxiva-prod-payment-kv** - Payment processing secrets (PCI-DSS compliant)

## Prerequisites

### Required Tools

**Terraform Deployment:**
- Terraform >= 1.5.0
- Azure CLI >= 2.50.0
- Azure subscription with appropriate permissions

**Bicep Deployment:**
- Azure CLI >= 2.50.0
- Bicep CLI (included with Azure CLI)

### Required Permissions

Azure RBAC roles needed:
- `Key Vault Contributor` on the resource group
- `User Access Administrator` on the resource group (for RBAC assignments)
- `Contributor` on the subscription (for diagnostics)

### Required Information

Before deployment, gather:
1. AKS Managed Identity Object IDs:
   - API pods managed identity
   - Worker pods managed identity
   - Payment service managed identity
2. Subnet IDs:
   - AKS cluster subnet
   - Payment service subnet (if separated)
3. Log Analytics Workspace ID (for diagnostics)

## Getting Required Information

### 1. Find Managed Identity Object IDs

```bash
# For AKS cluster managed identity
az aks show --resource-group <rg-name> --name <aks-name> \
  --query identityProfile.kubeletidentity.objectId -o tsv

# For workload identities (after AAD Workload Identity is enabled)
az identity show --resource-group <rg-name> --name <identity-name> \
  --query principalId -o tsv

# List all managed identities in resource group
az identity list --resource-group <rg-name> --output table
```

### 2. Find Subnet IDs

```bash
# List all subnets in a vnet
az network vnet subnet list --resource-group <rg-name> --vnet-name <vnet-name> --output table

# Get specific subnet ID
az network vnet subnet show --resource-group <rg-name> \
  --vnet-name <vnet-name> --name <subnet-name> \
  --query id -o tsv
```

### 3. Find Log Analytics Workspace ID

```bash
# List workspaces
az monitor log-analytics workspace list --output table

# Get workspace ID
az monitor log-analytics workspace show --resource-group <rg-name> \
  --workspace-name <workspace-name> --query id -o tsv
```

## Deployment Option 1: Terraform

### Step 1: Configure Variables

Create or update `terraform.tfvars`:

```hcl
# terraform.tfvars
environment         = "production"
project_name        = "broxiva"
location            = "eastus"
resource_group_name = "broxiva-prod-rg"

# Managed Identity Object IDs (get from prerequisites)
api_managed_identity_id     = "00000000-0000-0000-0000-000000000000"
worker_managed_identity_id  = "11111111-1111-1111-1111-111111111111"
payment_service_managed_identity_id = "22222222-2222-2222-2222-222222222222"

# Network Configuration
aks_subnet_id = "/subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.Network/virtualNetworks/VNET/subnets/aks-subnet"
payment_service_subnet_id = "/subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.Network/virtualNetworks/VNET/subnets/payment-subnet"
```

### Step 2: Initialize Terraform

```bash
cd infrastructure/azure
terraform init
```

### Step 3: Plan Deployment

```bash
# Review the plan
terraform plan -var-file="terraform.tfvars" -target=azurerm_key_vault.prod_auth -target=azurerm_key_vault.prod_data -target=azurerm_key_vault.prod_payment

# Or use the specialized file
terraform plan -var-file="terraform.tfvars" -target=module.production_key_vaults
```

### Step 4: Deploy Key Vaults

```bash
# Deploy all production key vaults
terraform apply -var-file="terraform.tfvars" \
  -target=azurerm_key_vault.prod_auth \
  -target=azurerm_key_vault.prod_data \
  -target=azurerm_key_vault.prod_payment

# Confirm with 'yes' when prompted
```

### Step 5: Verify Deployment

```bash
# Get outputs
terraform output

# Verify Key Vaults exist
az keyvault list --resource-group broxiva-prod-keyvaults-production --output table

# Check RBAC assignments
az role assignment list --scope $(terraform output -raw prod_auth_kv_id) --output table
```

## Deployment Option 2: Bicep

### Step 1: Create Parameters File

Create `key-vault-production.parameters.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": {
      "value": "eastus"
    },
    "environment": {
      "value": "production"
    },
    "projectName": {
      "value": "broxiva"
    },
    "deployerObjectId": {
      "value": "YOUR_OBJECT_ID"
    },
    "apiManagedIdentityId": {
      "value": "00000000-0000-0000-0000-000000000000"
    },
    "workerManagedIdentityId": {
      "value": "11111111-1111-1111-1111-111111111111"
    },
    "paymentServiceManagedIdentityId": {
      "value": "22222222-2222-2222-2222-222222222222"
    },
    "aksSubnetId": {
      "value": "/subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.Network/virtualNetworks/VNET/subnets/aks-subnet"
    },
    "paymentServiceSubnetId": {
      "value": "/subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.Network/virtualNetworks/VNET/subnets/payment-subnet"
    },
    "logAnalyticsWorkspaceId": {
      "value": "/subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.OperationalInsights/workspaces/WORKSPACE_NAME"
    }
  }
}
```

### Step 2: Get Your Object ID

```bash
# Get your current user object ID
az ad signed-in-user show --query id -o tsv

# Or get service principal object ID
az ad sp show --id <app-id> --query id -o tsv
```

### Step 3: Deploy with Bicep

```bash
cd infrastructure/azure

# Create resource group if it doesn't exist
az group create --name broxiva-prod-keyvaults-production --location eastus

# Deploy the Bicep template
az deployment group create \
  --resource-group broxiva-prod-keyvaults-production \
  --template-file key-vault-production-specialized.bicep \
  --parameters key-vault-production.parameters.json
```

### Step 4: Verify Deployment

```bash
# Check deployment status
az deployment group list --resource-group broxiva-prod-keyvaults-production --output table

# List Key Vaults
az keyvault list --resource-group broxiva-prod-keyvaults-production --output table

# Check a specific vault
az keyvault show --name broxiva-prod-auth-kv --query properties.networkAcls
```

## Post-Deployment Configuration

### 1. Add Secrets Manually

Some secrets need to be added manually (placeholders are created):

#### Authentication Vault
```bash
KV_AUTH="broxiva-prod-auth-kv"

# OAuth secrets (get from respective providers)
az keyvault secret set --vault-name $KV_AUTH --name oauth-google-client-secret --value "YOUR_GOOGLE_SECRET"
az keyvault secret set --vault-name $KV_AUTH --name oauth-facebook-app-secret --value "YOUR_FACEBOOK_SECRET"
az keyvault secret set --vault-name $KV_AUTH --name oauth-apple-client-secret --value "YOUR_APPLE_SECRET"
```

#### Payment Vault
```bash
KV_PAYMENT="broxiva-prod-payment-kv"

# Stripe secrets (get from Stripe dashboard)
az keyvault secret set --vault-name $KV_PAYMENT --name stripe-secret-key --value "sk_live_YOUR_KEY"
az keyvault secret set --vault-name $KV_PAYMENT --name stripe-publishable-key --value "pk_live_YOUR_KEY"
az keyvault secret set --vault-name $KV_PAYMENT --name stripe-webhook-secret --value "whsec_YOUR_SECRET"

# PayPal secrets (get from PayPal)
az keyvault secret set --vault-name $KV_PAYMENT --name paypal-client-secret --value "YOUR_PAYPAL_SECRET"
```

### 2. Configure Private Endpoints (Recommended for Production)

```bash
# Create private endpoint for auth vault
az network private-endpoint create \
  --name broxiva-auth-kv-pe \
  --resource-group broxiva-prod-keyvaults-production \
  --vnet-name <your-vnet> \
  --subnet <private-endpoint-subnet> \
  --private-connection-resource-id $(az keyvault show --name broxiva-prod-auth-kv --query id -o tsv) \
  --group-id vault \
  --connection-name auth-kv-connection

# Repeat for data and payment vaults
```

### 3. Configure Private DNS Zones

```bash
# Create private DNS zone for Key Vault
az network private-dns zone create \
  --resource-group broxiva-prod-keyvaults-production \
  --name privatelink.vaultcore.azure.net

# Link to VNet
az network private-dns link vnet create \
  --resource-group broxiva-prod-keyvaults-production \
  --zone-name privatelink.vaultcore.azure.net \
  --name broxiva-vnet-link \
  --virtual-network <your-vnet> \
  --registration-enabled false

# Create DNS records (automated via private endpoint DNS integration)
```

### 4. Configure Firewall Rules

If not using private endpoints, configure IP-based firewall:

```bash
# Allow specific IP ranges
az keyvault network-rule add \
  --name broxiva-prod-auth-kv \
  --ip-address <your-ip-range>

# Allow Azure services
az keyvault update \
  --name broxiva-prod-auth-kv \
  --bypass AzureServices
```

## Configure External Secrets Operator

### Step 1: Install External Secrets Operator

```bash
# Add Helm repo
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install to cluster
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

### Step 2: Configure Azure Workload Identity

```bash
# Enable Workload Identity on AKS (if not already enabled)
az aks update \
  --resource-group <rg-name> \
  --name <aks-name> \
  --enable-workload-identity \
  --enable-oidc-issuer

# Create managed identity for External Secrets
az identity create \
  --resource-group <rg-name> \
  --name external-secrets-identity

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show --resource-group <rg-name> --name external-secrets-identity --query clientId -o tsv)
IDENTITY_OBJECT_ID=$(az identity show --resource-group <rg-name> --name external-secrets-identity --query principalId -o tsv)

# Grant read access to Key Vaults
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $IDENTITY_OBJECT_ID \
  --scope $(az keyvault show --name broxiva-prod-auth-kv --query id -o tsv)

# Repeat for data and payment vaults
```

### Step 3: Configure Service Account

```yaml
# external-secrets-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: broxiva-production
  annotations:
    azure.workload.identity/client-id: <IDENTITY_CLIENT_ID>
    azure.workload.identity/tenant-id: <TENANT_ID>
```

```bash
kubectl apply -f external-secrets-sa.yaml
```

### Step 4: Create SecretStores

```yaml
# secret-stores.yaml
---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-auth-kv
  namespace: broxiva-production
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://broxiva-prod-auth-kv.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-data-kv
  namespace: broxiva-production
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://broxiva-prod-data-kv.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-payment-kv
  namespace: broxiva-production
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://broxiva-prod-payment-kv.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
```

```bash
kubectl apply -f secret-stores.yaml
```

### Step 5: Create ExternalSecrets

```yaml
# external-secrets.yaml
---
# Authentication secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: broxiva-auth-secrets
  namespace: broxiva-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-auth-kv
    kind: SecretStore
  target:
    name: broxiva-auth-secrets
    creationPolicy: Owner
  data:
    - secretKey: JWT_ACCESS_SECRET
      remoteRef:
        key: jwt-access-secret
    - secretKey: JWT_REFRESH_SECRET
      remoteRef:
        key: jwt-refresh-secret
    - secretKey: SESSION_SECRET
      remoteRef:
        key: session-secret
---
# Data secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: broxiva-data-secrets
  namespace: broxiva-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-data-kv
    kind: SecretStore
  target:
    name: broxiva-data-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: postgres-url
    - secretKey: REDIS_URL
      remoteRef:
        key: redis-url
    - secretKey: KYC_ENCRYPTION_KEY
      remoteRef:
        key: kyc-encryption-key
---
# Payment secrets (only for payment service)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: broxiva-payment-secrets
  namespace: broxiva-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-payment-kv
    kind: SecretStore
  target:
    name: broxiva-payment-secrets
    creationPolicy: Owner
  data:
    - secretKey: STRIPE_SECRET_KEY
      remoteRef:
        key: stripe-secret-key
    - secretKey: STRIPE_WEBHOOK_SECRET
      remoteRef:
        key: stripe-webhook-secret
```

```bash
kubectl apply -f external-secrets.yaml
```

## Verification

### Verify Key Vaults

```bash
# List all secrets in auth vault
az keyvault secret list --vault-name broxiva-prod-auth-kv --output table

# Check RBAC assignments
az role assignment list --scope $(az keyvault show --name broxiva-prod-auth-kv --query id -o tsv) --output table

# Verify network rules
az keyvault show --name broxiva-prod-auth-kv --query properties.networkAcls

# Check diagnostics
az monitor diagnostic-settings list --resource $(az keyvault show --name broxiva-prod-auth-kv --query id -o tsv)
```

### Verify External Secrets Sync

```bash
# Check SecretStore status
kubectl get secretstore -n broxiva-production

# Check ExternalSecret status
kubectl get externalsecret -n broxiva-production

# Describe for details
kubectl describe externalsecret broxiva-auth-secrets -n broxiva-production

# Verify secrets were created
kubectl get secrets -n broxiva-production | grep broxiva
```

## Secret Rotation

### Automated Rotation (Recommended)

```bash
# Enable Key Vault rotation policies (for supported secret types)
az keyvault secret set-attributes \
  --vault-name broxiva-prod-auth-kv \
  --name jwt-access-secret \
  --expires $(date -u -d "+90 days" '+%Y-%m-%dT%H:%M:%SZ')
```

### Manual Rotation

```bash
# Update secret value
az keyvault secret set \
  --vault-name broxiva-prod-auth-kv \
  --name jwt-access-secret \
  --value "NEW_SECRET_VALUE"

# External Secrets will automatically sync within refresh interval (1 hour)

# Force immediate sync by deleting the ExternalSecret
kubectl delete externalsecret broxiva-auth-secrets -n broxiva-production
kubectl apply -f external-secrets.yaml
```

## Troubleshooting

### Issue: Cannot access Key Vault

```bash
# Check network rules
az keyvault show --name broxiva-prod-auth-kv --query properties.networkAcls

# Check RBAC
az role assignment list --scope $(az keyvault show --name broxiva-prod-auth-kv --query id -o tsv)

# Check firewall logs
az monitor diagnostic-settings show \
  --resource $(az keyvault show --name broxiva-prod-auth-kv --query id -o tsv) \
  --name auth-kv-diagnostics
```

### Issue: External Secrets not syncing

```bash
# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets

# Check SecretStore status
kubectl describe secretstore azure-auth-kv -n broxiva-production

# Check workload identity
kubectl describe sa external-secrets -n broxiva-production
```

### Issue: Permission denied

```bash
# Verify managed identity has correct role
az role assignment list --assignee <managed-identity-object-id> --output table

# Grant missing permissions
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <managed-identity-object-id> \
  --scope $(az keyvault show --name broxiva-prod-auth-kv --query id -o tsv)
```

## Security Best Practices

1. **Enable Private Endpoints:** Always use private endpoints in production
2. **Network Restrictions:** Deny public access, allow only necessary networks
3. **RBAC:** Use RBAC instead of access policies for fine-grained control
4. **Soft Delete:** Keep enabled with 90-day retention
5. **Purge Protection:** Enable for production vaults
6. **Audit Logging:** Send to Log Analytics with 365-day retention
7. **Secret Rotation:** Implement 90-day rotation for auth secrets, 60-day for payment
8. **Separation:** Never mix PCI-scope secrets with non-PCI secrets
9. **Least Privilege:** Grant only necessary access to each identity
10. **Monitoring:** Set up alerts for vault access anomalies

## Compliance Notes

### PCI-DSS Requirements

The payment vault (`broxiva-prod-payment-kv`) is configured for PCI-DSS compliance:

- Premium SKU (HSM-backed)
- Network isolation (private endpoint required)
- 365-day audit log retention
- Separate RBAC (payment service only)
- 60-day secret rotation policy
- Purge protection enabled

### GDPR Requirements

The data vault (`broxiva-prod-data-kv`) supports GDPR:

- Encryption keys with prevent_destroy
- Audit logging for access tracking
- Right to be forgotten support (separate KYC encryption key)
- Data residency (Azure region selection)

## Next Steps

After deploying Key Vaults:

1. Configure AKS managed identities
2. Enable Azure AD Workload Identity
3. Deploy External Secrets Operator
4. Configure SecretStores and ExternalSecrets
5. Update application deployments to use secrets
6. Implement secret rotation schedule
7. Set up monitoring and alerts
8. Conduct security audit
9. Document incident response procedures
10. Train team on secret management

## Support

For issues or questions:
- Azure Support: Use Azure Portal support
- Internal: devops@broxiva.com
- Documentation: https://docs.broxiva.com/infrastructure/key-vaults

---

**Version:** 1.0
**Last Updated:** 2025-12-13
**Maintained By:** Broxiva DevOps Team
