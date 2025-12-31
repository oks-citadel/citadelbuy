import { apiClient } from '@/lib/api-client';

// Types for Admin Dashboard
export interface DashboardStats {
  revenue: { value: number; change: number; period: string };
  orders: { value: number; change: number; period: string };
  customers: { value: number; change: number; period: string };
  products: { value: number; active: number; period: string };
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  time: string;
}

export interface SystemAlert {
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  action: string;
  link?: string;
}

export interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  stock: number;
  image?: string;
}

// Types for Admin Orders
export interface AdminOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: number;
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  shippingMethod: string;
}

export interface OrdersResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  stats: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
  };
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}

// Types for Admin Customers
export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderDate?: string;
  createdAt: string;
  location?: string;
}

export interface CustomersResponse {
  customers: AdminCustomer[];
  total: number;
  page: number;
  limit: number;
  stats: {
    total: number;
    active: number;
    totalRevenue: number;
    avgCustomerValue: number;
  };
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  status?: string;
  tier?: string;
  search?: string;
  sort?: string;
}

// Admin Dashboard API
export const adminDashboardApi = {
  // Get dashboard statistics
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard/stats');
    return response.data;
  },

  // Get recent orders for dashboard
  getRecentOrders: async (limit: number = 5): Promise<RecentOrder[]> => {
    const response = await apiClient.get<RecentOrder[]>('/admin/dashboard/recent-orders', {
      params: { limit },
    });
    return response.data;
  },

  // Get system alerts
  getAlerts: async (): Promise<SystemAlert[]> => {
    const response = await apiClient.get<SystemAlert[]>('/admin/dashboard/alerts');
    return response.data;
  },

  // Get top selling products
  getTopProducts: async (limit: number = 4): Promise<TopProduct[]> => {
    const response = await apiClient.get<TopProduct[]>('/admin/dashboard/top-products', {
      params: { limit },
    });
    return response.data;
  },

  // Get all dashboard data at once
  getDashboardData: async (): Promise<{
    stats: DashboardStats;
    recentOrders: RecentOrder[];
    alerts: SystemAlert[];
    topProducts: TopProduct[];
  }> => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },
};

// Admin Orders API
export const adminOrdersApi = {
  // Get all orders with filters
  getAll: async (filters?: OrderFilters): Promise<OrdersResponse> => {
    const response = await apiClient.get<OrdersResponse>('/admin/orders', {
      params: filters,
    });
    return response.data;
  },

  // Get order by ID
  getById: async (id: string): Promise<AdminOrder> => {
    const response = await apiClient.get<AdminOrder>(`/admin/orders/${id}`);
    return response.data;
  },

  // Update order status
  updateStatus: async (id: string, status: AdminOrder['status']): Promise<AdminOrder> => {
    const response = await apiClient.patch<AdminOrder>(`/admin/orders/${id}/status`, { status });
    return response.data;
  },

  // Bulk update order status
  bulkUpdateStatus: async (
    orderIds: string[],
    status: AdminOrder['status']
  ): Promise<{ success: boolean; updated: number }> => {
    const response = await apiClient.patch('/admin/orders/bulk-status', {
      orderIds,
      status,
    });
    return response.data;
  },

  // Export orders
  export: async (filters?: OrderFilters): Promise<Blob> => {
    const response = await apiClient.get('/admin/orders/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
};

// Admin Customers API
export const adminCustomersApi = {
  // Get all customers with filters
  getAll: async (filters?: CustomerFilters): Promise<CustomersResponse> => {
    const response = await apiClient.get<CustomersResponse>('/admin/customers', {
      params: filters,
    });
    return response.data;
  },

  // Get customer by ID
  getById: async (id: string): Promise<AdminCustomer> => {
    const response = await apiClient.get<AdminCustomer>(`/admin/customers/${id}`);
    return response.data;
  },

  // Update customer status
  updateStatus: async (id: string, status: AdminCustomer['status']): Promise<AdminCustomer> => {
    const response = await apiClient.patch<AdminCustomer>(`/admin/customers/${id}/status`, { status });
    return response.data;
  },

  // Update customer tier
  updateTier: async (id: string, tier: AdminCustomer['tier']): Promise<AdminCustomer> => {
    const response = await apiClient.patch<AdminCustomer>(`/admin/customers/${id}/tier`, { tier });
    return response.data;
  },

  // Get customer orders
  getOrders: async (customerId: string, params?: { page?: number; limit?: number }): Promise<{
    orders: AdminOrder[];
    total: number;
  }> => {
    const response = await apiClient.get(`/admin/customers/${customerId}/orders`, { params });
    return response.data;
  },

  // Export customers
  export: async (filters?: CustomerFilters): Promise<Blob> => {
    const response = await apiClient.get('/admin/customers/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default {
  dashboard: adminDashboardApi,
  orders: adminOrdersApi,
  customers: adminCustomersApi,
};
