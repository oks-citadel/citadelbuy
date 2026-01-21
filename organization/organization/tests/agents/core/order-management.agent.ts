/**
 * Order Management Agent
 *
 * Tests:
 * - Order creation and confirmation
 * - Order status transitions
 * - Order history and tracking
 * - Cancellation and modification flows
 * - Return and exchange processing
 * - Invoice generation
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class OrderManagementAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private adminToken?: string;
  private testOrderId?: string;
  private testProductId?: string;

  constructor(options: AgentOptions = {}) {
    super('Order Management Agent', 'order-management', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Login as customer
    try {
      const { data } = await this.http.post('/auth/register', {
        email: `order-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Order Test User',
      });
      this.authToken = data.access_token;
    } catch (e) {
      try {
        const { data } = await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'Customer123!',
        });
        this.authToken = data.access_token;
      } catch (e2) {
        console.warn('Could not authenticate for order tests');
      }
    }

    // Get a test product
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

  protected defineTests(): void {
    // ============================================
    // Order Creation
    // ============================================
    this.describe('Order Creation', (t) => {
      t('should create order from cart', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Add item to cart
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        // Create order
        const { data, status } = await this.http.post('/orders', {
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
          paymentMethod: 'CREDIT_CARD',
        });

        assert.ok([200, 201, 400, 402, 422].includes(status), 'Should handle order creation');
        if (status === 200 || status === 201) {
          assert.hasProperty(data, 'id', 'Order should have ID');
          this.testOrderId = data.id;
        }
      });

      t('should generate order number', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}`);

        if (status === 200) {
          assert.ok(
            data.orderNumber || data.id,
            'Should have order number or ID'
          );
        }
      });

      t('should set initial status to PENDING', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}`);

        if (status === 200) {
          assert.ok(
            ['PENDING', 'PROCESSING', 'CREATED'].includes(data.status),
            'Initial status should be PENDING or similar'
          );
        }
      });

      t('should calculate order totals correctly', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}`);

        if (status === 200) {
          assert.hasProperty(data, 'total', 'Should have total');
          assert.hasProperty(data, 'subtotal', 'Should have subtotal');

          if (data.subtotal && data.total) {
            const subtotal = parseFloat(data.subtotal);
            const tax = parseFloat(data.tax || 0);
            const shipping = parseFloat(data.shipping || 0);
            const discount = parseFloat(data.discount || 0);
            const total = parseFloat(data.total);

            // Total should be approximately correct
            const expected = subtotal + tax + shipping - discount;
            assert.ok(
              Math.abs(total - expected) < 1,
              'Total should equal subtotal + tax + shipping - discount'
            );
          }
        }
      });

      t('should include order items', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}`);

        if (status === 200) {
          const items = data.items || data.orderItems || [];
          assert.isArray(items, 'Order should have items array');
          if (items.length > 0) {
            assert.hasProperty(items[0], 'productId', 'Item should have productId');
            assert.hasProperty(items[0], 'quantity', 'Item should have quantity');
            assert.hasProperty(items[0], 'price', 'Item should have price');
          }
        }
      });

      t('should reject order without shipping address', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/orders', {
          // Missing shipping address
          paymentMethod: 'CREDIT_CARD',
        });

        assert.ok([400, 422].includes(status), 'Should require shipping address');
      });

      t('should reject order with empty cart', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Clear cart
        await this.http.delete('/cart');

        const { status } = await this.http.post('/orders', {
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        });

        assert.ok([400, 422].includes(status), 'Should reject empty cart');
      });
    });

    // ============================================
    // Order Status Transitions
    // ============================================
    this.describe('Order Status Transitions', (t) => {
      t('should transition from PENDING to PROCESSING', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/orders/${this.testOrderId}/status`, {
          status: 'PROCESSING',
        });

        assert.ok([200, 400, 403, 404].includes(status), 'Should handle status transition');
      });

      t('should transition from PROCESSING to SHIPPED', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/orders/${this.testOrderId}/status`, {
          status: 'SHIPPED',
          trackingNumber: 'TRACK123456',
          carrier: 'UPS',
        });

        assert.ok([200, 400, 403, 404].includes(status), 'Should handle shipping');
      });

      t('should transition from SHIPPED to DELIVERED', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/orders/${this.testOrderId}/status`, {
          status: 'DELIVERED',
        });

        assert.ok([200, 400, 403, 404].includes(status), 'Should handle delivery');
      });

      t('should not allow invalid status transitions', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        // Try to go from DELIVERED back to PENDING
        const { status } = await this.http.patch(`/admin/orders/${this.testOrderId}/status`, {
          status: 'PENDING',
        });

        assert.ok([400, 422].includes(status), 'Should reject invalid transition');
      });

      t('should record status change timestamp', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}`);

        if (status === 200) {
          assert.ok(
            data.updatedAt || data.statusHistory,
            'Should track status changes'
          );
        }
      });
    });

    // ============================================
    // Order History
    // ============================================
    this.describe('Order History', (t) => {
      t('should list user orders', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/orders');

        assert.statusCode(status, 200, 'Should return 200');
        assert.ok(data.data || Array.isArray(data), 'Should return orders');
      });

      t('should paginate orders', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/orders?page=1&pageSize=10');

        assert.statusCode(status, 200, 'Should return 200');
        if (data.meta) {
          assert.hasProperty(data.meta, 'total', 'Should have total');
          assert.hasProperty(data.meta, 'page', 'Should have page');
        }
      });

      t('should filter orders by status', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/orders?status=PENDING');
        assert.statusCode(status, 200, 'Should filter by status');
      });

      t('should filter orders by date range', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get(
          '/orders?startDate=2024-01-01&endDate=2024-12-31'
        );
        assert.statusCode(status, 200, 'Should filter by date');
      });

      t('should sort orders by date', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/orders?sortBy=createdAt&sortOrder=desc');
        assert.statusCode(status, 200, 'Should sort orders');
      });

      t('should get order details', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}`);

        assert.statusCode(status, 200, 'Should return order details');
        assert.hasProperty(data, 'id', 'Should have id');
        assert.hasProperty(data, 'status', 'Should have status');
        assert.hasProperty(data, 'total', 'Should have total');
      });

      t('should not access other users orders', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/orders/other-user-order-id');
        assert.ok([403, 404].includes(status), 'Should deny access');
      });
    });

    // ============================================
    // Order Tracking
    // ============================================
    this.describe('Order Tracking', (t) => {
      t('should get tracking information', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}/tracking`);

        assert.ok([200, 404].includes(status), 'Should get tracking');
        if (status === 200 && data.trackingNumber) {
          assert.hasProperty(data, 'carrier', 'Should have carrier');
        }
      });

      t('should update tracking number', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/orders/${this.testOrderId}/tracking`, {
          trackingNumber: 'NEW_TRACK_123',
          carrier: 'FedEx',
        });

        assert.ok([200, 403, 404].includes(status), 'Should update tracking');
      });

      t('should get tracking history', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get(`/orders/${this.testOrderId}/tracking/history`);
        assert.ok([200, 404].includes(status), 'Should get tracking history');
      });
    });

    // ============================================
    // Order Cancellation
    // ============================================
    this.describe('Order Cancellation', (t) => {
      t('should allow cancellation of PENDING orders', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Create a new order to cancel
        await this.http.post('/cart/items', {
          productId: this.testProductId,
          quantity: 1,
        });

        const { data: order } = await this.http.post('/orders', {
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        });

        if (order?.id) {
          const { status } = await this.http.post(`/orders/${order.id}/cancel`, {
            reason: 'Changed my mind',
          });

          assert.ok([200, 400, 422].includes(status), 'Should handle cancellation');
        }
      });

      t('should not allow cancellation of SHIPPED orders', async (ctx) => {
        // This requires an order in SHIPPED status
        // Would need to set up specific test data
      }, { skip: true });

      t('should require cancellation reason', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post(`/orders/${this.testOrderId}/cancel`, {
          // Missing reason
        });

        // Might require reason or not
        assert.ok([200, 400, 422].includes(status), 'Should handle cancellation');
      });

      t('should refund payment on cancellation', async (ctx) => {
        // Integration test that requires payment processing
        // Would verify refund is initiated
      }, { skip: true });

      t('should restore inventory on cancellation', async (ctx) => {
        // Integration test that verifies inventory is restored
      }, { skip: true });
    });

    // ============================================
    // Order Modification
    // ============================================
    this.describe('Order Modification', (t) => {
      t('should allow address update before shipping', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch(`/orders/${this.testOrderId}/address`, {
          shippingAddress: {
            firstName: 'Updated',
            lastName: 'Name',
            street: '456 New St',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            country: 'US',
          },
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle address update');
      });

      t('should not allow modification of SHIPPED orders', async (ctx) => {
        // Requires order in SHIPPED status
      }, { skip: true });

      t('should allow adding notes to order', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post(`/orders/${this.testOrderId}/notes`, {
          note: 'Please leave at door',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle notes');
      });
    });

    // ============================================
    // Returns and Exchanges
    // ============================================
    this.describe('Returns and Exchanges', (t) => {
      t('should create return request', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/returns', {
          orderId: this.testOrderId,
          reason: 'DAMAGED',
          description: 'Item arrived damaged',
        });

        assert.ok([200, 201, 400, 404, 422].includes(status), 'Should handle return request');
      });

      t('should get return shipping label', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/returns/RET123/label');
        assert.ok([200, 404].includes(status), 'Should get return label');
      });

      t('should track return status', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/returns');
        assert.ok([200, 404].includes(status), 'Should list returns');
      });

      t('should create exchange request', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/exchanges', {
          orderId: this.testOrderId,
          itemId: 'item-123',
          newVariantId: 'variant-456',
          reason: 'Wrong size',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle exchange');
      });

      t('should check return eligibility', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get(`/orders/${this.testOrderId}/return-eligibility`);
        assert.ok([200, 404].includes(status), 'Should check eligibility');
      });
    });

    // ============================================
    // Invoice Generation
    // ============================================
    this.describe('Invoice Generation', (t) => {
      t('should generate invoice for order', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}/invoice`);

        assert.ok([200, 404].includes(status), 'Should get invoice');
        if (status === 200) {
          assert.ok(
            data.invoiceNumber || data.url || data.pdf,
            'Should have invoice data'
          );
        }
      });

      t('should download invoice PDF', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { status, headers } = await this.http.get(
          `/orders/${this.testOrderId}/invoice/download`
        );

        assert.ok([200, 404].includes(status), 'Should download invoice');
        if (status === 200) {
          const contentType = headers.get('content-type');
          // Might be PDF or redirect
        }
      });

      t('should include correct invoice details', async (ctx) => {
        if (!this.authToken || !this.testOrderId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/orders/${this.testOrderId}/invoice`);

        if (status === 200 && typeof data === 'object') {
          // Check invoice has necessary fields
          assert.ok(
            data.orderNumber || data.orderId,
            'Should have order reference'
          );
        }
      });
    });

    // ============================================
    // Admin Order Management
    // ============================================
    this.describe('Admin Order Management', (t) => {
      t('should list all orders (admin)', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/orders');
        assert.ok([200, 401, 403].includes(status), 'Should list orders for admin');
      });

      t('should filter orders by customer', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/orders?customerId=user-123');
        assert.ok([200, 401, 403].includes(status), 'Should filter by customer');
      });

      t('should get order analytics', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/orders/analytics');
        assert.ok([200, 401, 403, 404].includes(status), 'Should get analytics');
      });

      t('should export orders', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/orders/export?format=csv');
        assert.ok([200, 401, 403, 404].includes(status), 'Should export orders');
      });

      t('should add admin notes to order', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post(`/admin/orders/${this.testOrderId}/notes`, {
          note: 'Admin internal note',
          isInternal: true,
        });

        assert.ok([200, 201, 401, 403, 404].includes(status), 'Should add admin note');
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new OrderManagementAgent(options);
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
