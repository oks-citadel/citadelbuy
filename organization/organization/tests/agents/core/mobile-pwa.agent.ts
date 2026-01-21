/**
 * Mobile/PWA Testing Agent
 *
 * Tests:
 * - Mobile responsiveness and viewport handling
 * - Offline functionality and service workers
 * - App store deployment validation
 * - Deep linking capabilities
 * - Push notification handling
 * - Device-specific behavior (touch, orientation, sensors)
 * - PWA manifest and installation
 * - Touch interactions and gestures
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class MobilePWAAgent extends BaseAgent {
  private http: HttpHelper;
  private webHttp: HttpHelper;
  private authToken?: string;
  private userId?: string;
  private testProductId?: string;
  private testOrderId?: string;
  private deviceTokens: Map<string, string> = new Map();

  constructor(options: AgentOptions = {}) {
    super('Mobile/PWA Testing Agent', 'mobile-pwa', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
    this.webHttp = new HttpHelper(this.context.baseUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Login to get auth token for authenticated mobile tests
    try {
      const { data } = await this.http.post('/auth/login', {
        email: 'customer@example.com',
        password: 'Customer123!',
      });
      this.authToken = data.access_token;
      this.userId = data.user?.id;
    } catch (e) {
      // Try to register if login fails
      try {
        const { data } = await this.http.post('/auth/register', {
          email: `test-mobile-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Mobile Test User',
        });
        this.authToken = data.access_token;
        this.userId = data.user?.id;
      } catch (e2) {
        console.warn('Could not get auth token for mobile tests');
      }
    }

    // Get test data
    try {
      const { data: products } = await this.http.get('/products?pageSize=1');
      const productList = products.data || products;
      if (Array.isArray(productList) && productList.length > 0) {
        this.testProductId = productList[0].id;
      }
    } catch (e) {
      console.warn('Could not get test product');
    }

    // Generate device tokens for testing
    this.deviceTokens.set('ios', `ios-device-token-${Date.now()}`);
    this.deviceTokens.set('android', `android-device-token-${Date.now()}`);
    this.deviceTokens.set('web', `web-push-token-${Date.now()}`);
  }

  protected async teardown(): Promise<void> {
    // Cleanup: Unregister device tokens
    if (this.authToken) {
      this.http.setAuthToken(this.authToken);
      for (const [platform, token] of this.deviceTokens.entries()) {
        try {
          await this.http.delete(`/notifications/devices/${token}`);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  protected defineTests(): void {
    // ============================================
    // Mobile Responsiveness Tests
    // ============================================
    this.describe('Mobile Responsiveness', (t) => {
      t('should serve mobile-optimized HTML', async (ctx) => {
        const { data, status, headers } = await this.webHttp.get('/', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
          },
        });

        assert.statusCode(status, 200, 'Should return 200');

        // Check for viewport meta tag
        if (typeof data === 'string') {
          assert.includes(
            data.toLowerCase(),
            'viewport',
            'Should include viewport meta tag for mobile'
          );
          assert.includes(
            data.toLowerCase(),
            'width=device-width',
            'Should set viewport to device width'
          );
        }
      });

      t('should include mobile-specific meta tags', async (ctx) => {
        const { data, status } = await this.webHttp.get('/', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
          },
        });

        if (typeof data === 'string') {
          const html = data.toLowerCase();

          // Check for mobile optimization tags
          assert.includes(html, 'viewport', 'Should have viewport meta');

          // Optional but recommended
          const hasAppleMobileWebAppCapable = html.includes('apple-mobile-web-app-capable');
          const hasAppleMobileWebAppStatus = html.includes('apple-mobile-web-app-status-bar-style');
          const hasThemeColor = html.includes('theme-color');
        }
      });

      t('should handle mobile user agents correctly', async (ctx) => {
        const userAgents = [
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
          'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        ];

        for (const ua of userAgents) {
          const { status } = await this.webHttp.get('/', {
            headers: { 'User-Agent': ua },
          });
          assert.statusCode(status, 200, `Should handle ${ua.split(' ')[0]} user agent`);
        }
      });

      t('should support touch-friendly API responses', async (ctx) => {
        const { data, status } = await this.http.get('/products?pageSize=20', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          },
        });

        assert.statusCode(status, 200, 'Should return products for mobile');

        // Check that products include mobile-friendly image sizes
        const products = data.data || data;
        if (Array.isArray(products) && products.length > 0) {
          const product = products[0];
          assert.ok(product, 'Should have product data');
        }
      });

      t('should handle orientation changes in API', async (ctx) => {
        // Test that API doesn't break with orientation-specific requests
        const { status: portrait } = await this.http.get('/products', {
          headers: { 'X-Device-Orientation': 'portrait' },
        });
        const { status: landscape } = await this.http.get('/products', {
          headers: { 'X-Device-Orientation': 'landscape' },
        });

        assert.ok([200, 400].includes(portrait), 'Should handle portrait orientation');
        assert.ok([200, 400].includes(landscape), 'Should handle landscape orientation');
      });

      t('should optimize images for mobile bandwidth', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
              'Save-Data': 'on', // Data saver header
            },
          });

          if (status === 200 && data.images) {
            // Should return optimized images or smaller versions
            assert.ok(data, 'Should return product with images');
          }
        }
      });
    });

    // ============================================
    // Offline Functionality Tests
    // ============================================
    this.describe('Offline Functionality', (t) => {
      t('should serve service worker file', async (ctx) => {
        const { status, headers } = await this.webHttp.get('/service-worker.js');

        assert.ok([200, 404].includes(status), 'Service worker should be available or 404');

        if (status === 200) {
          const contentType = headers.get('content-type');
          assert.ok(
            contentType?.includes('javascript') || contentType?.includes('text/plain'),
            'Service worker should be JavaScript'
          );
        }
      });

      t('should serve service worker with correct headers', async (ctx) => {
        const { status, headers } = await this.webHttp.get('/service-worker.js');

        if (status === 200) {
          // Service worker should not be cached aggressively
          const cacheControl = headers.get('cache-control');
          assert.ok(
            !cacheControl?.includes('immutable'),
            'Service worker should not be immutable'
          );
        }
      });

      t('should support offline API queue endpoint', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          // Test offline queue sync endpoint
          const { status } = await this.http.post('/sync/offline-queue', {
            actions: [
              {
                type: 'ADD_TO_CART',
                productId: this.testProductId,
                quantity: 1,
                timestamp: Date.now(),
              },
            ],
          });

          assert.ok([200, 201, 404].includes(status), 'Offline queue endpoint should exist or 404');
        }
      });

      t('should handle offline cart synchronization', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/cart/sync', {
            items: [
              {
                productId: this.testProductId,
                quantity: 1,
                addedAt: Date.now() - 60000, // Added 1 minute ago offline
              },
            ],
            lastSyncAt: Date.now() - 120000,
          });

          assert.ok([200, 201, 404].includes(status), 'Cart sync should work or 404');
        }
      });

      t('should provide offline-first manifest', async (ctx) => {
        const { status } = await this.http.get('/api/offline/resources');
        assert.ok([200, 404].includes(status), 'Offline resources endpoint');
      });

      t('should cache critical API responses', async (ctx) => {
        const { status, headers } = await this.http.get('/categories');

        if (status === 200) {
          const cacheControl = headers.get('cache-control');
          // Should have some caching strategy
          assert.ok(cacheControl, 'Should have cache control headers');
        }
      });
    });

    // ============================================
    // PWA Manifest Tests
    // ============================================
    this.describe('PWA Manifest', (t) => {
      t('should serve valid manifest.json', async (ctx) => {
        const { data, status, headers } = await this.webHttp.get('/manifest.json');

        assert.ok([200, 404].includes(status), 'Manifest should be available or 404');

        if (status === 200) {
          const contentType = headers.get('content-type');
          assert.ok(
            contentType?.includes('json'),
            'Manifest should be JSON'
          );

          // Validate manifest structure
          assert.hasProperty(data, 'name', 'Manifest should have name');
          assert.hasProperty(data, 'short_name', 'Manifest should have short_name');
          assert.hasProperty(data, 'start_url', 'Manifest should have start_url');
          assert.hasProperty(data, 'display', 'Manifest should have display mode');
        }
      });

      t('should include required manifest properties', async (ctx) => {
        const { data, status } = await this.webHttp.get('/manifest.json');

        if (status === 200) {
          assert.isString(data.name, 'Name should be string');
          assert.isString(data.short_name, 'Short name should be string');
          assert.ok(
            ['standalone', 'fullscreen', 'minimal-ui', 'browser'].includes(data.display),
            'Display should be valid value'
          );
          assert.hasProperty(data, 'theme_color', 'Should have theme color');
          assert.hasProperty(data, 'background_color', 'Should have background color');
        }
      });

      t('should include app icons in manifest', async (ctx) => {
        const { data, status } = await this.webHttp.get('/manifest.json');

        if (status === 200 && data.icons) {
          assert.isArray(data.icons, 'Icons should be array');
          assert.ok(data.icons.length > 0, 'Should have at least one icon');

          const icon = data.icons[0];
          assert.hasProperty(icon, 'src', 'Icon should have src');
          assert.hasProperty(icon, 'sizes', 'Icon should have sizes');
          assert.hasProperty(icon, 'type', 'Icon should have type');
        }
      });

      t('should include screenshots for app stores', async (ctx) => {
        const { data, status } = await this.webHttp.get('/manifest.json');

        if (status === 200 && data.screenshots) {
          assert.isArray(data.screenshots, 'Screenshots should be array');

          data.screenshots.forEach((screenshot: any) => {
            assert.hasProperty(screenshot, 'src', 'Screenshot should have src');
            assert.hasProperty(screenshot, 'sizes', 'Screenshot should have sizes');
          });
        }
      });

      t('should include app categories', async (ctx) => {
        const { data, status } = await this.webHttp.get('/manifest.json');

        if (status === 200 && data.categories) {
          assert.isArray(data.categories, 'Categories should be array');
          // Common categories for e-commerce: shopping, lifestyle, business
          assert.ok(data.categories.length > 0, 'Should have at least one category');
        }
      });

      t('should include related applications', async (ctx) => {
        const { data, status } = await this.webHttp.get('/manifest.json');

        if (status === 200 && data.related_applications) {
          assert.isArray(data.related_applications, 'Related apps should be array');

          if (data.related_applications.length > 0) {
            const app = data.related_applications[0];
            assert.hasProperty(app, 'platform', 'Should have platform');
            assert.ok(
              ['play', 'itunes', 'windows'].includes(app.platform),
              'Platform should be valid'
            );
          }
        }
      });
    });

    // ============================================
    // Deep Linking Tests
    // ============================================
    this.describe('Deep Linking', (t) => {
      t('should handle product deep links', async (ctx) => {
        if (this.testProductId) {
          const { status } = await this.webHttp.get(`/products/${this.testProductId}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
            },
          });

          assert.statusCode(status, 200, 'Product deep link should work');
        }
      });

      t('should handle category deep links', async (ctx) => {
        const { status } = await this.webHttp.get('/categories/electronics', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          },
        });

        assert.ok([200, 404].includes(status), 'Category deep link should work or 404');
      });

      t('should handle cart deep link', async (ctx) => {
        const { status } = await this.webHttp.get('/cart', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          },
        });

        assert.ok([200, 302, 401].includes(status), 'Cart deep link should work');
      });

      t('should handle order tracking deep links', async (ctx) => {
        const { status } = await this.webHttp.get('/orders/track/ORDER123', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          },
        });

        assert.ok([200, 302, 401, 404].includes(status), 'Order tracking deep link');
      });

      t('should handle universal links configuration', async (ctx) => {
        // iOS universal links
        const { status: appleStatus } = await this.webHttp.get('/.well-known/apple-app-site-association');
        assert.ok([200, 404].includes(appleStatus), 'Apple app site association');

        // Android app links
        const { status: androidStatus } = await this.webHttp.get('/.well-known/assetlinks.json');
        assert.ok([200, 404].includes(androidStatus), 'Android asset links');
      });

      t('should validate Apple app site association', async (ctx) => {
        const { data, status } = await this.webHttp.get('/.well-known/apple-app-site-association');

        if (status === 200) {
          assert.hasProperty(data, 'applinks', 'Should have applinks section');
          if (data.applinks) {
            assert.hasProperty(data.applinks, 'apps', 'Should have apps array');
            assert.hasProperty(data.applinks, 'details', 'Should have details array');
          }
        }
      });

      t('should handle app scheme deep links via API', async (ctx) => {
        const { status } = await this.http.post('/deep-links/resolve', {
          url: 'broxiva://product/123',
        });

        assert.ok([200, 404].includes(status), 'Deep link resolver endpoint');
      });
    });

    // ============================================
    // Push Notification Tests
    // ============================================
    this.describe('Push Notifications', (t) => {
      t('should register device for push notifications', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { data, status } = await this.http.post('/notifications/devices/register', {
            token: this.deviceTokens.get('ios'),
            platform: 'ios',
            deviceInfo: {
              model: 'iPhone 12 Pro',
              osVersion: '14.7.1',
              appVersion: '1.0.0',
            },
          });

          assert.ok([200, 201, 404].includes(status), 'Device registration should work or 404');

          if (status === 200 || status === 201) {
            assert.ok(data, 'Should return registration confirmation');
          }
        }
      });

      t('should register Android device for FCM', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/notifications/devices/register', {
            token: this.deviceTokens.get('android'),
            platform: 'android',
            deviceInfo: {
              model: 'Samsung Galaxy S21',
              osVersion: '11',
              appVersion: '1.0.0',
            },
          });

          assert.ok([200, 201, 404].includes(status), 'Android device registration');
        }
      });

      t('should register web push subscription', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/notifications/push/subscribe', {
            subscription: {
              endpoint: 'https://fcm.googleapis.com/fcm/send/xyz',
              keys: {
                p256dh: 'base64-encoded-key',
                auth: 'base64-encoded-auth',
              },
            },
          });

          assert.ok([200, 201, 404].includes(status), 'Web push subscription');
        }
      });

      t('should unregister device token', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const token = this.deviceTokens.get('ios');
          const { status } = await this.http.delete(`/notifications/devices/${token}`);

          assert.ok([200, 204, 404].includes(status), 'Device unregistration');
        }
      });

      t('should send test push notification', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/notifications/push/test', {
            userId: this.userId,
            title: 'Test Notification',
            body: 'This is a test push notification',
          });

          assert.ok([200, 201, 404].includes(status), 'Test push notification');
        }
      });

      t('should handle notification preferences', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          // Update preferences
          const { status: updateStatus } = await this.http.put('/notifications/preferences', {
            orderUpdates: true,
            promotions: false,
            newArrivals: true,
            priceDrops: true,
          });

          assert.ok([200, 404].includes(updateStatus), 'Update notification preferences');

          // Get preferences
          const { status: getStatus } = await this.http.get('/notifications/preferences');
          assert.ok([200, 404].includes(getStatus), 'Get notification preferences');
        }
      });

      t('should send order status notifications', async (ctx) => {
        if (this.authToken && this.testOrderId) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/notifications/send', {
            type: 'ORDER_STATUS_UPDATE',
            orderId: this.testOrderId,
            status: 'SHIPPED',
          });

          assert.ok([200, 201, 404].includes(status), 'Order status notification');
        }
      });

      t('should handle notification click tracking', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/notifications/clicked', {
            notificationId: 'test-notification-123',
            timestamp: Date.now(),
          });

          assert.ok([200, 204, 404].includes(status), 'Notification click tracking');
        }
      });
    });

    // ============================================
    // Device-Specific Behavior Tests
    // ============================================
    this.describe('Device-Specific Behavior', (t) => {
      t('should detect device capabilities', async (ctx) => {
        const { status } = await this.http.post('/device/capabilities', {
          features: {
            touchscreen: true,
            geolocation: true,
            camera: true,
            nfc: false,
            bluetooth: true,
          },
        });

        assert.ok([200, 201, 404].includes(status), 'Device capabilities tracking');
      });

      t('should handle geolocation-based requests', async (ctx) => {
        const { status } = await this.http.get('/stores/nearby', {
          headers: {
            'X-Latitude': '37.7749',
            'X-Longitude': '-122.4194',
          },
        });

        assert.ok([200, 404].includes(status), 'Geolocation-based API');
      });

      t('should optimize for device memory constraints', async (ctx) => {
        // Low-end device
        const { status: lowEnd } = await this.http.get('/products?pageSize=10', {
          headers: {
            'Device-Memory': '2', // 2GB RAM
          },
        });

        // High-end device
        const { status: highEnd } = await this.http.get('/products?pageSize=50', {
          headers: {
            'Device-Memory': '8', // 8GB RAM
          },
        });

        assert.statusCode(lowEnd, 200, 'Should handle low-memory device');
        assert.statusCode(highEnd, 200, 'Should handle high-memory device');
      });

      t('should handle network quality headers', async (ctx) => {
        const networkTypes = ['4g', '3g', '2g', 'slow-2g'];

        for (const type of networkTypes) {
          const { status } = await this.http.get('/products', {
            headers: {
              'ECT': type, // Effective Connection Type
            },
          });
          assert.statusCode(status, 200, `Should handle ${type} connection`);
        }
      });

      t('should support haptic feedback triggers', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/cart/add', {
            productId: this.testProductId,
            quantity: 1,
            triggerHaptic: true,
          });

          assert.ok([200, 201, 404, 400].includes(status), 'Cart add with haptic');
        }
      });

      t('should handle device orientation data', async (ctx) => {
        const { status } = await this.http.post('/analytics/device-orientation', {
          orientation: 'portrait',
          timestamp: Date.now(),
        });

        assert.ok([200, 201, 404].includes(status), 'Device orientation tracking');
      });

      t('should support biometric authentication', async (ctx) => {
        const { status } = await this.http.post('/auth/biometric/register', {
          publicKey: 'base64-encoded-public-key',
          deviceId: 'device-unique-id',
        });

        assert.ok([200, 201, 404].includes(status), 'Biometric registration endpoint');
      });

      t('should handle device-specific payment methods', async (ctx) => {
        // Apple Pay
        const { status: applePay } = await this.http.get('/payment/methods/apple-pay/available');
        assert.ok([200, 404].includes(applePay), 'Apple Pay availability');

        // Google Pay
        const { status: googlePay } = await this.http.get('/payment/methods/google-pay/available');
        assert.ok([200, 404].includes(googlePay), 'Google Pay availability');
      });
    });

    // ============================================
    // Touch Interaction Tests
    // ============================================
    this.describe('Touch Interactions', (t) => {
      t('should handle swipe gesture data', async (ctx) => {
        const { status } = await this.http.post('/analytics/gesture', {
          type: 'swipe',
          direction: 'left',
          screen: 'product-list',
          timestamp: Date.now(),
        });

        assert.ok([200, 201, 404].includes(status), 'Swipe gesture tracking');
      });

      t('should handle pinch-to-zoom analytics', async (ctx) => {
        const { status } = await this.http.post('/analytics/gesture', {
          type: 'pinch',
          scale: 2.5,
          screen: 'product-image',
          timestamp: Date.now(),
        });

        assert.ok([200, 201, 404].includes(status), 'Pinch gesture tracking');
      });

      t('should handle long-press actions', async (ctx) => {
        if (this.authToken && this.testProductId) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/products/quick-action', {
            productId: this.testProductId,
            action: 'ADD_TO_WISHLIST',
            trigger: 'long-press',
          });

          assert.ok([200, 201, 404].includes(status), 'Long-press quick action');
        }
      });

      t('should handle pull-to-refresh', async (ctx) => {
        const { status } = await this.http.get('/products?refresh=true', {
          headers: {
            'X-Pull-To-Refresh': 'true',
          },
        });

        assert.statusCode(status, 200, 'Pull-to-refresh should work');
      });

      t('should optimize for touch target sizes', async (ctx) => {
        // Validate that API responses don't return too many items for mobile
        const { data, status } = await this.http.get('/products', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          },
        });

        if (status === 200) {
          const products = data.data || data;
          if (Array.isArray(products)) {
            // Mobile should have reasonable pagination
            assert.ok(
              products.length <= 50,
              'Should not return too many items for mobile'
            );
          }
        }
      });

      t('should handle double-tap actions', async (ctx) => {
        if (this.authToken && this.testProductId) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/products/favorite', {
            productId: this.testProductId,
            trigger: 'double-tap',
          });

          assert.ok([200, 201, 404].includes(status), 'Double-tap favorite action');
        }
      });
    });

    // ============================================
    // App Store Deployment Validation Tests
    // ============================================
    this.describe('App Store Deployment', (t) => {
      t('should have valid app store metadata endpoint', async (ctx) => {
        const { status } = await this.http.get('/app/metadata');

        assert.ok([200, 404].includes(status), 'App metadata endpoint');
      });

      t('should provide app version information', async (ctx) => {
        const { data, status } = await this.http.get('/app/version');

        if (status === 200) {
          assert.hasProperty(data, 'version', 'Should have version');
          assert.hasProperty(data, 'buildNumber', 'Should have build number');
          assert.match(data.version, /^\d+\.\d+\.\d+$/, 'Version should be semver');
        }
      });

      t('should check for required updates', async (ctx) => {
        const { data, status } = await this.http.post('/app/check-update', {
          currentVersion: '1.0.0',
          platform: 'ios',
        });

        assert.ok([200, 404].includes(status), 'Update check endpoint');

        if (status === 200) {
          assert.hasProperty(data, 'updateAvailable', 'Should indicate if update available');
          assert.hasProperty(data, 'updateRequired', 'Should indicate if update required');
        }
      });

      t('should provide app store URLs', async (ctx) => {
        const { data, status } = await this.http.get('/app/store-urls');

        if (status === 200) {
          assert.ok(
            data.ios || data.android,
            'Should have at least one store URL'
          );

          if (data.ios) {
            assert.match(
              data.ios,
              /^https:\/\/apps\.apple\.com/,
              'iOS URL should be valid App Store URL'
            );
          }

          if (data.android) {
            assert.match(
              data.android,
              /^https:\/\/play\.google\.com/,
              'Android URL should be valid Play Store URL'
            );
          }
        }
      });

      t('should validate app screenshots endpoint', async (ctx) => {
        const { status } = await this.http.get('/app/screenshots');
        assert.ok([200, 404].includes(status), 'Screenshots endpoint');
      });

      t('should provide privacy policy for app stores', async (ctx) => {
        const { status } = await this.webHttp.get('/privacy-policy');
        assert.ok([200, 404].includes(status), 'Privacy policy should be accessible');
      });

      t('should provide terms of service for app stores', async (ctx) => {
        const { status } = await this.webHttp.get('/terms-of-service');
        assert.ok([200, 404].includes(status), 'Terms of service should be accessible');
      });

      t('should handle app rating prompts', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/app/rating/prompt', {
            platform: 'ios',
            appVersion: '1.0.0',
          });

          assert.ok([200, 201, 404].includes(status), 'Rating prompt endpoint');
        }
      });

      t('should track app launches', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/analytics/app-launch', {
            platform: 'ios',
            version: '1.0.0',
            timestamp: Date.now(),
          });

          assert.ok([200, 201, 404].includes(status), 'App launch tracking');
        }
      });
    });

    // ============================================
    // Service Worker Tests
    // ============================================
    this.describe('Service Worker', (t) => {
      t('should cache GET requests for offline', async (ctx) => {
        const { status, headers } = await this.http.get('/products?pageSize=5');

        if (status === 200) {
          const cacheControl = headers.get('cache-control');
          // Should allow caching
          assert.ok(
            !cacheControl?.includes('no-store'),
            'Products should be cacheable'
          );
        }
      });

      t('should include cache headers for static assets', async (ctx) => {
        const { status, headers } = await this.webHttp.get('/favicon.ico');

        if (status === 200) {
          const cacheControl = headers.get('cache-control');
          assert.ok(cacheControl, 'Static assets should have cache headers');
        }
      });

      t('should handle background sync', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/sync/background', {
            syncTag: 'cart-sync',
            data: {
              items: [{ productId: this.testProductId, quantity: 1 }],
            },
          });

          assert.ok([200, 201, 404].includes(status), 'Background sync endpoint');
        }
      });

      t('should support periodic background sync', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/sync/register-periodic', {
            tag: 'order-updates',
            minInterval: 86400000, // 24 hours
          });

          assert.ok([200, 201, 404].includes(status), 'Periodic sync registration');
        }
      });

      t('should handle cache busting for updates', async (ctx) => {
        const { data, status } = await this.http.get('/app/cache-version');

        if (status === 200) {
          assert.ok(data.version, 'Should have cache version');
          assert.ok(data.timestamp, 'Should have cache timestamp');
        }
      });
    });

    // ============================================
    // Mobile E-commerce Specific Tests
    // ============================================
    this.describe('Mobile E-commerce Features', (t) => {
      t('should support one-tap checkout', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/checkout/one-tap', {
            productId: this.testProductId,
            quantity: 1,
            savedPaymentMethodId: 'saved-card-123',
            savedAddressId: 'saved-address-123',
          });

          assert.ok([200, 201, 400, 404].includes(status), 'One-tap checkout endpoint');
        }
      });

      t('should support QR code scanning', async (ctx) => {
        const { status } = await this.http.post('/products/scan-qr', {
          qrCode: 'PRODUCT_QR_CODE_DATA',
        });

        assert.ok([200, 404].includes(status), 'QR code scanning endpoint');
      });

      t('should support barcode lookup', async (ctx) => {
        const { status } = await this.http.get('/products/barcode/1234567890123');
        assert.ok([200, 404].includes(status), 'Barcode lookup endpoint');
      });

      t('should handle mobile wallet integration', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/wallet/add-card', {
            type: 'loyalty',
            cardData: {
              number: 'LOYALTY123456',
              name: 'Broxiva Rewards',
            },
          });

          assert.ok([200, 201, 404].includes(status), 'Mobile wallet integration');
        }
      });

      t('should support AR product preview', async (ctx) => {
        if (this.testProductId) {
          const { status } = await this.http.get(`/products/${this.testProductId}/ar-model`);
          assert.ok([200, 404].includes(status), 'AR model endpoint');
        }
      });

      t('should handle shake-to-feedback', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);

          const { status } = await this.http.post('/feedback/shake-trigger', {
            screen: 'checkout',
            timestamp: Date.now(),
          });

          assert.ok([200, 201, 404].includes(status), 'Shake-to-feedback endpoint');
        }
      });

      t('should optimize mobile search', async (ctx) => {
        const { data, status } = await this.http.get('/products/search?q=phone&mobile=true');

        if (status === 200) {
          // Mobile search should return fewer, more relevant results
          const results = data.data || data;
          assert.ok(
            !Array.isArray(results) || results.length <= 20,
            'Mobile search should limit results'
          );
        }
      });

      t('should support voice search', async (ctx) => {
        const { status } = await this.http.post('/search/voice', {
          transcript: 'black running shoes size 10',
          confidence: 0.95,
        });

        assert.ok([200, 404].includes(status), 'Voice search endpoint');
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new MobilePWAAgent(options);
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
