# 🚀 Deploy CitadelBuy to Railway - Execute Now

**Railway CLI Version:** 4.11.1 ✅ Installed
**Date:** 2025-11-18
**Estimated Time:** 1-2 hours

---

## ⚡ Quick Deploy - Copy & Paste Commands

### Step 1: Login to Railway (1 minute)

```bash
railway login
```

**What happens:** Browser will open for GitHub authentication. Authorize Railway.

---

### Step 2: Create Railway Project (2 minutes)

```bash
cd "C:/Users/kogun/Downloads/CitadelBuy-Commerce"
railway init
```

**When prompted, enter:**
- Project name: `citadelbuy-production`
- Environment: `production`

---

### Step 3: Add PostgreSQL Database (3 minutes)

```bash
railway add --plugin postgresql
```

**What happens:** Railway provisions PostgreSQL 16 instance and generates `DATABASE_URL`

**Verify:**
```bash
railway variables --plugin postgresql
```

---

### Step 4: Add Redis Cache (2 minutes)

```bash
railway add --plugin redis
```

**What happens:** Railway provisions Redis 7 instance and generates `REDIS_URL`

**Verify:**
```bash
railway variables --plugin redis
```

---

### Step 5: Create Backend Service (15 minutes)

#### 5a. Create service
```bash
railway service create backend
```

#### 5b. Link to backend service
```bash
railway service
```
Select: `backend`

#### 5c. Set environment variables

Copy the contents of `railway-backend.env.template` to Railway:

**Option A: Via Dashboard (Recommended)**
1. Go to https://railway.app/dashboard
2. Open your project: `citadelbuy-production`
3. Click on `backend` service
4. Go to "Variables" tab
5. Click "Raw Editor"
6. Copy ALL contents from `railway-backend.env.template`
7. **UPDATE these values:**
   - `STRIPE_SECRET_KEY` → Your Stripe secret key (from Stripe Dashboard)
   - `STRIPE_WEBHOOK_SECRET` → Leave as placeholder for now, update after Step 10
   - `SENDGRID_API_KEY` → Your SendGrid API key
   - `SENTRY_DSN` → Your Sentry DSN (optional)
   - `FRONTEND_URL` → Leave as is, update after Step 8
   - `CORS_ORIGIN` → Leave as is, update after Step 8
8. Click "Save"

**Option B: Via CLI (Advanced)**
```bash
railway variables set JWT_SECRET="16f8c2981aa941adbe9c172ef924187d2466686f2271242453aa0434dc7d00333f8098fb21c935f4005f7b0426bb03162ab7f11725dcf6e6d75880e52fd02a2d"
railway variables set ADMIN_PASSWORD="5kmmQt9ygqG8mdkjWEERw@2025!"
# ... (continue with all variables)
```

#### 5d. Deploy backend from Docker Hub
```bash
railway up --service backend --docker-image citadelplatforms/citadelbuy-ecommerce:backend-latest
```

**Or via Dashboard:**
1. Backend service → Settings → Source
2. Select "Docker Image"
3. Enter: `citadelplatforms/citadelbuy-ecommerce:backend-latest`
4. Click "Deploy"

#### 5e. Get backend URL
```bash
railway domain --service backend
```

**Save this URL!** You'll need it for frontend configuration.

Example: `https://citadelbuy-backend-production-xxxx.up.railway.app`

---

### Step 6: Run Database Migrations (5 minutes)

```bash
railway run --service backend npx prisma migrate deploy
```

**Optional - Seed database with test data:**
```bash
railway run --service backend npm run db:seed
```

**Verify migrations:**
```bash
railway logs --service backend
```

Look for: "migrations applied successfully"

---

### Step 7: Create Frontend Service (10 minutes)

#### 7a. Create service
```bash
railway service create frontend
```

#### 7b. Link to frontend service
```bash
railway service
```
Select: `frontend`

#### 7c. Set environment variables

**Via Dashboard (Recommended):**
1. Go to `frontend` service in Railway Dashboard
2. Go to "Variables" tab → "Raw Editor"
3. Copy ALL contents from `railway-frontend.env.template`
4. **UPDATE these values:**
   - `NEXT_PUBLIC_API_URL` → Your backend URL from Step 5e
   - `NEXT_PUBLIC_APP_URL` → Will be updated after deployment
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Your Stripe publishable key
   - `NEXT_PUBLIC_SENTRY_DSN` → Your Sentry public DSN (optional)
5. Click "Save"

#### 7d. Deploy frontend from Docker Hub
```bash
railway up --service frontend --docker-image citadelplatforms/citadelbuy-ecommerce:frontend-latest
```

**Or via Dashboard:**
1. Frontend service → Settings → Source
2. Select "Docker Image"
3. Enter: `citadelplatforms/citadelbuy-ecommerce:frontend-latest`
4. Click "Deploy"

#### 7e. Get frontend URL
```bash
railway domain --service frontend
```

**Save this URL!** This is your production application URL.

Example: `https://citadelbuy-production-xxxx.up.railway.app`

---

### Step 8: Update CORS Settings (5 minutes)

Now update backend with the frontend URL:

```bash
railway service
```
Select: `backend`

**Via Dashboard:**
1. Go to backend service → Variables
2. Update `CORS_ORIGIN` → Your frontend URL from Step 7e
3. Update `FRONTEND_URL` → Your frontend URL from Step 7e
4. Click "Save"

