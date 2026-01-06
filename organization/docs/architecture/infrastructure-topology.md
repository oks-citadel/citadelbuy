# Broxiva E-Commerce Platform - Infrastructure Topology

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Classification:** Internal - Infrastructure Team
**Author:** Infrastructure Architect (Agent 07)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [High-Level Architecture](#high-level-architecture)
3. [Multi-Cloud Strategy](#multi-cloud-strategy)
4. [Network Topology](#network-topology)
5. [Compute Layer](#compute-layer)
6. [Data Layer](#data-layer)
7. [Caching & Message Queuing](#caching--message-queuing)
8. [CDN & Edge Services](#cdn--edge-services)
9. [Monitoring & Observability](#monitoring--observability)
10. [Security Architecture](#security-architecture)
11. [High Availability Design](#high-availability-design)
12. [Disaster Recovery](#disaster-recovery)
13. [Scaling Architecture](#scaling-architecture)

---

## Executive Summary

The Broxiva E-Commerce Platform is deployed on a multi-cloud, multi-region architecture designed for high availability, scalability, and disaster recovery. The platform leverages:

- **Primary Cloud:** AWS (us-east-1, us-west-2)
- **Secondary Cloud:** Azure (for specific workloads and DR)
- **Container Orchestration:** Amazon EKS / Azure AKS
- **Database:** Amazon RDS PostgreSQL (Multi-AZ) / Azure PostgreSQL Flexible Server
- **Caching:** Amazon ElastiCache Redis (Cluster Mode)
- **Search:** Elasticsearch (3-node cluster)
- **CDN:** CloudFront / Azure CDN

### Key Design Principles

1. **No Single Points of Failure** - All critical components are replicated
2. **Multi-AZ Deployment** - All services span at least 2 availability zones
3. **Auto-Scaling** - HPA/VPA for dynamic capacity management
4. **Defense in Depth** - Multiple security layers
5. **Infrastructure as Code** - All resources managed via Terraform

---

## High-Level Architecture

```
                                    [Global DNS - Route 53]
                                            |
                    +--------------------------------------------------+
                    |                                                  |
            [CloudFront CDN]                                   [Azure CDN]
                    |                                                  |
            +-------+-------+                                  +-------+-------+
            |               |                                  |               |
      [us-east-1]     [us-west-2]                        [East US]      [West US]
            |               |                                  |               |
    +-------+-------+   +---+---+                       +------+------+
    |               |       |                          |              |
  [ALB]          [ALB]    [NLB]                      [App GW]    [App GW]
    |               |       |                          |              |
+---+---+       +---+---+   |                      +---+---+      +---+---+
|  EKS  |       |  EKS  |   |                      |  AKS  |      |  AKS  |
+---+---+       +---+---+   |                      +---+---+      +---+---+
    |               |       |                          |              |
+---+---+       +---+---+   |                      +---+---+      +---+---+
|  RDS  |<----->|  RDS  |   |                      | PgSQL |<---->| PgSQL |
|(Multi-AZ)|    |(Read) |   |                      |(Flex) |      |(Flex) |
+-------+       +-------+   |                      +-------+      +-------+
    |               |       |                          |              |
[ElastiCache]   [ElastiCache]                    [Azure Cache]  [Azure Cache]
  Cluster         Replica                          Cluster        Replica
```

---

## Multi-Cloud Strategy

### AWS Infrastructure (Primary)

| Component | Service | Configuration | Region |
|-----------|---------|---------------|--------|
| Container Orchestration | EKS | v1.28, 3-5 node groups | us-east-1, us-west-2 |
| Database | RDS PostgreSQL | db.r6g.xlarge, Multi-AZ | us-east-1 |
| Cache | ElastiCache Redis | cache.r6g.large, Cluster | us-east-1 |
| Storage | S3 | Standard + Intelligent-Tiering | us-east-1 |
| CDN | CloudFront | Global Edge Locations | Global |
| DNS | Route 53 | Active-Active Failover | Global |
| Secrets | Secrets Manager | Automatic rotation | us-east-1 |
| Monitoring | CloudWatch | Container Insights | us-east-1 |

### Azure Infrastructure (Secondary/DR)

| Component | Service | Configuration | Region |
|-----------|---------|---------------|--------|
| Container Orchestration | AKS | v1.28, 3 node pools | East US, West US |
| Database | PostgreSQL Flexible | D4s_v3, Zone Redundant | East US |
| Cache | Azure Cache for Redis | Premium P1, Clustering | East US |
| Storage | Blob Storage | LRS/GRS | East US |
| CDN | Azure CDN | Standard Microsoft | Global |
| Secrets | Key Vault | Premium, HSM-backed | East US |
| Monitoring | Azure Monitor | Container Insights | East US |

---

## Network Topology

### AWS VPC Architecture

```
VPC CIDR: 10.0.0.0/16

+------------------+------------------+------------------+
|   AZ-1 (a)       |   AZ-2 (b)       |   AZ-3 (c)       |
+------------------+------------------+------------------+
| Public Subnet    | Public Subnet    | Public Subnet    |
| 10.0.1.0/24      | 10.0.2.0/24      | 10.0.3.0/24      |
| [NAT GW, ALB]    | [NAT GW, ALB]    | [NAT GW, ALB]    |
+------------------+------------------+------------------+
| Private Subnet   | Private Subnet   | Private Subnet   |
| 10.0.11.0/24     | 10.0.12.0/24     | 10.0.13.0/24     |
| [EKS Nodes]      | [EKS Nodes]      | [EKS Nodes]      |
+------------------+------------------+------------------+
| Database Subnet  | Database Subnet  | Database Subnet  |
| 10.0.21.0/24     | 10.0.22.0/24     | 10.0.23.0/24     |
| [RDS, ElastiCache]| [RDS Standby]   | [Read Replica]   |
+------------------+------------------+------------------+
```

### Network Security Groups

| NSG Name | Purpose | Inbound Rules | Outbound Rules |
|----------|---------|---------------|----------------|
| alb-nsg | Load Balancer | 80, 443 from Internet | All to VPC |
| app-nsg | Application Tier | 3000, 4000 from ALB | All to VPC, 443 to Internet |
| db-nsg | Database Tier | 5432 from App Subnet | None |
| cache-nsg | Cache Tier | 6379 from App Subnet | None |

---

## Compute Layer

### EKS Cluster Configuration

```yaml
Cluster Name: broxiva-production
Kubernetes Version: 1.28
Node Groups:
  - Name: system
    Instance Type: m6i.large
    Min Size: 2
    Max Size: 4
    Labels:
      node-role: system
    Taints:
      - CriticalAddonsOnly=true:NoSchedule

  - Name: application
    Instance Type: m6i.xlarge
    Min Size: 3
    Max Size: 20
    Labels:
      node-role: application

  - Name: worker
    Instance Type: c6i.xlarge
    Min Size: 2
    Max Size: 15
    Labels:
      node-role: worker

  - Name: ai-workloads
    Instance Type: g4dn.xlarge
    Min Size: 0
    Max Size: 5
    Labels:
      node-role: ai
    Taints:
      - nvidia.com/gpu=true:NoSchedule
```

### Workload Distribution

| Namespace | Deployments | Replicas | Node Selector |
|-----------|-------------|----------|---------------|
| broxiva-production | broxiva-api | 5-20 | application |
| broxiva-production | broxiva-web | 5-15 | application |
| broxiva-production | email-worker | 3-10 | worker |
| broxiva-production | order-processing-worker | 5-15 | worker |
| broxiva-production | search-indexing-worker | 3-10 | worker |
| broxiva-ai | recommendation-engine | 2-5 | ai |

---

## Data Layer

### PostgreSQL Configuration

#### Primary Database (Production)

| Setting | Value |
|---------|-------|
| Instance Class | db.r6g.xlarge |
| Storage | 500 GB gp3 |
| IOPS | 12000 |
| Multi-AZ | Enabled |
| Read Replicas | 2 (us-east-1, us-west-2) |
| Backup Retention | 30 days |
| Point-in-Time Recovery | Enabled |
| Encryption | AES-256 (KMS) |
| Parameter Group | Custom (optimized) |

#### Database Parameters

```
max_connections: 200
shared_buffers: 4GB
effective_cache_size: 12GB
maintenance_work_mem: 512MB
checkpoint_completion_target: 0.9
wal_buffers: 64MB
default_statistics_target: 100
random_page_cost: 1.1
effective_io_concurrency: 200
work_mem: 32MB
min_wal_size: 2GB
max_wal_size: 8GB
```

### Elasticsearch Cluster

```yaml
Cluster Name: broxiva-search
Version: 8.11.0
Node Configuration:
  Master Nodes:
    Count: 3
    Instance Type: i3.large (dedicated master)
    Storage: 100 GB SSD
  Data Nodes:
    Count: 3
    Instance Type: r6.xlarge
    Storage: 500 GB SSD
  Coordinator Nodes:
    Count: 2
    Instance Type: m6.large

Index Settings:
  number_of_shards: 5
  number_of_replicas: 1
  refresh_interval: 1s

Snapshot:
  Repository: S3
  Frequency: Daily
  Retention: 30 days
```

---

## Caching & Message Queuing

### Redis Cluster Configuration

```yaml
Cluster Mode: Enabled
Engine Version: 7.0
Node Type: cache.r6g.large
Replicas per Shard: 2
Shards: 3
Total Nodes: 9

Failover:
  Automatic: Yes
  Multi-AZ: Yes

Maintenance Window: Sun 03:00-05:00 UTC
Snapshot Retention: 7 days

Parameters:
  maxmemory-policy: volatile-lru
  timeout: 0
  tcp-keepalive: 300
```

### Message Queue (SQS/Redis Streams)

| Queue | Type | Max Messages | Visibility Timeout | DLQ |
|-------|------|--------------|-------------------|-----|
| order-processing | FIFO | 10000 | 300s | Yes |
| email-notifications | Standard | 50000 | 60s | Yes |
| search-indexing | Standard | 100000 | 120s | Yes |
| inventory-sync | FIFO | 5000 | 600s | Yes |

---

## CDN & Edge Services

### CloudFront Distribution

```yaml
Distribution ID: E1ABCDEF123456
Origins:
  - S3 Static Assets (broxiva-static)
  - ALB Dynamic Content (api.broxiva.com)

Behaviors:
  - /static/*:
      Origin: S3
      TTL: 86400
      Compress: Yes

  - /api/*:
      Origin: ALB
      TTL: 0
      Forward Headers: All
      Forward Cookies: Whitelist (session, csrf)

  - Default:
      Origin: ALB
      TTL: 300
      Forward Headers: Host

Edge Locations: All (300+)
Price Class: PriceClass_All
SSL Certificate: ACM (*.broxiva.com)
HTTP/2: Enabled
HTTP/3: Enabled
```

---

## Monitoring & Observability

### Prometheus Stack

```yaml
Components:
  Prometheus:
    Replicas: 2 (HA)
    Retention: 30 days
    Storage: 100 GB
    Scrape Interval: 15s

  Alertmanager:
    Replicas: 3
    Cluster Mode: Yes

  Grafana:
    Replicas: 2
    Data Sources: Prometheus, CloudWatch, Azure Monitor

Dashboards:
  - Application Overview
  - Infrastructure Health
  - Business Metrics
  - SLO/SLA Tracking
  - Cost Analytics
```

### Alert Routing

```yaml
Critical (PagerDuty):
  - Service Down
  - Database Connection Failure
  - Payment Processing Error
  - Security Breach Detection

Warning (Slack + Email):
  - High CPU/Memory (>80%)
  - Slow Response Time (>2s)
  - Error Rate (>1%)
  - Low Disk Space (<20%)

Info (Slack):
  - Deployment Completed
  - Scale Event
  - Backup Completed
```

---

## Security Architecture

### Defense Layers

```
Layer 1: Edge Protection
  - AWS WAF (OWASP Top 10)
  - CloudFront Geo-Blocking
  - DDoS Protection (Shield Advanced)
  - Bot Detection

Layer 2: Network Security
  - VPC Isolation
  - Security Groups
  - Network ACLs
  - Private Subnets

Layer 3: Application Security
  - Istio Service Mesh
  - mTLS Between Services
  - Network Policies
  - Pod Security Standards

Layer 4: Data Security
  - Encryption at Rest (KMS)
  - Encryption in Transit (TLS 1.3)
  - Secrets Management (External Secrets)
  - Database Encryption
```

### IAM & Access Control

| Role | Permissions | MFA Required |
|------|-------------|--------------|
| Admin | Full Access | Yes |
| DevOps | Infrastructure Management | Yes |
| Developer | Read-Only + Deploy | Yes |
| Support | Read-Only Logs | Yes |
| Service Account | Scoped by Workload | N/A (IRSA) |

---

## High Availability Design

### Component Redundancy Matrix

| Component | Replicas | Multi-AZ | Multi-Region | Failover Time |
|-----------|----------|----------|--------------|---------------|
| API Gateway | 5+ | Yes | Planned | Immediate |
| Web Frontend | 5+ | Yes | Planned | Immediate |
| Workers | 3+ | Yes | No | <1 min |
| PostgreSQL | 2 (Primary + Standby) | Yes | Yes (Read) | <60s |
| Redis | 9 (3 shards x 3) | Yes | Planned | <30s |
| Elasticsearch | 8 | Yes | No | <2 min |
| Prometheus | 2 | Yes | No | <1 min |

### Pod Disruption Budgets

```yaml
API:
  minAvailable: 3

Web:
  minAvailable: 3

Workers:
  minAvailable: 2

Database (Stateful):
  maxUnavailable: 1
```

### Topology Spread Constraints

All application pods are configured with:
- **Zone Spread:** maxSkew: 1, DoNotSchedule
- **Node Spread:** maxSkew: 2, ScheduleAnyway

---

## Disaster Recovery

### RTO/RPO Targets

| Tier | Component | RPO | RTO |
|------|-----------|-----|-----|
| 1 | Payment Processing | 0 | 15 min |
| 1 | Order Management | 5 min | 30 min |
| 2 | User Authentication | 15 min | 1 hour |
| 2 | Product Catalog | 1 hour | 2 hours |
| 3 | Analytics | 24 hours | 4 hours |

### Backup Strategy

```yaml
Database:
  Automated Snapshots: Every 6 hours
  Transaction Logs: Continuous (PITR)
  Retention: 30 days
  Cross-Region Copy: Yes (us-west-2)

Object Storage:
  Versioning: Enabled
  Lifecycle:
    - IA after 30 days
    - Glacier after 90 days
    - Delete after 365 days
  Cross-Region Replication: Yes

Secrets:
  Backup: Key Vault to separate subscription
  Rotation: 90 days
```

### Failover Procedures

See: [Disaster Recovery Plan](./disaster-recovery-plan.md)

---

## Scaling Architecture

### Horizontal Pod Autoscaler (HPA)

| Deployment | Min | Max | CPU Target | Memory Target | Custom Metrics |
|------------|-----|-----|------------|---------------|----------------|
| broxiva-api | 5 | 20 | 70% | 80% | requests/s: 1000 |
| broxiva-web | 5 | 15 | 70% | 80% | requests/s: 500 |
| email-worker | 3 | 10 | 75% | 80% | queue_depth |
| order-worker | 5 | 15 | 70% | 80% | queue_depth |
| search-worker | 3 | 10 | 75% | 80% | index_lag |

### Cluster Autoscaler

```yaml
Settings:
  scale-down-enabled: true
  scale-down-delay-after-add: 10m
  scale-down-unneeded-time: 10m
  scale-down-utilization-threshold: 0.5
  skip-nodes-with-local-storage: false
  skip-nodes-with-system-pods: true

Node Group Scaling:
  application:
    min: 3
    max: 20
    scale-up-threshold: 80% CPU
    scale-down-threshold: 30% CPU
```

### Database Scaling

| Scenario | Strategy | Trigger |
|----------|----------|---------|
| Read Heavy | Add Read Replica | Replica Lag > 100ms |
| Write Heavy | Vertical Scale | CPU > 80% sustained |
| Storage Growth | Auto-scaling | Storage > 80% |
| Connection Limit | PgBouncer Pool | Connections > 150 |

---

## Appendix

### Terraform Module Structure

```
infrastructure/terraform/
├── environments/
│   ├── dev/
│   ├── staging/
│   ├── prod/
│   └── aws-prod/
├── modules/
│   ├── compute/
│   ├── database/
│   ├── networking/
│   ├── security/
│   ├── storage/
│   ├── monitoring/
│   └── global-cdn/
└── README.md
```

### Kubernetes Namespace Structure

```
Namespaces:
├── broxiva-production (main workloads)
├── broxiva-staging (staging environment)
├── broxiva-ai (AI/ML workloads)
├── broxiva-monitoring (observability)
├── ingress-nginx (ingress controller)
├── cert-manager (TLS management)
├── external-secrets (secrets sync)
└── istio-system (service mesh)
```

### Resource Tags

All resources are tagged with:
- `Project`: broxiva
- `Environment`: production|staging|development
- `Owner`: devops@broxiva.com
- `CostCenter`: BROX-INFRA
- `ManagedBy`: terraform
- `Compliance`: pci-dss|gdpr

---

**Document Revision History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | Agent 07 | Initial document creation |
