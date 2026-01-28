# Broxiva GoDaddy Migration Infrastructure

## Overview

This directory contains all configuration files, scripts, and documentation required to migrate Broxiva from Vercel/Railway to GoDaddy VPS hosting.

## Directory Structure

```
godaddy/
├── scripts/
│   ├── 01-server-provision.sh      # Initial server setup
│   ├── 02-install-dependencies.sh  # Software installation
│   ├── 03-security-hardening.sh    # Security configuration
│   ├── 04-deploy-application.sh    # Application deployment
│   ├── 05-database-migration.sh    # Database migration
│   ├── 06-ssl-setup.sh             # SSL certificate setup
│   └── 07-final-verification.sh    # Post-migration verification
├── configs/
│   ├── nginx/
│   │   ├── nginx.conf              # Main Nginx config
│   │   ├── broxiva.conf            # Site configuration
│   │   └── ssl-params.conf         # SSL parameters
│   ├── pm2/
│   │   └── ecosystem.config.js     # PM2 process config
│   ├── systemd/
│   │   └── broxiva.service         # Systemd service files
│   └── logrotate/
│       └── broxiva                 # Log rotation config
├── docker/
│   └── docker-compose.godaddy.yml  # GoDaddy Docker Compose
├── database/
│   ├── backup.sh                   # Database backup script
│   ├── restore.sh                  # Database restore script
│   └── validate.sql                # Validation queries
├── monitoring/
│   ├── healthcheck.sh              # Health check script
│   └── disk-monitor.sh             # Disk monitoring
└── docs/
    ├── MIGRATION-RUNBOOK.md        # Step-by-step guide
    ├── ROLLBACK-PLAN.md            # Rollback procedures
    └── DNS-RECORDS.md              # DNS configuration
```

## Prerequisites

### GoDaddy VPS Requirements

- **Recommended Plan**: VPS Hosting - Ultimate or higher
- **Specs**: 8 vCPU, 16GB RAM, 200GB NVMe SSD
- **OS**: Ubuntu 22.04 LTS
- **Root SSH Access**: Required for initial setup

### Domain Requirements

- `broxiva.com` registered with GoDaddy
- DNS management access
- Ability to create A records

## Quick Start

1. **Provision GoDaddy VPS** through GoDaddy control panel
2. **SSH into server**: `ssh root@YOUR_SERVER_IP`
3. **Clone repository**:
   ```bash
   git clone https://github.com/broxiva/organization.git /opt/broxiva
   ```
4. **Run provisioning scripts in order**:
   ```bash
   cd /opt/broxiva/infrastructure/godaddy/scripts
   chmod +x *.sh
   ./01-server-provision.sh
   ./02-install-dependencies.sh
   ./03-security-hardening.sh
   ```
5. **Follow MIGRATION-RUNBOOK.md** for complete migration steps

## Environment Variables

Before deployment, ensure you have:
- Railway database connection string (for migration)
- All API keys and secrets from `.env.example`
- GoDaddy server IP address

## Support

For issues during migration, check:
- Application logs: `/var/log/broxiva/`
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `pm2 logs`

---

**Migration Target**: www.broxiva.com on GoDaddy VPS
**Previous Hosts**: Vercel (frontend), Railway (backend + database)
