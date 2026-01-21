# Broxiva Caching Strategy

## Overview

Broxiva implements a comprehensive Redis-based caching strategy to optimize performance, reduce database load, and improve user experience. This document describes the caching architecture, TTL settings, invalidation patterns, and management practices.

## Architecture

### Cache Layers

```
┌─────────────────────────────────────────────────────┐
│                  Application Layer                   │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│              Specialized Cache Services              │
│  ┌────────┬────────┬────────┬────────┬──────────┐  │
│  │Product │Session │Search  │Cart    │Rate Limit│  │
│  │Cache   │Cache   │Cache   │Cache   │Cache     │  │
│  └────────┴────────┴────────┴────────┴──────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│               Core Cache Service                     │
│  • Key Management  • TTL Configuration              │
│  • Invalidation    • Statistics                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│                  Redis Service                       │
│  • Connection Management  • Operations               │
│  • Error Handling         • Monitoring               │
└─────────────────────────────────────────────────────┘
```

## Cached Data Types

### 1. Product Catalog

#### What is Cached
- Individual product details
- Product lists with filters
- Popular products
- Featured products
- New arrivals
- Related products

#### TTL Settings
- **Individual products**: 1 hour (3600s)
- **Product lists**: 15 minutes (900s)
- **Popular products**: 30 minutes (1800s)
- **Featured products**: 1 hour (3600s)
- **New arrivals**: 30 minutes (1800s)

#### Cache Keys Pattern
```
product:{productId}                    // Single product
product_list:category:{categoryId}:page:{n}  // Category listings
product_list:popular:all              // Popular products
product_list:featured                 // Featured products
product_list:new-arrivals             // New arrivals
product_list:related:{productId}      // Related products
```

#### Invalidation Triggers
- Product created → Invalidate all product lists
- Product updated → Invalidate specific product + all lists
- Product deleted → Invalidate specific product + all lists
- Category updated → Invalidate category products + search caches

### 2. User Sessions

#### What is Cached
- Active user sessions
- User profiles
- User permissions
- User preferences
- JWT token blacklist
- Refresh tokens
- Active user tracking

#### TTL Settings
- **User sessions**: 24 hours (86400s)
- **User profiles**: 1 hour (3600s)
- **User permissions**: 1 hour (3600s)
- **User preferences**: 7 days (604800s)
- **Token blacklist**: Token expiry time
- **Refresh tokens**: 30 days (2592000s)
- **Active user tracking**: 15 minutes (900s)

#### Cache Keys Pattern
```
session:{sessionId}                   // User session data
user:profile:{userId}                 // User profile
user:permissions:{userId}             // User permissions
user:preferences:{userId}             // User preferences
session:blacklist:{token}             // Blacklisted tokens
session:refresh:{userId}:{tokenId}    // Refresh tokens
session:active:{userId}               // Active user tracking
```

#### Invalidation Triggers
- User profile updated → Invalidate user profile cache
- User logout → Delete session + blacklist tokens
- Permission changes → Invalidate user permissions
- Account deletion → Invalidate all user-related caches

### 3. Search Results

#### What is Cached
- Search query results
- Autocomplete suggestions
- Search facets
- Popular searches
- Trending searches
- Category facets

#### TTL Settings
- **Search results**: 15 minutes (900s)
- **Autocomplete**: 1 hour (3600s)
- **Search facets**: 30 minutes (1800s)
- **Popular searches**: 12 hours (43200s)
- **Trending searches**: 30 minutes (1800s)

#### Cache Keys Pattern
```
search:q:{query}:f:{filters}:p:{page}  // Search results
search:autocomplete:{query}            // Autocomplete suggestions
search:facets:{query}                  // Search facets
search:popular                         // Popular searches
trending:trending                      // Trending searches
search:category:{categoryId}           // Category facets
```

#### Invalidation Triggers
- Product updated → Invalidate all search caches
- Category updated → Invalidate category facets
- Bulk product changes → Invalidate all search caches

### 4. Shopping Cart

#### What is Cached
- Active carts (user and guest)
- Cart item counts
- Cart totals
- Abandoned cart data

#### TTL Settings
- **Active carts**: 12 hours (43200s)
- **Cart item counts**: 15 minutes (900s)
- **Cart totals**: 15 minutes (900s)
- **Abandoned carts**: 7 days (604800s)

#### Cache Keys Pattern
```
cart:{cartId}                         // Full cart data
cart:user:{userId}                    // User cart
cart:session:{sessionId}              // Guest cart
cart:count:{cartId}                   // Item count
cart:total:{cartId}                   // Cart total
cart:abandoned:{cartId}               // Abandoned cart
```

#### Invalidation Triggers
- Item added to cart → Invalidate cart cache
- Item removed from cart → Invalidate cart cache
- Cart updated → Invalidate cart cache
- Cart converted to order → Clear cart cache
- Product price changed → Invalidate all carts (or recalculate)

