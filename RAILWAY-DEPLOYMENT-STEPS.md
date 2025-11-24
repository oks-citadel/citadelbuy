# Railway Deployment - Step-by-Step Instructions

**Platform:** Railway.app
**Estimated Time:** 1-2 hours
**Date:** 2025-11-18

---

## 🚀 Quick Start - Follow These Steps

### Pre-Deployment Checklist

Before starting, ensure you have:
- [ ] Railway account (https://railway.app - sign up with GitHub)
- [ ] Credit card for Railway (required after free trial)
- [ ] Stripe account with API keys
- [ ] SendGrid account for emails (or SMTP credentials)
- [ ] Sentry account for error tracking (optional but recommended)
- [ ] Custom domain (optional)

---

## Step 1: Create Railway Account (5 minutes)

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub
4. Complete account setup
5. Add payment method (Project Settings → Billing)

**Free Trial:** $5 credit included

---

## Step 2: Install Railway CLI (5 minutes)

Open a terminal and run:

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Verify installation
railway --version

# Login to Railway
railway login
```

This will open a browser for authentication.

---

## Step 3: Create New Project (2 minutes)

```bash
# Navigate to project directory
cd C:/Users/kogun/Downloads/CitadelBuy-Commerce

# Initialize Railway project
railway init

# When prompted:
# Project name: citadelbuy-production
# Environment: production
```

Or create via Dashboard:
1. Go to https://railway.app/dashboard
2. Click "+ New Project"
3. Select "Empty Project"
4. Name it "citadelbuy-production"

---

## Step 4: Add PostgreSQL Database (3 minutes)

### Via CLI:
```bash
railway add postgresql
```

### Via Dashboard:
1. Open your project
2. Click "+ New"
3. Select "Database"
4. Choose "PostgreSQL"
5. Railway provisions database automatically

**What happens:**
- PostgreSQL 16 instance created
- Environment variable `DATABASE_URL` auto-generated
- Automatic backups enabled

---

## Step 5: Add Redis Cache (2 minutes)

### Via CLI:
```bash
railway add redis
```

### Via Dashboard:
1. Click "+ New"
2. Select "Database"
3. Choose "Redis"

**Environment variable created:** `REDIS_URL`

---

## Step 6: Deploy Backend Service (15 minutes)

### Create Backend Service

```bash
# Create backend service
railway service create backend
```

Or via Dashboard:
1. Click "+ New"
2. Select "Empty Service"
3. Name it "backend"

### Configure Docker Image Deployment

**Option A: Deploy from Docker Hub (Recommended)**

1. Go to Railway Dashboard → backend service
2. Click "Settings"
3. Scroll to "Source"
4. Select "Docker Image"
5. Enter: `citadelplatforms/citadelbuy-ecommerce:backend-latest`
6. Click "Deploy"

**Option B: Deploy from GitHub**

1. In backend service settings
2. Click "Connect Repo"
3. Select your CitadelBuy repository
4. Set root directory: `citadelbuy/backend`
5. Railway will detect Dockerfile automatically

### Set Backend Environment Variables

1. Go to backend service → "Variables" tab
2. Click "Raw Editor"
3. Open the file: `railway-backend.env.template`
4. Copy ALL contents
5. Paste into Railway Variables editor
6. **IMPORTANT:** Update these values:
   - `STRIPE_SECRET_KEY` → Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` → Your Stripe webhook secret
   - `SENDGRID_API_KEY` → Your SendGrid API key (or remove if using SMTP)
   - `SENTRY_DSN` → Your Sentry DSN (optional)
   - `FRONTEND_URL` → Will update after frontend deployment
   - `CORS_ORIGIN` → Will update after frontend deployment

7. Railway auto-fills: `DATABASE_URL` and `REDIS_URL`
8. Click "Save"

### Configure Health Checks

1. In backend service → "Settings"
2. Scroll to "Health Check"
3. Set:
   - Path: `/api`
   - Timeout: 300 seconds
   - Interval: 60 seconds
4. Save

### Wait for Deployment

Railway will:
1. Pull Docker image
2. Start container
3. Run health checks
4. Expose service URL

**Monitor logs:** Backend service → "Logs" tab

**Get Backend URL:**
1. Backend service → "Settings" → "Networking"
2. Note the generated URL: `https://citadelbuy-backend-production-XXXX.up.railway.app`

---

## Step 7: Run Database Migrations (5 minutes)

**IMPORTANT:** Run migrations before deploying frontend

### Method A: Using Railway CLI

```bash
# Make sure you're in project directory
cd C:/Users/kogun/Downloads/CitadelBuy-Commerce

# Link to Railway project
railway link

# Select backend service
railway service

# Run migrations
railway run -s backend npx prisma migrate deploy

# Seed database (optional but recommended for testing)
railway run -s backend npm run db:seed
```

### Method B: Using Railway Dashboard

1. Go to backend service
2. Click "Settings"
3. Scroll to "Deploy"
4. Under "One-off Command", enter:
   ```
   npx prisma migrate deploy
   ```
5. Click "Run"
6. Wait for completion (check logs)

**To seed database:**
```
npm run db:seed
```

**Verify migration:**
- Check logs for "migrations applied successfully"
- Should see database tables created

---

## Step 8: Deploy Frontend Service (10 minutes)

### Create Frontend Service

```bash
railway service create frontend
```

Or via Dashboard:
1. Click "+ New"
2. Select "Empty Service"
3. Name it "frontend"

### Configure Docker Image Deployment

1. Go to frontend service → "Settings"
2. Scroll to "Source"
3. Select "Docker Image"
4. Enter: `citadelplatforms/citadelbuy-ecommerce:frontend-latest`
5. Click "Deploy"

### Set Frontend Environment Variables

1. Go to frontend service → "Variables" tab
2. Click "Raw Editor"
3. Open file: `railway-frontend.env.template`
4. Copy ALL contents
5. Paste into Railway Variables editor
6. **IMPORTANT:** Update these values:
   - `NEXT_PUBLIC_API_URL` → Your backend URL from Step 6
   - `NEXT_PUBLIC_APP_URL` → Frontend URL (will be generated, update after deploy)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Your Stripe publishable key
   - `NEXT_PUBLIC_SENTRY_DSN` → Your Sentry public DSN (optional)
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` → Your Google Analytics ID (optional)

7. Click "Save"

### Wait for Deployment

**Monitor logs:** Frontend service → "Logs" tab

**Get Frontend URL:**
1. Frontend service → "Settings" → "Networking"
2. Note the generated URL: `https://citadelbuy-production-XXXX.up.railway.app`

---

## Step 9: Update CORS Settings (5 minutes)

Now that you have the frontend URL, update backend CORS:

1. Go to backend service → "Variables"
2. Find `CORS_ORIGIN`
3. Update to your frontend URL: `https://citadelbuy-production-XXXX.up.railway.app`
4. Find `FRONTEND_URL`
5. Update to the same URL
6. Click "Save"
7. Backend will automatically redeploy

---

## Step 10: Set Up Stripe Webhooks (5 minutes)

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter endpoint URL: `https://YOUR-BACKEND-URL.up.railway.app/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Go to Railway → backend service → Variables
8. Update `STRIPE_WEBHOOK_SECRET` with the signing secret
9. Save (backend will redeploy)

---

## Step 11: Test Your Deployment (10 minutes)

### Test Backend API

```bash
# Health check
curl https://YOUR-BACKEND-URL.up.railway.app/api

# Should return:
# {"status":"ok","message":"CitadelBuy API is running"}

# Test login
curl -X POST https://YOUR-BACKEND-URL.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@citadelbuy.com","password":"5kmmQt9ygqG8mdkjWEERw@2025!"}'
```

### Test Frontend

1. Open browser: `https://YOUR-FRONTEND-URL.up.railway.app`
2. Verify homepage loads
3. Click "Login"
4. Login with admin credentials:
   - Email: `admin@citadelbuy.com`
   - Password: `5kmmQt9ygqG8mdkjWEERw@2025!`
5. Browse products
6. Add item to cart
7. Test checkout (use Stripe test card: 4242 4242 4242 4242)

---

## Step 12: Configure Custom Domain (Optional - 10 minutes)

### For Frontend

1. Go to frontend service → "Settings" → "Networking"
2. Click "Custom Domain"
3. Click "+ Add Domain"
4. Enter: `citadelbuy.com` or `www.citadelbuy.com`
5. Railway provides DNS instructions
6. Add DNS record in your domain registrar:
   ```
   Type: CNAME
   Name: www (or @)
   Value: [railway-provided-value].up.railway.app
   ```
7. Wait for DNS propagation (5-30 minutes)
8. Railway automatically provisions SSL certificate

### For Backend (API subdomain)

1. Go to backend service → "Settings" → "Networking"
2. Add domain: `api.citadelbuy.com`
3. Add DNS CNAME record:
   ```
   Type: CNAME
   Name: api
   Value: [railway-provided-value].up.railway.app
   ```

### Update Environment Variables

After custom domains are active:

**Backend:**
- `CORS_ORIGIN` → `https://citadelbuy.com`
- `FRONTEND_URL` → `https://citadelbuy.com`
- `APP_URL` → `https://api.citadelbuy.com`

**Frontend:**
- `NEXT_PUBLIC_API_URL` → `https://api.citadelbuy.com`
- `NEXT_PUBLIC_APP_URL` → `https://citadelbuy.com`

Save changes and services will redeploy.

---

## Step 13: Enable Monitoring & Alerts (5 minutes)

### Railway Built-in Monitoring

1. Each service has "Metrics" tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Network traffic
   - Response times

### Set Up Alerts

1. Go to Project Settings → "Notifications"
2. Add email or webhook
3. Configure alerts for:
   - Deployment failures
   - High error rate
   - Resource limits

### External Monitoring (Recommended)

**UptimeRobot (Free):**
1. Sign up: https://uptimerobot.com
2. Add monitor for frontend URL
3. Add monitor for backend `/api` endpoint
4. Configure email alerts

**Sentry Error Tracking:**
- Already configured if you added `SENTRY_DSN`
- Monitor errors at https://sentry.io

---

## Step 14: Final Verification Checklist

- [ ] Backend API responding (curl test passed)
- [ ] Frontend loads without errors
- [ ] Can login with admin account
- [ ] Products display correctly
- [ ] Can add items to cart
- [ ] Checkout process works (Stripe test mode)
- [ ] Email notifications work (test password reset)
- [ ] Database has seeded data
- [ ] All environment variables set correctly
- [ ] Stripe webhooks configured
- [ ] CORS configured properly
- [ ] HTTPS enabled (automatic on Railway)
- [ ] Health checks passing
- [ ] Monitoring enabled
- [ ] Backups configured (automatic on Railway)

---

## 🎉 You're Live!

Your CitadelBuy platform is now deployed on Railway!

**Production URLs:**
- **Frontend:** https://YOUR-FRONTEND-URL.up.railway.app
- **Backend API:** https://YOUR-BACKEND-URL.up.railway.app
- **API Docs:** https://YOUR-BACKEND-URL.up.railway.app/api/docs (if enabled)

**Admin Credentials:**
- Email: `admin@citadelbuy.com`
- Password: `5kmmQt9ygqG8mdkjWEERw@2025!`

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

---

## 📊 Cost Monitoring

### Check Usage

1. Go to Project → "Usage" tab
2. Monitor monthly costs
3. Set up billing alerts

**Expected Monthly Cost:** $30-50

**Breakdown:**
- Backend service: $15-25
- Frontend service: $10-15
- PostgreSQL: ~$5 (included in tier)
- Redis: ~$5 (included in tier)

---

## 🔧 Maintenance & Updates

### Deploy Updates

**Method 1: Automatic (from GitHub)**
- Push code to GitHub
- Railway auto-deploys

**Method 2: Manual (Docker Hub)**
1. Build new Docker images
2. Push to Docker Hub with new tag
3. Update service to use new tag
4. Redeploy

**Method 3: CLI**
```bash
railway up -s backend
railway up -s frontend
```

### View Logs

```bash
# Backend logs
railway logs -s backend

# Frontend logs
railway logs -s frontend

# Follow live logs
railway logs -s backend --follow
```

### Database Backup

Automatic backups enabled by Railway (daily, retained 7 days).

**Manual backup:**
```bash
railway run -s backend pg_dump > backup.sql
```

---

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check logs
railway logs -s backend

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port binding issues
```

### Frontend Build Fails

```bash
# Check logs
railway logs -s frontend

# Common issues:
# - API URL not set
# - Build timeout (increase in settings)
# - Out of memory
```

### Database Connection Error

```bash
# Verify DATABASE_URL is set
railway variables -s backend

# Test connection
railway run -s backend npx prisma db push
```

---

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **CitadelBuy Docs:** See `/docs` folder

---

**Deployment Guide Version:** 1.0
**Last Updated:** 2025-11-18
**Status:** Ready to Deploy ✅

**Next Steps:** Execute steps 1-14 above to deploy your application!
