import { api } from '../api';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithProducts extends Category {
  products: any[];
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  products: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  };
}

/**
 * Get all categories
 */
export const getCategories = async (includeEmpty: boolean = true): Promise<Category[]> => {
  const response = await api.get('/categories', {
    params: { includeEmpty },
  });
  return response.data;
};

/**
 * Get top-level categories (for navigation)
 */
export const getTopLevelCategories = async (): Promise<Category[]> => {
  const response = await api.get('/categories/top-level');
  return response.data;
};

/**
 * Get category by ID
 */
export const getCategoryById = async (id: string): Promise<Category> => {
  const response = await api.get(`/categories/${id}`);
  return response.data;
};

/**
 * Get category by slug
 */
export const getCategoryBySlug = async (slug: string): Promise<Category> => {
  const response = await api.get(`/categories/slug/${slug}`);
  return response.data;
};

/**
 * Get products in a category
 */
export const getCategoryProducts = async (
  categoryId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  products: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  const response = await api.get(`/categories/${categoryId}/products`, {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Search products with filters
 */
export const searchProducts = async (params: ProductSearchParams): Promise<SearchResponse> => {
  const response = await api.get('/products/search', { params });
  return response.data;
};
