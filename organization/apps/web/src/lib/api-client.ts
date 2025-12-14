/**
 * API Client - Handles all HTTP communication with the backend
 * Implements authentication, error handling, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const API_TIMEOUT = 30000;

// Token storage keys
const ACCESS_TOKEN_KEY = 'broxiva_access_token';
const REFRESH_TOKEN_KEY = 'broxiva_refresh_token';

// Types
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Token management
export const tokenManager = {
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

  isAuthenticated: (): boolean => {
    return !!tokenManager.getAccessToken();
  },
};

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Request interceptor - Add auth token and CSRF token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add auth token
      const token = tokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token for state-changing requests
      if (typeof window !== 'undefined' && config.headers) {
        const method = config.method?.toUpperCase();
        if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          // Get CSRF token from cookie
          const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf-token='))
            ?.split('=')[1];
          if (csrfToken) {
            config.headers['x-csrf-token'] = csrfToken;
          }
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - Handle errors with token refresh on 401
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

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        const refreshToken = tokenManager.getRefreshToken();

        // If no refresh token or this is the refresh endpoint itself, clear tokens and reject
        if (!refreshToken || originalRequest.url?.includes('/auth/refresh')) {
          tokenManager.clearTokens();
          const errorMessage = error.response?.data?.message || 'Session expired. Please login again.';
          return Promise.reject(new Error(errorMessage));
        }

        if (isRefreshing) {
          // Queue request while refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return client(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh the token
          const response = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          tokenManager.setTokens(access_token, refresh_token);

          processQueue(null, access_token);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          tokenManager.clearTokens();
          return Promise.reject(new Error('Session expired. Please login again.'));
        } finally {
          isRefreshing = false;
        }
      }

      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      return Promise.reject(new Error(errorMessage));
    }
  );

  return client;
};

export const apiClient = createApiClient();

// ============================================
// API Endpoints
// ============================================

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post<{ user: any; access_token: string; refresh_token?: string }>('/auth/login', {
      email,
      password,
    });
    tokenManager.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  },

  register: async (data: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post<{ user: any; access_token: string; refresh_token?: string }>('/auth/register', data);
    tokenManager.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      tokenManager.clearTokens();
    }
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get<any>('/users/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<{ name: string; email: string; phone: string; avatar: string }>) => {
    const response = await apiClient.patch<any>('/users/profile', data);
    return response.data;
  },

  socialLogin: async (provider: 'google' | 'facebook' | 'apple', token: string) => {
    const response = await apiClient.post<{ user: any; access_token: string; refresh_token?: string }>(`/auth/${provider}`, {
      token,
    });
    tokenManager.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  },
};

// Products API
export const productsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const response = await apiClient.get<{ products: any[]; total: number; page: number; limit: number }>(
      '/products',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<any>(`/products/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string) => {
    const response = await apiClient.get<any>(`/products/slug/${slug}`);
    return response.data;
  },

  search: async (query: string, options?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<{ products: any[]; total: number }>('/products/search', {
      params: { q: query, ...options },
    });
    return response.data;
  },

  getRecommendations: async (productId: string, limit?: number) => {
    const response = await apiClient.get<any[]>(`/products/${productId}/recommendations`, {
      params: { limit },
    });
    return response.data;
  },

  getReviews: async (productId: string, params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<{ reviews: any[]; total: number }>(
      `/products/${productId}/reviews`,
      { params }
    );
    return response.data;
  },

  addReview: async (productId: string, data: { rating: number; title?: string; content: string }) => {
    const response = await apiClient.post<any>(`/products/${productId}/reviews`, data);
    return response.data;
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (params?: {
    level?: number;
    parentId?: string;
    includeChildren?: boolean;
    includeProducts?: boolean;
    status?: string;
    featured?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    search?: string;
  }) => {
    const response = await apiClient.get<{
      categories: any[];
      total: number;
      page: number;
      limit: number;
    }>('/categories', { params });
    return response.data;
  },

  getTree: async (params?: {
    maxDepth?: number;
    includeProducts?: boolean;
    status?: string;
  }) => {
    const response = await apiClient.get<any[]>('/categories/tree', { params });
    return response.data;
  },

  getFeatured: async (limit?: number) => {
    const response = await apiClient.get<any[]>('/categories/featured', {
      params: { limit },
    });
    return response.data;
  },

  getTrending: async (params?: { period?: 'day' | 'week' | 'month'; limit?: number }) => {
    const response = await apiClient.get<any[]>('/categories/trending', { params });
    return response.data;
  },

  search: async (query: string, params?: { fuzzy?: boolean; limit?: number }) => {
    const response = await apiClient.get<any[]>('/categories/search', {
      params: { query, ...params },
    });
    return response.data;
  },

  getTopLevel: async () => {
    const response = await apiClient.get<any[]>('/categories/top-level');
    return response.data;
  },

  getById: async (id: string, options?: {
    includeBreadcrumb?: boolean;
    includeChildren?: boolean;
    includeSiblings?: boolean;
    includeFilters?: boolean;
  }) => {
    const response = await apiClient.get<any>(`/categories/${id}`, { params: options });
    return response.data;
  },

  getBySlug: async (slug: string, options?: {
    includeBreadcrumb?: boolean;
    includeChildren?: boolean;
  }) => {
    const response = await apiClient.get<any>(`/categories/slug/${slug}`, { params: options });
    return response.data;
  },

  getProducts: async (id: string, params?: {
    page?: number;
    limit?: number;
    sort?: string;
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
  }) => {
    const response = await apiClient.get<{
      products: any[];
      total: number;
      filters: any;
    }>(`/categories/${id}/products`, { params });
    return response.data;
  },

  getFilters: async (id: string) => {
    const response = await apiClient.get<any[]>(`/categories/${id}/filters`);
    return response.data;
  },

  getBreadcrumb: async (id: string) => {
    const response = await apiClient.get<any[]>(`/categories/${id}/breadcrumb`);
    return response.data;
  },

  trackView: async (id: string, data?: { sessionId?: string }) => {
    await apiClient.post(`/categories/${id}/view`, data);
  },
};

// Cart API
export const cartApi = {
  get: async () => {
    const response = await apiClient.get<any>('/cart');
    return response.data;
  },

  addItem: async (data: { productId: string; quantity: number; variantId?: string }) => {
    const response = await apiClient.post<any>('/cart/items', data);
    return response.data;
  },

  updateItem: async (itemId: string, quantity: number) => {
    const response = await apiClient.patch<any>(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  removeItem: async (itemId: string) => {
    const response = await apiClient.delete<any>(`/cart/items/${itemId}`);
    return response.data;
  },

  clear: async () => {
    const response = await apiClient.delete<any>('/cart');
    return response.data;
  },

  applyCoupon: async (code: string) => {
    const response = await apiClient.post<any>('/cart/coupon', { code });
    return response.data;
  },

  removeCoupon: async () => {
    const response = await apiClient.delete<any>('/cart/coupon');
    return response.data;
  },

  saveForLater: async (itemId: string) => {
    const response = await apiClient.post<any>(`/cart/items/${itemId}/save-for-later`);
    return response.data;
  },

  moveToCart: async (itemId: string) => {
    const response = await apiClient.post<any>(`/cart/saved/${itemId}/move-to-cart`);
    return response.data;
  },
};

// Orders API
export const ordersApi = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get<{ orders: any[]; total: number }>('/orders', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<any>(`/orders/${id}`);
    return response.data;
  },

  create: async (data: {
    shippingAddressId: string;
    billingAddressId?: string;
    paymentMethodId: string;
    shippingMethod: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<any>('/orders', data);
    return response.data;
  },

  cancel: async (id: string, reason?: string) => {
    const response = await apiClient.post<any>(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  track: async (id: string) => {
    const response = await apiClient.get<any>(`/orders/${id}/tracking`);
    return response.data;
  },
};

// Checkout API
export const checkoutApi = {
  createSession: async (data: {
    items: Array<{ productId: string; quantity: number; variantId?: string }>;
    shippingAddress: any;
    billingAddress?: any;
    shippingMethod: string;
  }) => {
    const response = await apiClient.post<{ sessionId: string; clientSecret: string }>(
      '/checkout/session',
      data
    );
    return response.data;
  },

  processPayment: async (sessionId: string, paymentDetails: any) => {
    const response = await apiClient.post<{ orderId: string; status: string; redirectUrl?: string }>(
      `/checkout/session/${sessionId}/pay`,
      paymentDetails
    );
    return response.data;
  },

  getShippingRates: async (address: any) => {
    const response = await apiClient.post<any[]>('/checkout/shipping-rates', { address });
    return response.data;
  },

  validateCoupon: async (code: string, cartTotal: number) => {
    const response = await apiClient.post<{ valid: boolean; discount: number; message?: string }>(
      '/checkout/validate-coupon',
      { code, cartTotal }
    );
    return response.data;
  },
};

// User Addresses API
export const addressesApi = {
  getAll: async () => {
    const response = await apiClient.get<any[]>('/users/addresses');
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<any>('/users/addresses', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch<any>(`/users/addresses/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/users/addresses/${id}`);
    return response.data;
  },

  setDefault: async (id: string) => {
    const response = await apiClient.post<any>(`/users/addresses/${id}/default`);
    return response.data;
  },
};

// Wishlist API
export const wishlistApi = {
  get: async () => {
    const response = await apiClient.get<any[]>('/wishlist');
    return response.data;
  },

  add: async (productId: string) => {
    const response = await apiClient.post<any>('/wishlist', { productId });
    return response.data;
  },

  remove: async (productId: string) => {
    const response = await apiClient.delete(`/wishlist/${productId}`);
    return response.data;
  },

  moveToCart: async (productId: string) => {
    const response = await apiClient.post<any>(`/wishlist/${productId}/move-to-cart`);
    return response.data;
  },
};

// AI Services API
export const aiApi = {
  getRecommendations: async (type: 'personalized' | 'similar' | 'trending', params?: any) => {
    const response = await apiClient.get<any[]>(`/ai/recommendations/${type}`, { params });
    return response.data;
  },

  visualSearch: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post<{ products: any[]; confidence: number }>(
      '/ai/visual-search',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  smartSearch: async (query: string) => {
    const response = await apiClient.post<{
      products: any[];
      suggestions: string[];
      correctedQuery?: string;
    }>('/ai/smart-search', { query });
    return response.data;
  },

  chatbot: async (message: string, conversationId?: string) => {
    const response = await apiClient.post<{
      response: string;
      conversationId: string;
      suggestions?: string[];
      products?: any[];
    }>('/ai/chatbot', { message, conversationId });
    return response.data;
  },

  virtualTryOn: async (productId: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await apiClient.post<{ resultUrl: string; confidence: number }>(
      `/ai/virtual-try-on/${productId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  fraudCheck: async (transactionData: any) => {
    const response = await apiClient.post<{
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high';
      recommendation: string;
    }>('/ai/fraud-check', transactionData);
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  trackEvent: async (event: string, data?: any) => {
    await apiClient.post('/analytics/track', { event, data, timestamp: new Date().toISOString() });
  },

  trackPageView: async (page: string, referrer?: string) => {
    await apiClient.post('/analytics/pageview', { page, referrer, timestamp: new Date().toISOString() });
  },

  trackConversion: async (orderId: string, value: number, currency: string) => {
    await apiClient.post('/analytics/conversion', { orderId, value, currency });
  },
};

// Tracking API (Guest and Authenticated)
export const trackingApi = {
  trackGuestOrder: async (orderNumber: string, email: string) => {
    const response = await apiClient.post<any>('/tracking/guest', { orderNumber, email });
    return response.data;
  },
  trackByOrderNumber: async (orderNumber: string) => {
    const response = await apiClient.get<any>(`/tracking/order/${orderNumber}`);
    return response.data;
  },
  trackByTrackingNumber: async (trackingNumber: string) => {
    const response = await apiClient.get<any>(`/tracking/tracking-number/${trackingNumber}`);
    return response.data;
  },
  getShipmentTracking: async (trackingNumber: string) => {
    const response = await apiClient.get<any>(`/tracking/shipment/${trackingNumber}`);
    return response.data;
  },
};
// Health Check
export const healthApi = {
  check: async () => {
    const response = await apiClient.get<{
      status: string;
      database: string;
      redis: string;
      timestamp: string;
    }>('/health');
    return response.data;
  },
};

export default apiClient;
