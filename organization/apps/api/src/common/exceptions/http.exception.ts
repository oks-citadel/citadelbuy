import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application exception with extended error information
 */
export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code: string,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

// ==================== 400 Bad Request Exceptions ====================

/**
 * 400 Bad Request - General validation error
 */
export class ValidationException extends AppException {
  constructor(message: string = 'Validation failed', details?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

/**
 * 400 Bad Request - Invalid input parameter
 */
export class InvalidInputException extends AppException {
  constructor(field: string, message?: string) {
    super(
      message || `Invalid value for field: ${field}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_INPUT',
      { field },
    );
  }
}

/**
 * 400 Bad Request - Missing required field
 */
export class MissingFieldException extends AppException {
  constructor(field: string) {
    super(
      `Missing required field: ${field}`,
      HttpStatus.BAD_REQUEST,
      'MISSING_REQUIRED_FIELD',
      { field },
    );
  }
}

/**
 * 400 Bad Request - Invalid format
 */
export class InvalidFormatException extends AppException {
  constructor(field: string, expectedFormat: string) {
    super(
      `Invalid format for ${field}. Expected: ${expectedFormat}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_FORMAT',
      { field, expectedFormat },
    );
  }
}

// ==================== 401 Unauthorized Exceptions ====================

/**
 * 401 Unauthorized - Missing authentication
 */
export class AuthenticationRequiredException extends AppException {
  constructor(message: string = 'Authentication is required') {
    super(message, HttpStatus.UNAUTHORIZED, 'AUTHENTICATION_REQUIRED');
  }
}

/**
 * 401 Unauthorized - Invalid credentials
 */
export class InvalidCredentialsException extends AppException {
  constructor(message: string = 'Invalid email or password') {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }
}

/**
 * 401 Unauthorized - Token expired
 */
export class TokenExpiredException extends AppException {
  constructor(tokenType: string = 'access') {
    super(
      `Your ${tokenType} token has expired. Please authenticate again.`,
      HttpStatus.UNAUTHORIZED,
      'TOKEN_EXPIRED',
      { tokenType },
    );
  }
}

/**
 * 401 Unauthorized - Invalid token
 */
export class InvalidTokenException extends AppException {
  constructor(reason?: string) {
    super(
      reason || 'Invalid authentication token',
      HttpStatus.UNAUTHORIZED,
      'INVALID_TOKEN',
    );
  }
}

/**
 * 401 Unauthorized - Token revoked
 */
export class TokenRevokedException extends AppException {
  constructor() {
    super(
      'This token has been revoked. Please authenticate again.',
      HttpStatus.UNAUTHORIZED,
      'TOKEN_REVOKED',
    );
  }
}

/**
 * 401 Unauthorized - MFA required
 */
export class MfaRequiredException extends AppException {
  constructor(message: string = 'Multi-factor authentication is required') {
    super(message, HttpStatus.UNAUTHORIZED, 'MFA_REQUIRED');
  }
}

// ==================== 403 Forbidden Exceptions ====================

/**
 * 403 Forbidden - Insufficient permissions
 */
export class InsufficientPermissionsException extends AppException {
  constructor(requiredPermission?: string) {
    super(
      requiredPermission
        ? `You do not have the required permission: ${requiredPermission}`
        : 'You do not have permission to perform this action',
      HttpStatus.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS',
      requiredPermission ? { requiredPermission } : undefined,
    );
  }
}

/**
 * 403 Forbidden - Account suspended
 */
export class AccountSuspendedException extends AppException {
  constructor(reason?: string) {
    super(
      reason || 'Your account has been suspended. Please contact support.',
      HttpStatus.FORBIDDEN,
      'ACCOUNT_SUSPENDED',
    );
  }
}

/**
 * 403 Forbidden - Account not verified
 */
export class AccountNotVerifiedException extends AppException {
  constructor() {
    super(
      'Your account is not verified. Please verify your email address.',
      HttpStatus.FORBIDDEN,
      'ACCOUNT_NOT_VERIFIED',
    );
  }
}

/**
 * 403 Forbidden - Resource access denied
 */
export class ResourceAccessDeniedException extends AppException {
  constructor(resource: string) {
    super(
      `You do not have access to this ${resource}`,
      HttpStatus.FORBIDDEN,
      'RESOURCE_ACCESS_DENIED',
      { resource },
    );
  }
}

/**
 * 403 Forbidden - CSRF token invalid
 */
export class CsrfTokenInvalidException extends AppException {
  constructor() {
    super(
      'Invalid CSRF token. Please refresh the page and try again.',
      HttpStatus.FORBIDDEN,
      'CSRF_TOKEN_INVALID',
    );
  }
}

// ==================== 404 Not Found Exceptions ====================

/**
 * 404 Not Found - Resource not found
 */
export class ResourceNotFoundException extends AppException {
  constructor(resource: string, identifier?: string | number) {
    super(
      identifier
        ? `${resource} with identifier '${identifier}' was not found`
        : `${resource} was not found`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      { resource, identifier },
    );
  }
}

/**
 * 404 Not Found - User not found
 */
export class UserNotFoundException extends AppException {
  constructor(identifier?: string) {
    super(
      identifier ? `User '${identifier}' was not found` : 'User was not found',
      HttpStatus.NOT_FOUND,
      'USER_NOT_FOUND',
      identifier ? { identifier } : undefined,
    );
  }
}

/**
 * 404 Not Found - Endpoint not found
 */
export class EndpointNotFoundException extends AppException {
  constructor(path: string, method: string) {
    super(
      `Cannot ${method} ${path}`,
      HttpStatus.NOT_FOUND,
      'ENDPOINT_NOT_FOUND',
      { path, method },
    );
  }
}

// ==================== 408 Request Timeout Exceptions ====================

/**
 * 408 Request Timeout - Operation timed out
 */
export class OperationTimeoutException extends AppException {
  constructor(operation: string, timeoutMs?: number) {
    super(
      timeoutMs
        ? `Operation '${operation}' timed out after ${timeoutMs}ms`
        : `Operation '${operation}' timed out`,
      HttpStatus.REQUEST_TIMEOUT,
      'OPERATION_TIMEOUT',
      { operation, timeoutMs },
    );
  }
}

// ==================== 409 Conflict Exceptions ====================

/**
 * 409 Conflict - Resource already exists
 */
export class ResourceAlreadyExistsException extends AppException {
  constructor(resource: string, identifier?: string) {
    super(
      identifier
        ? `${resource} with identifier '${identifier}' already exists`
        : `${resource} already exists`,
      HttpStatus.CONFLICT,
      'RESOURCE_ALREADY_EXISTS',
      { resource, identifier },
    );
  }
}

/**
 * 409 Conflict - Duplicate entry
 */
export class DuplicateEntryException extends AppException {
  constructor(field: string, value?: string) {
    super(
      value
        ? `A record with ${field} '${value}' already exists`
        : `Duplicate value for ${field}`,
      HttpStatus.CONFLICT,
      'DUPLICATE_ENTRY',
      { field, value },
    );
  }
}

/**
 * 409 Conflict - Session limit exceeded
 */
export class SessionLimitExceededException extends AppException {
  constructor(maxSessions: number) {
    super(
      `Maximum number of concurrent sessions (${maxSessions}) exceeded. Please log out from another device.`,
      HttpStatus.CONFLICT,
      'SESSION_LIMIT_EXCEEDED',
      { maxSessions },
    );
  }
}

/**
 * 409 Conflict - Concurrent modification
 */
export class ConcurrentModificationException extends AppException {
  constructor(resource: string) {
    super(
      `${resource} was modified by another request. Please refresh and try again.`,
      HttpStatus.CONFLICT,
      'CONCURRENT_MODIFICATION',
      { resource },
    );
  }
}

/**
 * 409 Conflict - State conflict
 */
export class StateConflictException extends AppException {
  constructor(message: string, currentState?: string, expectedState?: string) {
    super(
      message,
      HttpStatus.CONFLICT,
      'STATE_CONFLICT',
      { currentState, expectedState },
    );
  }
}

// ==================== 413 Payload Too Large Exceptions ====================

/**
 * 413 Payload Too Large - Request body too large
 */
export class PayloadTooLargeException extends AppException {
  constructor(maxSize: string | number) {
    super(
      `Request payload exceeds the maximum allowed size of ${maxSize}`,
      HttpStatus.PAYLOAD_TOO_LARGE,
      'PAYLOAD_TOO_LARGE',
      { maxSize },
    );
  }
}

/**
 * 413 Payload Too Large - File too large
 */
export class FileTooLargeException extends AppException {
  constructor(maxSize: string | number, filename?: string) {
    super(
      filename
        ? `File '${filename}' exceeds the maximum allowed size of ${maxSize}`
        : `File exceeds the maximum allowed size of ${maxSize}`,
      HttpStatus.PAYLOAD_TOO_LARGE,
      'FILE_TOO_LARGE',
      { maxSize, filename },
    );
  }
}

// ==================== 429 Too Many Requests Exceptions ====================

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitExceededException extends AppException {
  constructor(retryAfter?: number) {
    super(
      retryAfter
        ? `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
        : 'Rate limit exceeded. Please try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      { retryAfter },
    );
  }
}

/**
 * 429 Too Many Requests - Too many login attempts
 */
export class TooManyLoginAttemptsException extends AppException {
  constructor(lockoutMinutes?: number) {
    super(
      lockoutMinutes
        ? `Too many login attempts. Account locked for ${lockoutMinutes} minutes.`
        : 'Too many login attempts. Please try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
      'TOO_MANY_LOGIN_ATTEMPTS',
      { lockoutMinutes },
    );
  }
}

/**
 * 429 Too Many Requests - API quota exceeded
 */
export class ApiQuotaExceededException extends AppException {
  constructor(quotaType: string, resetTime?: Date) {
    super(
      resetTime
        ? `${quotaType} quota exceeded. Resets at ${resetTime.toISOString()}`
        : `${quotaType} quota exceeded`,
      HttpStatus.TOO_MANY_REQUESTS,
      'API_QUOTA_EXCEEDED',
      { quotaType, resetTime: resetTime?.toISOString() },
    );
  }
}

// ==================== 500 Internal Server Error Exceptions ====================

/**
 * 500 Internal Server Error - Generic server error
 */
export class InternalServerException extends AppException {
  constructor(message: string = 'An unexpected error occurred') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * 500 Internal Server Error - Database error
 */
export class DatabaseException extends AppException {
  constructor(message: string = 'A database error occurred') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
  }
}

/**
 * 500 Internal Server Error - Configuration error
 */
export class ConfigurationException extends AppException {
  constructor(configKey: string) {
    super(
      `Configuration error: ${configKey} is not properly configured`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'CONFIGURATION_ERROR',
      { configKey },
    );
  }
}

// ==================== 502 Bad Gateway Exceptions ====================

/**
 * 502 Bad Gateway - External service error
 */
export class ExternalServiceException extends AppException {
  constructor(service: string, message?: string) {
    super(
      message || `External service '${service}' returned an invalid response`,
      HttpStatus.BAD_GATEWAY,
      'EXTERNAL_SERVICE_ERROR',
      { service },
    );
  }
}

/**
 * 502 Bad Gateway - Upstream error
 */
export class UpstreamException extends AppException {
  constructor(upstream: string) {
    super(
      `Upstream service '${upstream}' is not responding correctly`,
      HttpStatus.BAD_GATEWAY,
      'UPSTREAM_ERROR',
      { upstream },
    );
  }
}

// ==================== 503 Service Unavailable Exceptions ====================

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableException extends AppException {
  constructor(service?: string, retryAfter?: number) {
    super(
      service
        ? `${service} is temporarily unavailable. Please try again later.`
        : 'Service is temporarily unavailable. Please try again later.',
      HttpStatus.SERVICE_UNAVAILABLE,
      'SERVICE_UNAVAILABLE',
      { service, retryAfter },
    );
  }
}

/**
 * 503 Service Unavailable - Maintenance mode
 */
export class MaintenanceModeException extends AppException {
  constructor(estimatedEndTime?: Date) {
    super(
      estimatedEndTime
        ? `System is under maintenance. Estimated completion: ${estimatedEndTime.toISOString()}`
        : 'System is under maintenance. Please try again later.',
      HttpStatus.SERVICE_UNAVAILABLE,
      'MAINTENANCE_MODE',
      { estimatedEndTime: estimatedEndTime?.toISOString() },
    );
  }
}

/**
 * 503 Service Unavailable - Database unavailable
 */
export class DatabaseUnavailableException extends AppException {
  constructor() {
    super(
      'Database service is temporarily unavailable. Please try again later.',
      HttpStatus.SERVICE_UNAVAILABLE,
      'DATABASE_UNAVAILABLE',
    );
  }
}

/**
 * 503 Service Unavailable - Redis unavailable
 */
export class CacheUnavailableException extends AppException {
  constructor() {
    super(
      'Cache service is temporarily unavailable. Please try again later.',
      HttpStatus.SERVICE_UNAVAILABLE,
      'CACHE_UNAVAILABLE',
    );
  }
}

// ==================== 504 Gateway Timeout Exceptions ====================

/**
 * 504 Gateway Timeout - External service timeout
 */
export class ExternalServiceTimeoutException extends AppException {
  constructor(service: string, timeoutMs?: number) {
    super(
      timeoutMs
        ? `External service '${service}' did not respond within ${timeoutMs}ms`
        : `External service '${service}' did not respond in time`,
      HttpStatus.GATEWAY_TIMEOUT,
      'EXTERNAL_SERVICE_TIMEOUT',
      { service, timeoutMs },
    );
  }
}

/**
 * 504 Gateway Timeout - Database timeout
 */
export class DatabaseTimeoutException extends AppException {
  constructor(operation?: string) {
    super(
      operation
        ? `Database operation '${operation}' timed out`
        : 'Database operation timed out',
      HttpStatus.GATEWAY_TIMEOUT,
      'DATABASE_TIMEOUT',
      { operation },
    );
  }
}

// ==================== Business Logic Exceptions ====================

/**
 * 400 Bad Request - Insufficient balance
 */
export class InsufficientBalanceException extends AppException {
  constructor(required: number, available: number, currency: string = 'USD') {
    super(
      `Insufficient balance. Required: ${currency} ${required}, Available: ${currency} ${available}`,
      HttpStatus.BAD_REQUEST,
      'INSUFFICIENT_BALANCE',
      { required, available, currency },
    );
  }
}

/**
 * 400 Bad Request - Invalid coupon
 */
export class InvalidCouponException extends AppException {
  constructor(code: string, reason?: string) {
    super(
      reason || `Coupon '${code}' is invalid or has expired`,
      HttpStatus.BAD_REQUEST,
      'INVALID_COUPON',
      { code, reason },
    );
  }
}

/**
 * 400 Bad Request - Out of stock
 */
export class OutOfStockException extends AppException {
  constructor(productId: string, productName?: string) {
    super(
      productName
        ? `${productName} is out of stock`
        : 'This product is out of stock',
      HttpStatus.BAD_REQUEST,
      'OUT_OF_STOCK',
      { productId, productName },
    );
  }
}

/**
 * 400 Bad Request - Order cannot be cancelled
 */
export class OrderNotCancellableException extends AppException {
  constructor(orderId: string, currentStatus: string) {
    super(
      `Order cannot be cancelled. Current status: ${currentStatus}`,
      HttpStatus.BAD_REQUEST,
      'ORDER_NOT_CANCELLABLE',
      { orderId, currentStatus },
    );
  }
}

/**
 * 400 Bad Request - Cart is empty
 */
export class EmptyCartException extends AppException {
  constructor() {
    super(
      'Your cart is empty. Please add items before checkout.',
      HttpStatus.BAD_REQUEST,
      'EMPTY_CART',
    );
  }
}
