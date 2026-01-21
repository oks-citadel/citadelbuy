# Payment Gateway Quick Start Guide

This is a condensed quick-start guide for setting up payment gateways. For complete documentation, see `docs/PAYMENT_GATEWAY_SETUP.md`.

## 5-Minute Setup (Development)

### 1. Get Stripe Test Keys (Required)

1. Sign up at [stripe.com](https://stripe.com)
2. Go to **Developers** → **API keys**
3. Copy **Test mode** keys:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

### 2. Configure Environment Variables

Create `.env` file:

```bash
# Copy template
cp .env.example .env

# Add Stripe keys
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE  # Optional for local dev

# Frontend
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

### 3. Test Payment

Use Stripe test card: **4242 4242 4242 4242**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### 4. Done!

Your payment system is ready for development.

---

## Production Setup Checklist

Before accepting real payments:

### Prerequisites
- [ ] Business verified with Stripe
- [ ] Production SSL certificate installed
- [ ] Domain verified

### Configuration
- [ ] Replace test keys with live keys (sk_live_... and pk_live_...)
- [ ] Configure webhooks: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Set `STRIPE_WEBHOOK_SECRET` from webhook endpoint
- [ ] Enable Stripe Radar (fraud prevention)
- [ ] Configure payment methods (cards, Apple Pay, Google Pay)

### Testing
- [ ] Test successful payment with real card
- [ ] Test declined payment
- [ ] Test refund process
- [ ] Verify webhook delivery

### Security
- [ ] Store secrets in secrets manager (not .env)
- [ ] Enable HTTPS on all payment endpoints
- [ ] Review PCI compliance requirements
- [ ] Set up monitoring and alerts

---

## Quick Reference

### Test Cards (Stripe)

| Purpose | Card Number |
|---------|-------------|
| Success | 4242 4242 4242 4242 |
| Declined | 4000 0000 0000 0002 |
| 3D Secure | 4000 0027 6000 3184 |
| Insufficient Funds | 4000 0000 0000 9995 |

### Webhook URLs

- **Development**: `https://dev.yourdomain.com/api/webhooks/stripe`
- **Production**: `https://yourdomain.com/api/webhooks/stripe`

### Required Environment Variables

```bash
# Backend
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Webhook Events

Subscribe to these events:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
- charge.dispute.created

---

## Optional: PayPal Setup

### 1. Get PayPal Credentials

1. Sign up at [developer.paypal.com](https://developer.paypal.com)
2. Create REST API app
3. Copy Client ID and Secret

### 2. Configure

```bash
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_MODE=sandbox  # Use 'production' for live
```

### 3. Test

Use PayPal sandbox accounts from Developer Dashboard.

---

## Troubleshooting

### "Invalid API Key"
- Check key starts with `sk_` (backend) or `pk_` (frontend)
- Verify using correct environment (test vs. live)

### Payment Button Not Showing
- Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Verify Stripe.js is loaded

### Webhook Not Working
- Ensure endpoint is accessible via HTTPS
- Check webhook secret is correct
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:4000/api/webhooks/stripe`

---

## Support

- **Full Documentation**: See `docs/PAYMENT_GATEWAY_SETUP.md`
- **Webhook Guide**: See `docs/WEBHOOK_ENDPOINTS.md`
- **Payment Flow**: See `docs/PAYMENT_FLOW.md`
- **Configuration Checklist**: See `docs/PAYMENT_CONFIGURATION_CHECKLIST.md`
- **Stripe Support**: [support.stripe.com](https://support.stripe.com)

---

**Last Updated**: December 2024
