# CitadelBuy API Documentation & Test Credentials

**Last Updated:** 2025-11-16
**Version:** 1.0.0

---

## 🔐 Test User Credentials

All test users have the same password: **`password123`**

### Admin Account

```
Email: admin@citadelbuy.com
Password: password123
Role: ADMIN
```

**Access:**
- Full admin dashboard at `/admin`
- Manage all products (create, edit, delete)
- Manage all orders (view, update status)
- View platform statistics
- Access all API endpoints

### Vendor Accounts

**Vendor 1 - TechStore**
```
Email: vendor1@citadelbuy.com
Password: password123
Role: VENDOR
```
- Sells electronics and tech products
- Has products: Laptop, Smartphone, Headphones, SmartWatch, etc.

**Vendor 2 - Fashion Boutique**
```
Email: vendor2@citadelbuy.com
Password: password123
Role: VENDOR
```
- Sells clothing and fashion items
- Has products: T-Shirts, Jeans, Jacket, Sneakers, etc.

### Customer Accounts

**Customer 1 - John Customer**
```
Email: customer@citadelbuy.com
Password: password123
Role: CUSTOMER
```
- Has order history (3 orders)
- Test checkout and order viewing

**Customer 2 - Jane Smith**
```
Email: jane@example.com
Password: password123
Role: CUSTOMER
```
- Has order history (2 orders)
- Test account for multiple users

---

## 📚 API Documentation (Swagger)

### Development Environment

**Swagger UI:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

**API Base URL:** `http://localhost:4000/api`

**Features:**
- Interactive API explorer
- Try out endpoints directly
- View request/response schemas
- Bearer token authentication support
- Complete endpoint documentation

### How to Use Swagger

1. **Start the backend:**
   ```bash
   cd citadelbuy/backend
   npm run dev
   ```

2. **Open Swagger UI:**
   Navigate to: `http://localhost:4000/api/docs`

3. **Authenticate:**
   - Click "Authorize" button (lock icon)
   - Login via `/api/auth/login` endpoint
   - Copy the JWT token from response
   - Paste token in "Authorize" dialog
   - Click "Authorize" and "Close"

4. **Test Endpoints:**
   - All endpoints are now authenticated
   - Click on any endpoint to expand
   - Click "Try it out"
   - Fill in parameters
   - Click "Execute"

---

## 🌐 API Endpoints Reference

### Base URL

**Development:** `http://localhost:4000/api`
**Production:** `https://your-domain.com/api`

---

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "User Name"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "CUSTOMER"
  },
  "access_token": "jwt_token_here"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@citadelbuy.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@citadelbuy.com",
    "name": "Admin User",
    "role": "ADMIN"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer {token}
```

---

### Product Endpoints

#### Get All Products (with filtering)
```http
GET /products?category=electronics&minPrice=100&maxPrice=1000&search=laptop&sort=price&order=asc
```

**Query Parameters:**
- `category` - Filter by category slug
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `search` - Search in name/description
- `sort` - Sort field (price, name, createdAt)
- `order` - Sort order (asc, desc)
- `limit` - Items per page (default: 20)
- `offset` - Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Professional Laptop Pro 15",
      "slug": "professional-laptop-pro-15",
      "description": "High-performance laptop...",
      "price": 1299.99,
      "stock": 25,
      "images": ["url1", "url2"],
      "category": {
        "id": "uuid",
        "name": "Electronics",
        "slug": "electronics"
      },
      "vendor": {
        "id": "uuid",
        "name": "TechStore Vendor"
      }
    }
  ],
  "total": 13,
  "limit": 20,
  "offset": 0
}
```

#### Get Product by ID
```http
GET /products/{productId}
```

---

### Order Endpoints (Authenticated)

#### Get My Orders
```http
GET /orders
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "status": "DELIVERED",
    "total": 1774.98,
    "subtotal": 1599.98,
    "tax": 160.00,
    "shipping": 15.00,
    "createdAt": "2025-11-16T10:30:00Z",
    "items": [
      {
        "id": "uuid",
        "quantity": 1,
        "price": 1299.99,
        "product": {
          "id": "uuid",
          "name": "Professional Laptop Pro 15",
          "images": ["url"]
        }
      }
    ]
  }
]
```

