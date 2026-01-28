# Broxiva Migration Runbook: Vercel/Railway → GoDaddy

## Overview

This runbook provides step-by-step instructions for migrating the Broxiva platform from Vercel (frontend) and Railway (backend + database) to a GoDaddy VPS.

**Estimated Duration**: 4-6 hours (with verification)
**Risk Level**: Medium
**Rollback Time**: < 5 minutes (during TTL window)

---

## Pre-Migration Checklist

### 1. Access Requirements

- [ ] GoDaddy account with VPS access
- [ ] SSH access to GoDaddy VPS
- [ ] Railway database connection string
- [ ] Vercel project access
- [ ] Domain DNS management access (GoDaddy)
- [ ] All API keys and secrets from current deployment

### 2. Information Gathering

```bash
# Get Railway database URL (from Railway dashboard or CLI)
railway variables | grep DATABASE_URL

# Get current server IPs
dig +short www.broxiva.com
dig +short api.broxiva.com
```

### 3. Backup Current State

- [ ] Export Railway database: `railway run pg_dump > railway_backup_$(date +%Y%m%d).sql`
- [ ] Download current environment variables from Vercel/Railway
- [ ] Screenshot current DNS records
- [ ] Note current Vercel deployment URL

---

## Phase 1: GoDaddy VPS Setup

### Step 1.1: Provision VPS

1. Log into GoDaddy → Hosting → VPS
2. Select plan: **VPS Ultimate** (recommended) or higher
   - 8 vCPU
   - 16 GB RAM
   - 200 GB NVMe SSD
3. Select OS: **Ubuntu 22.04 LTS**
4. Complete purchase and wait for provisioning

### Step 1.2: Initial Server Access

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update server info file
echo "SERVER_IP=$(curl -s ifconfig.me)" >> /etc/broxiva/server.conf
```

### Step 1.3: Run Provisioning Scripts

```bash
# Clone repository or upload scripts
cd /tmp
git clone https://github.com/broxiva/organization.git
cp -r organization/infrastructure/godaddy /opt/godaddy-setup
cd /opt/godaddy-setup/scripts

# Make scripts executable
chmod +x *.sh

# Run in order
./01-server-provision.sh
./02-install-dependencies.sh
./03-security-hardening.sh
```

### Step 1.4: Configure Environment Variables

```bash
# Copy environment template
cp /opt/broxiva/source/organization/.env.example /opt/broxiva/.env

# Edit with your production values
nano /opt/broxiva/.env
```

**Critical variables to set:**
- `NODE_ENV=production`
- `DATABASE_URL=` (will be set after DB migration)
- `JWT_SECRET=` (generate: `openssl rand -base64 64`)
- `JWT_REFRESH_SECRET=` (generate: `openssl rand -base64 64`)
- `ENCRYPTION_KEY=` (generate: `openssl rand -hex 32`)
- All Stripe/payment keys
- All OAuth credentials
- CORS origins: `https://www.broxiva.com`

---

## Phase 2: Database Migration

### Step 2.1: Export Railway Database

```bash
# Set Railway database URL
export RAILWAY_DATABASE_URL="postgresql://user:pass@host:port/db"

# Run migration script
./05-database-migration.sh
```

### Step 2.2: Verify Migration

```bash
# Connect to local database
sudo -u postgres psql -d broxiva

# Check table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';

# Check critical tables
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "Order";
```

### Step 2.3: Update Application Config

```bash
# Get new database URL from migration output
cat /etc/broxiva/database.secret

# Update .env file
nano /opt/broxiva/.env
# Set DATABASE_URL to the new local connection string
```

---

## Phase 3: Application Deployment

### Step 3.1: Deploy Applications

```bash
# Run deployment script
./04-deploy-application.sh

# Verify PM2 processes
pm2 status
pm2 logs --lines 50
```

### Step 3.2: Test Local Endpoints

```bash
# Test backend
curl http://localhost:4000/api/health

# Test frontend
curl http://localhost:3000
```

---

## Phase 4: DNS Cutover

### Step 4.1: Lower TTL (Before Cutover)

