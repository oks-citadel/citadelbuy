# Shipping Provider Integrations Implementation

## Overview
This document outlines the comprehensive shipping provider integrations implemented for the CitadelBuy platform, including rate calculation, label generation, tracking, and pickup scheduling for FedEx, UPS, DHL, and USPS.

## Providers Implemented

### 1. FedEx Provider (`fedex-enhanced.provider.ts`)
**Features:**
- Real-time rate calculation using FedEx Rating API v1
- Label generation with FedEx Ship API v1
- Package tracking with FedEx Track API v1
- Pickup scheduling with FedEx Pickup API v1
- OAuth 2.0 authentication with token caching
- Address validation
- Return label generation
- Shipment cancellation

**API Integration:**
- Production: `https://apis.fedex.com`
- Sandbox: `https://apis-sandbox.fedex.com`
- Authentication: OAuth 2.0 Client Credentials

**Service Mapping:**
- `FEDEX_GROUND` → Ground shipping (4-5 days)
- `FEDEX_2_DAY` → 2-day express
- `PRIORITY_OVERNIGHT` → Next day delivery
- `INTERNATIONAL_PRIORITY` → International shipping

**Pickup Scheduling:**
```typescript
async schedulePickup(
  address: AddressDto,
  pickupDate: Date,
  readyTime: string,  // HH:MM format
  closeTime: string,   // HH:MM format
  packageCount: number,
  totalWeight: number,
  specialInstructions?: string
): Promise<PickupSchedule>
```

### 2. UPS Provider (`ups.provider.ts`)
**Features:**
- UPS Rating API integration
- UPS Shipping API for label generation
- UPS Tracking API
- UPS Pickup API for scheduling
- OAuth 2.0 with access token management
- Address validation via UPS Address Validation API
- Dimensional weight calculation

**API Integration:**
- Production: `https://onlinetools.ups.com`
- Test: `https://wwwcie.ups.com`
- Version: 2205 (current)

**Service Codes:**
- `01` - UPS Next Day Air
- `02` - UPS 2nd Day Air
- `03` - UPS Ground
- `07` - UPS Worldwide Express
- `08` - UPS Worldwide Expedited

**Pickup Implementation:**
```typescript
// UPS Pickup API endpoint
POST /api/pickup/v1/pickups

// Request structure
{
  "RatePickupIndicator": "Y",
  "Shipper": {
    "Account": { "AccountNumber": accountNumber },
    "Address": { ... }
  },
  "PickupDateInfo": {
    "CloseTime": closeTime,
    "ReadyTime": readyTime,
    "PickupDate": pickupDate
  },
  "PickupAddress": { ... },
  "TotalWeight": {
    "Weight": totalWeight,
    "UnitOfMeasurement": { "Code": "LBS" }
  },
  "OverweightIndicator": "N",
  "TrackingNumber": trackingNumbers
}
```

### 3. DHL Provider (`dhl.provider.ts`)
**Features:**
- DHL Express MyDHL API integration
- International shipping focus
- Real-time rate quotes
- Shipment creation and label generation
- Tracking with detailed event history
- Pickup scheduling
- Customs documentation support

**API Integration:**
- Production: `https://express.api.dhl.com/mydhlapi`
- Test: `https://express.api.dhl.com/mydhlapi/test`
- Auth: `https://api.dhl.com/oauth2/v1/token`

**Service Codes:**
- `N` - DHL Express Domestic (Next Day)
- `P` - DHL Express 12:00 (2-Day)
- `G` - DHL Express Worldwide (International)
- `W` - DHL Express Economy Select
- `D` - DHL Express Worldwide Non-Doc

**Pickup Features:**
```typescript
// DHL Pickup scheduling
{
  "plannedPickupDateAndTime": pickupDate.toISOString(),
  "closeTime": closeTime,
  "location": "reception",
  "specialInstructions": [
    {
      "value": specialInstructions,
      "typeCode": "TBD"
    }
  ],
  "remark": "Pickup scheduled via CitadelBuy",
  "accounts": [
    {
      "typeCode": "shipper",
      "number": accountNumber
    }
  ]
}
```

### 4. USPS Provider (`usps.provider.ts`)
**Features:**
- USPS Web Tools API integration
- Domestic shipping focus
- Priority Mail, First Class, Priority Mail Express
- International shipping via Priority Mail International
- Basic tracking
- Carrier pickup scheduling (free for Priority Mail)

**API Integration:**
- Base URL: `https://secure.shippingapis.com/ShippingAPI.dll`
- Authentication: API User ID

**Services:**
- **USPS Priority Mail** - 2-3 day delivery
- **USPS First Class** - 2-5 days (up to 13 oz)
- **USPS Priority Mail Express** - Overnight to 2-day
- **USPS Priority Mail International** - International shipping

