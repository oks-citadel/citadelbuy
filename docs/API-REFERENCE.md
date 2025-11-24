# CitadelBuy API Reference

## Overview

Complete API reference for the CitadelBuy e-commerce platform. All endpoints use RESTful conventions with JSON request/response bodies.

**Base URL:** `https://api.citadelbuy.com`
**API Version:** v2.0
**Total Endpoints:** 122

---

## Authentication

### JWT Bearer Token

Most endpoints require authentication via JWT bearer token.

```bash
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "VENDOR"
  }
}
```

---

## Role-Based Access Control

| Role | Description | Access Level |
|------|-------------|--------------|
| `CUSTOMER` | Regular buyers | Public + Own Data |
| `VENDOR` | Product sellers | Customer + Vendor Features |
| `ADMIN` | Platform administrators | Full Access |

---

## Phase 18: Advertising Platform

### Campaigns

#### Create Campaign
```http
POST /advertisements/campaigns
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

{
  "name": "Summer Sale Campaign",
  "totalBudget": 1000.00,
  "dailyBudget": 50.00,
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-06-30T23:59:59Z"
}
```

#### Get Vendor Campaigns
```http
GET /advertisements/campaigns
Authorization: Bearer <token>
Roles: VENDOR, ADMIN
```

#### Get Campaign by ID
```http
GET /advertisements/campaigns/:campaignId
Authorization: Bearer <token>
Roles: VENDOR, ADMIN
```

#### Update Campaign
```http
PUT /advertisements/campaigns/:campaignId
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

{
  "status": "ACTIVE",
  "dailyBudget": 75.00
}
```

#### Delete Campaign
```http
DELETE /advertisements/campaigns/:campaignId
Authorization: Bearer <token>
Roles: VENDOR, ADMIN
```

### Advertisements

#### Create Advertisement
```http
POST /advertisements
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

{
  "campaignId": "campaign-123",
  "productId": "product-456",
  "title": "Premium Wireless Headphones",
  "description": "50% off for limited time",
  "bidAmount": 0.50,
  "targetCategories": ["electronics", "audio"],
  "targetKeywords": ["headphones", "wireless", "bluetooth"]
}
```

#### Get Advertisements for Display
```http
GET /advertisements/display?placement=homepage_top&categoryId=electronics
Roles: PUBLIC

Response:
[
  {
    "id": "ad-789",
    "title": "Premium Wireless Headphones",
    "imageUrl": "https://...",
    "productSlug": "wireless-headphones-pro",
    "campaignId": "campaign-123"
  }
]
```

#### Track Ad Impression
```http
POST /advertisements/:adId/impressions
Roles: PUBLIC

{
  "placement": "homepage_top",
  "sessionId": "session-abc"
}
```

#### Track Ad Click
```http
POST /advertisements/:adId/clicks
Roles: PUBLIC

{
  "impressionId": "impression-123",
  "sessionId": "session-abc"
}
```

### Analytics

#### Get Campaign Analytics
```http
GET /advertisements/campaigns/:campaignId/analytics
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
{
  "totalSpent": 450.00,
  "impressions": 12500,
  "clicks": 350,
  "conversions": 28,
  "ctr": 2.8,
  "conversionRate": 8.0,
  "averageCpc": 1.29
}
```

---

## Phase 19: Subscription Services

### Plans

#### Get All Plans
```http
GET /subscriptions/plans?type=CUSTOMER_PREMIUM
Roles: PUBLIC

Response:
[
  {
    "id": "plan-123",
    "name": "Premium Monthly",
    "type": "CUSTOMER_PREMIUM",
    "price": 9.99,
    "billingInterval": "MONTHLY",
    "benefits": {
      "freeShipping": true,
      "discountPercent": 10,
      "earlyAccess": true
    }
  }
]
```

### Subscriptions

#### Subscribe to Plan
```http
POST /subscriptions/subscribe
Authorization: Bearer <token>
Roles: CUSTOMER, VENDOR

{
  "planId": "plan-123",
  "paymentMethodId": "pm_1234567890"
}
```

