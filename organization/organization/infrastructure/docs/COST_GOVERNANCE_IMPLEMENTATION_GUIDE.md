# Broxiva Cost Governance Implementation Guide

## Executive Summary

This guide provides step-by-step instructions for implementing comprehensive cost governance for Broxiva's Azure infrastructure. The implementation includes:

- Azure Policy enforcement for mandatory tagging and SKU restrictions
- Budget alerts with multi-level thresholds
- Automated shutdown of non-production resources
- Cost dashboards and reporting
- Environment-aware scaling rules

**Expected Outcomes**:
- 40-60% reduction in non-production costs
- 100% visibility into cost allocation
- Automated cost controls
- Real-time budget monitoring

## Prerequisites

### Required Access
- Azure Subscription Owner or Contributor role
- Azure Policy Contributor role
- Cost Management Reader role

### Required Tools
- Azure CLI (latest version)
- PowerShell 7.x (for runbooks)
- Bash shell (for scripts)
- jq (for JSON parsing in reports)

### Verify Installation

```bash
# Check Azure CLI
az --version

# Check PowerShell
pwsh --version

# Check jq
jq --version

# Login to Azure
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)

#### Day 1-2: Resource Assessment

**Objective**: Understand current state and costs

```bash
# 1. Get current subscription info
az account show

# 2. List all resource groups
az group list --output table

# 3. Check current costs (if available)
az consumption usage list --top 10 --output table

# 4. Identify untagged resources
az resource list --query "[?tags.env==null].{Name:name, Type:type, RG:resourceGroup}" -o table > untagged-resources.txt

# 5. Review resource counts by type
az resource list --query "[].type" -o tsv | sort | uniq -c | sort -rn
```

**Deliverables**:
- List of all resources
- Current cost baseline (if available)
- Untagged resources inventory
- Resource type distribution

#### Day 3: Deploy Azure Policies

**Objective**: Implement governance policies

```bash
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/azure/policies

# 1. Deploy mandatory tags policy
az policy definition create \
  --name "broxiva-mandatory-tags" \
  --display-name "Broxiva - Require Mandatory Tags on Resources" \
  --rules @mandatory-tags-policy.json \
  --mode Indexed

# 2. Assign to subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az policy assignment create \
  --name "broxiva-tags-assignment" \
  --display-name "Broxiva Mandatory Tags" \
  --policy "broxiva-mandatory-tags" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"

# 3. Deploy SKU restriction policy
az policy definition create \
  --name "broxiva-block-expensive-skus" \
  --display-name "Broxiva - Block Expensive SKUs in Non-Production" \
  --rules @block-expensive-skus-nonprod.json \
  --mode Indexed

az policy assignment create \
  --name "broxiva-sku-restriction" \
  --display-name "Broxiva SKU Restrictions" \
  --policy "broxiva-block-expensive-skus" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"

# 4. Deploy tag inheritance policies
for tag in env application owner costCenter; do
  az policy definition create \
    --name "broxiva-tag-inherit-${tag}" \
    --display-name "Broxiva - Inherit ${tag} Tag" \
    --rules @enforce-tag-inheritance.json \
    --mode Indexed \
    --params "{\"tagName\": {\"value\": \"${tag}\"}}"

  az policy assignment create \
    --name "broxiva-inherit-${tag}" \
    --policy "broxiva-tag-inherit-${tag}" \
    --scope "/subscriptions/${SUBSCRIPTION_ID}"
done
```

**Verification**:
```bash
# List all policy assignments
az policy assignment list --query "[?contains(name, 'broxiva')].{Name:name, Policy:displayName}" -o table

# Check policy compliance
az policy state summarize --top 1
```

#### Day 4-5: Tag Remediation

**Objective**: Tag all existing resources

```bash
# 1. Tag resource groups first
az group update \
  --name broxiva-dev-eastus \
  --tags env=development application=broxiva owner=devops@broxiva.com costCenter=engineering autoShutdown=true

az group update \
  --name broxiva-staging-eastus \
  --tags env=staging application=broxiva owner=devops@broxiva.com costCenter=engineering autoShutdown=true

az group update \
  --name broxiva-prod-eastus \
  --tags env=production application=broxiva owner=ops@broxiva.com costCenter=operations autoShutdown=false

# 2. Tag individual resources (resources inherit from RG but can override)
# Development resources
az resource tag \
  --tags env=development application=broxiva owner=devops@broxiva.com costCenter=engineering autoShutdown=true \
  --ids $(az resource list -g broxiva-dev-eastus --query "[].id" -o tsv)

# Staging resources
az resource tag \
  --tags env=staging application=broxiva owner=devops@broxiva.com costCenter=engineering autoShutdown=true \
  --ids $(az resource list -g broxiva-staging-eastus --query "[].id" -o tsv)

