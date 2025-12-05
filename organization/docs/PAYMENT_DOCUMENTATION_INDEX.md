# Payment Gateway Documentation Index

This index provides quick access to all payment-related documentation for CitadelBuy.

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [Quick Start](templates/PAYMENT_SETUP_QUICKSTART.md) | 5-minute setup guide | Developers (New) |
| [Gateway Setup](PAYMENT_GATEWAY_SETUP.md) | Complete setup instructions | Developers, DevOps |
| [Configuration Checklist](PAYMENT_CONFIGURATION_CHECKLIST.md) | Comprehensive configuration guide | Developers, DevOps, QA |
| [Webhook Endpoints](WEBHOOK_ENDPOINTS.md) | Webhook configuration & testing | Developers, DevOps |
| [Payment Flow](PAYMENT_FLOW.md) | Payment processing flow & error handling | Developers, Product |

## Documentation Overview

### For New Developers

Start here to get payment processing working quickly:

1. **[Quick Start Guide](templates/PAYMENT_SETUP_QUICKSTART.md)** - 5 minutes
   - Get Stripe test keys
   - Configure environment variables
   - Test your first payment

2. **[Payment Flow](PAYMENT_FLOW.md)** - 15 minutes
   - Understand standard checkout
   - Learn express checkout
   - Review guest checkout

### For DevOps/Production Setup

Follow these guides to deploy payment processing to production:

1. **[Gateway Setup Guide](PAYMENT_GATEWAY_SETUP.md)** - 30 minutes
   - Stripe production setup
   - PayPal integration (optional)
   - Apple Pay & Google Pay (optional)
   - Domain verification
   - Go-live checklist

2. **[Configuration Checklist](PAYMENT_CONFIGURATION_CHECKLIST.md)** - 20 minutes
   - Environment variables
   - Webhook configuration
   - Security settings
   - Testing procedures
   - Maintenance schedule

3. **[Webhook Endpoints](WEBHOOK_ENDPOINTS.md)** - 20 minutes
   - Webhook URL configuration
   - Signature verification
   - Event handling
   - Local testing with Stripe CLI

### For QA/Testing

Use these resources for testing payment flows:

1. **[Configuration Checklist](PAYMENT_CONFIGURATION_CHECKLIST.md)** - Testing section
   - Test cards
   - Test scenarios
   - Edge cases

2. **[Payment Flow](PAYMENT_FLOW.md)** - Error handling section
   - Error types
   - User-facing messages
   - Retry strategies

## Key Concepts

### Payment Providers

- **Stripe** (Primary) - Credit/debit cards, Apple Pay, Google Pay
- **PayPal** (Optional) - PayPal accounts, alternative cards
- **Apple Pay** (Optional) - iOS and Safari users
- **Google Pay** (Optional) - Android and Chrome users

### Payment Flows

1. **Standard Checkout** - Traditional checkout form with new payment method
2. **Express Checkout** - One-click purchase with saved payment method (logged-in users)
3. **Guest Checkout** - Checkout without account creation

### Security

- **PCI DSS Compliance** - Card data never touches your servers
- **Webhook Verification** - All webhooks verified via signatures
- **SSL/TLS** - HTTPS required for all payment endpoints
- **Secrets Management** - Production secrets stored securely

## File Locations

### Documentation Files

```
organization/docs/
├── PAYMENT_GATEWAY_SETUP.md           # Complete setup guide
├── PAYMENT_CONFIGURATION_CHECKLIST.md # Configuration & testing
├── WEBHOOK_ENDPOINTS.md               # Webhook documentation
├── PAYMENT_FLOW.md                    # Payment flows & error handling
├── PAYMENT_DOCUMENTATION_INDEX.md     # This file
└── templates/
    └── PAYMENT_SETUP_QUICKSTART.md    # Quick start guide
```

### Configuration Files

```
organization/
├── .env.example                       # Updated with payment variables
├── .env.payment.example               # Payment-specific template
└── apps/
    ├── api/
    │   └── src/
    │       └── modules/
    │           ├── checkout/
    │           │   └── checkout.service.ts
    │           ├── payments/
    │           │   └── payments.service.ts
    │           └── webhooks/
    │               ├── stripe.controller.ts
    │               └── paypal.controller.ts
    └── web/
        └── src/
            └── components/
                └── checkout/
                    └── StripePaymentForm.tsx
```

## Environment Variables Reference

### Required (Stripe)

```bash
STRIPE_SECRET_KEY=sk_test_...              # Backend API key
STRIPE_PUBLISHABLE_KEY=pk_test_...         # Public API key
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Frontend key
```

### Optional (PayPal)

```bash
PAYPAL_CLIENT_ID=...                       # PayPal REST API client ID
PAYPAL_CLIENT_SECRET=...                   # PayPal REST API secret
PAYPAL_MODE=sandbox                        # sandbox or production
PAYPAL_WEBHOOK_ID=...                      # Webhook verification ID
```

### Optional (Digital Wallets)

```bash
APPLE_MERCHANT_ID=merchant.com.citadelbuy  # Apple Pay merchant ID
GOOGLE_MERCHANT_ID=...                     # Google Pay merchant ID
APP_NAME=CitadelBuy                        # App name for payment sheets
```

## Quick Commands

### Verify Configuration

```bash
# Check environment variables
node scripts/verify-payment-config.js

# Test Stripe connection
npm run test:stripe

# Test webhook endpoints
npm run test:webhooks
```

### Local Development

```bash
# Start development server
npm run dev

# Forward webhooks to local server (Stripe)
stripe listen --forward-to http://localhost:4000/api/webhooks/stripe

# Forward webhooks (PayPal) - use ngrok
ngrok http 4000
```

