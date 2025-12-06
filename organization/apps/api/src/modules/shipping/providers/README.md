# Shipping Provider Integrations

This directory contains comprehensive shipping provider implementations for the CitadelBuy e-commerce platform.

## Overview

The shipping module provides real-time rate calculation, label generation, package tracking, and pickup scheduling for major carriers:

- **FedEx** - FedEx Express, Ground, and International services
- **UPS** - UPS Ground, Air, and Worldwide services
- **DHL** - DHL Express domestic and international shipping
- **USPS** - Priority Mail, First Class, and Express services

## Architecture

```
shipping/providers/
├── shipping-provider.interface.ts          # Base interface (original)
├── shipping-provider-updated.interface.ts  # Enhanced with pickup scheduling
├── shipping-provider.factory.ts            # Provider factory pattern
├── pickup-scheduling.mixin.ts              # Pickup scheduling implementations
├── fedex.provider.ts                       # Existing FedEx provider
├── fedex-enhanced.provider.ts              # Enhanced FedEx with full features
├── ups.provider.ts                         # Existing UPS provider (enhanced)
├── dhl.provider.ts                         # Existing DHL provider (enhanced)
├── usps.provider.ts                        # Existing USPS provider
└── README.md                               # This file
```

## Files Created/Enhanced

### New Files

1. **shipping-provider-updated.interface.ts**
   - Updated interface with `PickupSchedule` interface
   - Added `schedulePickup()` and `cancelPickup()` methods
   - Maintains backward compatibility

2. **shipping-provider.factory.ts**
   - Centralized provider instantiation
   - Configuration validation
   - Supported carrier enumeration
   - Error handling and logging

3. **pickup.dto.ts** (in dto/ directory)
   - `SchedulePickupDto` - Request DTO for scheduling pickups
   - `CancelPickupDto` - Request DTO for canceling pickups
   - `PickupScheduleResponse` - Response DTO with confirmation details

4. **pickup-scheduling.mixin.ts**
   - Reusable pickup scheduling implementations for all carriers
   - Can be easily integrated into existing providers
   - Includes fallback mechanisms

5. **fedex-enhanced.provider.ts**
   - Complete implementation example
   - Full FedEx API v1 integration
   - OAuth 2.0 authentication
   - Pickup scheduling included

6. **SHIPPING_PROVIDERS_IMPLEMENTATION.md**
   - Comprehensive documentation
   - API integration details
   - Usage examples
   - Configuration guide

## Provider Capabilities

| Feature | FedEx | UPS | DHL | USPS |
|---------|-------|-----|-----|------|
| Rate Calculation | ✅ | ✅ | ✅ | ✅ |
| Label Generation | ✅ | ✅ | ✅ | ✅ |
| Package Tracking | ✅ | ✅ | ✅ | ✅ |
| Return Labels | ✅ | ✅ | ✅ | ✅ |
| Address Validation | ✅ | ✅ | ✅ | ⚠️ |
| Pickup Scheduling | ✅ | ✅ | ✅ | ✅ |
| Pickup Cancellation | ✅ | ✅ | ✅ | ✅ |
| International | ✅ | ✅ | ✅ | ✅ |
| Customs Support | ✅ | ✅ | ✅ | ⚠️ |
| Test Mode | ✅ | ✅ | ✅ | ✅ |

✅ = Fully supported | ⚠️ = Partially supported

## Quick Start

### 1. Install Dependencies

No additional dependencies required. Uses native `fetch` API.

### 2. Configure Environment Variables

```bash
# FedEx
FEDEX_API_KEY=your_fedex_client_id
FEDEX_API_SECRET=your_fedex_client_secret
FEDEX_ACCOUNT_NUMBER=your_account_number
FEDEX_METER_NUMBER=your_meter_number

# UPS
UPS_API_KEY=your_ups_client_id
UPS_API_SECRET=your_ups_client_secret
UPS_ACCOUNT_NUMBER=your_account_number

# DHL
DHL_API_KEY=your_dhl_api_key
DHL_API_SECRET=your_dhl_api_secret
DHL_ACCOUNT_NUMBER=your_account_number

# USPS
USPS_API_KEY=your_usps_user_id
USPS_ACCOUNT_NUMBER=your_account_number
```

### 3. Use the Provider Factory

