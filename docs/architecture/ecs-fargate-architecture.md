# Broxiva E-Commerce Platform - ECS Fargate Architecture

## Overview

The Broxiva e-commerce platform runs on AWS ECS Fargate, a serverless container orchestration service. This architecture eliminates the need to manage EC2 instances or EKS node groups, providing automatic scaling and reduced operational overhead.

## Architecture Diagram

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                        AWS Cloud                             │
                                    │  ┌───────────────────────────────────────────────────────┐  │
                                    │  │                    us-east-1                          │  │
┌──────────┐     ┌──────────┐       │  │  ┌─────────────────────────────────────────────────┐  │  │
│          │     │          │       │  │  │              Public Subnets                     │  │  │
│  Users   │────▶│CloudFront│──────▶│  │  │  ┌─────────────────────────────────────────┐  │  │  │
│          │     │   CDN    │       │  │  │  │     Application Load Balancer (ALB)     │  │  │  │
└──────────┘     └──────────┘       │  │  │  │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │  │  │  │
                                    │  │  │  │  │ HTTPS   │ │ Path    │ │ Host     │  │  │  │  │
                                    │  │  │  │  │ :443    │ │ Routing │ │ Routing  │  │  │  │  │
                                    │  │  │  │  └─────────┘ └─────────┘ └──────────┘  │  │  │  │
                                    │  │  │  └─────────────────────────────────────────┘  │  │  │
                                    │  │  └─────────────────────────────────────────────────┘  │  │
                                    │  │                          │                            │  │
                                    │  │  ┌───────────────────────▼───────────────────────┐   │  │
                                    │  │  │              Private Subnets                   │   │  │
                                    │  │  │  ┌─────────────────────────────────────────┐  │   │  │
                                    │  │  │  │         ECS Fargate Cluster             │  │   │  │
                                    │  │  │  │  ┌────────────────────────────────────┐ │  │   │  │
                                    │  │  │  │  │     API Services (Critical)        │ │  │   │  │
                                    │  │  │  │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │ │  │   │  │
                                    │  │  │  │  │  │ api │ │ web │ │ai-en│ │recom│  │ │  │   │  │
                                    │  │  │  │  │  │:4000│ │:3000│ │:8002│ │:8001│  │ │  │   │  │
                                    │  │  │  │  │  └─────┘ └─────┘ └─────┘ └─────┘  │ │  │   │  │
                                    │  │  │  │  │  ┌──────┐ ┌──────┐ ┌────┐ ┌─────┐ │ │  │   │  │
                                    │  │  │  │  │  │search│ │notif │ │inv │ │price│ │ │  │   │  │
                                    │  │  │  │  │  │:8003 │ │:8009 │ │8007│ │:8006│ │ │  │   │  │
                                    │  │  │  │  │  └──────┘ └──────┘ └────┘ └─────┘ │ │  │   │  │
                                    │  │  │  │  └────────────────────────────────────┘ │  │   │  │
                                    │  │  │  │  ┌────────────────────────────────────┐ │  │   │  │
                                    │  │  │  │  │    Worker Services (Spot)          │ │  │   │  │
                                    │  │  │  │  │ ┌─────────┐ ┌───────┐ ┌──────────┐ │ │  │   │  │
                                    │  │  │  │  │ │analytics│ │chatbot│ │fraud-det │ │ │  │   │  │
                                    │  │  │  │  │ └─────────┘ └───────┘ └──────────┘ │ │  │   │  │
                                    │  │  │  │  │ ┌─────┐ ┌───────────┐ ┌──────────┐ │ │  │   │  │
                                    │  │  │  │  │ │media│ │personaliz│ │supplier  │ │ │  │   │  │
                                    │  │  │  │  │ └─────┘ └───────────┘ └──────────┘ │ │  │   │  │
                                    │  │  │  │  │ ┌─────────┐                        │ │  │   │  │
                                    │  │  │  │  │ │ai-agents│                        │ │  │   │  │
                                    │  │  │  │  │ └─────────┘                        │ │  │   │  │
                                    │  │  │  │  └────────────────────────────────────┘ │  │   │  │
                                    │  │  │  └─────────────────────────────────────────┘  │   │  │
                                    │  │  └───────────────────────────────────────────────┘   │  │
                                    │  │                          │                            │  │
                                    │  │  ┌───────────────────────▼───────────────────────┐   │  │
                                    │  │  │              Database Subnets                  │   │  │
                                    │  │  │  ┌──────────────────┐  ┌──────────────────┐   │   │  │
                                    │  │  │  │  RDS PostgreSQL  │  │ ElastiCache Redis│   │   │  │
                                    │  │  │  │  (Multi-AZ)      │  │ (Cluster Mode)   │   │   │  │
                                    │  │  │  └──────────────────┘  └──────────────────┘   │   │  │
                                    │  │  └───────────────────────────────────────────────┘   │  │
                                    │  └───────────────────────────────────────────────────────┘  │
                                    └─────────────────────────────────────────────────────────────┘
