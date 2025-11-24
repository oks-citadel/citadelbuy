# CitadelBuy E-Commerce Platform - Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-16
**Target:** Production Deployment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Docker Deployment](#docker-deployment)
6. [Manual Deployment](#manual-deployment)
7. [Kubernetes Deployment](#kubernetes-deployment)
8. [Post-Deployment](#post-deployment)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Rollback Procedures](#rollback-procedures)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js:** v20.x or higher
- **PostgreSQL:** v15.x or higher
- **Docker:** v24.x or higher (for Docker deployment)
- **Docker Compose:** v2.x or higher
- **Git:** Latest version

### Required Accounts
- **Stripe Account:** For payment processing
- **Domain Name:** For production hosting
- **SSL Certificate:** For HTTPS (Let's Encrypt or commercial)
- **Email Service:** (Optional) For notifications
- **Error Monitoring:** (Optional) Sentry account

### Server Requirements

**Minimum (Small Scale):**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 100 Mbps

**Recommended (Production):**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- Network: 1 Gbps
- Load Balancer: Yes

---

## Pre-Deployment Checklist

### Security Checklist

- [ ] All environment variables configured
- [ ] JWT_SECRET is strong and random (min 32 characters)
- [ ] Database passwords are strong
- [ ] SSL/TLS certificates obtained
- [ ] CORS configured for production domains only
- [ ] Rate limiting configured appropriately
- [ ] Helmet.js security headers enabled
- [ ] CSRF protection enabled
- [ ] Firewall rules configured
- [ ] Database backups configured
- [ ] Secrets stored securely (not in code)

### Code Checklist

- [ ] All tests passing (`npm test`)
- [ ] No ESLint errors
- [ ] Type checking passes
- [ ] Production build succeeds
- [ ] Dependencies up to date
- [ ] No critical npm audit vulnerabilities
- [ ] Database migrations ready
- [ ] Seed data prepared (if needed)

### Infrastructure Checklist

- [ ] Database server ready
- [ ] Application server ready
- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Load balancer configured (if applicable)
- [ ] CDN configured (if applicable)
- [ ] Monitoring tools set up
- [ ] Backup solution configured
- [ ] Disaster recovery plan documented

---

## Environment Setup

### 1. Backend Environment Variables

Create `.env` file in `citadelbuy/backend/`:

```bash
# Copy from template
cp .env.example .env

# Edit with production values
nano .env
```

**Critical Production Settings:**

```bash
# Application
NODE_ENV=production
PORT=4000

# Database (use SSL in production)
DATABASE_URL=postgresql://user:password@prod-db-host:5432/citadelbuy_prod?sslmode=require

# JWT (generate strong secret)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_EXPIRATION=1h

# Stripe (use production keys)
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# CORS (production domains only)
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Error Monitoring (highly recommended)
SENTRY_DSN=https://your-sentry-key@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

### 2. Frontend Environment Variables

Create `.env.production` in `citadelbuy/frontend/`:

```bash
NEXT_PUBLIC_API_URL=https://api.citadelbuy.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_key
```

---

## Database Setup

### 1. Create Production Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE citadelbuy_prod;

-- Create user
CREATE USER citadelbuy_user WITH ENCRYPTED PASSWORD 'strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE citadelbuy_prod TO citadelbuy_user;

-- Enable required extensions
\c citadelbuy_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Run Migrations

```bash
cd citadelbuy/backend

# Set DATABASE_URL
export DATABASE_URL="postgresql://citadelbuy_user:password@host:5432/citadelbuy_prod"

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### 3. Seed Database (Optional)

```bash
# Seed initial data (categories, admin user, etc.)
npx prisma db seed
```

### 4. Create Admin User

```bash
# Option 1: Via seed script
# Edit prisma/seed.ts and run: npx prisma db seed

# Option 2: Manually via SQL
psql -U citadelbuy_user -d citadelbuy_prod -c "
INSERT INTO users (id, email, password, name, role)
VALUES (
  gen_random_uuid(),
  'admin@citadelbuy.com',
  '\$2b\$10\$YourBcryptHashedPasswordHere',
  'Admin User',
  'ADMIN'
);
"
```

---

## Docker Deployment

### 1. Build Images

```bash
# Build backend
cd citadelbuy/backend
docker build -t citadelbuy-backend:latest .

# Build frontend
cd citadelbuy/frontend
docker build -t citadelbuy-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.citadelbuy.com \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... \
  .
```

### 2. Docker Compose Deployment

```bash
# From project root
cd CitadelBuy-Commerce

# Create .env file with production values
cp .env.example .env
nano .env

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Verify Deployment

```bash
# Check backend health
curl https://api.citadelbuy.com/health

# Check frontend
curl https://citadelbuy.com

# Check database connection
docker-compose -f docker-compose.prod.yml exec backend \
  npx prisma db push --accept-data-loss=false
```

---

## Manual Deployment

### 1. Backend Deployment

```bash
# On production server
cd /var/www/citadelbuy/backend

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Start with PM2
pm2 start dist/main.js --name citadelbuy-backend \
  --env production \
  --max-memory-restart 500M

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### 2. Frontend Deployment

```bash
# On production server
cd /var/www/citadelbuy/frontend

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start npm --name citadelbuy-frontend -- start

# Save configuration
pm2 save
```

### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/citadelbuy

# Backend API
server {
    listen 443 ssl http2;
    server_name api.citadelbuy.com;

    ssl_certificate /etc/letsencrypt/live/api.citadelbuy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.citadelbuy.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 443 ssl http2;
    server_name citadelbuy.com www.citadelbuy.com;

    ssl_certificate /etc/letsencrypt/live/citadelbuy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/citadelbuy.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name citadelbuy.com www.citadelbuy.com api.citadelbuy.com;
    return 301 https://$server_name$request_uri;
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/citadelbuy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Kubernetes Deployment

### 1. Create Kubernetes Manifests

**Backend Deployment:**

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: citadelbuy-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: citadelbuy-backend
  template:
    metadata:
      labels:
        app: citadelbuy-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/your-org/citadelbuy-backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: citadelbuy-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: citadelbuy-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace citadelbuy

# Create secrets
kubectl create secret generic citadelbuy-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="your-secret" \
  --namespace=citadelbuy

# Apply manifests
kubectl apply -f k8s/ --namespace=citadelbuy

# Check deployment
kubectl get pods --namespace=citadelbuy
kubectl get services --namespace=citadelbuy

# View logs
kubectl logs -f deployment/citadelbuy-backend --namespace=citadelbuy
```

---

## Post-Deployment

### 1. Smoke Tests

```bash
# Test backend health
curl https://api.citadelbuy.com/health

# Test authentication
curl -X POST https://api.citadelbuy.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test products endpoint
curl https://api.citadelbuy.com/products

# Test frontend
curl https://citadelbuy.com
```

### 2. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.citadelbuy.com/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook secret to `.env`

### 3. Set Up Monitoring

```bash
# Configure Sentry
# Add SENTRY_DSN to environment variables

# Set up uptime monitoring
# - Pingdom
# - UptimeRobot
# - StatusCake

# Configure log aggregation
# - LogRocket
# - Datadog
# - ELK Stack
```

### 4. Database Backups

```bash
# Configure automated backups
# Option 1: PostgreSQL pg_dump
0 2 * * * pg_dump -U citadelbuy_user citadelbuy_prod | gzip > /backups/citadelbuy_$(date +\%Y\%m\%d).sql.gz

# Option 2: Use cloud provider snapshots (AWS RDS, etc.)

# Test restore procedure
pg_restore -U citadelbuy_user -d citadelbuy_test /backups/latest.sql.gz
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Application Metrics:**
   - Response time (p50, p95, p99)
   - Error rate
   - Request rate
   - Active connections

2. **Infrastructure Metrics:**
   - CPU usage
   - Memory usage
   - Disk space
   - Network I/O

3. **Database Metrics:**
   - Query performance
   - Connection pool usage
   - Slow queries
   - Lock contention

4. **Business Metrics:**
   - Order conversion rate
   - Payment success rate
   - User registrations
   - Revenue

### Maintenance Tasks

**Daily:**
- Check error logs
- Monitor key metrics
- Verify backups completed

**Weekly:**
- Review performance metrics
- Update dependencies (security patches)
- Analyze slow queries

**Monthly:**
- Full security audit
- Database optimization
- Capacity planning review
- Disaster recovery drill

---

## Rollback Procedures

### Docker Rollback

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Pull previous images
docker pull citadelbuy-backend:previous-tag
docker pull citadelbuy-frontend:previous-tag

# Start with previous version
docker-compose -f docker-compose.prod.yml up -d
```

### PM2 Rollback

```bash
# Backend rollback
cd /var/www/citadelbuy/backend
git checkout HEAD~1
npm ci
npm run build
pm2 restart citadelbuy-backend

# Frontend rollback
cd /var/www/citadelbuy/frontend
git checkout HEAD~1
npm ci
npm run build
pm2 restart citadelbuy-frontend
```

### Database Rollback

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>

# Restore from backup
pg_restore -U citadelbuy_user -d citadelbuy_prod /backups/pre-deployment.sql
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**

```bash
# Check database is running
systemctl status postgresql

# Check connection string
echo $DATABASE_URL

# Test connection
psql "postgresql://user:pass@host:5432/db"

# Check firewall
sudo ufw status
```

**2. Backend Not Starting**

```bash
# Check logs
pm2 logs citadelbuy-backend

# Check environment variables
pm2 env citadelbuy-backend

# Check port availability
sudo netstat -tulpn | grep :4000

# Restart service
pm2 restart citadelbuy-backend
```

**3. High Memory Usage**

```bash
# Check memory usage
pm2 monit

# Restart with lower memory limit
pm2 restart citadelbuy-backend --max-memory-restart 300M

# Enable cluster mode
pm2 start dist/main.js -i max --name citadelbuy-backend
```

**4. SSL Certificate Issues**

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Test SSL configuration
sudo nginx -t

# Check certificate expiry
echo | openssl s_client -servername citadelbuy.com -connect citadelbuy.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Support & Documentation

- **API Documentation:** https://api.citadelbuy.com/docs
- **Status Page:** https://status.citadelbuy.com
- **Support Email:** support@citadelbuy.com
- **GitHub Repository:** https://github.com/your-org/citadelbuy

---

## Deployment Timeline

**Estimated Deployment Time:** 2-4 hours

1. **Pre-deployment:** 30-60 minutes
   - Environment setup
   - Security checks
   - Database preparation

2. **Deployment:** 30-60 minutes
   - Code deployment
   - Database migrations
   - Service startup

3. **Post-deployment:** 30-60 minutes
   - Smoke tests
   - Monitoring setup
   - Documentation

4. **Monitoring:** 1-2 hours
   - Initial monitoring
   - Performance verification
   - Issue resolution

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying the CitadelBuy e-commerce platform to production. Follow the checklists carefully and test thoroughly at each step.

For questions or issues, contact the development team or refer to the troubleshooting section.

**Good luck with your deployment! 🚀**

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-16
**Next Review:** 2025-12-16
