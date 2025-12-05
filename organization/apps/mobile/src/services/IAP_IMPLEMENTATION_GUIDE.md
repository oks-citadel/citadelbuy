# In-App Purchase Implementation Guide

## Overview

This guide covers the complete implementation of In-App Purchases (IAP) for CitadelBuy mobile app using `expo-in-app-purchases`. The implementation supports both iOS (StoreKit) and Android (Google Play Billing) with unified API.

## Architecture

### Files Structure

```
src/
├── config/
│   └── iap-products.ts          # Product definitions and configuration
├── services/
│   └── billing.ts               # Main billing service with IAP implementation
└── types/
    └── iap.types.ts             # TypeScript types for IAP
```

## Features Implemented

### 1. IAP Initialization
- Automatic connection to App Store / Google Play
- Product catalog loading
- Purchase listener setup
- Unfinished transaction handling

### 2. Purchase Flow
- iOS StoreKit integration
- Google Play Billing integration
- Receipt validation with backend
- Transaction finishing
- Error handling

### 3. Subscription Management
- Subscription purchases
- Auto-renewal handling
- Trial period support
- Subscription cancellation
- Platform-specific subscription management

### 4. Restore Purchases
- Purchase history retrieval
- Receipt validation
- Entitlement restoration
- Multi-device support

### 5. Error Handling
- User cancellation detection
- Network error handling
- Product availability checks
- Receipt validation errors
- Comprehensive logging

## Usage

### Initialize the Billing Service

```typescript
import { billingService } from './services/billing';

// In your app entry point (App.tsx)
useEffect(() => {
  billingService.initialize();

  return () => {
    billingService.disconnect();
  };
}, []);
```

### Get Available Products

```typescript
// Get all IAP products with pricing info
const products = await billingService.getProducts();

products.forEach(product => {
  console.log(`${product.title}: ${product.price}`);
  console.log(`Description: ${product.description}`);
});
```

### Purchase a Subscription

```typescript
import { SUBSCRIPTION_PRODUCTS } from './config/iap-products';

// Get the subscription plan
const premiumPlan = SUBSCRIPTION_PRODUCTS.find(
  p => p.id === 'citadel_premium_monthly'
);

// Purchase using native IAP
const result = await billingService.purchaseSubscription(premiumPlan, true);

if (result.success) {
  console.log('Subscription activated!');
  console.log('Transaction ID:', result.transactionId);
} else if (result.cancelled) {
  console.log('User cancelled');
} else {
  console.error('Purchase failed:', result.error);
}
```

### Purchase Credit Package

```typescript
import { CREDIT_PACKAGES } from './config/iap-products';

// Get credit package
const package = CREDIT_PACKAGES.find(p => p.id === 'credits_500');

// Purchase
const result = await billingService.purchaseCreditPackage(package, true);

if (result.success) {
  console.log('Credits purchased!');
  // Credits will be added to user account by backend
}
```

### Restore Purchases

```typescript
// Restore all previous purchases
const restoreResult = await billingService.restorePurchases();

if (restoreResult.success) {
  console.log(`Restored ${restoreResult.restoredCount} purchases`);
} else {
  console.error('Restore failed:', restoreResult.error);
}
```

### Cancel Subscription

```typescript
// Get current subscription
const current = await subscriptionsApi.getCurrentSubscription();

// Cancel subscription
const cancelled = await billingService.cancelSubscription(
  current.subscription.id,
  false // immediately = false (cancel at period end)
);

// For IAP subscriptions, this redirects to App Store/Play Store settings
```

### Check IAP Availability

```typescript
if (billingService.isIAPAvailable()) {
  // Show IAP UI
} else {
  // Show payment gateway UI
}
```

### Debug Logging

```typescript
// Get all IAP logs
const logs = billingService.getLogs();

logs.forEach(log => {
  console.log(`[${log.level}] ${log.category}: ${log.message}`);
});

// Clear logs
billingService.clearLogs();
```

## Product Configuration

### Adding New Products

Edit `src/config/iap-products.ts`:

```typescript
export const SUBSCRIPTION_PRODUCTS: IAPSubscriptionProduct[] = [
  {
    id: 'my_new_plan',
    name: 'My New Plan',
    description: 'Description of the plan',
    appleProductId: 'com.citadelbuy.subscription.myplan.monthly',
    googleProductId: 'citadelbuy_myplan_monthly',
    type: 'subscription',
    interval: 'month',
    trialPeriod: {
      duration: 7,
      unit: 'day',
    },
  },
];
```

