'use client';

import { useState, useEffect, useCallback } from 'react';

interface OnlineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

interface UseOnlineStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  pingUrl?: string;
  pingInterval?: number;
}

/**
 * useOnlineStatus Hook
 *
 * Provides network connectivity status with additional features:
 * - Tracks online/offline transitions
 * - Optional ping endpoint for more accurate detection
 * - Callbacks for connectivity changes
 *
 * @example
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus({
 *   onOnline: () => toast.success('Back online!'),
 *   onOffline: () => toast.warning('You are offline'),
 * });
 * ```
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const { onOnline, onOffline, pingUrl, pingInterval = 30000 } = options;

  const [state, setState] = useState<OnlineStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
    lastOfflineAt: null,
  });

  // Handle online event
  const handleOnline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: true,
      wasOffline: !prev.isOnline ? true : prev.wasOffline,
      lastOnlineAt: new Date(),
    }));
    onOnline?.();
  }, [onOnline]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
      lastOfflineAt: new Date(),
    }));
    onOffline?.();
  }, [onOffline]);

  // Optional ping check for more accurate detection
  const checkConnection = useCallback(async () => {
    if (!pingUrl) return;

    try {
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });
      if (!state.isOnline) {
        handleOnline();
      }
    } catch {
      if (state.isOnline) {
        handleOffline();
      }
    }
  }, [pingUrl, state.isOnline, handleOnline, handleOffline]);

  useEffect(() => {
    // Set initial state
    setState((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
    }));

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Optional ping interval
    let pingIntervalId: NodeJS.Timeout | null = null;
    if (pingUrl && pingInterval > 0) {
      pingIntervalId = setInterval(checkConnection, pingInterval);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pingIntervalId) {
        clearInterval(pingIntervalId);
      }
    };
  }, [handleOnline, handleOffline, pingUrl, pingInterval, checkConnection]);

  // Reset wasOffline flag
  const resetWasOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      wasOffline: false,
    }));
  }, []);

  return {
    ...state,
    resetWasOffline,
    checkConnection,
  };
}

export default useOnlineStatus;
