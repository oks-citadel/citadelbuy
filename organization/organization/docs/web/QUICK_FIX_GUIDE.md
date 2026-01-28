# Quick Fix Guide - Error Handling

## Overview
This guide provides copy-paste ready code to fix all silent error catches in the web frontend.

## Prerequisites
1. Stop the development server (`npm run dev` or `pnpm dev`)
2. Have a code editor open
3. Make backups if desired

---

## Fix 1: payment-methods/page.tsx

### Step 1.1: Update Imports (Line 6-16)
**Find this block:**
```typescript
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  Shield,
  AlertTriangle,
} from 'lucide-react';
```

**Replace with:**
```typescript
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  Shield,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
```

### Step 1.2: Add Toast Import (After line 16)
**Add after the `SavedPaymentMethod` import:**
```typescript
import { toast } from 'sonner';
```

### Step 1.3: Add Error States (After line 29)
**Find:**
```typescript
const [showAddCard, setShowAddCard] = useState(false);
```

**Add after it:**
```typescript
const [loadError, setLoadError] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
```

### Step 1.4: Fix loadPaymentMethods Function
**Find (around line 40-50):**
```typescript
const loadPaymentMethods = async () => {
  setIsLoading(true);
  try {
    const data = await paymentMethodsApi.getPaymentMethods();
    setPaymentMethods(data || []);
  } catch (error) {
    console.error('Failed to load payment methods');
  } finally {
    setIsLoading(false);
  }
};
```

**Replace with:**
```typescript
const loadPaymentMethods = async () => {
  setIsLoading(true);
  setLoadError(null);
  try {
    const data = await paymentMethodsApi.getPaymentMethods();
    setPaymentMethods(data || []);
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load payment methods';
    console.error('Failed to load payment methods:', error);
    setLoadError(errorMessage);
    toast.error(errorMessage, {
      description: 'Please try refreshing the page',
      action: {
        label: 'Retry',
        onClick: () => loadPaymentMethods(),
      },
    });
  } finally {
    setIsLoading(false);
  }
};
```

### Step 1.5: Fix handleDelete Function
**Find:**
```typescript
const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to remove this payment method?')) return;
  try {
    await paymentMethodsApi.deletePaymentMethod(id);
    setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
  } catch (error) {
    console.error('Failed to delete payment method');
  }
};
```

**Replace with:**
```typescript
const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to remove this payment method?')) return;

  setDeletingId(id);
  try {
    await paymentMethodsApi.deletePaymentMethod(id);
    setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
    toast.success('Payment method removed successfully');
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete payment method';
    console.error('Failed to delete payment method:', error);
    toast.error(errorMessage, {
      description: 'Please try again or contact support if the issue persists',
      action: {
        label: 'Retry',
        onClick: () => handleDelete(id),
      },
    });
  } finally {
    setDeletingId(null);
  }
};
```

### Step 1.6: Fix handleSetDefault Function
**Find:**
```typescript
const handleSetDefault = async (id: string) => {
  try {
    await paymentMethodsApi.setDefaultPaymentMethod(id);
    setPaymentMethods(
      paymentMethods.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    );
  } catch (error) {
    console.error('Failed to set default payment method');
  }
};
```

**Replace with:**
```typescript
const handleSetDefault = async (id: string) => {
  setSettingDefaultId(id);
  try {
    await paymentMethodsApi.setDefaultPaymentMethod(id);
    setPaymentMethods(
      paymentMethods.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    );
    toast.success('Default payment method updated');
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to set default payment method';
    console.error('Failed to set default payment method:', error);
    toast.error(errorMessage, {
      description: 'Please try again or contact support if the issue persists',
      action: {
        label: 'Retry',
        onClick: () => handleSetDefault(id),
      },
    });
  } finally {
    setSettingDefaultId(null);
  }
};
```

### Step 1.7: Add Error State UI
**Find the loading check (around line 95):**
```typescript
if (isLoading) {
  return (
    // ... loading UI
  );
}
```

**Add AFTER that entire block:**
```typescript
// Error state UI
if (loadError && paymentMethods.length === 0) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
      </div>
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Failed to Load Payment Methods
          </h3>
          <p className="text-red-700 mb-4">{loadError}</p>
          <Button onClick={loadPaymentMethods} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 1.8: Update Delete Button
**Find the delete button in the map (around line 280):**
```typescript
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-red-600"
  onClick={() => handleDelete(method.id)}
>
  <Trash2 className="w-4 h-4" />
</Button>
```

**Replace with:**
```typescript
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-red-600"
  onClick={() => handleDelete(method.id)}
  disabled={deletingId === method.id}
>
  {deletingId === method.id ? (
    <RefreshCw className="w-4 h-4 animate-spin" />
  ) : (
    <Trash2 className="w-4 h-4" />
  )}
