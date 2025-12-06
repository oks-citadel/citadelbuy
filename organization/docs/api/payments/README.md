# Payment Webhooks Documentation

## Overview

CitadelBuy's payment webhook system provides robust, production-ready webhook handling for multiple payment providers. The system ensures exactly-once processing with idempotency guarantees, signature verification, and comprehensive error handling.

### Key Features

- **Multi-Provider Support**: Stripe, PayPal, Flutterwave, Paystack, Apple IAP, Google IAP
- **Idempotency Guarantees**: Events are processed exactly once using dual-layer checking (Redis + Database)
- **Security**: Cryptographic signature verification for all webhook events
- **Timeout Protection**: 5-minute processing window prevents hanging webhooks
- **Automatic Retries**: Failed webhooks can be retried after timeout expiration
- **Audit Trail**: Complete event history in database with metadata
- **Rate Limiting**: CSRF protection skipped but rate limiting enforced

## Architecture

```
┌─────────────────┐
│ Payment Provider│
│   (Stripe, etc) │
└────────┬────────┘
         │ POST webhook event
         ▼
┌─────────────────────────┐
│ PaymentsWebhookController│
│  - Signature Verification│
│  - Idempotency Check     │
│  - Event Locking         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ UnifiedWebhookService   │
│  - Event Processing     │
│  - Database Updates     │
│  - Revenue Recording    │
└─────────────────────────┘
```

## Supported Payment Providers

### 1. Stripe
- **Endpoint**: `POST /webhooks/payments/stripe`
- **Header**: `stripe-signature`
- **Events Supported**:
  - `payment_intent.succeeded` - Payment completed successfully
  - `payment_intent.payment_failed` - Payment failed
  - `charge.refunded` - Refund processed
  - `customer.subscription.created` - Subscription created
  - `customer.subscription.updated` - Subscription updated
  - `customer.subscription.deleted` - Subscription cancelled
  - `invoice.paid` - Invoice payment succeeded
  - `invoice.payment_failed` - Invoice payment failed

### 2. PayPal
- **Endpoint**: `POST /webhooks/payments/paypal`
- **Header**: `paypal-transmission-sig`
- **Events Supported**:
  - `CHECKOUT.ORDER.APPROVED` - Order approved by customer
  - `PAYMENT.CAPTURE.COMPLETED` - Payment captured
  - `PAYMENT.CAPTURE.DENIED` - Payment denied
  - `PAYMENT.CAPTURE.REFUNDED` - Refund completed
  - `BILLING.SUBSCRIPTION.ACTIVATED` - Subscription activated
  - `BILLING.SUBSCRIPTION.UPDATED` - Subscription updated
  - `BILLING.SUBSCRIPTION.CANCELLED` - Subscription cancelled
  - `BILLING.SUBSCRIPTION.SUSPENDED` - Subscription suspended

### 3. Flutterwave
- **Endpoint**: `POST /webhooks/payments/flutterwave`
- **Header**: `verif-hash`
- **Events Supported**:
  - `charge.completed` - Payment completed (check status field)
  - `transfer.completed` - Transfer to vendor completed

### 4. Paystack
- **Endpoint**: `POST /webhooks/payments/paystack`
- **Header**: `x-paystack-signature`
- **Events Supported**:
  - `charge.success` - Payment successful
  - `charge.failed` - Payment failed
  - `refund.processed` - Refund completed
  - `subscription.create` - Subscription created
  - `subscription.not_renew` - Subscription won't auto-renew
  - `subscription.disable` - Subscription disabled
  - `transfer.success` - Transfer successful

## Webhook Endpoints

### Base URL
```
https://api.citadelbuy.com/webhooks/payments
```

### Provider-Specific Endpoints

| Provider    | Endpoint                     | Method | Authentication Header      |
|-------------|------------------------------|--------|----------------------------|
| Stripe      | `/stripe`                    | POST   | `stripe-signature`         |
| PayPal      | `/paypal`                    | POST   | `paypal-transmission-sig`  |
| Flutterwave | `/flutterwave`               | POST   | `verif-hash`               |
| Paystack    | `/paystack`                  | POST   | `x-paystack-signature`     |
| Apple IAP   | `/apple` (via unified)       | POST   | None (JWT in payload)      |
| Google IAP  | `/google` (via unified)      | POST   | None (JWT in payload)      |

