import { api } from './api';
import {
  VendorProfile,
  VendorDashboardStats,
  VendorOrder,
  VendorProduct,
  VendorOrderFilter,
  VendorProductFilter,
  VendorAnalytics,
  VendorNotification,
  VendorPayoutSettings,
  VendorPayout,
  InventoryUpdate,
  BulkOrderUpdate,
} from '../types/vendor';
import { PaginatedResponse } from '../types/api';

export const vendorApi = {
  // Vendor Profile
  getProfile: () => api.get<VendorProfile>('/vendor/profile'),
  updateProfile: (data: Partial<VendorProfile>) =>
    api.put<VendorProfile>('/vendor/profile', data),

  // Dashboard
  getDashboardStats: (period?: 'today' | 'week' | 'month' | 'year') =>
    api.get<VendorDashboardStats>('/vendor/dashboard/stats', {
      params: { period },
    }),

  // Orders
  getOrders: (params?: VendorOrderFilter & { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<VendorOrder>>('/vendor/orders', { params }),
  getOrder: (id: string) => api.get<VendorOrder>(`/vendor/orders/${id}`),
  updateOrderStatus: (id: string, status: string, trackingNumber?: string) =>
    api.patch(`/vendor/orders/${id}/status`, { status, trackingNumber }),
  bulkUpdateOrders: (data: BulkOrderUpdate) =>
    api.post('/vendor/orders/bulk-update', data),
  exportOrders: (params?: VendorOrderFilter) =>
    api.get('/vendor/orders/export', { params, responseType: 'blob' }),

  // Products
  getProducts: (params?: VendorProductFilter & { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<VendorProduct>>('/vendor/products', { params }),
  getProduct: (id: string) => api.get<VendorProduct>(`/vendor/products/${id}`),
  createProduct: (data: Partial<VendorProduct>) =>
    api.post<VendorProduct>('/vendor/products', data),
  updateProduct: (id: string, data: Partial<VendorProduct>) =>
    api.put<VendorProduct>(`/vendor/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/vendor/products/${id}`),
  updateInventory: (updates: InventoryUpdate[]) =>
    api.post('/vendor/products/inventory', { updates }),
  getLowStockProducts: () =>
    api.get<VendorProduct[]>('/vendor/products/low-stock'),

  // Analytics
  getAnalytics: (period: 'week' | 'month' | 'year') =>
    api.get<VendorAnalytics>('/vendor/analytics', { params: { period } }),
  getRevenueChart: (period: 'week' | 'month' | 'year') =>
    api.get('/vendor/analytics/revenue', { params: { period } }),
  getOrdersChart: (period: 'week' | 'month' | 'year') =>
    api.get('/vendor/analytics/orders', { params: { period } }),
  getTopProducts: (limit?: number) =>
    api.get('/vendor/analytics/top-products', { params: { limit } }),
  getCategoryBreakdown: () =>
    api.get('/vendor/analytics/categories'),

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<PaginatedResponse<VendorNotification>>('/vendor/notifications', {
      params,
    }),
  markNotificationRead: (id: string) =>
    api.patch(`/vendor/notifications/${id}/read`),
  markAllNotificationsRead: () =>
    api.post('/vendor/notifications/read-all'),
  deleteNotification: (id: string) =>
    api.delete(`/vendor/notifications/${id}`),
  getUnreadCount: () =>
    api.get<{ count: number }>('/vendor/notifications/unread-count'),

  // Payouts
  getPayoutSettings: () =>
    api.get<VendorPayoutSettings>('/vendor/payouts/settings'),
  updatePayoutSettings: (data: Partial<VendorPayoutSettings>) =>
    api.put<VendorPayoutSettings>('/vendor/payouts/settings', data),
  getPayouts: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedResponse<VendorPayout>>('/vendor/payouts', { params }),
  getPayout: (id: string) =>
    api.get<VendorPayout>(`/vendor/payouts/${id}`),
  requestPayout: () =>
    api.post<VendorPayout>('/vendor/payouts/request'),

  // Reviews
  getProductReviews: (productId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/vendor/products/${productId}/reviews`, { params }),
  respondToReview: (reviewId: string, response: string) =>
    api.post(`/vendor/reviews/${reviewId}/respond`, { response }),

  // Statistics
  getSalesReport: (startDate: string, endDate: string) =>
    api.get('/vendor/reports/sales', {
      params: { startDate, endDate },
    }),
  getInventoryReport: () =>
    api.get('/vendor/reports/inventory'),
  getCustomerReport: (params?: { page?: number; limit?: number }) =>
    api.get('/vendor/reports/customers', { params }),
};