#### Get My Subscription
```http
GET /subscriptions/my-subscription
Authorization: Bearer <token>
Roles: CUSTOMER, VENDOR

Response:
{
  "id": "sub-456",
  "plan": { ... },
  "status": "ACTIVE",
  "currentPeriodStart": "2024-01-01T00:00:00Z",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

#### Get My Benefits
```http
GET /subscriptions/my-benefits
Authorization: Bearer <token>
Roles: CUSTOMER, VENDOR

Response:
{
  "hasActiveSubscription": true,
  "plan": { ... },
  "benefits": {
    "freeShipping": true,
    "discountPercent": 10,
    "maxProducts": 100,
    "prioritySupport": true
  }
}
```

#### Cancel Subscription
```http
POST /subscriptions/cancel
Authorization: Bearer <token>
Roles: CUSTOMER, VENDOR

{
  "cancelAtPeriodEnd": true
}
```

#### Update Payment Method
```http
PUT /subscriptions/payment-method
Authorization: Bearer <token>
Roles: CUSTOMER, VENDOR

{
  "paymentMethodId": "pm_9876543210"
}
```

---

## Phase 20: BNPL Integration

### Payment Plans

#### Create Payment Plan
```http
POST /bnpl/payment-plans
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "orderId": "order-123",
  "provider": "KLARNA",
  "numberOfInstallments": 6
}

Response:
{
  "id": "plan-789",
  "orderId": "order-123",
  "provider": "KLARNA",
  "totalAmount": 600.00,
  "numberOfInstallments": 6,
  "installmentAmount": 100.00,
  "interestRate": 0,
  "firstPaymentDate": "2024-02-01T00:00:00Z",
  "installments": [...]
}
```

#### Get Payment Plans
```http
GET /bnpl/payment-plans
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "plan-789",
    "status": "ACTIVE",
    "totalAmount": 600.00,
    "totalPaid": 200.00,
    "remainingBalance": 400.00,
    "nextPaymentDate": "2024-03-01T00:00:00Z"
  }
]
```

#### Get Payment Plan Details
```http
GET /bnpl/payment-plans/:planId
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
{
  "id": "plan-789",
  "order": { ... },
  "installments": [
    {
      "installmentNumber": 1,
      "amount": 100.00,
      "dueDate": "2024-02-01T00:00:00Z",
      "status": "PAID",
      "paidDate": "2024-01-31T15:30:00Z"
    },
    ...
  ]
}
```

#### Process Installment Payment
```http
POST /bnpl/payment-plans/:planId/installments/:installmentId/pay
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "paymentMethodId": "pm_1234567890"
}
```

### Providers

#### Get Available Providers
```http
GET /bnpl/providers?orderTotal=500
Roles: PUBLIC

Response:
[
  {
    "provider": "KLARNA",
    "name": "Klarna",
    "available": true,
    "installmentOptions": [3, 6, 12],
    "interestRate": 0
  },
  {
    "provider": "AFFIRM",
    "name": "Affirm",
    "available": true,
    "installmentOptions": [3, 6, 12],
    "interestRate": 10
  }
]
```

---

## Phase 21: AI Recommendations

### Recommendations

#### Get Personalized Recommendations
```http
GET /recommendations/personalized?limit=10
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "prod-123",
    "name": "Wireless Headphones",
    "price": 99.99,
    "images": ["https://..."],
    "slug": "wireless-headphones",
    "recommendationScore": 0.95
  }
]
```

#### Get Similar Products
```http
GET /recommendations/similar/:productId?limit=6
Roles: PUBLIC

Response:
[
  {
    "id": "prod-456",
    "name": "Similar Headphones",
    "price": 89.99,
    "similarityScore": 0.88
  }
]
```

#### Get Frequently Bought Together
```http
GET /recommendations/frequently-bought-together/:productId
Roles: PUBLIC

Response:
[
  {
    "id": "prod-789",
    "name": "Phone Case",
    "price": 19.99,
    "coOccurrenceScore": 0.75
  }
]
```

#### Get Trending Products
```http
GET /recommendations/trending?limit=8
Roles: PUBLIC

