# Inventory Management System - Database Schema Design

**Date:** November 18, 2025
**Phase:** Inventory Management Implementation

---

## Overview

Comprehensive inventory management system with:
- Multi-warehouse support
- Stock tracking and history
- Automated reorder points
- Low stock alerts
- Stock transfers
- Backorder management
- Inventory forecasting

---

## Enums

```prisma
enum StockStatus {
  IN_STOCK
  LOW_STOCK
  OUT_OF_STOCK
  BACKORDER
  DISCONTINUED
}

enum StockMovementType {
  PURCHASE          // Stock received from supplier
  SALE              // Stock sold to customer
  TRANSFER_IN       // Stock transferred from another location
  TRANSFER_OUT      // Stock transferred to another location
  ADJUSTMENT        // Manual adjustment (count, damage, etc.)
  RETURN            // Customer return
  DAMAGE            // Damaged/defective stock
  THEFT             // Stock loss
  EXPIRED           // Expired products
}

enum TransferStatus {
  PENDING
  IN_TRANSIT
  COMPLETED
  CANCELLED
}

enum ReorderStatus {
  PENDING
  ORDERED
  RECEIVED
  CANCELLED
}
```

---

## Models

### 1. Warehouse (Location Management)

```prisma
model Warehouse {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique  // e.g., "WH-NYC-01"
  address     String
  city        String
  state       String
  country     String
  postalCode  String
  phone       String?
  email       String?
  managerId   String?
  isActive    Boolean  @default(true)
  isPrimary   Boolean  @default(false)  // Primary warehouse

  // Relations
  inventory       InventoryItem[]
  transfersFrom   StockTransfer[] @relation("WarehouseFrom")
  transfersTo     StockTransfer[] @relation("WarehouseTo")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([code])
  @@index([isActive])
}
```

### 2. InventoryItem (Stock per Location)

```prisma
model InventoryItem {
  id              String      @id @default(uuid())
  productId       String
  warehouseId     String

  // Stock Levels
  quantity        Int         @default(0)
  reservedQty     Int         @default(0)  // Reserved for pending orders
  availableQty    Int         @default(0)  // quantity - reservedQty

  // Reorder Settings
  reorderPoint    Int         @default(10)  // When to reorder
  reorderQuantity Int         @default(50)  // How much to reorder
  minStockLevel   Int         @default(5)   // Minimum stock level
  maxStockLevel   Int?                      // Maximum stock level

  // Status
  status          StockStatus @default(IN_STOCK)

  // Tracking
  lastRestockDate DateTime?
  lastSaleDate    DateTime?
  lastCountDate   DateTime?   // Last physical count

  // Alerts
  lowStockAlertSent    Boolean @default(false)
  outOfStockAlertSent  Boolean @default(false)

  // Relations
  product     Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse   Warehouse   @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  movements   StockMovement[]
  reorders    ReorderRequest[]
  backorders  Backorder[]

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([productId, warehouseId])
  @@index([productId])
  @@index([warehouseId])
  @@index([status])
  @@index([quantity])
}
```

### 3. StockMovement (Stock History)

```prisma
model StockMovement {
  id              String              @id @default(uuid())
  inventoryItemId String
  productId       String
  warehouseId     String

  // Movement Details
  type            StockMovementType
  quantity        Int                   // Positive for increase, negative for decrease
  previousQty     Int
  newQty          Int

  // Context
  orderId         String?               // If related to an order
  transferId      String?               // If related to transfer
  userId          String?               // Who made the change

  // Reason & Notes
  reason          String?
  notes           String?

  // Cost Tracking
  unitCost        Float?
  totalCost       Float?

  // Relations
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  transfer        StockTransfer? @relation(fields: [transferId], references: [id])

  createdAt       DateTime      @default(now())

  @@index([inventoryItemId])
  @@index([productId])
  @@index([warehouseId])
  @@index([type])
  @@index([createdAt])
}
```

### 4. StockTransfer (Between Warehouses)

```prisma
model StockTransfer {
  id                String         @id @default(uuid())
  transferNumber    String         @unique  // e.g., "TRF-2025-001"

  fromWarehouseId   String
  toWarehouseId     String
  productId         String

  quantity          Int
  status            TransferStatus @default(PENDING)

  // Dates
  requestedDate     DateTime       @default(now())
  shippedDate       DateTime?
  receivedDate      DateTime?
  cancelledDate     DateTime?

  // Tracking
  requestedBy       String?        // User who requested
  approvedBy        String?        // User who approved
  receivedBy        String?        // User who received

  // Shipping
  trackingNumber    String?
  carrier           String?
  estimatedArrival  DateTime?

  notes             String?
  cancellationReason String?

  // Relations
  fromWarehouse     Warehouse      @relation("WarehouseFrom", fields: [fromWarehouseId], references: [id])
  toWarehouse       Warehouse      @relation("WarehouseTo", fields: [toWarehouseId], references: [id])
  product           Product        @relation(fields: [productId], references: [id])
  movements         StockMovement[]

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([transferNumber])
  @@index([fromWarehouseId])
  @@index([toWarehouseId])
  @@index([status])
  @@index([createdAt])
}
```

### 5. ReorderRequest (Automated Reordering)

```prisma
model ReorderRequest {
  id                String         @id @default(uuid())
  requestNumber     String         @unique  // e.g., "RO-2025-001"

  inventoryItemId   String
  productId         String
  warehouseId       String

  quantityRequested Int
  quantityOrdered   Int?
  quantityReceived  Int?

  status            ReorderStatus  @default(PENDING)

  // Supplier Details
  supplierId        String?
  estimatedCost     Float?
  actualCost        Float?

  // Dates
  requestDate       DateTime       @default(now())
  orderDate         DateTime?
  expectedDate      DateTime?
  receivedDate      DateTime?

  // Purchase Order
  purchaseOrderId   String?

  notes             String?

  // Relations
  inventoryItem     InventoryItem  @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([requestNumber])
  @@index([inventoryItemId])
  @@index([productId])
  @@index([status])
  @@index([requestDate])
}
```