```typescript
import { ShippingProviderFactory } from './providers/shipping-provider.factory';
import { ShippingCarrierEnum } from './dto/shipping.dto';

// Create factory instance
const factory = new ShippingProviderFactory();

// Create a provider
const upsProvider = factory.createProvider({
  carrier: ShippingCarrierEnum.UPS,
  apiKey: process.env.UPS_API_KEY,
  apiSecret: process.env.UPS_API_SECRET,
  accountNumber: process.env.UPS_ACCOUNT_NUMBER,
  testMode: process.env.NODE_ENV !== 'production',
});

// Get shipping rates
const rates = await upsProvider.getRates(
  fromAddress,
  toAddress,
  packageInfo,
  [ServiceLevelEnum.GROUND, ServiceLevelEnum.TWO_DAY]
);

// Create shipping label
const label = await upsProvider.createLabel(
  fromAddress,
  toAddress,
  packageInfo,
  ServiceLevelEnum.GROUND,
  { signature: true, insurance: 100 }
);

// Schedule pickup
const pickup = await upsProvider.schedulePickup(
  warehouseAddress,
  new Date('2025-12-10'),
  '09:00',
  '17:00',
  5, // package count
  25.5, // total weight in lbs
  'Call upon arrival'
);
```

## Implementing Pickup Scheduling

### Option 1: Use the Enhanced Provider (Recommended)

Replace the existing provider with the enhanced version:

```typescript
// Before
import { FedexProvider } from './providers/fedex.provider';

// After
import { FedexEnhancedProvider } from './providers/fedex-enhanced.provider';
```

### Option 2: Add Mixin to Existing Provider

Add pickup methods to existing providers:

```typescript
import * as PickupMixin from './pickup-scheduling.mixin';

export class FedexProvider implements IShippingProvider {
  // ... existing methods ...

  async schedulePickup(
    address: AddressDto,
    pickupDate: Date,
    readyTime: string,
    closeTime: string,
    packageCount: number,
    totalWeight: number,
    specialInstructions?: string,
  ): Promise<PickupSchedule> {
    return PickupMixin.fedexSchedulePickup.call(
      this,
      address,
      pickupDate,
      readyTime,
      closeTime,
      packageCount,
      totalWeight,
      specialInstructions
    );
  }

  async cancelPickup(confirmationNumber: string): Promise<boolean> {
    return PickupMixin.fedexCancelPickup.call(this, confirmationNumber);
  }
}
```

## API Integration Details

### FedEx API v1
- **Base URL**: `https://apis.fedex.com`
- **Test URL**: `https://apis-sandbox.fedex.com`
- **Auth**: OAuth 2.0 Client Credentials
- **Docs**: https://developer.fedex.com/api/en-us/home.html

**Endpoints Used:**
- `POST /oauth/token` - Authentication
- `POST /rate/v1/rates/quotes` - Rate calculation
- `POST /ship/v1/shipments` - Label creation
- `POST /track/v1/trackingnumbers` - Tracking
- `POST /pickup/v1/pickups` - Schedule pickup
- `PUT /pickup/v1/pickups/cancel` - Cancel pickup

### UPS API v2205
- **Base URL**: `https://onlinetools.ups.com`
- **Test URL**: `https://wwwcie.ups.com`
- **Auth**: OAuth 2.0 Client Credentials
- **Docs**: https://developer.ups.com/api/reference

**Endpoints Used:**
- `POST /security/v1/oauth/token` - Authentication
- `POST /api/rating/v2205/Shop` - Rate shopping
- `POST /api/shipments/v2205/ship` - Create shipment
- `GET /api/track/v1/details/{trackingNumber}` - Tracking
- `POST /api/pickup/v1/pickups` - Schedule pickup
- `DELETE /api/pickup/v1/pickups/cancel/{PRN}` - Cancel pickup

### DHL Express MyDHL API
- **Base URL**: `https://express.api.dhl.com/mydhlapi`
- **Test URL**: `https://express.api.dhl.com/mydhlapi/test`
- **Auth**: Basic Auth (Base64 encoded API key:secret)
- **Docs**: https://developer.dhl.com/api-reference/dhl-express-mydhl-api

**Endpoints Used:**
- `POST https://api.dhl.com/oauth2/v1/token` - Authentication
- `POST /rates` - Rate quotes
- `POST /shipments` - Create shipment
- `GET /shipments/{trackingNumber}/tracking` - Tracking
- `POST /pickups` - Schedule pickup
- `DELETE /pickups/{confirmationNumber}` - Cancel pickup

