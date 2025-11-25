/**
 * API Client - Handles all HTTP communication with the backend
 * Implements authentication, error handling, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const API_TIMEOUT = 30000;

// Token storage keys
const ACCESS_TOKEN_KEY = 'citadelbuy_access_token';
const REFRESH_TOKEN_KEY = 'citadelbuy_refresh_token';

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

  // Request interceptor - Add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - Handle errors and token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 - Attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = tokenManager.getRefreshToken();
          if (refreshToken) {
            const response = await axios.post<TokenResponse>(
              `${API_BASE_URL}/auth/refresh`,
              { refresh_token: refreshToken }
            );

            const { access_token, refresh_token } = response.data;
            tokenManager.setTokens(access_token, refresh_token);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }

            return client(originalRequest);
          }
        } catch (refreshError) {
          tokenManager.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
      }

      // Format error message
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
    const response = await apiClient.post<{ user: any; access_token: string }>('/auth/login', {
      email,
      password,
    });
    tokenManager.setTokens(response.data.access_token);
    return response.data;
  },

  register: async (data: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post<{ user: any; access_token: string }>('/auth/register', data);
    tokenManager.setTokens(response.data.access_token);
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
    const response = await apiClient.get<any>('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<{ name: string; email: string; phone: string; avatar: string }>) => {
    const response = await apiClient.patch<any>('/auth/profile', data);
    return response.data;
  },

  socialLogin: async (provider: 'google' | 'facebook' | 'apple', token: string) => {
    const response = await apiClient.post<{ user: any; access_token: string }>(`/auth/${provider}`, {
      token,
    });
    tokenManager.setTokens(response.data.access_token);
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
  getAll: async () => {
    const response = await apiClient.get<any[]>('/categories');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<any>(`/categories/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string) => {
    const response = await apiClient.get<any>(`/categories/slug/${slug}`);
    return response.data;
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
    const response = await apiClient.post<{ orderId: string; status: string }>(
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