Response:
[
  {
    "id": "prod-321",
    "name": "Smart Watch",
    "viewCount": 5000,
    "purchaseCount": 250,
    "trendScore": 0.92
  }
]
```

#### Get Recently Viewed
```http
GET /recommendations/recently-viewed?limit=6
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "prod-654",
    "name": "Laptop Stand",
    "viewedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Behavior Tracking

#### Track User Behavior
```http
POST /recommendations/track
Roles: PUBLIC

{
  "userId": "user-123",
  "sessionId": "session-abc",
  "productId": "prod-456",
  "actionType": "VIEW"
}
```

---

## Phase 22: Enhanced Search & Discovery

### Search

#### Search Products
```http
GET /search/products?query=headphones&minPrice=50&maxPrice=200&categoryId=electronics&minRating=4&inStock=true&sortBy=price&sortOrder=asc&page=1&limit=20
Roles: PUBLIC

Response:
{
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "filters": { ... }
}
```

#### Autocomplete
```http
GET /search/autocomplete?query=wire&limit=10
Roles: PUBLIC

Response:
{
  "suggestions": [
    {
      "keyword": "wireless headphones",
      "type": "keyword",
      "searchCount": 150
    }
  ],
  "products": [
    {
      "id": "prod-123",
      "name": "Wireless Earbuds",
      "slug": "wireless-earbuds",
      "image": "https://...",
      "price": 79.99,
      "type": "product"
    }
  ]
}
```

#### Get Popular Searches
```http
GET /search/popular?limit=10&categoryId=electronics
Roles: PUBLIC

Response:
[
  {
    "keyword": "bluetooth speakers",
    "searchCount": 2500
  }
]
```

#### Get Trending Searches
```http
GET /search/trending?limit=10
Roles: PUBLIC

Response:
[
  {
    "query": "smart watch",
    "count": 450
  }
]
```

### Search History

#### Get Search History
```http
GET /search/history?limit=20
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "search-123",
    "query": "wireless headphones",
    "resultsCount": 25,
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

#### Clear Search History
```http
DELETE /search/history
Authorization: Bearer <token>
Roles: CUSTOMER
```

### Saved Searches

#### Create Saved Search
```http
POST /search/saved
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "name": "Premium Headphones under $200",
  "query": "headphones",
  "filters": {
    "maxPrice": 200,
    "minRating": 4
  },
  "notifyOnNew": true
}
```

#### Get Saved Searches
```http
GET /search/saved
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "saved-123",
    "name": "Premium Headphones under $200",
    "query": "headphones",
    "filters": { ... },
    "notifyOnNew": true
  }
]
```

#### Update Saved Search
```http
PUT /search/saved/:searchId
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "name": "Updated Name",
  "notifyOnNew": false
}
```

#### Delete Saved Search
```http
DELETE /search/saved/:searchId
Authorization: Bearer <token>
Roles: CUSTOMER
```

### Tracking

#### Track Search
```http
POST /search/track
Roles: PUBLIC

{
  "query": "wireless headphones",
  "resultsCount": 25,
  "source": "SEARCH_BAR",
  "sessionId": "session-abc"
}
```

#### Track Product View
```http
POST /search/track-view
Roles: PUBLIC

