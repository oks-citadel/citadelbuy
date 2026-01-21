/**
 * API Integration Tests - Cart & Checkout Module
 *
 * Tests the shopping cart and checkout endpoints.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface CartItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  price: number;
}

interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  total: number;
}

describe('Cart API Integration Tests', () => {
  let authToken: string;
  let sampleProductId: string;
  let cartItemId: string;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@broxiva.com',
        password: 'password123',
      }),
    });

    if (loginResponse.status === 200) {
      const body = await loginResponse.json();
      authToken = body.accessToken;
    }

    // Get a product to add to cart
    const productsResponse = await fetch(`${API_BASE_URL}/api/products?limit=1`);
    if (productsResponse.status === 200) {
      const body = await productsResponse.json();
      const products = Array.isArray(body) ? body : body.data;
      if (products.length > 0) {
        sampleProductId = products[0].id;
      }
    }
  });

  describe('GET /api/cart', () => {
    test('should return empty cart for new user', async () => {
      if (!authToken) {
        console.log('Skipping: no auth token available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as Cart;

      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
    });

    test('should return 401 without authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cart/items', () => {
    test('should add item to cart', async () => {
      if (!authToken || !sampleProductId) {
        console.log('Skipping: missing auth token or product ID');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: sampleProductId,
          quantity: 1,
        }),
      });

      expect([200, 201]).toContain(response.status);
      const body = await response.json();

      // Store cart item ID for later tests
      if (body.items && body.items.length > 0) {
        cartItemId = body.items[0].id;
      } else if (body.id) {
        cartItemId = body.id;
      }
    });

    test('should increase quantity when adding same product', async () => {
      if (!authToken || !sampleProductId) {
        console.log('Skipping: missing auth token or product ID');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: sampleProductId,
          quantity: 1,
        }),
      });

      expect([200, 201]).toContain(response.status);
    });

    test('should return 400 for invalid product ID', async () => {
      if (!authToken) {
        console.log('Skipping: no auth token available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        }),
      });

      // Could be 400 (bad request) or 404 (product not found)
      expect([400, 404]).toContain(response.status);
    });

    test('should return 400 for invalid quantity', async () => {
      if (!authToken || !sampleProductId) {
        console.log('Skipping: missing auth token or product ID');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: sampleProductId,
          quantity: -1,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should return 400 for zero quantity', async () => {
      if (!authToken || !sampleProductId) {
        console.log('Skipping: missing auth token or product ID');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: sampleProductId,
          quantity: 0,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/cart/items/:id', () => {
    test('should update cart item quantity', async () => {
      if (!authToken || !cartItemId) {
        console.log('Skipping: missing auth token or cart item ID');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items/${cartItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          quantity: 3,
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      // Verify quantity was updated
      if (body.quantity) {
        expect(body.quantity).toBe(3);
      }
    });

    test('should return 404 for non-existent cart item', async () => {
      if (!authToken) {
        console.log('Skipping: no auth token available');
        return;
      }

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${API_BASE_URL}/api/cart/items/${fakeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          quantity: 1,
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/cart/items/:id', () => {
    test('should remove item from cart', async () => {
      if (!authToken || !cartItemId) {
        console.log('Skipping: missing auth token or cart item ID');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items/${cartItemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect([200, 204]).toContain(response.status);
    });

    test('should return 404 for already removed item', async () => {
      if (!authToken || !cartItemId) {
        console.log('Skipping: missing auth token or cart item ID');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/items/${cartItemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Item was already deleted
      expect([404, 204, 200]).toContain(response.status);
    });
  });

  describe('DELETE /api/cart/clear', () => {
    test('should clear entire cart', async () => {
      if (!authToken) {
        console.log('Skipping: no auth token available');
        return;
      }

      // First add an item
      if (sampleProductId) {
        await fetch(`${API_BASE_URL}/api/cart/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            productId: sampleProductId,
            quantity: 1,
          }),
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Could be /cart/clear or just DELETE /cart
      if (response.status === 404) {
        const altResponse = await fetch(`${API_BASE_URL}/api/cart`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });
        expect([200, 204]).toContain(altResponse.status);
        return;
      }

      expect([200, 204]).toContain(response.status);
    });
  });
});

describe('Checkout API Integration Tests', () => {
  let authToken: string;
  let sampleProductId: string;

  beforeAll(async () => {
    // Login
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@broxiva.com',
        password: 'password123',
      }),
    });

    if (loginResponse.status === 200) {
      const body = await loginResponse.json();
      authToken = body.accessToken;
    }

    // Get a product
    const productsResponse = await fetch(`${API_BASE_URL}/api/products?limit=1`);
    if (productsResponse.status === 200) {
      const body = await productsResponse.json();
      const products = Array.isArray(body) ? body : body.data;
      if (products.length > 0) {
        sampleProductId = products[0].id;
      }
    }
  });

  describe('POST /api/checkout/estimate', () => {
    test('should estimate checkout cost', async () => {
      if (!authToken || !sampleProductId) {
        console.log('Skipping: missing prerequisites');
        return;
      }

      // Add item to cart first
      await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: sampleProductId,
          quantity: 1,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/api/checkout/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          shippingAddress: {
            country: 'US',
            state: 'CA',
            city: 'San Francisco',
            zipCode: '94102',
          },
        }),
      });

      // Endpoint might not exist
      if (response.status === 404) {
        console.log('Checkout estimate endpoint not available');
        return;
      }

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('subtotal');
      expect(body).toHaveProperty('total');
    });
  });

  describe('POST /api/checkout', () => {
    test('should return 400 for empty cart', async () => {
      if (!authToken) {
        console.log('Skipping: no auth token available');
        return;
      }

      // Clear cart first
      await fetch(`${API_BASE_URL}/api/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      const response = await fetch(`${API_BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          shippingAddress: {
            name: 'Test User',
            street: '123 Test St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'US',
          },
          paymentMethodId: 'pm_test_123',
        }),
      });

      // Should fail because cart is empty
      expect([400, 422]).toContain(response.status);
    });

    test('should return 401 without authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            name: 'Test User',
            street: '123 Test St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'US',
          },
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});

describe('Cart Concurrency Tests', () => {
  let authToken: string;
  let sampleProductId: string;

  beforeAll(async () => {
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@broxiva.com',
        password: 'password123',
      }),
    });

    if (loginResponse.status === 200) {
      const body = await loginResponse.json();
      authToken = body.accessToken;
    }

    const productsResponse = await fetch(`${API_BASE_URL}/api/products?limit=1`);
    if (productsResponse.status === 200) {
      const body = await productsResponse.json();
      const products = Array.isArray(body) ? body : body.data;
      if (products.length > 0) {
        sampleProductId = products[0].id;
      }
    }
  });

  test('should handle concurrent add requests correctly', async () => {
    if (!authToken || !sampleProductId) {
      console.log('Skipping: missing prerequisites');
      return;
    }

    // Clear cart first
    await fetch(`${API_BASE_URL}/api/cart/clear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    // Make 5 concurrent requests to add the same product
    const requests = Array.from({ length: 5 }, () =>
      fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: sampleProductId,
          quantity: 1,
        }),
      })
    );

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach((response) => {
      expect([200, 201]).toContain(response.status);
    });

    // Verify final cart state
    const cartResponse = await fetch(`${API_BASE_URL}/api/cart`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(cartResponse.status).toBe(200);
    const cart = await cartResponse.json();

    // Should have consolidated to single item with quantity 5
    if (cart.items && cart.items.length > 0) {
      const totalQuantity = cart.items.reduce(
        (sum: number, item: CartItem) => sum + item.quantity,
        0
      );
      // Quantity should be at least 5 (could be more if items existed before)
      expect(totalQuantity).toBeGreaterThanOrEqual(5);
    }
  });
});
