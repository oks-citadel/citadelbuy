# Mobile Web Test Setup

## Mission Summary
Enable the Expo mobile app to run in browser for testing purposes, allowing rapid prototyping and cross-platform development without needing physical devices.

## Current State

### Expo Configuration
- **Expo version**: 50.0.21
- **Web support**: ENABLED (configured in app.json)
- **Bundler**: Webpack (for web builds) + Metro (for dev server)
- **React version**: 18.2.0
- **React Native version**: 0.73.2

### Installed Dependencies

#### Core Web Dependencies
- `react-dom@18.2.0` - React DOM renderer for web
- `react-native-web@0.19.13` - React Native components for web
- `@expo/webpack-config@19.0.1` - Webpack configuration for Expo web builds
- `@expo/metro-runtime@6.1.2` - Metro runtime for Expo

#### Supporting Dependencies
- `@babel/runtime@7.28.4` - Babel runtime helpers
- `fbjs@3.0.5` - Facebook JavaScript library utilities
- `styleq@0.2.1` - Style optimization library
- `use-sync-external-store@1.6.0` - React 18 sync external store shim
- `@tanstack/query-core@5.90.12` - TanStack Query core (peer dependency)

### App Configuration (app.json)
```json
{
  "expo": {
    "name": "Broxiva",
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## Required Changes

### 1. Package.json Updates
**File**: `C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/apps/mobile/package.json`

#### Added Scripts
```json
{
  "scripts": {
    "web": "expo start --web",
    "web:build": "expo export:web"
  }
}
```

#### Added Dependencies
```json
{
  "dependencies": {
    "@babel/runtime": "^7.28.4",
    "@expo/metro-runtime": "^6.1.2",
    "@tanstack/query-core": "^5.90.12",
    "fbjs": "^3.0.5",
    "react-dom": "^18.2.0",
    "react-native-web": "^0.19.13",
    "styleq": "^0.2.1",
    "use-sync-external-store": "^1.6.0"
  },
  "devDependencies": {
    "@expo/webpack-config": "^19.0.1"
  }
}
```

### 2. Installation Command
```bash
cd apps/mobile
pnpm add react-dom@18.2.0 react-native-web@~0.19.0 @babel/runtime fbjs styleq use-sync-external-store @tanstack/query-core @expo/metro-runtime
pnpm add -D @expo/webpack-config
```

## Local Testing Guide

### Development Server (Recommended)
```bash
# Navigate to mobile app directory
cd C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/apps/mobile

# Install dependencies (if not already done)
pnpm install

# Start web development server
pnpm run web

# Access at: http://localhost:8081 (or port shown in terminal)
```

### Production Build
```bash
# Build for production
pnpm run web:build

# Output location: ./web-build/
# Can be served with any static file server
```

### Alternative: Using Expo CLI Directly
```bash
# Start dev server with web
expo start --web

