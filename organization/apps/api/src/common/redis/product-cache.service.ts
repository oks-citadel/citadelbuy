import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface ProductCacheData {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
  [key: string]: any;
}

export interface ProductListCacheOptions {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}

/**
 * Product-specific caching service
 * Handles caching for product catalog, product lists, and related data
 */
@Injectable()
export class ProductCacheService {
  private readonly logger = new Logger(ProductCacheService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get single product from cache
   */
  async getProduct(productId: string): Promise<ProductCacheData | null> {
    return this.cacheService.get<ProductCacheData>(productId, {
      prefix: CachePrefix.PRODUCT,
    });
  }

  /**
   * Set single product in cache
   */
  async setProduct(
    productId: string,
    product: ProductCacheData,
    ttl: number = CacheTTL.LONG,
  ): Promise<boolean> {
    return this.cacheService.set(productId, product, {
      prefix: CachePrefix.PRODUCT,
      ttl,
    });
  }

  /**
   * Get or load single product
   */
  async getOrLoadProduct(
    productId: string,
    loader: () => Promise<ProductCacheData>,
  ): Promise<ProductCacheData> {
    return this.cacheService.getOrSet(productId, loader, {
      prefix: CachePrefix.PRODUCT,
      ttl: CacheTTL.LONG,
    });
  }

  /**
   * Get multiple products from cache
   */
  async getProducts(productIds: string[]): Promise<Map<string, ProductCacheData>> {
    const results = new Map<string, ProductCacheData>();

    await Promise.all(
      productIds.map(async (id) => {
        const product = await this.getProduct(id);
        if (product) {
          results.set(id, product);
        }
      }),
    );

    return results;
  }

  /**
   * Set multiple products in cache
   */
  async setProducts(products: ProductCacheData[]): Promise<void> {
    await Promise.all(
      products.map((product) =>
        this.setProduct(product.id, product, CacheTTL.LONG),
      ),
    );
  }

  /**
   * Get product list from cache (with filters)
   */
  async getProductList(options: ProductListCacheOptions): Promise<any | null> {
    const cacheKey = this.buildProductListKey(options);

    return this.cacheService.get(cacheKey, {
      prefix: CachePrefix.PRODUCT_LIST,
    });
  }

  /**
   * Set product list in cache
   */
  async setProductList(
    options: ProductListCacheOptions,
    data: any,
    ttl: number = CacheTTL.MEDIUM,
  ): Promise<boolean> {
    const cacheKey = this.buildProductListKey(options);

    return this.cacheService.set(cacheKey, data, {
      prefix: CachePrefix.PRODUCT_LIST,
      ttl,
    });
  }

  /**
   * Get or load product list
   */
  async getOrLoadProductList(
    options: ProductListCacheOptions,
    loader: () => Promise<any>,
  ): Promise<any> {
    const cacheKey = this.buildProductListKey(options);

    return this.cacheService.getOrSet(cacheKey, loader, {
      prefix: CachePrefix.PRODUCT_LIST,
      ttl: CacheTTL.MEDIUM,
    });
  }

  /**
   * Cache popular products (for homepage, trending, etc.)
   */
  async cachePopularProducts(
    products: ProductCacheData[],
    category?: string,
  ): Promise<void> {
    const cacheKey = category ? `popular:${category}` : 'popular:all';

    await this.cacheService.set(
      cacheKey,
      products,
      {
        prefix: CachePrefix.PRODUCT_LIST,
        ttl: CacheTTL.MEDIUM_LONG,
      },
    );

    this.logger.log(`Cached popular products: ${cacheKey}`);
  }

  /**
   * Get popular products from cache
   */
  async getPopularProducts(category?: string): Promise<ProductCacheData[] | null> {
    const cacheKey = category ? `popular:${category}` : 'popular:all';

    return this.cacheService.get<ProductCacheData[]>(cacheKey, {
      prefix: CachePrefix.PRODUCT_LIST,
    });
  }

  /**
   * Cache featured products
   */
  async cacheFeaturedProducts(products: ProductCacheData[]): Promise<void> {
    await this.cacheService.set(
      'featured',
      products,
      {
        prefix: CachePrefix.PRODUCT_LIST,
        ttl: CacheTTL.LONG,
      },
    );

    this.logger.log('Cached featured products');
  }

  /**
   * Get featured products from cache
   */
  async getFeaturedProducts(): Promise<ProductCacheData[] | null> {
    return this.cacheService.get<ProductCacheData[]>('featured', {
      prefix: CachePrefix.PRODUCT_LIST,
    });
  }

  /**
   * Cache new arrivals
   */
  async cacheNewArrivals(products: ProductCacheData[]): Promise<void> {
    await this.cacheService.set(
      'new-arrivals',
      products,
      {
        prefix: CachePrefix.PRODUCT_LIST,
        ttl: CacheTTL.MEDIUM_LONG,
      },
    );

    this.logger.log('Cached new arrivals');
  }

  /**
   * Get new arrivals from cache
   */
  async getNewArrivals(): Promise<ProductCacheData[] | null> {
    return this.cacheService.get<ProductCacheData[]>('new-arrivals', {
      prefix: CachePrefix.PRODUCT_LIST,
    });
  }

  /**
   * Cache related products
   */
  async cacheRelatedProducts(
    productId: string,
    relatedProducts: ProductCacheData[],
  ): Promise<void> {
    await this.cacheService.set(
      `related:${productId}`,
      relatedProducts,
      {
        prefix: CachePrefix.PRODUCT_LIST,
        ttl: CacheTTL.LONG,
      },
    );
  }

  /**
   * Get related products from cache
   */
  async getRelatedProducts(productId: string): Promise<ProductCacheData[] | null> {
    return this.cacheService.get<ProductCacheData[]>(`related:${productId}`, {
      prefix: CachePrefix.PRODUCT_LIST,
    });
  }

  /**
   * Invalidate product cache
   */
  async invalidateProduct(productId: string): Promise<void> {
    await this.cacheService.invalidateProduct(productId);
  }

  /**
   * Invalidate category products
   */
  async invalidateCategory(categoryId: string): Promise<void> {
    await this.cacheService.invalidateCategory(categoryId);
  }

  /**
   * Invalidate all product lists (use when significant catalog changes occur)
   */
  async invalidateAllProductLists(): Promise<void> {
    const deletedCount = await this.cacheService.deletePattern('*', CachePrefix.PRODUCT_LIST);
    this.logger.log(`Invalidated all product lists: ${deletedCount} keys`);
  }

  /**
   * Build cache key for product list based on filters
   */
  private buildProductListKey(options: ProductListCacheOptions): string {
    const parts: string[] = [];

    if (options.category) parts.push(`category:${options.category}`);
    if (options.search) parts.push(`search:${options.search}`);
    if (options.minPrice) parts.push(`min:${options.minPrice}`);
    if (options.maxPrice) parts.push(`max:${options.maxPrice}`);
    if (options.sortBy) parts.push(`sort:${options.sortBy}`);

    parts.push(`page:${options.page || 1}`);
    parts.push(`limit:${options.limit || 12}`);

    return parts.join(':');
  }

  /**
   * Warm cache for frequently accessed products
   */
  async warmFrequentlyAccessedProducts(
    loader: (productIds: string[]) => Promise<ProductCacheData[]>,
    productIds: string[],
  ): Promise<void> {
    this.logger.log(`Warming cache for ${productIds.length} frequently accessed products`);

    try {
      const products = await loader(productIds);
      await this.setProducts(products);

      this.logger.log(`Successfully warmed cache for ${products.length} products`);
    } catch (error) {
      this.logger.error('Failed to warm product cache:', error);
    }
  }

  /**
   * Event listener: Invalidate cache when product is created
   */
  @OnEvent('product.created')
  async handleProductCreated(payload: { productId: string }): Promise<void> {
    this.logger.log(`Product created event: ${payload.productId}`);
    // Invalidate product lists to include new product
    await this.invalidateAllProductLists();
  }

  /**
   * Event listener: Invalidate cache when product is updated
   */
  @OnEvent('product.updated')
  async handleProductUpdated(payload: { productId: string }): Promise<void> {
    this.logger.log(`Product updated event: ${payload.productId}`);
    await this.invalidateProduct(payload.productId);
  }

  /**
   * Event listener: Invalidate cache when product is deleted
   */
  @OnEvent('product.deleted')
  async handleProductDeleted(payload: { productId: string }): Promise<void> {
    this.logger.log(`Product deleted event: ${payload.productId}`);
    await this.invalidateProduct(payload.productId);
  }

  /**
   * Event listener: Invalidate category cache
   */
  @OnEvent('category.updated')
  async handleCategoryUpdated(payload: { categoryId: string }): Promise<void> {
    this.logger.log(`Category updated event: ${payload.categoryId}`);
    await this.invalidateCategory(payload.categoryId);
  }
}
