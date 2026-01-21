import { create } from 'zustand';
import { vendorApi } from '../services/vendor-api';
import {
  VendorProfile,
  VendorDashboardStats,
  VendorOrder,
  VendorProduct,
  VendorNotification,
  VendorAnalytics,
} from '../types/vendor';

interface VendorState {
  // Profile
  profile: VendorProfile | null;
  isLoadingProfile: boolean;
  profileError: string | null;

  // Dashboard
  dashboardStats: VendorDashboardStats | null;
  isLoadingDashboard: boolean;
  dashboardError: string | null;

  // Orders
  orders: VendorOrder[];
  currentOrder: VendorOrder | null;
  isLoadingOrders: boolean;
  ordersError: string | null;
  ordersPage: number;
  ordersTotalPages: number;
  ordersHasMore: boolean;

  // Products
  products: VendorProduct[];
  currentProduct: VendorProduct | null;
  isLoadingProducts: boolean;
  productsError: string | null;
  productsPage: number;
  productsTotalPages: number;
  productsHasMore: boolean;

  // Analytics
  analytics: VendorAnalytics | null;
  isLoadingAnalytics: boolean;
  analyticsError: string | null;

  // Notifications
  notifications: VendorNotification[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  notificationsError: string | null;

  // Actions - Profile
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<VendorProfile>) => Promise<void>;

  // Actions - Dashboard
  fetchDashboardStats: (period?: 'today' | 'week' | 'month' | 'year') => Promise<void>;
  refreshDashboard: () => Promise<void>;

  // Actions - Orders
  fetchOrders: (filters?: any, page?: number) => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string, trackingNumber?: string) => Promise<void>;
  refreshOrders: () => Promise<void>;

  // Actions - Products
  fetchProducts: (filters?: any, page?: number) => Promise<void>;
  fetchProduct: (id: string) => Promise<void>;
  updateProduct: (id: string, data: Partial<VendorProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;

  // Actions - Analytics
  fetchAnalytics: (period: 'week' | 'month' | 'year') => Promise<void>;

  // Actions - Notifications
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;

  // Clear methods
  clearErrors: () => void;
  clearCurrentOrder: () => void;
  clearCurrentProduct: () => void;
}

