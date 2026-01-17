/**
 * Network Error Types and Constants for Web Frontend
 * Shared error definitions for comprehensive network error handling
 */

/**
 * Categories of network errors for proper diagnosis
 */
export enum NetworkErrorCategory {
  /** No network connectivity available */
  NO_CONNECTIVITY = 'NO_CONNECTIVITY',
  /** DNS resolution failure */
  DNS_FAILURE = 'DNS_FAILURE',
  /** Connection was refused by server */
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  /** Request timed out */
  TIMEOUT = 'TIMEOUT',
  /** SSL/TLS certificate or protocol error */
  SSL_ERROR = 'SSL_ERROR',
  /** CORS policy blocked the request */
  CORS_ERROR = 'CORS_ERROR',
  /** Server returned 5xx error */
  SERVER_ERROR = 'SERVER_ERROR',
  /** Authentication failed (401) */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Access forbidden (403) */
  FORBIDDEN_ERROR = 'FORBIDDEN_ERROR',
  /** Resource not found (404) */
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  /** Rate limited (429) */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Client error (4xx excluding auth errors) */
  CLIENT_ERROR = 'CLIENT_ERROR',
  /** Request was aborted/cancelled */
  ABORTED = 'ABORTED',
  /** Unknown network error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * User-friendly error messages for each category
 */
export const NetworkErrorMessages: Record<NetworkErrorCategory, string> = {
  [NetworkErrorCategory.NO_CONNECTIVITY]:
    'No internet connection. Please check your network settings and try again.',
  [NetworkErrorCategory.DNS_FAILURE]:
    'Unable to reach the server. Please check your internet connection or try again later.',
  [NetworkErrorCategory.CONNECTION_REFUSED]:
    'Unable to connect to the server. The service may be temporarily unavailable.',
  [NetworkErrorCategory.TIMEOUT]:
    'The request took too long to complete. Please check your connection and try again.',
  [NetworkErrorCategory.SSL_ERROR]:
    'Secure connection failed. Please ensure you are on a secure network.',
  [NetworkErrorCategory.CORS_ERROR]:
    'Access denied due to security restrictions. Please contact support if this persists.',
  [NetworkErrorCategory.SERVER_ERROR]:
    'The server encountered an error. Please try again later.',
  [NetworkErrorCategory.AUTH_ERROR]:
    'Your session has expired. Please log in again.',
  [NetworkErrorCategory.FORBIDDEN_ERROR]:
    'You do not have permission to perform this action.',
  [NetworkErrorCategory.NOT_FOUND_ERROR]:
    'The requested resource was not found.',
  [NetworkErrorCategory.RATE_LIMITED]:
    'Too many requests. Please wait a moment before trying again.',
  [NetworkErrorCategory.CLIENT_ERROR]:
    'There was an issue with your request. Please try again.',
  [NetworkErrorCategory.ABORTED]:
    'The request was cancelled.',
  [NetworkErrorCategory.UNKNOWN]:
    'An unexpected network error occurred. Please try again.',
};

/**
 * Technical error descriptions for debugging/logging
 */
export const NetworkErrorDescriptions: Record<NetworkErrorCategory, string> = {
  [NetworkErrorCategory.NO_CONNECTIVITY]: 'Browser has no active network connection',
  [NetworkErrorCategory.DNS_FAILURE]: 'DNS lookup failed for hostname',
  [NetworkErrorCategory.CONNECTION_REFUSED]: 'TCP connection refused by server',
  [NetworkErrorCategory.TIMEOUT]: 'Request exceeded configured timeout',
  [NetworkErrorCategory.SSL_ERROR]: 'SSL/TLS handshake or certificate validation failed',
  [NetworkErrorCategory.CORS_ERROR]: 'Cross-Origin Resource Sharing policy blocked request',
  [NetworkErrorCategory.SERVER_ERROR]: 'Server returned HTTP 5xx status code',
  [NetworkErrorCategory.AUTH_ERROR]: 'Server returned HTTP 401 Unauthorized',
  [NetworkErrorCategory.FORBIDDEN_ERROR]: 'Server returned HTTP 403 Forbidden',
  [NetworkErrorCategory.NOT_FOUND_ERROR]: 'Server returned HTTP 404 Not Found',
  [NetworkErrorCategory.RATE_LIMITED]: 'Server returned HTTP 429 Too Many Requests',
  [NetworkErrorCategory.CLIENT_ERROR]: 'Server returned HTTP 4xx client error',
  [NetworkErrorCategory.ABORTED]: 'Request was aborted by client or AbortController',
  [NetworkErrorCategory.UNKNOWN]: 'Unknown or unclassified network error',
};

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds before first retry */
  initialDelayMs: number;
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Whether to add jitter to retry delays */
  useJitter: boolean;
  /** Error categories that should be retried */
  retryableCategories: NetworkErrorCategory[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  useJitter: true,
  retryableCategories: [
    NetworkErrorCategory.TIMEOUT,
    NetworkErrorCategory.SERVER_ERROR,
    NetworkErrorCategory.NO_CONNECTIVITY,
    NetworkErrorCategory.DNS_FAILURE,
    NetworkErrorCategory.CONNECTION_REFUSED,
  ],
};

/**
 * Fetch wrapper configuration
 */
export interface FetchConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Retry configuration */
  retry: RetryConfig;
  /** Whether to check connectivity before requests */
  checkConnectivity: boolean;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
  /** Credentials mode */
  credentials?: RequestCredentials;
}

