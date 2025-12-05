import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Sentry Service
 * Initializes and manages Sentry error tracking and performance monitoring
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initialize();
  }

  /**
   * Initialize Sentry SDK with configuration
   */
  private initialize(): void {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>('NODE_ENV') || 'development';
    const release = this.configService.get<string>('npm_package_version') || '1.0.0';

    if (!dsn) {
      this.logger.warn('SENTRY_DSN not configured. Error tracking disabled.');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        release: `citadelbuy-backend@${release}`,

        // Performance Monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0, // Profile 10% of transactions

        integrations: [
          // Performance profiling (new API)
          nodeProfilingIntegration(),
        ],

        // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
        // We recommend adjusting this value in production
        beforeSend(event, hint) {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.cookies;

            // Sanitize headers
            if (event.request.headers) {
              const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'api-key'];
              sensitiveHeaders.forEach(header => {
                if (event.request?.headers?.[header]) {
                  event.request.headers[header] = '[REDACTED]';
                }
              });
            }

            // Sanitize query params that might contain sensitive data
            if (event.request.query_string && typeof event.request.query_string === 'string') {
              const sensitiveParams = ['password', 'token', 'secret', 'api_key', 'apiKey'];
              let queryString = event.request.query_string;
              sensitiveParams.forEach(param => {
                const regex = new RegExp(`${param}=[^&]*`, 'gi');
                queryString = queryString.replace(regex, `${param}=[REDACTED]`);
              });
              event.request.query_string = queryString;
            }
          }

          // Filter out specific errors if needed
          if (hint.originalException) {
            const error = hint.originalException as any;

            // Don't report validation errors
            if (error.status === 400 || error.statusCode === 400) {
              return null;
            }

            // Don't report authentication errors
            if (error.status === 401 || error.statusCode === 401) {
              return null;
            }
          }

          return event;
        },

        // Ignore certain errors
        ignoreErrors: [
          // Browser errors
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',

          // Network errors
          'Network request failed',
          'NetworkError',

          // Common third-party errors
          'ChunkLoadError',
          'Loading chunk',

          // Validation errors
          'ValidationError',
          'Bad Request',
        ],

        // Set context defaults
        initialScope: {
          tags: {
            runtime: 'node',
            platform: 'backend',
          },
        },
      });

      this.initialized = true;
      this.logger.log(`Sentry initialized successfully (Environment: ${environment}, Release: ${release})`);
    } catch (error) {
      this.logger.error('Failed to initialize Sentry', error);
    }
  }

  /**
   * Check if Sentry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Capture an exception
   */
  captureException(exception: any, context?: Record<string, any>): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.captureException(exception, {
      extra: context,
    });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.captureMessage(message, level);
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(null);
  }

  /**
   * Set custom context
   */
  setContext(name: string, context: Record<string, any>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setContext(name, context);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Start a span for performance monitoring (new API)
   */
  startSpan<T>(options: { name: string; op?: string }, callback: () => T): T {
    return Sentry.startSpan(options, callback);
  }

  /**
   * Get Sentry instance for advanced usage
   */
  getSentry(): typeof Sentry {
    return Sentry;
  }
}
