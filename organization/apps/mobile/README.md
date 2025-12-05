# CitadelBuy Mobile App

The CitadelBuy Mobile App is a feature-rich, cross-platform mobile application built with React Native and Expo. It delivers a native shopping experience on both iOS and Android with AI-powered features, real-time notifications, camera integration, and seamless checkout.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the App](#running-the-app)
- [Building for Release](#building-for-release)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)

## Overview

CitadelBuy Mobile provides a native mobile shopping experience with:

- Native iOS and Android apps from a single codebase
- Camera integration for visual product search
- Push notifications for orders and deals
- Offline support for browsing
- Biometric authentication
- Apple Pay and Google Pay integration
- Real-time order tracking
- Augmented Reality try-on (AR features)
- Voice search capabilities
- Haptic feedback for enhanced UX

## Technology Stack

### Core Technologies

- **Framework**: Expo 50.x
- **Language**: TypeScript 5.3.x
- **UI Library**: React Native 0.73.x
- **Navigation**: React Navigation 6.x
- **State Management**: Zustand 4.x
- **Data Fetching**: TanStack Query (React Query) 5.x
- **Styling**: NativeWind (Tailwind for React Native)
- **HTTP Client**: Axios 1.6.x

### Expo Modules

- **expo-camera**: Camera access for visual search
- **expo-image-picker**: Photo selection from gallery
- **expo-notifications**: Push notifications
- **expo-secure-store**: Secure credential storage
- **expo-haptics**: Haptic feedback
- **expo-linking**: Deep linking support
- **expo-speech**: Voice features
- **expo-linear-gradient**: Gradient effects
- **expo-image**: Optimized image component

### Navigation

- **React Navigation**: Bottom tabs, stack, and drawer navigation
- **Expo Router**: File-based routing (v3.4)

### Additional Libraries

- **Gesture Handler**: Touch gestures
- **Reanimated**: Smooth animations
- **React Native SVG**: Vector graphics
- **Async Storage**: Local data persistence

## Features

### Shopping Features

- Product browsing with infinite scroll
- Advanced search with filters
- Visual search using camera
- Product details with image galleries
- Add to cart and wishlist
- Quick checkout flow
- Order history and tracking
- Reviews and ratings

### User Features

- Sign up / Sign in (email, social)
- Biometric authentication (Face ID, Touch ID, Fingerprint)
- Profile management
- Address management
- Payment method management
- Order notifications
- Support chat

### AI Features

- Visual product search
- Personalized recommendations
- Voice search
- Smart notifications

### Payment

- Stripe integration
- Apple Pay (iOS)
- Google Pay (Android)
- PayPal
- Save payment methods

### Additional

- Dark mode support
- Multi-language support (i18n)
- Offline mode
- Deep linking
- Share products
- Barcode scanning

## Prerequisites

Before you begin, ensure you have:

- **Node.js**: v18.x or higher
- **pnpm**: v8.x or higher
- **Expo CLI**: Install globally with `npm install -g expo-cli`
- **iOS Development** (for iOS):
  - macOS
  - Xcode 14.x or higher
  - iOS Simulator or physical iPhone
  - Apple Developer Account (for device testing and release)
- **Android Development** (for Android):
  - Android Studio
  - Android SDK
  - Android Emulator or physical Android device
- **Expo Go App** (for quick testing):
  - Install on your phone from App Store (iOS) or Play Store (Android)

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd citadelbuy-master/organization
   ```

2. **Install dependencies**:
   ```bash
   # From the organization root
   pnpm install

   # Or from apps/mobile directory
   cd apps/mobile
   pnpm install
   ```

3. **Verify Expo installation**:
   ```bash
   npx expo --version
   ```

## Environment Configuration

Create a `.env` file in `apps/mobile/` by copying the example:

```bash
cp .env.example .env
```

### Environment Variables

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:4000/api

# For iOS Simulator (use machine IP, not localhost)
# EXPO_PUBLIC_API_URL=http://192.168.1.100:4000/api

# For production
# EXPO_PUBLIC_API_URL=https://api.citadelbuy.com/api
```

**Note**: Expo environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

### Finding Your Local IP (for testing on physical devices)

**macOS/Linux**:
```bash
ipconfig getifaddr en0
```

**Windows**:
```bash
ipconfig
```

Use this IP address in `EXPO_PUBLIC_API_URL` when testing on physical devices.

## Running the App

### Start the Development Server

```bash
pnpm start
```

This opens the Expo Developer Tools in your browser with a QR code.

### Run on iOS

**iOS Simulator**:
```bash
pnpm ios
```

**Physical iPhone**:
1. Install Expo Go from App Store
2. Scan the QR code with your iPhone camera
3. App will load in Expo Go

### Run on Android

**Android Emulator**:
```bash
pnpm android
```

**Physical Android Device**:
1. Install Expo Go from Play Store
2. Scan the QR code with Expo Go app
3. App will load in Expo Go

### Run on Web (Preview)

```bash
pnpm web
```

Opens in browser at http://localhost:19006

### Development Features

- **Fast Refresh**: Instant updates on code changes
- **Hot Reload**: Preserve app state during updates
- **Debug Menu**: Shake device or press Cmd+D (iOS) / Cmd+M (Android)
- **Remote Debugging**: Chrome DevTools integration
- **React DevTools**: Inspect component hierarchy

## Building for Release

### iOS Build

#### Prerequisites
- Apple Developer Account
- App Store Connect access
- Provisioning profiles and certificates

#### Build with EAS (Expo Application Services)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   eas build:configure
   ```

4. **Build for iOS**:
   ```bash
   # Build for App Store
   eas build --platform ios --profile production

   # Build for TestFlight
   eas build --platform ios --profile preview

   # Build for local development
   eas build --platform ios --profile development
   ```

5. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

#### Build Locally (requires macOS)

```bash
# Create production build
expo build:ios

# Or use Expo CLI
npx expo prebuild
cd ios
xcodebuild -workspace CitadelBuy.xcworkspace -scheme CitadelBuy -configuration Release
```

### Android Build

#### Prerequisites
- Google Play Console access
- Signing keystore

#### Generate Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore citadelbuy.keystore \
  -alias citadelbuy -keyalg RSA -keysize 2048 -validity 10000
```

#### Build with EAS

```bash
# Build for Play Store
eas build --platform android --profile production

# Build APK for testing
eas build --platform android --profile preview

# Build for local development
eas build --platform android --profile development
```

#### Submit to Play Store

```bash
eas submit --platform android
```

#### Build Locally

```bash
# Create production build
expo build:android

# Or use Expo CLI
npx expo prebuild
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Over-the-Air (OTA) Updates

Expo supports instant updates without app store review:

```bash
# Publish update
eas update --branch production --message "Bug fixes"

# Publish to specific channel
eas update --channel preview
```

## Testing

### Run Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

### Linting

```bash
pnpm lint
```

### Type Checking

```bash
pnpm typecheck
```

### Testing on Real Devices

1. **iOS Physical Device**:
   - Install Expo Go from App Store
   - Ensure device is on same WiFi network
   - Scan QR code from terminal

2. **Android Physical Device**:
   - Install Expo Go from Play Store
   - Enable USB debugging in Developer Options
   - Connect via USB or WiFi
   - Scan QR code or connect via `adb`

### E2E Testing (Future)

Integration with Detox or Appium can be added for E2E testing:

```bash
# Example with Detox
# npm install detox --save-dev
# detox test --configuration ios.sim.debug
```

## Project Structure

```
apps/mobile/
├── android/              # Native Android code (after prebuild)
├── ios/                  # Native iOS code (after prebuild)
├── assets/              # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── src/
│   ├── components/      # Reusable components
│   │   ├── common/     # Common UI components
│   │   ├── product/    # Product-related components
│   │   ├── cart/       # Cart components
│   │   └── ...
│   ├── screens/        # Screen components
│   │   ├── Home/
│   │   ├── Product/
│   │   ├── Cart/
│   │   ├── Checkout/
│   │   ├── Account/
│   │   └── ...
│   ├── navigation/     # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── StackNavigator.tsx
│   ├── hooks/          # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   └── ...
│   ├── stores/         # Zustand stores
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   │   └── ...
│   ├── services/       # API services
│   │   ├── api.ts      # Base API client
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   └── ...
│   ├── utils/          # Utility functions
│   │   ├── storage.ts  # AsyncStorage helpers
│   │   ├── validation.ts
│   │   └── ...
│   ├── types/          # TypeScript types
│   │   ├── models.ts
│   │   ├── api.ts
│   │   └── ...
│   └── __tests__/      # Unit tests
├── scripts/            # Build and utility scripts
├── .env.example        # Environment template
├── .env               # Local environment (gitignored)
├── app.json           # Expo configuration
├── App.tsx            # Root component
├── babel.config.js    # Babel configuration
├── tailwind.config.js # NativeWind configuration
├── tsconfig.json      # TypeScript configuration
├── package.json
└── README.md
```

## Common Development Tasks

### Add a New Screen

```typescript
// src/screens/MyScreen/MyScreen.tsx
import { View, Text } from 'react-native';

export default function MyScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-xl font-bold">My Screen</Text>
    </View>
  );
}
```

### Add to Navigation

```typescript
// src/navigation/StackNavigator.tsx
import MyScreen from '../screens/MyScreen/MyScreen';

