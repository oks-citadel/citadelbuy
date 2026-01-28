/**
 * Mobile Services Index
 *
 * This module exports all service-related functionality for the mobile app.
 */

// API Services
export {
  // Legacy axios-based client
  api,
  // API service endpoints
  productsApi,
  cartApi,
  ordersApi,
  wishlistApi,
  addressApi,
  profileApi,
  aiApi,
  paymentMethodsApi,
  // Enhanced API client with better error handling
  enhancedApiClient,
  // Network error types and utilities
  NetworkError,
  NetworkErrorCategory,
  NetworkErrorMessages,
  checkNetworkStatus,
  // Helper functions
  getErrorMessage,
  isNetworkConnectivityError,
  isRetryableError,
} from './api';

// Enhanced API Client (for direct import when needed)
export { EnhancedApiClient } from './api-client';

// Billing Services
export {
  billingService,
  paymentsApi,
  subscriptionsApi,
  iapApi,
  walletApi,
} from './billing';

// Other Services
export { vendorApi } from './vendor-api';
export { notificationService } from './notifications';
export { deepLinkingService } from './deep-linking';
export { deviceFingerprintService } from './device-fingerprint';
