# Railway Deployment Guide for CitadelBuy

**Platform:** Railway.app
**Deployment Type:** Docker-based
**Estimated Time:** 1-2 hours
**Difficulty:** ⭐ Easy
**Cost:** $30-50/month

---

## 🎯 Overview

This guide will walk you through deploying the CitadelBuy e-commerce platform to Railway using your existing Docker images.

### What You'll Deploy
- ✅ Backend API (NestJS) - Docker image from Docker Hub
- ✅ Frontend (Next.js) - Docker image from Docker Hub
- ✅ PostgreSQL Database - Railway managed service
- ✅ Redis Cache - Railway managed service

---

## 📋 Prerequisites

### Required
- [ ] Railway account (sign up at https://railway.app)
- [ ] GitHub account with CitadelBuy repository
- [ ] Docker Hub account with published images
- [ ] Stripe account (test and production keys)
- [ ] Credit card (for Railway - free trial available)

### Optional but Recommended
- [ ] Custom domain name
- [ ] SendGrid account (for emails)
- [ ] Sentry account (for error tracking)

---

## 🚀 Deployment Steps

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended) or email
4. Verify your email address
5. Add payment method (required after free trial)

**Free Trial:**
- $5 credit
- No credit card required initially
- Upgrade to continue after credit runs out

---

### Step 2: Create New Project

```bash
# Option A: Using Railway CLI (Recommended)
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init
# Enter project name: citadelbuy-production

# Option B: Using Railway Dashboard
# 1. Click "New Project"
# 2. Choose "Empty Project"
# 3. Name it "citadelbuy-production"
```

---

### Step 3: Add PostgreSQL Database

#### Via CLI:
```bash
railway add postgresql
```

#### Via Dashboard:
1. Click "+ New" in your project
2. Select "Database"
3. Choose "PostgreSQL"
4. Railway will automatically provision the database

**What Happens:**
- PostgreSQL 16 instance created
- Environment variable `DATABASE_URL` auto-generated
- Connection string includes SSL
- Automatic backups enabled

**Note the connection string:**
```
postgresql://postgres:[password]@[host]:5432/railway
```

---

### Step 4: Add Redis Cache

#### Via CLI:
```bash
railway add redis
```

#### Via Dashboard:
1. Click "+ New"
2. Select "Database"
3. Choose "Redis"

**Environment variable created:**
```
REDIS_URL=redis://default:[password]@[host]:6379
```

---

### Step 5: Deploy Backend API

#### Create Backend Service

```bash
# Create a new service for backend
railway service create backend
```

Or via Dashboard:
1. Click "+ New"
2. Select "Empty Service"
3. Name it "backend"

#### Configure Backend Deployment

**Option A: Deploy from Docker Hub**

1. In Railway Dashboard, go to backend service
2. Click "Settings"
3. Under "Source", select "Docker Image"
4. Enter image: `citadelplatforms/citadelbuy-ecommerce:backend-latest`
5. Click "Deploy"

**Option B: Deploy from GitHub (Alternative)**

```bash
# Link GitHub repository
railway link

# Deploy backend
railway up -s backend
```

#### Set Backend Environment Variables

Click "Variables" tab in backend service and add:

