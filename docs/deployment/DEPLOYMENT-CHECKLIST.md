# Railway Deployment Checklist

**Project:** CitadelBuy E-Commerce Platform
**Platform:** Railway.app
**Date:** 2025-11-18

---

## 🎯 Pre-Deployment Preparation

### Accounts & Access
- [ ] Railway account created (https://railway.app)
- [ ] Payment method added to Railway
- [ ] GitHub account connected to Railway
- [ ] Stripe account set up
  - [ ] Test API keys obtained
  - [ ] Live API keys obtained (if going to production)
- [ ] SendGrid account created
  - [ ] API key obtained
  - [ ] Sender verified
- [ ] Sentry account created (optional)
  - [ ] Project created
  - [ ] DSN obtained
- [ ] Domain name purchased (optional)
  - [ ] DNS access confirmed

### Local Preparation
- [ ] Docker images built and pushed to Docker Hub
  - [ ] `citadelplatforms/citadelbuy-ecommerce:backend-latest`
  - [ ] `citadelplatforms/citadelbuy-ecommerce:frontend-latest`
- [ ] Railway CLI installed (`npm install -g @railway/cli`)
- [ ] Environment variable templates reviewed
  - [ ] `railway-backend.env.template`
  - [ ] `railway-frontend.env.template`
- [ ] Production secrets generated
  - [ ] JWT_SECRET (saved securely)
  - [ ] ADMIN_PASSWORD (saved securely)

---

## 🚀 Deployment Steps

### Step 1: Railway Project Setup
- [ ] Railway account logged in
- [ ] New project created: `citadelbuy-production`
- [ ] Project environment set to `production`

### Step 2: Database Services
- [ ] PostgreSQL database added
  - [ ] Database provisioned successfully
  - [ ] DATABASE_URL generated
  - [ ] Connection verified
- [ ] Redis cache added
  - [ ] Redis provisioned successfully
  - [ ] REDIS_URL generated
  - [ ] Connection verified

### Step 3: Backend Deployment
- [ ] Backend service created
- [ ] Docker image source configured
  - [ ] Image: `citadelplatforms/citadelbuy-ecommerce:backend-latest`
- [ ] Environment variables set (from `railway-backend.env.template`)
  - [ ] DATABASE_URL (auto-filled)
  - [ ] REDIS_URL (auto-filled)
  - [ ] JWT_SECRET (generated value)
  - [ ] STRIPE_SECRET_KEY (your key)
  - [ ] STRIPE_WEBHOOK_SECRET (from Stripe)
  - [ ] SENDGRID_API_KEY (your key)
  - [ ] ADMIN_PASSWORD (generated value)
  - [ ] SENTRY_DSN (your DSN, optional)
  - [ ] FRONTEND_URL (to be updated)
  - [ ] CORS_ORIGIN (to be updated)
- [ ] Health check configured
  - [ ] Path: `/api`
  - [ ] Timeout: 300s
- [ ] Service deployed successfully
- [ ] Backend URL noted: `____________________________`
- [ ] Backend health check passing

### Step 4: Database Migrations
- [ ] Prisma migrations deployed
  - [ ] Command: `railway run -s backend npx prisma migrate deploy`
  - [ ] Migrations applied successfully
- [ ] Database seeded (optional)
  - [ ] Command: `railway run -s backend npm run db:seed`
  - [ ] Seed completed successfully
- [ ] Admin account verified in database

### Step 5: Frontend Deployment
- [ ] Frontend service created
- [ ] Docker image source configured
  - [ ] Image: `citadelplatforms/citadelbuy-ecommerce:frontend-latest`
- [ ] Environment variables set (from `railway-frontend.env.template`)
  - [ ] NEXT_PUBLIC_API_URL (backend URL from Step 3)
  - [ ] NEXT_PUBLIC_APP_URL (to be updated after deploy)
  - [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (your key)
  - [ ] NEXT_PUBLIC_SENTRY_DSN (your DSN, optional)
  - [ ] All other variables configured
- [ ] Service deployed successfully
- [ ] Frontend URL noted: `____________________________`
- [ ] Frontend loads without errors

### Step 6: CORS Configuration
- [ ] Backend CORS_ORIGIN updated with frontend URL
- [ ] Backend FRONTEND_URL updated with frontend URL
- [ ] Backend service redeployed
- [ ] CORS working (no console errors in browser)

### Step 7: Stripe Webhooks
- [ ] Stripe webhook endpoint created
  - [ ] URL: `https://YOUR-BACKEND-URL/api/webhooks/stripe`
  - [ ] Events selected (payment_intent.*, customer.subscription.*)
- [ ] Webhook signing secret copied
- [ ] Backend STRIPE_WEBHOOK_SECRET updated
- [ ] Backend service redeployed
- [ ] Webhook tested (Stripe Dashboard → Send test webhook)

### Step 8: Testing
- [ ] Backend API health check
  - [ ] URL: `https://YOUR-BACKEND-URL/api`
  - [ ] Response: `{"status":"ok","message":"..."}`
- [ ] Admin login test
  - [ ] Email: `admin@citadelbuy.com`
  - [ ] Password: (generated password)
  - [ ] Login successful
- [ ] Frontend homepage loads
- [ ] Product browsing works
- [ ] Cart functionality works
- [ ] Checkout process works (Stripe test mode)
  - [ ] Test card: 4242 4242 4242 4242
  - [ ] Payment successful
- [ ] Order created in database
- [ ] Email notification received (if configured)

### Step 9: Custom Domain (Optional)
- [ ] Frontend custom domain added
  - [ ] Domain: `____________________________`
  - [ ] DNS CNAME record added
  - [ ] SSL certificate provisioned
  - [ ] Domain resolves correctly
- [ ] Backend custom domain added (API subdomain)
  - [ ] Domain: `api.____________________________`
  - [ ] DNS CNAME record added
  - [ ] SSL certificate provisioned
  - [ ] Domain resolves correctly
- [ ] Environment variables updated with custom domains
  - [ ] Backend: CORS_ORIGIN, FRONTEND_URL, APP_URL
  - [ ] Frontend: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL
- [ ] Services redeployed
- [ ] Custom domains working

### Step 10: Monitoring & Alerts
- [ ] Railway metrics reviewed
  - [ ] CPU usage normal
  - [ ] Memory usage normal
  - [ ] No errors in logs
- [ ] Alerts configured
  - [ ] Deployment failures
  - [ ] High error rate
  - [ ] Resource limits
- [ ] UptimeRobot configured (optional)
  - [ ] Frontend monitor added
  - [ ] Backend API monitor added
  - [ ] Alert email configured
- [ ] Sentry error tracking verified
  - [ ] Errors appearing in Sentry dashboard

---

## ✅ Post-Deployment Verification

### Security Checks
- [ ] Admin password changed from default
- [ ] All secrets stored securely (password manager)
- [ ] HTTPS enabled (automatic on Railway)
- [ ] CORS configured correctly (only frontend domain)
- [ ] Rate limiting enabled
- [ ] Swagger API docs disabled in production (SWAGGER_ENABLED=false)
- [ ] Debug mode disabled (DEBUG=false)
- [ ] No .env files committed to git

### Functionality Checks
- [ ] User registration works
- [ ] Email verification works (if enabled)
- [ ] Password reset works
- [ ] Product search works
- [ ] Cart persistence works
- [ ] Checkout flow complete
- [ ] Payment processing works
- [ ] Order confirmation received
- [ ] Loyalty points awarded
- [ ] Gift cards work
- [ ] Admin panel accessible
- [ ] All features from Phase 27-29 working

### Performance Checks
- [ ] Homepage loads in < 3 seconds
- [ ] API response times < 500ms
- [ ] No console errors in browser
- [ ] Images load properly
- [ ] Mobile responsive design works
- [ ] Lighthouse score > 80 (run audit)

### Database Checks
- [ ] Database backups enabled (automatic on Railway)
- [ ] Database connection pool sized correctly
- [ ] Migrations applied successfully
- [ ] All tables created
- [ ] Sample data visible (if seeded)

---

## 📊 Cost & Resource Monitoring

### Railway Usage
- [ ] Current usage checked (Project → Usage tab)
- [ ] Billing alerts set up
- [ ] Monthly budget estimated: $________
- [ ] Resource limits appropriate for traffic

### Expected Costs (Monthly)
- Backend service: $15-25
- Frontend service: $10-15
- PostgreSQL: ~$5
- Redis: ~$5
- **Total:** $30-50/month

---

## 📚 Documentation

### Created/Updated Files
- [ ] `RAILWAY-DEPLOYMENT-STEPS.md` - Step-by-step guide
- [ ] `DEPLOYMENT-CHECKLIST.md` - This checklist
- [ ] `railway-backend.env.template` - Backend env vars
- [ ] `railway-frontend.env.template` - Frontend env vars
- [ ] `railway.json` - Railway configuration
- [ ] `PHASE-30-DEPLOYMENT.md` - Updated with completion
- [ ] `PROGRESS.md` - Updated with deployment status
- [ ] `NEXT_TASKS.md` - Updated with next steps

### Credentials Documented
- [ ] Admin credentials saved securely
- [ ] Database credentials saved
- [ ] API keys documented (Stripe, SendGrid, etc.)
- [ ] Railway project details saved
- [ ] Production URLs documented

---

## 🎉 Go-Live Checklist

### Before Announcing
- [ ] All tests passing
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] Security review completed
- [ ] Backup strategy confirmed
- [ ] Support email configured
- [ ] Terms of service page added (if needed)
- [ ] Privacy policy page added (if needed)
- [ ] Contact page functional

### Marketing Ready
- [ ] Social media accounts set up
- [ ] Google Analytics configured
- [ ] SEO meta tags set
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Favicon added
- [ ] OG images set

### Support Ready
- [ ] Support email monitored
- [ ] Error alerts configured
- [ ] Uptime monitoring active
- [ ] Response plan for outages
- [ ] Escalation process defined

---

## 🔄 Ongoing Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor uptime status
- [ ] Review Sentry errors

### Weekly
- [ ] Review usage and costs
- [ ] Check for security updates
- [ ] Review user feedback
- [ ] Monitor performance metrics

### Monthly
- [ ] Review and optimize costs
- [ ] Security audit
- [ ] Backup restoration test
- [ ] Update dependencies
- [ ] Review analytics

### Quarterly
- [ ] Major security audit
- [ ] Performance optimization
- [ ] User survey
- [ ] Feature roadmap review

---

## 📞 Emergency Contacts

**Railway Support:**
- Discord: https://discord.gg/railway
- Email: team@railway.app
- Status: https://status.railway.app

**Stripe Support:**
- Dashboard: https://dashboard.stripe.com
- Support: https://support.stripe.com

**Sentry Support:**
- Dashboard: https://sentry.io
- Docs: https://docs.sentry.io

---

## ✅ Deployment Complete

**Deployment Date:** _______________
**Deployed By:** _______________
**Production URLs:**
- Frontend: _______________
- Backend: _______________

**Next Review:** _______________

---

**Status:**
- [ ] Ready to Deploy
- [ ] Deployment In Progress
- [ ] Deployment Complete ✅
- [ ] Live in Production 🎉

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________
