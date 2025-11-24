# ⚡ CitadelBuy Railway Deployment - Quick Reference Card

**Print this or keep it open while deploying!**

---

## 🔑 Essential Credentials

### Production Secrets (Already Generated)
```
JWT_SECRET=16f8c2981aa941adbe9c172ef924187d2466686f2271242453aa0434dc7d00333f8098fb21c935f4005f7b0426bb03162ab7f11725dcf6e6d75880e52fd02a2d

ADMIN_EMAIL=admin@citadelbuy.com
ADMIN_PASSWORD=5kmmQt9ygqG8mdkjWEERw@2025!
```

### You Need to Provide
- `STRIPE_SECRET_KEY`: sk_test_... or sk_live_...
- `STRIPE_PUBLISHABLE_KEY`: pk_test_... or pk_live_...
- `STRIPE_WEBHOOK_SECRET`: whsec_... (from Stripe Dashboard)
- `SENDGRID_API_KEY`: SG.xxx... (from SendGrid Dashboard)
- `SENTRY_DSN`: https://...@sentry.io/... (optional)

---

## ⚡ Deployment Commands (Copy-Paste)

### 1. Login (1 min)
```bash
railway login
```

### 2. Initialize Project (2 min)
```bash
cd "C:/Users/kogun/Downloads/CitadelBuy-Commerce"
railway init
# → Name: citadelbuy-production
```

### 3. Add Databases (3 min)
```bash
railway add --plugin postgresql
railway add --plugin redis
```

### 4. Create Backend Service (20 min)
```bash
railway service create backend
railway up --service backend --docker-image citadelplatforms/citadelbuy-ecommerce:backend-latest
```

**Then configure variables via Dashboard:**
- Go to backend service → Variables → Raw Editor
- Copy entire `railway-backend.env.template`
- Update: STRIPE_SECRET_KEY, SENDGRID_API_KEY, SENTRY_DSN
- Save

**Get backend URL:**
```bash
railway domain --service backend
```
**Save URL:** `_________________________________`

### 5. Run Migrations (5 min)
```bash
railway run --service backend npx prisma migrate deploy
railway run --service backend npm run db:seed
```

### 6. Create Frontend Service (15 min)
```bash
railway service create frontend
railway up --service frontend --docker-image citadelplatforms/citadelbuy-ecommerce:frontend-latest
```

**Configure variables via Dashboard:**
- Go to frontend service → Variables → Raw Editor
- Copy entire `railway-frontend.env.template`
- Update: NEXT_PUBLIC_API_URL (backend URL), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- Save

**Get frontend URL:**
```bash
railway domain --service frontend
```
**Save URL:** `_________________________________`

### 7. Update CORS (5 min)
```bash
railway variables set CORS_ORIGIN="YOUR_FRONTEND_URL" --service backend
railway variables set FRONTEND_URL="YOUR_FRONTEND_URL" --service backend
railway variables set NEXT_PUBLIC_APP_URL="YOUR_FRONTEND_URL" --service frontend
```

### 8. Configure Stripe Webhook (5 min)
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `YOUR_BACKEND_URL/api/webhooks/stripe`
3. Events: payment_intent.*, customer.subscription.*
4. Copy signing secret
5. Update:
```bash
railway variables set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET" --service backend
```

### 9. Test Deployment (10 min)
```bash
# Test backend
curl YOUR_BACKEND_URL/api

# Test login
curl -X POST YOUR_BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@citadelbuy.com","password":"5kmmQt9ygqG8mdkjWEERw@2025!"}'

# Open frontend in browser
# https://YOUR_FRONTEND_URL
```

---

## 🔍 Useful Railway CLI Commands

```bash
# View logs
railway logs --service backend
railway logs --service frontend

# View variables
railway variables --service backend
railway variables --service frontend

# Check service status
railway status

# Check usage/costs
railway usage

# SSH into service
railway shell --service backend

# Run one-off command
railway run --service backend npx prisma migrate deploy
```

---

## 🧪 Test Stripe Payment

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

**CVV:** Any 3 digits
**Expiry:** Any future date
**ZIP:** Any 5 digits

---

## ✅ Deployment Checklist

- [ ] Railway login completed
- [ ] Project created: citadelbuy-production
- [ ] PostgreSQL added
- [ ] Redis added
- [ ] Backend service created
- [ ] Backend deployed
- [ ] Backend variables configured
- [ ] Backend URL saved: ___________________
- [ ] Database migrations run
- [ ] Database seeded
- [ ] Frontend service created
- [ ] Frontend deployed
- [ ] Frontend variables configured
- [ ] Frontend URL saved: ___________________
- [ ] CORS updated
- [ ] Stripe webhook configured
- [ ] Backend API tested (curl)
- [ ] Admin login tested
- [ ] Frontend loads
- [ ] Checkout tested (test mode)
- [ ] Ready for production! 🎉

---

## 🚨 Troubleshooting

### Backend won't start
```bash
railway logs --service backend
# Check for missing environment variables
```

### Frontend build fails
```bash
railway logs --service frontend
# Verify NEXT_PUBLIC_API_URL is set
```

### Database connection error
```bash
railway variables --service backend | grep DATABASE_URL
# Verify DATABASE_URL exists
```

### CORS error in browser
- Check CORS_ORIGIN matches frontend URL exactly
- Verify FRONTEND_URL is set in backend
- Redeploy backend after updating

---

## 📊 Expected Timeline

| Step | Duration |
|------|----------|
| 1. Login | 1 min |
| 2. Init project | 2 min |
| 3. Add databases | 3 min |
| 4. Deploy backend | 20 min |
| 5. Run migrations | 5 min |
| 6. Deploy frontend | 15 min |
| 7. Update CORS | 5 min |
| 8. Stripe webhook | 5 min |
| 9. Testing | 10 min |
| **Total** | **~66 min** |

---

## 💰 Monthly Cost Estimate

- Backend: $15-25
- Frontend: $10-15
- PostgreSQL: ~$5
- Redis: ~$5
- **Total: $30-50/month**

---

## 📞 Quick Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Stripe Dashboard:** https://dashboard.stripe.com
- **SendGrid Dashboard:** https://app.sendgrid.com
- **Sentry Dashboard:** https://sentry.io

---

## 🎯 After Deployment

1. **Change admin password** (first login)
2. Test all features
3. Set up monitoring alerts
4. Configure custom domain (optional)
5. Switch to Stripe live keys (when ready)
6. Go live! 🚀

---

## 📁 Reference Documents

- **Quick start:** `DEPLOY-NOW.md`
- **Step-by-step:** `RAILWAY-DEPLOYMENT-STEPS.md`
- **Checklist:** `DEPLOYMENT-CHECKLIST.md`
- **Comprehensive:** `docs/RAILWAY-DEPLOYMENT-GUIDE.md`

---

**Current Status:** ⏸️ Waiting for `railway login`

**Next Action:** Run `railway login` to start deployment

---

**Good luck! You've got this! 🚀**