**Pickup Scheduling:**
```typescript
// USPS Pickup is free for Priority Mail
// Uses CarrierPickupSchedule API
{
  "FirstName": contact.firstName,
  "LastName": contact.lastName,
  "FirmName": address.name,
  "SuiteOrApt": address.street2,
  "Address2": address.street1,
  "Urbanization": "",
  "City": address.city,
  "State": address.state,
  "ZIP5": address.postalCode.substring(0, 5),
  "ZIP4": address.postalCode.substring(5),
  "Phone": address.phone,
  "Extension": "",
  "Package": [
    {
      "ServiceType": "PriorityMail",
      "Count": packageCount.toString()
    }
  ],
  "EstimatedWeight": totalWeight.toString(),
  "PackageLocation": "Front Door",
  "SpecialInstructions": specialInstructions
}
```

## Provider Factory

The `ShippingProviderFactory` class provides centralized provider instantiation:

```typescript
@Injectable()
export class ShippingProviderFactory {
  createProvider(config: ProviderConfig): IShippingProvider | null
  validateConfig(config: ProviderConfig): { valid: boolean; errors: string[] }
  getSupportedCarriers(): ShippingCarrierEnum[]
  isCarrierSupported(carrier: string): boolean
}
```

## Common Interfaces

### IShippingProvider
```typescript
interface IShippingProvider {
  getRates(...): Promise<RateQuote[]>
  createLabel(...): Promise<ShipmentLabel>
  trackShipment(trackingNumber: string): Promise<TrackingInfo>
  createReturnLabel(...): Promise<ShipmentLabel>
  cancelShipment(trackingNumber: string): Promise<boolean>
  validateAddress(address: AddressDto): Promise<ValidationResult>
  schedulePickup(...): Promise<PickupSchedule>
  cancelPickup(confirmationNumber: string): Promise<boolean>
}
```

### PickupSchedule Interface
```typescript
interface PickupSchedule {
  confirmationNumber: string
  pickupDate: Date
  readyTime: string
  closeTime: string
  location: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED'
}
```

## DTOs

### SchedulePickupDto
```typescript
class SchedulePickupDto {
  carrier: ShippingCarrierEnum
  pickupAddress: AddressDto
  pickupDate: string  // ISO date
  readyTime: string   // HH:MM
  closeTime: string   // HH:MM
  packageCount: number
  totalWeight: number
  specialInstructions?: string
  trackingNumbers?: string[]
}
```

### CancelPickupDto
```typescript
class CancelPickupDto {
  carrier: ShippingCarrierEnum
  confirmationNumber: string
  reason?: string
}
```

## Error Handling & Fallbacks

All providers implement fallback mechanisms:

1. **Authentication Failures**: Return mock/estimated rates
2. **API Timeouts**: Use cached rates when available
3. **Network Errors**: Graceful degradation with estimated costs
4. **Invalid Credentials**: Warning logged, fallback rates returned

## Rate Caching Strategy

- **Redis Cache**: 1 hour TTL for rate quotes
- **Database Cache**: 24 hours for historical reference
- **Cache Key Format**: `shipping:rates:{fromZip}:{toZip}:{weight}:{dimensions}`

## Security Considerations

- **Credentials**: Stored encrypted in database
- **API Keys**: Never logged or exposed in responses
- **Token Management**: Automatic refresh 5 minutes before expiry
- **Test Mode**: Separate sandbox credentials for development

## Usage Example

```typescript
// In ShippingService
async createShipment(dto: CreateShipmentDto) {
  const provider = this.providerFactory.createProvider({
    carrier: dto.carrier,
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    accountNumber: config.accountNumber,
    testMode: false
  });

  const label = await provider.createLabel(
    dto.fromAddress,
    dto.toAddress,
    dto.package,
    dto.serviceLevel,
    options
  );

  // Optionally schedule pickup
  if (dto.schedulePickup) {
    const pickup = await provider.schedulePickup(
      dto.fromAddress,
      dto.pickupDate,
      dto.readyTime,
      dto.closeTime,
      1,
      dto.package.weight
    );
  }

  return label;
}
```

## Testing

All providers support test mode:
- FedEx: Sandbox environment
- UPS: Test API endpoint
- DHL: Test environment
- USPS: Test server

Set `testMode: true` in provider configuration.

## Performance Optimizations

1. **Token Caching**: OAuth tokens cached in memory
2. **Rate Limiting**: Built-in request throttling
3. **Parallel Requests**: Rate quotes fetched concurrently
4. **Connection Pooling**: HTTP keep-alive enabled
5. **Retry Logic**: Exponential backoff for transient failures

## Monitoring & Logging

- All API calls logged with request/response times
- Error tracking with stack traces
- Success/failure metrics
- Rate limiting warnings
- API credential validation errors

## Future Enhancements

1. **Additional Carriers**: Canada Post, DPD, Hermes
2. **Smart Routing**: Automatic carrier selection
3. **Rate Shopping**: Real-time comparison across all carriers
4. **Batch Processing**: Bulk label generation
5. **Webhook Integration**: Delivery notifications
6. **Insurance**: Automatic insurance calculation
7. **Customs Automation**: Auto-generate customs forms

## Configuration Required

Each carrier requires specific credentials:

**FedEx:**
- API Key (Client ID)
- API Secret (Client Secret)
- Account Number
- Meter Number

**UPS:**
- API Key (Client ID)
- API Secret (Client Secret)
- Account Number

**DHL:**
- API Key
- API Secret
- Account Number

**USPS:**
- API User ID
- Account Number

Store these in environment variables or encrypted database records.
