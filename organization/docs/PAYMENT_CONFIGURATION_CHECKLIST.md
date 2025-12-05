# Payment Configuration Checklist

This checklist ensures all payment gateway configurations are properly set up for CitadelBuy. Use this for both initial setup and routine audits.

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Fill in payment credentials
# Edit .env and add your API keys

# 3. Verify configuration
npm run verify:payments

# 4. Test payment flow
npm run test:payments
```

---

## Environment Variables Checklist

### Required Variables (Stripe - Primary Payment Gateway)

- [ ] `STRIPE_SECRET_KEY` - Stripe secret API key
  - **Format**: `sk_test_...` (test) or `sk_live_...` (production)
  - **Location**: Stripe Dashboard → Developers → API keys
  - **Required**: YES
  - **Validation**: Must start with `sk_`

- [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
  - **Format**: `pk_test_...` (test) or `pk_live_...` (production)
  - **Location**: Stripe Dashboard → Developers → API keys
  - **Required**: YES
  - **Validation**: Must start with `pk_`

- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
  - **Format**: `whsec_...`
  - **Location**: Stripe Dashboard → Developers → Webhooks → Endpoint
  - **Required**: YES for production
  - **Validation**: Must start with `whsec_`

- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Frontend Stripe key
  - **Format**: Same as `STRIPE_PUBLISHABLE_KEY`
  - **Location**: Same as above
  - **Required**: YES
  - **Note**: Must be identical to `STRIPE_PUBLISHABLE_KEY`

### Optional Variables (PayPal)

- [ ] `PAYPAL_CLIENT_ID` - PayPal REST API client ID
  - **Format**: Alphanumeric string
  - **Location**: PayPal Developer → My Apps & Credentials
  - **Required**: Only if using PayPal
  - **Default**: PayPal disabled if not set

- [ ] `PAYPAL_CLIENT_SECRET` - PayPal REST API secret
  - **Format**: Alphanumeric string
  - **Location**: PayPal Developer → My Apps & Credentials
  - **Required**: Only if using PayPal
  - **Security**: NEVER commit to version control

- [ ] `PAYPAL_MODE` - PayPal environment mode
  - **Format**: `sandbox` or `production`
  - **Default**: `sandbox`
  - **Required**: Only if using PayPal
  - **Production**: Set to `production` for live payments

- [ ] `PAYPAL_WEBHOOK_ID` - PayPal webhook ID
  - **Format**: Alphanumeric string
  - **Location**: PayPal Developer → Webhooks → Webhook details
  - **Required**: YES if using PayPal in production
  - **Default**: Webhook verification skipped in development

### Optional Variables (Apple Pay)

- [ ] `APPLE_MERCHANT_ID` - Apple Pay merchant identifier
  - **Format**: `merchant.com.yourdomain`
  - **Location**: Apple Developer → Merchant IDs
  - **Required**: Only if using Apple Pay
  - **Example**: `merchant.com.citadelbuy`

### Optional Variables (Google Pay)

- [ ] `GOOGLE_MERCHANT_ID` - Google Pay merchant ID
  - **Format**: `BCR2DN4T6XXXXXXX` (example format)
  - **Location**: Google Pay Business Console
  - **Required**: Optional (works without it via Stripe)
  - **Default**: Stripe's default if not set

### Supporting Variables

- [ ] `APP_NAME` - Application name for payment providers
  - **Format**: String
  - **Default**: `CitadelBuy`
  - **Used by**: PayPal, Apple Pay, Google Pay
  - **Example**: Shown on payment sheets

- [ ] `NODE_ENV` - Application environment
  - **Format**: `development`, `staging`, or `production`
  - **Required**: YES
  - **Impact**: Affects payment provider behavior and logging

---

## Payment Provider Configuration

### Stripe Dashboard Configuration

#### API Keys

- [ ] Test mode keys obtained
- [ ] Live mode keys obtained
- [ ] Keys stored securely (secrets manager)
- [ ] Test keys used in development/staging
- [ ] Live keys used only in production

#### Payment Methods

- [ ] Credit/debit cards enabled
- [ ] Apple Pay enabled (if needed)
- [ ] Google Pay enabled (if needed)
- [ ] Link enabled (Stripe's one-click checkout)
- [ ] Desired card brands enabled (Visa, Mastercard, Amex, etc.)

#### Business Settings

- [ ] Business name configured
- [ ] Business logo uploaded
- [ ] Support email/phone added
- [ ] Statement descriptor set (appears on customer's bank statement)
- [ ] Business address configured

#### Fraud & Risk

- [ ] Stripe Radar enabled
- [ ] Fraud rules reviewed and configured
- [ ] 3D Secure (SCA) settings configured
- [ ] Velocity limits set (optional)
- [ ] High-risk country blocking (optional)

#### Webhooks

- [ ] Webhook endpoint created for development
- [ ] Webhook endpoint created for production
- [ ] Webhook signing secret stored
- [ ] Events selected:
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `payment_intent.canceled`
  - [ ] `charge.refunded`
  - [ ] `charge.dispute.created`
  - [ ] `customer.subscription.updated` (if using subscriptions)
- [ ] Webhook endpoint returns 200 OK
- [ ] Webhook signature verification enabled

### PayPal Configuration (Optional)

#### Developer Console

- [ ] Business account created and verified
- [ ] REST API app created
- [ ] App configured for merchant payments
- [ ] Client ID obtained
- [ ] Client secret obtained
- [ ] Sandbox credentials obtained (for testing)
- [ ] Live credentials obtained (for production)

#### Webhooks

- [ ] Webhook endpoint created
- [ ] Webhook ID stored
- [ ] Events selected:
  - [ ] `PAYMENT.CAPTURE.COMPLETED`
  - [ ] `PAYMENT.CAPTURE.DENIED`
  - [ ] `PAYMENT.CAPTURE.REFUNDED`
  - [ ] `CUSTOMER.DISPUTE.CREATED`
- [ ] Webhook signature verification enabled

#### Payment Features

- [ ] PayPal account payments enabled
- [ ] Credit/debit card payments enabled (via PayPal)
- [ ] PayPal Credit enabled (optional)
- [ ] Venmo enabled (US only, optional)
- [ ] Pay Later / Installments enabled (optional)

### Apple Pay Configuration (Optional)

- [ ] Apple Developer account created
- [ ] Merchant ID created
- [ ] Domain verified with Stripe
- [ ] Verification file accessible at `/.well-known/apple-developer-merchantid-domain-association`
- [ ] SSL certificate valid for domain
- [ ] Tested on iOS device
- [ ] Tested on Safari (macOS)

### Google Pay Configuration (Optional)

- [ ] Google Pay enabled in Stripe
- [ ] Business verified in Google Pay Console (optional)
- [ ] Merchant ID obtained (optional)
- [ ] Tested on Android device
- [ ] Tested on Chrome browser

---

## Webhook URLs Reference

### Development/Staging

```
Stripe:  https://dev.citadelbuy.com/api/webhooks/stripe
PayPal:  https://dev.citadelbuy.com/api/webhooks/paypal
```

### Production

```
Stripe:  https://citadelbuy.com/api/webhooks/stripe
PayPal:  https://citadelbuy.com/api/webhooks/paypal
```

### Local Development (with tunneling)

```bash
# Using Stripe CLI
stripe listen --forward-to http://localhost:4000/api/webhooks/stripe

