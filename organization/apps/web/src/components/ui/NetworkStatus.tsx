'use client';

import * as React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkStatusProps {
  className?: string;
}

/**
 * NetworkStatus Component
 *
 * Displays a banner when the user is offline.
 * Shows a "back online" message when connectivity is restored.
 * Automatically hides after connectivity is stable.
 */
export function NetworkStatus({ className }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [showReconnected, setShowReconnected] = React.useState(false);
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Don't render anything if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50',
        'rounded-lg shadow-lg p-4 flex items-center gap-3',
        'transform transition-all duration-300',
        isOnline ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Back online</p>
            <p className="text-xs text-green-600">Your connection has been restored.</p>
          </div>
        </>
      ) : (
        <>
          <WifiOff className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">You&apos;re offline</p>
            <p className="text-xs text-amber-600">Some features may be unavailable.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-amber-100 rounded-full transition-colors"
            title="Retry connection"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

export default NetworkStatus;
