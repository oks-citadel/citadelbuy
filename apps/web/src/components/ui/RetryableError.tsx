'use client';

import * as React from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RetryableErrorProps {
  error: Error | string | null;
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  title?: string;
  description?: string;
  showDetails?: boolean;
  variant?: 'default' | 'card' | 'inline' | 'toast';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * RetryableError Component
 *
 * A user-friendly error display with retry functionality.
 * Use this for:
 * - API request failures
 * - Network errors
 * - Data loading failures
 *
 * Features:
 * - Clear error messaging
 * - Retry button with loading state
 * - Expandable error details (for debugging)
 * - Network error detection
 */
export function RetryableError({
  error,
  onRetry,
  isRetrying = false,
  title,
  description,
  showDetails = process.env.NODE_ENV === 'development',
  variant = 'default',
  size = 'md',
  className,
}: RetryableErrorProps) {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const errorMessage = error instanceof Error ? error.message : error;
  const isNetworkError = errorMessage?.toLowerCase().includes('network') ||
    errorMessage?.toLowerCase().includes('fetch') ||
    errorMessage?.toLowerCase().includes('offline');

  const sizeClasses = {
    sm: {
      icon: 'h-4 w-4',
      title: 'text-sm',
      description: 'text-xs',
      button: 'sm' as const,
    },
    md: {
      icon: 'h-5 w-5',
      title: 'text-base',
      description: 'text-sm',
      button: 'default' as const,
    },
    lg: {
      icon: 'h-6 w-6',
      title: 'text-lg',
      description: 'text-base',
      button: 'lg' as const,
    },
  };

  const content = (
    <div className={cn('text-center', className)}>
      <div className="flex justify-center mb-3">
        {isNetworkError ? (
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <WifiOff className="h-6 w-6 text-amber-600" />
          </div>
        ) : (
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
        )}
      </div>

      <h3 className={cn('font-semibold text-foreground mb-1', sizeClasses[size].title)}>
        {title || (isNetworkError ? 'Connection Error' : 'Something went wrong')}
      </h3>

      <p className={cn('text-muted-foreground mb-4', sizeClasses[size].description)}>
        {description || (isNetworkError
          ? 'Please check your internet connection and try again.'
          : 'We encountered an error while loading this content.')}
      </p>

      {onRetry && (
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          size={sizeClasses[size].button}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      )}

      {showDetails && errorMessage && (
        <div className="mt-4 text-left">
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDetailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Error details
          </button>
          {isDetailsOpen && (
            <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
              {errorMessage}
            </pre>
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4">
        {content}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <AlertCircle className={cn('text-destructive flex-shrink-0', sizeClasses[size].icon)} />
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-foreground', sizeClasses[size].description)}>
            {title || 'Error'}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} disabled={isRetrying}>
            <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          </Button>
        )}
      </div>
    );
  }

  return content;
}

export default RetryableError;