{
  "productId": "prod-123",
  "source": "search",
  "sessionId": "session-abc"
}
```

---

## Phase 23: Advanced Analytics Dashboard

### Vendor Analytics

#### Get Vendor Overview
```http
GET /analytics-dashboard/vendor/overview?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
{
  "totalRevenue": 45000.00,
  "totalOrders": 350,
  "averageOrderValue": 128.57,
  "totalViews": 12500,
  "averageConversionRate": 2.8,
  "timeSeriesData": [...]
}
```

#### Get Vendor Sales
```http
GET /analytics-dashboard/vendor/sales?startDate=2024-01-01&endDate=2024-01-31&period=DAILY
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
[
  {
    "date": "2024-01-01T00:00:00Z",
    "totalRevenue": 1500.00,
    "totalOrders": 12,
    "averageOrderValue": 125.00,
    "totalUnits": 25
  },
  ...
]
```

#### Get Product Performance
```http
GET /analytics-dashboard/vendor/products?startDate=2024-01-01&endDate=2024-01-31&limit=10
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
[
  {
    "id": "prod-123",
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "price": 99.99,
    "images": ["https://..."],
    "views": 2500,
    "purchases": 75,
    "revenue": 7499.25,
    "conversionRate": 3.0
  }
]
```

#### Get Comparison Data
```http
GET /analytics-dashboard/vendor/comparison?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
{
  "current": { ... },
  "previous": { ... },
  "changes": {
    "revenue": 15.5,
    "orders": 8.2,
    "views": -3.1,
    "conversionRate": 12.7
  }
}
```

### Product Analytics

#### Get Product Analytics
```http
GET /analytics-dashboard/product/:productId?startDate=2024-01-01&endDate=2024-01-31&period=DAILY
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
{
  "views": 2500,
  "uniqueViews": 1800,
  "addToCart": 200,
  "purchases": 75,
  "revenue": 7499.25,
  "conversionRate": 3.0,
  "cartConversion": 37.5,
  "timeSeriesData": [...]
}
```

### Platform Analytics (Admin Only)

#### Get Revenue Breakdown
```http
GET /analytics-dashboard/revenue?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
Roles: ADMIN

Response:
{
  "productRevenue": 500000.00,
  "subscriptionRevenue": 50000.00,
  "adRevenue": 25000.00,
  "bnplRevenue": 15000.00,
  "grossRevenue": 590000.00,
  "netRevenue": 531000.00,
  "totalOrders": 4500,
  "completedOrders": 4200
}
```

#### Get Traffic Analytics
```http
GET /analytics-dashboard/traffic?startDate=2024-01-01&endDate=2024-01-31&period=DAILY
Authorization: Bearer <token>
Roles: ADMIN

Response:
[
  {
    "date": "2024-01-01T00:00:00Z",
    "totalVisitors": 5000,
    "uniqueVisitors": 3500,
    "totalPageViews": 15000,
    "conversionRate": 2.5
  }
]
```

#### Get Category Analytics
```http
GET /analytics-dashboard/categories?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
Roles: ADMIN

Response:
[
  {
    "category": {
      "id": "cat-123",
      "name": "Electronics",
      "slug": "electronics"
    },
    "totalRevenue": 125000.00,
    "totalOrders": 890,
    "views": 45000
  }
]
```

### Real-Time Metrics

#### Get Real-Time Dashboard
```http
GET /analytics-dashboard/realtime
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
{
  "todayOrders": 12,
  "todayRevenue": 1580.50,
  "activeProducts": 45,
  "lowStockProducts": 3,
  "outOfStock": 1,
  "pendingOrders": 5
}
```

---

## Phase 24: Multi-language Support (i18n)

### Languages

#### Get All Languages
```http
GET /i18n/languages
Roles: PUBLIC

Response:
[
  {
    "id": "lang-123",
    "code": "en",
    "name": "English",
    "nativeName": "English",
    "isDefault": true,
    "isActive": true,
    "isRTL": false
  },
  {
    "id": "lang-456",
    "code": "es",
    "name": "Spanish",
    "nativeName": "Español",
    "isDefault": false,
    "isActive": true,
    "isRTL": false
  }
]
```

#### Create Language (Admin)
```http
POST /i18n/languages
Authorization: Bearer <token>
Roles: ADMIN

{
  "code": "fr",
  "name": "French",
  "nativeName": "Français",
  "isRTL": false
}
```

#### Update Language (Admin)
```http
PUT /i18n/languages/:languageId
Authorization: Bearer <token>
Roles: ADMIN

{
  "isActive": true,
  "isDefault": false
}
```

#### Delete Language (Admin)
```http
DELETE /i18n/languages/:languageId
Authorization: Bearer <token>
Roles: ADMIN
```

### UI Translations

#### Get Translations
```http
GET /i18n/translations?languageCode=es&namespace=common
Roles: PUBLIC

Response:
{
  "language": "es",
  "namespace": "common",
  "translations": {
    "nav.home": "Inicio",
    "nav.products": "Productos",
    "nav.cart": "Carrito",
    "button.addToCart": "Añadir al carrito"
  }
}
```

#### Get Translation by Key
```http
GET /i18n/translations/:languageCode/:key
Roles: PUBLIC

