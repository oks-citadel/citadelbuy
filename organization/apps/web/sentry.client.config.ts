import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
      new Sentry.BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          /^\//,
          /^https:\/\/citadelbuy\.com/,
        ],
      }),
    ],

    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-error events
      if (event.level === 'warning' || event.level === 'info') {
        return null;
      }

      // Filter out specific errors
      if (event.exception?.values) {
        const errorMessage = event.exception.values[0]?.value || '';

        // Don't report common browser errors
        const ignoredErrors = [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection',
          'ChunkLoadError',
          'Loading chunk',
          'Network request failed',
        ];

        if (ignoredErrors.some((msg) => errorMessage.includes(msg))) {
          return null;
        }
      }

      return event;
    },

    // Ignore specific URLs
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'ChunkLoadError',
      'Loading chunk',
    ],

    // Set context defaults
    initialScope: {
      tags: {
        runtime: 'browser',
        platform: 'web',
      },
    },
  });
}