</Button>
```

### Step 1.9: Update Set Default Button
**Find the set default button (around line 295):**
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => handleSetDefault(method.id)}
>
  <Check className="w-3 h-3 mr-1" />
  Set as Default
</Button>
```

**Replace with:**
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => handleSetDefault(method.id)}
  disabled={settingDefaultId === method.id}
>
  {settingDefaultId === method.id ? (
    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
  ) : (
    <Check className="w-3 h-3 mr-1" />
  )}
  Set as Default
</Button>
```

---

## Fix 2: checkout/page.tsx

### Step 2.1: Fix Shipping Rates Error (Around line 193)
**Find:**
```typescript
} catch (error) {
  console.error('Failed to fetch shipping rates:', error);
  // Keep default shipping options on error
}
```

**Replace with:**
```typescript
} catch (error: any) {
  const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch shipping rates';
  console.error('Failed to fetch shipping rates:', error);
  toast.error(errorMessage, {
    description: 'Using default shipping options',
  });
  // Keep default shipping options on error
}
```

### Step 2.2: Fix Fraud Check Error (Around line 228)
**Find:**
```typescript
} catch (error) {
  console.error('Fraud check failed:', error);
}
```

**Replace with:**
```typescript
} catch (error: any) {
  const errorMessage = error?.response?.data?.message || error?.message || 'Fraud check temporarily unavailable';
  console.error('Fraud check failed:', error);
  toast.warning(errorMessage, {
    description: 'Your transaction will proceed with additional verification',
  });
}
```

---

## Fix 3: categories/page.tsx

### Step 3.1: Update Imports
**Find:**
```typescript
import { Grid3X3, List, ChevronRight, Search, Sparkles, Package } from 'lucide-react';
```

**Replace with:**
```typescript
import { Grid3X3, List, ChevronRight, Search, Sparkles, Package, AlertTriangle, RefreshCw } from 'lucide-react';
```

**And find:**
```typescript
import { Card, CardContent } from '@/components/ui/card';
```

**Add after it:**
```typescript
import { toast } from 'sonner';
```

### Step 3.2: Add Error State
**Find:**
```typescript
const [isLoading, setIsLoading] = useState(true);
```

**Add after it:**
```typescript
const [error, setError] = useState<string | null>(null);
```

### Step 3.3: Fix fetchCategories
**Find:**
```typescript
useEffect(() => {
  const fetchCategories = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiUrl}/categories`);
      const data = await res.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchCategories();
}, []);
```

**Replace with:**
```typescript
useEffect(() => {
  const fetchCategories = async () => {
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiUrl}/categories`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setCategories(data.data || []);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch categories';
      console.error('Failed to fetch categories:', error);
      setError(errorMessage);
      toast.error('Failed to load categories', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload(),
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  fetchCategories();
}, []);
```

### Step 3.4: Add Error State UI
**Find the loading check (around line 100), add AFTER it:**
```typescript
// Error state
if (error && categories.length === 0) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Categories</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-900 mb-2">
              Failed to Load Categories
            </h3>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Testing

After applying all fixes:

1. **Test payment methods page:**
   ```bash
   # In browser: http://localhost:3000/account/payment-methods
   # Open DevTools Network tab and throttle to Offline
   # Try to load the page - should see error state with retry button
   ```

2. **Test checkout page:**
   ```bash
   # In browser: http://localhost:3000/checkout
   # Try entering address in offline mode
   # Should see toast notifications
   ```

3. **Test categories page:**
   ```bash
   # In browser: http://localhost:3000/categories
   # Go offline and refresh
   # Should see error state with retry button
   ```

## Completion Checklist

- [ ] payment-methods/page.tsx - Imports added
- [ ] payment-methods/page.tsx - Error states added
- [ ] payment-methods/page.tsx - loadPaymentMethods fixed
- [ ] payment-methods/page.tsx - handleDelete fixed
- [ ] payment-methods/page.tsx - handleSetDefault fixed
- [ ] payment-methods/page.tsx - Error UI added
- [ ] payment-methods/page.tsx - Buttons updated
- [ ] checkout/page.tsx - Shipping error fixed
- [ ] checkout/page.tsx - Fraud check error fixed
- [ ] categories/page.tsx - Imports added
- [ ] categories/page.tsx - Error state added
- [ ] categories/page.tsx - fetchCategories fixed
- [ ] categories/page.tsx - Error UI added
- [ ] All files tested

## Time Estimate

- Payment methods: 10-15 minutes
- Checkout: 3-5 minutes
- Categories: 5-7 minutes
- Testing: 10 minutes
- **Total: 28-37 minutes**

## Success Criteria

✅ All async operations show user feedback on error
✅ All error states have retry mechanisms
✅ No silent console.error catches remain
✅ Loading indicators prevent duplicate actions
✅ Toast notifications appear for all operations
✅ Error states are visually distinct and helpful

## Need Help?

See `CRITICAL_ERROR_HANDLING_FIXES.md` for more detailed explanations and context.
