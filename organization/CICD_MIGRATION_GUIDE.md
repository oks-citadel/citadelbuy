# CI/CD Pipeline Migration Guide: CitadelBuy → Broxiva

**Generated:** 2025-12-13
**Purpose:** Complete migration of all CI/CD pipelines from CitadelBuy to Broxiva branding

## Executive Summary

This guide provides all necessary commands and changes to update the entire CI/CD pipeline infrastructure from CitadelBuy to Broxiva, including:
- GitHub Actions workflows (25+ files)
- Azure resource naming
- Container registries
- Deployment URLs
- Security scanning configurations

---

## 1. AUTOMATED BULK REPLACEMENT

### Quick Commands (Run from organization directory)

```bash
# Navigate to workflows directory
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization/.github/workflows

# Backup all workflows first
mkdir -p ../../.github-workflows-backup-$(date +%Y%m%d)
cp *.yml ../../.github-workflows-backup-$(date +%Y%m%d)/

# Replace all citadelbuy references with broxiva (lowercase)
find . -name "*.yml" -type f -exec sed -i 's/citadelbuy/broxiva/g' {} +

# Replace all CitadelBuy references with Broxiva (title case)
find . -name "*.yml" -type f -exec sed -i 's/CitadelBuy/Broxiva/g' {} +

# Replace citadelplatforms with broxiva in container registries
find . -name "*.yml" -type f -exec sed -i 's/citadelplatforms/broxiva/g' {} +

# Verify changes
git diff --stat
```

---

## 2. FILE-BY-FILE CHANGES REQUIRED

### Core Terraform Workflows

#### `terraform-plan.yml`
```yaml
# BEFORE:
env:
  ARM_RESOURCE_GROUP: citadelbuy-tfstate-rg
  ARM_STORAGE_ACCOUNT: citadelbuytfstate

# AFTER:
env:
  ARM_RESOURCE_GROUP: broxiva-tfstate-rg
  ARM_STORAGE_ACCOUNT: broxivatfstate
```

#### `terraform-apply-dev.yml`
- Update: `citadelbuy-dev-rg` → `broxiva-dev-rg`
- Update: `citadelbuy-dev-aks` → `broxiva-dev-aks`
- Update: `https://dev.citadelbuy.com` → `https://dev.broxiva.com`

#### `terraform-apply-staging.yml`
- Update: `citadelbuy-staging-rg` → `broxiva-staging-rg`
- Update: `citadelbuy-staging-aks` → `broxiva-staging-aks`
- Update: `https://staging.citadelbuy.com` → `https://staging.broxiva.com`

#### `terraform-apply-prod.yml`
- Update: `citadelbuy-prod-rg` → `broxiva-prod-rg`
- Update: `citadelbuy-prod-aks` → `broxiva-prod-aks`
- Update: `https://citadelbuy.com` → `https://broxiva.com`
- Update: `https://citadelbuy.com` (environment URL) → `https://broxiva.com`

### Deployment Workflows

#### `cd-dev.yml`
```yaml
# BEFORE:
env:
  AKS_CLUSTER_NAME: citadelbuy-dev-aks
  AKS_RESOURCE_GROUP: citadelbuy-dev-rg
  KUBERNETES_NAMESPACE: citadelbuy-dev
  CONTAINER_REGISTRY: ghcr.io/citadelplatforms

# AFTER:
env:
  AKS_CLUSTER_NAME: broxiva-dev-aks
  AKS_RESOURCE_GROUP: broxiva-dev-rg
  KUBERNETES_NAMESPACE: broxiva-dev
  CONTAINER_REGISTRY: ghcr.io/broxiva
```

Additional changes:
- All `citadelbuy-api`, `citadelbuy-web` → `broxiva-api`, `broxiva-web`
- Update environment URL: `https://dev.citadelbuy.com` → `https://dev.broxiva.com`

