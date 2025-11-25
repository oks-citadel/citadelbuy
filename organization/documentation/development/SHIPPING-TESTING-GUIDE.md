# Shipping System - Testing Guide

## Prerequisites

1. ✅ Backend running on `http://localhost:3001`
2. ✅ Database with shipping schema
3. ✅ Shipping providers, zones, and rules seeded
4. ✅ Admin user logged in (get JWT token)

---

## 🔑 Step 1: Get Authentication Token

First, login as admin to get your JWT token:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@citadelbuy.com",
    "password": "your-admin-password"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Save the `access_token` - you'll need it for all subsequent requests!**

For convenience, set it as an environment variable:
```bash
export TOKEN="your-access-token-here"
```

---

## 📦 Step 2: Verify Providers Configuration

Check that all providers are configured:

```bash
curl -X GET http://localhost:3001/shipping/providers \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "...",
    "carrier": "UPS",
    "name": "UPS Shipping",
    "isActive": true,
    "testMode": true
  },
  {
    "id": "...",
    "carrier": "FEDEX",
    "name": "FedEx Shipping",
    "isActive": true,
    "testMode": true
  },
  {
    "id": "...",
    "carrier": "USPS",
    "name": "USPS Shipping",
    "isActive": true,
    "testMode": true
  }
]
```

---

## 💰 Step 3: Test Rate Calculation

### Test 1: Domestic Shipping (NY to CA)

```bash
curl -X POST http://localhost:3001/shipping/rates/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fromAddress": {
      "name": "CitadelBuy Warehouse",
      "street1": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "toAddress": {
      "name": "John Doe",
      "street1": "456 Oak Avenue",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "US"
    },
    "package": {
      "type": "SMALL_PACKAGE",
      "weight": 5
    }
  }'
```

**Expected Response:**
```json
[
  {
    "carrier": "USPS",
    "serviceName": "USPS First Class",
    "serviceLevel": "GROUND",
    "baseRate": 9.0,
    "totalRate": 9.0,
    "estimatedDays": 5,
    "guaranteedDelivery": false
  },
  {
    "carrier": "UPS",
    "serviceName": "UPS Ground",
    "serviceLevel": "GROUND",
    "baseRate": 12.5,
    "fuelSurcharge": 1.25,
    "totalRate": 13.75,
    "estimatedDays": 5,
    "guaranteedDelivery": false
  },
  {
    "carrier": "FEDEX",
    "serviceName": "FedEx Ground",
    "serviceLevel": "GROUND",
    "baseRate": 11.5,
    "fuelSurcharge": 1.04,
    "totalRate": 12.54,
    "estimatedDays": 4,
    "guaranteedDelivery": false
  },
  // ... more rates (2-Day, Next Day, etc.)
]
```

**Notes:**
- Rates are sorted by price (lowest first)
- Custom rules are applied (free shipping over $50)
- Multiple service levels returned

### Test 2: International Shipping (US to Canada)

```bash
curl -X POST http://localhost:3001/shipping/rates/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fromAddress": {
      "name": "CitadelBuy Warehouse",
      "street1": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "toAddress": {
      "name": "Jane Smith",
      "street1": "789 Maple Road",
      "city": "Toronto",
      "state": "ON",
      "postalCode": "M5H 2N2",
      "country": "CA"
    },
    "package": {
      "type": "SMALL_PACKAGE",
      "weight": 3
    }
  }'
```

**Expected Response:**
```json
[
  {
    "carrier": "USPS",
    "serviceName": "USPS Priority Mail International",
    "serviceLevel": "INTERNATIONAL",
    "baseRate": 22.5,
    "totalRate": 22.5,
    "estimatedDays": 10,
    "guaranteedDelivery": false
  },
  {
    "carrier": "UPS",
    "serviceName": "UPS Worldwide Express",
    "serviceLevel": "INTERNATIONAL",
    "baseRate": 37.5,
    "fuelSurcharge": 5.63,
    "totalRate": 43.13,
    "estimatedDays": 5,
    "guaranteedDelivery": false
  },
  // ... more international rates
]
```

