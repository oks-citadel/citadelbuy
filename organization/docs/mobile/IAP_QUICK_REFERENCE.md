# IAP Quick Reference Guide

## Installation

```bash
cd organization/apps/mobile
npm install
```

## Basic Usage

### Initialize in App.tsx

```typescript
import { useEffect } from 'react';
import { billingService } from './src/services/billing';

function App() {
  useEffect(() => {
    billingService.initialize();
    return () => billingService.disconnect();
  }, []);

  return <YourApp />;
}
```

### Use in Components

```typescript
import { useIAP } from './src/hooks/useIAP';

function MyComponent() {
  const {
    products,
    purchaseSubscription,
    restorePurchases,
  } = useIAP();

  // Purchase a subscription
  const handlePurchase = async (plan) => {
    const result = await purchaseSubscription(plan);
    if (result.success) {
      alert('Purchase successful!');
    }
  };

  // Restore purchases
  const handleRestore = async () => {
    const result = await restorePurchases();
    alert(`Restored ${result.restoredCount} purchases`);
  };
}
```

## Product Configuration

Edit `src/config/iap-products.ts`:

```typescript
export const SUBSCRIPTION_PRODUCTS = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    appleProductId: 'com.citadelbuy.premium.monthly',
    googleProductId: 'citadelbuy_premium_monthly',
    type: 'subscription',
    interval: 'month',
  },
];
```

## Common Operations

### Purchase Subscription
```typescript
const result = await billingService.purchaseSubscription(plan, true);
```

### Purchase Credits
```typescript
const result = await billingService.purchaseCreditPackage(package, true);
```

### Restore Purchases
```typescript
const result = await billingService.restorePurchases();
```

### Get Products
```typescript
const products = await billingService.getProducts();
```

### Get Wallet Balance
```typescript
const balance = await billingService.getWalletBalance();
```

### Check Availability
```typescript
const isAvailable = billingService.isIAPAvailable();
```

## Error Handling

```typescript
const result = await billingService.purchaseSubscription(plan);

if (!result.success) {
  if (result.error?.userCancelled) {
    // User cancelled - no action needed
  } else if (result.error?.networkError) {
    // Show retry option
  } else {
    // Show error message
    alert(result.error?.message);
  }
}
```

## Debug Logging

```typescript
// Get logs
const logs = billingService.getLogs();
console.log(logs);

// Clear logs
billingService.clearLogs();
```

## React Hooks

### All-in-One Hook
```typescript
const {
  isAvailable,
  products,
  purchasing,
  purchaseSubscription,
  restorePurchases,
  walletBalance,
} = useIAP();
```

### Individual Hooks
```typescript
const { isInitialized, isAvailable } = useIAPInitialization();
const { products, loading } = useIAPProducts();
const { purchasing, purchaseSubscription } = usePurchase();
const { restoring, restore } = useRestorePurchases();
const { balance, currency } = useWalletBalance();
const { logs, refresh, clear } = useIAPLogs();
```

## Platform Setup Checklist

### iOS
- [ ] Create products in App Store Connect
- [ ] Configure pricing
- [ ] Set up subscription groups
- [ ] Create sandbox test users
- [ ] Add In-App Purchase capability in Xcode

### Android
- [ ] Create products in Google Play Console
- [ ] Configure pricing
- [ ] Activate products
- [ ] Add license testers
- [ ] Upload to internal test track

## Backend Requirements

Required API endpoints:
```
POST /payments/iap/validate
POST /payments/iap/sync
POST /payments/iap/subscription/verify
GET  /user/subscription
GET  /payments/wallet/balance
```

## Testing

### iOS Sandbox Testing
1. Sign out of App Store on device
2. Run app and make purchase
3. Sign in with sandbox test account
4. Complete test purchase

### Android Testing
1. Add test account in Play Console
2. Install from internal test track
3. Make test purchase with test account

## Common Issues

**Products not loading**
- Wait 2-4 hours after creating products
- Verify product IDs match exactly
- Check products are active

**Receipt validation failing**
- Check backend logs
- Verify API credentials
- Test with sandbox first

**Purchases not restoring**
- Ensure same Apple ID/Google account
- Check backend sync logic
- Review validation logs

## File Locations

```
src/
├── config/iap-products.ts          # Configure your products here
├── hooks/useIAP.ts                 # React hooks
├── services/billing.ts             # Main service
├── types/iap.types.ts              # TypeScript types
└── screens/
    ├── subscriptions/SubscriptionScreen.example.tsx
    └── credits/CreditPackagesScreen.example.tsx
```

## Documentation

- **Setup Guide**: `IAP_SETUP_INSTRUCTIONS.md`
- **Implementation Guide**: `src/services/IAP_IMPLEMENTATION_GUIDE.md`
- **Summary**: `IAP_IMPLEMENTATION_SUMMARY.md`

## Support

For detailed information, see:
- Implementation Guide (13,000+ words)
- Example screens with complete UI
- TypeScript type definitions
- Comprehensive error handling

## Quick Commands

```bash
# Install dependencies
npm install

# Run on iOS
npm run ios

# Run on Android
npm run android

# Type check
npm run typecheck

# Lint
npm run lint
```

## Next Steps

1. Update product IDs in `src/config/iap-products.ts`
2. Create products in App Store Connect / Play Console
3. Implement backend validation endpoints
4. Test with sandbox accounts
5. Deploy to production

---

**Need More Help?**
- See `IAP_IMPLEMENTATION_GUIDE.md` for comprehensive documentation
- Review example screens for complete implementations
- Check TypeScript types for API reference
