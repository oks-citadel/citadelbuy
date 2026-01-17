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

// MFA Enforcement Configuration
// Roles that require mandatory MFA
export const MFA_ENFORCEMENT = {
  // Roles that require MFA to be enabled
  REQUIRED_ROLES: ['ADMIN', 'VENDOR'] as const,
  // Grace period in days for new users to set up MFA
  GRACE_PERIOD_DAYS: 7,
  // Grace period in milliseconds (7 days)
  GRACE_PERIOD_MS: 7 * 24 * 60 * 60 * 1000,
  // Error codes for MFA enforcement
  ERROR_CODES: {
    MFA_REQUIRED: 'MFA_REQUIRED',
    MFA_SETUP_REQUIRED: 'MFA_SETUP_REQUIRED',
    MFA_GRACE_PERIOD_EXPIRED: 'MFA_GRACE_PERIOD_EXPIRED',
  },
} as const;

// Rate limiting
export const RATE_LIMIT = {
  // Default limits
  DEFAULT_TTL: 60, // seconds
  DEFAULT_LIMIT: 100, // requests per TTL window

  // Anonymous user limits (by IP)
  ANONYMOUS_TTL: 60,
  ANONYMOUS_LIMIT: 30,

  // Auth endpoint limits (login, register, etc.)
  AUTH_TTL: 60,
  AUTH_LIMIT: 10,

  // Webhook endpoint limits
  WEBHOOK_TTL: 60,
  WEBHOOK_LIMIT: 100,

  // AI endpoint limits
  AI_TTL: 60,
  AI_LIMIT: 5,

  // Search endpoint limits
  SEARCH_TTL: 60,
  SEARCH_LIMIT: 20,

  // Upload endpoint limits
  UPLOAD_TTL: 60,
  UPLOAD_LIMIT: 5,

  // Admin endpoint limits
  ADMIN_TTL: 60,
  ADMIN_LIMIT: 5,

  // Plan-based multipliers
  PLAN_MULTIPLIERS: {
    FREE: 1.0,
    BASIC: 2.0,
    PREMIUM: 5.0,
    ENTERPRISE: 16.67,
  },

  // Operation type multipliers
  OPERATION_MULTIPLIERS: {
    READ: 1.0,
    WRITE: 0.5,
  },
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
