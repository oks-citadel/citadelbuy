# Payments Module

Multi-provider payment processing supporting Stripe, PayPal, Flutterwave, Paystack, and in-app purchases.

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/payments/create-intent` | Create payment intent | Yes |
| POST | `/api/payments/confirm` | Confirm payment | Yes |
| GET | `/api/payments/:id` | Get payment details | Yes |
| POST | `/api/payments/refund` | Process refund | Yes (Admin) |
| POST | `/api/webhooks/stripe` | Stripe webhook | No (signature verified) |
| POST | `/api/webhooks/paypal` | PayPal webhook | No (signature verified) |

## Supported Providers

| Provider | Region | Features |
|----------|--------|----------|
| Stripe | Global | Cards, Apple Pay, Google Pay, ACH |
| PayPal | Global | PayPal balance, cards |
| Flutterwave | Africa | Cards, bank transfer, mobile money |
| Paystack | Africa | Cards, bank transfer |
| Apple IAP | iOS | In-app subscriptions |
| Google Play | Android | In-app subscriptions |

## Configuration

```env
# Stripe
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal
PAYPAL_ENABLED=true
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=sandbox

# Flutterwave (Africa)
FLUTTERWAVE_ENABLED=false
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxx

# Paystack (Africa)
PAYSTACK_ENABLED=false
PAYSTACK_SECRET_KEY=sk_test_xxx
```

## Services

- `PaymentsService` - Core payment processing
- `StripeProvider` - Stripe integration
- `PaypalProvider` - PayPal integration
- `FlutterwaveProvider` - Flutterwave integration
- `PaystackProvider` - Paystack integration

## Webhook Handling

All providers use signature verification:

```typescript
// Stripe webhook verification
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

## Multi-Currency Support

Located in `multi-currency/`:

- Automatic currency detection based on user location
- Real-time exchange rates
- PPP (Purchasing Power Parity) adjustments

## Enterprise Features

Located in `enterprise/`:

- Invoicing for B2B transactions
- Net payment terms (NET30, NET60)
- Purchase orders
