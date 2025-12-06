# Credential Rotation Checklist

## CRITICAL: Immediate Action Required

If sensitive credentials have been exposed (committed to git, leaked, or compromised), you MUST rotate ALL credentials immediately. This checklist provides step-by-step instructions for rotating every credential used in the CitadelBuy platform.

## Timeline

| Phase | Duration | Priority | Action |
|-------|----------|----------|--------|
| **Phase 1** | 0-1 hours | CRITICAL | Rotate high-impact credentials (DB, JWT, Redis) |
| **Phase 2** | 1-4 hours | HIGH | Rotate payment providers (Stripe, PayPal) |
| **Phase 3** | 4-8 hours | HIGH | Rotate cloud services (AWS, Azure, OAuth) |
| **Phase 4** | 8-24 hours | MEDIUM | Rotate monitoring and auxiliary services |
| **Phase 5** | 24-48 hours | LOW | Verify all rotations and update documentation |

---

## Pre-Rotation Checklist

Before rotating any credentials:

- [ ] Create backup of current .env file (store securely, NOT in git)
  ```bash
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
  chmod 600 .env.backup.*
  ```

- [ ] Document all services using credentials
  ```bash
  # List all env variables
  cat .env | grep -v '^#' | grep -v '^$' | cut -d'=' -f1 | sort
  ```

- [ ] Notify team of upcoming credential rotation
- [ ] Schedule maintenance window if necessary
- [ ] Prepare rollback plan
- [ ] Have access to ALL service admin panels

---

## Phase 1: Critical Infrastructure (0-1 hours)

### 1.1 Database Credentials (PostgreSQL)

**Impact:** CRITICAL - Application will be completely down if incorrect
**Estimated Time:** 15 minutes

#### Current Credentials
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`

#### Steps

1. **Generate new password:**
   ```bash
   # Generate strong password
   NEW_DB_PASSWORD=$(openssl rand -base64 32)
   echo "New DB Password: $NEW_DB_PASSWORD"
   # SAVE THIS SECURELY - You'll need it multiple times
   ```

2. **Update PostgreSQL password:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres -h localhost

   # In psql, change password:
   ALTER USER citadelbuy WITH PASSWORD 'NEW_PASSWORD_HERE';
   \q
   ```

3. **Update .env file:**
   ```bash
   # Update in .env
   POSTGRES_PASSWORD=NEW_PASSWORD_HERE
   DATABASE_URL=postgresql://citadelbuy:NEW_PASSWORD_HERE@localhost:5432/citadelbuy_dev?schema=public
   ```

4. **Restart application:**
   ```bash
   # If using Docker
   docker-compose down
   docker-compose up -d

   # If using PM2
   pm2 restart all

   # If using systemd
   systemctl restart citadelbuy-api
   ```

5. **Verify connection:**
   ```bash
   # Test database connection
   psql "$DATABASE_URL" -c "SELECT 1"
   ```

**Verification Checklist:**
- [ ] Application can connect to database
- [ ] Can perform read operations
- [ ] Can perform write operations
- [ ] No authentication errors in logs

---

### 1.2 JWT Secrets

**Impact:** CRITICAL - All users will be logged out
**Estimated Time:** 10 minutes

#### Current Credentials
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

#### Steps

1. **Generate new JWT secrets:**
   ```bash
   # Generate JWT secret (64+ characters)
   NEW_JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
   echo "JWT_SECRET=$NEW_JWT_SECRET"

   # Generate refresh secret (MUST be different)
   NEW_JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
   echo "JWT_REFRESH_SECRET=$NEW_JWT_REFRESH_SECRET"
   ```

2. **Update .env file:**
   ```bash
   JWT_SECRET=NEW_JWT_SECRET_HERE
   JWT_REFRESH_SECRET=NEW_JWT_REFRESH_SECRET_HERE
   ```

3. **Clear existing sessions (Redis):**
   ```bash
   # Connect to Redis
   redis-cli

   # Clear all sessions
   FLUSHDB
   # Or selectively clear JWT tokens
   KEYS "jwt:*"
   DEL "jwt:*"
   ```

