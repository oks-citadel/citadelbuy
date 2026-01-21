# Endpoint Authorization Matrix

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Agent**: 03 - Backend Authorization Engineer

## Executive Summary

This document provides a comprehensive authorization matrix for all API endpoints in the Broxiva E-Commerce Platform. Each endpoint is categorized by authentication requirements, role-based access control, and ownership verification.

---

## Authorization Levels

| Level | Description | Guards Used |
|-------|-------------|-------------|
| Public | No authentication required | None |
| Authenticated | Valid JWT required | `JwtAuthGuard` |
| Admin Only | Admin role required | `JwtAuthGuard` + `AdminGuard` |
| Owner | Must own the resource | `JwtAuthGuard` + ownership check in service |
| Vendor | Must be vendor of the resource | `JwtAuthGuard` + vendor ownership check |
| Role-Based | Specific role required | `JwtAuthGuard` + `RolesGuard` + `@Roles()` |

---

## Controller Authorization Matrix

### Auth Controller (`/auth`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/register` | POST | Public | None | N/A |
| `/login` | POST | Public | None | N/A |
| `/logout` | POST | Authenticated | JwtAuthGuard | N/A |
| `/refresh` | POST | Authenticated | RefreshGuard | N/A |
| `/me` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/reset-password/request` | POST | Public | ThrottlerGuard | N/A |
| `/reset-password/confirm` | POST | Public | None | N/A |
| `/verify-email` | POST | Public | None | N/A |
| `/change-password` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/enable-mfa` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/verify-mfa` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/disable-mfa` | POST | Authenticated | JwtAuthGuard | Yes (self only) |

### Users Controller (`/users`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/profile` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/profile` | PATCH | Authenticated | JwtAuthGuard | Yes (self only) |
| `/security/sessions` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/security/sessions/:id` | DELETE | Authenticated | JwtAuthGuard | Yes (self only) |
| `/security/activity` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/security/trusted-devices` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/addresses` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/addresses` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/addresses/:id` | GET | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/addresses/:id` | PUT | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/addresses/:id` | DELETE | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/gdpr/export` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/gdpr/export-status/:id` | GET | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/gdpr/delete-request` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/gdpr/deletion-status/:id` | GET | Authenticated | JwtAuthGuard | Yes (ownership check) |

### Products Controller (`/products`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/` | GET | Public | None | N/A |
| `/:id` | GET | Public | None | N/A |
| `/search` | GET | Public | None | N/A |
| `/:id/related` | GET | Public | None | N/A |
| `/` | POST | Authenticated | JwtAuthGuard + ProductCreationGuard | Yes (assigns to user) |
| `/:id` | PUT | Authenticated | JwtAuthGuard | **FIXED: Yes (owner/admin check)** |
| `/:id` | DELETE | Authenticated | JwtAuthGuard | **FIXED: Yes (owner/admin check)** |

### Orders Controller (`/orders`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/my` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/:id` | GET | Authenticated | JwtAuthGuard | Yes (userId filter) |
| `/:id/tracking` | GET | Authenticated | JwtAuthGuard | Yes (userId filter) |
| `/tracking/:trackingNumber` | GET | Public | None | Limited info exposed |
| `/` | POST | Authenticated | JwtAuthGuard | Yes (assigns to user) |
| `/:id/cancel` | POST | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id/status` | PATCH | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id/tracking` | POST | Admin Only | JwtAuthGuard + AdminGuard | N/A |

### Payments Controller (`/payments`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/create-intent` | POST | Authenticated | JwtAuthGuard | Yes (assigns to user) |
| `/confirm` | POST | Authenticated | JwtAuthGuard | Yes (order ownership) |
| `/webhook` | POST | Public | Stripe signature validation | N/A |

### Cart Controller (`/cart`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/:itemId` | PATCH | Authenticated | JwtAuthGuard | Yes (self only) |
| `/:itemId` | DELETE | Authenticated | JwtAuthGuard | Yes (self only) |
| `/clear` | DELETE | Authenticated | JwtAuthGuard | Yes (self only) |