export const useVendorStore = create<VendorState>((set, get) => ({
  // Initial state
  profile: null,
  isLoadingProfile: false,
  profileError: null,

  dashboardStats: null,
  isLoadingDashboard: false,
  dashboardError: null,

  orders: [],
  currentOrder: null,
  isLoadingOrders: false,
  ordersError: null,
  ordersPage: 1,
  ordersTotalPages: 1,
  ordersHasMore: false,

  products: [],
  currentProduct: null,
  isLoadingProducts: false,
  productsError: null,
  productsPage: 1,
  productsTotalPages: 1,
  productsHasMore: false,

  analytics: null,
  isLoadingAnalytics: false,
  analyticsError: null,

  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,
  notificationsError: null,

  // Profile actions
  fetchProfile: async () => {
    set({ isLoadingProfile: true, profileError: null });
    try {
      const response = await vendorApi.getProfile();
      set({ profile: response.data, isLoadingProfile: false });
    } catch (error: any) {
      set({
        profileError: error.response?.data?.message || 'Failed to fetch profile',
        isLoadingProfile: false,
      });
    }
  },

  updateProfile: async (data: Partial<VendorProfile>) => {
    set({ isLoadingProfile: true, profileError: null });
    try {
      const response = await vendorApi.updateProfile(data);
      set({ profile: response.data, isLoadingProfile: false });
    } catch (error: any) {
      set({
        profileError: error.response?.data?.message || 'Failed to update profile',
        isLoadingProfile: false,
      });
      throw error;
    }
  },

  // Dashboard actions
  fetchDashboardStats: async (period = 'week') => {
    set({ isLoadingDashboard: true, dashboardError: null });
    try {
      const response = await vendorApi.getDashboardStats(period);
      set({ dashboardStats: response.data, isLoadingDashboard: false });
    } catch (error: any) {
      set({
        dashboardError: error.response?.data?.message || 'Failed to fetch dashboard stats',
        isLoadingDashboard: false,
      });
    }
  },

  refreshDashboard: async () => {
    const { dashboardStats } = get();
    await get().fetchDashboardStats(dashboardStats?.period || 'week');
  },

  // Orders actions
  fetchOrders: async (filters?: any, page = 1) => {
    set({ isLoadingOrders: true, ordersError: null });
    try {
      const response = await vendorApi.getOrders({ ...filters, page, limit: 20 });
      set({
        orders: page === 1 ? response.data.data : [...get().orders, ...response.data.data],
        ordersPage: response.data.page,
        ordersTotalPages: response.data.totalPages,
        ordersHasMore: response.data.hasMore,
        isLoadingOrders: false,
      });
    } catch (error: any) {
      set({
        ordersError: error.response?.data?.message || 'Failed to fetch orders',
        isLoadingOrders: false,
      });
    }
  },

  fetchOrder: async (id: string) => {
    set({ isLoadingOrders: true, ordersError: null });
    try {
      const response = await vendorApi.getOrder(id);
      set({ currentOrder: response.data, isLoadingOrders: false });
    } catch (error: any) {
      set({
        ordersError: error.response?.data?.message || 'Failed to fetch order',
        isLoadingOrders: false,
      });
    }
  },

  updateOrderStatus: async (id: string, status: string, trackingNumber?: string) => {
    set({ isLoadingOrders: true, ordersError: null });
    try {
      await vendorApi.updateOrderStatus(id, status, trackingNumber);

      // Update the order in the list
      const orders = get().orders.map(order =>
        order.id === id ? { ...order, status: status as any, trackingNumber } : order
      );
      set({ orders, isLoadingOrders: false });

      // Update current order if it's the same
      const { currentOrder } = get();
      if (currentOrder?.id === id) {
        set({ currentOrder: { ...currentOrder, status: status as any, trackingNumber } });
      }
    } catch (error: any) {
      set({
        ordersError: error.response?.data?.message || 'Failed to update order',
        isLoadingOrders: false,
      });
      throw error;
    }
  },

  refreshOrders: async () => {
    await get().fetchOrders(undefined, 1);
  },

  // Products actions
  fetchProducts: async (filters?: any, page = 1) => {
    set({ isLoadingProducts: true, productsError: null });
    try {
      const response = await vendorApi.getProducts({ ...filters, page, limit: 20 });
      set({
        products: page === 1 ? response.data.data : [...get().products, ...response.data.data],
        productsPage: response.data.page,
        productsTotalPages: response.data.totalPages,
        productsHasMore: response.data.hasMore,
        isLoadingProducts: false,
      });
    } catch (error: any) {
      set({
        productsError: error.response?.data?.message || 'Failed to fetch products',
        isLoadingProducts: false,
      });
    }
  },

  fetchProduct: async (id: string) => {
    set({ isLoadingProducts: true, productsError: null });
    try {
      const response = await vendorApi.getProduct(id);
      set({ currentProduct: response.data, isLoadingProducts: false });
    } catch (error: any) {
      set({
        productsError: error.response?.data?.message || 'Failed to fetch product',
        isLoadingProducts: false,
      });
    }
  },

  updateProduct: async (id: string, data: Partial<VendorProduct>) => {
    set({ isLoadingProducts: true, productsError: null });
    try {
      const response = await vendorApi.updateProduct(id, data);

      // Update product in list
      const products = get().products.map(product =>
        product.id === id ? response.data : product
      );
      set({ products, isLoadingProducts: false });

      // Update current product if it's the same
      const { currentProduct } = get();
      if (currentProduct?.id === id) {
        set({ currentProduct: response.data });
      }
    } catch (error: any) {
      set({
        productsError: error.response?.data?.message || 'Failed to update product',
        isLoadingProducts: false,
      });
      throw error;
    }
  },

  deleteProduct: async (id: string) => {
    set({ isLoadingProducts: true, productsError: null });
    try {
      await vendorApi.deleteProduct(id);

      // Remove product from list
      const products = get().products.filter(product => product.id !== id);
      set({ products, isLoadingProducts: false });
    } catch (error: any) {
      set({
        productsError: error.response?.data?.message || 'Failed to delete product',
        isLoadingProducts: false,
      });
      throw error;
    }
  },

  refreshProducts: async () => {
    await get().fetchProducts(undefined, 1);
  },

  // Analytics actions
  fetchAnalytics: async (period: 'week' | 'month' | 'year') => {
    set({ isLoadingAnalytics: true, analyticsError: null });
    try {
      const response = await vendorApi.getAnalytics(period);
      set({ analytics: response.data, isLoadingAnalytics: false });
    } catch (error: any) {
      set({
        analyticsError: error.response?.data?.message || 'Failed to fetch analytics',
        isLoadingAnalytics: false,
      });
    }
  },

  // Notifications actions
  fetchNotifications: async () => {
    set({ isLoadingNotifications: true, notificationsError: null });
    try {
      const response = await vendorApi.getNotifications({ limit: 50 });
      set({
        notifications: response.data.data,
        isLoadingNotifications: false,
      });
    } catch (error: any) {
      set({
        notificationsError: error.response?.data?.message || 'Failed to fetch notifications',
        isLoadingNotifications: false,
      });
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      await vendorApi.markNotificationRead(id);

      // Update notification in list
      const notifications = get().notifications.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      );
      set({ notifications });

      // Update unread count
      await get().fetchUnreadCount();
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await vendorApi.markAllNotificationsRead();

      // Update all notifications as read
      const notifications = get().notifications.map(notif => ({ ...notif, isRead: true }));
      set({ notifications, unreadCount: 0 });
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await vendorApi.getUnreadCount();
      set({ unreadCount: response.data.count });
    } catch (error: any) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  // Clear methods
  clearErrors: () => {
    set({
      profileError: null,
      dashboardError: null,
      ordersError: null,
      productsError: null,
      analyticsError: null,
      notificationsError: null,
    });
  },

  clearCurrentOrder: () => {
    set({ currentOrder: null });
  },

  clearCurrentProduct: () => {
    set({ currentProduct: null });
  },
}));
