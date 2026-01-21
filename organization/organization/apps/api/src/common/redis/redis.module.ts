import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';
import { ProductCacheService } from './product-cache.service';
import { SessionCacheService } from './session-cache.service';
import { SearchCacheService } from './search-cache.service';
import { CartCacheService } from './cart-cache.service';
import { RateLimitCacheService } from './rate-limit-cache.service';
import { CacheWarmingService } from './cache-warming.service';
import { CacheHealthService } from './cache-health.service';
import { CacheAdminController } from './cache-admin.controller';

@Global()
@Module({
  controllers: [CacheAdminController],
  providers: [
    RedisService,
    CacheService,
    ProductCacheService,
    SessionCacheService,
    SearchCacheService,
    CartCacheService,
    RateLimitCacheService,
    CacheWarmingService,
    CacheHealthService,
  ],
  exports: [
    RedisService,
    CacheService,
    ProductCacheService,
    SessionCacheService,
    SearchCacheService,
    CartCacheService,
    RateLimitCacheService,
    CacheWarmingService,
    CacheHealthService,
  ],
})
export class RedisModule {}