Response:
{
  "key": "nav.home",
  "value": "Inicio",
  "namespace": "common",
  "languageCode": "es"
}
```

#### Create/Update Translation (Admin)
```http
POST /i18n/translations
Authorization: Bearer <token>
Roles: ADMIN

{
  "languageCode": "es",
  "key": "nav.home",
  "value": "Inicio",
  "namespace": "common"
}
```

#### Bulk Create/Update Translations (Admin)
```http
POST /i18n/translations/bulk
Authorization: Bearer <token>
Roles: ADMIN

{
  "languageCode": "es",
  "namespace": "common",
  "translations": {
    "nav.home": "Inicio",
    "nav.products": "Productos",
    "nav.cart": "Carrito"
  }
}
```

#### Delete Translation (Admin)
```http
DELETE /i18n/translations/:translationId
Authorization: Bearer <token>
Roles: ADMIN
```

#### Get All Namespaces
```http
GET /i18n/namespaces?languageCode=en
Roles: PUBLIC

Response:
[
  {
    "namespace": "common",
    "keyCount": 150,
    "coverage": 95.5
  },
  {
    "namespace": "products",
    "keyCount": 75,
    "coverage": 88.2
  }
]
```

#### Export Translations (Admin)
```http
GET /i18n/export?languageCode=es&format=json
Authorization: Bearer <token>
Roles: ADMIN

Response: (JSON file download)
{
  "common": {
    "nav.home": "Inicio",
    "nav.products": "Productos"
  },
  "products": {
    "title": "Productos"
  }
}
```

#### Import Translations (Admin)
```http
POST /i18n/import
Authorization: Bearer <token>
Roles: ADMIN
Content-Type: multipart/form-data

{
  "file": <translation-file.json>,
  "languageCode": "es",
  "overwrite": true
}
```

### Product Translations

#### Get Product Translation
```http
GET /i18n/products/:productId?languageCode=es
Roles: PUBLIC

Response:
{
  "id": "trans-123",
  "productId": "prod-456",
  "languageCode": "es",
  "name": "Auriculares Inalámbricos",
  "description": "Auriculares premium con cancelación de ruido",
  "shortDescription": "Calidad de audio superior"
}
```

#### Create/Update Product Translation (Admin/Vendor)
```http
POST /i18n/products/:productId/translations
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

{
  "languageCode": "es",
  "name": "Auriculares Inalámbricos",
  "description": "Auriculares premium con cancelación de ruido",
  "shortDescription": "Calidad de audio superior"
}
```

#### Delete Product Translation (Admin/Vendor)
```http
DELETE /i18n/products/:productId/translations/:languageCode
Authorization: Bearer <token>
Roles: VENDOR, ADMIN
```

#### Get All Product Translations (Admin/Vendor)
```http
GET /i18n/products/:productId/translations
Authorization: Bearer <token>
Roles: VENDOR, ADMIN

Response:
[
  {
    "languageCode": "es",
    "name": "Auriculares Inalámbricos",
    "completeness": 100
  },
  {
    "languageCode": "fr",
    "name": "Écouteurs Sans Fil",
    "completeness": 100
  }
]
```

### Category Translations

#### Get Category Translation
```http
GET /i18n/categories/:categoryId?languageCode=es
Roles: PUBLIC

Response:
{
  "id": "trans-789",
  "categoryId": "cat-321",
  "languageCode": "es",
  "name": "Electrónica",
  "description": "Dispositivos y accesorios electrónicos"
}
```

#### Create/Update Category Translation (Admin)
```http
POST /i18n/categories/:categoryId/translations
Authorization: Bearer <token>
Roles: ADMIN

{
  "languageCode": "es",
  "name": "Electrónica",
  "description": "Dispositivos y accesorios electrónicos"
}
```

#### Delete Category Translation (Admin)
```http
DELETE /i18n/categories/:categoryId/translations/:languageCode
Authorization: Bearer <token>
Roles: ADMIN
```

### Translation Statistics (Admin)

#### Get Coverage Statistics
```http
GET /i18n/coverage
Authorization: Bearer <token>
Roles: ADMIN