4. **Restart application:**
   ```bash
   docker-compose restart api
   # Or your restart command
   ```

5. **Notify users:**
   - Send notification: "Security update: Please log in again"
   - Update status page if applicable

**Verification Checklist:**
- [ ] Users can log in with new tokens
- [ ] Old tokens are rejected
- [ ] Refresh token flow works
- [ ] No JWT errors in logs

**User Impact:**
- All users will be logged out
- Users must log in again
- Active sessions will be terminated

---

### 1.3 Redis Credentials

**Impact:** HIGH - Cache and sessions will be affected
**Estimated Time:** 10 minutes

#### Current Credentials
- `REDIS_URL`
- Redis password (if configured)

#### Steps

1. **Update Redis password (if using auth):**
   ```bash
   # Edit redis.conf
   requirepass NEW_REDIS_PASSWORD_HERE

   # Or via redis-cli
   redis-cli
   CONFIG SET requirepass "NEW_REDIS_PASSWORD_HERE"
   CONFIG REWRITE
   ```

2. **Update .env file:**
   ```bash
   # Without password
   REDIS_URL=redis://localhost:6379

   # With password
   REDIS_URL=redis://:NEW_PASSWORD@localhost:6379
   ```

3. **Restart Redis:**
   ```bash
   # Docker
   docker-compose restart redis

   # System service
   systemctl restart redis
   ```

4. **Restart application to reconnect:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] Application can connect to Redis
- [ ] Cache operations work
- [ ] Session storage works
- [ ] No Redis authentication errors

---

### 1.4 KYC Encryption Key

**Impact:** CRITICAL - Cannot decrypt existing KYC documents
**Estimated Time:** 30 minutes

#### Current Credentials
- `KYC_ENCRYPTION_KEY`

**WARNING:** This is the most sensitive credential. Rotating it requires re-encrypting all existing data.

#### Steps

1. **Generate new encryption key:**
   ```bash
   # MUST be exactly 32 bytes (64 hex characters)
   NEW_KYC_KEY=$(openssl rand -hex 32)
   echo "New KYC Key: $NEW_KYC_KEY"
   ```

2. **Create migration script** (apps/api/scripts/rotate-kyc-encryption.ts):
   ```typescript
   import { PrismaClient } from '@prisma/client';
   import * as crypto from 'crypto';

   const prisma = new PrismaClient();

   const OLD_KEY = process.env.KYC_ENCRYPTION_KEY;
   const NEW_KEY = process.env.NEW_KYC_ENCRYPTION_KEY;

   async function rotateKYCEncryption() {
     const organizations = await prisma.organization.findMany({
       where: { kycStatus: 'APPROVED' },
     });

     for (const org of organizations) {
       try {
         // Decrypt with old key
         const decipher = crypto.createDecipheriv('aes-256-cbc',
           Buffer.from(OLD_KEY, 'hex'),
           org.encryptionIV
         );
         const decrypted = Buffer.concat([
           decipher.update(org.encryptedKYCData),
           decipher.final()
         ]);

         // Re-encrypt with new key
         const newIV = crypto.randomBytes(16);
         const cipher = crypto.createCipheriv('aes-256-cbc',
           Buffer.from(NEW_KEY, 'hex'),
           newIV
         );
         const encrypted = Buffer.concat([
           cipher.update(decrypted),
           cipher.final()
         ]);

         // Update database
         await prisma.organization.update({
           where: { id: org.id },
           data: {
             encryptedKYCData: encrypted,
             encryptionIV: newIV,
           },
         });

         console.log(`Rotated encryption for org: ${org.id}`);
       } catch (error) {
         console.error(`Failed for org ${org.id}:`, error);
       }
     }
   }

   rotateKYCEncryption()
     .then(() => console.log('Encryption rotation complete'))
     .catch(console.error)
     .finally(() => prisma.$disconnect());
   ```

3. **Run migration:**
   ```bash
   # Set both keys
   export KYC_ENCRYPTION_KEY="old_key_here"
   export NEW_KYC_ENCRYPTION_KEY="new_key_here"

   # Run migration
   ts-node scripts/rotate-kyc-encryption.ts
   ```