**Via CLI:**
```bash
railway variables set CORS_ORIGIN="https://citadelbuy-production-xxxx.up.railway.app"
railway variables set FRONTEND_URL="https://citadelbuy-production-xxxx.up.railway.app"
```

Backend will automatically redeploy.

**Also update frontend:**
```bash
railway service
```
Select: `frontend`

**Via Dashboard:**
1. Go to frontend service → Variables
2. Update `NEXT_PUBLIC_APP_URL` → Your frontend URL from Step 7e
3. Click "Save"

---

### Step 9: Configure Stripe Webhooks (5 minutes)

#### 9a. Create webhook in Stripe
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter endpoint URL: `https://YOUR-BACKEND-URL/api/webhooks/stripe`
   (Replace `YOUR-BACKEND-URL` with URL from Step 5e)
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

#### 9b. Update backend with webhook secret
```bash
railway service
```
Select: `backend`

**Via Dashboard:**
1. Backend service → Variables
2. Update `STRIPE_WEBHOOK_SECRET` → Your webhook signing secret
3. Click "Save"

**Via CLI:**
```bash
railway variables set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE"
```

---

### Step 10: Test Deployment (10 minutes)

#### Test Backend API
```bash
curl https://YOUR-BACKEND-URL/api
```

**Expected response:**
```json
{"status":"ok","message":"CitadelBuy API is running"}
```

#### Test Admin Login
```bash
curl -X POST https://YOUR-BACKEND-URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@citadelbuy.com","password":"5kmmQt9ygqG8mdkjWEERw@2025!"}'
```

**Expected:** JWT token in response

#### Test Frontend
1. Open browser: `https://YOUR-FRONTEND-URL`
2. Verify homepage loads
3. Click "Login"
4. Login with:
   - Email: `admin@citadelbuy.com`
   - Password: `5kmmQt9ygqG8mdkjWEERw@2025!`
5. Browse products
6. Test checkout with Stripe test card: `4242 4242 4242 4242`

---

### Step 11: Enable Monitoring (5 minutes)

#### View Metrics
```bash
railway metrics --service backend
railway metrics --service frontend
```

#### View Logs
```bash
railway logs --service backend --follow
railway logs --service frontend --follow
```

#### Set up external monitoring (Optional)

**UptimeRobot (Free):**
1. Sign up: https://uptimerobot.com
2. Add monitor for frontend URL
3. Add monitor for backend `/api` endpoint
4. Configure email alerts

---

## ✅ Deployment Complete Checklist

After completing all steps, verify:

- [ ] Backend API responds at `/api` endpoint
- [ ] Frontend loads without errors
- [ ] Can login with admin credentials
- [ ] Products display correctly
- [ ] Can add items to cart
- [ ] Checkout works (Stripe test mode)
- [ ] Database has data (if seeded)
- [ ] Stripe webhooks configured
- [ ] CORS working (no console errors)
- [ ] Environment variables all set
- [ ] Services running and healthy

---

## 🎉 Production URLs

**Frontend (Customer App):**
```
https://YOUR-FRONTEND-URL.up.railway.app
```

**Backend API:**
```
https://YOUR-BACKEND-URL.up.railway.app
```

**API Documentation:**
```
https://YOUR-BACKEND-URL.up.railway.app/api/docs
```

---

## 🔐 Important Credentials

**Admin Account:**
- Email: `admin@citadelbuy.com`
- Password: `5kmmQt9ygqG8mdkjWEERw@2025!`

**JWT Secret:**
```
16f8c2981aa941adbe9c172ef924187d2466686f2271242453aa0434dc7d00333f8098fb21c935f4005f7b0426bb03162ab7f11725dcf6e6d75880e52fd02a2d
```

⚠️ **IMPORTANT:** Change admin password after first login!

---

## 📊 Expected Monthly Cost

**Railway Services:** $30-50/month
- Backend: $15-25
- Frontend: $10-15
- PostgreSQL: ~$5
- Redis: ~$5

**Check current usage:**
```bash
railway usage
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
railway logs --service backend
# Check for missing environment variables or database connection errors
```

### Frontend build fails
```bash
railway logs --service frontend
# Check NEXT_PUBLIC_API_URL is set correctly
```

### Database connection error
```bash
railway variables --service backend | grep DATABASE_URL
railway run --service backend npx prisma db push
```

### View all services
```bash
railway status
```

---

## 🔄 Deploy Updates

**Method 1: Re-deploy existing image**
```bash
railway up --service backend --docker-image citadelplatforms/citadelbuy-ecommerce:backend-latest
railway up --service frontend --docker-image citadelplatforms/citadelbuy-ecommerce:frontend-latest
```

**Method 2: Build and push new images, then deploy**
```bash
# Build new images locally
cd citadelbuy/backend
docker build -t citadelplatforms/citadelbuy-ecommerce:backend-v2.0-phase31 .
docker push citadelplatforms/citadelbuy-ecommerce:backend-v2.0-phase31

# Deploy new version
railway up --service backend --docker-image citadelplatforms/citadelbuy-ecommerce:backend-v2.0-phase31
```

---

## 📞 Support

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

**CitadelBuy:**
- Deployment Guide: `RAILWAY-DEPLOYMENT-STEPS.md`
- Checklist: `DEPLOYMENT-CHECKLIST.md`
- Environment Templates: `railway-backend.env.template`, `railway-frontend.env.template`

---

**Status:** 🟢 Ready to Execute
**Next Action:** Run Step 1 - `railway login`
