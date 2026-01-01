# GitHub Secrets Required for Broxiva CI/CD Pipeline

This document provides a comprehensive list of all GitHub Secrets required for the Broxiva production pipeline and related workflows.

## Table of Contents

- [Overview](#overview)
- [Azure OIDC Authentication Secrets](#azure-oidc-authentication-secrets)
- [Turbo Cache Secrets](#turbo-cache-secrets)
- [Production Environment Secrets](#production-environment-secrets)
- [Terraform Infrastructure Secrets](#terraform-infrastructure-secrets)
- [Database Secrets](#database-secrets)
- [Security & Monitoring Secrets](#security--monitoring-secrets)
- [Third-Party Service Secrets](#third-party-service-secrets)
- [Secret Rotation Workflow Secrets](#secret-rotation-workflow-secrets)
- [Setting Up Azure OIDC Authentication](#setting-up-azure-oidc-authentication)
- [How to Add Secrets to GitHub](#how-to-add-secrets-to-github)
- [Secret Validation Checklist](#secret-validation-checklist)

---

## Overview

The Broxiva CI/CD pipeline uses GitHub Actions with Azure OIDC (OpenID Connect) authentication for secure, passwordless authentication to Azure resources. This eliminates the need to store long-lived credentials.

**Current Azure Configuration:**
- **Subscription ID:** `ba233460-2dbe-4603-a594-68f93ec9deb3`
- **Tenant ID:** `ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0`
- **Resource Group:** `broxiva-prod-rg`
- **ACR Name:** `broxivaprodacr`
- **AKS Cluster:** `broxiva-prod-aks`

---

## Azure OIDC Authentication Secrets

These are the core secrets required for Azure authentication across all workflows.

### AZURE_CLIENT_ID
- **Description:** The Application (client) ID of the Azure AD service principal configured for GitHub OIDC authentication
- **Used in:**
  - `broxiva-production.yml`
  - `terraform-plan.yml`
  - `terraform-apply-prod.yml`
  - `drift-detection.yml`
  - `drift-repair.yml`
  - `secret-rotation.yml`
  - `cost-anomaly-detection.yml`
- **How to obtain:**
  1. Go to Azure Portal → Azure Active Directory → App registrations
  2. Find your GitHub Actions service principal (e.g., "broxiva-github-actions")
  3. Copy the "Application (client) ID" value
- **Format:** UUID (e.g., `12345678-1234-1234-1234-123456789abc`)

### AZURE_TENANT_ID
- **Description:** The Azure Active Directory tenant ID
- **Used in:** All workflows that authenticate with Azure
- **Current Value:** `ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0`
- **How to obtain:**
  1. Go to Azure Portal → Azure Active Directory → Overview
  2. Copy the "Tenant ID" value
  3. Or run: `az account show --query tenantId -o tsv`
- **Format:** UUID

### AZURE_SUBSCRIPTION_ID
- **Description:** The Azure subscription ID where resources are deployed
- **Used in:** All workflows that manage Azure resources
- **Current Value:** `ba233460-2dbe-4603-a594-68f93ec9deb3`
- **How to obtain:**
  1. Go to Azure Portal → Subscriptions
  2. Copy your subscription ID
  3. Or run: `az account show --query id -o tsv`
- **Format:** UUID

---

## Turbo Cache Secrets

Used for caching build artifacts with Turborepo.

### TURBO_TOKEN
- **Description:** Authentication token for Turborepo remote cache
- **Used in:** `broxiva-production.yml`
- **How to obtain:**
  1. If using Vercel Remote Cache:
     - Go to Vercel Dashboard → Settings → Tokens
     - Create a new token with appropriate scope
  2. If using custom cache server:
     - Generate a secure token for your cache server
- **Format:** String token

### TURBO_TEAM
- **Description:** Team identifier for Turborepo remote cache
- **Used in:** `broxiva-production.yml`
- **How to obtain:**
  1. If using Vercel:
     - Your team slug from Vercel dashboard
  2. If using custom setup:
     - Your organization/team identifier
- **Format:** String (e.g., `team_broxiva`)

---

## Production Environment Secrets

### PRODUCTION_API_URL
- **Description:** Production API endpoint URL for smoke tests
- **Used in:** `broxiva-production.yml` (smoke-test job)
- **Example:** `https://api.broxiva.com`
- **Format:** Full URL with protocol

### PRODUCTION_WEB_URL
- **Description:** Production web application URL for smoke tests
- **Used in:** `broxiva-production.yml` (smoke-test job)
- **Example:** `https://broxiva.com`
- **Format:** Full URL with protocol

---

## Terraform Infrastructure Secrets

### DB_ADMIN_PASSWORD
- **Description:** Database administrator password for dev/staging environments
- **Used in:** `terraform-plan.yml`
- **How to obtain:**
  - Generate a strong password (minimum 16 characters)
  - Include uppercase, lowercase, numbers, and special characters
  - Store securely in a password manager
- **Security:** High - Never commit or log this value

### DB_ADMIN_PASSWORD_PROD
- **Description:** Database administrator password for production environment
- **Used in:** `terraform-apply-prod.yml`
- **How to obtain:** Same as DB_ADMIN_PASSWORD but for production
- **Security:** Critical - Use a different password than dev/staging

### ONCALL_EMAIL
- **Description:** Email address for on-call alerts and notifications
- **Used in:** Terraform workflows for alert configuration
- **Example:** `oncall@broxiva.com` or `pagerduty@broxiva.pagerduty.com`
- **Format:** Valid email address

### TEAM_EMAIL
- **Description:** Team email for general notifications
- **Used in:** Terraform workflows for notification configuration
- **Example:** `devops@broxiva.com`
- **Format:** Valid email address

### TF_STATE_RESOURCE_GROUP
- **Description:** Resource group name for Terraform state storage
- **Used in:** `drift-detection.yml`, `drift-repair.yml`
- **Current Value:** `broxiva-tfstate-rg` (from workflow env vars)
- **Format:** Azure resource group name

### TF_STATE_STORAGE_ACCOUNT
- **Description:** Storage account name for Terraform state
- **Used in:** `drift-detection.yml`, `drift-repair.yml`
- **Current Value:** `broxivatfstate` (from workflow env vars)
- **Format:** Azure storage account name (lowercase, alphanumeric)

### TF_STATE_CONTAINER
- **Description:** Container name for Terraform state blobs
- **Used in:** `drift-detection.yml`, `drift-repair.yml`
- **Current Value:** `tfstate` (from workflow env vars)
- **Format:** Azure blob container name

### INFRACOST_API_KEY
- **Description:** API key for Infracost cost estimation service
- **Used in:** `terraform-plan.yml` (cost-estimate job)
- **How to obtain:**
  1. Sign up at https://www.infracost.io/
  2. Go to Settings → API Keys
  3. Generate a new API key
- **Optional:** Can skip if not using cost estimation
- **Format:** Infracost API key string

---

## Database Secrets

These are used by the secret rotation workflow to manage database credentials across environments.

### POSTGRES_HOST
- **Description:** PostgreSQL server hostname
- **Per environment:** Separate values for dev, staging, production
- **Format:** Hostname or FQDN (e.g., `broxiva-prod-db.postgres.database.azure.com`)

### POSTGRES_USER
- **Description:** PostgreSQL username
- **Per environment:** Separate values for dev, staging, production
- **Format:** Database username

### POSTGRES_PASSWORD
- **Description:** PostgreSQL password
- **Per environment:** Separate values for dev, staging, production
- **Security:** Critical - Rotate regularly

### POSTGRES_DATABASE
- **Description:** PostgreSQL database name
- **Per environment:** Separate values for dev, staging, production
- **Format:** Database name

### REDIS_PASSWORD
- **Description:** Redis authentication password
- **Per environment:** Separate values for dev, staging, production
- **Security:** High - Rotate regularly

### MONGODB_URI
- **Description:** MongoDB connection string (if applicable)
- **Per environment:** Separate values for dev, staging, production
- **Format:** MongoDB URI (e.g., `mongodb://user:pass@host:port/db`)

---

## Security & Monitoring Secrets

### SNYK_TOKEN
- **Description:** Snyk API token for dependency vulnerability scanning
- **Used in:** `dependency-scan.yml`
- **How to obtain:**
  1. Sign up at https://snyk.io/
  2. Go to Account Settings → API Token
  3. Generate or copy your API token
- **Format:** Snyk API token string

### GITLEAKS_LICENSE
- **Description:** GitLeaks license key (if using pro version)
- **Used in:** `secret-scan.yml`
- **Optional:** Community version works without license
- **How to obtain:** Purchase from GitLeaks if needed

### SLACK_WEBHOOK_URL
- **Description:** Slack webhook URL for general notifications
- **Used in:**
  - `e2e-tests.yml`
  - `drift-detection.yml`
  - `drift-repair.yml`
  - `cost-anomaly-detection.yml`
- **How to obtain:**
  1. Go to Slack → Apps → Incoming Webhooks
  2. Create a new webhook for your channel
  3. Copy the webhook URL
- **Format:** `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`

### SLACK_WEBHOOK_SECURITY / SLACK_SECURITY_WEBHOOK
- **Description:** Slack webhook URL specifically for security alerts
- **Used in:**
  - `dependency-scan.yml`
  - `api-security-test.yml`
  - `compliance-check.yml`
  - `container-scan.yml`
  - `secret-scan.yml`
  - `sast.yml`
  - `secret-rotation.yml`
- **How to obtain:** Same as SLACK_WEBHOOK_URL but for security channel
- **Format:** Slack webhook URL

### TEAMS_WEBHOOK_URL
- **Description:** Microsoft Teams webhook URL for general notifications
- **Used in:**
  - `drift-detection.yml`
  - `drift-repair.yml`
  - `cost-anomaly-detection.yml`
- **How to obtain:**
  1. Go to Teams → Channel → Connectors
  2. Add "Incoming Webhook" connector
  3. Configure and copy the webhook URL
- **Format:** Microsoft Teams webhook URL

### TEAMS_WEBHOOK_SECURITY / TEAMS_SECURITY_WEBHOOK
- **Description:** Microsoft Teams webhook URL for security alerts
- **Used in:**
  - `sast.yml`
  - `secret-scan.yml`
  - `secret-rotation.yml`
- **How to obtain:** Same as TEAMS_WEBHOOK_URL but for security channel
- **Format:** Microsoft Teams webhook URL

### PAGERDUTY_INTEGRATION_KEY
- **Description:** PagerDuty integration key for critical alerts
- **Used in:** `secret-rotation.yml`
- **How to obtain:**
  1. Go to PagerDuty → Services → Your Service
  2. Go to Integrations tab
  3. Add "Events API V2" integration
  4. Copy the Integration Key
- **Format:** PagerDuty integration key string

---

## Third-Party Service Secrets

### SENDGRID_API_KEY
- **Description:** SendGrid API key for email services
- **Per environment:** Separate keys for dev, staging, production
- **Used in:** `secret-rotation.yml` (API key rotation)
- **How to obtain:**
  1. Go to SendGrid → Settings → API Keys
  2. Create a new API key with Mail Send permissions
- **Security:** High - Rotate regularly

### STRIPE_API_KEY
- **Description:** Stripe API key for payment processing
- **Per environment:** Use test keys for dev/staging, live for production
- **Used in:** Application runtime and secret rotation
- **How to obtain:**
  1. Go to Stripe Dashboard → Developers → API Keys
  2. Copy Publishable key and Secret key
- **Security:** Critical - Never expose secret key

### TWILIO_API_KEY
- **Description:** Twilio API credentials for SMS/voice services
- **Used in:** `secret-rotation.yml` (if applicable)
- **How to obtain:**
  1. Go to Twilio Console → Account → API Keys & Tokens
  2. Create a new API key
- **Format:** Twilio API key and secret

### CLOUDFLARE_API_TOKEN
- **Description:** Cloudflare API token for DNS/CDN management
- **Used in:** `secret-rotation.yml` (if applicable)
- **How to obtain:**
  1. Go to Cloudflare → My Profile → API Tokens
  2. Create a token with appropriate permissions
- **Format:** Cloudflare API token

---

## Secret Rotation Workflow Secrets

### KEYVAULT_NAME_PROD
- **Description:** Azure Key Vault name for production environment
- **Used in:** `secret-rotation.yml`
- **How to obtain:** Name of your production Key Vault in Azure
- **Format:** Key Vault name (e.g., `broxiva-prod-kv`)

### KEYVAULT_NAME_STAGING
- **Description:** Azure Key Vault name for staging environment
- **Used in:** `secret-rotation.yml`
- **Format:** Key Vault name

### KEYVAULT_NAME_DEV
- **Description:** Azure Key Vault name for development environment
- **Used in:** `secret-rotation.yml`
- **Format:** Key Vault name

### AKS_CLUSTER_NAME_PROD
- **Description:** AKS cluster name for production
- **Used in:** `secret-rotation.yml`
- **Current Value:** `broxiva-prod-aks`
- **Format:** AKS cluster name

### AKS_CLUSTER_NAME_STAGING
- **Description:** AKS cluster name for staging
- **Used in:** `secret-rotation.yml`
- **Format:** AKS cluster name

### AKS_RESOURCE_GROUP
- **Description:** Resource group containing AKS clusters
- **Used in:** `secret-rotation.yml`
- **Current Value:** `broxiva-prod-rg`
- **Format:** Azure resource group name

### AUDIT_LOG_STORAGE_ACCOUNT
- **Description:** Storage account for audit logs from secret rotation
- **Used in:** `secret-rotation.yml`
- **How to obtain:** Create a dedicated storage account for audit logs
- **Format:** Azure storage account name

### DRIFT_REPAIR_APPROVERS
- **Description:** GitHub usernames who can approve drift repair workflows
- **Used in:** `drift-repair.yml`
- **Format:** Comma-separated GitHub usernames (e.g., `user1,user2,user3`)

---

## Setting Up Azure OIDC Authentication

Azure OIDC allows GitHub Actions to authenticate to Azure without storing credentials. Follow these steps:

### Step 1: Create Azure AD Application

```bash
# Login to Azure
az login

# Create the application
az ad app create --display-name "broxiva-github-actions"

# Save the Application (client) ID - this becomes AZURE_CLIENT_ID
```

### Step 2: Create Service Principal

```bash
# Get your application ID from step 1
APP_ID="your-app-id-here"

# Create service principal
az ad sp create --id $APP_ID

# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp list --display-name "broxiva-github-actions" --query "[0].id" -o tsv)
```

### Step 3: Configure Federated Credentials

```bash
# For main branch deployments
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "broxiva-github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_ORG/Broxiva:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For pull requests
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "broxiva-github-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_ORG/Broxiva:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For production environment
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "broxiva-github-prod-env",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_ORG/Broxiva:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### Step 4: Assign Azure Permissions

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Assign Contributor role to the service principal
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID

# Assign ACR Push role for container registry access
ACR_ID=$(az acr show --name broxivaprodacr --query id -o tsv)
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role AcrPush \
  --scope $ACR_ID

# Assign AKS Admin role for Kubernetes access
AKS_ID=$(az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg --query id -o tsv)
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Azure Kubernetes Service Cluster Admin Role" \
  --scope $AKS_ID
```

### Step 5: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the following secrets:
   - `AZURE_CLIENT_ID`: The Application (client) ID from Step 1
   - `AZURE_TENANT_ID`: Your Azure tenant ID (`ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0`)
   - `AZURE_SUBSCRIPTION_ID`: Your subscription ID (`ba233460-2dbe-4603-a594-68f93ec9deb3`)

### Step 6: Verify Configuration

Test the authentication by running the `broxiva-production.yml` workflow manually or pushing to main branch.

---

## How to Add Secrets to GitHub

### Repository Secrets (Recommended)

1. Go to your GitHub repository: `https://github.com/YOUR_ORG/Broxiva`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name (exactly as shown in this document)
5. Paste the secret value
6. Click **Add secret**

### Environment Secrets (For Production Protection)

1. Go to **Settings** → **Environments**
2. Create or select the `production` environment
3. Add environment-specific secrets
4. Configure protection rules (require approvals, limit to main branch)

### Organization Secrets (For Multiple Repositories)

If you have multiple repositories that need the same secrets:

1. Go to your organization settings
2. Click **Secrets and variables** → **Actions**
3. Add organization-level secrets
4. Select which repositories can access them

---

## Secret Validation Checklist

Use this checklist to verify all secrets are properly configured:

### Core Azure Authentication
- [ ] `AZURE_CLIENT_ID` - Verified with `az ad app show`
- [ ] `AZURE_TENANT_ID` - Matches `az account show` output
- [ ] `AZURE_SUBSCRIPTION_ID` - Matches `az account show` output
- [ ] Federated credentials configured for main, PR, and production environment
- [ ] Service principal has Contributor role on subscription
- [ ] Service principal has AcrPush role on container registry
- [ ] Service principal has AKS admin role on cluster

### Build & Deployment
- [ ] `TURBO_TOKEN` - Valid Turborepo cache token
- [ ] `TURBO_TEAM` - Correct team identifier
- [ ] `PRODUCTION_API_URL` - Accessible endpoint
- [ ] `PRODUCTION_WEB_URL` - Accessible endpoint

### Infrastructure & Database
- [ ] `DB_ADMIN_PASSWORD` - Strong password (16+ chars)
- [ ] `DB_ADMIN_PASSWORD_PROD` - Different from dev/staging
- [ ] `ONCALL_EMAIL` - Valid email address
- [ ] `TEAM_EMAIL` - Valid email address
- [ ] Database secrets configured for all environments

### Notifications
- [ ] `SLACK_WEBHOOK_URL` - Test with curl
- [ ] `SLACK_WEBHOOK_SECURITY` - Test with curl
- [ ] `TEAMS_WEBHOOK_URL` - Test with curl (optional)
- [ ] `TEAMS_WEBHOOK_SECURITY` - Test with curl (optional)
- [ ] `PAGERDUTY_INTEGRATION_KEY` - Valid integration key (optional)

### Security Scanning
- [ ] `SNYK_TOKEN` - Valid Snyk API token
- [ ] `GITLEAKS_LICENSE` - Valid if using pro version (optional)

### Secret Rotation
- [ ] `KEYVAULT_NAME_PROD` - Key Vault exists and accessible
- [ ] `KEYVAULT_NAME_STAGING` - Key Vault exists and accessible
- [ ] `KEYVAULT_NAME_DEV` - Key Vault exists and accessible
- [ ] `AKS_CLUSTER_NAME_PROD` - Cluster exists and accessible
- [ ] `AKS_CLUSTER_NAME_STAGING` - Cluster exists and accessible
- [ ] `AKS_RESOURCE_GROUP` - Resource group exists
- [ ] `AUDIT_LOG_STORAGE_ACCOUNT` - Storage account exists

### Optional Services
- [ ] `INFRACOST_API_KEY` - Valid if using cost estimation
- [ ] `SENDGRID_API_KEY` - Valid if using email services
- [ ] Third-party API keys configured as needed

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `.gitignore` for local env files
   - Scan with GitLeaks before pushing

2. **Use environment-specific secrets**
   - Different passwords for dev/staging/prod
   - Never use production secrets in development

3. **Rotate secrets regularly**
   - Use the `secret-rotation.yml` workflow monthly
   - Change immediately if compromised

4. **Limit secret access**
   - Use GitHub environment protection rules
   - Require approvals for production secrets

5. **Monitor secret usage**
   - Review GitHub Actions logs (secrets are masked)
   - Set up alerts for failed authentications
   - Audit secret access in Azure AD

6. **Use Azure Key Vault**
   - Store application secrets in Key Vault
   - Reference from GitHub Secrets only for CI/CD
   - Enable Key Vault audit logging

---

## Troubleshooting

### Azure OIDC Authentication Fails

**Error:** `Error: OIDC token exchange failed`

**Solutions:**
1. Verify federated credential subject matches your repository exactly
2. Check service principal has required permissions
3. Ensure `id-token: write` permission in workflow
4. Verify AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID are correct

### Secret Not Available in Workflow

**Error:** Secret value is empty or undefined

**Solutions:**
1. Check secret name matches exactly (case-sensitive)
2. Verify secret is added to correct repository/environment
3. Check environment restrictions if using environment secrets
4. Ensure workflow has permission to access the secret

### ACR Login Fails

**Error:** `Error: az acr login failed`

**Solutions:**
1. Verify service principal has AcrPush or AcrPull role
2. Check ACR name is correct (`broxivaprodacr`)
3. Ensure Azure login succeeded in previous step
4. Verify ACR allows service principal access

---

## Support & Maintenance

- **Document Version:** 1.0
- **Last Updated:** 2025-12-17
- **Maintained By:** DevOps Team
- **Contact:** devops@broxiva.com

For questions or issues with GitHub Secrets configuration, please:
1. Check this documentation first
2. Review GitHub Actions logs for specific errors
3. Contact the DevOps team via Slack (#devops) or email
4. Create an issue in the repository with the `infrastructure` label

---

## Appendix: Quick Reference Commands

### Get Azure Information
```bash
# Get current subscription and tenant
az account show --query "{subscriptionId:id, tenantId:tenantId}" -o json

# List all service principals
az ad sp list --display-name "broxiva" --query "[].{Name:displayName, AppId:appId, ObjectId:id}" -o table

# List role assignments
az role assignment list --assignee <SP_OBJECT_ID> -o table
```

### Test Webhooks
```bash
# Test Slack webhook
curl -X POST "YOUR_SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message from Broxiva CI/CD"}'

# Test Teams webhook
curl -X POST "YOUR_TEAMS_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message from Broxiva CI/CD"}'
```

### Verify Key Vault Access
```bash
# List Key Vault secrets
az keyvault secret list --vault-name broxiva-prod-kv -o table

# Show specific secret metadata (not value)
az keyvault secret show --vault-name broxiva-prod-kv --name SECRET-NAME --query "{Name:name, Created:attributes.created, Updated:attributes.updated}"
```

### Test Service Principal Permissions
```bash
# Login as service principal (for testing only)
az login --service-principal \
  --username <AZURE_CLIENT_ID> \
  --password <CLIENT_SECRET> \
  --tenant <AZURE_TENANT_ID>

# Test resource access
az group show --name broxiva-prod-rg
az acr list -o table
az aks list -o table
```
