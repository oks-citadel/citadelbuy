# Broxiva FinOps & Cost Governance - Complete Index

Quick reference guide to all cost governance resources.

## Quick Links

### Start Here
1. **[Implementation Summary](../../FINOPS_COST_GOVERNANCE_SUMMARY.md)** - Overview of everything
2. **[Main Governance Guide](FINOPS_GOVERNANCE.md)** - Comprehensive policies and procedures
3. **[Implementation Guide](COST_GOVERNANCE_IMPLEMENTATION_GUIDE.md)** - Step-by-step deployment

### Deploy
- **[Master Deployment Script](../azure/cost-management/deploy-cost-governance.sh)** - One command to deploy everything
- **[Cost Management README](../azure/cost-management/README.md)** - Quick start and usage guide

## File Locations

### Documentation (infrastructure/docs/)
```
├── FINOPS_GOVERNANCE.md                          (56KB) Main governance framework
├── COST_GOVERNANCE_IMPLEMENTATION_GUIDE.md       (32KB) Step-by-step deployment
└── FINOPS_INDEX.md                               (this file)
```

### Policies (infrastructure/azure/policies/)
```
├── mandatory-tags-policy.json                    (1.5KB) Required tags enforcement
├── block-expensive-skus-nonprod.json             (3.2KB) SKU restrictions
└── enforce-tag-inheritance.json                  (1.2KB) Auto-inherit tags from RG
```

### Automation (infrastructure/azure/automation/)
```
├── auto-shutdown-runbook.ps1                     (8.5KB) PowerShell runbook
└── auto-shutdown-logic-app.json                  (5.2KB) Scheduled execution
```

### Cost Management (infrastructure/azure/cost-management/)
```
├── budget-alerts.bicep                           (5.8KB) Budget definitions
├── cost-dashboard.json                           (6.5KB) Azure Portal dashboard
├── deploy-cost-governance.sh                     (8.5KB) Master deployment
└── README.md                                     (12KB)  Quick reference
```

### Scripts (infrastructure/scripts/)
```
├── shutdown-non-prod.sh                          (6.5KB) Manual shutdown
├── resume-environment.sh                         (5.8KB) Resume resources
└── cost-report.sh                                (8.2KB) Generate cost reports
```

### Summary (organization/)
```
└── FINOPS_COST_GOVERNANCE_SUMMARY.md             (22KB)  Complete overview
```

## Quick Commands

### Deploy Everything
```bash
cd infrastructure/azure/cost-management
./deploy-cost-governance.sh \
  --subscription "YOUR_SUB_ID" \
  --budget 5000 \
  --emails "finops@broxiva.com,devops@broxiva.com"
```

### Manual Operations

#### Shutdown Non-Production
```bash
cd infrastructure/scripts
./shutdown-non-prod.sh --env development,staging
```

#### Resume Environment
```bash
./resume-environment.sh --env development
```

#### Generate Cost Report
```bash
./cost-report.sh --period daily
./cost-report.sh --period weekly --format html --email team@broxiva.com
```

### Verification

#### Check Policies
```bash
az policy assignment list --query "[?contains(name, 'broxiva')]" -o table
```

#### Check Budgets
```bash
az consumption budget list -o table
```

#### Check Automation
```bash
az automation runbook list \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops -o table
```

#### Check Costs
```bash
az consumption usage list --top 10 -o table
```

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Review FINOPS_GOVERNANCE.md
- [ ] Review COST_GOVERNANCE_IMPLEMENTATION_GUIDE.md
- [ ] Deploy Azure Policies
- [ ] Tag all resources
- [ ] Audit tag compliance

### Phase 2: Budgets & Monitoring (Week 2)
- [ ] Deploy budget alerts
- [ ] Deploy cost dashboard
- [ ] Configure automated reports
- [ ] Test email notifications

### Phase 3: Automation (Week 3)
- [ ] Create automation account
- [ ] Deploy auto-shutdown runbook
- [ ] Test runbook in dry-run mode
- [ ] Deploy Logic Apps schedules
- [ ] Verify automation works

