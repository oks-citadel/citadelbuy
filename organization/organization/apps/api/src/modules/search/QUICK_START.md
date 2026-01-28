# Elasticsearch Search - Quick Start Guide

## 5-Minute Setup (Development)

### 1. Start Elasticsearch
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

### 2. Configure Environment
```bash
# .env
ELASTICSEARCH_NODE=http://localhost:9200
SEARCH_PROVIDER=elasticsearch
```

### 3. Start Application
```bash
npm run dev
```

### 4. Initialize Search Index
```bash
# Using curl
curl -X POST http://localhost:3000/admin/search/index/rebuild-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Or using the API client
```

### 5. Test Search
```bash
curl "http://localhost:3000/search/products?query=laptop&limit=10"
```

## Common Commands

### Indexing

```bash
# Full reindex (with index deletion)
POST /admin/search/index/rebuild-all?deleteFirst=true

# Incremental sync (only changed products)
POST /admin/search/index/products/sync

# Index specific products
POST /admin/search/index/products/batch
Body: { "productIds": ["id1", "id2", "id3"] }

# Index categories and vendors
POST /admin/search/index/categories/rebuild
POST /admin/search/index/vendors/rebuild
```

### Health Checks

```bash
# Check index health
GET /admin/search/health

# Get indexing status
GET /admin/search/status

# Get index statistics
GET /admin/search/stats

# Test search
GET /admin/search/test?query=test
```

### Searching

```bash
# Basic search
GET /search/products?query=laptop

# Search with filters
GET /search/products?query=laptop&priceMin=500&priceMax=2000&inStock=true

# Autocomplete
GET /search/autocomplete?query=lap

# Get facets
GET /search/facets?query=laptop

# Popular searches
GET /search/popular?limit=10

# Trending searches
GET /search/trending?limit=10
```

## Environment Variables Reference

```bash
# Required
ELASTICSEARCH_NODE=http://localhost:9200

# Optional
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
ELASTICSEARCH_REQUEST_TIMEOUT=30000
ELASTICSEARCH_BULK_SIZE=1000
SEARCH_PROVIDER=elasticsearch
DISABLE_SEARCH_AUTO_SYNC=false
```

## Code Examples

### Search Products
```typescript
import { SearchService } from './modules/search/search.service';

// Inject in constructor
constructor(private searchService: SearchService) {}

// Basic search
const results = await this.searchService.searchProducts({
  query: 'laptop',
  page: 1,
  limit: 20,
});

// Advanced search
const results = await this.searchService.searchProducts({
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
  facets: ['categories', 'vendors', 'price'],
});
```

### Autocomplete
```typescript
const suggestions = await this.searchService.getAutocomplete({
  query: 'lap',
  limit: 10,
});
```

### Manual Indexing
```typescript
import { SearchIndexingService } from './modules/search/services/search-indexing.service';

// Full reindex
await this.searchIndexingService.reindexAll({
  deleteExisting: true,
  batchSize: 1000,
});

// Incremental sync
await this.searchIndexingService.incrementalSync();
```

### Emit Events for Auto-Indexing
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductCreatedEvent } from './modules/search/events/product-search.events';

constructor(private eventEmitter: EventEmitter2) {}

// After creating a product
this.eventEmitter.emit('product.created', new ProductCreatedEvent(product.id));

// After updating a product
this.eventEmitter.emit('product.updated', new ProductUpdatedEvent(product.id));

// After deleting a product
this.eventEmitter.emit('product.deleted', new ProductDeletedEvent(product.id));
```

## Troubleshooting Quick Fixes

### Problem: Can't connect to Elasticsearch
```bash
# Check if Elasticsearch is running
curl http://localhost:9200

# Restart Elasticsearch
docker restart elasticsearch

# Check logs
docker logs elasticsearch
```

### Problem: Search returns no results
```bash
# Check if index exists
curl http://localhost:9200/_cat/indices?v

# Verify document count
curl http://localhost:9200/products/_count

# Reindex if needed
POST /admin/search/index/rebuild-all
```

### Problem: Index out of sync
```bash
# Check health
GET /admin/search/health

# Response shows difference:
{
  "healthy": false,
  "databaseCount": 1000,
  "indexCount": 950,
  "difference": 50
}

# Fix: Run incremental sync
POST /admin/search/index/products/sync
```

### Problem: Slow search
```bash
# Check index stats
GET /admin/search/stats

# If index is large, consider:
1. Adding more Elasticsearch nodes
2. Increasing shard count
3. Optimizing queries
4. Adding replicas for read performance
```

## Performance Tips

1. **Use filters instead of queries for exact matches**
   - Filters are cached and faster
   - Use for category, price, stock filters

2. **Limit facet sizes**
   - Don't request all facets if not needed
   - Limit facet results (default: 50)

3. **Use pagination**
   - Never fetch all results at once
   - Limit page size to 20-50

4. **Enable auto-sync**
   - Keeps index fresh automatically
   - Runs every 5 minutes

5. **Bulk operations**
   - Use batch endpoints for multiple products
   - Increase batch size for better performance

## Monitoring

### Key Metrics
```bash
# Index health
GET /admin/search/health

# Index size
GET /admin/search/stats

# Indexing status
GET /admin/search/status

# Elasticsearch cluster health
curl http://localhost:9200/_cluster/health
```

### Logs to Watch
```bash
# Application logs (search-related)
grep "Search" logs/application.log

# Elasticsearch logs
docker logs elasticsearch | grep ERROR
```

## When to Reindex

### Full Reindex (Rebuild)
- After mapping changes
- After major data migration
- If index is corrupted
- During initial setup

### Incremental Sync
- During normal operations
- After bulk data updates
- When health check shows small difference

### Automatic Sync
- Enabled by default (every 5 minutes)
- Handles individual product changes
- No manual intervention needed

## Getting Help

1. Check documentation: `README.md`
2. Review deployment guide: `ELASTICSEARCH_DEPLOYMENT.md`
3. See implementation details: `IMPLEMENTATION_SUMMARY.md`
4. Check application logs
5. Verify Elasticsearch health
6. Contact development team

## Useful Elasticsearch Commands

```bash
# List all indices
curl http://localhost:9200/_cat/indices?v

# Get index mapping
curl http://localhost:9200/products/_mapping

# Get index settings
curl http://localhost:9200/products/_settings

# Delete index (DANGEROUS!)
curl -X DELETE http://localhost:9200/products

# Refresh index
curl -X POST http://localhost:9200/products/_refresh

# Clear cache
curl -X POST http://localhost:9200/products/_cache/clear

# Get cluster stats
curl http://localhost:9200/_cluster/stats?human

# Get node stats
curl http://localhost:9200/_nodes/stats
```

## Best Practices

✅ **Do:**
- Use auto-sync for real-time updates
- Monitor index health regularly
- Use incremental sync during normal operations
- Test search quality with real queries
- Set up alerts for index health

❌ **Don't:**
- Don't run full reindex during peak hours
- Don't disable auto-sync in production
- Don't ignore health warnings
- Don't index sensitive data
- Don't use large page sizes (> 100)

## Quick Reference: HTTP Status Codes

- `200` - Success
- `201` - Resource created (indexing)
- `400` - Bad request (invalid query)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not admin)
- `404` - Not found
- `500` - Server error (check logs)
- `503` - Service unavailable (Elasticsearch down)

## Next Steps

1. Read full documentation: `README.md`
2. Set up production deployment: `ELASTICSEARCH_DEPLOYMENT.md`
3. Explore advanced features
4. Customize ranking for your use case
5. Set up monitoring and alerts
6. Train team on search best practices