### Product ID Naming Convention

**Apple (iOS):**
- Format: `com.citadelbuy.[type].[name].[interval]`
- Example: `com.citadelbuy.subscription.premium.yearly`

**Google (Android):**
- Format: `citadelbuy_[name]_[interval]`
- Example: `citadelbuy_premium_yearly`

## Platform Setup

### iOS (App Store Connect)

1. **Create IAP Products**
   - Go to App Store Connect → Your App → Features → In-App Purchases
   - Click "+" to add new product
   - Select product type (Auto-Renewable Subscription or Consumable)
   - Enter Product ID (must match `appleProductId` in config)
   - Set pricing tier
   - Add localizations
   - Configure subscription duration (if applicable)
   - Add free trial (if applicable)

2. **Subscription Groups** (for subscriptions)
   - Create subscription group (e.g., "Premium Subscriptions")
   - Add all subscription tiers to the group
   - Configure upgrade/downgrade options

3. **Agreements & Tax**
   - Accept Paid Applications Agreement
   - Set up banking and tax information

4. **Testing**
   - Create Sandbox Test Users in App Store Connect
   - Use test users for development testing

### Android (Google Play Console)

1. **Create IAP Products**
   - Go to Play Console → Your App → Monetize → Products → In-app products
   - Click "Create product"
   - Select product type (Subscription or Managed product)
   - Enter Product ID (must match `googleProductId` in config)
   - Set pricing
   - Add descriptions
   - Configure subscription duration (if applicable)
   - Set up free trial (if applicable)
   - Activate the product

2. **Subscription Configuration**
   - Set base plan pricing
   - Add introductory offers
   - Configure grace period
   - Set up prorated upgrades/downgrades

3. **Testing**
   - Add license testers in Play Console
   - Create test users with specific Gmail accounts
   - Use test cards for purchase testing

## Backend Integration

### Receipt Validation Endpoint

The app sends receipts to backend for validation:

```typescript
POST /payments/iap/validate
{
  "platform": "ios" | "android",
  "receipt": "base64_encoded_receipt",
  "productId": "product_id"
}

Response:
{
  "valid": true,
  "productId": "product_id",
  "transactionId": "transaction_id",
  "purchaseDate": "2025-01-01T00:00:00Z",
  "expirationDate": "2025-02-01T00:00:00Z" // for subscriptions
}
```

### Purchase Sync Endpoint

After validation, sync purchase to grant entitlements:

```typescript
POST /payments/iap/sync
{
  "platform": "ios" | "android",
  "receipt": "base64_encoded_receipt",
  "productId": "product_id"
}

Response:
{
  "success": true,
  "creditsAdded": 500, // for credit packages
  "subscriptionExpiry": "2025-02-01T00:00:00Z" // for subscriptions
}
```

### Backend Requirements

1. **Apple Receipt Validation**
   - Validate receipts with Apple's verification API
   - Handle sandbox vs production endpoints
   - Store latest receipt for auto-renewal checks

2. **Google Receipt Validation**
   - Use Google Play Developer API
   - Validate purchase tokens
   - Handle subscription notifications via webhooks

3. **Entitlement Management**
   - Grant subscription access
   - Add credits to wallet
   - Handle subscription renewals
   - Process refunds

## Error Handling

### Common Error Scenarios

```typescript
const result = await billingService.purchaseAppleIAP(productId);

if (!result.success) {
  if (result.error?.userCancelled) {
    // User cancelled - no action needed
    console.log('User cancelled purchase');
  } else if (result.error?.networkError) {
    // Network issue - show retry option
    showRetryDialog();
  } else if (result.error?.itemAlreadyOwned) {
    // Already purchased - restore instead
    await billingService.restorePurchases();
  } else if (result.error?.itemUnavailable) {
    // Product not available
    showErrorMessage('This product is currently unavailable');
  } else {
    // Other errors
    showErrorMessage(result.error?.message || 'Purchase failed');
  }
}
```

### Error Codes

