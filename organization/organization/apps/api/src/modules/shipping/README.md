# Shipping Module

Multi-carrier shipping integration with EasyPost supporting UPS, FedEx, USPS, DHL, and international carriers.

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/shipping/rates` | Get shipping rates | Yes |
| POST | `/api/shipping/labels` | Create shipping label | Yes (Vendor/Admin) |
| GET | `/api/shipping/track/:trackingNumber` | Track shipment | No |
| POST | `/api/shipping/validate-address` | Validate address | Yes |

## Supported Carriers

| Carrier | Services |
|---------|----------|
| UPS | Ground, 2-Day, Next Day, Worldwide |
| FedEx | Ground, Express, Priority, International |
| USPS | Priority, First Class, Media Mail |
| DHL | Express, eCommerce |

## Request: Get Shipping Rates

```json
{
  "origin": {
    "country": "US",
    "zipCode": "10001"
  },
  "destination": {
    "country": "US",
    "zipCode": "90210"
  },
  "items": [
    {
      "weight": 0.5,
      "dimensions": {
        "length": 10,
        "width": 8,
        "height": 5
      }
    }
  ]
}
```

## Response: Shipping Rates

```json
{
  "rates": [
    {
      "carrier": "UPS",
      "service": "Ground",
      "rate": 12.50,
      "currency": "USD",
      "estimatedDays": 5,
      "trackingAvailable": true
    },
    {
      "carrier": "FedEx",
      "service": "2-Day",
      "rate": 24.00,
      "currency": "USD",
      "estimatedDays": 2,
      "trackingAvailable": true
    }
  ]
}
```

## Services

- `ShippingService` - Rate calculation and label creation
- `EasyPostProvider` - EasyPost API integration
- Address validation
- Real-time tracking webhooks

## Configuration

```env
EASYPOST_API_KEY=EZAKxxxxxxxx
EASYPOST_TEST_MODE=true
```

## Related Modules

- `OrderTrackingModule` - Shipment tracking
- `CheckoutModule` - Rate selection at checkout
- `ReturnsModule` - Return shipping labels
