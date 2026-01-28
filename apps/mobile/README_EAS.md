# Broxiva Mobile - EAS Build Configuration

Complete EAS (Expo Application Services) build configuration for iOS and Android.

## What's Been Created

This EAS configuration includes everything you need to build, deploy, and distribute the Broxiva mobile app:

### Core Files
- **eas.json** - EAS build profiles and configuration
- **app.config.json** - Enhanced Expo configuration with EAS support
- **babel.config.updated.js** - Babel configuration with NativeWind

### Environment Templates
- **.env.development.example** - Development environment variables
- **.env.preview.example** - Preview/staging environment variables
- **.env.production.example** - Production environment variables

### Documentation
- **QUICKSTART.md** - Get started in 30 minutes
- **EAS_SETUP.md** - Complete setup guide (500+ lines)
- **EAS_CHECKLIST.md** - Step-by-step checklist (350+ items)
- **EAS_FILES_SUMMARY.md** - Overview of all files

### Utilities
- **eas-scripts.sh** - Interactive menu for EAS commands (macOS/Linux)
- **eas-scripts.bat** - Interactive menu for EAS commands (Windows)
- **package.json.eas-scripts** - NPM scripts for EAS operations
- **.gitignore.eas** - Git ignore entries for EAS files

## Quick Start (5 Steps)

### 1. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 2. Initialize Project
```bash
cd organization/apps/mobile
eas init
```
Copy the project ID from the output.

### 3. Update Configurations
```bash
# Replace app.json with enhanced version
mv app.config.json app.json

# Update babel config
mv babel.config.updated.js babel.config.js

# Create environment files
cp .env.development.example .env.development
cp .env.preview.example .env.preview
cp .env.production.example .env.production
```

Edit `app.json` and replace `TODO: Replace with your actual EAS project ID` with the project ID from step 2.

### 4. Configure Credentials
```bash
eas credentials
```
Follow the prompts to set up iOS and Android credentials.

### 5. Build
```bash
# Build for testing (recommended first build)
eas build --profile preview --platform all

# Or build production
eas build --profile production --platform all
```

## Build Profiles

### Development
- **Purpose**: Development client with debugging tools
- **Distribution**: Internal (simulator/device)
- **Command**: `eas build --profile development`
- **Output**: APK (Android), Simulator build (iOS)

### Preview
- **Purpose**: Release build for internal testing
- **Distribution**: Internal (TestFlight/Internal Testing)
- **Command**: `eas build --profile preview`
- **Output**: APK (Android), IPA (iOS)

### Production
- **Purpose**: Optimized build for store submission
- **Distribution**: App Store / Play Store
- **Command**: `eas build --profile production`
- **Output**: AAB (Android), IPA (iOS)

## Features Included

### iOS
- Universal Links for deep linking
- Push notifications (APNs) support
- Associated Domains entitlements
- Auto-increment build numbers
- App Store submission configuration

### Android
- App Links for deep linking
- Firebase Cloud Messaging (FCM) support
- Intent filters for web URLs
- Auto-increment version codes
- Play Store submission configuration

### Both Platforms
- Environment-specific configurations
- Build caching for faster builds
- Resource class optimization
- EAS Update support (OTA updates)
- Sentry integration ready

## Project Structure

```
organization/apps/mobile/
├── Configuration
│   ├── eas.json                    # EAS build config
│   ├── app.json                    # Expo config (use app.config.json)
│   ├── app.config.json             # Enhanced Expo config
│   └── babel.config.js             # Babel config (update with .updated.js)
│
├── Environment Variables
│   ├── .env.development            # (Create from .example)
│   ├── .env.preview                # (Create from .example)
│   └── .env.production             # (Create from .example)
│
├── Documentation
│   ├── README_EAS.md               # This file
│   ├── QUICKSTART.md               # 30-minute setup guide
│   ├── EAS_SETUP.md                # Complete guide
│   ├── EAS_CHECKLIST.md            # Setup checklist
│   └── EAS_FILES_SUMMARY.md        # File overview
│
└── Utilities
    ├── eas-scripts.sh              # Interactive menu (macOS/Linux)
    ├── eas-scripts.bat             # Interactive menu (Windows)
    ├── package.json.eas-scripts    # NPM scripts to merge
    └── .gitignore.eas              # Gitignore entries to add
```

## Common Commands

### Building
```bash
# Development
npm run build:dev:ios
npm run build:dev:android
npm run build:dev:all

# Preview
npm run build:preview:ios
npm run build:preview:android
npm run build:preview:all

# Production
npm run build:prod:ios
npm run build:prod:android
npm run build:prod:all
```

### Submitting
```bash
# Submit to App Store
npm run submit:ios

# Submit to Play Store
npm run submit:android
```

### OTA Updates
```bash
# Deploy update to development
npm run update:dev

# Deploy update to preview
npm run update:preview

# Deploy update to production
npm run update:prod
```

### Utilities
```bash
# View build status
npm run build:list

# Manage credentials
npm run credentials

# View specific build
eas build:view [BUILD_ID]
```

## Next Steps

### For First-Time Setup
1. Read [QUICKSTART.md](./QUICKSTART.md) - Fastest way to get started
2. Follow [EAS_CHECKLIST.md](./EAS_CHECKLIST.md) - Comprehensive checklist
3. Reference [EAS_SETUP.md](./EAS_SETUP.md) - Detailed documentation

