# EAS Build Configuration Setup Guide for Broxiva

This guide will help you set up and configure EAS (Expo Application Services) for building and deploying the Broxiva mobile app.

## Prerequisites

1. **Expo Account**: Sign up at https://expo.dev
2. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Apple Developer Account** (for iOS builds)
4. **Google Play Console Account** (for Android builds)

## Initial Setup

### 1. Login to EAS

```bash
eas login
```

### 2. Configure Your Project

```bash
cd organization/apps/mobile
eas init
```

This will create an EAS project ID. Copy this ID and update:
- `app.json`: Replace `TODO: Replace with your actual EAS project ID` with your project ID
- `app.config.json`: Same as above (use one or the other)

### 3. Update Configuration Files

#### Replace app.json with app.config.json
The updated `app.config.json` includes all EAS-specific configurations. You can either:
- Rename `app.config.json` to `app.json` (recommended)
- Or keep `app.config.json` and delete the old `app.json`

#### Update babel.config.js
Replace your current `babel.config.js` with `babel.config.updated.js`:
```bash
mv babel.config.updated.js babel.config.js
```

#### Configure Environment Variables
Copy the example environment files and fill in your values:
```bash
cp .env.development.example .env.development
cp .env.preview.example .env.preview
cp .env.production.example .env.production
```

## iOS Setup

### 1. Configure Credentials

```bash
eas credentials
```

You'll need:
- **Distribution Certificate**: For signing your app
- **Provisioning Profile**: Links your app to your Apple Developer account
- **Push Notification Key** (optional but recommended)

### 2. Universal Links Setup

1. Create an `apple-app-site-association` file on your domain:
   ```
   https://broxiva.com/.well-known/apple-app-site-association
   https://www.broxiva.com/.well-known/apple-app-site-association
   ```

2. File content:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "TEAM_ID.com.broxiva.app",
           "paths": ["*"]
         }
       ]
     }
   }
   ```

3. Enable Associated Domains in Apple Developer Portal:
   - Go to Certificates, Identifiers & Profiles
   - Select your App ID
   - Enable "Associated Domains"

### 3. Push Notifications Setup

1. Generate APNs Key in Apple Developer Portal:
   - Keys → Create New Key
   - Enable "Apple Push Notifications service (APNs)"
   - Download the .p8 file

2. Upload to EAS:
   ```bash
   eas credentials
   ```
   Select iOS → Push Notifications → Upload key

## Android Setup

### 1. Configure Keystore

EAS can generate a keystore for you:
```bash
eas credentials
```

Or upload your own:
```bash
eas credentials --platform android
```

### 2. Firebase Cloud Messaging (FCM) Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app to your project
3. Download `google-services.json`
4. Place it in `organization/apps/mobile/google-services.json`
5. Get your FCM Server Key:
   - Project Settings → Cloud Messaging
   - Copy the Server key

### 3. App Links Setup

1. Generate SHA-256 fingerprint:
   ```bash
   eas credentials
   ```
   Select Android → Keystore → Show keystore info

2. Add to Firebase:
   - Project Settings → General
   - Add SHA-256 fingerprint

3. Create `assetlinks.json` on your domain:
   ```
   https://broxiva.com/.well-known/assetlinks.json
   ```

4. File content:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.broxiva.app",
       "sha256_cert_fingerprints": [
         "YOUR_SHA256_FINGERPRINT_HERE"
       ]
     }
   }]
   ```

## Building Your App

### Development Build (Internal Testing)

Creates a development client with dev tools:
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Install on device:
```bash
eas build:run --profile development --platform ios
eas build:run --profile development --platform android
```

### Preview Build (QA/Internal Testing)

Creates a release build for internal distribution:
```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

Share with testers:
```bash
eas submit --profile preview --platform ios
eas submit --profile preview --platform android
```

### Production Build (App Store/Play Store)

Creates optimized builds for store submission:
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

Submit to stores:
```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## Environment Variables