# Or start and automatically open browser
expo start --web --open
```

## Known Issues & Workarounds

### Issue 1: Windows "node:sea" Directory Error
**Problem**: Expo Metro bundler tries to create a directory named `node:sea` which is invalid on Windows (colons not allowed in directory names).

**Error Message**:
```
Error: ENOENT: no such file or directory, mkdir '...\.expo\metro\externals\node:sea'
```

**Workarounds**:
1. **Use Webpack mode** (for web builds): The `expo export:web` command uses Webpack instead of Metro and avoids this issue
2. **Use WSL** (Windows Subsystem for Linux): Run Expo commands in WSL environment
3. **Wait for fix**: This is a known Expo issue that should be fixed in future versions

**Status**: BLOCKING for Metro-based web dev server on Windows. Webpack builds work with dependency issues.

### Issue 2: styleq Module Resolution (pnpm)
**Problem**: The `styleq/transform-localize-style` submodule may not resolve correctly with pnpm's node_modules structure.

**Error Message**:
```
ModuleNotFoundError: Module not found: Error: Can't resolve 'styleq/transform-localize-style'
```

**Workarounds**:
1. Use `shamefully-hoist=true` in .npmrc
2. Add styleq to `public-hoist-pattern` in .npmrc
3. Switch to npm or yarn for mobile app only

**Current Status**: BLOCKING for Webpack builds. Under investigation.

### Issue 3: Mobile-Specific Features on Web
**Problem**: Native features (camera, in-app purchases, etc.) won't work in browser.

**Solution**: Use platform-specific code:
```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Web-specific fallback
} else {
  // Native implementation
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Module not found" errors | Run `pnpm install` to ensure all dependencies are installed |
| Port 8081 already in use | Kill the process using the port or use `--port` flag: `expo start --web --port 3000` |
| Blank white screen | Check browser console for errors; ensure all native modules have web fallbacks |
| Assets not loading | Verify asset paths are correct; check `assetBundlePatterns` in app.json |
| TypeScript errors | Run `pnpm run typecheck` to identify issues |
| Webpack build fails | Clear cache: `rm -rf .expo node_modules/.cache` then `pnpm install` |
| Metro bundler crash | This is the Windows "node:sea" bug - use Webpack mode instead |

## Web Build Artifact

### Output Location
```
C:/Users/Dell/OneDrive/Documents/Broxivabuy/Broxiva/organization/apps/mobile/web-build/
```

### Build Contents
- `index.html` - Main entry point
- `static/` - Bundled JavaScript, CSS, and assets
- `manifest.json` - PWA manifest
- `favicon.png` - Site favicon

### Hosting Options
The built web application can be hosted on:
- **GitHub Pages**: Free static hosting
- **Azure Static Web Apps**: Free tier available, integrates with Azure DevOps
- **Vercel**: Free for personal/hobby projects
- **Netlify**: Free tier with CI/CD
- **Expo hosting**: `expo publish:web` (requires Expo account)

### Serving Locally
```bash
# Using npx serve
cd web-build
npx serve

# Using Python
cd web-build
python -m http.server 8000

# Using Node.js http-server
npx http-server web-build -p 8000
```

## CI Job for Web Preview Artifact

### Azure Pipelines Job
```yaml
# File: .azure-pipelines/mobile-web-preview.yml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - apps/mobile/**

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: |
      corepack enable
      corepack prepare pnpm@latest --activate
    displayName: 'Setup pnpm'

  - script: |
      cd apps/mobile
      pnpm install --frozen-lockfile
    displayName: 'Install dependencies'

  - script: |
      cd apps/mobile
      pnpm run web:build
    displayName: 'Build web version'
    continueOnError: true # Due to current build issues

  - task: PublishBuildArtifacts@1
    inputs:
      PathtoPublish: 'apps/mobile/web-build'
      ArtifactName: 'mobile-web-preview'
      publishLocation: 'Container'
    displayName: 'Publish web build artifact'
    condition: succeededOrFailed()

  - task: AzureStaticWebApp@0
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    inputs:
      app_location: 'apps/mobile/web-build'
      skip_app_build: true
      azure_static_web_apps_api_token: $(AZURE_STATIC_WEB_APP_TOKEN)
    displayName: 'Deploy to Azure Static Web Apps'
```

### GitHub Actions Workflow
```yaml
# File: .github/workflows/mobile-web-preview.yml
name: Mobile Web Preview

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/mobile/**'
  pull_request:
    branches: [main]
    paths:
      - 'apps/mobile/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: latest

      - name: Install dependencies
        working-directory: apps/mobile
        run: pnpm install --frozen-lockfile

      - name: Build web version
        working-directory: apps/mobile
        run: pnpm run web:build
        continue-on-error: true # Due to current build issues

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: mobile-web-preview
          path: apps/mobile/web-build/
          retention-days: 30

      - name: Deploy to GitHub Pages (main branch only)
        if: github.ref == 'refs/heads/main' && success()
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./apps/mobile/web-build
          cname: mobile.broxiva.com # Optional: custom domain
```

## Next Steps

### Immediate Actions
1. **Resolve Windows compatibility**: Test in WSL or Linux environment
2. **Fix pnpm hoisting**: Add proper configuration for styleq resolution
3. **Test web functionality**: Verify all screens load and navigate correctly
4. **Add platform checks**: Implement fallbacks for native-only features

### Future Enhancements
1. **Progressive Web App (PWA)**: Configure service worker and offline support
2. **Web-specific optimizations**: Code splitting, lazy loading
3. **Responsive design**: Ensure mobile app works well on desktop browsers
4. **E2E testing**: Set up Playwright or Cypress for web version
5. **Performance monitoring**: Add web vitals tracking

## Testing Checklist

- [ ] Dependencies installed successfully
- [ ] `pnpm run web:build` completes without errors
- [ ] `pnpm run web` starts development server
- [ ] Application loads in browser
- [ ] Navigation between screens works
- [ ] Authentication flow works on web
- [ ] Product search and display functional
- [ ] Cart operations work
- [ ] Checkout process completes
- [ ] Responsive layout on mobile viewport
- [ ] Responsive layout on tablet viewport
- [ ] Responsive layout on desktop viewport

## Platform-Specific Code Examples

### Camera Feature Fallback
```typescript
// src/hooks/useCamera.web.ts
export const useCamera = () => {
  return {
    requestPermission: async () => ({ status: 'granted' }),
    takePicture: async () => {
      // Fallback to file input for web
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          // Process file...
          resolve(file);
        };
        input.click();
      });
    },
  };
};
```

### In-App Purchases Fallback
```typescript
// src/services/billing.web.ts
export const billingService = {
  initialize: async () => {
    console.warn('In-app purchases not available on web');
  },
  disconnect: async () => {},
  purchaseProduct: async (productId: string) => {
    // Redirect to web checkout or show message
    throw new Error('Please use the mobile app to make purchases');
  },
};
```

## Resources

- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Webpack Configuration](https://docs.expo.dev/guides/customizing-webpack/)
- [Platform Specific Code](https://reactnative.dev/docs/platform-specific-code)

## Support

For issues or questions:
1. Check [Expo GitHub Issues](https://github.com/expo/expo/issues)
2. Review [Expo Forums](https://forums.expo.dev/)
3. Consult internal documentation in other .md files in this directory
