/**
 * Enhanced Fetch Client for Web Frontend
 *
 * Features:
 * - AbortController for request timeouts
 * - Network connectivity detection using navigator.onLine
 * - CORS error detection
 * - Automatic retry with exponential backoff
 * - Comprehensive error categorization and messages
 * - Detailed logging for debugging
 * - Request/response interceptors
 * - Token refresh on 401 errors
 */

import {
  NetworkError,
  NetworkErrorCategory,
  NetworkErrorMessages,
  NetworkErrorDescriptions,
  RetryConfig,
  FetchConfig,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_FETCH_CONFIG,
  TRANSIENT_HTTP_STATUS_CODES,
  ERROR_PATTERNS,
} from '../types/network-errors';
import { errorReporting, addBreadcrumb } from './error-reporting';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'broxiva_access_token';
const REFRESH_TOKEN_KEY = 'broxiva_refresh_token';

/**
 * Request metadata for tracking
 */
interface RequestMetadata {
  requestId: string;
  startTime: number;
  retryCount: number;
  url: string;
  method: string;
}

/**
 * Extended request options
 */
interface ExtendedRequestInit extends RequestInit {
  /** Skip connectivity check for this request */
  skipConnectivityCheck?: boolean;
  /** Custom timeout for this request (ms) */
  timeout?: number;
  /** Skip retry for this request */
  skipRetry?: boolean;
  /** Number of retries already attempted */
  _retryCount?: number;
  /** Request ID for tracking */
  _requestId?: string;
  /** Request start time */
  _startTime?: number;
}

/**
 * Logger interface
 */
interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

/**
 * Default logger implementation
 */
const defaultLogger: Logger = {
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[FetchClient] ${message}`, data || '');
    }
  },
  info: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[FetchClient] ${message}`, data || '');
    }
  },
  warn: (message, data) => {
    console.warn(`[FetchClient] ${message}`, data || '');
  },
  error: (message, data) => {
    console.error(`[FetchClient] ${message}`, data || '');
  },
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate delay for exponential backoff with optional jitter
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  if (config.useJitter) {
    // Add random jitter between 0-25% of the delay
    const jitter = cappedDelay * Math.random() * 0.25;
    return Math.floor(cappedDelay + jitter);
  }

  return Math.floor(cappedDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error message matches any patterns in a category
 */
function matchesErrorPatterns(message: string, patterns: string[]): boolean {
  const lowerMessage = message.toLowerCase();
  return patterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()));
}

/**
 * Check if response indicates a CORS error
 * Note: Browsers obscure CORS errors for security, so detection is limited
 */
function isCorsError(error: Error, response?: Response): boolean {
  const message = error.message.toLowerCase();

  // Check error message patterns
  if (matchesErrorPatterns(message, ERROR_PATTERNS.cors)) {
    return true;
  }

  // In browsers, CORS errors often result in opaque responses or TypeErrors
  // with "Failed to fetch" message when the request was cross-origin
  if (
    error.name === 'TypeError' &&
    message.includes('failed to fetch') &&
    typeof window !== 'undefined'
  ) {
    // Check if there was any indication of CORS in console (can't programmatically access)
    // This is a heuristic - if we got "Failed to fetch" and we're offline, it's not CORS
    if (navigator.onLine) {
      // Could be CORS, but could also be server unreachable
      // Return false here and let other detection handle it
      return false;
    }
  }

  return false;
}

/**
 * Categorize an error based on its characteristics
 */
