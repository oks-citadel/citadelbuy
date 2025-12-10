# Terraform GitHub Actions Workflows

This directory contains GitHub Actions workflows for managing Terraform infrastructure across multiple environments.

## Overview

The Terraform automation is built with the following principles:
- **Azure OIDC Authentication**: Secure, passwordless authentication using Workload Identity Federation
- **Multi-Environment Support**: Separate workflows for dev, staging, and production
- **Security First**: Security scanning, approval gates, and drift detection
- **Full Visibility**: Plan comments on PRs, detailed summaries, and artifacts

## Workflows

### 1. terraform-plan.yml
**Purpose**: Validates and plans Terraform changes on pull requests

**Triggers**:
- Pull requests to `main` or `develop` branches
- Changes to `infrastructure/terraform/**` or workflow files

**Features**:
- Terraform format checking
- Terraform validation across all environments
- Parallel plan generation for dev, staging, and prod
- Automated PR comments with plan outputs
- Security scanning with tfsec
- Optional cost estimation with Infracost

**Required Secrets**:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `DB_ADMIN_PASSWORD`
- `ONCALL_EMAIL`
- `TEAM_EMAIL`
- `INFRACOST_API_KEY` (optional)

---

### 2. terraform-apply-dev.yml
**Purpose**: Automatically applies Terraform changes to the dev environment

**Triggers**:
- Push to `develop` branch
- Manual workflow dispatch (requires confirmation)

**Features**:
- Automatic deployment on merge to develop
- Manual trigger with confirmation guard
- Post-deployment resource verification
- Health checks
- Detailed apply summaries

**Environment**: `dev`
- No approval required
- Fast iteration for development

**Required Secrets**:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `DB_ADMIN_PASSWORD`
- `ONCALL_EMAIL`
- `TEAM_EMAIL`

---

### 3. terraform-apply-staging.yml
**Purpose**: Applies Terraform changes to staging with approval gate

**Triggers**:
- Push to `staging` branch
- Manual workflow dispatch (requires confirmation)

**Features**:
- **Requires approval** via GitHub environment protection rules
- Comprehensive post-deployment verification
- AKS cluster health checks
- Database verification
- 90-day artifact retention

**Environment**: `staging`
- Approval required from designated reviewers
- URL: https://staging.citadelbuy.com

**Required Secrets**:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `DB_ADMIN_PASSWORD`
- `ONCALL_EMAIL`
- `TEAM_EMAIL`

---

### 4. terraform-apply-prod.yml
**Purpose**: Applies Terraform changes to production with strict controls

**Triggers**:
- Push to `main` branch
- Manual workflow dispatch (requires strict confirmation)

**Features**:
- **Requires approval** via GitHub environment protection rules
- Pre-deployment security scanning (tfsec enforced)
- Manual trigger requires typing "apply-production" + deployment reason
- Automatic state backup before deployment
- Comprehensive post-deployment verification
- Smoke tests and health checks
- 365-day artifact retention
- Deployment notifications

**Environment**: `production`
- Approval required from senior team members
- URL: https://citadelbuy.com

**Required Secrets**:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `DB_ADMIN_PASSWORD_PROD` (separate from dev/staging)
- `ONCALL_EMAIL`
- `TEAM_EMAIL`

---

### 5. terraform-drift-detection.yml
**Purpose**: Detects infrastructure drift from Terraform state

**Triggers**:
- Scheduled: Daily at 6:00 AM UTC
- Manual workflow dispatch (with environment selection)

**Features**:
- Parallel drift detection across all environments
- Automatic GitHub issue creation on drift detection
- Critical alerts for production drift
- Drift report artifacts
- Detailed drift summaries

**Drift Detection**:
- Runs `terraform plan` in read-only mode
- Compares actual infrastructure vs. Terraform state
- Creates issues with detailed drift information
- Updates existing drift issues if still unresolved

**Required Secrets**:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `DB_ADMIN_PASSWORD`
- `DB_ADMIN_PASSWORD_PROD`
- `ONCALL_EMAIL`
- `TEAM_EMAIL`