```bash
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_LOGGING=false
DATABASE_POOL_SIZE=10

# Application
NODE_ENV=production
PORT=4000
APP_URL=https://citadelbuy-backend.up.railway.app
FRONTEND_URL=https://citadelbuy.up.railway.app
API_PREFIX=api

# JWT Authentication
JWT_SECRET=[generate-secure-random-string]
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=[your-stripe-secret-key]
STRIPE_WEBHOOK_SECRET=[your-stripe-webhook-secret]
STRIPE_API_VERSION=2023-10-16
CURRENCY=USD

# Email (SendGrid)
SENDGRID_API_KEY=[your-sendgrid-api-key]
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=CitadelBuy
EMAIL_ENABLED=true

# Redis
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_ENABLED=true
CACHE_TTL=3600

# Security & CORS
CORS_ENABLED=true
CORS_ORIGIN=https://citadelbuy.up.railway.app
RATE_LIMIT_ENABLED=true
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging & Monitoring
LOG_LEVEL=info
LOG_PRETTY=false
SENTRY_DSN=[your-sentry-dsn]
SENTRY_ENVIRONMENT=production
SENTRY_ENABLED=true

# Admin
ADMIN_EMAIL=admin@citadelbuy.com
ADMIN_PASSWORD=[change-this-strong-password]

# Feature Flags (all true for production)
FEATURE_BNPL_ENABLED=true
FEATURE_GIFT_CARDS_ENABLED=true
FEATURE_LOYALTY_ENABLED=true
FEATURE_SUBSCRIPTIONS_ENABLED=true
FEATURE_DEALS_ENABLED=true
FEATURE_WISHLIST_ENABLED=true
FEATURE_REVIEWS_ENABLED=true

# Development Settings (disable in production)
SWAGGER_ENABLED=false
DEBUG=false
AUTO_SEED_DATABASE=false
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Configure Health Checks

1. Go to "Settings" → "Health Checks"
2. Set path: `/api`
3. Set interval: 60 seconds
4. Set timeout: 10 seconds

---

### Step 6: Run Database Migrations

**Option A: Using Railway CLI**

```bash
# Connect to your project
railway link

# Run migrations
railway run npx prisma migrate deploy
```

**Option B: Using One-off Command in Dashboard**

1. Go to backend service
2. Click "Settings"
3. Scroll to "Deploy"
4. Under "Run Once", enter:
   ```bash
   npx prisma migrate deploy
   ```
5. Click "Run Command"

**Seed Database (Optional):**
```bash
railway run npm run db:seed
```

---

### Step 7: Deploy Frontend

#### Create Frontend Service

```bash
railway service create frontend
```

Or via Dashboard:
1. Click "+ New"
2. Select "Empty Service"
3. Name it "frontend"

#### Configure Frontend Deployment

1. In Railway Dashboard, go to frontend service
2. Click "Settings"
3. Under "Source", select "Docker Image"
4. Enter image: `citadelplatforms/citadelbuy-ecommerce:frontend-latest`
5. Set port: `3000`
6. Click "Deploy"

#### Set Frontend Environment Variables

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://[your-backend-url].up.railway.app
NEXT_PUBLIC_APP_URL=https://[your-frontend-url].up.railway.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your-stripe-publishable-key]

# Application
NEXT_PUBLIC_APP_NAME=CitadelBuy
NEXT_PUBLIC_CURRENCY=USD
NEXT_PUBLIC_DEFAULT_LANGUAGE=en

# Feature Flags
NEXT_PUBLIC_FEATURE_BNPL_ENABLED=true
NEXT_PUBLIC_FEATURE_GIFT_CARDS_ENABLED=true
NEXT_PUBLIC_FEATURE_LOYALTY_ENABLED=true
NEXT_PUBLIC_FEATURE_SUBSCRIPTIONS_ENABLED=true
NEXT_PUBLIC_FEATURE_DEALS_ENABLED=true
NEXT_PUBLIC_FEATURE_WISHLIST_ENABLED=true
NEXT_PUBLIC_FEATURE_REVIEWS_ENABLED=true

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=[your-ga-id]
NEXT_PUBLIC_SENTRY_DSN=[your-sentry-public-dsn]
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
NODE_ENV=production
```

---

### Step 8: Configure Custom Domains (Optional)

#### Backend Domain

1. Go to backend service → "Settings" → "Networking"
2. Click "Generate Domain" (Railway provides: `*.up.railway.app`)
3. Or add custom domain:
   - Click "Add Custom Domain"
   - Enter: `api.yourdomain.com`
   - Add CNAME record in your DNS:
     ```
     CNAME api.yourdomain.com → [railway-domain].up.railway.app
     ```

#### Frontend Domain

1. Go to frontend service → "Settings" → "Networking"
2. Add custom domain: `yourdomain.com` or `www.yourdomain.com`
3. Add DNS records:
   ```
   CNAME www.yourdomain.com → [railway-domain].up.railway.app
   # Or for root domain:
   ALIAS yourdomain.com → [railway-domain].up.railway.app
   ```

