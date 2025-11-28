import { useCallback, useMemo } from 'react';
import { useCartStore } from '../stores/cart-store';

/**
 * Hook for accessing cart state and methods
 */
export function useCart() {
  const {
    items,
    isLoading,
    error,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
    coupon,
  } = useCartStore();

  const itemCount = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

  const discount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.type === 'percentage') {
      return subtotal * (coupon.value / 100);
    }
    return coupon.value;
  }, [coupon, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const handleAddItem = useCallback(
    async (productId: string, quantity: number = 1) => {
      try {
        await addItem(productId, quantity);
        return { success: true };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [addItem]
  );

  const handleRemoveItem = useCallback(
    async (productId: string) => {
      try {
        await removeItem(productId);
        return { success: true };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [removeItem]
  );

  const handleUpdateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      try {
        await updateQuantity(productId, quantity);
        return { success: true };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [updateQuantity]
  );

  return {
    items,
    itemCount,
    subtotal,
    discount,
    total,
    coupon,
    isLoading,
    error,
    addItem: handleAddItem,
    removeItem: handleRemoveItem,
    updateQuantity: handleUpdateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
  };
}