### 5. Rate Limiting

#### What is Cached
- Request counters per endpoint
- IP-based rate limits
- User-based rate limits
- API key rate limits
- Login attempt tracking
- Suspicious activity tracking
- Temporary bans

#### TTL Settings
- **Request counters**: Window duration (e.g., 1 minute)
- **Login attempts**: 15 minutes (900s)
- **OTP attempts**: 10 minutes (600s)
- **Suspicious activity**: 1 hour (3600s)
- **Temporary bans**: Variable (as set)

#### Cache Keys Pattern
```
rate_limit:ip:{ipAddress}:{endpoint}      // IP rate limit
rate_limit:user:{userId}:{endpoint}       // User rate limit
rate_limit:apikey:{apiKey}                // API key limit
rate_limit:login:{identifier}             // Login attempts
rate_limit:otp:{identifier}               // OTP attempts
rate_limit:suspicious:{type}:{identifier} // Suspicious activity
rate_limit:ban:{identifier}               // Temporary ban
```

## Cache Warming

### On Application Startup
Automatically warms cache with frequently accessed data (5-second delay for service initialization):
- Popular products (top 50)
- Featured products (top 20)
- New arrivals (latest 30)
- All categories
- Trending searches

### Scheduled Warming
Runs every hour via CRON to refresh hot data:
- Popular products
- Trending searches
- Top categories

### Manual Warming
Admin endpoints available for:
- Specific products
- Specific categories
- Force warm all caches

## Cache Invalidation Patterns

### 1. Event-Driven Invalidation
Services listen to domain events and automatically invalidate affected caches:

```typescript
@OnEvent('product.updated')
async handleProductUpdated(payload: { productId: string }) {
  await this.invalidateProduct(payload.productId);
}
```

### 2. Pattern-Based Invalidation
Uses Redis pattern matching to invalidate multiple related keys:

```typescript
// Invalidate all product lists when category changes
await this.cacheService.deletePattern('product_list:*category:123*');
```

### 3. Explicit Invalidation
Direct cache deletion for specific scenarios:

```typescript
// Clear user cache on profile update
await this.sessionCacheService.invalidateUserCache(userId);
```

### 4. TTL-Based Expiration
Automatic expiration based on configured TTL values (no manual intervention needed).

## Cache Health Monitoring

### Metrics Tracked
- **Hit rate**: Percentage of cache hits vs misses
- **Memory usage**: Current Redis memory consumption
- **Key count**: Total number of cached keys
- **Key breakdown**: Count by prefix (products, users, sessions, etc.)
- **Slow queries**: Number of queries exceeding threshold
- **Connection status**: Redis availability

### Health Status Levels
- **Healthy**: All metrics within normal range
- **Degraded**: Some metrics indicate issues (low hit rate, high memory, etc.)
- **Unhealthy**: Redis unavailable or critical issues

### Monitoring Endpoints
```
GET /admin/cache/health              # Current health status
GET /admin/cache/health/history      # Historical health data
GET /admin/cache/stats               # Detailed statistics
GET /admin/cache/breakdown           # Key count by prefix
GET /admin/cache/expiring            # Keys expiring soon
```

### Scheduled Health Checks
- **Every 5 minutes**: Automated health check with logging
- **Every hour**: Reset statistics counters

## Memory Management

### Best Practices
1. **Set appropriate TTLs** - Prevent unlimited cache growth
2. **Use pattern invalidation** - Clean up related keys
3. **Monitor memory usage** - Track via health endpoints
4. **Cleanup expired entries** - Periodic cleanup tasks
5. **Cache compression** - For large objects (future enhancement)

### Memory Limits
Configure Redis with maxmemory policy:
```
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Cleanup Tasks
- Scheduled cleanup of abandoned carts (> 30 days)
- Manual cleanup via admin endpoint
- Automatic Redis eviction (LRU policy)

## Administration

### Admin Endpoints

#### Cache Management
```bash
# View cache health
GET /admin/cache/health

# Warm all caches
POST /admin/cache/warm

# Clear all cache (use with caution!)
DELETE /admin/cache/all

# Cleanup expired entries
POST /admin/cache/cleanup
```

#### Cache Invalidation
```bash
# Invalidate specific product
DELETE /admin/cache/product/:productId

# Invalidate category
DELETE /admin/cache/category/:categoryId

# Invalidate user cache
DELETE /admin/cache/user/:userId

# Invalidate all searches
DELETE /admin/cache/search

# Invalidate all product lists
DELETE /admin/cache/products/lists
```

#### Cache Warming
```bash
# Warm specific product
POST /admin/cache/warm/product/:productId

# Warm category products
POST /admin/cache/warm/category/:categoryId