#### `cd-staging.yml`
```yaml
# BEFORE:
env:
  AKS_CLUSTER_NAME: citadelbuy-staging-aks
  AKS_RESOURCE_GROUP: citadelbuy-staging-rg
  KUBERNETES_NAMESPACE: citadelbuy-staging
  CONTAINER_REGISTRY: ghcr.io/citadelplatforms

# AFTER:
env:
  AKS_CLUSTER_NAME: broxiva-staging-aks
  AKS_RESOURCE_GROUP: broxiva-staging-rg
  KUBERNETES_NAMESPACE: broxiva-staging
  CONTAINER_REGISTRY: ghcr.io/broxiva
```

#### `cd-prod.yml` (Blue-Green Deployment)
```yaml
# BEFORE:
env:
  AKS_CLUSTER_NAME: citadelbuy-prod-aks
  AKS_RESOURCE_GROUP: citadelbuy-prod-rg
  KUBERNETES_NAMESPACE: citadelbuy-production
  CONTAINER_REGISTRY: ghcr.io/citadelplatforms

# AFTER:
env:
  AKS_CLUSTER_NAME: broxiva-prod-aks
  AKS_RESOURCE_GROUP: broxiva-prod-rg
  KUBERNETES_NAMESPACE: broxiva-production
  CONTAINER_REGISTRY: ghcr.io/broxiva
```

Update all deployment references:
- `citadelbuy-api` → `broxiva-api`
- `citadelbuy-web` → `broxiva-web`
- `citadelbuy-worker` → `broxiva-worker`
- `https://citadelbuy.com` → `https://broxiva.com`

### Container & Build Workflows

#### `docker-build.yml`
```yaml
# BEFORE:
env:
  REGISTRY: citadelbuyacr.azurecr.io

labels: |
  org.opencontainers.image.description=CitadelBuy ${{ matrix.name }} service

# AFTER:
env:
  REGISTRY: broxivaacr.azurecr.io

labels: |
  org.opencontainers.image.description=Broxiva ${{ matrix.name }} service
```

#### `docker-build-and-push-acr.yml`
- Update: `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`

### Infrastructure Monitoring

#### `drift-detection.yml`
```yaml
# Update all resource group references:
- citadelbuy-dev-rg → broxiva-dev-rg
- citadelbuy-staging-rg → broxiva-staging-rg
- citadelbuy-prod-rg → broxiva-prod-rg
- citadelbuy-africa-rg → broxiva-africa-rg
- citadelbuy-asia-rg → broxiva-asia-rg

# Update AKS cluster names:
- citadelbuy-dev-aks → broxiva-dev-aks
- citadelbuy-staging-aks → broxiva-staging-aks
- citadelbuy-prod-aks → broxiva-prod-aks

# Update ACR names:
- citadelbuydevacr → broxivadevacr
- citadelbuystagingacr → broxivastagingacr
- citadelbuyprodacr → broxivaprodacr

# Update database names:
- citadelbuy-dev-postgres → broxiva-dev-postgres
- citadelbuy-staging-postgres → broxiva-staging-postgres
- citadelbuy-prod-postgres → broxiva-prod-postgres

# Update tags:
- Project: CitadelBuy → Project: Broxiva
```

#### `cost-optimization-shutdown.yml`
```yaml
# Update all references:
- citadelbuy-dev-rg → broxiva-dev-rg
- citadelbuy-staging-rg → broxiva-staging-rg
- citadelbuy-dev-aks → broxiva-dev-aks
- citadelbuy-staging-aks → broxiva-staging-aks
- citadelbuy-dev-postgres → broxiva-dev-postgres
- citadelbuy-staging-postgres → broxiva-staging-postgres
```

### Security Workflows

#### `secret-scan.yml`
- Update description references from CitadelBuy → Broxiva
- No infrastructure-specific changes needed

---

## 3. CREATE NEW PRODUCTION DEPLOYMENT WORKFLOW

Create: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'Image tag to deploy (must be tested in staging)'
        required: true
        type: string
      deployment_reason:
        description: 'Reason for production deployment'
        required: true
        type: string
  push:
    branches:
      - main
    paths-ignore:
      - '**.md'
      - 'docs/**'

permissions:
  id-token: write
  contents: read
  packages: read
  deployments: write

