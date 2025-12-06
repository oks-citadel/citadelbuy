# Shipping Module - Complete API Integration

## Overview

The Shipping Module provides comprehensive shipping rate calculation, label generation, and tracking capabilities with support for multiple carriers (UPS, FedEx, USPS, DHL). It includes advanced features like rate caching, free shipping thresholds, flat rate options, and international customs support.

## Features Implemented

### 1. Multi-Carrier Support
- **UPS**: Full API integration with OAuth 2.0 authentication
- **FedEx**: Complete rate calculation and label generation
- **USPS**: Domestic and international shipping support
- **DHL**: International express shipping with customs support

### 2. Rate Calculation & Comparison
- Real-time rate fetching from all carriers
- Rate comparison with free shipping eligibility check
- Flat rate shipping options
- Custom pricing rules and shipping zones
- Redis caching for improved performance (1-hour TTL)

### 3. Package Dimension Calculations
- Automatic calculation from product dimensions
- Dimensional weight calculation (DIM weight)
- Multi-item package consolidation
- Maximum dimension limits enforcement

### 4. Free Shipping Support
- Configurable free shipping thresholds
- Cart total-based eligibility
- "Amount needed for free shipping" calculator
- Automatic free shipping option injection

### 5. International Shipping
- Full customs declaration support
- Harmonized System (HS) codes
- Commercial invoice generation
- Incoterms support (DAP, DDP, etc.)
- Country-specific handling

### 6. Advanced Features
- Rate caching with Redis
- Error handling with fallback rates
- Multi-warehouse shipping optimization
- Address validation
- Shipment tracking
- Return label generation
- Label cancellation

## API Endpoints

### Rate Calculation

#### Calculate Shipping Rates
```http
POST /shipping/rates/calculate
```

**Request Body:**
```json
{
  "fromAddress": {
    "name": "CitadelBuy Warehouse",
    "street1": "123 Warehouse St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "US"
  },
  "toAddress": {
    "name": "John Doe",
    "street1": "456 Customer Ave",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "package": {
    "type": "SMALL_PACKAGE",
    "weight": 5.5,
    "length": 12,
    "width": 8,
    "height": 6,
    "value": 150.00
  },
  "carriers": ["UPS", "FEDEX", "USPS", "DHL"],
  "serviceLevels": ["GROUND", "TWO_DAY", "NEXT_DAY"]
}
```

**Response:**
```json
[
  {
    "carrier": "USPS",
    "serviceName": "USPS Priority Mail",
    "serviceLevel": "GROUND",
    "baseRate": 9.90,
    "fuelSurcharge": 0,
    "totalRate": 9.90,
    "estimatedDays": 3,
    "guaranteedDelivery": false
  },
  {
    "carrier": "UPS",
    "serviceName": "UPS Ground",
    "serviceLevel": "GROUND",
    "baseRate": 11.00,
    "fuelSurcharge": 1.10,
    "totalRate": 12.10,
    "estimatedDays": 5,
    "guaranteedDelivery": false
  }
]
```

#### Compare Rates with Free Shipping
```http
POST /shipping/rates/compare
```

**Request Body:**
```json
{
  "rateRequest": {
    "fromAddress": { ... },
    "toAddress": { ... },
    "package": { ... }
  },
  "cartTotal": 125.00
}
```

**Response:**
```json
{
  "rates": [
    {
      "carrier": "FREE",
      "serviceName": "Free Standard Shipping",
      "serviceLevel": "GROUND",
      "baseRate": 0,
      "totalRate": 0,
      "estimatedDays": 7,
      "guaranteedDelivery": false
    },
    ...
  ],
  "freeShippingEligible": false,
  "freeShippingThreshold": 150.00,
  "amountNeededForFreeShipping": 25.00
}
```

#### Calculate Package Dimensions
```http
POST /shipping/package/calculate-dimensions
```

**Request Body:**
```json
{
  "productIds": ["prod_123", "prod_456", "prod_789"]
}
```

**Response:**
```json
{
  "weight": 8.5,
  "length": 14,
  "width": 10,
  "height": 8,
  "value": 245.99
}
```

### Label Generation

#### Create Shipment
```http
POST /shipping/shipments
```

