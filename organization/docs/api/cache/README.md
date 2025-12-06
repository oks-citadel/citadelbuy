# Redis Caching Implementation

## Overview

This directory contains the complete Redis caching implementation for CitadelBuy. The caching system provides high-performance data caching with automatic invalidation, cache warming, and comprehensive monitoring.

## Architecture

### Services

#### Core Services
- **RedisService** - Low-level Redis operations and connection management
- **CacheService** - High-level caching operations with key management and TTL

#### Specialized Caching Services
- **ProductCacheService** - Product catalog and listings caching
- **SessionCacheService** - User sessions, profiles, and authentication
- **SearchCacheService** - Search results, autocomplete, and facets
- **CartCacheService** - Shopping cart data caching
- **RateLimitCacheService** - Rate limiting and abuse prevention

#### Supporting Services
- **CacheWarmingService** - Proactive cache warming for hot data
- **CacheHealthService** - Health monitoring and metrics

#### Administration
- **CacheAdminController** - Admin endpoints for cache management

## File Structure

```
src/common/redis/
├── redis.service.ts              # Core Redis operations
├── redis.module.ts               # Module definition
├── cache.service.ts              # High-level cache operations
├── product-cache.service.ts      # Product caching
├── session-cache.service.ts      # Session/user caching
├── search-cache.service.ts       # Search caching
├── cart-cache.service.ts         # Cart caching
├── rate-limit-cache.service.ts   # Rate limiting
├── cache-warming.service.ts      # Cache warming
├── cache-health.service.ts       # Health monitoring
├── cache-admin.controller.ts     # Admin endpoints
└── README.md                     # This file
```

## Quick Start

### 1. Import the Module

The `RedisModule` is already configured as a `@Global()` module, so it's automatically available throughout the application.

### 2. Inject Services

```typescript
import { Injectable } from '@nestjs/common';
import { ProductCacheService } from '@/common/redis/product-cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productCacheService: ProductCacheService,
  ) {}

  async findOne(id: string) {
    return this.productCacheService.getOrLoadProduct(
      id,
      async () => {
        // Loader function - called only on cache miss
        return this.prisma.product.findUnique({
          where: { id },
          include: { category: true },
        });
      },
    );
  }
}
```

### 3. Use Cache Methods

#### Simple Get/Set
```typescript
// Get from cache
const product = await this.productCacheService.getProduct(productId);

// Set in cache
await this.productCacheService.setProduct(productId, product, CacheTTL.LONG);
```

#### Get or Load Pattern (Recommended)
```typescript
const product = await this.productCacheService.getOrLoadProduct(
  productId,
  async () => {
    // This function is called only on cache miss
    return this.loadProductFromDatabase(productId);
  },
);
```

#### Invalidate Cache
```typescript
// Invalidate specific product
await this.productCacheService.invalidateProduct(productId);

// Invalidate category
await this.productCacheService.invalidateCategory(categoryId);
```

## Usage Examples

### Product Service

```typescript
@Injectable()
export class ProductsService {
  constructor(
    private readonly productCacheService: ProductCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: QueryProductsDto) {
    return this.productCacheService.getOrLoadProductList(
      {
        category: query.category,
        search: query.search,
        page: query.page,
        limit: query.limit,
      },
      async () => {
        // Database query
        return this.prisma.product.findMany({
          where: { /* ... */ },
          take: query.limit,
          skip: (query.page - 1) * query.limit,
        });
      },
    );
  }

  async update(id: string, data: UpdateProductDto) {
    const product = await this.prisma.product.update({
      where: { id },
      data,
    });

    // Invalidate cache
    await this.productCacheService.invalidateProduct(id);

    return product;
  }
}
```

### Search Service

