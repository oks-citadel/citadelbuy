# Broxiva FinOps Governance Framework

## Document Information

**Project:** Broxiva E-commerce Platform
**Purpose:** Cost Governance and Financial Operations
**Owner:** FinOps Team
**Last Updated:** December 13, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [FinOps Principles](#finops-principles)
3. [Mandatory Tagging Policy](#mandatory-tagging-policy)
4. [Cost Allocation Strategy](#cost-allocation-strategy)
5. [Budget Framework](#budget-framework)
6. [Cost Controls and Guardrails](#cost-controls-and-guardrails)
7. [Automation and Optimization](#automation-and-optimization)
8. [Reporting and Visibility](#reporting-and-visibility)
9. [Roles and Responsibilities](#roles-and-responsibilities)
10. [Compliance and Auditing](#compliance-and-auditing)

---

## Executive Summary

This document establishes the FinOps governance framework for Broxiva, ensuring cost efficiency, accountability, and optimization across all Azure environments. The framework implements environment-aware cost behavior, mandatory tagging, automated shutdowns, and comprehensive budget controls.

### Key Objectives

- **Cost Transparency:** 100% resource tagging for accurate cost allocation
- **Waste Elimination:** Automated shutdown of idle non-production resources
- **Budget Control:** Multi-tier alerting at 50%, 75%, 90%, and 100% thresholds
- **Optimization:** Continuous right-sizing and SKU optimization
- **Accountability:** Clear ownership and cost center assignments

### Monthly Cost Targets (USD)

| Environment | Target Budget | Alert Threshold | Hard Limit |
|-------------|---------------|-----------------|------------|
| Production | $8,000 | $7,200 (90%) | $8,800 (110%) |
| Staging | $2,000 | $1,800 (90%) | $2,200 (110%) |
| Development | $800 | $720 (90%) | $880 (110%) |
| **Total** | **$10,800** | **$9,720** | **$11,880** |

---

## FinOps Principles

### 1. Cloud Financial Management

**Inform Phase:**
- Real-time cost visibility through Azure Cost Management
- Daily cost reports distributed to stakeholders
- Weekly cost review meetings for optimization opportunities

**Optimize Phase:**
- Right-sizing recommendations implemented monthly
- Reserved Instance (RI) purchases for steady-state workloads
- Spot VM usage for non-critical batch workloads

**Operate Phase:**
- Automated budget enforcement
- Environment-specific cost policies
- Continuous monitoring and alerting

### 2. Cost Optimization Hierarchy

```
Priority 1: Eliminate Waste (Idle Resources)
    ├── Shutdown non-prod outside business hours
    ├── Delete unused resources (7+ days idle)
    └── Remove orphaned resources (disks, IPs, etc.)

Priority 2: Right-Size Resources
    ├── Analyze utilization metrics (CPU, memory, storage)
    ├── Downgrade over-provisioned resources
    └── Upgrade under-provisioned causing performance issues

Priority 3: Purchase Commitments
    ├── 1-year Reserved Instances for production databases
    ├── 3-year RIs for core compute (>80% utilization)
    └── Savings Plans for variable workloads

Priority 4: Architectural Optimization
    ├── Serverless for event-driven workloads
    ├── PaaS over IaaS where applicable
    └── Multi-tenant resources where secure
```

---

## Mandatory Tagging Policy

### Required Tags

All Azure resources **MUST** have the following tags:

| Tag Name | Allowed Values | Description | Example |
|----------|---------------|-------------|---------|
| `env` | `prod`, `staging`, `dev` | Environment designation | `prod` |
| `application` | `broxiva` | Application identifier | `broxiva` |
| `owner` | Email address | Resource owner/contact | `platform-team@broxiva.com` |
| `costCenter` | `ecommerce`, `platform`, `infrastructure` | Cost allocation center | `ecommerce` |
| `autoShutdown` | `true`, `false` | Auto-shutdown eligibility | `true` |

### Optional Tags (Recommended)

| Tag Name | Description | Example |
|----------|-------------|---------|
| `project` | Project or initiative name | `payment-gateway-v2` |
| `businessUnit` | Business unit owner | `revenue-operations` |
| `compliance` | Compliance requirements | `pci-dss`, `gdpr` |
| `dataClassification` | Data sensitivity level | `confidential`, `public` |
| `createdBy` | Creation method | `terraform`, `manual`, `pipeline` |
| `createdDate` | Creation timestamp | `2025-12-13` |
| `expiryDate` | Planned deletion date | `2026-01-15` |

### Tag Enforcement

**Azure Policy:** `enforce-mandatory-tags`

```json
{
  "effect": "deny",
  "conditions": [
    "Missing required tags: env, application, owner, costCenter, autoShutdown"
  ]
}
```

**Exemptions:**
- Terraform state resource group (`broxiva-tfstate-rg`)
- AKS managed resource groups (`MC_*`)
- Azure-managed resources (diagnostic settings, etc.)

### Tag Validation Rules

```yaml
env:
  pattern: ^(prod|staging|dev)$
  required: true

application:
  pattern: ^broxiva$
  required: true

owner:
  pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
  required: true

costCenter:
  pattern: ^(ecommerce|platform|infrastructure)$
  required: true

autoShutdown:
  pattern: ^(true|false)$
  required: true
  notes: "Must be 'true' for dev/staging non-critical resources"
```

---

## Cost Allocation Strategy

### Cost Center Breakdown

#### 1. E-commerce Cost Center (`ecommerce`)

**Scope:** Revenue-generating services and customer-facing infrastructure

**Resources:**
- AKS user node pools (application workloads)
- PostgreSQL production database
- Redis cache (production)
- CDN and Front Door
- Media storage (product images, user uploads)
- Payment gateway integrations

**Monthly Budget:** $6,500 (60% of total)

**Chargeback Model:** Direct allocation to revenue operations

#### 2. Platform Cost Center (`platform`)

**Scope:** Shared services and platform engineering

**Resources:**
- AKS system node pools
- Container Registry (ACR)
- Key Vault
- Application Insights
- Log Analytics workspace
- Shared networking (VNets, NSGs)

**Monthly Budget:** $2,800 (26% of total)

**Chargeback Model:** Shared across all business units

#### 3. Infrastructure Cost Center (`infrastructure`)

**Scope:** Foundation and governance

**Resources:**
- Terraform state storage
- Azure DevOps agents
- Bastion hosts
- VPN gateways
- Backup vaults
- Monitoring infrastructure

**Monthly Budget:** $1,500 (14% of total)

**Chargeback Model:** IT overhead allocation

### Environment-Based Allocation

| Environment | % of Budget | Cost Centers Included |
|-------------|-------------|----------------------|
| Production | 74% | All three cost centers |
| Staging | 19% | Platform + Infrastructure only |
| Development | 7% | Infrastructure only |

---

## Budget Framework

### Multi-Tier Budget Structure

#### Level 1: Organization Budget
- **Total Monthly Budget:** $10,800
- **Scope:** All Broxiva Azure resources
- **Alert Thresholds:** 75%, 90%, 100%, 110%
- **Action at 100%:** Executive notification + cost freeze
- **Action at 110%:** Automatic shutdown of non-critical resources

#### Level 2: Environment Budgets

**Production Environment:**
```yaml
budget_name: broxiva-prod-budget
monthly_amount: 8000
currency: USD
time_grain: Monthly

alert_thresholds:
  - percentage: 50
    contact_emails: [finops-team@broxiva.com]
    action: informational

  - percentage: 75
    contact_emails: [finops-team@broxiva.com, platform-lead@broxiva.com]
    action: warning

  - percentage: 90
    contact_emails: [finops-team@broxiva.com, platform-lead@broxiva.com, cto@broxiva.com]
    action: critical_review_required

  - percentage: 100
    contact_emails: [finops-team@broxiva.com, platform-lead@broxiva.com, cto@broxiva.com, cfo@broxiva.com]
    action: freeze_new_resources
```

**Staging Environment:**
```yaml
budget_name: broxiva-staging-budget
monthly_amount: 2000
currency: USD
time_grain: Monthly

alert_thresholds:
  - percentage: 75
    contact_emails: [finops-team@broxiva.com]
    action: warning

  - percentage: 90
    contact_emails: [finops-team@broxiva.com, platform-lead@broxiva.com]
    action: scale_down_recommendation

  - percentage: 100
    contact_emails: [finops-team@broxiva.com, platform-lead@broxiva.com]
    action: auto_shutdown_after_hours
```

**Development Environment:**
```yaml
budget_name: broxiva-dev-budget
monthly_amount: 800
currency: USD
time_grain: Monthly

alert_thresholds:
  - percentage: 75
    contact_emails: [finops-team@broxiva.com]
    action: warning

  - percentage: 90
    contact_emails: [finops-team@broxiva.com]
    action: immediate_shutdown_idle_resources

  - percentage: 100
    contact_emails: [finops-team@broxiva.com, platform-lead@broxiva.com]
    action: environment_freeze
```

#### Level 3: Cost Center Budgets

Each cost center has sub-budgets allocated monthly:

```yaml
ecommerce_budget:
  monthly: 6500
  alerts: [80%, 95%, 100%]

platform_budget:
  monthly: 2800
  alerts: [80%, 95%, 100%]

infrastructure_budget:
  monthly: 1500
  alerts: [80%, 95%, 100%]
```

### Anomaly Detection

**Azure Cost Anomaly Detection Settings:**

```yaml
anomaly_detection:
  enabled: true
  scope: all_environments

  sensitivity: medium

  thresholds:
    daily_spike: 25%  # Alert if daily cost exceeds 25% of monthly average
    weekly_increase: 40%  # Alert if week-over-week increase exceeds 40%

  exclusions:
    - first_week_of_month  # Exclude monthly recurring charges
    - reserved_instance_purchases

  notification_channels:
    - email: finops-team@broxiva.com
    - slack: #broxiva-cost-alerts
    - teams: FinOps Channel
```

---

## Cost Controls and Guardrails

### 1. SKU Restrictions

**Blocked SKUs (Azure Policy):**

```json
{
  "policyName": "block-expensive-skus",
  "blockedSkus": [
    "Standard_E64*",
    "Standard_M*",
    "Standard_G*",
    "Premium_LRS_ZRS"
  ],
  "exemptions": [
    "Production PostgreSQL (GP_Standard_D4s_v3)"
  ]
}
```

**Allowed SKUs by Environment:**

| Resource Type | Dev | Staging | Production |
|---------------|-----|---------|------------|
| AKS System Nodes | Standard_B2s | Standard_DS2_v2 | Standard_DS3_v2 |
| AKS User Nodes | Standard_DS2_v2 | Standard_DS3_v2 | Standard_DS4_v2 |
| PostgreSQL | B_Standard_B1ms | GP_Standard_D2s_v3 | GP_Standard_D4s_v3 |
| Redis | Basic C1 | Standard C2 | Premium P1 |
| App Service | B1 | P1v3 | P2v3 |

### 2. Auto-Scaling Policies

**AKS Horizontal Pod Autoscaler (HPA):**

```yaml
production:
  api_service:
    min_replicas: 3
    max_replicas: 20
    target_cpu: 70%
    target_memory: 80%

  web_service:
    min_replicas: 2
    max_replicas: 15
    target_cpu: 70%
    target_memory: 75%

staging:
  api_service:
    min_replicas: 1
    max_replicas: 5
    target_cpu: 75%

  web_service:
    min_replicas: 1
    max_replicas: 3
    target_cpu: 75%

development:
  api_service:
    min_replicas: 1
    max_replicas: 2
    target_cpu: 80%

  web_service:
    min_replicas: 1
    max_replicas: 2
    target_cpu: 80%
```

**AKS Cluster Autoscaler:**

```yaml
production:
  user_pool:
    min_nodes: 3
    max_nodes: 20
    scale_down_delay: 10m

  spot_pool:
    min_nodes: 0
    max_nodes: 10
    max_price: 0.05  # USD per hour

staging:
  user_pool:
    min_nodes: 1
    max_nodes: 5
    scale_down_delay: 5m

development:
  user_pool:
    min_nodes: 1
    max_nodes: 2
    scale_down_delay: 3m
```

### 3. Database Optimization

**PostgreSQL Scaling:**

```yaml
production:
  tier: GeneralPurpose
  sku: GP_Standard_D4s_v3
  storage_gb: 128
  backup_retention_days: 35
  geo_redundant_backup: true
  auto_grow: true
  pause_enabled: false

staging:
  tier: GeneralPurpose
  sku: GP_Standard_D2s_v3
  storage_gb: 64
  backup_retention_days: 7
  geo_redundant_backup: false
  auto_grow: true
  pause_enabled: true
  pause_schedule:
    weekdays: "20:00-08:00"  # Pause 8 PM to 8 AM
    weekends: "18:00-09:00"  # Pause 6 PM to 9 AM

development:
  tier: Burstable
  sku: B_Standard_B1ms
  storage_gb: 32
  backup_retention_days: 7
  geo_redundant_backup: false
  auto_grow: false
  pause_enabled: true
  pause_schedule:
    weekdays: "18:00-09:00"
    weekends: "all_day"  # Fully paused on weekends
```

**Redis Scaling:**

```yaml
production:
  tier: Premium
  sku: P1
  capacity: 1
  shard_count: 2
  persistence: aof
  scaling: manual  # No auto-scaling in prod for predictability

staging:
  tier: Standard
  sku: C2
  capacity: 1
  scaling:
    enabled: true
    scale_down: "20:00"  # Scale down at 8 PM
    scale_up: "08:00"    # Scale up at 8 AM

development:
  tier: Basic
  sku: C1
  capacity: 1
  auto_shutdown: true
  shutdown_schedule: "18:00-09:00"
```

### 4. Storage Optimization

**Lifecycle Management:**

```yaml
media_container:
  hot_to_cool: 30_days
  cool_to_archive: 90_days
  delete: 365_days

uploads_container:
  hot_to_cool: 7_days
  delete: 30_days  # Cleanup temporary uploads

logs_container:
  hot_to_cool: 14_days
  cool_to_archive: 60_days
  delete: 180_days

backups_container:
  hot_to_cool: 7_days
  cool_to_archive: 30_days
  delete: 90_days
```

---

## Automation and Optimization

### Environment Shutdown Automation

**Development Environment:**

```yaml
shutdown_schedule:
  enabled: true
  timezone: America/New_York

  weekday_shutdown:
    time: "18:00"
    actions:
      - scale_aks_nodes_to_zero: true
      - pause_postgresql: true
      - shutdown_redis: true
      - disable_frontdoor_routes: true

  weekday_resume:
    time: "08:00"
    actions:
      - scale_aks_nodes_to_minimum: true
      - resume_postgresql: true
      - start_redis: true
      - enable_frontdoor_routes: true

  weekend_mode:
    fully_shutdown: true
    emergency_override: manual
```

**Staging Environment:**

```yaml
shutdown_schedule:
  enabled: true
  timezone: America/New_York

  weekday_shutdown:
    time: "20:00"
    actions:
      - scale_aks_nodes_to_minimum: true
      - pause_postgresql: true

  weekday_resume:
    time: "07:00"
    actions:
      - scale_aks_nodes_to_normal: true
      - resume_postgresql: true

  weekend_mode:
    scale_down: 50%  # Half capacity on weekends
```

**Production Environment:**

```yaml
shutdown_schedule:
  enabled: false  # Production never auto-shuts down
  manual_scale_down_only: true
```

### Idle Resource Detection

**Automated Cleanup:**

```yaml
idle_resource_detection:
  scan_frequency: daily

  rules:
    - resource_type: virtual_machine
      idle_criteria: cpu_usage < 5% for 7 days
      action: shutdown_and_notify

    - resource_type: managed_disk
      idle_criteria: unattached for 7 days
      action: snapshot_and_delete

    - resource_type: public_ip
      idle_criteria: not_associated for 3 days
      action: delete

    - resource_type: load_balancer
      idle_criteria: no_backend_pool for 7 days
      action: delete_and_notify

    - resource_type: app_service
      idle_criteria: no_requests for 14 days AND env != prod
      action: stop_and_notify
```

### Right-Sizing Recommendations

**Automated Analysis:**

```yaml
rightsizing_analysis:
  frequency: weekly
  metrics_period: 30_days

  vm_rightsizing:
    over_provisioned_threshold:
      cpu_usage: < 20%
      memory_usage: < 30%
    under_provisioned_threshold:
      cpu_usage: > 85%
      memory_usage: > 90%
    action: generate_recommendation

  database_rightsizing:
    over_provisioned_threshold:
      cpu_usage: < 25%
      storage_usage: < 40%
    under_provisioned_threshold:
      cpu_usage: > 80%
      storage_usage: > 85%
    action: generate_recommendation

  aks_rightsizing:
    node_over_provisioned:
      cluster_cpu_usage: < 30%
      cluster_memory_usage: < 40%
    node_under_provisioned:
      cluster_cpu_usage: > 80%
      cluster_memory_usage: > 85%
    action: adjust_node_count
```

---

## Reporting and Visibility

### Daily Cost Reports

**Automated Daily Digest:**

```yaml
daily_cost_report:
  schedule: "08:00 America/New_York"
  recipients:
    - finops-team@broxiva.com
    - platform-lead@broxiva.com

  content:
    - yesterday_total_cost
    - mtd_cost
    - budget_remaining
    - top_10_resources_by_cost
    - anomalies_detected
    - optimization_recommendations

  format: html_email
  attachments:
    - csv: detailed_resource_costs
    - pdf: visual_dashboard
```

### Weekly Cost Reviews

**Every Monday at 10:00 AM:**

```yaml
weekly_cost_review:
  attendees:
    - FinOps Team Lead
    - Platform Engineering Lead
    - DevOps Engineer
    - Product Manager (optional)

  agenda:
    - Review last week's costs
    - Analyze budget vs. actual
    - Review optimization recommendations
    - Approve/reject rightsizing actions
    - Review upcoming Reserved Instance renewals

  deliverables:
    - Action items for cost reduction
    - Approved optimization changes
    - Updated budget forecasts
```

### Monthly Executive Reports

**First Friday of Each Month:**

```yaml
monthly_executive_report:
  recipients:
    - CTO
    - CFO
    - CEO

  sections:
    - executive_summary:
        - total_spend
        - budget_variance
        - yoy_comparison
        - cost_per_customer
        - cost_per_transaction

    - environment_breakdown:
        - prod_costs
        - staging_costs
        - dev_costs

    - optimization_achievements:
        - savings_realized
        - waste_eliminated
        - efficiency_improvements

    - forecast_and_recommendations:
        - next_month_forecast
        - quarterly_projection
        - strategic_recommendations

  format: pdf_presentation
```

### Cost Dashboards

**Azure Workbook Dashboards:**

1. **FinOps Overview Dashboard**
   - Real-time cost burn rate
   - Budget consumption (all levels)
   - Top 20 resources by cost
   - Cost trends (daily, weekly, monthly)
   - Anomaly alerts

2. **Environment Costs Dashboard**
   - Cost breakdown by environment
   - Resource type distribution
   - Tagging compliance percentage
   - Idle resource inventory

3. **Optimization Dashboard**
   - Rightsizing recommendations
   - Reserved Instance coverage
   - Spot instance savings
   - Storage lifecycle savings
   - Waste elimination opportunities

4. **Chargeback Dashboard**
   - Cost center allocations
   - Project-based costs
   - Business unit chargebacks
   - Detailed resource tagging view

---

## Roles and Responsibilities

### FinOps Team

**Primary Responsibilities:**
- Monitor daily costs and budget consumption
- Generate and distribute cost reports
- Analyze cost anomalies and investigate spikes
- Implement cost optimization recommendations
- Enforce tagging policies
- Manage budget alerts and thresholds
- Conduct weekly cost reviews

**Tools Access:**
- Azure Cost Management (Full Access)
- Azure Policy (Contributor)
- Azure Monitor (Reader)
- PowerBI (Cost Dashboards)

### Platform Engineering Team

**Primary Responsibilities:**
- Implement rightsizing recommendations
- Configure auto-scaling policies
- Optimize infrastructure architecture
- Manage environment shutdown automation
- Implement database pause/resume logic
- Maintain cost-efficient AKS configurations

**Tools Access:**
- AKS (Contributor)
- ACR (Contributor)
- PostgreSQL (Contributor)
- Redis (Contributor)
- Terraform (Maintainer)

### Development Teams

**Primary Responsibilities:**
- Tag all manually created resources
- Follow SKU restrictions and guidelines
- Request cost-effective solutions
- Clean up temporary resources
- Participate in cost optimization initiatives

**Requirements:**
- Must use `autoShutdown=true` for dev resources
- Must specify `costCenter` for new projects
- Must clean up resources after 30 days of inactivity

### Executive Leadership

**Primary Responsibilities:**
- Approve monthly budgets
- Review monthly executive reports
- Approve major architectural changes affecting costs
- Decide on Reserved Instance purchases
- Set organizational cost targets

**Reports Received:**
- Monthly Executive Cost Report
- Quarterly Cost Forecast
- Annual Budget Planning

---

## Compliance and Auditing

### Tagging Compliance

**Target:** 100% tagging compliance for all billable resources

**Audit Frequency:** Weekly

**Non-Compliance Actions:**
```yaml
week_1:
  action: automated_email_to_owner
  content: "Please tag resource within 48 hours"

week_2:
  action: escalation_to_team_lead
  content: "Untagged resources will be stopped in 7 days"

week_3:
  action: resource_shutdown
  content: "Resource stopped due to missing tags"

week_4:
  action: resource_deletion_warning
  content: "Resource will be deleted in 7 days if not tagged"
```

### Budget Compliance

**Monthly Variance Tolerance:** ±10%

**Audit Process:**
1. Compare actual vs. budgeted costs per environment
2. Investigate variances >10%
3. Document root causes (unexpected growth, new features, inefficiencies)
4. Create remediation plan for overages
5. Adjust future budgets if needed

### Cost Optimization Compliance

**Minimum Quarterly Savings Target:** 5% of total cloud spend

**Quarterly Audit:**
- Review all optimization recommendations
- Track implementation status
- Calculate realized savings
- Report to executive leadership

### Reserved Instance Compliance

**Coverage Target:** 70% of steady-state compute and database workloads

**Annual Review:**
- Analyze RI utilization (target: >90%)
- Renew expiring RIs with updated capacity
- Identify new RI opportunities
- Consider Savings Plans for flexibility

---

## Appendix: Cost Optimization Checklist

### Monthly Tasks

- [ ] Review and act on all rightsizing recommendations
- [ ] Delete idle resources (7+ days inactive)
- [ ] Verify tagging compliance (100% target)
- [ ] Analyze budget variance reports
- [ ] Update cost forecasts
- [ ] Review and optimize storage lifecycle policies
- [ ] Check for orphaned resources (disks, IPs, NICs)

### Quarterly Tasks

- [ ] Conduct Reserved Instance utilization review
- [ ] Evaluate Savings Plan opportunities
- [ ] Perform architectural cost optimization review
- [ ] Update SKU restriction policies
- [ ] Review and optimize auto-scaling configurations
- [ ] Audit chargeback allocations
- [ ] Generate quarterly cost trend analysis

### Annual Tasks

- [ ] Plan next year's cloud budget
- [ ] Review and renew Reserved Instances
- [ ] Conduct full infrastructure cost assessment
- [ ] Update FinOps governance policies
- [ ] Train teams on cost optimization best practices
- [ ] Evaluate alternative cloud services for cost savings
- [ ] Negotiate Enterprise Agreement renewals

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-13 | FinOps Team | Initial FinOps Governance Framework |

---

## References

- [COST_ARCHITECTURE.md](./COST_ARCHITECTURE.md) - Detailed cost optimization architecture
- [SHUTDOWN_RESUME_FLOWS.md](./SHUTDOWN_RESUME_FLOWS.md) - Environment automation workflows
- [Azure Cost Management Best Practices](https://learn.microsoft.com/azure/cost-management-billing/)
- [FinOps Foundation Framework](https://www.finops.org/framework/)