# Production resources
az resource tag \
  --tags env=production application=broxiva owner=ops@broxiva.com costCenter=operations autoShutdown=false \
  --ids $(az resource list -g broxiva-prod-eastus --query "[].id" -o tsv)

# 3. Verify tagging compliance
az resource list --query "[?tags.env==null].{Name:name, RG:resourceGroup}" -o table
```

**Create Tagging Script** (for ongoing use):

```bash
#!/bin/bash
# tag-resources.sh - Bulk tagging utility

RESOURCE_GROUP=$1
ENVIRONMENT=$2
OWNER=$3
COST_CENTER=$4

if [ -z "$RESOURCE_GROUP" ] || [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <resource-group> <environment> <owner> <cost-center>"
    exit 1
fi

az resource tag \
  --tags \
    env=$ENVIRONMENT \
    application=broxiva \
    owner=${OWNER:-devops@broxiva.com} \
    costCenter=${COST_CENTER:-engineering} \
    autoShutdown=$([ "$ENVIRONMENT" != "production" ] && echo "true" || echo "false") \
  --ids $(az resource list -g "$RESOURCE_GROUP" --query "[].id" -o tsv)
```

### Phase 2: Budget and Monitoring (Week 2)

#### Day 1-2: Deploy Budgets

**Objective**: Implement budget alerts

```bash
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/azure/cost-management

# 1. Deploy all budgets
az deployment sub create \
  --location eastus \
  --template-file budget-alerts.bicep \
  --parameters \
    budgetName="broxiva-monthly-budget" \
    budgetAmount=5000 \
    startDate="2025-01-01" \
    alertEmails="['finops@broxiva.com','devops@broxiva.com']"

# 2. Verify budget creation
az consumption budget list --output table

# 3. Test budget alerts (optional - requires waiting for cost data)
# Navigate to Azure Portal > Cost Management + Billing > Budgets
```

**Customize Budget Amounts** (if needed):

Edit `budget-alerts.bicep`:
```bicep
// Adjust these percentages based on your needs
resource devBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  properties: {
    amount: budgetAmount * 20 / 100  // 20% for dev (adjust as needed)
    ...
  }
}
```

#### Day 3-4: Deploy Cost Dashboard

**Objective**: Visualize costs in Azure Portal

```bash
# 1. Update subscription ID in dashboard
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
sed -i "s/{subscriptionId}/${SUBSCRIPTION_ID}/g" cost-dashboard.json

# 2. Deploy dashboard
az portal dashboard create \
  --resource-group broxiva-ops \
  --name broxiva-cost-dashboard \
  --input-path cost-dashboard.json \
  --location eastus

# 3. Access dashboard
echo "Dashboard URL: https://portal.azure.com/#blade/Microsoft_Azure_Portal/Dashboard/id/broxiva-cost-dashboard"
```

**Dashboard Features**:
- Monthly cost trends
- Cost by environment
- Top 10 cost drivers
- Regional cost distribution
- Cost center allocation

#### Day 5: Set Up Cost Reporting

**Objective**: Automate cost reports

```bash
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/scripts

# Make scripts executable
chmod +x cost-report.sh

# 1. Test daily report
./cost-report.sh --period daily --format text

# 2. Test weekly HTML report
./cost-report.sh --period weekly --format html --output weekly-report.html

# 3. Test JSON export
./cost-report.sh --period monthly --format json --output monthly-costs.json

# 4. Schedule automated reports (using cron)
crontab -e
# Add:
# Daily report at 9 AM
0 9 * * * /path/to/cost-report.sh --period daily --email finops@broxiva.com

# Weekly report on Monday at 9 AM
0 9 * * 1 /path/to/cost-report.sh --period weekly --format html --email finops@broxiva.com

# Monthly report on 1st at 9 AM
0 9 1 * * /path/to/cost-report.sh --period monthly --format html --email cto@broxiva.com
```

### Phase 3: Auto-Shutdown Automation (Week 3)

#### Day 1-2: Create Automation Infrastructure

**Objective**: Set up Azure Automation

```bash
# 1. Create resource group for ops
az group create \
  --name broxiva-ops \
  --location eastus \
  --tags env=shared application=broxiva costCenter=operations autoShutdown=false

# 2. Create automation account
az automation account create \
  --name broxiva-automation \
  --resource-group broxiva-ops \
  --location eastus

# 3. Enable managed identity
az automation account update \
  --name broxiva-automation \
  --resource-group broxiva-ops \
  --assign-identity

# 4. Grant permissions
PRINCIPAL_ID=$(az automation account show \
  --name broxiva-automation \
  --resource-group broxiva-ops \
  --query identity.principalId -o tsv)

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Contributor" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"
```

#### Day 3: Deploy Runbook

**Objective**: Import auto-shutdown runbook

```bash
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/azure/automation

