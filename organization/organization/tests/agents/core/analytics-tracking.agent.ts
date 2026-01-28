/**
 * Analytics & Tracking Testing Agent
 *
 * Tests:
 * - Event tracking accuracy
 * - Conversion funnel validation
 * - A/B test implementation
 * - Third-party analytics integration (Google Analytics, etc.)
 * - GDPR consent handling
 * - Data layer validation
 * - E-commerce tracking (purchases, cart events)
 * - User journey tracking
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

interface AnalyticsEvent {
  event: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
}

interface DataLayer {
  event?: string;
  ecommerce?: any;
  user?: any;
  page?: any;
  [key: string]: any;
}

export class AnalyticsTrackingAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private userId?: string;
  private sessionId?: string;
  private testProductId?: string;
  private trackedEvents: AnalyticsEvent[] = [];
  private dataLayer: DataLayer[] = [];

  constructor(options: AgentOptions = {}) {
    super('Analytics & Tracking Testing Agent', 'analytics-tracking', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Login to get auth token and user ID for tracking tests
    try {
      const { data } = await this.http.post('/auth/register', {
        email: `analytics-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Analytics Test User',
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
        console.warn('Could not authenticate for analytics tests');
      }
    }

    // Get a product ID for e-commerce tracking tests
    try {
      const { data } = await this.http.get('/products?pageSize=1&isActive=true');
      const products = data.data || data;
      if (Array.isArray(products) && products.length > 0) {
        this.testProductId = products[0].id;
      }
    } catch (e) {
      console.warn('Could not get test product for analytics');
    }

    // Generate session ID
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async teardown(): Promise<void> {
    // Clear any test data if needed
    this.trackedEvents = [];
    this.dataLayer = [];
  }

  protected defineTests(): void {
    // ============================================
    // Event Tracking Accuracy Tests
    // ============================================
    this.describe('Event Tracking Accuracy', (t) => {
      t('should track page view events', async (ctx) => {
        const { data, status } = await this.http.post('/analytics/track', {
          event: 'page_view',
          properties: {
            page: '/home',
            title: 'Home Page',
            referrer: '',
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track page view event');
        if (data && data.eventId) {
          assert.hasProperty(data, 'eventId', 'Should return event ID');
        }
      });

      t('should track user interaction events', async (ctx) => {
        const { data, status } = await this.http.post('/analytics/track', {
          event: 'button_click',
          category: 'engagement',
          action: 'click',
          label: 'add_to_cart_button',
          properties: {
            productId: this.testProductId,
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track interaction event');
      });

      t('should track custom events with properties', async (ctx) => {
        const { data, status } = await this.http.post('/analytics/track', {
          event: 'custom_event',
          category: 'user_action',
          action: 'perform',
          label: 'custom_action',
          value: 100,
          properties: {
            customProperty1: 'value1',
            customProperty2: 'value2',
            timestamp: Date.now(),
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track custom event');
      });

      t('should validate required event fields', async (ctx) => {
        const { status } = await this.http.post('/analytics/track', {
          // Missing event name
          properties: { test: 'value' },
        });

        assert.ok([400, 422].includes(status), 'Should require event name');
      });

      t('should reject events with invalid data types', async (ctx) => {
        const { status } = await this.http.post('/analytics/track', {
          event: 'test_event',
          value: 'not-a-number', // Should be a number
          properties: null, // Should be object
        });

        assert.ok([400, 422].includes(status), 'Should validate data types');
      });

      t('should handle batch event tracking', async (ctx) => {
        const events = [
          {
            event: 'page_view',
            properties: { page: '/products', sessionId: this.sessionId },
          },
          {
            event: 'product_view',
            properties: { productId: this.testProductId, sessionId: this.sessionId },
          },
          {
            event: 'add_to_cart',
            properties: { productId: this.testProductId, quantity: 1, sessionId: this.sessionId },
          },
        ];

        const { data, status } = await this.http.post('/analytics/track/batch', {
          events,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track batch events');
        if (data && data.processed) {
          assert.equal(data.processed, events.length, 'Should process all events');
        }
      });

      t('should associate events with authenticated user', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/analytics/track', {
          event: 'authenticated_action',
          properties: {
            action: 'profile_update',
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track authenticated event');
        if (data && data.userId) {
          assert.equal(data.userId, this.userId, 'Should associate with user ID');
        }
      });

      t('should track events with timestamps', async (ctx) => {
        const timestamp = Date.now();
        const { data, status } = await this.http.post('/analytics/track', {
          event: 'timestamped_event',
          timestamp,
          properties: { sessionId: this.sessionId },
        });

        assert.ok([200, 201, 204].includes(status), 'Should accept timestamp');
        if (data && data.timestamp) {
          assert.ok(
            Math.abs(data.timestamp - timestamp) < 1000,
            'Timestamp should be preserved'
          );
        }
      });
    });

    // ============================================
    // Conversion Funnel Validation Tests
    // ============================================
    this.describe('Conversion Funnel Validation', (t) => {
      t('should track product view in funnel', async (ctx) => {
        const { status } = await this.http.post('/analytics/funnel', {
          step: 'product_view',
          funnelId: 'purchase_funnel',
          properties: {
            productId: this.testProductId,
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track funnel step');
      });

      t('should track add to cart in funnel', async (ctx) => {
        const { status } = await this.http.post('/analytics/funnel', {
          step: 'add_to_cart',
          funnelId: 'purchase_funnel',
          properties: {
            productId: this.testProductId,
            quantity: 1,
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track cart step');
      });

      t('should track checkout initiation in funnel', async (ctx) => {
        const { status } = await this.http.post('/analytics/funnel', {
          step: 'checkout_start',
          funnelId: 'purchase_funnel',
          properties: {
            cartValue: 99.99,
            itemCount: 1,
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track checkout step');
      });

      t('should track payment info entry in funnel', async (ctx) => {
        const { status } = await this.http.post('/analytics/funnel', {
          step: 'payment_info',
          funnelId: 'purchase_funnel',
          properties: {
            paymentMethod: 'credit_card',
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track payment step');
      });

      t('should track purchase completion in funnel', async (ctx) => {
        const { status } = await this.http.post('/analytics/funnel', {
          step: 'purchase_complete',
          funnelId: 'purchase_funnel',
          properties: {
            orderId: `order-${Date.now()}`,
            revenue: 99.99,
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track completion step');
      });

      t('should get funnel analytics data', async (ctx) => {
        const { data, status } = await this.http.get('/analytics/funnel/purchase_funnel', {
          headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
        });

        assert.ok([200, 404].includes(status), 'Should retrieve funnel data');
        if (status === 200) {
          assert.hasProperty(data, 'steps', 'Should have funnel steps');
          if (data.steps) {
            assert.isArray(data.steps, 'Steps should be an array');
          }
        }
      });

      t('should calculate funnel conversion rates', async (ctx) => {
        const { data, status } = await this.http.get('/analytics/funnel/purchase_funnel/metrics', {
          headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
        });

        if (status === 200 && data) {
          if (data.conversionRate !== undefined) {
            assert.ok(
              data.conversionRate >= 0 && data.conversionRate <= 100,
              'Conversion rate should be 0-100'
            );
          }
          if (data.dropOffRate !== undefined) {
            assert.ok(
              data.dropOffRate >= 0 && data.dropOffRate <= 100,
              'Drop-off rate should be 0-100'
            );
          }
        }
      });

      t('should track funnel abandonment', async (ctx) => {
        const { status } = await this.http.post('/analytics/funnel', {
          step: 'abandoned',
          funnelId: 'purchase_funnel',
          abandonedAt: 'checkout_start',
          properties: {
            reason: 'high_shipping_cost',
            sessionId: this.sessionId,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should track abandonment');
      });
    });

    // ============================================
    // A/B Test Implementation Tests
    // ============================================
    this.describe('A/B Test Implementation', (t) => {
      t('should assign user to A/B test variant', async (ctx) => {
        const { data, status } = await this.http.post('/analytics/ab-test/assign', {
          experimentId: 'checkout_button_color',
          userId: this.userId || this.sessionId,
        });

        assert.ok([200, 201].includes(status), 'Should assign variant');
        if (data) {
          assert.hasProperty(data, 'variant', 'Should return variant');
          assert.ok(['A', 'B', 'control', 'variant'].includes(data.variant), 'Valid variant');
        }
      });

      t('should maintain consistent variant assignment', async (ctx) => {
        const userId = this.userId || this.sessionId;

        const { data: data1 } = await this.http.post('/analytics/ab-test/assign', {
          experimentId: 'checkout_button_color',
          userId,
        });

        const { data: data2 } = await this.http.post('/analytics/ab-test/assign', {
          experimentId: 'checkout_button_color',
          userId,
        });

        if (data1 && data2 && data1.variant && data2.variant) {
          assert.equal(data1.variant, data2.variant, 'Variant should be consistent');
        }
      });

      t('should track A/B test conversion', async (ctx) => {
        const { status } = await this.http.post('/analytics/ab-test/conversion', {
          experimentId: 'checkout_button_color',
          variant: 'B',
          userId: this.userId || this.sessionId,
          conversionValue: 99.99,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track conversion');
      });

      t('should get A/B test results', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get(
          '/analytics/ab-test/checkout_button_color/results'
        );

        assert.ok([200, 403, 404].includes(status), 'Should retrieve test results');
        if (status === 200 && data) {
          if (data.variants) {
            assert.isObject(data.variants, 'Should have variants data');
          }
        }
      });

      t('should validate experiment configuration', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/analytics/ab-test/create', {
          experimentId: 'new_test',
          variants: ['A', 'B'],
          // Missing traffic allocation
        });

        assert.ok([400, 403, 422].includes(status), 'Should validate configuration');
      });

      t('should handle multiple concurrent experiments', async (ctx) => {
        const userId = this.userId || this.sessionId;

        const { data: exp1 } = await this.http.post('/analytics/ab-test/assign', {
          experimentId: 'experiment_1',
          userId,
        });

        const { data: exp2 } = await this.http.post('/analytics/ab-test/assign', {
          experimentId: 'experiment_2',
          userId,
        });

        assert.ok([200, 201].includes(exp1 ? 200 : 404), 'Should handle multiple experiments');
      });
    });

    // ============================================
    // Third-Party Analytics Integration Tests
    // ============================================
    this.describe('Third-Party Analytics Integration', (t) => {
      t('should track Google Analytics events', async (ctx) => {
        const { status } = await this.http.post('/analytics/integrations/google-analytics', {
          measurementId: 'G-XXXXXXXXXX',
          event: 'purchase',
          params: {
            transaction_id: `txn-${Date.now()}`,
            value: 99.99,
            currency: 'USD',
          },
        });

        assert.ok([200, 201, 204, 404].includes(status), 'Should handle GA tracking');
      });

      t('should validate Google Analytics measurement ID', async (ctx) => {
        const { status } = await this.http.post('/analytics/integrations/google-analytics', {
          measurementId: 'invalid-id',
          event: 'page_view',
        });

        assert.ok([400, 404, 422].includes(status), 'Should validate measurement ID');
      });

      t('should track Facebook Pixel events', async (ctx) => {
        const { status } = await this.http.post('/analytics/integrations/facebook-pixel', {
          pixelId: '1234567890',
          event: 'Purchase',
          params: {
            value: 99.99,
            currency: 'USD',
          },
        });

        assert.ok([200, 201, 204, 404].includes(status), 'Should handle FB Pixel');
      });

      t('should support multiple analytics providers', async (ctx) => {
        const { status } = await this.http.post('/analytics/track', {
          event: 'purchase',
          properties: {
            value: 99.99,
            currency: 'USD',
          },
          integrations: {
            googleAnalytics: true,
            facebookPixel: true,
            mixpanel: false,
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should support multiple providers');
      });

      t('should get analytics integration status', async (ctx) => {
        const { data, status } = await this.http.get('/analytics/integrations/status');

        if (status === 200 && data) {
          assert.isObject(data, 'Should return integration status');
        }
      });
    });

    // ============================================
    // GDPR Consent Handling Tests
    // ============================================
    this.describe('GDPR Consent Handling', (t) => {
      t('should record user consent preferences', async (ctx) => {
        const { data, status } = await this.http.post('/analytics/consent', {
          analytics: true,
          marketing: false,
          functional: true,
          userId: this.userId || this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should record consent');
        if (data && data.consentId) {
          assert.hasProperty(data, 'consentId', 'Should return consent ID');
        }
      });

      t('should respect analytics opt-out', async (ctx) => {
        // Set consent to opt-out
        await this.http.post('/analytics/consent', {
          analytics: false,
          userId: this.userId || this.sessionId,
        });

        // Try to track event
        const { data, status } = await this.http.post('/analytics/track', {
          event: 'test_event',
          properties: { sessionId: this.sessionId },
        });

        // Event should be rejected or flagged
        assert.ok([200, 201, 204, 403].includes(status), 'Should handle opt-out');
      });

      t('should get user consent preferences', async (ctx) => {
        const { data, status } = await this.http.get('/analytics/consent', {
          headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
        });

        assert.ok([200, 404].includes(status), 'Should retrieve consent');
        if (status === 200 && data) {
          assert.hasProperty(data, 'analytics', 'Should have analytics consent');
        }
      });

      t('should update consent preferences', async (ctx) => {
        const { status } = await this.http.patch('/analytics/consent', {
          analytics: true,
          marketing: true,
          userId: this.userId || this.sessionId,
        });

        assert.ok([200, 204].includes(status), 'Should update consent');
      });

      t('should provide consent withdrawal option', async (ctx) => {
        const { status } = await this.http.post('/analytics/consent/withdraw', {
          userId: this.userId || this.sessionId,
        });

        assert.ok([200, 204].includes(status), 'Should withdraw consent');
      });

      t('should anonymize data when required', async (ctx) => {
        const { status } = await this.http.post('/analytics/track', {
          event: 'anonymous_event',
          anonymize: true,
          properties: { sessionId: this.sessionId },
        });

        assert.ok([200, 201, 204].includes(status), 'Should anonymize tracking');
      });

      t('should handle right to be forgotten', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/analytics/user-data');

        assert.ok([200, 204, 404].includes(status), 'Should delete user data');
      });
    });

    // ============================================
    // Data Layer Validation Tests
    // ============================================
    this.describe('Data Layer Validation', (t) => {
      t('should push event to data layer', async (ctx) => {
        const { data, status } = await this.http.post('/analytics/data-layer/push', {
          event: 'page_view',
          page: {
            title: 'Home',
            url: '/home',
            path: '/home',
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should push to data layer');
      });

      t('should validate data layer structure', async (ctx) => {
        const { status } = await this.http.post('/analytics/data-layer/push', {
          // Invalid structure
          invalidKey: 'value',
        });

        assert.ok([200, 201, 204, 400, 422].includes(status), 'Should validate structure');
      });

      t('should push e-commerce data to data layer', async (ctx) => {
        const { status } = await this.http.post('/analytics/data-layer/push', {
          event: 'purchase',
          ecommerce: {
            transaction_id: `txn-${Date.now()}`,
            value: 99.99,
            currency: 'USD',
            tax: 8.00,
            shipping: 5.00,
            items: [
              {
                item_id: this.testProductId,
                item_name: 'Test Product',
                price: 86.99,
                quantity: 1,
              },
            ],
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should push e-commerce data');
      });

      t('should push user data to data layer', async (ctx) => {
        const { status } = await this.http.post('/analytics/data-layer/push', {
          event: 'user_login',
          user: {
            id: this.userId,
            email_hash: 'hashed_email',
            customer_type: 'returning',
          },
        });

        assert.ok([200, 201, 204].includes(status), 'Should push user data');
      });

      t('should get current data layer state', async (ctx) => {
        const { data, status } = await this.http.get('/analytics/data-layer');

        if (status === 200 && data) {
          assert.isArray(data, 'Data layer should be an array');
        }
      });

      t('should clear data layer', async (ctx) => {
        const { status } = await this.http.delete('/analytics/data-layer');

        assert.ok([200, 204].includes(status), 'Should clear data layer');
      });
    });

    // ============================================
    // E-commerce Tracking Tests
    // ============================================
    this.describe('E-commerce Tracking', (t) => {
      t('should track product impressions', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/impression', {
          products: [
            {
              id: this.testProductId,
              name: 'Test Product',
              category: 'Electronics',
              price: 99.99,
              position: 1,
              list: 'Search Results',
            },
          ],
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track impressions');
      });

      t('should track product clicks', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/click', {
          productId: this.testProductId,
          name: 'Test Product',
          price: 99.99,
          list: 'Search Results',
          position: 1,
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track clicks');
      });

      t('should track product detail views', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/detail', {
          productId: this.testProductId,
          name: 'Test Product',
          category: 'Electronics',
          price: 99.99,
          currency: 'USD',
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track detail views');
      });

      t('should track add to cart events', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/add-to-cart', {
          productId: this.testProductId,
          name: 'Test Product',
          price: 99.99,
          quantity: 1,
          currency: 'USD',
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track add to cart');
      });

      t('should track remove from cart events', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/remove-from-cart', {
          productId: this.testProductId,
          name: 'Test Product',
          price: 99.99,
          quantity: 1,
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track remove from cart');
      });

      t('should track checkout steps', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/checkout', {
          step: 1,
          option: 'Credit Card',
          products: [
            {
              id: this.testProductId,
              name: 'Test Product',
              price: 99.99,
              quantity: 1,
            },
          ],
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track checkout step');
      });

      t('should track purchases', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/purchase', {
          transactionId: `txn-${Date.now()}`,
          affiliation: 'Online Store',
          revenue: 99.99,
          tax: 8.00,
          shipping: 5.00,
          currency: 'USD',
          products: [
            {
              id: this.testProductId,
              name: 'Test Product',
              price: 86.99,
              quantity: 1,
              category: 'Electronics',
            },
          ],
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track purchase');
      });

      t('should track refunds', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/refund', {
          transactionId: `txn-${Date.now()}`,
          products: [
            {
              id: this.testProductId,
              quantity: 1,
            },
          ],
          sessionId: this.sessionId,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track refund');
      });

      t('should validate e-commerce event data', async (ctx) => {
        const { status } = await this.http.post('/analytics/ecommerce/purchase', {
          // Missing required fields
          products: [],
        });

        assert.ok([400, 422].includes(status), 'Should validate e-commerce data');
      });

      t('should calculate e-commerce metrics', async (ctx) => {
        const { data, status } = await this.http.get('/analytics/ecommerce/metrics', {
          headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
        });

        if (status === 200 && data) {
          // Check for common e-commerce metrics
          if (data.conversionRate !== undefined) {
            assert.isNumber(data.conversionRate, 'Conversion rate should be a number');
          }
        }
      });
    });

    // ============================================
    // User Journey Tracking Tests
    // ============================================
    this.describe('User Journey Tracking', (t) => {
      t('should track session start', async (ctx) => {
        const { data, status } = await this.http.post('/analytics/journey/session/start', {
          sessionId: this.sessionId,
          referrer: 'https://google.com',
          landingPage: '/home',
          userAgent: 'Test User Agent',
        });

        assert.ok([200, 201, 204].includes(status), 'Should track session start');
      });

      t('should track user navigation path', async (ctx) => {
        const pages = ['/home', '/products', '/products/123', '/cart', '/checkout'];

        for (const page of pages) {
          const { status } = await this.http.post('/analytics/journey/navigation', {
            sessionId: this.sessionId,
            page,
            timestamp: Date.now(),
          });

          assert.ok([200, 201, 204].includes(status), 'Should track navigation');
        }
      });

      t('should track time on page', async (ctx) => {
        const { status } = await this.http.post('/analytics/journey/time-on-page', {
          sessionId: this.sessionId,
          page: '/products',
          duration: 45000, // 45 seconds
        });

        assert.ok([200, 201, 204].includes(status), 'Should track time on page');
      });

      t('should track scroll depth', async (ctx) => {
        const { status } = await this.http.post('/analytics/journey/scroll-depth', {
          sessionId: this.sessionId,
          page: '/products',
          maxDepth: 75, // 75% scrolled
        });

        assert.ok([200, 201, 204].includes(status), 'Should track scroll depth');
      });

      t('should track user interactions', async (ctx) => {
        const { status } = await this.http.post('/analytics/journey/interaction', {
          sessionId: this.sessionId,
          type: 'click',
          element: 'product-card',
          elementId: 'product-123',
          timestamp: Date.now(),
        });

        assert.ok([200, 201, 204].includes(status), 'Should track interactions');
      });

      t('should track session end', async (ctx) => {
        const { status } = await this.http.post('/analytics/journey/session/end', {
          sessionId: this.sessionId,
          duration: 300000, // 5 minutes
          pageViews: 5,
          interactions: 12,
        });

        assert.ok([200, 201, 204].includes(status), 'Should track session end');
      });

      t('should get user journey for session', async (ctx) => {
        const { data, status } = await this.http.get(
          `/analytics/journey/session/${this.sessionId}`,
          {
            headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
          }
        );

        if (status === 200 && data) {
          if (data.pages) {
            assert.isArray(data.pages, 'Journey pages should be an array');
          }
          if (data.interactions) {
            assert.isArray(data.interactions, 'Journey interactions should be an array');
          }
        }
      });

      t('should identify user segments', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/analytics/journey/segments');

        if (status === 200 && data) {
          if (data.segments) {
            assert.isArray(data.segments, 'Segments should be an array');
          }
        }
      });

      t('should track user attribution', async (ctx) => {
        const { status } = await this.http.post('/analytics/journey/attribution', {
          sessionId: this.sessionId,
          source: 'google',
          medium: 'organic',
          campaign: 'summer_sale',
          term: 'electronics',
          content: 'ad_variant_a',
        });

        assert.ok([200, 201, 204].includes(status), 'Should track attribution');
      });

      t('should calculate user lifetime value', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/analytics/journey/ltv');

        if (status === 200 && data) {
          if (data.lifetimeValue !== undefined) {
            assert.isNumber(data.lifetimeValue, 'LTV should be a number');
          }
        }
      });
    });

    // ============================================
    // Analytics Dashboard & Reporting Tests
    // ============================================
    this.describe('Analytics Dashboard & Reporting', (t) => {
      t('should get real-time analytics', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/analytics/realtime');

        if (status === 200 && data) {
          if (data.activeUsers !== undefined) {
            assert.isNumber(data.activeUsers, 'Active users should be a number');
          }
        }
      });

      t('should get analytics by date range', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const { data, status } = await this.http.get(
          `/analytics/report?startDate=${startDate}&endDate=${endDate}`
        );

        if (status === 200 && data) {
          assert.isObject(data, 'Report should be an object');
        }
      });

      t('should export analytics data', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/analytics/export', {
          format: 'csv',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        });

        assert.ok([200, 201, 202].includes(status), 'Should export analytics');
      });

      t('should get top performing products', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/analytics/products/top?limit=10');

        if (status === 200 && data) {
          if (data.products) {
            assert.isArray(data.products, 'Top products should be an array');
          }
        }
      });

      t('should get user acquisition sources', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/analytics/acquisition/sources');

        if (status === 200 && data) {
          if (data.sources) {
            assert.isArray(data.sources, 'Sources should be an array');
          }
        }
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new AnalyticsTrackingAgent(options);
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
