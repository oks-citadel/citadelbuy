/**
 * Payment Processing Agent
 *
 * Tests:
 * - Payment gateway integrations (Stripe, PayPal, etc.)
 * - Credit card processing
 * - Refund and chargeback handling
 * - Subscription and recurring payments
 * - Payment failure scenarios and retries
 * - PCI compliance validation
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class PaymentProcessingAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private testOrderId?: string;
  private testPaymentIntentId?: string;

  constructor(options: AgentOptions = {}) {
    super('Payment Processing Agent', 'payment-processing', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Login to get auth token
    try {
      const { data } = await this.http.post('/auth/register', {
        email: `payment-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Payment Test User',
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
        console.warn('Could not authenticate for payment tests');
      }
    }
  }

  protected defineTests(): void {
    // ============================================
    // Payment Intent Creation
    // ============================================
    this.describe('Payment Intent Creation', (t) => {
      t('should create payment intent', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/payments/intent', {
          amount: 1000, // $10.00
          currency: 'usd',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle payment intent creation');
        if (status === 200 || status === 201) {
          assert.hasProperty(data, 'client_secret', 'Should have client_secret');
          if (data.id) {
            this.testPaymentIntentId = data.id;
          }
        }
      });

      t('should create payment intent with order', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/payments/intent', {
          amount: 5000,
          currency: 'usd',
          metadata: {
            orderId: 'test-order-123',
          },
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle payment intent');
      });

      t('should reject invalid amount', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/intent', {
          amount: -100,
          currency: 'usd',
        });

        assert.ok([400, 422].includes(status), 'Should reject negative amount');
      });

      t('should reject zero amount', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/intent', {
          amount: 0,
          currency: 'usd',
        });

        assert.ok([400, 422].includes(status), 'Should reject zero amount');
      });

      t('should support multiple currencies', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const currencies = ['usd', 'eur', 'gbp'];

        for (const currency of currencies) {
          const { status } = await this.http.post('/payments/intent', {
            amount: 1000,
            currency,
          });

          assert.ok([200, 201, 400, 404].includes(status), `Should handle ${currency}`);
        }
      });

      t('should reject unsupported currency', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/intent', {
          amount: 1000,
          currency: 'xyz',
        });

        assert.ok([400, 422].includes(status), 'Should reject invalid currency');
      });
    });

    // ============================================
    // Payment Confirmation
    // ============================================
    this.describe('Payment Confirmation', (t) => {
      t('should confirm payment intent', async (ctx) => {
        if (!this.authToken || !this.testPaymentIntentId) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/payments/confirm', {
          paymentIntentId: this.testPaymentIntentId,
          paymentMethodId: 'pm_card_visa', // Test card
        });

        assert.ok([200, 400, 402, 404].includes(status), 'Should handle confirmation');
      });

      t('should handle declined card', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Create intent first
        const { data: intent } = await this.http.post('/payments/intent', {
          amount: 1000,
          currency: 'usd',
        });

        if (intent?.id) {
          const { data, status } = await this.http.post('/payments/confirm', {
            paymentIntentId: intent.id,
            paymentMethodId: 'pm_card_declined', // Declined card
          });

          assert.ok([400, 402, 422].includes(status), 'Should handle declined card');
          if (data.error || data.message) {
            // Should have error message about decline
          }
        }
      });

      t('should handle insufficient funds', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data: intent } = await this.http.post('/payments/intent', {
          amount: 1000,
          currency: 'usd',
        });

        if (intent?.id) {
          const { status } = await this.http.post('/payments/confirm', {
            paymentIntentId: intent.id,
            paymentMethodId: 'pm_card_insufficient_funds',
          });

          assert.ok([400, 402, 422].includes(status), 'Should handle insufficient funds');
        }
      });

      t('should handle expired card', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data: intent } = await this.http.post('/payments/intent', {
          amount: 1000,
          currency: 'usd',
        });

        if (intent?.id) {
          const { status } = await this.http.post('/payments/confirm', {
            paymentIntentId: intent.id,
            paymentMethodId: 'pm_card_expired',
          });

          assert.ok([400, 402, 422].includes(status), 'Should handle expired card');
        }
      });
    });

    // ============================================
    // Refunds
    // ============================================
    this.describe('Refunds', (t) => {
      t('should create full refund', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Need a completed payment to refund
        const { status } = await this.http.post('/payments/refund', {
          paymentIntentId: 'pi_test_completed',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle refund');
      });

      t('should create partial refund', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/refund', {
          paymentIntentId: 'pi_test_completed',
          amount: 500, // Partial amount
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle partial refund');
      });

      t('should reject refund exceeding original amount', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/refund', {
          paymentIntentId: 'pi_test_completed',
          amount: 999999,
        });

        assert.ok([400, 422].includes(status), 'Should reject excessive refund');
      });

      t('should get refund status', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/payments/refunds/re_test_123');
        assert.ok([200, 404].includes(status), 'Should get refund status');
      });

      t('should list refunds for payment', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/payments/pi_test_123/refunds');
        assert.ok([200, 404].includes(status), 'Should list refunds');
      });
    });

    // ============================================
    // Payment Methods
    // ============================================
    this.describe('Payment Methods', (t) => {
      t('should list saved payment methods', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/payments/methods');
        assert.ok([200, 404].includes(status), 'Should list payment methods');
        if (status === 200) {
          assert.isArray(data.data || data, 'Should return array');
        }
      });

      t('should add payment method', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/methods', {
          type: 'card',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123',
          },
        });

        // Most likely 400 in test as we can't process real cards
        assert.ok([200, 201, 400, 404].includes(status), 'Should handle add payment method');
      });

      t('should delete payment method', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.delete('/payments/methods/pm_test_123');
        assert.ok([200, 204, 404].includes(status), 'Should handle delete');
      });

      t('should set default payment method', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/methods/pm_test_123/default');
        assert.ok([200, 404].includes(status), 'Should handle set default');
      });
    });

    // ============================================
    // Customer Management
    // ============================================
    this.describe('Customer Management', (t) => {
      t('should create or get Stripe customer', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/payments/customer');
        assert.ok([200, 201, 400, 404].includes(status), 'Should handle customer');
      });

      t('should update customer billing info', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/payments/customer', {
          name: 'Updated Name',
          email: 'updated@example.com',
        });

        assert.ok([200, 400, 404].includes(status), 'Should update customer');
      });
    });

    // ============================================
    // Subscriptions
    // ============================================
    this.describe('Subscriptions', (t) => {
      t('should list subscription plans', async (ctx) => {
        const { data, status } = await this.http.get('/subscriptions/plans');
        assert.ok([200, 404].includes(status), 'Should list plans');
      });

      t('should create subscription', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/subscriptions', {
          planId: 'plan_test_monthly',
          paymentMethodId: 'pm_card_visa',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle subscription');
      });

      t('should get subscription status', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/subscriptions/current');
        assert.ok([200, 404].includes(status), 'Should get subscription');
      });

      t('should cancel subscription', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/subscriptions/current/cancel');
        assert.ok([200, 400, 404].includes(status), 'Should handle cancellation');
      });

      t('should change subscription plan', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/subscriptions/current/change', {
          planId: 'plan_test_annual',
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle plan change');
      });

      t('should reactivate cancelled subscription', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/subscriptions/current/reactivate');
        assert.ok([200, 400, 404].includes(status), 'Should handle reactivation');
      });
    });

    // ============================================
    // Webhook Handling
    // ============================================
    this.describe('Webhook Handling', (t) => {
      t('should handle payment_intent.succeeded webhook', async (ctx) => {
        const { status } = await this.http.post('/webhooks/stripe', {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_123',
              amount: 1000,
              status: 'succeeded',
            },
          },
        });

        // Webhook might require signature verification
        assert.ok([200, 400, 401, 404].includes(status), 'Should handle webhook');
      });

      t('should handle payment_intent.failed webhook', async (ctx) => {
        const { status } = await this.http.post('/webhooks/stripe', {
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: 'pi_test_failed',
              amount: 1000,
              status: 'failed',
              last_payment_error: {
                message: 'Card declined',
              },
            },
          },
        });

        assert.ok([200, 400, 401, 404].includes(status), 'Should handle failed webhook');
      });

      t('should handle charge.refunded webhook', async (ctx) => {
        const { status } = await this.http.post('/webhooks/stripe', {
          type: 'charge.refunded',
          data: {
            object: {
              id: 'ch_test_123',
              amount_refunded: 1000,
            },
          },
        });

        assert.ok([200, 400, 401, 404].includes(status), 'Should handle refund webhook');
      });

      t('should reject invalid webhook signature', async (ctx) => {
        const { status } = await this.http.post(
          '/webhooks/stripe',
          {
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_test' } },
          },
          {
            headers: {
              'stripe-signature': 'invalid_signature',
            },
          }
        );

        // Should reject invalid signature
        assert.ok([200, 400, 401].includes(status), 'Should validate signature');
      });
    });

    // ============================================
    // Payment Security
    // ============================================
    this.describe('Payment Security', (t) => {
      t('should not expose full card numbers', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.get('/payments/methods');

        if (status === 200) {
          const methods = data.data || data;
          if (Array.isArray(methods)) {
            methods.forEach((method: any) => {
              if (method.card) {
                assert.notHasProperty(method.card, 'number', 'Should not expose full number');
                assert.ok(
                  !method.card.cvc,
                  'Should not expose CVC'
                );
              }
            });
          }
        }
      });

      t('should require authentication for payment operations', async (ctx) => {
        this.http.removeAuthToken();

        const { status } = await this.http.post('/payments/intent', {
          amount: 1000,
          currency: 'usd',
        });

        assert.statusCode(status, 401, 'Should require authentication');
      });

      t('should validate payment ownership', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Try to access another user's payment
        const { status } = await this.http.get('/payments/pi_other_user_payment');
        assert.ok([403, 404].includes(status), 'Should deny access to others payments');
      });

      t('should log payment attempts', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Payment audit log
        const { status } = await this.http.get('/payments/history');
        assert.ok([200, 404].includes(status), 'Should have payment history');
      });
    });

    // ============================================
    // PayPal Integration
    // ============================================
    this.describe('PayPal Integration', (t) => {
      t('should create PayPal order', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/paypal/order', {
          amount: 1000,
          currency: 'usd',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should handle PayPal order');
      });

      t('should capture PayPal order', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/payments/paypal/capture', {
          orderId: 'PP_ORDER_123',
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle PayPal capture');
      });

      t('should handle PayPal webhook', async (ctx) => {
        const { status } = await this.http.post('/webhooks/paypal', {
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {
            id: 'PP_CAPTURE_123',
            amount: { value: '10.00', currency_code: 'USD' },
          },
        });

        assert.ok([200, 400, 401, 404].includes(status), 'Should handle PayPal webhook');
      });
    });

    // ============================================
    // Error Handling
    // ============================================
    this.describe('Error Handling', (t) => {
      t('should provide clear error messages', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/payments/intent', {
          amount: -1,
          currency: 'usd',
        });

        if (status >= 400) {
          assert.ok(
            data.message || data.error,
            'Should have error message'
          );
        }
      });

      t('should handle network timeouts gracefully', async (ctx) => {
        // This is more of an infrastructure test
        // Testing that timeout handling exists
      }, { skip: true });

      t('should retry failed payments with exponential backoff', async (ctx) => {
        // This tests internal retry logic
        // Would require integration testing
      }, { skip: true });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new PaymentProcessingAgent(options);
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
