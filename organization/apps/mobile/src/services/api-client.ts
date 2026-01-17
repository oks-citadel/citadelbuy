/**
 * Enhanced API Client for React Native Mobile App
 *
 * Features:
 * - Network connectivity detection before requests
 * - Configurable request timeout
 * - Automatic retry with exponential backoff
 * - Comprehensive error categorization and messages
 * - Detailed logging for debugging
 * - Request/response interceptors
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import {
  NetworkError,
  NetworkErrorCategory,
  NetworkErrorMessages,
  NetworkErrorDescriptions,
  RetryConfig,
  ApiClientConfig,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_API_CONFIG,
  TRANSIENT_HTTP_STATUS_CODES,
  ERROR_PATTERNS,
} from '../types/network-errors';
import { errorReporting, addBreadcrumb } from '../lib/error-reporting';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Extended request config with retry metadata
 */
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _requestId?: string;
  _startTime?: number;
  _skipConnectivityCheck?: boolean;
}

/**
 * Logger interface for API client
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
    if (__DEV__) console.debug(`[APIClient] ${message}`, data || '');
  },
  info: (message, data) => {
    if (__DEV__) console.info(`[APIClient] ${message}`, data || '');
  },
  warn: (message, data) => {
    console.warn(`[APIClient] ${message}`, data || '');
  },
  error: (message, data) => {
    console.error(`[APIClient] ${message}`, data || '');
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
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
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
 * Categorize an error based on its characteristics
 */
function categorizeError(error: AxiosError | Error): NetworkErrorCategory {
  const message = error.message || '';

  // Check for Axios error with response (HTTP error)
  if ('response' in error && error.response) {
    const status = error.response.status;

    if (status === 401) return NetworkErrorCategory.AUTH_ERROR;
    if (status === 403) return NetworkErrorCategory.FORBIDDEN_ERROR;
    if (status === 404) return NetworkErrorCategory.NOT_FOUND_ERROR;
    if (status === 429) return NetworkErrorCategory.RATE_LIMITED;
    if (status >= 500) return NetworkErrorCategory.SERVER_ERROR;
    if (status >= 400) return NetworkErrorCategory.CLIENT_ERROR;
  }

  // Check for timeout
  if ('code' in error && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
    return NetworkErrorCategory.TIMEOUT;
  }

  // Check error message patterns
  if (matchesErrorPatterns(message, ERROR_PATTERNS.noConnectivity)) {
    return NetworkErrorCategory.NO_CONNECTIVITY;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.dns)) {
    return NetworkErrorCategory.DNS_FAILURE;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.connectionRefused)) {
    return NetworkErrorCategory.CONNECTION_REFUSED;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.timeout)) {
    return NetworkErrorCategory.TIMEOUT;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.ssl)) {
    return NetworkErrorCategory.SSL_ERROR;
  }

  if (matchesErrorPatterns(message, ERROR_PATTERNS.aborted)) {
    return NetworkErrorCategory.ABORTED;
  }

  // Default to unknown
  return NetworkErrorCategory.UNKNOWN;
}

/**
 * Create a NetworkError from an AxiosError or Error
 */
function createNetworkError(
  error: AxiosError | Error,
  config?: ExtendedAxiosRequestConfig
): NetworkError {
  const category = categorizeError(error);
  const statusCode = 'response' in error ? error.response?.status : undefined;

  return new NetworkError({
    category,
    userMessage: NetworkErrorMessages[category],
    technicalMessage: `${NetworkErrorDescriptions[category]}: ${error.message}`,
    originalError: error,
    statusCode,
    url: config?.url || ('config' in error ? error.config?.url : undefined),
    method: config?.method?.toUpperCase() || ('config' in error ? error.config?.method?.toUpperCase() : undefined),
    retryAttempts: config?._retryCount || 0,
    timestamp: new Date(),
    requestId: config?._requestId,
    context: {
      baseURL: config?.baseURL || ('config' in error ? error.config?.baseURL : undefined),
      responseData: 'response' in error ? error.response?.data : undefined,
    },
  });
}

/**
 * Check network connectivity
 */
