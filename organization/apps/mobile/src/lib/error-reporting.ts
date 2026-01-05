/**
 * Error Reporting Service for React Native Mobile App
 * Centralized error handling and reporting to external monitoring services
 */

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorContext {
  [key: string]: any;
}

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
}

export interface ErrorMetadata {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * Error Reporting Service Class for Mobile
 * Provides centralized error tracking with Sentry integration
 */
class ErrorReportingService {
  private initialized = false;
  private userContext: UserContext | null = null;

  /**
   * Initialize the error reporting service
   */
  initialize(dsn?: string): void {
    if (this.initialized) {
      return;
    }

    const sentryDsn = dsn || process.env.EXPO_PUBLIC_SENTRY_DSN;

    if (!sentryDsn) {
      console.warn('[ErrorReporting] Sentry DSN not configured');
      return;
    }

    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: __DEV__ ? 'development' : 'production',
        enableAutoSessionTracking: true,
        enableNative: true,
        enableNativeCrashHandling: true,
        enableNativeNagger: __DEV__,

        // Performance Monitoring
        tracesSampleRate: __DEV__ ? 1.0 : 0.2,
        enableAppHangTracking: true,
        enableWatchdogTerminationTracking: true,

        // Session tracking
        sessionTrackingIntervalMillis: 30000,

        // Tracing options moved to root config in v6+
        enableAppStartTracking: true,
        enableNativeFramesTracking: true,
        enableStallTracking: true,
        enableUserInteractionTracing: true,

        integrations: [
          // Updated from deprecated ReactNativeTracing class
          Sentry.reactNativeTracingIntegration({
            // tracingOrigins moved to tracePropagationTargets in root config
          }),
          // Updated from deprecated ReactNavigationInstrumentation class
          Sentry.reactNavigationIntegration(),
        ],

        // Tracing propagation targets (replaces tracingOrigins)
        tracePropagationTargets: ['localhost', /^\//],

        beforeSend(event, hint) {
          // Filter out specific errors
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

          // Add platform-specific context
          if (event.contexts) {
            event.contexts.device = {
              ...event.contexts.device,
              platform: Platform.OS,
              version: Platform.Version,
            };
          }

          return event;
        },

        // Ignore certain errors
        ignoreErrors: [
          'Network request failed',
          'NetworkError',
          'Network Error',
          'Timeout',
          'AbortError',
        ],

        // Set context defaults
        initialScope: {
          tags: {
            runtime: 'react-native',
            platform: Platform.OS,
          },
        },
      });

