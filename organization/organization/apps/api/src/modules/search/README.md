# Elasticsearch Search Integration

Complete Elasticsearch search integration for the Broxiva platform with advanced features including full-text search, autocomplete, faceted search, and intelligent ranking.

## Features

### 1. Full-Text Search
- **Multi-field search** across products, categories, and vendors
- **Field boosting** for relevance (name^5, sku^4, category^2, description)
- **Fuzzy matching** with AUTO fuzziness for typo tolerance
- **Prefix matching** for partial word searches

### 2. Search Indexing
- **Automatic indexing** via event listeners when products are created/updated/deleted
- **Bulk indexing** for efficient batch operations
- **Incremental sync** for changed products only
- **Scheduled sync** every 5 minutes (configurable)

### 3. Autocomplete & Suggestions
- **Multi-index autocomplete** across products, categories, and vendors
- **Type-ahead** with edge n-gram tokenization
- **Popular searches** tracking and display
- **Trending searches** based on recent activity

### 4. Faceted Search (Filters)
- **Category facets** with product counts
- **Vendor/Brand facets** with product counts
- **Price range facets** with smart bucketing
- **Rating facets** (4+, 3+, 2+, 1+)
- **Tag facets** for product tags
- **In-stock filter** with availability counts
- **Discount filter** for products on sale
- **Dynamic attribute filters** (color, size, etc.)

### 5. Search Result Ranking
- **Relevance scoring** with multi-match query
- **Popularity boosting** based on:
  - Sales count (logarithmic factor 1.2)
  - Average rating (square root factor 1.5)
  - Review count (logarithmic factor 1.1)
- **Function score queries** for composite ranking

### 6. Category & Vendor Search
- **Separate indices** for categories and vendors
- **Enhanced autocomplete** with entity type detection
- **Product count aggregations** for each category/vendor

## Architecture

### Providers
- `elasticsearch.provider.ts` - Basic Elasticsearch provider
- `elasticsearch-enhanced.provider.ts` - Advanced provider with ranking and multi-entity search
- `algolia.provider.ts` - Alternative Algolia provider
- `internal.provider.ts` - Fallback database provider
- `search-provider.factory.ts` - Provider factory with auto-detection

### Services
- `search.service.ts` - Main search service with all search operations
- `search-indexing.service.ts` - Product indexing and synchronization
- `category-vendor-indexing.service.ts` - Category and vendor indexing

### Controllers
- `search.controller.ts` - Public search endpoints
- `search-admin.controller.ts` - Basic admin endpoints
- `search-admin-enhanced.controller.ts` - Advanced admin endpoints

### Event Listeners
- `product-search.listener.ts` - Auto-indexing on product events

## Environment Variables

```bash
# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
ELASTICSEARCH_REQUEST_TIMEOUT=30000
ELASTICSEARCH_BULK_SIZE=1000
ELASTICSEARCH_INDEX_PREFIX=broxiva

# Search Provider Selection
SEARCH_PROVIDER=auto  # Options: elasticsearch, algolia, internal, auto

# Auto-sync Configuration
DISABLE_SEARCH_AUTO_SYNC=false  # Set to true to disable scheduled sync
```

## API Endpoints

### Public Search Endpoints

#### Search Products
```
GET /search/products
Query Parameters:
  - query: Search query string
  - categoryIds: Category IDs (array)
  - vendorIds: Vendor IDs (array)
  - priceMin: Minimum price
  - priceMax: Maximum price
  - minRating: Minimum rating (1-5)
  - inStock: Filter by stock availability
  - tags: Product tags (array)
  - hasDiscount: Filter products on sale
  - isNew: Filter products from last 30 days
  - sortBy: relevance|price|rating|sales|newest|name
  - sortOrder: asc|desc
  - page: Page number
  - limit: Results per page
  - facets: Facets to return (array)
```

#### Autocomplete
```
GET /search/autocomplete
Query Parameters:
  - query: Search query (min 2 characters)
  - limit: Number of suggestions (default: 10)
```

#### Search Facets
```
GET /search/facets
Query Parameters:
  - query: Search query
  - filters: JSON string of active filters
```

#### Popular Searches
```
GET /search/popular
Query Parameters:
  - limit: Number of searches (default: 10)
  - categoryId: Filter by category
```

#### Trending Searches
```
GET /search/trending
Query Parameters:
  - limit: Number of searches (default: 10)
```

### Admin Endpoints (Requires ADMIN role)

#### Rebuild Product Index
```
POST /admin/search/index/products/rebuild
Query Parameters:
  - deleteFirst: Delete existing index before rebuild (boolean)
  - batchSize: Batch size for indexing (default: 1000)
```

#### Incremental Sync
```
POST /admin/search/index/products/sync
```

#### Index Specific Products
```
POST /admin/search/index/products/batch
Body: { productIds: string[] }
```

#### Rebuild Category Index
```
POST /admin/search/index/categories/rebuild
```

#### Rebuild Vendor Index
```
POST /admin/search/index/vendors/rebuild
```

#### Rebuild All Indices
```
POST /admin/search/index/rebuild-all
Query Parameters:
  - deleteFirst: Delete existing indices (boolean)
  - batchSize: Batch size for indexing
```

#### Get Indexing Status
```
GET /admin/search/status
```

#### Verify Index Health
```
GET /admin/search/health
```

#### Get Index Statistics
```
GET /admin/search/stats
```

