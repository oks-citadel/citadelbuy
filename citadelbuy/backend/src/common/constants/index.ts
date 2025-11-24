/**
 * Application-wide constants
 * Centralized location for all constants used across the backend
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Order statuses
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  VENDOR: 'VENDOR',
  CUSTOMER: 'CUSTOMER',
} as const;

// Authentication
export const AUTH = {
  JWT_EXPIRATION: '1h',
  REFRESH_TOKEN_EXPIRATION: '7d',
  BCRYPT_ROUNDS: 10,
  PASSWORD_MIN_LENGTH: 8,
} as const;

// Rate limiting
export const RATE_LIMIT = {
  DEFAULT_TTL: 60, // seconds
  DEFAULT_LIMIT: 100, // requests
  AUTH_TTL: 60,
  AUTH_LIMIT: 5,
} as const;

// Email templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  ORDER_CONFIRMATION: 'order-confirmation',
  ORDER_SHIPPED: 'order-shipped',
} as const;

// File upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
} as const;

// Product
export const PRODUCT = {
  MIN_PRICE: 0,
  MAX_PRICE: 999999.99,
  MIN_STOCK: 0,
  DEFAULT_CURRENCY: 'USD',
} as const;

// Payment
export const PAYMENT = {
  PROVIDER: 'STRIPE',
  CURRENCY: 'usd',
  WEBHOOK_EVENTS: {
    PAYMENT_SUCCEEDED: 'payment_intent.succeeded',
    PAYMENT_FAILED: 'payment_intent.payment_failed',
    CHARGE_REFUNDED: 'charge.refunded',
  },
} as const;