// Add to stack
<Stack.Screen name="MyScreen" component={MyScreen} />
```

### Create a Custom Hook

```typescript
// src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/products';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getAll(),
  });
}
```

### Add a Zustand Store

```typescript
// src/stores/wishlistStore.ts
import { create } from 'zustand';

interface WishlistState {
  items: string[];
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
}

export const useWishlistStore = create<WishlistState>((set) => ({
  items: [],
  addItem: (id) => set((state) => ({
    items: [...state.items, id]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item !== id)
  })),
}));
```

### Request Permissions

```typescript
// Example: Camera permission
import { Camera } from 'expo-camera';

const requestCameraPermission = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Camera permission required');
  }
};
```

### Configure Push Notifications

```typescript
import * as Notifications from 'expo-notifications';

// Request permission
const { status } = await Notifications.requestPermissionsAsync();

// Get push token
const token = await Notifications.getExpoPushTokenAsync();

// Handle notification
Notifications.addNotificationReceivedListener((notification) => {
  console.log(notification);
});
```

### Add Environment Variable

1. Add to `.env`:
   ```env
   EXPO_PUBLIC_MY_VAR=value
   ```

2. Access in code:
   ```typescript
   const myVar = process.env.EXPO_PUBLIC_MY_VAR;
   ```

3. Restart Expo server

### Update App Icon and Splash Screen

1. Replace files:
   - `assets/icon.png` (1024x1024)
   - `assets/splash.png` (1284x2778 recommended)

2. Update `app.json`:
   ```json
   {
     "expo": {
       "icon": "./assets/icon.png",
       "splash": {
         "image": "./assets/splash.png"
       }
     }
   }
   ```

### Configure Deep Linking

```json
// app.json
{
  "expo": {
    "scheme": "citadelbuy",
    "ios": {
      "associatedDomains": ["applinks:citadelbuy.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": {
            "scheme": "https",
            "host": "citadelbuy.com"
          }
        }
      ]
    }
  }
}
```

## Troubleshooting

### Expo Server Won't Start

```bash
# Clear cache
expo start --clear