env:
  AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
  AKS_CLUSTER_NAME: broxiva-prod-aks
  AKS_RESOURCE_GROUP: broxiva-prod-rg
  KUBERNETES_NAMESPACE: broxiva-production
  CONTAINER_REGISTRY: ghcr.io/broxiva

jobs:
  security-validation:
    name: Pre-Deployment Security Checks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run secret scanning
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run container security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  terraform-plan:
    name: Terraform Plan Production
    runs-on: ubuntu-latest
    needs: security-validation
    outputs:
      plan_exitcode: ${{ steps.plan.outputs.exitcode }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"
          terraform_wrapper: false

      - name: Azure Login via OIDC
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Init
        working-directory: infrastructure/terraform/environments/prod
        run: |
          terraform init \
            -backend-config="resource_group_name=broxiva-tfstate-rg" \
            -backend-config="storage_account_name=broxivatfstate" \
            -backend-config="container_name=tfstate" \
            -backend-config="key=prod.terraform.tfstate"

      - name: Terraform Plan
        id: plan
        working-directory: infrastructure/terraform/environments/prod
        env:
          TF_VAR_azure_subscription_id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          TF_VAR_azure_tenant_id: ${{ secrets.AZURE_TENANT_ID }}
          TF_VAR_cloud_provider: azure
          TF_VAR_db_admin_password: ${{ secrets.DB_ADMIN_PASSWORD_PROD }}
          TF_VAR_oncall_email: ${{ secrets.ONCALL_EMAIL }}
          TF_VAR_team_email: ${{ secrets.TEAM_EMAIL }}
        run: |
          terraform plan -detailed-exitcode -out=tfplan 2>&1 | tee plan-output.txt
          exitcode=$?
          echo "exitcode=$exitcode" >> $GITHUB_OUTPUT
          exit 0

      - name: Upload Plan Artifact
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-prod-${{ github.sha }}
          path: infrastructure/terraform/environments/prod/tfplan
          retention-days: 30

  manual-approval:
    name: Production Deployment Approval
    needs: [security-validation, terraform-plan]
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://broxiva.com
    steps:
      - name: Approval Checkpoint
        run: |
          echo "===== PRODUCTION DEPLOYMENT APPROVED ====="
          echo "Approver: ${{ github.actor }}"
          echo "Reason: ${{ github.event.inputs.deployment_reason || 'Automated from main branch' }}"
          echo "Image Tag: ${{ github.event.inputs.image_tag || 'latest' }}"
          echo "Timestamp: $(date -u)"
          echo "=========================================="

  deploy-production:
    name: Deploy to Production
    needs: [terraform-plan, manual-approval]
    runs-on: ubuntu-latest
    if: needs.terraform-plan.outputs.plan_exitcode == '2'
    environment:
      name: production
      url: https://broxiva.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"
          terraform_wrapper: false

      - name: Azure Login via OIDC
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Download Plan Artifact
        uses: actions/download-artifact@v4
        with:
          name: tfplan-prod-${{ github.sha }}
          path: infrastructure/terraform/environments/prod

      - name: Terraform Init
        working-directory: infrastructure/terraform/environments/prod
        run: |
          terraform init \
            -backend-config="resource_group_name=broxiva-tfstate-rg" \
            -backend-config="storage_account_name=broxivatfstate" \
            -backend-config="container_name=tfstate" \
            -backend-config="key=prod.terraform.tfstate"

      - name: Terraform Apply
        id: apply
        working-directory: infrastructure/terraform/environments/prod
        run: |
          terraform apply -auto-approve tfplan 2>&1 | tee apply-output.txt

      - name: Upload Apply Output
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: apply-output-prod-${{ github.sha }}
          path: infrastructure/terraform/environments/prod/apply-output.txt
          retention-days: 365

      - name: Deployment Summary
        if: always()
        run: |
          echo "## Production Deployment Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Status:** ${{ steps.apply.outcome }}" >> $GITHUB_STEP_SUMMARY
          echo "**Environment:** Production" >> $GITHUB_STEP_SUMMARY
          echo "**Approved By:** @${{ github.actor }}" >> $GITHUB_STEP_SUMMARY
          echo "**Timestamp:** $(date -u)" >> $GITHUB_STEP_SUMMARY
          echo "**URL:** https://broxiva.com" >> $GITHUB_STEP_SUMMARY

  post-deployment-verification:
    name: Post-Deployment Verification
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Verify Resources
        run: |
          az group show --name broxiva-prod-rg
          az aks show --resource-group broxiva-prod-rg --name broxiva-prod-aks
          az postgres flexible-server show --name broxiva-prod-postgres --resource-group broxiva-prod-rg

      - name: Health Checks
        run: |
          echo "Running production health checks..."
          sleep 30
          # Add your health check URLs here
          # curl -f https://broxiva.com/health || exit 1
```

---

## 4. CREATE DRIFT DETECTION WORKFLOW (ENHANCED)

Create: `.github/workflows/drift-detection-daily.yml`

```yaml
name: Daily Infrastructure Drift Detection

on:
  schedule:
    # Run daily at 6 AM UTC
    - cron: '0 6 * * *'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to check'
        required: false
        default: 'all'
        type: choice
        options:
          - all
          - prod
          - staging
          - dev

permissions:
  id-token: write
  contents: write
  pull-requests: write
  issues: write

env:
  TF_VERSION: '1.6.0'

jobs:
  terraform-drift:
    name: Detect Terraform Drift - ${{ matrix.environment }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [prod, staging, dev]
      fail-fast: false
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
          terraform_wrapper: false

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Init
        working-directory: infrastructure/terraform/environments/${{ matrix.environment }}
        run: |
          terraform init \
            -backend-config="resource_group_name=broxiva-tfstate-rg" \
            -backend-config="storage_account_name=broxivatfstate" \
            -backend-config="container_name=tfstate" \
            -backend-config="key=${{ matrix.environment }}.terraform.tfstate"

      - name: Terraform Plan - Detect Drift
        id: plan
        working-directory: infrastructure/terraform/environments/${{ matrix.environment }}
        run: |
          terraform plan -detailed-exitcode -no-color 2>&1 | tee drift-plan.txt
          echo "exitcode=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Create Drift Issue
        if: steps.plan.outputs.exitcode == '2'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('infrastructure/terraform/environments/${{ matrix.environment }}/drift-plan.txt', 'utf8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Infrastructure Drift Detected - ${{ matrix.environment }}`,
              body: `## Infrastructure Drift Alert\n\n**Environment:** ${{ matrix.environment }}\n**Detected:** ${new Date().toISOString()}\n\n### Drift Details\n\n\`\`\`hcl\n${plan.substring(0, 60000)}\n\`\`\`\n\n### Actions Required\n\n1. Review the drift details above\n2. Determine if drift is expected or unauthorized\n3. Update Terraform configuration or trigger repair workflow\n4. Document the resolution\n\n**Workflow Run:** ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`,
              labels: ['infrastructure', 'drift-detection', '${{ matrix.environment }}']
            });

      - name: Upload Drift Report
        if: steps.plan.outputs.exitcode == '2'
        uses: actions/upload-artifact@v4
        with:
          name: drift-report-${{ matrix.environment }}-${{ github.run_number }}
          path: infrastructure/terraform/environments/${{ matrix.environment }}/drift-plan.txt
          retention-days: 90

  notify-drift:
    name: Notify on Drift
    needs: terraform-drift
    runs-on: ubuntu-latest
    if: failure()
    steps:
      - name: Send Alert
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Infrastructure Drift Detected",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": ":warning: Infrastructure Drift Alert"
                  }
                },
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Configuration drift detected in Broxiva infrastructure. Review the GitHub Actions run for details."
                  }
                },
                {
                  "type": "actions",
                  "elements": [
                    {
                      "type": "button",
                      "text": {
                        "type": "plain_text",
                        "text": "View Details"
                      },
                      "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                    }
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

## 5. CREATE COST ANOMALY DETECTION WORKFLOW

Create: `.github/workflows/cost-monitoring.yml`

```yaml
name: Cost Monitoring & Alerts

on:
  schedule:
    # Run daily at 8 AM UTC
    - cron: '0 8 * * *'
  workflow_dispatch:

permissions:
  contents: read
  id-token: write
  issues: write

env:
  COST_THRESHOLD_DAILY: 500
  COST_THRESHOLD_MONTHLY: 15000

jobs:
  analyze-costs:
    name: Analyze Azure Costs
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Get Cost Data
        id: costs
        run: |
          # Get cost for last 30 days
          END_DATE=$(date -u +%Y-%m-%d)
          START_DATE=$(date -u -d '30 days ago' +%Y-%m-%d)

          COST_DATA=$(az consumption usage list \
            --start-date $START_DATE \
            --end-date $END_DATE \
            --query "[].{cost:pretaxCost, date:usageStart, service:meterDetails.meterCategory}" \
            --output json)

          echo "$COST_DATA" > cost-data.json

          # Calculate total cost
          TOTAL_COST=$(echo "$COST_DATA" | jq '[.[].cost | tonumber] | add')
          echo "total_cost=$TOTAL_COST" >> $GITHUB_OUTPUT

          # Calculate daily average
          DAILY_AVG=$(echo "$TOTAL_COST / 30" | bc -l)
          echo "daily_avg=$DAILY_AVG" >> $GITHUB_OUTPUT

      - name: Cost by Resource Group
        run: |
          echo "## Cost Breakdown by Environment" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Resource Group | Current Month Cost |" >> $GITHUB_STEP_SUMMARY
          echo "|----------------|-------------------|" >> $GITHUB_STEP_SUMMARY

          for RG in broxiva-prod-rg broxiva-staging-rg broxiva-dev-rg; do
            COST=$(az consumption usage list \
              --query "[?contains(instanceName, '$RG')].pretaxCost" \
              --output tsv | awk '{s+=$1} END {print s}')
            echo "| $RG | \$$COST |" >> $GITHUB_STEP_SUMMARY
          done

      - name: Check for Anomalies
        id: anomaly
        run: |
          TOTAL="${{ steps.costs.outputs.total_cost }}"
          DAILY_AVG="${{ steps.costs.outputs.daily_avg }}"

          if (( $(echo "$DAILY_AVG > ${{ env.COST_THRESHOLD_DAILY }}" | bc -l) )); then
            echo "anomaly_detected=true" >> $GITHUB_OUTPUT
            echo "anomaly_type=daily" >> $GITHUB_OUTPUT
          elif (( $(echo "$TOTAL > ${{ env.COST_THRESHOLD_MONTHLY }}" | bc -l) )); then
            echo "anomaly_detected=true" >> $GITHUB_OUTPUT
            echo "anomaly_type=monthly" >> $GITHUB_OUTPUT
          else
            echo "anomaly_detected=false" >> $GITHUB_OUTPUT
          fi

      - name: Generate Cost Report
        run: |
          cat > cost-report-$(date +%Y%m%d).md <<EOF
          # Broxiva Infrastructure Cost Report

          **Date:** $(date -u)
          **Total 30-Day Cost:** \$${steps.costs.outputs.total_cost}
          **Daily Average:** \$${steps.costs.outputs.daily_avg}

          ## Cost Optimization Recommendations

          1. Review underutilized resources
          2. Consider Reserved Instances for production workloads
          3. Enable auto-shutdown for dev/test environments
          4. Review and cleanup unused storage
          5. Optimize AKS node pool sizing

          EOF

      - name: Upload Cost Report
        uses: actions/upload-artifact@v4
        with:
          name: cost-report-${{ github.run_number }}
          path: cost-report-*.md
          retention-days: 90

      - name: Create Anomaly Issue
        if: steps.anomaly.outputs.anomaly_detected == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Cost Anomaly Detected - ${new Date().toISOString().split('T')[0]}`,
              body: `## Cost Anomaly Alert\n\n**Type:** ${{ steps.anomaly.outputs.anomaly_type }}\n**Total Cost (30 days):** \\$${{ steps.costs.outputs.total_cost }}\n**Daily Average:** \\$${{ steps.costs.outputs.daily_avg }}\n\n### Threshold Exceeded\n\n- Daily threshold: \\$${{ env.COST_THRESHOLD_DAILY }}\n- Monthly threshold: \\$${{ env.COST_THRESHOLD_MONTHLY }}\n\n### Actions Required\n\n1. Review cost breakdown by resource group\n2. Identify unexpected resource usage\n3. Optimize or scale down as needed\n4. Update cost thresholds if justified\n\n**Workflow:** ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`,
              labels: ['cost-optimization', 'alert']
            });

      - name: Notify Slack
        if: steps.anomaly.outputs.anomaly_detected == 'true'
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Cost Anomaly Alert",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": ":moneybag: Cost Anomaly Detected"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {"type": "mrkdwn", "text": "*30-Day Total:*\n\\$${{ steps.costs.outputs.total_cost }}"},
                    {"type": "mrkdwn", "text": "*Daily Average:*\n\\$${{ steps.costs.outputs.daily_avg }}"}
                  ]
                },
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Review the cost breakdown and optimize resources as needed."
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

