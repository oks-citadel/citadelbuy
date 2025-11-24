import { create } from 'zustand';
import type { Product } from '@/types';
import { api } from '@/lib/api';

interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popular';
}

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  filters: ProductFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  setFilters: (filters: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page
    }));
    get().fetchProducts();
  },

  clearFilters: () => {
    set({
      filters: {},
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });
    get().fetchProducts();
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
    get().fetchProducts();
  },

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await api.get<any>(`/products?${params.toString()}`);

      // Handle both paginated and non-paginated responses
      const data = response.data;

      if (Array.isArray(data)) {
        // Non-paginated response
        set({
          products: data,
          isLoading: false,
          pagination: {
            ...pagination,
            total: data.length,
            totalPages: 1,
          },
        });
      } else {
        // Paginated response
        set({
          products: data.data || [],
          isLoading: false,
          pagination: {
            page: data.page || 1,
            limit: data.limit || 12,
            total: data.total || 0,
            totalPages: data.totalPages || 1,
          },
        });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch products',
        isLoading: false,
      });
    }
  },

  fetchProductById: async (id: string) => {
    try {
      const response = await api.get<any>(`/products/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },
}));
