# GitHub OIDC Setup for Azure Authentication

## Overview

This document describes how to configure OpenID Connect (OIDC) federation between GitHub Actions and Azure, enabling passwordless authentication without storing long-lived credentials.

## Prerequisites

- Azure subscription: `ba233460-2dbe-4603-a594-68f93ec9deb3`
- Azure AD tenant: `ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0`
- GitHub repository (to be created)
- Azure CLI installed

## Step 1: Create Azure AD App Registration

```bash
# Create the app registration
az ad app create --display-name "Broxiva-GitHub-OIDC"

# Note the appId from output - this is your AZURE_CLIENT_ID
```

## Step 2: Create Service Principal

```bash
# Replace <APP_ID> with the appId from Step 1
az ad sp create --id <APP_ID>
```

## Step 3: Assign Roles to Service Principal

```bash
APP_ID="<your-app-id>"
SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"

# Assign Contributor role at subscription level
az role assignment create \
  --assignee $APP_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Assign AcrPush role for container registry
az role assignment create \
  --assignee $APP_ID \
  --role "AcrPush" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/broxiva-acr-rg/providers/Microsoft.ContainerRegistry/registries/broxivaacr"

# Assign Azure Kubernetes Service Cluster User Role
az role assignment create \
  --assignee $APP_ID \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Assign Key Vault Secrets User (for secret access)
az role assignment create \
  --assignee $APP_ID \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

## Step 4: Configure Federated Credentials

Create federated credentials for each GitHub environment and branch:

### For Main Branch

```bash
APP_OBJECT_ID=$(az ad app show --id $APP_ID --query id -o tsv)
GITHUB_ORG="<your-github-org>"
GITHUB_REPO="Broxiva"

# Main branch credential
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':ref:refs/heads/main",
    "description": "GitHub Actions - Main Branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### For Develop Branch

```bash
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-develop-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':ref:refs/heads/develop",
    "description": "GitHub Actions - Develop Branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### For Pull Requests

```bash
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-pull-requests",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':pull_request",
    "description": "GitHub Actions - Pull Requests",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### For Environments

```bash
# Dev Environment
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-env-dev",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':environment:dev",
    "description": "GitHub Actions - Dev Environment",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Staging Environment
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-env-staging",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':environment:staging",
    "description": "GitHub Actions - Staging Environment",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Production Environment
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-env-production",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':environment:production",
    "description": "GitHub Actions - Production Environment",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

## Step 5: Configure GitHub Repository Secrets

Add these secrets to your GitHub repository:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_CLIENT_ID` | `<app-id>` | Azure AD App Registration ID |
| `AZURE_TENANT_ID` | `ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0` | Azure AD Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | `ba233460-2dbe-4603-a594-68f93ec9deb3` | Azure Subscription ID |

## Step 6: Configure GitHub Environments

Create these environments in GitHub repository settings:

### Development Environment (`dev`)
- No protection rules required
- Add environment-specific secrets if needed

### Staging Environment (`staging`)
- Optional: Add required reviewers
- Optional: Add wait timer
- Deployment branches: `main`, `develop`

### Production Environment (`production`)
- Required reviewers: Add 1-2 approvers
- Wait timer: 5 minutes (recommended)
- Deployment branches: `main` only

## Usage in GitHub Actions

### Basic Azure Login

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### With Environment

```yaml
jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment: production  # Uses environment-specific federated credential
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### ACR Login with OIDC

```yaml
- name: Azure Login
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- name: Login to ACR
  run: az acr login --name broxivaacr
```

### AKS Credentials with OIDC

```yaml
- name: Azure Login
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- name: Get AKS Credentials
  run: |
    az aks get-credentials \
      --resource-group broxiva-prod-rg \
      --name broxiva-prod-aks \
      --overwrite-existing
```

## Verification

After setup, verify the configuration:

```bash
# List federated credentials
az ad app federated-credential list --id $APP_OBJECT_ID

# List role assignments
az role assignment list --assignee $APP_ID --output table
```

## Security Best Practices

1. **Principle of Least Privilege**: Only assign necessary roles
2. **Environment Isolation**: Use separate federated credentials per environment
3. **Audit Logging**: Enable Azure AD sign-in logs
4. **Regular Review**: Periodically review role assignments
5. **No Long-Lived Secrets**: OIDC eliminates need for client secrets

## Troubleshooting

### Error: "AADSTS70021: No matching federated identity record found"

- Verify the subject claim matches exactly
- Check the GitHub organization and repository names
- Ensure the branch or environment name is correct

### Error: "Authorization failed"

- Verify role assignments are correct
- Check that the subscription ID is correct
- Ensure the app registration has the required API permissions

---

*Document Created: 2025-12-10*