### Phase 4: Validation (Week 4)
- [ ] Validate all policies
- [ ] Validate budgets
- [ ] Validate automation
- [ ] Monitor first week
- [ ] Optimize as needed

## Component Details

### 1. Azure Policies

| Policy | File | Purpose | Effect |
|--------|------|---------|--------|
| Mandatory Tags | mandatory-tags-policy.json | Enforce required tags | DENY |
| SKU Restrictions | block-expensive-skus-nonprod.json | Block expensive SKUs | DENY |
| Tag Inheritance | enforce-tag-inheritance.json | Auto-add tags | MODIFY |

**Required Tags**: env, application, owner, costCenter, autoShutdown

### 2. Auto-Shutdown

| Component | File | Purpose |
|-----------|------|---------|
| Runbook | auto-shutdown-runbook.ps1 | Shutdown/start logic |
| Schedules | auto-shutdown-logic-app.json | Automated execution |

**Schedule**:
- Weekdays: Shutdown 7 PM, Start 7 AM (next day)
- Weekends: Shutdown Friday 7 PM, Start Monday 7 AM

**Resources Affected**:
- Virtual Machines (deallocated)
- AKS Node Pools (scaled to 0)
- App Services (stopped)
- SQL Databases (scaled to Basic)
- Container Instances (stopped)

### 3. Budgets

| Budget | Allocation | Alert Thresholds |
|--------|-----------|------------------|
| Monthly Overall | $5,000 | 50%, 75%, 90%, 100% (forecast) |
| Development | 20% ($1,000) | 80%, 100% |
| Staging | 30% ($1,500) | 80%, 100% |
| Production | 50% ($2,500) | 70%, 85%, 100% (forecast) |
| AKS | 40% ($2,000) | 75%, 90% |

### 4. Cost Dashboard

**Widgets**:
1. Monthly cost trend by resource group
2. Cost by environment (pie)
3. Top 10 services by cost
4. Cost by region
5. Daily cost trend by environment
6. Cost allocation by cost center
7. Cost by resource types

**Access**: Azure Portal > Dashboards > broxiva-cost-dashboard

### 5. Cost Reports

**Formats**: text, html, json, csv
**Periods**: daily, weekly, monthly
**Delivery**: stdout, file, email

**Example Reports**:
```bash
# Daily text report
./cost-report.sh --period daily

# Weekly HTML email
./cost-report.sh --period weekly --format html --email finops@broxiva.com

# Monthly JSON export
./cost-report.sh --period monthly --format json --output costs.json
```

## Key Concepts

### Cost Allocation Strategy

```
Total Budget: $5,000/month
├── Production (50%): $2,500
│   ├── AKS: $1,000
│   ├── Databases: $625
│   ├── Storage: $500
│   └── Other: $375
├── Staging (30%): $1,500
│   ├── AKS: $600
│   ├── Databases: $375
│   └── Other: $525
└── Development (20%): $1,000
    ├── AKS: $400
    ├── Databases: $250
    └── Other: $350
```

### Tag Strategy

**Resource Group Tags** (inherited):
```json
{
  "env": "production|staging|development",
  "application": "broxiva",
  "owner": "team@broxiva.com",
  "costCenter": "engineering|operations|platform",
  "autoShutdown": "true|false"
}
```

**Resource-Specific Tags** (override):
```json
{
  "nodeCount": "2",           // For AKS restoration
  "originalTier": "Standard", // For DB restoration
  "autoShutdown": "false"     // Exception from shutdown
}
```

### Auto-Shutdown Logic

```
IF (resource.tags.env IN ['development', 'staging'])
   OR (resource.tags.autoShutdown == 'true')
THEN
   IF (time == scheduled_shutdown_time)
      SAVE current_state
      SHUTDOWN resource
   END IF
END IF

IF (time == scheduled_startup_time)
   RESTORE from saved_state
   START resource
END IF
```

### Budget Alert Response

