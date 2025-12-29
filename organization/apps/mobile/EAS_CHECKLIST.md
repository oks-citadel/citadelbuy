# EAS Setup Checklist for CitadelBuy

Use this checklist to ensure you've completed all necessary steps for EAS setup.

## Pre-Setup

- [ ] Install EAS CLI globally: `npm install -g eas-cli`
- [ ] Create Expo account at https://expo.dev
- [ ] Apple Developer Account (for iOS)
- [ ] Google Play Console Account (for Android)

## Initial Configuration

- [ ] Run `eas login` and authenticate
- [ ] Run `eas init` to create project
- [ ] Copy EAS project ID from output
- [ ] Update `app.json` or `app.config.json` with project ID
- [ ] Replace `app.json` with `app.config.json` (or merge configurations)
- [ ] Update `babel.config.js` with NativeWind plugin

## Environment Variables

- [ ] Copy `.env.development.example` to `.env.development`
- [ ] Copy `.env.preview.example` to `.env.preview`
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Fill in all required values in each `.env` file
- [ ] Add `.env*` files to `.gitignore`
- [ ] Verify `.gitignore.eas` entries are in your `.gitignore`

## iOS Configuration

### Apple Developer Portal
- [ ] Create App ID in Certificates, Identifiers & Profiles
- [ ] Enable "Associated Domains" capability
- [ ] Enable "Push Notifications" capability
- [ ] Create Distribution Certificate (or let EAS handle it)
- [ ] Create Provisioning Profile (or let EAS handle it)

### Push Notifications (APNs)
- [ ] Create APNs Key in Apple Developer Portal
- [ ] Download .p8 key file
- [ ] Upload to EAS via `eas credentials`
- [ ] Note Key ID and Team ID for configuration

### Universal Links
- [ ] Create `apple-app-site-association` file
- [ ] Upload to `https://citadelbuy.com/.well-known/apple-app-site-association`
- [ ] Upload to `https://www.citadelbuy.com/.well-known/apple-app-site-association`
- [ ] Verify file is accessible (no authentication required)
- [ ] Verify Content-Type is `application/json` or `application/pkcs7-mime`
- [ ] Update file with correct Team ID and Bundle ID

### App Store Connect
- [ ] Create app in App Store Connect
- [ ] Note App Store Connect App ID (ASC App ID)
- [ ] Update `eas.json` submit.production.ios section
- [ ] Prepare app metadata (screenshots, description, etc.)

## Android Configuration

### Keystore
- [ ] Run `eas credentials` and let EAS generate keystore
- [ ] OR upload existing keystore
- [ ] Save keystore credentials securely
- [ ] Note SHA-256 fingerprint

### Firebase Setup
- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Add Android app to Firebase project
- [ ] Download `google-services.json`
- [ ] Place in `organization/apps/mobile/google-services.json`
- [ ] Add `google-services.json` to `.gitignore`
- [ ] Get FCM Server Key from Project Settings
- [ ] Add FCM Server Key to `.env.production`

### App Links
- [ ] Add SHA-256 fingerprint to Firebase project
- [ ] Create `assetlinks.json` file
- [ ] Upload to `https://citadelbuy.com/.well-known/assetlinks.json`
- [ ] Verify file is accessible
- [ ] Verify Content-Type is `application/json`

### Google Play Console
- [ ] Create app in Google Play Console
- [ ] Create service account for API access
- [ ] Grant service account permissions
- [ ] Download service account JSON key
- [ ] Place at `organization/apps/mobile/google-service-account.json`
- [ ] Add to `.gitignore`
- [ ] Update `eas.json` submit.production.android section
- [ ] Prepare store listing (screenshots, description, etc.)

## Domain Configuration

### SSL Certificates
- [ ] Ensure SSL certificates are valid for citadelbuy.com
- [ ] Ensure SSL certificates are valid for www.citadelbuy.com

### Well-Known Files
- [ ] `apple-app-site-association` returns 200 OK
- [ ] `assetlinks.json` returns 200 OK
- [ ] Both files are served without authentication
- [ ] Both files have correct Content-Type headers

## First Build Tests

### Development Build
- [ ] Run `npm run build:dev:ios` (or use eas-scripts)
- [ ] Build completes successfully
- [ ] Download and install on test device
- [ ] App launches without crashes
- [ ] Deep linking works with `citadelbuy://`

