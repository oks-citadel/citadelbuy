# 🚀 CitadelBuy Production Deployment Guide - Railway

**Date:** 2025-11-20
**Status:** Ready for Deployment
**Platform:** Railway
**Estimated Time:** 1-2 hours

---

## 📋 Pre-Deployment Checklist

### ✅ Completed Prerequisites
- [x] Docker images built and pushed to Docker Hub
- [x] Railway CLI installed (v4.11.1)
- [x] Environment variables prepared
- [x] Database migrations ready
- [x] Production secrets generated
- [x] Documentation complete

### ⏳ Pending Steps
- [ ] Railway authentication
- [ ] Project creation
- [ ] Database setup
- [ ] Backend deployment
- [ ] Frontend deployment
- [ ] Production verification

---

## 🔐 Step 1: Railway Authentication

### Login to Railway
```bash
railway login
```

This will:
1. Open your browser
2. Prompt you to authorize Railway CLI
3. Return you to the terminal when complete

**Note:** If you don't have a Railway account:
- Go to https://railway.app
- Sign up (free tier available)
- GitHub authentication recommended

---

## 📦 Step 2: Create Railway Project

### Option A: Create New Project (Recommended)
```bash
# Initialize new Railway project
railway init

# Follow the prompts:
# - Project name: citadelbuy
# - Start with: Empty project
```

### Option B: Link Existing Project
```bash
# If you already created a project on Railway dashboard
railway link
```

---

## 🗄️ Step 3: Set Up PostgreSQL Database

### Add PostgreSQL to your project:
```bash
# This creates a PostgreSQL instance on Railway
railway add --database postgres

# Railway will automatically:
# - Create a PostgreSQL 15 instance
# - Generate DATABASE_URL
# - Make it available as ${{Postgres.DATABASE_URL}}
```

### Optional: Add Redis (for caching)
```bash
railway add --database redis
```

---

## 🔧 Step 4: Configure Environment Variables

### Backend Environment Variables

#### Method 1: Via Railway Dashboard (Recommended)
1. Go to https://railway.app
2. Select your project
3. Click on "Backend" service
4. Go to "Variables" tab
5. Copy all variables from `railway-backend.env.template`

#### Method 2: Via CLI
```bash
# Set critical variables
railway variables set NODE_ENV=production
railway variables set PORT=4000
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'
railway variables set JWT_SECRET='16f8c2981aa941adbe9c172ef924187d2466686f2271242453aa0434dc7d00333f8098fb21c935f4005f7b0426bb03162ab7f11725dcf6e6d75880e52fd02a2d'
railway variables set ADMIN_PASSWORD='5kmmQt9ygqG8mdkjWEERw@2025!'

# Stripe (Replace with your actual keys)
railway variables set STRIPE_SECRET_KEY='sk_live_YOUR_KEY_HERE'
railway variables set STRIPE_WEBHOOK_SECRET='whsec_YOUR_SECRET_HERE'

# CORS (Will update after frontend deployment)
railway variables set CORS_ORIGIN='https://citadelbuy.up.railway.app'
railway variables set FRONTEND_URL='https://citadelbuy.up.railway.app'
```

### Frontend Environment Variables
```bash
# Will be set after backend is deployed
railway variables set NEXT_PUBLIC_API_URL='https://citadelbuy-backend.up.railway.app/api'
railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_live_YOUR_KEY_HERE'
```

---

## 🚢 Step 5: Deploy Backend

### Deploy from Docker Hub (Faster)
```bash
cd citadelbuy/backend

# Deploy using pre-built Docker image
railway up --detach

# Railway will:
# - Pull from Docker Hub: citadelplatforms/citadelbuy-ecommerce:backend-latest
# - Deploy to production
# - Generate a public URL
```

### Check Deployment Status
```bash
railway status

# View logs
railway logs
```

### Get Backend URL
```bash
railway domain

# Example output: citadelbuy-backend.up.railway.app
```

---

## 🗃️ Step 6: Run Database Migrations

### Execute migrations on production database:
```bash
# Run migrations
railway run npm run migrate:deploy

# Seed production data
railway run npm run db:seed:prod
```

### Verify Database
```bash
# Check migration status
railway run npx prisma migrate status

# Expected output:
# Database schema is up to date!
```

