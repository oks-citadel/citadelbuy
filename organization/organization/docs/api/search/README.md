# Search Module - Elasticsearch Integration

Complete search implementation for Broxiva e-commerce platform with Elasticsearch, Algolia, and internal fallback support.

## Features

### Core Search Features
- **Full-text search** across products with fuzzy matching
- **Faceted search** with aggregations (categories, vendors, price ranges, ratings)
- **Autocomplete/suggestions** with edge n-gram tokenization
- **Advanced filtering** (category, price, brand, ratings, stock status)
- **Sorting** by relevance, price, rating, sales, date
- **Pagination** with configurable page size
- **Search history tracking** and analytics
- **Popular searches** and trending queries
- **Saved searches** with notifications

### Provider Architecture
The module supports multiple search providers with automatic fallback:

1. **Elasticsearch** (Primary) - Advanced full-text search
2. **Algolia** (Alternative) - Fast cloud-based search
3. **Internal** (Fallback) - PostgreSQL-based search

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Search Provider Selection
# Options: 'elasticsearch', 'algolia', 'internal', 'auto'
SEARCH_PROVIDER=auto

# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_INDEX_PREFIX=broxiva
ELASTICSEARCH_BULK_SIZE=1000
ELASTICSEARCH_REQUEST_TIMEOUT=30000

# Algolia Configuration (optional)
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_api_key
ALGOLIA_INDEX_NAME=broxiva_products

# OpenAI for Semantic Search (optional)
OPENAI_API_KEY=sk-...
```

### Running Elasticsearch

#### Using Docker

```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

#### Verify Connection

```bash
curl http://localhost:9200
```

## Index Management

### CLI Commands

```bash
# Index all products
npm run cli search:index

# Rebuild index from scratch
npm run cli search:index --rebuild

# Show index statistics
npm run cli search:index --stats
```

### Admin API Endpoints

All endpoints require `ADMIN` or `SUPER_ADMIN` role.

#### Rebuild Index
```http
POST /api/admin/search/index/rebuild?deleteFirst=true
Authorization: Bearer <token>
```

#### Index Specific Products
```http
POST /api/admin/search/index/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "productIds": ["prod_123", "prod_456"]
}
```

#### Get Index Statistics
```http
GET /api/admin/search/stats
Authorization: Bearer <token>
```

#### Test Search
```http
GET /api/admin/search/test?query=laptop
Authorization: Bearer <token>
```

#### Get Provider Information
```http
GET /api/admin/search/provider
Authorization: Bearer <token>
```

## API Usage

### Search Products

```http
POST /api/search/products
Content-Type: application/json

{
  "query": "laptop",
  "categoryIds": ["cat_123"],
  "priceMin": 500,
  "priceMax": 2000,
  "minRating": 4,
  "inStock": true,
  "sortBy": "relevance",
  "sortOrder": "desc",
  "page": 1,
  "limit": 20,
  "facets": ["categories", "vendors", "price", "ratings"]
}
```

Response:
```json
{
  "products": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "facets": {
    "categories": [
      { "value": "cat_123", "label": "Laptops", "count": 45 }
    ],
    "vendors": [...],
    "priceRanges": [...],
    "ratings": [...]
  },
  "took": 23,
  "provider": "Elasticsearch"
}
```

### Autocomplete

```http
GET /api/search/autocomplete?query=lap&limit=10
```

Response:
```json
{
  "suggestions": [
    { "text": "laptop", "type": "keyword", "count": 150 },
    { "text": "laptop bag", "type": "keyword", "count": 45 }
  ],
  "products": [
    {
      "id": "prod_123",
      "name": "Dell Laptop",
      "slug": "dell-laptop",
      "image": "https://...",
      "price": 899.99,
      "categoryName": "Laptops"
    }
  ],
  "provider": "Elasticsearch"
}
```

### Popular Searches

```http
GET /api/search/popular?limit=10
```

### Trending Searches

```http
GET /api/search/trending?limit=10
```

### Track Search

```http
POST /api/search/track
Content-Type: application/json

{
  "query": "laptop",
  "resultsCount": 150,
  "userId": "user_123",
  "sessionId": "sess_456"
}
```

## Automatic Indexing

Products are automatically indexed/updated/deleted when:

- Product is created → `product.created` event
- Product is updated → `product.updated` event
- Product is deleted → `product.deleted` event

The `ProductSearchListener` handles these events asynchronously.

## Search Features

### 1. Fuzzy Matching

Elasticsearch automatically handles typos and misspellings:

```
Query: "laptp" → Matches: "laptop"
Query: "sumsung" → Matches: "samsung"
```

### 2. Boosting

Fields are boosted for relevance:
- Product name: 3x
- Category name: 2x
- Description: 1x

