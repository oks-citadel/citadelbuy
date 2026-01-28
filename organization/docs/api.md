# Broxiva API Documentation

## Overview

The Broxiva API is a RESTful API that provides access to the global marketplace platform. This document covers API versioning, authentication, tenant isolation, error handling, and rate limiting.

## Base URL

```
Production: https://api.broxiva.com
Staging: https://api-staging.broxiva.com
Development: http://localhost:3000
```

## API Versioning Strategy

### Version Format

All API endpoints use URL path versioning with the format `/api/v{version}/`.

- **Current Version**: `v1`
- **Version Header**: Responses include `X-API-Version: 1` header

### Versioned Endpoints

```
GET  /api/v1/products           - Products list with localization
GET  /api/v1/products/:id       - Product details
POST /api/v1/preferences        - Save user preferences
GET  /api/v1/fx/quote           - Get FX exchange rate
POST /api/v1/fx/convert         - Convert currency
GET  /api/v1/currencies         - List supported currencies
POST /api/v1/webhooks/products/sync       - Product sync webhook
POST /api/v1/webhooks/translations/complete - Translation webhook
```

### Deprecation Policy

- Deprecated versions will be supported for 12 months after deprecation notice
- Deprecation notices are sent via `Deprecation` and `Sunset` headers
- Email notifications are sent to API users 90, 60, and 30 days before sunset

---

## Authentication Requirements

### JWT Authentication

Most endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer <jwt_token>
```

### Obtaining Tokens

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Public Endpoints (No Auth Required)

- `GET /api/v1/products` - Public product listing
- `GET /api/v1/fx/quote` - FX rates
- `GET /api/v1/currencies` - Currency list
- `GET /api/health` - Health check

---

## Tenant Isolation

### Multi-Tenant Architecture

Broxiva uses strict tenant isolation to ensure data security across organizations.

### Tenant Context Headers

```http
X-BX-Tenant: <organization_id>
```

The tenant ID can be provided via:
1. `X-BX-Tenant` header (highest priority)
2. JWT claim `tenantId` or `organizationId`
3. Extracted from authenticated user's organization

### Tenant-Required Endpoints

Endpoints marked with `@RequireTenant()` will return `403 Forbidden` if no valid tenant context is provided:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Tenant context required. Please provide x-bx-tenant header or authenticate with a tenant.",
  "errorCode": "TENANT_REQUIRED"
}
```

### Cross-Tenant Access Protection

All database queries are automatically filtered by `organizationId` when a tenant context is active. Attempts to access resources from other tenants are:
- Blocked with `403 Forbidden`
- Logged for security monitoring
- Tracked in audit logs

### Security Events Logged

```json
{
  "event": "cross_tenant_access_attempt",
  "method": "GET",
  "url": "/api/v1/products/123",
  "traceId": "abc123",
  "userId": "user-456",
  "userTenantId": "tenant-A",
  "targetTenantId": "tenant-B",
  "timestamp": "2026-01-27T12:00:00Z"
}
```

---

## Trace ID Propagation

### Request Tracing

Every request is assigned a trace ID for distributed tracing and debugging.

### Headers

```http
# Request (optional - will be generated if not provided)
X-BX-Trace-Id: <trace_id>
X-BX-Span-Id: <span_id>
X-BX-Parent-Span-Id: <parent_span_id>

# Response (always included)
X-BX-Trace-Id: abc123-xyz789
X-BX-Span-Id: def456
```

### Response Meta

All responses include trace information in the `meta` object:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "traceId": "abc123-xyz789",
    "timestamp": "2026-01-27T12:00:00Z",
    "duration": 45
  }
}
```

### Using Trace IDs

Include the `traceId` when reporting issues or debugging requests:
- Support tickets should include the trace ID
- Log aggregation systems can search by trace ID
- Distributed traces can be correlated across services

---

## Error Response Format

### Standard Error Response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Human-readable error description",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "constraint": "isEmail"
  },
  "meta": {
    "traceId": "abc123",
    "timestamp": "2026-01-27T12:00:00Z"
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_TOKEN` | 401 | JWT token is invalid |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `TOKEN_MISSING` | 401 | No authentication token provided |
| `TENANT_REQUIRED` | 403 | Tenant context is required |
| `INVALID_TENANT` | 403 | Tenant ID is invalid or inactive |
| `CROSS_TENANT_ACCESS_DENIED` | 403 | Attempted cross-tenant access |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `DUPLICATE_WEBHOOK` | 409 | Webhook already processed (replay) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |

### Safe Error Handling

**Production Mode:**
- Stack traces are never exposed
- Internal error details are hidden
- Generic messages for 500 errors

**Development Mode:**
- Stack traces included
- Detailed error information
- Query parameters logged

---

## Rate Limiting

### Default Limits

| Tier | Requests/Minute | Requests/Hour |
|------|----------------|---------------|
| Anonymous | 60 | 1,000 |
| Authenticated | 120 | 5,000 |
| Premium | 300 | 15,000 |
| Enterprise | Custom | Custom |

### Rate Limit Headers

```http
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1706360400
Retry-After: 45
```

### Rate Limit Response

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

### Endpoint-Specific Limits

Some endpoints have specific rate limits:

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/login` | 10/minute |
| `POST /api/v1/webhooks/*` | 100/minute |
| `GET /api/v1/fx/quote` | 60/minute |

---

## Webhook Security

### Signature Verification

Webhooks include HMAC-SHA256 signatures:

```http
X-Webhook-Signature: sha256=abc123...
X-Webhook-Timestamp: 1706360400
X-Webhook-Id: webhook-delivery-123
```

### Verifying Signatures

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Replay Protection

- Each webhook has a unique `X-Webhook-Id`
- IDs are tracked for 1 hour to prevent replay
- Duplicate webhooks return `409 Conflict`
- Timestamp must be within 5 minutes

---

## Currency & Localization

### FX Quote Endpoint

```http
GET /api/v1/fx/quote?base=USD&quote=EUR&amount=100
```

Response:
```json
{
  "baseCurrency": "USD",
  "quoteCurrency": "EUR",
  "rate": 0.92,
  "inverseRate": 1.087,
  "convertedAmount": 92.00,
  "timestamp": "2026-01-27T12:00:00Z",
  "validForSeconds": 60,
  "source": "ECB"
}
```

### Localized Product Prices

```http
GET /api/v1/products?currency=EUR&locale=de
```

Response includes:
```json
{
  "products": [{
    "id": "123",
    "name": "Product",
    "price": 99.99,
    "localizedPrice": {
      "originalPrice": 99.99,
      "originalCurrency": "USD",
      "localizedPrice": 91.99,
      "localizedCurrency": "EUR",
      "formattedPrice": "91,99 EUR",
      "rate": 0.92
    }
  }]
}
```

---

## Supported Currencies

30+ currencies supported including:
- USD, EUR, GBP, JPY, CHF, CAD, AUD
- CNY, HKD, SGD, INR, KRW
- MXN, BRL, ZAR, SEK, NOK, DKK
- And more...

Full list: `GET /api/v1/currencies`

---

## Contact

For API support:
- Email: api-support@broxiva.com
- Status: https://status.broxiva.com
- Documentation: https://docs.broxiva.com