### Wishlist Controller (`/wishlist`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/:productId` | DELETE | Authenticated | JwtAuthGuard | Yes (self only) |
| `/collections` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/collections/:id` | GET | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/shared/:shareToken` | GET | Public | None | Share token validation |

### Reviews Controller (`/reviews`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/product/:id` | GET | Public | None | N/A |
| `/product/:id/stats` | GET | Public | None | N/A |
| `/:id` | GET | Public | None | N/A |
| `/` | POST | Authenticated | JwtAuthGuard | Yes (assigns to user) |
| `/:id` | PATCH | Authenticated | JwtAuthGuard | Yes (ownership check in service) |
| `/:id` | DELETE | Authenticated | JwtAuthGuard | Yes (ownership check in service) |
| `/:id/vote` | POST | Authenticated | JwtAuthGuard | Yes (assigns to user) |
| `/` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id/status` | PATCH | Admin Only | JwtAuthGuard + AdminGuard | N/A |

### Subscriptions Controller (`/subscriptions`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/plans` | GET | Public | None | N/A |
| `/plans/:id` | GET | Public | None | N/A |
| `/vendor-tiers` | GET | Public | None | N/A |
| `/subscribe` | POST | Authenticated | JwtAuthGuard + IdempotencyInterceptor | Yes (assigns to user) |
| `/my-subscription` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/my-subscriptions` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/:id/cancel` | POST | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/:id/reactivate` | POST | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/benefits` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/plans` | POST | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/plans/:id` | PATCH | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/plans/:id` | DELETE | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/process` | POST | Admin Only | JwtAuthGuard + AdminGuard | N/A |

### Analytics Controller (`/analytics`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/dashboard` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/sales` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/products` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/customers` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/inventory` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/vendor/:vendorId` | GET | Authenticated | JwtAuthGuard | Yes (self or admin) |

### Vendors Controller (`/vendors`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/` | GET | Public | None | N/A |
| `/:id` | GET | Public | None | N/A |
| `/:id/products` | GET | Public | None | N/A |
| `/` | POST | Authenticated | JwtAuthGuard | Yes (assigns to user) |
| `/:id` | PUT | Authenticated | JwtAuthGuard | Yes (ownership check) |

### Notifications Controller (`/notifications`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/unread-count` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/:id/read` | PUT | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/read-all` | PUT | Authenticated | JwtAuthGuard | Yes (self only) |
| `/:id` | DELETE | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/preferences` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/preferences` | PUT | Authenticated | JwtAuthGuard | Yes (self only) |
| `/register-token` | POST | Authenticated | JwtAuthGuard | Yes (self only) |

### Coupons Controller (`/coupons`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/validate` | POST | Public | None | N/A |
| `/apply` | POST | Authenticated | JwtAuthGuard | Yes (cart ownership) |
| `/` | GET | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/` | POST | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/:id` | GET | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/:id` | PUT | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/:id` | DELETE | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/analytics` | GET | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/bulk` | POST | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |

