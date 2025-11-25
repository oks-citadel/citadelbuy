import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * Decorator to cache method results
 * @param keyPrefix Prefix for the cache key
 * @param ttl Time to live in seconds (default: 1 hour)
 *
 * @example
 * @CacheResult('products', 300) // Cache for 5 minutes
 * async findAll() {
 *   return this.productService.findAll();
 * }
 */
export const CacheResult = (keyPrefix: string, ttl: number = 3600) =>
  SetMetadata(CACHE_KEY_METADATA, { keyPrefix, ttl });

/**
 * Decorator to invalidate cache on method execution
 * @param patterns Array of cache key patterns to invalidate
 *
 * @example
 * @InvalidateCache(['products:*', 'categories:*'])
 * async create(dto: CreateProductDto) {
 *   return this.productService.create(dto);
 * }
 */
export const InvalidateCache = (...patterns: string[]) =>
  SetMetadata('cache:invalidate', patterns);
