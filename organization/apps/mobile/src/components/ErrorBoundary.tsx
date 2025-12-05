import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { errorReporting } from '../lib/error-reporting';

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
 * Error Boundary Component for React Native Mobile Application
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
          platform: Platform.OS,
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
          platform: Platform.OS,
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
      platform: Platform.OS,
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
 * Default Error Fallback UI for React Native
 * Displays when an error is caught by the Error Boundary
 */
function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  eventId,
  componentName,
}: ErrorFallbackProps): React.ReactElement {
  const isDevelopment = __DEV__;
  const [showDetails, setShowDetails] = React.useState(false);

  const handleCopyErrorId = () => {
    if (eventId) {
      Clipboard.setString(eventId);
      Alert.alert('Copied', 'Error ID copied to clipboard');
    }
  };

  const handleRetry = () => {
    errorReporting.trackEvent('error-retry-clicked', {
      component: componentName,
      eventId,
      platform: Platform.OS,
    });
    resetError();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={48} color="#dc2626" />
          </View>
        </View>

        {/* Error Title */}
        <Text style={styles.title}>Oops! Something went wrong</Text>

        {/* Error Message */}
        <Text style={styles.message}>
          We're sorry for the inconvenience. An unexpected error occurred while loading this screen.
          {eventId && ' Our team has been automatically notified and will investigate the issue.'}
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>

        {/* Error ID Display */}
        {eventId && (
          <View style={styles.errorIdContainer}>
            <Text style={styles.errorIdLabel}>Error ID:</Text>
            <TouchableOpacity
              style={styles.errorIdBox}
              onPress={handleCopyErrorId}
              activeOpacity={0.7}
            >
              <Text style={styles.errorIdText}>{eventId}</Text>
              <Ionicons name="copy-outline" size={16} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.errorIdHint}>
              Tap to copy • Reference this when contacting support
            </Text>
          </View>
        )}

        {/* Development Error Details */}
        {isDevelopment && error && (
          <View style={styles.devContainer}>
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showDetails ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color="#6b7280"
              />
              <Text style={styles.detailsToggleText}>
                Error Details (Development Only)
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.detailsContainer}>
                {/* Error Message */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>ERROR MESSAGE</Text>
                  <View style={styles.errorMessageBox}>
                    <Text style={styles.errorMessageText}>{error.message}</Text>
                  </View>
                </View>

                {/* Error Stack */}
                {error.stack && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>STACK TRACE</Text>
                    <ScrollView
                      style={styles.stackTraceBox}
                      nestedScrollEnabled={true}
                    >
                      <Text style={styles.stackTraceText}>{error.stack}</Text>
                    </ScrollView>
                  </View>
                )}

                {/* Component Stack */}
                {errorInfo?.componentStack && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>COMPONENT STACK</Text>
                    <ScrollView
                      style={styles.stackTraceBox}
                      nestedScrollEnabled={true}
                    >
                      <Text style={styles.stackTraceText}>
                        {errorInfo.componentStack}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Support Message */}
        <Text style={styles.supportText}>
          If the problem persists, please contact our support team at support@citadelbuy.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  devContainer: {
    width: '100%',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 24,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  detailsContainer: {
    marginTop: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  errorMessageBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
  },
  errorMessageText: {
    fontSize: 13,
    color: '#991b1b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  stackTraceBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  stackTraceText: {
    fontSize: 11,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  supportText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
  },
  errorIdContainer: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  errorIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorIdText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#374151',
  },
  errorIdHint: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

/**
 * Hook to use Error Boundary imperatively
 * Allows throwing errors from event handlers or async code
 *
 * @example
 * const throwError = useErrorHandler();
 *
 * const handlePress = async () => {
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
