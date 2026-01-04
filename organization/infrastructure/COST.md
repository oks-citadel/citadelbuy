# Broxiva AWS Infrastructure Cost Analysis

## Overview

This document provides a comprehensive analysis of AWS infrastructure costs for the Broxiva e-commerce platform production environment. All estimates are based on US East (N. Virginia) pricing as of January 2025.

---

## 1. Current Infrastructure Costs

### Monthly Cost Breakdown by Service

| Service | Configuration | Monthly Cost (USD) |
|---------|---------------|-------------------|
| **EKS Cluster** | Control Plane | $73 |
| **App Node Group** | 3-10x t3.large/t3.xlarge | $197 - $657 |
| **AI Node Group** | 1-5x c5.2xlarge/c5.4xlarge | $248 - $1,238 |
| **RDS PostgreSQL** | db.r6g.large Multi-AZ (100GB) | $438 |
| **ElastiCache Redis** | 3x cache.r6g.large | $465 |
| **NAT Gateways** | 3 AZs | $98 + data transfer |
| **S3 Storage** | Media bucket (estimated 500GB) | $12 |
| **CloudFront** | CDN (estimated 2TB/month) | $170 |
| **Route53** | Hosted zone + queries | $1 |
| **CloudWatch** | Logs, metrics, alarms | $50 |
| **Secrets Manager** | 2 secrets | $1 |
| **ECR** | 2 repositories (50GB) | $5 |
| **VPC Flow Logs** | Logging | $10 |
| **SES** | Email (10,000/month) | $1 |
| **SNS/SQS** | Messaging | $5 |

### Cost Summary

| Scenario | EKS Nodes | Monthly Total |
|----------|-----------|---------------|
| **Minimum (baseline)** | 3 app + 1 AI | ~$1,770 |
| **Typical (average)** | 5 app + 2 AI | ~$2,200 |
| **Peak (scaled)** | 10 app + 5 AI | ~$3,400 |

### Detailed Cost Calculations

#### EKS Compute Costs

**App Node Group:**
- t3.large (2 vCPU, 8GB): $0.0832/hr = $60.70/month per node
- t3.xlarge (4 vCPU, 16GB): $0.1664/hr = $121.47/month per node
- Range: 3 nodes ($182) to 10 nodes ($607-$1,215)

**AI Node Group:**
- c5.2xlarge (8 vCPU, 16GB): $0.34/hr = $248/month per node
- c5.4xlarge (16 vCPU, 32GB): $0.68/hr = $496/month per node
- Range: 1 node ($248) to 5 nodes ($1,238-$2,480)

#### Database Costs

**RDS PostgreSQL (db.r6g.large):**
- Instance: 2 vCPU, 16GB RAM
- Multi-AZ: $0.30/hr x 2 = $438/month
- Storage: 100GB at $0.115/GB = $11.50/month
- Backup: 30-day retention (free up to DB size)
- Performance Insights: $0.50/vCPU/month = $1/month

#### Cache Costs

**ElastiCache Redis (cache.r6g.large):**
- Node cost: $0.213/hr = $155.49/month per node
- 3 nodes: $465/month
- Data transfer: Regional free tier typically sufficient

---

## 2. Cost Optimization Implemented

### Infrastructure Design Optimizations

1. **Multi-AZ NAT Gateway Architecture**
   - Each AZ has dedicated NAT Gateway
   - Reduces cross-AZ data transfer costs
   - Provides high availability without premium pricing

2. **EKS Node Group Separation**
   - App nodes: Cost-effective t3 instances
   - AI nodes: Compute-optimized c5 instances with taints
   - Prevents over-provisioning by workload type

3. **S3 Lifecycle Policies**
   - Noncurrent versions transition to Standard-IA after 30 days
   - Transition to Glacier after 90 days
   - Delete after 365 days
   - Estimated savings: 40-60% on storage costs

4. **CloudFront CDN**
   - Caching reduces origin requests
   - Default TTL: 86,400 seconds (24 hours)
   - Compression enabled
   - Reduces S3 request costs and latency

5. **Private EKS Endpoint**
   - No public endpoint reduces attack surface
   - No NAT Gateway charges for control plane traffic

6. **CloudWatch Log Retention**
   - 30-day retention policy
   - Prevents unbounded log storage costs

7. **RDS Storage Auto-scaling**
   - Starts at 100GB, scales to 500GB as needed
   - Avoids over-provisioning storage upfront

8. **IRSA (IAM Roles for Service Accounts)**
   - No need for separate IAM users
   - Reduces credential management overhead

---

## 3. Cost Optimization Opportunities

### High Impact (>$200/month savings potential)