4. **Update .env with new key:**
   ```bash
   KYC_ENCRYPTION_KEY=NEW_KEY_HERE
   ```

5. **Restart application:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] All KYC documents can be decrypted
- [ ] New KYC submissions work
- [ ] No decryption errors in logs
- [ ] Backup of old key stored securely

---

## Phase 2: Payment Providers (1-4 hours)

### 2.1 Stripe

**Impact:** HIGH - Payment processing will fail
**Estimated Time:** 30 minutes

#### Current Credentials
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

#### Steps

1. **Log in to Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/

2. **Roll API keys:**
   - Navigate to: Developers > API Keys
   - Click "Roll key" next to Secret key
   - Save new secret key immediately
   - Note: Old key will work for 24 hours (grace period)

3. **Update publishable key (if needed):**
   - Publishable keys are less sensitive but should be rotated
   - Click "Create new key" if needed

4. **Rotate webhook secret:**
   - Navigate to: Developers > Webhooks
   - Find your webhook endpoint
   - Click "..." > "Roll secret"
   - Copy new webhook signing secret

5. **Update .env file:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_NEW_KEY_HERE
   STRIPE_PUBLISHABLE_KEY=pk_live_NEW_KEY_HERE
   STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET_HERE
   ```

6. **Update frontend .env:**
   ```bash
   # apps/web/.env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_NEW_KEY_HERE
   ```

7. **Restart services:**
   ```bash
   docker-compose restart api web
   ```

8. **Test payment flow:**
   - Create test order
   - Process payment
   - Verify webhook delivery

**Verification Checklist:**
- [ ] Test payment succeeds
- [ ] Webhooks are received
- [ ] Subscription billing works
- [ ] Refunds work
- [ ] No Stripe API errors

**Stripe Dashboard Checks:**
- [ ] Old key shows "Restricted" or "Rolled"
- [ ] New key shows "Active"
- [ ] Webhook events show "succeeded"

---

### 2.2 PayPal

**Impact:** HIGH - PayPal payments will fail
**Estimated Time:** 20 minutes

#### Current Credentials
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`

#### Steps

1. **Log in to PayPal Developer Dashboard:**
   - Go to: https://developer.paypal.com/dashboard/

2. **Rotate client credentials:**
   - Navigate to: Apps & Credentials
   - Select your app
   - Under "API Credentials", click "Show" for Client Secret
   - Click "Reset Secret" (WARNING: immediate effect)
   - Copy new Client ID and Secret

3. **Update webhook:**
   - Navigate to: Webhooks
   - Delete old webhook (or create new one)
   - Create new webhook with your endpoint
   - Copy new Webhook ID

4. **Update .env file:**
   ```bash
   PAYPAL_CLIENT_ID=NEW_CLIENT_ID_HERE
   PAYPAL_CLIENT_SECRET=NEW_CLIENT_SECRET_HERE
   PAYPAL_WEBHOOK_ID=NEW_WEBHOOK_ID_HERE
   ```

5. **Restart application:**
   ```bash
   docker-compose restart api
   ```

6. **Test PayPal integration:**
   - Create test order with PayPal
   - Complete payment flow
   - Verify webhook delivery

**Verification Checklist:**
- [ ] PayPal authentication works
- [ ] Payments process successfully
- [ ] Webhooks deliver correctly
- [ ] No PayPal API errors

---

### 2.3 Flutterwave (African Markets)

**Impact:** MEDIUM - African payments affected
**Estimated Time:** 15 minutes

#### Current Credentials
- `FLUTTERWAVE_PUBLIC_KEY`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_ENCRYPTION_KEY`
- `FLUTTERWAVE_WEBHOOK_SECRET`

#### Steps

1. **Log in to Flutterwave Dashboard:**
   - Go to: https://dashboard.flutterwave.com/

2. **Generate new API keys:**
   - Navigate to: Settings > API Keys
   - Click "Generate new keys"
   - Copy all keys immediately (cannot be viewed again)

3. **Update webhook secret:**
   - Navigate to: Settings > Webhooks
   - Add new webhook URL or update existing
   - Copy webhook secret hash

4. **Update .env file:**
   ```bash
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-NEW_KEY
   FLUTTERWAVE_SECRET_KEY=FLWSECK-NEW_KEY
   FLUTTERWAVE_ENCRYPTION_KEY=NEW_ENC_KEY
   FLUTTERWAVE_WEBHOOK_SECRET=NEW_WEBHOOK_SECRET
   ```

**Verification Checklist:**
- [ ] Test payment in supported currency (NGN, GHS, KES)
- [ ] Webhooks received
- [ ] No Flutterwave errors

---

### 2.4 Paystack (African Markets)

**Impact:** MEDIUM - Nigerian/Ghanaian payments affected
**Estimated Time:** 15 minutes

#### Current Credentials
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`