1. Go to GoDaddy DNS Management for broxiva.com
2. Find existing A records
3. Lower TTL to **60 seconds** (1 minute)
4. Wait 24-48 hours for TTL to propagate (or match current TTL)

### Step 4.2: Update DNS Records

| Type | Host | Points To | TTL |
|------|------|-----------|-----|
| A | @ | YOUR_SERVER_IP | 60 |
| A | www | YOUR_SERVER_IP | 60 |
| A | api | YOUR_SERVER_IP | 60 |

**Remove any old records pointing to Vercel/Railway IPs.**

### Step 4.3: Wait for Propagation

```bash
# Check propagation
watch -n 10 "dig +short www.broxiva.com"
watch -n 10 "dig +short api.broxiva.com"

# Or use online tool
# https://www.whatsmydns.net/#A/www.broxiva.com
```

### Step 4.4: Install SSL Certificates

```bash
# Wait until DNS is pointing to your server
./06-ssl-setup.sh
```

---

## Phase 5: Verification

### Step 5.1: Run Automated Verification

```bash
./07-final-verification.sh
```

### Step 5.2: Manual Testing Checklist

**Authentication:**
- [ ] User registration works
- [ ] User login works
- [ ] Password reset email sends
- [ ] OAuth login (Google, Facebook) works

**Core Features:**
- [ ] Product listing loads
- [ ] Product search works
- [ ] Add to cart works
- [ ] Checkout flow completes
- [ ] Payment processing works

**API Endpoints:**
- [ ] `/api/health` returns OK
- [ ] `/api/products` returns data
- [ ] Protected endpoints require auth

**Performance:**
- [ ] Page load under 3 seconds
- [ ] API responses under 500ms

### Step 5.3: Mobile App Testing

- [ ] Mobile app can connect to new API
- [ ] All features work as expected

---

## Phase 6: Monitoring Period

### 6.1: Initial Monitoring (First 24 Hours)

```bash
# Watch logs
pm2 logs

# Monitor errors
tail -f /var/log/nginx/broxiva_error.log

# Check system resources
htop
```

### 6.2: Key Metrics to Monitor

- Error rates (should be < 0.1%)
- Response times (P95 < 500ms)
- CPU usage (should be < 70%)
- Memory usage (should be < 80%)
- Disk usage (should be < 70%)

---

## Phase 7: Decommissioning

**ONLY proceed after 48+ hours of successful operation.**

### 7.1: Final Backup

```bash
# Create final Railway backup (before deletion)
railway run pg_dump > final_railway_backup.sql
```

### 7.2: Run Decommission Script

```bash
./08-decommission.sh
```

### 7.3: Manual Steps

1. **Vercel:**
   - Remove domains from project
   - Delete project
   - Cancel subscription

2. **Railway:**
   - Stop all services
   - Delete project
   - Cancel subscription

### 7.4: DNS Finalization

- Increase TTL back to 1 hour (3600) or 1 day (86400)
- Verify all records point to GoDaddy server

---

## Rollback Procedure

If issues occur during migration:

### Before DNS Cutover

Simply abandon GoDaddy setup. Original Vercel/Railway deployment continues to work.

### After DNS Cutover (Within TTL Window)

```bash
# Revert DNS immediately
# Go to GoDaddy DNS Management
# Point A records back to original IPs:
# - www → Vercel IP
# - api → Railway IP

# DNS will revert within TTL (60 seconds if lowered)
```

### After TTL Expires

1. Restore Railway database from backup
2. Redeploy to Vercel/Railway
3. Update DNS back to original
4. Wait for propagation

---

## Emergency Contacts

- GoDaddy Support: 1-480-505-8877
- Railway Support: https://railway.app/help
- Vercel Support: https://vercel.com/help

---

## Post-Migration Checklist

- [ ] All automated tests pass
- [ ] Manual testing complete
- [ ] Monitoring in place
- [ ] 48+ hours stable operation
- [ ] Vercel decommissioned
- [ ] Railway decommissioned
- [ ] DNS locked to GoDaddy
- [ ] Documentation updated
- [ ] Team notified