| Opportunity | Current | Optimized | Estimated Savings |
|-------------|---------|-----------|-------------------|
| **Reserved Instances (RDS)** | On-demand | 1-year RI | ~$150/month (35%) |
| **Reserved Instances (ElastiCache)** | On-demand | 1-year RI | ~$160/month (35%) |
| **Savings Plans (EKS)** | On-demand | Compute SP | ~$200-400/month (20-40%) |
| **Spot Instances (AI nodes)** | On-demand | Spot | ~$180/month (70% savings) |

### Medium Impact ($50-200/month savings potential)

| Opportunity | Description | Estimated Savings |
|-------------|-------------|-------------------|
| **RDS Right-sizing** | Analyze CPU/memory utilization; downgrade if <40% usage | $50-100/month |
| **ElastiCache Right-sizing** | Monitor memory utilization; consider cache.r6g.medium | $50-150/month |
| **NAT Gateway Optimization** | Consolidate to single NAT in dev/staging | $65/month per gateway |
| **CloudWatch Logs Insights** | Use sampling for non-critical logs | $20-50/month |
| **S3 Intelligent Tiering** | Automatic tier transitions for unpredictable access | $10-30/month |

### Low Impact (<$50/month savings potential)

| Opportunity | Description | Estimated Savings |
|-------------|-------------|-------------------|
| **ECR Lifecycle Policies** | Remove untagged images after 7 days | $2-5/month |
| **CloudFront Price Class** | Use PriceClass_100 if traffic primarily NA/EU | $10-30/month |
| **VPC Endpoint for S3** | Reduce NAT Gateway data processing | $5-20/month |
| **Secrets Manager Rotation** | Consolidate secrets | $0.40/secret/month |

### Non-Production Environment Opportunities

1. **Auto-shutdown schedules** (as documented in FINOPS_GOVERNANCE.md)
   - Weekday evenings: 7 PM - 7 AM shutdown
   - Weekend shutdown: Friday 7 PM - Monday 7 AM
   - Potential savings: 40-60% of non-production costs

2. **Smaller Instance Types**
   - Development: t3.small or t3.medium
   - Staging: 50% of production capacity

3. **Single-AZ for Dev/Staging**
   - Single NAT Gateway
   - Non-Multi-AZ RDS
   - Reduced ElastiCache nodes

---

## 4. Budget Alerts Configuration

### Production Budget Structure

```
Monthly Budget: $4,000 (buffer above typical $2,200)
├── Alert Level 1 (50%): $2,000
│   └── Action: Review forecast, identify trends
│   └── Response Time: 24 hours
│   └── Recipient: finops@broxiva.com
├── Alert Level 2 (75%): $3,000
│   └── Action: Investigate top cost drivers
│   └── Response Time: 4 hours
│   └── Recipient: devops@broxiva.com
├── Alert Level 3 (90%): $3,600
│   └── Action: Implement cost controls
│   └── Response Time: 2 hours
│   └── Recipient: engineering-manager@broxiva.com
└── Alert Level 4 (100% Forecasted): $4,000
    └── Action: Executive review, immediate action
    └── Response Time: 1 hour
    └── Recipient: cto@broxiva.com
```

### Service-Specific Budgets

| Service | Monthly Budget | Alert Threshold |
|---------|---------------|-----------------|
| EKS (Compute) | $1,500 | 80% |
| RDS | $500 | 80% |
| ElastiCache | $500 | 80% |
| Networking (NAT, VPC) | $300 | 80% |
| Storage (S3, EBS) | $200 | 80% |
| Other | $1,000 | 80% |

### AWS Budget Implementation

```bash
# Create production budget via AWS CLI
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "broxiva-prod-monthly",
    "BudgetLimit": {"Amount": "4000", "Unit": "USD"},
    "BudgetType": "COST",
    "TimeUnit": "MONTHLY",
    "CostFilters": {
      "TagKeyValue": ["user:Environment$production"]
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 50
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "finops@broxiva.com"}]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 75
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "devops@broxiva.com"}]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 90
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ops@broxiva.com"}]
    }
  ]'
```

---

## 5. Reserved Instance / Savings Plan Strategy

### Recommended Commitments

#### Year 1 Strategy (Conservative)

| Resource | Commitment Type | Term | Coverage | Monthly Savings |
|----------|----------------|------|----------|-----------------|
| RDS db.r6g.large | Reserved Instance | 1 year, No Upfront | 1 instance | $150/month |
| ElastiCache cache.r6g.large | Reserved Nodes | 1 year, No Upfront | 2 nodes | $105/month |
| EC2 Compute | Compute Savings Plan | 1 year | $500/month | $100-200/month |

**Total Year 1 Savings: ~$355-455/month ($4,260-5,460/year)**

#### Year 2+ Strategy (After Workload Stabilization)