---

## Azure OIDC Setup

### 1. Create Azure AD App Registration

```bash
# Create App Registration
az ad app create --display-name "GitHub-CitadelBuy-Terraform-OIDC"

# Get the Application (client) ID
APP_ID=$(az ad app list --display-name "GitHub-CitadelBuy-Terraform-OIDC" --query "[0].appId" -o tsv)

# Create Service Principal
az ad sp create --id $APP_ID
```

### 2. Configure Federated Identity Credentials

```bash
# For main branch (production)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "GitHub-CitadelBuy-Main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For develop branch (dev)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "GitHub-CitadelBuy-Develop",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/develop",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For staging branch
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "GitHub-CitadelBuy-Staging",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/staging",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For pull requests
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "GitHub-CitadelBuy-PR",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_ORG/YOUR_REPO:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 3. Assign Azure Permissions

```bash
# Get Service Principal Object ID
SP_ID=$(az ad sp list --display-name "GitHub-CitadelBuy-Terraform-OIDC" --query "[0].id" -o tsv)

# Assign Contributor role to subscription
az role assignment create \
  --assignee $SP_ID \
  --role "Contributor" \
  --scope "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3"

# Assign Storage Blob Data Contributor for Terraform state
az role assignment create \
  --assignee $SP_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/ba233460-2dbe-4603-a594-68f93ec9deb3/resourceGroups/citadelbuy-tfstate-rg/providers/Microsoft.Storage/storageAccounts/citadelbuytfstate"
```

### 4. Get Required IDs

```bash
# Get Tenant ID
az account show --query tenantId -o tsv

# Get Client ID (Application ID)
az ad app list --display-name "GitHub-CitadelBuy-Terraform-OIDC" --query "[0].appId" -o tsv
```

---

## GitHub Configuration

### Required Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AZURE_CLIENT_ID` | Azure AD App Registration Application ID | `12345678-1234-1234-1234-123456789abc` |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | `87654321-4321-4321-4321-cba987654321` |
| `DB_ADMIN_PASSWORD` | Database admin password (dev/staging) | `SecureP@ssw0rd123!` |
| `DB_ADMIN_PASSWORD_PROD` | Database admin password (production) | `Pr0dP@ssw0rd456!` |
| `ONCALL_EMAIL` | On-call engineer email for alerts | `oncall@citadelbuy.com` |
| `TEAM_EMAIL` | Team email for notifications | `team@citadelbuy.com` |
| `INFRACOST_API_KEY` | (Optional) Infracost API key for cost estimation | `ico-xxx` |

### Environment Protection Rules

Configure environment protection rules for staging and production:

#### Staging Environment
1. Go to Settings > Environments > New environment
2. Name: `staging`
3. Configure protection rules:
   - ✅ Required reviewers: Add 1-2 team members
   - ⏱️ Wait timer: 0 minutes (optional)
   - 🌐 Deployment branches: `staging` branch only

#### Production Environment
1. Go to Settings > Environments > New environment
2. Name: `production`
3. Configure protection rules:
   - ✅ Required reviewers: Add 2+ senior team members
   - ⏱️ Wait timer: 5 minutes (recommended)
   - 🌐 Deployment branches: `main` branch only
   - 🔒 Additional protection: Consider limiting to specific users

#### Dev Environment (Optional)
1. Go to Settings > Environments > New environment
2. Name: `dev`
3. Configure protection rules:
   - ✅ No reviewers required
   - 🌐 Deployment branches: `develop` branch only

---

## Usage Examples

### Creating a Pull Request

1. Create feature branch and make Terraform changes
2. Push changes and create PR to `develop` or `main`
3. Workflows automatically run:
   - Format check
   - Validation across all environments
   - Plan generation for all environments
4. Review plan outputs in PR comments
5. Merge when approved

### Deploying to Dev

**Automatic**: Merge PR to `develop` branch