### Test 3: Heavy Package

```bash
curl -X POST http://localhost:3001/shipping/rates/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fromAddress": {
      "name": "CitadelBuy Warehouse",
      "street1": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "toAddress": {
      "name": "Bob Johnson",
      "street1": "321 Pine Street",
      "city": "Chicago",
      "state": "IL",
      "postalCode": "60601",
      "country": "US"
    },
    "package": {
      "type": "LARGE_PACKAGE",
      "weight": 50,
      "length": 24,
      "width": 18,
      "height": 12,
      "value": 500
    },
    "insurance": 500,
    "signature": true
  }'
```

**Notes:**
- Heavier packages have higher rates
- Insurance and signature fees added
- Custom rules applied based on weight

---

## 📨 Step 4: Test Label Generation

### Create a Shipment with Label

```bash
curl -X POST http://localhost:3001/shipping/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "order-123-test",
    "warehouseId": "your-warehouse-id",
    "carrier": "UPS",
    "serviceLevel": "GROUND",
    "fromAddress": {
      "name": "CitadelBuy Warehouse",
      "street1": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "212-555-0100"
    },
    "toAddress": {
      "name": "John Doe",
      "street1": "456 Oak Avenue",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "US",
      "phone": "213-555-0200",
      "email": "john@example.com"
    },
    "package": {
      "type": "SMALL_PACKAGE",
      "weight": 5,
      "length": 12,
      "width": 10,
      "height": 6
    },
    "signature": false,
    "insurance": 0,
    "notes": "Handle with care"
  }'
```

**Expected Response:**
```json
{
  "id": "shipment-id-here",
  "orderId": "order-123-test",
  "carrier": "UPS",
  "serviceLevel": "GROUND",
  "trackingNumber": "1Z999AA10123456784",
  "status": "LABEL_CREATED",
  "labelUrl": "https://ups.com/labels/1Z999AA10123456784.pdf",
  "labelFormat": "PDF",
  "shippingCost": 13.75,
  "estimatedDelivery": "2025-01-26T00:00:00.000Z",
  "createdAt": "2025-01-19T...",
  "fromAddress": { ... },
  "toAddress": { ... }
}
```

**Notes:**
- Label URL is returned (mock URL in test mode)
- Tracking number automatically generated
- Status set to "LABEL_CREATED"
- Shipping cost calculated
- In production, this would generate a real PDF label

---

## 📍 Step 5: Test Package Tracking

### Track a Shipment

```bash
curl -X POST http://localhost:3001/shipping/shipments/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "UPS"
  }'
```

**Expected Response:**
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "status": "OUT_FOR_DELIVERY",
  "events": [
    {
      "timestamp": "2025-01-16T10:00:00.000Z",
      "status": "LABEL_CREATED",
      "description": "Shipment information received",
      "location": "Origin facility"
    },
    {
      "timestamp": "2025-01-17T08:00:00.000Z",
      "status": "PICKED_UP",
      "description": "Package picked up",
      "location": "Origin facility"
    },
    {
      "timestamp": "2025-01-18T14:00:00.000Z",
      "status": "IN_TRANSIT",
      "description": "In transit",
      "location": "Sorting facility"
    },
    {
      "timestamp": "2025-01-19T09:00:00.000Z",
      "status": "OUT_FOR_DELIVERY",
      "description": "Out for delivery",
      "location": "Local facility"
    }
  ],
  "estimatedDelivery": "2025-01-20T00:00:00.000Z"
}
```

**Notes:**
- Events shown in chronological order
- Real-time status from carrier (simulated in test mode)
- Tracking events saved to database

---

## 🔄 Step 6: Test Return Label Generation

### Create a Return Label

```bash
curl -X POST http://localhost:3001/shipping/returns/labels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "shipmentId": "your-shipment-id-here",
    "orderId": "order-123-test",
    "reason": "Customer requested return - wrong size",
    "validDays": 30
  }'