**SSL Certificates:**
- Railway automatically provisions SSL certificates
- HTTPS enabled by default
- Certificates auto-renew

---

### Step 9: Verify Deployment

#### Test Backend

```bash
# Health check
curl https://your-backend.up.railway.app/api

# Should return:
# {"status":"ok","message":"CitadelBuy API is running"}

# Test authentication
curl -X POST https://your-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@citadelbuy.com","password":"your-password"}'
```

#### Test Frontend

1. Open browser to: `https://your-frontend.up.railway.app`
2. Verify homepage loads
3. Try logging in with admin credentials
4. Test product browsing
5. Test cart and checkout (use Stripe test cards)

---

### Step 10: Set Up Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://your-backend.up.railway.app/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy webhook signing secret
6. Add to Railway backend environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## 🔧 Post-Deployment Configuration

### 1. Set Up Monitoring

**Railway Built-in Metrics:**
- CPU usage
- Memory usage
- Network traffic
- Response times

**Access:** Each service → "Metrics" tab

**Sentry Integration:**
1. Create Sentry project
2. Add DSN to environment variables (already done)
3. Monitor errors in Sentry dashboard

### 2. Configure Backups

**Database Backups (Automatic):**
- Railway automatically backs up PostgreSQL
- Daily snapshots retained for 7 days
- Access: Database service → "Backups"

**Manual Backup:**
```bash
# Export database
railway run pg_dump > backup.sql

# Import database
railway run psql < backup.sql
```

### 3. Set Up Logging

**View Logs:**
```bash
# Via CLI
railway logs -s backend
railway logs -s frontend

# Via Dashboard
# Each service → "Logs" tab
```

**Log Retention:**
- Railway retains logs for 7 days
- For longer retention, integrate with external service (Datadog, LogRocket)

### 4. Configure Auto-Scaling

1. Go to service → "Settings" → "Resources"
2. Set instance limits:
   - Min instances: 1
   - Max instances: 3-5 (adjust based on traffic)
3. Enable horizontal scaling

**Pricing Impact:**
- Each instance is billed separately
- Monitor costs in "Usage" tab

---

## 💰 Cost Optimization

### Current Estimated Cost: $30-50/month

**Breakdown:**
- Backend service: $15-25
- Frontend service: $10-15
- PostgreSQL: $5-10 (included in base plan)
- Redis: $5 (included in base plan)

### Tips to Reduce Costs

1. **Right-size Resources:**
   - Start with smaller instances
   - Scale up as traffic grows

2. **Enable Sleep Mode (Dev/Staging):**
   - Sleep after 1 hour of inactivity
   - Only pay when active

3. **Optimize Docker Images:**
   - Use multi-stage builds (already done ✅)
   - Remove unnecessary dependencies

4. **Monitor Usage:**
   - Check "Usage" tab weekly
   - Set up billing alerts

5. **Use Free Tier Strategically:**
   - Development projects on free tier
   - Production on paid plan

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: Database connection failed**
```bash
# Check DATABASE_URL variable
railway variables -s backend

# Verify PostgreSQL is running
railway status

# Test connection
railway run npx prisma db push
```

**Error: Port already in use**
```bash
# Railway automatically sets PORT
# Don't hardcode PORT=4000 in Dockerfile
# Use: ENV PORT=4000 or let Railway set it
```

### Frontend Build Fails

**Error: API_URL not defined**
```bash
# Ensure NEXT_PUBLIC_API_URL is set
railway variables -s frontend

# Redeploy
railway up -s frontend
```

### Database Migration Issues

**Error: Migration failed**
```bash
# Reset database (WARNING: Deletes all data!)
railway run npx prisma migrate reset

# Or force migration
railway run npx prisma migrate deploy --force
```

### High Costs

**Unexpected charges?**
1. Check "Usage" tab
2. Look for runaway processes
3. Reduce instance sizes
4. Enable sleep mode for non-production

---

## 🔄 CI/CD Setup

### Automatic Deployments from GitHub

1. In Railway dashboard, go to service
2. Click "Settings" → "Source"
3. Select "GitHub Repo"
4. Connect repository
5. Choose branch (e.g., `main`)
6. Set build command (if needed)
7. Set start command (if needed)