| Resource | Commitment Type | Term | Coverage | Monthly Savings |
|----------|----------------|------|----------|-----------------|
| RDS db.r6g.large | Reserved Instance | 3 year, Partial Upfront | 1 instance | $220/month |
| ElastiCache cache.r6g.large | Reserved Nodes | 3 year, Partial Upfront | 3 nodes | $190/month |
| EC2 Compute | Compute Savings Plan | 3 year | $800/month | $280/month |

**Total Year 2+ Savings: ~$690/month ($8,280/year)**

### Savings Plan Details

**Compute Savings Plans (Recommended for EKS):**
- Applies to any EC2 instance family, size, OS, tenancy, or region
- 20% savings (1-year No Upfront)
- 40% savings (3-year Partial Upfront)

**EC2 Instance Savings Plans (Not Recommended):**
- Locked to specific instance family
- Higher savings but less flexibility

### Reserved Instance Analysis

**RDS Reserved Instances:**
| Payment Option | 1-Year | 3-Year |
|----------------|--------|--------|
| No Upfront | 35% off | 45% off |
| Partial Upfront | 42% off | 54% off |
| All Upfront | 45% off | 58% off |

**ElastiCache Reserved Nodes:**
| Payment Option | 1-Year | 3-Year |
|----------------|--------|--------|
| No Upfront | 35% off | N/A |
| Partial Upfront | 38% off | 48% off |
| All Upfront | 40% off | 50% off |

### Spot Instance Strategy (AI Workloads)

**Recommended for AI Node Group:**
- Use Spot Instances for fault-tolerant AI workloads
- Configure Spot Fleet with multiple instance types
- Set interruption behavior to "terminate"
- Potential savings: 60-90% over On-Demand

```yaml
# EKS Managed Node Group with Spot
eks_managed_node_groups:
  ai-spot:
    capacity_type: SPOT
    instance_types:
      - c5.2xlarge
      - c5a.2xlarge
      - c5n.2xlarge
```

---

## 6. Cost Allocation Tags

### Mandatory Tags

All resources must include these tags for cost tracking:

| Tag Key | Description | Values |
|---------|-------------|--------|
| `Project` | Project identifier | `Broxiva` |
| `Environment` | Environment type | `production`, `staging`, `development` |
| `ManagedBy` | Management method | `Terraform`, `Manual`, `CDK` |
| `Owner` | Team ownership | `DevOps`, `Engineering`, `Platform` |
| `CostCenter` | Finance allocation | `engineering`, `operations`, `platform` |

### Optional Tags

| Tag Key | Description | Example Values |
|---------|-------------|----------------|
| `Component` | Application component | `api`, `web`, `worker`, `database` |
| `Team` | Owning team | `platform`, `product`, `data` |
| `Automation` | Auto-management | `auto-shutdown`, `auto-scaling` |
| `Ticket` | Related work item | `JIRA-1234` |

### Tag Implementation in Terraform

```hcl
# Already implemented in main.tf
provider "aws" {
  default_tags {
    tags = {
      Project     = "Broxiva"
      Environment = "production"
      ManagedBy   = "Terraform"
      Owner       = "DevOps"
    }
  }
}
```

### Cost Allocation Reports

Enable these cost allocation tags in AWS Billing Console:
1. Navigate to Billing > Cost Allocation Tags
2. Activate tags: `Project`, `Environment`, `Owner`, `CostCenter`
3. Reports available 24-48 hours after activation

### Tag Compliance Monitoring

```bash
# Find untagged resources
aws resourcegroupstaggingapi get-resources \
  --tags-per-page 100 \
  --query "ResourceTagMappingList[?Tags[?Key=='Environment']==\`[]\`]"
```

---

## 7. Monthly Review Process

### Week 1: Data Collection

**Actions:**
- [ ] Export Cost Explorer data for previous month
- [ ] Generate cost by service report
- [ ] Generate cost by tag report
- [ ] Document any anomalies or unexpected charges

**Tools:**
```bash
# Export cost data via CLI
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "first day of last month" +%Y-%m-%d),End=$(date -d "first day of this month" +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Environment
```

### Week 2: Analysis

**Review Meeting Agenda:**
1. Total spend vs. budget (target: within 95%)
2. Month-over-month trend analysis
3. Top 5 cost drivers
4. Anomaly investigation results
5. Utilization metrics review (CPU, memory, storage)

**Key Metrics to Track:**
| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Budget variance | <5% | Investigate drivers |
| MoM growth | <10% | Review scaling events |
| Unutilized resources | <$100 | Terminate or downsize |
| RI/SP coverage | >60% | Purchase additional commitments |

### Week 3: Optimization

**Actions:**
- [ ] Right-size underutilized resources
- [ ] Terminate orphaned resources
- [ ] Review and update auto-scaling policies
- [ ] Evaluate new Reserved Instance opportunities
- [ ] Clean up unused snapshots/AMIs