```

**Expected Response:**
```json
{
  "id": "return-label-id",
  "shipmentId": "your-shipment-id-here",
  "orderId": "order-123-test",
  "carrier": "UPS",
  "trackingNumber": "1Z888BB20234567895",
  "labelUrl": "https://ups.com/labels/1Z888BB20234567895.pdf",
  "labelFormat": "PDF",
  "reason": "Customer requested return - wrong size",
  "status": "CREATED",
  "expiresAt": "2025-02-18T...",
  "createdAt": "2025-01-19T..."
}
```

**Notes:**
- Return label reverses from/to addresses
- 30-day expiration by default
- Status tracks if label has been used
- Same carrier as original shipment

---

## 🎯 Step 7: Test Webhook (Delivery Confirmation)

### Simulate Carrier Webhook

```bash
curl -X POST http://localhost:3001/shipping/webhooks/delivery-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "1Z999AA10123456784",
    "status": "DELIVERED",
    "deliveredAt": "2025-01-20T15:30:00Z",
    "signedBy": "J. DOE",
    "location": "Front porch",
    "photo": "https://carrier.com/delivery-photos/123456.jpg"
  }'
```

**Expected Response:**
```json
{
  "message": "Delivery confirmation processed"
}
```

**What Happens:**
1. Shipment status updated to "DELIVERED"
2. Actual delivery date recorded
3. Delivery confirmation record created
4. Order status potentially updated (if integrated)

**Notes:**
- No authentication required for webhook (carrier callback)
- In production, verify webhook signature
- Can trigger email notifications

---

## 🗺️ Step 8: Test Shipping Zones & Rules

### Get All Zones

```bash
curl -X GET http://localhost:3001/shipping/zones \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "zone-id-1",
    "name": "Continental United States",
    "countries": ["US", "USA"],
    "states": ["AL", "AZ", ...],
    "isActive": true,
    "priority": 1,
    "rules": [
      {
        "id": "rule-id-1",
        "name": "US Ground Shipping",
        "serviceLevel": "GROUND",
        "baseRate": 7.99,
        "perPoundRate": 0.50,
        "freeThreshold": 50.00
      },
      // ... more rules
    ]
  },
  // ... more zones
]
```

### Get Rules for a Zone

```bash
curl -X GET "http://localhost:3001/shipping/rules?zoneId=your-zone-id" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🏭 Step 9: Test Multi-Warehouse Selection

### Find Optimal Warehouse

```bash
curl -X POST http://localhost:3001/shipping/warehouse/select \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "toAddress": {
      "street1": "456 Oak Avenue",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "US"
    },
    "productIds": ["product-id-1", "product-id-2"]
  }'
```

**Expected Response:**
```json
{
  "warehouseId": "warehouse-id-west-coast",
  "reason": "Lowest shipping cost",
  "estimatedCost": 8.99
}
```

**Notes:**
- Checks inventory availability at all warehouses
- Calculates shipping cost from each warehouse
- Returns warehouse with lowest total cost

---

## 🧪 Complete Test Workflow

### Full End-to-End Test

1. **Calculate rates** for customer address
2. **Select optimal warehouse** based on inventory
3. **Create shipment** and generate label
4. **Track shipment** status
5. **Simulate delivery** via webhook
6. **(Optional) Create return label** if needed

### Sample Test Script (Bash)

```bash
#!/bin/bash

# Set your auth token
TOKEN="your-auth-token-here"
API_URL="http://localhost:3001"

echo "=== 1. Calculate Rates ==="
RATES=$(curl -s -X POST $API_URL/shipping/rates/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fromAddress": {
      "name": "Warehouse",
      "street1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "toAddress": {
      "name": "Customer",
      "street1": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "US"
    },
    "package": {
      "type": "SMALL_PACKAGE",
      "weight": 5
    }
  }')

echo "$RATES" | jq '.[0]'  # Show cheapest rate

echo -e "\n=== 2. Create Shipment ==="
SHIPMENT=$(curl -s -X POST $API_URL/shipping/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "test-order-001",
    "carrier": "UPS",
    "serviceLevel": "GROUND",
    "fromAddress": {
      "name": "Warehouse",
      "street1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "toAddress": {
      "name": "Customer",
      "street1": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "country": "US"
    },
    "package": {
      "type": "SMALL_PACKAGE",
      "weight": 5
    }
  }')

TRACKING=$(echo "$SHIPMENT" | jq -r '.trackingNumber')
echo "Tracking Number: $TRACKING"

echo -e "\n=== 3. Track Shipment ==="
curl -s -X POST $API_URL/shipping/shipments/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"trackingNumber\": \"$TRACKING\"
  }" | jq '.'

echo -e "\n=== Test Complete ==="
```

