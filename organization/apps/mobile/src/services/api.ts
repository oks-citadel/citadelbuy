import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear auth
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
    }
    return Promise.reject(error);
  }
);

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
