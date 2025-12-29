# EAS Build Workflow for CitadelBuy

Visual guide to the EAS build and deployment workflow.

## Overall Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CitadelBuy EAS Workflow                     │
└─────────────────────────────────────────────────────────────────┘

Development Cycle:
┌─────────────┐
│ Code Change │
└──────┬──────┘
       │
       ▼
┌────────────────┐
│  Development   │ ─────► Test locally (Expo Go or Dev Client)
│     Build      │
└────────────────┘
       │
       ▼
┌────────────────┐
│  Preview Build │ ─────► Internal Testing (TestFlight/Internal)
└────────────────┘
       │
       ▼
┌────────────────┐
│ Production     │ ─────► Submit to App Store / Play Store
│    Build       │
└────────────────┘
       │
       ▼
┌────────────────┐
│   App Stores   │ ─────► Public Release
└────────────────┘
       │
       ▼
┌────────────────┐
│  OTA Updates   │ ─────► Hot fixes without store review
└────────────────┘
```

## Build Profile Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Build Profile Comparison                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Development                Preview              Production │
│  ──────────────             ──────────          ──────────  │
│  • Dev tools ✓              • Release build     • Release   │
│  • Fast reload ✓            • No dev tools      • Optimized │
│  • Debug mode               • Internal dist     • Store     │
│  • Simulator OK             • Real device       • AAB/IPA   │
│  • APK output               • APK output        • Signing   │
│                             • TestFlight OK     • Submit    │
│                                                              │
│  Use for:                   Use for:            Use for:    │
│  • Local dev                • QA testing        • Release   │
│  • Feature testing          • Stakeholder       • Users     │
│  • Quick iterations         • Pre-release       • Store     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Environment Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Environment Configuration                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  .env.development│      │   .env.preview   │      │ .env.production  │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                          │
         │                         │                          │
         ▼                         ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  localhost:3000 │      │  staging-api... │      │  api.citadel... │
│  Debug: ON      │      │  Debug: ON      │      │  Debug: OFF     │
│  Analytics: OFF │      │  Analytics: ON  │      │  Analytics: ON  │
│  Sentry: OFF    │      │  Sentry: ON     │      │  Sentry: ON     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Deep Linking Setup

```
┌──────────────────────────────────────────────────────────────┐
│                     Deep Linking Architecture                 │
└──────────────────────────────────────────────────────────────┘

Custom Scheme (All environments):
citadelbuy:// ──────► App Opens
                      └─► citadelbuy://product/123
                      └─► citadelbuy://cart
                      └─► citadelbuy://profile

Universal Links (iOS):
https://citadelbuy.com/product/123
         │
         ▼
┌──────────────────────┐
│ apple-app-site-      │
│ association file     │ ──► Validates ──► Opens App (if installed)
│ @ .well-known/       │                   │
└──────────────────────┘                   └─► Safari (if not installed)

App Links (Android):
https://citadelbuy.com/product/123
         │
         ▼
┌──────────────────────┐
│ assetlinks.json      │
│ @ .well-known/       │ ──► Validates ──► Opens App (if installed)
│ + SHA-256 fingerprint│                   │
└──────────────────────┘                   └─► Browser (if not installed)
```

## Push Notification Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  Push Notification Architecture               │
└──────────────────────────────────────────────────────────────┘

iOS Flow:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Your API   │ ───► │    APNs     │ ───► │   iOS App   │
│   Server    │      │  (Apple)    │      │  (Device)   │
└─────────────┘      └─────────────┘      └─────────────┘
      │                     ▲
      │                     │
      └─ APNs Key (.p8) ───┘

Android Flow:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Your API   │ ───► │    FCM      │ ───► │ Android App │
│   Server    │      │  (Google)   │      │  (Device)   │
└─────────────┘      └─────────────┘      └─────────────┘
      │                     ▲
      │                     │
      └─ FCM Server Key ────┘
         google-services.json
```

## Build Process

