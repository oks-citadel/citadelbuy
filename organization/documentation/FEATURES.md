# Backend Features Documentation

## Completed Features ✅

### Authentication Module (v0.2.0)

#### Endpoints

**POST /api/auth/register**
- Register new user
- Hash password with bcrypt
- Generate JWT token
- Return user data and token
- Body: `{ name, email, password }`

**POST /api/auth/login**
- Authenticate user
- Validate credentials
- Generate JWT token
- Return user data and token
- Body: `{ email, password }`

#### Guards & Strategies

**JWT Strategy**
- Verify JWT tokens
- Extract user from token payload
- Passport integration

**Local Strategy**
- Username/password validation
- User lookup by email
- Password comparison

**Guards**
- `JwtAuthGuard` - Protect routes requiring authentication
- `LocalAuthGuard` - Validate login credentials

---

### User Module (v0.2.0)

#### Endpoints

**GET /api/users/profile**
- Get current user profile
- Requires authentication (JWT)
- Returns user data (excludes password)

#### Service Methods
- `findById(id)` - Get user by ID
- `findByEmail(email)` - Get user by email
- `create(data)` - Create new user

---

### Product Module (v0.2.0)

#### Endpoints

**GET /api/products**
- List all products
- Includes category relation
- Public endpoint

**GET /api/products/:id**
- Get product by ID
- Includes category relation
- Public endpoint

**POST /api/products**
- Create new product
- Requires authentication
- Admin/Vendor only (planned)

#### Service Methods
- `findAll()` - Get all products
- `findOne(id)` - Get product by ID
- `create(data)` - Create product

---

### Order Module (v0.2.0)

#### Endpoints

**GET /api/orders**
- Get user's orders
- Requires authentication
- Includes order items and products

**POST /api/orders**
- Create new order
- Requires authentication
- Associates with current user

#### Service Methods
- `findByUserId(userId)` - Get orders for user
- `create(data)` - Create order

---

### Payment Module (v0.2.0)

#### Endpoints

**POST /api/payments/create-intent**
- Create Stripe payment intent
- Requires authentication
- Body: `{ amount, currency }`
- Returns client secret for frontend

#### Service Methods
- `createPaymentIntent(amount, currency)` - Create Stripe payment intent

---

### Global Features

#### Health & Version

**GET /api**
- Health check endpoint
- Returns: `{ status: 'ok', message: '...' }`

**GET /api/version**
- API version info
- Returns: `{ version, environment }`

#### Security

**Helmet**
- Security headers
- XSS protection
- Content security policy

**CORS**
- Configurable origin
- Credentials support

**Rate Limiting**
- 100 requests per minute per IP
- Configurable window and max

**Password Hashing**
- Bcrypt with salt rounds
- Secure password storage

#### Validation

**Global Validation Pipe**
- Automatic DTO validation
- Class-validator decorators
- Transform and sanitize input
- Whitelist unknown properties

#### Documentation

**Swagger/OpenAPI**
- Auto-generated API docs
- Available at `/api/docs`
- Interactive testing UI
- Schema definitions
- Authentication integration

---

## Database Schema (Prisma)

### Models

**User**
- id (UUID)
- email (unique)
- password (hashed)
- name
- role (CUSTOMER, VENDOR, ADMIN)
- createdAt
- updatedAt
- Relations: orders, products, reviews

**Category**
- id (UUID)
- name (unique)
- slug (unique)
- description
- createdAt
- updatedAt
- Relations: products

**Product**
- id (UUID)
- name
- slug (unique)
- description
- price
- images (array)
- stock
- vendorId
- categoryId
- createdAt
- updatedAt
- Relations: vendor, category, orderItems, reviews

**Order**
- id (UUID)
- userId
- total
- status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
- shipping address fields
- paymentMethod
- paymentIntentId
- createdAt
- updatedAt
- Relations: user, items

**OrderItem**
- id (UUID)
- orderId
- productId
- quantity
- price
- createdAt
- Relations: order, product

**Review**
- id (UUID)
- userId
- productId
- rating (1-5)
- comment
- createdAt
- updatedAt
- Relations: user, product

---

## Planned Features 🔜

### Product Management (v0.3.0)

#### Endpoints
- GET /api/products?search=...&category=...&page=...
- PATCH /api/products/:id
- DELETE /api/products/:id
- POST /api/products/:id/images
- GET /api/categories
- POST /api/categories

#### Features
- Advanced product search
- Filtering and sorting
- Pagination
- Image upload to Azure Blob
- Category CRUD
- Product variants
- Inventory management

