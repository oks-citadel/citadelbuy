# Broxiva E-Commerce Platform - Infrastructure Discovery Report

## Date: January 2025
## Purpose: EKS to ECS Fargate Migration Planning

---

## Executive Summary

This report documents the current infrastructure state of the Broxiva e-commerce platform in preparation for migration from Amazon EKS to Amazon ECS Fargate.

**Key Finding**: ECS Fargate infrastructure already exists and is fully configured. Migration requires enabling the feature flag and updating CI/CD pipelines.

---

## Current Infrastructure Overview

### Compute Platforms

| Platform | Environment | Status | Purpose |
|----------|-------------|--------|---------|
| AWS EKS | Production | Active | Primary compute (to be deprecated) |
| AWS ECS Fargate | Production | Ready (disabled) | Target compute platform |
| Azure AKS | Staging | Active | Azure staging environment |

### AWS Account Details
- **Account ID**: 992382449461
- **Region**: us-east-1
- **VPC CIDR**: 10.0.0.0/16

---

## Service Inventory

### Core Services (15 Total)

#### API Services (8)
| Service | Port | Language | Docker Image |
|---------|------|----------|--------------|
| api | 4000 | Node.js | organization/apps/api/Dockerfile |
| web | 3000 | Node.js | organization/apps/web/Dockerfile |
| ai-engine | 8002 | Python | organization/apps/services/ai-engine/Dockerfile |
| recommendation | 8001 | Python | organization/apps/services/recommendation/Dockerfile |
| search | 8003 | Python | organization/apps/services/search/Dockerfile |
| notification | 8009 | Python | organization/apps/services/notification/Dockerfile |
| inventory | 8007 | Python | organization/apps/services/inventory/Dockerfile |
| pricing | 8006 | Python | organization/apps/services/pricing/Dockerfile |

#### Worker Services (7)
| Service | Language | Docker Image |
|---------|----------|--------------|
| analytics | Python | organization/apps/services/analytics/Dockerfile |
| chatbot | Python | organization/apps/services/chatbot/Dockerfile |
| fraud-detection | Python | organization/apps/services/fraud-detection/Dockerfile |
| media | Python | organization/apps/services/media/Dockerfile |
| personalization | Python | organization/apps/services/personalization/Dockerfile |
| supplier-integration | Python | organization/apps/services/supplier-integration/Dockerfile |
| ai-agents | Python | organization/apps/services/ai-agents/Dockerfile |

---

## Terraform Infrastructure

### Module Structure
```
organization/infrastructure/terraform/
├── modules/
│   ├── ecs/                    # ECS Fargate module (COMPLETE)
│   │   ├── main.tf             # 1597 lines - full ECS setup
│   │   ├── iam.tf              # IAM roles and policies
│   │   ├── task-definitions.tf # Task definitions
│   │   ├── autoscaling.tf      # Auto scaling
│   │   ├── variables.tf        # Input variables
│   │   └── outputs.tf          # Outputs
│   ├── compute/                # AKS/EKS compute
│   ├── database/               # RDS/PostgreSQL
│   ├── networking/             # VPC/Subnets
│   ├── security/               # Security groups/IAM
│   ├── storage/                # S3/Blob storage
│   └── monitoring/             # CloudWatch/App Insights
└── environments/
    ├── aws-prod/               # AWS Production
    │   ├── main.tf             # EKS config (current)
    │   └── ecs.tf              # ECS config (ready)
    ├── aws-staging/            # AWS Staging (NEW)
    ├── staging/                # Azure Staging
    └── dev/                    # Development
```

### ECS Module Capabilities
- ✅ ECS Cluster with Fargate and Fargate Spot
- ✅ Application Load Balancer with HTTPS
- ✅ Target Groups per service
- ✅ Security Groups (ALB, ECS tasks, service discovery)
- ✅ AWS Cloud Map service discovery
- ✅ IAM roles (task execution, task)
- ✅ Auto scaling (CPU, memory, request count)
- ✅ CloudWatch logging and alarms
- ✅ All 15 services defined

