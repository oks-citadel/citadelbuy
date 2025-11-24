# CitadelBuy Infrastructure - Azure

Complete Microsoft Azure infrastructure setup for the CitadelBuy e-commerce platform.

## Table of Contents

- [Overview](#overview)
- [Azure Services Used](#azure-services-used)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Terraform Modules](#terraform-modules)
- [Deployment Guide](#deployment-guide)
- [Cost Optimization](#cost-optimization)
- [Security](#security)
- [Monitoring](#monitoring)

## Overview

This infrastructure is built entirely on Microsoft Azure, leveraging Azure-native services for scalability, reliability, and security.

### Azure Services Used

**Compute & Containers:**
- **Azure Kubernetes Service (AKS)** - Managed Kubernetes cluster
- **Azure Container Registry (ACR)** - Private container registry
- **Azure Container Instances (ACI)** - Serverless containers

**Database & Cache:**
- **Azure Database for PostgreSQL Flexible Server** - Managed PostgreSQL with Zone-Redundant HA
- **Azure Cache for Redis Premium** - Managed Redis with persistence and geo-replication

**Storage:**
- **Azure Blob Storage** - Object storage for uploads and backups
- **Azure Files** - File shares for shared application data

**Networking:**
- **Azure Virtual Network (VNet)** - Private network infrastructure
- **Azure NAT Gateway** - Outbound internet connectivity
- **Azure Application Gateway** - Layer 7 load balancer with WAF
- **Azure Private Endpoint** - Secure access to PaaS services
- **Azure DNS** - Private DNS zones

**Security:**
- **Azure Key Vault** - Secrets and encryption key management
- **Azure Network Security Groups (NSG)** - Network traffic filtering
- **Azure Policy** - Compliance and governance

**Monitoring & Logging:**
- **Azure Monitor** - Unified monitoring platform
- **Azure Application Insights** - Application performance monitoring
- **Azure Log Analytics** - Log aggregation and analysis

## Architecture

```
Internet
    │
    └─── Azure Application Gateway (WAF)
             │
             └─── Azure Kubernetes Service (AKS)
                     ├─── Frontend Pods (3-20 instances)
                     └─── Backend Pods (3-20 instances)
                             │
                             ├─── Azure Database for PostgreSQL
                             │       ├─── Primary (Zone 1)
                             │       ├─── Standby (Zone 2)
                             │       └─── Read Replica (Zone 3)
                             │
                             ├─── Azure Cache for Redis Premium
                             │       └─── Cluster with persistence
                             │
                             └─── Azure Blob Storage
                                     ├─── Uploads
                                     ├─── Backups
                                     └─── Static Assets
```

### High Availability Design

- **Multi-Zone Deployment**: Resources distributed across 3 availability zones
- **Database HA**: Zone-redundant PostgreSQL with automatic failover
- **Redis Premium**: Persistence and geo-replication capabilities
- **AKS Node Pools**: Auto-scaling from 2 to 20 nodes
- **Application Gateway**: Zone-redundant with WAF enabled

## Quick Start

### Prerequisites

1. **Azure CLI** installed and configured
   ```bash
   az login
   az account set --subscription "your-subscription-id"
   ```

2. **Terraform** >= 1.0
   ```bash
   terraform version
   ```

3. **kubectl** for Kubernetes management
   ```bash
   kubectl version
   ```

### Initial Setup

1. **Create Terraform State Storage**
   ```bash
   # Create resource group
   az group create --name citadelbuy-terraform-state-rg --location eastus

   # Create storage account
   az storage account create \
     --name citadelbuytfstate \
     --resource-group citadelbuy-terraform-state-rg \
     --location eastus \
     --sku Standard_LRS \
     --encryption-services blob

   # Create container
   az storage container create \
     --name tfstate \
     --account-name citadelbuytfstate
   ```

2. **Deploy Infrastructure**
   ```bash
   cd terraform/environments/prod

   # Initialize Terraform
   terraform init

   # Create terraform.tfvars
   cat > terraform.tfvars <<EOF
   location = "East US"
   db_admin_password = "YourSecurePassword123!"
   EOF

   # Plan deployment
   terraform plan -out=tfplan

   # Apply
   terraform apply tfplan
   ```

3. **Configure kubectl**
   ```bash
   az aks get-credentials \
     --resource-group citadelbuy-prod-rg \
     --name citadelbuy-prod-aks
   ```

## Terraform Modules

### Network Module

**Provisions:**
- Resource Group
- Virtual Network with multiple subnets
- NAT Gateway
- Network Security Groups
- Private DNS Zone
- Application Insights
- Log Analytics Workspace

**Usage:**
```hcl
module "network" {
  source = "../../modules/network"

  project_name       = "citadelbuy"
  environment        = "prod"
  location           = "East US"
  vnet_cidr          = "10.0.0.0/16"
  availability_zones = ["1", "2", "3"]
  enable_nat_gateway = true

  tags = {
    Project = "CitadelBuy"
    Environment = "production"
  }
}
```

### Database Module

**Provisions:**
- Azure Database for PostgreSQL Flexible Server
- Zone-Redundant High Availability
- Read Replica
- Performance configurations
- Monitoring and alerts

**Features:**
- PostgreSQL 16
- Zone-redundant HA (Primary in Zone 1, Standby in Zone 2)
- Read replica (Zone 3)
- Automated backups (30 days retention)
- Geo-redundant backups
- Custom performance tuning

**Usage:**
```hcl
module "database" {
  source = "../../modules/database"

  project_name        = "citadelbuy"
  environment         = "prod"
  resource_group_name = module.network.resource_group_name
  location            = "East US"

  sku_name            = "GP_Standard_D4s_v3"  # 4 vCores, 16 GB RAM
  storage_mb          = 131072                 # 128 GB
  max_connections     = 500

  high_availability_mode = "ZoneRedundant"
  create_read_replica    = true
}
```

### Storage Module

**Provisions:**
- Azure Storage Account
- Blob containers (uploads, backups, static, logs)
- Azure Cache for Redis Premium
- Azure Files share
- Private endpoints

**Features:**
- Geo-redundant storage (GRS)
- Versioning and soft delete
- Redis Premium with persistence
- RDB backups to blob storage

**Usage:**
```hcl
module "storage" {
  source = "../../modules/storage"

  project_name     = "citadelbuy"
  environment      = "prod"
  location         = "East US"
  replication_type = "GRS"

  redis_sku      = "Premium"
  redis_capacity = 2  # 2.5 GB cache
}
```

## Deployment Guide

### Production Deployment Steps

1. **Deploy Base Infrastructure**
   ```bash
   terraform apply -target=module.network
   terraform apply -target=module.database
   terraform apply -target=module.storage
   ```

2. **Deploy AKS Cluster**
   ```bash
   terraform apply -target=azurerm_kubernetes_cluster.main
   ```

3. **Push Images to ACR**
   ```bash
   # Login to ACR
   az acr login --name citadelbuy prodacr

   # Build and push
   docker build -t citadelbuyp rodacr.azurecr.io/backend:latest ./backend
   docker build -t citadelbuypr odacr.azurecr.io/frontend:latest ./frontend

   docker push citadelbuypr odacr.azurecr.io/backend:latest
   docker push citadelbuyp rodacr.azurecr.io/frontend:latest
   ```

4. **Deploy Applications to AKS**
   ```bash
   kubectl apply -f ../../kubernetes/base/
   kubectl apply -f ../../kubernetes/services/
   ```

### Environment Variables

Required environment variables for deployment:

```bash
# Azure
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"

# Database
export TF_VAR_db_admin_password="SecurePassword123!"
```

## Cost Optimization

### Estimated Monthly Costs (Production)

| Service | SKU | Quantity | Monthly Cost |
|---------|-----|----------|--------------|
| AKS (Control Plane) | Free | 1 | $0 |
| AKS Node Pool (Default) | Standard_D4s_v3 | 3-10 | $350-$1,200 |
| AKS Node Pool (Apps) | Standard_D2s_v3 | 2-20 | $200-$2,000 |
| PostgreSQL | GP_Standard_D4s_v3 | 1 + Standby | $400 |
| PostgreSQL Replica | GP_Standard_D2s_v3 | 1 | $200 |
| Redis Premium | P2 (2.5GB) | 1 | $210 |
| Storage Account | GRS | 100GB | $20 |
| Application Gateway | Standard_v2 | 1 | $200 |
| Application Insights | - | - | $50 |
| **Estimated Total** | | | **$1,630-$4,280/month** |

### Cost Saving Tips

1. **Use Reserved Instances**: 40-60% savings on VMs and databases
2. **Autoscaling**: Configure HPA to scale down during low traffic
3. **Azure Hybrid Benefit**: Use existing Windows licenses
4. **Spot Instances**: For non-critical workloads
5. **Storage Tiers**: Use Cool/Archive for backups

## Security

### Security Features

**Network Security:**
- Private endpoints for all PaaS services
- NSG rules limiting traffic to required ports
- Azure Firewall for egress filtering
- DDoS Protection Standard (optional)

**Data Protection:**
- Encryption at rest for all data stores
- TLS 1.2+ for all connections
- Key Vault for secrets management
- Customer-managed encryption keys (optional)

**Identity & Access:**
- Azure AD integration
- Managed identities for AKS
- RBAC for all resources
- Conditional access policies

**Compliance:**
- Azure Policy for governance
- Regulatory compliance dashboards
- Audit logging to Log Analytics

### Security Best Practices

1. **Enable Azure Defender**
   ```bash
   az security pricing create \
     --name VirtualMachines \
     --tier Standard
   ```

2. **Configure Network Policies**
   ```bash
   kubectl apply -f network-policies/
   ```

3. **Rotate Secrets Regularly**
   ```bash
   # Update database password
   terraform apply -var="db_admin_password=NewPassword123!"
   ```

## Monitoring

### Azure Monitor Setup

**Application Insights** is automatically configured for:
- Application performance metrics
- Request traces
- Dependency tracking
- Custom telemetry

**Log Analytics** collects:
- AKS cluster logs
- Container logs
- Database query logs
- Storage access logs

### Key Metrics to Monitor

**Application:**
- Request rate and latency (p50, p95, p99)
- Error rate
- Dependency latency

**Infrastructure:**
- AKS node CPU and memory
- Database CPU, memory, and connections
- Redis memory and hit rate
- Storage IOPS and latency

### Alerts Configuration

Alerts are pre-configured for:
- Database CPU > 80%
- Database memory > 85%
- Database connections > 80% of max
- Redis memory > 90%
- AKS node CPU > 80%

### Accessing Dashboards

```bash
# Get Application Insights connection string
terraform output application_insights_connection_string

# Open Azure Portal Monitoring
az portal monitoring
```

## Troubleshooting

### Common Issues

**AKS Connection Issues:**
```bash
# Refresh credentials
az aks get-credentials \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-prod-aks \
  --overwrite-existing
```

**Database Connection Issues:**
```bash
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-prod-postgres
```

**Storage Access Issues:**
```bash
# Verify network rules
az storage account network-rule list \
  --resource-group citadelbuy-prod-rg \
  --account-name citadelbuyprod storage
```

## Backup & Disaster Recovery

### Automated Backups

- **Database**: Automated daily backups, 30-day retention, geo-redundant
- **Redis**: RDB snapshots every 60 minutes to blob storage
- **Storage**: Soft delete enabled (30 days), versioning enabled

### Manual Backup

```bash
# Database backup
./database/scripts/backup.sh

# Export AKS configurations
kubectl get all --all-namespaces -o yaml > aks-backup.yaml
```

### Disaster Recovery Plan

1. Geo-redundant backups in paired region
2. Database geo-restore capability
3. ACR geo-replication to West US
4. Infrastructure-as-Code in Git

**RTO**: 1 hour
**RPO**: 5 minutes (database), 1 hour (Redis)

## Support & Resources

- **Azure Support**: [Azure Portal](https://portal.azure.com)
- **Documentation**: [Azure Docs](https://docs.microsoft.com/azure)
- **Pricing**: [Azure Calculator](https://azure.microsoft.com/pricing/calculator/)
- **Status**: [Azure Status](https://status.azure.com)

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.