# 1. Create runbook
az automation runbook create \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --name auto-shutdown-runbook \
  --type PowerShell

# 2. Import content
az automation runbook replace-content \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --name auto-shutdown-runbook \
  --content @auto-shutdown-runbook.ps1

# 3. Publish runbook
az automation runbook publish \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --name auto-shutdown-runbook
```

#### Day 4: Test Auto-Shutdown

**Objective**: Verify automation works correctly

```bash
# 1. Test in dry-run mode first
az automation runbook start \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --name auto-shutdown-runbook \
  --parameters '{\"Environment\":\"development\",\"Action\":\"shutdown\",\"DryRun\":true}'

# 2. Check job output
JOB_ID=$(az automation job list \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --query "[0].jobId" -o tsv)

az automation job show \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --job-name $JOB_ID

# 3. View job output
az automation job get-output \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --job-name $JOB_ID

# 4. Test actual shutdown (on a test resource group first!)
az automation runbook start \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --name auto-shutdown-runbook \
  --parameters '{\"Environment\":\"development\",\"Action\":\"shutdown\",\"DryRun\":false}'

# 5. Test resume
az automation runbook start \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --name auto-shutdown-runbook \
  --parameters '{\"Environment\":\"development\",\"Action\":\"start\",\"DryRun\":false}'
```

#### Day 5: Deploy Logic Apps Schedules

**Objective**: Automate shutdown schedules

```bash
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/azure/automation

# Deploy Logic Apps for scheduled execution
az deployment group create \
  --resource-group broxiva-ops \
  --template-file auto-shutdown-logic-app.json \
  --parameters \
    logicAppName="broxiva-auto-shutdown" \
    automationAccountName="broxiva-automation" \
    location="eastus"

# Verify Logic Apps
az logic workflow list --resource-group broxiva-ops --output table
```

**Schedule Summary**:
- **Weekday Evening**: Shutdown at 7 PM (Mon-Fri)
- **Weekend**: Shutdown Friday 7 PM
- **Monday Morning**: Startup at 7 AM Monday

### Phase 4: Validation and Optimization (Week 4)

#### Day 1-2: Validate All Components

**Validation Checklist**:

```bash
# 1. Verify policies
az policy assignment list --query "[?contains(name, 'broxiva')].displayName" -o table

# 2. Verify budgets
az consumption budget list --output table

# 3. Verify automation
az automation runbook list \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --output table

# 4. Verify Logic Apps
az logic workflow list --resource-group broxiva-ops --output table

# 5. Check tagging compliance
UNTAGGED=$(az resource list --query "[?tags.env==null]" --output tsv | wc -l)
echo "Untagged resources: $UNTAGGED"

# 6. Test cost reporting
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/scripts
./cost-report.sh --period daily
```

#### Day 3-4: Monitor First Week

**Monitoring Activities**:

1. **Daily**: Check auto-shutdown execution
   ```bash
   # Check recent automation jobs
   az automation job list \
     --automation-account-name broxiva-automation \
     --resource-group broxiva-ops \
     --query "[?endTime >= '$(date -d '1 day ago' --iso-8601)']" \
     --output table
   ```

2. **Daily**: Review cost trends
   ```bash
   ./cost-report.sh --period daily --email finops@broxiva.com
   ```

3. **Weekly**: Budget compliance check
   ```bash
   az consumption budget list --output table
   ```

4. **Weekly**: Tag compliance audit
   ```bash
   az resource list --query "[?tags.env==null].{Name:name, RG:resourceGroup}" -o table
   ```

#### Day 5: Optimization

**Cost Optimization Actions**:

1. **Right-size resources** based on first week metrics
2. **Adjust shutdown schedules** if needed
3. **Review budget thresholds** based on actual spending
4. **Fine-tune policies** based on exceptions

## Using the Scripts

### Manual Shutdown Script

```bash
cd /c/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/infrastructure/scripts

# Shutdown development (dry run)
./shutdown-non-prod.sh --env development --dry-run

# Shutdown development (actual)
./shutdown-non-prod.sh --env development

# Shutdown both dev and staging
./shutdown-non-prod.sh --env development,staging

# Shutdown with exclusions
./shutdown-non-prod.sh --env development --exclude broxiva-monitoring
```

### Manual Resume Script

```bash
# Resume development environment
./resume-environment.sh --env development

# Resume specific resource group
./resume-environment.sh --resource-group broxiva-dev-eastus

# Dry run first
./resume-environment.sh --env staging --dry-run
```

### Cost Reporting Script

```bash
# Daily text report
./cost-report.sh --period daily

# Weekly HTML report
./cost-report.sh --period weekly --format html --output weekly.html

# Monthly report with email
./cost-report.sh --period monthly --format html --email cto@broxiva.com

