# Redis Cache - Quick Reference

## Quick Access

### Common Operations

#### Get Product from Cache
```typescript
const product = await this.productCacheService.getProduct(productId);
```

#### Cache Product with Auto-Load
```typescript
const product = await this.productCacheService.getOrLoadProduct(
  productId,
  async () => this.prisma.product.findUnique({ where: { id: productId } })
);
```

#### Invalidate Product Cache
```typescript
await this.productCacheService.invalidateProduct(productId);
```

#### Get User Session
```typescript
const session = await this.sessionCacheService.getSession(sessionId);
```

#### Cache Search Results
```typescript
const results = await this.searchCacheService.getOrLoadSearchResults(
  { query, filters, page, limit },
  async () => this.performSearch(query, filters)
);
```

#### Check Rate Limit
```typescript
const result = await this.rateLimitCacheService.checkIpRateLimit(
  ipAddress,
  endpoint,
  { windowMs: 60000, maxRequests: 100 }
);

if (!result.allowed) {
  throw new ThrottlerException('Rate limit exceeded');
}
```

## TTL Quick Reference

| Data Type | TTL | Value (seconds) |
|-----------|-----|-----------------|
| Individual Product | 1 hour | 3600 |
| Product Lists | 15 min | 900 |
| Popular Products | 30 min | 1800 |
| User Session | 24 hours | 86400 |
| User Profile | 1 hour | 3600 |
| Search Results | 15 min | 900 |
| Autocomplete | 1 hour | 3600 |
| Active Cart | 12 hours | 43200 |
| Rate Limit | Variable | Depends on window |

## Admin Endpoints

### Health Monitoring
```bash
# Check health
GET /admin/cache/health

# View statistics
GET /admin/cache/stats

# View breakdown
GET /admin/cache/breakdown
```

### Cache Management
```bash
# Warm all caches
POST /admin/cache/warm

# Clear all cache
DELETE /admin/cache/all

# Cleanup expired
POST /admin/cache/cleanup
```

### Invalidation
```bash
# Invalidate product
DELETE /admin/cache/product/:id

# Invalidate category
DELETE /admin/cache/category/:id

# Invalidate all searches
DELETE /admin/cache/search
```

## Service Injection

```typescript
import {
  ProductCacheService,
  SessionCacheService,
  SearchCacheService,
  CartCacheService,
  RateLimitCacheService
} from '@/common/redis';

@Injectable()
export class YourService {
  constructor(
    private readonly productCache: ProductCacheService,
    private readonly sessionCache: SessionCacheService,
    // ... other services
  ) {}
}
```

## Cache Prefixes

| Prefix | Purpose |
|--------|---------|
| `product:` | Individual products |
| `product_list:` | Product listings |
| `user:` | User data |
| `session:` | User sessions |
| `cart:` | Shopping carts |
| `search:` | Search results |
| `trending:` | Trending data |
| `rate_limit:` | Rate limiting |

## Event-Driven Invalidation

```typescript
// Emit event
this.eventEmitter.emit('product.updated', { productId });

// Automatic invalidation happens in cache service
@OnEvent('product.updated')
async handleProductUpdated(payload: { productId: string }) {
  await this.invalidateProduct(payload.productId);
}
```

## Common Patterns

### Get or Load Pattern
```typescript
return this.cacheService.getOrSet(
  key,
  async () => loadFromDatabase(),
  { prefix: CachePrefix.PRODUCT, ttl: CacheTTL.LONG }
);
```

### Manual Get/Set
```typescript
// Get
const data = await this.cacheService.get<Type>(key, { prefix });

// Set
await this.cacheService.set(key, data, { prefix, ttl });

// Delete
await this.cacheService.delete(key, prefix);
```

### Pattern Deletion
```typescript
// Delete all products in a category
await this.cacheService.deletePattern('*category:123*', CachePrefix.PRODUCT_LIST);
```

## Error Handling

```typescript
try {
  return await this.cacheService.get<Product>(productId);
} catch (error) {
  this.logger.error('Cache error:', error);
  // Fallback to database
  return this.loadFromDatabase(productId);
}
```

## Health Status

| Status | Meaning |
|--------|---------|
| `healthy` | All metrics normal |
| `degraded` | Some issues detected |
| `unhealthy` | Redis unavailable or critical issues |

## Warnings to Watch

- Low cache hit rate (<50%)
- High memory usage (>1GB)
- High slow query count (>10)
- High key count (>100,000)

## Troubleshooting

### Cache Miss Rate Too High
1. Check TTL settings
2. Review invalidation patterns
3. Verify cache key consistency

### Memory Issues
1. Review TTL settings
2. Check for large objects
3. Implement cleanup
4. Adjust Redis maxmemory

### Connection Issues
1. Check Redis service status
2. Verify environment variables
3. Review connection logs
4. Test with `redis-cli ping`

## Best Practices

✅ Use get-or-load pattern
✅ Set appropriate TTLs
✅ Emit events for invalidation
✅ Handle errors gracefully
✅ Monitor cache health

❌ Don't cache sensitive data unencrypted
❌ Don't set infinite TTLs
❌ Don't ignore memory limits
❌ Don't cache volatile data

## Documentation Links

- [Full Caching Strategy](./CACHING_STRATEGY.md)
- [Implementation Guide](../src/common/redis/README.md)
- [Implementation Summary](../REDIS_CACHING_IMPLEMENTATION.md)

## Quick Diagnostics

```bash
# Check if Redis is running
redis-cli ping

# Get cache health
curl http://localhost:3000/admin/cache/health

# View cache stats
curl http://localhost:3000/admin/cache/stats

# List cache keys
curl http://localhost:3000/admin/cache/keys?pattern=product:*
```

## Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

---

For detailed documentation, see [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)
