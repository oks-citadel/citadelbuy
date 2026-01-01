# Broxiva Azure Infrastructure Architecture

## Document Information

**Project:** Broxiva E-commerce Platform
**Environment:** Multi-Environment (Development, Staging, Production)
**Cloud Provider:** Microsoft Azure
**Infrastructure as Code:** Terraform 1.5+
**Last Updated:** December 13, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Resource Inventory](#resource-inventory)
3. [Network Architecture](#network-architecture)
4. [Compute Architecture](#compute-architecture)
5. [Database Architecture](#database-architecture)
6. [Storage Architecture](#storage-architecture)
7. [Security Architecture](#security-architecture)
8. [DNS Configuration](#dns-configuration)
9. [Multi-Region Readiness](#multi-region-readiness)
10. [Naming Conventions](#naming-conventions)
11. [Resource Dependencies](#resource-dependencies)
12. [Monitoring and Observability](#monitoring-and-observability)
13. [CI/CD Integration](#cicd-integration)
14. [Cost Optimization](#cost-optimization)

---

## Executive Summary

Broxiva is deployed on Azure using a modern microservices architecture with Infrastructure as Code (Terraform). The platform leverages Azure Kubernetes Service (AKS) for container orchestration, Azure Container Registry (ACR) for image management, and a comprehensive suite of Azure PaaS services for databases, caching, storage, and security.

### Key Highlights

- **Primary Region:** East US
- **Deployment Strategy:** Blue-Green with automatic rollback
- **Container Orchestration:** Azure Kubernetes Service (AKS)
- **CI/CD Platform:** Azure DevOps Pipelines
- **State Management:** Azure Storage with remote backend
- **Security:** Azure Key Vault, Private Endpoints, Network Security Groups
- **Monitoring:** Azure Monitor, Application Insights, Log Analytics

---

## Resource Inventory

### Production Environment Resources

#### Core Resource Groups

| Resource Group | Purpose | Location | Critical |
|---------------|---------|----------|----------|
| `broxiva-prod-rg` | Production workloads | East US | Yes |
| `broxiva-tfstate-rg` | Terraform state storage | East US | Yes |
| `broxiva-prod-rg-keyvaults-prod` | Key Vault isolation | East US | Yes |

**Note:** Based on Terraform configuration, production uses `broxiva-prod-rg` format. The expected naming `broxiva-prod-rg` from pipelines indicates a transition from Broxiva to Broxiva branding.

#### Compute Resources

| Resource Name | Type | SKU/Size | Purpose |
|---------------|------|----------|---------|
| `broxiva-prod-aks` | AKS Cluster | Kubernetes 1.28 | Container orchestration |
| `broxiva-prod-aks/system` | Node Pool | Standard_DS3_v2 | System pods (3-5 nodes) |
| `broxiva-prod-aks/user` | Node Pool | Standard_DS4_v2 | Application pods (3-20 nodes) |
| `broxiva-prod-aks/spot` | Node Pool | Standard_DS4_v2 | Cost-optimized workloads (0-10 nodes) |
| `broxivaprodacr` | Container Registry | Premium | Docker images with geo-replication |
| `broxiva-prod-api` | App Service | P2v3 | API backup/alternative (optional) |
| `broxiva-prod-web` | App Service | P2v3 | Web backup/alternative (optional) |

**ACR Naming Note:** ACR name is generated as `${replace(project_name, "-", "")}${environment}acr`, resulting in `broxivaprodacr`.

#### Database Resources

| Resource Name | Type | SKU | Configuration |
|---------------|------|-----|---------------|
| `broxiva-prod-postgres` | PostgreSQL Flexible Server | GP_Standard_D4s_v3 | v15, 128GB storage |
| `broxiva-prod-redis` | Azure Cache for Redis | Premium P1 | 2 shards, cluster mode |

**Database Configuration:**
- **PostgreSQL:** Zone-redundant HA, 35-day backup retention, geo-redundant backups
- **Redis:** Premium tier for VNet integration, AOF persistence, patch schedule on Sundays

#### Storage Resources

| Resource Name | Type | Replication | Purpose |
|---------------|------|-------------|---------|
| `broxivaprodstorage` | Storage Account | GRS | Media, backups, logs |
| `broxivatfstate` | Storage Account | LRS | Terraform state (tfstate-rg) |

**Storage Containers:**
- `media` - Product images, user uploads
- `uploads` - Temporary upload staging
- `backups` - Database and application backups
- `logs` - Application logs archive
- `static` - CDN-served static assets (public read)
- `exports` - Report and data exports
- `tfstate` - Terraform state files

#### Network Resources

| Resource Name | Type | CIDR/Config | Purpose |
|---------------|------|-------------|---------|
| `broxiva-prod-vnet` | Virtual Network | 10.0.0.0/16 | Main VNet |
| `broxiva-prod-public-1/2/3` | Subnet | 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24 | Public subnets (3 AZs) |
| `broxiva-prod-private-1/2/3` | Subnet | 10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24 | App subnets (3 AZs) |
| `broxiva-prod-database-1/2/3` | Subnet | 10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24 | Database subnets (3 AZs) |
| `broxiva-prod-aks` | Subnet | 10.0.16.0/20 | AKS cluster (4096 IPs) |
| `broxiva-prod-aci` | Subnet | 10.0.30.0/24 | Azure Container Instances |
| `broxiva-prod-nat` | NAT Gateway | - | Outbound internet for private subnets |
| `broxiva-prod-alb-nsg` | NSG | - | Public subnet protection |
| `broxiva-prod-app-nsg` | NSG | - | Application subnet protection |
| `broxiva-prod-db-nsg` | NSG | - | Database subnet protection |
| `broxiva-prod-redis-nsg` | NSG | - | Redis subnet protection |

#### Security Resources

| Resource Name | Type | Purpose |
|---------------|------|---------|
| `cb-prod-shared-kv` | Key Vault | Shared secrets (cross-app) |
| `cb-prod-api-kv` | Key Vault | API-specific secrets |
| `cb-prod-web-kv` | Key Vault | Web-specific secrets |
| `cb-prod-mobile-kv` | Key Vault | Mobile-specific secrets |
| `cb-prod-services-kv` | Key Vault | Microservices secrets |

**Key Vault Naming:** Format is `cb-{env}-{app}-kv` (max 24 chars).

#### DNS Resources

| Resource Name | Type | Domain | Purpose |
|---------------|------|--------|---------|
| `broxiva.com` | DNS Zone | broxiva.com | Primary domain zone |

**DNS Records:**
- `@` - Root domain A record (Front Door)
- `www` - CNAME to Front Door or root
- `api` - CNAME to API App Service
- `cdn` - CNAME to CDN endpoint
- `staging` - CNAME to staging environment
- `staging-api` - CNAME to staging API
- MX records for email (Google Workspace)
- SPF, DKIM, DMARC for email security
- CAA records (Let's Encrypt, DigiCert)

#### Monitoring Resources

| Resource Name | Type | Retention | Purpose |
|---------------|------|-----------|---------|
| `broxiva-prod-logs` | Log Analytics Workspace | 90 days | Centralized logging |
| `broxiva-prod-appinsights` | Application Insights | 90 days | APM and telemetry |
| `broxiva-prod-kv-logs` | Log Analytics Workspace | 365 days | Key Vault audit logs |

---

## Network Architecture

### Network Topology Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Internet / Azure Front Door                     │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
┌───────────────────▼─────────────────┐   ┌────────────▼────────────────┐
│   Public Subnets (3 AZs)            │   │   Azure CDN / Front Door    │
│   10.0.0.0/24, 10.0.1.0/24,        │   │   Global Edge Network       │
│   10.0.2.0/24                       │   └─────────────────────────────┘
│   - Load Balancers                  │
│   - Public IPs                      │
└─────────────────┬───────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼────────────────┐    ┌────▼──────────────────────┐
│  AKS Subnet        │    │  Private Subnets (3 AZs)  │
│  10.0.16.0/20      │    │  10.0.10.0/24,            │
│  (4096 IPs)        │    │  10.0.11.0/24,            │
│                    │    │  10.0.12.0/24             │
│  - System Nodes    │    │  - App Services           │
│  - User Nodes      │    │  - Private Endpoints      │
│  - Spot Nodes      │    └───────────┬───────────────┘
└──────┬─────────────┘                │
       │              ┌───────────────┴─────────────┐
       │              │                             │
       │    ┌─────────▼──────────┐    ┌───────────▼─────────┐
       │    │ Database Subnets   │    │  NAT Gateway        │
       │    │ (3 AZs)            │    │  (Outbound Only)    │
       │    │ 10.0.20.0/24,      │    │  - Public IP        │
       │    │ 10.0.21.0/24,      │    │  - HA across AZs    │
       │    │ 10.0.22.0/24       │    └─────────────────────┘
       │    │                    │
       │    │ - PostgreSQL       │
       │    │ - Redis Premium    │
       │    └────────────────────┘
       │
       │    ┌─────────────────────────────────────┐
       └────│  ACI Subnet                         │
            │  10.0.30.0/24                       │
            │  - Container Instances              │
            │  - Serverless containers            │
            └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        Private DNS Zones                                 │
│  - broxiva-prod.postgres.database.azure.com                             │
│  - privatelink.vaultcore.azure.net                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Network Configuration Details

#### VNet Design
- **Address Space:** 10.0.0.0/16 (65,536 IPs)
- **Availability Zones:** 3 (Zone 1, 2, 3)
- **Subnet Strategy:** Zone-redundant with dedicated subnets per tier

#### Service Endpoints
All private subnets have service endpoints for:
- `Microsoft.Storage` - Direct access to Storage Accounts
- `Microsoft.Sql` - Direct access to PostgreSQL
- `Microsoft.KeyVault` - Direct access to Key Vault

#### Network Security

**NSG Rules Summary:**

| NSG | Inbound Rules | Outbound Rules |
|-----|--------------|----------------|
| ALB NSG | HTTP (80), HTTPS (443) from Internet | Default allow |
| App NSG | Frontend (3000), Backend (4000) from VNet | Default allow |
| Database NSG | PostgreSQL (5432) from VNet only | Default allow |
| Redis NSG | Redis (6379-6380) from VNet only | Default allow |

#### AKS Network Configuration
- **Network Plugin:** Azure CNI
- **Network Policy:** Calico
- **Service CIDR:** 10.100.0.0/16
- **DNS Service IP:** 10.100.0.10
- **Load Balancer:** Standard SKU
- **Outbound Type:** Load Balancer

---

## Compute Architecture

### Azure Kubernetes Service (AKS)

#### Cluster Configuration
```yaml
Name: broxiva-prod-aks
Version: 1.28
DNS Prefix: broxiva-prod
Location: eastus
Identity: SystemAssigned (Managed Identity)
```

#### Node Pools

**System Node Pool:**
- **Name:** system
- **VM Size:** Standard_DS3_v2 (4 vCPU, 14 GB RAM)
- **Auto-scaling:** Enabled (min: 3, max: 5)
- **Initial Count:** 3
- **OS Disk:** 128 GB Managed SSD
- **Zones:** 1, 2, 3 (zone-redundant)
- **Purpose:** Kubernetes system components only
- **Taints:** Critical addons only

**User Node Pool:**
- **Name:** user
- **VM Size:** Standard_DS4_v2 (8 vCPU, 28 GB RAM)
- **Auto-scaling:** Enabled (min: 3, max: 20)
- **OS Disk:** 128 GB Managed SSD
- **Zones:** 1, 2, 3 (zone-redundant)
- **Purpose:** Application workloads
- **Labels:** nodepool-type=user, workload=application

**Spot Node Pool (Cost Optimization):**
- **Name:** spot
- **VM Size:** Standard_DS4_v2 (8 vCPU, 28 GB RAM)
- **Auto-scaling:** Enabled (min: 0, max: 10)
- **Priority:** Spot instances
- **Eviction Policy:** Delete
- **Zones:** 1, 2, 3
- **Purpose:** Batch jobs, non-critical workloads
- **Taints:** `kubernetes.azure.com/scalesetpriority=spot:NoSchedule`

#### AKS Features

**Security:**
- Azure AD integration (RBAC enabled)
- Managed identity for Azure resources
- Azure Policy integration
- Secret Store CSI driver for Key Vault
- Secret rotation every 2 minutes

**Monitoring:**
- Azure Monitor Container Insights
- Log Analytics integration
- Microsoft Defender for Containers

**Maintenance:**
- Automatic channel upgrade: patch
- Maintenance window: Sundays, 3-6 AM UTC
- Max surge during upgrades: 33%

### Azure Container Registry (ACR)

```yaml
Name: broxivaprodacr
SKU: Premium
Admin Enabled: false (use managed identities)
```

**Features:**
- Geo-replication to West US 2 and West Europe
- Zone redundancy in all regions
- Network access: Deny by default
- Allowed: AKS subnet, private subnets, CI/CD IPs
- Trust policies enabled
- Image retention: 30 days
- Security scanning integrated

**AKS Integration:**
- Role Assignment: AcrPull for AKS kubelet identity
- Automatic image pull authentication

### App Service (Backup/Alternative Deployment)

**API App Service:**
- **Name:** broxiva-prod-api
- **SKU:** P2v3 (Premium V3)
- **Container:** broxivaprodacr.azurecr.io/api:latest
- **Slots:** Staging slot for blue-green deployment
- **Network:** VNet integrated, Front Door access only
- **Monitoring:** Application Insights

**Web App Service:**
- **Name:** broxiva-prod-web
- **SKU:** P2v3 (Premium V3)
- **Container:** broxivaprodacr.azurecr.io/web:latest
- **CDN:** Azure CDN for static assets

---

## Database Architecture

### PostgreSQL Flexible Server

```yaml
Name: broxiva-prod-postgres
Version: 15
SKU: GP_Standard_D4s_v3 (General Purpose, 4 vCPU, 16 GB RAM)
Storage: 128 GB
Location: eastus
```

**High Availability:**
- Mode: ZoneRedundant
- Standby Zone: Zone 2
- Automatic failover: Yes

**Backup Configuration:**
- Retention: 35 days
- Geo-redundant: Enabled (West US 2)
- Point-in-time restore: Last 35 days

**Network:**
- Private access via delegated subnet
- Private DNS: broxiva-prod.postgres.database.azure.com
- No public access

**Database Configuration:**
- Extensions: PGCRYPTO, UUID-OSSP, HSTORE, PG_TRGM
- Max connections: Configured per environment
- Work memory: Optimized per workload
- Slow query log: > 1 second

**Databases:**
1. `broxiva_prod` - Primary production database
2. Connection pooling via PgBouncer in Kubernetes

### Redis Cache

```yaml
Name: broxiva-prod-redis
SKU: Premium P1
Family: P
Capacity: 1 (6 GB memory)
Location: eastus
```

**Cluster Configuration:**
- Shard count: 2
- Clustering enabled
- Non-SSL port: Disabled
- TLS version: 1.2+

**Network:**
- VNet injection into private subnet
- No public access
- Service endpoints from AKS

**Persistence:**
- AOF (Append-Only File) enabled
- Backup to Azure Storage
- Maxmemory policy: volatile-lru
- Keyspace notifications: KEA

**Maintenance:**
- Patch schedule: Sundays, 4 AM UTC
- Maxmemory reserved: Configured for stability

---

## Storage Architecture

### Storage Account

```yaml
Name: broxivaprodstorage
Type: StorageV2
Tier: Standard
Replication: GRS (Geo-Redundant Storage)
Access Tier: Hot
Location: eastus (replicated to West US 2)
```

**Security:**
- HTTPS only: Enforced
- Minimum TLS: 1.2
- Public blob access: Disabled
- Shared access key: Enabled (with rotation)
- Managed identity: SystemAssigned

**Network:**
- Default action: Deny
- Bypass: Azure Services
- Allowed: VNet subnets, CI/CD IPs

**Features:**
- Blob versioning: Enabled
- Soft delete: 90 days
- Container soft delete: 90 days
- Lifecycle management: Automated tiering
- CORS: Enabled for web origins

### Blob Containers

| Container | Access Level | Purpose | Lifecycle |
|-----------|-------------|---------|-----------|
| media | Private | Product images, user uploads | Hot → Cool (30d) → Archive (90d) |
| uploads | Private | Temporary file staging | Delete after 7 days |
| backups | Private | Database/app backups | Cool (30d) → Archive (90d) → Delete (365d) |
| logs | Private | Application log archives | Delete after 90 days |
| static | Blob (public read) | CDN static assets | Hot tier, no expiration |
| exports | Private | Generated reports | Delete after 30 days |

### CDN Configuration

**CDN Profile:**
- SKU: Premium_AzureFrontDoor
- Custom domain: cdn.broxiva.com
- Origin: broxivaprodstorage blob endpoint

**Caching Rules:**
- Static assets: 1 year cache
- Images: Query string caching enabled
- HTTPS: Enforced
- Compression: Gzip, Brotli

---

## Security Architecture

### Azure Key Vault Strategy

**Vault Segmentation:**

| Vault Name | Purpose | Secrets Stored |
|------------|---------|----------------|
| cb-prod-shared-kv | Cross-app secrets | PostgreSQL, Redis, shared credentials |
| cb-prod-api-kv | API-specific | JWT secrets, Stripe, SendGrid, OpenAI, KYC encryption |
| cb-prod-web-kv | Web-specific | Internal API key, Sentry DSN, analytics |
| cb-prod-mobile-kv | Mobile-specific | Apple IAP, Google Play, Firebase/FCM |
| cb-prod-services-kv | Microservices | Service-to-service credentials |

**Security Features:**
- RBAC enabled (no access policies)
- Soft delete: 90 days (production)
- Purge protection: Enabled (production)
- Network: Deny by default, allow VNet + private endpoints
- Audit logging: All operations logged to Log Analytics (365 days retention)
- Secret rotation tracking: Tags with RotationDue timestamp

**Critical Secrets (Prevent Destroy):**
- `kyc-encryption-key` - Data loss if rotated (has lifecycle prevent_destroy)

### Identity and Access Management

**Managed Identities:**
- AKS cluster: SystemAssigned
- ACR pull: AKS kubelet identity → AcrPull role
- App Services: SystemAssigned → AcrPull, Key Vault Secrets User
- Storage: SystemAssigned for inter-service auth

**RBAC Roles:**
- Key Vault Secrets Officer: Terraform service principal
- Key Vault Secrets User: Application identities (read-only)
- AcrPull: AKS, App Services

### Network Security

**Defense in Depth:**
1. **Perimeter:** Azure Front Door with WAF
2. **Network:** NSGs on all subnets
3. **Application:** Private endpoints for PaaS services
4. **Data:** Encryption at rest and in transit

**Private Endpoints:**
- PostgreSQL: Private endpoint in database subnet
- Key Vault: Private endpoint in private subnet
- Storage Account: Private endpoint for blob, file

**Encryption:**
- At rest: Azure-managed keys (option for customer-managed keys)
- In transit: TLS 1.2+ enforced everywhere
- Database: Transparent Data Encryption (TDE)
- Storage: 256-bit AES encryption

---

## DNS Configuration

### Azure DNS Zone: broxiva.com

**Nameservers (Azure-provided):**
```
ns1-08.azure-dns.com
ns2-08.azure-dns.net
ns3-08.azure-dns.org
ns4-08.azure-dns.info
```

**Action Required:** Update nameservers at domain registrar (GoDaddy) to point to Azure DNS.

### DNS Records

**A Records:**
| Name | Type | Value | TTL |
|------|------|-------|-----|
| @ | A | [Front Door IP] | 300 |

**CNAME Records:**
| Name | Type | Target | TTL |
|------|------|--------|-----|
| www | CNAME | [Front Door hostname] | 300 |
| api | CNAME | broxiva-prod-api.azurewebsites.net | 300 |
| cdn | CNAME | broxivaprodcdn.azureedge.net | 300 |
| staging | CNAME | broxiva-staging-web.azurewebsites.net | 300 |
| staging-api | CNAME | broxiva-staging-api.azurewebsites.net | 300 |

**TXT Records:**
| Name | Type | Value | Purpose |
|------|------|-------|---------|
| @ | TXT | [Azure verification code] | Domain verification |
| @ | TXT | v=spf1 include:_spf.google.com include:sendgrid.net ~all | Email SPF |
| google._domainkey | TXT | [DKIM key] | Email authentication |
| _dmarc | TXT | v=DMARC1; p=quarantine; rua=mailto:dmarc@broxiva.com | DMARC policy |

**MX Records:**
| Priority | Exchange | Purpose |
|----------|----------|---------|
| 1 | aspmx.l.google.com | Google Workspace primary |
| 5 | alt1.aspmx.l.google.com | Backup MX |
| 5 | alt2.aspmx.l.google.com | Backup MX |

**CAA Records:**
```
0 issue "letsencrypt.org"
0 issue "digicert.com"
0 issuewild "letsencrypt.org"
0 iodef "mailto:security@broxiva.com"
```

---

## Multi-Region Readiness

### Current State: Single Region (East US)

**Region:** East US (primary)
**Geo-replication:** Passive (ACR, Storage)

### Multi-Region Capabilities Built-In

#### 1. Container Registry
- **Current:** Premium SKU with geo-replication
- **Replicated to:** West US 2, West Europe
- **Zone redundancy:** Enabled in all regions
- **Benefit:** Faster image pulls globally, disaster recovery

#### 2. Storage Account
- **Current:** GRS (Geo-Redundant Storage)
- **Replicated to:** West US 2 (paired region)
- **Failover:** Microsoft-managed, read-access in secondary

#### 3. Database
- **Current:** Geo-redundant backups to West US 2
- **RPO:** 1 hour (from backup)
- **RTO:** Manual restore (1-2 hours)
- **Future:** Read replicas in other regions

### Regional Expansion Architecture

**Terraform Environments for Regions:**
```
infrastructure/terraform/environments/
├── prod/        # East US (current)
├── staging/     # East US (current)
├── dev/         # East US (current)
├── africa/      # Future: South Africa North
└── asia/        # Future: Southeast Asia
```

**Multi-Region Strategy:**

```
                  ┌─────────────────────────────────┐
                  │   Azure Traffic Manager         │
                  │   DNS-based global routing      │
                  └──────────┬──────────┬───────────┘
                             │          │
                    ┌────────┴───┐  ┌───┴──────────┐
                    │ East US    │  │ West Europe  │
                    │ (Primary)  │  │ (Secondary)  │
                    │            │  │              │
                    │ - AKS      │  │ - AKS        │
                    │ - DB       │  │ - DB Replica │
                    │ - Storage  │  │ - Storage    │
                    └────────────┘  └──────────────┘
```

**Per-Region Resources:**
- AKS cluster (independent)
- PostgreSQL with read replicas
- Redis cache
- Storage account (with cross-region replication)
- Shared ACR (globally replicated)

**Global Resources:**
- Azure Front Door (global CDN and WAF)
- Traffic Manager (DNS routing)
- Shared Container Registry

### Data Residency Compliance

**Africa Deployment (Planned):**
- Region: South Africa North
- Data residency: All user data stays in Africa
- Compliance: POPIA (South Africa), GDPR-aligned
- Configuration: Dedicated Terraform environment

**Asia Deployment (Planned):**
- Region: Southeast Asia (Singapore)
- Data residency: Asia-Pacific data localization
- Compliance: PDPA (Singapore), GDPR-aligned

---

## Naming Conventions

### Resource Naming Standards

**Format:** `{project}-{environment}-{resource-type}-{suffix}`

#### Project Names
- **Current Brand:** Broxiva (infrastructure uses this)
- **Legacy Brand:** Broxiva (pipelines still reference this)
- **Transition:** In progress (Terraform uses Broxiva, CI/CD uses Broxiva)

#### Environment Codes
- `prod` - Production
- `staging` - Staging/Pre-production
- `dev` - Development

#### Resource Type Abbreviations

| Resource | Abbreviation | Example |
|----------|-------------|---------|
| Resource Group | rg | broxiva-prod-rg |
| AKS Cluster | aks | broxiva-prod-aks |
| Container Registry | acr | broxivaprodacr (no hyphens) |
| PostgreSQL | postgres | broxiva-prod-postgres |
| Redis Cache | redis | broxiva-prod-redis |
| Storage Account | storage | broxivaprodstorage (no hyphens) |
| Virtual Network | vnet | broxiva-prod-vnet |
| Subnet | (descriptive) | broxiva-prod-aks, broxiva-prod-database-1 |
| NSG | nsg | broxiva-prod-app-nsg |
| Key Vault | kv | cb-prod-api-kv |
| NAT Gateway | nat | broxiva-prod-nat |
| Public IP | pip | broxiva-prod-nat-pip |
| Log Analytics | logs | broxiva-prod-logs |
| App Insights | appinsights | broxiva-prod-appinsights |

#### Special Naming Rules

**Storage Accounts and ACR:**
- No hyphens allowed
- Lowercase only
- Max 24 characters
- Format: `{project}{env}{type}`
- Example: `broxivaprodstorage`, `broxivaprodacr`

**Key Vaults:**
- Max 24 characters
- Abbreviated format: `cb-{env}-{app}-kv`
- Example: `cb-prod-api-kv`, `cb-prod-shared-kv`

**Node Pools:**
- Lowercase, no hyphens in name
- Example: `system`, `user`, `spot`

#### Consistency Analysis

**Inconsistencies Identified:**

1. **Project Name Mismatch:**
   - Terraform: Uses "broxiva"
   - Azure DevOps Pipelines: Uses "broxiva"
   - **Impact:** Variable groups, service connections reference broxiva
   - **Recommendation:** Complete migration to Broxiva or maintain both with aliases

2. **Resource Group Naming:**
   - Expected (from pipelines): `broxiva-prod-rg`
   - Actual (from Terraform): `broxiva-prod-rg`
   - **Resolution:** Update pipeline variables to match Terraform or vice versa

3. **ACR Naming:**
   - Expected (from pipelines): `broxivaacr.azurecr.io`
   - Actual (from Terraform): `broxivaprodacr.azurecr.io`
   - **Resolution:** Update pipeline ACR variables

### Recommended Naming Updates

**Option 1: Full Migration to Broxiva**
```yaml
# Update in .azuredevops/pipelines/variables/common.yml
AZURE_CONTAINER_REGISTRY: 'broxivaprodacr.azurecr.io'

# Update in .azuredevops/pipelines/variables/prod.yml
AKS_RESOURCE_GROUP: 'broxiva-prod-rg'
AKS_CLUSTER_NAME: 'broxiva-prod-aks'
K8S_NAMESPACE: 'broxiva-prod'
```

**Option 2: Maintain Broxiva (revert Terraform)**
```hcl
# Update in infrastructure/terraform/environments/prod/main.tf
locals {
  project_name = "broxiva"
}
```

**Recommendation:** Option 1 (Full Broxiva migration) for brand consistency.

---

## Resource Dependencies

### Dependency Graph

```
Terraform State Storage (broxiva-tfstate-rg)
  └─ broxivatfstate storage account
       └─ tfstate container
            └─ [All Terraform state files]

Resource Group (broxiva-prod-rg)
  │
  ├─ Virtual Network (broxiva-prod-vnet)
  │    ├─ Public Subnets (1-3)
  │    ├─ Private Subnets (1-3)
  │    ├─ Database Subnets (1-3)
  │    ├─ AKS Subnet
  │    ├─ ACI Subnet
  │    └─ NAT Gateway
  │         └─ Public IP
  │
  ├─ Network Security Groups
  │    ├─ ALB NSG → Public Subnets
  │    ├─ App NSG → Private Subnets
  │    ├─ Database NSG → Database Subnets
  │    └─ Redis NSG → Private Subnets
  │
  ├─ Private DNS Zones
  │    ├─ PostgreSQL Zone → VNet Link
  │    └─ Key Vault Zone → VNet Link
  │
  ├─ Log Analytics Workspace (broxiva-prod-logs)
  │    └─ Application Insights
  │
  ├─ PostgreSQL Flexible Server
  │    ├─ Depends on: Database Subnet, Private DNS Zone
  │    ├─ Databases: broxiva_prod
  │    └─ Diagnostic Settings → Log Analytics
  │
  ├─ Redis Cache
  │    ├─ Depends on: Private Subnet (Premium tier)
  │    └─ Diagnostic Settings → Log Analytics
  │
  ├─ Storage Account
  │    ├─ Containers: media, uploads, backups, logs, static, exports
  │    ├─ Lifecycle policies
  │    └─ Network rules → VNet subnets
  │
  ├─ Container Registry (ACR)
  │    ├─ Geo-replications: West US 2, West Europe
  │    └─ Network rules → AKS subnet, Private subnets
  │
  ├─ AKS Cluster
  │    ├─ Depends on: AKS Subnet, Log Analytics
  │    ├─ Node Pools: system, user, spot
  │    ├─ RBAC: Azure AD integration
  │    ├─ Monitoring: Azure Monitor, Defender
  │    ├─ Key Vault CSI Driver
  │    └─ Role Assignment: AcrPull → ACR
  │
  ├─ App Services (optional)
  │    ├─ App Service Plan (P2v3)
  │    ├─ API App + Staging Slot
  │    ├─ Web App
  │    ├─ VNet Integration → Private Subnets
  │    ├─ Container images from ACR
  │    └─ Role Assignments: AcrPull
  │
  └─ DNS Zone (broxiva.com)
       ├─ A records → Front Door
       ├─ CNAME records → App Services, CDN
       └─ TXT records → Verification, SPF, DKIM

Key Vault Resource Group (broxiva-prod-rg-keyvaults-prod)
  │
  ├─ Log Analytics Workspace (broxiva-prod-kv-logs)
  │
  ├─ Shared Key Vault (cb-prod-shared-kv)
  │    ├─ Secrets: postgres-url, redis-url
  │    ├─ RBAC: Terraform = Secrets Officer, Apps = Secrets User
  │    └─ Diagnostics → Log Analytics (365 days)
  │
  ├─ API Key Vault (cb-prod-api-kv)
  │    ├─ Secrets: jwt-*, stripe-*, sendgrid-*, kyc-encryption-key
  │    └─ RBAC: API identity only
  │
  ├─ Web Key Vault (cb-prod-web-kv)
  │    └─ Secrets: internal-api-key, sentry-dsn
  │
  ├─ Mobile Key Vault (cb-prod-mobile-kv)
  │    └─ Secrets: apple-*, google-play-*, firebase-*
  │
  └─ Services Key Vault (cb-prod-services-kv)
       └─ Secrets: service-to-service credentials
```

### Critical Path Dependencies

**Infrastructure Provisioning Order:**
1. Resource Groups
2. Virtual Network + Subnets
3. Private DNS Zones
4. NAT Gateway (for private subnets)
5. Log Analytics Workspaces
6. PostgreSQL Flexible Server
7. Redis Cache
8. Storage Account
9. Container Registry
10. AKS Cluster
11. Key Vaults
12. App Services (if used)
13. DNS Zone and records

**Application Deployment Dependencies:**
1. ACR has images pushed
2. AKS cluster is running
3. Key Vault secrets are populated
4. Database migrations applied
5. Kubernetes manifests deployed
6. DNS records updated
7. Health checks pass

---

## Monitoring and Observability

### Azure Monitor Integration

**Log Analytics Workspaces:**

| Workspace | Purpose | Retention | Data Sources |
|-----------|---------|-----------|--------------|
| broxiva-prod-logs | Application and infrastructure logs | 90 days | AKS, App Services, NSGs, PostgreSQL, Redis |
| broxiva-prod-kv-logs | Key Vault audit trail | 365 days | All Key Vault operations |

**Application Insights:**
- Connection to: broxiva-prod-appinsights
- Instrumentation: All App Services, AKS workloads
- Features: APM, distributed tracing, dependency mapping
- Sampling: Adaptive (100% during low volume)

### Diagnostic Settings

**Resources with Diagnostics Enabled:**
- AKS Cluster → broxiva-prod-logs
- PostgreSQL → broxiva-prod-logs
- Redis Cache → broxiva-prod-logs
- Storage Account → broxiva-prod-logs
- NSGs → broxiva-prod-logs (flow logs)
- All Key Vaults → broxiva-prod-kv-logs

### Prometheus and Grafana (Kubernetes)

**Prometheus:**
- Deployed: In AKS cluster
- Namespace: monitoring
- Configuration: infrastructure/kubernetes/monitoring/prometheus-deployment.yaml
- Alerts: infrastructure/docker/monitoring/prometheus/alerts/broxiva-alerts.yml

**Grafana:**
- Deployed: In AKS cluster
- Dashboards: Pre-configured for Broxiva services
- Data sources: Prometheus, Azure Monitor

### Alert Rules

**Critical Alerts:**
- AKS node health
- PostgreSQL availability
- Redis availability
- Storage account throttling
- Key Vault access failures
- Container registry push/pull failures

**Performance Alerts:**
- API response time > 1500ms (prod)
- Failed requests > 5%
- Database CPU > 80%
- Redis memory > 90%

**Security Alerts:**
- Key Vault unauthorized access attempts
- NSG rule changes
- Unusual database query patterns
- Failed authentication spikes

---

## CI/CD Integration

### Azure DevOps Organization

**Organization:** broxivacloudmanagement
**Project:** Broxiva
**Pipeline:** .azuredevops/pipelines/main.yml

### Service Connections

| Connection Name | Type | Purpose | Resources Accessed |
|----------------|------|---------|---------------------|
| BroxivaAzure | Azure Resource Manager | AKS, Resource Groups, Terraform | Subscription-wide access |
| BroxivaACR | Container Registry | Docker image push/pull | broxivaacr.azurecr.io |

**Note:** Update to match Broxiva resource names.

### Pipeline Environments

| Environment | AKS Cluster | Namespace | Approval |
|------------|-------------|-----------|----------|
| dev | broxiva-dev-aks | broxiva-dev | None |
| staging | broxiva-staging-aks | broxiva-staging | Optional |
| production | broxiva-prod-aks | broxiva-prod | Required |

**Update Required:** Cluster names should be `broxiva-{env}-aks` to match Terraform.

### Terraform Backend

**Configuration:**
```hcl
backend "azurerm" {
  resource_group_name  = "broxiva-tfstate-rg"
  storage_account_name = "broxivatfstate"
  container_name       = "tfstate"
  key                  = "prod.terraform.tfstate"
}
```

**State Files:**
- `prod.terraform.tfstate` - Production
- `staging.terraform.tfstate` - Staging
- `dev.terraform.tfstate` - Development

### Deployment Strategy

**Production Deployment:**
- Strategy: Blue-Green
- Approval: Manual (24-hour timeout)
- Health checks: API, Web, Database
- Rollback: Automatic on failure
- Traffic switch: Gradual (0% → 10% → 50% → 100%)

**Staging Deployment:**
- Strategy: Rolling update
- E2E tests: Playwright on Chromium
- Approval: None (auto-deploy from develop)

---

## Cost Optimization

### Monthly Cost Estimate (Production)

| Resource Category | Estimated Monthly Cost (USD) |
|------------------|------------------------------|
| AKS Cluster (3-20 nodes) | $800 - $3,200 |
| Spot Instances (0-10 nodes) | $200 - $600 (70% savings) |
| PostgreSQL (GP_D4s_v3, HA) | $550 |
| Redis Cache (Premium P1) | $280 |
| Storage (GRS, 1TB) | $50 |
| ACR (Premium, geo-replicated) | $160 |
| Key Vault (5 vaults) | $5 |
| Log Analytics (90-day retention) | $150 |
| Bandwidth | $100 |
| **Total (estimated)** | **$2,295 - $5,095/month** |

### Cost Optimization Strategies

**Currently Implemented:**
1. **Spot Instances:** Up to 10 spot nodes for batch jobs (70% cost reduction)
2. **Auto-scaling:** AKS nodes scale down to minimum during low traffic
3. **Lifecycle Policies:** Automatic tiering of backups to Archive storage
4. **Reserved Instances:** Consider 1-year or 3-year reservations (up to 72% savings)

**Recommended Optimizations:**
1. **Azure Hybrid Benefit:** If Windows nodes added, use existing licenses
2. **Storage Optimization:** Move older backups to Archive tier (365+ days)
3. **Log Retention:** Reduce to 30 days for non-production environments
4. **Right-sizing:** Monitor node utilization, downsize if < 50% CPU/memory
5. **Regional Egress:** Use CDN to reduce data transfer costs

### Resource Tagging for Cost Allocation

**Tags Applied:**
```yaml
Project: Broxiva
Environment: Production
ManagedBy: Terraform
CostCenter: Engineering
Owner: Platform Team
```

**Cost Tracking:**
- By environment: dev, staging, prod
- By service: compute, database, storage, networking
- By project: Broxiva

---

## Validation Checklist

### Infrastructure Verification Commands

**Note:** Due to bash permission restrictions, manual verification is required.

#### 1. Verify Resource Groups
```bash
az group show --name broxiva-prod-rg
az group show --name broxiva-tfstate-rg
```

#### 2. Verify AKS Cluster
```bash
az aks show --name broxiva-prod-aks --resource-group broxiva-prod-rg
az aks get-credentials --name broxiva-prod-aks --resource-group broxiva-prod-rg
kubectl get nodes
kubectl get namespaces
```

#### 3. Verify Container Registry
```bash
az acr show --name broxivaprodacr
az acr repository list --name broxivaprodacr
```

#### 4. Verify DNS Zone
```bash
az network dns zone show --name broxiva.com --resource-group broxiva-prod-rg
az network dns record-set list --zone-name broxiva.com --resource-group broxiva-prod-rg
```

#### 5. Verify Database
```bash
az postgres flexible-server show --name broxiva-prod-postgres --resource-group broxiva-prod-rg
az postgres flexible-server db list --server-name broxiva-prod-postgres --resource-group broxiva-prod-rg
```

#### 6. Verify Storage Accounts
```bash
az storage account show --name broxivaprodstorage --resource-group broxiva-prod-rg
az storage account show --name broxivatfstate --resource-group broxiva-tfstate-rg
az storage container list --account-name broxivaprodstorage
```

#### 7. Verify Key Vaults
```bash
az keyvault list --resource-group broxiva-prod-rg-keyvaults-prod
az keyvault show --name cb-prod-shared-kv
```

#### 8. Verify Network
```bash
az network vnet show --name broxiva-prod-vnet --resource-group broxiva-prod-rg
az network vnet subnet list --vnet-name broxiva-prod-vnet --resource-group broxiva-prod-rg
```

### Health Check Endpoints

**Production:**
- API: https://api.broxiva.com/health
- Web: https://broxiva.com
- Admin: https://admin.broxiva.com

**Staging:**
- API: https://staging-api.broxiva.com/health
- Web: https://staging.broxiva.com

---

## Next Steps and Recommendations

### Immediate Actions Required

1. **Name Consistency Resolution:**
   - [ ] Decide on Broxiva vs Broxiva naming
   - [ ] Update Azure DevOps pipeline variables
   - [ ] Update service connection names
   - [ ] Verify ACR connection in pipelines

2. **Resource Verification:**
   - [ ] Run validation commands manually
   - [ ] Confirm all resources exist in Azure portal
   - [ ] Verify AKS cluster is accessible
   - [ ] Test ACR image push/pull

3. **DNS Configuration:**
   - [ ] Update nameservers at GoDaddy to Azure DNS
   - [ ] Verify DNS propagation (24-48 hours)
   - [ ] Test domain resolution

4. **Pipeline Testing:**
   - [ ] Run pipeline in dev environment
   - [ ] Verify Docker image build and push
   - [ ] Test AKS deployment
   - [ ] Validate health checks

### Future Enhancements

1. **Multi-Region Expansion:**
   - Activate Africa and Asia environments
   - Set up Traffic Manager
   - Configure read replicas

2. **Security Hardening:**
   - Implement customer-managed encryption keys
   - Enable Azure Policy for compliance
   - Set up Azure Sentinel for threat detection

3. **Disaster Recovery:**
   - Document DR procedures
   - Test failover scenarios
   - Automate backup verification

4. **Cost Optimization:**
   - Purchase reserved instances
   - Implement Azure Advisor recommendations
   - Set up budget alerts

---

## Document Maintenance

**Maintained By:** Platform Engineering Team
**Review Frequency:** Quarterly or after major infrastructure changes
**Last Reviewed:** December 13, 2025
**Next Review:** March 13, 2026

### Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-13 | 1.0 | Initial architecture documentation | Azure Infrastructure Agent |

---

## Support and Contacts

**Infrastructure Team:** devops@broxiva.com
**Emergency Hotline:** [To be configured]
**Azure Support:** Premier Support Plan
**Terraform State:** broxivatfstate storage account (broxiva-tfstate-rg)

---

**END OF DOCUMENT**