- `USER_CANCELLED` - User cancelled the purchase
- `PAYMENT_INVALID` - Payment method invalid
- `PRODUCT_NOT_AVAILABLE` - Product not found in store
- `PRODUCT_ALREADY_OWNED` - User already owns this product
- `NETWORK_ERROR` - Network connection issue
- `SERVICE_UNAVAILABLE` - Store service unavailable
- `NOT_INITIALIZED` - IAP not initialized
- `RECEIPT_VALIDATION_FAILED` - Backend validation failed
- `UNKNOWN_ERROR` - Unknown error occurred

## Testing

### iOS Testing with Sandbox

1. Sign out of App Store on device
2. Start purchase flow in app
3. Sign in with sandbox test account when prompted
4. Complete test purchase (no actual charge)
5. Verify entitlement granted

### Android Testing

1. Add test account in Play Console
2. Install app from internal test track
3. Purchase using test account
4. Complete test purchase
5. Verify entitlement granted

### Testing Subscriptions

- **Trial Period**: Test subscription with trial, verify trial status
- **Renewal**: Apple/Google accelerate time in sandbox for testing
- **Cancellation**: Cancel subscription, verify access until period end
- **Restore**: Uninstall/reinstall app, restore purchases

### Testing Restore

1. Purchase on device A
2. Sign in on device B with same account
3. Tap "Restore Purchases"
4. Verify purchases restored on device B

## Best Practices

### 1. Initialize Early
Initialize billing service on app start to ensure products are loaded when needed.

### 2. Handle Pending Purchases
Always finish transactions to avoid stuck purchases. The implementation handles this automatically.

### 3. Validate on Backend
Never trust client-side validation. Always validate receipts on your secure backend.

### 4. Provide Restore Option
Always provide a visible "Restore Purchases" button for users who reinstall.

### 5. Handle Errors Gracefully
Show user-friendly error messages and provide retry options for transient failures.

### 6. Log Everything
Use the built-in logging to debug issues in production.

### 7. Test Thoroughly
Test all scenarios: success, cancellation, errors, restore, subscription renewal.

### 8. Support Multiple Devices
Users expect purchases to work across all their devices.

## Troubleshooting

### "Product not found" Error

**Cause**: Product IDs don't match between app and store configuration

**Solution**:
1. Verify product IDs in `iap-products.ts` match store exactly
2. Ensure products are active in store
3. Wait 2-4 hours after creating products for them to propagate

### Purchases Not Restoring

**Cause**: Receipt validation failing or not syncing with backend

**Solution**:
1. Check backend receipt validation logs
2. Verify backend API endpoints are working
3. Check network connectivity
4. Ensure user is signed in to same account

### Subscription Not Renewing

**Cause**: Backend not checking renewal status or webhook not configured

**Solution**:
1. Set up Apple/Google subscription webhooks
2. Implement server-side renewal checking
3. Store latest receipt for validation

### Stuck Transactions

**Cause**: Transaction not finished after processing

**Solution**:
- Implementation automatically handles this in `finishUnfinishedTransactions()`
- Transactions are finished after successful validation
- Check logs for validation failures

## Support

### Debug Information

Collect debug info for support:

```typescript
const logs = billingService.getLogs();
const products = await billingService.getProducts();
const isAvailable = billingService.isIAPAvailable();

console.log('IAP Available:', isAvailable);
console.log('Products:', products);
console.log('Logs:', logs);
```

### Common Support Queries

1. **"I paid but didn't receive my purchase"**
   - Run restore purchases
   - Check backend validation logs
   - Verify receipt with store

2. **"Subscription cancelled but still charged"**
   - Direct user to store subscription management
   - Check subscription status in store

3. **"Can't purchase on new device"**
   - Ensure user signed in to same store account
   - Run restore purchases

## Security Considerations

1. **Receipt Validation**: Always validate on backend, never trust client
2. **Secure Storage**: Receipts stored in secure storage
3. **API Security**: Use HTTPS and authentication for backend APIs
4. **Jailbreak Detection**: Consider detecting jailbroken/rooted devices
5. **Fraud Prevention**: Implement server-side fraud detection

## Updates and Maintenance

### Updating expo-in-app-purchases

```bash
cd organization/apps/mobile
npm install expo-in-app-purchases@latest
```

### Monitoring

Monitor these metrics:
- Purchase success rate
- Receipt validation failures
- Restore success rate
- Average purchase time
- Error rates by type

## Resources

- [Expo In-App Purchases Docs](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- [Apple StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)
