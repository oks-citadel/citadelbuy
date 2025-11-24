import { api as apiClient } from '../api';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
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

export const ordersApi = {
  /**
   * Get all orders for the authenticated user
   */
  async getAll(): Promise<Order[]> {
    const response = await apiClient.get('/orders');
    return response.data;
  },

  /**
   * Get a specific order by ID
   */
  async getById(orderId: string): Promise<Order> {
    const response = await apiClient.get(`/orders/${orderId}`);
    // Parse shippingAddress JSON string to object
    const order = response.data;
    if (typeof order.shippingAddress === 'string') {
      order.shippingAddress = JSON.parse(order.shippingAddress);
    }
    return order;
  },

  /**
   * Create a new order
   */
  async create(orderData: CreateOrderData): Promise<Order> {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },
};