### Health Check
```
POST /webhooks/payments/health
```

Returns processing statistics and system status.

## Webhook Signature Verification

### Stripe

Stripe signs webhooks using HMAC SHA256. The signature is in the `stripe-signature` header.

```typescript
// Automatic verification in controller
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**Environment Variable Required**: `STRIPE_WEBHOOK_SECRET`

### PayPal

PayPal uses a complex verification system with multiple headers:

```typescript
// Headers required for verification
{
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-cert-url': 'https://api.paypal.com/...',
  'paypal-transmission-id': 'unique-id',
  'paypal-transmission-sig': 'signature',
  'paypal-transmission-time': '2025-12-04T10:00:00Z'
}
```

**Environment Variables Required**:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`

### Flutterwave

Flutterwave uses a simple secret hash verification:

```typescript
// Verify hash matches configured secret
if (verifHash !== process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
  throw new Error('Invalid signature');
}
```

**Environment Variable Required**: `FLUTTERWAVE_WEBHOOK_SECRET`

### Paystack

Paystack uses HMAC SHA512 signature:

```typescript
const hash = crypto
  .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
  .update(JSON.stringify(body))
  .digest('hex');

if (hash !== signature) {
  throw new Error('Invalid signature');
}
```

**Environment Variable Required**: `PAYSTACK_SECRET_KEY`

## Payload Examples

### Stripe: payment_intent.succeeded

```json
{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "livemode": true,
  "api_version": "2024-11-20.acacia",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "object": "payment_intent",
      "amount": 5000,
      "currency": "usd",
      "status": "succeeded",
      "customer": "cus_1234567890",
      "metadata": {
        "order_id": "ord_abc123",
        "user_id": "user_xyz789"
      }
    }
  }
}
```

### PayPal: PAYMENT.CAPTURE.COMPLETED

```json
{
  "id": "WH-1234567890",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource_type": "capture",
  "summary": "Payment completed for $50.00 USD",
  "resource": {
    "id": "5678901234",
    "status": "COMPLETED",
    "amount": {
      "currency_code": "USD",
      "value": "50.00"
    },
    "seller_receivable_breakdown": {
      "gross_amount": {
        "currency_code": "USD",
        "value": "50.00"
      }
    },
    "custom_id": "ord_abc123"
  }
}
```

### Flutterwave: charge.completed

```json
{
  "event": "charge.completed",
  "id": 1234567,
  "tx_ref": "FLW_abc123",
  "status": "successful",
  "amount": 5000,
  "currency": "NGN",
  "charged_amount": 5000,
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe"
  }
}
```

### Paystack: charge.success

```json
{
  "event": "charge.success",
  "id": 1234567,
  "data": {
    "id": 987654321,
    "reference": "PSK_abc123xyz",
    "amount": 500000,
    "currency": "NGN",
    "status": "success",
    "channel": "card",
    "customer": {
      "email": "customer@example.com"
    },
    "authorization": {
      "authorization_code": "AUTH_abc123",
      "last4": "4242",
      "brand": "visa"
    },
    "paid_at": "2025-12-04T10:00:00.000Z"
  }
}
```

## Idempotency Handling

The webhook system uses a dual-layer idempotency mechanism to ensure events are processed exactly once:

### Layer 1: Redis Cache
- Fast in-memory lookup for recent events
- 7-day TTL to prevent memory bloat
- Sub-millisecond response time

### Layer 2: Database Persistence
- Long-term audit trail
- Survives application restarts
- Unique constraint on `(eventId, provider)`

### Processing Flow

```typescript
// 1. Check if event already processed
const canProcess = await idempotencyService.checkAndLockEvent(
  eventId,
  provider,
  eventType,
  metadata
);

if (!canProcess) {
  // Event already processed or currently processing
  return { received: true, message: 'Event already processed' };
}

// 2. Process the webhook
try {
  await processWebhook(event);

  // 3. Mark as completed
  await idempotencyService.markEventCompleted(
    eventId,
    provider,
    metadata
  );
} catch (error) {
  // 4. Mark as failed (will allow retry after timeout)
  await idempotencyService.markEventFailed(
    eventId,
    provider,
    error.message
  );
}
```

