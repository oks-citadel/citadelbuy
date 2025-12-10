# Terraform GitHub Actions Setup Checklist

Use this checklist to ensure all Terraform workflows are properly configured.

## Prerequisites

- [ ] Azure subscription access (ba233460-2dbe-4603-a594-68f93ec9deb3)
- [ ] GitHub repository admin access
- [ ] Azure CLI installed
- [ ] Terraform state storage already configured:
  - [ ] Resource Group: `citadelbuy-tfstate-rg`
  - [ ] Storage Account: `citadelbuytfstate`
  - [ ] Container: `tfstate`

## Step 1: Azure AD App Registration & OIDC Setup

### 1.1 Create App Registration

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription ba233460-2dbe-4603-a594-68f93ec9deb3

# Create App Registration
az ad app create --display-name "GitHub-CitadelBuy-Terraform-OIDC"

# Get the Application (client) ID
APP_ID=$(az ad app list --display-name "GitHub-CitadelBuy-Terraform-OIDC" --query "[0].appId" -o tsv)
echo "Client ID: $APP_ID"

# Create Service Principal
az ad sp create --id $APP_ID
```

- [ ] App Registration created
- [ ] Client ID saved: `_______________________________________`

### 1.2 Configure Federated Identity Credentials

**IMPORTANT**: Replace `YOUR_ORG/YOUR_REPO` with your actual GitHub organization and repository name.

```bash
# Set your repository
REPO="YOUR_ORG/YOUR_REPO"  # e.g., "citadelbuy/organization"

# For main branch (production)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"GitHub-CitadelBuy-Main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${REPO}:ref:refs/heads/main\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# For develop branch (dev)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"GitHub-CitadelBuy-Develop\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${REPO}:ref:refs/heads/develop\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# For staging branch
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"GitHub-CitadelBuy-Staging\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${REPO}:ref:refs/heads/staging\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# For pull requests
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"GitHub-CitadelBuy-PR\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${REPO}:pull_request\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"
```

- [ ] Main branch credential configured
- [ ] Develop branch credential configured
- [ ] Staging branch credential configured
- [ ] Pull request credential configured

### 1.3 Assign Azure Permissions

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

- [ ] Contributor role assigned
- [ ] Storage Blob Data Contributor role assigned

### 1.4 Get Required IDs

```bash
# Get Tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Tenant ID: $TENANT_ID"

# Get Client ID (if not saved earlier)
CLIENT_ID=$(az ad app list --display-name "GitHub-CitadelBuy-Terraform-OIDC" --query "[0].appId" -o tsv)
echo "Client ID: $CLIENT_ID"
```

- [ ] Tenant ID saved: `_______________________________________`
- [ ] Client ID saved: `_______________________________________`

## Step 2: GitHub Repository Configuration

### 2.1 Add Repository Secrets

Go to: `Settings > Secrets and variables > Actions > New repository secret`

Add the following secrets:

- [ ] `AZURE_CLIENT_ID` = `_______________________________________`
- [ ] `AZURE_TENANT_ID` = `_______________________________________`
- [ ] `DB_ADMIN_PASSWORD` = `_______________________________________` (dev/staging)
- [ ] `DB_ADMIN_PASSWORD_PROD` = `_______________________________________` (production)
- [ ] `ONCALL_EMAIL` = `_______________________________________`
- [ ] `TEAM_EMAIL` = `_______________________________________`
- [ ] `INFRACOST_API_KEY` (optional) = `_______________________________________`

### 2.2 Configure GitHub Environments

#### Dev Environment
- [ ] Navigate to: `Settings > Environments > New environment`
- [ ] Name: `dev`
- [ ] Environment URL: `https://dev.citadelbuy.com`
- [ ] Deployment branches: Only `develop` branch
- [ ] Required reviewers: None (optional)

#### Staging Environment
- [ ] Navigate to: `Settings > Environments > New environment`
- [ ] Name: `staging`
- [ ] Environment URL: `https://staging.citadelbuy.com`
- [ ] Deployment branches: Only `staging` branch
- [ ] Required reviewers: Add 1-2 team members
- [ ] Wait timer: 0 minutes (optional)

#### Production Environment
- [ ] Navigate to: `Settings > Environments > New environment`
- [ ] Name: `production`
- [ ] Environment URL: `https://citadelbuy.com`
- [ ] Deployment branches: Only `main` branch
- [ ] Required reviewers: Add 2+ senior team members
- [ ] Wait timer: 5 minutes (recommended)
- [ ] Additional protection: Limit to specific users (optional)

### 2.3 Configure Branch Protection Rules

#### Main Branch
- [ ] Navigate to: `Settings > Branches > Add rule`
- [ ] Branch name pattern: `main`
- [ ] Require pull request reviews: Yes (2 approvals recommended)
- [ ] Require status checks: Yes
  - [ ] `Terraform Format Check`
  - [ ] `Terraform Validate`
  - [ ] `Terraform Plan`
- [ ] Require conversation resolution: Yes
- [ ] Include administrators: No

#### Develop Branch
- [ ] Navigate to: `Settings > Branches > Add rule`
- [ ] Branch name pattern: `develop`
- [ ] Require pull request reviews: Yes (1 approval)
- [ ] Require status checks: Yes
  - [ ] `Terraform Format Check`
  - [ ] `Terraform Validate`

