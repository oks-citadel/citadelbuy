# Checkout Module

Multi-step checkout process supporting standard, express, and guest checkout flows.

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/checkout` | Create checkout session | Yes |
| POST | `/api/checkout/complete` | Complete checkout | Yes |
| GET | `/api/checkout/:id` | Get checkout status | Yes |
| POST | `/api/checkout/validate-address` | Validate shipping address | Yes |
| POST | `/api/checkout/apply-coupon` | Apply coupon code | Yes |
| POST | `/api/checkout/calculate-tax` | Calculate taxes | Yes |
| POST | `/api/checkout/shipping-rates` | Get shipping rates | Yes |

## Checkout Flow

1. **Cart Review** - Validate cart items and stock
2. **Shipping Address** - Collect/validate shipping information
3. **Shipping Method** - Select carrier and service level
4. **Payment** - Process payment through selected provider
5. **Confirmation** - Order created, confirmation email sent

## Request Body (Create Checkout)

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
    "sameAsShipping": true
  },
  "paymentMethod": "stripe",
  "couponCode": "SAVE10"
}
```

## Response Format

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

## Services

- `CheckoutService` - Core checkout orchestration
- Address validation
- Tax calculation integration
- Shipping rate aggregation
- Payment intent creation

## Express Checkout

Supports saved payment methods and addresses for one-click checkout:

```json
{
  "savedAddressId": "addr-123",
  "savedPaymentMethodId": "pm-123"
}
```

## Guest Checkout

Allows checkout without account:

```json
{
  "guestEmail": "guest@example.com",
  "shippingAddress": { ... }
}
```

## Related Modules

- `CartModule` - Cart data source
- `PaymentsModule` - Payment processing
- `ShippingModule` - Shipping rates and labels
- `TaxModule` - Tax calculation
- `CouponsModule` - Discount validation