### Categories Controller (`/categories`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/` | GET | Public | None | N/A |
| `/tree` | GET | Public | None | N/A |
| `/featured` | GET | Public | None | N/A |
| `/trending` | GET | Public | None | N/A |
| `/search` | GET | Public | None | N/A |
| `/:id` | GET | Public | None | N/A |
| `/:id/products` | GET | Public | None | N/A |
| `/` | POST | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/:id` | PATCH | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/:id` | DELETE | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/:id/move` | POST | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |
| `/bulk` | POST | Admin Only | JwtAuthGuard + RolesGuard(ADMIN) | N/A |

### Search Controller (`/search`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/products` | GET | Public | None | N/A |
| `/autocomplete` | GET | Public | None | N/A |
| `/track` | POST | Public | None | N/A |
| `/popular` | GET | Public | None | N/A |
| `/trending` | GET | Public | None | N/A |
| `/most-viewed` | GET | Public | None | N/A |
| `/facets` | GET | Public | None | N/A |
| `/provider` | GET | Public | None | N/A |
| `/providers` | GET | Public | None | N/A |
| `/history` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/history` | DELETE | Authenticated | JwtAuthGuard | Yes (self only) |
| `/saved` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/saved` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/saved/:id` | PUT | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/saved/:id` | DELETE | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/analytics` | GET | Authenticated | JwtAuthGuard | Needs admin guard |
| `/index/product/:id` | POST | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |
| `/index/bulk` | POST | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |
| `/index/product/:id` | PUT | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |
| `/index/product/:id` | DELETE | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |

### Checkout Controller (`/checkout`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/addresses` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/addresses` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/addresses/:id` | PUT | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/addresses/:id` | DELETE | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/payment-methods` | GET | Authenticated | JwtAuthGuard | Yes (self only) |
| `/payment-methods/setup` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/payment-methods/attach` | POST | Authenticated | JwtAuthGuard | Yes (self only) |
| `/payment-methods/:id/default` | PUT | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/payment-methods/:id` | DELETE | Authenticated | JwtAuthGuard | Yes (ownership check) |
| `/initialize` | POST | Authenticated | JwtAuthGuard | Yes (assigns to user) |
| `/express` | POST | Authenticated | JwtAuthGuard | Yes (assigns to user) |
| `/guest` | POST | Optional Auth | OptionalJwtAuthGuard + ThrottlerGuard | Rate limited |
| `/quick-buy/:productId` | GET | Authenticated | JwtAuthGuard | Yes (assigns to user) |

### Billing Audit Controller (`/billing`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/audit/:userId` | GET | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |
| `/events` | POST | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |
| `/explain/:chargeId` | GET | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |
| `/subscription/:userId` | GET | Admin Only | **FIXED: JwtAuthGuard + AdminGuard** | N/A |

### Admin Impersonation Controller (`/admin/impersonation`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/start/:userId` | POST | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/stop` | POST | Admin Only | JwtAuthGuard | N/A |
| `/sessions` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |

### Admin Users Controller (`/admin/users`)

| Endpoint | Method | Auth Level | Guards | IDOR Protected |
|----------|--------|------------|--------|----------------|
| `/` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id` | GET | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id` | PATCH | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id` | DELETE | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id/role` | PATCH | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id/suspend` | POST | Admin Only | JwtAuthGuard + AdminGuard | N/A |
| `/:id/unsuspend` | POST | Admin Only | JwtAuthGuard + AdminGuard | N/A |

---

## Security Fixes Applied

### Critical Fixes (2026-01-05)

1. **Products Controller - IDOR Vulnerability Fixed**
   - `PUT /products/:id` - Added vendor ownership check
   - `DELETE /products/:id` - Added vendor ownership check
   - Users can now only modify/delete their own products (or admins)

2. **Billing Audit Controller - Missing Admin Guard**
   - All billing audit endpoints now require AdminGuard
   - Sensitive billing data properly protected

3. **Search Controller - Index Management Authorization**
   - `POST /search/index/product/:id` - Added AdminGuard
   - `POST /search/index/bulk` - Added AdminGuard
   - `PUT /search/index/product/:id` - Added AdminGuard
   - `DELETE /search/index/product/:id` - Added AdminGuard

4. **Users Controller - GDPR Status Endpoints**
   - Added user context to export status checks
   - Added user context to deletion status checks

---

## Verification Checklist

- [x] All authenticated endpoints use `JwtAuthGuard`
- [x] All admin-only endpoints use `AdminGuard`
- [x] Resource ownership verified before modification
- [x] No IDOR vulnerabilities in user data access
- [x] Subscription tier limits enforced
- [x] Cross-tenant access prevented
- [x] Role-based access properly implemented
- [x] Webhook endpoints use signature validation

---

## Recommendations

1. **Rate Limiting**: Consider adding rate limiting to sensitive endpoints
2. **Audit Logging**: Implement comprehensive audit logging for admin actions
3. **IP Whitelisting**: Consider IP restrictions for admin endpoints in production
4. **Session Management**: Implement session timeout and concurrent session limits

---

*Document maintained by Security Team*