# Check warming status
GET /admin/cache/warm/status
```

## Usage Examples

### Product Service Integration
```typescript
// In products.service.ts
async findOne(id: string) {
  return this.productCacheService.getOrLoadProduct(
    id,
    async () => {
      // Loader function - called only on cache miss
      return this.prisma.product.findUnique({
        where: { id },
        include: { category: true, vendor: true },
      });
    },
  );
}
```

### Search Service Integration
```typescript
// In search.service.ts
async search(params: SearchParams) {
  return this.searchCacheService.getOrLoadSearchResults(
    params,
    async () => {
      // Perform actual search
      return this.elasticsearchProvider.searchProducts(params);
    },
  );
}
```

### Session Management
```typescript
// In auth.service.ts
async validateSession(sessionId: string) {
  const session = await this.sessionCacheService.getSession(sessionId);

  if (!session) {
    throw new UnauthorizedException('Invalid session');
  }

  // Update last activity
  await this.sessionCacheService.updateSessionActivity(sessionId);

  return session;
}
```

### Rate Limiting
```typescript
// In enhanced-throttler.guard.ts
const result = await this.rateLimitCacheService.checkIpRateLimit(
  ipAddress,
  endpoint,
  { windowMs: 60000, maxRequests: 100 }
);

if (!result.allowed) {
  throw new ThrottlerException('Rate limit exceeded');
}
```

## Performance Impact

### Expected Improvements
- **Database load**: 60-80% reduction
- **Response time**: 40-60% faster for cached endpoints
- **Scalability**: Support 5-10x more concurrent users
- **User experience**: Near-instant page loads for popular content

### Monitoring Recommendations
1. Track cache hit rates (target: >70%)
2. Monitor memory usage (alert at >80%)
3. Measure response times (before/after caching)
4. Track database query reduction
5. Monitor Redis availability (uptime >99.9%)

## Configuration

### Environment Variables
```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Redis configuration
REDIS_MAX_RETRIES=10
REDIS_RETRY_DELAY=100
```

### Custom TTL Configuration
TTL values can be customized in `cache.service.ts`:

```typescript
export enum CacheTTL {
  VERY_SHORT = 60,      // 1 minute
  SHORT = 300,          // 5 minutes
  MEDIUM = 900,         // 15 minutes
  MEDIUM_LONG = 1800,   // 30 minutes
  LONG = 3600,          // 1 hour
  VERY_LONG = 21600,    // 6 hours
  HALF_DAY = 43200,     // 12 hours
  DAY = 86400,          // 24 hours
  WEEK = 604800,        // 7 days
  MONTH = 2592000,      // 30 days
}
```

## Troubleshooting

### Cache Not Working
1. Check Redis connection: `GET /admin/cache/health`
2. Verify environment variables
3. Check Redis service status
4. Review application logs for Redis errors

### Low Hit Rate
1. Review TTL settings (may be too short)
2. Check invalidation patterns (may be too aggressive)
3. Analyze cache key construction (ensure consistency)
4. Monitor access patterns (some data may not be worth caching)

### High Memory Usage
1. Review TTL settings (may be too long)
2. Check for memory leaks (large objects)
3. Implement cache cleanup
4. Consider Redis eviction policy
5. Increase Redis memory limit

### Stale Data
1. Review invalidation triggers
2. Reduce TTL for affected data types
3. Add manual invalidation endpoints
4. Implement cache versioning

## Future Enhancements

### Planned Improvements
1. **Cache compression** - Reduce memory usage for large objects
2. **Multi-level caching** - Add in-memory L1 cache
3. **Cache analytics** - Detailed usage analytics and insights
4. **Distributed caching** - Redis Cluster support for high availability
5. **Cache preloading** - Predictive cache warming based on patterns
6. **Smart invalidation** - ML-based cache invalidation optimization

### Advanced Features
- Cache sharding for large datasets
- Geo-distributed caching
- Cache versioning and migration
- Real-time cache statistics dashboard
- A/B testing cache strategies

## Best Practices

### Do's
✅ Set appropriate TTLs for each data type
✅ Use event-driven invalidation
✅ Monitor cache health regularly
✅ Implement proper error handling
✅ Use pattern-based invalidation for related keys
✅ Warm cache for frequently accessed data
✅ Track cache metrics and optimize

### Don'ts
❌ Don't cache user-specific sensitive data without encryption
❌ Don't set TTL to infinite (always expire)
❌ Don't invalidate too aggressively (defeats caching purpose)
❌ Don't cache volatile data (real-time prices, inventory)
❌ Don't ignore memory limits
❌ Don't forget to handle cache failures gracefully

## Support

For issues or questions regarding caching:
1. Check this documentation
2. Review application logs
3. Check health endpoints
4. Contact development team

## Changelog

### Version 1.0 (Current)
- Initial caching implementation
- Product, session, search, cart, and rate limiting caches
- Cache warming and health monitoring
- Admin management endpoints
- Comprehensive documentation
