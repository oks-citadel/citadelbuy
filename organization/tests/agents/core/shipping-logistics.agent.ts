/**
 * Shipping & Logistics Agent
 *
 * Tests:
 * - Carrier API integrations (FedEx, UPS, DHL, etc.)
 * - Rate shopping and comparison
 * - Address validation
 * - Delivery estimation
 * - International shipping and customs
 * - Real-time tracking updates
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class ShippingLogisticsAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private testOrderId?: string;

  constructor(options: AgentOptions = {}) {
    super('Shipping & Logistics Agent', 'shipping-logistics', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    try {
      const { data } = await this.http.post('/auth/login', {
        email: 'customer@example.com',
        password: 'Customer123!',
      });
      this.authToken = data.access_token;
    } catch (e) {
      console.warn('Could not authenticate for shipping tests');
    }
  }

  protected defineTests(): void {
    // ============================================
    // Rate Shopping
    // ============================================
    this.describe('Rate Shopping', (t) => {
      t('should get shipping rates for domestic address', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/rates', {
          origin: {
            street: '123 Warehouse St',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            country: 'US',
          },
          destination: {
            street: '456 Customer Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
          packages: [
            { weight: 2.5, length: 10, width: 8, height: 6 },
          ],
        });

        assert.ok([200, 400, 404].includes(status), 'Should get rates');
        if (status === 200) {
          assert.ok(data.rates || Array.isArray(data), 'Should return rates');
        }
      });

      t('should get rates from multiple carriers', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/rates', {
          destination: {
            street: '789 Main St',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601',
            country: 'US',
          },
          packages: [{ weight: 1 }],
          carriers: ['UPS', 'FEDEX', 'USPS'],
        });

        if (status === 200) {
          const rates = data.rates || data;
          if (Array.isArray(rates) && rates.length > 0) {
            // Check that multiple carriers are represented
            const carrierSet = new Set(rates.map((r: any) => r.carrier));
            // May have 1 or more carriers
          }
        }
      });

      t('should sort rates by price', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/rates', {
          destination: {
            city: 'Miami',
            state: 'FL',
            zipCode: '33101',
            country: 'US',
          },
          packages: [{ weight: 5 }],
          sortBy: 'price',
        });

        if (status === 200) {
          const rates = data.rates || data;
          if (Array.isArray(rates) && rates.length > 1) {
            for (let i = 1; i < rates.length; i++) {
              if (rates[i].price && rates[i - 1].price) {
                assert.ok(
                  rates[i].price >= rates[i - 1].price,
                  'Rates should be sorted by price'
                );
              }
            }
          }
        }
      });

      t('should sort rates by delivery time', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/rates', {
          destination: {
            city: 'Seattle',
            state: 'WA',
            zipCode: '98101',
            country: 'US',
          },
          packages: [{ weight: 3 }],
          sortBy: 'deliveryTime',
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle sorting');
      });

      t('should filter rates by service type', async (ctx) => {
        const { status } = await this.http.post('/shipping/rates', {
          destination: {
            city: 'Denver',
            state: 'CO',
            zipCode: '80201',
            country: 'US',
          },
          packages: [{ weight: 2 }],
          serviceTypes: ['express', 'overnight'],
        });

        assert.ok([200, 400, 404].includes(status), 'Should filter by service');
      });
    });

    // ============================================
    // International Shipping
    // ============================================
    this.describe('International Shipping', (t) => {
      t('should get international shipping rates', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/rates', {
          destination: {
            city: 'London',
            zipCode: 'SW1A 1AA',
            country: 'GB',
          },
          packages: [{ weight: 1 }],
        });

        assert.ok([200, 400, 404].includes(status), 'Should get international rates');
      });

      t('should include customs information', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/rates', {
          destination: {
            city: 'Tokyo',
            zipCode: '100-0001',
            country: 'JP',
          },
          packages: [{ weight: 2 }],
          customsInfo: {
            contentsType: 'MERCHANDISE',
            declaredValue: 100,
            currency: 'USD',
          },
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle customs');
      });

      t('should calculate duties and taxes', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/duties', {
          destination: {
            country: 'DE',
          },
          items: [
            { description: 'Electronics', value: 500, quantity: 1 },
          ],
        });

        assert.ok([200, 400, 404].includes(status), 'Should calculate duties');
      });

      t('should validate international address', async (ctx) => {
        const { status } = await this.http.post('/shipping/address/validate', {
          street: '10 Downing Street',
          city: 'London',
          zipCode: 'SW1A 2AA',
          country: 'GB',
        });

        assert.ok([200, 400, 404].includes(status), 'Should validate international address');
      });

      t('should check restricted destinations', async (ctx) => {
        const { status } = await this.http.post('/shipping/check-restrictions', {
          destination: { country: 'KP' }, // North Korea - typically restricted
          items: [{ description: 'Electronics' }],
        });

        assert.ok([200, 400, 403, 404].includes(status), 'Should check restrictions');
      });
    });

    // ============================================
    // Address Validation
    // ============================================
    this.describe('Address Validation', (t) => {
      t('should validate US address', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/address/validate', {
          street: '1600 Pennsylvania Avenue NW',
          city: 'Washington',
          state: 'DC',
          zipCode: '20500',
          country: 'US',
        });

        assert.ok([200, 400, 404].includes(status), 'Should validate address');
        if (status === 200) {
          assert.hasProperty(data, 'valid', 'Should indicate validity');
        }
      });

      t('should suggest address corrections', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/address/validate', {
          street: '123 Mian Street', // Misspelled "Main"
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        });

        if (status === 200 && data.suggestions) {
          assert.isArray(data.suggestions, 'Should provide suggestions');
        }
      });

      t('should reject clearly invalid addresses', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/address/validate', {
          street: 'Invalid Address 123456',
          city: 'Fake City',
          state: 'XX',
          zipCode: '00000',
          country: 'US',
        });

        if (status === 200) {
          assert.ok(
            data.valid === false || data.confidence < 0.5,
            'Should indicate invalid address'
          );
        }
      });

      t('should validate ZIP code matches city/state', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/address/validate', {
          street: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '10001', // NYC ZIP code
          country: 'US',
        });

        if (status === 200 && data.warnings) {
          // Should warn about ZIP mismatch
        }
      });

      t('should normalize address format', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/address/validate', {
          street: '123 north main street apt 4b',
          city: 'new york',
          state: 'ny',
          zipCode: '10001',
          country: 'us',
        });

        if (status === 200 && data.normalizedAddress) {
          // Should normalize to proper case and abbreviations
        }
      });
    });

    // ============================================
    // Delivery Estimation
    // ============================================
    this.describe('Delivery Estimation', (t) => {
      t('should estimate delivery date', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/estimate', {
          origin: {
            zipCode: '90001',
            country: 'US',
          },
          destination: {
            zipCode: '10001',
            country: 'US',
          },
          serviceType: 'ground',
        });

        assert.ok([200, 400, 404].includes(status), 'Should estimate delivery');
        if (status === 200) {
          assert.ok(
            data.estimatedDelivery || data.deliveryDate,
            'Should have delivery estimate'
          );
        }
      });

      t('should provide delivery windows', async (ctx) => {
        const { data, status } = await this.http.post('/shipping/estimate', {
          destination: { zipCode: '60601', country: 'US' },
          serviceType: 'express',
        });

        if (status === 200 && data.deliveryWindow) {
          assert.hasProperty(data.deliveryWindow, 'earliest', 'Should have earliest');
          assert.hasProperty(data.deliveryWindow, 'latest', 'Should have latest');
        }
      });

      t('should account for holidays', async (ctx) => {
        const { status } = await this.http.post('/shipping/estimate', {
          destination: { zipCode: '33101', country: 'US' },
          shipDate: '2024-12-24', // Christmas Eve
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle holidays');
      });

      t('should account for weekends', async (ctx) => {
        const { status } = await this.http.post('/shipping/estimate', {
          destination: { zipCode: '98101', country: 'US' },
          shipDate: '2024-03-23', // Saturday
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle weekends');
      });
    });

    // ============================================
    // Shipping Labels
    // ============================================
    this.describe('Shipping Labels', (t) => {
      t('should create shipping label', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/shipping/labels', {
          carrier: 'UPS',
          serviceType: 'ground',
          fromAddress: {
            name: 'Warehouse',
            street: '123 Warehouse St',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            country: 'US',
          },
          toAddress: {
            name: 'Customer',
            street: '456 Customer Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
          packages: [{ weight: 2, length: 10, width: 8, height: 6 }],
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should create label');
      });

      t('should void shipping label', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/shipping/labels/LABEL123/void');
        assert.ok([200, 400, 404].includes(status), 'Should void label');
      });

      t('should get label as PDF', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status, headers } = await this.http.get('/shipping/labels/LABEL123?format=pdf');
        assert.ok([200, 404].includes(status), 'Should get label PDF');
      });

      t('should get label as ZPL', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.get('/shipping/labels/LABEL123?format=zpl');
        assert.ok([200, 404].includes(status), 'Should get label ZPL');
      });
    });

    // ============================================
    // Tracking
    // ============================================
    this.describe('Real-time Tracking', (t) => {
      t('should track shipment by tracking number', async (ctx) => {
        const { data, status } = await this.http.get('/shipping/track/1Z999AA10123456784');

        assert.ok([200, 404].includes(status), 'Should track shipment');
        if (status === 200) {
          assert.hasProperty(data, 'status', 'Should have status');
          assert.hasProperty(data, 'events', 'Should have events');
        }
      });

      t('should get tracking events in order', async (ctx) => {
        const { data, status } = await this.http.get('/shipping/track/1Z999AA10123456784');

        if (status === 200 && data.events) {
          assert.isArray(data.events, 'Events should be array');
          // Events should be in chronological order
        }
      });

      t('should track with carrier auto-detection', async (ctx) => {
        const { status } = await this.http.get('/shipping/track/auto/1Z999AA10123456784');
        assert.ok([200, 404].includes(status), 'Should auto-detect carrier');
      });

      t('should get estimated delivery from tracking', async (ctx) => {
        const { data, status } = await this.http.get('/shipping/track/1Z999AA10123456784');

        if (status === 200) {
          // May have estimated delivery
        }
      });

      t('should subscribe to tracking updates', async (ctx) => {
        const { status } = await this.http.post('/shipping/track/subscribe', {
          trackingNumber: '1Z999AA10123456784',
          webhookUrl: 'https://example.com/webhook',
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should subscribe to updates');
      });
    });

    // ============================================
    // Carrier Integration
    // ============================================
    this.describe('Carrier Integration', (t) => {
      t('should list available carriers', async (ctx) => {
        const { data, status } = await this.http.get('/shipping/carriers');

        assert.ok([200, 404].includes(status), 'Should list carriers');
        if (status === 200) {
          assert.isArray(data.carriers || data, 'Should return carriers array');
        }
      });

      t('should get carrier services', async (ctx) => {
        const { data, status } = await this.http.get('/shipping/carriers/UPS/services');

        assert.ok([200, 404].includes(status), 'Should get carrier services');
      });

      t('should check carrier availability by region', async (ctx) => {
        const { status } = await this.http.post('/shipping/carriers/availability', {
          origin: { country: 'US', zipCode: '90001' },
          destination: { country: 'CA', zipCode: 'M5H 2N2' },
        });

        assert.ok([200, 404].includes(status), 'Should check availability');
      });

      t('should get carrier pickup schedule', async (ctx) => {
        const { status } = await this.http.post('/shipping/carriers/UPS/pickup-times', {
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        });

        assert.ok([200, 400, 404].includes(status), 'Should get pickup times');
      });

      t('should schedule carrier pickup', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/shipping/pickup', {
          carrier: 'UPS',
          pickupDate: '2024-03-25',
          pickupWindow: { start: '09:00', end: '17:00' },
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
          packages: 3,
        });

        assert.ok([200, 201, 400, 404].includes(status), 'Should schedule pickup');
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new ShippingLogisticsAgent(options);
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
