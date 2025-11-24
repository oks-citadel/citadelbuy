# CitadelBuy Infrastructure

Complete infrastructure-as-code setup for the CitadelBuy e-commerce platform, supporting multiple deployment strategies and environments.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Deployment Options](#deployment-options)
- [Quick Start](#quick-start)
- [Environments](#environments)
- [Security](#security)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)

## Overview

This infrastructure setup provides:

- **Multi-environment support**: Development, Staging, and Production
- **Container orchestration**: Docker Compose and Kubernetes (AKS)
- **Configuration management**: Ansible playbooks and roles
- **Infrastructure provisioning**: Terraform modules for Microsoft Azure
- **Monitoring**: Prometheus, Grafana, and Azure Monitor stack
- **Database management**: PostgreSQL with automated backup/restore scripts
- **Caching**: Redis with persistence and high availability
- **Load balancing**: Nginx reverse proxy and Azure Application Gateway
- **Security**: Azure Key Vault, NSGs, private endpoints, encryption

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx/ALB)               │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼───────┐               ┌───────▼───────┐
│   Frontend    │               │    Backend    │
│  (Next.js)    │               │   (NestJS)    │
│   Port 3000   │               │   Port 4000   │
└───────────────┘               └───────┬───────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                ┌───────▼───────┐               ┌───────▼───────┐
                │   PostgreSQL  │               │     Redis     │
                │   Port 5432   │               │   Port 6379   │
                └───────────────┘               └───────────────┘
```

## Components

### 1. Ansible (`/ansible`)

Configuration management and deployment automation.

**[📖 Full Ansible Documentation](ansible/README.md)**

**Structure:**
```
ansible/
├── inventory/
│   └── hosts.yml           # Inventory for all environments
├── group_vars/
│   ├── all.yml            # Global variables
│   ├── development.yml    # Dev environment variables
│   ├── staging.yml        # Staging environment variables
│   └── production.yml     # Production environment variables
├── playbooks/
│   ├── site.yml           # Master playbook
│   ├── deploy.yml         # Application deployment
│   ├── setup.yml          # Initial server setup
│   └── maintenance.yml    # Maintenance tasks
└── roles/
    ├── common/            # Common setup tasks
    ├── backend/           # Backend deployment
    ├── frontend/          # Frontend deployment
    ├── database/          # Database setup
    └── monitoring/        # Monitoring stack
```

**Usage:**
```bash
# Deploy to development
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l development

# Deploy to production
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l production

# Run maintenance tasks
ansible-playbook -i inventory/hosts.yml playbooks/maintenance.yml
```

**Features:**
- Multi-environment inventory (dev, staging, production)
- Role-based playbook organization
- Rolling update deployments
- Health checks and rollback support
- Automated server setup and maintenance

### 2. Database (`/database`)

Database management scripts and tools.

**[📖 Full Database Documentation](database/README.md)**

**Scripts:**
- `backup.sh` - Automated PostgreSQL backups with compression and cloud upload
- `restore.sh` - Database restoration with safety backups
- `migrate.sh` - Prisma migration management

**Usage:**
```bash
# Create backup
./database/scripts/backup.sh

# Restore from backup
./database/scripts/restore.sh /path/to/backup.sql.gz

# Run migrations
./database/scripts/migrate.sh deploy

# Check migration status
./database/scripts/migrate.sh status
```

**Features:**
- Automated daily backups with retention management
- Azure Blob Storage / S3 upload support
- Optional AES-256 encryption
- Automated migration deployment
- Safety backups before restore
- Backup verification and testing

### 3. Docker (`/docker`)

Container configurations for local and production deployments.

**[📖 Full Docker Documentation](docker/README.md)**

**Files:**
- `docker-compose.yml` - Basic development stack (PostgreSQL, Redis)
- `docker-compose.full.yml` - Complete stack with monitoring
- `docker-compose.production.yml` - Production-ready configuration
- `monitoring/` - Prometheus and Grafana configurations
- `nginx/` - Nginx reverse proxy with caching and rate limiting
- `redis/redis.conf` - Redis configuration with persistence

**Usage:**
```bash
# Start development environment
cd docker
docker compose up -d

# Start complete stack with monitoring
docker compose -f docker-compose.full.yml up -d

# View logs
docker compose logs -f backend frontend

# Stop services
docker compose down
```

**Services in full stack:**
- Backend (NestJS) - Port 4000
- Frontend (Next.js) - Port 3000
- PostgreSQL 16 - Port 5432
- Redis 7 - Port 6379
- MongoDB 7 - Port 27017 (production)
- RabbitMQ 3.12 - Ports 5672, 15672 (production)
- Elasticsearch 8.11 - Ports 9200, 9300 (production)
- Nginx - Ports 80, 443
- Prometheus - Port 9090
- Grafana - Port 3001
- pgAdmin 4 - Port 5050
- Node Exporter - Port 9100
- cAdvisor - Port 8080

**Features:**
- Three deployment configurations (basic, full, production)
- Complete monitoring stack with Prometheus and Grafana
- Nginx reverse proxy with SSL/TLS support
- Health checks for all services
- Resource limits and logging drivers
- Multi-database support (PostgreSQL, MongoDB, Redis, Elasticsearch)
- Message queue with RabbitMQ

### 4. Kubernetes (`/kubernetes`)

Production-ready Kubernetes manifests and Helm charts.

**[📖 Full Kubernetes Documentation](kubernetes/README.md)**

**Structure:**
```
kubernetes/
├── base/
│   ├── namespace.yml              # Namespaces for all environments
│   ├── configmap.yml              # Configuration data
│   ├── secrets.yml                # Secrets template
│   └── persistent-volumes.yml    # Storage definitions
├── services/
│   ├── postgres-deployment.yml    # PostgreSQL StatefulSet
│   ├── redis-deployment.yml       # Redis StatefulSet
│   ├── backend-deployment.yml     # Backend Deployment + HPA
│   ├── frontend-deployment.yml    # Frontend Deployment + HPA
│   └── ingress.yml                # Ingress + ClusterIssuer (Let's Encrypt)
├── helm/
│   └── citadelbuy/               # Helm chart
│       ├── Chart.yaml            # Chart metadata + dependencies
│       ├── values.yaml           # Default values
│       ├── values-dev.yaml       # Development overrides
│       ├── values-staging.yaml   # Staging overrides
│       ├── values-prod.yaml      # Production overrides
│       └── templates/            # Kubernetes manifests templates
└── monitoring/
    └── prometheus-stack/         # Monitoring stack for K8s
```

**Usage:**
```bash
# Create namespace
kubectl apply -f kubernetes/base/namespace.yml

# Deploy base resources
kubectl apply -f kubernetes/base/

# Deploy services
kubectl apply -f kubernetes/services/

# Check deployments
kubectl get pods -n citadelbuy

# Using Helm (Recommended)
cd kubernetes/helm/citadelbuy
helm dependency update
helm install citadelbuy . -f values-prod.yaml -n citadelbuy --create-namespace
```

**Features:**
- Multi-namespace support (dev, staging, prod)
- Horizontal Pod Autoscaling (2-10 replicas based on CPU/memory)
- StatefulSets for databases with persistent volumes
- Ingress with NGINX Controller + Let's Encrypt SSL
- Liveness and readiness probes for all services
- Resource requests and limits
- Pod anti-affinity for high availability
- Helm chart with Bitnami PostgreSQL and Redis dependencies
- Environment-specific value files
- ServiceMonitor for Prometheus integration

### 5. Terraform (`/terraform`)

Infrastructure provisioning for Microsoft Azure.

**[📖 Full Azure Infrastructure Documentation](AZURE-README.md)**

**Structure:**
```
terraform/
├── modules/
│   ├── network/          # VNet, NSGs, subnets, NAT Gateway
│   ├── database/         # Azure PostgreSQL Flexible Server
│   └── storage/          # Azure Storage, Blob containers, Redis Premium
└── environments/
    ├── dev/              # Development environment
    ├── staging/          # Staging environment
    └── prod/             # Production environment
```

**Usage:**
```bash
# Initialize Terraform
cd terraform/environments/prod
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan

# View outputs
terraform output

# Destroy infrastructure
terraform destroy
```

**Azure Resources Provisioned:**

**Network:**
- Virtual Network (VNet) with multi-zone subnets
- Network Security Groups (NSGs)
- NAT Gateway for outbound internet
- Private DNS zones
- Application Insights
- Log Analytics Workspace

**Compute:**
- Azure Kubernetes Service (AKS) with 2-10 node auto-scaling
- Azure Container Registry (ACR) with geo-replication
- Application Gateway v2 with WAF
- Key Vault for secrets management

**Database:**
- Azure Database for PostgreSQL Flexible Server (PostgreSQL 16)
- Zone-Redundant High Availability (Primary Zone 1, Standby Zone 2)
- Read Replica (Zone 3)
- Automated backups (30-day retention)
- Geo-redundant backup storage
- Custom performance tuning

**Storage & Cache:**
- Azure Storage Account with geo-redundancy (GRS)
- Blob containers (uploads, backups, static assets, logs)
- Azure Cache for Redis Premium with persistence
- Azure Files for shared storage

**Monitoring:**
- Application Insights for APM
- Log Analytics for centralized logging
- Metric alerts for database, Redis, and AKS
- Dashboard provisioning

**Estimated Monthly Cost (Production):** $1,630 - $4,280
- AKS: $550-$3,200 (based on scaling)
- PostgreSQL: $400 (primary + standby) + $200 (replica)
- Redis Premium P2: $210
- Storage GRS: $20
- Application Gateway: $200
- Application Insights: $50

### 6. Monitoring (`/docker/monitoring`)

Complete observability stack.

**Components:**
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Node Exporter**: System metrics
- **cAdvisor**: Container metrics

**Prometheus Configuration:**
- Scrapes metrics every 15 seconds
- Retains data for 30 days
- Pre-configured alert rules
- Monitors: Application, Database, Redis, System

**Access:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin123)

**Pre-configured Alerts:**
- Service down notifications
- High CPU/Memory usage
- Database connection issues
- Slow queries
- Container restarts

## Deployment Options

### Option 1: Docker Compose (Recommended for Development)

```bash
# Quick start
cd citadelbuy/infrastructure/docker
docker compose up -d

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# Database: localhost:5432
```

### Option 2: Kubernetes (Recommended for Production)

```bash
# Deploy to Kubernetes
kubectl apply -f kubernetes/base/
kubectl apply -f kubernetes/services/

# Or use Helm
helm install citadelbuy kubernetes/helm/citadelbuy \
  --namespace citadelbuy \
  --create-namespace
```

### Option 3: Ansible (Recommended for Bare Metal)

```bash
# Initial setup
ansible-playbook -i ansible/inventory/hosts.yml ansible/playbooks/setup.yml

# Deploy application
ansible-playbook -i ansible/inventory/hosts.yml ansible/playbooks/deploy.yml
```

### Option 4: Terraform + AKS (Recommended for Azure)

```bash
# Provision Azure infrastructure
cd terraform/environments/prod
terraform init
terraform apply

# Configure kubectl for AKS
az aks get-credentials \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-prod-aks

# Deploy to AKS using Helm
cd ../../kubernetes/helm/citadelbuy
helm install citadelbuy . -f values-prod.yaml -n citadelbuy --create-namespace
```

## Environments

### Development
- Single instance of each service
- Debug mode enabled
- No SSL required
- In-memory caching
- Local file storage

### Staging
- 2 replicas of application services
- Production-like configuration
- SSL enabled
- Database replica
- Load balancing

### Production
- 3+ replicas with auto-scaling (2-10)
- Multi-AZ database with replica
- Redis cluster
- CDN integration
- Full monitoring and alerting
- Automated backups
- High availability

## Security

### Secrets Management
- Kubernetes secrets for sensitive data
- AWS Secrets Manager integration (Terraform)
- Environment-specific credentials
- Encrypted backups

### Network Security
- Private subnets for databases
- Security groups with minimal access
- VPC isolation
- SSL/TLS encryption
- Rate limiting on ingress

### Best Practices
- No secrets in version control
- Principle of least privilege
- Regular security updates
- Audit logging enabled
- Backup encryption

## Monitoring

### Metrics Collected
- Application performance (response times, error rates)
- System resources (CPU, memory, disk)
- Database performance (connections, query times)
- Cache hit rates
- Container health

### Dashboards
- Application Overview
- Infrastructure Health
- Database Performance
- Redis Analytics
- Alert Status

### Alerting
- Email notifications configured
- Slack integration available
- PagerDuty integration ready
- Alert severity levels: Critical, Warning, Info

## Backup & Recovery

### Automated Backups

**Database:**
```bash
# Automatic daily backups at 2 AM
# Retention: 30 days
# Location: /opt/citadelbuy/backups or S3

# Manual backup
./database/scripts/backup.sh
```

**Application Data:**
- Volumes backed up via Velero (Kubernetes)
- S3 versioning enabled
- Point-in-time recovery available

### Recovery Procedures

**Database Restore:**
```bash
# List available backups
ls -lh /opt/citadelbuy/backups/

# Restore from backup
./database/scripts/restore.sh /path/to/backup.sql.gz
```

**Disaster Recovery:**
1. Provision new infrastructure (Terraform)
2. Restore database from latest backup
3. Deploy application (Ansible/Kubernetes)
4. Update DNS records
5. Verify functionality

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check logs
docker compose logs -f <service-name>
kubectl logs -n citadelbuy <pod-name>

# Check health
docker ps
kubectl get pods -n citadelbuy
```

**Database connection issues:**
```bash
# Verify database is running
docker compose ps postgres
kubectl get pods -n citadelbuy -l component=postgres

# Test connection
psql -h localhost -U citadelbuy -d citadelbuy_dev
```

**Performance issues:**
```bash
# Check resource usage
docker stats
kubectl top pods -n citadelbuy

# Review Grafana dashboards
# Access: http://localhost:3001
```

## Maintenance

### Regular Tasks
- Weekly: Review monitoring dashboards
- Weekly: Check backup integrity
- Monthly: Security updates
- Monthly: Review and optimize resources
- Quarterly: Disaster recovery drill

### Maintenance Playbook
```bash
# Run maintenance tasks
ansible-playbook -i ansible/inventory/hosts.yml \
  ansible/playbooks/maintenance.yml
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/oks-citadel/citadelbuy/issues
- Documentation: See `/docs` directory
- Email: dev@citadelbuy.com

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.
