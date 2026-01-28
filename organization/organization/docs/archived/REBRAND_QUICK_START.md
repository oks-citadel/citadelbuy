# TypeScript Rebrand Quick Start Guide

## Quick Steps to Complete the Rebrand

### 1. Review What's Been Done
16 core TypeScript files have already been manually updated, including:
- All package type definitions and AI SDK
- Core web app files (layout, API client, hooks, i18n)
- Authentication and email service files
- Key page components

See `TYPESCRIPT_REBRAND_SUMMARY.md` for complete details.

### 2. Run the Batch Update Script

```bash
# Navigate to the organization directory
cd Broxiva/organization

# Run the Python rebrand script
python rebrand-typescript.py
```

**Expected Output:**
```
============================================================
Rebrand Complete!
============================================================
Total files updated: XXX

Updated files:
  - apps/web/src/app/account/loyalty/page.tsx
  - apps/web/src/app/account/support/page.tsx
  - apps/web/src/app/accessibility/page.tsx
  ...
```

### 3. Verify the Changes

```bash
# Check for any remaining "broxiva" references
grep -ri "broxiva" apps/web/src apps/api/src apps/mobile/src packages/*/src tests --include="*.ts" --include="*.tsx"

# Check for old class name
grep -r "BroxivaAI" apps/web/src apps/api/src apps/mobile/src packages/*/src tests --include="*.ts" --include="*.tsx"
```

If the above commands return no results, the rebrand is complete!

### 4. Test Compilation

```bash
# Install dependencies if needed
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

### 5. Commit Changes

```bash
git add .
git commit -m "Rebrand: Update TypeScript source files from Broxiva to Broxiva

- Renamed BroxivaAI class to BroxivaAI
- Updated all storage keys (broxiva_ → broxiva_)
- Updated email addresses (@broxiva.com → @broxiva.com)
- Updated URLs and domains (broxiva.com → broxiva.com)
- Updated all user-facing text and comments
- Updated package identifiers (com.broxiva.* → com.broxiva.*)

Total files updated: XXX TypeScript files across:
- packages/* (core libraries)
- apps/web/src (frontend)
- apps/api/src (backend)
- apps/mobile/src (mobile app)
- tests/* (test files)
"
```

## What Gets Updated

### Automatic Replacements

The script performs these replacements:

1. **Class Names**: `BroxivaAI` → `BroxivaAI`
2. **Brand Names**: `Broxiva` → `Broxiva`, `Broxiva's` → `Broxiva's`
3. **Storage Keys**: `broxiva_*` → `broxiva_*`, `BROXIVA_*` → `BROXIVA_*`
4. **Email Addresses**: `*@broxiva.com` → `*@broxiva.com`
5. **URLs**: `broxiva.com` → `broxiva.com`
6. **Package IDs**: `com.broxiva.*` → `com.broxiva.*`
7. **Social Handles**: `@broxiva` → `@broxiva`

### Files Covered

- `apps/web/src/**/*.{ts,tsx}` - Frontend React components
- `apps/api/src/**/*.{ts,tsx}` - Backend NestJS services
- `apps/mobile/src/**/*.{ts,tsx}` - Mobile React Native app
- `packages/*/src/**/*.ts` - Shared packages (ai-sdk, types, ui, utils)
- `tests/**/*.{ts,tsx}` - Test files

## Troubleshooting

### Script Not Found
```bash
# Ensure you're in the correct directory
pwd
# Should show: /path/to/Broxivabuy/Broxiva/organization

# Verify script exists
ls -la rebrand-typescript.py
```

### Python Not Installed
```bash
# Install Python 3 (if needed)
# Windows: Download from python.org
# Mac: brew install python3
# Linux: sudo apt-get install python3
```

### Permission Denied
```bash
# Make script executable (Linux/Mac)
chmod +x rebrand-typescript.py

# Or run with python explicitly
python rebrand-typescript.py
```

### No Files Updated
This likely means all files have already been updated. Verify with:
```bash
grep -ri "broxiva" apps/web/src --include="*.ts" --include="*.tsx" | wc -l
```

If the count is 0, you're done!

## Manual Review Recommended

After running the script, manually review these critical files:

1. **Authentication**: `apps/api/src/modules/auth/auth.service.ts`
2. **API Client**: `apps/web/src/lib/api-client.ts`
3. **Layout/Metadata**: `apps/web/src/app/layout.tsx`
4. **Email Service**: `apps/api/src/modules/email/email.service.ts`
5. **AI SDK**: `packages/ai-sdk/src/index.ts`

## Next Steps After Rebrand

1. Update environment variables (`.env` files)
2. Update email templates (`.hbs` files)
3. Update Docker configurations
4. Update CI/CD pipelines
5. Update README and documentation
6. Update package.json names/descriptions
7. Regenerate any auto-generated API documentation

## Success Criteria

✅ No "broxiva" references in TypeScript files
✅ No "BroxivaAI" class references
✅ TypeScript compilation succeeds
✅ All tests pass
✅ Application starts without errors
✅ Git commit created with all changes

---

**Need Help?**
- See `TYPESCRIPT_REBRAND_SUMMARY.md` for detailed information
- Check the script source code: `rebrand-typescript.py`
- Review manually updated files for patterns
