'use client';

import * as React from 'react';
import { errorReporting } from '@/lib/error-reporting';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  eventId: string | undefined;
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
  eventId?: string;
  componentName?: string;
}

/**
 * Error Boundary Component for Next.js Web Application
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 * Automatically reports errors to Sentry with full context
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details to console
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to Sentry with full context
    try {
      const eventId = errorReporting.captureException(
        error,
        'error',
        {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        {
          component: this.props.componentName || 'ErrorBoundary',
          action: 'componentDidCatch',
          errorBoundary: 'true',
          location: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        }
      );

      // Add breadcrumb for context
      errorReporting.addBreadcrumb(
        'error-boundary',
        `Error caught in ${this.props.componentName || 'ErrorBoundary'}`,
        'error',
        {
          errorMessage: error.message,
          errorName: error.name,
        }
      );

      // Update state with error info and event ID
      this.setState({
        errorInfo,
        eventId,
      });
    } catch (reportingError) {
      console.error('Failed to report error to Sentry:', reportingError);
      this.setState({
        errorInfo,
      });
    }
  }

  resetError = (): void => {
    // Track error recovery attempt
    errorReporting.trackEvent('error-boundary-reset', {
      component: this.props.componentName,
      hadEventId: !!this.state.eventId,
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: undefined,
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          eventId={this.state.eventId}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 * Displays when an error is caught by the Error Boundary
 */
function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  eventId,
  componentName,
}: ErrorFallbackProps): React.ReactElement {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);

  const handleReportIssue = () => {
    if (eventId) {
      errorReporting.showReportDialog(eventId);
    } else {
      // Fallback: show a generic feedback form
      alert('Error reporting is temporarily unavailable. Please contact support directly.');
    }
  };

  const handleRetry = () => {
    errorReporting.trackEvent('error-retry-clicked', {
      component: componentName,
      eventId,
    });
    resetError();
  };

  const handleGoHome = () => {
    errorReporting.trackEvent('error-go-home-clicked', {
      component: componentName,
      eventId,
    });
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Oops! Something went wrong
          </h1>

          {/* Error Message */}
          <p className="text-gray-600 text-center mb-6">
            We&apos;re sorry for the inconvenience. An unexpected error occurred while loading this page.
            {eventId && ' Our team has been automatically notified and will investigate the issue.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
            <button
              onClick={handleGoHome}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Go to Homepage
            </button>
          </div>

          {/* Report Issue Button */}
          {eventId && !feedbackSubmitted && (
            <div className="flex justify-center mb-6">
              <button
                onClick={handleReportIssue}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
              >
                Report this issue to our team
              </button>
            </div>
          )}

          {/* Development Error Details */}
          {isDevelopment && error && (
            <div className="mt-6 border-t pt-6">
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 mb-2 flex items-center gap-2">
                  <span className="transform transition-transform group-open:rotate-90">▶</span>
                  Error Details (Development Only)
                </summary>
                <div className="mt-4 space-y-4">
                  {/* Error Message */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                      Error Message
                    </h3>
                    <pre className="text-xs bg-red-50 text-red-900 p-4 rounded-lg overflow-x-auto border border-red-200">
                      {error.message}
                    </pre>
                  </div>

                  {/* Error Stack */}
                  {error.stack && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                        Stack Trace
                      </h3>
                      <pre className="text-xs bg-gray-50 text-gray-900 p-4 rounded-lg overflow-x-auto border border-gray-200 max-h-64 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {/* Component Stack */}
                  {errorInfo?.componentStack && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                        Component Stack
                      </h3>
                      <pre className="text-xs bg-gray-50 text-gray-900 p-4 rounded-lg overflow-x-auto border border-gray-200 max-h-64 overflow-y-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Error ID for Reference */}
          {eventId && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center">
                Error ID: <code className="font-mono text-gray-700">{eventId}</code>
              </p>
              <p className="text-xs text-gray-400 text-center mt-1">
                (Reference this ID when contacting support)
              </p>
            </div>
          )}

          {/* Support Message */}
          <p className="text-xs text-gray-500 text-center mt-6">
            If the problem persists, please contact our support team at support@broxiva.com
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to use Error Boundary imperatively
 * Allows throwing errors from event handlers or async code
 *
 * @example
 * const throwError = useErrorHandler();
 *
 * const handleClick = async () => {
 *   try {
 *     await someAsyncOperation();
 *   } catch (error) {
 *     throwError(error);
 *   }
 * }
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}
