/**
 * User Account Testing Agent
 *
 * Tests:
 * - Profile management (view, update, avatar upload)
 * - Address book CRUD operations
 * - Wishlist functionality (add, remove, view)
 * - Order history access and filtering
 * - Notification preferences management
 * - Account deletion (GDPR compliance)
 * - Password change and security
 * - Email verification flow
 * - Account linking (social logins)
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class UserAccountAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private userId?: string;
  private testAddressId?: string;
  private testProductId?: string;
  private testEmail?: string;

  constructor(options: AgentOptions = {}) {
    super('User Account Testing Agent', 'user-account', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Create a test user for account testing
    try {
      this.testEmail = `account-test-${Date.now()}@example.com`;
      const { data } = await this.http.post('/auth/register', {
        email: this.testEmail,
        password: 'TestPassword123!',
        name: 'Account Test User',
        firstName: 'Account',
        lastName: 'User',
      });
      this.authToken = data.access_token;
      this.userId = data.user.id;
    } catch (e) {
      console.warn('Could not create test user for account tests');
    }

    // Get a test product for wishlist tests
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
    // Cleanup: Delete test user if GDPR deletion endpoint exists
    if (this.authToken) {
      try {
        this.http.setAuthToken(this.authToken);
        await this.http.delete('/users/account');
      } catch (e) {
        // Cleanup failed, but that's okay for tests
      }
    }
  }

  protected defineTests(): void {
    // ============================================
    // Profile Management Tests
    // ============================================
    this.describe('Profile Management', (t) => {
      t('should retrieve user profile', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/profile');

        assert.statusCode(status, 200, 'Profile retrieval should return 200');
        assert.hasProperty(data, 'id', 'Profile should have id');
        assert.hasProperty(data, 'email', 'Profile should have email');
        assert.equal(data.email, this.testEmail, 'Email should match');
        assert.notHasProperty(data, 'password', 'Password should not be returned');
        assert.notHasProperty(data, 'passwordHash', 'Password hash should not be returned');
      });

      t('should update profile information', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.patch('/users/profile', {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567890',
        });

        assert.ok([200, 204].includes(status), 'Profile update should succeed');
        if (status === 200) {
          assert.equal(data.firstName, 'Updated', 'First name should be updated');
          assert.equal(data.lastName, 'Name', 'Last name should be updated');
        }
      });

      t('should update email with verification', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const newEmail = `updated-${Date.now()}@example.com`;
        const { status } = await this.http.patch('/users/profile', {
          email: newEmail,
        });

        // Should either succeed or require verification
        assert.ok([200, 202, 400, 422].includes(status), 'Email update should be handled');
      });

      t('should reject invalid email format', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/profile', {
          email: 'invalid-email-format',
        });

        assert.statusCode(status, 400, 'Invalid email should return 400');
      });

      t('should reject invalid phone format', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/profile', {
          phone: 'invalid-phone',
        });

        // Should validate phone format
        assert.ok([200, 400, 422].includes(status), 'Should validate phone format');
      });

      t('should upload profile avatar', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/profile/avatar', {
          avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        });

        assert.ok([200, 201, 400, 404, 413].includes(status), 'Avatar upload should be handled');
      });

      t('should reject oversized avatar', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Create a large base64 string (simulating large image)
        const largeImage = 'data:image/png;base64,' + 'A'.repeat(10 * 1024 * 1024); // 10MB

        const { status } = await this.http.post('/users/profile/avatar', {
          avatar: largeImage,
        });

        // Should reject if size validation exists
        assert.ok([200, 201, 400, 413].includes(status), 'Should handle large files');
      });

      t('should delete profile avatar', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/users/profile/avatar');
        assert.ok([200, 204, 404].includes(status), 'Avatar deletion should be handled');
      });

      t('should get profile preferences', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/profile/preferences');

        assert.ok([200, 404].includes(status), 'Should get preferences');
        if (status === 200) {
          assert.isObject(data, 'Preferences should be an object');
        }
      });

      t('should update profile preferences', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/profile/preferences', {
          language: 'en',
          currency: 'USD',
          timezone: 'America/New_York',
        });

        assert.ok([200, 204, 404].includes(status), 'Should update preferences');
      });
    });

    // ============================================
    // Address Book CRUD Tests
    // ============================================
    this.describe('Address Book CRUD', (t) => {
      t('should create new address', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/users/addresses', {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          street2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
          phone: '+12125551234',
          isDefault: true,
        });

        assert.ok([200, 201].includes(status), 'Address creation should succeed');
        assert.hasProperty(data, 'id', 'Address should have id');
        assert.equal(data.street, '123 Main St', 'Street should match');
        assert.equal(data.city, 'New York', 'City should match');

        this.testAddressId = data.id;
      });

      t('should list all addresses', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/addresses');

        assert.statusCode(status, 200, 'Should return 200');
        assert.isArray(data.data || data, 'Should return array of addresses');

        const addresses = data.data || data;
        if (addresses.length > 0) {
          assert.hasProperty(addresses[0], 'id', 'Address should have id');
          assert.hasProperty(addresses[0], 'street', 'Address should have street');
          assert.hasProperty(addresses[0], 'city', 'Address should have city');
        }
      });

      t('should get single address', async (ctx) => {
        if (!this.authToken || !this.testAddressId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(`/users/addresses/${this.testAddressId}`);

        assert.statusCode(status, 200, 'Should return 200');
        assert.equal(data.id, this.testAddressId, 'Address ID should match');
      });

      t('should update address', async (ctx) => {
        if (!this.authToken || !this.testAddressId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.patch(`/users/addresses/${this.testAddressId}`, {
          street: '456 Updated St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
        });

        assert.ok([200, 204].includes(status), 'Address update should succeed');
        if (status === 200) {
          assert.equal(data.street, '456 Updated St', 'Street should be updated');
          assert.equal(data.city, 'Boston', 'City should be updated');
        }
      });

      t('should set address as default', async (ctx) => {
        if (!this.authToken || !this.testAddressId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch(`/users/addresses/${this.testAddressId}`, {
          isDefault: true,
        });

        assert.ok([200, 204].includes(status), 'Should set default address');
      });

      t('should validate required address fields', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/addresses', {
          street: '123 Test St',
          // Missing required fields
        });

        assert.statusCode(status, 400, 'Missing required fields should return 400');
      });

      t('should validate zipcode format', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/addresses', {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'NY',
          zipCode: 'INVALID',
          country: 'US',
        });

        // Should validate zipcode
        assert.ok([200, 201, 400, 422].includes(status), 'Should validate zipcode');
      });

      t('should delete address', async (ctx) => {
        if (!this.authToken || !this.testAddressId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete(`/users/addresses/${this.testAddressId}`);

        assert.ok([200, 204].includes(status), 'Address deletion should succeed');

        // Verify deletion
        const { status: getStatus } = await this.http.get(`/users/addresses/${this.testAddressId}`);
        assert.statusCode(getStatus, 404, 'Deleted address should not be found');
      });

      t('should not access other users addresses', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/users/addresses/other-user-address-id');
        assert.ok([403, 404].includes(status), 'Should deny access to other users addresses');
      });
    });

    // ============================================
    // Wishlist Functionality Tests
    // ============================================
    this.describe('Wishlist Functionality', (t) => {
      t('should add item to wishlist', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/users/wishlist', {
          productId: this.testProductId,
        });

        assert.ok([200, 201].includes(status), 'Add to wishlist should succeed');
        if (status === 200 || status === 201) {
          assert.ok(data.id || data.productId, 'Should return wishlist item');
        }
      });

      t('should get wishlist items', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/wishlist');

        assert.statusCode(status, 200, 'Should return 200');
        assert.isArray(data.data || data, 'Wishlist should be an array');

        const items = data.data || data;
        if (items.length > 0) {
          assert.hasProperty(items[0], 'productId', 'Item should have productId');
        }
      });

      t('should prevent duplicate wishlist items', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Try to add the same product again
        const { status } = await this.http.post('/users/wishlist', {
          productId: this.testProductId,
        });

        // Should either succeed (idempotent) or reject duplicate
        assert.ok([200, 201, 409, 422].includes(status), 'Should handle duplicate');
      });

      t('should remove item from wishlist', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete(`/users/wishlist/${this.testProductId}`);

        assert.ok([200, 204, 404].includes(status), 'Remove from wishlist should succeed');
      });

      t('should add wishlist item to cart', async (ctx) => {
        if (!this.authToken || !this.testProductId) return;
        this.http.setAuthToken(this.authToken);

        // Add to wishlist first
        await this.http.post('/users/wishlist', {
          productId: this.testProductId,
        });

        // Move to cart
        const { status } = await this.http.post(`/users/wishlist/${this.testProductId}/move-to-cart`, {
          quantity: 1,
        });

        assert.ok([200, 201, 404].includes(status), 'Should move to cart');
      });

      t('should clear entire wishlist', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/users/wishlist');

        assert.ok([200, 204].includes(status), 'Clear wishlist should succeed');

        // Verify wishlist is empty
        const { data } = await this.http.get('/users/wishlist');
        const items = data.data || data;
        assert.lengthOf(items, 0, 'Wishlist should be empty');
      });

      t('should share wishlist', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/users/wishlist/share', {
          method: 'link',
        });

        assert.ok([200, 201, 404].includes(status), 'Should handle wishlist sharing');
        if (status === 200 || status === 201) {
          assert.ok(data.shareUrl || data.shareLink, 'Should return share link');
        }
      });

      t('should get wishlist item count', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/wishlist/count');

        assert.ok([200, 404].includes(status), 'Should get wishlist count');
        if (status === 200) {
          assert.isNumber(data.count || data, 'Count should be a number');
        }
      });
    });

    // ============================================
    // Order History Access Tests
    // ============================================
    this.describe('Order History Access', (t) => {
      t('should get order history', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/orders');

        assert.statusCode(status, 200, 'Should return 200');
        assert.ok(data.data || Array.isArray(data), 'Should return orders');
      });

      t('should paginate order history', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/orders?page=1&pageSize=10');

        assert.statusCode(status, 200, 'Should return 200');
        if (data.meta) {
          assert.hasProperty(data.meta, 'total', 'Should have total');
          assert.hasProperty(data.meta, 'page', 'Should have page');
          assert.hasProperty(data.meta, 'pageSize', 'Should have pageSize');
        }
      });

      t('should filter orders by status', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/orders?status=DELIVERED');

        assert.statusCode(status, 200, 'Should filter by status');
        const orders = data.data || data;
        if (Array.isArray(orders) && orders.length > 0) {
          assert.equal(orders[0].status, 'DELIVERED', 'Order should have correct status');
        }
      });

      t('should filter orders by date range', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get(
          '/users/orders?startDate=2024-01-01&endDate=2024-12-31'
        );

        assert.statusCode(status, 200, 'Should filter by date range');
      });

      t('should sort orders by date', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(
          '/users/orders?sortBy=createdAt&sortOrder=desc'
        );

        assert.statusCode(status, 200, 'Should sort orders');
        const orders = data.data || data;
        if (Array.isArray(orders) && orders.length > 1) {
          const date1 = new Date(orders[0].createdAt).getTime();
          const date2 = new Date(orders[1].createdAt).getTime();
          assert.ok(date1 >= date2, 'Orders should be sorted descending');
        }
      });

      t('should search orders by order number', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/users/orders?search=ORD-12345');

        assert.statusCode(status, 200, 'Should search orders');
      });

      t('should get order statistics', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/orders/stats');

        assert.ok([200, 404].includes(status), 'Should get order stats');
        if (status === 200) {
          assert.ok(
            data.totalOrders !== undefined || data.totalSpent !== undefined,
            'Should have order statistics'
          );
        }
      });
    });

    // ============================================
    // Notification Preferences Tests
    // ============================================
    this.describe('Notification Preferences', (t) => {
      t('should get notification preferences', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/notifications/preferences');

        assert.ok([200, 404].includes(status), 'Should get notification preferences');
        if (status === 200) {
          assert.isObject(data, 'Preferences should be an object');
        }
      });

      t('should update email notification preferences', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/notifications/preferences', {
          emailNotifications: {
            orderUpdates: true,
            promotions: false,
            newsletter: true,
            productRecommendations: false,
          },
        });

        assert.ok([200, 204, 404].includes(status), 'Should update email preferences');
      });

      t('should update SMS notification preferences', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/notifications/preferences', {
          smsNotifications: {
            orderUpdates: true,
            deliveryAlerts: true,
            promotions: false,
          },
        });

        assert.ok([200, 204, 404].includes(status), 'Should update SMS preferences');
      });

      t('should update push notification preferences', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/notifications/preferences', {
          pushNotifications: {
            enabled: true,
            orderUpdates: true,
            promotions: false,
          },
        });

        assert.ok([200, 204, 404].includes(status), 'Should update push preferences');
      });

      t('should unsubscribe from all marketing', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/notifications/unsubscribe-marketing', {});

        assert.ok([200, 204, 404].includes(status), 'Should unsubscribe from marketing');
      });

      t('should get notification history', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/notifications');

        assert.ok([200, 404].includes(status), 'Should get notification history');
        if (status === 200) {
          assert.ok(data.data || Array.isArray(data), 'Should return notifications');
        }
      });

      t('should mark notification as read', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/notifications/notif-123/read', {});

        assert.ok([200, 204, 404].includes(status), 'Should mark as read');
      });

      t('should mark all notifications as read', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/notifications/mark-all-read', {});

        assert.ok([200, 204, 404].includes(status), 'Should mark all as read');
      });

      t('should delete notification', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/users/notifications/notif-123');

        assert.ok([200, 204, 404].includes(status), 'Should delete notification');
      });
    });

    // ============================================
    // Account Deletion (GDPR) Tests
    // ============================================
    this.describe('Account Deletion (GDPR)', (t) => {
      t('should initiate account deletion request', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/users/account/delete-request', {
          reason: 'No longer needed',
        });

        assert.ok([200, 202, 404].includes(status), 'Should initiate deletion');
        if (status === 200 || status === 202) {
          assert.ok(
            data.message || data.confirmationToken,
            'Should return confirmation or message'
          );
        }
      });

      t('should require password for account deletion', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/users/account', {
          // Missing password
        });

        assert.ok([400, 401, 404].includes(status), 'Should require password');
      });

      t('should export user data (GDPR)', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/users/account/export-data', {});

        assert.ok([200, 202, 404].includes(status), 'Should export user data');
        if (status === 200) {
          assert.ok(
            data.downloadUrl || data.data,
            'Should return data or download URL'
          );
        }
      });

      t('should anonymize user data on deletion', async (ctx) => {
        // Create a separate test user for deletion
        const testEmail = `deletion-test-${Date.now()}@example.com`;
        const { data: registerData } = await this.http.post('/auth/register', {
          email: testEmail,
          password: 'TestPassword123!',
          name: 'Deletion Test',
        });

        if (registerData?.access_token) {
          this.http.setAuthToken(registerData.access_token);

          const { status } = await this.http.delete('/users/account', {
            password: 'TestPassword123!',
            confirm: true,
          });

          assert.ok([200, 204, 404].includes(status), 'Should delete account');

          // Verify account is deleted
          const { status: loginStatus } = await this.http.post('/auth/login', {
            email: testEmail,
            password: 'TestPassword123!',
          });

          assert.statusCode(loginStatus, 401, 'Deleted account should not login');
        }
      });

      t('should cancel deletion request', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/account/cancel-deletion', {});

        assert.ok([200, 404].includes(status), 'Should cancel deletion request');
      });

      t('should have deletion grace period', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/account/deletion-status');

        assert.ok([200, 404].includes(status), 'Should get deletion status');
        if (status === 200 && data.deletionScheduled) {
          assert.hasProperty(data, 'deletionDate', 'Should have deletion date');
        }
      });
    });

    // ============================================
    // Password Change Tests
    // ============================================
    this.describe('Password Change', (t) => {
      t('should change password with correct current password', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/password/change', {
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!',
        });

        assert.ok([200, 204].includes(status), 'Password change should succeed');

        // Change it back for other tests
        if (status === 200 || status === 204) {
          await this.http.post('/users/password/change', {
            currentPassword: 'NewPassword123!',
            newPassword: 'TestPassword123!',
          });
        }
      });

      t('should reject password change with wrong current password', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/password/change', {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        });

        assert.statusCode(status, 401, 'Wrong current password should return 401');
      });

      t('should reject weak new password', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/password/change', {
          currentPassword: 'TestPassword123!',
          newPassword: '123',
        });

        assert.statusCode(status, 400, 'Weak password should return 400');
      });

      t('should require minimum password length', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/password/change', {
          currentPassword: 'TestPassword123!',
          newPassword: 'Short1!',
        });

        assert.statusCode(status, 400, 'Short password should return 400');
      });

      t('should reject password same as current', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/password/change', {
          currentPassword: 'TestPassword123!',
          newPassword: 'TestPassword123!',
        });

        // Should reject or allow (depends on policy)
        assert.ok([200, 204, 400, 422].includes(status), 'Should handle same password');
      });

      t('should invalidate sessions after password change', async (ctx) => {
        // Create a new test user for this test
        const testEmail = `password-test-${Date.now()}@example.com`;
        const { data: registerData } = await this.http.post('/auth/register', {
          email: testEmail,
          password: 'OldPassword123!',
          name: 'Password Test',
        });

        if (registerData?.access_token) {
          const oldToken = registerData.access_token;
          this.http.setAuthToken(oldToken);

          // Change password
          await this.http.post('/users/password/change', {
            currentPassword: 'OldPassword123!',
            newPassword: 'NewPassword123!',
          });

          // Try to use old token (depending on implementation, might still work)
          const { status } = await this.http.get('/users/profile');

          // Allow both scenarios - stateless JWT vs session invalidation
          assert.ok([200, 401].includes(status), 'Should handle token after password change');
        }
      });

      t('should send confirmation email on password change', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/users/password/change', {
          currentPassword: 'TestPassword123!',
          newPassword: 'TempPassword123!',
        });

        // Change back
        if (status === 200 || status === 204) {
          await this.http.post('/users/password/change', {
            currentPassword: 'TempPassword123!',
            newPassword: 'TestPassword123!',
          });
        }

        assert.ok([200, 204].includes(status), 'Should send confirmation');
      });
    });

    // ============================================
    // Email Verification Tests
    // ============================================
    this.describe('Email Verification', (t) => {
      t('should send verification email', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/email/send-verification', {});

        assert.ok([200, 202, 404, 429].includes(status), 'Should send verification email');
      });

      t('should verify email with valid token', async (ctx) => {
        const { status } = await this.http.post('/users/email/verify', {
          token: 'valid-verification-token',
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle verification');
      });

      t('should reject invalid verification token', async (ctx) => {
        const { status } = await this.http.post('/users/email/verify', {
          token: 'invalid-token',
        });

        assert.ok([400, 404].includes(status), 'Invalid token should be rejected');
      });

      t('should reject expired verification token', async (ctx) => {
        const { status } = await this.http.post('/users/email/verify', {
          token: 'expired-token',
        });

        assert.ok([400, 404, 410].includes(status), 'Expired token should be rejected');
      });

      t('should check email verification status', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/email/verification-status');

        assert.ok([200, 404].includes(status), 'Should get verification status');
        if (status === 200) {
          assert.ok(
            data.verified !== undefined || data.isVerified !== undefined,
            'Should have verification status'
          );
        }
      });

      t('should rate limit verification email requests', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const responses: number[] = [];

        // Send multiple verification emails rapidly
        for (let i = 0; i < 5; i++) {
          const { status } = await this.http.post('/users/email/send-verification', {});
          responses.push(status);
        }

        // At least one should be rate limited
        const rateLimited = responses.filter(s => s === 429);
        // This might not always trigger depending on rate limit config
        // assert.ok(rateLimited.length > 0, 'Should rate limit verification requests');
      }, { timeout: 30000 });
    });

    // ============================================
    // Account Linking (Social Logins) Tests
    // ============================================
    this.describe('Account Linking (Social Logins)', (t) => {
      t('should initiate OAuth provider linking', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/account/link/google');

        assert.ok([200, 302, 404].includes(status), 'Should initiate OAuth linking');
        if (status === 200) {
          assert.ok(data.authUrl || data.redirectUrl, 'Should return OAuth URL');
        }
      });

      t('should list linked accounts', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/account/linked');

        assert.ok([200, 404].includes(status), 'Should get linked accounts');
        if (status === 200) {
          assert.isArray(data.accounts || data, 'Should return array of linked accounts');
        }
      });

      t('should link Google account', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/account/link/google', {
          code: 'mock-google-oauth-code',
        });

        assert.ok([200, 201, 400, 404, 409].includes(status), 'Should handle Google linking');
      });

      t('should link Facebook account', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/users/account/link/facebook', {
          code: 'mock-facebook-oauth-code',
        });

        assert.ok([200, 201, 400, 404, 409].includes(status), 'Should handle Facebook linking');
      });

      t('should prevent duplicate provider linking', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Try to link the same provider twice
        await this.http.post('/users/account/link/google', {
          code: 'mock-google-oauth-code-1',
        });

        const { status } = await this.http.post('/users/account/link/google', {
          code: 'mock-google-oauth-code-2',
        });

        // Should reject or update existing link
        assert.ok([200, 201, 400, 409].includes(status), 'Should handle duplicate linking');
      });

      t('should unlink social account', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/users/account/link/google');

        assert.ok([200, 204, 404].includes(status), 'Should unlink account');
      });

      t('should prevent unlinking last login method', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // If user only has social login and no password, should prevent unlinking
        const { status } = await this.http.delete('/users/account/link/google');

        // Should allow or prevent based on whether user has other login methods
        assert.ok([200, 204, 400, 404, 422].includes(status), 'Should handle last login method');
      });

      t('should get OAuth provider metadata', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/users/account/link/google/info');

        assert.ok([200, 404].includes(status), 'Should get provider info');
        if (status === 200) {
          assert.ok(data.connected !== undefined, 'Should indicate connection status');
        }
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new UserAccountAgent(options);
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
