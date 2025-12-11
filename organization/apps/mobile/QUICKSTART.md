# EAS Quick Start Guide - CitadelBuy

Get up and running with EAS builds in under 30 minutes.

## 1. Install EAS CLI (2 minutes)

```bash
npm install -g eas-cli
eas login
```

## 2. Initialize Project (3 minutes)

```bash
cd organization/apps/mobile
eas init
```

**IMPORTANT**: Copy the project ID from the output and update these files:
- Replace `TODO: Replace with your actual EAS project ID` in `app.json` or `app.config.json`

## 3. Update Configuration Files (5 minutes)

### Option A: Use app.config.json (Recommended)
```bash
# Delete old app.json
rm app.json
# Rename app.config.json to app.json
mv app.config.json app.json
```

### Option B: Merge manually
Merge the contents of `app.config.json` into your existing `app.json`

### Update Babel Config
```bash
mv babel.config.updated.js babel.config.js
```

### Add EAS Scripts to package.json
Merge the scripts from `package.json.eas-scripts` into your `package.json`

## 4. Set Up Environment Variables (5 minutes)

```bash
cp .env.development.example .env.development
cp .env.preview.example .env.preview
cp .env.production.example .env.production
```

Edit each file and fill in your values. At minimum, set:
- `API_URL`
- `APP_ENVIRONMENT`

## 5. Configure iOS (if building for iOS) (5 minutes)

```bash
eas credentials --platform ios
```

Select "Set up new credentials" and let EAS generate everything for you.

## 6. Configure Android (if building for Android) (5 minutes)

```bash
eas credentials --platform android
```

Select "Set up new keystore" and let EAS generate it.

For Firebase:
1. Create project at https://console.firebase.google.com
2. Download `google-services.json`
3. Place at `organization/apps/mobile/google-services.json`

## 7. Your First Build (5 minutes)

### Development Build
```bash
# iOS
npm run build:dev:ios

# Android
npm run build:dev:android

# Both
npm run build:dev:all
```

### Preview Build (Recommended for first build)
```bash
npm run build:preview:all
```

Wait for the build to complete. You'll get a QR code to download the app.

## 8. Install and Test

- Scan the QR code with your phone
- Install the app
- Launch and verify it works
- Test deep linking: `citadelbuy://`

## That's It!

You now have a working EAS build setup.

## Next Steps

1. **Set up deep linking**: See [EAS_SETUP.md](./EAS_SETUP.md#ios-setup) for Universal Links
2. **Configure push notifications**: See [EAS_SETUP.md](./EAS_SETUP.md#push-notifications-setup)
3. **Prepare for production**: Use [EAS_CHECKLIST.md](./EAS_CHECKLIST.md)

## Common Commands

```bash
# Build preview
npm run build:preview:all

# Build production
npm run build:prod:all

# View builds
npm run build:list

# Deploy update
eas update --branch preview --message "Your message"
```

## Troubleshooting

### Build fails with "No bundle identifier"
- Make sure you updated the project ID in `app.json`

### Build fails with credential errors
- Run `eas credentials` and follow the prompts

### Can't install the app
- Make sure your device is registered: `eas device:create`

### Deep linking doesn't work
- For development, custom scheme (`citadelbuy://`) should work
- Universal/App links require domain setup (see full guide)

## Get Help

- Full documentation: [EAS_SETUP.md](./EAS_SETUP.md)
- Checklist: [EAS_CHECKLIST.md](./EAS_CHECKLIST.md)
- Expo docs: https://docs.expo.dev/eas/

## Using the Helper Scripts

### macOS/Linux
```bash
chmod +x eas-scripts.sh
./eas-scripts.sh
```

### Windows
```batch
eas-scripts.bat
```

These scripts provide an interactive menu for all common EAS operations.
