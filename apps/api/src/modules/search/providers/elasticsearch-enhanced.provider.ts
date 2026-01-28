import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import {
  SearchProviderInterface,
  ProductDocument,
  SearchParams,
  SearchResults,
  AutocompleteResults,
  SearchFacets,
  FacetValue,
  PriceRange,
} from './search-provider.interface';

/**
 * Enhanced Elasticsearch Search Provider
 * Includes advanced features:
 * - Multi-entity search (products, categories, vendors)
 * - Advanced result ranking and boosting
 * - Dynamic faceted search
 * - Better autocomplete with typo tolerance
 * - Category and vendor indexing
 */
@Injectable()
export class ElasticsearchEnhancedProvider implements SearchProviderInterface {
  private readonly logger = new Logger(ElasticsearchEnhancedProvider.name);
  private client: Client | null = null;
  private readonly productsIndex = 'products';
  private readonly categoriesIndex = 'categories';
  private readonly vendorsIndex = 'vendors';
  private available = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    const elasticsearchNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
    const elasticsearchUsername = process.env.ELASTICSEARCH_USERNAME;
    const elasticsearchPassword = process.env.ELASTICSEARCH_PASSWORD;
    const requestTimeout = parseInt(process.env.ELASTICSEARCH_REQUEST_TIMEOUT || '30000', 10);

    try {
      const clientConfig: any = {
        node: elasticsearchNode,
        requestTimeout,
        maxRetries: 3,
        sniffOnStart: false,
      };

      if (elasticsearchUsername && elasticsearchPassword) {
        clientConfig.auth = {
          username: elasticsearchUsername,
          password: elasticsearchPassword,
        };
      }

      this.client = new Client(clientConfig);

      await Promise.race([
        this.client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        ),
      ]);

      this.available = true;
      this.logger.log('Elasticsearch connection established successfully');

