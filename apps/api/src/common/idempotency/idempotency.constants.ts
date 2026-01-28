/**
 * Idempotency Constants and Types
 * Extracted to avoid circular dependencies between decorator and interceptor
 */

export const IDEMPOTENCY_KEY = 'idempotency';

export interface IdempotencyOptions {
  /**
   * TTL in seconds for the idempotency record
   * Default: 86400 (24 hours)
   */
  ttlSeconds?: number;

  /**
   * Custom scope for the idempotency key (e.g., 'orders', 'payments')
   * Helps organize keys and prevent collisions
   */
  scope?: string;

  /**
   * Whether the idempotency key header is required
   * If true, requests without header will receive 400 error
   * Default: false
   */
  required?: boolean;

  /**
   * Include request body hash in the idempotency key
   * Useful for detecting mismatched requests with same key
   * Default: false
   */
  includeBodyHash?: boolean;

  /**
   * Skip idempotency check for certain conditions
   * Can be used for GET-like POST endpoints
   */
  skipIf?: 'noIdempotencyKey' | 'never';
}