#### Steps

1. **Log in to Paystack Dashboard:**
   - Go to: https://dashboard.paystack.com/

2. **Roll secret key:**
   - Navigate to: Settings > API Keys & Webhooks
   - Click "Roll Key" next to Secret Key
   - Copy new secret key

3. **Update .env file:**
   ```bash
   PAYSTACK_PUBLIC_KEY=pk_live_NEW_KEY
   PAYSTACK_SECRET_KEY=sk_live_NEW_KEY
   ```

**Verification Checklist:**
- [ ] Test NGN payment
- [ ] Verify transactions appear in dashboard
- [ ] Webhooks work

---

## Phase 3: Cloud Services & OAuth (4-8 hours)

### 3.1 AWS Credentials

**Impact:** HIGH - File uploads and cloud resources affected
**Estimated Time:** 30 minutes

#### Current Credentials
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

#### Steps

1. **Log in to AWS IAM Console:**
   - Go to: https://console.aws.amazon.com/iam/

2. **Create new access key:**
   - Navigate to: Users > [your-user] > Security credentials
   - Under "Access keys", click "Create access key"
   - Choose "Application running on AWS compute service" or "Local code"
   - Copy Access Key ID and Secret Access Key (last chance to view!)

3. **Update .env file:**
   ```bash
   AWS_ACCESS_KEY_ID=AKIA_NEW_KEY_ID
   AWS_SECRET_ACCESS_KEY=NEW_SECRET_ACCESS_KEY
   ```

4. **Deactivate old access key:**
   - In IAM console, find old access key
   - Click "Actions" > "Deactivate" (test first)
   - After verification, click "Delete"

5. **Restart application:**
   ```bash
   docker-compose restart api
   ```

6. **Test S3 operations:**
   ```bash
   # Upload test file
   curl -X POST http://localhost:4000/api/upload \
     -F "file=@test.jpg"
   ```

**Verification Checklist:**
- [ ] File uploads work
- [ ] File downloads work
- [ ] S3 bucket access works
- [ ] No AWS credential errors

**AWS Services to Verify:**
- [ ] S3 (file storage)
- [ ] CloudFront (CDN)
- [ ] SES (email, if used)
- [ ] SNS (notifications, if used)

---

### 3.2 Azure Storage

**Impact:** MEDIUM - Alternative storage affected
**Estimated Time:** 20 minutes