      await this.ensureIndices();
    } catch (error) {
      this.logger.warn(
        `Elasticsearch not available: ${error.message}. Falling back to internal search.`,
      );
      this.available = false;
      this.client = null;
    }
  }

  private async ensureIndices() {
    if (!this.client) return;

    try {
      await this.ensureProductsIndex();
      await this.ensureCategoriesIndex();
      await this.ensureVendorsIndex();
    } catch (error) {
      this.logger.error(`Failed to ensure indices: ${error.message}`);
      throw error;
    }
  }

  private async ensureProductsIndex() {
    if (!this.client) return;

    const exists = await this.client.indices.exists({ index: this.productsIndex });

    if (!exists) {
      await this.client.indices.create({
        index: this.productsIndex,
        settings: {
          number_of_shards: 2,
          number_of_replicas: 1,
          max_result_window: 10000,
          analysis: {
            analyzer: {
              autocomplete: {
                tokenizer: 'autocomplete_tokenizer',
                filter: ['lowercase', 'asciifolding', 'trim'],
              },
              autocomplete_search: {
                tokenizer: 'lowercase',
                filter: ['lowercase', 'asciifolding', 'trim'],
              },
              standard_english: {
                type: 'standard',
                stopwords: '_english_',
              },
            },
            tokenizer: {
              autocomplete_tokenizer: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 20,
                token_chars: ['letter', 'digit'],
              },
            },
          },
        } as any,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'autocomplete',
              search_analyzer: 'autocomplete_search',
              fields: {
                keyword: { type: 'keyword' },
                standard: { type: 'text', analyzer: 'standard' },
              },
            },
            description: { type: 'text', analyzer: 'standard_english' },
            price: { type: 'float' },
            compareAtPrice: { type: 'float' },
            sku: { type: 'keyword' },
            barcode: { type: 'keyword' },
            images: { type: 'keyword' },
            categoryId: { type: 'keyword' },
            categoryName: {
              type: 'text',
              fields: { keyword: { type: 'keyword' } },
            },
            categorySlug: { type: 'keyword' },
            vendorId: { type: 'keyword' },
            vendorName: {
              type: 'text',
              fields: { keyword: { type: 'keyword' } },
            },
            stock: { type: 'integer' },
            inStock: { type: 'boolean' },
            tags: { type: 'keyword' },
            attributes: { type: 'object', enabled: true },
            avgRating: { type: 'float' },
            reviewCount: { type: 'integer' },
            salesCount: { type: 'integer' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            hasVariants: { type: 'boolean' },
            variantCount: { type: 'integer' },
            variantOptions: { type: 'keyword' },
            minVariantPrice: { type: 'float' },
            maxVariantPrice: { type: 'float' },
          },
        } as any,
      });

      this.logger.log(`Created products index: ${this.productsIndex}`);
    }
  }

  private async ensureCategoriesIndex() {
    if (!this.client) return;

    const exists = await this.client.indices.exists({ index: this.categoriesIndex });

    if (!exists) {
      await this.client.indices.create({
        index: this.categoriesIndex,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        } as any,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            slug: { type: 'keyword' },
            description: { type: 'text' },
            parentId: { type: 'keyword' },
            productCount: { type: 'integer' },
            level: { type: 'integer' },
            path: { type: 'keyword' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
          },
        } as any,
      });

      this.logger.log(`Created categories index: ${this.categoriesIndex}`);
    }
  }

  private async ensureVendorsIndex() {
    if (!this.client) return;

    const exists = await this.client.indices.exists({ index: this.vendorsIndex });

    if (!exists) {
      await this.client.indices.create({
        index: this.vendorsIndex,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        } as any,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            slug: { type: 'keyword' },
            description: { type: 'text' },
            productCount: { type: 'integer' },
            avgRating: { type: 'float' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
          },
        } as any,
      });

      this.logger.log(`Created vendors index: ${this.vendorsIndex}`);
    }
  }

  getProviderName(): string {
    return 'Elasticsearch Enhanced';
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async indexProduct(product: ProductDocument): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.index({
        index: this.productsIndex,
        id: product.id,
        document: product as any,
      });
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}: ${error.message}`);
    }
  }

  async bulkIndexProducts(products: ProductDocument[]): Promise<void> {
    if (!this.client || !this.available || products.length === 0) return;

    const bulkSize = parseInt(process.env.ELASTICSEARCH_BULK_SIZE || '1000', 10);

    try {
      for (let i = 0; i < products.length; i += bulkSize) {
        const chunk = products.slice(i, i + bulkSize);
        const body = chunk.flatMap((product) => [
          { index: { _index: this.productsIndex, _id: product.id } },
          product,
        ]);

        const response = await this.client.bulk({ body, refresh: false });

        if (response.errors) {
          const erroredDocuments: any[] = [];
          response.items.forEach((action: any, idx: number) => {
            const operation = Object.keys(action)[0];
            if (action[operation].error) {
              erroredDocuments.push({
                status: action[operation].status,
                error: action[operation].error,
                document: chunk[idx],
              });
            }
          });

          this.logger.error(
            `Bulk index had errors. Failed ${erroredDocuments.length} of ${chunk.length} documents`,
          );
        }

        this.logger.log(`Bulk indexed chunk ${i / bulkSize + 1}: ${chunk.length} products`);
      }

      await this.refreshIndex(this.productsIndex);
      this.logger.log(`Successfully bulk indexed ${products.length} products total`);
    } catch (error) {
      this.logger.error(`Failed to bulk index products: ${error.message}`);
      throw error;
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.delete({
        index: this.productsIndex,
        id: productId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete product ${productId}: ${error.message}`);
    }
  }

  async updateProduct(productId: string, updates: Partial<ProductDocument>): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.update({
        index: this.productsIndex,
        id: productId,
        doc: updates as any,
      });
    } catch (error) {
      this.logger.error(`Failed to update product ${productId}: ${error.message}`);
    }
  }

  /**
   * Advanced product search with ranking and boosting
   */
  async searchProducts(params: SearchParams): Promise<SearchResults> {
    if (!this.client || !this.available) {
      throw new Error('Elasticsearch is not available');
    }

    const {
      query = '',
      filters = {},
      sort = { field: 'relevance', order: 'desc' },
      page = 1,
      limit = 20,
      facets = [],
    } = params;

    const from = (page - 1) * limit;

    // Build query with boosting and advanced scoring
    const must: any[] = [];
    const should: any[] = [];
    const filter: any[] = [];

    if (query) {
      // Multi-match with field boosting
      must.push({
        multi_match: {
          query,
          fields: [
            'name^5',              // Highest boost for exact name matches
            'name.standard^3',     // Standard analyzer for name
            'categoryName^2',      // Category names
            'vendorName^2',        // Vendor names
            'description',         // Description
            'tags^1.5',           // Tags
            'sku^4',              // SKU (exact codes)
            'barcode^4',          // Barcode
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
          operator: 'or',
        },
      });

      // Add boosting for popular products
      should.push({
        function_score: {
          query: { match_all: {} },
          functions: [
            {
              field_value_factor: {
                field: 'salesCount',
                factor: 1.2,
                modifier: 'log1p',
                missing: 0,
              },
            },
            {
              field_value_factor: {
                field: 'avgRating',
                factor: 1.5,
                modifier: 'sqrt',
                missing: 0,
              },
            },
            {
              field_value_factor: {
                field: 'reviewCount',
                factor: 1.1,
                modifier: 'log1p',
                missing: 0,
              },
            },
          ],
          score_mode: 'sum',
          boost_mode: 'multiply',
        },
      });
    }

    // Filters
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      filter.push({ terms: { categoryId: filters.categoryIds } });
    }

    if (filters.vendorIds && filters.vendorIds.length > 0) {
      filter.push({ terms: { vendorId: filters.vendorIds } });
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      filter.push({
        range: {
          price: {
            ...(filters.priceMin && { gte: filters.priceMin }),
            ...(filters.priceMax && { lte: filters.priceMax }),
          },
        },
      });
    }

    if (filters.inStock) {
      filter.push({ term: { inStock: true } });
    }

    if (filters.minRating) {
      filter.push({ range: { avgRating: { gte: filters.minRating } } });
    }

    if (filters.tags && filters.tags.length > 0) {
      filter.push({ terms: { tags: filters.tags } });
    }

    if (filters.hasDiscount) {
      filter.push({ exists: { field: 'compareAtPrice' } });
    }

    if (filters.isNew) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.push({ range: { createdAt: { gte: thirtyDaysAgo.toISOString() } } });
    }

    // Dynamic attribute filters
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, values]) => {
        filter.push({ terms: { [`attributes.${key}`]: values } });
      });
    }

    // Build sort
    let sortClause: any = [];
    switch (sort.field) {
      case 'price':
        sortClause = [{ price: { order: sort.order } }];
        break;
      case 'rating':
        sortClause = [
          { avgRating: { order: sort.order } },
          { reviewCount: { order: 'desc' } },
        ];
        break;
      case 'sales':
        sortClause = [{ salesCount: { order: sort.order } }];
        break;
      case 'newest':
        sortClause = [{ createdAt: { order: sort.order } }];
        break;
      case 'name':
        sortClause = [{ 'name.keyword': { order: sort.order } }];
        break;
      default:
        sortClause = ['_score']; // Relevance
    }

    // Build aggregations for facets
    const aggs: any = {};

    if (facets.includes('categories') || facets.length === 0) {
      aggs.categories = {
        terms: {
          field: 'categoryName.keyword',
          size: 50,
          order: { _count: 'desc' },
        },
        aggs: {
          categoryIds: {
            terms: { field: 'categoryId', size: 1 },
          },
        },
      };
    }

    if (facets.includes('vendors') || facets.length === 0) {
      aggs.vendors = {
        terms: {
          field: 'vendorName.keyword',
          size: 50,
          order: { _count: 'desc' },
        },
        aggs: {
          vendorIds: {
            terms: { field: 'vendorId', size: 1 },
          },
        },
      };
    }

    if (facets.includes('price') || facets.length === 0) {
      aggs.priceStats = {
        stats: { field: 'price' },
      };
      aggs.priceHistogram = {
        histogram: {
          field: 'price',
          interval: 50,
          min_doc_count: 1,
        },
      };
    }

    if (facets.includes('ratings') || facets.length === 0) {
      aggs.ratings = {
        range: {
          field: 'avgRating',
          ranges: [
            { key: '4+', from: 4 },
            { key: '3+', from: 3, to: 4 },
            { key: '2+', from: 2, to: 3 },
            { key: '1+', from: 1, to: 2 },
          ],
        },
      };
    }

    if (facets.includes('tags') || facets.length === 0) {
      aggs.tags = {
        terms: { field: 'tags', size: 50 },
      };
    }

    if (facets.includes('inStock') || facets.length === 0) {
      aggs.inStock = {
        terms: { field: 'inStock' },
      };
    }

    if (facets.includes('hasDiscount') || facets.length === 0) {
      aggs.hasDiscount = {
        filters: {
          filters: {
            withDiscount: { exists: { field: 'compareAtPrice' } },
            withoutDiscount: { bool: { must_not: { exists: { field: 'compareAtPrice' } } } },
          },
        },
      };
    }

    const startTime = Date.now();

    try {
      const response = await this.client.search({
        index: this.productsIndex,
        query: {
          bool: {
            ...(must.length > 0 && { must }),
            ...(should.length > 0 && { should }),
            ...(filter.length > 0 && { filter }),
          },
        } as any,
        from,
        size: limit,
        sort: sortClause as any,
        aggs: aggs as any,
      });

      const took = Date.now() - startTime;

      const products = response.hits.hits.map((hit: any) => hit._source as ProductDocument);
      const total = (response.hits.total as any).value || 0;

      const searchFacets = this.parseFacets(response.aggregations, filters);

      return {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        facets: searchFacets,
        took,
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      throw error;
    }
  }

  async getAutocomplete(query: string, limit = 10): Promise<AutocompleteResults> {
    if (!this.client || !this.available) {
      return { suggestions: [], products: [] };
    }

    try {
      // Multi-index search for autocomplete
      const response = await this.client.search({
        index: [this.productsIndex, this.categoriesIndex, this.vendorsIndex],
        query: {
          multi_match: {
            query,
            fields: ['name^3', 'categoryName^2', 'vendorName'],
            type: 'bool_prefix',
            fuzziness: 'AUTO',
          },
        } as any,
        size: limit,
      });

      const suggestions: any[] = [];
      const products: any[] = [];

      response.hits.hits.forEach((hit: any) => {
        const source = hit._source;

        if (hit._index === this.productsIndex) {
          products.push({
            id: source.id,
            name: source.name,
            slug: source.id,
            image: source.images?.[0],
            price: source.price,
            categoryName: source.categoryName,
          });
        } else if (hit._index === this.categoriesIndex) {
          suggestions.push({
            text: source.name,
            type: 'category' as const,
            count: source.productCount || 0,
          });
        } else if (hit._index === this.vendorsIndex) {
          suggestions.push({
            text: source.name,
            type: 'brand' as const,
            count: source.productCount || 0,
          });
        }
      });

      return {
        suggestions: suggestions.slice(0, limit / 2),
        products: products.slice(0, limit / 2),
      };
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      return { suggestions: [], products: [] };
    }
  }

  async getFacets(query?: string, filters?: any): Promise<SearchFacets> {
    return this.searchProducts({ query, filters, limit: 0, facets: [] }).then(
      (res) => res.facets || {},
    );
  }

  private parseFacets(aggregations: any, activeFilters: any): SearchFacets {
    const facets: SearchFacets = {};

    if (aggregations?.categories) {
      facets.categories = aggregations.categories.buckets.map((b: any) => ({
        value: b.categoryIds?.buckets[0]?.key || b.key,
        label: b.key,
        count: b.doc_count,
        selected: activeFilters.categoryIds?.includes(b.categoryIds?.buckets[0]?.key) || false,
      }));
    }

    if (aggregations?.vendors) {
      facets.vendors = aggregations.vendors.buckets.map((b: any) => ({
        value: b.vendorIds?.buckets[0]?.key || b.key,
        label: b.key,
        count: b.doc_count,
        selected: activeFilters.vendorIds?.includes(b.vendorIds?.buckets[0]?.key) || false,
      }));
    }

    if (aggregations?.priceStats) {
      const stats = aggregations.priceStats;
      facets.priceRanges = this.generatePriceRanges(stats.min, stats.max, activeFilters);
    }

    if (aggregations?.ratings) {
      facets.ratings = aggregations.ratings.buckets.map((b: any) => ({
        value: b.key,
        label: b.key,
        count: b.doc_count,
      }));
    }

    if (aggregations?.tags) {
      facets.tags = aggregations.tags.buckets.map((b: any) => ({
        value: b.key,
        label: b.key,
        count: b.doc_count,
        selected: activeFilters.tags?.includes(b.key) || false,
      }));
    }

    if (aggregations?.inStock) {
      const inStockBuckets = aggregations.inStock.buckets;
      const available = inStockBuckets.find((b: any) => b.key === true)?.doc_count || 0;
      const unavailable = inStockBuckets.find((b: any) => b.key === false)?.doc_count || 0;
      facets.inStock = {
        count: available + unavailable,
        available,
        unavailable,
      };
    }

    if (aggregations?.hasDiscount) {
      const discountBuckets = aggregations.hasDiscount.buckets;
      facets.hasDiscount = {
        count: discountBuckets.withDiscount.doc_count + discountBuckets.withoutDiscount.doc_count,
        withDiscount: discountBuckets.withDiscount.doc_count,
        withoutDiscount: discountBuckets.withoutDiscount.doc_count,
      };
    }

    return facets;
  }

  private generatePriceRanges(min: number, max: number, activeFilters: any): PriceRange[] {
    const ranges: PriceRange[] = [];

    // Generate smart price ranges
    const range = max - min;
    let step: number;

    if (range <= 100) step = 20;
    else if (range <= 500) step = 100;
    else if (range <= 1000) step = 200;
    else step = 500;

    const numRanges = Math.min(Math.ceil(range / step), 5);

    for (let i = 0; i < numRanges; i++) {
      const rangeMin = Math.floor(min + i * step);
      const rangeMax = i === numRanges - 1 ? Math.ceil(max) : Math.floor(min + (i + 1) * step);

      ranges.push({
        min: rangeMin,
        max: rangeMax,
        label: `$${rangeMin} - $${rangeMax}`,
        count: 0,
        selected: activeFilters.priceMin === rangeMin && activeFilters.priceMax === rangeMax,
      });
    }

    return ranges;
  }

  async refreshIndex(indexName?: string): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.indices.refresh({
        index: indexName || this.productsIndex
      });
    } catch (error) {
      this.logger.error(`Failed to refresh index: ${error.message}`);
    }
  }

  // Category indexing methods
  async indexCategory(category: any): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.index({
        index: this.categoriesIndex,
        id: category.id,
        document: category,
      });
    } catch (error) {
      this.logger.error(`Failed to index category ${category.id}: ${error.message}`);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.delete({
        index: this.categoriesIndex,
        id: categoryId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete category ${categoryId}: ${error.message}`);
    }
  }

  // Vendor indexing methods
  async indexVendor(vendor: any): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.index({
        index: this.vendorsIndex,
        id: vendor.id,
        document: vendor,
      });
    } catch (error) {
      this.logger.error(`Failed to index vendor ${vendor.id}: ${error.message}`);
    }
  }

  async deleteVendor(vendorId: string): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.delete({
        index: this.vendorsIndex,
        id: vendorId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete vendor ${vendorId}: ${error.message}`);
    }
  }
}
