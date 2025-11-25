import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/services/api';
import { Cart, CartItem, Product, ProductVariant } from '@/types';
import { recommendationService } from '@/services/ai';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  recommendations: Product[];

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  saveForLater: (itemId: string) => Promise<void>;
  moveToCart: (itemId: string) => Promise<void>;
  getRecommendations: () => Promise<void>;
  setIsOpen: (isOpen: boolean) => void;
  clearError: () => void;
}

const calculateTotals = (items: CartItem[]): Partial<Cart> => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  return {
    subtotal,
    discount: 0,
    tax: subtotal * 0.08, // 8% tax
    shipping: subtotal >= 50 ? 0 : 5.99,
    total: subtotal + subtotal * 0.08 + (subtotal >= 50 ? 0 : 5.99),
  };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      error: null,
      isOpen: false,
      recommendations: [],

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get<Cart>('/cart');
          if (response.success && response.data) {
            set({ cart: response.data, isLoading: false });
            get().getRecommendations();
          } else {
            set({ cart: null, isLoading: false });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch cart';
          set({ error: message, isLoading: false });
        }
      },

      addItem: async (product: Product, variant?: ProductVariant, quantity: number = 1) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<Cart>('/cart/items', {
            productId: product.id,
            variantId: variant?.id,
            quantity,
          });

          if (response.success && response.data) {
            set({ cart: response.data, isLoading: false, isOpen: true });
            get().getRecommendations();
          } else {
            throw new Error(response.error?.message || 'Failed to add item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add item';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        const { cart } = get();
        if (!cart) return;

        // Optimistic update
        const previousCart = cart;
        const updatedItems = cart.items.map((item) =>
          item.id === itemId
            ? { ...item, quantity, total: item.price * quantity }
            : item
        );

        set({
          cart: {
            ...cart,
            items: updatedItems,
            ...calculateTotals(updatedItems),
          } as Cart,
        });

        try {
          const response = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity });

          if (response.success && response.data) {
            set({ cart: response.data });
          } else {
            set({ cart: previousCart });
            throw new Error(response.error?.message || 'Failed to update quantity');
          }
        } catch (error) {
          set({ cart: previousCart });
          const message = error instanceof Error ? error.message : 'Failed to update quantity';
          set({ error: message });
          throw error;
        }
      },

      removeItem: async (itemId: string) => {
        const { cart } = get();
        if (!cart) return;

        // Optimistic update
        const previousCart = cart;
        const updatedItems = cart.items.filter((item) => item.id !== itemId);

        set({
          cart: {
            ...cart,
            items: updatedItems,
            ...calculateTotals(updatedItems),
          } as Cart,
        });

        try {
          const response = await api.delete<Cart>(`/cart/items/${itemId}`);

          if (response.success && response.data) {
            set({ cart: response.data });
            get().getRecommendations();
          } else {
            set({ cart: previousCart });
            throw new Error(response.error?.message || 'Failed to remove item');
          }
        } catch (error) {
          set({ cart: previousCart });
          const message = error instanceof Error ? error.message : 'Failed to remove item';
          set({ error: message });
          throw error;
        }
      },

      clearCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.delete<Cart>('/cart');

          if (response.success) {
            set({ cart: null, isLoading: false, recommendations: [] });
          } else {
            throw new Error(response.error?.message || 'Failed to clear cart');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to clear cart';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      applyCoupon: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<Cart>('/cart/coupon', { code });

          if (response.success && response.data) {
            set({ cart: response.data, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Invalid coupon code');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid coupon code';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      removeCoupon: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.delete<Cart>('/cart/coupon');

          if (response.success && response.data) {
            set({ cart: response.data, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Failed to remove coupon');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to remove coupon';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      saveForLater: async (itemId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<Cart>(`/cart/items/${itemId}/save-for-later`);

          if (response.success && response.data) {
            set({ cart: response.data, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Failed to save item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save item';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      moveToCart: async (itemId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<Cart>(`/cart/items/${itemId}/move-to-cart`);

          if (response.success && response.data) {
            set({ cart: response.data, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Failed to move item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to move item';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      getRecommendations: async () => {
        const { cart } = get();
        if (!cart || cart.items.length === 0) {
          set({ recommendations: [] });
          return;
        }

        try {
          const productIds = cart.items.map((item) => item.product.id);
          const recommendations = await recommendationService.getCrossSell(productIds);
          set({ recommendations });
        } catch {
          // Silent fail for recommendations
          set({ recommendations: [] });
        }
      },

      setIsOpen: (isOpen: boolean) => set({ isOpen }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
      }),
    }
  )
);

// Selectors
export const selectCartItemCount = (state: CartState) =>
  state.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

export const selectCartTotal = (state: CartState) => state.cart?.total ?? 0;

export const selectCartSubtotal = (state: CartState) => state.cart?.subtotal ?? 0;

export const selectIsCartEmpty = (state: CartState) =>
  !state.cart || state.cart.items.length === 0;
