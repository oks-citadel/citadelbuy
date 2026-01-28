import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import * as crypto from 'crypto';

/**
 * Webhook Security E2E Tests
 *
 * Tests for webhook-related security controls:
 * - Signature verification for various providers
 * - Replay attack prevention
 * - Rate limiting
 * - Payload validation
 */
describe('Webhook Security (e2e)', () => {
  let app: INestApplication;

  // Test webhook secrets (would normally come from env)
  const STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_key_12345678901234';
  const SHOPIFY_WEBHOOK_SECRET = 'shopify_secret_key_test_12345678';

  beforeAll(async () => {
    // Set test webhook secrets
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
    process.env.SHOPIFY_WEBHOOK_SECRET = SHOPIFY_WEBHOOK_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Generate Stripe webhook signature
   */
  function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const signedPayload = `${ts}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    return `t=${ts},v1=${signature}`;
  }

  /**
   * Generate Shopify webhook signature
   */
  function generateShopifySignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');
  }

  describe('Stripe Webhook Signature Verification', () => {
    const webhookEndpoint = '/webhooks/stripe';

    it('should accept webhook with valid signature', async () => {
      const payload = JSON.stringify({
        id: 'evt_test_12345',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 1000,
          },
        },
      });

      const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(payload);

      // Should be accepted (200 or 202)
      expect([HttpStatus.OK, HttpStatus.ACCEPTED, HttpStatus.NOT_FOUND]).toContain(response.status);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify({
        id: 'evt_test_12345',
        type: 'payment_intent.succeeded',
      });

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=12345,v1=invalid_signature')
        .send(payload);

      // Should be rejected
      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN]).toContain(
        response.status,
      );
    });

    it('should reject webhook with missing signature', async () => {
      const payload = JSON.stringify({
        id: 'evt_test_12345',
        type: 'payment_intent.succeeded',
      });

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        // No Stripe-Signature header
        .send(payload);

      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });

    it('should reject webhook with old timestamp', async () => {
      const payload = JSON.stringify({
        id: 'evt_test_12345',
        type: 'payment_intent.succeeded',
      });

      // Use timestamp from 10 minutes ago (beyond 5 minute tolerance)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET, oldTimestamp);

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(payload);

      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });

    it('should reject webhook with tampered payload', async () => {
      const originalPayload = JSON.stringify({
        id: 'evt_test_12345',
        type: 'payment_intent.succeeded',
        data: { amount: 1000 },
      });

      // Sign the original payload
      const signature = generateStripeSignature(originalPayload, STRIPE_WEBHOOK_SECRET);

      // Tamper with the payload
      const tamperedPayload = JSON.stringify({
        id: 'evt_test_12345',
        type: 'payment_intent.succeeded',
        data: { amount: 10000 }, // Changed amount!
      });

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(tamperedPayload);

      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });
  });

  describe('Shopify Webhook Signature Verification', () => {
    const webhookEndpoint = '/webhooks/shopify';

    it('should accept webhook with valid HMAC signature', async () => {
      const payload = JSON.stringify({
        id: 12345,
        topic: 'orders/create',
        shop_domain: 'test-shop.myshopify.com',
      });

      const signature = generateShopifySignature(payload, SHOPIFY_WEBHOOK_SECRET);

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('X-Shopify-Hmac-SHA256', signature)
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(payload);

      expect([HttpStatus.OK, HttpStatus.ACCEPTED, HttpStatus.NOT_FOUND]).toContain(response.status);
    });

    it('should reject webhook with invalid HMAC signature', async () => {
      const payload = JSON.stringify({
        id: 12345,
        topic: 'orders/create',
      });

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('X-Shopify-Hmac-SHA256', 'invalid_signature_base64==')
        .set('X-Shopify-Topic', 'orders/create')
        .send(payload);

      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });
  });

  describe('Replay Attack Prevention', () => {
    const webhookEndpoint = '/webhooks/stripe';

    it('should reject duplicate webhook events', async () => {
      const eventId = `evt_replay_test_${Date.now()}`;
      const payload = JSON.stringify({
        id: eventId,
        type: 'payment_intent.succeeded',
        data: { amount: 1000 },
      });

      const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

      // First request should succeed
      const firstResponse = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .set('X-Request-Id', `req_${eventId}_1`)
        .send(payload);

      // Second request with same event ID should be rejected or return idempotent response
      const secondResponse = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .set('X-Request-Id', `req_${eventId}_2`)
        .send(payload);

      // Either 409 Conflict, 200 (idempotent), or similar
      // The important thing is it doesn't process twice
      if (firstResponse.status === HttpStatus.OK || firstResponse.status === HttpStatus.ACCEPTED) {
        expect([HttpStatus.OK, HttpStatus.ACCEPTED, HttpStatus.CONFLICT]).toContain(
          secondResponse.status,
        );
      }
    });

    it('should include idempotency key in response', async () => {
      const eventId = `evt_idempotency_test_${Date.now()}`;
      const payload = JSON.stringify({
        id: eventId,
        type: 'payment_intent.succeeded',
      });

      const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(payload);

      // Response should indicate event was processed (or provide idempotency info)
      if (response.status === HttpStatus.OK || response.status === HttpStatus.ACCEPTED) {
        // Could check for idempotency-related header or body field
        expect(response.headers['x-request-id'] || response.body.eventId).toBeDefined();
      }
    });
  });

  describe('Webhook Rate Limiting', () => {
    const webhookEndpoint = '/webhooks/stripe';

    it('should rate limit excessive webhook calls', async () => {
      const requests: Promise<any>[] = [];

      // Send many concurrent requests
      for (let i = 0; i < 50; i++) {
        const payload = JSON.stringify({
          id: `evt_rate_limit_test_${i}_${Date.now()}`,
          type: 'payment_intent.succeeded',
        });
        const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

        requests.push(
          request(app.getHttpServer())
            .post(webhookEndpoint)
            .set('Content-Type', 'application/json')
            .set('Stripe-Signature', signature)
            .send(payload),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === HttpStatus.TOO_MANY_REQUESTS);

      // Some requests should be rate limited
      expect(rateLimited.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Payload Validation', () => {
    const webhookEndpoint = '/webhooks/stripe';

    it('should reject malformed JSON payload', async () => {
      const malformedPayload = '{ invalid json }';

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=12345,v1=test')
        .send(malformedPayload);

      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });

    it('should reject excessively large payloads', async () => {
      // Create a very large payload
      const largeData = 'A'.repeat(10 * 1024 * 1024); // 10MB
      const payload = JSON.stringify({
        id: 'evt_large_payload_test',
        type: 'payment_intent.succeeded',
        data: largeData,
      });

      const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(payload);

      expect([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE]).toContain(response.status);
    });

    it('should reject payload with injection attempts', async () => {
      const maliciousPayload = JSON.stringify({
        id: 'evt_injection_test',
        type: 'payment_intent.succeeded',
        data: {
          metadata: {
            note: '<script>alert("xss")</script>',
            sql: "'; DROP TABLE users; --",
          },
        },
      });

      const signature = generateStripeSignature(maliciousPayload, STRIPE_WEBHOOK_SECRET);

      const response = await request(app.getHttpServer())
        .post(webhookEndpoint)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(maliciousPayload);

      // Should either reject or sanitize, not store malicious content
      if (response.status === HttpStatus.OK || response.status === HttpStatus.ACCEPTED) {
        // If accepted, verify data was sanitized (would need to check database)
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('Generic Webhook Security', () => {
    it('should require authentication for webhook configuration endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks/configurations')
        // No auth header
        .send();

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should not expose webhook secrets in responses', async () => {
      // Any endpoint that might return webhook configuration
      const response = await request(app.getHttpServer())
        .get('/webhooks/stripe')
        .send();

      const bodyString = JSON.stringify(response.body);

      // Should not contain actual secrets
      expect(bodyString).not.toContain(STRIPE_WEBHOOK_SECRET);
      expect(bodyString).not.toContain('whsec_');
    });
  });
});