### Timeout Protection

Events stuck in "processing" state for more than 5 minutes are considered timed out and can be retried:

```typescript
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Check if processing timeout expired
const processingTime = Date.now() - event.processedAt.getTime();
if (processingTime >= PROCESSING_TIMEOUT_MS) {
  // Allow retry
  return true;
}
```

## Error Handling

### Status Codes

| Status Code | Meaning | Provider Action |
|-------------|---------|-----------------|
| 200 | Success | Stop retrying |
| 400 | Bad Request (invalid signature, etc.) | Stop retrying |
| 500 | Server Error | Retry with exponential backoff |

### Retry Logic

Different providers implement different retry strategies:

**Stripe**: Automatic retry for up to 3 days with exponential backoff

**PayPal**: Retries for 10 attempts over 24 hours

**Flutterwave**: Retries for 24 hours

**Paystack**: Retries for 3 days

### Error Response Format

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Testing Webhooks Locally

### Option 1: Stripe CLI (Recommended for Stripe)

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/webhooks/payments/stripe
```

4. Get webhook signing secret:
```bash
# The stripe listen command will output something like:
# > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
# Add this to your .env file as STRIPE_WEBHOOK_SECRET
```

5. Trigger test events:
```bash
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger charge.refunded
```

### Option 2: ngrok (All Providers)

1. Install ngrok:
```bash
# Download from https://ngrok.com/download
# Or use package manager:
npm install -g ngrok
```

2. Start your local server:
```bash
npm run start:dev
```

3. Create ngrok tunnel:
```bash
ngrok http 3000
```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Configure webhook URLs in provider dashboards:
```
Stripe:    https://abc123.ngrok.io/webhooks/payments/stripe
PayPal:    https://abc123.ngrok.io/webhooks/payments/paypal
Flutterwave: https://abc123.ngrok.io/webhooks/payments/flutterwave
Paystack:  https://abc123.ngrok.io/webhooks/payments/paystack
```

### Option 3: Webhook Testing Tools

**RequestBin / Webhook.site**
- Create temporary webhook URL
- View incoming webhook requests
- Forward to local development server

**Postman**
- Create POST requests with proper headers and payloads
- Test signature verification
- Simulate different event types

### Testing Script

Create a test script for local webhook testing:

```typescript
// test/webhook-test.ts
import * as crypto from 'crypto';

interface WebhookTestConfig {
  provider: 'stripe' | 'paypal' | 'flutterwave' | 'paystack';
  eventType: string;
  payload: any;
}

async function testWebhook(config: WebhookTestConfig) {
  const baseUrl = 'http://localhost:3000/webhooks/payments';
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let body = JSON.stringify(config.payload);

  // Generate signature based on provider
  switch (config.provider) {
    case 'stripe':
      const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET!;
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', stripeSecret)
        .update(signedPayload)
        .digest('hex');
      headers['stripe-signature'] = `t=${timestamp},v1=${signature}`;
      break;

    case 'paystack':
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY!;
      const hash = crypto
        .createHmac('sha512', paystackSecret)
        .update(body)
        .digest('hex');
      headers['x-paystack-signature'] = hash;
      break;

    case 'flutterwave':
      headers['verif-hash'] = process.env.FLUTTERWAVE_WEBHOOK_SECRET!;
      break;

    case 'paypal':
      // PayPal requires complex verification, use sandbox for testing
      headers['paypal-transmission-sig'] = 'test-signature';
      break;
  }

  const response = await fetch(`${baseUrl}/${config.provider}`, {
    method: 'POST',
    headers,
    body,
  });

  console.log(`Status: ${response.status}`);
  console.log(`Response:`, await response.json());
}