### 3. Autocomplete

Uses edge n-gram tokenization:
- Min gram: 2 characters
- Max gram: 20 characters
- Supports instant search as you type

### 4. Faceted Search

Aggregations for:
- **Categories**: Count by category
- **Vendors**: Count by vendor
- **Price Ranges**: 5 dynamic price buckets
- **Ratings**: Count by rating tiers
- **Tags**: Count by product tags

### 5. Filters

Support for:
- Category filtering (multiple)
- Vendor filtering (multiple)
- Price range (min/max)
- Rating threshold
- Stock availability
- Discount status
- New products (last 30 days)
- Custom attributes

### 6. Semantic Search

Optional AI-powered semantic search using OpenAI embeddings:

```typescript
// Find products by meaning, not just keywords
const results = await searchService.semanticSearch(
  "portable computer for students",
  { limit: 20 }
);
```

## Index Mappings

### Product Document Schema

```typescript
{
  id: string;
  name: string;              // Autocomplete + full-text
  description: string;       // Full-text
  price: number;             // Filterable, sortable
  sku: string;              // Exact match
  barcode: string;          // Exact match
  images: string[];
  categoryId: string;       // Filterable
  categoryName: string;     // Searchable
  vendorId: string;         // Filterable
  vendorName: string;       // Searchable
  stock: number;            // Filterable
  inStock: boolean;         // Filterable
  tags: string[];           // Filterable
  avgRating: number;        // Sortable, filterable
  reviewCount: number;      // Sortable
  salesCount: number;       // Sortable
  createdAt: Date;          // Sortable
  hasVariants: boolean;
  variantCount: number;
  minVariantPrice: number;
  maxVariantPrice: number;
}
```

## Performance

### Optimization Tips

1. **Bulk Indexing**: Use bulk operations for initial indexing
2. **Refresh Control**: Disable refresh during bulk operations
3. **Pagination**: Use reasonable page sizes (10-50)
4. **Caching**: Cache popular searches
5. **Async Indexing**: Events are processed asynchronously

### Benchmarks

- **Average search time**: 20-50ms (Elasticsearch)
- **Autocomplete**: <10ms
- **Bulk indexing**: ~1000 products/second

## Monitoring

### Health Check

```http
GET /api/admin/search/stats
```

Returns:
- Provider name and availability
- Document count
- Index size
- Available providers

### Search Analytics

Track search performance:
- Total searches
- Unique queries
- Zero-result searches
- Conversion rate
- Top searches

```typescript
const analytics = await searchService.getSearchAnalytics(
  startDate,
  endDate
);
```

## Troubleshooting

### Elasticsearch Not Available

If Elasticsearch is not running, the system automatically falls back to the internal provider (PostgreSQL).

**Check logs:**
```
[SearchProviderFactory] Using search provider: Internal
```

### Index Not Found

Rebuild the index:
```bash
npm run cli search:index --rebuild
```

### Slow Searches

1. Check index statistics for size
2. Verify Elasticsearch is running
3. Reduce page size
4. Add more specific filters

### Products Not Appearing

1. Check if product is indexed:
```http
POST /api/admin/search/index/product/:productId
```

2. Verify product is active in database

3. Check event listeners are registered

## Architecture

```
┌─────────────────────────────────────────────┐
│         SearchService (Orchestrator)         │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌──────────────────┐
│ Provider      │   │ Event Listeners  │
│ Factory       │   │ (Auto-indexing)  │
└───────┬───────┘   └──────────────────┘
        │
        ├──► ElasticsearchProvider
        ├──► AlgoliaProvider
        └──► InternalProvider (Fallback)
```

## Best Practices

1. **Use Elasticsearch for production** - Best performance and features
2. **Enable auto-indexing** - Keep search in sync automatically
3. **Monitor search analytics** - Track user behavior
4. **Regular index rebuilds** - Monthly or after major data changes
5. **Cache popular searches** - Reduce load on search engine
6. **Use facets wisely** - Don't request all facets if not needed
7. **Implement pagination** - Don't fetch all results at once

## Migration Guide

### From Database Search to Elasticsearch

1. **Install and run Elasticsearch**
2. **Update environment variables**
3. **Build initial index**:
   ```bash
   npm run cli search:index --rebuild
   ```
4. **Test search functionality**:
   ```http
   GET /api/admin/search/test
   ```
5. **Monitor for a few days**
6. **Switch SEARCH_PROVIDER to 'elasticsearch'**

## Support

For issues or questions:
- Check logs: `[SearchService]`, `[ElasticsearchProvider]`
- Review index stats: `GET /api/admin/search/stats`
- Rebuild index: `npm run cli search:index --rebuild`
