/**
 * Error Reporting Service
 * Centralized error handling and reporting to external monitoring services
 */

import * as Sentry from '@sentry/nextjs';

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
 * Error Reporting Service Class
 * Provides centralized error tracking with Sentry integration
 */
class ErrorReportingService {
  private initialized = false;
  private userContext: UserContext | null = null;

  /**
   * Initialize the error reporting service
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Check if Sentry is configured
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (sentryDsn) {
      this.initialized = true;
      console.log('[ErrorReporting] Service initialized with Sentry');
    } else {
      console.warn('[ErrorReporting] Sentry DSN not configured');
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
      if (process.env.NODE_ENV === 'development') {
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
          url: typeof window !== 'undefined' ? window.location.href : undefined,
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
      if (process.env.NODE_ENV === 'development') {
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
   * Start a performance transaction
   */
  startTransaction(name: string, operation: string): Sentry.Transaction | null {
    if (!this.initialized) {
      return null;
    }

    try {
      return Sentry.startTransaction({
        name,
        op: operation,
      });
    } catch (err) {
      console.error('[ErrorReporting] Failed to start transaction:', err);
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
   * Show user feedback dialog for error reporting
   */
  showReportDialog(eventId?: string): void {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }

    try {
      Sentry.showReportDialog({
        eventId,
        title: 'Report an Issue',
        subtitle: 'Help us improve by reporting what happened.',
        subtitle2: "We'll get back to you as soon as possible.",
        labelName: 'Name',
        labelEmail: 'Email',
        labelComments: 'What happened?',
        labelClose: 'Close',
        labelSubmit: 'Submit',
        errorGeneric: 'An error occurred while submitting your feedback. Please try again.',
        errorFormEntry: 'Please check your form entries.',
        successMessage: 'Thank you for your feedback!',
      });
    } catch (err) {
      console.error('[ErrorReporting] Failed to show report dialog:', err);
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
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

// Initialize on module load
if (typeof window !== 'undefined') {
  errorReporting.initialize();
}

// Export helper functions for convenience
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

export const showReportDialog = (eventId?: string) =>
  errorReporting.showReportDialog(eventId);

export default errorReporting;
