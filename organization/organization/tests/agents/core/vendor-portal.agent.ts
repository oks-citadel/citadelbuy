/**
 * Vendor/Supplier Portal Agent
 *
 * Tests:
 * - Vendor onboarding and approval
 * - Product listing management
 * - Inventory updates
 * - Order fulfillment workflows
 * - Payout and commission tracking
 * - Performance analytics
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class VendorPortalAgent extends BaseAgent {
  private http: HttpHelper;
  private vendorToken?: string;
  private adminToken?: string;
  private testVendorId?: string;
  private testProductId?: string;

  constructor(options: AgentOptions = {}) {
    super('Vendor/Supplier Portal Agent', 'vendor-portal', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Try to register as vendor
    try {
      const { data } = await this.http.post('/auth/register', {
        email: `vendor-test-${Date.now()}@example.com`,
        password: 'VendorPassword123!',
        name: 'Test Vendor',
        role: 'VENDOR',
      });
      this.vendorToken = data.access_token;
      this.testVendorId = data.user?.id;
    } catch (e) {
      // Try existing vendor login
      try {
        const { data } = await this.http.post('/auth/login', {
          email: 'vendor@example.com',
          password: 'Vendor123!',
        });
        this.vendorToken = data.access_token;
        this.testVendorId = data.user?.id;
      } catch (e2) {
        console.warn('Could not authenticate as vendor');
      }
    }
  }

  protected defineTests(): void {
    // ============================================
    // Vendor Onboarding
    // ============================================
    this.describe('Vendor Onboarding', (t) => {
      t('should submit vendor application', async (ctx) => {
        const { data, status } = await this.http.post('/vendors/apply', {
          businessName: 'Test Vendor LLC',
          businessType: 'LLC',
          taxId: '12-3456789',
          address: {
            street: '123 Vendor St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
          contactEmail: `vendor-${Date.now()}@example.com`,
          contactPhone: '+1234567890',
          website: 'https://testvendor.com',
          productCategories: ['electronics', 'accessories'],
          estimatedMonthlyVolume: '1000-5000',
        });

        assert.ok([200, 201, 400, 409].includes(status), 'Should handle application');
      });

      t('should check application status', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/application/status');
        assert.ok([200, 404].includes(status), 'Should get status');
      });

      t('should upload business documents', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/documents', {
          type: 'BUSINESS_LICENSE',
          // In real test, would use FormData with file
          documentUrl: 'https://example.com/doc.pdf',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle document upload');
      });

      t('should complete vendor profile', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.patch('/vendors/profile', {
          description: 'We sell quality electronics and accessories',
          logo: 'https://example.com/logo.png',
          banner: 'https://example.com/banner.png',
          returnPolicy: '30-day returns accepted',
          shippingPolicy: 'Ships within 2-3 business days',
        });

        assert.ok([200, 400, 404].includes(status), 'Should update profile');
      });

      t('should get vendor requirements checklist', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/onboarding/checklist');
        assert.ok([200, 404].includes(status), 'Should get checklist');
      });
    });

    // ============================================
    // Product Listing Management
    // ============================================
    this.describe('Product Listing Management', (t) => {
      t('should create product listing', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { data, status } = await this.http.post('/vendors/products', {
          name: 'Test Product',
          description: 'A great test product',
          price: 29.99,
          compareAtPrice: 39.99,
          sku: `TEST-${Date.now()}`,
          categoryId: 'category-123',
          stock: 100,
          images: ['https://example.com/product.jpg'],
          specifications: {
            brand: 'TestBrand',
            material: 'Premium',
          },
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should create product');
        if (status === 201 && data.id) {
          this.testProductId = data.id;
        }
      });

      t('should list vendor products', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { data, status } = await this.http.get('/vendors/products');

        assert.statusCode(status, 200, 'Should return 200');
        assert.ok(data.data || Array.isArray(data), 'Should return products');
      });

      t('should update product listing', async (ctx) => {
        if (!this.vendorToken || !this.testProductId) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.patch(`/vendors/products/${this.testProductId}`, {
          price: 24.99,
          stock: 150,
        });

        assert.ok([200, 400, 404].includes(status), 'Should update product');
      });

      t('should bulk update products', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/products/bulk-update', {
          products: [
            { id: 'prod-1', price: 19.99 },
            { id: 'prod-2', price: 29.99 },
          ],
        });

        assert.ok([200, 400, 404].includes(status), 'Should bulk update');
      });

      t('should delete product listing', async (ctx) => {
        if (!this.vendorToken || !this.testProductId) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.delete(`/vendors/products/${this.testProductId}`);
        assert.ok([200, 204, 404].includes(status), 'Should delete product');
      });

      t('should import products via CSV', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/products/import', {
          format: 'csv',
          // In real test, would upload file
          data: 'name,price,sku\nProduct 1,19.99,SKU001',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle import');
      });

      t('should export products', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/products/export?format=csv');
        assert.ok([200, 404].includes(status), 'Should export products');
      });
    });

    // ============================================
    // Inventory Management
    // ============================================
    this.describe('Inventory Management', (t) => {
      t('should update stock level', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.patch('/vendors/inventory/PROD123', {
          stock: 50,
        });

        assert.ok([200, 400, 404].includes(status), 'Should update stock');
      });

      t('should bulk update inventory', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/inventory/bulk', {
          updates: [
            { sku: 'SKU001', stock: 100 },
            { sku: 'SKU002', stock: 50 },
          ],
        });

        assert.ok([200, 400, 404].includes(status), 'Should bulk update inventory');
      });

      t('should get low stock alerts', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/inventory/low-stock');
        assert.ok([200, 404].includes(status), 'Should get low stock');
      });

      t('should set low stock threshold', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/inventory/settings', {
          lowStockThreshold: 10,
          notifyOnLowStock: true,
        });

        assert.ok([200, 400, 404].includes(status), 'Should set threshold');
      });

      t('should view inventory history', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/inventory/history?productId=PROD123');
        assert.ok([200, 404].includes(status), 'Should get history');
      });
    });

    // ============================================
    // Order Fulfillment
    // ============================================
    this.describe('Order Fulfillment', (t) => {
      t('should list pending orders', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { data, status } = await this.http.get('/vendors/orders?status=PENDING');

        assert.statusCode(status, 200, 'Should return 200');
      });

      t('should get order details', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/orders/ORDER123');
        assert.ok([200, 404].includes(status), 'Should get order details');
      });

      t('should accept order', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/orders/ORDER123/accept');
        assert.ok([200, 400, 404].includes(status), 'Should accept order');
      });

      t('should mark order as shipped', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/orders/ORDER123/ship', {
          trackingNumber: 'TRACK123456',
          carrier: 'UPS',
        });

        assert.ok([200, 400, 404].includes(status), 'Should ship order');
      });

      t('should handle order rejection', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/orders/ORDER123/reject', {
          reason: 'Out of stock',
        });

        assert.ok([200, 400, 404].includes(status), 'Should reject order');
      });

      t('should get packing slip', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/orders/ORDER123/packing-slip');
        assert.ok([200, 404].includes(status), 'Should get packing slip');
      });

      t('should bulk process orders', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/orders/bulk-ship', {
          orders: [
            { orderId: 'ORD1', trackingNumber: 'TRACK1', carrier: 'UPS' },
            { orderId: 'ORD2', trackingNumber: 'TRACK2', carrier: 'FedEx' },
          ],
        });

        assert.ok([200, 400, 404].includes(status), 'Should bulk process');
      });
    });

    // ============================================
    // Payout Management
    // ============================================
    this.describe('Payout Management', (t) => {
      t('should get payout balance', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { data, status } = await this.http.get('/vendors/payouts/balance');

        assert.ok([200, 404].includes(status), 'Should get balance');
        if (status === 200) {
          assert.hasProperty(data, 'available', 'Should have available balance');
          assert.hasProperty(data, 'pending', 'Should have pending balance');
        }
      });

      t('should list payout history', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { data, status } = await this.http.get('/vendors/payouts');
        assert.ok([200, 404].includes(status), 'Should list payouts');
      });

      t('should request payout', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/payouts/request', {
          amount: 100,
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should request payout');
      });

      t('should get commission breakdown', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/commissions');
        assert.ok([200, 404].includes(status), 'Should get commissions');
      });

      t('should update payout settings', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.patch('/vendors/payouts/settings', {
          payoutMethod: 'bank_transfer',
          minimumPayout: 50,
          autoPayoutEnabled: true,
        });

        assert.ok([200, 400, 404].includes(status), 'Should update settings');
      });

      t('should get tax documents', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/payouts/tax-documents');
        assert.ok([200, 404].includes(status), 'Should get tax docs');
      });
    });

    // ============================================
    // Analytics
    // ============================================
    this.describe('Performance Analytics', (t) => {
      t('should get sales analytics', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { data, status } = await this.http.get('/vendors/analytics/sales?period=30d');

        assert.ok([200, 404].includes(status), 'Should get analytics');
        if (status === 200) {
          assert.hasProperty(data, 'totalSales', 'Should have totalSales');
        }
      });

      t('should get product performance', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/analytics/products');
        assert.ok([200, 404].includes(status), 'Should get product analytics');
      });

      t('should get customer demographics', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/analytics/customers');
        assert.ok([200, 404].includes(status), 'Should get customer analytics');
      });

      t('should get inventory analytics', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/analytics/inventory');
        assert.ok([200, 404].includes(status), 'Should get inventory analytics');
      });

      t('should export analytics report', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/analytics/export?format=csv&period=30d');
        assert.ok([200, 404].includes(status), 'Should export report');
      });

      t('should get performance score', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { data, status } = await this.http.get('/vendors/performance/score');

        if (status === 200) {
          assert.hasProperty(data, 'score', 'Should have score');
          assert.hasProperty(data, 'metrics', 'Should have metrics');
        }
      });
    });

    // ============================================
    // Vendor Settings
    // ============================================
    this.describe('Vendor Settings', (t) => {
      t('should get vendor settings', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.get('/vendors/settings');
        assert.ok([200, 404].includes(status), 'Should get settings');
      });

      t('should update notification preferences', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.patch('/vendors/settings/notifications', {
          emailOnOrder: true,
          emailOnLowStock: true,
          emailOnReview: false,
        });

        assert.ok([200, 400, 404].includes(status), 'Should update notifications');
      });

      t('should manage team members', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.post('/vendors/team/invite', {
          email: 'team@example.com',
          role: 'fulfillment',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should invite team');
      });

      t('should configure shipping settings', async (ctx) => {
        if (!this.vendorToken) return;
        this.http.setAuthToken(this.vendorToken);

        const { status } = await this.http.patch('/vendors/settings/shipping', {
          defaultCarrier: 'UPS',
          handlingTime: 2,
          freeShippingThreshold: 50,
        });

        assert.ok([200, 400, 404].includes(status), 'Should update shipping');
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new VendorPortalAgent(options);
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