### Week 4: Reporting

**Deliverables:**
1. Executive Summary (1 page)
   - Total spend
   - Budget status
   - Key changes
   - Recommendations

2. Detailed Report
   - Cost by service
   - Cost by environment
   - Cost by team/project
   - Trend analysis

3. Action Items
   - Optimization tasks with owners
   - Due dates
   - Expected savings

### Quarterly Deep Dive

**Additional Reviews:**
- Reserved Instance utilization and coverage
- Savings Plan effectiveness
- Architecture cost efficiency
- Multi-year commitment planning
- Team cost awareness training

---

## 8. Scaling Cost Projections

### Traffic Growth Scenarios

#### Scenario A: 2x Current Traffic

| Component | Change | Additional Cost |
|-----------|--------|-----------------|
| App Nodes | 3 -> 6 nodes | +$180/month |
| AI Nodes | 2 -> 3 nodes | +$248/month |
| RDS | Add read replica | +$220/month |
| ElastiCache | No change | $0 |
| CloudFront | 2TB -> 4TB | +$170/month |
| **Total Additional** | | **+$818/month** |

**Projected Monthly Cost: ~$3,020**

#### Scenario B: 5x Current Traffic

| Component | Change | Additional Cost |
|-----------|--------|-----------------|
| App Nodes | 3 -> 10 nodes | +$425/month |
| AI Nodes | 2 -> 5 nodes | +$744/month |
| RDS | Upgrade to db.r6g.xlarge + replica | +$660/month |
| ElastiCache | Add 2 nodes | +$310/month |
| CloudFront | 2TB -> 10TB | +$680/month |
| NAT Gateway | Increased data transfer | +$200/month |
| **Total Additional** | | **+$3,019/month** |

**Projected Monthly Cost: ~$5,220**

#### Scenario C: 10x Current Traffic (Major Scale Event)

| Component | Change | Additional Cost |
|-----------|--------|-----------------|
| App Nodes | 3 -> 20 nodes (new node group) | +$1,032/month |
| AI Nodes | 2 -> 10 nodes | +$1,984/month |
| RDS | db.r6g.2xlarge Multi-AZ + 2 replicas | +$1,680/month |
| ElastiCache | 3 -> 6 nodes cluster mode | +$465/month |
| CloudFront | 2TB -> 20TB | +$1,530/month |
| NAT Gateway | High data transfer | +$500/month |
| S3 | Request costs increase | +$50/month |
| **Total Additional** | | **+$7,241/month** |

**Projected Monthly Cost: ~$9,440**

### Cost per User Projections

| Users/Month | Infrastructure Cost | Cost per User |
|-------------|---------------------|---------------|
| 10,000 | $2,200 | $0.22 |
| 50,000 | $3,000 | $0.06 |
| 100,000 | $4,000 | $0.04 |
| 500,000 | $7,500 | $0.015 |
| 1,000,000 | $12,000 | $0.012 |

### Seasonal Scaling Estimates

| Period | Expected Traffic | Scaling Action | Estimated Cost |
|--------|------------------|----------------|----------------|
| Normal | Baseline | 3 app nodes | $2,200/month |
| Holiday Sale | +200% | 8 app nodes | $3,200/month |
| Black Friday | +500% | 15 app nodes + enhanced DB | $5,500/month |
| Flash Sale | +300% | 10 app nodes | $3,800/month |

### Auto-scaling Cost Controls

**Recommended Limits:**
```hcl
# EKS Node Group Configuration
app_node_max_size = 10    # Cap at 10 nodes
ai_node_max_size  = 5     # Cap at 5 nodes

# Cost Alert on Scaling
# Trigger alert when node count exceeds 7
```

**Emergency Scaling Budget:**
- Reserve $2,000/month for unexpected scaling events
- Pre-approve up to $5,000 for critical incidents
- Require approval for sustained increases

---

## Appendix

### AWS Pricing References

- [EC2 Pricing](https://aws.amazon.com/ec2/pricing/on-demand/)
- [RDS Pricing](https://aws.amazon.com/rds/pricing/)
- [ElastiCache Pricing](https://aws.amazon.com/elasticache/pricing/)
- [EKS Pricing](https://aws.amazon.com/eks/pricing/)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)

### Cost Management Tools

- AWS Cost Explorer
- AWS Budgets
- AWS Cost Anomaly Detection
- AWS Compute Optimizer
- Trusted Advisor

### Contact Information

- **FinOps Team**: finops@broxiva.com
- **DevOps Team**: devops@broxiva.com
- **Operations**: ops@broxiva.com
- **Escalation**: cto@broxiva.com

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-04
**Owner**: Broxiva DevOps Team
**Review Cycle**: Monthly
