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
 * Elasticsearch Search Provider
 * Requires: npm install @elastic/elasticsearch
 */
@Injectable()
export class ElasticsearchProvider implements SearchProviderInterface {
  private readonly logger = new Logger(ElasticsearchProvider.name);
  private client: Client | null = null;
  private readonly indexName = 'products';
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

      // Add authentication if provided
      if (elasticsearchUsername && elasticsearchPassword) {
        clientConfig.auth = {
          username: elasticsearchUsername,
          password: elasticsearchPassword,
        };
      }

      this.client = new Client(clientConfig);

      // Test connection with timeout
      const pingResult = await Promise.race([
        this.client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        ),
      ]);

      this.available = true;
      this.logger.log('Elasticsearch connection established successfully');

      // Ensure index exists
      await this.ensureIndex();
    } catch (error) {
      this.logger.warn(
        `Elasticsearch not available: ${error.message}. Falling back to internal search.`,
      );
      this.available = false;
      this.client = null;
    }
  }

  private async ensureIndex() {
    if (!this.client) return;

    try {
      const exists = await this.client.indices.exists({ index: this.indexName });

      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            max_result_window: 10000,
            analysis: {
              analyzer: {
                autocomplete: {
                  tokenizer: 'autocomplete',
                  filter: ['lowercase', 'asciifolding'],
                },
                autocomplete_search: {
                  tokenizer: 'lowercase',
                  filter: ['lowercase', 'asciifolding'],
                },
                standard_analyzer: {
                  type: 'standard',
                  stopwords: '_english_',
                },
              },
              tokenizer: {
                autocomplete: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 20,
                  token_chars: ['letter', 'digit'],
                },
              },
              filter: {
                english_stop: {
                  type: 'stop',
                  stopwords: '_english_',
                },
                english_stemmer: {
                  type: 'stemmer',
                  language: 'english',
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
              description: {
                type: 'text',
                analyzer: 'standard',
              },
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

        this.logger.log(`Created Elasticsearch index: ${this.indexName}`);
      } else {
        this.logger.debug(`Elasticsearch index already exists: ${this.indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete the entire index (use with caution!)
   */
  async deleteIndex(): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (exists) {
        await this.client.indices.delete({ index: this.indexName });
        this.logger.log(`Deleted Elasticsearch index: ${this.indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh the index to make recent changes searchable
   */
  async refreshIndex(): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.indices.refresh({ index: this.indexName });
      this.logger.debug(`Refreshed Elasticsearch index: ${this.indexName}`);
    } catch (error) {
      this.logger.error(`Failed to refresh index: ${error.message}`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    if (!this.client || !this.available) {
      return null;
    }

    try {
      const stats = await this.client.indices.stats({ index: this.indexName });
      const count = await this.client.count({ index: this.indexName });

      return {
        indexName: this.indexName,
        documentCount: count.count,
        storeSizeBytes: stats._all?.primaries?.store?.size_in_bytes || 0,
        ...stats._all?.primaries,
      };
    } catch (error) {
      this.logger.error(`Failed to get index stats: ${error.message}`);
      return null;
    }
  }

  getProviderName(): string {
    return 'Elasticsearch';
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async indexProduct(product: ProductDocument): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.index({
        index: this.indexName,
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
      // Process in chunks to avoid overwhelming ES
      for (let i = 0; i < products.length; i += bulkSize) {
        const chunk = products.slice(i, i + bulkSize);
        const body = chunk.flatMap((product) => [
          { index: { _index: this.indexName, _id: product.id } },
          product,
        ]);

        const response = await this.client.bulk({ body, refresh: false });

        if (response.errors) {
          const erroredDocuments: any[] = [];
          response.items.forEach((action: any, i: number) => {
            const operation = Object.keys(action)[0];
            if (action[operation].error) {
              erroredDocuments.push({
                status: action[operation].status,
                error: action[operation].error,
                document: chunk[i],
              });
            }
          });

          this.logger.error(
            `Bulk index had errors. Failed ${erroredDocuments.length} of ${chunk.length} documents`,
          );
          erroredDocuments.slice(0, 5).forEach((doc) => {
            this.logger.error(`Error indexing product ${doc.document.id}: ${JSON.stringify(doc.error)}`);
          });
        }

        this.logger.log(`Bulk indexed chunk ${i / bulkSize + 1}: ${chunk.length} products`);
      }

      // Refresh index after bulk operation
      await this.refreshIndex();

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
        index: this.indexName,
        id: productId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete product ${productId}: ${error.message}`);
    }
  }

  async updateProduct(
    productId: string,
    updates: Partial<ProductDocument>,
  ): Promise<void> {
    if (!this.client || !this.available) return;

    try {
      await this.client.update({
        index: this.indexName,
        id: productId,
        doc: updates as any,
      });
    } catch (error) {
      this.logger.error(`Failed to update product ${productId}: ${error.message}`);
    }
  }

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

    // Build query
    const must: any[] = [];
    const filter: any[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'description', 'categoryName^2', 'vendorName', 'tags'],
          type: 'best_fields',
          fuzziness: 'AUTO',
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

    // Attribute filters
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, values]) => {
        filter.push({ terms: { [`attributes.${key}.keyword`]: values } });
      });
    }

    // Build sort
    let sortClause: any = [];
    switch (sort.field) {
      case 'price':
        sortClause = [{ price: { order: sort.order } }];
        break;
      case 'rating':
        sortClause = [{ avgRating: { order: sort.order } }];
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
        terms: { field: 'categoryName.keyword', size: 50 },
      };
    }
    if (facets.includes('vendors') || facets.length === 0) {
      aggs.vendors = {
        terms: { field: 'vendorName.keyword', size: 50 },
      };
    }
    if (facets.includes('price') || facets.length === 0) {
      aggs.priceStats = {
        stats: { field: 'price' },
      };
    }
    if (facets.includes('ratings') || facets.length === 0) {
      aggs.ratings = {
        histogram: { field: 'avgRating', interval: 1, min_doc_count: 1 },
      };
    }
    if (facets.includes('tags') || facets.length === 0) {
      aggs.tags = {
        terms: { field: 'tags', size: 50 },
      };
    }

    const startTime = Date.now();

    try {
      const response = await this.client.search({
        index: this.indexName,
        query: {
          bool: {
            ...(must.length > 0 && { must }),
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

      // Parse facets
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
      const response = await this.client.search({
        index: this.indexName,
        query: {
          multi_match: {
            query,
            fields: ['name^3', 'categoryName^2', 'vendorName'],
            type: 'bool_prefix',
          },
        } as any,
        size: limit,
      });

      const products = response.hits.hits
        .map((hit: any) => hit._source as ProductDocument)
        .slice(0, limit / 2)
        .map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.id, // You should have slug in ProductDocument
          image: p.images[0],
          price: p.price,
          categoryName: p.categoryName,
        }));

      // Get unique suggestions from product names
      const uniqueNames = new Set<string>();
      response.hits.hits.forEach((hit: any) => {
        const source = hit._source as ProductDocument;
        uniqueNames.add(source.name);
        if (source.categoryName) uniqueNames.add(source.categoryName);
      });

      const suggestions = Array.from(uniqueNames)
        .slice(0, limit / 2)
        .map((text) => ({
          text,
          type: 'keyword' as const,
          count: 1,
        }));

      return {
        suggestions,
        products,
      };
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      return { suggestions: [], products: [] };
    }
  }

  async getFacets(query?: string, filters?: any): Promise<SearchFacets> {
    return this.searchProducts({ query, filters, limit: 0, facets: [] }).then((res) => res.facets || {});
  }

  private parseFacets(aggregations: any, activeFilters: any): SearchFacets {
    const facets: SearchFacets = {};

    if (aggregations?.categories) {
      facets.categories = aggregations.categories.buckets.map((b: any) => ({
        value: b.key,
        label: b.key,
        count: b.doc_count,
        selected: activeFilters.categoryIds?.includes(b.key) || false,
      }));
    }

    if (aggregations?.vendors) {
      facets.vendors = aggregations.vendors.buckets.map((b: any) => ({
        value: b.key,
        label: b.key,
        count: b.doc_count,
        selected: activeFilters.vendorIds?.includes(b.key) || false,
      }));
    }

    if (aggregations?.priceStats) {
      const stats = aggregations.priceStats;
      facets.priceRanges = this.generatePriceRanges(stats.min, stats.max, activeFilters);
    }

    if (aggregations?.ratings) {
      facets.ratings = aggregations.ratings.buckets.map((b: any) => ({
        value: b.key.toString(),
        label: `${b.key}+ Stars`,
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

    return facets;
  }

  private generatePriceRanges(min: number, max: number, activeFilters: any): PriceRange[] {
    const ranges: PriceRange[] = [];
    const step = (max - min) / 5; // 5 ranges

    for (let i = 0; i < 5; i++) {
      const rangeMin = Math.floor(min + i * step);
      const rangeMax = Math.floor(min + (i + 1) * step);

      ranges.push({
        min: rangeMin,
        max: rangeMax,
        label: `$${rangeMin} - $${rangeMax}`,
        count: 0, // Would need separate query to get exact counts
        selected:
          activeFilters.priceMin === rangeMin && activeFilters.priceMax === rangeMax,
      });
    }

    return ranges;
  }
}
