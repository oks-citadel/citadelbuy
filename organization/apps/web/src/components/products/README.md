# Product Status Toggle Feature

This directory contains the Product Status Toggle feature for the CitadelBuy admin products page.

## Components

### ProductStatusToggle

A reusable toggle switch component for managing product active/inactive status.

**Location:** `components/products/ProductStatusToggle.tsx`

**Features:**
- Toggle product isActive status with a smooth switch UI
- Loading state while updating
- Toast notifications for success/error feedback
- Optimistic UI updates
- Proper error handling

**Props:**
```typescript
interface ProductStatusToggleProps {
  productId: string;           // Product ID to update
  initialStatus: boolean;       // Initial isActive state
  onStatusChange?: (productId: string, newStatus: boolean) => void; // Callback
  disabled?: boolean;           // Disable the toggle
}
```

**Usage:**
```tsx
import { ProductStatusToggle } from '@/components/products/ProductStatusToggle';

<ProductStatusToggle
  productId="product-123"
  initialStatus={true}
  onStatusChange={(id, status) => console.log(`Product ${id} is now ${status ? 'active' : 'inactive'}`)}
/>
```

## API Integration

### Product API Service

**Location:** `services/product-api.ts`

The API service provides methods for:
- Getting all products with filters
- Updating individual product status
- Bulk updating product statuses
- Bulk archiving products
- Exporting products

**Key Methods:**
```typescript
// Update single product status
adminProductsApi.updateStatus(productId, isActive);

// Bulk update status
adminProductsApi.bulkUpdateStatus(productIds, isActive);

// Bulk archive
adminProductsApi.bulkArchive(productIds);
```

## Admin Products Page Integration

### Features Added

1. **Individual Product Toggle**
   - Each product row has a toggle switch in the "Active" column
   - Real-time status updates
   - Visual feedback with loading spinner

2. **Active/Inactive Filter**
   - Filter dropdown to show:
     - All Products
     - Active Only
     - Inactive Only

3. **Bulk Operations**
   - Activate selected products
   - Deactivate selected products
   - Archive selected products
   - Visual feedback for bulk operations

4. **Updated Statistics**
   - Active Products count
   - Inactive Products count
   - Total Products count
   - Out of Stock count

### Backend API Endpoints

The implementation expects these API endpoints:

```
PATCH /api/v1/products/:id
Body: { isActive: boolean }
Response: Updated product object

GET /api/v1/products
Query: ?isActive=true/false
Response: Filtered products list

PATCH /api/v1/products/bulk-status
Body: { productIds: string[], isActive: boolean }
Response: { success: boolean, updated: number }

POST /api/v1/products/bulk-archive
Body: { productIds: string[] }
Response: { success: boolean, archived: number }
```

## Toast Notifications

The implementation uses `sonner` for toast notifications:

**Success Messages:**
- "Product activated successfully" - When single product is activated
- "Product deactivated successfully" - When single product is deactivated
- "X product(s) activated successfully" - Bulk activation
- "X product(s) deactivated successfully" - Bulk deactivation
- "X product(s) archived successfully" - Bulk archive

**Error Messages:**
- "Failed to update product status" - Single product update error
- "Failed to activate products" - Bulk activation error
- "Failed to deactivate products" - Bulk deactivation error
- "Failed to archive products" - Bulk archive error

## UI Components Used

- `Switch` from `@/components/ui/switch` (shadcn/ui)
- `Button` from `@/components/ui/button`
- `Badge` from `@/components/ui/badge`
- `Card` from `@/components/ui/card`
- `Input` from `@/components/ui/input`
- Icons from `lucide-react`: Power, PowerOff, Archive, Trash2

## State Management

The admin products page manages:
- Products list state
- Selected products for bulk operations
- Filter states (search, category, status, active/inactive)
- Loading states for async operations

## Demo Data

Demo products include both active and inactive products for testing:
- Product 1, 2, 4, 5: isActive = true
- Product 3, 6: isActive = false

## Future Enhancements

Potential improvements:
1. Add confirmation dialogs for bulk operations
2. Implement undo functionality
3. Add activity log for status changes
4. Add scheduled activation/deactivation
5. Add reasons for deactivation
6. Add batch edit mode