#### Current Credentials
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY`

#### Steps

1. **Log in to Azure Portal:**
   - Go to: https://portal.azure.com/

2. **Rotate storage account key:**
   - Navigate to: Storage Accounts > [your-account] > Access keys
   - Click "Rotate key" for key1 or key2
   - Copy new key immediately

3. **Update .env file:**
   ```bash
   AZURE_STORAGE_ACCOUNT_KEY=NEW_KEY_HERE
   ```

4. **Restart application:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] Blob uploads work
- [ ] Blob downloads work
- [ ] Container access works

---

### 3.3 Google OAuth

**Impact:** MEDIUM - "Sign in with Google" affected
**Estimated Time:** 20 minutes

#### Current Credentials
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

#### Steps

1. **Log in to Google Cloud Console:**
   - Go to: https://console.cloud.google.com/

2. **Create new OAuth 2.0 credentials:**
   - Navigate to: APIs & Services > Credentials
   - Find your OAuth 2.0 Client ID
   - Click name to view details
   - Click "ADD CLIENT ID" or create new credentials
   - Download JSON or copy Client ID and Secret

3. **Update existing credential (alternative):**
   - You cannot rotate the secret directly
   - Must create new OAuth 2.0 Client ID
   - Update authorized redirect URIs
   - Delete old credential after testing

4. **Update .env file:**
   ```bash
   GOOGLE_CLIENT_ID=NEW_CLIENT_ID.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-NEW_SECRET
   ```

5. **Update frontend:**
   ```bash
   # apps/web/.env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=NEW_CLIENT_ID
   ```

6. **Restart services:**
   ```bash
   docker-compose restart api web
   ```

7. **Test Google Sign-In:**
   - Attempt "Sign in with Google"
   - Verify user info retrieval
   - Check token validation

**Verification Checklist:**
- [ ] "Sign in with Google" button works
- [ ] Can authenticate with Google
- [ ] User profile data retrieved
- [ ] No OAuth errors

---

### 3.4 Facebook OAuth & Conversions API

**Impact:** MEDIUM - Facebook login and tracking affected
**Estimated Time:** 25 minutes

#### Current Credentials
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_ACCESS_TOKEN`
- `FACEBOOK_PIXEL_ID`

#### Steps

1. **Log in to Facebook Developers:**
   - Go to: https://developers.facebook.com/apps/

2. **Reset App Secret:**
   - Select your app
   - Navigate to: Settings > Basic
   - Under "App Secret", click "Reset"
   - Confirm reset (immediate effect)
   - Copy new App Secret

3. **Generate new Access Token:**
   - Navigate to: Tools > Access Token Tool
   - Generate new long-lived token
   - Or use Graph API Explorer with appropriate permissions

4. **Update .env file:**
   ```bash
   FACEBOOK_APP_SECRET=NEW_SECRET_HERE
   FACEBOOK_ACCESS_TOKEN=NEW_ACCESS_TOKEN
   ```

5. **Restart application:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] Facebook login works
- [ ] Conversions API events send successfully
- [ ] Pixel fires correctly

---

### 3.5 GitHub OAuth

**Impact:** LOW - GitHub login affected
**Estimated Time:** 15 minutes

#### Current Credentials
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

#### Steps

1. **Log in to GitHub:**
   - Go to: https://github.com/settings/developers

2. **Reset client secret:**
   - Navigate to: OAuth Apps > [your-app]
   - Click "Generate a new client secret"
   - Copy new secret immediately (cannot be viewed again)

3. **Update .env file:**
   ```bash
   GITHUB_CLIENT_SECRET=NEW_SECRET_HERE
   ```

4. **Restart application:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] GitHub OAuth flow works
- [ ] User data retrieved correctly

---

### 3.6 Apple Sign In

**Impact:** MEDIUM - Apple login affected (iOS app)
**Estimated Time:** 30 minutes