# Using ngrok
ngrok http 4000
# Then use: https://<random>.ngrok.io/api/webhooks/stripe
```

---

## Test Cards & Credentials

### Stripe Test Cards

| Scenario | Card Number | Exp | CVC | ZIP |
|----------|-------------|-----|-----|-----|
| Success | 4242 4242 4242 4242 | Any future | Any 3 digits | Any 5 digits |
| Declined | 4000 0000 0000 0002 | Any future | Any 3 digits | Any 5 digits |
| Insufficient funds | 4000 0000 0000 9995 | Any future | Any 3 digits | Any 5 digits |
| 3D Secure | 4000 0027 6000 3184 | Any future | Any 3 digits | Any 5 digits |
| Expired | 4000 0000 0000 0069 | Past date | Any 3 digits | Any 5 digits |

**Note**: Use any future expiration date, any 3-digit CVC, and any 5-digit ZIP code.

Full test card list: https://stripe.com/docs/testing

### PayPal Sandbox Accounts

Access at: https://developer.paypal.com/dashboard/accounts

- **Personal Account** (Buyer):
  - Use for customer payments
  - Pre-loaded with test funds
  - Login at: sandbox.paypal.com

- **Business Account** (Seller):
  - Receives payments
  - Access merchant features

### Apple Pay Test

- Add test card to Apple Wallet on iOS device or Mac
- Use in Safari browser
- Authenticate with Face ID/Touch ID or passcode

### Google Pay Test

- Add test card to Google Pay on Android device
- Use in Chrome browser
- Authenticate with biometric or PIN

---

## Security Checklist

### API Key Security

- [ ] API keys stored in environment variables (not hardcoded)
- [ ] Production keys stored in secure secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] API keys never committed to version control
- [ ] `.env` file added to `.gitignore`
- [ ] Test keys used only in development/staging
- [ ] Live keys used only in production environments
- [ ] Keys rotated periodically (every 90 days recommended)
- [ ] Access to keys restricted to authorized personnel only

### SSL/TLS

- [ ] Valid SSL certificate installed
- [ ] HTTPS enforced for all payment endpoints
- [ ] SSL certificate not expired
- [ ] SSL certificate covers all payment domains
- [ ] TLS 1.2 or higher enabled
- [ ] Mixed content warnings resolved

### PCI Compliance

- [ ] Card data NEVER stored on your servers
- [ ] Payment forms use Stripe Elements or PayPal SDK
- [ ] Tokenization used for all card transactions
- [ ] PCI SAQ-A questionnaire completed (if using Stripe/PayPal only)
- [ ] Network security measures in place
- [ ] Access logs maintained

### Webhook Security

- [ ] Webhook signature verification enabled
- [ ] Webhooks only accepted from verified sources
- [ ] Webhook processing is idempotent (events processed once)
- [ ] Failed webhooks logged for investigation
- [ ] Webhook timeout set (respond within 10 seconds)

### Rate Limiting

- [ ] Rate limiting enabled on payment endpoints
- [ ] Brute force protection in place
- [ ] DDoS mitigation configured
- [ ] IP allowlisting considered (for admin actions)

---

## Testing Checklist

### Functional Testing

#### Successful Payments

- [ ] Successful card payment (Stripe test card)
- [ ] Successful PayPal payment (sandbox account)
- [ ] Successful Apple Pay payment (test device)
- [ ] Successful Google Pay payment (test device)
- [ ] Payment confirmation email sent
- [ ] Order status updated correctly
- [ ] Customer receipt generated

#### Failed Payments

- [ ] Declined card handled gracefully
- [ ] Insufficient funds error displayed
- [ ] Expired card rejected
- [ ] Invalid card number rejected
- [ ] User-friendly error messages shown
- [ ] Failed payment logged
- [ ] Order status remains pending

#### 3D Secure (SCA)

- [ ] 3D Secure triggered for test card
- [ ] Customer redirected to authentication page
- [ ] Successful authentication completes payment
- [ ] Failed authentication shows error

#### Refunds

- [ ] Full refund processed (Stripe)
- [ ] Partial refund processed (Stripe)
- [ ] PayPal refund processed
- [ ] Refund reflected in order status
- [ ] Customer notified of refund
- [ ] Webhook received for refund

#### Edge Cases

- [ ] Expired payment intent handled
- [ ] Duplicate payment prevented
- [ ] Network timeout handled
- [ ] Payment provider outage handled gracefully

### Webhook Testing

- [ ] Webhook received for successful payment
- [ ] Webhook received for failed payment
- [ ] Webhook received for refund
- [ ] Webhook signature verified
- [ ] Invalid webhook signature rejected
- [ ] Duplicate webhook events handled
- [ ] Webhook processing logged

### Integration Testing

- [ ] End-to-end checkout flow
- [ ] Guest checkout
- [ ] Logged-in user checkout
- [ ] Express checkout (saved payment methods)
- [ ] Multiple items in cart
- [ ] Coupon/discount codes applied
- [ ] Tax calculation correct
- [ ] Shipping cost calculated
- [ ] Total amount matches payment

### Performance Testing

- [ ] Payment page loads within 3 seconds
- [ ] Payment form responsive
- [ ] No console errors
- [ ] Mobile-friendly checkout
- [ ] Accessible (WCAG compliance)

---

## Production Go-Live Checklist

### Pre-Launch

- [ ] All test scenarios passed
- [ ] Code reviewed and approved
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Error handling verified
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery plan in place
- [ ] Runbook created for common issues

### Configuration

- [ ] Production API keys configured
- [ ] Test keys removed from production
- [ ] Environment set to `production`
- [ ] SSL certificate valid
- [ ] Domain verification completed
- [ ] Webhook endpoints registered
- [ ] Fraud detection rules active

### Legal & Compliance

- [ ] Terms of Service updated
- [ ] Privacy Policy updated
- [ ] Refund Policy documented
- [ ] Payment terms clearly stated
- [ ] Cookie consent for payment providers
- [ ] GDPR compliance (if applicable)
- [ ] PCI compliance attestation

### Operations

- [ ] Customer support trained
- [ ] Refund process documented
- [ ] Dispute handling process defined
- [ ] Payment monitoring dashboard set up
- [ ] Alerts configured for payment failures
- [ ] On-call rotation established
- [ ] Incident response plan prepared

### Post-Launch

- [ ] Monitor payment success rate (target: >95%)
- [ ] Review failed payment logs
- [ ] Track webhook delivery success
- [ ] Analyze payment method usage
- [ ] Customer feedback collected
- [ ] Performance metrics tracked

---

## Maintenance Checklist

### Daily

- [ ] Monitor payment success/failure rates
- [ ] Review failed payment logs
- [ ] Check webhook delivery status

### Weekly

- [ ] Review fraud/dispute cases
- [ ] Analyze payment method performance
- [ ] Check for API deprecation notices

### Monthly

- [ ] Rotate API keys (if policy requires)
- [ ] Review security logs
- [ ] Update test scenarios
- [ ] Verify SSL certificate expiration
- [ ] Audit payment configurations

### Quarterly

- [ ] Review and update fraud rules
- [ ] Conduct security audit
- [ ] Update compliance documentation
- [ ] Review payment provider agreements
- [ ] Optimize payment flow based on data

### Annually

- [ ] Complete PCI compliance questionnaire
- [ ] Renew SSL certificate
- [ ] Review and update legal terms
- [ ] Conduct penetration testing
- [ ] Update disaster recovery plan

---

## Troubleshooting Quick Reference

### Stripe Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API Key` | Wrong key or format | Verify `STRIPE_SECRET_KEY` starts with `sk_` |
| `No such payment_intent` | Expired or invalid ID | Create new payment intent |
| `Webhook verification failed` | Wrong secret | Check `STRIPE_WEBHOOK_SECRET` |
| Apple Pay not showing | Domain not verified | Verify domain in Stripe dashboard |