Response:
[
  {
    "languageCode": "en",
    "languageName": "English",
    "totalKeys": 500,
    "translatedKeys": 500,
    "coverage": 100
  },
  {
    "languageCode": "es",
    "languageName": "Spanish",
    "totalKeys": 500,
    "translatedKeys": 475,
    "coverage": 95
  }
]
```

#### Get Missing Translations
```http
GET /i18n/missing?languageCode=es&namespace=common
Authorization: Bearer <token>
Roles: ADMIN

Response:
[
  {
    "key": "nav.settings",
    "namespace": "common",
    "missingIn": ["es", "fr"]
  }
]
```

---

## Phase 25: Loyalty & Rewards Program

### Customer Account

#### Get My Loyalty Account
```http
GET /loyalty/my-account
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
{
  "id": "loyalty-123",
  "userId": "user-456",
  "totalPointsEarned": 5000,
  "currentPoints": 3200,
  "lifetimePoints": 5000,
  "currentTier": "GOLD",
  "tierSince": "2024-01-15T00:00:00Z",
  "lifetimeSpending": 2500.00,
  "tierSpending": 1800.00,
  "referralCode": "ABC123XYZ",
  "referredBy": null,
  "user": {
    "id": "user-456",
    "email": "customer@example.com",
    "name": "John Doe"
  }
}
```

#### Create Loyalty Account
```http
POST /loyalty/my-account
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
{
  "id": "loyalty-123",
  "currentPoints": 100,
  "currentTier": "BRONZE",
  "referralCode": "ABC123XYZ"
}
```

#### Get Leaderboard
```http
GET /loyalty/leaderboard?limit=10
Roles: PUBLIC

Response:
[
  {
    "rank": 1,
    "userId": "user-789",
    "name": "Jane Smith",
    "totalPoints": 15000,
    "currentTier": "DIAMOND"
  },
  {
    "rank": 2,
    "userId": "user-456",
    "name": "John Doe",
    "totalPoints": 12500,
    "currentTier": "PLATINUM"
  }
]
```

### Points Management

#### Earn Points from Purchase
```http
POST /loyalty/points/earn/purchase
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "orderId": "order-123",
  "orderTotal": 150.00
}

Response:
{
  "pointsEarned": 150,
  "currentPoints": 3350,
  "transaction": {
    "id": "trans-789",
    "type": "EARNED_PURCHASE",
    "points": 150,
    "description": "Points earned from order order-123"
  }
}
```

#### Earn Points from Review
```http
POST /loyalty/points/earn/review/:productId
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
{
  "pointsEarned": 50,
  "currentPoints": 3400,
  "transaction": {
    "type": "EARNED_REVIEW",
    "points": 50
  }
}
```

#### Award Birthday Points
```http
POST /loyalty/points/earn/birthday
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
{
  "pointsEarned": 200,
  "currentPoints": 3600
}
```

#### Adjust Points (Admin)
```http
POST /loyalty/points/adjust/:userId
Authorization: Bearer <token>
Roles: ADMIN

{
  "points": 500,
  "reason": "Customer service compensation"
}

Response:
{
  "adjustedPoints": 500,
  "currentPoints": 4100
}
```

#### Get Point History
```http
GET /loyalty/points/history?limit=20
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "trans-123",
    "type": "EARNED_PURCHASE",
    "points": 150,
    "description": "Points earned from order order-123",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2025-01-15T10:30:00Z"
  },
  {
    "id": "trans-124",
    "type": "REDEEMED",
    "points": -500,
    "description": "Redeemed for 10% discount reward",
    "createdAt": "2024-01-14T15:00:00Z",
    "expiresAt": null
  }
]
```

### Loyalty Tiers

#### Get All Tiers
```http
GET /loyalty/tiers
Roles: PUBLIC