## 6. EXECUTION PLAN

### Phase 1: Preparation (Day 1)
```bash
# 1. Backup current workflows
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization
mkdir -p .github-workflows-backup-$(date +%Y%m%d)
cp -r .github/workflows/* .github-workflows-backup-$(date +%Y%m%d)/

# 2. Create git branch for changes
git checkout -b cicd/migrate-to-broxiva
```

### Phase 2: Bulk Replacement (Day 1)
```bash
cd .github/workflows

# Replace all citadelbuy references
find . -name "*.yml" -type f -exec sed -i 's/citadelbuy/broxiva/g' {} +
find . -name "*.yml" -type f -exec sed -i 's/CitadelBuy/Broxiva/g' {} +
find . -name "*.yml" -type f -exec sed -i 's/citadelplatforms/broxiva/g' {} +

# Verify changes
git diff --stat
git diff .github/workflows/terraform-plan.yml
git diff .github/workflows/cd-prod.yml
```

### Phase 3: Create New Workflows (Day 1-2)
```bash
# Create new production deployment workflow
touch .github/workflows/deploy-production.yml
# Copy content from section 3 above

# Create drift detection workflow
touch .github/workflows/drift-detection-daily.yml
# Copy content from section 4 above

# Create cost monitoring workflow
touch .github/workflows/cost-monitoring.yml
# Copy content from section 5 above
```

