# Advanced Search & Filters System Documentation

## Overview

CitadelBuy's Advanced Search & Filters System provides a powerful, scalable search solution with support for multiple search providers (Elasticsearch, Algolia, Internal PostgreSQL), faceted filtering, autocomplete, and comprehensive search analytics.

## Architecture

### Provider Abstraction Layer

The system uses a provider pattern to support multiple search backends:

```
SearchProviderInterface
    ├── ElasticsearchProvider (Elasticsearch 8.x)
    ├── AlgoliaProvider (Algolia Search)
    └── InternalProvider (PostgreSQL full-text search)
```

The `SearchProviderFactory` automatically selects the best available provider based on:
1. Environment configuration (`SEARCH_PROVIDER` env var)
2. Provider availability (credentials, connectivity)
3. Fallback priority: Elasticsearch > Algolia > Internal

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   Search Controller                      │
│  - Product Search       - Provider Management           │
│  - Autocomplete         - Index Management              │
│  - Facets              - Analytics                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Search Service                         │
│  - DTO Transformation    - Search Tracking              │
│  - Provider Selection    - Analytics                    │
│  - Result Enrichment     - Saved Searches               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Search Provider Factory                     │
│  Auto-detect and select best provider                   │
└─────────────────┬──────────────┬──────────────┬─────────┘
                  │              │              │
          ┌───────▼──┐    ┌──────▼──────┐  ┌───▼─────────┐
          │   ES     │    │   Algolia   │  │  Internal   │
          │ Provider │    │  Provider   │  │  Provider   │
          └──────────┘    └─────────────┘  └─────────────┘
```

## Features

### 1. Multi-Provider Support

#### Elasticsearch Provider
- **Best for**: Large-scale deployments, complex queries
- **Features**:
  - Edge n-gram tokenization for autocomplete
  - Multi-match queries with field boosting
  - Fuzzy matching for typo tolerance
  - Aggregations for faceted search
  - Real-time indexing

#### Algolia Provider
- **Best for**: Fast autocomplete, managed service
- **Features**:
  - Sub-millisecond search latency
  - Typo tolerance
  - Geo-search capabilities
  - Managed infrastructure
  - Custom ranking

#### Internal Provider
- **Best for**: Small deployments, no external dependencies
- **Features**:
  - PostgreSQL full-text search
  - No external services required
  - Works out of the box
  - Cost-effective

### 2. Faceted Search

Support for dynamic filtering by:
- **Categories**: Multi-select category filtering
- **Vendors**: Filter by seller
- **Price Ranges**: Dynamic price bucketing
- **Ratings**: Filter by minimum rating
- **Tags**: Custom product tags
- **Attributes**: Dynamic product attributes (color, size, brand, etc.)
- **Stock Status**: In-stock/out-of-stock
- **Discounts**: Products with/without discounts
- **New Products**: Last 30 days

### 3. Advanced Autocomplete

- **Keyword Suggestions**: Based on product names and searches
- **Product Suggestions**: Top matching products with images
- **Category Suggestions**: Related categories
- **Popular Searches**: Trending and frequently searched terms
- **Typo Tolerance**: Fuzzy matching for misspellings

### 4. Sorting Options

- **Relevance**: Best match (default)
- **Price**: Low to high, high to low
- **Rating**: Highest rated first
- **Sales**: Best sellers
- **Newest**: Recently added products
- **Alphabetical**: A-Z, Z-A

### 5. Search Analytics

- **Search Tracking**: Query, filters, results count
- **Click Tracking**: Which results users click
- **Conversion Tracking**: Searches that lead to purchases
- **Popular Searches**: Most searched terms
- **Trending Searches**: Recent search trends
- **User Search History**: Per-user search history
- **Saved Searches**: Users can save frequent searches

## Installation

### 1. Install Dependencies

```bash
# Core dependencies (already installed)
npm install

# Optional: Elasticsearch support
npm install @elastic/elasticsearch

# Optional: Algolia support
npm install algoliasearch
```

### 2. Environment Configuration

```env
# Search Provider Selection
# Options: 'auto' | 'elasticsearch' | 'algolia' | 'internal'
# Default: 'auto' (auto-detect best available)
SEARCH_PROVIDER=auto

# Elasticsearch Configuration (Optional)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme

# Algolia Configuration (Optional)
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_admin_api_key
```

### 3. Running Elasticsearch (Docker)

```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

## API Endpoints

### Search Products

```http
GET /search/products?query=laptop&categoryIds=cat-123&priceMin=100&priceMax=1000
```

**Query Parameters:**
- `query` (string): Search query
- `categoryIds` (string[]): Category IDs (comma-separated)
- `vendorIds` (string[]): Vendor IDs (comma-separated)
- `priceMin` (number): Minimum price
- `priceMax` (number): Maximum price
- `minRating` (number): Minimum rating (1-5)
- `inStock` (boolean): Only in-stock products
- `tags` (string[]): Product tags (comma-separated)
- `attributes` (object): Product attributes JSON (e.g., `{"color": ["red", "blue"]}`)
- `hasDiscount` (boolean): Only discounted products
- `isNew` (boolean): Only new products (last 30 days)
- `facets` (string[]): Facets to include (comma-separated)
- `sortBy` (string): Sort field (`relevance`, `price`, `rating`, `sales`, `newest`, `name`)
- `sortOrder` (string): Sort order (`asc`, `desc`)
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)

