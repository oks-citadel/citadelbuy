# Railway Environment Variables - Complete Reference

**Last Updated:** 2025-11-18
**Purpose:** Complete environment variable configuration for Railway deployment

---

## 🎯 Overview

This document provides all environment variables needed for deploying CitadelBuy to Railway, with explanations and examples.

---

## 🗄️ PostgreSQL Service

**No configuration needed!** Railway automatically provides:
- `DATABASE_URL` - Automatically injected
- `DATABASE_PUBLIC_URL` - External access URL
- `DATABASE_PRIVATE_URL` - Internal network URL

**Format:**
```
postgresql://postgres:password@hostname.railway.internal:5432/railway
```

---

## 🔧 Backend Service Environment Variables

### Core Configuration

```bash
# Environment
NODE_ENV=production

# Port (Railway automatically binds)
PORT=4000

# Database URL (automatically provided by Railway PostgreSQL)
# DATABASE_URL=<automatic>
```

### JWT Authentication

```bash
# JWT Secret (REQUIRED - Generate secure 128-character string)
JWT_SECRET=<generate-with-crypto-randomBytes-64-hex>

# JWT Expiration
JWT_EXPIRES_IN=7d

# Refresh Token (Optional)
JWT_REFRESH_SECRET=<generate-with-crypto-randomBytes-64-hex>
JWT_REFRESH_EXPIRES_IN=30d
```

**Generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Admin Configuration

```bash
# Admin Password (REQUIRED for production seeding)
ADMIN_PASSWORD=<strong-password-20-plus-characters>

# Admin Email (Optional - defaults to admin@citadelbuy.com)
ADMIN_EMAIL=admin@citadelbuy.com
```

**Generate admin password:**
```bash
node -e "console.log(require('crypto').randomBytes(15).toString('base64').slice(0,20))"
```

### Stripe Payment Configuration

```bash
# Stripe Secret Key (REQUIRED)
STRIPE_SECRET_KEY=sk_live_...  # or sk_test_... for testing

# Stripe Webhook Secret (REQUIRED for webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Publishable Key (for backend reference, optional)
STRIPE_PUBLISHABLE_KEY=pk_live_...  # or pk_test_...
```

**Get Stripe keys:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy "Secret key" → `STRIPE_SECRET_KEY`
3. Copy "Publishable key" → `STRIPE_PUBLISHABLE_KEY`
4. Go to Webhooks → Create endpoint → Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### CORS Configuration

```bash
# Allowed Origins (REQUIRED)
CORS_ORIGIN=https://your-frontend.railway.app,https://citadelbuy.com,https://www.citadelbuy.com

# For development, also allow localhost
# CORS_ORIGIN=http://localhost:3000,https://your-frontend.railway.app
```

### Email Configuration (Optional but Recommended)

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=noreply@citadelbuy.com

# Email Service (alternative to SMTP)
# SENDGRID_API_KEY=SG.xxx
# MAILGUN_API_KEY=key-xxx
# MAILGUN_DOMAIN=mg.yourdomain.com
```

**Gmail App Password Setup:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Create App Password
4. Use this password in `SMTP_PASSWORD`

### Application URLs

```bash
# Frontend URL (for CORS and redirects)
FRONTEND_URL=https://your-frontend.railway.app

# Backend URL (for webhooks and callbacks)
BACKEND_URL=https://your-backend.railway.app

# App Name (for emails)
APP_NAME=CitadelBuy
```

### Rate Limiting (Optional - defaults in code)

```bash
# Rate limit per IP
THROTTLE_TTL=60000  # milliseconds (60 seconds)
THROTTLE_LIMIT=100  # requests per TTL
```

### File Upload (Optional)

```bash
# Upload limits
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_DEST=./uploads

# Cloud storage (optional)
# AWS_ACCESS_KEY_ID=xxx
# AWS_SECRET_ACCESS_KEY=xxx
# AWS_S3_BUCKET=citadelbuy-uploads
# AWS_REGION=us-east-1
```

### Redis Cache (Optional)

```bash
# Redis URL (if using Railway Redis addon)
# REDIS_URL=redis://default:password@hostname:6379

# Cache TTL
# CACHE_TTL=3600  # seconds
```

### Logging (Optional)

```bash
# Log Level
LOG_LEVEL=info  # debug | info | warn | error

# Log Format
LOG_FORMAT=json  # json | text

# Enable query logging (development only)
# PRISMA_LOG=query,info,warn,error
```

### Feature Flags (Optional)

```bash
# Enable features
ENABLE_ANALYTICS=true
ENABLE_RECOMMENDATIONS=true
ENABLE_BNPL=true
ENABLE_LOYALTY=true
ENABLE_GIFT_CARDS=true
ENABLE_DEALS=true
ENABLE_SUBSCRIPTIONS=true
```

---

## 🎨 Frontend Service Environment Variables

### Core Configuration

```bash
# Environment
NODE_ENV=production

# Port
PORT=3000
```

### API Configuration (REQUIRED)

```bash
# Backend API URL (REQUIRED)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# App URL (for SEO and og:tags)
NEXT_PUBLIC_APP_URL=https://your-frontend.railway.app
```

### Stripe Configuration (REQUIRED)

```bash
# Stripe Publishable Key (REQUIRED)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # or pk_test_...
```

### Feature Flags (Optional)

```bash
# Enable features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=false
NEXT_PUBLIC_ENABLE_PWA=false
```

### Analytics (Optional)

```bash
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Facebook Pixel
NEXT_PUBLIC_FB_PIXEL_ID=xxx

