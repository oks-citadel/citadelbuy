# Broxiva FinOps Governance Framework

## Table of Contents
1. [Overview](#overview)
2. [Cost Management Principles](#cost-management-principles)
3. [Governance Policies](#governance-policies)
4. [Budget Management](#budget-management)
5. [Auto-Shutdown Strategy](#auto-shutdown-strategy)
6. [Cost Allocation & Tagging](#cost-allocation--tagging)
7. [Monitoring & Reporting](#monitoring--reporting)
8. [Roles & Responsibilities](#roles--responsibilities)
9. [Implementation Guide](#implementation-guide)

## Overview

The Broxiva FinOps Governance Framework establishes comprehensive cost management practices to optimize cloud spending while maintaining operational excellence. This framework applies to all Azure resources across development, staging, and production environments.

### Goals
- **Cost Optimization**: Reduce unnecessary cloud spending by 40-60%
- **Visibility**: Provide real-time cost visibility across all teams
- **Accountability**: Enable cost allocation by environment, team, and project
- **Automation**: Implement automated cost controls and shutdown policies
- **Compliance**: Ensure all resources comply with tagging and budget policies

### Key Metrics
- Monthly budget adherence: >95%
- Non-production resource utilization: <40% (outside business hours)
- Cost per environment visibility: 100%
- Untagged resources: <5%

## Cost Management Principles

### 1. Right-Sizing Philosophy
- **Development**: Use minimal viable resources (Basic/Standard tiers)
- **Staging**: Match production topology at smaller scale (50% capacity)
- **Production**: Size for peak load + 20% buffer

### 2. Environment-Based Cost Targets
```
Total Monthly Budget: $5,000 (example)
├── Production: 50% ($2,500)
├── Staging: 30% ($1,500)
├── Development: 20% ($1,000)
└── Shared Services: Allocated proportionally
```

### 3. Cost-Conscious Development
- Developers responsible for resource cleanup
- Automated cleanup of orphaned resources
- Regular cost awareness training

## Governance Policies

### Mandatory Tagging Policy

All Azure resources MUST include these tags:

| Tag Name | Description | Required | Values |
|----------|-------------|----------|--------|
| `env` | Environment identifier | Yes | production, staging, development |
| `application` | Application name | Yes | broxiva |
| `owner` | Team or individual owner | Yes | email address |
| `costCenter` | Cost allocation center | Yes | engineering, operations, platform |
| `autoShutdown` | Enable auto-shutdown | Yes | true, false |

**Policy File**: `infrastructure/azure/policies/mandatory-tags-policy.json`

**Enforcement**: DENY resource creation without required tags

**Implementation**:
```bash
# Deploy the policy
az policy definition create \
  --name "broxiva-mandatory-tags" \
  --rules @infrastructure/azure/policies/mandatory-tags-policy.json \
  --mode Indexed

# Assign to subscription
az policy assignment create \
  --name "broxiva-tags-assignment" \
  --policy "broxiva-mandatory-tags" \
  --scope "/subscriptions/{subscription-id}"
```

### SKU Restrictions for Non-Production

Prevent expensive SKUs in non-production environments:

**Blocked VM Sizes (Dev/Staging)**:
- Standard_E64s_v3, Standard_E64_v3
- Standard_D64s_v3, Standard_D64_v3
- Standard_M128s, Standard_M64s
- Standard_L32s, Standard_G5

**Blocked Database Tiers (Dev/Staging)**:
- Premium
- Business Critical
- Hyperscale

**Policy File**: `infrastructure/azure/policies/block-expensive-skus-nonprod.json`

**Recommended Alternatives**:
- Development: Basic, Standard_B2s, Standard_D2s_v3
- Staging: Standard, Standard_D4s_v3, General Purpose

### Tag Inheritance Policy

Resources automatically inherit tags from parent resource groups.

**Policy File**: `infrastructure/azure/policies/enforce-tag-inheritance.json`

## Budget Management

### Budget Structure

#### 1. Overall Monthly Budget
- **Amount**: $5,000 (configurable)
- **Alerts**: 50%, 75%, 90% (actual), 100% (forecasted)
- **Recipients**: finops@broxiva.com, devops@broxiva.com

#### 2. Environment-Specific Budgets

**Development Budget**: 20% of total
```bicep
// Alert at 80% and 100%
// Auto-notification to dev team
// Trigger resource review at 90%
```

**Staging Budget**: 30% of total
```bicep
// Alert at 80% and 100%
// Require justification for overages
```

**Production Budget**: 50% of total
```bicep
// Alert at 70%, 85%, and forecasted 100%
// Executive notification at 85%
// Incident investigation at 100%
```

#### 3. Service-Specific Budgets

**AKS Budget**: 40% of total
- Track cluster compute costs
- Monitor node pool scaling
- Alert on unexpected scale-ups

### Budget Deployment

```bash
# Deploy all budgets
az deployment sub create \
  --location eastus \
  --template-file infrastructure/azure/cost-management/budget-alerts.bicep \
  --parameters budgetAmount=5000 \
               alertEmails="['finops@broxiva.com','devops@broxiva.com']"
```

### Budget Alert Response Procedures

| Alert Level | Action Required | Response Time | Owner |
|-------------|----------------|---------------|-------|
| 50% | Review forecast, identify trends | 24 hours | FinOps Team |
| 75% | Investigate top cost drivers | 4 hours | DevOps Lead |
| 90% | Implement cost controls | 2 hours | Engineering Manager |
| 100% (forecast) | Executive review, immediate action | 1 hour | CTO |

## Auto-Shutdown Strategy

### Schedule Overview

#### Weekday Schedule
- **Shutdown**: 7:00 PM local time (Monday-Friday)
- **Startup**: 7:00 AM local time (Monday-Friday)
- **Applies to**: Development and Staging only

#### Weekend Schedule
- **Shutdown**: Friday 7:00 PM
- **Startup**: Monday 7:00 AM
- **Applies to**: Development and Staging only

### Resources Affected

1. **Virtual Machines**: Full shutdown
2. **AKS Clusters**: Node pools scaled to 0
3. **App Services**: Stopped
4. **SQL Databases**: Scaled to Basic tier
5. **Container Instances**: Stopped

### Resources Excluded

- Production environment (env=production)
- Resources tagged with `autoShutdown=false`
- Critical monitoring infrastructure
- Shared services (Key Vault, Container Registry)

### Implementation

#### Option 1: Azure Automation Runbook (Recommended)

```bash
# Deploy automation account and runbook
az automation account create \
  --name "broxiva-automation" \
  --resource-group "broxiva-ops" \
  --location "eastus"

# Import the runbook
az automation runbook create \
  --automation-account-name "broxiva-automation" \
  --resource-group "broxiva-ops" \
  --name "auto-shutdown-runbook" \
  --type "PowerShell" \
  --source infrastructure/azure/automation/auto-shutdown-runbook.ps1
```

#### Option 2: Logic Apps

```bash
# Deploy Logic Apps for scheduled shutdown
az deployment group create \
  --resource-group "broxiva-ops" \
  --template-file infrastructure/azure/automation/auto-shutdown-logic-app.json \
  --parameters automationAccountName="broxiva-automation"
```

### Manual Override Procedures

#### Shutdown Specific Environment
```bash
# Using the runbook
./infrastructure/scripts/shutdown-non-prod.sh --env staging --dry-run false
```

#### Resume Specific Environment
```bash
# Resume all resources in an environment
./infrastructure/scripts/resume-environment.sh --env development
```

#### Disable Auto-Shutdown for Resource
```bash
# Tag resource to exclude from auto-shutdown
az resource tag \
  --tags autoShutdown=false \
  --ids /subscriptions/{sub-id}/resourceGroups/{rg}/providers/{resource-id}
```

## Cost Allocation & Tagging

### Tagging Strategy

#### Environment Tags
```json
{
  "env": "production|staging|development",
  "application": "broxiva",
  "component": "api|web|worker|database",
  "version": "1.0.0"
}
```

#### Ownership Tags
```json
{
  "owner": "team-platform@broxiva.com",
  "costCenter": "engineering|operations|platform",
  "project": "broxiva-v1"
}
```

#### Automation Tags
```json
{
  "autoShutdown": "true|false",
  "nodeCount": "2",  // For AKS restore
  "tier": "Basic|Standard|Premium"  // For DB restore
}
```

### Cost Allocation Model

```
Monthly Costs by Dimension:
├── By Environment (env tag)
│   ├── Production: 50%
│   ├── Staging: 30%
│   └── Development: 20%
├── By Cost Center (costCenter tag)
│   ├── Engineering: 60%
│   ├── Operations: 25%
│   └── Platform: 15%
└── By Service Type
    ├── Compute (AKS, VMs): 40%
    ├── Storage: 20%
    ├── Databases: 25%
    ├── Networking: 10%
    └── Other: 5%
```

## Monitoring & Reporting

### Cost Dashboard

Deploy the cost governance dashboard:

```bash
az portal dashboard create \
  --resource-group "broxiva-ops" \
  --name "broxiva-cost-dashboard" \
  --input-path infrastructure/azure/cost-management/cost-dashboard.json
```

**Dashboard Widgets**:
1. Monthly cost trend by resource group
2. Cost by environment (pie chart)
3. Top 10 services by cost
4. Cost by region
5. Daily cost trend by environment
6. Cost allocation by cost center
7. Cost by key resource types

### Automated Reporting

#### Daily Cost Report
```bash
# Generate and email daily cost summary
./infrastructure/scripts/cost-report.sh --period daily --email finops@broxiva.com
```

#### Weekly Cost Analysis
- Top 10 cost drivers
- Week-over-week trend analysis
- Budget vs. actual comparison
- Anomaly detection

#### Monthly Executive Report
- Total spend vs. budget
- Cost by environment
- Optimization opportunities
- Forecast for next month

### Cost Anomaly Detection

**Alert Triggers**:
- Daily cost increase >25% vs. previous day
- Weekly cost increase >15% vs. previous week
- Unexpected resource creation in production
- SKU changes to more expensive tiers

**Response**:
1. Automated alert to DevOps team
2. Investigation within 4 hours
3. Root cause analysis
4. Implement preventive measures

## Roles & Responsibilities

### FinOps Team
- Set and manage budgets
- Monitor cost trends
- Generate cost reports
- Recommend optimizations
- Enforce governance policies

### DevOps Team
- Implement auto-shutdown automation
- Tag all resources correctly
- Respond to cost alerts
- Optimize resource configurations
- Clean up orphaned resources

### Engineering Teams
- Right-size resources during development
- Follow tagging standards
- Justify resource requests
- Participate in cost reviews
- Implement cost-efficient architectures

### Engineering Managers
- Approve budget overages
- Review team cost allocations
- Champion cost optimization
- Ensure team compliance

### CTO/Leadership
- Set overall cost targets
- Review monthly cost reports
- Approve major infrastructure changes
- Drive cost culture

## Implementation Guide

### Phase 1: Foundation (Week 1)

#### Day 1-2: Policy Deployment
```bash
# Deploy all governance policies
cd infrastructure/azure/policies

# Mandatory tags policy
az policy definition create \
  --name "broxiva-mandatory-tags" \
  --rules @mandatory-tags-policy.json \
  --mode Indexed

# SKU restriction policy
az policy definition create \
  --name "broxiva-block-expensive-skus" \
  --rules @block-expensive-skus-nonprod.json \
  --mode Indexed

# Tag inheritance policy
az policy definition create \
  --name "broxiva-tag-inheritance" \
  --rules @enforce-tag-inheritance.json \
  --mode Indexed

# Assign policies to subscription
az policy assignment create \
  --name "broxiva-governance" \
  --policy "broxiva-mandatory-tags" \
  --scope "/subscriptions/{subscription-id}"
```

#### Day 3: Budget Configuration
```bash
# Deploy budget alerts
az deployment sub create \
  --location eastus \
  --template-file infrastructure/azure/cost-management/budget-alerts.bicep \
  --parameters budgetAmount=5000 \
               startDate="2025-01-01" \
               alertEmails="['finops@broxiva.com']"
```

#### Day 4-5: Tagging Remediation
```bash
# Audit existing resources
az resource list --query "[?tags.env==null]" -o table

# Tag resource groups
az group update --name broxiva-dev --tags env=development application=broxiva

# Tag resources
az resource tag --tags env=development application=broxiva owner=devops@broxiva.com \
  --ids $(az resource list --resource-group broxiva-dev --query "[].id" -o tsv)
```

### Phase 2: Automation (Week 2)

#### Day 1-2: Automation Account Setup
```bash
# Create automation account
az automation account create \
  --name "broxiva-automation" \
  --resource-group "broxiva-ops" \
  --location "eastus"

# Enable managed identity
az automation account update \
  --name "broxiva-automation" \
  --resource-group "broxiva-ops" \
  --assign-identity

# Grant permissions
PRINCIPAL_ID=$(az automation account show \
  --name "broxiva-automation" \
  --resource-group "broxiva-ops" \
  --query identity.principalId -o tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Contributor" \
  --scope "/subscriptions/{subscription-id}"
```

#### Day 3-4: Deploy Auto-Shutdown
```bash
# Upload runbook
az automation runbook create \
  --automation-account-name "broxiva-automation" \
  --resource-group "broxiva-ops" \
  --name "auto-shutdown-runbook" \
  --type "PowerShell" \
  --source infrastructure/azure/automation/auto-shutdown-runbook.ps1

# Deploy Logic Apps
az deployment group create \
  --resource-group "broxiva-ops" \
  --template-file infrastructure/azure/automation/auto-shutdown-logic-app.json \
  --parameters automationAccountName="broxiva-automation"
```

#### Day 5: Testing
```bash
# Test in dry-run mode
az automation runbook start \
  --automation-account-name "broxiva-automation" \
  --resource-group "broxiva-ops" \
  --name "auto-shutdown-runbook" \
  --parameters Environment=development Action=shutdown DryRun=true

# Verify results in Azure Portal
# Enable production mode after validation
```

### Phase 3: Monitoring (Week 3)

#### Day 1-2: Dashboard Deployment
```bash
# Deploy cost dashboard
az portal dashboard create \
  --resource-group "broxiva-ops" \
  --name "broxiva-cost-dashboard" \
  --input-path infrastructure/azure/cost-management/cost-dashboard.json
```

#### Day 3-5: Reporting Setup
```bash
# Configure automated reports
# Set up email distribution lists
# Create Slack/Teams webhooks for alerts
# Test all notification channels
```

### Phase 4: Optimization (Ongoing)

#### Weekly Tasks
- Review cost trends
- Identify optimization opportunities
- Update budgets if needed
- Clean up unused resources

#### Monthly Tasks
- Executive cost review
- Budget vs. actual analysis
- Reserved instance recommendations
- Savings plan evaluation

#### Quarterly Tasks
- Architecture review for cost efficiency
- Policy updates
- Tool evaluation
- Team training

## Cost Optimization Checklist

### Compute Optimization
- [ ] Use Azure Reserved Instances for production VMs (40-60% savings)
- [ ] Implement auto-scaling for AKS node pools
- [ ] Use spot instances for batch workloads
- [ ] Right-size VMs based on utilization metrics
- [ ] Enable Azure Hybrid Benefit for Windows VMs

### Storage Optimization
- [ ] Use appropriate storage tiers (Hot/Cool/Archive)
- [ ] Enable lifecycle management policies
- [ ] Implement blob storage tiering
- [ ] Use Azure Files instead of VMs for file sharing
- [ ] Clean up orphaned disks and snapshots

### Database Optimization
- [ ] Use serverless SQL for development
- [ ] Implement auto-pause for dev databases
- [ ] Right-size database SKUs
- [ ] Use read replicas strategically
- [ ] Enable query performance insights

### Network Optimization
- [ ] Use Azure CDN for static content
- [ ] Consolidate network endpoints
- [ ] Review bandwidth usage
- [ ] Optimize data transfer patterns
- [ ] Use VNet peering instead of VPN where possible

## Best Practices

### Development Environment
1. Use smallest viable SKUs (Basic, B-series VMs)
2. Auto-shutdown after business hours
3. Share resources across developers where possible
4. Use containers instead of VMs
5. Clean up resources after testing

### Staging Environment
1. Match production topology at 50% scale
2. Auto-shutdown on weekends
3. Use production-like SKUs but smaller sizes
4. Share databases where appropriate
5. Regular resource cleanup

### Production Environment
1. Use Reserved Instances (1-3 year commitment)
2. Implement auto-scaling
3. Right-size based on actual usage
4. Monitor and optimize continuously
5. No auto-shutdown (obviously!)

## Appendix

### Useful Commands

#### Cost Analysis
```bash
# Get current month costs
az consumption usage list \
  --start-date $(date -d "$(date +%Y-%m-01)" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[].{Date:usageEnd, Cost:pretaxCost}" \
  -o table

# Get costs by resource group
az consumption usage list \
  --top 10 \
  --query "value[].{ResourceGroup:instanceName, Cost:pretaxCost}" \
  -o table
```

#### Resource Cleanup
```bash
# Find untagged resources
az resource list --query "[?tags.env==null].{Name:name, Type:type, RG:resourceGroup}" -o table

# Find unused disks
az disk list --query "[?diskState=='Unattached'].{Name:name, RG:resourceGroup, Size:diskSizeGb}" -o table

# Find orphaned NICs
az network nic list --query "[?virtualMachine==null].{Name:name, RG:resourceGroup}" -o table
```

### Support & Contacts

- **FinOps Team**: finops@broxiva.com
- **DevOps Team**: devops@broxiva.com
- **Azure Support**: azure-support@broxiva.com
- **Escalation**: cto@broxiva.com

### References

- [Azure Cost Management Best Practices](https://docs.microsoft.com/azure/cost-management-billing/)
- [FinOps Foundation](https://www.finops.org/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Azure Advisor](https://docs.microsoft.com/azure/advisor/)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-13
**Owner**: Broxiva FinOps Team
**Review Cycle**: Quarterly
