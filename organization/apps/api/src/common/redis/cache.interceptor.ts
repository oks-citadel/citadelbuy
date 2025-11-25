import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';
import { CACHE_KEY_METADATA } from './cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheMetadata = this.reflector.get<{ keyPrefix: string; ttl: number }>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    // Skip if no cache metadata
    if (!cacheMetadata || !this.redisService.isRedisConnected()) {
      return next.handle();
    }

    const { keyPrefix, ttl } = cacheMetadata;
    const request = context.switchToHttp().getRequest();

    // Generate cache key from route, query params, and body
    const cacheKey = this.generateCacheKey(keyPrefix, request);

    try {
      // Try to get from cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData !== null) {
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return of(cachedData);
      }

      this.logger.debug(`Cache MISS: ${cacheKey}`);

      // Cache miss - execute handler and cache result
      return next.handle().pipe(
        tap(async (data) => {
          try {
            await this.redisService.set(cacheKey, data, ttl);
            this.logger.debug(`Cached result for: ${cacheKey} (TTL: ${ttl}s)`);
          } catch (error) {
            this.logger.error(`Error caching result for ${cacheKey}:`, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache error for ${cacheKey}:`, error);
      // On error, bypass cache and execute handler
      return next.handle();
    }
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(prefix: string, request: any): string {
    const url = request.url || '';
    const method = request.method || 'GET';
    const query = JSON.stringify(request.query || {});
    const userId = request.user?.id || 'anonymous';

    // Create a deterministic cache key
    const keyParts = [prefix, method, url, query, userId];
    return keyParts.join(':').replace(/[^a-zA-Z0-9:_-]/g, '_');
  }
}
