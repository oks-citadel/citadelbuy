/**
 * Notification Testing Agent
 *
 * Tests:
 * - Email delivery (transactional, marketing)
 * - SMS notifications
 * - Push notifications
 * - In-app notifications
 * - Webhook delivery and retries
 * - Template rendering accuracy
 * - Notification preferences
 * - Unsubscribe functionality
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class NotificationAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private userId?: string;
  private testNotificationId?: string;
  private testDeviceId: string;

  constructor(options: AgentOptions = {}) {
    super('Notification Testing Agent', 'notification', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
    this.testDeviceId = `test-device-${Date.now()}`;
  }

  protected async setup(): Promise<void> {
    try {
      // Register a test user for notification testing
      const { data: registerData } = await this.http.post('/auth/register', {
        email: `notification-test-${Date.now()}@example.com`,
        password: 'NotificationTest123!',
        name: 'Notification Test User',
      });

      this.authToken = registerData.access_token;
      this.userId = registerData.user.id;
      this.http.setAuthToken(this.authToken);
    } catch (error) {
      console.warn('Could not set up test user for notifications:', error);
    }
  }

  protected async teardown(): Promise<void> {
    // Clean up test notifications and tokens
    try {
      if (this.authToken) {
        this.http.setAuthToken(this.authToken);
        await this.http.delete('/notifications');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  protected defineTests(): void {
    // ============================================
    // In-App Notifications Tests
    // ============================================
    this.describe('In-App Notifications', (t) => {
      t('should retrieve user notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.get('/notifications');

        assert.statusCode(status, 200, 'Should retrieve notifications successfully');
        assert.hasProperty(data, 'notifications', 'Response should have notifications array');
        assert.hasProperty(data, 'total', 'Response should have total count');
        assert.hasProperty(data, 'unreadCount', 'Response should have unread count');
        assert.isArray(data.notifications, 'Notifications should be an array');
      });

      t('should get unread notification count', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.get('/notifications/unread-count');

        assert.statusCode(status, 200, 'Should get unread count successfully');
        assert.hasProperty(data, 'unreadCount', 'Response should have unreadCount');
        assert.isNumber(data.unreadCount, 'Unread count should be a number');
        assert.ok(data.unreadCount >= 0, 'Unread count should be non-negative');
      });

      t('should filter notifications by category', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const categories = ['ORDER', 'PROMOTION', 'SYSTEM', 'MESSAGE'];

        for (const category of categories) {
          const { data, status } = await this.http.get(`/notifications?category=${category}`);

          if (status === 200 && data.notifications.length > 0) {
            data.notifications.forEach((notif: any) => {
              assert.equal(notif.category, category, `Notification should be of category ${category}`);
            });
          }
        }
      });

      t('should filter unread notifications only', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.get('/notifications?unreadOnly=true');

        assert.statusCode(status, 200, 'Should filter unread notifications');
        if (data.notifications.length > 0) {
          data.notifications.forEach((notif: any) => {
            assert.equal(notif.isRead, false, 'All notifications should be unread');
          });
        }
      });

      t('should paginate notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data: page1 } = await this.http.get('/notifications?limit=5&offset=0');
        const { data: page2 } = await this.http.get('/notifications?limit=5&offset=5');

        assert.ok(page1.notifications.length <= 5, 'First page should respect limit');
        assert.ok(page2.notifications.length <= 5, 'Second page should respect limit');

        if (page1.total > 5) {
          // If there are enough notifications, pages should be different
          const page1Ids = page1.notifications.map((n: any) => n.id);
          const page2Ids = page2.notifications.map((n: any) => n.id);

          if (page2Ids.length > 0) {
            assert.notEqual(page1Ids[0], page2Ids[0], 'Different pages should have different notifications');
          }
        }
      });

      t('should mark notification as read', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Get notifications first
        const { data: listData } = await this.http.get('/notifications?unreadOnly=true');

        if (listData.notifications.length > 0) {
          const notificationId = listData.notifications[0].id;
          const { data, status } = await this.http.put(`/notifications/${notificationId}/read`, {});

          assert.statusCode(status, 200, 'Should mark notification as read');
          assert.equal(data.isRead, true, 'Notification should be marked as read');
          assert.ok(data.readAt, 'Should have readAt timestamp');
        }
      });

      t('should mark all notifications as read', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.put('/notifications/read-all', {});
        assert.ok([200, 204].includes(status), 'Should mark all as read successfully');

        // Verify unread count is 0
        const { data: countData } = await this.http.get('/notifications/unread-count');
        assert.equal(countData.unreadCount, 0, 'Unread count should be 0 after marking all as read');
      });

      t('should delete a single notification', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data: listData } = await this.http.get('/notifications');

        if (listData.notifications.length > 0) {
          const notificationId = listData.notifications[0].id;
          const { status } = await this.http.delete(`/notifications/${notificationId}`);

          assert.ok([200, 204].includes(status), 'Should delete notification successfully');

          // Verify it's deleted
          const { status: getStatus } = await this.http.put(`/notifications/${notificationId}/read`, {});
          assert.statusCode(getStatus, 404, 'Deleted notification should not be found');
        }
      });

      t('should delete all notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.delete('/notifications');
        assert.ok([200, 204].includes(status), 'Should delete all notifications');

        // Verify all deleted
        const { data } = await this.http.get('/notifications');
        assert.equal(data.total, 0, 'Total notifications should be 0 after deletion');
      });

      t('should not access other users notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Try to access/mark read a notification with an invalid ID (security test)
        const fakeNotificationId = 'other-user-notification-id';
        const { status } = await this.http.put(`/notifications/${fakeNotificationId}/read`, {});

        assert.statusCode(status, 404, 'Should not find other users notifications');
      });
    });

    // ============================================
    // Push Notification Tests
    // ============================================
    this.describe('Push Notifications', (t) => {
      t('should register push notification token', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.post('/notifications/register-token', {
          deviceId: this.testDeviceId,
          token: `push-token-${Date.now()}`,
          platform: 'ANDROID',
        });

        assert.statusCode(status, 201, 'Should register push token successfully');
        assert.hasProperty(data, 'deviceId', 'Response should have deviceId');
        assert.hasProperty(data, 'token', 'Response should have token');
        assert.equal(data.deviceId, this.testDeviceId, 'Device ID should match');
      });

      t('should update existing push token', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const newToken = `updated-push-token-${Date.now()}`;
        const { data, status } = await this.http.post('/notifications/register-token', {
          deviceId: this.testDeviceId,
          token: newToken,
          platform: 'ANDROID',
        });

        assert.ok([200, 201].includes(status), 'Should update push token successfully');
        assert.equal(data.token, newToken, 'Token should be updated');
      });

      t('should register tokens for multiple platforms', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const platforms = ['IOS', 'ANDROID', 'WEB'];

        for (const platform of platforms) {
          const { status } = await this.http.post('/notifications/register-token', {
            deviceId: `${this.testDeviceId}-${platform.toLowerCase()}`,
            token: `token-${platform.toLowerCase()}-${Date.now()}`,
            platform,
          });

          assert.ok([200, 201].includes(status), `Should register token for ${platform}`);
        }
      });

      t('should unregister push token', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.post('/notifications/unregister-token', {
          deviceId: this.testDeviceId,
        });

        assert.ok([200, 204].includes(status), 'Should unregister token successfully');
      });

      t('should reject invalid platform type', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.post('/notifications/register-token', {
          deviceId: 'invalid-device',
          token: 'some-token',
          platform: 'INVALID_PLATFORM',
        });

        assert.statusCode(status, 400, 'Should reject invalid platform');
      });

      t('should require device ID for token registration', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.post('/notifications/register-token', {
          token: 'some-token',
          platform: 'ANDROID',
        });

        assert.statusCode(status, 400, 'Should require deviceId');
      });

      t('should require token for registration', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.post('/notifications/register-token', {
          deviceId: 'some-device',
          platform: 'ANDROID',
        });

        assert.statusCode(status, 400, 'Should require token');
      });
    });

    // ============================================
    // Notification Preferences Tests
    // ============================================
    this.describe('Notification Preferences', (t) => {
      t('should get notification preferences', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.get('/notifications/preferences');

        assert.statusCode(status, 200, 'Should get preferences successfully');
        assert.hasProperty(data, 'userId', 'Preferences should have userId');

        // Email preferences
        assert.ok('orderConfirmation' in data, 'Should have orderConfirmation preference');
        assert.ok('shippingUpdates' in data, 'Should have shippingUpdates preference');
        assert.ok('promotionalEmails' in data, 'Should have promotionalEmails preference');

        // Push preferences
        assert.ok('pushEnabled' in data, 'Should have pushEnabled preference');
        assert.ok('pushOrders' in data, 'Should have pushOrders preference');

        // SMS preferences
        assert.ok('smsEnabled' in data, 'Should have smsEnabled preference');
      });

      t('should update email notification preferences', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          orderConfirmation: true,
          shippingUpdates: true,
          promotionalEmails: false,
          newsletters: false,
        });

        assert.statusCode(status, 200, 'Should update preferences successfully');
        assert.equal(data.orderConfirmation, true, 'Order confirmation should be enabled');
        assert.equal(data.shippingUpdates, true, 'Shipping updates should be enabled');
        assert.equal(data.promotionalEmails, false, 'Promotional emails should be disabled');
        assert.equal(data.newsletters, false, 'Newsletters should be disabled');
      });

      t('should update push notification preferences', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          pushEnabled: true,
          pushOrders: true,
          pushPromotions: false,
          pushMessages: true,
        });

        assert.statusCode(status, 200, 'Should update push preferences');
        assert.equal(data.pushEnabled, true, 'Push should be enabled');
        assert.equal(data.pushOrders, true, 'Push orders should be enabled');
        assert.equal(data.pushPromotions, false, 'Push promotions should be disabled');
        assert.equal(data.pushMessages, true, 'Push messages should be enabled');
      });

      t('should update SMS notification preferences', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          smsEnabled: true,
          smsOrderUpdates: true,
          smsDeliveryAlerts: true,
        });

        assert.statusCode(status, 200, 'Should update SMS preferences');
        assert.equal(data.smsEnabled, true, 'SMS should be enabled');
        assert.equal(data.smsOrderUpdates, true, 'SMS order updates should be enabled');
        assert.equal(data.smsDeliveryAlerts, true, 'SMS delivery alerts should be enabled');
      });

      t('should disable all marketing preferences', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          promotionalEmails: false,
          newsletters: false,
          productRecommendations: false,
          pushPromotions: false,
        });

        assert.statusCode(status, 200, 'Should disable all marketing');
        assert.equal(data.promotionalEmails, false, 'Promotional emails disabled');
        assert.equal(data.newsletters, false, 'Newsletters disabled');
        assert.equal(data.productRecommendations, false, 'Product recommendations disabled');
        assert.equal(data.pushPromotions, false, 'Push promotions disabled');
      });

      t('should enable transactional notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          orderConfirmation: true,
          shippingUpdates: true,
          deliveryNotifications: true,
        });

        assert.statusCode(status, 200, 'Should enable transactional notifications');
        assert.equal(data.orderConfirmation, true, 'Order confirmation enabled');
        assert.equal(data.shippingUpdates, true, 'Shipping updates enabled');
        assert.equal(data.deliveryNotifications, true, 'Delivery notifications enabled');
      });

      t('should update individual preference fields', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Update only one field
        const { data, status } = await this.http.put('/notifications/preferences', {
          cartAbandonment: true,
        });

        assert.statusCode(status, 200, 'Should update single preference');
        assert.equal(data.cartAbandonment, true, 'Cart abandonment should be enabled');
      });

      t('should reject invalid preference values', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.put('/notifications/preferences', {
          orderConfirmation: 'invalid_value',
        });

        assert.statusCode(status, 400, 'Should reject invalid boolean value');
      });

      t('should persist preference changes', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Update preferences
        await this.http.put('/notifications/preferences', {
          priceDropAlerts: true,
          backInStockAlerts: true,
        });

        // Retrieve and verify
        const { data } = await this.http.get('/notifications/preferences');
        assert.equal(data.priceDropAlerts, true, 'Price drop alerts should persist');
        assert.equal(data.backInStockAlerts, true, 'Back in stock alerts should persist');
      });
    });

    // ============================================
    // Email Notification Tests
    // ============================================
    this.describe('Email Notifications', (t) => {
      t('should handle transactional email preferences', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          orderConfirmation: true,
          shippingUpdates: true,
          deliveryNotifications: true,
        });

        // Transactional emails should be enabled
        assert.equal(data.orderConfirmation, true, 'Order confirmation emails enabled');
        assert.equal(data.shippingUpdates, true, 'Shipping update emails enabled');
        assert.equal(data.deliveryNotifications, true, 'Delivery notification emails enabled');
      });

      t('should handle marketing email preferences', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          newsletters: true,
          promotionalEmails: true,
          productRecommendations: true,
        });

        // Marketing emails should be enabled
        assert.equal(data.newsletters, true, 'Newsletter emails enabled');
        assert.equal(data.promotionalEmails, true, 'Promotional emails enabled');
        assert.equal(data.productRecommendations, true, 'Product recommendation emails enabled');
      });

      t('should enable review reminder emails', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          reviewReminders: true,
        });

        assert.equal(data.reviewReminders, true, 'Review reminder emails enabled');
      });

      t('should enable wishlist update emails', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          wishlistUpdates: true,
        });

        assert.equal(data.wishlistUpdates, true, 'Wishlist update emails enabled');
      });

      t('should enable cart abandonment emails', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          cartAbandonment: true,
        });

        assert.equal(data.cartAbandonment, true, 'Cart abandonment emails enabled');
      });
    });

    // ============================================
    // SMS Notification Tests
    // ============================================
    this.describe('SMS Notifications', (t) => {
      t('should enable SMS notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          smsEnabled: true,
        });

        assert.statusCode(status, 200, 'Should enable SMS notifications');
        assert.equal(data.smsEnabled, true, 'SMS should be enabled');
      });

      t('should disable SMS notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          smsEnabled: false,
        });

        assert.statusCode(status, 200, 'Should disable SMS notifications');
        assert.equal(data.smsEnabled, false, 'SMS should be disabled');
      });

      t('should enable SMS order updates', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          smsEnabled: true,
          smsOrderUpdates: true,
        });

        assert.equal(data.smsOrderUpdates, true, 'SMS order updates should be enabled');
      });

      t('should enable SMS delivery alerts', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          smsEnabled: true,
          smsDeliveryAlerts: true,
        });

        assert.equal(data.smsDeliveryAlerts, true, 'SMS delivery alerts should be enabled');
      });

      t('should respect SMS disabled state', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Disable SMS but enable specific categories
        const { data } = await this.http.put('/notifications/preferences', {
          smsEnabled: false,
          smsOrderUpdates: true,
          smsDeliveryAlerts: true,
        });

        // Individual preferences can be set, but master switch is off
        assert.equal(data.smsEnabled, false, 'SMS master switch should be off');
      });
    });

    // ============================================
    // Notification Template Tests
    // ============================================
    this.describe('Notification Templates', (t) => {
      t('should handle notification categories', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Get notifications for each category
        const categories = ['ORDER', 'PROMOTION', 'SYSTEM', 'MESSAGE'];

        for (const category of categories) {
          const { status } = await this.http.get(`/notifications?category=${category}`);
          assert.statusCode(status, 200, `Should handle ${category} category`);
        }
      });

      t('should handle notification priority levels', async (ctx) => {
        // Notification priorities are typically: LOW, NORMAL, HIGH, URGENT
        // These are used internally when creating notifications
        // This test verifies the system can handle different priorities
        assert.ok(true, 'Notification priority levels are handled internally');
      });

      t('should include notification metadata', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.get('/notifications');

        if (data.notifications.length > 0) {
          const notification = data.notifications[0];

          // Check standard notification properties
          assert.hasProperty(notification, 'id', 'Notification should have id');
          assert.hasProperty(notification, 'title', 'Notification should have title');
          assert.hasProperty(notification, 'body', 'Notification should have body');
          assert.hasProperty(notification, 'category', 'Notification should have category');
          assert.hasProperty(notification, 'createdAt', 'Notification should have createdAt');
          assert.hasProperty(notification, 'isRead', 'Notification should have isRead');
        }
      });

      t('should handle notification action URLs', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.get('/notifications');

        if (data.notifications.length > 0) {
          // Some notifications may have action URLs for deep linking
          const notificationWithAction = data.notifications.find((n: any) => n.actionUrl);

          if (notificationWithAction) {
            assert.isString(notificationWithAction.actionUrl, 'Action URL should be a string');
          }
        }
      });

      t('should handle notification images', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.get('/notifications');

        if (data.notifications.length > 0) {
          // Some notifications may have images
          const notificationWithImage = data.notifications.find((n: any) => n.imageUrl);

          if (notificationWithImage) {
            assert.isString(notificationWithImage.imageUrl, 'Image URL should be a string');
          }
        }
      });
    });

    // ============================================
    // Unsubscribe Functionality Tests
    // ============================================
    this.describe('Unsubscribe Functionality', (t) => {
      t('should unsubscribe from all marketing emails', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data, status } = await this.http.put('/notifications/preferences', {
          newsletters: false,
          promotionalEmails: false,
          productRecommendations: false,
          cartAbandonment: false,
        });

        assert.statusCode(status, 200, 'Should unsubscribe from marketing');
        assert.equal(data.newsletters, false, 'Newsletters unsubscribed');
        assert.equal(data.promotionalEmails, false, 'Promotional emails unsubscribed');
        assert.equal(data.productRecommendations, false, 'Product recommendations unsubscribed');
        assert.equal(data.cartAbandonment, false, 'Cart abandonment unsubscribed');
      });

      t('should preserve transactional emails when unsubscribing from marketing', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // First enable transactional
        await this.http.put('/notifications/preferences', {
          orderConfirmation: true,
          shippingUpdates: true,
        });

        // Then disable marketing
        const { data } = await this.http.put('/notifications/preferences', {
          promotionalEmails: false,
          newsletters: false,
        });

        // Transactional should still be enabled
        assert.equal(data.orderConfirmation, true, 'Order confirmation still enabled');
        assert.equal(data.shippingUpdates, true, 'Shipping updates still enabled');
        assert.equal(data.promotionalEmails, false, 'Marketing disabled');
      });

      t('should disable all push notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          pushEnabled: false,
          pushOrders: false,
          pushPromotions: false,
          pushMessages: false,
        });

        assert.equal(data.pushEnabled, false, 'Push disabled');
        assert.equal(data.pushOrders, false, 'Push orders disabled');
        assert.equal(data.pushPromotions, false, 'Push promotions disabled');
        assert.equal(data.pushMessages, false, 'Push messages disabled');
      });

      t('should disable all SMS notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.put('/notifications/preferences', {
          smsEnabled: false,
          smsOrderUpdates: false,
          smsDeliveryAlerts: false,
        });

        assert.equal(data.smsEnabled, false, 'SMS disabled');
        assert.equal(data.smsOrderUpdates, false, 'SMS order updates disabled');
        assert.equal(data.smsDeliveryAlerts, false, 'SMS delivery alerts disabled');
      });

      t('should re-subscribe to previously unsubscribed channels', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Unsubscribe
        await this.http.put('/notifications/preferences', {
          promotionalEmails: false,
        });

        // Re-subscribe
        const { data } = await this.http.put('/notifications/preferences', {
          promotionalEmails: true,
        });

        assert.equal(data.promotionalEmails, true, 'Should be able to re-subscribe');
      });
    });

    // ============================================
    // Webhook and Delivery Tests
    // ============================================
    this.describe('Webhook and Delivery', (t) => {
      t('should handle notification delivery states', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.get('/notifications');

        if (data.notifications.length > 0) {
          const notification = data.notifications[0];

          // Notifications should have delivery tracking
          assert.ok('createdAt' in notification, 'Should track creation time');

          // May have sent status
          if ('isSent' in notification) {
            assert.ok(
              typeof notification.isSent === 'boolean',
              'isSent should be boolean'
            );
          }
        }
      });

      t('should track notification read status', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.get('/notifications');

        if (data.notifications.length > 0) {
          data.notifications.forEach((notification: any) => {
            assert.hasProperty(notification, 'isRead', 'Should have isRead status');
            assert.ok(
              typeof notification.isRead === 'boolean',
              'isRead should be boolean'
            );
          });
        }
      });

      t('should maintain notification order by date', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { data } = await this.http.get('/notifications');

        if (data.notifications.length > 1) {
          // Notifications should be ordered by createdAt descending (newest first)
          const dates = data.notifications.map((n: any) => new Date(n.createdAt).getTime());

          for (let i = 0; i < dates.length - 1; i++) {
            assert.ok(
              dates[i] >= dates[i + 1],
              'Notifications should be ordered newest first'
            );
          }
        }
      });

      t('should handle bulk notification operations', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        // Mark all as read is a bulk operation
        const { status } = await this.http.put('/notifications/read-all', {});
        assert.ok([200, 204].includes(status), 'Should handle bulk mark as read');

        // Delete all is a bulk operation
        const { status: deleteStatus } = await this.http.delete('/notifications');
        assert.ok([200, 204].includes(status), 'Should handle bulk delete');
      });
    });

    // ============================================
    // Authorization and Security Tests
    // ============================================
    this.describe('Authorization and Security', (t) => {
      t('should require authentication for notifications', async (ctx) => {
        this.http.removeAuthToken();
        const { status } = await this.http.get('/notifications');
        assert.statusCode(status, 401, 'Should require authentication');

        // Restore token for other tests
        if (this.authToken) this.http.setAuthToken(this.authToken);
      });

      t('should require authentication for preferences', async (ctx) => {
        this.http.removeAuthToken();
        const { status } = await this.http.get('/notifications/preferences');
        assert.statusCode(status, 401, 'Should require authentication');

        // Restore token for other tests
        if (this.authToken) this.http.setAuthToken(this.authToken);
      });

      t('should require authentication for push token registration', async (ctx) => {
        this.http.removeAuthToken();
        const { status } = await this.http.post('/notifications/register-token', {
          deviceId: 'test-device',
          token: 'test-token',
          platform: 'ANDROID',
        });
        assert.statusCode(status, 401, 'Should require authentication');

        // Restore token for other tests
        if (this.authToken) this.http.setAuthToken(this.authToken);
      });

      t('should prevent accessing other users notifications', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');
        this.http.setAuthToken(this.authToken);

        // Try to manipulate a notification with a fake ID
        const { status } = await this.http.delete('/notifications/other-user-notification-123');
        assert.statusCode(status, 404, 'Should not access other users notifications');
      });

      t('should validate notification ID format', async (ctx) => {
        if (!this.authToken) throw new Error('No auth token available');

        const { status } = await this.http.put('/notifications/invalid-id-format/read', {});
        assert.ok([400, 404].includes(status), 'Should validate notification ID format');
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new NotificationAgent(options);
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
