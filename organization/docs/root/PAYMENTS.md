# CitadelBuy Payment System Documentation

## Overview

CitadelBuy implements a comprehensive, unified payment system that supports:
- **Multiple Payment Gateways**: Stripe, PayPal, Flutterwave, Paystack
- **In-App Purchases**: Apple StoreKit, Google Play Billing
- **Subscription Management**: Recurring billing with trial periods
- **Wallet/Credits System**: Virtual currency for in-app consumables
- **Global Coverage**: Support for payments worldwide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend / Mobile Apps                        │
├─────────────────────────────────────────────────────────────────┤
│  Web: Stripe Elements, PayPal SDK, Flutterwave, Paystack        │
│  iOS: StoreKit + Gateway SDKs                                   │
│  Android: Google Play Billing + Gateway SDKs                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  Unified Payments API                           │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/payments/checkout-session                            │
│  POST /api/payments/paypal/create-order                         │
│  POST /api/payments/flutterwave/init                            │
│  POST /api/payments/paystack/init                               │
│  POST /api/payments/subscriptions/create                        │
│  POST /api/payments/iap/validate                                │
│  POST /api/payments/wallet/topup                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              Payment Orchestrator Service                       │
├─────────────────────────────────────────────────────────────────┤
│  - Provider selection based on region/currency                  │
│  - Unified payment interface                                    │
│  - IAP validation and sync                                      │
│  - Transaction logging                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Payment Providers                            │
├───────────┬───────────┬───────────┬───────────┬────────┬────────┤
│  Stripe   │  PayPal   │Flutterwave│ Paystack  │Apple   │Google  │
│           │           │           │           │IAP     │IAP     │
└───────────┴───────────┴───────────┴───────────┴────────┴────────┘
```

## Environment Variables

Add these to your `.env` file:

```env
# ==================== Stripe ====================
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ==================== PayPal ====================
PAYPAL_ENABLED=true
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # sandbox or production
PAYPAL_WEBHOOK_ID=...  # Optional for dev

# ==================== Flutterwave ====================
FLUTTERWAVE_ENABLED=false  # Enable for African markets
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_ENCRYPTION_KEY=...
FLUTTERWAVE_WEBHOOK_SECRET=...

# ==================== Paystack ====================
PAYSTACK_ENABLED=false  # Enable for Nigeria/Ghana
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

# ==================== Apple IAP ====================
APPLE_SHARED_SECRET=...  # From App Store Connect
APPLE_BUNDLE_ID=com.citadelbuy.app
# For StoreKit 2 API (iOS 15+)
APPLE_ISSUER_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# ==================== Google Play ====================
GOOGLE_PACKAGE_NAME=com.citadelbuy.app
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# ==================== App URLs ====================
APP_URL=https://citadelbuy.com
```

## Provider Selection by Region

| Region | Primary Provider | Secondary |
|--------|-----------------|-----------|
| North America, Europe | Stripe | PayPal |
| Nigeria | Paystack | Flutterwave |
| Ghana | Paystack | Flutterwave |
| Kenya, Tanzania, Uganda | Flutterwave | - |
| South Africa | Paystack | Stripe |
| Rest of Africa | Flutterwave | - |
| Global | Stripe | PayPal |

## API Endpoints

### Payment Checkout

```typescript
// Create checkout session (auto-selects provider)
POST /api/payments/checkout-session
{
  "amount": 29.99,
  "currency": "USD",
  "items": [
    { "id": "prod_123", "name": "Premium Plan", "quantity": 1, "unitPrice": 29.99 }
  ],
  "returnUrl": "https://yourapp.com/success",
  "cancelUrl": "https://yourapp.com/cancel"
}

// Response
{
  "success": true,
  "transactionId": "pi_...",
  "provider": "STRIPE",
  "clientSecret": "pi_..._secret_...",  // For Stripe Elements
  "checkoutUrl": "https://..."  // For hosted checkout
}
```

### PayPal

```typescript
// Create PayPal order
POST /api/payments/paypal/create-order
{
  "amount": 29.99,
  "currency": "USD"
}