async function checkConnectivity(): Promise<{ isConnected: boolean; connectionType: string | null }> {
  try {
    const state: NetInfoState = await NetInfo.fetch();
    return {
      isConnected: state.isConnected === true && state.isInternetReachable !== false,
      connectionType: state.type,
    };
  } catch (error) {
    // If we can't check, assume connected and let the request proceed
    defaultLogger.warn('Failed to check network connectivity', error);
    return { isConnected: true, connectionType: null };
  }
}

/**
 * Enhanced API Client class
 */
class EnhancedApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private logger: Logger;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(config?: Partial<ApiClientConfig>, logger?: Logger) {
    this.config = {
      baseUrl: config?.baseUrl || API_URL,
      timeoutMs: config?.timeoutMs || DEFAULT_API_CONFIG.timeoutMs!,
      retry: { ...DEFAULT_RETRY_CONFIG, ...config?.retry },
      checkConnectivity: config?.checkConnectivity ?? DEFAULT_API_CONFIG.checkConnectivity!,
      headers: config?.headers,
    };
    this.logger = logger || defaultLogger;

    this.client = this.createClient();
    this.setupInterceptors();
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
        const extendedConfig = config as ExtendedAxiosRequestConfig;

        // Add request metadata
        extendedConfig._requestId = generateRequestId();
        extendedConfig._startTime = Date.now();
        extendedConfig._retryCount = extendedConfig._retryCount || 0;

        // Check connectivity if enabled and not skipped
        if (this.config.checkConnectivity && !extendedConfig._skipConnectivityCheck) {
          const { isConnected, connectionType } = await checkConnectivity();

          if (!isConnected) {
            this.logger.warn('No network connectivity detected', { connectionType });
            throw createNetworkError(
              new Error('No internet connection'),
              extendedConfig
            );
          }
        }

        // Add auth token
        try {
          const token = await SecureStore.getItemAsync('auth_token');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          this.logger.warn('Failed to get auth token', error);
        }

        // Add request ID header for tracing
        if (config.headers) {
          config.headers['X-Request-ID'] = extendedConfig._requestId;
        }

