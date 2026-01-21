# Broxiva API Reference

**Version**: v1.0.0
**Base URL**: `https://api.broxiva.com/api`
**Last Updated**: 2025-12-06

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
3. [Marketing Endpoints](#marketing-endpoints)
4. [Enterprise Endpoints](#enterprise-endpoints)
5. [Cross-Border Endpoints](#cross-border-endpoints)
6. [AI & Intelligence Endpoints](#ai--intelligence-endpoints)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Webhooks](#webhooks)

---

## Authentication

### Overview

The Broxiva API uses JWT (JSON Web Token) for authentication. Tokens are obtained through the login endpoint and must be included in the Authorization header for protected endpoints.

### Authentication Flow

```
1. Register/Login → Receive JWT + Refresh Token
2. Include JWT in Authorization header for API requests
3. When JWT expires, use Refresh Token to get new JWT
4. Logout to invalidate tokens
```

### Endpoints

#### Register New User

```http
POST /api/auth/register
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "phoneNumber": "+1234567890" // optional
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-12-06T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### Login

```http
POST /api/auth/login
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### Refresh Token

```http
POST /api/auth/refresh
```

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "emailVerified": true,
  "phoneNumber": "+1234567890",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-12-06T10:30:00Z"
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

## Core Endpoints

### Products

#### List Products

```http
GET /api/products
```

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `category` (string): Filter by category ID
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sort` (string): Sort order (`price-asc`, `price-desc`, `name-asc`, `name-desc`, `date-desc`)
- `inStock` (boolean): Filter in-stock products only

**Response** (200 OK):
```json
{
  "products": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Wireless Bluetooth Headphones",
      "description": "Premium wireless headphones with active noise cancellation",
      "price": 149.99,
      "currency": "USD",
      "images": ["https://cdn.broxiva.com/products/headphones-main.jpg"],
      "stock": 150,
      "category": {
        "id": "cat-123",
        "name": "Electronics",
        "slug": "electronics"
      },
      "vendor": {
        "id": "vendor-123",
        "name": "AudioTech Pro",
        "rating": 4.8
      },
      "averageRating": 4.5,
      "reviewCount": 128
    }
  ],
  "pagination": {
    "total": 1000,
    "page": 1,
    "limit": 20,
    "totalPages": 50
  }
}
```

#### Get Product Details

```http
GET /api/products/:id
```

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Wireless Bluetooth Headphones",
  "description": "Premium wireless headphones with active noise cancellation",
  "fullDescription": "These premium wireless headphones feature...",
  "price": 149.99,
  "currency": "USD",
  "compareAtPrice": 199.99,
  "images": [
    "https://cdn.broxiva.com/products/headphones-main.jpg",
    "https://cdn.broxiva.com/products/headphones-side.jpg"
  ],
  "stock": 150,
  "sku": "WBH-2024-BLK",
  "weight": 0.25,
  "dimensions": "20 x 15 x 8",
  "brand": "AudioTech Pro",
  "category": {
    "id": "cat-123",
    "name": "Electronics",
    "slug": "electronics",
    "breadcrumb": ["Home", "Electronics", "Audio"]
  },
  "vendor": {
    "id": "vendor-123",
    "name": "AudioTech Pro",
    "rating": 4.8,
    "responseTime": "2 hours"
  },
  "variants": [
    {
      "id": "var-123",
      "name": "Black",
      "price": 149.99,
      "stock": 80,
      "sku": "WBH-2024-BLK"
    },
    {
      "id": "var-124",
      "name": "White",
      "price": 149.99,
      "stock": 70,
      "sku": "WBH-2024-WHT"
    }
  ],
  "specifications": {
    "Battery Life": "30 hours",
    "Connectivity": "Bluetooth 5.0",
    "Driver Size": "40mm",
    "Weight": "250g"
  },
  "averageRating": 4.5,
  "reviewCount": 128,
  "reviews": {
    "summary": {
      "5stars": 80,
      "4stars": 30,
      "3stars": 10,
      "2stars": 5,
      "1star": 3
    }
  },
  "shipping": {
    "freeShipping": true,
    "estimatedDelivery": "3-5 business days",
    "international": true
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2025-12-06T14:45:00Z"
}
```

#### Search Products

```http
GET /api/products/search
```

**Query Parameters**:
- `q` (string): Search query
- `category` (string): Category filter
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `sort` (string): Sort order
- `page` (number): Page number
- `limit` (number): Items per page

**Response**: Same as List Products

#### Create Product (Vendor/Admin)

```http
POST /api/products
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 99.99,
  "currency": "USD",
  "stock": 100,
  "categoryId": "cat-123",
  "images": ["https://example.com/image.jpg"],
  "variants": [
    {
      "name": "Red",
      "price": 99.99,
      "stock": 50,
      "sku": "PROD-RED"
    }
  ],
  "specifications": {
    "Size": "Medium",
    "Color": "Red"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "New Product",
  "slug": "new-product",
  "createdAt": "2025-12-06T10:30:00Z"
}
```

### Cart

#### Get Cart

```http
GET /api/cart
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "id": "cart-123",
  "items": [
    {
      "id": "item-123",
      "productId": "prod-123",
      "product": {
        "name": "Wireless Headphones",
        "price": 149.99,
        "image": "https://cdn.broxiva.com/products/headphones.jpg"
      },
      "variantId": "var-123",
      "quantity": 2,
      "price": 149.99,
      "subtotal": 299.98
    }
  ],
  "subtotal": 299.98,
  "tax": 24.00,
  "shipping": 10.00,
  "total": 333.98,
  "currency": "USD",
  "itemCount": 2
}
```

#### Add to Cart

```http
POST /api/cart/items
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "productId": "prod-123",
  "variantId": "var-123", // optional
  "quantity": 2
}
```

**Response** (201 Created):
```json
{
  "cart": {
    "id": "cart-123",
    "itemCount": 3,
    "total": 449.97
  },
  "item": {
    "id": "item-124",
    "productId": "prod-123",
    "quantity": 2,
    "subtotal": 149.98
  }
}
```

#### Update Cart Item

```http
PUT /api/cart/items/:id
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "quantity": 3
}
```

#### Remove from Cart

```http
DELETE /api/cart/items/:id
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "message": "Item removed from cart",
  "cart": {
    "itemCount": 1,
    "total": 149.99
  }
}
```

### Checkout

#### Create Checkout Session

```http
POST /api/checkout
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "shippingAddress": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US",
    "phone": "+1234567890"
  },
  "billingAddress": {
    // Same structure as shippingAddress
    // Or use: "sameAsShipping": true
  },
  "paymentMethod": "stripe", // or "paypal"
  "couponCode": "SUMMER2025" // optional
}
```

**Response** (200 OK):
```json
{
  "checkoutId": "checkout-123",
  "paymentIntent": {
    "clientSecret": "pi_xxx_secret_yyy",
    "amount": 33398,
    "currency": "usd"
  },
  "order": {
    "id": "order-123",
    "total": 333.98,
    "status": "pending_payment"
  }
}
```

#### Complete Checkout

```http
POST /api/checkout/complete
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "checkoutId": "checkout-123",
  "paymentIntentId": "pi_xxx"
}
```

**Response** (200 OK):
```json
{
  "order": {
    "id": "order-123",
    "orderNumber": "ORD-2025-001234",
    "status": "confirmed",
    "total": 333.98,
    "estimatedDelivery": "2025-12-10"
  },
  "confirmation": {
    "email": "user@example.com",
    "trackingUrl": "https://broxiva.com/track/order-123"
  }
}
```

### Orders

#### List User Orders

```http
GET /api/orders
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (`pending`, `confirmed`, `shipped`, `delivered`, `cancelled`)

**Response** (200 OK):
```json
{
  "orders": [
    {
      "id": "order-123",
      "orderNumber": "ORD-2025-001234",
      "status": "shipped",
      "items": [
        {
          "productName": "Wireless Headphones",
          "quantity": 2,
          "price": 149.99,
          "image": "https://cdn.broxiva.com/products/headphones.jpg"
        }
      ],
      "subtotal": 299.98,
      "tax": 24.00,
      "shipping": 10.00,
      "total": 333.98,
      "currency": "USD",
      "createdAt": "2025-12-01T10:00:00Z",
      "estimatedDelivery": "2025-12-10",
      "trackingNumber": "1Z999AA10123456784"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

#### Get Order Details

```http
GET /api/orders/:id
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "id": "order-123",
  "orderNumber": "ORD-2025-001234",
  "status": "shipped",
  "items": [
    {
      "id": "item-123",
      "productId": "prod-123",
      "productName": "Wireless Headphones",
      "variantName": "Black",
      "quantity": 2,
      "price": 149.99,
      "subtotal": 299.98,
      "image": "https://cdn.broxiva.com/products/headphones.jpg",
      "vendor": {
        "id": "vendor-123",
        "name": "AudioTech Pro"
      }
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "billing": {
    "subtotal": 299.98,
    "tax": 24.00,
    "shipping": 10.00,
    "discount": 0,
    "total": 333.98,
    "currency": "USD"
  },
  "payment": {
    "method": "stripe",
    "status": "paid",
    "transactionId": "pi_xxx"
  },
  "shipping": {
    "carrier": "UPS",
    "method": "standard",
    "trackingNumber": "1Z999AA10123456784",
    "estimatedDelivery": "2025-12-10",
    "shippedAt": "2025-12-02T09:00:00Z"
  },
  "timeline": [
    {
      "status": "created",
      "timestamp": "2025-12-01T10:00:00Z"
    },
    {
      "status": "confirmed",
      "timestamp": "2025-12-01T10:05:00Z"
    },
    {
      "status": "shipped",
      "timestamp": "2025-12-02T09:00:00Z"
    }
  ],
  "createdAt": "2025-12-01T10:00:00Z",
  "updatedAt": "2025-12-02T09:00:00Z"
}
```

#### Cancel Order

```http
POST /api/orders/:id/cancel
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "reason": "Changed my mind"
}
```

**Response** (200 OK):
```json
{
  "order": {
    "id": "order-123",
    "status": "cancelled",
    "refund": {
      "amount": 333.98,
      "status": "pending",
      "estimatedAt": "2025-12-08T00:00:00Z"
    }
  }
}
```

---

## Marketing Endpoints

### Coupons

#### Validate Coupon

```http
POST /api/coupons/validate
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "code": "SUMMER2025",
  "cartTotal": 299.98
}
```

**Response** (200 OK):
```json
{
  "valid": true,
  "coupon": {
    "code": "SUMMER2025",
    "type": "percentage",
    "value": 10,
    "description": "10% off summer sale",
    "minPurchase": 100.00,
    "maxDiscount": 50.00,
    "expiresAt": "2025-08-31T23:59:59Z"
  },
  "discount": 29.99,
  "newTotal": 270.00
}
```

### Recommendations

#### Get Product Recommendations

```http
GET /api/recommendations
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `type` (string): Recommendation type (`personalized`, `trending`, `similar`)
- `productId` (string): For similar products
- `limit` (number): Number of recommendations (default: 10)

**Response** (200 OK):
```json
{
  "recommendations": [
    {
      "productId": "prod-456",
      "name": "Wireless Earbuds",
      "price": 89.99,
      "image": "https://cdn.broxiva.com/products/earbuds.jpg",
      "score": 0.95,
      "reason": "Customers who bought this also bought..."
    }
  ],
  "metadata": {
    "algorithm": "collaborative-filtering",
    "generatedAt": "2025-12-06T10:30:00Z"
  }
}
```

### Reviews

#### Get Product Reviews

```http
GET /api/products/:id/reviews
```

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Reviews per page
- `sort` (string): Sort order (`recent`, `helpful`, `rating-high`, `rating-low`)

**Response** (200 OK):
```json
{
  "reviews": [
    {
      "id": "review-123",
      "userId": "user-123",
      "userName": "John D.",
      "rating": 5,
      "title": "Excellent headphones!",
      "comment": "Best headphones I've ever owned. Great sound quality and comfort.",
      "helpful": 15,
      "verified": true,
      "createdAt": "2025-11-15T10:00:00Z",
      "images": ["https://cdn.broxiva.com/reviews/123-1.jpg"]
    }
  ],
  "summary": {
    "averageRating": 4.5,
    "totalReviews": 128,
    "distribution": {
      "5": 80,
      "4": 30,
      "3": 10,
      "2": 5,
      "1": 3
    }
  },
  "pagination": {
    "total": 128,
    "page": 1,
    "limit": 10,
    "totalPages": 13
  }
}
```

#### Create Review

```http
POST /api/reviews
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "productId": "prod-123",
  "orderId": "order-123", // must have purchased
  "rating": 5,
  "title": "Excellent product!",
  "comment": "Very satisfied with this purchase.",
  "images": ["base64encodedimage..."] // optional
}
```

**Response** (201 Created):
```json
{
  "review": {
    "id": "review-124",
    "productId": "prod-123",
    "rating": 5,
    "createdAt": "2025-12-06T10:30:00Z"
  }
}
```

---

## Enterprise Endpoints

### Organizations

#### List Organizations

```http
GET /api/organizations
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "organizations": [
    {
      "id": "org-123",
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "type": "enterprise",
      "memberCount": 150,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Organization

```http
POST /api/organizations
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "type": "enterprise",
  "industry": "technology",
  "size": "201-500",
  "website": "https://acme.com",
  "billingEmail": "billing@acme.com"
}
```

**Response** (201 Created):
```json
{
  "organization": {
    "id": "org-123",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "apiKey": "org_live_xxxxxxxxxxxxxxxxxxxxx",
    "createdAt": "2025-12-06T10:30:00Z"
  }
}
```

#### Get Organization Members

```http
GET /api/organizations/:id/members
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "members": [
    {
      "userId": "user-123",
      "name": "John Doe",
      "email": "john@acme.com",
      "role": "admin",
      "department": "Engineering",
      "joinedAt": "2024-01-15T00:00:00Z"
    }
  ],
  "total": 150
}
```

### Vendors

#### Register as Vendor

```http
POST /api/vendors
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "businessName": "AudioTech Pro",
  "businessType": "corporation",
  "taxId": "12-3456789",
  "email": "vendor@audiotech.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Business Rd",
    "city": "Seattle",
    "state": "WA",
    "zipCode": "98101",
    "country": "US"
  },
  "bankAccount": {
    "accountHolderName": "AudioTech Pro Inc",
    "routingNumber": "123456789",
    "accountNumber": "987654321"
  }
}
```

**Response** (201 Created):
```json
{
  "vendor": {
    "id": "vendor-123",
    "businessName": "AudioTech Pro",
    "status": "pending_verification",
    "createdAt": "2025-12-06T10:30:00Z"
  },
  "next": {
    "step": "kyc_verification",
    "url": "/api/vendors/vendor-123/kyc"
  }
}
```

#### Get Vendor Analytics

```http
GET /api/vendors/:id/analytics
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `metrics` (string[]): Metrics to include (sales, orders, revenue, commission)

**Response** (200 OK):
```json
{
  "period": {
    "start": "2025-11-01T00:00:00Z",
    "end": "2025-11-30T23:59:59Z"
  },
  "metrics": {
    "totalRevenue": 125450.00,
    "totalOrders": 342,
    "averageOrderValue": 366.81,
    "commission": 12545.00,
    "netRevenue": 112905.00
  },
  "topProducts": [
    {
      "productId": "prod-123",
      "name": "Wireless Headphones",
      "sales": 450,
      "revenue": 67425.00
    }
  ],
  "salesTrend": [
    {
      "date": "2025-11-01",
      "orders": 12,
      "revenue": 4201.00
    }
  ]
}
```

---

## Cross-Border Endpoints

### Currency Conversion

#### Get Supported Currencies

```http
GET /api/currencies
```

**Response** (200 OK):
```json
{
  "currencies": [
    {
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "enabled": true
    },
    {
      "code": "EUR",
      "name": "Euro",
      "symbol": "€",
      "enabled": true
    }
  ]
}
```

#### Convert Currency

```http
POST /api/currency/convert
```

**Request Body**:
```json
{
  "amount": 100.00,
  "from": "USD",
  "to": "EUR"
}
```

**Response** (200 OK):
```json
{
  "amount": 100.00,
  "from": "USD",
  "to": "EUR",
  "result": 92.50,
  "rate": 0.925,
  "timestamp": "2025-12-06T10:30:00Z"
}
```

### International Shipping

#### Get Shipping Rates

```http
POST /api/shipping/rates
```

**Request Body**:
```json
{
  "origin": {
    "country": "US",
    "zipCode": "10001"
  },
  "destination": {
    "country": "GB",
    "zipCode": "SW1A 1AA"
  },
  "items": [
    {
      "weight": 0.5,
      "dimensions": {
        "length": 10,
        "width": 8,
        "height": 5
      },
      "value": 149.99
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "rates": [
    {
      "carrier": "DHL",
      "service": "International Express",
      "rate": 45.00,
      "currency": "USD",
      "estimatedDays": 3,
      "trackingAvailable": true
    },
    {
      "carrier": "UPS",
      "service": "Worldwide Saver",
      "rate": 38.50,
      "currency": "USD",
      "estimatedDays": 5,
      "trackingAvailable": true
    }
  ]
}
```

### Tax Calculation

#### Calculate Tax

```http
POST /api/tax/calculate
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "items": [
    {
      "productId": "prod-123",
      "price": 149.99,
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "country": "US",
    "state": "NY",
    "zipCode": "10001"
  }
}
```

**Response** (200 OK):
```json
{
  "subtotal": 299.98,
  "taxes": [
    {
      "name": "NY State Tax",
      "rate": 0.04,
      "amount": 12.00
    },
    {
      "name": "NY City Tax",
      "rate": 0.04875,
      "amount": 14.62
    }
  ],
  "totalTax": 26.62,
  "total": 326.60
}
```

---

## AI & Intelligence Endpoints

### Smart Search

#### Semantic Search

```http
POST /api/search/semantic
```

**Request Body**:
```json
{
  "query": "comfortable headphones for running",
  "limit": 10
}
```

**Response** (200 OK):
```json
{
  "results": [
    {
      "productId": "prod-456",
      "name": "Sports Wireless Earbuds",
      "score": 0.95,
      "relevance": "High match for sports/running use case",
      "highlights": ["water resistant", "secure fit", "long battery"]
    }
  ],
  "metadata": {
    "model": "semantic-search-v2",
    "processedQuery": "sports audio equipment running fitness"
  }
}
```

### Fraud Detection

#### Analyze Transaction

```http
POST /api/fraud/analyze
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "orderId": "order-123",
  "amount": 500.00,
  "currency": "USD",
  "ipAddress": "192.168.1.1",
  "billingAddress": { ... },
  "shippingAddress": { ... }
}
```

**Response** (200 OK):
```json
{
  "riskScore": 0.15,
  "riskLevel": "low",
  "factors": [
    {
      "factor": "velocity",
      "score": 0.1,
      "description": "Normal purchase frequency"
    },
    {
      "factor": "geo_match",
      "score": 0.05,
      "description": "IP and billing address match"
    }
  ],
  "recommendation": "approve",
  "requiresReview": false
}
```

### Dynamic Pricing

#### Get Dynamic Price

```http
POST /api/pricing/calculate
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "productId": "prod-123",
  "quantity": 1,
  "userId": "user-123"
}
```

**Response** (200 OK):
```json
{
  "basePrice": 149.99,
  "dynamicPrice": 134.99,
  "discount": 15.00,
  "discountPercentage": 10,
  "factors": [
    {
      "type": "demand",
      "impact": -5.00,
      "reason": "Low demand period"
    },
    {
      "type": "loyalty",
      "impact": -10.00,
      "reason": "VIP customer discount"
    }
  ],
  "validUntil": "2025-12-06T12:00:00Z"
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Product not found",
    "statusCode": 404,
    "timestamp": "2025-12-06T10:30:00Z",
    "path": "/api/products/invalid-id",
    "requestId": "req-abc123"
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `INVALID_REQUEST` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `RESOURCE_NOT_FOUND` | Requested resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate) |
| 422 | `VALIDATION_ERROR` | Request validation failed |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Internal server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

### Validation Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 422,
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "value": "***"
      }
    ]
  }
}
```

---

## Rate Limiting

### Rate Limits

| Authentication | Limit | Window |
|----------------|-------|--------|
| Authenticated | 100 requests | 1 minute |
| Anonymous | 20 requests | 1 minute |
| Vendor API Key | 1000 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638792000
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "statusCode": 429,
    "retryAfter": 60
  }
}
```

---

## Webhooks

### Webhook Events

#### Order Events

```json
{
  "event": "order.created",
  "timestamp": "2025-12-06T10:30:00Z",
  "data": {
    "orderId": "order-123",
    "orderNumber": "ORD-2025-001234",
    "status": "confirmed",
    "total": 333.98,
    "currency": "USD"
  }
}
```

Events:
- `order.created`
- `order.confirmed`
- `order.shipped`
- `order.delivered`
- `order.cancelled`

#### Payment Events

```json
{
  "event": "payment.succeeded",
  "timestamp": "2025-12-06T10:30:00Z",
  "data": {
    "paymentId": "pay-123",
    "orderId": "order-123",
    "amount": 333.98,
    "currency": "USD",
    "method": "stripe"
  }
}
```

Events:
- `payment.succeeded`
- `payment.failed`
- `refund.created`
- `refund.completed`

### Webhook Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

---

## SDK & Client Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@broxiva/api-client`
- **Python**: `broxiva-sdk`
- **PHP**: `broxiva/api-client`

### Example Usage (JavaScript)

```javascript
import { BroxivaClient } from '@broxiva/api-client';

const client = new BroxivaClient({
  apiKey: 'your_api_key',
  environment: 'production' // or 'staging'
});

// List products
const products = await client.products.list({
  page: 1,
  limit: 20
});

// Get product
const product = await client.products.get('prod-123');

// Create order
const order = await client.orders.create({
  items: [{ productId: 'prod-123', quantity: 2 }],
  shippingAddress: { ... }
});
```

---

## Support

### API Support
- **Email**: api-support@broxiva.com
- **Documentation**: https://docs.broxiva.com
- **Status Page**: https://status.broxiva.com

### Postman Collection
Download our Postman collection: [Broxiva API Collection](https://api.broxiva.com/postman)

---

**Last Updated**: 2025-12-06
**API Version**: v1.0.0
**Maintained By**: API Team