/**
 * Default fetch configuration
 */
export const DEFAULT_FETCH_CONFIG: Partial<FetchConfig> = {
  timeoutMs: 30000,
  retry: DEFAULT_RETRY_CONFIG,
  checkConnectivity: true,
  credentials: 'include',
};

/**
 * Network error with additional metadata
 */
export interface NetworkErrorInfo {
  /** Error category for handling */
  category: NetworkErrorCategory;
  /** User-friendly error message */
  userMessage: string;
  /** Technical error description for logging */
  technicalMessage: string;
  /** Original error object */
  originalError: Error;
  /** HTTP status code if available */
  statusCode?: number;
  /** Request URL */
  url?: string;
  /** Request method */
  method?: string;
  /** Number of retry attempts made */
  retryAttempts?: number;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional context data */
  context?: Record<string, any>;
}

/**
 * Custom network error class
 */
export class NetworkError extends Error {
  public readonly category: NetworkErrorCategory;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly statusCode?: number;
  public readonly url?: string;
  public readonly method?: string;
  public readonly retryAttempts?: number;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly context?: Record<string, any>;
  public readonly isRetryable: boolean;

  constructor(info: NetworkErrorInfo) {
    super(info.userMessage);
    this.name = 'NetworkError';
    this.category = info.category;
    this.userMessage = info.userMessage;
    this.technicalMessage = info.technicalMessage;
    this.statusCode = info.statusCode;
    this.url = info.url;
    this.method = info.method;
    this.retryAttempts = info.retryAttempts;
    this.timestamp = info.timestamp;
    this.requestId = info.requestId;
    this.context = info.context;
    this.isRetryable = DEFAULT_RETRY_CONFIG.retryableCategories.includes(info.category);

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }

  /**
   * Convert to plain object for logging/serialization
   */
  toJSON(): NetworkErrorInfo {
    return {
      category: this.category,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      originalError: new Error(this.message),
      statusCode: this.statusCode,
      url: this.url,
      method: this.method,
      retryAttempts: this.retryAttempts,
      timestamp: this.timestamp,
      requestId: this.requestId,
      context: this.context,
    };
  }
}

/**
 * HTTP status codes that indicate transient errors (retryable)
 */
export const TRANSIENT_HTTP_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Error message patterns for detection
 */
export const ERROR_PATTERNS = {
  // Network connectivity patterns
  noConnectivity: [
    'failed to fetch',
    'network request failed',
    'network error',
    'no internet',
    'offline',
    'internet connection',
    'net::err_internet_disconnected',
    'networkerror',
  ],
  // DNS patterns
  dns: [
    'dns',
    'getaddrinfo',
    'enotfound',
    'name resolution',
    'nodename nor servname provided',
    'net::err_name_not_resolved',
  ],
  // Connection refused patterns
  connectionRefused: [
    'econnrefused',
    'connection refused',
    'net::err_connection_refused',
  ],
  // Timeout patterns
  timeout: [
    'timeout',
    'etimedout',
    'econnreset',
    'esockettimedout',
    'timed out',
    'net::err_connection_timed_out',
    'the operation was aborted',
  ],
  // SSL/TLS patterns
  ssl: [
    'ssl',
    'tls',
    'certificate',
    'cert',
    'unable to get local issuer',
    'self signed',
    'net::err_cert',
    'net::err_ssl',
  ],
  // CORS patterns
  cors: [
    'cors',
    'cross-origin',
    'access-control-allow-origin',
    'preflight',
    'blocked by cors policy',
    'has been blocked by cors',
    'no \'access-control-allow-origin\'',
  ],
  // Abort patterns
  aborted: [
    'aborted',
    'abort',
    'cancelled',
    'canceled',
    'user aborted',
    'the operation was aborted',
  ],
};

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return error.isRetryable;
  }
  return false;
}
