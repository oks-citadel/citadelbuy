import {
  Module,
  Global,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';
import { MetricsModule } from '../monitoring/metrics.module';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { CorrelationIdMiddlewareWithStorage } from '../middleware/correlation-id.middleware';

/**
 * Observability Module
 *
 * Centralizes all observability features:
 * - Request correlation ID tracking
 * - Structured logging with JSON format for production
 * - Prometheus metrics collection
 * - Request/response logging with timing
 *
 * This module should be imported in AppModule to enable observability features.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    MetricsModule,
  ],
  providers: [
    // Global logging interceptor with metrics integration
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [
    LoggerModule,
    MetricsModule,
  ],
})
export class ObservabilityModule implements NestModule {
  /**
   * Configure middleware for correlation ID tracking
   *
   * The correlation ID middleware is applied to all routes and sets up:
   * - X-Request-Id: Unique identifier for this request
   * - X-Correlation-Id: Identifier for tracking across services
   * - X-Trace-Id: Distributed tracing identifier
   * - X-Span-Id: Service span identifier
   *
   * It also stores the correlation context in AsyncLocalStorage for
   * access anywhere in the request lifecycle.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddlewareWithStorage)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
