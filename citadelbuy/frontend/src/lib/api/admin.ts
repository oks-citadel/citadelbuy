import { api } from '../api';

export interface OrderStats {
  totalOrders: number;
  ordersByStatus: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  totalRevenue: number;
}

export interface ProductStats {
  totalProducts: number;
  totalCategories: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  averagePrice: number;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: any;
  paymentIntentId?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      images: string[];
    };
  }>;
}

export const adminApi = {
  // Order Statistics
  async getOrderStats(): Promise<OrderStats> {
    const response = await api.get('/admin/orders/stats');
    return response.data;
  },

  // Get all orders
  async getAllOrders(status?: string): Promise<Order[]> {
    const params = status ? { status } : {};
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },

  // Update order status
  async updateOrderStatus(
    orderId: string,
    status: string,
    trackingNumber?: string,
  ): Promise<Order> {
    const response = await api.patch(`/admin/orders/${orderId}/status`, {
      status,
      trackingNumber,
    });
    return response.data;
  },

  // Product Statistics
  async getProductStats(): Promise<ProductStats> {
    const response = await api.get('/admin/products/stats');
    return response.data;
  },

  // Get all products (admin)
  async getAllProducts(): Promise<any> {
    const response = await api.get('/admin/products');
    return response.data;
  },

  // Create product
  async createProduct(data: any): Promise<any> {
    const response = await api.post('/admin/products', data);
    return response.data;
  },

  // Update product
  async updateProduct(id: string, data: any): Promise<any> {
    const response = await api.put(`/admin/products/${id}`, data);
    return response.data;
  },

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/admin/products/${id}`);
  },

  // Get all categories
  async getCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const response = await api.get('/admin/products/categories');
    return response.data;
  },

  // Get all vendors
  async getVendors(): Promise<Array<{ id: string; name: string; email: string }>> {
    const response = await api.get('/admin/products/vendors');
    return response.data;
  },
};
