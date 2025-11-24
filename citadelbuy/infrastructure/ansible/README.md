# CitadelBuy Ansible Configuration

Ansible automation for CitadelBuy infrastructure deployment, configuration, and maintenance.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Playbooks](#playbooks)
- [Inventory](#inventory)
- [Variables](#variables)
- [Roles](#roles)
- [Usage Examples](#usage-examples)

## Overview

This Ansible configuration provides:
- Multi-environment deployment (dev, staging, production)
- Application deployment with rolling updates
- Initial server setup and configuration
- Routine maintenance tasks
- Modular role-based architecture

## Directory Structure

```
ansible/
├── inventory/
│   └── hosts.yml              # Multi-environment inventory
├── group_vars/
│   ├── all.yml               # Global variables
│   ├── development.yml       # Dev environment vars
│   ├── staging.yml           # Staging environment vars
│   └── production.yml        # Production environment vars
├── playbooks/
│   ├── site.yml              # Master deployment playbook
│   ├── deploy.yml            # Application deployment
│   ├── setup.yml             # Initial server setup
│   └── maintenance.yml       # Maintenance tasks
└── roles/
    ├── common/               # Common setup (Docker, security)
    ├── backend/              # Backend deployment
    ├── frontend/             # Frontend deployment
    ├── database/             # Database setup
    └── monitoring/           # Monitoring stack
```

## Prerequisites

1. **Ansible** >= 2.10
   ```bash
   pip install ansible
   ```

2. **Required Collections**
   ```bash
   ansible-galaxy collection install community.docker
   ansible-galaxy collection install community.postgresql
   ```

3. **SSH Access**
   - SSH keys configured for all target servers
   - Keys stored in `~/.ssh/citadelbuy-{env}.pem`

4. **Inventory Configuration**
   - Update `inventory/hosts.yml` with actual server IPs
   - Configure SSH keys and users

## Quick Start

### 1. Configure Inventory

Edit `inventory/hosts.yml` with your server details:

```yaml
production:
  children:
    prod_app:
      hosts:
        prod-app-01:
          ansible_host: YOUR_SERVER_IP
          ansible_user: ubuntu
          ansible_ssh_private_key_file: ~/.ssh/citadelbuy-prod.pem
```

### 2. Test Connectivity

```bash
# Test connection to all hosts
ansible all -i inventory/hosts.yml -m ping

# Test connection to production
ansible production -i inventory/hosts.yml -m ping
```

### 3. Initial Setup

```bash
# Setup all servers
ansible-playbook -i inventory/hosts.yml playbooks/setup.yml

# Setup production only
ansible-playbook -i inventory/hosts.yml playbooks/setup.yml -l production
```

### 4. Deploy Application

```bash
# Deploy to production
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l production

# Deploy with rolling updates
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l production -e "rolling_update_batch=1"
```

## Playbooks

### site.yml - Master Playbook

Complete infrastructure deployment including all components.

**Usage:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/site.yml
```

**What it does:**
1. Runs common setup on all servers
2. Configures database servers
3. Deploys application servers
4. Configures web servers
5. Sets up monitoring

**Options:**
```bash
# Deploy to specific environment
ansible-playbook -i inventory/hosts.yml playbooks/site.yml -l staging

# Skip certain roles
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --skip-tags "monitoring"
```

### deploy.yml - Application Deployment

Deploys application updates with zero downtime using rolling updates.

**Usage:**
```bash
# Standard deployment
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l production

# Rolling update (1 server at a time)
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml \
  -l production \
  -e "rolling_update_batch=1"

# Deploy specific version
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml \
  -l production \
  -e "docker_image_tag=v2.0.0"
```

**Features:**
- Pulls latest Docker images
- Stops containers gracefully
- Deploys new containers
- Runs database migrations
- Health checks before proceeding
- Automatic rollback on failure

**Variables:**
- `rolling_update_batch`: Number of servers to update simultaneously (default: 1)
- `docker_image_tag`: Image tag to deploy (default: latest)
- `health_check_retries`: Number of health check attempts (default: 5)

### setup.yml - Initial Server Setup

Configures fresh servers with all required dependencies.

**Usage:**
```bash
# Setup all servers
ansible-playbook -i inventory/hosts.yml playbooks/setup.yml

# Setup single server
ansible-playbook -i inventory/hosts.yml playbooks/setup.yml -l prod-app-01
```

**What it installs:**
- Essential packages (curl, wget, git, vim, htop)
- Docker and Docker Compose
- Firewall (UFW)
- Fail2ban
- NTP/Chrony
- Application user and directories

**Security configurations:**
- Configures firewall rules
- Sets up fail2ban for SSH protection
- Creates application user with limited permissions
- Configures Docker daemon

### maintenance.yml - Routine Maintenance

Performs routine maintenance tasks.

**Usage:**
```bash
# Run maintenance on all servers
ansible-playbook -i inventory/hosts.yml playbooks/maintenance.yml

# Enable maintenance mode
ansible-playbook -i inventory/hosts.yml playbooks/maintenance.yml \
  -e "maintenance_mode=true"

# Cleanup old images
ansible-playbook -i inventory/hosts.yml playbooks/maintenance.yml \
  -e "cleanup_old_images=true"
```

**Tasks:**
- Database backups
- Log rotation
- Old Docker image cleanup
- Disk space monitoring
- Security updates
- Health checks

**Variables:**
- `maintenance_mode`: Enable maintenance page (default: false)
- `backup_before_maintenance`: Backup before tasks (default: true)
- `cleanup_old_images`: Remove unused images (default: true)
- `update_packages`: Install system updates (default: false)

## Inventory

### Environment Structure

The inventory is organized by environment (dev, staging, prod) with sub-groups for each tier:

**Development:**
- `dev_web` - Web servers
- `dev_app` - Application servers
- `dev_db` - Database servers

**Staging:**
- `staging_web` - Web servers (2 instances)
- `staging_app` - Application servers (2 instances)
- `staging_db` - Database servers

**Production:**
- `prod_web` - Web servers (3 instances)
- `prod_app` - Application servers (3 instances)
- `prod_db` - Database servers (primary + replica)

**Monitoring:**
- `monitoring` - Monitoring infrastructure

### Adding New Servers

1. Edit `inventory/hosts.yml`
2. Add server under appropriate group:

```yaml
production:
  children:
    prod_app:
      hosts:
        prod-app-04:  # New server
          ansible_host: 10.0.3.23
          ansible_user: ubuntu
          ansible_ssh_private_key_file: ~/.ssh/citadelbuy-prod.pem
```

3. Run setup playbook:
```bash
ansible-playbook -i inventory/hosts.yml playbooks/setup.yml -l prod-app-04
```

## Variables

### Global Variables (group_vars/all.yml)

Variables applied to all environments:

```yaml
app_name: citadelbuy
docker_version: "24.0"
docker_compose_version: "2.23.0"
nodejs_version: "20"
log_retention_days: 30
backup_retention_days: 30
```

### Environment-Specific Variables

**Development (group_vars/development.yml):**
```yaml
environment: development
domain: dev.citadelbuy.local
debug_mode: true
ssl_enabled: false
backup_enabled: false
```

**Staging (group_vars/staging.yml):**
```yaml
environment: staging
domain: staging.citadelbuy.com
debug_mode: false
ssl_enabled: true
backup_enabled: true
backup_retention_days: 14
```

**Production (group_vars/production.yml):**
```yaml
environment: production
domain: citadelbuy.com
debug_mode: false
ssl_enabled: true
backup_enabled: true
backup_retention_days: 30
autoscaling_enabled: true
cdn_enabled: true
```

### Overriding Variables

**Command line:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml \
  -e "docker_image_tag=v2.0.0" \
  -e "backend_memory_limit=2g"
```

**Extra vars file:**
```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml \
  --extra-vars "@custom-vars.yml"
```

## Roles

### Common Role

Base setup for all servers.

**Tasks:**
- Docker installation
- System security hardening
- Monitoring agent setup

**Usage:**
```yaml
roles:
  - common
```

### Backend Role

Backend application deployment.

**Tasks:**
- Deploy backend Docker container
- Configure environment variables
- Setup health checks

### Frontend Role

Frontend application deployment.

**Tasks:**
- Deploy frontend Docker container
- Configure Next.js settings
- Setup CDN integration

### Database Role

Database server configuration.

**Tasks:**
- PostgreSQL installation
- Database configuration
- Backup setup
- Replication configuration (production)

### Monitoring Role

Monitoring stack deployment.

**Tasks:**
- Prometheus setup
- Grafana configuration
- Alert rules
- Dashboard provisioning

## Usage Examples

### Deploy to Specific Environment

```bash
# Development
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l development

# Staging
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l staging

# Production
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l production
```

### Deploy to Specific Server

```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l prod-app-01
```

### Deploy with Tags

```bash
# Only deploy backend
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -t backend

# Only run health checks
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -t health
```

### Dry Run (Check Mode)

```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml --check
```

### Verbose Output

```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -v   # verbose
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -vv  # more verbose
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -vvv # debug
```

### Run Specific Tasks

```bash
# Only pull images
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml --tags "pull"

# Only run migrations
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml --tags "migration"
```

## Best Practices

1. **Use Ansible Vault for Secrets**
   ```bash
   # Create encrypted vault
   ansible-vault create group_vars/production/vault.yml

   # Edit vault
   ansible-vault edit group_vars/production/vault.yml

   # Run playbook with vault
   ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml --ask-vault-pass
   ```

2. **Test in Development First**
   ```bash
   # Always test in dev before production
   ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -l development
   ```

3. **Use Rolling Updates in Production**
   ```bash
   ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml \
     -l production \
     -e "rolling_update_batch=1"
   ```

4. **Backup Before Major Changes**
   ```bash
   ansible-playbook -i inventory/hosts.yml playbooks/maintenance.yml \
     -e "backup_before_maintenance=true" \
     -l production
   ```

5. **Monitor Deployments**
   - Check logs during deployment
   - Verify health endpoints
   - Monitor error rates

## Troubleshooting

### Connection Issues

```bash
# Test connectivity
ansible all -i inventory/hosts.yml -m ping

# Check SSH access
ssh -i ~/.ssh/citadelbuy-prod.pem ubuntu@SERVER_IP

# Verbose SSH debugging
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -vvv
```

### Permission Issues

```bash
# Verify sudo access
ansible all -i inventory/hosts.yml -m shell -a "sudo whoami"

# Check become settings
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -v
```

### Docker Issues

```bash
# Check Docker status
ansible all -i inventory/hosts.yml -m shell -a "docker ps"

# Restart Docker
ansible all -i inventory/hosts.yml -m service -a "name=docker state=restarted" --become
```

## Additional Resources

- [Ansible Documentation](https://docs.ansible.com/)
- [Best Practices](https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html)
- [Docker Module](https://docs.ansible.com/ansible/latest/collections/community/docker/)

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.
