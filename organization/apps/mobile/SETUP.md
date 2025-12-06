# Mobile App Setup Guide

This guide will help you set up and run the CitadelBuy React Native mobile app.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Expo CLI (will be installed with dependencies)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on physical device (optional)

## Quick Start

### 1. Install Dependencies

```bash
cd organization/apps/mobile
npm install
# or
pnpm install
```

### 2. Configure Environment

The `.env` file has been created with default values. Update as needed:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:4000/api

# Sentry Error Reporting (Optional)
# EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
```

### 3. Start Development Server

```bash
npm start
# or
expo start
```

### 4. Run on Device/Simulator

- Press `i` for iOS Simulator (Mac only)
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

## Environment Configuration

### Development (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

### Production
Update `.env` or create `.env.production`:
```env
EXPO_PUBLIC_API_URL=https://api.citadelbuy.com/api
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## App Configuration (app.json)

### EAS Project ID
If using EAS Build/Update, replace the placeholder:
```json
{
  "extra": {
    "eas": {
      "projectId": "your-actual-eas-project-id"
    }
  }
}
```

Run `eas init` to generate a project ID.

## Available Scripts

```bash
# Start development server
npm start

# Start on specific platform
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser (limited support)

# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm test
```

## Features Overview

### Implemented Services

1. **Authentication**
   - Login, Register, Forgot Password
   - JWT token management with SecureStore
   - Auto token refresh

2. **Navigation**
   - Tab navigation (Home, Search, Categories, Wishlist, Account)
   - Stack navigation for screens
   - Deep linking support

3. **API Integration**
   - Products, Cart, Orders
   - Wishlist, Addresses
   - AI Assistant, Payments

4. **Push Notifications**
   - Permission handling
   - Local notifications
   - Remote push notifications
   - Notification preferences

5. **Deep Linking**
   - App URL scheme: `citadelbuy://`
   - Product, category, order links
   - Promotion and search links

6. **In-App Purchases**
   - Apple IAP (iOS)
   - Google Play Billing (Android)
   - Subscriptions and consumables
   - Purchase restoration

7. **Payment Gateways**
   - Stripe
   - PayPal
   - Flutterwave
   - Paystack

8. **Error Reporting**
   - Sentry integration
   - Error Boundary
   - Automatic crash reporting

## Deep Linking Examples

Test deep links in development:

```bash
# Product detail
npx uri-scheme open citadelbuy://products/123 --ios
npx uri-scheme open citadelbuy://products/123 --android

# Search
npx uri-scheme open "citadelbuy://search?q=shoes" --ios

# Cart
npx uri-scheme open citadelbuy://cart --ios

# AI Assistant
npx uri-scheme open citadelbuy://ai --ios
```

## Push Notifications Setup

### iOS
1. Configure APNs in Apple Developer Portal
2. Add push notification capability
3. Test with physical device (not simulator)

### Android
1. Set up Firebase Cloud Messaging
2. Add `google-services.json` to project
3. Configure in app.json

### Testing Locally
```typescript
import { notificationService } from './src/services/notifications';

// Request permissions
await notificationService.requestPermissions();

// Schedule local notification
await notificationService.scheduleLocalNotification(
  'Test Title',
  'Test Message',
  { data: 'custom data' }
);
```

## In-App Purchases Setup

### Configuration
Edit `src/config/iap-products.ts`:

```typescript
export const SUBSCRIPTION_PRODUCTS = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    type: 'auto-renewable-subscription',
    appleProductId: 'com.citadelbuy.premium.monthly',
    googleProductId: 'premium_monthly',
    // ...
  }
];
```

### Testing
- iOS: Use sandbox tester accounts in App Store Connect
- Android: Use test tracks in Google Play Console

### Usage Example
```typescript
import { billingService } from './src/services/billing';

// Initialize (already done in App.tsx)
await billingService.initialize();

// Get products
const products = await billingService.getProducts();

// Purchase subscription
const plan = { /* subscription plan */ };
const result = await billingService.purchaseSubscription(plan);

// Restore purchases
const restored = await billingService.restorePurchases();
```

## Error Reporting (Sentry)

### Setup
1. Create project at sentry.io
2. Get DSN from project settings
3. Add to .env:
   ```env
   EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

### Testing
```typescript
import { errorReporting } from './src/lib/error-reporting';

// Manual error capture
errorReporting.captureException(
  new Error('Test error'),
  'error',
  { customContext: 'value' },
  { component: 'TestScreen', action: 'testAction' }
);

// Track events
errorReporting.trackEvent('button_clicked', {
  button: 'checkout',
  screen: 'cart'
});
```

## Building for Production

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Classic Build

```bash
# iOS (Mac only)
expo build:ios

# Android
expo build:android
```

## Troubleshooting

### Common Issues

**1. Dependencies not installing**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm cache clean --force
npm install
```

**2. Metro bundler issues**
```bash
# Clear Metro cache
npx expo start --clear
```

**3. iOS simulator not opening**
```bash
# Reset simulator
xcrun simctl erase all
```

**4. Android emulator issues**
```bash
# Restart ADB
adb kill-server
adb start-server
```

**5. Type errors**
```bash
# Regenerate types
npm run typecheck
```

### Getting Help

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Sentry React Native](https://docs.sentry.io/platforms/react-native/)

## Project Structure

```
organization/apps/mobile/
├── src/
│   ├── components/       # Reusable UI components
│   ├── config/          # App configuration
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and libraries
│   ├── navigation/      # Navigation setup
│   ├── screens/         # Screen components
│   ├── services/        # API and service integrations
│   ├── stores/          # Zustand state stores
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── assets/              # Images, fonts, etc.
├── .env                 # Environment variables
├── app.json             # Expo configuration
├── App.tsx              # Root component
└── package.json         # Dependencies
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment variables
3. ✅ Start development server
4. ✅ Test on simulator/device
5. Configure push notifications
6. Set up IAP products
7. Configure Sentry
8. Build for production
9. Submit to app stores

For detailed information, see `MOBILE_APP_REVIEW.md`.