#### Get Order by ID
```http
GET /orders/{orderId}
Authorization: Bearer {token}
```

#### Create Order
```http
POST /orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phone": "+1-555-0123"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "PENDING",
  "total": 2599.98,
  "subtotal": 2359.98,
  "tax": 236.00,
  "shipping": 4.00,
  "items": [...],
  "shippingAddress": {...}
}
```

---

### Payment Endpoints

#### Create Payment Intent
```http
POST /payments/create-payment-intent
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 2599.98,
  "currency": "usd",
  "orderId": "order-uuid"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_xxx"
}
```

#### Webhook (Stripe)
```http
POST /payments/webhook
Stripe-Signature: {signature}
Content-Type: application/json

[Stripe webhook payload]
```

---

### Admin Endpoints (Admin Role Required)

All admin endpoints require:
- Valid JWT token
- User role = ADMIN

#### Order Management

**Get All Orders**
```http
GET /admin/orders?status=PENDING
Authorization: Bearer {admin_token}
```

**Get Order Statistics**
```http
GET /admin/orders/stats
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "totalOrders": 5,
  "totalRevenue": 4272.87,
  "ordersByStatus": {
    "pending": 1,
    "processing": 1,
    "shipped": 1,
    "delivered": 1,
    "cancelled": 1
  }
}
```

**Update Order Status**
```http
PATCH /admin/orders/{orderId}/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "SHIPPED",
  "trackingNumber": "1Z999AA10123456784"
}
```

#### Product Management

**Get All Products (Admin)**
```http
GET /admin/products
Authorization: Bearer {admin_token}
```

**Get Product Statistics**
```http
GET /admin/products/stats
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "totalProducts": 13,
  "totalCategories": 5,
  "lowStockProducts": 1,
  "outOfStockProducts": 1,
  "averagePrice": 234.56
}
```

**Create Product**
```http
POST /admin/products
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description here",
  "price": 99.99,
  "stock": 50,
  "categoryId": "category-uuid",
  "vendorId": "vendor-uuid",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Update Product**
```http
PUT /admin/products/{productId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 149.99,
  "stock": 75
}
```

**Delete Product**
```http
DELETE /admin/products/{productId}
Authorization: Bearer {admin_token}
```

**Get Categories**
```http
GET /admin/products/categories
Authorization: Bearer {admin_token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Electronics",
    "slug": "electronics"
  }
]
```

**Get Vendors**
```http
GET /admin/products/vendors
Authorization: Bearer {admin_token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "TechStore Vendor",
    "email": "vendor1@citadelbuy.com"
  }
]
```

---

### CSRF Protection

**Get CSRF Token**
```http
GET /csrf/token
```

**Response:**
```json
{
  "csrfToken": "random-token-here"
}
```

**Using CSRF Token:**
```http
POST /api/orders
Authorization: Bearer {token}
X-CSRF-Token: {csrf-token}
Content-Type: application/json

{...}
```

**Note:** Stripe webhooks skip CSRF protection using `@SkipCsrf()` decorator.

---

## 🗄️ Database Setup & Seeding

### Initial Setup

```bash
cd citadelbuy/backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run migrate

# Seed database with test data
npm run db:seed
```

### Seed Data Included

**Users:** 5 users (1 admin, 2 vendors, 2 customers)
**Categories:** 5 categories
**Products:** 13 products (with various stock levels)
**Orders:** 5 sample orders (all statuses represented)

### Reset Database

```bash
# Warning: This will delete all data
npm run migrate:reset

# Re-seed after reset
npm run db:seed
```

---

## 🧪 Testing with Postman/Insomnia

### Import Collection Steps

1. **Create New Request Collection**
2. **Set Base URL:** `http://localhost:4000/api`
3. **Add Environment Variables:**
   - `base_url`: `http://localhost:4000/api`
   - `token`: (will be set after login)

### Authentication Flow

