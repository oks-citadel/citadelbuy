import * as crypto from 'crypto';

/**
 * Webhook Signature Utilities
 *
 * Provides functions for generating and verifying webhook signatures
 * using HMAC-SHA256 for secure webhook delivery verification.
 */

/**
 * Generate a webhook signature for outgoing webhooks
 *
 * @param payload - The webhook payload (should be JSON stringified)
 * @param secret - The webhook secret key
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Signature string in format: t={timestamp},v1={signature}
 */
export function generateWebhookSignature(
  payload: string | object,
  secret: string,
  timestamp?: number,
): string {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Create the signed payload: timestamp.payload
  const signedPayload = `${ts}.${payloadString}`;

  // Generate HMAC SHA256 signature
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return `t=${ts},v1=${signature}`;
}

/**
 * Verify a webhook signature for incoming webhooks
 *
 * @param payload - The received webhook payload (raw string)
 * @param signatureHeader - The signature header value
 * @param secret - The webhook secret key
 * @param toleranceSeconds - Time tolerance for replay attacks (default: 5 minutes)
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string | object,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300,
): boolean {
  try {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // Parse signature header
    const elements = signatureHeader.split(',');
    const signature: { t?: number; v1?: string } = {};

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        signature.t = parseInt(value, 10);
      } else if (key === 'v1') {
        signature.v1 = value;
      }
    }

    if (!signature.t || !signature.v1) {
      return false;
    }

    // Check timestamp tolerance to prevent replay attacks
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - signature.t) > toleranceSeconds) {
      return false;
    }

    // Recreate the signed payload
    const signedPayload = `${signature.t}.${payloadString}`;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature.v1, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    );
  } catch (error) {
    return false;
  }
}

/**
 * Generate a random webhook secret
 *
 * @param length - Length of the secret (default: 32 bytes = 64 hex chars)
 * @returns Random hex string
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Extract timestamp from signature header
 *
 * @param signatureHeader - The signature header value
 * @returns Timestamp in seconds, or null if not found
 */
export function extractTimestampFromSignature(signatureHeader: string): number | null {
  try {
    const elements = signatureHeader.split(',');
    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        return parseInt(value, 10);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create webhook headers for outgoing webhooks
 *
 * @param payload - The webhook payload
 * @param secret - The webhook secret
 * @param eventType - The event type
 * @param eventId - The unique event ID
 * @returns Headers object
 */
export function createWebhookHeaders(
  payload: string | object,
  secret: string,
  eventType: string,
  eventId: string,
): Record<string, string> {
  const signature = generateWebhookSignature(payload, secret);

  return {
    'Content-Type': 'application/json',
    'User-Agent': 'Broxiva-Webhook/1.0',
    'X-Webhook-Signature': signature,
    'X-Webhook-Event-Type': eventType,
    'X-Webhook-Event-ID': eventId,
    'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
  };
}
