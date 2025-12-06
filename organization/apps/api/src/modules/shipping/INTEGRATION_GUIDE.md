# Shipping Provider Integration Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Complete Implementation](#complete-implementation)
3. [API Endpoints](#api-endpoints)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)

## Quick Start

### Step 1: Set Up Environment Variables

```bash
# .env file
FEDEX_API_KEY=your_fedex_client_id
FEDEX_API_SECRET=your_fedex_client_secret
FEDEX_ACCOUNT_NUMBER=123456789
FEDEX_METER_NUMBER=987654321

UPS_API_KEY=your_ups_client_id
UPS_API_SECRET=your_ups_client_secret
UPS_ACCOUNT_NUMBER=ABC123

DHL_API_KEY=your_dhl_api_key
DHL_API_SECRET=your_dhl_api_secret
DHL_ACCOUNT_NUMBER=123456789

USPS_API_KEY=your_usps_user_id
USPS_ACCOUNT_NUMBER=123456789
```

### Step 2: Update Shipping Module

```typescript
// shipping.module.ts
import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShippingProviderFactory } from './providers/shipping-provider.factory';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingProviderFactory, // Add provider factory
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
```

### Step 3: Update Shipping Service to Use Factory

```typescript
// shipping.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ShippingProviderFactory } from './providers/shipping-provider.factory';
import { IShippingProvider } from './providers/shipping-provider-updated.interface';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private providers: Map<string, IShippingProvider> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly providerFactory: ShippingProviderFactory,
  ) {
    this.initializeProviders();
  }

  private async initializeProviders() {
    const providers = await this.prisma.shippingProvider.findMany({
      where: { isActive: true },
    });

    for (const config of providers) {
      try {
        const provider = this.providerFactory.createProvider({
          carrier: config.carrier,
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          accountNumber: config.accountNumber,
          meterNumber: config.meterNumber,
          testMode: config.testMode,
        });

        if (provider) {
          this.providers.set(config.carrier, provider);
          this.logger.log(`Initialized ${config.carrier} provider`);
        }
      } catch (error) {
        this.logger.error(`Failed to initialize ${config.carrier}`, error);
      }
    }
  }
}
```

## Complete Implementation

### Controller with Pickup Scheduling

```typescript
// shipping.controller.ts
import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import {
  CalculateRateDto,
  CreateShipmentDto,
  TrackShipmentDto,
} from './dto/shipping.dto';
import { SchedulePickupDto, CancelPickupDto } from './dto/pickup.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('rates')
  async calculateRates(@Body() dto: CalculateRateDto) {
    return this.shippingService.calculateRates(dto);
  }

  @Post('shipments')
  async createShipment(@Body() dto: CreateShipmentDto) {
    return this.shippingService.createShipment(dto);
  }

  @Get('shipments/track')
  async trackShipment(@Query() dto: TrackShipmentDto) {
    return this.shippingService.trackShipment(dto);
  }

  @Post('pickups')
  async schedulePickup(@Body() dto: SchedulePickupDto) {
    return this.shippingService.schedulePickup(dto);
  }

  @Post('pickups/cancel')
  async cancelPickup(@Body() dto: CancelPickupDto) {
    return this.shippingService.cancelPickup(dto);
  }
}
```

### Service Methods for Pickup Scheduling

```typescript
// shipping.service.ts - Add these methods

async schedulePickup(dto: SchedulePickupDto) {
  this.logger.log(`Scheduling ${dto.carrier} pickup`);

  const provider = this.providers.get(dto.carrier);
  if (!provider) {
    throw new BadRequestException(`Provider ${dto.carrier} not available`);
  }

  const pickupDate = new Date(dto.pickupDate);

  const pickup = await provider.schedulePickup(
    dto.pickupAddress,
    pickupDate,
    dto.readyTime,
    dto.closeTime,
    dto.packageCount,
    dto.totalWeight,
    dto.specialInstructions,
  );

  // Save pickup to database
  const savedPickup = await this.prisma.scheduledPickup.create({
    data: {
      carrier: dto.carrier,
      confirmationNumber: pickup.confirmationNumber,
      pickupDate: pickup.pickupDate,
      readyTime: pickup.readyTime,
      closeTime: pickup.closeTime,
      pickupAddress: dto.pickupAddress as any,
      packageCount: dto.packageCount,
      totalWeight: dto.totalWeight,
      specialInstructions: dto.specialInstructions,
      trackingNumbers: dto.trackingNumbers || [],
      status: pickup.status,
    },
  });

  return {
    ...pickup,
    id: savedPickup.id,
  };
}

async cancelPickup(dto: CancelPickupDto) {
  this.logger.log(`Cancelling ${dto.carrier} pickup: ${dto.confirmationNumber}`);

  const provider = this.providers.get(dto.carrier);
  if (!provider) {
    throw new BadRequestException(`Provider ${dto.carrier} not available`);
  }

  const cancelled = await provider.cancelPickup(dto.confirmationNumber);

  if (cancelled) {
    // Update database
    await this.prisma.scheduledPickup.updateMany({
      where: {
        carrier: dto.carrier,
        confirmationNumber: dto.confirmationNumber,
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: dto.reason,
      },
    });
  }

  return { success: cancelled, confirmationNumber: dto.confirmationNumber };
}

async getScheduledPickups(filters?: {
  carrier?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  return this.prisma.scheduledPickup.findMany({
    where: {
      ...(filters?.carrier && { carrier: filters.carrier as any }),
      ...(filters?.status && { status: filters.status as any }),
      ...(filters?.fromDate && { pickupDate: { gte: filters.fromDate } }),
      ...(filters?.toDate && { pickupDate: { lte: filters.toDate } }),
    },
    orderBy: { pickupDate: 'desc' },
  });
}
```

## API Endpoints

### Calculate Shipping Rates

```http
POST /api/shipping/rates
Content-Type: application/json

{
  "fromAddress": {
    "name": "CitadelBuy Warehouse",
    "street1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "US"
  },
  "toAddress": {
    "name": "John Doe",
    "street1": "456 Oak Ave",
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
    "value": 150
  },
  "carriers": ["UPS", "FEDEX", "USPS"],
  "serviceLevels": ["GROUND", "TWO_DAY"]
}
```

**Response:**
```json
{
  "rates": [
    {
      "carrier": "USPS",
      "serviceName": "USPS Priority Mail",
      "serviceLevel": "GROUND",
      "baseRate": 12.50,
      "fuelSurcharge": 0,
      "totalRate": 12.50,
      "estimatedDays": 3,
      "guaranteedDelivery": false
    },
    {
      "carrier": "UPS",
      "serviceName": "UPS Ground",
      "serviceLevel": "GROUND",
      "baseRate": 15.75,
      "fuelSurcharge": 1.58,
      "totalRate": 17.33,
      "estimatedDays": 4,
      "guaranteedDelivery": false
    },
    {
      "carrier": "FEDEX",
      "serviceName": "FedEx 2Day",
      "serviceLevel": "TWO_DAY",
      "baseRate": 28.00,
      "fuelSurcharge": 2.52,
      "totalRate": 30.52,
      "estimatedDays": 2,
      "guaranteedDelivery": true
    }
  ],
  "freeShippingEligible": false,
  "freeShippingThreshold": 75,
  "amountNeededForFreeShipping": 25
}
```

### Create Shipment and Label

```http
POST /api/shipping/shipments
Content-Type: application/json

{
  "orderId": "order_123",
  "carrier": "UPS",
  "serviceLevel": "GROUND",
  "fromAddress": { /* address object */ },
  "toAddress": { /* address object */ },
  "package": { /* package object */ },
  "signature": false,
  "insurance": 100
}
```

**Response:**
```json
{
  "id": "shipment_456",
  "trackingNumber": "1Z999AA10123456784",
  "labelUrl": "data:application/pdf;base64,JVBERi0xLjQKJ...",
  "labelFormat": "PDF",
  "estimatedDelivery": "2025-12-15T00:00:00.000Z",
  "cost": 17.33,
  "status": "LABEL_CREATED"
}
```

### Track Shipment

```http
GET /api/shipping/shipments/track?trackingNumber=1Z999AA10123456784
```

**Response:**
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "status": "IN_TRANSIT",
  "estimatedDelivery": "2025-12-15T00:00:00.000Z",
  "events": [
    {
      "timestamp": "2025-12-06T10:30:00.000Z",
      "status": "PICKED_UP",
      "description": "Package picked up",
      "location": "Los Angeles, CA"
    },
    {
      "timestamp": "2025-12-07T14:22:00.000Z",
      "status": "IN_TRANSIT",
      "description": "In transit to destination",
      "location": "Phoenix, AZ"
    }
  ]
}
```

### Schedule Pickup

```http
POST /api/shipping/pickups
Content-Type: application/json