---

## 🎨 Step 7: Deploy Frontend

### Update Frontend Environment Variables
```bash
cd ../frontend

# Set backend API URL (use the URL from Step 5)
railway variables set NEXT_PUBLIC_API_URL='https://your-backend-url.railway.app/api'

# Deploy frontend
railway up --detach
```

### Get Frontend URL
```bash
railway domain

# Example output: citadelbuy.up.railway.app
```

---

## 🔄 Step 8: Update CORS Configuration

### Update backend CORS to allow frontend domain:
```bash
cd ../backend

# Update CORS origin with actual frontend URL
railway variables set CORS_ORIGIN='https://citadelbuy.up.railway.app'
railway variables set FRONTEND_URL='https://citadelbuy.up.railway.app'

# Restart backend to apply changes
railway restart
```

---

## ✅ Step 9: Verify Deployment

### Backend Health Check
```bash
# Test backend health endpoint
curl https://your-backend-url.railway.app/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-20T...","database":"connected"}
```

### Frontend Check
```bash
# Open frontend in browser
curl https://your-frontend-url.railway.app

# Or visit in browser
```

### Database Check
```bash
# Test database connection
railway run npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users;"

# Should return admin user count
```

### API Test
```bash
# Test API endpoints
curl https://your-backend-url.railway.app/api/health
curl https://your-backend-url.railway.app/api/categories
curl https://your-backend-url.railway.app/api/products
```

---

## 🔒 Step 10: Security Configuration

### Enable HTTPS
✅ **Automatic** - Railway provides SSL/HTTPS by default

### Set Up Stripe Webhooks
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-backend-url.railway.app/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret
5. Update Railway variable: `STRIPE_WEBHOOK_SECRET`

### Configure SendGrid (Email)
1. Get SendGrid API key from https://sendgrid.com
2. Update Railway variable: `SENDGRID_API_KEY`
3. Verify sender email in SendGrid

---

## 📊 Step 11: Set Up Monitoring

### Railway Built-in Monitoring
- Go to Railway dashboard
- View metrics: CPU, Memory, Network
- Set up alerts for downtime

### Optional: Sentry (Recommended)
```bash
# Create free Sentry account at https://sentry.io
# Get your DSN

# Update Railway variables
railway variables set SENTRY_DSN='https://your-dsn@sentry.io/project-id'
railway variables set SENTRY_ENABLED=true
railway variables set SENTRY_ENVIRONMENT=production
```

### Optional: Uptime Monitoring
- Set up UptimeRobot: https://uptimerobot.com (Free)
- Monitor: `https://your-backend-url.railway.app/api/health`
- Get alerts via email/SMS

---

## 🌐 Step 12: Custom Domain (Optional)

### Add Custom Domain
```bash
# Via CLI
railway domain add yourdomain.com

# Or via Dashboard:
# 1. Go to project settings
# 2. Click "Domains"
# 3. Add custom domain
# 4. Update DNS records as shown
```

### DNS Configuration
Add these DNS records to your domain:
```
Type: CNAME
Name: @
Value: your-app.railway.app
TTL: 3600
```

---

## 🔄 Step 13: Set Up Continuous Deployment

### Connect GitHub Repository
1. Go to Railway dashboard
2. Select your service
3. Click "Settings" > "Source"
4. Connect GitHub repository
5. Select branch: `main`

### Auto-Deploy on Push
Railway will automatically:
- Detect changes to `main` branch
- Build Docker images
- Deploy updates
- Zero-downtime deployments

---

## 🧪 Step 14: Testing Checklist

### Functional Tests
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Product browsing works
- [ ] Add to cart works
- [ ] Checkout process works
- [ ] Payment processing works (test mode)
- [ ] Order confirmation received
- [ ] Admin login works
- [ ] Admin dashboard accessible

### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 200ms
- [ ] Database queries optimized
- [ ] Images loading correctly
- [ ] Mobile responsive

### Security Tests
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] JWT authentication working
- [ ] Password hashing working
- [ ] SQL injection protected

---

## 📝 Step 15: Post-Deployment Tasks

### Documentation
- [ ] Update README with production URLs
- [ ] Document environment variables
- [ ] Create runbook for common issues
- [ ] Document backup procedures