**Request Body:**
```json
{
  "orderId": "order_123",
  "warehouseId": "warehouse_456",
  "carrier": "UPS",
  "serviceLevel": "GROUND",
  "fromAddress": { ... },
  "toAddress": { ... },
  "package": {
    "type": "SMALL_PACKAGE",
    "weight": 5.5,
    "length": 12,
    "width": 8,
    "height": 6,
    "value": 150.00
  },
  "signature": true,
  "insurance": 150.00,
  "customsDeclaration": {
    "contentType": "MERCHANDISE",
    "incoterm": "DAP",
    "items": [
      {
        "description": "Electronics",
        "quantity": 2,
        "value": 75.00,
        "weight": 2.75,
        "hsCode": "8471.30",
        "countryOfOrigin": "US"
      }
    ]
  }
}
```

**Response:**
```json
{
  "id": "shipment_789",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "serviceLevel": "GROUND",
  "status": "LABEL_CREATED",
  "labelUrl": "https://ups.com/labels/1Z999AA10123456784.pdf",
  "estimatedDelivery": "2025-12-10T00:00:00Z",
  "shippingCost": 12.10
}
```

### Tracking

#### Track Shipment
```http
POST /shipping/shipments/track
```

**Request Body:**
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS"
}
```

**Response:**
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "status": "IN_TRANSIT",
  "estimatedDelivery": "2025-12-10T00:00:00Z",
  "events": [
    {
      "timestamp": "2025-12-03T10:30:00Z",
      "status": "PICKED_UP",
      "description": "Package picked up",
      "location": "Los Angeles, CA"
    },
    {
      "timestamp": "2025-12-03T15:45:00Z",
      "status": "IN_TRANSIT",
      "description": "Departed facility",
      "location": "Phoenix, AZ"
    }
  ]
}
```

### Provider Management (Admin Only)

#### Create Shipping Provider
```http
POST /shipping/providers
```

**Request Body:**
```json
{
  "carrier": "UPS",
  "name": "UPS Production",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "accountNumber": "123456",
  "testMode": false
}
```

#### List Providers
```http
GET /shipping/providers
```

### Shipping Zones & Rules (Admin Only)

#### Create Shipping Zone
```http
POST /shipping/zones
```

**Request Body:**
```json
{
  "providerId": "provider_123",
  "name": "Continental US",
  "description": "48 contiguous states",
  "countries": ["US"],
  "states": ["CA", "NY", "TX", "FL"],
  "priority": 1
}
```

#### Create Shipping Rule
```http
POST /shipping/rules
```

**Request Body:**
```json
{
  "zoneId": "zone_123",
  "name": "Free Shipping Over $150",
  "minWeight": 0,
  "maxWeight": 50,
  "minValue": 150.00,
  "serviceLevel": "GROUND",
  "baseRate": 0,
  "freeThreshold": 150.00,
  "priority": 1
}
```

## Configuration

### Environment Variables

```env
# UPS Configuration
UPS_API_KEY=your_ups_api_key
UPS_API_SECRET=your_ups_api_secret
UPS_ACCOUNT_NUMBER=your_ups_account

# FedEx Configuration
FEDEX_API_KEY=your_fedex_api_key
FEDEX_API_SECRET=your_fedex_api_secret
FEDEX_ACCOUNT_NUMBER=your_fedex_account
FEDEX_METER_NUMBER=your_fedex_meter

# USPS Configuration
USPS_API_KEY=your_usps_api_key
USPS_ACCOUNT_NUMBER=your_usps_account

# DHL Configuration
DHL_API_KEY=your_dhl_api_key
DHL_API_SECRET=your_dhl_api_secret
DHL_ACCOUNT_NUMBER=your_dhl_account

# Redis Configuration (for rate caching)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Database Setup

The shipping module requires the following Prisma models:

- `ShippingProvider`: Carrier credentials and configuration
- `ShippingZone`: Geographic shipping zones
- `ShippingRule`: Custom pricing and free shipping rules
- `Shipment`: Shipment records
- `ShippingRate`: Cached rate quotes
- `TrackingEvent`: Tracking history
- `DeliveryConfirmation`: Delivery proof

## Usage Examples

### Basic Rate Calculation

```typescript
import { ShippingService } from './shipping.service';