---

## 🐛 Troubleshooting

### Issue: "Provider not available"

**Solution:** Check that providers are seeded and active:
```bash
curl -X GET http://localhost:3001/shipping/providers \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: "No rates returned"

**Possible causes:**
1. Zone doesn't match address
2. Package weight exceeds rule limits
3. No active rules for service level

**Debug:**
```bash
# Check zones
curl -X GET http://localhost:3001/shipping/zones \
  -H "Authorization: Bearer $TOKEN"

# Check rules
curl -X GET http://localhost:3001/shipping/rules \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: "Shipment not found"

**Solution:** Verify tracking number exists:
```bash
# Use the correct tracking number from shipment creation response
```

### Issue: 401 Unauthorized

**Solution:** Get a fresh JWT token:
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@citadelbuy.com",
    "password": "your-password"
  }'
```

---

## 📊 Expected Test Results

### Rate Calculation
- ✅ Returns 3-9 rates (depending on address)
- ✅ Rates sorted by price (lowest first)
- ✅ Custom rules applied (free shipping, etc.)
- ✅ Different carriers offer different prices

### Label Generation
- ✅ Tracking number generated
- ✅ Label URL returned
- ✅ Shipment status: "LABEL_CREATED"
- ✅ Cost calculated correctly

### Tracking
- ✅ Events in chronological order
- ✅ Current status accurate
- ✅ Estimated delivery date shown

### Return Labels
- ✅ Reverse shipment created
- ✅ New tracking number
- ✅ Expiration date set correctly

### Webhooks
- ✅ Status updated to "DELIVERED"
- ✅ Delivery confirmation saved
- ✅ Timestamp recorded

---

## 🔐 Production Configuration

Before going to production:

1. **Update Provider Credentials:**
```bash
# Update via API or environment variables
curl -X PATCH http://localhost:3001/shipping/providers/{provider-id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "real-api-key",
    "apiSecret": "real-api-secret",
    "accountNumber": "real-account-number",
    "testMode": false
  }'
```

2. **Configure Webhook URLs:**
   - UPS: Developer Portal → Webhooks
   - FedEx: Developer Portal → Notifications
   - USPS: Inform Delivery API

3. **Set Environment Variables:**
```env
UPS_API_KEY=your-production-key
UPS_API_SECRET=your-production-secret
FEDEX_API_KEY=your-production-key
USPS_API_KEY=your-production-key
```

4. **Enable Real Carriers:**
```bash
# Set testMode to false for all providers
```

---

## ✅ Test Checklist

- [ ] All 3 providers configured
- [ ] Zones and rules seeded
- [ ] Rate calculation works (domestic)
- [ ] Rate calculation works (international)
- [ ] Label generation works
- [ ] Tracking works
- [ ] Return labels work
- [ ] Webhooks work
- [ ] Multi-warehouse selection works
- [ ] Custom pricing rules applied correctly
- [ ] Free shipping thresholds work
- [ ] Insurance and signature fees calculated

---

## 📝 Notes

- **Test Mode:** All API calls use simulated responses
- **Production Mode:** Real carrier APIs called (requires valid credentials)
- **Rate Caching:** Rates cached for 24 hours
- **Webhook Security:** Implement signature verification in production
- **Error Handling:** All endpoints return proper error messages

**Testing Complete!** 🎉