- [ ] Run `npm run build:dev:android`
- [ ] Build completes successfully
- [ ] Download and install on test device
- [ ] App launches without crashes
- [ ] Deep linking works with `citadelbuy://`

### Preview Build
- [ ] Run `npm run build:preview:ios`
- [ ] Build completes successfully
- [ ] No development tools are included
- [ ] App launches on test device

- [ ] Run `npm run build:preview:android`
- [ ] Build completes successfully
- [ ] No development tools are included
- [ ] App launches on test device

### Production Build
- [ ] Run `npm run build:prod:ios`
- [ ] Build completes successfully
- [ ] Build is optimized (check size)
- [ ] No warnings in build logs

- [ ] Run `npm run build:prod:android`
- [ ] Build completes successfully
- [ ] AAB file is generated (not APK)
- [ ] No warnings in build logs

## Deep Link Testing

- [ ] Test custom scheme: `citadelbuy://product/123`
- [ ] Test universal link: `https://citadelbuy.com/product/123` (iOS)
- [ ] Test app link: `https://citadelbuy.com/product/123` (Android)
- [ ] Deep links open app when installed
- [ ] Deep links fallback to website when app not installed

## Push Notification Testing

- [ ] Request notification permissions
- [ ] Permissions granted successfully
- [ ] Receive test notification (iOS)
- [ ] Receive test notification (Android)
- [ ] Notification opens correct screen
- [ ] Notification icon displays correctly

## Store Submission

### iOS App Store
- [ ] Build uploaded to App Store Connect
- [ ] App passes TestFlight review
- [ ] Internal testing completed
- [ ] External testing (optional) completed
- [ ] Submit for App Review
- [ ] Address any review feedback
- [ ] App approved and published

### Google Play Store
- [ ] Build uploaded to Play Console
- [ ] Internal testing track configured
- [ ] Internal testing completed
- [ ] Closed/Open testing (optional) completed
- [ ] Submit for production review
- [ ] Address any review feedback
- [ ] App approved and published

## Post-Launch

- [ ] Set up EAS Updates for OTA patches
- [ ] Configure update channels
- [ ] Test OTA update delivery
- [ ] Set up monitoring (Sentry, Analytics)
- [ ] Monitor crash reports
- [ ] Monitor performance metrics
- [ ] Plan for regular updates

## Scripts & Utilities

- [ ] Add EAS scripts to `package.json` (use `package.json.eas-scripts`)
- [ ] Make `eas-scripts.sh` executable: `chmod +x eas-scripts.sh`
- [ ] Test batch/shell scripts work on your system
- [ ] Document custom scripts for team

## Team Setup

- [ ] Add team members to Expo organization
- [ ] Grant appropriate permissions
- [ ] Share credential access (if needed)
- [ ] Document build process
- [ ] Create runbook for deployments
- [ ] Train team on EAS workflow

## Security

- [ ] All sensitive files in `.gitignore`
- [ ] No credentials committed to git
- [ ] EAS Secrets configured for sensitive env vars
- [ ] SSL pinning enabled in production
- [ ] Certificate transparency enabled
- [ ] Root detection enabled (if needed)

## Backup & Recovery

- [ ] Document keystore location and credentials
- [ ] Backup service account keys securely
- [ ] Backup APNs certificates/keys
- [ ] Document Apple Team ID and App IDs
- [ ] Save EAS project ID
- [ ] Export build configurations

## Monitoring & Maintenance

- [ ] Set up Sentry error tracking
- [ ] Configure analytics
- [ ] Monitor EAS build minutes usage
- [ ] Monitor EAS bandwidth usage
- [ ] Check for Expo SDK updates regularly
- [ ] Plan for major version upgrades

---

## Quick Reference

### Most Common Commands

```bash
# Build for testing
npm run build:preview:all

# Build for production
npm run build:prod:all

# Submit to stores
npm run submit:ios
npm run submit:android

# Deploy OTA update
eas update --branch production --message "Bug fixes"

# View builds
npm run build:list

# Manage credentials
npm run credentials
```

### Important URLs

- Expo Dashboard: https://expo.dev
- Apple Developer: https://developer.apple.com
- Google Play Console: https://play.google.com/console
- Firebase Console: https://console.firebase.google.com
- App Store Connect: https://appstoreconnect.apple.com

---

**Status**: [ ] Setup Complete | [ ] Ready for Production

**Date Completed**: _________________

**Completed By**: _________________