### Phase 4: Azure Infrastructure Updates (Day 2)
```bash
# Update Azure resource names (requires Azure CLI)
az login

# Production (if exists)
az group show --name citadelbuy-prod-rg
# If exists, consider:
# 1. Creating new broxiva-prod-rg
# 2. Moving resources
# 3. Or updating tags/metadata

# Update Terraform state backend
# Update backend.tf in each environment:
terraform {
  backend "azurerm" {
    resource_group_name  = "broxiva-tfstate-rg"
    storage_account_name = "broxivatfstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

### Phase 5: Testing (Day 3)
```bash
# Test workflows in order:
# 1. Test secret scanning (non-destructive)
gh workflow run secret-scan.yml

# 2. Test Terraform plan for dev
gh workflow run terraform-plan.yml

# 3. Test drift detection
gh workflow run drift-detection-daily.yml

# 4. Test cost monitoring
gh workflow run cost-monitoring.yml

# 5. Test dev deployment (if safe)
gh workflow run cd-dev.yml
```

### Phase 6: Verification & Commit (Day 3)
```bash
# Review all changes
git status
git diff

# Commit changes
git add .github/workflows/
git commit -m "ci: migrate CI/CD pipelines from CitadelBuy to Broxiva

- Replace all citadelbuy references with broxiva
- Update Azure resource group names
- Update ACR registry references
- Update deployment URLs
- Add production deployment workflow with approval gates
- Add daily drift detection workflow
- Add cost monitoring and anomaly detection
- Enhance security scanning integration"