**Auto-deploy Triggers:**
- Push to connected branch
- Manual redeploy from dashboard
- CLI: `railway up`

**Deployment Workflow:**
```
1. Push code to GitHub
   ↓
2. Railway detects change
   ↓
3. Pulls latest code
   ↓
4. Builds Docker image
   ↓
5. Runs health checks
   ↓
6. Routes traffic to new version
   ↓
7. Deployment complete!
```

---

## 📊 Monitoring & Alerts

### Built-in Monitoring

**Metrics Available:**
- Request count
- Error rate
- Response time (p50, p95, p99)
- CPU usage
- Memory usage
- Network I/O

**Access:**
- Dashboard → Service → "Metrics"
- Time range: 1h, 24h, 7d, 30d

### Set Up Alerts

1. Go to Project Settings
2. Click "Notifications"
3. Add webhook or email
4. Configure alert rules:
   - High error rate
   - High CPU usage
   - Deployment failures

### External Monitoring

**Recommended Tools:**
- **Uptime:** UptimeRobot (free tier available)
- **APM:** New Relic, Datadog
- **Logs:** Logtail, Papertrail
- **Errors:** Sentry (already configured)

---

## 🔐 Security Checklist

- [x] Environment variables properly set
- [x] JWT secret is strong and unique
- [x] Database uses SSL connections
- [x] HTTPS enabled (automatic on Railway)
- [x] CORS configured for frontend domain only
- [x] Rate limiting enabled
- [x] Swagger disabled in production
- [x] Admin password changed from default
- [x] Stripe webhook secret configured
- [x] Sentry error tracking enabled
- [ ] Set up WAF (optional - CloudFlare)
- [ ] Enable 2FA on Railway account
- [ ] Rotate secrets regularly
- [ ] Review access logs periodically

---

## 📚 Additional Resources

### Railway Documentation
- Quick Start: https://docs.railway.app/getting-started
- Deployments: https://docs.railway.app/deploy/deployments
- Databases: https://docs.railway.app/databases/postgresql
- CLI Reference: https://docs.railway.app/develop/cli

### CitadelBuy Documentation
- [Environment Variables Guide](ENVIRONMENT_VARIABLES.md)
- [Development Setup](../DEV-ENVIRONMENT-SETUP.md)
- [Phase 30 Deployment Plan](../PHASE-30-DEPLOYMENT.md)

### Support
- Railway Community: https://discord.gg/railway
- Railway Status: https://status.railway.app
- Railway Help: https://help.railway.app

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Railway account created
- [ ] Payment method added
- [ ] Docker images pushed to Docker Hub
- [ ] Stripe keys obtained (test + production)
- [ ] SendGrid API key obtained
- [ ] Domain name purchased (optional)

### Deployment
- [ ] PostgreSQL database created
- [ ] Redis cache created
- [ ] Backend service deployed
- [ ] Frontend service deployed
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Database seeded (optional)
- [ ] Health checks passing

### Post-Deployment
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] Stripe webhooks configured
- [ ] Monitoring set up
- [ ] Backups verified
- [ ] Logging configured
- [ ] Alerts configured
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Documentation updated

### Go-Live
- [ ] Test all user flows
- [ ] Verify payments work (Stripe test mode)
- [ ] Check email delivery
- [ ] Test mobile responsiveness
- [ ] Run security scan
- [ ] Announce launch! 🎉

---

## 🎉 You're Live!

Congratulations! Your CitadelBuy e-commerce platform is now live on Railway.

**Next Steps:**
1. Monitor the first 24 hours closely
2. Watch for any errors in Sentry
3. Check performance metrics
4. Gather user feedback
5. Plan first updates

**Ongoing Maintenance:**
- Weekly: Review logs and metrics
- Monthly: Check costs and optimize
- Quarterly: Security audit
- As needed: Deploy updates via GitHub

---

**Deployment Guide Version:** 1.0
**Last Updated:** 2025-11-18
**Platform:** Railway.app
**Status:** Production Ready ✅

---

**Need Help?** Contact Railway support or review the troubleshooting section above.

**Happy Deploying! 🚀**
