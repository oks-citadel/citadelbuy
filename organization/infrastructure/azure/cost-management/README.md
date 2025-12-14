# Broxiva Cost Management

This directory contains all cost governance and FinOps resources for Broxiva Azure infrastructure.

## Contents

- `budget-alerts.bicep` - Budget definitions with alert thresholds
- `cost-dashboard.json` - Azure Portal cost governance dashboard
- `deploy-cost-governance.sh` - Master deployment script for all cost governance components

## Quick Start

### Deploy All Cost Governance Components

```bash
# Deploy with defaults (uses current subscription)
./deploy-cost-governance.sh

# Deploy with specific configuration
./deploy-cost-governance.sh \
  --subscription "xxxxx-xxxx-xxxx" \
  --budget 10000 \
  --emails "finops@broxiva.com,devops@broxiva.com"
```

### Deploy Only Budgets

```bash
# Deploy budget alerts
az deployment sub create \
  --location eastus \
  --template-file budget-alerts.bicep \
  --parameters \
    budgetAmount=5000 \
    alertEmails="['finops@broxiva.com','devops@broxiva.com']"
```

### Deploy Cost Dashboard

```bash
# Update subscription ID in cost-dashboard.json first
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
sed -i "s/{subscriptionId}/${SUBSCRIPTION_ID}/g" cost-dashboard.json

# Deploy dashboard
az portal dashboard create \
  --resource-group broxiva-ops \
  --name broxiva-cost-dashboard \
  --input-path cost-dashboard.json \
  --location eastus
```

## Budget Structure

The budget alerts are organized by environment:

- **Monthly Budget**: Overall subscription budget with alerts at 50%, 75%, 90%, and 100% (forecasted)
- **Development Budget**: 20% of total - alerts at 80% and 100%
- **Staging Budget**: 30% of total - alerts at 80% and 100%
- **Production Budget**: 50% of total - alerts at 70%, 85%, and 100% (forecasted)
- **AKS Budget**: 40% of total - specific tracking for Kubernetes costs

## Cost Dashboard Widgets

The dashboard includes:

1. Monthly cost trend by resource group
2. Cost distribution by environment (pie chart)
3. Top 10 services by cost
4. Cost by Azure region
5. Daily cost trend by environment
6. Cost allocation by cost center
7. Cost breakdown by key resource types (AKS, VMs, Databases)

## Alert Response Procedures

| Alert Level | Action Required | Response Time | Owner |
|-------------|----------------|---------------|-------|
| 50% | Review forecast, identify trends | 24 hours | FinOps Team |
| 75% | Investigate top cost drivers | 4 hours | DevOps Lead |
| 90% | Implement cost controls | 2 hours | Engineering Manager |
| 100% (forecast) | Executive review, immediate action | 1 hour | CTO |

## Customization

### Update Budget Amount

Edit the `budgetAmount` parameter in deployment:

```bash
az deployment sub create \
  --location eastus \
  --template-file budget-alerts.bicep \
  --parameters budgetAmount=8000
```

### Update Alert Emails

```bash
az deployment sub create \
  --location eastus \
  --template-file budget-alerts.bicep \
  --parameters alertEmails="['new-email@broxiva.com']"
```

### Modify Budget Thresholds

Edit the `budget-alerts.bicep` file and update the `notifications` section:

```bicep
notifications: {
  Actual_80_Percent: {
    enabled: true
    operator: 'GreaterThan'
    threshold: 80  // Change this value
    contactEmails: alertEmails
    thresholdType: 'Actual'
  }
}
```

## Integration with Auto-Shutdown

The budgets work in conjunction with the auto-shutdown automation:

- When budget exceeds 75%, review auto-shutdown schedules
- When budget exceeds 90%, consider extending shutdown hours
- Budget alerts trigger reviews of resource utilization

## Monitoring and Reporting

### View Current Costs

```bash
# Current month costs
az consumption usage list \
  --start-date $(date -d "$(date +%Y-%m-01)" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  -o table

# View budget status
az consumption budget list --output table
```

### Generate Cost Reports

```bash
# Daily cost report
../../scripts/cost-report.sh --period daily

# Weekly cost report with email
../../scripts/cost-report.sh --period weekly --email finops@broxiva.com

# Monthly HTML report
../../scripts/cost-report.sh --period monthly --format html
```

## Cost Optimization Recommendations

Based on budget alerts, consider:

1. **Development Environment**: Scale to minimum viable resources
2. **Staging Environment**: Match production topology at 50% capacity
3. **Production Environment**: Use Reserved Instances for 40-60% savings
4. **Auto-Shutdown**: Ensure non-prod resources shutdown outside business hours
5. **Right-Sizing**: Review over-provisioned resources monthly

## Troubleshooting

### Budget Alerts Not Received

1. Verify email addresses in budget configuration:
   ```bash
   az consumption budget show --budget-name broxiva-monthly-budget
   ```

2. Check notification status in Azure Portal

3. Verify budget scope matches resources

### Dashboard Not Showing Data

1. Ensure Cost Management permissions are granted
2. Wait 24-48 hours for initial data population
3. Verify subscription ID in dashboard JSON
4. Check date range in dashboard widgets

### Budget Scope Issues

Budgets apply at subscription level. To filter by resource group:

```bicep
filter: {
  dimensions: {
    name: 'ResourceGroupName'
    operator: 'In'
    values: ['broxiva-prod-eastus']
  }
}
```

## Related Documentation

- **Main Governance Document**: `../../docs/FINOPS_GOVERNANCE.md`
- **Auto-Shutdown Automation**: `../automation/`
- **Azure Policies**: `../policies/`
- **Cost Management Scripts**: `../../scripts/cost-report.sh`

## Support

For issues or questions:
- **FinOps Team**: finops@broxiva.com
- **DevOps Team**: devops@broxiva.com
- **Documentation**: See FINOPS_GOVERNANCE.md

## References

- [Azure Cost Management Documentation](https://docs.microsoft.com/azure/cost-management-billing/)
- [Budget Best Practices](https://docs.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets)
- [Cost Analysis Guide](https://docs.microsoft.com/azure/cost-management-billing/costs/quick-acm-cost-analysis)
