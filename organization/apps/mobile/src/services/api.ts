/**
 * Mobile API Service
 *
 * This module provides a unified API client for the mobile app with:
 * - Enhanced error handling with detailed network error diagnostics
 * - Automatic retry with exponential backoff for transient failures
 * - Network connectivity detection before requests
 * - Comprehensive error categorization and user-friendly messages
 *
 * For advanced usage or custom configurations, import from './api-client'
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  enhancedApiClient,
  NetworkError,
  NetworkErrorCategory,
  NetworkErrorMessages,
  checkNetworkStatus,
} from './api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

// Legacy axios instance for backward compatibility
// Consider migrating to enhancedApiClient for better error handling
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track refresh state to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor for auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check for specific error codes that indicate the token should not be refreshed
      const errorCode = error.response?.data?.errorCode;

      // If token was blacklisted or explicitly revoked, don't attempt refresh
      if (errorCode === 'TOKEN_REVOKED' || errorCode === 'TOKEN_BLACKLISTED') {
        await clearAllAuthData();
        return Promise.reject(error);
      }

      // If this is already a refresh request, don't retry
      if (originalRequest.url?.includes('/auth/refresh')) {
        await clearAllAuthData();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');

        if (!refreshToken) {
          // No refresh token, clear auth and reject
          processQueue(new Error('No refresh token'), null);
          await clearAllAuthData();
          return Promise.reject(error);
        }

        // Attempt to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        // Store new tokens
        await SecureStore.setItemAsync('auth_token', access_token);
        if (refresh_token) {
          await SecureStore.setItemAsync('refresh_token', refresh_token);
        }

        // Calculate and store new expiry
        const tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
        await SecureStore.setItemAsync('token_expiry', tokenExpiry.toString());

        processQueue(null, access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        await clearAllAuthData();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Clear all authentication data from secure storage
 */
async function clearAllAuthData(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
  await SecureStore.deleteItemAsync('refresh_token');
  await SecureStore.deleteItemAsync('auth_user');
  await SecureStore.deleteItemAsync('token_expiry');
}

// Export enhanced API client for new code
export {
  enhancedApiClient,
  NetworkError,
  NetworkErrorCategory,
  NetworkErrorMessages,
  checkNetworkStatus,
};

/**
 * Helper to get user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.userMessage;
  }

  if (axios.isAxiosError(error)) {
    // Handle Axios errors with response
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.status === 401) {
      return NetworkErrorMessages[NetworkErrorCategory.AUTH_ERROR];
    }
    if (error.response?.status === 403) {
      return NetworkErrorMessages[NetworkErrorCategory.FORBIDDEN_ERROR];
    }
    if (error.response?.status === 404) {
      return NetworkErrorMessages[NetworkErrorCategory.NOT_FOUND_ERROR];
    }
    if (error.response?.status === 429) {
      return NetworkErrorMessages[NetworkErrorCategory.RATE_LIMITED];
    }
    if (error.response && error.response.status >= 500) {
      return NetworkErrorMessages[NetworkErrorCategory.SERVER_ERROR];
    }

    // Network errors without response
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return NetworkErrorMessages[NetworkErrorCategory.TIMEOUT];
    }
    if (error.message.toLowerCase().includes('network')) {
      return NetworkErrorMessages[NetworkErrorCategory.NO_CONNECTIVITY];
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return NetworkErrorMessages[NetworkErrorCategory.UNKNOWN];
}

/**
 * Check if error is a network connectivity issue
 */
export function isNetworkConnectivityError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return [
      NetworkErrorCategory.NO_CONNECTIVITY,
      NetworkErrorCategory.DNS_FAILURE,
      NetworkErrorCategory.CONNECTION_REFUSED,
      NetworkErrorCategory.TIMEOUT,
    ].includes(error.category);
  }

  if (axios.isAxiosError(error) && !error.response) {
    return true;
  }

  return false;
}

/**
 * Check if error should trigger a retry
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return error.isRetryable;
  }

  if (axios.isAxiosError(error)) {
    // No response means network error - usually retryable
    if (!error.response) {
      return true;
    }
    // 5xx errors and 429 are retryable
    const status = error.response.status;
    return status >= 500 || status === 429 || status === 408;
  }

  return false;
}

// API Services
export const productsApi = {
  getProducts: (params?: { category?: string; search?: string; page?: number }) =>
    api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
  getCategories: () => api.get('/categories'),
  getFeatured: () => api.get('/products/featured'),
  getDeals: () => api.get('/deals'),
};

export const cartApi = {
  getCart: () => api.get('/cart'),
  addItem: (productId: string, quantity: number, variantId?: string) =>
    api.post('/cart/items', { productId, quantity, variantId }),
  updateItem: (itemId: string, quantity: number) =>
    api.patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  applyCoupon: (code: string) => api.post('/cart/coupon', { code }),
  clearCart: () => api.delete('/cart'),
};

export const ordersApi = {
  getOrders: () => api.get('/orders'),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  createOrder: (data: any) => api.post('/orders', data),
  cancelOrder: (id: string) => api.post(`/orders/${id}/cancel`),
  trackOrder: (id: string) => api.get(`/orders/${id}/tracking`),
};

export const wishlistApi = {
  getWishlist: () => api.get('/wishlist'),
  addItem: (productId: string) => api.post('/wishlist', { productId }),
  removeItem: (productId: string) => api.delete(`/wishlist/${productId}`),
};

export const addressApi = {
  getAddresses: () => api.get('/addresses'),
  addAddress: (data: any) => api.post('/addresses', data),
  updateAddress: (id: string, data: any) => api.put(`/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/addresses/${id}`),
  setDefault: (id: string) => api.post(`/addresses/${id}/default`),
};

export const profileApi = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data: any) => api.put('/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/profile/change-password', { oldPassword, newPassword }),
};

export const aiApi = {
  getRecommendations: () => api.get('/ai/recommendations'),
  chat: (message: string, context?: any) =>
    api.post('/ai/chat', { message, context }),
  searchProducts: (query: string) =>
    api.post('/ai/search', { query }),
};

// Payment Methods API
export const paymentMethodsApi = {
  getPaymentMethods: () => api.get('/payment-methods'),
  addPaymentMethod: (data: any) => api.post('/payment-methods', data),
  deletePaymentMethod: (id: string) => api.delete(`/payment-methods/${id}`),
  setDefault: (id: string) => api.post(`/payment-methods/${id}/default`),
};

// Re-export billing service for convenience
export { billingService, paymentsApi, subscriptionsApi, iapApi, walletApi } from './billing';