# Or
rm -rf node_modules
pnpm install
```

### Metro Bundler Issues

```bash
# Reset metro cache
expo start --clear

# Or manually
rm -rf .expo
rm -rf node_modules/.cache
```

### iOS Build Fails

1. Clean build folder:
   ```bash
   cd ios
   xcodebuild clean
   ```

2. Update CocoaPods:
   ```bash
   cd ios
   pod install
   ```

3. Verify Xcode version matches requirements

### Android Build Fails

1. Clean gradle:
   ```bash
   cd android
   ./gradlew clean
   ```

2. Verify Java version:
   ```bash
   java -version
   ```

3. Check Android SDK installation

### App Crashes on Startup

1. Check error logs:
   ```bash
   # iOS
   npx react-native log-ios

   # Android
   npx react-native log-android
   ```

2. Verify environment variables
3. Check API connectivity

### Cannot Connect to API

1. Use machine IP instead of localhost
2. Ensure backend is running
3. Check firewall settings
4. Verify `EXPO_PUBLIC_API_URL` in `.env`

### Slow Performance

1. Enable Hermes (already enabled by default in Expo 50+)
2. Optimize images (use expo-image)
3. Use FlatList instead of ScrollView for lists
4. Enable production mode for testing performance

### Push Notifications Not Working

1. Verify permissions granted
2. Check Expo push token is sent to backend
3. Test with Expo push notification tool
4. For production, configure APNs (iOS) and FCM (Android)

### Camera Not Working

1. Verify permissions:
   ```typescript
   import { Camera } from 'expo-camera';
   const { status } = await Camera.requestCameraPermissionsAsync();
   ```

2. Test on physical device (camera doesn't work on simulator)

### TypeScript Errors

```bash
# Check types
pnpm typecheck

# Restart TypeScript server in editor
```

## Platform-Specific Code

When needed, use platform-specific code:

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  // iOS-specific code
} else if (Platform.OS === 'android') {
  // Android-specific code
}

// Or use Platform.select
const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Updates Documentation](https://docs.expo.dev/versions/latest/sdk/updates/)

## Release Checklist

Before releasing to production:

- [ ] Update version in `app.json`
- [ ] Test on iOS devices (multiple models)
- [ ] Test on Android devices (multiple models)
- [ ] Verify all environment variables
- [ ] Test payment flows
- [ ] Test push notifications
- [ ] Verify deep linking
- [ ] Check app icons and splash screens
- [ ] Review App Store / Play Store metadata
- [ ] Test in production mode: `expo start --no-dev --minify`
- [ ] Run full test suite
- [ ] Update privacy policy and terms
- [ ] Configure analytics
- [ ] Set up error tracking (Sentry)
- [ ] Create release notes

## Support

For issues and questions:

- Create an issue on GitHub
- Check Expo documentation
- Review React Native docs
- Contact the development team

## License

[Your License Here]
