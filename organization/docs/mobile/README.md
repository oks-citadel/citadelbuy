# Mobile App Assets

This directory contains the app icons and splash screens for the Broxiva mobile application.

## Required Assets

Replace these placeholder files with proper PNG images:

### icon.png (1024x1024)
The main app icon. Should be a square PNG without transparency for best compatibility.

### splash.png (1284x2778)
The splash screen shown during app loading. Use the brand color (#6366f1) as background.

### adaptive-icon.png (108x108)
Android adaptive icon foreground. Should have transparent background.

### favicon.png (48x48)
Web favicon for Expo web builds.

## Brand Colors
- Primary: #6366f1 (Indigo)
- Background: #ffffff
- Text: #1f2937

## Generating Assets

You can use tools like:
- [Expo Icon Builder](https://icons.expo.fyi/)
- [App Icon Generator](https://appicon.co/)
- Figma or Adobe XD

## Current Placeholders

SVG placeholder files have been created. Convert them to PNG before building:

```bash
# Using sharp-cli (install with: npm install -g sharp-cli)
sharp -i icon.svg -o icon.png resize 1024 1024
sharp -i splash.svg -o splash.png resize 1284 2778
sharp -i adaptive-icon.svg -o adaptive-icon.png resize 108 108
sharp -i favicon.svg -o favicon.png resize 48 48
```

Or use online converters like CloudConvert or Convertio.
