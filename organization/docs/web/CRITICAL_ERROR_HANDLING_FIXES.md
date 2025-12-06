# CRITICAL Error Handling Fixes for Web Frontend

## Overview
This document details the critical error handling fixes needed for silent error catches in the web frontend. These fixes add proper user feedback, error states, and retry mechanisms.

## Files to Fix

### 1. `src/app/account/payment-methods/page.tsx`

**Issues Found:**
- Lines 41, 53, 67: Silent error catches with only console.error
- No user feedback when operations fail
- No error state management
- No retry mechanisms

**Changes Required:**

#### 1.1 Add Imports
```typescript
// Add to imports at the top
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react'; // Add to existing lucide imports
```

#### 1.2 Add Error State Variables
```typescript
// Add after line 29 (after showAddCard state)
const [loadError, setLoadError] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
```

#### 1.3 Fix `loadPaymentMethods` Function (Lines 35-45)
**Replace:**
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

**With:**
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

#### 1.4 Fix `handleDelete` Function (Lines 47-55)
**Replace:**
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

**With:**
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

#### 1.5 Fix `handleSetDefault` Function (Lines 57-69)
**Replace:**
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

**With:**
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

#### 1.6 Add Error State UI (After loading check, around line 96)
**Add after the loading return statement:**
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

#### 1.7 Add Loading Indicators to Buttons
**In the payment methods map (around line 280 and 295):**
```typescript
// For delete button:
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

// For set default button:
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

### 2. `src/app/checkout/page.tsx`

**Issues Found:**
- Lines 193, 228: Silent error catches in async operations
- Shipping rates fetch failure has no user feedback
- Fraud detection failure is silent

**Changes Required:**

#### 2.1 Fix Shipping Rates Fetch (Lines 149-202)
**The existing code already has toast imported. Update the error handling:**

**Find around line 193:**
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

#### 2.2 Fix Fraud Detection (Lines 204-233)
**Find around line 228:**
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

**Note:** The checkout page already has comprehensive error handling in the `handlePlaceOrder` function (lines 268-394), which is good. The main fixes needed are for the non-critical async operations.

---

### 3. `src/app/categories/page.tsx`

**Issues Found:**
- Line 58: Silent error catch when fetching categories
- No error state management
- No retry mechanism
- No user feedback on failure

**Changes Required:**

#### 3.1 Add Imports
```typescript
// Add to imports:
import { AlertTriangle, RefreshCw } from 'lucide-react'; // Add to existing lucide imports
import { toast } from 'sonner';
```

#### 3.2 Add Error State Variable
```typescript
// Add after line 48 (after isLoading state)
const [error, setError] = useState<string | null>(null);
```

#### 3.3 Fix `fetchCategories` Function (Lines 50-65)
**Replace:**
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

**With:**
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

#### 3.4 Add Error State UI (After loading check, around line 100)
**Add after the loading return statement:**
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

## Implementation Instructions

1. **Stop the development server** if it's running to avoid file conflicts
2. Apply changes to each file in the order listed above
3. Test each file after making changes:
   - Test error scenarios by disconnecting network or using invalid API endpoints
   - Verify toast notifications appear
   - Verify error states display correctly
   - Verify retry mechanisms work
4. Restart the development server and test the complete flow

## Benefits

After implementing these fixes:
1. Users will receive clear feedback when operations fail
2. Users can retry failed operations without refreshing
3. Error states are visually distinct and informative
4. Loading states prevent duplicate actions
5. All errors are logged properly for debugging
6. Better user experience with actionable error messages

## Testing Checklist

- [ ] Payment methods page loads without errors
- [ ] Payment method deletion shows error toast if it fails
- [ ] Setting default payment method shows error toast if it fails
- [ ] Error states display correctly with retry buttons
- [ ] Checkout shipping rates failure shows toast notification
- [ ] Categories page shows error state if API fails
- [ ] All retry mechanisms work correctly
- [ ] Loading indicators prevent duplicate actions
- [ ] Console errors are properly logged with context

## Priority

**CRITICAL** - These fixes address silent failures that can confuse users and hide important errors from developers.