// Calculate rates for a package
const rates = await shippingService.calculateRates({
  fromAddress: warehouseAddress,
  toAddress: customerAddress,
  package: {
    type: 'SMALL_PACKAGE',
    weight: 5.5,
    length: 12,
    width: 8,
    height: 6,
  },
});

// Get cheapest option
const cheapest = rates[0];
```

### Rate Comparison with Free Shipping

```typescript
const comparison = await shippingService.compareRates(
  {
    fromAddress: warehouseAddress,
    toAddress: customerAddress,
    package: packageInfo,
  },
  cartTotal // e.g., 125.00
);

if (comparison.freeShippingEligible) {
  console.log('Free shipping available!');
} else if (comparison.amountNeededForFreeShipping) {
  console.log(`Add $${comparison.amountNeededForFreeShipping} more for free shipping`);
}
```

### Automatic Package Dimension Calculation

```typescript
// Calculate dimensions from cart items
const dimensions = await shippingService.calculatePackageDimensions([
  'product_123',
  'product_456',
  'product_789',
]);

// Use dimensions for rate calculation
const rates = await shippingService.calculateRates({
  fromAddress: warehouseAddress,
  toAddress: customerAddress,
  package: {
    type: 'SMALL_PACKAGE',
    ...dimensions,
  },
});
```

### International Shipment with Customs

```typescript
const shipment = await shippingService.createShipment({
  orderId: 'order_123',
  carrier: 'DHL',
  serviceLevel: 'INTERNATIONAL',
  fromAddress: usAddress,
  toAddress: ukAddress,
  package: packageInfo,
  customsDeclaration: {
    contentType: 'MERCHANDISE',
    incoterm: 'DAP',
    items: [
      {
        description: 'Electronics - Smartphone',
        quantity: 1,
        value: 599.99,
        weight: 0.5,
        hsCode: '8517.12',
        countryOfOrigin: 'US',
      },
    ],
  },
});
```

## Error Handling

All shipping providers include robust error handling with fallback mechanisms:

1. **API Unavailable**: Returns estimated rates based on historical data
2. **Rate Fetch Failures**: Gracefully degrades to other carriers
3. **Invalid Addresses**: Provides basic validation and suggestions
4. **Cache Failures**: Falls back to direct API calls

## Rate Caching

Rates are cached in Redis with a 1-hour TTL to reduce API calls and improve performance:

- Cache key includes: postal codes, weight, and dimensions
- Cache is checked before making API calls
- Cache can be manually cleared by admins
- Historical rates are also saved in the database

## Performance Optimizations

1. **Redis Caching**: 1-hour TTL for rate quotes
2. **Parallel Carrier Queries**: All carriers queried simultaneously
3. **Fallback Rates**: Prevent API failures from blocking checkout
4. **Database Rate History**: Historical tracking and analytics

## Testing

### Test with Mock Providers

Set `testMode: true` in provider configuration to use sandbox APIs:

```typescript
await shippingService.createProvider({
  carrier: 'UPS',
  name: 'UPS Test',
  apiKey: 'test_key',
  apiSecret: 'test_secret',
  accountNumber: '123456',
  testMode: true, // Use sandbox
});
```

### Clear Rate Cache

```http
POST /shipping/rates/clear-cache
Authorization: Bearer admin_token
```

## Carrier-Specific Notes

### UPS
- Requires OAuth 2.0 authentication
- Access tokens cached with automatic renewal
- Supports domestic and international shipping
- Address validation available

### FedEx
- Account number and meter number required
- International shipping with customs support
- Real-time tracking

### USPS
- Most economical for lightweight packages
- First Class available for packages under 13 oz
- International shipping available

### DHL
- Best for international express shipments
- Full customs declaration support
- Real-time tracking with detailed events
- Automatic metric conversion (lbs to kg, in to cm)

## Future Enhancements

- [ ] Additional carriers (Canada Post, etc.)
- [ ] Bulk label generation
- [ ] Shipping manifest creation
- [ ] Advanced analytics and reporting
- [ ] Rate shopping algorithms
- [ ] Automated carrier selection
- [ ] Pickup scheduling
- [ ] Shipment insurance management

## Support

For issues or questions:
- Check carrier API documentation
- Review error logs in CloudWatch/Application Logs
- Verify API credentials in provider configuration
- Test with carrier sandbox environments first