| Alert | Action | Owner | Timeframe |
|-------|--------|-------|-----------|
| 50% | Review trends | FinOps | 24h |
| 75% | Investigate drivers | DevOps | 4h |
| 90% | Implement controls | Engineering Manager | 2h |
| 100% | Executive review | CTO | 1h |

## Expected Outcomes

### Cost Savings
- **Development**: 60% reduction (from $2,000 to $800/month)
- **Staging**: 45% reduction (from $1,500 to $825/month)
- **Production**: No change ($2,500/month)
- **Total**: 37.5% overall reduction (from $5,000 to $3,125/month)

### Operational Improvements
- 100% cost visibility by environment
- Real-time budget monitoring
- Automated cost controls
- Reduced manual intervention
- Improved resource accountability

## Troubleshooting Quick Reference

### Issue: Resources not shutting down
```bash
# Check automation jobs
az automation job list \
  --automation-account-name broxiva-automation \
  --resource-group broxiva-ops \
  --query "[?status=='Failed']" -o table

# Check runbook permissions
PRINCIPAL_ID=$(az automation account show \
  --name broxiva-automation \
  --resource-group broxiva-ops \
  --query identity.principalId -o tsv)
az role assignment list --assignee $PRINCIPAL_ID -o table
```

### Issue: Policies not enforcing
```bash
# Force policy scan
az policy state trigger-scan

# Check policy assignments
az policy assignment list --query "[?contains(name, 'broxiva')]" -o table
```

### Issue: Budget alerts not received
```bash
# Verify email configuration
az consumption budget show --budget-name broxiva-monthly-budget \
  --query "notifications" -o json
```

### Issue: Cost data not showing
```bash
# Cost data delayed 24-48 hours
# Verify permissions
az role assignment list --assignee $(az account show --query user.name -o tsv) \
  --query "[?roleDefinitionName=='Cost Management Reader']"
```

## Best Practices

### Tagging
1. Tag resource groups first, resources inherit
2. Use consistent values: `development` not `dev`
3. Include `nodeCount` tag on AKS for restoration
4. Use `autoShutdown=false` for exceptions

### Budgets
1. Start conservative, adjust based on actuals
2. Enable forecasted alerts
3. Review and adjust monthly
4. Set up email distribution lists

### Automation
1. Always test with dry-run first
2. Monitor first week closely
3. Save state before shutdown for restoration
4. Use exclusion tags for critical resources

### Reporting
1. Daily reports during initial weeks
2. Weekly summaries for stakeholders
3. Monthly analysis for trends
4. Export JSON for historical analysis

## Maintenance Schedule

### Daily
```bash
# Check automation status
az automation job list --automation-account-name broxiva-automation -g broxiva-ops

# Generate cost report
./infrastructure/scripts/cost-report.sh --period daily
```

### Weekly
```bash
# Tag compliance audit
az resource list --query "[?tags.env==null]" -o table

# Budget status
az consumption budget list -o table

# Weekly report
./infrastructure/scripts/cost-report.sh --period weekly --format html
```

### Monthly
```bash
# Executive report
./infrastructure/scripts/cost-report.sh --period monthly --format html --email cto@broxiva.com

# Review budget amounts
az deployment sub create --template-file budget-alerts.bicep --parameters budgetAmount=<NEW>

# Policy compliance
az policy state summarize
```

### Quarterly
1. Architecture review for cost efficiency
2. Policy updates for new Azure services
3. Budget re-forecasting
4. Team cost awareness training

## Support

### Documentation
- Main Guide: FINOPS_GOVERNANCE.md (comprehensive)
- Implementation: COST_GOVERNANCE_IMPLEMENTATION_GUIDE.md (step-by-step)
- Quick Start: ../azure/cost-management/README.md (rapid deployment)

### Contacts
- FinOps Team: finops@broxiva.com
- DevOps Team: devops@broxiva.com
- CTO Office: cto@broxiva.com

### External Resources
- [Azure Cost Management](https://docs.microsoft.com/azure/cost-management-billing/)
- [FinOps Foundation](https://www.finops.org/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

---

**Version**: 1.0.0
**Last Updated**: 2025-12-13
**Status**: Complete and Ready for Deployment
