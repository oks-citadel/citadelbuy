# Security Configuration Quick Start Guide

## Overview

CitadelBuy includes automated production configuration validation that ensures your application is securely configured before it starts. This guide provides a quick reference for setting up production environment variables.

## Quick Setup (5 Minutes)

### 1. Generate Security Keys

Run these commands to generate all required security keys:

```bash
# Generate JWT Secret (64+ characters)
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env.production

# Generate JWT Refresh Secret (64+ characters, different from JWT_SECRET)
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)" >> .env.production

# Generate KYC Encryption Key (exactly 64 hex characters = 32 bytes)
echo "KYC_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env.production

# Generate Database Password
echo "# Database password: $(openssl rand -base64 32)" >> .env.production
```

### 2. Set Core Configuration

```bash
# Environment
NODE_ENV=production
PORT=4000

# CORS (REQUIRED in production - comma-separated HTTPS URLs)
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com
FRONTEND_URL=https://citadelbuy.com

# Database (update with your values)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
REDIS_URL=redis://:password@host:6379/0
```

### 3. Configure Email (Required)

```bash
# SMTP Configuration
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your_sendgrid_api_key
EMAIL_FROM=noreply@citadelbuy.com
```

### 4. Test Configuration

```bash
# Test that the application starts successfully
NODE_ENV=production npm start

# You should see:
# ✅ Configuration validation: passed
# 🔒 Production mode: CORS and security hardening active
```

## What Gets Validated

The application automatically validates:

### ✅ Security Requirements
- JWT_SECRET is at least 64 characters
- JWT_REFRESH_SECRET is at least 64 characters and different from JWT_SECRET
- KYC_ENCRYPTION_KEY is exactly 64 hexadecimal characters
- No placeholder values (CHANGE_ME, your-jwt-secret, etc.)

### ✅ Production Settings
- CORS_ORIGIN is set and uses HTTPS
- FRONTEND_URL uses HTTPS
- DATABASE_URL is valid PostgreSQL format
- Node.js version is 18.x or higher

### ✅ Service Configuration
- Email SMTP settings are complete
- Payment providers (if enabled) have valid credentials
- Payment providers use live keys (not test keys) in production

## Validation Errors and Fixes

### Error: "CORS_ORIGIN is required in production"

```bash
# Fix: Set CORS_ORIGIN with HTTPS URLs
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com
```

### Error: "JWT_SECRET must be at least 64 characters long"

```bash
# Fix: Generate a new secret
JWT_SECRET=$(openssl rand -base64 64)
```

### Error: "KYC_ENCRYPTION_KEY must be exactly 64 hexadecimal characters"

```bash
# Fix: Generate proper encryption key
KYC_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Error: "Found placeholder values in production environment"

```bash
# Fix: Replace all placeholder values with real ones
# Search for placeholders:
grep -r "CHANGE_ME\|your-jwt-secret\|your_stripe" .env.production

# Replace each with actual production values
```

### Error: "JWT_SECRET and JWT_REFRESH_SECRET must be different"

```bash
# Fix: Generate two different secrets
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
```

## Production Deployment Checklist

Copy this checklist for each deployment:

```
Pre-Deployment:
[ ] Generated JWT secrets (64+ characters each)
[ ] Generated encryption key (64 hex characters)
[ ] Set CORS_ORIGIN with HTTPS URLs only
[ ] Set FRONTEND_URL with HTTPS
[ ] Configured database with SSL
[ ] Configured Redis with authentication
[ ] Set up email SMTP credentials
[ ] Payment providers use live keys (not test)
[ ] No placeholder values in .env
[ ] Application starts with NODE_ENV=production

Post-Deployment:
[ ] Health check endpoint responds
[ ] CORS works from frontend
[ ] User can login (JWT works)
[ ] Email sending works
[ ] Payment processing works
[ ] File uploads work
[ ] Search functionality works
```

## Security Best Practices

1. **Store Secrets Securely**
   - Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
   - Never commit .env files to version control
   - Never log secret values

2. **Use Different Secrets Per Environment**
   - Development secrets ≠ Staging secrets ≠ Production secrets
   - Never copy production secrets to development

3. **Rotate Secrets Regularly**
   - JWT secrets: Every 90 days
   - Database passwords: Every 90 days
   - API keys: Every 180 days
   - **NEVER rotate encryption keys** (you'll lose access to encrypted data)

4. **Enable Monitoring**
   - Set up Sentry for error tracking
   - Monitor failed authentication attempts
   - Set up alerts for unusual activity

## Environment Variables Template

```bash
# ==================== CORE ====================
NODE_ENV=production
PORT=4000

# ==================== SECURITY ====================
# Generate with: openssl rand -base64 64
JWT_SECRET=your_generated_secret_here_64_plus_characters
JWT_REFRESH_SECRET=your_different_generated_secret_here_64_plus_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Generate with: openssl rand -hex 32
KYC_ENCRYPTION_KEY=your_generated_hex_key_here_exactly_64_characters

# ==================== CORS ====================
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com
FRONTEND_URL=https://citadelbuy.com

# ==================== DATABASE ====================
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
REDIS_URL=redis://:password@host:6379/0

# ==================== EMAIL ====================
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@citadelbuy.com

# ==================== PAYMENTS ====================
# Stripe (use live keys)
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal (use live credentials)
PAYPAL_ENABLED=true
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=live

# ==================== STORAGE ====================
STORAGE_PROVIDER=S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=citadelbuy-production-uploads

# ==================== MONITORING ====================
SENTRY_DSN=https://your_key@sentry.io/project_id
LOG_LEVEL=info
```

## Need Help?

- **Full Documentation:** See `PRODUCTION_ENVIRONMENT_VARIABLES.md`
- **Security Issues:** security@citadelbuy.com
- **Support:** support@citadelbuy.com

---

**Last Updated:** 2024-12-03