Response:
[
  {
    "id": "tier-1",
    "tier": "BRONZE",
    "minimumSpending": 0,
    "pointsMultiplier": 1.0,
    "benefits": {
      "freeShipping": false,
      "discountPercentage": 0,
      "earlyAccess": false,
      "prioritySupport": false
    }
  },
  {
    "id": "tier-2",
    "tier": "SILVER",
    "minimumSpending": 500.00,
    "pointsMultiplier": 1.25,
    "benefits": {
      "freeShipping": true,
      "discountPercentage": 5,
      "earlyAccess": false,
      "prioritySupport": false
    }
  }
]
```

#### Initialize Tier Benefits (Admin)
```http
POST /loyalty/tiers/initialize
Authorization: Bearer <token>
Roles: ADMIN

Response:
{
  "message": "5 tier benefits initialized successfully"
}
```

#### Create Tier Benefit (Admin)
```http
POST /loyalty/tiers
Authorization: Bearer <token>
Roles: ADMIN

{
  "tier": "PLATINUM",
  "minimumSpending": 5000.00,
  "minimumPoints": 10000,
  "pointsMultiplier": 1.75,
  "freeShipping": true,
  "discountPercentage": 15,
  "earlyAccess": true,
  "prioritySupport": true,
  "exclusiveDeals": true
}
```

#### Update Tier Benefit (Admin)
```http
PUT /loyalty/tiers/:tierId
Authorization: Bearer <token>
Roles: ADMIN

{
  "pointsMultiplier": 2.0,
  "discountPercentage": 20
}
```

### Referrals

#### Create Referral
```http
POST /loyalty/referrals
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "refereeEmail": "friend@example.com",
  "refereePhone": "+1234567890",
  "message": "Join me on CitadelBuy!"
}

Response:
{
  "id": "ref-789",
  "referrerCode": "ABC123XYZ",
  "refereeEmail": "friend@example.com",
  "status": "PENDING"
}
```

#### Get My Referrals
```http
GET /loyalty/referrals/my-referrals?limit=20
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "ref-789",
    "refereeEmail": "friend@example.com",
    "status": "REWARDED",
    "referrerReward": 500,
    "refereeReward": 300,
    "createdAt": "2024-01-10T00:00:00Z",
    "completedAt": "2024-01-15T10:00:00Z"
  }
]
```

#### Apply Referral Code
```http
POST /loyalty/referrals/apply/:code
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
{
  "message": "Referral code applied successfully",
  "referrer": {
    "name": "John Doe"
  }
}
```

### Rewards

#### Get All Rewards
```http
GET /loyalty/rewards
Roles: PUBLIC

Response:
[
  {
    "id": "reward-123",
    "name": "10% Off Next Purchase",
    "description": "Get 10% discount on your next order",
    "type": "DISCOUNT_PERCENTAGE",
    "pointsCost": 500,
    "discountPercentage": 10,
    "isActive": true,
    "validFrom": "2024-01-01T00:00:00Z",
    "validUntil": "2024-12-31T23:59:59Z",
    "minimumTier": "BRONZE",
    "stock": null
  }
]
```

#### Get Available Rewards
```http
GET /loyalty/rewards/available
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "reward-123",
    "name": "10% Off Next Purchase",
    "pointsCost": 500,
    "canAfford": true,
    "tierEligible": true
  },
  {
    "id": "reward-456",
    "name": "Free Shipping (3 months)",
    "pointsCost": 2000,
    "canAfford": true,
    "tierEligible": true
  }
]
```

#### Create Reward (Admin)
```http
POST /loyalty/rewards
Authorization: Bearer <token>
Roles: ADMIN

{
  "name": "Free Shipping (3 months)",
  "description": "Enjoy free shipping on all orders for 3 months",
  "type": "FREE_SHIPPING",
  "pointsCost": 2000,
  "validityDays": 90,
  "minimumTier": "SILVER"
}
```

#### Update Reward (Admin)
```http
PUT /loyalty/rewards/:rewardId
Authorization: Bearer <token>
Roles: ADMIN

{
  "pointsCost": 1800,
  "isActive": true
}
```

#### Delete Reward (Admin)
```http
DELETE /loyalty/rewards/:rewardId
Authorization: Bearer <token>
Roles: ADMIN
```

### Reward Redemptions

#### Redeem Reward
```http
POST /loyalty/redemptions/redeem
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "rewardId": "reward-123"
}

