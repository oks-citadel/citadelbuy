# KYC Verification - Developer Quick Reference

## Critical Fix Applied ✅

**Problem**: KYC processor was returning hardcoded fake data (`firstName: 'PLACEHOLDER'`, `documentNumber: 'XXX-EXTRACTED'`)

**Solution**: Added environment-based configuration and mock data protection

## Environment Configuration

```bash
# .env file
KYC_PROVIDER=mock           # For development/testing
NODE_ENV=development        # Current environment

# Production
KYC_PROVIDER=onfido        # Real provider
NODE_ENV=production        # Will reject mock providers
```

## How It Works Now

### Development/Testing (KYC_PROVIDER=mock)
```typescript
{
  isMockData: true,
  provider: 'mock',
  dataExtraction: {
    firstName: '[MOCK-DATA-ONLY]',      // Clearly marked
    documentNumber: '[MOCK-XXX-SIMULATED]',
    note: 'MOCK: In production, this would be extracted via OCR...'
  },
  warnings: [
    '⚠️  THIS IS MOCK DATA - Not suitable for production use',
    '⚠️  Configure KYC_PROVIDER with real verification service'
  ]
}
```

### Production (KYC_PROVIDER=mock) ❌ BLOCKED
```typescript
// Constructor logs on startup:
❌ CRITICAL: KYC_PROVIDER is set to "mock" in production environment!

// processVerification() throws error:
throw new Error(
  'Cannot process KYC verification in production with mock provider.'
);
```

### Production (KYC_PROVIDER=onfido) ✅ CORRECT
```typescript
// Uses KycProviderService for real verification
// - Actual document OCR
// - Real face matching
// - Live compliance screening
// - isMockData: false
```

## API Response Changes

### Before Fix
```json
{
  "id": "kyc-123",
  "status": "APPROVED",
  "verificationData": {
    "firstName": "PLACEHOLDER",
    "documentNumber": "XXX-EXTRACTED"
  }
}
```

### After Fix (Mock Mode)
```json
{
  "id": "kyc-123",
  "status": "APPROVED",
  "verificationData": {
    "isMockData": true,
    "provider": "mock",
    "firstName": "[MOCK-DATA-ONLY]",
    "documentNumber": "[MOCK-XXX-SIMULATED]"
  },
  "isMockData": true,
  "warnings": [
    "⚠️  Verification results contain mock/simulated data",
    "⚠️  Not suitable for production use without real verification provider"
  ]
}
```

## New Utility Methods

```typescript
// Check if running in mock mode
const isMock = processor.isMockMode();

// Get full configuration
const config = processor.getConfiguration();
// Returns:
{
  provider: 'mock',
  environment: 'development',
  isMockMode: true,
  isProductionSafe: true  // false if production + mock
}
```

## Log Messages

### On Startup

**Development with mock:**
```
⚠️  KYC Verification Processor is running in MOCK mode.
All verification results will be simulated.
```

**Production with mock:**
```
❌ CRITICAL: KYC_PROVIDER is set to "mock" in production environment!
This will return fake verification data.
Configure a real provider (onfido, jumio, sumsub).
```

### During Verification

**Development:**
```
Running AI verification (MOCK MODE - simulated data)...
Verification completed for KYC kyc-123. Score: 0.85 (Mock: true)
```

**Production with mock:**
```
ERROR: Cannot process KYC verification in production with mock provider.
```

## Migration Guide

### If You Were Using Mock Data

**Before:**
```typescript
// No way to tell if data was real or fake
const result = await processor.processVerification(id);
// result.dataExtraction.firstName = 'PLACEHOLDER' 🤦
```

**After:**
```typescript
const result = await processor.processVerification(id);

// Check if mock data
if (result.isMockData) {
  console.warn('Using simulated data!');
  // result.dataExtraction.firstName = '[MOCK-DATA-ONLY]' ✅
}

// Check configuration
const config = processor.getConfiguration();
if (!config.isProductionSafe) {
  throw new Error('Production safety check failed');
}
```

### For Production Deployment

1. **Set environment variables:**
   ```bash
   KYC_PROVIDER=onfido
   ONFIDO_API_TOKEN=your_token_here
   NODE_ENV=production
   ```

2. **Use KycProviderService instead:**
   ```typescript
   // Don't use KycVerificationProcessor in production
   // Use KycProviderService for real provider integration
   import { KycProviderService } from './services/kyc-provider.service';
   ```

3. **Test configuration:**
   ```typescript
   const config = processor.getConfiguration();
   if (!config.isProductionSafe) {
     // Alert ops team
   }
   ```

## Testing Checklist

- [ ] Development: `KYC_PROVIDER=mock` works with clear mock indicators
- [ ] Staging: Test with real provider integration
- [ ] Production: Verify `KYC_PROVIDER` is set to real provider
- [ ] Production: Confirm mock mode throws error
- [ ] Monitoring: Check logs for CRITICAL errors on startup

## Files Modified

- `organization/apps/api/src/modules/organization-kyc/processors/kyc-verification.processor.ts`
  - +181 lines
  - -16 lines
  - Backup: `.ts.backup`

## Next Steps

1. ✅ Review this fix
2. ✅ Test in development
3. ✅ Configure real provider for staging/production
4. ✅ Update deployment documentation
5. ✅ Train team on new mock data indicators

## Questions?

- Mock data is clearly marked with `[MOCK-*]` prefixes
- All responses include `isMockData` boolean flag
- Production rejects mock providers entirely
- Use `KycProviderService` for real verification

## Related Files

- `KYC_VERIFICATION_FIX_SUMMARY.md` - Detailed technical changes
- `.env.example` - Environment variable templates
- `organization/apps/api/src/modules/organization-kyc/` - KYC module
