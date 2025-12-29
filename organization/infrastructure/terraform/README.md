# Broxiva Terraform Infrastructure

Multi-cloud infrastructure as code for the Broxiva e-commerce platform, supporting both Azure and AWS deployments.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Module Structure](#module-structure)
- [Quick Start](#quick-start)
- [Environments](#environments)
- [Multi-Cloud Support](#multi-cloud-support)
- [Modules](#modules)
- [Security](#security)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

This Terraform configuration provides a complete, production-ready infrastructure for the Broxiva platform with support for:

- **Multi-cloud deployment**: Azure and AWS
- **Multiple environments**: Development, Staging, Production
- **High availability**: Multi-zone deployments, auto-scaling, failover
- **Security**: Network isolation, encryption, WAF, DDoS protection
- **Observability**: Comprehensive monitoring, logging, and alerting
- **Cost optimization**: Spot/reserved instances, auto-scaling, lifecycle policies

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Global CDN                            │
│         (Azure Front Door / AWS CloudFront)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼─────┐              ┌─────▼────┐
    │  Region  │              │  Region  │
    │  Primary │              │ Secondary│
    └────┬─────┘              └─────┬────┘
         │                           │
    ┌────▼──────────────────────────▼────┐
    │         VPC/VNet (Multi-AZ)        │
    ├────────────────────────────────────┤
    │  Public Subnets (Load Balancers)   │
    │  Private Subnets (Kubernetes)      │
    │  Database Subnets (RDS/PostgreSQL) │
    └────────────────────────────────────┘
```

### Component Stack

- **Compute**: Kubernetes (AKS/EKS) with multi-node pools
- **Database**: PostgreSQL (Azure Flexible Server/RDS)
- **Cache**: Redis (Azure Cache/ElastiCache)
- **Storage**: Blob Storage (Azure Storage/S3)
- **CDN**: Azure Front Door / CloudFront
- **Container Registry**: ACR / ECR
- **Monitoring**: Application Insights / CloudWatch
- **Security**: Key Vault / Secrets Manager, WAF, Network Security Groups

## Prerequisites

### Required Tools

```bash
# Terraform
terraform version >= 1.0

# Cloud CLIs
az --version      # Azure CLI
aws --version     # AWS CLI

# Kubernetes tools
kubectl version
helm version
```

### Authentication

#### Azure

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create service principal for Terraform (optional)
az ad sp create-for-rbac --name "terraform-sp" --role="Contributor"
```

#### AWS

```bash
# Configure AWS credentials
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Module Structure

```
terraform/
├── modules/
│   ├── compute/                 # AKS/EKS, Container Registry
│   │   ├── main.tf             # Azure resources
│   │   ├── main-aws.tf         # AWS resources
│   │   ├── variables.tf        # Common variables
│   │   ├── variables-extended.tf  # Cloud-specific variables
│   │   ├── outputs.tf          # Azure outputs
│   │   └── outputs-aws.tf      # AWS outputs
│   ├── database/                # PostgreSQL, Redis
│   │   ├── main.tf             # Azure resources
│   │   ├── main-aws.tf         # AWS resources
│   │   └── ...
│   ├── networking/              # VPC/VNet, Subnets, Security Groups
│   ├── storage/                 # Blob Storage/S3
│   ├── global-cdn/              # Azure Front Door/CloudFront
│   ├── monitoring/              # Logging, Metrics, Alerts
│   └── security/                # Key Vault, WAF, DDoS Protection
├── environments/
│   ├── dev/                     # Development environment
│   ├── staging/                 # Staging environment
│   └── prod/                    # Production environment
└── README.md
```

## Quick Start

### 1. Initialize Terraform

```bash
cd environments/dev
terraform init
```

### 2. Create tfvars file

```bash
# Create terraform.tfvars
cat > terraform.tfvars <<EOF
cloud_provider = "azure"  # or "aws"

# Azure
azure_subscription_id = "your-subscription-id"
azure_tenant_id = "your-tenant-id"

# Database
db_admin_password = "your-secure-password"

# Monitoring
oncall_email = "oncall@example.com"
team_email = "team@example.com"
EOF
```

### 3. Plan and Apply

```bash
# Review planned changes
terraform plan

# Apply changes
terraform apply
```

### 4. Access Kubernetes Cluster

#### Azure AKS

```bash
az aks get-credentials \
  --resource-group broxiva-dev-rg \
  --name broxiva-dev-aks

kubectl get nodes
```

#### AWS EKS

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name broxiva-dev-eks

kubectl get nodes
```

## Environments

### Development

- **Purpose**: Feature development and testing
- **Resources**: Minimal, cost-optimized
- **Availability**: Single-zone
- **Backup**: Limited retention (7 days)
- **Scaling**: Manual, limited
- **Location**: `environments/dev/`

#### Resource Sizing

- **Kubernetes**: 1-2 nodes (Burstable/t3.small)
- **Database**: Basic tier, 32GB storage
- **Cache**: Basic Redis, 250MB
- **Monitoring**: Limited retention

### Staging

- **Purpose**: Pre-production validation
- **Resources**: Production-like but smaller
- **Availability**: Multi-zone
- **Backup**: Medium retention (30 days)
- **Scaling**: Auto-scaling enabled
- **Location**: `environments/staging/`

#### Resource Sizing

- **Kubernetes**: 2-5 nodes (Standard/t3.medium)
- **Database**: General Purpose, 32GB storage
- **Cache**: Standard Redis, 1GB
- **Monitoring**: 30-day retention

### Production

- **Purpose**: Live customer-facing environment
- **Resources**: High availability, redundant
- **Availability**: Multi-region ready
- **Backup**: Long retention (90+ days)
- **Scaling**: Auto-scaling with spot instances
- **Location**: `environments/prod/`

#### Resource Sizing

- **Kubernetes**: 3-20 nodes (Standard/t3.large+)
- **Database**: High-performance, 128GB+ storage, HA
- **Cache**: Premium Redis with clustering
- **Monitoring**: 90-day retention

## Multi-Cloud Support

### Switching Between Clouds

Set the `cloud_provider` variable in your `terraform.tfvars`:

```hcl
# For Azure deployment
cloud_provider = "azure"
azure_subscription_id = "..."
azure_tenant_id = "..."

# For AWS deployment
cloud_provider = "aws"
aws_region = "us-east-1"
```

### Azure-specific Features

- **Azure Active Directory**: RBAC integration
- **Azure Front Door**: Global CDN with WAF
- **Azure Monitor**: Application Insights
- **Managed Identity**: Pod identity for secrets

### AWS-specific Features

- **IAM Roles for Service Accounts (IRSA)**: Pod-level permissions
- **CloudFront**: Global CDN with Lambda@Edge
- **CloudWatch**: Container Insights
- **VPC Endpoints**: Private AWS service access

## Modules

### Compute Module

Provisions Kubernetes clusters and container registries.

**Azure Resources**:
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- System, User, and Spot node pools
- App Service (optional backup)

**AWS Resources**:
- Elastic Kubernetes Service (EKS)
- Elastic Container Registry (ECR)
- Managed node groups (system, user, spot)
- EKS add-ons (VPC CNI, CoreDNS, EBS CSI)

**Key Features**:
- Auto-scaling node pools
- Multiple availability zones
- Spot instances for cost savings
- Private container registry
- Integration with monitoring

### Database Module

Provisions PostgreSQL database and Redis cache.

**Azure Resources**:
- PostgreSQL Flexible Server
- Azure Cache for Redis
- Private endpoints
- Geo-redundant backups (prod)

**AWS Resources**:
- RDS PostgreSQL
- ElastiCache Redis Replication Group
- Read replicas (prod)
- Enhanced monitoring
- Performance Insights

**Key Features**:
- Automated backups
- Point-in-time recovery
- High availability (multi-AZ/zone)
- Encryption at rest and in transit
- Connection pooling ready

### Networking Module

Creates network infrastructure with security controls.

**Azure Resources**:
- Virtual Network (VNet)
- Public, Private, Database, AKS subnets
- Network Security Groups (NSGs)
- NAT Gateway
- Private DNS zones

**AWS Resources**:
- Virtual Private Cloud (VPC)
- Public, Private, Database subnets
- Security Groups
- NAT Gateways (multi-AZ)
- VPC Flow Logs
- VPC Endpoints (S3, ECR)

**Key Features**:
- Multi-zone/AZ deployment
- Network isolation
- Managed outbound traffic
- Service endpoints/VPC endpoints
- DDoS protection

### Storage Module

Object storage for media, backups, and static assets.

**Azure Resources**:
- Storage Account (Blob, File, Table, Queue)
- Blob containers (media, uploads, backups, logs)
- Lifecycle management policies
- Azure Front Door CDN integration

**AWS Resources**:
- S3 buckets (main, static, backups)
- Lifecycle policies (IA, Glacier transitions)
- Versioning and encryption
- CloudFront CDN integration

**Key Features**:
- Lifecycle policies for cost optimization
- Encryption at rest
- CORS configuration
- Soft delete and versioning
- CDN integration

### Global CDN Module

Global content delivery with WAF protection.

**Azure Resources**:
- Azure Front Door Premium
- Custom domains with managed SSL
- WAF with OWASP rules
- Geo-filtering and rate limiting
- Health probes and origin groups

**AWS Resources**:
- CloudFront distributions
- Origin Access Control (OAC)
- Lambda@Edge / CloudFront Functions
- AWS WAF integration
- Custom SSL certificates (ACM)

**Key Features**:
- Global edge locations
- DDoS protection
- SSL/TLS termination
- Caching strategies
- Security headers injection

### Monitoring Module

Comprehensive observability and alerting.

**Azure Resources**:
- Log Analytics Workspace
- Application Insights
- Action Groups (email, webhooks)
- Metric alerts (CPU, memory, errors)
- Availability tests
- Azure Dashboards

**AWS Resources**:
- CloudWatch Logs
- CloudWatch Metrics
- SNS topics for alerts
- CloudWatch Alarms
- X-Ray tracing (optional)
- CloudWatch Dashboards

**Key Features**:
- Centralized logging
- Performance metrics
- Custom alerts
- Availability monitoring
- Integration with PagerDuty/Slack

## Security

### Network Security

- **Private Subnets**: Application workloads isolated
- **Security Groups/NSGs**: Least-privilege access
- **Private Endpoints**: Database and cache not public
- **WAF**: Web Application Firewall for CDN
- **DDoS Protection**: Enabled on production

### Encryption

- **At Rest**: All storage encrypted (KMS/Azure Storage Service Encryption)
- **In Transit**: TLS 1.2+ enforced
- **Secrets**: Key Vault/Secrets Manager integration
- **Database**: Transparent Data Encryption

### Access Control

- **RBAC**: Kubernetes role-based access control
- **IAM/AD**: Cloud provider identity integration
- **Service Accounts**: Pod-level permissions
- **Audit Logging**: All API calls logged

### Best Practices

```hcl
# Use separate state files per environment
terraform {
  backend "azurerm" {
    container_name = "tfstate"
    key            = "prod.terraform.tfstate"
  }
}

# Enable deletion protection on production
resource "azurerm_postgresql_flexible_server" "main" {
  lifecycle {
    prevent_destroy = true  # Set to true in production
  }
}

# Use secrets from Key Vault/Secrets Manager
data "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  key_vault_id = var.key_vault_id
}
```

## Cost Optimization

### Strategies

1. **Right-sizing**: Use appropriate instance types for workload
2. **Auto-scaling**: Scale down during off-hours
3. **Spot Instances**: Use for fault-tolerant workloads
4. **Reserved Instances**: Commit for baseline capacity
5. **Lifecycle Policies**: Move old data to cheaper storage tiers
6. **Regional Selection**: Choose cost-effective regions

### Development Environment Savings

```hcl
# Use burstable instances
system_node_size = "Standard_B2s"  # Azure
system_node_size = "t3.medium"     # AWS

# Disable high-availability features
postgres_geo_redundant = false
postgres_high_availability = false
enable_nat_gateway = false  # Use public IPs instead
enable_cdn = false
```

### Production Cost Controls

```hcl
# Enable auto-scaling with limits
user_node_min = 3
user_node_max = 20

# Use spot instances for batch workloads
enable_spot_nodes = true
spot_node_max = 10

# Lifecycle policies for storage
# Automatically tier old data to cheaper storage
```

### Cost Monitoring

```bash
# Azure Cost Analysis
az consumption usage list --start-date 2024-01-01 --end-date 2024-01-31

# AWS Cost Explorer (via console or CLI)
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics "BlendedCost"
```

## Troubleshooting

### Common Issues

#### 1. State Lock Issues

```bash
# Azure
az storage blob lease break \
  --container-name tfstate \
  --blob-name prod.terraform.tfstate \
  --account-name broxivatfstate

# AWS (DynamoDB)
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID":{"S":"broxiva-prod"}}'
```

#### 2. Kubernetes Access Issues

```bash
# Azure - Reset AKS credentials
az aks get-credentials \
  --resource-group broxiva-prod-rg \
  --name broxiva-prod-aks \
  --overwrite-existing

# AWS - Update kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name broxiva-prod-eks \
  --kubeconfig ~/.kube/config
```

#### 3. Module Dependency Issues

```bash
# Refresh state
terraform refresh

# Target specific resources
terraform apply -target=module.networking
terraform apply -target=module.database

# Full recreation
terraform destroy -target=module.compute
terraform apply
```

#### 4. Quota/Limit Issues

```bash
# Azure - Check quotas
az vm list-usage --location eastus

# AWS - Check limits
aws service-quotas list-service-quotas \
  --service-code eks
```

### Debugging

Enable verbose logging:

```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log
terraform apply
```

Validate configuration:

```bash
terraform validate
terraform fmt -check -recursive
```

## Maintenance

### Regular Updates

```bash
# Update Terraform providers
terraform init -upgrade

# Update Kubernetes version
# Edit environment main.tf
kubernetes_version = "1.29"  # New version
terraform plan
terraform apply
```

### Backup and Recovery

#### Database Backups

```bash
# Azure - Manual backup
az postgres flexible-server backup create \
  --resource-group broxiva-prod-rg \
  --name broxiva-prod-postgres \
  --backup-name manual-backup-$(date +%Y%m%d)

# AWS - Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier broxiva-prod-postgres \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

#### State Backup

```bash
# Backup state file
terraform state pull > terraform.tfstate.backup-$(date +%Y%m%d)
```

### Disaster Recovery

1. **Multi-Region Setup**: Deploy to secondary region
2. **Automated Backups**: Enabled with geo-redundancy
3. **Infrastructure as Code**: Entire infrastructure can be recreated
4. **Runbooks**: Document recovery procedures

## Contributing

1. Create feature branch
2. Make changes to modules
3. Test in dev environment
4. Submit pull request
5. Deploy to staging
6. Deploy to production

## License

Copyright (c) 2024 Broxiva Platform Team

## Support

- **Documentation**: [Internal Wiki]
- **Issues**: [GitHub Issues]
- **Slack**: #infrastructure channel
- **On-Call**: See PagerDuty rotation