# Push and create PR
git push origin cicd/migrate-to-broxiva
gh pr create --title "CI/CD Migration: CitadelBuy → Broxiva" \
  --body "Complete migration of all CI/CD pipelines to Broxiva branding. See CICD_MIGRATION_GUIDE.md for details."
```

---

## 7. ADDITIONAL WORKFLOWS TO CREATE

### Auto-Repair Drift Workflow
Create: `.github/workflows/drift-auto-repair.yml`

```yaml
name: Automatic Drift Repair

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to repair'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod
      auto_approve:
        description: 'Auto-approve apply (not recommended for prod)'
        required: false
        type: boolean
        default: false

permissions:
  id-token: write
  contents: write
  pull-requests: write

jobs:
  repair-drift:
    name: Repair Infrastructure Drift
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Init
        working-directory: infrastructure/terraform/environments/${{ github.event.inputs.environment }}
        run: |
          terraform init \
            -backend-config="resource_group_name=broxiva-tfstate-rg" \
            -backend-config="storage_account_name=broxivatfstate" \
            -backend-config="container_name=tfstate" \
            -backend-config="key=${{ github.event.inputs.environment }}.terraform.tfstate"

      - name: Terraform Apply (Auto-Repair)
        if: github.event.inputs.auto_approve == 'true' || github.event.inputs.environment != 'prod'
        working-directory: infrastructure/terraform/environments/${{ github.event.inputs.environment }}
        run: |
          terraform apply -auto-approve

      - name: Create Repair PR
        if: github.event.inputs.environment == 'prod' && github.event.inputs.auto_approve != 'true'
        uses: actions/github-script@v7
        with:
          script: |
            // Generate terraform plan
            // Create PR with plan
            // Request review from team
            core.info('Production drift repair requires manual review');