function categorizeError(
  error: Error,
  response?: Response,
  isAbort?: boolean
): NetworkErrorCategory {
  const message = error.message || '';

  // Check for abort
  if (isAbort || error.name === 'AbortError') {
    // Check if it was a timeout abort vs user abort
    if (message.includes('timeout') || message.includes('timed out')) {
      return NetworkErrorCategory.TIMEOUT;
    }
    return NetworkErrorCategory.ABORTED;
  }

  // Check HTTP response status
  if (response) {
    const status = response.status;

    if (status === 401) return NetworkErrorCategory.AUTH_ERROR;
    if (status === 403) return NetworkErrorCategory.FORBIDDEN_ERROR;
    if (status === 404) return NetworkErrorCategory.NOT_FOUND_ERROR;
    if (status === 429) return NetworkErrorCategory.RATE_LIMITED;
    if (status >= 500) return NetworkErrorCategory.SERVER_ERROR;
    if (status >= 400) return NetworkErrorCategory.CLIENT_ERROR;
  }

  // Check for CORS error
  if (isCorsError(error, response)) {
    return NetworkErrorCategory.CORS_ERROR;
  }

  // Check error message patterns
  if (matchesErrorPatterns(message, ERROR_PATTERNS.timeout)) {
    return NetworkErrorCategory.TIMEOUT;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.noConnectivity)) {
    return NetworkErrorCategory.NO_CONNECTIVITY;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.dns)) {
    return NetworkErrorCategory.DNS_FAILURE;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.connectionRefused)) {
    return NetworkErrorCategory.CONNECTION_REFUSED;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.ssl)) {
    return NetworkErrorCategory.SSL_ERROR;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.aborted)) {
    return NetworkErrorCategory.ABORTED;
  }

  // Check browser online status for "Failed to fetch" errors
  if (
    typeof navigator !== 'undefined' &&
    !navigator.onLine &&
    message.toLowerCase().includes('failed to fetch')
  ) {
    return NetworkErrorCategory.NO_CONNECTIVITY;
  }

  // Default to unknown
  return NetworkErrorCategory.UNKNOWN;
}

/**
 * Create a NetworkError from fetch error/response
 */
function createNetworkError(
  error: Error,
  response?: Response,
  metadata?: Partial<RequestMetadata>,
  isAbort?: boolean,
  responseData?: any
): NetworkError {
  const category = categorizeError(error, response, isAbort);

  return new NetworkError({
    category,
    userMessage: NetworkErrorMessages[category],
    technicalMessage: `${NetworkErrorDescriptions[category]}: ${error.message}`,
    originalError: error,
    statusCode: response?.status,
    url: metadata?.url,
    method: metadata?.method,
    retryAttempts: metadata?.retryCount || 0,
    timestamp: new Date(),
    requestId: metadata?.requestId,
    context: {
      responseData,
      responseStatus: response?.status,
      responseStatusText: response?.statusText,
    },
  });
}

/**
 * Token management for web
 */
const tokenManager = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken?: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/**
 * Enhanced Fetch Client class
 */
