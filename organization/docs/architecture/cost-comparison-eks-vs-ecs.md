# EKS vs ECS Fargate Cost Comparison

## Executive Summary

Migrating from EKS to ECS Fargate reduces infrastructure costs by eliminating idle EC2 compute, simplifying operations, and enabling granular resource allocation.

## Current EKS Costs (Before Migration)

### EKS Cluster
| Resource | Quantity | Monthly Cost |
|----------|----------|--------------|
| EKS Control Plane | 1 | $73 |
| App Node Group (t3.large) | 3-10 nodes | $180 - $600 |
| AI Node Group (c5.2xlarge) | 2-5 nodes | $340 - $850 |
| **Total EKS Compute** | - | **$593 - $1,523** |

### Supporting Infrastructure (Unchanged)
| Resource | Monthly Cost |
|----------|--------------|
| RDS PostgreSQL (db.r6g.large) | ~$150 |
| ElastiCache Redis (cache.r6g.large x3) | ~$300 |
| NAT Gateway (3 AZs) | ~$100 |
| ALB | ~$25 |
| **Total Supporting** | **~$575** |

### Total EKS Monthly Cost: **$1,168 - $2,098**

## ECS Fargate Costs (After Migration)

### ECS Fargate Tasks
| Service | Tasks | vCPU | Memory | Hours/Month | Monthly Cost |
|---------|-------|------|--------|-------------|--------------|
| api | 5 | 2 | 4 GB | 3,600 | ~$180 |
| web | 5 | 1 | 2 GB | 3,600 | ~$90 |
| ai-engine | 3 | 0.5 | 1 GB | 2,160 | ~$27 |
| recommendation | 3 | 0.5 | 1 GB | 2,160 | ~$27 |
| search | 3 | 0.25 | 0.5 GB | 2,160 | ~$14 |
| notification | 3 | 0.25 | 0.5 GB | 2,160 | ~$14 |
| inventory | 3 | 0.25 | 0.5 GB | 2,160 | ~$14 |
| pricing | 2 | 0.25 | 0.5 GB | 1,440 | ~$9 |
| **Total API Services** | - | - | - | - | **~$375** |

### Worker Services (80% Fargate Spot)
| Service | Tasks | vCPU | Memory | Hours/Month | Monthly Cost |
|---------|-------|------|--------|-------------|--------------|
| analytics | 2 | 0.25 | 0.5 GB | 1,440 | ~$4* |
| chatbot | 2 | 0.25 | 0.5 GB | 1,440 | ~$4* |
| fraud-detection | 2 | 0.25 | 0.5 GB | 1,440 | ~$4* |
| media | 2 | 0.25 | 0.5 GB | 1,440 | ~$4* |
| personalization | 2 | 0.25 | 0.5 GB | 1,440 | ~$4* |
| supplier-integration | 2 | 0.25 | 0.5 GB | 1,440 | ~$4* |
| ai-agents | 2 | 0.25 | 0.5 GB | 1,440 | ~$4* |
| **Total Workers** | - | - | - | - | **~$28** |

*Fargate Spot pricing (70% discount)

### Total ECS Fargate Compute: **~$403/month**

### Supporting Infrastructure (Unchanged)
| Resource | Monthly Cost |
|----------|--------------|
| RDS PostgreSQL | ~$150 |
| ElastiCache Redis | ~$300 |
| NAT Gateway (single) | ~$35 |
| ALB | ~$25 |
| **Total Supporting** | **~$510** |

### Total ECS Monthly Cost: **~$913**

## Cost Savings Summary

| Metric | EKS | ECS Fargate | Savings |
|--------|-----|-------------|---------|
| Min Monthly Cost | $1,168 | $913 | **$255 (22%)** |
| Max Monthly Cost | $2,098 | $1,200* | **$898 (43%)** |
| Annual Min Savings | - | - | **$3,060** |
| Annual Max Savings | - | - | **$10,776** |

*ECS scales more granularly, max cost assumes 2x base capacity

## Additional Benefits

### Operational Savings (Not Quantified)
1. **No cluster upgrades**: EKS requires periodic Kubernetes version upgrades
2. **No node patching**: Fargate handles OS patches automatically
3. **Simplified debugging**: ECS Exec for container access
4. **Faster deployments**: No node warm-up time

### Resource Efficiency
- **EKS**: Must provision full EC2 instances, often leaving capacity unused
- **ECS Fargate**: Pay only for exact vCPU/memory per task

### Scaling Efficiency
- **EKS**: Node scaling takes 3-5 minutes (EC2 launch time)
- **ECS Fargate**: Task scaling takes 30-60 seconds

## Break-Even Analysis

ECS Fargate becomes more cost-effective than EKS when:
- Average utilization is below 70%
- Workloads have variable demand
- Team size doesn't support Kubernetes expertise

## Recommendations

1. **Phase 1**: Run ECS alongside EKS for 1-2 weeks
2. **Phase 2**: Shift 50% traffic to ECS
3. **Phase 3**: Complete migration, decommission EKS
4. **Phase 4**: Optimize Fargate Spot usage

## Pricing Notes

- Fargate pricing: $0.04048/vCPU/hour, $0.004445/GB/hour (us-east-1)
- Fargate Spot: ~70% discount on On-Demand
- EKS Control Plane: $0.10/hour ($73/month)
- Prices as of January 2025, subject to change