### 6. Backorder (Customer Backorders)

```prisma
model Backorder {
  id                String    @id @default(uuid())
  backorderNumber   String    @unique  // e.g., "BO-2025-001"

  orderId           String
  orderItemId       String
  customerId        String
  productId         String
  inventoryItemId   String?   // Which warehouse it's backordered from

  quantityOrdered   Int
  quantityFulfilled Int       @default(0)
  quantityRemaining Int

  isActive          Boolean   @default(true)

  // Dates
  createdDate       DateTime  @default(now())
  expectedDate      DateTime?
  fulfilledDate     DateTime?
  cancelledDate     DateTime?

  // Notifications
  customerNotified  Boolean   @default(false)
  notificationDate  DateTime?

  priority          Int       @default(1)  // 1 = highest priority

  notes             String?

  // Relations
  inventoryItem     InventoryItem? @relation(fields: [inventoryItemId], references: [id])

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([backorderNumber])
  @@index([orderId])
  @@index([customerId])
  @@index([productId])
  @@index([isActive])
  @@index([createdDate])
}
```

### 7. StockAlert (Low Stock Notifications)

```prisma
model StockAlert {
  id              String    @id @default(uuid())
  alertNumber     String    @unique

  productId       String
  warehouseId     String
  inventoryItemId String

  alertType       String    // LOW_STOCK, OUT_OF_STOCK, EXPIRING_SOON
  severity        String    // LOW, MEDIUM, HIGH, CRITICAL

  currentQty      Int
  threshold       Int

  message         String

  // Status
  isActive        Boolean   @default(true)
  isResolved      Boolean   @default(false)
  resolvedDate    DateTime?

  // Notifications
  notificationSent Boolean  @default(false)
  notifiedUsers   String[]  // Array of user IDs

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([productId])
  @@index([warehouseId])
  @@index([isActive])
  @@index([alertType])
  @@index([severity])
  @@index([createdAt])
}
```

### 8. InventoryForecast (Demand Forecasting)

```prisma
model InventoryForecast {
  id                String    @id @default(uuid())
  productId         String
  warehouseId       String?   // Null for all warehouses combined

  forecastPeriod    String    // DAILY, WEEKLY, MONTHLY, QUARTERLY
  periodDate        DateTime  // Start of the period

  // Historical Data
  historicalSales   Int       // Actual sales in past period
  averageDailySales Float

  // Forecast
  forecastedDemand  Int       // Predicted demand
  recommendedStock  Int       // Recommended stock level

  // Confidence
  confidenceLevel   Float     // 0.0 to 1.0

  // Factors
  seasonalFactor    Float?    // Seasonal adjustment
  trendFactor       Float?    // Trend adjustment
  promotionalImpact Float?    // Expected promotional impact

  calculatedAt      DateTime  @default(now())
  validUntil        DateTime

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([productId, warehouseId, forecastPeriod, periodDate])
  @@index([productId])
  @@index([periodDate])
}
```

---

## Updates to Existing Models

### Product Model Updates

```prisma
model Product {
  // ... existing fields ...

  // Add Inventory Relations
  inventoryItems  InventoryItem[]
  stockTransfers  StockTransfer[]

  // Add tracking fields
  trackInventory  Boolean  @default(true)
  allowBackorder  Boolean  @default(false)
  sku             String?  @unique  // Stock Keeping Unit
  barcode         String?  @unique

  // Physical dimensions (for warehouse space planning)
  weight          Float?   // in kg
  length          Float?   // in cm
  width           Float?   // in cm
  height          Float?   // in cm
}
```

---

## Key Features Implementation

### 1. Low Stock Alerts
- Automatic alerts when `availableQty` < `reorderPoint`
- Creates `StockAlert` records
- Sends notifications to warehouse managers

### 2. Automated Reorder Points
- Triggers `ReorderRequest` when stock hits `reorderPoint`
- Calculates optimal reorder quantity
- Integrates with supplier management

### 3. Stock History
- Every stock change logged in `StockMovement`
- Full audit trail with timestamps
- Tracks cost per movement

### 4. Bulk Updates
- Batch update inventory levels
- Import/export via CSV
- Bulk transfer operations

### 5. Warehouse Management
- Multiple locations support
- Primary warehouse designation
- Location-specific stock levels

### 6. Stock Transfers
- Complete transfer workflow
- In-transit tracking
- Automated stock adjustments

### 7. Forecasting
- Historical sales analysis
- Seasonal adjustments
- Trend predictions
- Recommended stock levels

### 8. Backorder Management
- Customer backorder tracking
- Priority queue
- Automated fulfillment
- Customer notifications

---

## Indexes Strategy

All critical query paths are indexed:
- Product lookups
- Warehouse filtering
- Status checks
- Date range queries
- Movement type filters

---

## Migration Plan

1. Create enums
2. Create Warehouse model
3. Create InventoryItem model
4. Create StockMovement model
5. Create StockTransfer model
6. Create ReorderRequest model
7. Create Backorder model
8. Create StockAlert model
9. Create InventoryForecast model
10. Update Product model
11. Seed initial warehouse data

---

**Next Steps:**
1. Apply Prisma migration
2. Create DTOs for inventory operations
3. Implement InventoryService
4. Create InventoryController
5. Build frontend UI
6. Implement automated jobs (alerts, reorders, forecasting)

---

**Estimated Complexity:** High
**Implementation Time:** 4-6 hours
**Database Impact:** +9 models, +4 enums
