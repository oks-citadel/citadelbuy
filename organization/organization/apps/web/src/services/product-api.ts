import { apiClient } from '@/lib/api-client';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  vendor: string;
  price: number;
  comparePrice?: number;
  stock: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  isActive: boolean;
  rating: number;
  reviews: number;
  sales: number;
  createdAt: string;
  image?: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  vendor?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  isActive?: boolean;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

const BASE_URL = '/api/v1/products';

// Admin Products API
export const adminProductsApi = {
  // Get all products with filters
  getAll: async (filters?: ProductFilters): Promise<{ products: Product[]; total: number }> => {
    const response = await apiClient.get(BASE_URL, { params: filters });
    return response.data;
  },

  // Get product by ID
  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Update product (including isActive field)
  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.patch(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  // Update product status (isActive)
  updateStatus: async (id: string, isActive: boolean): Promise<Product> => {
    const response = await apiClient.patch(`${BASE_URL}/${id}`, { isActive });
    return response.data;
  },

  // Bulk update product status
  bulkUpdateStatus: async (
    productIds: string[],
    isActive: boolean
  ): Promise<{ success: boolean; updated: number }> => {
    const response = await apiClient.patch(`${BASE_URL}/bulk-status`, {
      productIds,
      isActive,
    });
    return response.data;
  },

  // Delete product
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  // Bulk delete products
  bulkDelete: async (productIds: string[]): Promise<{ success: boolean; deleted: number }> => {
    const response = await apiClient.post(`${BASE_URL}/bulk-delete`, { productIds });
    return response.data;
  },

  // Archive product
  archive: async (id: string): Promise<Product> => {
    const response = await apiClient.patch(`${BASE_URL}/${id}`, { status: 'ARCHIVED' });
    return response.data;
  },

  // Bulk archive products
  bulkArchive: async (productIds: string[]): Promise<{ success: boolean; archived: number }> => {
    const response = await apiClient.post(`${BASE_URL}/bulk-archive`, { productIds });
    return response.data;
  },

  // Export products
  export: async (filters?: ProductFilters): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default adminProductsApi;
