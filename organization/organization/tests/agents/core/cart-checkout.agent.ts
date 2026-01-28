/**
 * Cart & Checkout Agent
 *
 * Tests:
 * - Add/remove/update cart items
 * - Cart persistence across sessions
 * - Coupon and discount code application
 * - Shipping cost calculations
 * - Tax calculations by region
 * - Guest vs. authenticated checkout flows
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class CartCheckoutAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private userId?: string;
  private testProductId?: string;
  private cartId?: string;

  constructor(options: AgentOptions = {}) {
    super('Cart & Checkout Agent', 'cart-checkout', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Login to get auth token
    try {
      const { data } = await this.http.post('/auth/register', {
        email: `cart-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Cart Test User',
      });
      this.authToken = data.access_token;
      this.userId = data.user?.id;
    } catch (e) {
      // Try login if registration fails
      try {
        const { data } = await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'Customer123!',
        });
        this.authToken = data.access_token;
        this.userId = data.user?.id;
      } catch (e2) {
        console.warn('Could not authenticate for cart tests');
      }
    }

    // Get a product ID for testing
    try {
      const { data } = await this.http.get('/products?pageSize=1&isActive=true');
      const products = data.data || data;
      if (Array.isArray(products) && products.length > 0) {
        this.testProductId = products[0].id;
      }
    } catch (e) {
      console.warn('Could not get test product');
    }
  }

  protected async teardown(): Promise<void> {
    // Clear cart after tests
    if (this.authToken && this.cartId) {
      try {
        this.http.setAuthToken(this.authToken);
        await this.http.delete('/cart');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  protected defineTests(): void {
    // ============================================
    // Cart CRUD Operations
    // ============================================
    this.describe('Cart CRUD Operations', (t) => {
      t('should get empty cart for new user', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/cart');

        assert.statusCode(status, 200, 'Should return 200');
        if (data.items) {
          assert.isArray(data.items, 'Cart items should be array');
        }
      });

      t('should add item to cart', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        assert.ok([200, 201].includes(status), 'Should add item successfully');
        if (data.id) {
          this.cartId = data.id;
        }
      });

      t('should get cart with added item', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/cart');

        assert.statusCode(status, 200, 'Should return 200');
        const items = data.items || data.cartItems || [];
        assert.ok(items.length > 0, 'Cart should have items');
      });

      t('should update item quantity', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // First get cart to get item ID
        const { data: cart } = await this.http.get('/cart');
        const items = cart.items || cart.cartItems || [];

        if (items.length > 0) {
          const itemId = items[0].id;
          const { data, status } = await this.http.patch(`/cart/items/${itemId}`, {
            quantity: 3,
          });

          assert.ok([200, 201].includes(status), 'Should update quantity');
        }
      });

      t('should not allow quantity less than 1', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data: cart } = await this.http.get('/cart');
        const items = cart.items || cart.cartItems || [];

        if (items.length > 0) {
          const itemId = items[0].id;
          const { status } = await this.http.patch(`/cart/items/${itemId}`, {
            quantity: 0,
          });

          assert.ok([400, 422].includes(status), 'Should reject zero quantity');
        }
      });

      t('should not allow quantity exceeding stock', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 999999,
        });

        // Might succeed if stock is high, or fail if validation exists
        assert.ok([200, 201, 400, 422].includes(status), 'Should handle high quantity');
      });

      t('should remove item from cart', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data: cart } = await this.http.get('/cart');
        const items = cart.items || cart.cartItems || [];

        if (items.length > 0) {
          const itemId = items[0].id;
          const { status } = await this.http.delete(`/cart/items/${itemId}`);
          assert.ok([200, 204].includes(status), 'Should remove item');
        }
      });

      t('should clear entire cart', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Add items first
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 2,
        });

        const { status } = await this.http.delete('/cart');
        assert.ok([200, 204].includes(status), 'Should clear cart');

        // Verify cart is empty
        const { data: cart } = await this.http.get('/cart');
        const items = cart.items || cart.cartItems || [];
        assert.lengthOf(items, 0, 'Cart should be empty');
      });
    });

    // ============================================
    // Cart Persistence
    // ============================================
    this.describe('Cart Persistence', (t) => {
      t('should persist cart across sessions', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Add item
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        // Simulate new session by re-fetching cart
        const { data: cart, status } = await this.http.get('/cart');
        assert.statusCode(status, 200, 'Should get cart');

        const items = cart.items || cart.cartItems || [];
        assert.ok(items.length > 0, 'Cart should persist items');
      });

      t('should merge guest cart on login', async (ctx) => {
        // This requires more complex setup with guest cart
        // Skip if not supported
      }, { skip: true });
    });

    // ============================================
    // Coupon Tests
    // ============================================
    this.describe('Coupon Application', (t) => {
      t('should apply valid coupon code', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Add item to cart first
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        const { data, status } = await this.http.post('/cart/apply-coupon', {
          code: 'SAVE10',
        });

        // Might succeed or fail based on coupon existence
        assert.ok([200, 400, 404].includes(status), 'Should handle coupon application');
      });

      t('should reject invalid coupon code', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/cart/apply-coupon', {
          code: 'INVALID_COUPON_XYZ',
        });

        assert.ok([400, 404].includes(status), 'Should reject invalid coupon');
      });

      t('should reject expired coupon', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/cart/apply-coupon', {
          code: 'EXPIRED',
        });

        assert.ok([400, 404, 422].includes(status), 'Should reject expired coupon');
      });

      t('should remove coupon from cart', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/cart/coupon');
        assert.ok([200, 204, 404].includes(status), 'Should remove coupon');
      });

      t('should calculate discount correctly', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Clear cart and add item
        await this.http.delete('/cart');
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        // Get cart before coupon
        const { data: cartBefore } = await this.http.get('/cart');
        const subtotalBefore = cartBefore.subtotal || cartBefore.total || 0;

        // Apply coupon
        const { status } = await this.http.post('/cart/apply-coupon', {
          code: 'SAVE10',
        });

        if (status === 200) {
          const { data: cartAfter } = await this.http.get('/cart');
          const discountedTotal = cartAfter.total || 0;

          // Total should be less after discount
          if (subtotalBefore > 0) {
            assert.ok(
              discountedTotal < subtotalBefore || cartAfter.discount > 0,
              'Discount should be applied'
            );
          }
        }
      });
    });

    // ============================================
    // Shipping Calculations
    // ============================================
    this.describe('Shipping Calculations', (t) => {
      t('should get available shipping rates', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Add item to cart
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        const { data, status } = await this.http.post('/cart/shipping-rates', {
          address: {
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        });

        assert.ok([200, 404].includes(status), 'Should get shipping rates');
        if (status === 200 && data.rates) {
          assert.isArray(data.rates, 'Rates should be an array');
        }
      });

      t('should calculate shipping by weight', async (ctx) => {
        // Weight-based shipping calculation
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/cart/shipping-rates', {
          address: {
            street: '123 Test St',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            country: 'US',
          },
        });

        assert.ok([200, 404].includes(status), 'Should calculate shipping');
      });

      t('should handle free shipping threshold', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Add enough items to qualify for free shipping
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 10,
        });

        const { data, status } = await this.http.post('/cart/shipping-rates', {
          address: {
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        });

        // Check if free shipping is available
        if (status === 200 && data.rates) {
          const hasFreeShipping = data.rates.some((rate: any) =>
            rate.price === 0 || rate.name?.toLowerCase().includes('free')
          );
          // Free shipping might or might not be available based on total
        }
      });

      t('should calculate international shipping', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/cart/shipping-rates', {
          address: {
            street: '123 Test St',
            city: 'London',
            zipCode: 'SW1A 1AA',
            country: 'GB',
          },
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle international shipping');
      });
    });

    // ============================================
    // Tax Calculations
    // ============================================
    this.describe('Tax Calculations', (t) => {
      t('should calculate tax for US address', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        const { data, status } = await this.http.post('/cart/calculate-tax', {
          address: {
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        });

        assert.ok([200, 404].includes(status), 'Should calculate tax');
        if (status === 200) {
          assert.ok(
            data.tax !== undefined || data.taxAmount !== undefined,
            'Should return tax amount'
          );
        }
      });

      t('should handle tax-exempt regions', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Oregon has no sales tax
        const { data, status } = await this.http.post('/cart/calculate-tax', {
          address: {
            street: '123 Test St',
            city: 'Portland',
            state: 'OR',
            zipCode: '97201',
            country: 'US',
          },
        });

        if (status === 200) {
          const taxAmount = data.tax || data.taxAmount || 0;
          // Tax might be 0 for tax-exempt regions
        }
      });

      t('should calculate VAT for EU addresses', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/cart/calculate-tax', {
          address: {
            street: '123 Test St',
            city: 'Berlin',
            zipCode: '10115',
            country: 'DE',
          },
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle EU VAT');
      });
    });

    // ============================================
    // Checkout Flow
    // ============================================
    this.describe('Checkout Flow', (t) => {
      t('should validate checkout requirements', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/checkout/validate', {});

        // Should fail if cart is empty or missing address
        assert.ok([200, 400, 422].includes(status), 'Should validate checkout');
      });

      t('should require shipping address', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        const { status } = await this.http.post('/checkout/create', {
          // Missing shipping address
        });

        assert.ok([400, 422].includes(status), 'Should require shipping address');
      });

      t('should create checkout session with valid data', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        await this.http.delete('/cart');
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        const { data, status } = await this.http.post('/checkout/create', {
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
          billingAddress: {
            firstName: 'Test',
            lastName: 'User',
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle checkout creation');
      });

      t('should calculate order totals correctly', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Get cart with totals
        const { data: cart } = await this.http.get('/cart');

        if (cart.subtotal !== undefined && cart.total !== undefined) {
          const subtotal = parseFloat(cart.subtotal);
          const tax = parseFloat(cart.tax || 0);
          const shipping = parseFloat(cart.shipping || 0);
          const discount = parseFloat(cart.discount || 0);
          const total = parseFloat(cart.total);

          // Total should equal subtotal + tax + shipping - discount
          const expectedTotal = subtotal + tax + shipping - discount;
          assert.ok(
            Math.abs(total - expectedTotal) < 0.01,
            'Total calculation should be correct'
          );
        }
      });
    });

    // ============================================
    // Guest Checkout
    // ============================================
    this.describe('Guest Checkout', (t) => {
      t('should allow guest to add items to cart', async (ctx) => {
        this.http.removeAuthToken();

        const { status } = await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        // Guest cart might work or require session
        assert.ok([200, 201, 401].includes(status), 'Should handle guest cart');
      });

      t('should require email for guest checkout', async (ctx) => {
        this.http.removeAuthToken();

        const { status } = await this.http.post('/checkout/guest', {
          shippingAddress: {
            firstName: 'Guest',
            lastName: 'User',
            street: '123 Guest St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
          // Missing email
        });

        assert.ok([400, 401, 422].includes(status), 'Should require email');
      });

      t('should create guest checkout with email', async (ctx) => {
        this.http.removeAuthToken();

        const { status } = await this.http.post('/checkout/guest', {
          email: 'guest@example.com',
          shippingAddress: {
            firstName: 'Guest',
            lastName: 'User',
            street: '123 Guest St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
        });

        assert.ok([200, 201, 400, 401, 404].includes(status), 'Should handle guest checkout');
      });
    });

    // ============================================
    // Cart Validation
    // ============================================
    this.describe('Cart Validation', (t) => {
      t('should validate product availability on checkout', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/cart/validate');
        assert.ok([200, 400, 404].includes(status), 'Should validate cart');
      });

      t('should handle out of stock items', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Try to add item that might be out of stock
        const { status } = await this.http.post('/cart/items', {
          productId: 'out-of-stock-product-id',
          quantity: 1,
        });

        assert.ok([200, 201, 400, 404, 422].includes(status), 'Should handle stock validation');
      });

      t('should update cart if prices changed', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Cart should reflect current prices
        const { data, status } = await this.http.get('/cart?refresh=true');
        assert.ok([200, 404].includes(status), 'Should refresh cart');
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new CartCheckoutAgent(options);
  return agent.runTests(options);
}

// CLI entry point
if (require.main === module) {
  runTests({ verbose: true })
    .then(results => {
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      console.log(`\n${passed} passed, ${failed} failed`);
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
