# Products Module

Product catalog management with variants, categories, and full-text search.

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/products` | List products with pagination | No |
| GET | `/api/products/:id` | Get product details | No |
| GET | `/api/products/search` | Search products | No |
| POST | `/api/products` | Create product | Yes (Vendor/Admin) |
| PUT | `/api/products/:id` | Update product | Yes (Owner/Admin) |
| DELETE | `/api/products/:id` | Delete product | Yes (Owner/Admin) |

## Query Parameters

### List Products (`GET /api/products`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `category` | string | Filter by category ID |
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |
| `sort` | string | Sort order: `price-asc`, `price-desc`, `name-asc`, `name-desc`, `date-desc` |
| `inStock` | boolean | Filter in-stock products only |

## Services

- `ProductsService` - CRUD operations and business logic

## Related Modules

- `CategoriesModule` - Product categorization
- `VariantsModule` - Product variants (size, color, etc.)
- `InventoryModule` - Stock management
- `ReviewsModule` - Product reviews and ratings

## Usage

```typescript
import { ProductsService } from './products.service';

// Get products with filters
const products = await productsService.findAll({
  page: 1,
  limit: 20,
  category: 'electronics',
  minPrice: 50,
  maxPrice: 500,
});
```