**Response:**
```json
{
  "products": [
    {
      "id": "prod-123",
      "name": "Wireless Headphones",
      "description": "Premium noise-canceling headphones",
      "price": 99.99,
      "compareAtPrice": 129.99,
      "images": ["https://..."],
      "categoryId": "cat-123",
      "categoryName": "Electronics",
      "vendorId": "vendor-456",
      "vendorName": "TechStore Inc.",
      "stock": 50,
      "inStock": true,
      "avgRating": 4.5,
      "reviewCount": 120
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "facets": {
    "categories": [
      {"value": "cat-123", "label": "Electronics", "count": 42, "selected": true}
    ],
    "priceRanges": [
      {"min": 0, "max": 50, "label": "$0 - $50", "count": 25}
    ],
    "vendors": [...],
    "ratings": [...],
    "tags": [...]
  },
  "took": 45,
  "provider": "Elasticsearch"
}
```

### Autocomplete

```http
GET /search/autocomplete?query=laptop&limit=10
```

**Response:**
```json
{
  "suggestions": [
    {"text": "laptop stand", "type": "keyword", "count": 150},
    {"text": "gaming laptop", "type": "keyword", "count": 89}
  ],
  "products": [
    {
      "id": "prod-123",
      "name": "Dell XPS 13 Laptop",
      "slug": "dell-xps-13",
      "image": "https://...",
      "price": 999.99,
      "categoryName": "Computers"
    }
  ],
  "provider": "Elasticsearch"
}
```

### Get Search Facets

```http
GET /search/facets?query=laptop&filters={"categoryIds":["cat-123"]}
```

**Response:**
```json
{
  "categories": [...],
  "vendors": [...],
  "priceRanges": [...],
  "ratings": [...],
  "tags": [...]
}
```

### Index Management (Admin Only)

```http
# Index single product
POST /search/index/product/:productId
Authorization: Bearer <token>

# Bulk index products
POST /search/index/bulk
Authorization: Bearer <token>
Body: { "productIds": ["prod-1", "prod-2"] } // Optional, indexes all if not provided

# Delete product from index
DELETE /search/index/product/:productId
Authorization: Bearer <token>

# Update product in index
PUT /search/index/product/:productId
Authorization: Bearer <token>
```

### Provider Information

```http
# Get current provider
GET /search/provider

# Get all available providers
GET /search/providers
```

**Response:**
```json
[
  {"name": "Elasticsearch", "type": "elasticsearch", "available": true},
  {"name": "Algolia", "type": "algolia", "available": false},
  {"name": "Internal", "type": "internal", "available": true}
]
```

### Search Analytics

```http
# Get popular searches
GET /search/popular?limit=10&categoryId=cat-123

# Get trending searches (last 7 days)
GET /search/trending?limit=10

# Get user search history
GET /search/history?limit=20
Authorization: Bearer <token>

# Clear search history
DELETE /search/history
Authorization: Bearer <token>

# Get search analytics (Admin)
GET /search/analytics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

## Usage Examples

### Frontend Integration

```typescript
// Search products
const searchProducts = async (query: string) => {
  const params = new URLSearchParams({
    query,
    categoryIds: 'cat-123,cat-456',
    priceMin: '100',
    priceMax: '500',
    sortBy: 'relevance',
    page: '1',
    limit: '20',
    facets: 'categories,vendors,price,ratings'
  });

  const response = await fetch(`/search/products?${params}`);
  const data = await response.json();

  console.log('Results:', data.products);
  console.log('Facets:', data.facets);
  console.log('Provider:', data.provider);
};

// Autocomplete
const autocomplete = async (query: string) => {
  const response = await fetch(`/search/autocomplete?query=${query}&limit=10`);
  const data = await response.json();

  console.log('Suggestions:', data.suggestions);
  console.log('Products:', data.products);
};

// Track search
const trackSearch = async (query: string, resultsCount: number) => {
  await fetch('/search/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      resultsCount,
      filters: {},
      sessionId: 'session-123'
    })
  });
};
```

### Backend Service Usage

```typescript
import { SearchService } from './modules/search/search.service';

@Injectable()
export class ProductService {
  constructor(private searchService: SearchService) {}

  async onProductCreated(productId: string) {
    // Index product for search
    await this.searchService.indexProduct(productId);
  }

  async onProductUpdated(productId: string) {
    // Update product in search index
    await this.searchService.updateProductInIndex(productId);
  }

  async onProductDeleted(productId: string) {
    // Remove from search index
    await this.searchService.deleteProductFromIndex(productId);
  }