#### Test Search
```
GET /admin/search/test
Query Parameters:
  - query: Test query string
```

#### Refresh Index
```
POST /admin/search/index/refresh
```

## Index Configuration

### Products Index
- **Shards**: 2
- **Replicas**: 1
- **Analyzers**:
  - `autocomplete`: Edge n-gram tokenizer (2-20 chars)
  - `standard_english`: Standard analyzer with English stopwords
- **Fields**:
  - name, description, price, category, vendor
  - stock, ratings, reviews, sales
  - variants, tags, attributes

### Categories Index
- **Shards**: 1
- **Replicas**: 1
- **Fields**:
  - name, slug, description
  - parentId, productCount, level

### Vendors Index
- **Shards**: 1
- **Replicas**: 1
- **Fields**:
  - name, slug, description
  - productCount, avgRating

## Usage Examples

### Basic Product Search
```typescript
const results = await searchService.searchProducts({
  query: 'laptop',
  page: 1,
  limit: 20,
});
```

### Search with Filters
```typescript
const results = await searchService.searchProducts({
  query: 'laptop',
  filters: {
    categoryIds: ['cat-123'],
    priceMin: 500,
    priceMax: 2000,
    minRating: 4,
    inStock: true,
  },
  sortBy: 'price',
  sortOrder: 'asc',
  page: 1,
  limit: 20,
  facets: ['categories', 'vendors', 'price', 'ratings'],
});
```

### Autocomplete
```typescript
const suggestions = await searchService.getAutocomplete({
  query: 'lap',
  limit: 10,
});

// Returns:
// {
//   suggestions: [
//     { text: 'Laptop', type: 'category', count: 150 },
//     { text: 'Laptop Accessories', type: 'category', count: 80 }
//   ],
//   products: [
//     { id: '123', name: 'MacBook Pro', price: 1999, ... }
//   ]
// }
```

### Manual Indexing
```typescript
// Index single product
await searchService.indexProduct('product-123');

// Bulk index products
await searchService.bulkIndexProducts(['prod-1', 'prod-2', 'prod-3']);

// Full reindex
await searchIndexingService.reindexAll({
  deleteExisting: true,
  batchSize: 1000,
});
```

## Event-Driven Indexing

The system automatically indexes products when they are created, updated, or deleted:

```typescript
// Emit events in your product service
this.eventEmitter.emit('product.created', new ProductCreatedEvent(product.id));
this.eventEmitter.emit('product.updated', new ProductUpdatedEvent(product.id));
this.eventEmitter.emit('product.deleted', new ProductDeletedEvent(product.id));
```

## Performance Optimization

### Bulk Operations
- Use bulk indexing for multiple products
- Configure batch size based on available memory
- Default batch size: 1000 products

### Incremental Sync
- Runs every 5 minutes by default
- Only indexes changed products
- Significantly faster than full reindex

### Caching
- Provider instances are cached
- Elasticsearch connection pooling
- Query result caching (can be added)

### Index Optimization
- Refresh interval: 30s (balance between search and indexing)
- Max result window: 10,000
- Compression enabled for storage efficiency

## Monitoring & Maintenance

### Health Checks
```typescript
const health = await searchIndexingService.verifyIndexHealth();
// Returns: { healthy, databaseCount, indexCount, difference }
```

### Index Statistics
```typescript
const stats = await provider.getIndexStats();
// Returns: { documentCount, storeSizeBytes, ... }
```

### Scheduled Tasks
- Incremental sync: Every 5 minutes
- Can be disabled: `DISABLE_SEARCH_AUTO_SYNC=true`

## Troubleshooting

### Connection Issues
- Verify `ELASTICSEARCH_NODE` is accessible
- Check authentication credentials
- Increase `ELASTICSEARCH_REQUEST_TIMEOUT` if needed

### Indexing Failures
- Check Elasticsearch logs
- Verify mapping compatibility
- Increase bulk size for memory issues
- Run health check to detect inconsistencies

### Search Quality
- Adjust field boosting in query
- Tune fuzziness settings
- Modify popularity scoring factors
- Add custom synonyms to analyzer

### Performance Issues
- Increase number of shards for large datasets
- Add replicas for read-heavy workloads
- Optimize query filters (move to filter context)
- Enable query caching

## Migration Guide

### Initial Setup
1. Install Elasticsearch 8.x
2. Configure environment variables
3. Start the API server
4. Run full reindex: `POST /admin/search/index/rebuild-all?deleteFirst=true`
5. Verify health: `GET /admin/search/health`

### From Database Search
1. Set `SEARCH_PROVIDER=auto` (will auto-detect Elasticsearch)
2. Run initial indexing
3. Test search functionality
4. Monitor performance
5. Disable database search once satisfied

### Upgrading Index Schema
1. Create new index with updated mapping
2. Reindex data to new index
3. Update index alias
4. Delete old index

## Best Practices

1. **Use faceted search** to improve user experience
2. **Implement autocomplete** for faster product discovery
3. **Track search analytics** to understand user behavior
4. **Monitor index health** regularly
5. **Schedule reindexing** during low-traffic periods
6. **Use incremental sync** for real-time updates
7. **Test search quality** with real user queries
8. **Optimize relevance** based on analytics

## Support

For issues or questions:
- Check Elasticsearch logs
- Review API error responses
- Run health and status checks
- Consult Elasticsearch documentation
- Contact development team
