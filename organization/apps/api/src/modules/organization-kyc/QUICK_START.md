# KYC Provider Integration - Quick Start Guide

## Table of Contents
1. [Development Setup (Mock Mode)](#development-setup-mock-mode)
2. [Testing with Real Provider (Sandbox)](#testing-with-real-provider-sandbox)
3. [Production Deployment](#production-deployment)
4. [Common Tasks](#common-tasks)

---

## Development Setup (Mock Mode)

For local development and testing without incurring provider costs.

### 1. Configure Environment Variables

Copy the example configuration:
```bash
cp .env.example .env
```

Set KYC provider to mock:
```env
KYC_PROVIDER=mock
NODE_ENV=development
```

### 2. Start the Application

```bash
npm install
npm run start:dev
```

### 3. Test KYC Submission

Submit a KYC application:
```bash
curl -X POST http://localhost:3000/api/kyc/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "businessName": "Test Corp",
    "businessAddress": "123 Main St",
    "businessCity": "New York",
    "businessState": "NY",
    "businessPostalCode": "10001",
    "businessCountry": "US",
    "taxId": "12-3456789",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@test.com",
    "phoneNumber": "+1234567890"
  }'
```

### 4. Verify Mock Results

Check the response - it should include:
```json
{
  "id": "kyc_abc123",
  "status": "UNDER_REVIEW",
  "verificationData": {
    "isMockData": true,
    "provider": "mock",
    ...
  }
}
```

**Important**: Mock mode provides simulated results instantly. No real verification occurs.

---

## Testing with Real Provider (Sandbox)

Test with a real KYC provider using their sandbox environment.

### 1. Create Provider Account

Choose a provider and sign up for a sandbox/test account:

- **Onfido**: https://onfido.com/signup
- **Jumio**: https://www.jumio.com/contact
- **Sumsub**: https://sumsub.com/contact-sales

### 2. Get API Credentials

#### For Onfido:
1. Log in to Onfido Dashboard
2. Go to Settings → API Tokens
3. Create a test token (starts with `test_`)
4. Go to Settings → Webhooks
5. Create a webhook token

#### For Jumio:
1. Log in to Jumio Portal
2. Go to Settings → API Credentials
3. Copy API Token and API Secret
4. Go to Settings → Webhooks
5. Create webhook secret

#### For Sumsub:
1. Log in to Sumsub Dashboard
2. Go to Settings → App Tokens
3. Create app token and copy secret key
4. Go to Settings → Webhooks
5. Create webhook secret

### 3. Configure Environment

Update `.env`:
```env
# Choose your provider
KYC_PROVIDER=onfido

# Onfido Sandbox Credentials
ONFIDO_API_TOKEN=test_abc123xyz...
ONFIDO_WEBHOOK_TOKEN=your_webhook_token
ONFIDO_REGION=us

NODE_ENV=development
```

### 4. Configure Webhook Endpoint

#### Option A: Use ngrok for local development
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
```

#### Option B: Deploy to staging server
Deploy your app to a staging server with a public URL and SSL certificate.

#### Configure webhook in provider dashboard:
- **Onfido**: Settings → Webhooks → Add URL: `https://your-domain.com/api/kyc/webhook/onfido`
- **Jumio**: Settings → Webhooks → Add URL: `https://your-domain.com/api/kyc/webhook/jumio`
- **Sumsub**: Settings → Webhooks → Add URL: `https://your-domain.com/api/kyc/webhook/sumsub`

### 5. Test with Sample Documents

Providers typically offer test documents:

#### Onfido Test Documents:
- Use the sample documents from their SDK or
- Upload any clear photo of an ID (will be processed but flagged as test)

#### Jumio Test Documents:
- Request test document pack from support
- Use provided sample IDs and selfies

#### Sumsub Test Documents:
- Use documents from their test documentation
- Or upload any valid ID (marked as test in sandbox)

### 6. Monitor Results

Watch your application logs:
```bash
npm run start:dev
```

You should see logs like:
```
[KycProviderService] KYC verification initiated for org org_123 with onfido
[OnfidoProvider] Onfido applicant created: app_abc123
[OnfidoProvider] Document uploaded for applicant app_abc123: doc_xyz789
[OnfidoProvider] Verification check created: check_456def
[KycWebhookController] Webhook received from onfido
[KycProviderService] Webhook processed for KYC kyc_123: APPROVED
```

### 7. Verify Webhook Delivery

Check provider dashboard for webhook delivery status:
- Should show 200 OK responses
- Check webhook payload and response
- Debug failed deliveries if any

---

## Production Deployment

Deploy KYC verification to production with real provider credentials.

### Pre-Deployment Checklist

- [ ] Provider production account created
- [ ] Live API credentials obtained
- [ ] Production webhook endpoint configured (HTTPS required)
- [ ] SSL certificate valid and not expiring soon
- [ ] Document storage configured (S3/Azure)
- [ ] Encryption key generated and secured
- [ ] Monitoring and alerting set up
- [ ] Cost tracking configured
- [ ] Backup KYC data strategy in place

### 1. Generate Encryption Key

```bash
# Generate 256-bit encryption key
openssl rand -hex 32
```

Save this securely (e.g., AWS Secrets Manager, Azure Key Vault)

### 2. Configure Production Environment

```env
# Provider
KYC_PROVIDER=onfido
NODE_ENV=production

# Onfido Live Credentials
ONFIDO_API_TOKEN=live_abc123xyz...
ONFIDO_WEBHOOK_TOKEN=your_production_webhook_token
ONFIDO_REGION=us

# Security
KYC_ENCRYPTION_KEY=your_generated_256_bit_key

# Storage (AWS S3 example)
STORAGE_PROVIDER=S3
STORAGE_BUCKET=broxiva-kyc-documents
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### 3. Configure Production Webhooks

In provider dashboard:
1. Add webhook URL: `https://api.broxiva.com/api/kyc/webhook/onfido`
2. Select events: `check.completed`, `check.failed`
3. Verify SSL certificate
4. Test webhook delivery
5. Save webhook token/secret

### 4. Deploy Application

```bash
# Build
npm run build

# Deploy to production
# (method depends on your infrastructure: Docker, K8s, serverless, etc.)
```

### 5. Verify Production Setup

Test with a real KYC submission:
```bash
curl -X POST https://api.broxiva.com/api/kyc/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PRODUCTION_JWT_TOKEN" \
  -d @test_kyc_data.json
```

### 6. Monitor First Verifications

Closely monitor the first 10-20 verifications:
- Check application logs
- Verify webhook delivery
- Confirm email notifications
- Review verification scores
- Check provider dashboard
- Monitor costs

### 7. Set Up Alerts

Configure alerts for:
- Failed verifications (error rate > 5%)
- Webhook delivery failures
- High API latency (> 5 seconds)
- Unusual cost spikes
- Low verification success rate (< 80%)

---

## Common Tasks

### Check KYC Application Status

```bash
curl -X GET https://api.broxiva.com/api/kyc/:kycId \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Manually Review Application

```bash
curl -X POST https://api.broxiva.com/api/kyc/:kycId/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "action": "approve",
    "notes": "All documents verified",
    "reviewerNotes": "Clear ID, valid address proof"
  }'
```

### Retry Failed Verification

```bash
curl -X POST https://api.broxiva.com/api/kyc/:kycId/retry \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Get Verification Statistics

```bash
curl -X GET https://api.broxiva.com/api/kyc/stats \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Switch Providers

Update environment:
```env
# Switch from Onfido to Jumio
KYC_PROVIDER=jumio
JUMIO_API_TOKEN=...
JUMIO_API_SECRET=...
```

Restart application:
```bash
npm run start:dev
```

New verifications will use Jumio. Existing verifications continue with Onfido.

### Debug Webhook Issues

#### Enable verbose logging:
```typescript
// In main.ts or bootstrap
app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
```

#### Test webhook signature manually:
```typescript
import * as crypto from 'crypto';

const payload = 'your_webhook_payload';
const signature = 'signature_from_header';
const secret = 'your_webhook_secret';

const hmac = crypto.createHmac('sha256', secret);
const expected = hmac.update(payload).digest('hex');

console.log('Expected:', expected);
console.log('Received:', signature);
console.log('Match:', expected === signature);
```

#### Check webhook delivery in provider dashboard:
- Look for failed deliveries
- Check response codes
- Review error messages
- Verify SSL certificate
- Test connectivity

### View Audit Logs

```sql
-- View all KYC-related audit logs
SELECT * FROM organization_audit_logs
WHERE action LIKE 'kyc.%'
ORDER BY created_at DESC
LIMIT 100;

-- View specific organization's KYC activity
SELECT * FROM organization_audit_logs
WHERE organization_id = 'org_123'
  AND action LIKE 'kyc.%'
ORDER BY created_at DESC;
```

### Export Verification Data

```bash
# Export to JSON
curl -X GET https://api.broxiva.com/api/kyc/export \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  > kyc_export_$(date +%Y%m%d).json

# Export specific organization
curl -X GET https://api.broxiva.com/api/kyc/export?organizationId=org_123 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  > kyc_org123_$(date +%Y%m%d).json
```

---

## Troubleshooting

### Issue: "KYC_PROVIDER is set to mock in production"
**Solution**: Update `KYC_PROVIDER` to `onfido`, `jumio`, or `sumsub` and set valid credentials.

### Issue: "Failed to create KYC applicant"
**Solutions**:
- Verify API token is correct
- Check network connectivity
- Review provider API status page
- Ensure token has required permissions

### Issue: "Webhook signature verification failed"
**Solutions**:
- Verify webhook token matches provider dashboard
- Check payload hasn't been modified by proxy/load balancer
- Ensure webhook endpoint uses HTTPS
- Test with curl to verify endpoint accessibility

### Issue: "Document upload failed"
**Solutions**:
- Check file size (usually max 10MB)
- Verify file format (JPEG, PNG, PDF)
- Ensure image quality is sufficient
- Check if document type is supported

### Issue: "Rate limit exceeded"
**Solutions**:
- Wait for rate limit reset (system auto-retries)
- Review API usage and reduce frequency
- Contact provider to increase limits
- Consider upgrading plan

---

## Next Steps

1. **Read Full Documentation**: See `REAL_KYC_IMPLEMENTATION.md` for complete details
2. **Review Provider Docs**: Familiarize yourself with chosen provider's API
3. **Set Up Monitoring**: Configure application monitoring and alerts
4. **Plan Scaling**: Consider queue systems (BullMQ) for high volume
5. **Optimize Costs**: Review verification costs and optimize check types

---

## Support

### Internal Support
- **Documentation**: `REAL_KYC_IMPLEMENTATION.md`
- **Code**: See inline TypeScript comments
- **Logs**: Check application logs with `npm run logs`

### Provider Support
- **Onfido**: support@onfido.com | https://onfido.com/support
- **Jumio**: support@jumio.com | https://support.jumio.com
- **Sumsub**: support@sumsub.com | https://sumsub.com/support

### Community
- **Stack Overflow**: Tag with provider name (e.g., `onfido`)
- **Provider Forums**: Check provider community forums
- **GitHub Issues**: Report bugs in this repository
