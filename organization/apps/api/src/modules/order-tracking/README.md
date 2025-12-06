# Order Tracking Module

## Overview
The Order Tracking module provides comprehensive order and shipment tracking functionality for the CitadelBuy platform. It supports both authenticated user tracking and guest tracking, with real-time integration with shipping carriers.

## Schema Alignment
This module has been updated to match the current Prisma schema with the following key fields:

### Order Model Fields
- `id`: UUID primary key
- `userId`: Optional (supports guest checkout)
- `trackingNumber`: Carrier tracking number
- `carrier`: Shipping carrier (UPS, FedEx, USPS, DHL, etc.)
- `shippingMethod`: Shipping method (Standard, Express, Overnight)
- `estimatedDeliveryDate`: DateTime for estimated delivery
- `actualDeliveryDate`: DateTime for actual delivery
- `statusHistory`: JSON array of status changes with timestamps
- `shippingAddress`: JSON string containing full shipping address
- `status`: OrderStatus enum (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)

### Shipment Model Integration
The service integrates with the Shipment model for real-time carrier tracking:
- `trackingNumber`: Unique carrier tracking number
- `carrier`: ShippingCarrier enum
- `status`: ShipmentStatus enum
- `estimatedDelivery`: DateTime
- `actualDelivery`: DateTime
- `trackingEvents`: Related TrackingEvent records

### TrackingEvent Model
- `shipmentId`: Reference to shipment
- `status`: Event status string
- `description`: Event description
- `location`: Event location
- `timestamp`: Event timestamp

## Features

### 1. Authenticated User Tracking
- Track orders by order number
- Validates that the order belongs to the authenticated user
- Returns complete order and tracking information

### 2. Guest Tracking
- Track orders using order number and email
- Supports both guest orders and authenticated orders
- Email verification for security

### 3. Carrier Tracking Number Lookup
- Track orders directly by carrier tracking number
- No authentication required
- Integrates with real-time carrier data when available

### 4. Real-Time Shipment Tracking
- Fetches live tracking data from shipping providers
- Updates local tracking events automatically
- Falls back to cached data if provider is unavailable

### 5. Tracking Webhooks
- Receives tracking updates from carrier webhooks
- Automatically updates order status based on shipment status
- Creates tracking events for shipment history

### 6. Status Updates
- Programmatic tracking status updates
- Maintains status history with timestamps
- Supports admin/system updates

## API Endpoints

### POST /tracking/guest
Track order using order number and email (guest access)
- **Body**: `GuestTrackingDto`
- **Response**: `TrackingResponseDto`

### GET /tracking/order/:orderNumber
Track order by order number (authenticated)
- **Auth**: Required (JWT)
- **Response**: `TrackingResponseDto`

### GET /tracking/tracking-number/:trackingNumber
Track by carrier tracking number (public)
- **Response**: `TrackingResponseDto`

### GET /tracking/shipment/:trackingNumber
Get real-time shipment tracking from carrier
- **Response**: `ShipmentTrackingDto`

### POST /tracking/check
Quick tracking check (alternative guest endpoint)
- **Body**: `GuestTrackingDto`
- **Response**: `TrackingResponseDto`

### POST /tracking/webhook
Carrier tracking webhook endpoint
- **Body**: `TrackingWebhookDto`
- **Response**: `{ success: boolean }`

## DTOs

### TrackingResponseDto
Complete tracking information including:
- Order number and ID
- Current tracking status
- Tracking number and carrier
- Estimated and actual delivery dates
- Timeline of tracking events
- Shipping address
- Order items and total

### TrackingEventDto
Individual tracking event:
- Status (TrackingStatusEnum)
- Description
- Location
- Timestamp
- Completed flag

### GuestTrackingDto
Guest tracking request:
- Order number
- Email address

### UpdateOrderTrackingDto
Admin/system tracking updates:
- Tracking number
- Carrier
- Shipping method
- Status
- Estimated/actual delivery dates

### TrackingWebhookDto
Carrier webhook payload:
- Tracking number
- Status
- Events array
- Carrier info
- Delivery dates