```

## Service Inventory

### Critical Services (Fargate On-Demand)
| Service | Port | Health Check | CPU | Memory | Min/Max Tasks |
|---------|------|--------------|-----|--------|---------------|
| api | 4000 | /health | 2048 (prod) | 4096 MB | 5/20 |
| web | 3000 | /api/health | 1024 (prod) | 2048 MB | 5/15 |
| ai-engine | 8002 | /health | 512 | 1024 MB | 2/10 |
| recommendation | 8001 | /health | 512 | 1024 MB | 2/10 |
| search | 8003 | /health | 256 | 512 MB | 2/10 |
| notification | 8009 | /health | 256 | 512 MB | 2/10 |
| inventory | 8007 | /health | 256 | 512 MB | 2/10 |
| pricing | 8006 | /health | 256 | 512 MB | 2/6 |

### Worker Services (Fargate Spot - 80%)
| Service | CPU | Memory | Min/Max Tasks |
|---------|-----|--------|---------------|
| analytics | 256 | 512 MB | 1/5 |
| chatbot | 256 | 512 MB | 1/5 |
| fraud-detection | 256 | 512 MB | 1/5 |
| media | 256 | 512 MB | 1/5 |
| personalization | 256 | 512 MB | 1/5 |
| supplier-integration | 256 | 512 MB | 1/5 |
| ai-agents | 256 | 512 MB | 1/5 |

## Networking

### VPC Configuration
- **Production CIDR**: 10.0.0.0/16
- **Staging CIDR**: 10.1.0.0/16
- **Availability Zones**: 3 (us-east-1a, us-east-1b, us-east-1c)

### Subnet Layout
| Subnet Type | CIDR Range | Purpose |
|-------------|------------|---------|
| Public | 10.0.101.0/24 - 10.0.103.0/24 | ALB, NAT Gateway |
| Private | 10.0.1.0/24 - 10.0.3.0/24 | ECS Tasks |
| Database | 10.0.201.0/24 - 10.0.203.0/24 | RDS, ElastiCache |

### Security Groups
1. **ALB Security Group**: HTTP (80) redirect, HTTPS (443) from internet
2. **ECS Tasks Security Group**: Traffic from ALB, inter-service communication
3. **Service Discovery Security Group**: DNS (53) for Cloud Map
4. **Database Security Group**: PostgreSQL (5432) from ECS tasks
5. **Redis Security Group**: Redis (6379) from ECS tasks

## Load Balancing

### ALB Configuration
- **Type**: Internet-facing Application Load Balancer
- **SSL Policy**: ELBSecurityPolicy-TLS13-1-2-2021-06
- **HTTP to HTTPS**: Automatic redirect

### Routing Rules
| Priority | Path Pattern | Target Service |
|----------|--------------|----------------|
| 100 | /api/*, /graphql | api |
| 110 | /ai/* | ai-engine |
| 120 | /recommendations/* | recommendation |
| 130 | /search/* | search |
| 140 | /notifications/* | notification |
| 160 | /inventory/* | inventory |
| 170 | /pricing/* | pricing |
| 200 | /* (default) | web |

## Service Discovery

AWS Cloud Map provides DNS-based service discovery within the VPC:
- **Namespace**: `broxiva-prod.local`
- **Service Format**: `{service-name}.broxiva-prod.local`

Example internal URLs:
- `api.broxiva-prod.local:4000`
- `search.broxiva-prod.local:8003`
- `notification.broxiva-prod.local:8009`

## Auto Scaling

### Scaling Policies
1. **CPU-based**: Scale when CPU > 70%
2. **Memory-based**: Scale when Memory > 80%
3. **Request Count**: Scale based on ALB request count per target

### Scaling Parameters
- **Scale Out Cooldown**: 60 seconds
- **Scale In Cooldown**: 300 seconds
- **Min Capacity**: Environment-dependent
- **Max Capacity**: Service-dependent

## IAM Roles

### ECS Task Execution Role
Permissions for ECS agent:
- ECR image pull
- CloudWatch Logs write
- Secrets Manager read (project secrets)
- SSM Parameter Store read
- KMS decrypt (for secrets)

### ECS Task Role
Permissions for application containers:
- S3 access (project buckets)
- SQS send/receive
- SNS publish
- SES send email
- X-Ray trace submission
- SSM Messages (ECS Exec)

## Monitoring & Logging

### CloudWatch
- **Container Insights**: Enabled
- **Log Groups**: `/aws/ecs/broxiva-prod/{service}`
- **Log Retention**: 30 days (prod), 14 days (staging)

### Alarms
- CPU > 80% for 3 minutes
- Memory > 80% for 3 minutes
- ALB 5xx errors > 10 per minute
- Response time > 2 seconds

## Deployment Strategy

### Circuit Breaker
- **Enabled**: Yes
- **Rollback**: Automatic on deployment failure

### Deployment Configuration
- **Minimum Healthy**: 100% (critical), 50% (workers)
- **Maximum Percent**: 200%
- **Health Check Grace Period**: 120s (critical), 60s (workers)

## Cost Optimization

### Fargate Spot
- **Worker Services**: 80% Fargate Spot, 20% On-Demand
- **Critical Services**: 100% On-Demand

### Resource Right-Sizing
- Development: Minimum resources
- Staging: 50% of production
- Production: Full capacity with auto-scaling

## Security

### Network Security
- ECS tasks run in private subnets (no public IPs)
- VPC endpoints for ECR, Secrets Manager, S3
- Security groups with least privilege

### Secrets Management
- Database credentials: AWS Secrets Manager
- API keys: AWS Secrets Manager
- Configuration: SSM Parameter Store

### Encryption
- KMS encryption for CloudWatch Logs
- TLS 1.3 for ALB
- Encryption at rest for RDS and ElastiCache