# JSON export for analysis
./cost-report.sh --period monthly --format json --output costs.json
```

## Troubleshooting

### Policy Issues

**Problem**: Resources created without required tags
```bash
# Solution: Check policy assignment
az policy assignment show --name broxiva-tags-assignment

# Verify policy is enforced
az policy state list --policy broxiva-mandatory-tags
```

**Problem**: Policy not applying to new resources
```bash
# Solution: Policies can take 30 minutes to apply
# Force evaluation:
az policy state trigger-scan
```

### Budget Alert Issues

**Problem**: Not receiving budget alerts
```bash
# Verify email addresses
az consumption budget show --budget-name broxiva-monthly-budget

# Check alert configuration
az consumption budget show --budget-name broxiva-monthly-budget \
  --query "notifications" -o json
```

### Automation Issues

**Problem**: Runbook failing
```bash
# Check recent job failures
az automation job list \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --query "[?status=='Failed']" \
  --output table

# View error details
az automation job get-output \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --job-name <JOB_ID>
```

**Problem**: Resources not shutting down
```bash
# Verify managed identity permissions
PRINCIPAL_ID=$(az automation account show \
  --name broxiva-automation \
  --resource-group broxiva-ops \
  --query identity.principalId -o tsv)

az role assignment list --assignee $PRINCIPAL_ID --output table
```

### Cost Reporting Issues

**Problem**: Cost data not available
```bash
# Cost data can be delayed 24-48 hours
# Verify Cost Management permissions
az role assignment list --assignee $(az account show --query user.name -o tsv) \
  --query "[?roleDefinitionName=='Cost Management Reader']" -o table
```

## Best Practices

### Tagging Best Practices

1. **Consistent naming**: Use lowercase for tag names
2. **Standardize values**: `development` not `dev` or `Development`
3. **Resource group tags**: Tag RGs first, resources inherit
4. **Automation tags**: Include `nodeCount` for AKS restoration

### Budget Best Practices

1. **Start conservative**: Begin with lower budgets, adjust up
2. **Multiple thresholds**: 50%, 75%, 90%, 100%
3. **Forecasted alerts**: Enable 100% forecasted alerts
4. **Regular reviews**: Monthly budget reviews and adjustments

### Automation Best Practices

1. **Dry run first**: Always test with `DryRun=true`
2. **Gradual rollout**: Test on dev, then staging
3. **Exclusion tags**: Use `autoShutdown=false` for exceptions
4. **Monitoring**: Monitor first week closely

### Reporting Best Practices

1. **Daily reports**: For active cost management periods
2. **Weekly summaries**: For stakeholder visibility
3. **Monthly analysis**: For trend analysis and planning
4. **Export data**: Keep JSON exports for historical analysis

## Maintenance

### Weekly Tasks

```bash
# 1. Review cost trends
./cost-report.sh --period weekly

# 2. Check untagged resources
az resource list --query "[?tags.env==null]" -o table

# 3. Verify automation jobs
az automation job list \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --query "[?endTime >= '$(date -d '7 days ago' --iso-8601)']" \
  --output table

# 4. Review budget status
az consumption budget list --output table
```

### Monthly Tasks

```bash
# 1. Generate executive report
./cost-report.sh --period monthly --format html --email cto@broxiva.com

# 2. Review and adjust budgets
az deployment sub create \
  --location eastus \
  --template-file budget-alerts.bicep \
  --parameters budgetAmount=<NEW_AMOUNT>

# 3. Audit policy compliance
az policy state summarize --top 1

# 4. Review cost optimization opportunities
# - Unused resources
# - Over-provisioned VMs
# - Reserved instance candidates
```

### Quarterly Tasks

1. **Architecture review** for cost efficiency
2. **Policy updates** based on new services
3. **Budget re-forecasting** for next quarter
4. **Team training** on cost awareness

## Success Metrics

Track these KPIs to measure success:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Budget adherence | >95% | Monthly actual vs. budget |
| Non-prod utilization | <40% outside hours | Auto-shutdown success rate |
| Tagged resources | >95% | Tag compliance audit |
| Cost visibility | 100% by environment | Dashboard coverage |
| Shutdown success rate | >99% | Automation job success |
| Cost reduction | 40-60% for non-prod | Month-over-month comparison |

## Support and Resources

### Documentation
- Main Guide: `FINOPS_GOVERNANCE.md`
- Cost Management README: `../azure/cost-management/README.md`
- Script Documentation: Inline help in each script

### Contacts
- **FinOps Team**: finops@broxiva.com
- **DevOps Team**: devops@broxiva.com
- **CTO Office**: cto@broxiva.com

### External Resources
- [Azure Cost Management](https://docs.microsoft.com/azure/cost-management-billing/)
- [FinOps Foundation](https://www.finops.org/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-13
**Author**: Broxiva FinOps Team