  async reindexAll() {
    // Reindex all products
    const result = await this.searchService.bulkIndexProducts();
    console.log(`Indexed ${result.indexed} products using ${result.provider}`);
  }
}
```

## Performance Optimization

### Indexing Strategy

**Real-time Indexing (Recommended)**
```typescript
// Automatically index products on create/update
@OnEvent('product.created')
async handleProductCreated(payload: { productId: string }) {
  await this.searchService.indexProduct(payload.productId);
}
```

**Batch Indexing**
```bash
# Manual reindex via API
curl -X POST http://localhost:3000/search/index/bulk \
  -H "Authorization: Bearer <token>"
```

**Scheduled Reindexing**
```typescript
@Cron('0 2 * * *') // Daily at 2 AM
async scheduledReindex() {
  await this.searchService.bulkIndexProducts();
}
```

### Caching

The system uses provider-level caching:
- **Elasticsearch**: 15-minute TTL cache
- **Algolia**: Managed by Algolia
- **Internal**: Database query cache

### Query Optimization

1. **Use specific filters** instead of broad queries
2. **Limit facets** to only needed ones
3. **Paginate results** (max 100 per page)
4. **Enable autocomplete debouncing** (300ms recommended)

## Monitoring

### Health Checks

```http
GET /health
```

Includes search provider status:
```json
{
  "search": {
    "provider": "Elasticsearch",
    "status": "healthy",
    "responseTime": 45
  }
}
```

### Metrics

Track these key metrics:
- **Search Latency**: Time to return results
- **Index Size**: Number of indexed products
- **Query Volume**: Searches per minute
- **Conversion Rate**: % of searches leading to purchases
- **Popular Queries**: Most searched terms

## Troubleshooting

### Elasticsearch not connecting

**Error**: `Elasticsearch not available: ECONNREFUSED`

**Solution**:
1. Verify Elasticsearch is running: `docker ps | grep elasticsearch`
2. Check connection: `curl http://localhost:9200`
3. Verify credentials in `.env` file

### Products not appearing in search

**Causes**:
1. Products not indexed
2. Index mapping issues
3. Provider not available

**Solutions**:
```bash
# Check current provider
curl http://localhost:3000/search/provider

# Reindex all products
curl -X POST http://localhost:3000/search/index/bulk \
  -H "Authorization: Bearer <token>"

# Check Elasticsearch index
curl http://localhost:9200/products/_count
```

### Slow search performance

**Optimizations**:
1. Use Elasticsearch or Algolia instead of Internal provider
2. Reduce facet count
3. Add query caching
4. Optimize Elasticsearch mappings
5. Scale Elasticsearch cluster

## Development

### Adding a New Search Provider

1. **Create Provider Class**
```typescript
// src/modules/search/providers/custom.provider.ts
@Injectable()
export class CustomProvider implements SearchProviderInterface {
  getProviderName(): string { return 'Custom'; }
  async isAvailable(): Promise<boolean> { /* ... */ }
  async searchProducts(params: SearchParams): Promise<SearchResults> { /* ... */ }
  // ... implement all interface methods
}
```

2. **Register in Factory**
```typescript
// src/modules/search/providers/search-provider.factory.ts
async createProvider(type: SearchProviderType): Promise<SearchProviderInterface> {
  switch (type) {
    case 'custom':
      return new CustomProvider();
    // ...
  }
}
```

### Testing

```bash
# Run tests
npm test src/modules/search

# Test specific provider
npm test src/modules/search/providers/elasticsearch.provider.spec.ts

# Integration tests
npm run test:e2e -- --grep "Search"
```

## Migration Guide

### From Basic Search to Advanced Search

1. **Backup existing search data**
```sql
SELECT * FROM search_queries INTO OUTFILE '/backup/search_queries.csv';
```

2. **Install dependencies** (if using Elasticsearch/Algolia)
3. **Set environment variables**
4. **Run initial indexing**
```bash
curl -X POST http://localhost:3000/search/index/bulk \
  -H "Authorization: Bearer <admin-token>"
```

5. **Update frontend** to use new search parameters
6. **Monitor performance** and adjust settings

## Security

### API Rate Limiting

Search endpoints are rate-limited:
- **Public endpoints**: 100 requests/minute
- **Authenticated endpoints**: 500 requests/minute
- **Admin endpoints**: 1000 requests/minute

### Input Sanitization

All search queries are sanitized to prevent:
- SQL injection
- NoSQL injection
- XSS attacks
- Regular expression DoS

### Access Control

- **Public**: Search, autocomplete, facets
- **Authenticated**: Search history, saved searches
- **Admin**: Index management, analytics

## Best Practices

1. **Always specify facets** to reduce response size
2. **Use autocomplete** for better UX
3. **Track searches** for analytics
4. **Reindex periodically** (daily/weekly)
5. **Monitor provider health**
6. **Use appropriate provider** for your scale
7. **Cache frequently searched terms**
8. **Implement search suggestions**
9. **A/B test ranking algorithms**
10. **Analyze user search patterns**

## Support

For issues or questions:
- Check logs: `docker logs citadelbuy-backend`
- Review documentation above
- Contact development team

---

**Version**: 2.0.0
**Last Updated**: 2024
**Status**: ✅ Production Ready
