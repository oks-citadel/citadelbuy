/**
 * Interface for search providers (Elasticsearch, Algolia, Internal)
 */
export interface SearchProviderInterface {
  /**
   * Index a product for searching
   */
  indexProduct(product: ProductDocument): Promise<void>;

  /**
   * Index multiple products in bulk
   */
  bulkIndexProducts(products: ProductDocument[]): Promise<void>;

  /**
   * Delete a product from the search index
   */
  deleteProduct(productId: string): Promise<void>;

  /**
   * Update a product in the search index
   */
  updateProduct(productId: string, updates: Partial<ProductDocument>): Promise<void>;

  /**
   * Search products with filters and facets
   */
  searchProducts(params: SearchParams): Promise<SearchResults>;

  /**
   * Get autocomplete suggestions
   */
  getAutocomplete(query: string, limit?: number): Promise<AutocompleteResults>;

  /**
   * Get search facets for filtering
   */
  getFacets(query?: string, filters?: SearchFilters): Promise<SearchFacets>;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

export interface ProductDocument {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  barcode?: string;
  images: string[];
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  vendorId: string;
  vendorName: string;
  stock: number;
  inStock: boolean;
  tags?: string[];
  attributes?: Record<string, any>;
  avgRating?: number;
  reviewCount?: number;
  salesCount?: number;
  createdAt: Date;
  updatedAt: Date;
  // Variant information
  hasVariants?: boolean;
  variantCount?: number;
  variantOptions?: string[]; // ["Size", "Color"]
  minVariantPrice?: number;
  maxVariantPrice?: number;
}

export interface SearchParams {
  query?: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  page?: number;
  limit?: number;
  facets?: string[]; // Which facets to return
}

export interface SearchFilters {
  categoryIds?: string[];
  vendorIds?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  minRating?: number;
  tags?: string[];
  attributes?: Record<string, string[]>; // e.g., { "color": ["red", "blue"], "size": ["L", "XL"] }
  hasDiscount?: boolean;
  isNew?: boolean; // Products from last 30 days
}

export interface SearchSort {
  field: 'relevance' | 'price' | 'rating' | 'sales' | 'newest' | 'name';
  order: 'asc' | 'desc';
}

export interface SearchResults {
  products: ProductDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: SearchFacets;
  took?: number; // Time taken in ms
}

export interface AutocompleteResults {
  suggestions: AutocompleteSuggestion[];
  products: ProductSuggestion[];
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'keyword' | 'category' | 'brand';
  count?: number;
}

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  categoryName: string;
}

export interface SearchFacets {
  categories?: FacetValue[];
  vendors?: FacetValue[];
  priceRanges?: PriceRange[];
  ratings?: FacetValue[];
  tags?: FacetValue[];
  attributes?: Record<string, FacetValue[]>; // Dynamic attributes (color, size, etc.)
  inStock?: { count: number; available: number; unavailable: number };
  hasDiscount?: { count: number; withDiscount: number; withoutDiscount: number };
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
  label: string;
  count: number;
  selected?: boolean;
}
