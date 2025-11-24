const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export interface VendorRegistrationData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessType?: string;
  taxId?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialMedia?: any;
  documents?: string[];
}

export const vendorService = {
  async register(data: VendorRegistrationData) {
    const response = await fetch(`${API_URL}/vendors/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  },

  async getProfile() {
    const response = await fetch(`${API_URL}/vendors/profile`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  async updateProfile(data: any) {
    const response = await fetch(`${API_URL}/vendors/profile`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  async updateBanking(data: any) {
    const response = await fetch(`${API_URL}/vendors/banking`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update banking info');
    return response.json();
  },

  async getDashboard() {
    const response = await fetch(`${API_URL}/vendors/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  },

  async getPayouts(limit = 20, offset = 0) {
    const response = await fetch(`${API_URL}/vendors/payouts?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch payouts');
    return response.json();
  },

  async getProducts(limit = 50, offset = 0) {
    const response = await fetch(`${API_URL}/vendors/products?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async createProduct(data: any) {
    const response = await fetch(`${API_URL}/vendors/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  async updateProduct(productId: string, data: any) {
    const response = await fetch(`${API_URL}/vendors/products/${productId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  },

  async deleteProduct(productId: string) {
    const response = await fetch(`${API_URL}/vendors/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return response.json();
  },

  async getOrders(limit = 20, offset = 0, status?: string) {
    let url = `${API_URL}/vendors/orders?limit=${limit}&offset=${offset}`;
    if (status) url += `&status=${status}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  async updateOrderStatus(orderId: string, status: string) {
    const response = await fetch(`${API_URL}/vendors/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
    return response.json();
  },
};