// Example: Test Stripe payment success
testWebhook({
  provider: 'stripe',
  eventType: 'payment_intent.succeeded',
  payload: {
    id: 'evt_test_123',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
      },
    },
  },
});
```

Run the test:
```bash
ts-node test/webhook-test.ts
```

## Monitoring and Debugging

### View Webhook Statistics

```bash
curl -X POST http://localhost:3000/webhooks/payments/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "statistics": {
    "total": 1523,
    "completed": 1498,
    "failed": 15,
    "processing": 10
  }
}
```

### Database Queries

Check recent webhook events:
```sql
SELECT
  event_id,
  provider,
  event_type,
  status,
  processed_at,
  metadata
FROM payment_webhook_events
ORDER BY processed_at DESC
LIMIT 20;
```

Find failed webhooks:
```sql
SELECT
  event_id,
  provider,
  event_type,
  metadata->>'errorMessage' as error_message,
  processed_at
FROM payment_webhook_events
WHERE status = 'failed'
ORDER BY processed_at DESC;
```

Check processing time:
```sql
SELECT
  provider,
  event_type,
  AVG((metadata->>'processingTime')::integer) as avg_processing_ms,
  MAX((metadata->>'processingTime')::integer) as max_processing_ms
FROM payment_webhook_events
WHERE status = 'completed'
  AND metadata->>'processingTime' IS NOT NULL
GROUP BY provider, event_type;
```

### Logging

The system uses NestJS Logger with context:

```typescript
// View logs with filtering
# All webhook events
npm run start:dev | grep "PaymentsWebhookController"

# Only errors
npm run start:dev | grep "ERROR"