### PayPal Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Authentication failed` | Wrong credentials | Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` |
| `Order not found` | Wrong environment | Check `PAYPAL_MODE` (sandbox vs production) |
| `Webhook verification failed` | Wrong webhook ID | Verify `PAYPAL_WEBHOOK_ID` |

### General Issues

| Issue | Check | Action |
|-------|-------|--------|
| Payments failing | API keys | Verify all keys are correct |
| Webhooks not received | Endpoint URL | Ensure HTTPS and accessible |
| SSL errors | Certificate | Verify SSL is valid and not expired |
| Timeout errors | Network | Check payment provider status |

---

## Configuration Validation Script

Save as `scripts/verify-payment-config.js`:

```javascript
// Run with: node scripts/verify-payment-config.js

require('dotenv').config();

const checks = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY?.startsWith('sk_'),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_'),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
    frontendKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_'),
  },
  paypal: {
    clientId: !!process.env.PAYPAL_CLIENT_ID,
    clientSecret: !!process.env.PAYPAL_CLIENT_SECRET,
    mode: ['sandbox', 'production'].includes(process.env.PAYPAL_MODE || 'sandbox'),
  },
  applePay: {
    merchantId: process.env.APPLE_MERCHANT_ID?.startsWith('merchant.'),
  },
  general: {
    nodeEnv: !!process.env.NODE_ENV,
    appName: !!process.env.APP_NAME,
  }
};

console.log('Payment Configuration Validation\n');

// Stripe (Required)
console.log('✓ Stripe Configuration:');
console.log(checks.stripe.secretKey ? '  ✓' : '  ✗', 'STRIPE_SECRET_KEY');
console.log(checks.stripe.publishableKey ? '  ✓' : '  ✗', 'STRIPE_PUBLISHABLE_KEY');
console.log(checks.stripe.webhookSecret ? '  ✓' : '  ⚠', 'STRIPE_WEBHOOK_SECRET (recommended)');
console.log(checks.stripe.frontendKey ? '  ✓' : '  ✗', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');

// PayPal (Optional)
console.log('\n✓ PayPal Configuration (Optional):');
console.log(checks.paypal.clientId ? '  ✓' : '  -', 'PAYPAL_CLIENT_ID');
console.log(checks.paypal.clientSecret ? '  ✓' : '  -', 'PAYPAL_CLIENT_SECRET');
console.log(checks.paypal.mode ? '  ✓' : '  ✗', 'PAYPAL_MODE');

// Apple Pay (Optional)
console.log('\n✓ Apple Pay Configuration (Optional):');
console.log(checks.applePay.merchantId ? '  ✓' : '  -', 'APPLE_MERCHANT_ID');

// Summary
const requiredChecks = [
  checks.stripe.secretKey,
  checks.stripe.publishableKey,
  checks.stripe.frontendKey,
];

const allPassed = requiredChecks.every(check => check);

console.log('\n' + (allPassed ? '✓ All required checks passed!' : '✗ Some required checks failed!'));

if (!allPassed) {
  console.log('\nPlease configure missing environment variables in .env');
  process.exit(1);
}
```

Run with:
```bash
node scripts/verify-payment-config.js
```

---

## Support & Resources

- **Documentation**: See `docs/PAYMENT_GATEWAY_SETUP.md`
- **Webhook Guide**: See `docs/WEBHOOK_ENDPOINTS.md`
- **Payment Flow**: See `docs/PAYMENT_FLOW.md`
- **Stripe Docs**: https://stripe.com/docs
- **PayPal Docs**: https://developer.paypal.com/docs

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintained by**: CitadelBuy Development Team