### USPS Web Tools API
- **Base URL**: `https://secure.shippingapis.com/ShippingAPI.dll`
- **Auth**: User ID parameter
- **Format**: XML
- **Docs**: https://www.usps.com/business/web-tools-apis/

**APIs Used:**
- `API=RateV4` - Domestic rates
- `API=IntlRateV2` - International rates
- `API=TrackV2` - Tracking
- `API=CarrierPickupSchedule` - Schedule pickup
- `API=CarrierPickupCancel` - Cancel pickup

## Error Handling

All providers implement comprehensive error handling:

1. **Network Errors**: Automatic retry with exponential backoff
2. **Authentication Failures**: Token refresh and retry
3. **Invalid Credentials**: Fallback to estimated rates
4. **API Timeouts**: Return cached rates when available
5. **Validation Errors**: Detailed error messages returned

Example:
```typescript
try {
  const rates = await provider.getRates(from, to, package);
  return rates;
} catch (error) {
  if (error.message === 'UPS_NOT_CONFIGURED') {
    // Use fallback rates
    return getFallbackRates();
  }
  throw error;
}
```

## Testing

### Test Mode

Enable test mode in provider configuration:

```typescript
const provider = factory.createProvider({
  carrier: ShippingCarrierEnum.FEDEX,
  apiKey: 'test_key',
  apiSecret: 'test_secret',
  accountNumber: 'test_account',
  testMode: true, // Uses sandbox environment
});
```

### Mock Data

All providers include fallback mechanisms that return realistic mock data when:
- API credentials are not configured
- API is unavailable
- Network errors occur

## Performance Optimization

### Token Caching
OAuth tokens are cached in memory with automatic refresh:

```typescript
private accessToken: string | null = null;
private tokenExpiry: number = 0;

private async getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
    return this.accessToken;
  }
  // Refresh token...
}
```

### Rate Caching
Rates are cached in Redis for 1 hour:

```typescript
const cacheKey = `shipping:rates:${fromZip}:${toZip}:${weight}`;
await redisService.set(cacheKey, rates, 3600);
```

### Parallel Requests
Multiple carrier rates fetched concurrently:

```typescript
const ratePromises = carriers.map(carrier =>
  provider.getRates(from, to, package)
);
const allRates = await Promise.all(ratePromises);
```

## Security Considerations

1. **Credentials Storage**: Store API keys encrypted in database
2. **Environment Variables**: Never commit credentials to version control
3. **Token Security**: Tokens stored in memory only, never logged
4. **HTTPS Only**: All API calls use HTTPS
5. **Input Validation**: All addresses and package info validated

## Monitoring & Logging

All providers log:
- API request/response times
- Authentication attempts
- Rate limiting warnings
- Error stack traces
- Pickup scheduling confirmations

Example logs:
```
[FedexProvider] Getting FedEx rates
[FedexProvider] FedEx Rate API success: 234ms
[FedexProvider] Scheduling FedEx pickup
[FedexProvider] Pickup confirmed: FDXP12345
```

## Troubleshooting

### Common Issues

**Issue**: `FEDEX_NOT_CONFIGURED` error
**Solution**: Set FedEx API credentials in environment variables

**Issue**: Rates returning null
**Solution**: Check address validation, ensure postal codes are correct

**Issue**: Pickup scheduling fails
**Solution**: Verify pickup date is in the future and within carrier's allowed window

**Issue**: Token expired errors
**Solution**: Increase token cache buffer time or check system clock

## Migration Guide

### From Old Interface to New

1. Update provider import:
```typescript
// Old
import { IShippingProvider } from './shipping-provider.interface';

// New
import { IShippingProvider } from './shipping-provider-updated.interface';
```

2. Add pickup methods to provider class
3. Update service to use provider factory
4. Add pickup scheduling endpoints to controller

## Contributing

When adding new carriers:

1. Implement `IShippingProvider` interface
2. Add carrier to `ShippingCarrierEnum`
3. Update `ShippingProviderFactory`
4. Add mixin functions to `pickup-scheduling.mixin.ts`
5. Update documentation
6. Add tests

## Support

For issues or questions:
- Check provider API documentation
- Review error logs
- Test with sandbox credentials first
- Verify address formats match carrier requirements

## License

Proprietary - CitadelBuy Platform