```

---

## 8. VERIFICATION CHECKLIST

After migration, verify:

- [ ] All workflow files use `broxiva` naming
- [ ] All Azure resource groups reference `broxiva-*-rg`
- [ ] All AKS clusters reference `broxiva-*-aks`
- [ ] All database names use `broxiva-*-postgres`
- [ ] All deployment URLs point to `*.broxiva.com`
- [ ] ACR registry is `broxivaacr.azurecr.io`
- [ ] Container registry is `ghcr.io/broxiva`
- [ ] Terraform state backend uses `broxiva-tfstate-rg`
- [ ] Production workflows have manual approval
- [ ] Secret scanning is enabled on all branches
- [ ] Drift detection runs daily
- [ ] Cost monitoring is configured
- [ ] Slack/Teams notifications configured
- [ ] Test runs of all critical workflows succeed

---

## 9. ROLLBACK PLAN

If issues occur:

```bash
# Restore from backup
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization
rm -rf .github/workflows
cp -r .github-workflows-backup-YYYYMMDD .github/workflows

# Reset git changes
git reset --hard origin/main

# Restore Azure resources (if modified)
# Use Terraform to recreate from state backup
```

---

## 10. MONITORING POST-MIGRATION

Monitor for 7 days:

```bash
# Check workflow runs
gh run list --limit 50

# Check for failures
gh run list --status failure

# View specific workflow
gh run view <run-id>

# Check Azure resources
az group list --query "[?contains(name, 'broxiva')].{Name:name, Location:location}" -o table

# Verify deployments
kubectl get deployments -n broxiva-production
kubectl get pods -n broxiva-production
```

---

## SUMMARY

**Total Files to Modify:** ~25 workflow files
**New Files to Create:** 3-5 new workflow files
**Estimated Time:** 2-3 days
**Risk Level:** Medium (with proper testing)
**Rollback Time:** < 1 hour

**Key Benefits:**
- Consistent branding across all CI/CD
- Enhanced security scanning
- Automated drift detection
- Cost monitoring and optimization
- Production deployment with proper gates

**Next Steps:**
1. Review this guide
2. Execute Phase 1 (backup)
3. Test in development environment first
4. Proceed with staging
5. Finally update production

---

**Document Version:** 1.0
**Last Updated:** 2025-12-13
**Author:** DevOps CI/CD Pipeline Engineer Super-Agent