#### Current Credentials
- `APPLE_CLIENT_ID`
- `APPLE_SHARED_SECRET`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`

#### Steps

1. **Log in to Apple Developer:**
   - Go to: https://developer.apple.com/account/

2. **Revoke old key:**
   - Navigate to: Certificates, Identifiers & Profiles > Keys
   - Find old key and revoke

3. **Create new key:**
   - Click "+" to create new key
   - Select "Sign In with Apple"
   - Download .p8 file (cannot be downloaded again!)
   - Note Key ID

4. **Update .env file:**
   ```bash
   APPLE_KEY_ID=NEW_KEY_ID
   APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nNEW_KEY\n-----END PRIVATE KEY-----
   ```

**Verification Checklist:**
- [ ] Apple Sign In works on iOS app
- [ ] Token validation works
- [ ] User info retrieved

---

## Phase 4: Auxiliary Services (8-24 hours)

### 4.1 SendGrid (Email)

**Impact:** MEDIUM - Transactional emails affected
**Estimated Time:** 15 minutes

#### Current Credentials
- `SENDGRID_API_KEY`

#### Steps

1. **Log in to SendGrid:**
   - Go to: https://app.sendgrid.com/

2. **Create new API key:**
   - Navigate to: Settings > API Keys
   - Click "Create API Key"
   - Name: "Production API Key - Rotated 2025-12-04"
   - Permissions: Full Access (or specific scopes)
   - Copy key immediately (cannot be viewed again)

3. **Update .env file:**
   ```bash
   SENDGRID_API_KEY=SG.NEW_API_KEY_HERE
   ```

4. **Delete old API key:**
   - In SendGrid dashboard, find old key
   - Click "..." > "Delete"

5. **Restart application:**
   ```bash
   docker-compose restart api
   ```

6. **Test email sending:**
   ```bash
   # Trigger test email
   curl -X POST http://localhost:4000/api/test/email \
     -H "Content-Type: application/json" \
     -d '{"to":"test@example.com"}'
   ```

**Verification Checklist:**
- [ ] Transactional emails send
- [ ] Welcome emails send
- [ ] Password reset emails send
- [ ] Order confirmation emails send

---

### 4.2 OpenAI API

**Impact:** LOW - AI features affected
**Estimated Time:** 10 minutes

#### Current Credentials
- `OPENAI_API_KEY`

#### Steps

1. **Log in to OpenAI Platform:**
   - Go to: https://platform.openai.com/

2. **Create new API key:**
   - Navigate to: API Keys
   - Click "Create new secret key"
   - Name: "CitadelBuy Production - Rotated 2025-12-04"
   - Copy key immediately

3. **Revoke old key:**
   - Find old key in list
   - Click "Revoke"

4. **Update .env file:**
   ```bash
   OPENAI_API_KEY=sk-proj-NEW_KEY_HERE
   ```

5. **Restart application:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] AI product descriptions generate
- [ ] Chatbot responds
- [ ] Image recognition works

---

### 4.3 Elasticsearch

**Impact:** MEDIUM - Search functionality affected
**Estimated Time:** 20 minutes

#### Current Credentials
- `ELASTICSEARCH_USERNAME`
- `ELASTICSEARCH_PASSWORD`

#### Steps

1. **Access Elasticsearch:**
   ```bash
   # Via curl
   curl -u elastic:current_password https://localhost:9200
   ```

2. **Change password:**
   ```bash
   # Using elasticsearch-users (if local)
   bin/elasticsearch-users passwd elastic

   # Or via API
   curl -X POST "localhost:9200/_security/user/elastic/_password" \
     -H 'Content-Type: application/json' \
     -u "elastic:current_password" \
     -d'{ "password" : "NEW_PASSWORD_HERE" }'
   ```

3. **Update .env file:**
   ```bash
   ELASTICSEARCH_PASSWORD=NEW_PASSWORD_HERE
   ```

4. **Restart application:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] Search queries work
- [ ] Index operations work
- [ ] No authentication errors

---

### 4.4 Algolia (Alternative Search)

**Impact:** LOW - Alternative search affected
**Estimated Time:** 15 minutes

#### Current Credentials
- `ALGOLIA_APP_ID`
- `ALGOLIA_API_KEY`

#### Steps

1. **Log in to Algolia:**
   - Go to: https://www.algolia.com/account/

2. **Rotate Admin API Key:**
   - Navigate to: API Keys
   - Cannot rotate Admin key directly
   - Create new application (if necessary)
   - Or create new API key with same permissions
   - Delete old key

3. **Update .env file:**
   ```bash
   ALGOLIA_API_KEY=NEW_KEY_HERE
   ```

**Verification Checklist:**
- [ ] Search works
- [ ] Index updates work

---

### 4.5 Sentry (Error Tracking)

**Impact:** LOW - Error tracking affected
**Estimated Time:** 10 minutes

#### Current Credentials
- `SENTRY_DSN`

#### Steps

1. **Log in to Sentry:**
   - Go to: https://sentry.io/

2. **Regenerate DSN:**
   - Navigate to: Settings > Projects > [your-project] > Client Keys (DSN)
   - Create new key or regenerate existing
   - Copy new DSN

3. **Update .env file:**
   ```bash
   SENTRY_DSN=https://NEW_KEY@o0000000.ingest.sentry.io/0000000
   ```

4. **Restart application:**
   ```bash
   docker-compose restart api web
   ```

**Verification Checklist:**
- [ ] Errors appear in Sentry dashboard
- [ ] Source maps upload (if applicable)

---

### 4.6 Google Cloud Vision API

**Impact:** LOW - Visual search affected
**Estimated Time:** 25 minutes

#### Current Credentials
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON)

#### Steps

1. **Log in to Google Cloud Console:**
   - Go to: https://console.cloud.google.com/

2. **Create new service account key:**
   - Navigate to: IAM & Admin > Service Accounts
   - Find service account used for Vision API
   - Click "..." > "Manage keys"
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download and save securely

3. **Delete old key:**
   - In same menu, find old key
   - Click "..." > "Delete"

4. **Update .env file:**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/new/credentials.json
   ```