# Hotjar
NEXT_PUBLIC_HOTJAR_ID=xxx
```

### SEO (Optional)

```bash
# Site metadata
NEXT_PUBLIC_SITE_NAME=CitadelBuy
NEXT_PUBLIC_SITE_DESCRIPTION=Your one-stop e-commerce platform
NEXT_PUBLIC_SITE_URL=https://citadelbuy.com
```

---

## 📋 Complete Railway Variables Command

### Backend Service

```bash
railway variables --service backend <<EOF
NODE_ENV=production
PORT=4000
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=7d
ADMIN_PASSWORD=<your-admin-password>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
CORS_ORIGIN=https://your-frontend.railway.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<your-app-password>
SMTP_FROM=noreply@citadelbuy.com
FRONTEND_URL=https://your-frontend.railway.app
BACKEND_URL=https://your-backend.railway.app
APP_NAME=CitadelBuy
ENABLE_ANALYTICS=true
ENABLE_RECOMMENDATIONS=true
ENABLE_BNPL=true
ENABLE_LOYALTY=true
ENABLE_GIFT_CARDS=true
ENABLE_DEALS=true
ENABLE_SUBSCRIPTIONS=true
EOF
```

### Frontend Service

```bash
railway variables --service frontend <<EOF
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_APP_URL=https://your-frontend.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=false
NEXT_PUBLIC_SITE_NAME=CitadelBuy
NEXT_PUBLIC_SITE_DESCRIPTION=Your one-stop e-commerce platform
EOF
```

---

## 🔐 Security Best Practices

### 1. Never Commit Secrets

```bash
# Always use Railway variables, never .env files in git
# Add to .gitignore:
.env
.env.local
.env.production
.env.development
```

### 2. Use Strong Secrets

```bash
# JWT Secret: 128+ characters
# Admin Password: 20+ characters with special chars
# Stripe: Use production keys only in production
```

### 3. Rotate Secrets Regularly

```bash
# Update JWT_SECRET every 90 days
railway variables set JWT_SECRET=<new-secret> --service backend
railway restart --service backend
```

### 4. Limit CORS Origins

```bash
# Only include your actual domains
# DON'T use wildcards (*) in production
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com
```

### 5. Enable HTTPS Only

```bash
# Railway provides automatic HTTPS
# Ensure all URLs use https://
# No http:// in CORS_ORIGIN or FRONTEND_URL
```

---

## 🧪 Testing Environment Variables

### Check if All Required Variables Are Set

```bash
# Backend
railway run --service backend node -e "
const required = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_PASSWORD', 'STRIPE_SECRET_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All required variables set');
"

# Frontend
railway run --service frontend node -e "
const required = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All required variables set');
"
```

### View All Variables

```bash
# Backend
railway variables --service backend

# Frontend
railway variables --service frontend

# PostgreSQL
railway variables --service postgres
```

---

## 📖 Environment Variable Priority

Railway variables are loaded in this order:

1. **Railway service variables** (highest priority)
2. **Railway project variables**
3. **Railway shared variables**
4. **Service-linked variables** (e.g., DATABASE_URL from PostgreSQL)
5. **.env files** (not recommended for production)

---

## 🆘 Troubleshooting

### "DATABASE_URL is not defined"

**Solution:**
```bash
# Ensure PostgreSQL is linked to backend
railway service backend
railway link <postgres-service-id>
```

### "CORS error from frontend"

**Solution:**
```bash
# Add frontend URL to CORS_ORIGIN
railway variables set CORS_ORIGIN="<frontend-url>" --service backend
railway restart --service backend
```

### "Stripe webhook signature failed"

**Solution:**
```bash
# Verify webhook secret matches Stripe dashboard
railway variables set STRIPE_WEBHOOK_SECRET="whsec_xxx" --service backend
railway restart --service backend
```

### "Email sending failed"

**Solution:**
```bash
# Check SMTP credentials
railway variables --service backend | grep SMTP

# Test email connection
railway run --service backend npm run test:email
```

---

## 📊 Variable Checklist

### Before Deployment

- [ ] All secrets generated securely
- [ ] Stripe keys obtained (test or production)
- [ ] SMTP credentials configured (or email service)
- [ ] CORS origins include frontend URL
- [ ] Admin password is strong (20+ chars)
- [ ] JWT secret is unique (128 chars)

### After Deployment

- [ ] Verify DATABASE_URL is set
- [ ] Test backend health endpoint
- [ ] Test frontend can connect to backend
- [ ] Verify Stripe payments work
- [ ] Test email sending
- [ ] Confirm CORS works from frontend

---

## 🔗 Quick Links

- [Railway Variables Docs](https://docs.railway.app/develop/variables)
- [Stripe API Keys](https://dashboard.stripe.com/apikeys)
- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [JWT.io](https://jwt.io/) - JWT debugging
- [Crypto Random Generator](https://www.random.org/strings/)

---

**Last Updated:** 2025-11-18
**Deployment Guide:** `RAILWAY-DEPLOY-NOW.md`
**Database Guide:** `DATABASE-DEPLOYMENT-GUIDE.md`