// Capture order after approval
POST /api/payments/paypal/capture/:orderId
```

### Flutterwave (African Markets)

```typescript
POST /api/payments/flutterwave/init
{
  "amount": 5000,
  "currency": "NGN"
}
// Returns checkoutUrl for redirect
```

### Paystack (Nigeria/Ghana)

```typescript
POST /api/payments/paystack/init
{
  "amount": 5000,
  "currency": "NGN"
}
// Returns checkoutUrl for redirect
```

### Subscriptions

```typescript
// Create subscription
POST /api/payments/subscriptions/create
{
  "planId": "price_...",
  "provider": "STRIPE",
  "paymentMethodId": "pm_...",
  "trialDays": 7
}

// Cancel subscription
POST /api/payments/subscriptions/:subscriptionId/cancel?immediately=false

// Get status
GET /api/payments/subscriptions/:subscriptionId/status
```

### In-App Purchases

```typescript
// Validate receipt
POST /api/payments/iap/validate
{
  "platform": "ios",  // or "android"
  "receipt": "...",
  "productId": "com.citadelbuy.subscription.premium"
}

// Sync purchase with account
POST /api/payments/iap/sync
{
  "platform": "ios",
  "receipt": "...",
  "productId": "com.citadelbuy.subscription.premium"
}
```

### Wallet

```typescript
// Get balance
GET /api/payments/wallet/balance

// Get transactions
GET /api/payments/wallet/transactions?limit=20&offset=0

// Top up wallet
POST /api/payments/wallet/topup
{
  "amount": 9.99,
  "provider": "STRIPE"
}

// Get credit packages
GET /api/payments/wallet/packages

// Purchase package
POST /api/payments/wallet/purchase-package
{
  "packageId": "credits_1200"
}
```

## Webhooks

Configure these webhook endpoints in each provider's dashboard:

| Provider | Endpoint | Events |
|----------|----------|--------|
| Stripe | `/api/webhooks/stripe` | payment_intent.succeeded, charge.refunded, customer.subscription.* |
| PayPal | `/api/webhooks/paypal` | PAYMENT.CAPTURE.COMPLETED, BILLING.SUBSCRIPTION.* |
| Flutterwave | `/api/webhooks/flutterwave` | charge.completed |
| Paystack | `/api/webhooks/paystack` | charge.success, subscription.* |
| Apple | `/api/webhooks/apple` | App Store Server Notifications V2 |
| Google | `/api/webhooks/google` | Real-Time Developer Notifications |

## Credit Packages

| Package ID | Credits | Price | Bonus |
|------------|---------|-------|-------|
| credits_100 | 100 | $0.99 | - |
| credits_500 | 500 | $4.99 | +50 |
| credits_1200 | 1,200 | $9.99 | +200 |
| credits_3000 | 3,000 | $19.99 | +600 |
| credits_6500 | 6,500 | $39.99 | +1,500 |

## Subscription Plans

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Basic | $4.99 | $49.99 | Core features |
| Premium | $9.99 | $99.99 | All features + priority support |
| VIP | $19.99 | $199.99 | Everything + dedicated support |

## IAP Product IDs

### iOS (Apple App Store)

```
# Subscriptions
com.citadelbuy.subscription.basic
com.citadelbuy.subscription.premium
com.citadelbuy.subscription.vip

# Consumables
com.citadelbuy.coins.small (100 credits)
com.citadelbuy.coins.medium (500 credits)
com.citadelbuy.coins.large (1200 credits)
com.citadelbuy.coins.xlarge (3000 credits)
```

### Android (Google Play)

```
# Subscriptions
citadelbuy_subscription_basic
citadelbuy_subscription_premium
citadelbuy_subscription_vip

# Consumables
citadelbuy_coins_100
citadelbuy_coins_500
citadelbuy_coins_1200
citadelbuy_coins_3000
```

## Mobile Integration

### iOS (Swift)

```swift
import StoreKit