5. **Restart application:**
   ```bash
   docker-compose restart api
   ```

**Verification Checklist:**
- [ ] Vision API calls work
- [ ] Image labeling works
- [ ] No authentication errors

---

### 4.7 TikTok Events API

**Impact:** LOW - TikTok tracking affected
**Estimated Time:** 15 minutes

#### Current Credentials
- `TIKTOK_PIXEL_ID`
- `TIKTOK_ACCESS_TOKEN`

#### Steps

1. **Log in to TikTok Ads Manager:**
   - Go to: https://ads.tiktok.com/

2. **Generate new access token:**
   - Navigate to: Tools > Events
   - Find your pixel
   - Generate new access token

3. **Update .env file:**
   ```bash
   TIKTOK_ACCESS_TOKEN=NEW_TOKEN_HERE
   ```

**Verification Checklist:**
- [ ] Events send to TikTok
- [ ] Conversions tracked

---

### 4.8 Google Play Service Account

**Impact:** MEDIUM - Android IAP affected
**Estimated Time:** 25 minutes

#### Current Credentials
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

#### Steps

1. **Log in to Google Cloud Console:**
   - Go to: https://console.cloud.google.com/

2. **Create new service account key:**
   - Navigate to: IAM & Admin > Service Accounts
   - Find Play Billing service account
   - Create new key (JSON)

3. **Update .env file:**
   ```bash
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nNEW_KEY\n-----END PRIVATE KEY-----
   ```

**Verification Checklist:**
- [ ] Android IAP verification works
- [ ] Purchase receipts validate

---

### 4.9 Apple IAP

**Impact:** MEDIUM - iOS IAP affected
**Estimated Time:** 20 minutes

#### Current Credentials
- `APPLE_SHARED_SECRET`
- `APPLE_PRIVATE_KEY`

#### Steps

1. **Log in to App Store Connect:**
   - Go to: https://appstoreconnect.apple.com/

2. **Generate new shared secret:**
   - Navigate to: My Apps > [Your App] > App Information
   - Scroll to "App-Specific Shared Secret"
   - Click "Generate" or "Regenerate"

3. **Update .env file:**
   ```bash
   APPLE_SHARED_SECRET=NEW_SECRET_HERE
   ```

**Verification Checklist:**
- [ ] iOS IAP receipt validation works
- [ ] Subscriptions verify correctly

---

## Phase 5: Verification & Documentation (24-48 hours)

### 5.1 Complete System Test

Run comprehensive tests to ensure all rotations succeeded:

```bash
# API health check
curl http://localhost:4000/health

# Database connection
npm run test:db

# Redis connection
npm run test:redis

# Payment providers
npm run test:payments

# Email service
npm run test:email

# File uploads
npm run test:storage

# OAuth flows
npm run test:oauth

# Full integration tests
npm run test:e2e
```

### 5.2 Monitor Logs

Monitor application logs for 24-48 hours:

```bash
# Check for authentication errors
docker-compose logs -f api | grep -i "auth\|error\|fail"

# Check for payment errors
docker-compose logs -f api | grep -i "stripe\|paypal\|payment"

# Check for storage errors
docker-compose logs -f api | grep -i "s3\|azure\|storage"
```

### 5.3 Update Documentation

- [ ] Update internal wiki with rotation date
- [ ] Document which credentials were rotated
- [ ] Update runbooks with new credential locations
- [ ] Update disaster recovery procedures
- [ ] Update team onboarding docs

### 5.4 Team Verification