```typescript
@Injectable()
export class SearchService {
  constructor(
    private readonly searchCacheService: SearchCacheService,
    private readonly elasticsearchProvider: ElasticsearchProvider,
  ) {}

  async search(params: SearchParams) {
    return this.searchCacheService.getOrLoadSearchResults(
      {
        query: params.query,
        filters: params.filters,
        page: params.page,
        limit: params.limit,
      },
      async () => {
        // Perform actual search
        return this.elasticsearchProvider.searchProducts(params);
      },
    );
  }

  async autocomplete(query: string) {
    const cached = await this.searchCacheService.getAutocompleteSuggestions(query);

    if (cached) {
      return cached;
    }

    const suggestions = await this.generateSuggestions(query);
    await this.searchCacheService.setAutocompleteSuggestions(query, suggestions);

    return suggestions;
  }
}
```

### Auth Service

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly sessionCacheService: SessionCacheService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: User) {
    const sessionId = generateSessionId();
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await this.sessionCacheService.setSession(sessionId, sessionData);

    return {
      user,
      sessionId,
      access_token: this.jwtService.sign({ sub: user.id }),
    };
  }

  async logout(sessionId: string, token: string) {
    // Delete session
    await this.sessionCacheService.deleteSession(sessionId);

    // Blacklist token
    const expiresInSeconds = 3600; // 1 hour
    await this.sessionCacheService.blacklistToken(token, expiresInSeconds);
  }
}
```

### Cart Service

```typescript
@Injectable()
export class CartService {
  constructor(
    private readonly cartCacheService: CartCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getCart(userId: string) {
    return this.cartCacheService.getOrLoadCart(
      userId,
      async () => {
        return this.prisma.cart.findFirst({
          where: { userId },
          include: { items: true },
        });
      },
    );
  }

  async addToCart(userId: string, item: CartItem) {
    // Add to database
    const cart = await this.prisma.cart.update({
      where: { userId },
      data: { items: { create: item } },
    });

    // Invalidate cache
    await this.cartCacheService.invalidateUserCart(userId);

    return cart;
  }
}
```

### Rate Limiting Guard

```typescript
@Injectable()
export class CustomThrottlerGuard implements CanActivate {
  constructor(
    private readonly rateLimitCacheService: RateLimitCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ipAddress = request.ip;
    const endpoint = request.route.path;

    const result = await this.rateLimitCacheService.checkIpRateLimit(
      ipAddress,
      endpoint,
      {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
      },
    );

    if (!result.allowed) {
      throw new ThrottlerException('Rate limit exceeded');
    }

    return true;
  }
}
```

## Event-Driven Invalidation

Services automatically listen to domain events for cache invalidation:

```typescript
// In product-cache.service.ts
@OnEvent('product.updated')
async handleProductUpdated(payload: { productId: string }) {
  await this.invalidateProduct(payload.productId);
}

// Emit events when data changes
this.eventEmitter.emit('product.updated', { productId: product.id });
```

## Cache Warming

### Automatic Warming
Cache warming happens automatically:
- On application startup (5-second delay)
- Every hour via scheduled task

### Manual Warming
Use admin endpoints:
```bash
# Warm all caches
POST /admin/cache/warm

# Warm specific product
POST /admin/cache/warm/product/:productId

# Warm category
POST /admin/cache/warm/category/:categoryId
```

## Health Monitoring

### Check Cache Health
```bash
GET /admin/cache/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "connected": true,
    "uptime": 86400,
    "metrics": {
      "totalKeys": 1234,
      "memoryUsed": "45.2M",
      "hitRate": "78.5%",
      "hits": 5000,
      "misses": 1500
    },
    "breakdown": {
      "products": 500,
      "users": 200,
      "sessions": 150,
      "carts": 100,
      "searches": 234,
      "rateLimits": 50
    },
    "warnings": []
  }
}
```

### View Statistics
```bash
GET /admin/cache/stats
```

## Configuration

### TTL Values

Defined in `cache.service.ts`:
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

### Cache Prefixes

Defined in `cache.service.ts`:
```typescript
export enum CachePrefix {
  PRODUCT = 'product:',
  PRODUCT_LIST = 'product_list:',
  CATEGORY = 'category:',
  USER = 'user:',
  SESSION = 'session:',
  CART = 'cart:',
  SEARCH = 'search:',
  TRENDING = 'trending:',
  RATE_LIMIT = 'rate_limit:',
  VENDOR = 'vendor:',
  ORDER = 'order:',
}
```

## Admin Endpoints

All admin endpoints require authentication and admin role.

### Management
- `GET /admin/cache/health` - Cache health status
- `GET /admin/cache/stats` - Detailed statistics
- `GET /admin/cache/keys?pattern=*` - List cache keys
- `POST /admin/cache/warm` - Warm all caches
- `POST /admin/cache/cleanup` - Cleanup expired entries
- `DELETE /admin/cache/all` - Clear all cache (use with caution!)

### Invalidation
- `DELETE /admin/cache/product/:id` - Invalidate product
- `DELETE /admin/cache/category/:id` - Invalidate category
- `DELETE /admin/cache/user/:id` - Invalidate user
- `DELETE /admin/cache/search` - Invalidate all searches
- `DELETE /admin/cache/products/lists` - Invalidate product lists

## Best Practices

### 1. Use Get-or-Load Pattern
Always prefer `getOrLoad*` methods over separate get/set:
```typescript
// Good ✅
const data = await this.cacheService.getOrSet(key, loader, options);

