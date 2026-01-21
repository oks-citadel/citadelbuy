import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RetryableErrorProps {
  error?: Error | string | null;
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  title?: string;
  description?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'inline';
}

/**
 * RetryableError Component
 *
 * A user-friendly error display with retry functionality for React Native.
 */
export function RetryableError({
  error,
  onRetry,
  isRetrying = false,
  title,
  description,
  style,
  size = 'md',
  variant = 'default',
}: RetryableErrorProps) {
  const errorMessage = error instanceof Error ? error.message : error;
  const isNetworkError = errorMessage?.toLowerCase().includes('network') ||
    errorMessage?.toLowerCase().includes('fetch') ||
    errorMessage?.toLowerCase().includes('timeout');

  const sizeStyles = {
    sm: { iconSize: 40, title: 14, description: 12, padding: 16 },
    md: { iconSize: 56, title: 16, description: 14, padding: 24 },
    lg: { iconSize: 72, title: 18, description: 15, padding: 32 },
  };

  const currentSize = sizeStyles[size];

  const content = (
    <View style={[styles.content, { padding: currentSize.padding }, style]}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isNetworkError ? '#fef3c7' : '#fee2e2',
          },
        ]}
      >
        <Ionicons
          name={isNetworkError ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={currentSize.iconSize}
          color={isNetworkError ? '#d97706' : '#dc2626'}
        />
      </View>

      <Text style={[styles.title, { fontSize: currentSize.title }]}>
        {title || (isNetworkError ? 'Connection Error' : 'Something went wrong')}
      </Text>

      <Text style={[styles.description, { fontSize: currentSize.description }]}>
        {description || (isNetworkError
          ? 'Please check your internet connection and try again.'
          : 'We encountered an error while loading this content.')}
      </Text>

      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={onRetry}
          disabled={isRetrying}
          activeOpacity={0.8}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {__DEV__ && errorMessage && (
        <View style={styles.devContainer}>
          <Text style={styles.devLabel}>Error Details (Dev):</Text>
          <Text style={styles.devMessage} numberOfLines={3}>
            {errorMessage}
          </Text>
        </View>
      )}
    </View>
  );

  if (variant === 'card') {
    return (
      <View style={styles.card}>
        {content}
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View style={styles.inline}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    margin: 16,
  },
  inline: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    margin: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  devContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  devLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  devMessage: {
    fontSize: 11,
    color: '#374151',
    fontFamily: 'monospace',
  },
});

export default RetryableError;