Have each team member verify they can:
- [ ] Log in to the application
- [ ] Access development environment
- [ ] Run application locally
- [ ] Deploy to staging (if applicable)

### 5.5 Security Scan

Run security scans to ensure no credentials remain exposed:

```bash
# Scan git history
trufflehog git file://. --only-verified

# Scan for secrets in codebase
gitleaks detect --source . --verbose

# Check .env files not in git
git status --ignored | grep .env
```

---

## Post-Rotation Checklist

### Immediate (0-24 hours)
- [ ] All critical credentials rotated (Phase 1)
- [ ] All payment credentials rotated (Phase 2)
- [ ] All cloud credentials rotated (Phase 3)
- [ ] Application running without errors
- [ ] Team notified and updated
- [ ] Old credentials deactivated

### Short-term (24-48 hours)
- [ ] Auxiliary credentials rotated (Phase 4)
- [ ] Full system testing completed
- [ ] Monitoring shows no errors
- [ ] Documentation updated
- [ ] Security scans completed

### Long-term (1-2 weeks)
- [ ] Old credentials permanently deleted
- [ ] Access logs reviewed for anomalies
- [ ] Incident report completed
- [ ] Process improvements identified
- [ ] Team training updated

---

## Emergency Rollback Plan

If critical issues occur during rotation:

### Immediate Rollback Steps

1. **Restore old credentials:**
   ```bash
   # Use backup .env file
   cp .env.backup.TIMESTAMP .env
   ```

2. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Verify service restoration:**
   ```bash
   curl http://localhost:4000/health
   ```

4. **Document the issue:**
   - What failed?
   - Which credential caused the issue?
   - Error messages/logs

5. **Plan retry:**
   - Fix root cause
   - Test in staging first
   - Retry rotation during next maintenance window

---

## Credential Storage Best Practices

After rotation, store credentials securely:

### Development Environment
- Use `.env` file (gitignored)
- Or use `direnv` with `.envrc`
- Or use password manager (1Password, LastPass)

### Production Environment
- **AWS:** Use AWS Secrets Manager or Parameter Store
- **Azure:** Use Azure Key Vault
- **GCP:** Use Google Cloud Secret Manager
- **Self-hosted:** Use HashiCorp Vault

### Example: Using AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name citadelbuy/production/database \
  --secret-string '{"username":"user","password":"pass"}'

# Retrieve in application
const secret = await secretsManager
  .getSecretValue({ SecretId: 'citadelbuy/production/database' })
  .promise();
```

---

## Regular Rotation Schedule

Establish a rotation schedule to prevent future incidents:

| Credential Type | Rotation Frequency | Owner |
|----------------|-------------------|-------|
| Database passwords | Every 90 days | DevOps |
| JWT secrets | Every 180 days | Backend Team |
| API keys (payment) | Every 90 days | Backend Team |
| OAuth secrets | Every 180 days | Backend Team |
| Encryption keys | Every 365 days | Security Team |
| AWS/Cloud credentials | Every 90 days | DevOps |
| Service accounts | Every 180 days | DevOps |

---

## Contact Information

**During Credential Rotation:**
- Security Lead: [Name/Contact]
- DevOps Lead: [Name/Contact]
- Backend Lead: [Name/Contact]
- Emergency Hotline: [Phone/Slack]

---

**Document Version:** 1.0
**Created:** 2025-12-04
**Last Rotation:** [To be filled]
**Next Scheduled Rotation:** [To be scheduled]

---

## Appendix: Quick Reference Commands

### Generate Secure Passwords
```bash
# 32-byte random password
openssl rand -base64 32

# 64-byte JWT secret
openssl rand -base64 64

# 32-byte hex encryption key (exactly 64 hex chars)
openssl rand -hex 32

# UUID (for webhook secrets, etc.)
uuidgen
```

### Test Database Connection
```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

### Test Redis Connection
```bash
redis-cli -u "$REDIS_URL" PING
```

### Test API Health
```bash
curl http://localhost:4000/health
```

### View Application Logs
```bash
# Docker
docker-compose logs -f api

# PM2
pm2 logs api

# System logs
journalctl -u citadelbuy-api -f
```