1. **Login:**
   ```
   POST {{base_url}}/auth/login
   Body: { "email": "admin@citadelbuy.com", "password": "password123" }
   ```

2. **Extract Token:**
   Copy `access_token` from response

3. **Set Authorization Header:**
   ```
   Authorization: Bearer {paste_token_here}
   ```

4. **Make Authenticated Requests:**
   All subsequent requests will include the token

---

## 🔒 Security Notes

### Password Security
- All passwords hashed with bcrypt (10 rounds)
- Minimum 8 characters recommended
- Test password `password123` for demo only

### JWT Tokens
- Tokens expire after configured time
- Include user ID and role in payload
- Signed with secret key from `.env`

### CORS
- Development: Allows localhost:3000, localhost:3001
- Production: Configure `CORS_ORIGIN` in `.env`

### Rate Limiting
- 100 requests per minute per IP
- Configured in main.ts
- Adjust for production needs

---

## 📱 Frontend Integration

### API Client Setup

The frontend uses axios with automatic token injection:

```typescript
// Frontend: src/lib/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

export const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true,
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Making API Calls

```typescript
import { api } from '@/lib/api/client';

// Get products
const products = await api.get('/products');

// Create order (authenticated)
const order = await api.post('/orders', orderData);

// Admin: Update product (admin only)
const product = await api.put(`/admin/products/${id}`, updateData);
```

---

## 🚀 Quick Start Guide

### 1. Start Backend
```bash
cd citadelbuy/backend
npm install
npm run prisma:generate
npm run migrate
npm run db:seed
npm run dev
```

Backend runs on: `http://localhost:4000`

### 2. Start Frontend
```bash
cd citadelbuy/frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

### 3. Test Login

**Customer Login:**
1. Go to `http://localhost:3000/auth/login`
2. Email: `customer@citadelbuy.com`
3. Password: `password123`
4. Browse products and place orders

**Admin Login:**
1. Go to `http://localhost:3000/auth/login`
2. Email: `admin@citadelbuy.com`
3. Password: `password123`
4. Navigate to `/admin` for dashboard
5. Manage products and orders

### 4. Explore Swagger
1. Go to `http://localhost:4000/api/docs`
2. Login using credentials above
3. Copy JWT token
4. Click "Authorize" and paste token
5. Test all endpoints interactively

---

## 📊 Sample Data Overview

### Products by Category

- **Electronics (5):** Laptop, Smartphone, Headphones, SmartWatch, Limited Edition Watch
- **Clothing (3):** T-Shirt, Jeans, Leather Jacket
- **Sports & Outdoors (1):** Running Sneakers
- **Books (1):** The Art of Programming
- **Home & Garden (1):** Coffee Maker
- **Out of Stock (1):** Vintage Camera

### Orders by Status

- **DELIVERED (1):** $1,774.98 - Laptop + Headphones
- **SHIPPED (1):** $460.97 - Smartphone + T-Shirts
- **PROCESSING (1):** $515.97 - Jacket + Coffee Maker
- **PENDING (1):** $427.97 - SmartWatch + Sneakers
- **CANCELLED (1):** $92.99 - Jeans

---

## 🔗 Additional Resources

- **Project Documentation:** `/docs`
- **Deployment Guide:** `/docs/DEPLOYMENT-GUIDE.md`
- **Testing Guide:** `/docs/TESTING-GUIDE.md`
- **Security Audit:** `/docs/SECURITY-AUDIT-CHECKLIST.md`
- **Phase Summaries:** `/docs/completed/`

---

## ⚠️ Important Notes

1. **Never commit `.env` files** to version control
2. **Change all passwords** in production
3. **Use environment-specific** API URLs
4. **Enable HTTPS** in production
5. **Configure proper CORS** origins
6. **Set up monitoring** and logging
7. **Regular security audits** recommended

---

**Need Help?**
- Check Swagger documentation: `http://localhost:4000/api/docs`
- Review test files in `/backend/test/` and `/frontend/e2e/`
- Consult deployment guide for production setup

---

**Last Updated:** 2025-11-16
**Maintained By:** CitadelBuy Development Team