# Specific provider
npm run start:dev | grep "Stripe webhook"
```

## Troubleshooting Common Issues

### Issue: Webhook signature verification fails

**Symptoms**:
```
Webhook signature verification failed: No signatures found matching the expected signature
```

**Solution**:
1. Verify webhook secret is correctly set in environment variables
2. Ensure raw body is being used (not parsed JSON)
3. Check that the secret matches the provider's dashboard
4. For Stripe: Ensure using correct secret for test/live mode

### Issue: Duplicate webhook processing

**Symptoms**: Same event processed multiple times

**Solution**:
1. Check that idempotency service is enabled
2. Verify Redis connection is working
3. Check database unique constraint on `payment_webhook_events` table
4. Review logs for concurrent processing attempts

### Issue: Webhooks timing out

**Symptoms**:
```
Webhook processing timeout
```

**Solution**:
1. Optimize event processing logic
2. Move heavy operations to background jobs
3. Increase `PROCESSING_TIMEOUT_MS` if needed (default: 5 minutes)
4. Check database connection pool exhaustion

### Issue: Provider-specific problems

**Stripe**:
- Problem: Events not received
- Solution: Check webhook endpoint configuration in Stripe Dashboard > Developers > Webhooks

**PayPal**:
- Problem: Signature verification fails
- Solution: Ensure `PAYPAL_WEBHOOK_ID` is set correctly from PayPal Developer Dashboard

**Flutterwave**:
- Problem: Invalid hash
- Solution: Verify `FLUTTERWAVE_WEBHOOK_SECRET` matches the secret in Flutterwave dashboard

**Paystack**:
- Problem: Signature mismatch
- Solution: Use raw body (not parsed JSON) for signature verification

### Issue: Missing raw body

**Symptoms**:
```
Missing request body
```

**Solution**:
1. Configure NestJS to keep raw body:

```typescript
// main.ts
app.use(bodyParser.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
```

2. Use `@Req() req: RawBodyRequest<Request>` in controller

## Security Considerations

### 1. Always Verify Signatures
Never process webhooks without signature verification. All production endpoints must validate signatures.

### 2. Use HTTPS Only
Webhooks must be sent over HTTPS. Configure providers to use `https://` URLs only.

### 3. IP Whitelisting (Optional)
Consider whitelisting provider IPs:

**Stripe IPs**:
```
3.18.12.63
3.130.192.231
13.235.14.237
13.235.122.149
18.211.135.69
35.154.171.200
52.15.183.38
54.187.174.169
54.187.205.235
54.187.216.72
```

### 4. Rate Limiting
Implement rate limiting on webhook endpoints to prevent abuse:

```typescript
@ThrottlerGuard({
  ttl: 60,
  limit: 100,
})
```

### 5. Environment Variables
Store all secrets in environment variables, never in code:

```bash
# .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
PAYPAL_WEBHOOK_ID=1AB2C3D4E5F6G7H8I9J0
FLUTTERWAVE_WEBHOOK_SECRET=xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### 6. Audit Logging
All webhook events are logged to database for audit trail. Retain logs for compliance:

```typescript
// Cleanup old events after 90 days
await idempotencyService.cleanupOldEvents(90);
```

### 7. CSRF Protection
CSRF protection is explicitly skipped for webhook endpoints using `@SkipCsrf()` decorator since webhooks come from external services.

## Production Checklist

Before deploying to production:

- [ ] All webhook secrets configured in environment variables
- [ ] Webhook URLs configured in all provider dashboards
- [ ] Using HTTPS endpoints only
- [ ] Raw body parser configured in NestJS
- [ ] Redis connection established for idempotency
- [ ] Database migrations applied (`payment_webhook_events` table exists)
- [ ] Monitoring and alerting configured for failed webhooks
- [ ] Log aggregation enabled (e.g., CloudWatch, DataDog)
- [ ] Webhook signature verification tested for all providers
- [ ] Idempotency tested (send same event twice, verify processed once)
- [ ] Timeout handling tested
- [ ] Error notifications configured (e.g., Slack, PagerDuty)
- [ ] Rate limiting configured
- [ ] Webhook endpoints excluded from authentication middleware
- [ ] Health check endpoint accessible for monitoring

## Environment Variables Reference

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_ENABLED=true

# PayPal
PAYPAL_CLIENT_ID=xxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxx
PAYPAL_WEBHOOK_ID=1AB2C3D4E5F6G7H8I9J0
PAYPAL_MODE=production  # or 'sandbox'

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=xxxxxxxxxxxxx
FLUTTERWAVE_ENABLED=true

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYSTACK_ENABLED=true

# Redis (for idempotency)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/citadelbuy
```

## API Reference

### POST /webhooks/payments/stripe
Handle Stripe webhook events.

**Headers**:
- `stripe-signature` (required): Webhook signature

**Response**:
```json
{
  "received": true,
  "eventId": "evt_123",
  "eventType": "payment_intent.succeeded"
}
```

### POST /webhooks/payments/paypal
Handle PayPal webhook events.

**Headers**:
- `paypal-transmission-sig` (required): Webhook signature
- `paypal-transmission-id` (required): Transmission ID
- `paypal-transmission-time` (required): Transmission timestamp
- `paypal-auth-algo` (required): Algorithm used
- `paypal-cert-url` (required): Certificate URL

**Response**:
```json
{
  "received": true,
  "eventId": "WH-123",
  "eventType": "PAYMENT.CAPTURE.COMPLETED"
}
```

### POST /webhooks/payments/flutterwave
Handle Flutterwave webhook events.

**Headers**:
- `verif-hash` (required): Webhook verification hash

**Response**:
```json
{
  "status": "success",
  "eventId": "1234567"
}
```

### POST /webhooks/payments/paystack
Handle Paystack webhook events.

**Headers**:
- `x-paystack-signature` (required): Webhook signature

**Response**:
```
HTTP 200 OK
```

### POST /webhooks/payments/health
Get webhook processing statistics.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "statistics": {
    "total": 1523,
    "completed": 1498,
    "failed": 15,
    "processing": 10
  }
}
```

## Related Documentation

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api/webhooks/v1/)
- [Flutterwave Webhooks Documentation](https://developer.flutterwave.com/docs/integration-guides/webhooks)
- [Paystack Webhooks Documentation](https://paystack.com/docs/payments/webhooks)

## Support

For webhook-related issues:
1. Check application logs for detailed error messages
2. Verify webhook configuration in provider dashboard
3. Test webhook locally using Stripe CLI or ngrok
4. Review this documentation for troubleshooting tips
5. Contact DevOps team for production issues

---

**Last Updated**: December 4, 2025
**Version**: 1.0.0
**Maintained By**: CitadelBuy Engineering Team