// Avoid ❌
let data = await this.cacheService.get(key);
if (!data) {
  data = await loadData();
  await this.cacheService.set(key, data);
}
```

### 2. Set Appropriate TTLs
Choose TTL based on data volatility:
- Static data (categories): LONG or VERY_LONG
- Dynamic data (search results): MEDIUM or SHORT
- User sessions: DAY
- Rate limits: Based on window size

### 3. Implement Event-Driven Invalidation
Emit events when data changes and listen in cache services:
```typescript
// Emit event
this.eventEmitter.emit('product.updated', { productId });

// Listen and invalidate
@OnEvent('product.updated')
async handleProductUpdated(payload: { productId: string }) {
  await this.invalidateProduct(payload.productId);
}
```

### 4. Handle Cache Failures Gracefully
Always have fallback logic:
```typescript
try {
  const cached = await this.cacheService.get(key);
  if (cached) return cached;
} catch (error) {
  this.logger.error('Cache error:', error);
  // Continue to load from source
}

return this.loadFromDatabase();
```

### 5. Monitor Cache Health
Regularly check cache metrics and adjust strategy:
- Target hit rate: >70%
- Memory usage: <80%
- Response time: <10ms for cache hits

## Troubleshooting

### Cache Not Working
1. Check Redis connection: `GET /admin/cache/health`
2. Verify environment variables (REDIS_HOST, REDIS_PORT)
3. Review logs for connection errors
4. Test Redis directly: `redis-cli ping`

### Low Hit Rate
1. Check TTL settings (may be too short)
2. Review invalidation patterns (may be too aggressive)
3. Verify cache key consistency
4. Analyze access patterns

### Memory Issues
1. Review TTL settings
2. Check for memory leaks
3. Implement cleanup tasks
4. Adjust Redis maxmemory policy

## Testing

### Unit Tests
```typescript
describe('ProductCacheService', () => {
  let service: ProductCacheService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductCacheService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ProductCacheService>(ProductCacheService);
  });

  it('should cache product', async () => {
    const product = { id: '1', name: 'Test' };
    await service.setProduct('1', product);
    const cached = await service.getProduct('1');
    expect(cached).toEqual(product);
  });
});
```

## Additional Resources

- [Full Caching Strategy Documentation](../../docs/CACHING_STRATEGY.md)
- [Redis Documentation](https://redis.io/documentation)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)

## Support

For questions or issues:
1. Check this README
2. Review [CACHING_STRATEGY.md](../../docs/CACHING_STRATEGY.md)
3. Check application logs
4. Contact the development team
