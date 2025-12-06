import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-error events
      if (event.level === 'warning' || event.level === 'info') {
        return null;
      }

      // Sanitize sensitive data from request
      if (event.request) {
        delete event.request.cookies;

        // Sanitize headers
        if (event.request.headers) {
          const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'api-key'];
          sensitiveHeaders.forEach((header) => {
            if (event.request?.headers?.[header]) {
              event.request.headers[header] = '[REDACTED]';
            }
          });
        }
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'Network request failed',
    ],

    // Set context defaults
    initialScope: {
      tags: {
        runtime: 'node',
        platform: 'server',
      },
    },
  });
}