{
  "carrier": "UPS",
  "pickupAddress": {
    "name": "CitadelBuy Warehouse",
    "street1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "US",
    "phone": "3101234567"
  },
  "pickupDate": "2025-12-10",
  "readyTime": "09:00",
  "closeTime": "17:00",
  "packageCount": 5,
  "totalWeight": 45.5,
  "specialInstructions": "Please call upon arrival",
  "trackingNumbers": [
    "1Z999AA10123456784",
    "1Z999AA10123456785"
  ]
}
```

**Response:**
```json
{
  "id": "pickup_789",
  "confirmationNumber": "UPS1234567890",
  "pickupDate": "2025-12-10T00:00:00.000Z",
  "readyTime": "09:00",
  "closeTime": "17:00",
  "location": "123 Main St, Los Angeles, CA",
  "status": "CONFIRMED",
  "carrier": "UPS"
}
```

### Cancel Pickup

```http
POST /api/shipping/pickups/cancel
Content-Type: application/json

{
  "carrier": "UPS",
  "confirmationNumber": "UPS1234567890",
  "reason": "Warehouse closed"
}
```

**Response:**
```json
{
  "success": true,
  "confirmationNumber": "UPS1234567890"
}
```

## Usage Examples

### Example 1: Complete Order Fulfillment Flow

```typescript
async fulfillOrder(orderId: string) {
  // 1. Get order details
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, shippingAddress: true },
  });

  // 2. Calculate package dimensions from order items
  const packageDimensions = await this.shippingService.calculatePackageDimensions(
    order.items.map(item => item.productId)
  );

  // 3. Get shipping rates
  const rateResult = await this.shippingService.compareRates(
    {
      fromAddress: warehouseAddress,
      toAddress: order.shippingAddress,
      package: packageDimensions,
    },
    order.total
  );

  // 4. Select best rate (cheapest or customer preference)
  const selectedRate = rateResult.rates[0];

  // 5. Create shipment and generate label
  const shipment = await this.shippingService.createShipment({
    orderId: order.id,
    carrier: selectedRate.carrier,
    serviceLevel: selectedRate.serviceLevel,
    fromAddress: warehouseAddress,
    toAddress: order.shippingAddress,
    package: packageDimensions,
    signature: order.requiresSignature,
    insurance: order.total > 500 ? order.total : undefined,
  });

  // 6. Schedule pickup if multiple orders today
  const todaysOrders = await this.getOrdersShippingToday();
  if (todaysOrders.length >= 5) {
    const pickup = await this.shippingService.schedulePickup({
      carrier: selectedRate.carrier,
      pickupAddress: warehouseAddress,
      pickupDate: new Date().toISOString().split('T')[0],
      readyTime: '14:00',
      closeTime: '17:00',
      packageCount: todaysOrders.length,
      totalWeight: todaysOrders.reduce((sum, o) => sum + o.weight, 0),
      trackingNumbers: todaysOrders.map(o => o.trackingNumber),
    });
  }

  // 7. Update order with shipping info
  await this.prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: shipment.trackingNumber,
      shippingCost: shipment.cost,
      shippingCarrier: selectedRate.carrier,
      shippingStatus: 'LABEL_CREATED',
      labelUrl: shipment.labelUrl,
    },
  });

  // 8. Send tracking email to customer
  await this.emailService.sendTrackingEmail(order.customerEmail, {
    trackingNumber: shipment.trackingNumber,
    carrier: selectedRate.carrier,
    estimatedDelivery: shipment.estimatedDelivery,
  });

  return {
    orderId: order.id,
    trackingNumber: shipment.trackingNumber,
    estimatedDelivery: shipment.estimatedDelivery,
  };
}
```

### Example 2: Multi-Warehouse Optimization

```typescript
async optimizeShipment(orderId: string) {
  const order = await this.getOrder(orderId);
  const productIds = order.items.map(i => i.productId);

  // Find optimal warehouse (closest with inventory)
  const warehouseId = await this.shippingService.selectOptimalWarehouse(
    order.shippingAddress,
    productIds
  );

  const warehouse = await this.prisma.warehouse.findUnique({
    where: { id: warehouseId },
  });

  // Get rates from optimal warehouse
  const rates = await this.shippingService.calculateRates({
    fromAddress: warehouse.address,
    toAddress: order.shippingAddress,
    package: await this.calculatePackage(productIds),
  });

  return {
    optimalWarehouse: warehouse,
    cheapestRate: rates[0],
    estimatedSavings: rates[rates.length - 1].totalRate - rates[0].totalRate,
  };
}
```

### Example 3: Bulk Pickup Scheduling

```typescript
async scheduleBulkPickup() {
  // Get all orders ready to ship today
  const ordersToShip = await this.prisma.order.findMany({
    where: {
      shippingStatus: 'LABEL_CREATED',
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
    include: { shipment: true },
  });

  // Group by carrier and warehouse
  const pickupGroups = this.groupOrdersForPickup(ordersToShip);

  const pickups = [];

  for (const [key, orders] of pickupGroups.entries()) {
    const [carrier, warehouseId] = key.split(':');
    const warehouse = await this.getWarehouse(warehouseId);

    const pickup = await this.shippingService.schedulePickup({
      carrier: carrier as any,
      pickupAddress: warehouse.address,
      pickupDate: new Date().toISOString().split('T')[0],
      readyTime: '14:00',
      closeTime: '17:00',
      packageCount: orders.length,
      totalWeight: orders.reduce((sum, o) => sum + o.shipment.weight, 0),
      specialInstructions: `${orders.length} packages ready`,
      trackingNumbers: orders.map(o => o.shipment.trackingNumber),
    });

    pickups.push(pickup);
  }

  return {
    totalPickups: pickups.length,
    totalPackages: ordersToShip.length,
    pickups,
  };
}

private groupOrdersForPickup(orders: Order[]): Map<string, Order[]> {
  const groups = new Map<string, Order[]>();

  for (const order of orders) {
    const key = `${order.shipment.carrier}:${order.warehouseId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(order);
  }

  return groups;
}
```

## Best Practices

### 1. Rate Caching
Always cache rates to improve performance:

```typescript
// Good
const cacheKey = `rates:${fromZip}:${toZip}:${weight}`;
let rates = await redis.get(cacheKey);
if (!rates) {
  rates = await provider.getRates(...);
  await redis.set(cacheKey, rates, 3600);
}

// Bad - calling API every time
const rates = await provider.getRates(...);
```

### 2. Error Handling
Always handle provider errors gracefully:

```typescript
try {
  const label = await provider.createLabel(...);
  return label;
} catch (error) {
  this.logger.error('Label creation failed', error);

  // Fall back to alternative carrier or manual processing
  return await this.handleLabelFailure(error);
}
```

### 3. Pickup Scheduling
Schedule pickups in batches, not per shipment:

```typescript
// Good - one pickup for multiple packages
if (todaysShipments.length >= 5) {
  await schedulePickup({
    packageCount: todaysShipments.length,
    trackingNumbers: todaysShipments.map(s => s.trackingNumber),
  });
}

// Bad - multiple pickups for same day
for (const shipment of shipments) {
  await schedulePickup({ packageCount: 1 }); // Don't do this!
}
```

### 4. Address Validation
Validate addresses before creating labels:

```typescript
const validation = await provider.validateAddress(address);
if (!validation.valid) {
  throw new BadRequestException(`Invalid address: ${validation.errors.join(', ')}`);
}

if (validation.suggestedAddress) {
  // Use suggested address
  address = validation.suggestedAddress;
}
```

### 5. Test Mode
Always test in sandbox before production:

```typescript
const provider = factory.createProvider({
  carrier: 'FEDEX',
  apiKey: process.env.FEDEX_API_KEY,
  testMode: process.env.NODE_ENV !== 'production',
});
```

## Database Schema Updates

Add to Prisma schema:

```prisma
model ScheduledPickup {
  id                  String   @id @default(cuid())
  carrier             ShippingCarrier
  confirmationNumber  String
  pickupDate          DateTime
  readyTime           String
  closeTime           String
  pickupAddress       Json
  packageCount        Int
  totalWeight         Float
  specialInstructions String?
  trackingNumbers     String[]
  status              PickupStatus
  cancelledAt         DateTime?
  cancelReason        String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([carrier, pickupDate])
  @@index([confirmationNumber])
}

enum PickupStatus {
  SCHEDULED
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

## Next Steps

1. ✅ Configure environment variables
2. ✅ Update database schema
3. ✅ Test with sandbox credentials
4. ✅ Implement in staging environment
5. ✅ Monitor API usage and costs
6. ✅ Set up production credentials
7. ✅ Deploy to production
8. ✅ Monitor and optimize

## Support & Resources

- **FedEx Developer Portal**: https://developer.fedex.com
- **UPS Developer Portal**: https://developer.ups.com
- **DHL Developer Portal**: https://developer.dhl.com
- **USPS Web Tools**: https://www.usps.com/business/web-tools-apis/

For internal support, contact the platform team.