---

## CI/CD Pipelines

### GitHub Actions Workflows

| Workflow | Purpose | Status |
|----------|---------|--------|
| unified-pipeline.yml | Main CI/CD pipeline | Updated for ECS |
| ecs-deploy (action) | ECS deployment action | Ready |

### Pipeline Changes Required
1. ~~Add ECS cluster environment variables~~ ✅
2. ~~Replace kubectl deploy with ECS deploy action~~ ✅
3. ~~Update staging deployment~~ ✅
4. ~~Update production deployment~~ ✅
5. ~~Update microservices deployment loop~~ ✅

---

## Kubernetes Resources (To Be Deprecated)

### Manifests Location
```
organization/infrastructure/kubernetes/
├── base/
│   ├── kustomization.yaml
│   └── elasticsearch-deployment.yaml
├── production/
│   ├── kustomization.yaml
│   ├── api-deployment.yaml
│   ├── ingress.yaml
│   └── configmap.yaml
```

### Helm Charts
```
organization/infrastructure/helm/
└── charts/
    └── commerce-service/
        └── Chart.yaml
```

**Action**: Archive these files after ECS migration is verified stable.

---

## Database Infrastructure

### RDS PostgreSQL
- **Instance**: db.r6g.large
- **Version**: PostgreSQL 15.4
- **Multi-AZ**: Yes (production)
- **Storage**: 100-500 GB auto-scaling

### ElastiCache Redis
- **Node Type**: cache.r6g.large
- **Nodes**: 3 (cluster mode)
- **Version**: Redis 7.0

---

## Security Configuration

### IAM Roles
| Role | Purpose | Status |
|------|---------|--------|
| ECS Task Execution Role | ECS agent operations | Defined in ecs/iam.tf |
| ECS Task Role | Application permissions | Defined in ecs/iam.tf |
| GitHub Actions Role | CI/CD deployment | Defined in ecs.tf |

### Secrets Management
- **Secrets Manager**: Database URL, Redis URL, API keys
- **SSM Parameter Store**: Configuration parameters

### Security Groups
- ALB: HTTP 80 (redirect), HTTPS 443
- ECS Tasks: From ALB, inter-service, VPC CIDR
- Database: PostgreSQL 5432 from ECS
- Redis: 6379 from ECS

---

## Migration Readiness Assessment

### ✅ Ready
- [x] ECS Terraform module complete
- [x] All 15 services defined
- [x] IAM roles configured
- [x] Security groups defined
- [x] Auto scaling configured
- [x] Service discovery enabled
- [x] CI/CD action ready
- [x] Pipeline updated for ECS

### ⏳ Pending
- [ ] Enable ECS feature flag (`enable_ecs = true`)
- [ ] Apply Terraform changes
- [ ] Verify service health
- [ ] Performance testing
- [ ] Decommission EKS

---

## Recommendations

1. **Enable ECS**: Set `enable_ecs = true` in terraform.tfvars
2. **Apply Terraform**: Run `terraform apply` to create ECS resources
3. **Deploy to ECS**: Pipeline will automatically deploy to ECS
4. **Verify**: Check service health, run smoke tests
5. **Scale down EKS**: Reduce EKS node count after verification
6. **Decommission**: Remove EKS resources after 2-week soak test

---

## Files Modified

| File | Change |
|------|--------|
| `organization/infrastructure/terraform/environments/aws-prod/terraform.tfvars` | Created - enable_ecs = true |
| `organization/infrastructure/terraform/environments/aws-staging/main.tf` | Created - ECS staging config |
| `organization/infrastructure/terraform/environments/aws-staging/variables.tf` | Created |
| `organization/infrastructure/terraform/environments/aws-staging/terraform.tfvars` | Created |
| `.github/workflows/unified-pipeline.yml` | Updated - ECS deployment |
| `docs/architecture/ecs-fargate-architecture.md` | Created |
| `docs/architecture/cost-comparison-eks-vs-ecs.md` | Created |
