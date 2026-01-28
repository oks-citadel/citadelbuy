import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const patterns = this.reflector.get<string[]>(
      'cache:invalidate',
      context.getHandler(),
    );

    if (!patterns || patterns.length === 0 || !this.redisService.isRedisConnected()) {
      return next.handle();
    }

    // Invalidate cache after successful execution
    return next.handle().pipe(
      tap(async () => {
        try {
          for (const pattern of patterns) {
            const deletedCount = await this.redisService.delPattern(pattern);
            if (deletedCount > 0) {
              this.logger.debug(`Invalidated ${deletedCount} cache entries matching: ${pattern}`);
            }
          }
        } catch (error) {
          this.logger.error('Error invalidating cache:', error);
        }
      }),
    );
  }
}