```
┌──────────────────────────────────────────────────────────────┐
│                       Build Process Flow                      │
└──────────────────────────────────────────────────────────────┘

1. Trigger Build
   ↓
   eas build --profile production --platform all

2. EAS Preparation
   ↓
   • Validate eas.json
   • Check credentials
   • Load environment variables
   • Verify bundle ID / package name

3. iOS Build
   ↓
   • Install dependencies (npm/yarn)
   • Install pods
   • Run prebuild
   • Compile native code
   • Sign with certificate
   • Create .ipa file
   • Upload to EAS servers

4. Android Build
   ↓
   • Install dependencies (npm/yarn)
   • Run prebuild
   • Gradle build
   • Sign with keystore
   • Create .aab/.apk file
   • Upload to EAS servers

5. Build Complete
   ↓
   • QR code generated
   • Download link available
   • Build artifacts stored
   • Ready for submission
```

## Store Submission Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Store Submission Flow                     │
└──────────────────────────────────────────────────────────────┘

iOS Submission:
┌─────────────────┐
│  EAS Build      │
│  (.ipa)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ eas submit      │ ──► Uploads to App Store Connect
│ --platform ios  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TestFlight      │ ──► Internal testing (auto)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ App Review      │ ──► Manual submission required
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ App Store       │ ──► Public release
└─────────────────┘

Android Submission:
┌─────────────────┐
│  EAS Build      │
│  (.aab)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ eas submit      │ ──► Uploads to Play Console
│ --platform      │
│ android         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Internal Track  │ ──► Auto release to internal
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review Process  │ ──► Automatic (usually fast)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Production      │ ──► Promote to production
└─────────────────┘
```

## OTA Update Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Over-The-Air Updates                      │
└──────────────────────────────────────────────────────────────┘

Code Change (JS/Assets only - no native code)
         │
         ▼
┌──────────────────────────────────────┐
│ eas update --branch production       │
│ --message "Fixed checkout bug"       │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ Bundle created and uploaded to EAS   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ Users get update on next app launch  │
│ (or based on your update strategy)   │
└──────────────────────────────────────┘

What CAN be updated:
✓ JavaScript code
✓ React components
✓ Styling
✓ Assets (images, fonts)
✓ App logic

What CANNOT be updated:
✗ Native code changes
✗ New native dependencies
✗ Permissions changes
✗ expo-modules-core changes
✗ SDK version changes
```

## Credentials Management

```
┌──────────────────────────────────────────────────────────────┐
│                   Credentials Architecture                    │
└──────────────────────────────────────────────────────────────┘

iOS Credentials:
┌─────────────────────────────────────────────────────┐
│                                                      │
│  Distribution Certificate                           │
│  ├─ Identifies you as developer                     │
│  └─ Valid for 1 year                                │
│                                                      │
│  Provisioning Profile                               │
│  ├─ Links app to your account                       │
│  ├─ Contains app capabilities                       │
│  └─ Expires annually                                │
│                                                      │
│  Push Notification Key (.p8)                        │
│  ├─ For APNs                                        │
│  └─ Never expires                                   │
│                                                      │
│  Team ID                                            │
│  └─ Your Apple Developer Team                      │
│                                                      │
└─────────────────────────────────────────────────────┘

Android Credentials:
┌─────────────────────────────────────────────────────┐
│                                                      │
│  Keystore                                           │
│  ├─ Used to sign your app                           │
│  ├─ MUST be backed up securely                      │
│  └─ If lost, can't update app                       │
│                                                      │
│  Key Alias & Passwords                              │
│  └─ Store securely                                  │
│                                                      │
│  google-services.json                               │
│  ├─ Firebase configuration                          │
│  └─ For FCM (push notifications)                    │
│                                                      │
│  Service Account JSON                               │
│  ├─ For automated Play Store submissions            │
│  └─ From Google Cloud Console                       │
│                                                      │
└─────────────────────────────────────────────────────┘

EAS manages these for you! Run: eas credentials
```

## CI/CD Integration

```
┌──────────────────────────────────────────────────────────────┐
│                    CI/CD Workflow Example                     │
└──────────────────────────────────────────────────────────────┘

GitHub Actions Example:

┌────────────────────┐
│ Push to main       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Run tests          │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Lint & Type check  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ EAS Build (preview)│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Notify team        │
└────────────────────┘

Production Release:

┌────────────────────┐
│ Tag release        │
│ (v1.0.0)           │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ EAS Build (prod)   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ EAS Submit         │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Create changelog   │
└────────────────────┘
```