Environment variables are automatically loaded based on the build profile:
- `development` → `.env.development`
- `preview` → `.env.preview`
- `production` → `.env.production`

To access in code:
```javascript
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig.extra.API_URL;
```

Or use expo-env:
```bash
npm install expo-env
```

```javascript
import { API_URL } from '@env';
```

## EAS Update (Over-The-Air Updates)

Deploy updates without going through app stores:

```bash
eas update --branch production --message "Fix critical bug"
```

Configure channels in `eas.json`:
- `development` → development channel
- `preview` → preview channel
- `production` → production channel

## Troubleshooting

### Build Fails

1. Check build logs:
   ```bash
   eas build:list
   ```

2. View specific build:
   ```bash
   eas build:view [BUILD_ID]
   ```

### Certificate/Profile Issues

1. Clear credentials:
   ```bash
   eas credentials --clear-provisioning-profile
   ```

2. Regenerate:
   ```bash
   eas build --clear-cache
   ```

### Deep Linking Not Working

1. Verify domain files are accessible:
   ```bash
   curl https://broxiva.com/.well-known/apple-app-site-association
   curl https://broxiva.com/.well-known/assetlinks.json
   ```

2. Test deep link:
   ```bash
   npx uri-scheme open broxiva://product/123 --ios
   npx uri-scheme open broxiva://product/123 --android
   ```

## Build Configuration Details

### Resource Classes

The `eas.json` uses these resource classes:
- **iOS**: `m-medium` (8 vCPU, 16 GB RAM) - Good for most projects
- **Android**: `medium` (4 vCPU, 8 GB RAM) - Standard Android builds

Upgrade if builds timeout:
```json
"resourceClass": "m-large"  // iOS
"resourceClass": "large"     // Android
```

### Auto-Increment Build Numbers

Enabled for preview and production profiles:
- **iOS**: `buildNumber` auto-increments
- **Android**: `versionCode` auto-increments

Manual override:
```bash
eas build --profile production --platform ios --auto-increment false
```

### Build Caching

Caching is enabled to speed up builds:
- Node modules
- iOS Pods
- Gradle dependencies

Clear cache if needed:
```bash
eas build --clear-cache
```

## Store Submission

### iOS App Store

Before submission:
1. Create app in App Store Connect
2. Update `eas.json` with:
   - `appleId`: Your Apple ID email
   - `ascAppId`: App Store Connect app ID
   - `appleTeamId`: Your Team ID
   - `sku`: Unique app identifier

Submit:
```bash
eas submit --platform ios
```

### Google Play Store

Before submission:
1. Create app in Google Play Console
2. Create a service account
3. Download JSON key file
4. Place at `organization/apps/mobile/google-service-account.json`

Submit:
```bash
eas submit --platform android
```

## Best Practices

1. **Version Control**
   - Commit `eas.json` and `app.json`
   - **Never commit** `.env.*` files (add to `.gitignore`)
   - **Never commit** `google-services.json` or service account keys

2. **Security**
   - Store sensitive keys in EAS Secrets:
     ```bash
     eas secret:create --name API_KEY --value your-api-key
     ```
   - Use environment-specific Firebase projects
   - Enable SSL pinning in production

3. **Testing**
   - Always test preview builds before production
   - Use internal testing tracks on both stores
   - Test deep links thoroughly

4. **Monitoring**
   - Set up Sentry for error tracking
   - Monitor build times and sizes
   - Check EAS usage limits regularly

## Additional Resources

- [EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [App Signing](https://docs.expo.dev/app-signing/app-credentials/)
- [Deep Linking Guide](https://docs.expo.dev/guides/linking/)

## Support

For issues or questions:
1. Check [Expo Forums](https://forums.expo.dev/)
2. Join [Expo Discord](https://chat.expo.dev/)
3. Review [EAS Status](https://status.expo.dev/)
