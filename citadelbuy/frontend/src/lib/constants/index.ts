/**
 * Frontend application constants
 * Centralized location for all constants used across the frontend
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
  },
  PRODUCTS: {
    LIST: '/products',
    GET: (id: string) => `/products/${id}`,
    CREATE: '/products',
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
  },
  ORDERS: {
    LIST: '/orders',
    GET: (id: string) => `/orders/${id}`,
    CREATE: '/orders',
    CANCEL: (id: string) => `/orders/${id}/cancel`,
  },
  CART: {
    GET: '/cart',
    ADD: '/cart/items',
    UPDATE: (id: string) => `/cart/items/${id}`,
    REMOVE: (id: string) => `/cart/items/${id}`,
    CLEAR: '/cart/clear',
  },
  PAYMENTS: {
    CREATE_INTENT: '/payments/create-intent',
    CONFIRM: '/payments/confirm',
  },
  ADMIN: {
    ORDERS: '/admin/orders',
    PRODUCTS: '/admin/products',
    USERS: '/admin/users',
    STATS: '/admin/stats',
  },
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  PROFILE: '/profile',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  ADMIN: {
    DASHBOARD: '/admin',
    ORDERS: '/admin/orders',
    PRODUCTS: '/admin/products',
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  CART: 'cart',
  THEME: 'theme',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  PAGE_SIZES: [10, 20, 50, 100],
} as const;

// Product
export const PRODUCT = {
  MIN_PRICE: 0,
  MAX_PRICE: 999999.99,
  DEFAULT_CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

// Order Status Display
export const ORDER_STATUS_DISPLAY = {
  [ORDER_STATUS.PENDING]: {
    label: 'Pending',
    color: 'yellow',
    icon: 'clock',
  },
  [ORDER_STATUS.PROCESSING]: {
    label: 'Processing',
    color: 'blue',
    icon: 'cog',
  },
  [ORDER_STATUS.SHIPPED]: {
    label: 'Shipped',
    color: 'purple',
    icon: 'truck',
  },
  [ORDER_STATUS.DELIVERED]: {
    label: 'Delivered',
    color: 'green',
    icon: 'check-circle',
  },
  [ORDER_STATUS.CANCELLED]: {
    label: 'Cancelled',
    color: 'red',
    icon: 'x-circle',
  },
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  VENDOR: 'VENDOR',
  CUSTOMER: 'CUSTOMER',
} as const;

// Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
} as const;

// UI
export const UI = {
  TOAST_DURATION: 3000, // milliseconds
  DEBOUNCE_DELAY: 300, // milliseconds
  THROTTLE_DELAY: 1000, // milliseconds
  ANIMATION_DURATION: 200, // milliseconds
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_WISHLIST: true,
  ENABLE_REVIEWS: true,
  ENABLE_CHAT_SUPPORT: false,
  ENABLE_PWA: false,
} as const;

// Query Keys (for React Query)
export const QUERY_KEYS = {
  AUTH: ['auth'],
  USER: ['user'],
  PROFILE: ['user', 'profile'],
  PRODUCTS: ['products'],
  PRODUCT: (id: string) => ['products', id],
  CART: ['cart'],
  ORDERS: ['orders'],
  ORDER: (id: string) => ['orders', id],
  ADMIN_ORDERS: ['admin', 'orders'],
  ADMIN_PRODUCTS: ['admin', 'products'],
  ADMIN_STATS: ['admin', 'stats'],
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  LOGOUT: 'Successfully logged out!',
  REGISTER: 'Account created successfully!',
  PROFILE_UPDATE: 'Profile updated successfully!',
  PASSWORD_RESET: 'Password reset email sent!',
  PRODUCT_ADDED: 'Product added to cart!',
  ORDER_PLACED: 'Order placed successfully!',
  ORDER_CANCELLED: 'Order cancelled successfully!',
} as const;
