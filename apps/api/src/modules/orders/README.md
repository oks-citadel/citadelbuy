# Orders Module

Order management with full lifecycle tracking, multi-vendor support, and admin tools.

## Endpoints

### Customer Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/orders` | List user orders | Yes |
| GET | `/api/orders/:id` | Get order details | Yes |
| POST | `/api/orders/:id/cancel` | Cancel order | Yes |

### Admin Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/admin/orders` | List all orders | Yes (Admin) |
| GET | `/api/admin/orders/:id` | Get order details | Yes (Admin) |
| PUT | `/api/admin/orders/:id/status` | Update order status | Yes (Admin) |
| POST | `/api/admin/orders/:id/refund` | Process refund | Yes (Admin) |

## Order Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Order created, awaiting payment |
| `CONFIRMED` | Payment received, processing |
| `PROCESSING` | Order being prepared |
| `SHIPPED` | Order dispatched |
| `DELIVERED` | Order delivered |
| `CANCELLED` | Order cancelled |
| `REFUNDED` | Order refunded |

## Query Parameters

### List Orders (`GET /api/orders`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `status` | string | Filter by status |

## Services

- `OrdersService` - Order CRUD and business logic
- Order status transitions
- Multi-vendor order splitting
- Refund processing

## Events

Orders emit events for integration with other services:

- `order.created`
- `order.confirmed`
- `order.shipped`
- `order.delivered`
- `order.cancelled`

## Related Modules

- `CheckoutModule` - Order creation from cart
- `PaymentsModule` - Payment processing
- `ShippingModule` - Shipping and tracking
- `ReturnsModule` - Return merchandise authorization
