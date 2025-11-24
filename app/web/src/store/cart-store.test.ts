import { renderHook, act } from '@testing-library/react';
import { useCartStore } from './cart-store';
import type { Product } from '@/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useCartStore', () => {
  const mockProduct1: Product = {
    id: 'product-1',
    name: 'Test Product 1',
    description: 'Test description 1',
    price: 29.99,
    images: ['image1.jpg'],
    category: 'cat-1',
    vendorId: 'vendor-1',
    stock: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProduct2: Product = {
    id: 'product-2',
    name: 'Test Product 2',
    description: 'Test description 2',
    price: 49.99,
    images: ['image2.jpg'],
    category: 'cat-1',
    vendorId: 'vendor-1',
    stock: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Clear the store before each test
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.clearCart();
    });
    localStorageMock.clear();
  });

  describe('Initial State', () => {
    it('should have empty items array initially', () => {
      const { result } = renderHook(() => useCartStore());
      expect(result.current.items).toEqual([]);
    });

    it('should have cart closed initially', () => {
      const { result } = renderHook(() => useCartStore());
      expect(result.current.isOpen).toBe(false);
    });

    it('should have itemCount of 0 initially', () => {
      const { result } = renderHook(() => useCartStore());
      expect(result.current.itemCount()).toBe(0);
    });

    it('should have subtotal of 0 initially', () => {
      const { result } = renderHook(() => useCartStore());
      expect(result.current.subtotal()).toBe(0);
    });
  });

  describe('addItem', () => {
    it('should add a new item to the cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product).toEqual(mockProduct1);
      expect(result.current.items[0].quantity).toBe(2);
    });

    it('should default to quantity of 1 if not specified', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1);
      });

      expect(result.current.items[0].quantity).toBe(1);
    });

    it('should increase quantity if item already in cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.addItem(mockProduct1, 3);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should not exceed stock when adding items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 8);
      });

      act(() => {
        result.current.addItem(mockProduct1, 5); // Would total 13, but stock is 10
      });

      expect(result.current.items[0].quantity).toBe(10); // Capped at stock
    });

    it('should add multiple different products', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.addItem(mockProduct2, 3);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].product.id).toBe('product-1');
      expect(result.current.items[1].product.id).toBe('product-2');
    });

    it('should not add more than available stock', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 20); // Stock is only 10
      });

      expect(result.current.items[0].quantity).toBe(10);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.removeItem('product-1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe('product-2');
    });

    it('should do nothing if product not in cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.removeItem('nonexistent-product');
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity of an item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.updateQuantity('product-1', 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.updateQuantity('product-1', 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should remove item if quantity is negative', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.updateQuantity('product-1', -5);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should not exceed stock when updating quantity', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.updateQuantity('product-1', 15); // Stock is only 10
      });

      expect(result.current.items[0].quantity).toBe(10);
    });

    it('should not update quantity for non-existent product', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      act(() => {
        result.current.updateQuantity('nonexistent-product', 5);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });
  });

  describe('clearCart', () => {
    it('should remove all items from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 3);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('Cart UI State', () => {
    it('should toggle cart open/closed', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggleCart();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggleCart();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should set cart open state', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCartOpen(true);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.setCartOpen(false);
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Computed Values', () => {
    describe('itemCount', () => {
      it('should return total number of items in cart', () => {
        const { result } = renderHook(() => useCartStore());

        act(() => {
          result.current.addItem(mockProduct1, 2);
          result.current.addItem(mockProduct2, 3);
        });

        expect(result.current.itemCount()).toBe(5);
      });

      it('should return 0 for empty cart', () => {
        const { result } = renderHook(() => useCartStore());

        expect(result.current.itemCount()).toBe(0);
      });
    });

    describe('subtotal', () => {
      it('should calculate correct subtotal', () => {
        const { result } = renderHook(() => useCartStore());

        act(() => {
          result.current.addItem(mockProduct1, 2); // 2 × $29.99 = $59.98
          result.current.addItem(mockProduct2, 1); // 1 × $49.99 = $49.99
        });

        const expectedSubtotal = 2 * 29.99 + 1 * 49.99; // $109.97
        expect(result.current.subtotal()).toBeCloseTo(expectedSubtotal, 2);
      });

      it('should return 0 for empty cart', () => {
        const { result } = renderHook(() => useCartStore());

        expect(result.current.subtotal()).toBe(0);
      });
    });

    describe('tax', () => {
      it('should calculate 10% tax on subtotal', () => {
        const { result } = renderHook(() => useCartStore());

        act(() => {
          result.current.addItem(mockProduct1, 1); // $29.99
        });

        const expectedTax = 29.99 * 0.1; // $2.999
        expect(result.current.tax()).toBeCloseTo(expectedTax, 2);
      });

      it('should return 0 for empty cart', () => {
        const { result } = renderHook(() => useCartStore());

        expect(result.current.tax()).toBe(0);
      });
    });

    describe('total', () => {
      it('should calculate correct total (subtotal + tax)', () => {
        const { result } = renderHook(() => useCartStore());

        act(() => {
          result.current.addItem(mockProduct1, 2); // 2 × $29.99 = $59.98
          result.current.addItem(mockProduct2, 1); // 1 × $49.99 = $49.99
        });

        const subtotal = 2 * 29.99 + 1 * 49.99; // $109.97
        const tax = subtotal * 0.1; // $10.997
        const expectedTotal = subtotal + tax; // $120.967

        expect(result.current.total()).toBeCloseTo(expectedTotal, 2);
      });

      it('should return 0 for empty cart', () => {
        const { result } = renderHook(() => useCartStore());

        expect(result.current.total()).toBe(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle adding item with 0 stock', () => {
      const { result } = renderHook(() => useCartStore());

      const outOfStockProduct: Product = {
        ...mockProduct1,
        stock: 0,
      };

      act(() => {
        result.current.addItem(outOfStockProduct, 1);
      });

      expect(result.current.items[0].quantity).toBe(0);
    });

    it('should handle decimal prices correctly', () => {
      const { result } = renderHook(() => useCartStore());

      const decimalPriceProduct: Product = {
        ...mockProduct1,
        price: 19.95,
      };

      act(() => {
        result.current.addItem(decimalPriceProduct, 3);
      });

      const expectedSubtotal = 19.95 * 3;
      expect(result.current.subtotal()).toBeCloseTo(expectedSubtotal, 2);
    });

    it('should handle large quantities', () => {
      const { result } = renderHook(() => useCartStore());

      const highStockProduct: Product = {
        ...mockProduct1,
        stock: 1000,
      };

      act(() => {
        result.current.addItem(highStockProduct, 500);
      });

      expect(result.current.items[0].quantity).toBe(500);
      expect(result.current.itemCount()).toBe(500);
    });
  });

  describe('Persistence', () => {
    it('should persist items to localStorage', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      const stored = localStorageMock.getItem('cart-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.items).toHaveLength(1);
    });

    it('should not persist isOpen state', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCartOpen(true);
      });

      const stored = localStorageMock.getItem('cart-storage');
      const parsed = JSON.parse(stored!);

      expect(parsed.state.isOpen).toBeUndefined();
    });
  });
});
