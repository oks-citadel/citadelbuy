import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartApi } from '../services/api';

// Types
export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: {
    id: string;
    name: string;
    options: Record<string, string>;
  };
  maxQuantity?: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  coupon?: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  };
}

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  clearError: () => void;
  resetCart: () => void;
}

// Selectors
export const selectCartItemCount = (state: CartState): number => {
  if (!state.cart) return 0;
  return state.cart.items.reduce((total, item) => total + item.quantity, 0);
};

export const selectCartTotal = (state: CartState): number => {
  return state.cart?.total || 0;
};

export const selectCartSubtotal = (state: CartState): number => {
  return state.cart?.subtotal || 0;
};

export const selectCartItemById = (itemId: string) => (state: CartState): CartItem | undefined => {
  return state.cart?.items.find(item => item.id === itemId);
};

export const selectCartHasItem = (productId: string, variantId?: string) => (state: CartState): boolean => {
  if (!state.cart) return false;
  return state.cart.items.some(
    item => item.productId === productId && (!variantId || item.variantId === variantId)
  );
};

export const selectCartIsEmpty = (state: CartState): boolean => {
  return !state.cart || state.cart.items.length === 0;
};

// Store
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      isUpdating: false,
      error: null,
      lastFetched: null,

      fetchCart: async () => {
        // Don't fetch if already loading
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
          const response = await cartApi.getCart();
          const cartData = response.data;

          set({
            cart: cartData,
            isLoading: false,
            lastFetched: Date.now(),
          });
        } catch (error: any) {
          // If cart doesn't exist (404), initialize empty cart
          if (error.response?.status === 404) {
            set({
              cart: {
                id: 'temp',
                items: [],
                subtotal: 0,
                tax: 0,
                shipping: 0,
                discount: 0,
                total: 0,
              },
              isLoading: false,
              lastFetched: Date.now(),
            });
          } else {
            set({
              error: error.response?.data?.message || 'Failed to fetch cart',
              isLoading: false,
            });
          }
        }
      },

      addItem: async (productId: string, quantity: number, variantId?: string) => {
        const previousCart = get().cart;
        set({ isUpdating: true, error: null });

        try {
          // Optimistic update
          if (previousCart) {
            const existingItem = previousCart.items.find(
              item => item.productId === productId && (!variantId || item.variantId === variantId)
            );

            let optimisticItems: CartItem[];
            if (existingItem) {
              // Update existing item quantity
              optimisticItems = previousCart.items.map(item =>
                item.id === existingItem.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              );
            } else {
              // Add new item (we'll get full details from server)
              const tempItem: CartItem = {
                id: `temp-${Date.now()}`,
                productId,
                variantId,
                name: 'Loading...',
                price: 0,
                quantity,
              };
              optimisticItems = [...previousCart.items, tempItem];
            }

            // Calculate optimistic totals
            const optimisticSubtotal = optimisticItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );

            set({
              cart: {
                ...previousCart,
                items: optimisticItems,
                subtotal: optimisticSubtotal,
                total: optimisticSubtotal + previousCart.tax + previousCart.shipping - previousCart.discount,
              },
            });
          }

          // Make API call
          const response = await cartApi.addItem(productId, quantity, variantId);
          const updatedCart = response.data;

          set({
            cart: updatedCart,
            isUpdating: false,
            lastFetched: Date.now(),
          });
        } catch (error: any) {
          // Revert on error
          set({
            cart: previousCart,
            error: error.response?.data?.message || 'Failed to add item to cart',
            isUpdating: false,
          });
          throw error;
        }
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        const previousCart = get().cart;
        if (!previousCart) return;

        set({ isUpdating: true, error: null });

        try {
          // Optimistic update
          const optimisticItems = previousCart.items.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          );

          const optimisticSubtotal = optimisticItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          set({
            cart: {
              ...previousCart,
              items: optimisticItems,
              subtotal: optimisticSubtotal,
              total: optimisticSubtotal + previousCart.tax + previousCart.shipping - previousCart.discount,
            },
          });

          // Make API call
          const response = await cartApi.updateItem(itemId, quantity);
          const updatedCart = response.data;

          set({
            cart: updatedCart,
            isUpdating: false,
            lastFetched: Date.now(),
          });
        } catch (error: any) {
          // Revert on error
          set({
            cart: previousCart,
            error: error.response?.data?.message || 'Failed to update item quantity',
            isUpdating: false,
          });
          throw error;
        }
      },

      removeItem: async (itemId: string) => {
        const previousCart = get().cart;
        if (!previousCart) return;

        set({ isUpdating: true, error: null });

        try {
          // Optimistic update
          const optimisticItems = previousCart.items.filter(item => item.id !== itemId);
          const optimisticSubtotal = optimisticItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          set({
            cart: {
              ...previousCart,
              items: optimisticItems,
              subtotal: optimisticSubtotal,
              total: optimisticSubtotal + previousCart.tax + previousCart.shipping - previousCart.discount,
            },
          });

          // Make API call
          const response = await cartApi.removeItem(itemId);
          const updatedCart = response.data;

          set({
            cart: updatedCart,
            isUpdating: false,
            lastFetched: Date.now(),
          });
        } catch (error: any) {
          // Revert on error
          set({
            cart: previousCart,
            error: error.response?.data?.message || 'Failed to remove item from cart',
            isUpdating: false,
          });
          throw error;
        }
      },

      clearCart: async () => {
        const previousCart = get().cart;
        set({ isUpdating: true, error: null });

        try {
          // Optimistic update
          set({
            cart: {
              id: previousCart?.id || 'temp',
              items: [],
              subtotal: 0,
              tax: 0,
              shipping: 0,
              discount: 0,
              total: 0,
            },
          });

          // Make API call
          await cartApi.clearCart();

          set({
            isUpdating: false,
            lastFetched: Date.now(),
          });
        } catch (error: any) {
          // Revert on error
          set({
            cart: previousCart,
            error: error.response?.data?.message || 'Failed to clear cart',
            isUpdating: false,
          });
          throw error;
        }
      },

      applyCoupon: async (code: string) => {
        const previousCart = get().cart;
        if (!previousCart) return;

        set({ isUpdating: true, error: null });

        try {
          const response = await cartApi.applyCoupon(code);
          const updatedCart = response.data;

          set({
            cart: updatedCart,
            isUpdating: false,
            lastFetched: Date.now(),
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Failed to apply coupon',
            isUpdating: false,
          });
          throw error;
        }
      },

      removeCoupon: () => {
        const currentCart = get().cart;
        if (!currentCart) return;

        // Remove coupon locally (typically would call API endpoint)
        const subtotal = currentCart.subtotal;
        set({
          cart: {
            ...currentCart,
            coupon: undefined,
            discount: 0,
            total: subtotal + currentCart.tax + currentCart.shipping,
          },
        });
      },

      clearError: () => set({ error: null }),

      resetCart: () => {
        set({
          cart: null,
          isLoading: false,
          isUpdating: false,
          error: null,
          lastFetched: null,
        });
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist cart data, not loading states
      partialize: (state) => ({
        cart: state.cart,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// Helper hooks for selectors
export const useCartItemCount = () => useCartStore(selectCartItemCount);
export const useCartTotal = () => useCartStore(selectCartTotal);
export const useCartSubtotal = () => useCartStore(selectCartSubtotal);
export const useCartIsEmpty = () => useCartStore(selectCartIsEmpty);
export const useCartHasItem = (productId: string, variantId?: string) =>
  useCartStore(selectCartHasItem(productId, variantId));
export const useCartItemById = (itemId: string) =>
  useCartStore(selectCartItemById(itemId));