### User Accounts
```bash
# Admin credentials (from ADMIN_PASSWORD):
Email: admin@citadelbuy.com
Password: 5kmmQt9ygqG8mdkjWEERw@2025!
```

⚠️ **IMPORTANT:** Change admin password after first login!

### Backups
Railway provides automatic backups for PostgreSQL:
- Daily automated backups
- 7-day retention
- Restore via dashboard

---

## 🆘 Troubleshooting

### Issue: Deployment Failed
```bash
# Check logs
railway logs

# Check build logs
railway logs --build

# Common fixes:
railway restart
```

### Issue: Database Connection Failed
```bash
# Verify DATABASE_URL is set
railway variables

# Test connection
railway run npx prisma db execute --stdin <<< "SELECT 1;"
```

### Issue: CORS Errors
```bash
# Verify CORS_ORIGIN matches frontend URL
railway variables | grep CORS

# Update if needed
railway variables set CORS_ORIGIN='https://your-frontend-url.railway.app'
railway restart
```

### Issue: 502 Bad Gateway
```bash
# Check if service is running
railway status

# Restart service
railway restart

# Check health endpoint
curl https://your-backend-url.railway.app/api/health
```

---

## 💰 Cost Estimate

### Railway Pricing (as of 2025)
- **Hobby Plan:** $5/month (starter tier)
  - $5 credit included
  - Pay for usage beyond credit

- **Estimated Monthly Cost:**
  - PostgreSQL: $10-15
  - Backend Service: $10-20
  - Frontend Service: $10-20
  - **Total: $30-55/month**

### Free Tier Available:
- 500 hours/month execution time
- 1GB RAM per service
- 1GB storage

---

## 📊 Deployment Verification Checklist

After deployment, verify:

### Backend ✅
- [ ] Health endpoint: `GET /api/health`
- [ ] Categories endpoint: `GET /api/categories`
- [ ] Products endpoint: `GET /api/products`
- [ ] Auth endpoint: `POST /api/auth/login`
- [ ] Swagger docs: `GET /api/docs` (if enabled)

### Frontend ✅
- [ ] Homepage loads
- [ ] Static assets load
- [ ] API calls work
- [ ] Authentication works
- [ ] Shopping cart works
- [ ] Checkout works

### Database ✅
- [ ] Migrations applied
- [ ] Seed data loaded
- [ ] Admin user created
- [ ] Categories created
- [ ] Loyalty tiers created

---

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ Backend API responds to health checks
2. ✅ Frontend loads and displays correctly
3. ✅ Database is connected and seeded
4. ✅ User can register and login
5. ✅ Products display correctly
6. ✅ Shopping cart works
7. ✅ Checkout process completes
8. ✅ Admin panel is accessible
9. ✅ HTTPS is working
10. ✅ No console errors

---

## 📞 Support Resources

### Railway Documentation
- **Docs:** https://docs.railway.app
- **Discord:** https://discord.gg/railway
- **Status:** https://railway.app/status

### Project Resources
- **Backend API:** NestJS docs
- **Frontend:** Next.js docs
- **Database:** Prisma docs

---

## 🚀 Quick Command Reference

```bash
# Authentication
railway login
railway whoami

# Project Management
railway init
railway link
railway status

# Database
railway add --database postgres
railway add --database redis

# Environment Variables
railway variables
railway variables set KEY=value
railway variables get KEY

# Deployment
railway up
railway up --detach
railway restart

# Monitoring
railway logs
railway logs --follow
railway domain

# Execution
railway run <command>
railway shell
```

---

## ⚡ Next Steps After Deployment

1. **Test Everything:** Run through the testing checklist
2. **Set Up Monitoring:** Configure Sentry and uptime monitoring
3. **Configure Email:** Set up SendGrid for transactional emails
4. **Custom Domain:** Add your custom domain
5. **CI/CD:** Set up GitHub integration for auto-deploy
6. **Analytics:** Configure Google Analytics or Segment
7. **Performance:** Run Lighthouse audit
8. **Security:** Run security audit
9. **Backup:** Verify backup configuration
10. **Scale:** Monitor usage and scale as needed

---

**Ready to deploy?** Start with Step 1: `railway login`

---

*Document Generated: 2025-11-20*
*Version: 1.0.0*
*Status: Ready for Production Deployment*