## Monitoring & Observability

```
┌──────────────────────────────────────────────────────────────┐
│                  Monitoring Stack Overview                    │
└──────────────────────────────────────────────────────────────┘

Application Layer:
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       ├──► Error Tracking    (Sentry)
       │    • Crash reports
       │    • Error logs
       │    • Stack traces
       │
       ├──► Analytics         (Custom/Firebase)
       │    • User behavior
       │    • Feature usage
       │    • Funnels
       │
       ├──► Performance       (Sentry/Custom)
       │    • Load times
       │    • API latency
       │    • Screen render
       │
       └──► Logs             (Custom)
            • Debug logs
            • API calls
            • User actions

Build Layer:
┌─────────────┐
│ EAS Builds  │
└──────┬──────┘
       │
       ├──► Build Status      (EAS Dashboard)
       │    • Success/failure
       │    • Build time
       │    • Artifact size
       │
       └──► Usage Metrics     (EAS Dashboard)
            • Build minutes
            • Bandwidth
            • Update requests
```

## Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Security Layers                            │
└──────────────────────────────────────────────────────────────┘

Network Layer:
┌─────────────────────────────────────┐
│ SSL/TLS                              │
│ └─► Certificate Pinning (Production)│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ API Authentication                   │
│ └─► JWT Tokens                      │
│ └─► Refresh Tokens                  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Data Storage                         │
│ └─► Secure Store (expo-secure-store)│
│ └─► Encrypted preferences           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Device Security                      │
│ └─► Root/Jailbreak Detection        │
│ └─► Biometric Authentication        │
└─────────────────────────────────────┘
```

## Troubleshooting Decision Tree

```
Build Failed?
    │
    ├─► Credential Error?
    │   └─► Run: eas credentials
    │       └─► Re-generate credentials
    │
    ├─► Dependency Error?
    │   └─► Check package.json
    │       └─► Run: npm install
    │       └─► Clear cache: eas build --clear-cache
    │
    ├─► Native Code Error?
    │   └─► Check expo-modules
    │       └─► Run: expo prebuild --clean
    │       └─► Verify iOS pods / Android gradle
    │
    └─► Configuration Error?
        └─► Validate eas.json
            └─► Check app.json
            └─► Verify environment variables

Deep Link Not Working?
    │
    ├─► Custom Scheme?
    │   └─► Check app.json "scheme" field
    │       └─► Test: citadelbuy://
    │
    ├─► Universal Link (iOS)?
    │   └─► Verify apple-app-site-association
    │       └─► Check HTTPS works
    │       └─► Validate Team ID
    │
    └─► App Link (Android)?
        └─► Verify assetlinks.json
            └─► Check SHA-256 fingerprint
            └─► Test with adb

Push Not Working?
    │
    ├─► iOS?
    │   └─► Check APNs key uploaded
    │       └─► Verify entitlements
    │       └─► Test on real device (not simulator)
    │
    └─► Android?
        └─► Check google-services.json
            └─► Verify FCM server key
            └─► Test on real device
```

## Version Control Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                  Branching & Release Strategy                 │
└──────────────────────────────────────────────────────────────┘

main (production)
    │
    ├─── v1.0.0 tag ──► Production Build ──► App Stores
    │
    ├─── v1.1.0 tag ──► Production Build ──► App Stores
    │
    └─── staging ──► Preview Builds ──► Internal Testing
            │
            ├─── feature/ar-shopping
            │
            ├─── feature/voice-search
            │
            └─── bugfix/checkout-crash
```

---

**For detailed step-by-step instructions, see:**
- [QUICKSTART.md](./QUICKSTART.md) - Quick setup
- [EAS_SETUP.md](./EAS_SETUP.md) - Complete guide
- [EAS_CHECKLIST.md](./EAS_CHECKLIST.md) - Checklist

**Last Updated**: 2025-12-10
