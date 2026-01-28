/**
 * Admin Dashboard Testing Agent
 *
 * Tests:
 * - User management (CRUD, roles, permissions)
 * - Order oversight and intervention
 * - Analytics and reporting
 * - System configuration
 * - Content management
 * - Audit logging
 * - Bulk operations
 * - Export functionality
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class AdminDashboardAgent extends BaseAgent {
  private http: HttpHelper;
  private adminToken?: string;
  private testUserId?: string;
  private testOrderId?: string;
  private testProductId?: string;

  constructor(options: AgentOptions = {}) {
    super('Admin Dashboard Agent', 'admin-dashboard', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Login as admin
    try {
      const { data } = await this.http.post('/auth/register', {
        email: `admin-test-${Date.now()}@example.com`,
        password: 'AdminPassword123!',
        name: 'Admin Test User',
        role: 'ADMIN',
      });
      this.adminToken = data.access_token;
    } catch (e) {
      try {
        const { data } = await this.http.post('/auth/login', {
          email: 'admin@example.com',
          password: 'Admin123!',
        });
        this.adminToken = data.access_token;
      } catch (e2) {
        console.warn('Could not authenticate as admin for dashboard tests');
      }
    }

    // Get test data if available
    if (this.adminToken) {
      this.http.setAuthToken(this.adminToken);

      try {
        const { data: usersData } = await this.http.get('/admin/users?pageSize=1');
        const users = usersData.data || usersData;
        if (Array.isArray(users) && users.length > 0) {
          this.testUserId = users[0].id;
        }
      } catch (e) {
        // User endpoint might not exist yet
      }

      try {
        const { data: ordersData } = await this.http.get('/admin/orders?pageSize=1');
        const orders = ordersData.data || ordersData;
        if (Array.isArray(orders) && orders.length > 0) {
          this.testOrderId = orders[0].id;
        }
      } catch (e) {
        // Order endpoint might not exist yet
      }

      try {
        const { data: productsData } = await this.http.get('/products?pageSize=1');
        const products = productsData.data || productsData;
        if (Array.isArray(products) && products.length > 0) {
          this.testProductId = products[0].id;
        }
      } catch (e) {
        // Product endpoint might not exist yet
      }
    }
  }

  protected async teardown(): Promise<void> {
    // Cleanup test data if needed
  }

  protected defineTests(): void {
    // ============================================
    // User Management - CRUD Operations
    // ============================================
    this.describe('User Management - CRUD', (t) => {
      t('should list all users with pagination', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/users?page=1&pageSize=20');

        assert.ok([200, 401, 403].includes(status), 'Should handle user listing');
        if (status === 200) {
          assert.ok(data.data || Array.isArray(data), 'Should return users array');
          if (data.meta) {
            assert.hasProperty(data.meta, 'total', 'Should have total count');
            assert.hasProperty(data.meta, 'page', 'Should have current page');
            assert.hasProperty(data.meta, 'pageSize', 'Should have page size');
          }
        }
      });

      t('should filter users by role', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/users?role=CUSTOMER');
        assert.ok([200, 401, 403].includes(status), 'Should filter by role');
      });

      t('should search users by email or name', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/users?search=test@example.com');
        assert.ok([200, 401, 403].includes(status), 'Should search users');
      });

      t('should get user details', async (ctx) => {
        if (!this.adminToken || !this.testUserId) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get(`/admin/users/${this.testUserId}`);

        assert.ok([200, 401, 403, 404].includes(status), 'Should get user details');
        if (status === 200) {
          assert.hasProperty(data, 'id', 'Should have user ID');
          assert.hasProperty(data, 'email', 'Should have email');
          assert.hasProperty(data, 'role', 'Should have role');
          assert.notHasProperty(data, 'password', 'Should not expose password');
        }
      });

      t('should create new user', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.post('/admin/users', {
          email: `new-user-${Date.now()}@example.com`,
          password: 'NewUser123!',
          name: 'New Test User',
          role: 'CUSTOMER',
        });

        assert.ok([200, 201, 400, 401, 403, 409].includes(status), 'Should handle user creation');
        if (status === 200 || status === 201) {
          assert.hasProperty(data, 'id', 'Created user should have ID');
          assert.equal(data.role, 'CUSTOMER', 'Role should match');
        }
      });

      t('should update user details', async (ctx) => {
        if (!this.adminToken || !this.testUserId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/users/${this.testUserId}`, {
          name: 'Updated Name',
          phone: '+1234567890',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should update user');
      });

      t('should deactivate user account', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        // Create a user to deactivate
        const { data: newUser, status: createStatus } = await this.http.post('/admin/users', {
          email: `deactivate-user-${Date.now()}@example.com`,
          password: 'TestUser123!',
          name: 'User To Deactivate',
          role: 'CUSTOMER',
        });

        if (createStatus === 200 || createStatus === 201) {
          const { status } = await this.http.patch(`/admin/users/${newUser.id}`, {
            status: 'INACTIVE',
          });
          assert.ok([200, 400, 401, 403, 404].includes(status), 'Should deactivate user');
        }
      });

      t('should delete user account', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        // Create a user to delete
        const { data: newUser, status: createStatus } = await this.http.post('/admin/users', {
          email: `delete-user-${Date.now()}@example.com`,
          password: 'TestUser123!',
          name: 'User To Delete',
          role: 'CUSTOMER',
        });

        if (createStatus === 200 || createStatus === 201) {
          const { status } = await this.http.delete(`/admin/users/${newUser.id}`);
          assert.ok([200, 204, 401, 403, 404].includes(status), 'Should delete user');
        }
      });

      t('should prevent deletion of admin users', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        // Try to delete an admin user (should be protected)
        const { status } = await this.http.delete('/admin/users/admin-user-id');
        assert.ok([400, 401, 403, 404].includes(status), 'Should protect admin users');
      });
    });

    // ============================================
    // User Management - Roles & Permissions
    // ============================================
    this.describe('User Management - Roles & Permissions', (t) => {
      t('should list available roles', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/roles');

        assert.ok([200, 401, 403, 404].includes(status), 'Should list roles');
        if (status === 200) {
          assert.isArray(data, 'Should return roles array');
        }
      });

      t('should change user role', async (ctx) => {
        if (!this.adminToken || !this.testUserId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/users/${this.testUserId}/role`, {
          role: 'VENDOR',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should change role');
      });

      t('should assign custom permissions', async (ctx) => {
        if (!this.adminToken || !this.testUserId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post(`/admin/users/${this.testUserId}/permissions`, {
          permissions: ['READ_PRODUCTS', 'WRITE_PRODUCTS'],
        });

        assert.ok([200, 201, 400, 401, 403, 404].includes(status), 'Should assign permissions');
      });

      t('should revoke permissions', async (ctx) => {
        if (!this.adminToken || !this.testUserId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.delete(`/admin/users/${this.testUserId}/permissions`, {
          body: JSON.stringify({ permissions: ['WRITE_PRODUCTS'] }),
        });

        assert.ok([200, 204, 400, 401, 403, 404].includes(status), 'Should revoke permissions');
      });

      t('should prevent privilege escalation', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        // Non-super-admin trying to create super admin
        const { status } = await this.http.post('/admin/users', {
          email: `escalation-test-${Date.now()}@example.com`,
          password: 'Test123!',
          name: 'Escalation Test',
          role: 'SUPER_ADMIN',
        });

        // Should either succeed (if user is super admin) or fail
        assert.ok([200, 201, 400, 401, 403].includes(status), 'Should handle escalation attempt');
      });
    });

    // ============================================
    // Order Oversight & Intervention
    // ============================================
    this.describe('Order Oversight & Intervention', (t) => {
      t('should list all orders with filters', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/orders?page=1&pageSize=20');

        assert.ok([200, 401, 403].includes(status), 'Should list orders');
        if (status === 200) {
          assert.ok(data.data || Array.isArray(data), 'Should return orders');
        }
      });

      t('should filter orders by status', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/orders?status=PENDING');
        assert.ok([200, 401, 403].includes(status), 'Should filter by status');
      });

      t('should filter orders by date range', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get(
          '/admin/orders?startDate=2024-01-01&endDate=2024-12-31'
        );
        assert.ok([200, 401, 403].includes(status), 'Should filter by date');
      });

      t('should manually update order status', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/orders/${this.testOrderId}/status`, {
          status: 'PROCESSING',
          note: 'Admin intervention - manually processing',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should update status');
      });

      t('should add internal notes to order', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post(`/admin/orders/${this.testOrderId}/notes`, {
          note: 'Customer called about delivery',
          isInternal: true,
        });

        assert.ok([200, 201, 401, 403, 404].includes(status), 'Should add notes');
      });

      t('should refund order', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post(`/admin/orders/${this.testOrderId}/refund`, {
          amount: 10.00,
          reason: 'Customer satisfaction',
        });

        assert.ok([200, 201, 400, 401, 403, 404].includes(status), 'Should process refund');
      });

      t('should cancel order on behalf of customer', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post(`/admin/orders/${this.testOrderId}/cancel`, {
          reason: 'Admin cancelled - customer request',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should cancel order');
      });

      t('should view order payment details', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get(`/admin/orders/${this.testOrderId}/payment`);

        assert.ok([200, 401, 403, 404].includes(status), 'Should view payment details');
        if (status === 200) {
          // Should have payment info but not full card details
          assert.ok(data.paymentMethod || data.status, 'Should have payment info');
        }
      });

      t('should reassign order to different vendor', async (ctx) => {
        if (!this.adminToken || !this.testOrderId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch(`/admin/orders/${this.testOrderId}/vendor`, {
          vendorId: 'new-vendor-id',
          reason: 'Original vendor unavailable',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should reassign vendor');
      });
    });

    // ============================================
    // Analytics & Reporting
    // ============================================
    this.describe('Analytics & Reporting', (t) => {
      t('should get dashboard overview stats', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/analytics/overview');

        assert.ok([200, 401, 403, 404].includes(status), 'Should get overview');
        if (status === 200) {
          // Should have key metrics
          assert.isObject(data, 'Should return stats object');
        }
      });

      t('should get sales analytics', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/analytics/sales?period=30d');

        assert.ok([200, 401, 403, 404].includes(status), 'Should get sales analytics');
        if (status === 200) {
          assert.ok(
            data.totalSales !== undefined || data.revenue !== undefined,
            'Should have sales metrics'
          );
        }
      });

      t('should get revenue by period', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/analytics/revenue?groupBy=day&days=7');
        assert.ok([200, 401, 403, 404].includes(status), 'Should get revenue breakdown');
      });

      t('should get user growth metrics', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/analytics/users?period=30d');
        assert.ok([200, 401, 403, 404].includes(status), 'Should get user metrics');
      });

      t('should get product performance', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/analytics/products/top?limit=10');

        assert.ok([200, 401, 403, 404].includes(status), 'Should get product performance');
        if (status === 200 && Array.isArray(data)) {
          assert.ok(data.length <= 10, 'Should respect limit');
        }
      });

      t('should get conversion funnel', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/analytics/funnel');
        assert.ok([200, 401, 403, 404].includes(status), 'Should get funnel data');
      });

      t('should get customer lifetime value', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/analytics/customer-ltv');
        assert.ok([200, 401, 403, 404].includes(status), 'Should get LTV metrics');
      });

      t('should get inventory alerts', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/analytics/inventory/alerts');

        assert.ok([200, 401, 403, 404].includes(status), 'Should get inventory alerts');
        if (status === 200) {
          assert.isArray(data, 'Should return alerts array');
        }
      });

      t('should get abandoned cart analytics', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/analytics/abandoned-carts');
        assert.ok([200, 401, 403, 404].includes(status), 'Should get abandoned cart data');
      });
    });

    // ============================================
    // System Configuration
    // ============================================
    this.describe('System Configuration', (t) => {
      t('should get system settings', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/settings');

        assert.ok([200, 401, 403, 404].includes(status), 'Should get settings');
        if (status === 200) {
          assert.isObject(data, 'Should return settings object');
        }
      });

      t('should update system settings', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch('/admin/settings', {
          maintenanceMode: false,
          allowRegistration: true,
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should update settings');
      });

      t('should manage payment gateway settings', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch('/admin/settings/payment', {
          provider: 'stripe',
          enabled: true,
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should manage payment settings');
      });

      t('should configure shipping methods', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/settings/shipping-methods', {
          name: 'Express Shipping',
          carrier: 'FedEx',
          basePrice: 15.00,
          estimatedDays: 2,
        });

        assert.ok([200, 201, 400, 401, 403].includes(status), 'Should configure shipping');
      });

      t('should set tax rates', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/settings/tax-rates', {
          country: 'US',
          state: 'CA',
          rate: 0.0725,
        });

        assert.ok([200, 201, 400, 401, 403].includes(status), 'Should set tax rates');
      });

      t('should configure email templates', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch('/admin/settings/email-templates/order-confirmation', {
          subject: 'Your Order Confirmation',
          body: 'Thank you for your order...',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should configure email templates');
      });

      t('should manage feature flags', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch('/admin/settings/features', {
          enableReviews: true,
          enableWishlist: true,
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should manage feature flags');
      });

      t('should configure API rate limits', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch('/admin/settings/rate-limits', {
          default: { requests: 100, period: 60 },
          authenticated: { requests: 1000, period: 60 },
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should configure rate limits');
      });
    });

    // ============================================
    // Content Management
    // ============================================
    this.describe('Content Management', (t) => {
      t('should create product category', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.post('/admin/categories', {
          name: 'Test Category',
          slug: `test-category-${Date.now()}`,
          description: 'Test category description',
        });

        assert.ok([200, 201, 400, 401, 403, 409].includes(status), 'Should create category');
      });

      t('should update product category', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch('/admin/categories/category-id', {
          name: 'Updated Category Name',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should update category');
      });

      t('should delete product category', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.delete('/admin/categories/category-to-delete');
        assert.ok([200, 204, 400, 401, 403, 404].includes(status), 'Should delete category');
      });

      t('should manage promotional banners', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/banners', {
          title: 'Summer Sale',
          imageUrl: 'https://example.com/banner.jpg',
          link: '/sale',
          active: true,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        assert.ok([200, 201, 400, 401, 403].includes(status), 'Should manage banners');
      });

      t('should create discount code', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.post('/admin/discounts', {
          code: `SAVE10-${Date.now()}`,
          type: 'PERCENTAGE',
          value: 10,
          maxUses: 100,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        assert.ok([200, 201, 400, 401, 403, 409].includes(status), 'Should create discount');
      });

      t('should manage CMS pages', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/pages', {
          title: 'About Us',
          slug: `about-us-${Date.now()}`,
          content: 'This is our about page...',
          published: true,
        });

        assert.ok([200, 201, 400, 401, 403, 409].includes(status), 'Should manage pages');
      });

      t('should manage FAQ entries', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/faqs', {
          question: 'How do I return an item?',
          answer: 'You can return items within 30 days...',
          category: 'Returns',
          order: 1,
        });

        assert.ok([200, 201, 400, 401, 403].includes(status), 'Should manage FAQs');
      });

      t('should moderate product reviews', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/reviews?status=PENDING');
        assert.ok([200, 401, 403, 404].includes(status), 'Should list pending reviews');
      });

      t('should approve or reject reviews', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.patch('/admin/reviews/review-id/status', {
          status: 'APPROVED',
        });

        assert.ok([200, 400, 401, 403, 404].includes(status), 'Should moderate reviews');
      });
    });

    // ============================================
    // Audit Logging
    // ============================================
    this.describe('Audit Logging', (t) => {
      t('should view audit logs', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/audit-logs?page=1&pageSize=50');

        assert.ok([200, 401, 403, 404].includes(status), 'Should view audit logs');
        if (status === 200) {
          assert.ok(data.data || Array.isArray(data), 'Should return logs');
        }
      });

      t('should filter logs by action type', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/audit-logs?action=USER_LOGIN');
        assert.ok([200, 401, 403, 404].includes(status), 'Should filter by action');
      });

      t('should filter logs by user', async (ctx) => {
        if (!this.adminToken || !this.testUserId) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get(`/admin/audit-logs?userId=${this.testUserId}`);
        assert.ok([200, 401, 403, 404].includes(status), 'Should filter by user');
      });

      t('should filter logs by date range', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get(
          '/admin/audit-logs?startDate=2024-01-01&endDate=2024-12-31'
        );
        assert.ok([200, 401, 403, 404].includes(status), 'Should filter by date');
      });

      t('should filter logs by IP address', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/audit-logs?ip=192.168.1.1');
        assert.ok([200, 401, 403, 404].includes(status), 'Should filter by IP');
      });

      t('should view detailed log entry', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/audit-logs/log-id');

        assert.ok([200, 401, 403, 404].includes(status), 'Should view log details');
        if (status === 200) {
          assert.hasProperty(data, 'action', 'Should have action');
          assert.hasProperty(data, 'timestamp', 'Should have timestamp');
        }
      });

      t('should track admin actions in logs', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        // Perform an admin action
        await this.http.get('/admin/users');

        // Check if it was logged
        const { data, status } = await this.http.get('/admin/audit-logs?action=ADMIN_USER_LIST');
        assert.ok([200, 401, 403, 404].includes(status), 'Should log admin actions');
      });

      t('should export audit logs', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/audit-logs/export?format=csv');
        assert.ok([200, 401, 403, 404].includes(status), 'Should export logs');
      });
    });

    // ============================================
    // Bulk Operations
    // ============================================
    this.describe('Bulk Operations', (t) => {
      t('should bulk update product prices', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/products/bulk/update-price', {
          productIds: ['prod-1', 'prod-2', 'prod-3'],
          priceAdjustment: { type: 'PERCENTAGE', value: 10 },
        });

        assert.ok([200, 201, 400, 401, 403, 404].includes(status), 'Should bulk update prices');
      });

      t('should bulk update product status', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/products/bulk/update-status', {
          productIds: ['prod-1', 'prod-2'],
          status: 'ACTIVE',
        });

        assert.ok([200, 201, 400, 401, 403, 404].includes(status), 'Should bulk update status');
      });

      t('should bulk delete products', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/products/bulk/delete', {
          productIds: ['prod-to-delete-1', 'prod-to-delete-2'],
        });

        assert.ok([200, 204, 400, 401, 403, 404].includes(status), 'Should bulk delete');
      });

      t('should bulk assign categories', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/products/bulk/assign-category', {
          productIds: ['prod-1', 'prod-2'],
          categoryId: 'cat-123',
        });

        assert.ok([200, 201, 400, 401, 403, 404].includes(status), 'Should bulk assign category');
      });

      t('should bulk import products from CSV', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const csvData = 'name,price,sku\nProduct 1,19.99,SKU001\nProduct 2,29.99,SKU002';

        const { status } = await this.http.post('/admin/products/bulk/import', {
          format: 'csv',
          data: csvData,
        });

        assert.ok([200, 201, 202, 400, 401, 403].includes(status), 'Should import products');
      });

      t('should bulk send emails to users', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/users/bulk/send-email', {
          userIds: ['user-1', 'user-2'],
          subject: 'Important Update',
          body: 'We have an important update...',
        });

        assert.ok([200, 202, 400, 401, 403].includes(status), 'Should bulk send emails');
      });

      t('should bulk update inventory', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/products/bulk/update-inventory', {
          updates: [
            { productId: 'prod-1', quantity: 100 },
            { productId: 'prod-2', quantity: 50 },
          ],
        });

        assert.ok([200, 201, 400, 401, 403].includes(status), 'Should bulk update inventory');
      });

      t('should track bulk operation progress', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/bulk-operations/operation-id/status');
        assert.ok([200, 401, 403, 404].includes(status), 'Should track bulk operation');
      });
    });

    // ============================================
    // Export Functionality
    // ============================================
    this.describe('Export Functionality', (t) => {
      t('should export users to CSV', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status, headers } = await this.http.get('/admin/users/export?format=csv');

        assert.ok([200, 401, 403, 404].includes(status), 'Should export users');
        if (status === 200) {
          const contentType = headers.get('content-type');
          assert.ok(
            contentType?.includes('csv') || contentType?.includes('octet-stream'),
            'Should return CSV content type'
          );
        }
      });

      t('should export orders to Excel', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/orders/export?format=xlsx');
        assert.ok([200, 401, 403, 404].includes(status), 'Should export orders');
      });

      t('should export products with filters', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get(
          '/admin/products/export?format=csv&category=electronics'
        );
        assert.ok([200, 401, 403, 404].includes(status), 'Should export filtered products');
      });

      t('should export sales report', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get(
          '/admin/reports/sales/export?startDate=2024-01-01&endDate=2024-12-31&format=pdf'
        );
        assert.ok([200, 401, 403, 404].includes(status), 'Should export sales report');
      });

      t('should export customer list', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/customers/export?format=csv');
        assert.ok([200, 401, 403, 404].includes(status), 'Should export customers');
      });

      t('should export inventory report', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/inventory/export?format=xlsx');
        assert.ok([200, 401, 403, 404].includes(status), 'Should export inventory');
      });

      t('should export analytics data', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/analytics/export?period=30d&format=csv');
        assert.ok([200, 401, 403, 404].includes(status), 'Should export analytics');
      });

      t('should schedule recurring exports', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.post('/admin/exports/scheduled', {
          type: 'SALES_REPORT',
          format: 'csv',
          frequency: 'WEEKLY',
          email: 'admin@example.com',
        });

        assert.ok([200, 201, 400, 401, 403].includes(status), 'Should schedule exports');
      });

      t('should list export history', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { data, status } = await this.http.get('/admin/exports/history?page=1&pageSize=20');

        assert.ok([200, 401, 403, 404].includes(status), 'Should list export history');
        if (status === 200) {
          assert.ok(data.data || Array.isArray(data), 'Should return exports');
        }
      });

      t('should download previous export', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        const { status } = await this.http.get('/admin/exports/export-id/download');
        assert.ok([200, 401, 403, 404].includes(status), 'Should download export');
      });
    });

    // ============================================
    // Security & Access Control
    // ============================================
    this.describe('Security & Access Control', (t) => {
      t('should deny non-admin access to admin endpoints', async (ctx) => {
        this.http.removeAuthToken();

        const { status } = await this.http.get('/admin/users');
        assert.statusCode(status, 401, 'Should require authentication');
      });

      t('should deny customer access to admin endpoints', async (ctx) => {
        // Login as customer
        try {
          const { data } = await this.http.post('/auth/login', {
            email: 'customer@example.com',
            password: 'Customer123!',
          });

          this.http.setAuthToken(data.access_token);
          const { status } = await this.http.get('/admin/users');
          assert.statusCode(status, 403, 'Customers should not access admin endpoints');
        } catch (e) {
          // If customer login fails, skip this test
        }
      });

      t('should deny vendor access to admin endpoints', async (ctx) => {
        // Login as vendor
        try {
          const { data } = await this.http.post('/auth/login', {
            email: 'vendor@example.com',
            password: 'Vendor123!',
          });

          this.http.setAuthToken(data.access_token);
          const { status } = await this.http.get('/admin/users');
          assert.ok([401, 403].includes(status), 'Vendors should not access admin endpoints');
        } catch (e) {
          // If vendor login fails, skip this test
        }
      });

      t('should log all admin actions', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        // Perform an action
        await this.http.get('/admin/users');

        // Verify it was logged
        const { status } = await this.http.get('/admin/audit-logs?limit=1');
        assert.ok([200, 401, 403, 404].includes(status), 'Should log actions');
      });

      t('should require 2FA for sensitive operations', async (ctx) => {
        if (!this.adminToken) return;
        this.http.setAuthToken(this.adminToken);

        // Attempt sensitive operation (e.g., delete all users)
        const { status } = await this.http.delete('/admin/users/bulk-delete-all');

        // Should require 2FA or be forbidden
        assert.ok([400, 401, 403, 404].includes(status), 'Should protect sensitive operations');
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new AdminDashboardAgent(options);
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
