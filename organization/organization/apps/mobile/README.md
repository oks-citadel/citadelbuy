# Broxiva Mobile

React Native mobile app built with Expo for iOS and Android.

## Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 10+ (package manager)
- Expo CLI: `pnpm add -g expo-cli`
- EAS CLI: `pnpm add -g eas-cli`
- For iOS: macOS with Xcode
- For Android: Android Studio with emulator

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API URL
   ```

3. **Start development server**
   ```bash
   pnpm start
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API URL |

Development: `http://localhost:4000/api`
Production: `https://api.broxiva.com/api`

## Running the App

```bash
# Start Expo dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run in web browser
pnpm web
```

### Using Expo Go

1. Install Expo Go on your device ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Run `pnpm start`
3. Scan the QR code with your device

## Development

```bash
# Type checking
pnpm typecheck

# Lint code
pnpm lint

# Run tests
pnpm test
```

## Building for Production

### EAS Build (Recommended)

```bash
# Login to EAS
eas login

# Configure EAS project
eas build:configure

# Build for development
eas build --profile development --platform all

# Build for internal testing
eas build --profile preview --platform all

# Build for store release
eas build --profile production --platform all
```

### Build Profiles

| Profile | iOS | Android | Use Case |
|---------|-----|---------|----------|
| `development` | Simulator | APK | Local development |
| `preview` | Internal | APK | Internal testing |
| `production` | App Store | AAB | Store release |

### Submitting to Stores

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

**Required setup for submissions:**
- iOS: Apple Developer account, ASC App ID, Team ID
- Android: Google Play Console, service account JSON

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/               # Tab navigation screens
  (auth)/               # Authentication screens
assets/                 # Images, fonts, icons
components/             # Reusable components
hooks/                  # Custom hooks
lib/                    # Utilities and API client
stores/                 # Zustand state stores
```

## Key Technologies

- **Framework:** React Native 0.73 with Expo 50
- **Navigation:** Expo Router
- **Styling:** NativeWind (Tailwind for RN)
- **State:** Zustand, TanStack Query
- **Storage:** AsyncStorage, SecureStore
- **Notifications:** Expo Notifications
- **Camera:** Expo Camera, Image Picker

## Permissions

The app requests these permissions:

| Permission | Reason |
|------------|--------|
| Camera | Visual search, AR features |
| Microphone | Voice search |
| Photo Library | Visual search uploads |
| Notifications | Order updates, promotions |

## Troubleshooting

**Metro bundler issues:**
```bash
npx expo start --clear
```

**iOS Pod issues:**
```bash
cd ios && pod install --repo-update && cd ..
```

**Android build issues:**
```bash
cd android && ./gradlew clean && cd ..
```