### Testing

```bash
# Run payment integration tests
npm run test:integration:payments

# Test checkout flow
npm run test:e2e:checkout

# Trigger test webhook events
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded
```

## Common Tasks

### Set Up Stripe for Development

1. Create Stripe account at [stripe.com](https://stripe.com)
2. Get test API keys from dashboard
3. Add to `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Test with card: 4242 4242 4242 4242

### Configure Webhooks

1. Create endpoint in Stripe Dashboard
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `charge.refunded`, etc.
2. Copy webhook secret
3. Add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Test Payment Flow

1. Add items to cart
2. Proceed to checkout
3. Enter test card: 4242 4242 4242 4242
4. Complete payment
5. Verify order created
6. Check webhook received

### Go Live

See **[Go-Live Checklist](PAYMENT_GATEWAY_SETUP.md#go-live-checklist)** for complete list.

Key steps:
1. Replace test keys with live keys
2. Configure production webhooks
3. Verify SSL certificate
4. Enable fraud detection
5. Test with real card (small amount)
6. Monitor payment dashboard

## Troubleshooting

### Common Issues

| Issue | Solution | Documentation |
|-------|----------|---------------|
| "Invalid API Key" | Check key format and environment | [Gateway Setup](PAYMENT_GATEWAY_SETUP.md#troubleshooting) |
| Webhook not received | Verify URL and SSL | [Webhook Endpoints](WEBHOOK_ENDPOINTS.md#troubleshooting) |
| Payment declined | Use different test card | [Configuration Checklist](PAYMENT_CONFIGURATION_CHECKLIST.md#test-cards--credentials) |
| 3D Secure failing | Use 3DS test card | [Gateway Setup](PAYMENT_GATEWAY_SETUP.md#test-mode-verification) |

### Getting Help

1. Check documentation above
2. Review error logs
3. Check provider dashboards:
   - [Stripe Dashboard](https://dashboard.stripe.com)
   - [PayPal Developer](https://developer.paypal.com)
4. Contact support:
   - Stripe: [support.stripe.com](https://support.stripe.com)
   - PayPal: [developer.paypal.com/support](https://developer.paypal.com/support)

## Test Data

### Stripe Test Cards

| Scenario | Card Number | Exp | CVC |
|----------|-------------|-----|-----|
| Success | 4242 4242 4242 4242 | Any future | Any |
| Declined | 4000 0000 0000 0002 | Any future | Any |
| 3D Secure | 4000 0027 6000 3184 | Any future | Any |
| Insufficient Funds | 4000 0000 0000 9995 | Any future | Any |

Full list: [Stripe Testing Docs](https://stripe.com/docs/testing)

### PayPal Sandbox

Access test accounts at [PayPal Sandbox](https://developer.paypal.com/dashboard/accounts)

## API Endpoints

### Payment Endpoints

```
POST   /api/payments/create-intent      # Create payment intent
GET    /api/payments/methods            # Get saved payment methods
POST   /api/payments/attach-method      # Attach payment method

POST   /api/checkout/initialize         # Initialize checkout session
POST   /api/checkout/express            # Express checkout
POST   /api/checkout/guest              # Guest checkout

POST   /api/webhooks/stripe             # Stripe webhook receiver
POST   /api/webhooks/paypal             # PayPal webhook receiver

POST   /api/refunds                     # Process refund
GET    /api/orders/:id                  # Get order status
```

## Monitoring & Alerts

### Metrics to Track

- Payment success rate (target: >95%)
- Average payment processing time
- Webhook delivery success rate
- Refund rate
- Dispute rate

### Alerts

Set up alerts for:
- Payment success rate drops below 90%
- Webhook delivery failures
- High number of declined payments
- New disputes opened

## Compliance

### PCI DSS

- ✅ Card data processed by Stripe/PayPal (not your servers)
- ✅ Tokenization used for all transactions
- ✅ SSL/TLS encryption enforced
- ✅ SAQ-A compliance level (simplest)

See: [PCI DSS Compliance](PCI_DSS_COMPLIANCE.md)

### Privacy

- Customer payment data handled by payment providers
- Only store order information and payment status
- Never log full card numbers or CVVs
- GDPR compliant (for EU customers)

See: [Privacy Compliance](PRIVACY_COMPLIANCE.md)

## Additional Resources

### External Documentation

- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Developer Docs](https://developer.paypal.com/docs)
- [Apple Pay Guide](https://developer.apple.com/apple-pay/)
- [Google Pay Guide](https://developers.google.com/pay)

### Related Documentation

- [Security Setup](SECURITY_SETUP.md)
- [PCI Compliance Checklist](PCI_DSS_COMPLIANCE.md)
- [Payment Security](PAYMENT_SECURITY.md)
- [Monitoring Setup](MONITORING_SETUP.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial payment documentation release |

---

## Summary

This documentation suite provides everything needed to implement, configure, test, and maintain payment processing for CitadelBuy:

✅ **Quick Setup** - 5-minute guide for developers
✅ **Complete Setup** - Production-ready configuration
✅ **Testing Guide** - Comprehensive test scenarios
✅ **Webhook Documentation** - Full webhook implementation
✅ **Payment Flows** - All checkout variations documented
✅ **Error Handling** - Complete error recovery strategies
✅ **Templates** - Environment variable templates
✅ **Checklists** - Go-live and maintenance checklists

**Start here**: [Quick Start Guide](templates/PAYMENT_SETUP_QUICKSTART.md)

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintained by**: CitadelBuy Development Team
**Questions?**: See [Troubleshooting](#troubleshooting) section above
