# In-App Purchase Setup Instructions

## Quick Start

### 1. Install Dependencies

```bash
cd organization/apps/mobile
npm install
# or
pnpm install
```

The `expo-in-app-purchases` package has been added to `package.json`.

### 2. Initialize IAP in Your App

In your main app file (e.g., `App.tsx`):

```typescript
import { useEffect } from 'react';
import { billingService } from './src/services/billing';

function App() {
  useEffect(() => {
    // Initialize billing service on app start
    billingService.initialize();

    // Cleanup on unmount
    return () => {
      billingService.disconnect();
    };
  }, []);

  return (
    // Your app components
  );
}
```

### 3. Use IAP in Components

```typescript
import { useIAP } from './src/hooks/useIAP';

function SubscriptionScreen() {
  const {
    isAvailable,
    products,
    purchaseSubscription,
    restorePurchases,
  } = useIAP();

  // Use IAP functionality
}
```

## File Structure

```
organization/apps/mobile/src/
├── config/
│   └── iap-products.ts              # Product configuration
├── hooks/
│   └── useIAP.ts                    # React hooks for IAP
├── services/
│   ├── billing.ts                   # Main billing service
│   └── IAP_IMPLEMENTATION_GUIDE.md  # Detailed implementation guide
├── types/
│   └── iap.types.ts                 # TypeScript types
└── screens/
    ├── subscriptions/
    │   └── SubscriptionScreen.example.tsx
    └── credits/
        └── CreditPackagesScreen.example.tsx
```

## Configuration

### Update Product IDs

Edit `src/config/iap-products.ts` to match your actual product IDs from App Store Connect and Google Play Console:

```typescript
export const SUBSCRIPTION_PRODUCTS: IAPSubscriptionProduct[] = [
  {
    id: 'broxiva_premium_monthly',
    name: 'Broxiva Premium - Monthly',
    description: 'Monthly subscription',
    appleProductId: 'com.broxiva.subscription.premium.monthly', // From App Store Connect
    googleProductId: 'broxiva_premium_monthly', // From Google Play Console
    type: 'subscription',
    interval: 'month',
  },
];
```

## Platform Setup

### iOS Setup

1. **Xcode Configuration**
   ```bash
   cd ios
   pod install
   ```

2. **Capabilities**
   - Open your project in Xcode
   - Select your target
   - Go to "Signing & Capabilities"
   - Add "In-App Purchase" capability

3. **App Store Connect**
   - Create products in App Store Connect
   - Configure pricing and availability
   - Set up subscription groups (if using subscriptions)
   - Create test users for sandbox testing

### Android Setup

1. **Google Play Console**
   - Create products in Play Console
   - Configure pricing and availability
   - Activate products
   - Add license testers

2. **Build Configuration**
   - Ensure your app is signed with production keystore
   - Upload to internal testing track for IAP testing

## Testing

### iOS Testing (Sandbox)

1. **Create Sandbox Test User**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create a test user

2. **Test on Device**
   - Sign out of App Store on device (Settings → App Store → Sign Out)
   - Run your app
   - Make a test purchase
   - Sign in with sandbox test account when prompted
   - Complete purchase (no actual charge)

3. **Verify Purchase**
   - Check that purchase completed successfully
   - Verify entitlements granted in your backend
   - Test restore purchases

### Android Testing

1. **Add License Testers**
   - Go to Play Console → Setup → License Testing
   - Add test email addresses

2. **Install from Internal Test Track**
   - Upload APK/AAB to internal testing
   - Add test users to internal testing
   - Install app from Play Store link

3. **Test Purchases**
   - Make test purchase (test card charged)
   - Verify purchase completed
   - Check entitlements
   - Test restore purchases

### Testing Checklist

- [ ] First-time purchase
- [ ] User cancellation
- [ ] Network error handling
- [ ] Already owned product
- [ ] Product not available
- [ ] Restore purchases
- [ ] Subscription renewal (sandbox accelerated)
- [ ] Subscription cancellation
- [ ] Trial period activation
- [ ] Receipt validation
- [ ] Multi-device purchases

## Backend Integration

### Required Endpoints

Your backend must implement these endpoints:

```
POST /payments/iap/validate
POST /payments/iap/sync
POST /payments/iap/subscription/verify
GET  /user/subscription
GET  /payments/wallet/balance
```

See `IAP_IMPLEMENTATION_GUIDE.md` for detailed API specifications.

### Receipt Validation

**iOS:**
- Use Apple's receipt verification API
- Handle both sandbox and production environments
- Store latest receipt for auto-renewal checking

**Android:**
- Use Google Play Developer API
- Validate purchase tokens
- Set up Real-time Developer Notifications (RTDN)

## Deployment

### Pre-Deployment Checklist

- [ ] Product IDs configured correctly
- [ ] All products created and active in stores
- [ ] Backend receipt validation implemented
- [ ] Test purchases verified
- [ ] Restore purchases working
- [ ] Error handling tested
- [ ] Logging reviewed
- [ ] Privacy policy updated (mention IAP)
- [ ] App Store/Play Store metadata reviewed

### App Store Submission (iOS)

1. Test thoroughly with TestFlight
2. Submit for review
3. Ensure IAP-related metadata is correct
4. Respond to reviewer questions about IAP

### Google Play Submission (Android)

1. Test on internal/closed testing tracks
2. Ensure IAP products are published
3. Submit for production
4. Monitor for IAP-related crashes/errors

## Troubleshooting

### Common Issues

**"Products not found"**
- Verify product IDs match exactly
- Wait 2-4 hours after creating products
- Check products are active in store
- Ensure correct store environment (sandbox vs production)

**"Receipt validation failed"**
- Check backend logs
- Verify receipt format
- Ensure API credentials configured
- Check network connectivity

**"Purchase not restoring"**
- Verify same Apple ID/Google account
- Check backend sync logic
- Review receipt validation logs
- Ensure user signed in to app

**"Subscription not renewing"**
- Set up subscription webhooks
- Implement server-side renewal checks
- Store latest receipt
- Handle renewal notifications

### Debug Mode

Enable detailed logging:

```typescript
import { billingService } from './services/billing';

// Get logs
const logs = billingService.getLogs();
console.log('IAP Logs:', logs);

// Clear logs
billingService.clearLogs();
```

## Support Resources

### Documentation
- [Expo In-App Purchases](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- [Apple StoreKit](https://developer.apple.com/documentation/storekit)
- [Google Play Billing](https://developer.android.com/google/play/billing)

### Implementation Guide
- See `src/services/IAP_IMPLEMENTATION_GUIDE.md` for comprehensive documentation
- Review example screens in `src/screens/` for usage patterns
- Check `src/hooks/useIAP.ts` for hook implementations

### Code Examples
- `SubscriptionScreen.example.tsx` - Complete subscription screen
- `CreditPackagesScreen.example.tsx` - Complete credit purchase screen

## Migration from Previous Implementation

If you had placeholder TODOs in the billing service:

1. The new implementation replaces all TODO comments with production code
2. Backup of old file: `billing.ts.backup`
3. Review and test all purchase flows
4. Update any custom modifications you had

## Next Steps

1. Configure your product IDs in `src/config/iap-products.ts`
2. Create products in App Store Connect and Google Play Console
3. Implement backend receipt validation endpoints
4. Test purchases with sandbox/test accounts
5. Review example screens for UI implementation
6. Deploy and monitor

For detailed implementation details, see `src/services/IAP_IMPLEMENTATION_GUIDE.md`.