        this.logger.debug(`Request [${extendedConfig._requestId}]`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });

        // Add breadcrumb for debugging
        addBreadcrumb('api-request', `${config.method?.toUpperCase()} ${config.url}`, 'info', {
          requestId: extendedConfig._requestId,
          retryCount: extendedConfig._retryCount,
        });

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as ExtendedAxiosRequestConfig;
        const duration = config._startTime ? Date.now() - config._startTime : 0;

        this.logger.debug(`Response [${config._requestId}]`, {
          status: response.status,
          duration: `${duration}ms`,
          url: config.url,
        });

        addBreadcrumb('api-response', `${response.status} ${config.url}`, 'info', {
          requestId: config._requestId,
          duration,
          status: response.status,
        });

        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as ExtendedAxiosRequestConfig | undefined;
        const networkError = createNetworkError(error, config);

        // Log the error
        this.logger.error(`Request failed [${config?._requestId}]`, {
          category: networkError.category,
          statusCode: networkError.statusCode,
          message: networkError.technicalMessage,
          url: config?.url,
          retryAttempts: config?._retryCount,
        });

        // Handle 401 - Token refresh
        if (networkError.category === NetworkErrorCategory.AUTH_ERROR && config) {
          return this.handleAuthError(error, config);
        }

        // Handle retry for transient errors
        if (config && this.shouldRetry(networkError, config)) {
          return this.retryRequest(config);
        }

        // Report error to monitoring
        errorReporting.handleApiError(
          networkError,
          config?.url || 'unknown',
          config?.method?.toUpperCase() || 'UNKNOWN',
          {
            category: networkError.category,
            statusCode: networkError.statusCode,
            retryAttempts: networkError.retryAttempts,
          }
        );

        return Promise.reject(networkError);
      }
    );
  }

  private async handleAuthError(
    error: AxiosError,
    config: ExtendedAxiosRequestConfig
  ): Promise<AxiosResponse> {
    // If already a retry after refresh, don't retry again
    if (config._retryCount && config._retryCount > 0) {
      await this.clearAuth();
      return Promise.reject(createNetworkError(error, config));
    }

    if (this.isRefreshing) {
      // Queue this request while refresh is in progress
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          config._retryCount = (config._retryCount || 0) + 1;
          return this.client(config);
        })
        .catch((err) => Promise.reject(err));
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');

      if (!refreshToken) {
        this.processQueue(new Error('No refresh token'), null);
        await this.clearAuth();
        return Promise.reject(createNetworkError(error, config));
      }

      // Attempt to refresh token
      const response = await axios.post(`${this.config.baseUrl}/auth/refresh`, {
        refreshToken,
      });

      const { access_token, refresh_token } = response.data;

      await SecureStore.setItemAsync('auth_token', access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }

      this.processQueue(null, access_token);

      // Retry original request
      if (config.headers) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
      config._retryCount = (config._retryCount || 0) + 1;
      return this.client(config);
    } catch (refreshError) {
      this.processQueue(refreshError as Error, null);
      await this.clearAuth();
      return Promise.reject(createNetworkError(error, config));
    } finally {
      this.isRefreshing = false;
    }
  }

  private processQueue(error: Error | null, token: string | null = null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private async clearAuth(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('auth_user');
    } catch (error) {
      this.logger.warn('Failed to clear auth tokens', error);
    }
  }

  private shouldRetry(error: NetworkError, config: ExtendedAxiosRequestConfig): boolean {
    const retryCount = config._retryCount || 0;

    // Don't retry if max retries reached
    if (retryCount >= this.config.retry.maxRetries) {
      this.logger.debug('Max retries reached', { retryCount });
      return false;
    }

    // Check if error category is retryable
    if (!this.config.retry.retryableCategories.includes(error.category)) {
      this.logger.debug('Error category not retryable', { category: error.category });
      return false;
    }

    // Check if HTTP status is transient
    if (error.statusCode && !TRANSIENT_HTTP_STATUS_CODES.includes(error.statusCode)) {
      // 5xx errors are always retryable
      if (error.statusCode < 500) {
        this.logger.debug('HTTP status not retryable', { statusCode: error.statusCode });
        return false;
      }
    }

    return true;
  }

  private async retryRequest(config: ExtendedAxiosRequestConfig): Promise<AxiosResponse> {
    const retryCount = (config._retryCount || 0) + 1;
    const delay = calculateBackoffDelay(retryCount - 1, this.config.retry);

    this.logger.info(`Retrying request [${config._requestId}]`, {
      attempt: retryCount,
      maxRetries: this.config.retry.maxRetries,
      delay: `${delay}ms`,
      url: config.url,
    });

    addBreadcrumb('api-retry', `Retry ${retryCount}/${this.config.retry.maxRetries} ${config.url}`, 'warning', {
      requestId: config._requestId,
      delay,
    });

    // Wait before retrying
    await sleep(delay);

    // Update retry count and retry
    config._retryCount = retryCount;
    config._startTime = Date.now();

    return this.client(config);
  }

  /**
   * Get the underlying axios instance for direct access
   */
  getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      retry: {
        ...this.config.retry,
        ...config.retry,
      },
    };

    // Update timeout on client
    if (config.timeoutMs) {
      this.client.defaults.timeout = config.timeoutMs;
    }

    // Update base URL on client
    if (config.baseUrl) {
      this.client.defaults.baseURL = config.baseUrl;
    }
  }

  /**
   * Check current network status
   */
  async checkNetworkStatus(): Promise<{
    isConnected: boolean;
    connectionType: string | null;
  }> {
    return checkConnectivity();
  }

  // HTTP method shortcuts
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }
}

// Export singleton instance
export const enhancedApiClient = new EnhancedApiClient();

// Export class for custom instances
export { EnhancedApiClient };

// Export helper to check network status
export const checkNetworkStatus = () => enhancedApiClient.checkNetworkStatus();

// Re-export network error types
export {
  NetworkError,
  NetworkErrorCategory,
  NetworkErrorMessages,
  NetworkErrorDescriptions,
} from '../types/network-errors';
