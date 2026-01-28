# Cart Module

Shopping cart management with session handling, abandonment recovery, and real-time stock validation.

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/cart` | Get current cart | Yes |
| POST | `/api/cart/items` | Add item to cart | Yes |
| PUT | `/api/cart/items/:id` | Update cart item quantity | Yes |
| DELETE | `/api/cart/items/:id` | Remove item from cart | Yes |
| DELETE | `/api/cart` | Clear cart | Yes |
| POST | `/api/cart/merge` | Merge guest cart with user cart | Yes |

### Cart Abandonment

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/cart-abandonment/stats` | Get abandonment statistics | Yes (Admin) |
| POST | `/api/cart-abandonment/recover/:id` | Trigger recovery email | Yes (Admin) |

## Response Format

```json
{
  "id": "cart-123",
  "items": [
    {
      "id": "item-123",
      "productId": "prod-123",
      "variantId": "var-123",
      "quantity": 2,
      "price": 149.99,
      "subtotal": 299.98,
      "product": {
        "name": "Product Name",
        "image": "https://cdn.broxiva.com/..."
      }
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

## Services

- `CartService` - Cart CRUD operations
- `CartAbandonmentService` - Recovery email automation

## Features

- **Session Management**: Carts persist in Redis for quick access
- **Stock Validation**: Real-time inventory checks
- **Price Locking**: Prices cached at add time, recalculated at checkout
- **Guest Cart Merging**: Anonymous carts merge on login
- **Abandonment Recovery**: Automated emails for abandoned carts

## Related Modules

- `CheckoutModule` - Cart to order conversion
- `CouponsModule` - Discount application
- `InventoryModule` - Stock validation
