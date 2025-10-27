# Deployment Guide - Cross-Border Commerce Platform

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Development Deployment](#development-deployment)
4. [Test Deployment](#test-deployment)
5. [Production Deployment](#production-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Infrastructure Requirements

**Hardware/VM Requirements:**

| Environment | CPU Cores | RAM | Storage | Bandwidth |
|------------|-----------|-----|---------|-----------|
| Development | 4 | 8 GB | 50 GB | 100 Mbps |
| Test | 4 | 8 GB | 100 GB | 100 Mbps |
| Production | 8+ | 16+ GB | 500+ GB | 1+ Gbps |

**Software Requirements:**
- [ ] Docker 24.x or higher installed
- [ ] Docker Compose 2.x or higher installed
- [ ] Git installed
- [ ] OpenSSL (for certificate generation)
- [ ] Make (optional, for using Makefile)

### Security Checklist

- [ ] SSL/TLS certificates obtained (Let's Encrypt or commercial)
- [ ] Strong passwords generated for all services
- [ ] JWT secret keys generated (min 64 characters)
- [ ] Database passwords secured
- [ ] API keys for external services obtained
- [ ] Firewall rules configured
- [ ] SSH access secured with key-based authentication
- [ ] Backup strategy implemented

### External Services Setup

- [ ] Domain name registered and DNS configured
- [ ] CDN service configured (Cloudflare, CloudFront, etc.)
- [ ] Email service configured (SendGrid, AWS SES, etc.)
- [ ] Payment gateways configured (Stripe, PayPal, Adyen)
- [ ] Object storage configured (S3, Azure Storage)
- [ ] Monitoring service configured (optional: Datadog, New Relic)

---

## Environment Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/yourorg/commerce-platform.git
cd commerce-platform
```

### Step 2: Set Up Environment Variables

```bash
# Copy environment template
cp .env.dev .env.dev.local  # For development
cp .env.test .env.test.local  # For test
cp .env.prod .env.prod.local  # For production

# Edit environment files with your actual values
nano .env.prod.local  # or vim, code, etc.
```

**Critical Variables to Change:**

```bash
# Database
DB_PASSWORD=STRONG_PASSWORD_HERE

# Redis
REDIS_PASSWORD=STRONG_PASSWORD_HERE

# JWT
JWT_SECRET=STRONG_SECRET_MIN_64_CHARS_HERE

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
PAYPAL_CLIENT_SECRET=YOUR_SECRET

# Email
SMTP_PASSWORD=YOUR_SMTP_PASSWORD

# Storage
S3_ACCESS_KEY=YOUR_ACCESS_KEY
S3_SECRET_KEY=YOUR_SECRET_KEY
```

### Step 3: SSL Certificate Setup

**Option A: Let's Encrypt (Recommended for Production)**

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourplatform.com -d www.yourplatform.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourplatform.com/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/yourplatform.com/privkey.pem ./certs/
```

**Option B: Self-Signed Certificate (Development Only)**

```bash
# Generate self-signed certificate
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/privkey.pem \
  -out certs/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
```

---

## Development Deployment

### Quick Start

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Check service status
docker-compose -f docker-compose.dev.yml ps
```

### Detailed Steps

**1. Build Images**

```bash
docker-compose -f docker-compose.dev.yml build
```

**2. Start Services**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

**3. Run Database Migrations**

```bash
docker-compose -f docker-compose.dev.yml exec backend ./api migrate
```

**4. Seed Development Data**

```bash
docker-compose -f docker-compose.dev.yml exec backend ./api seed
```

**5. Access Services**

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Docs (Swagger): http://localhost:8080/swagger
- pgAdmin: http://localhost:5050
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- MailHog: http://localhost:8025

### Development Workflow

**Hot Reload:**
- Frontend: Automatically reloads on file changes
- Backend: Uses Air for automatic rebuild and reload

**Database Management:**

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U admin -d commerce_dev

# Backup database
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U admin commerce_dev > backup.sql

# Restore database
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U admin commerce_dev < backup.sql

# Reset database
docker-compose -f docker-compose.dev.yml exec backend ./api migrate:reset
```

**Cache Management:**

```bash
# Flush Redis cache
docker-compose -f docker-compose.dev.yml exec redis redis-cli -a dev_redis_pass FLUSHALL

# View Redis keys
docker-compose -f docker-compose.dev.yml exec redis redis-cli -a dev_redis_pass KEYS '*'
```

---

## Test Deployment

### Purpose
- Integration testing
- Performance testing
- QA validation
- Pre-production verification

### Steps

**1. Build Test Images**

```bash
docker-compose -f docker-compose.test.yml build
```

**2. Start Test Environment**

```bash
docker-compose -f docker-compose.test.yml up -d
```

**3. Run Migrations and Seed Test Data**

```bash
docker-compose -f docker-compose.test.yml exec backend ./api migrate
docker-compose -f docker-compose.test.yml exec backend ./api seed:test
```

**4. Run Integration Tests**

```bash
# Backend tests
docker-compose -f docker-compose.test.yml exec backend go test ./... -v -cover

# Frontend tests
docker-compose -f docker-compose.test.yml exec frontend npm run test

# E2E tests
docker-compose -f docker-compose.test.yml up test-runner
```

**5. Performance Testing**

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Simple load test
ab -n 1000 -c 10 http://localhost:8180/api/v1/health

# Install K6 for advanced testing
docker run -i grafana/k6 run - <scripts/load-test.js
```

**6. Access Test Environment**

- Frontend: http://localhost:3100
- Backend API: http://localhost:8180
- Prometheus: http://localhost:9190

---

## Production Deployment

### Pre-Deployment Steps

**1. Create Deployment Checklist**

```bash
# Create deployment log
mkdir -p deployments
cat > deployments/deployment-$(date +%Y%m%d-%H%M%S).md << 'EOF'
# Deployment Log

## Date: $(date)
## Version: 1.0.0

### Pre-Deployment
- [ ] Backup database
- [ ] Backup Redis data
- [ ] Stop maintenance mode
- [ ] Verify environment variables
- [ ] Build and tag Docker images

### Deployment
- [ ] Pull latest code
- [ ] Start services
- [ ] Run migrations
- [ ] Verify health checks

### Post-Deployment
- [ ] Test critical paths
- [ ] Monitor logs
- [ ] Check metrics
- [ ] Update DNS (if needed)

### Rollback (if needed)
- [ ] Revert to previous version
- [ ] Restore database
EOF
```

**2. Enable Maintenance Mode** (Optional)

```bash
# Create maintenance page
docker-compose -f docker-compose.prod.yml exec nginx \
  echo "Under Maintenance" > /usr/share/nginx/html/maintenance.html

# Update NGINX config to serve maintenance page
```

**3. Backup Production Database**

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U $DB_USER $DB_NAME | \
  gzip > backups/$(date +%Y%m%d)/database-$(date +%H%M%S).sql.gz

# Backup Redis
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli -a $REDIS_PASSWORD --rdb /data/dump.rdb
docker cp commerce-redis-prod:/data/dump.rdb backups/$(date +%Y%m%d)/redis-$(date +%H%M%S).rdb
```

### Deployment Steps

**Method 1: Fresh Installation**

```bash
# 1. Pull latest code
git pull origin main

# 2. Load environment variables
source .env.prod.local

# 3. Build images
docker-compose -f docker-compose.prod.yml build --no-cache

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Wait for services to be healthy
sleep 30

# 6. Run migrations
docker-compose -f docker-compose.prod.yml exec backend ./api migrate

# 7. Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

**Method 2: Rolling Update (Zero Downtime)**

```bash
# 1. Build new images with version tag
VERSION=1.0.1 docker-compose -f docker-compose.prod.yml build

# 2. Pull new images on all nodes
docker-compose -f docker-compose.prod.yml pull

# 3. Update services one at a time
# Scale up with new version
docker-compose -f docker-compose.prod.yml up -d --scale backend=4

# 4. Wait for new services to be healthy
sleep 30

# 5. Scale down old version
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# 6. Remove old containers
docker container prune -f
```

**Method 3: Blue-Green Deployment**

```bash
# 1. Start "green" environment
docker-compose -f docker-compose.prod-green.yml up -d

# 2. Run smoke tests on green
./scripts/smoke-test.sh http://green.internal

# 3. Switch traffic to green (update load balancer)
# Update DNS or load balancer configuration

# 4. Monitor for issues
sleep 300

# 5. If successful, shutdown "blue" environment
docker-compose -f docker-compose.prod-blue.yml down

# 6. Promote green to blue for next deployment
```

### Database Migration Strategy

**Zero-Downtime Migrations:**

```bash
# 1. Run backward-compatible migrations first
docker-compose -f docker-compose.prod.yml exec backend ./api migrate:safe

# 2. Deploy new application version

# 3. Run breaking migrations after deployment
docker-compose -f docker-compose.prod.yml exec backend ./api migrate:final
```

### SSL Certificate Renewal

```bash
# Set up auto-renewal with cron
sudo crontab -e

# Add this line (runs at 2 AM every day)
0 2 * * * certbot renew --quiet --post-hook "docker-compose -f /path/to/docker-compose.prod.yml restart nginx"
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Verify health endpoints
curl -f https://yourplatform.com/health || exit 1
curl -f https://api.yourplatform.com/health || exit 1
```

### 2. Smoke Tests

```bash
#!/bin/bash
# scripts/smoke-test.sh

BASE_URL="https://yourplatform.com"
API_URL="https://api.yourplatform.com"

# Test homepage
echo "Testing homepage..."
curl -s -o /dev/null -w "%{http_code}" $BASE_URL | grep 200 || exit 1

# Test API health
echo "Testing API health..."
curl -s -o /dev/null -w "%{http_code}" $API_URL/health | grep 200 || exit 1

# Test API authentication
echo "Testing API authentication..."
curl -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -s -o /dev/null -w "%{http_code}" | grep -E "200|401" || exit 1

# Test product listing
echo "Testing product API..."
curl -s -o /dev/null -w "%{http_code}" $API_URL/api/v1/products | grep 200 || exit 1

echo "All smoke tests passed!"
```

### 3. Monitor Logs

```bash
# Watch all logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Watch specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Check for errors
docker-compose -f docker-compose.prod.yml logs | grep -i error
```

### 4. Monitor Metrics

Access monitoring dashboards:
- Prometheus: http://your-server:9090
- Grafana: http://your-server:3001

Check key metrics:
- Response times < 200ms (p95)
- Error rate < 1%
- CPU usage < 70%
- Memory usage < 80%
- Disk usage < 80%

---

## Rollback Procedures

### Quick Rollback

```bash
# 1. Switch to previous version
git checkout <previous-commit-hash>

# 2. Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 3. Restore database if needed
gunzip < backups/20250101/database-120000.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U $DB_USER $DB_NAME
```

### Detailed Rollback Steps

**1. Stop Current Version**

```bash
docker-compose -f docker-compose.prod.yml down
```

**2. Restore Database Backup**

```bash
# Restore PostgreSQL
gunzip < backups/$(date +%Y%m%d)/database-backup.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U admin commerce_db

# Restore Redis
docker cp backups/$(date +%Y%m%d)/redis-backup.rdb commerce-redis-prod:/data/dump.rdb
docker-compose -f docker-compose.prod.yml restart redis
```

**3. Deploy Previous Version**

```bash
# Checkout previous version
git checkout tags/v1.0.0

# Deploy previous version
docker-compose -f docker-compose.prod.yml up -d
```

**4. Verify Rollback**

```bash
# Run smoke tests
./scripts/smoke-test.sh

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=100
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Refused**

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify network connectivity
docker-compose -f docker-compose.prod.yml exec backend ping postgres

# Test connection manually
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U admin -d commerce_db -c "SELECT 1;"
```

**2. Backend Service Won't Start**

```bash
# Check environment variables
docker-compose -f docker-compose.prod.yml exec backend env

# Check file permissions
docker-compose -f docker-compose.prod.yml exec backend ls -la

# Check for port conflicts
sudo netstat -tulpn | grep :8080

# View detailed logs
docker-compose -f docker-compose.prod.yml logs backend --tail=200
```

**3. High Memory Usage**

```bash
# Check resource usage
docker stats

# Identify memory-intensive containers
docker stats --format "table {{.Container}}\t{{.MemUsage}}" | sort -k 2 -h

# Restart container
docker-compose -f docker-compose.prod.yml restart <service-name>

# Adjust memory limits in docker-compose file
```

**4. SSL Certificate Issues**

```bash
# Check certificate expiration
openssl x509 -in certs/fullchain.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
sudo certbot renew

# Restart NGINX
docker-compose -f docker-compose.prod.yml restart nginx
```

**5. Slow API Response**

```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i slow

# Check database query performance
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U admin -d commerce_db -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check Redis performance
docker-compose -f docker-compose.prod.yml exec redis redis-cli --latency

# Monitor in real-time
docker-compose -f docker-compose.prod.yml exec backend ./api profile
```

### Emergency Contacts

- **DevOps Lead**: devops@yourplatform.com
- **Database Admin**: dba@yourplatform.com
- **Security Team**: security@yourplatform.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

### Incident Response

1. **Assess the situation**: Check logs, metrics, and user reports
2. **Notify team**: Alert relevant team members
3. **Document**: Record all actions taken
4. **Communicate**: Update status page and stakeholders
5. **Resolve**: Fix the issue or rollback
6. **Post-mortem**: Conduct review after resolution

---

## Maintenance Tasks

### Daily Tasks

```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# Check disk usage
df -h

# Review logs for errors
docker-compose -f docker-compose.prod.yml logs --since 24h | grep -i error
```

### Weekly Tasks

```bash
# Backup database
./scripts/backup-database.sh

# Update dependencies (security patches)
docker-compose -f docker-compose.prod.yml pull

# Review metrics and alerts
# Check Grafana dashboards

# Clean up old Docker images
docker system prune -a -f
```

### Monthly Tasks

```bash
# Full security audit
./scripts/security-audit.sh

# Performance optimization review
# Analyze slow queries, optimize indexes

# Capacity planning review
# Check resource usage trends

# Update SSL certificates (if needed)
sudo certbot renew
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up SSH
        uses: webfactory/ssh-agent@v0.7.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
      
      - name: Deploy to server
        run: |
          ssh user@server 'cd /app && git pull && docker-compose -f docker-compose.prod.yml up -d --build'
      
      - name: Run smoke tests
        run: |
          ssh user@server 'cd /app && ./scripts/smoke-test.sh'
```

---

## Monitoring Setup

### Prometheus Alerts

Create `monitoring/prometheus/alerts.yml`:

```yaml
groups:
  - name: commerce_platform_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 10m
        annotations:
          summary: "API response time above 2s"
```

---

This deployment guide should be reviewed and updated regularly as the platform evolves.