## Usage Examples

### Track Order (Authenticated)
```typescript
GET /tracking/order/CB-2024-ABCD1234
Authorization: Bearer {jwt_token}
```

### Track Order (Guest)
```typescript
POST /tracking/guest
{
  "orderNumber": "CB-2024-ABCD1234",
  "email": "customer@example.com"
}
```

### Update Tracking (Programmatic)
```typescript
// In service or admin controller
await orderTrackingService.updateOrderTracking(orderId, {
  trackingNumber: 'TRK1234567890',
  carrier: 'UPS',
  status: OrderStatus.SHIPPED,
  estimatedDeliveryDate: new Date('2024-12-10')
});
```

### Handle Webhook
```typescript
POST /tracking/webhook
{
  "trackingNumber": "TRK1234567890",
  "status": "IN_TRANSIT",
  "events": [
    {
      "status": "IN_TRANSIT",
      "description": "Package departed facility",
      "location": "New York, NY",
      "timestamp": "2024-12-06T10:00:00Z"
    }
  ]
}
```

## Status Mapping

### OrderStatus to TrackingStatusEnum
- PENDING → ORDER_PLACED
- PROCESSING → PROCESSING
- SHIPPED → IN_TRANSIT
- DELIVERED → DELIVERED
- CANCELLED → CANCELLED

### ShipmentStatus to TrackingStatusEnum
- LABEL_CREATED → LABEL_CREATED
- PICKED_UP → PICKED_UP
- IN_TRANSIT → IN_TRANSIT
- OUT_FOR_DELIVERY → OUT_FOR_DELIVERY
- DELIVERED → DELIVERED
- EXCEPTION → EXCEPTION
- RETURNED → RETURNED

## Timeline Building

The service automatically builds a tracking timeline that includes:
1. Order placed event (from order creation)
2. Status history events (if statusHistory exists)
3. Inferred events based on current status
4. Real-time carrier events (if available)
5. Future events (estimated delivery)

Timeline events are sorted chronologically and include completion status.

## Integration Points

### Shipping Service
- Uses `ShippingService.trackShipment()` for real-time carrier data
- Fetches shipment and tracking events from database
- Updates shipment status based on carrier responses

### Prisma Models
- Order: Main order information
- OrderItem: Order line items with product details
- Shipment: Carrier shipment records
- TrackingEvent: Individual tracking events
- User: Customer information (optional)

## Error Handling

- `NotFoundException`: Order or tracking number not found
- `UnauthorizedException`: Email doesn't match order records
- `BadRequestException`: Invalid webhook payload or missing tracking number

## Security Considerations

1. **Email Verification**: Guest tracking validates email matches order
2. **User Authorization**: Authenticated tracking verifies order ownership
3. **Webhook Validation**: Consider adding signature verification for carrier webhooks
4. **Rate Limiting**: Implement rate limiting on public endpoints

## Future Enhancements

1. Add webhook signature verification for carrier webhooks
2. Implement caching for frequently accessed tracking data
3. Add support for multiple shipments per order
4. Enhanced timeline visualization with package location map
5. Push notifications for tracking updates
6. SMS tracking notifications
7. Email tracking updates

## Dependencies

- `@nestjs/common`: Core NestJS framework
- `@prisma/client`: Database ORM
- `PrismaService`: Database service
- `ShippingService`: Shipping provider integration
- `JwtAuthGuard`: Authentication guard

## Module Structure

```
order-tracking/
├── dto/
│   ├── tracking.dto.ts          # Main tracking DTOs
│   └── update-tracking.dto.ts   # Update and webhook DTOs
├── order-tracking.controller.ts  # REST API endpoints
├── order-tracking.service.ts     # Business logic
├── order-tracking.module.ts      # Module definition
└── README.md                     # This file
```

## Testing

Ensure to test:
1. Authenticated user tracking with valid/invalid order numbers
2. Guest tracking with correct/incorrect email addresses
3. Tracking number lookup
4. Real-time carrier integration
5. Webhook handling with various status updates
6. Timeline building for different order states
7. Error scenarios (not found, unauthorized, etc.)
