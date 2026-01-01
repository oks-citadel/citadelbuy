# Webhook Endpoints Documentation

This document provides comprehensive information about webhook configuration, implementation, and troubleshooting for Broxiva payment gateways.

## Table of Contents

- [Overview](#overview)
- [Webhook Endpoints](#webhook-endpoints)
- [Stripe Webhooks](#stripe-webhooks)
- [PayPal Webhooks](#paypal-webhooks)
- [Security & Verification](#security--verification)
- [Event Handling](#event-handling)
- [Testing Webhooks](#testing-webhooks)
- [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks are HTTP callbacks that payment providers use to notify your application about asynchronous events (successful payments, refunds, disputes, etc.). They are essential for reliable payment processing.

### Why Webhooks Are Critical

1. **Asynchronous Processing**: Payment confirmations happen after the user leaves your site
2. **Reliability**: Ensures you're notified even if the user closes their browser
3. **Real-time Updates**: Instant notification of payment status changes
4. **Dispute Handling**: Alerts you to chargebacks and disputes
5. **Refund Tracking**: Notifies when refunds are processed

### Webhook Flow

```
Payment Gateway (Stripe/PayPal)
    ↓ (Event occurs: payment success, refund, etc.)
    ↓
HTTP POST → Your Webhook Endpoint
    ↓
Verify Signature
    ↓
Process Event
    ↓
Return 200 OK (within 10 seconds)
```

---

## Webhook Endpoints

### Production URLs

| Provider | Endpoint URL | Method |
|----------|-------------|--------|
| Stripe | `https://broxiva.com/api/webhooks/stripe` | POST |
| PayPal | `https://broxiva.com/api/webhooks/paypal` | POST |

### Development URLs

| Provider | Endpoint URL | Method |
|----------|-------------|--------|
| Stripe | `https://dev.broxiva.com/api/webhooks/stripe` | POST |
| PayPal | `https://dev.broxiva.com/api/webhooks/paypal` | POST |

### Local Development (with tunneling)

```bash
# Using Stripe CLI (recommended for Stripe)
stripe listen --forward-to http://localhost:4000/api/webhooks/stripe

# Using ngrok (for PayPal and Stripe)
ngrok http 4000
# Endpoints: https://<random>.ngrok.io/api/webhooks/stripe
#            https://<random>.ngrok.io/api/webhooks/paypal
```

### Endpoint Requirements

- **Protocol**: HTTPS (required in production)
- **Response Time**: Must respond within 10 seconds
- **Status Code**: Return 200 OK for successful processing
- **Idempotency**: Process each event only once
- **Signature Verification**: Always verify webhook signatures

---

## Stripe Webhooks

### Configuration

#### 1. Create Webhook Endpoint

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
5. Select API version: **Latest**
6. Select events to listen for (see below)
7. Click **Add endpoint**
8. Copy the **Signing secret** (starts with `whsec_`)

#### 2. Environment Variables

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here
```

### Events to Subscribe To

#### Required Events

- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment attempt failed
- `payment_intent.canceled` - Payment intent was canceled
- `charge.refunded` - Refund was processed
- `charge.dispute.created` - Customer disputed a charge

#### Optional Events (Recommended)

- `charge.dispute.updated` - Dispute status changed
- `charge.dispute.closed` - Dispute was resolved
- `charge.succeeded` - Charge was successful
- `charge.failed` - Charge failed
- `customer.subscription.created` - Subscription created (if using subscriptions)
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Invoice paid (if using subscriptions)
- `invoice.payment_failed` - Invoice payment failed

### Webhook Event Structure

```json
{
  "id": "evt_1Abc2DefGHijk3Lm",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1Abc2DefGHijk3Lm",
      "amount": 5000,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "orderId": "order_123",
        "userId": "user_456"
      }
    }
  },
  "created": 1234567890,
  "livemode": false
}
```

### Handling Stripe Webhooks

#### Example Implementation

```typescript
// File: apps/api/src/modules/webhooks/stripe.controller.ts

import { Controller, Post, Headers, RawBodyRequest, Req, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from '../orders/orders.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private paymentsService: PaymentsService,
    private ordersService: OrdersService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    // Get raw body (required for signature verification)
    const payload = request.rawBody;

    // Verify webhook signature
    const event = this.paymentsService.constructWebhookEvent(
      payload,
      signature
    );

    // Handle event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;

      case 'charge.refunded':
        await this.handleRefund(event.data.object);
        break;

      case 'charge.dispute.created':
        await this.handleDispute(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) return;

    await this.ordersService.updateOrderStatus(orderId, 'PROCESSING', {
      paymentIntentId: paymentIntent.id,
      paymentMethod: 'card',
      paidAt: new Date(),
    });
  }

  private async handlePaymentFailure(paymentIntent: any) {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) return;

    await this.ordersService.updateOrderStatus(orderId, 'PAYMENT_FAILED', {
      failureReason: paymentIntent.last_payment_error?.message,
    });
  }

  private async handleRefund(charge: any) {
    // Update order status to refunded
    // Notify customer
  }

  private async handleDispute(dispute: any) {
    // Alert admin team
    // Update order status
    // Prepare dispute evidence
  }
}
```

### Signature Verification

Stripe webhooks are verified using the signing secret:

```typescript
// Automatically handled by PaymentsService
const event = this.paymentsService.constructWebhookEvent(
  rawBody,      // Raw request body (Buffer)
  signature,    // stripe-signature header
);
```

**IMPORTANT**: You must use the raw request body (not parsed JSON) for signature verification.

#### Express Configuration

```typescript
// apps/api/src/main.ts
app.use(
  '/webhooks',
  express.raw({ type: 'application/json' })
);
```

---

## PayPal Webhooks

### Configuration

#### 1. Create Webhook Endpoint

1. Log in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
2. Go to **My Apps & Credentials**
3. Select your app
4. Scroll to **Webhooks** section
5. Click **Add Webhook**
6. Enter webhook URL: `https://yourdomain.com/api/webhooks/paypal`
7. Select events (see below)
8. Click **Save**
9. Copy the **Webhook ID**

#### 2. Environment Variables

```bash
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id_here
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=production  # or 'sandbox' for testing
```

### Events to Subscribe To

#### Required Events

- `PAYMENT.CAPTURE.COMPLETED` - Payment captured successfully
- `PAYMENT.CAPTURE.DENIED` - Payment capture was denied
- `PAYMENT.CAPTURE.REFUNDED` - Payment was refunded
- `CUSTOMER.DISPUTE.CREATED` - Customer opened a dispute

#### Optional Events (Recommended)

- `PAYMENT.CAPTURE.PENDING` - Payment capture is pending
- `CUSTOMER.DISPUTE.RESOLVED` - Dispute was resolved
- `CUSTOMER.DISPUTE.UPDATED` - Dispute status changed
- `BILLING.SUBSCRIPTION.CREATED` - Subscription created
- `BILLING.SUBSCRIPTION.CANCELLED` - Subscription canceled

### Webhook Event Structure

```json
{
  "id": "WH-1AB23456CD789012E-3FG45678HI901234",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "id": "8AB12345CD678901E",
    "status": "COMPLETED",
    "amount": {
      "value": "50.00",
      "currency_code": "USD"
    },
    "custom_id": "order_123"
  },
  "create_time": "2024-01-15T12:34:56Z"
}
```

### Handling PayPal Webhooks

#### Example Implementation

```typescript
// File: apps/api/src/modules/webhooks/paypal.controller.ts

import { Controller, Post, Headers, Body, HttpCode } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from '../orders/orders.service';

@Controller('webhooks/paypal')
export class PayPalWebhookController {
  constructor(
    private paymentsService: PaymentsService,
    private ordersService: OrdersService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ) {
    // Verify webhook signature
    const isValid = await this.paymentsService.verifyPayPalWebhook(
      headers,
      body
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Handle event
    switch (body.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handlePaymentCompleted(body.resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await this.handlePaymentDenied(body.resource);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await this.handleRefund(body.resource);
        break;

      case 'CUSTOMER.DISPUTE.CREATED':
        await this.handleDispute(body.resource);
        break;

      default:
        console.log(`Unhandled event type: ${body.event_type}`);
    }

    return { received: true };
  }

  private async handlePaymentCompleted(resource: any) {
    const orderId = resource.custom_id;
    if (!orderId) return;

    await this.ordersService.updateOrderStatus(orderId, 'PROCESSING', {
      paypalCaptureId: resource.id,
      paymentMethod: 'paypal',
      paidAt: new Date(),
    });
  }

  private async handlePaymentDenied(resource: any) {
    const orderId = resource.custom_id;
    if (!orderId) return;

    await this.ordersService.updateOrderStatus(orderId, 'PAYMENT_FAILED', {
      failureReason: resource.status_details?.reason,
    });
  }

  private async handleRefund(resource: any) {
    // Update order status to refunded
    // Notify customer
  }

  private async handleDispute(dispute: any) {
    // Alert admin team
    // Update order status
    // Prepare dispute evidence
  }
}
```

### Signature Verification

PayPal webhooks use a more complex verification process:

```typescript
// Automatically handled by PaymentsService
const isValid = await this.paymentsService.verifyPayPalWebhook(
  headers,  // Request headers (contains PayPal signature headers)
  body,     // Request body (parsed JSON)
);
```

#### Required Headers

PayPal sends these headers with each webhook:

- `paypal-auth-algo`: Algorithm used (e.g., "SHA256withRSA")
- `paypal-cert-url`: URL to PayPal's certificate
- `paypal-transmission-id`: Unique transmission ID
- `paypal-transmission-sig`: Signature
- `paypal-transmission-time`: Timestamp

---

## Security & Verification

### Why Signature Verification Is Critical

Without verification, attackers could:
- Send fake payment success events
- Trigger unauthorized refunds
- Manipulate order statuses
- Steal customer data

### Stripe Signature Verification

Stripe uses HMAC SHA256 signatures:

```typescript
import Stripe from 'stripe';

const event = stripe.webhooks.constructEvent(
  rawBody,                              // Raw request body (Buffer)
  request.headers['stripe-signature'],  // Signature header
  process.env.STRIPE_WEBHOOK_SECRET     // Webhook signing secret
);
```

### PayPal Signature Verification

PayPal uses RSA signatures with certificate validation:

```typescript
const verificationPayload = {
  auth_algo: headers['paypal-auth-algo'],
  cert_url: headers['paypal-cert-url'],
  transmission_id: headers['paypal-transmission-id'],
  transmission_sig: headers['paypal-transmission-sig'],
  transmission_time: headers['paypal-transmission-time'],
  webhook_id: process.env.PAYPAL_WEBHOOK_ID,
  webhook_event: body,
};

// PayPal verifies via API call
const response = await fetch(
  'https://api-m.paypal.com/v1/notifications/verify-webhook-signature',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(verificationPayload),
  }
);

const result = await response.json();
const isValid = result.verification_status === 'SUCCESS';
```

### Best Practices

1. **Always Verify Signatures**: Never process unverified webhooks
2. **Use HTTPS**: Required for production webhooks
3. **Implement Idempotency**: Process each event only once
4. **Log Everything**: Keep detailed logs of all webhook events
5. **Respond Quickly**: Return 200 OK within 10 seconds
6. **Handle Retries**: Payment providers retry failed webhooks

---

## Event Handling

### Idempotency

Payment providers may send the same event multiple times. Implement idempotency:

```typescript
// Store processed event IDs
const processedEvents = new Set<string>();

async handleWebhook(event: any) {
  // Check if already processed
  if (processedEvents.has(event.id)) {
    return { received: true };
  }

  // Or use database
  const exists = await this.db.webhookEvent.findUnique({
    where: { eventId: event.id }
  });

  if (exists) {
    return { received: true };
  }

  // Process event
  await this.processEvent(event);

  // Mark as processed
  await this.db.webhookEvent.create({
    data: {
      eventId: event.id,
      type: event.type,
      processedAt: new Date(),
    }
  });

  return { received: true };
}
```

### Error Handling

```typescript
try {
  await this.processEvent(event);
  return { received: true };
} catch (error) {
  // Log error but still return 200 OK
  logger.error('Webhook processing failed', {
    eventId: event.id,
    error: error.message,
  });

  // Queue for retry
  await this.queueService.add('webhook-retry', {
    eventId: event.id,
    event: event,
    attempt: 1,
  });

  // Return 200 to prevent provider retries
  return { received: true };
}
```

### Async Processing

For complex operations, queue processing:

```typescript
@Post()
async handleWebhook(@Body() event: any) {
  // Verify signature
  // ...

  // Queue for async processing
  await this.queue.add('process-webhook', {
    eventId: event.id,
    eventType: event.type,
    data: event.data,
  });

  // Respond immediately
  return { received: true };
}
```

---

## Testing Webhooks

### Stripe CLI (Recommended for Stripe)

#### Installation

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.x.x/stripe_1.x.x_linux_x86_64.tar.gz
tar -xvf stripe_1.x.x_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

#### Login

```bash
stripe login
```

#### Forward Webhooks to Local Server

```bash
stripe listen --forward-to http://localhost:4000/api/webhooks/stripe
```

#### Trigger Test Events

```bash
# Successful payment
stripe trigger payment_intent.succeeded

# Failed payment
stripe trigger payment_intent.payment_failed

# Refund
stripe trigger charge.refunded

# Dispute
stripe trigger charge.dispute.created
```

### ngrok (For PayPal and Stripe)

#### Installation

```bash
npm install -g ngrok
```

#### Start Tunnel

```bash
ngrok http 4000
```

This provides a public HTTPS URL:
```
Forwarding: https://abc123.ngrok.io → http://localhost:4000
```

Use this URL for webhook configuration:
- Stripe: `https://abc123.ngrok.io/api/webhooks/stripe`
- PayPal: `https://abc123.ngrok.io/api/webhooks/paypal`

### Manual Testing with cURL

#### Stripe Webhook

```bash
curl -X POST http://localhost:4000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=timestamp,v1=signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 5000,
        "status": "succeeded"
      }
    }
  }'
```

#### PayPal Webhook

```bash
curl -X POST http://localhost:4000/api/webhooks/paypal \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource": {
      "id": "capture_123",
      "status": "COMPLETED",
      "amount": {
        "value": "50.00",
        "currency_code": "USD"
      }
    }
  }'
```

### Provider Dashboards

#### Stripe

1. Go to **Developers** → **Webhooks**
2. Click on your endpoint
3. Click **Send test webhook**
4. Select event type
5. Click **Send test webhook**

#### PayPal

1. Go to **Webhooks** in your app
2. Click on your webhook
3. Click **Simulate Events**
4. Select event type
5. Click **Send**

---

## Troubleshooting

### Common Issues

#### Webhook Not Received

**Symptoms**: No webhook events arriving at your endpoint

**Causes & Solutions**:

1. **Firewall blocking requests**
   - Check firewall rules
   - Ensure port is open
   - Whitelist payment provider IPs

2. **SSL certificate issues**
   - Verify SSL certificate is valid
   - Check for expired certificates
   - Ensure certificate chain is complete

3. **Incorrect endpoint URL**
   - Verify URL in provider dashboard
   - Check for typos
   - Ensure HTTPS in production

4. **Server not running**
   - Verify application is running
   - Check logs for startup errors

#### Signature Verification Failed

**Symptoms**: "Webhook signature verification failed" error

**Causes & Solutions**:

1. **Wrong signing secret**
   - Verify `STRIPE_WEBHOOK_SECRET` or `PAYPAL_WEBHOOK_ID`
   - Check for extra spaces or newlines
   - Ensure using correct environment (test vs. live)

2. **Request body parsing**
   - Ensure using raw body for Stripe
   - Don't parse JSON before verification
   - Check Express middleware configuration

3. **Signature header missing**
   - Verify header is being passed to handler
   - Check reverse proxy configuration

#### Webhook Timeouts

**Symptoms**: Payment provider reports webhook failures

**Causes & Solutions**:

1. **Slow processing**
   - Move heavy operations to background jobs
   - Return 200 OK immediately
   - Use async processing

2. **Database locks**
   - Optimize database queries
   - Use proper indexing
   - Consider read replicas

3. **External API calls**
   - Make external calls asynchronously
   - Don't block on third-party APIs
   - Implement timeouts

#### Duplicate Events

**Symptoms**: Same event processed multiple times

**Causes & Solutions**:

1. **No idempotency check**
   - Implement event ID tracking
   - Use database to store processed events
   - Check before processing

2. **Multiple webhook endpoints**
   - Remove duplicate endpoints in provider dashboard
   - Consolidate webhook handlers

### Debugging Tips

#### Enable Detailed Logging

```typescript
logger.debug('Webhook received', {
  provider: 'stripe',
  eventId: event.id,
  eventType: event.type,
  timestamp: new Date().toISOString(),
});
```

#### Inspect Headers

```typescript
console.log('Request headers:', request.headers);
console.log('Signature:', request.headers['stripe-signature']);
```

#### Check Raw Body

```typescript
console.log('Raw body:', request.rawBody);
console.log('Body type:', typeof request.rawBody);
```

#### Monitor Provider Dashboards

- **Stripe**: Developers → Events (view all events)
- **PayPal**: Webhooks → View events

---

## Webhook Monitoring

### Metrics to Track

- Webhook delivery success rate
- Average processing time
- Failed webhook count
- Retry attempts
- Event types received

### Alerting

Set up alerts for:

- High failure rate (> 5%)
- Slow processing (> 5 seconds)
- Missing critical events
- Signature verification failures

### Example Monitoring

```typescript
// Track webhook metrics
await metrics.increment('webhook.received', {
  provider: 'stripe',
  eventType: event.type,
});

await metrics.timing('webhook.processing_time', duration, {
  provider: 'stripe',
  eventType: event.type,
});

if (error) {
  await metrics.increment('webhook.failed', {
    provider: 'stripe',
    error: error.name,
  });
}
```

---

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api/webhooks/)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [ngrok Documentation](https://ngrok.com/docs)

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintained by**: Broxiva Development Team
