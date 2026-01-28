import { create } from 'zustand';
import { categoriesApi } from '@/lib/api-client';

// Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  iconUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  productCount: number;
  viewCount: number;
  children?: Category[];
  parent?: Category;
}

export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
  level: number;
}

export interface CategoryFilter {
  id: string;
  name: string;
  type: 'SELECT' | 'MULTI_SELECT' | 'RANGE' | 'BOOLEAN' | 'TEXT';
  options?: string[];
  min?: number;
  max?: number;
}

/** Parameters for fetching categories */
export interface FetchCategoriesParams {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  parentId?: string;
  search?: string;
}

/** Parameters for fetching category products */
export interface FetchCategoryProductsParams {
  page?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'rating';
  minPrice?: number;
  maxPrice?: number;
  filters?: Record<string, string | string[]>;
}

/** Product response from category products endpoint */
export interface CategoryProductsResponse {
  products: unknown[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface CategoryState {
  // Data
  categories: Category[];
  categoryTree: Category[];
  featuredCategories: Category[];
  trendingCategories: Category[];
  currentCategory: Category | null;
  breadcrumbs: CategoryBreadcrumb[];
  filters: CategoryFilter[];
  searchResults: Category[];

  // UI State
  isLoading: boolean;
  isLoadingTree: boolean;
  isMegaMenuOpen: boolean;
  activeMegaMenuCategory: string | null;
  error: string | null;

  // Actions
  fetchCategories: (params?: FetchCategoriesParams) => Promise<void>;
  fetchCategoryTree: (maxDepth?: number) => Promise<void>;
  fetchFeaturedCategories: (limit?: number) => Promise<void>;
  fetchTrendingCategories: (period?: 'day' | 'week' | 'month', limit?: number) => Promise<void>;
  fetchCategory: (idOrSlug: string, bySlug?: boolean) => Promise<void>;
  fetchCategoryProducts: (id: string, params?: FetchCategoryProductsParams) => Promise<CategoryProductsResponse>;
  fetchCategoryFilters: (id: string) => Promise<void>;
  searchCategories: (query: string) => Promise<void>;
  trackCategoryView: (id: string) => Promise<void>;
  setMegaMenuOpen: (open: boolean) => void;
  setActiveMegaMenuCategory: (categoryId: string | null) => void;
  clearCurrentCategory: () => void;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  // Initial State
  categories: [],
  categoryTree: [],
  featuredCategories: [],
  trendingCategories: [],
  currentCategory: null,
  breadcrumbs: [],
  filters: [],
  searchResults: [],
  isLoading: false,
  isLoadingTree: false,
  isMegaMenuOpen: false,
  activeMegaMenuCategory: null,
  error: null,

  // Actions
  fetchCategories: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesApi.getAll(params);
      set({ categories: response.categories, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? (error as Error).message : "Failed to fetch categories", isLoading: false });
    }
  },

  fetchCategoryTree: async (maxDepth = 3) => {
    set({ isLoadingTree: true, error: null });
    try {
      const tree = await categoriesApi.getTree({ maxDepth, includeProducts: true });
      set({ categoryTree: tree, isLoadingTree: false });
    } catch (error) {
      set({ error: error instanceof Error ? (error as Error).message : "Failed to fetch categories", isLoadingTree: false });
    }
  },

  fetchFeaturedCategories: async (limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const featured = await categoriesApi.getFeatured(limit);
      set({ featuredCategories: featured, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? (error as Error).message : "Failed to fetch categories", isLoading: false });
    }
  },

  fetchTrendingCategories: async (period = 'week', limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const trending = await categoriesApi.getTrending({ period, limit });
      set({ trendingCategories: trending, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? (error as Error).message : "Failed to fetch categories", isLoading: false });
    }
  },

  fetchCategory: async (idOrSlug, bySlug = false) => {
    set({ isLoading: true, error: null });
    try {
      const category = bySlug
        ? await categoriesApi.getBySlug(idOrSlug, {
            includeBreadcrumb: true,
            includeChildren: true,
          })
        : await categoriesApi.getById(idOrSlug, {
            includeBreadcrumb: true,
            includeChildren: true,
            includeSiblings: true,
            includeFilters: true,
          });

      set({
        currentCategory: category,
        breadcrumbs: category.breadcrumb || [],
        isLoading: false,
      });

      // Track view
      get().trackCategoryView(category.id);
    } catch (error) {
      set({ error: error instanceof Error ? (error as Error).message : "Failed to fetch categories", isLoading: false });
    }
  },

  fetchCategoryProducts: async (id, params) => {
    try {
      const response = await categoriesApi.getProducts(id, params);
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const hasMore = page * limit < response.total;
      return {
        products: response.products,
        total: response.total,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  fetchCategoryFilters: async (id) => {
    try {
      const filters = await categoriesApi.getFilters(id);
      set({ filters });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  searchCategories: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    try {
      const results = await categoriesApi.search(query, { fuzzy: true, limit: 10 });
      set({ searchResults: results });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  trackCategoryView: async (id) => {
    try {
      await categoriesApi.trackView(id);
    } catch {
      // Silently fail for analytics
    }
  },

  setMegaMenuOpen: (open) => {
    set({ isMegaMenuOpen: open });
    if (!open) {
      set({ activeMegaMenuCategory: null });
    }
  },

  setActiveMegaMenuCategory: (categoryId) => {
    set({ activeMegaMenuCategory: categoryId });
  },

  clearCurrentCategory: () => {
    set({
      currentCategory: null,
      breadcrumbs: [],
      filters: [],
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Selectors
export const selectCategoryTree = (state: CategoryState) => state.categoryTree;
export const selectFeaturedCategories = (state: CategoryState) => state.featuredCategories;
export const selectTrendingCategories = (state: CategoryState) => state.trendingCategories;
export const selectCurrentCategory = (state: CategoryState) => state.currentCategory;
export const selectBreadcrumbs = (state: CategoryState) => state.breadcrumbs;
export const selectCategoryFilters = (state: CategoryState) => state.filters;
export const selectIsMegaMenuOpen = (state: CategoryState) => state.isMegaMenuOpen;
export const selectActiveMegaMenuCategory = (state: CategoryState) => state.activeMegaMenuCategory;