---

### Order Management (v0.4.0)

#### Endpoints
- GET /api/orders/:id
- PATCH /api/orders/:id/status
- POST /api/orders/:id/cancel
- GET /api/admin/orders

#### Features
- Order status updates
- Order cancellation
- Admin order management
- Order tracking
- Invoice generation

---

### Payment Integration (v0.5.0)

#### Endpoints
- POST /api/webhooks/stripe
- POST /api/payments/refund
- GET /api/payments/:id

#### Features
- Webhook handling
- Refund processing
- Payment history
- Multiple payment methods

---

### Advanced Features (v0.6.0+)

#### Reviews
- POST /api/products/:id/reviews
- GET /api/products/:id/reviews
- PATCH /api/reviews/:id
- DELETE /api/reviews/:id

#### Search
- Elasticsearch integration
- Full-text search
- Faceted search
- Search suggestions

#### Notifications
- Email service (SendGrid)
- Order confirmation emails
- Shipping notifications
- Password reset emails

#### Analytics
- Sales reports
- User behavior tracking
- Product performance
- Revenue analytics

---

## Technical Stack

### Core
- **Framework**: NestJS 10
- **Language**: TypeScript 5.3
- **Runtime**: Node.js 20

### Database
- **ORM**: Prisma 5.7
- **Database**: PostgreSQL 16
- **Cache**: Redis 7

### Authentication
- **JWT**: @nestjs/jwt
- **Passport**: passport-jwt, passport-local
- **Hashing**: bcrypt

### Validation
- **Library**: class-validator, class-transformer
- **Schema**: Zod (for some validation)

### Payments
- **Provider**: Stripe 14.10

### Documentation
- **Library**: @nestjs/swagger
- **Format**: OpenAPI 3.0

### Testing
- **Framework**: Jest
- **E2E**: Supertest

---

## Architecture

### Modular Structure
```
src/
├── modules/
│   ├── auth/          # Authentication
│   ├── users/         # User management
│   ├── products/      # Product management
│   ├── orders/        # Order management
│   └── payments/      # Payment processing
├── common/
│   ├── guards/        # Auth guards
│   ├── filters/       # Exception filters
│   ├── interceptors/  # Request/response interceptors
│   └── prisma/        # Database service
├── config/            # Configuration
├── app.module.ts      # Root module
└── main.ts           # Bootstrap
```

### Design Patterns
- **Dependency Injection** - NestJS built-in
- **Repository Pattern** - Prisma service
- **Guard Pattern** - Authentication
- **Strategy Pattern** - Passport strategies
- **Middleware Pattern** - Request processing

---

## Security

### Implemented
- JWT authentication
- Password hashing (bcrypt, 10 rounds)
- CORS protection
- Helmet security headers
- Rate limiting
- Input validation
- SQL injection prevention (Prisma)

### Planned
- Refresh tokens
- Token blacklisting
- 2FA authentication
- API key management
- IP whitelisting
- Audit logging
- CSRF protection

---

## Performance

### Optimizations
- Database indexes on frequently queried fields
- Connection pooling (Prisma)
- Redis caching (planned)
- Query optimization
- Compression middleware

### Monitoring
- Request logging
- Error tracking
- Performance metrics (planned)
- Database query logging

---

## Error Handling

### HTTP Status Codes
- 200 - Success
- 201 - Created
- 400 - Bad Request (validation errors)
- 401 - Unauthorized (missing/invalid token)
- 403 - Forbidden (insufficient permissions)
- 404 - Not Found
- 409 - Conflict (duplicate resource)
- 500 - Internal Server Error

### Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

---

## Testing

### Current Coverage
- No tests yet

### Planned Tests
- Unit tests for services
- Integration tests for controllers
- E2E tests for API endpoints
- Database tests with test containers

---

## API Examples

### Register User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Profile
```bash
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List Products
```bash
curl http://localhost:4000/api/products
```

### Create Payment Intent
```bash
curl -X POST http://localhost:4000/api/payments/create-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "usd"
  }'
```

---

## Environment Variables

### Required
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=your-secret-key
```

### Optional
```env
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
REDIS_URL=redis://localhost:6379
```

---

## Migration Guide

### Running Migrations
```bash
# Create migration
npm run migrate -- --name migration_name

# Apply migrations
npm run migrate:deploy

# Reset database (dev only)
npm run migrate:reset
```

### Seeding Database
```bash
npm run db:seed
```

---

**Last Updated**: November 16, 2025
**Version**: 0.2.0