Response:
{
  "id": "redemption-789",
  "reward": {
    "name": "10% Off Next Purchase",
    "type": "DISCOUNT_PERCENTAGE"
  },
  "pointsSpent": 500,
  "status": "ACTIVE",
  "code": "DISC-ABC123",
  "expiresAt": "2024-02-15T00:00:00Z"
}
```

#### Get My Redemptions
```http
GET /loyalty/redemptions/my-redemptions?limit=20
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
[
  {
    "id": "redemption-789",
    "reward": {
      "name": "10% Off Next Purchase",
      "type": "DISCOUNT_PERCENTAGE"
    },
    "pointsSpent": 500,
    "status": "ACTIVE",
    "code": "DISC-ABC123",
    "redeemedAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-02-15T00:00:00Z",
    "usedAt": null
  }
]
```

#### Get Redemption by Code
```http
GET /loyalty/redemptions/code/:code
Authorization: Bearer <token>
Roles: CUSTOMER

Response:
{
  "id": "redemption-789",
  "reward": {
    "discountPercentage": 10,
    "discountAmount": null,
    "freeShippingDays": 0
  },
  "status": "ACTIVE",
  "canUse": true
}
```

#### Apply Redemption to Order
```http
POST /loyalty/redemptions/:redemptionId/apply
Authorization: Bearer <token>
Roles: CUSTOMER

{
  "orderId": "order-456",
  "orderTotal": 100.00
}

Response:
{
  "discountAmount": 10.00,
  "finalTotal": 90.00,
  "redemption": {
    "status": "USED",
    "usedAt": "2024-01-15T12:00:00Z"
  }
}
```

### Loyalty Program Management

#### Get Active Program
```http
GET /loyalty/program
Roles: PUBLIC

Response:
{
  "id": "program-1",
  "name": "CitadelBuy Rewards",
  "isActive": true,
  "pointsPerDollar": 1,
  "signupBonusPoints": 100,
  "reviewBonusPoints": 50,
  "birthdayBonusPoints": 200,
  "referrerBonusPoints": 500,
  "refereeBonusPoints": 300,
  "pointsExpiryDays": 365,
  "minimumReferralPurchase": 50.00
}
```

#### Update Program (Admin)
```http
PUT /loyalty/program/:programId
Authorization: Bearer <token>
Roles: ADMIN

{
  "pointsPerDollar": 1.5,
  "signupBonusPoints": 150,
  "reviewBonusPoints": 75
}
```

#### Initialize Program (Admin)
```http
POST /loyalty/program/initialize
Authorization: Bearer <token>
Roles: ADMIN

Response:
{
  "message": "Loyalty program initialized successfully"
}
```

### Statistics (Admin)

#### Get Loyalty Statistics
```http
GET /loyalty/statistics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
Roles: ADMIN

Response:
{
  "totalMembers": 5000,
  "activeMembers": 3500,
  "totalPointsIssued": 500000,
  "totalPointsRedeemed": 150000,
  "averagePointsPerMember": 100,
  "tierDistribution": {
    "BRONZE": 2500,
    "SILVER": 1500,
    "GOLD": 750,
    "PLATINUM": 200,
    "DIAMOND": 50
  },
  "topRewards": [
    {
      "rewardName": "10% Off Next Purchase",
      "redemptions": 450
    }
  ],
  "referralStats": {
    "totalReferrals": 800,
    "successfulReferrals": 450,
    "conversionRate": 56.25
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### Common Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Rate Limiting

**Default Limits:**
- 100 requests per minute per IP
- Applies to all endpoints
- Returns 429 status when exceeded

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642080000
```

---

## Pagination

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Webhooks

### Available Events

- `order.created`
- `order.completed`
- `subscription.created`
- `subscription.cancelled`
- `payment.succeeded`
- `payment.failed`

### Webhook Payload

```json
{
  "event": "order.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "orderId": "order-123",
    "total": 150.00,
    "status": "DELIVERED"
  }
}
```

---

**API Documentation Version:** 2.0
**Last Updated:** 2024-01-17