class PaymentManager {
    // For gateway payments
    func processGatewayPayment(amount: Double, provider: String) async throws -> PaymentResult {
        let response = try await API.post("/payments/checkout-session", body: [
            "amount": amount,
            "currency": "USD",
            "provider": provider
        ])
        // Handle redirect or client secret
    }

    // For IAP
    func purchaseProduct(productId: String) async throws {
        let product = try await Product.products(for: [productId]).first!
        let result = try await product.purchase()

        if case .success(let verification) = result {
            let transaction = try verification.payloadValue

            // Sync with backend
            try await API.post("/payments/iap/sync", body: [
                "platform": "ios",
                "receipt": transaction.jsonRepresentation.base64EncodedString(),
                "productId": productId
            ])

            await transaction.finish()
        }
    }
}
```

### Android (Kotlin)

```kotlin
class PaymentManager(private val activity: Activity) {
    private val billingClient = BillingClient.newBuilder(activity)
        .setListener(purchasesUpdatedListener)
        .enablePendingPurchases()
        .build()

    // For gateway payments
    suspend fun processGatewayPayment(amount: Double, provider: String): PaymentResult {
        return api.post("/payments/checkout-session", mapOf(
            "amount" to amount,
            "currency" to "USD",
            "provider" to provider
        ))
    }

    // For IAP
    fun purchaseProduct(productId: String) {
        val productDetails = // ... get from queryProductDetailsAsync
        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails)
                    .build()
            ))
            .build()
        billingClient.launchBillingFlow(activity, billingFlowParams)
    }

    private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
        if (billingResult.responseCode == BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                // Sync with backend
                api.post("/payments/iap/sync", mapOf(
                    "platform" to "android",
                    "receipt" to purchase.purchaseToken,
                    "productId" to purchase.products.first()
                ))

                // Acknowledge purchase
                billingClient.acknowledgePurchase(
                    AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.purchaseToken)
                        .build()
                )
            }
        }
    }
}
```

## Testing

### Stripe Test Mode

Use test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### PayPal Sandbox

Create sandbox accounts at https://developer.paypal.com/dashboard/sandbox/accounts

### Flutterwave Test Mode

Test cards: https://developer.flutterwave.com/docs/integration-guides/testing-helpers/

### Paystack Test Mode

Test card: `4084 0840 8408 4081`, CVV: `408`, Expiry: any future date

### Apple Sandbox

Use Sandbox Apple ID in App Store Connect

### Google Test Mode

Use test account configured in Google Play Console

## Security

1. **PCI Compliance**: All card data handled by payment providers (Stripe Elements, hosted pages)
2. **Webhook Verification**: All webhooks verify signatures
3. **HTTPS Only**: All payment endpoints require HTTPS
4. **Idempotency**: Webhook handlers are idempotent
5. **Sensitive Data**: No logging of full card numbers, CVV, or tokens

## Adding New Plans

1. Create plan in provider dashboard (Stripe, etc.)
2. Add IAP product in App Store Connect / Google Play Console
3. Update `mapIAPProductToPlan()` in `payment-orchestrator.service.ts`
4. Update frontend pricing components

## Enabling/Disabling Gateways

Set environment variables:
```env
STRIPE_ENABLED=true
PAYPAL_ENABLED=true
FLUTTERWAVE_ENABLED=false
PAYSTACK_ENABLED=false
```

## Revenue Reporting

Revenue data is logged through webhook processing. Access via:
- Admin dashboard (see `/admin/revenue`)
- Direct database queries on `webhook_events` and order/subscription tables
- Export to CSV from admin panel

## Troubleshooting

### Payment Failed

1. Check provider dashboard for error details
2. Verify API keys are correct
3. Check webhook logs

### IAP Not Syncing

1. Verify shared secret (Apple) or service account (Google)
2. Check receipt format
3. Ensure product IDs match

### Webhook Not Received

1. Verify endpoint URL in provider dashboard
2. Check server logs for incoming requests
3. Ensure signature verification is working