### Before Production
- [ ] Configure Firebase for push notifications
- [ ] Set up Universal Links (iOS) and App Links (Android)
- [ ] Configure Apple Developer and Google Play accounts
- [ ] Test deep linking thoroughly
- [ ] Test push notifications
- [ ] Set up Sentry for error tracking
- [ ] Configure analytics

### After First Build
- [ ] Test on physical devices
- [ ] Verify all features work
- [ ] Test in-app purchases (if applicable)
- [ ] Test camera and media permissions
- [ ] Verify API connectivity
- [ ] Check performance and crashes

## Environment Variables

Each environment file contains 65+ configuration options:

### Critical Variables
- `API_URL` - Backend API endpoint
- `APP_ENVIRONMENT` - Environment name
- `EAS_PROJECT_ID` - Your EAS project ID
- `FCM_SERVER_KEY` - Firebase Cloud Messaging key (Android)
- `APNS_KEY_ID` - Apple Push Notification key (iOS)

### Feature Flags
- `ENABLE_AR_FEATURES` - AR shopping features
- `ENABLE_VOICE_SEARCH` - Voice search
- `ENABLE_VISUAL_SEARCH` - Image search
- `ENABLE_IN_APP_PURCHASES` - Purchase functionality

### Security
- `SSL_PINNING_ENABLED` - Certificate pinning
- `ROOT_DETECTION_ENABLED` - Jailbreak/root detection

See `.env.*.example` files for complete lists.

## Helper Scripts

### Interactive Menu (Recommended)

**macOS/Linux:**
```bash
chmod +x eas-scripts.sh
./eas-scripts.sh
```

**Windows:**
```batch
eas-scripts.bat
```

Both provide an interactive menu with options for:
- Building all profiles
- Submitting to stores
- Deploying OTA updates
- Managing credentials
- Viewing build status

## Troubleshooting

### Build Fails
1. Check build logs: `eas build:list` then `eas build:view [BUILD_ID]`
2. Verify credentials: `eas credentials`
3. Clear cache: `eas build --clear-cache`

### Deep Linking Issues
1. Verify domain files are accessible
2. Check bundle ID and package name match
3. Test custom scheme: `broxiva://`

### Push Notifications Not Working
1. Verify Firebase setup (Android)
2. Verify APNs key uploaded (iOS)
3. Check permissions in app settings

See [EAS_SETUP.md](./EAS_SETUP.md#troubleshooting) for detailed troubleshooting.

## Support Resources

- **Expo Documentation**: https://docs.expo.dev/eas/
- **Expo Forums**: https://forums.expo.dev/
- **Expo Discord**: https://chat.expo.dev/
- **EAS Status**: https://status.expo.dev/

## Build Monitoring

Monitor your builds and usage:
- **Dashboard**: https://expo.dev
- **Build History**: `eas build:list`
- **Usage**: Check dashboard for build minutes and bandwidth

## Security Notes

### Never Commit These Files
- `.env.*` (except `.example` files)
- `google-services.json`
- `GoogleService-Info.plist`
- `google-service-account.json`
- `*.p8`, `*.p12` files
- `*.keystore`, `*.jks` files

All these are listed in `.gitignore.eas` - add them to your `.gitignore`.

### Use EAS Secrets for Sensitive Values
```bash
eas secret:create --name API_KEY --value your-secret-value
```

## Best Practices

1. **Always test preview builds before production**
2. **Use environment-specific Firebase projects**
3. **Test on physical devices, not just simulators**
4. **Monitor build times and optimize caching**
5. **Keep dependencies up to date**
6. **Test OTA updates on preview before production**
7. **Document your build and deployment process**

## CI/CD Integration

This configuration works with GitHub Actions, GitLab CI, and other CI/CD platforms:

```yaml
# Example GitHub Action
- name: Build with EAS
  run: |
    npm install -g eas-cli
    eas build --non-interactive --platform all --profile production
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

See EAS documentation for complete CI/CD examples.

## Maintenance

### Regular Tasks
- Check for Expo SDK updates monthly
- Review and update dependencies
- Monitor build success rates
- Check EAS usage limits
- Backup credentials securely

### Before Major Updates
- Review changelog for breaking changes
- Test on preview environment first
- Plan rollback strategy
- Communicate with users

## License

This configuration is part of the Broxiva project.

## Questions?

- Check the documentation files in this directory
- Search Expo forums
- Ask in Expo Discord
- Open an issue in your project repository

---

**Version**: 1.0.0
**Last Updated**: 2025-12-10
**Expo SDK**: 50.0.0
**EAS CLI**: >= 7.0.0

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│         Broxiva EAS Quick Reference          │
├─────────────────────────────────────────────────┤
│ Setup                                           │
│   eas login                                     │
│   eas init                                      │
│   eas credentials                               │
├─────────────────────────────────────────────────┤
│ Build                                           │
│   eas build --profile preview --platform all   │
│   eas build --profile production --platform all│
├─────────────────────────────────────────────────┤
│ Submit                                          │
│   eas submit --platform ios --latest           │
│   eas submit --platform android --latest       │
├─────────────────────────────────────────────────┤
│ Update (OTA)                                    │
│   eas update --branch production               │
├─────────────────────────────────────────────────┤
│ Status                                          │
│   eas build:list                                │
│   eas build:view [ID]                           │
└─────────────────────────────────────────────────┘
```