**Manual**:
```bash
# Via GitHub UI
Actions > Terraform Apply - Dev > Run workflow
Confirm: "apply"
```

### Deploying to Staging

**Automatic**:
1. Merge to `staging` branch
2. Approve deployment in GitHub Actions UI

**Manual**:
```bash
# Via GitHub UI
Actions > Terraform Apply - Staging > Run workflow
Confirm: "apply"
# Then approve in the deployment UI
```

### Deploying to Production

**Automatic**:
1. Merge to `main` branch
2. Approve deployment in GitHub Actions UI

**Manual**:
```bash
# Via GitHub UI
Actions > Terraform Apply - Production > Run workflow
Confirm: "apply-production"
Reason: "Emergency hotfix for security patch"
# Then approve in the deployment UI
```

### Checking for Drift

**Automatic**: Runs daily at 6:00 AM UTC

**Manual**:
```bash
# Via GitHub UI
Actions > Terraform Drift Detection > Run workflow
Environment: Select environment or "all"
```

---

## Monitoring and Alerts

### Drift Detection

- **Frequency**: Daily at 6:00 AM UTC
- **Alerts**: GitHub issues created automatically
- **Critical**: Production drift triggers high-priority issue
- **Reports**: Drift artifacts retained for 30-90 days

### Deployment Artifacts

| Environment | Retention | Includes |
|-------------|-----------|----------|
| Dev | 5 days | Plan files, apply output |
| Staging | 90 days | Plan files, apply output, verification logs |
| Production | 365 days | Plan files, apply output, state backups, verification logs |

### Notifications

Configure notifications for:
- Failed deployments
- Drift detection alerts
- Production changes
- Security scan failures

Update notification endpoints in the workflows or add integrations:
- Slack webhook
- Microsoft Teams webhook
- Email notifications
- PagerDuty

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failed

**Error**: `AADSTS70021: No matching federated identity record found`

**Solution**:
- Verify federated credentials are configured correctly
- Check that the branch name matches the subject in the credential
- Ensure the repository name matches exactly

#### 2. State Lock Issues

**Error**: `Error acquiring the state lock`

**Solution**:
```bash
# List locks
az storage blob list \
  --account-name citadelbuytfstate \
  --container-name tfstate \
  --prefix .terraform.lock

# Force unlock (use with caution)
cd infrastructure/terraform/environments/{env}
terraform force-unlock <LOCK_ID>
```

#### 3. Plan Shows Unexpected Changes

**Cause**: Drift detected

**Solution**:
1. Run drift detection workflow
2. Review drift report
3. Determine if changes are:
   - Manual modifications to import
   - Configuration updates needed
   - Errors to revert

#### 4. Permission Denied

**Error**: `insufficient permissions`

**Solution**:
- Verify service principal has Contributor role
- Check Storage Blob Data Contributor role for state storage
- Review Azure AD role assignments

---

## Security Best Practices

1. **Secrets Management**
   - Rotate secrets regularly
   - Use separate passwords for production
   - Never commit secrets to repository

2. **Access Control**
   - Limit who can approve production deployments
   - Use branch protection rules
   - Enable audit logging

3. **Review Process**
   - Always review plans before approval
   - Require multiple reviewers for production
   - Document deployment reasons

4. **Monitoring**
   - Enable drift detection
   - Monitor workflow failures
   - Review security scan results

5. **State Management**
   - Enable state locking
   - Regular state backups
   - Restrict state file access

---

## Maintenance

### Weekly
- Review failed workflow runs
- Check drift detection reports
- Verify environment protection rules

### Monthly
- Review and rotate secrets
- Update Terraform version if needed
- Audit service principal permissions

### Quarterly
- Review and update workflows
- Test disaster recovery procedures
- Audit access controls

---

## Support

For issues or questions:
1. Check workflow run logs
2. Review artifacts for detailed output
3. Check GitHub Issues for similar problems
4. Contact DevOps team

---

## Additional Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)

---

**Last Updated**: 2025-12-10
**Maintained By**: DevOps Team