      this.initialized = true;
      console.log('[ErrorReporting] Service initialized with Sentry');
    } catch (error) {
      console.error('[ErrorReporting] Failed to initialize:', error);
    }
  }

  /**
   * Check if the service is initialized and ready
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Capture and report an exception
   */
  captureException(
    error: Error,
    severity: ErrorSeverity = 'error',
    context?: ErrorContext,
    metadata?: ErrorMetadata
  ): string | undefined {
    if (!this.initialized) {
      console.error('[ErrorReporting] Service not initialized', error);
      return undefined;
    }

    try {
      // Log to console in development
      if (__DEV__) {
        console.error('[ErrorReporting] Exception:', error);
        console.error('[ErrorReporting] Context:', context);
        console.error('[ErrorReporting] Metadata:', metadata);
      }

      // Build Sentry scope
      const eventId = Sentry.captureException(error, {
        level: severity,
        contexts: context ? { custom: context } : undefined,
        tags: metadata
          ? {
              component: metadata.component,
              action: metadata.action,
              ...metadata,
            }
          : undefined,
        extra: {
          metadata,
          userContext: this.userContext,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          version: Platform.Version,
        },
      });

      return eventId;
    } catch (err) {
      console.error('[ErrorReporting] Failed to capture exception:', err);
      return undefined;
    }
  }

  /**
   * Capture and report a message
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    context?: ErrorContext,
    metadata?: ErrorMetadata
  ): string | undefined {
    if (!this.initialized) {
      console.warn('[ErrorReporting] Service not initialized', message);
      return undefined;
    }

    try {
      // Log to console in development
      if (__DEV__) {
        console.log(`[ErrorReporting] Message (${severity}):`, message);
        console.log('[ErrorReporting] Context:', context);
        console.log('[ErrorReporting] Metadata:', metadata);
      }

      const eventId = Sentry.captureMessage(message, {
        level: severity,
        contexts: context ? { custom: context } : undefined,
        tags: metadata
          ? {
              component: metadata.component,
              action: metadata.action,
              ...metadata,
            }
          : undefined,
        extra: {
          metadata,
          userContext: this.userContext,
          timestamp: new Date().toISOString(),
        },
      });

      return eventId;
    } catch (err) {
      console.error('[ErrorReporting] Failed to capture message:', err);
      return undefined;
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: UserContext | null): void {
    this.userContext = user;

    if (this.initialized) {
      try {
        Sentry.setUser(
          user
            ? {
                id: user.id,
                email: user.email,
                username: user.username || user.name,
              }
            : null
        );
      } catch (err) {
        console.error('[ErrorReporting] Failed to set user context:', err);
      }
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.userContext = null;

    if (this.initialized) {
      try {
        Sentry.setUser(null);
      } catch (err) {
        console.error('[ErrorReporting] Failed to clear user context:', err);
      }
    }
  }

  /**
   * Add a breadcrumb for error context
   */
  addBreadcrumb(
    category: string,
    message: string,
    level: ErrorSeverity = 'info',
    data?: Record<string, any>
  ): void {
    if (!this.initialized) {
      return;
    }

    try {
      Sentry.addBreadcrumb({
        category,
        message,
        level,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[ErrorReporting] Failed to add breadcrumb:', err);
    }
  }

  /**
   * Set custom context for error tracking
   */
  setContext(name: string, context: ErrorContext): void {
    if (!this.initialized) {
      return;
    }

    try {
      Sentry.setContext(name, context);
    } catch (err) {
      console.error('[ErrorReporting] Failed to set context:', err);
    }
  }

  /**
   * Set a tag for filtering errors
   */
  setTag(key: string, value: string): void {
    if (!this.initialized) {
      return;
    }

    try {
      Sentry.setTag(key, value);
    } catch (err) {
      console.error('[ErrorReporting] Failed to set tag:', err);
    }
  }

  /**
   * Start a performance span (replaces deprecated startTransaction)
   * Uses the new Sentry v8+ span API
   */
  startSpan<T>(
    name: string,
    operation: string,
    callback: (span: Sentry.Span | undefined) => T
  ): T | null {
    if (!this.initialized) {
      return callback(undefined);
    }

    try {
      return Sentry.startSpan(
        {
          name,
          op: operation,
        },
        callback
      );
    } catch (err) {
      console.error('[ErrorReporting] Failed to start span:', err);
      return null;
    }
  }

  /**
   * Start an inactive span that can be ended manually later
   * (replaces deprecated startTransaction for manual control)
   */
  startInactiveSpan(name: string, operation: string): Sentry.Span | null {
    if (!this.initialized) {
      return null;
    }

    try {
      return Sentry.startInactiveSpan({
        name,
        op: operation,
      });
    } catch (err) {
      console.error('[ErrorReporting] Failed to start inactive span:', err);
      return null;
    }
  }

  /**
   * Capture a user feedback report
   */
  captureUserFeedback(
    eventId: string,
    name: string,
    email: string,
    comments: string
  ): void {
    if (!this.initialized) {
      return;
    }

    try {
      Sentry.captureUserFeedback({
        event_id: eventId,
        name,
        email,
        comments,
      });
    } catch (err) {
      console.error('[ErrorReporting] Failed to capture user feedback:', err);
    }
  }

  /**
   * Handle API errors with standardized reporting
   */
  handleApiError(
    error: any,
    endpoint: string,
    method: string = 'GET',
    context?: ErrorContext
  ): void {
    const metadata: ErrorMetadata = {
      component: 'API',
      action: `${method} ${endpoint}`,
      endpoint,
      method,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
    };

    this.captureException(error, 'error', context, metadata);
    this.addBreadcrumb('api', `API Error: ${method} ${endpoint}`, 'error', {
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
    });
  }

  /**
   * Handle UI errors with standardized reporting
   */
  handleUIError(
    error: Error,
    componentName: string,
    action?: string,
    context?: ErrorContext
  ): void {
    const metadata: ErrorMetadata = {
      component: componentName,
      action: action || 'render',
      errorType: 'UI',
    };

    this.captureException(error, 'error', context, metadata);
    this.addBreadcrumb('ui', `UI Error in ${componentName}`, 'error', {
      action,
      componentName,
    });
  }

  /**
   * Track a custom event (analytics-style tracking)
   */
  trackEvent(
    eventName: string,
    properties?: Record<string, any>
  ): void {
    if (!this.initialized) {
      return;
    }

    this.addBreadcrumb('user-action', eventName, 'info', properties);
  }

  /**
   * Wrap a component with native crash detection
   */
  wrap<T extends React.ComponentType<any>>(component: T): T {
    if (!this.initialized) {
      return component;
    }

    return Sentry.wrap(component) as T;
  }

  /**
   * Native crash handling
   */
  nativeCrash(): void {
    if (this.initialized && typeof Sentry.nativeCrash === 'function') {
      Sentry.nativeCrash();
    }
  }

  /**
   * Close the Sentry client and flush all events
   */
  async close(timeout: number = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      return await Sentry.close(timeout);
    } catch (err) {
      console.error('[ErrorReporting] Failed to close:', err);
      return false;
    }
  }

  /**
   * Flush all pending events
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      return await Sentry.flush(timeout);
    } catch (err) {
      console.error('[ErrorReporting] Failed to flush:', err);
      return false;
    }
  }
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

// Export helper functions for convenience
export const initializeErrorReporting = (dsn?: string) =>
  errorReporting.initialize(dsn);

export const captureException = (
  error: Error,
  severity?: ErrorSeverity,
  context?: ErrorContext,
  metadata?: ErrorMetadata
) => errorReporting.captureException(error, severity, context, metadata);

export const captureMessage = (
  message: string,
  severity?: ErrorSeverity,
  context?: ErrorContext,
  metadata?: ErrorMetadata
) => errorReporting.captureMessage(message, severity, context, metadata);

export const setUser = (user: UserContext | null) => errorReporting.setUser(user);

export const clearUser = () => errorReporting.clearUser();

export const addBreadcrumb = (
  category: string,
  message: string,
  level?: ErrorSeverity,
  data?: Record<string, any>
) => errorReporting.addBreadcrumb(category, message, level, data);

export const handleApiError = (
  error: any,
  endpoint: string,
  method?: string,
  context?: ErrorContext
) => errorReporting.handleApiError(error, endpoint, method, context);

export const handleUIError = (
  error: Error,
  componentName: string,
  action?: string,
  context?: ErrorContext
) => errorReporting.handleUIError(error, componentName, action, context);

export const trackEvent = (eventName: string, properties?: Record<string, any>) =>
  errorReporting.trackEvent(eventName, properties);

export default errorReporting;
