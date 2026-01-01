# Payment Gateway Setup Guide

This guide provides comprehensive instructions for setting up payment gateways for Broxiva. All payment providers are configured via environment variables and require production API keys for live transactions.

## Table of Contents

- [Overview](#overview)
- [Stripe Setup](#stripe-setup)
- [PayPal Setup](#paypal-setup)
- [Apple Pay Setup](#apple-pay-setup)
- [Google Pay Setup](#google-pay-setup)
- [Webhook Configuration](#webhook-configuration)
- [Testing](#testing)
- [Go-Live Checklist](#go-live-checklist)
- [Troubleshooting](#troubleshooting)

## Overview

Broxiva supports multiple payment methods to provide flexibility for customers:

- **Stripe**: Credit/debit cards, digital wallets (Apple Pay, Google Pay)
- **PayPal**: PayPal account and credit/debit cards
- **Apple Pay**: iOS and Safari users (via Stripe)
- **Google Pay**: Android and Chrome users (via Stripe)

### Payment Flow Architecture

```
Customer Checkout
    ↓
Frontend Payment Form (Stripe Elements / PayPal SDK)
    ↓
Create Payment Intent (Backend API)
    ↓
Payment Confirmation (Payment Gateway)
    ↓
Webhook Notification (Payment Gateway → Backend)
    ↓
Order Processing & Fulfillment
```

### Security & Compliance

- **PCI DSS Compliance**: All card data is processed directly by payment providers (Stripe/PayPal). Your servers never handle card data.
- **SSL/TLS Required**: All payment endpoints MUST use HTTPS in production.
- **Webhook Verification**: All webhooks MUST be verified using provider signatures.

---

## Stripe Setup

Stripe is the primary payment gateway for Broxiva, handling credit/debit cards and digital wallets.

### 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up for an account
2. Complete business verification (required for live payments)
3. Navigate to the Dashboard

### 2. Obtain API Keys

#### Test Environment (Development/Staging)

1. Navigate to **Developers** → **API keys**
2. Find your **Test mode** keys:
   - **Publishable key**: Starts with `pk_test_`
   - **Secret key**: Starts with `sk_test_`

#### Production Environment

1. Toggle to **Live mode** using the switch in the dashboard
2. Navigate to **Developers** → **API keys**
3. Find your **Live mode** keys:
   - **Publishable key**: Starts with `pk_live_`
   - **Secret key**: Starts with `sk_live_`

**IMPORTANT**: Never commit live keys to version control!

### 3. Configure Webhooks

Webhooks notify your backend when payment events occur (successful payments, refunds, disputes, etc.).

#### Create Webhook Endpoint

1. Navigate to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - **Development**: `https://your-dev-domain.com/api/webhooks/stripe`
   - **Production**: `https://your-production-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `charge.dispute.created`
   - `customer.subscription.updated` (if using subscriptions)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 4. Set Environment Variables

Add to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_test_key_here          # Use sk_live_ for production
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here    # Use pk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend (Next.js)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here
```

### 5. Enable Payment Methods

1. Go to **Settings** → **Payment methods**
2. Enable desired payment methods:
   - Cards (Visa, Mastercard, American Express, etc.)
   - Apple Pay
   - Google Pay
   - Link (Stripe's one-click checkout)
3. Configure business information and branding

### 6. Set Up Stripe Radar (Fraud Prevention)

1. Navigate to **Radar** in the dashboard
2. Configure fraud rules:
   - Block high-risk payments
   - Require 3D Secure for high-value transactions
   - Set velocity limits
3. Review default rules and customize as needed

### 7. Test Mode Verification

Use Stripe's test cards to verify integration:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Requires 3D Secure**: `4000 0027 6000 3184`
- **Insufficient funds**: `4000 0000 0000 9995`

Use any future expiration date and any 3-digit CVC.

---

## PayPal Setup

PayPal provides an alternative payment method for customers who prefer PayPal accounts or different card options.

### 1. Create PayPal Business Account

1. Go to [paypal.com](https://www.paypal.com) and sign up for a **Business Account**
2. Complete identity verification
3. Navigate to the Developer Dashboard: [developer.paypal.com](https://developer.paypal.com)

### 2. Create REST API App

1. Log in to the PayPal Developer Dashboard
2. Go to **My Apps & Credentials**
3. Click **Create App**
4. Enter app name (e.g., "Broxiva Production")
5. Choose app type: **Merchant**

### 3. Obtain API Credentials

#### Sandbox (Test) Credentials

1. Under **Sandbox**, find your app
2. Copy credentials:
   - **Client ID**: Starts with `A...` or similar
   - **Secret**: Long alphanumeric string
3. Note the environment: `sandbox`

#### Live (Production) Credentials

1. Toggle to **Live** mode
2. Find or create your live app
3. Copy credentials:
   - **Client ID**: Your live client ID
   - **Secret**: Your live secret
4. Note the environment: `production`

### 4. Configure Webhooks

1. In your app settings, scroll to **Webhooks**
2. Click **Add Webhook**
3. Enter webhook URL:
   - **Sandbox**: `https://your-dev-domain.com/api/webhooks/paypal`
   - **Live**: `https://your-production-domain.com/api/webhooks/paypal`
4. Select event types:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CUSTOMER.DISPUTE.CREATED`
5. Save and copy the **Webhook ID**

### 5. Set Environment Variables

Add to your `.env` file:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_MODE=sandbox                          # Use 'production' for live
PAYPAL_WEBHOOK_ID=your_webhook_id_here
```

### 6. Enable Advanced Features (Optional)

1. **PayPal Credit**: Allow customers to pay over time
2. **Venmo**: Enable Venmo payments (US only)
3. **Pay Later**: Installment payment options

### 7. Test Mode Verification

Use PayPal Sandbox accounts:

1. Go to **Sandbox** → **Accounts**
2. Use pre-created buyer and seller test accounts
3. Log in to sandbox.paypal.com with test credentials
4. Test complete payment flows

---

## Apple Pay Setup

Apple Pay allows seamless payments for iOS and Safari users via Stripe.

### Prerequisites

- Active Stripe account with Apple Pay enabled
- SSL certificate for your domain
- Apple Developer account (for domain verification)

### 1. Enable Apple Pay in Stripe

1. Log in to Stripe Dashboard
2. Go to **Settings** → **Payment methods**
3. Enable **Apple Pay**
4. Verify your domain (see below)

### 2. Domain Verification

#### Automatic Verification (Recommended)

Stripe can automatically verify your domain:

1. In Stripe Dashboard, go to **Settings** → **Payment methods** → **Apple Pay**
2. Click **Add domain**
3. Enter your domain (e.g., `broxiva.com`)
4. Stripe will place a verification file at `/.well-known/apple-developer-merchantid-domain-association`
5. Ensure your web server serves this file correctly

#### Manual Verification

If automatic verification fails:

1. Download the verification file from Stripe
2. Upload to your server at `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
3. Verify accessibility: The file should return HTTP 200
4. Complete verification in Stripe Dashboard

### 3. Configure Apple Merchant ID

1. Log in to [Apple Developer](https://developer.apple.com)
2. Go to **Certificates, Identifiers & Profiles**
3. Create a new **Merchant ID**:
   - Description: Broxiva
   - Identifier: `merchant.com.broxiva` (adjust for your domain)
4. Enable Apple Pay for the Merchant ID

### 4. Set Environment Variables

Add to your `.env` file:

```bash
# Apple Pay Configuration
APPLE_MERCHANT_ID=merchant.com.broxiva
APP_NAME=Broxiva
```

### 5. Frontend Integration

Apple Pay is integrated via Stripe's Payment Request Button. The frontend components in `StripePaymentForm.tsx` already support this.

### 6. Testing

#### Test on iOS Device

1. Add a test card to Apple Wallet
2. Visit your checkout page on Safari (iOS)
3. Tap the Apple Pay button
4. Authenticate with Face ID/Touch ID
5. Verify payment is processed

#### Test on Safari (macOS)

1. Ensure you have a Mac with Touch ID or an iPhone nearby
2. Use Safari browser
3. Apple Pay button should appear
4. Complete payment with biometric authentication

---

## Google Pay Setup

Google Pay provides one-click payments for Android and Chrome users via Stripe.

### 1. Enable Google Pay in Stripe

1. Log in to Stripe Dashboard
2. Go to **Settings** → **Payment methods**
3. Enable **Google Pay**

No additional verification is required—Google Pay works automatically with Stripe.

### 2. Obtain Google Merchant ID (Optional)

For advanced features:

1. Go to [Google Pay Business Console](https://pay.google.com/business/console)
2. Create a merchant account
3. Complete business verification
4. Copy your **Merchant ID** (e.g., `BCR2DN4T6XXXXXXX`)

### 3. Set Environment Variables

Add to your `.env` file:

```bash
# Google Pay Configuration (optional)
GOOGLE_MERCHANT_ID=BCR2DN4T6XXXXXXX
APP_NAME=Broxiva
```

If not set, Google Pay will use Stripe's default integration.

### 4. Frontend Integration

Google Pay is integrated via Stripe's Payment Request Button, similar to Apple Pay.

### 5. Testing

#### Test on Android Device

1. Add a test card to Google Pay
2. Visit your checkout page on Chrome
3. Tap the Google Pay button
4. Authenticate and confirm payment

#### Test on Chrome Desktop

1. Sign in to Chrome with a Google account
2. Add a card to your Google account
3. Visit checkout page
4. Click Google Pay button
5. Complete payment

---

## Webhook Configuration

Webhooks are critical for handling asynchronous payment events.

### Webhook Endpoints

Your application should expose the following webhook endpoints:

| Provider | Endpoint URL | Method |
|----------|-------------|--------|
| Stripe | `https://yourdomain.com/api/webhooks/stripe` | POST |
| PayPal | `https://yourdomain.com/api/webhooks/paypal` | POST |

### Webhook Security

#### Stripe Webhook Verification

```typescript
// Automatic verification using STRIPE_WEBHOOK_SECRET
const event = stripe.webhooks.constructEvent(
  requestBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

The `PaymentsService.constructWebhookEvent()` method handles this automatically.

#### PayPal Webhook Verification

```typescript
// Automatic verification using PAYPAL_WEBHOOK_ID
const isValid = await paymentsService.verifyPayPalWebhook(
  headers,
  requestBody
);
```

### Important Webhook Events

#### Stripe Events

- `payment_intent.succeeded`: Payment completed successfully
- `payment_intent.payment_failed`: Payment failed
- `charge.refunded`: Refund processed
- `charge.dispute.created`: Customer disputed charge

#### PayPal Events

- `PAYMENT.CAPTURE.COMPLETED`: Payment captured
- `PAYMENT.CAPTURE.DENIED`: Payment denied
- `PAYMENT.CAPTURE.REFUNDED`: Refund processed

### Webhook Best Practices

1. **Idempotency**: Process each webhook event only once
2. **Logging**: Log all webhook events for debugging
3. **Retry Logic**: Payment providers retry failed webhooks
4. **Timeout**: Respond with 200 OK within 10 seconds
5. **Security**: Always verify webhook signatures

### Testing Webhooks Locally

#### Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:4000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
```

#### Using ngrok (for PayPal)

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 4000

# Use the HTTPS URL in PayPal webhook configuration
# Example: https://abc123.ngrok.io/api/webhooks/paypal
```

---

## Testing

### Test Cards and Accounts

#### Stripe Test Cards

| Scenario | Card Number | Details |
|----------|-------------|---------|
| Success | 4242 4242 4242 4242 | Any future exp, any CVC |
| Declined | 4000 0000 0000 0002 | Generic decline |
| Insufficient funds | 4000 0000 0000 9995 | Insufficient funds error |
| 3D Secure required | 4000 0027 6000 3184 | Triggers 3DS authentication |
| Expired card | 4000 0000 0000 0069 | Expired card error |

Full list: [Stripe Test Cards](https://stripe.com/docs/testing)

#### PayPal Sandbox Accounts

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com)
2. Navigate to **Sandbox** → **Accounts**
3. Use pre-created test accounts:
   - **Buyer**: Personal account with test funds
   - **Seller**: Business account receiving payments

### Testing Checklist

- [ ] Successful card payment (Stripe)
- [ ] Declined card payment (Stripe)
- [ ] Payment requiring 3D Secure
- [ ] PayPal account payment
- [ ] Apple Pay payment (iOS/Safari)
- [ ] Google Pay payment (Android/Chrome)
- [ ] Refund processing
- [ ] Webhook delivery and processing
- [ ] Failed webhook retry
- [ ] Payment error handling

---

## Go-Live Checklist

Before accepting live payments, ensure all items are completed:

### 1. Account Setup

- [ ] Stripe account verified and live mode enabled
- [ ] PayPal business account verified
- [ ] Apple Developer account configured (if using Apple Pay)
- [ ] Google Pay Business Console configured (if needed)

### 2. API Keys

- [ ] Production Stripe keys obtained and stored securely
- [ ] Production PayPal credentials obtained
- [ ] All API keys added to production environment variables
- [ ] Test keys removed from production environment
- [ ] API keys never committed to version control

### 3. Webhooks

- [ ] Production webhook endpoints created in Stripe
- [ ] Production webhook endpoints created in PayPal
- [ ] Webhook secrets stored in environment variables
- [ ] Webhook signature verification enabled
- [ ] Webhook endpoint accessible via HTTPS
- [ ] Webhook event logging implemented

### 4. Security

- [ ] SSL/TLS certificate installed (HTTPS required)
- [ ] PCI DSS compliance reviewed
- [ ] Secrets stored in secure secrets manager
- [ ] Payment endpoints protected with authentication
- [ ] Rate limiting enabled on payment endpoints
- [ ] Fraud detection rules configured (Stripe Radar)

### 5. Domain Verification

- [ ] Stripe domain verified for production
- [ ] Apple Pay domain verified
- [ ] SSL certificate valid for all payment domains

### 6. Payment Methods

- [ ] Desired card types enabled (Visa, Mastercard, Amex, etc.)
- [ ] Apple Pay tested on iOS devices
- [ ] Google Pay tested on Android/Chrome
- [ ] PayPal tested end-to-end
- [ ] Payment method icons displayed correctly

### 7. Error Handling

- [ ] Payment failure scenarios tested
- [ ] User-friendly error messages displayed
- [ ] Failed payments logged for debugging
- [ ] Retry logic implemented where appropriate

### 8. Refunds & Disputes

- [ ] Refund process tested
- [ ] Partial refund functionality verified
- [ ] Dispute notification webhooks configured
- [ ] Customer support process defined

### 9. Compliance

- [ ] Terms of Service include payment terms
- [ ] Privacy Policy updated with payment data handling
- [ ] Refund policy clearly stated
- [ ] Transaction receipts sent to customers
- [ ] Tax calculation implemented (if required)

### 10. Monitoring

- [ ] Payment success/failure metrics tracked
- [ ] Webhook delivery monitored
- [ ] Error logging and alerting configured
- [ ] Payment provider dashboards monitored regularly

---

## Troubleshooting

### Common Issues

#### Stripe

**Issue**: "Invalid API Key provided"
- **Solution**: Verify `STRIPE_SECRET_KEY` is set correctly and starts with `sk_`
- **Solution**: Ensure you're using the correct key for the environment (test vs. live)

**Issue**: "No such payment intent"
- **Solution**: Payment intent may have expired (24 hours)
- **Solution**: Verify the payment intent ID is correct

**Issue**: "Webhook signature verification failed"
- **Solution**: Verify `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint
- **Solution**: Ensure raw request body is used for verification (not parsed JSON)

**Issue**: Apple Pay button not showing
- **Solution**: Verify domain is registered in Stripe
- **Solution**: Check SSL certificate is valid
- **Solution**: Ensure using Safari (iOS/macOS) or compatible browser

#### PayPal

**Issue**: "Authentication failed"
- **Solution**: Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct
- **Solution**: Check `PAYPAL_MODE` is set correctly (sandbox vs. production)

**Issue**: "PayPal order not found"
- **Solution**: Verify order was created successfully
- **Solution**: Check the order ID is correct
- **Solution**: Ensure using correct PayPal environment

**Issue**: "Webhook verification failed"
- **Solution**: Verify `PAYPAL_WEBHOOK_ID` is set correctly
- **Solution**: Check webhook headers are passed correctly to verification

### Debugging Tips

1. **Enable Debug Logging**:
   ```bash
   LOG_LEVEL=debug
   ```

2. **Check Payment Provider Dashboards**:
   - Stripe: View events, logs, and payment details
   - PayPal: Check transaction history and webhook events

3. **Test Webhooks Locally**:
   - Use Stripe CLI or ngrok to receive webhooks on localhost

4. **Review Network Traffic**:
   - Use browser DevTools to inspect payment requests
   - Check for CORS issues or blocked requests

5. **Verify SSL/TLS**:
   ```bash
   openssl s_client -connect yourdomain.com:443
   ```

### Getting Help

- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **PayPal Developer Support**: [developer.paypal.com/support](https://developer.paypal.com/support)
- **Community Forums**: Stack Overflow, Stripe/PayPal developer communities

---

## Additional Resources

### Documentation

- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Developer Documentation](https://developer.paypal.com/docs)
- [Apple Pay Documentation](https://developer.apple.com/apple-pay/)
- [Google Pay Documentation](https://developers.google.com/pay)

### Compliance

- [PCI DSS Compliance Guide](https://www.pcisecuritystandards.org/)
- [Stripe PCI Compliance](https://stripe.com/docs/security/guide)
- [PayPal Security](https://www.paypal.com/us/webapps/mpp/security)

### Testing Tools

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [PayPal Sandbox](https://developer.paypal.com/docs/api-basics/sandbox/)

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintained by**: Broxiva Development Team