#### Staging Branch
- [ ] Navigate to: `Settings > Branches > Add rule`
- [ ] Branch name pattern: `staging`
- [ ] Require pull request reviews: Yes (1 approval)
- [ ] Require status checks: Yes

## Step 3: Verify Terraform State Storage

```bash
# Verify resource group exists
az group show --name citadelbuy-tfstate-rg

# Verify storage account exists
az storage account show \
  --name citadelbuytfstate \
  --resource-group citadelbuy-tfstate-rg

# Verify container exists
az storage container show \
  --name tfstate \
  --account-name citadelbuytfstate
```

- [ ] Resource group exists
- [ ] Storage account exists
- [ ] Container exists
- [ ] Storage account has blob versioning enabled (recommended)

## Step 4: Test Workflows

### 4.1 Test Terraform Plan Workflow

1. Create a test branch from `develop`
2. Make a minor change to Terraform config (e.g., add a tag)
3. Create a pull request to `develop`
4. Verify workflow runs:
   - [ ] Format check passes
   - [ ] Validation succeeds
   - [ ] Plans are generated for all environments
   - [ ] PR comment is posted with plan output

### 4.2 Test Dev Deployment

1. Merge the test PR to `develop`
2. Verify workflow runs:
   - [ ] Plan is generated
   - [ ] Apply runs automatically
   - [ ] Post-deployment verification succeeds
   - [ ] No errors in logs

### 4.3 Test Manual Workflow Trigger

1. Go to: `Actions > Terraform Apply - Dev > Run workflow`
2. Enter "apply" in confirmation
3. Verify workflow runs successfully
   - [ ] Workflow starts
   - [ ] Confirmation check passes
   - [ ] Apply completes

### 4.4 Test Drift Detection

1. Go to: `Actions > Terraform Drift Detection > Run workflow`
2. Select environment: `dev`
3. Verify workflow runs:
   - [ ] Drift detection completes
   - [ ] Summary is generated
   - [ ] No errors in logs

## Step 5: Configure Notifications (Optional)

### Slack Integration
- [ ] Create Slack webhook URL
- [ ] Add `SLACK_WEBHOOK_URL` to repository secrets
- [ ] Update workflow files to send notifications
- [ ] Test notification delivery

### Microsoft Teams Integration
- [ ] Create Teams webhook URL
- [ ] Add `TEAMS_WEBHOOK_URL` to repository secrets
- [ ] Update workflow files to send notifications
- [ ] Test notification delivery

### Email Notifications
- [ ] Configure GitHub email notifications
- [ ] Add team members to watch list
- [ ] Set notification preferences

## Step 6: Documentation

- [ ] Update team documentation with workflow information
- [ ] Document approval process for staging/production
- [ ] Create runbook for common scenarios
- [ ] Schedule team training on new workflows

## Step 7: Monitoring Setup

- [ ] Enable GitHub Actions usage monitoring
- [ ] Set up alerts for workflow failures
- [ ] Configure drift detection schedule (default: daily 6 AM UTC)
- [ ] Document escalation procedures

## Step 8: Security Review

- [ ] Verify all secrets are properly stored
- [ ] Review service principal permissions (principle of least privilege)
- [ ] Enable Azure AD audit logging
- [ ] Review GitHub audit log settings
- [ ] Test secret rotation procedures
- [ ] Document security contact information

## Post-Setup Verification

### Week 1
- [ ] Monitor all workflow runs
- [ ] Address any failures immediately
- [ ] Gather team feedback
- [ ] Update documentation as needed

### Week 2
- [ ] Review drift detection reports
- [ ] Verify approval processes work smoothly
- [ ] Check artifact retention
- [ ] Optimize workflow performance if needed

### Week 4
- [ ] Complete security review
- [ ] Conduct team retrospective
- [ ] Document lessons learned
- [ ] Plan for continuous improvement

## Troubleshooting

### Common Issues

**Issue**: OIDC authentication fails
- [ ] Verify federated credentials match repository name exactly
- [ ] Check branch names match credential subjects
- [ ] Verify tenant ID and client ID are correct

**Issue**: Terraform state lock errors
- [ ] Check for concurrent workflow runs
- [ ] Verify storage account permissions
- [ ] Use `terraform force-unlock` if necessary (with caution)

**Issue**: Approval not working
- [ ] Verify environment exists with correct name
- [ ] Check reviewers are added to environment
- [ ] Verify branch restrictions are configured

**Issue**: Secrets not found
- [ ] Verify secret names match exactly (case-sensitive)
- [ ] Check secrets are at repository level, not environment level
- [ ] Verify workflow has correct permissions

## Maintenance Schedule

### Daily
- [ ] Monitor drift detection results

### Weekly
- [ ] Review failed workflow runs
- [ ] Check GitHub Actions usage/quota

### Monthly
- [ ] Review and update secrets
- [ ] Audit service principal permissions
- [ ] Update Terraform version if needed

### Quarterly
- [ ] Review and update workflows
- [ ] Test disaster recovery procedures
- [ ] Conduct security audit
- [ ] Review team access and permissions

## Sign-off

Setup completed by: _____________________ Date: _____________________

Reviewed by: _____________________ Date: _____________________

Approved by: _____________________ Date: _____________________

---

**Notes:**
