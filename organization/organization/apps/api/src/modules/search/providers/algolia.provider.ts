import { Injectable, Logger } from '@nestjs/common';
import algoliasearch, { SearchClient } from 'algoliasearch';
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
 * Algolia Search Provider
 * Requires: npm install algoliasearch
 */
@Injectable()
export class AlgoliaProvider implements SearchProviderInterface {
  private readonly logger = new Logger(AlgoliaProvider.name);
  private client: SearchClient | null = null;
  private index: any | null = null;
  private readonly indexName = 'products';
  private available = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    const algoliaAppId = process.env.ALGOLIA_APP_ID;
    const algoliaApiKey = process.env.ALGOLIA_API_KEY;

    if (!algoliaAppId || !algoliaApiKey) {
      this.logger.warn(
        'Algolia credentials not provided. Falling back to internal search.',
      );
      this.available = false;
      return;
    }

    try {
      this.client = (algoliasearch as any)(algoliaAppId, algoliaApiKey);
      this.index = (this.client as any).initIndex(this.indexName);

      // Test connection
      await this.index.search('');
      this.available = true;
      this.logger.log('Algolia connection established');

      // Configure index settings
      await this.configureIndex();
    } catch (error) {
      this.logger.warn(
        `Algolia not available: ${error.message}. Falling back to internal search.`,
      );
      this.available = false;
      this.client = null;
      this.index = null;
    }
  }

  private async configureIndex() {
    if (!this.index) return;

    try {
      await this.index.setSettings({
        searchableAttributes: [
          'name',
          'description',
          'categoryName',
          'vendorName',
          'tags',
          'sku',
          'barcode',
        ],
        attributesForFaceting: [
          'filterOnly(categoryId)',
          'searchable(categoryName)',
          'filterOnly(vendorId)',
          'searchable(vendorName)',
          'tags',
          'inStock',
          'hasDiscount',
          'isNew',
        ],
        customRanking: ['desc(salesCount)', 'desc(avgRating)', 'desc(reviewCount)'],
        attributesToRetrieve: [
          'id',
          'name',
          'description',
          'price',
          'compareAtPrice',
          'sku',
          'barcode',
          'images',
          'categoryId',
          'categoryName',
          'categorySlug',
          'vendorId',
          'vendorName',
          'stock',
          'inStock',
          'tags',
          'attributes',
          'avgRating',
          'reviewCount',
          'salesCount',
          'createdAt',
          'updatedAt',
          'hasVariants',
          'variantCount',
          'variantOptions',
          'minVariantPrice',
          'maxVariantPrice',
        ],
        replicas: [
          `${this.indexName}_price_asc`,
          `${this.indexName}_price_desc`,
          `${this.indexName}_rating_desc`,
          `${this.indexName}_newest`,
        ],
      });

      this.logger.log('Algolia index settings configured');
    } catch (error) {
      this.logger.error(`Failed to configure index: ${error.message}`);
    }
  }

  getProviderName(): string {
    return 'Algolia';
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async indexProduct(product: ProductDocument): Promise<void> {
    if (!this.index || !this.available) return;

    try {
      await this.index.saveObject({
        objectID: product.id,
        ...this.transformProductForAlgolia(product),
      });
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}: ${error.message}`);
    }
  }

  async bulkIndexProducts(products: ProductDocument[]): Promise<void> {
    if (!this.index || !this.available) return;

    try {
      const objects = products.map((product) => ({
        objectID: product.id,
        ...this.transformProductForAlgolia(product),
      }));

      await this.index.saveObjects(objects);
      this.logger.log(`Bulk indexed ${products.length} products`);
    } catch (error) {
      this.logger.error(`Failed to bulk index products: ${error.message}`);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.index || !this.available) return;

    try {
      await this.index.deleteObject(productId);
    } catch (error) {
      this.logger.error(`Failed to delete product ${productId}: ${error.message}`);
    }
  }

  async updateProduct(
    productId: string,
    updates: Partial<ProductDocument>,
  ): Promise<void> {
    if (!this.index || !this.available) return;

    try {
      await this.index.partialUpdateObject({
        objectID: productId,
        ...this.transformProductForAlgolia(updates as ProductDocument),
      });
    } catch (error) {
      this.logger.error(`Failed to update product ${productId}: ${error.message}`);
    }
  }

  async searchProducts(params: SearchParams): Promise<SearchResults> {
    if (!this.index || !this.available) {
      throw new Error('Algolia is not available');
    }

    const {
      query = '',
      filters = {},
      sort = { field: 'relevance', order: 'desc' },
      page = 1,
      limit = 20,
      facets = [],
    } = params;

    // Build filters
    const filterStrings: string[] = [];

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      const categoryFilters = filters.categoryIds
        .map((id) => `categoryId:${id}`)
        .join(' OR ');
      filterStrings.push(`(${categoryFilters})`);
    }

    if (filters.vendorIds && filters.vendorIds.length > 0) {
      const vendorFilters = filters.vendorIds
        .map((id) => `vendorId:${id}`)
        .join(' OR ');
      filterStrings.push(`(${vendorFilters})`);
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const priceMin = filters.priceMin ?? 0;
      const priceMax = filters.priceMax ?? Number.MAX_SAFE_INTEGER;
      filterStrings.push(`price:${priceMin} TO ${priceMax}`);
    }

    if (filters.inStock) {
      filterStrings.push('inStock:true');
    }

    if (filters.minRating) {
      filterStrings.push(`avgRating >= ${filters.minRating}`);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagFilters = filters.tags.map((tag) => `tags:${tag}`).join(' OR ');
      filterStrings.push(`(${tagFilters})`);
    }

    if (filters.hasDiscount) {
      filterStrings.push('hasDiscount:true');
    }

    if (filters.isNew) {
      filterStrings.push('isNew:true');
    }

    // Attribute filters
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, values]) => {
        const attrFilters = values
          .map((value) => `attributes.${key}:${value}`)
          .join(' OR ');
        filterStrings.push(`(${attrFilters})`);
      });
    }

    const filterString = filterStrings.join(' AND ');

    // Determine index based on sort
    let indexToUse = this.indexName;
    switch (sort.field) {
      case 'price':
        indexToUse =
          sort.order === 'asc'
            ? `${this.indexName}_price_asc`
            : `${this.indexName}_price_desc`;
        break;
      case 'rating':
        indexToUse = `${this.indexName}_rating_desc`;
        break;
      case 'newest':
        indexToUse = `${this.indexName}_newest`;
        break;
      case 'name':
        // Algolia doesn't have built-in alphabetical sorting, use default
        break;
      default:
        // Relevance - use default index
        break;
    }

    // Build facets array
    const facetsList = facets.length > 0 ? facets : ['categoryName', 'vendorName', 'tags'];

    const startTime = Date.now();

    try {
      const searchIndex = (this.client as any)!.initIndex(indexToUse);
      const response = await searchIndex.search(query, {
        filters: filterString,
        page: page - 1, // Algolia uses 0-based pagination
        hitsPerPage: limit,
        facets: facetsList,
        maxValuesPerFacet: 50,
        facetingAfterDistinct: true,
      });

      const took = Date.now() - startTime;

      const products = response.hits.map((hit: any) => {
        const { objectID, ...rest } = hit;
        return { id: objectID, ...rest } as ProductDocument;
      });

      const total = response.nbHits;

      // Parse facets
      const searchFacets = this.parseFacets(response.facets, filters);

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
    if (!this.index || !this.available) {
      return { suggestions: [], products: [] };
    }

    try {
      const response = await this.index.search(query, {
        hitsPerPage: limit,
        attributesToRetrieve: [
          'id',
          'name',
          'images',
          'price',
          'categoryName',
        ],
      });

      const products = response.hits
        .slice(0, Math.floor(limit / 2))
        .map((hit: any) => ({
          id: hit.id,
          name: hit.name,
          slug: hit.id, // You should have slug in ProductDocument
          image: hit.images?.[0],
          price: hit.price,
          categoryName: hit.categoryName,
        }));

      // Get unique suggestions from product names and categories
      const uniqueNames = new Set<string>();
      response.hits.forEach((hit: any) => {
        if (hit.name) uniqueNames.add(hit.name);
        if (hit.categoryName) uniqueNames.add(hit.categoryName);
      });

      const suggestions = Array.from(uniqueNames)
        .slice(0, Math.floor(limit / 2))
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
    return this.searchProducts({ query, filters, limit: 0, facets: [] }).then(
      (res) => res.facets || {},
    );
  }

  private transformProductForAlgolia(product: ProductDocument): any {
    // Add computed fields
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const isNew = product.createdAt
      ? new Date().getTime() - new Date(product.createdAt).getTime() <
        30 * 24 * 60 * 60 * 1000
      : false;

    return {
      ...product,
      hasDiscount,
      isNew,
      _tags: product.tags || [],
    };
  }

  private parseFacets(facets: any, activeFilters: any): SearchFacets {
    const searchFacets: SearchFacets = {};

    if (facets?.categoryName) {
      searchFacets.categories = Object.entries(facets.categoryName).map(
        ([key, count]) => ({
          value: key,
          label: key,
          count: count as number,
          selected: activeFilters.categoryIds?.includes(key) || false,
        }),
      );
    }

    if (facets?.vendorName) {
      searchFacets.vendors = Object.entries(facets.vendorName).map(
        ([key, count]) => ({
          value: key,
          label: key,
          count: count as number,
          selected: activeFilters.vendorIds?.includes(key) || false,
        }),
      );
    }

    if (facets?.tags) {
      searchFacets.tags = Object.entries(facets.tags).map(([key, count]) => ({
        value: key,
        label: key,
        count: count as number,
        selected: activeFilters.tags?.includes(key) || false,
      }));
    }

    // Note: Algolia doesn't provide price range aggregations by default
    // You would need to implement this using facet stats or custom logic

    return searchFacets;
  }
}