class EnhancedFetchClient {
  private config: FetchConfig;
  private logger: Logger;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config?: Partial<FetchConfig>, logger?: Logger) {
    this.config = {
      baseUrl: config?.baseUrl || API_BASE_URL,
      timeoutMs: config?.timeoutMs || DEFAULT_FETCH_CONFIG.timeoutMs!,
      retry: { ...DEFAULT_RETRY_CONFIG, ...config?.retry },
      checkConnectivity: config?.checkConnectivity ?? DEFAULT_FETCH_CONFIG.checkConnectivity!,
      credentials: config?.credentials || DEFAULT_FETCH_CONFIG.credentials,
      headers: config?.headers,
    };
    this.logger = logger || defaultLogger;
  }

  /**
   * Check network connectivity using browser APIs
   */
  private checkConnectivity(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    // If we can't check, assume connected
    return true;
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Build headers for request
   */
  private buildHeaders(customHeaders?: HeadersInit): Headers {
    const headers = new Headers();

    // Default headers
    headers.set('Content-Type', 'application/json');

    // Config headers
    if (this.config.headers) {
      Object.entries(this.config.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // Custom headers
    if (customHeaders) {
      const headerEntries = customHeaders instanceof Headers
        ? Array.from(customHeaders.entries())
        : Object.entries(customHeaders);

      headerEntries.forEach(([key, value]) => {
        headers.set(key, value as string);
      });
    }

    // Auth token
    const token = tokenManager.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // CSRF token from cookie
    if (typeof document !== 'undefined') {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      if (csrfToken) {
        headers.set('x-csrf-token', csrfToken);
      }
    }

    return headers;
  }

  /**
   * Create AbortController with timeout
   */
  private createTimeoutController(timeoutMs: number): {
    controller: AbortController;
    timeoutId: ReturnType<typeof setTimeout>;
  } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    return { controller, timeoutId };
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(
    error: NetworkError,
    retryCount: number,
    skipRetry?: boolean
  ): boolean {
    if (skipRetry) {
      return false;
    }

    if (retryCount >= this.config.retry.maxRetries) {
      this.logger.debug('Max retries reached', { retryCount });
      return false;
    }

    if (!this.config.retry.retryableCategories.includes(error.category)) {
      this.logger.debug('Error category not retryable', { category: error.category });
      return false;
    }

    if (error.statusCode && !TRANSIENT_HTTP_STATUS_CODES.includes(error.statusCode)) {
      if (error.statusCode < 500) {
        this.logger.debug('HTTP status not retryable', { statusCode: error.statusCode });
        return false;
      }
    }

    return true;
  }

  /**
   * Handle token refresh on 401
   */
  private async handleTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      // Wait for ongoing refresh
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = tokenManager.getRefreshToken();

        if (!refreshToken) {
          tokenManager.clearTokens();
          return null;
        }

        const response = await fetch(`${this.config.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          credentials: this.config.credentials,
        });

        if (!response.ok) {
          tokenManager.clearTokens();
          return null;
        }

        const data = await response.json();
        tokenManager.setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      } catch (error) {
        this.logger.error('Token refresh failed', error);
        tokenManager.clearTokens();
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Execute fetch request with error handling
   */
  async request<T = any>(
    url: string,
    options: ExtendedRequestInit = {}
  ): Promise<{ data: T; response: Response }> {
    const fullUrl = this.buildUrl(url);
    const requestId = options._requestId || generateRequestId();
    const startTime = options._startTime || Date.now();
    const retryCount = options._retryCount || 0;
    const timeout = options.timeout || this.config.timeoutMs;
    const method = (options.method || 'GET').toUpperCase();

    const metadata: RequestMetadata = {
      requestId,
      startTime,
      retryCount,
      url: fullUrl,
      method,
    };

    // Check connectivity
    if (this.config.checkConnectivity && !options.skipConnectivityCheck) {
      if (!this.checkConnectivity()) {
        const error = createNetworkError(
          new Error('No internet connection'),
          undefined,
          metadata
        );
        this.logger.warn('No network connectivity detected');
        throw error;
      }
    }

    // Build headers
    const headers = this.buildHeaders(options.headers);
    headers.set('X-Request-ID', requestId);

    // Create timeout controller
    const { controller, timeoutId } = this.createTimeoutController(timeout);

    // Combine with user-provided signal
    const combinedSignal = options.signal
      ? this.combineAbortSignals(controller.signal, options.signal)
      : controller.signal;

    this.logger.debug(`Request [${requestId}]`, {
      method,
      url: fullUrl,
      retryCount,
    });

    addBreadcrumb('fetch-request', `${method} ${url}`, 'info', {
      requestId,
      retryCount,
    });

    let response: Response | undefined;
    let responseData: any;

    try {
      response = await fetch(fullUrl, {
        ...options,
        method,
        headers,
        credentials: this.config.credentials,
        signal: combinedSignal,
      });

      // Clear timeout on successful response
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      this.logger.debug(`Response [${requestId}]`, {
        status: response.status,
        duration: `${duration}ms`,
        url: fullUrl,
      });

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Check for HTTP errors
      if (!response.ok) {
        const error = createNetworkError(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          response,
          metadata,
          false,
          responseData
        );

        // Handle 401 with token refresh
        if (error.category === NetworkErrorCategory.AUTH_ERROR && retryCount === 0) {
          const newToken = await this.handleTokenRefresh();

          if (newToken) {
            this.logger.info('Token refreshed, retrying request');
            return this.request<T>(url, {
              ...options,
              _retryCount: retryCount + 1,
              _requestId: requestId,
              _startTime: startTime,
            });
          }
        }

        // Check if should retry
        if (this.shouldRetry(error, retryCount, options.skipRetry)) {
          const delay = calculateBackoffDelay(retryCount, this.config.retry);

          this.logger.info(`Retrying request [${requestId}]`, {
            attempt: retryCount + 1,
            maxRetries: this.config.retry.maxRetries,
            delay: `${delay}ms`,
          });

          addBreadcrumb(
            'fetch-retry',
            `Retry ${retryCount + 1}/${this.config.retry.maxRetries} ${url}`,
            'warning',
            { requestId, delay }
          );

          await sleep(delay);

          return this.request<T>(url, {
            ...options,
            _retryCount: retryCount + 1,
            _requestId: requestId,
            _startTime: Date.now(),
          });
        }

        // Report error and throw
        errorReporting.handleApiError(error, url, method, {
          category: error.category,
          statusCode: error.statusCode,
          retryAttempts: error.retryAttempts,
        });

        throw error;
      }

      addBreadcrumb('fetch-response', `${response.status} ${url}`, 'info', {
        requestId,
        duration: Date.now() - startTime,
        status: response.status,
      });

      return { data: responseData as T, response };
    } catch (error: any) {
      clearTimeout(timeoutId);

      // If already a NetworkError, rethrow
      if (error instanceof NetworkError) {
        throw error;
      }

      // Create NetworkError from fetch error
      const isAbort = error.name === 'AbortError';
      const networkError = createNetworkError(
        error,
        response,
        metadata,
        isAbort,
        responseData
      );

      // Check if should retry (for network errors, not HTTP errors)
      if (!isAbort && this.shouldRetry(networkError, retryCount, options.skipRetry)) {
        const delay = calculateBackoffDelay(retryCount, this.config.retry);

        this.logger.info(`Retrying request [${requestId}]`, {
          attempt: retryCount + 1,
          maxRetries: this.config.retry.maxRetries,
          delay: `${delay}ms`,
          error: networkError.category,
        });

        addBreadcrumb(
          'fetch-retry',
          `Retry ${retryCount + 1}/${this.config.retry.maxRetries} ${url}`,
          'warning',
          { requestId, delay, error: networkError.category }
        );

        await sleep(delay);

        return this.request<T>(url, {
          ...options,
          _retryCount: retryCount + 1,
          _requestId: requestId,
          _startTime: Date.now(),
        });
      }

      // Report error
      errorReporting.handleApiError(networkError, url, method, {
        category: networkError.category,
        statusCode: networkError.statusCode,
        retryAttempts: networkError.retryAttempts,
      });

      throw networkError;
    }
  }

  /**
   * Combine multiple abort signals
   */
  private combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        break;
      }

      signal.addEventListener('abort', () => {
        controller.abort(signal.reason);
      }, { once: true });
    }

    return controller.signal;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FetchConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      retry: {
        ...this.config.retry,
        ...config.retry,
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<FetchConfig> {
    return { ...this.config };
  }

  /**
   * Check if browser is online
   */
  isOnline(): boolean {
    return this.checkConnectivity();
  }

  // HTTP method shortcuts
  async get<T = any>(
    url: string,
    options?: Omit<ExtendedRequestInit, 'method' | 'body'>
  ): Promise<{ data: T; response: Response }> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T = any>(
    url: string,
    data?: any,
    options?: Omit<ExtendedRequestInit, 'method'>
  ): Promise<{ data: T; response: Response }> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(
    url: string,
    data?: any,
    options?: Omit<ExtendedRequestInit, 'method'>
  ): Promise<{ data: T; response: Response }> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(
    url: string,
    data?: any,
    options?: Omit<ExtendedRequestInit, 'method'>
  ): Promise<{ data: T; response: Response }> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(
    url: string,
    options?: Omit<ExtendedRequestInit, 'method'>
  ): Promise<{ data: T; response: Response }> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T = any>(
    url: string,
    formData: FormData,
    options?: Omit<ExtendedRequestInit, 'method' | 'body' | 'headers'>
  ): Promise<{ data: T; response: Response }> {
    const headers = new Headers();
    // Don't set Content-Type - browser will set it with boundary for multipart
    const token = tokenManager.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

// Export singleton instance
export const fetchClient = new EnhancedFetchClient();

// Export class for custom instances
export { EnhancedFetchClient };

// Export token manager
export { tokenManager };

// Export helper to check network status
export const isOnline = () => fetchClient.isOnline();

// Re-export network error types
export {
  NetworkError,
  NetworkErrorCategory,
  NetworkErrorMessages,
  NetworkErrorDescriptions,
  isNetworkError,
  isRetryableError,
} from '../types/network-errors';
