/**
 * React Hook for Push Notifications
 * Provides easy-to-use hooks for notification functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationPreferences } from '../services/notifications';

/**
 * Hook to manage notification initialization
 */
export function useNotificationInitialization() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await notificationService.initialize();
        setIsInitialized(true);
        setPushToken(notificationService.getPushToken());
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        setIsInitialized(true); // Mark as initialized even if failed
      }
    };

    initialize();

    return () => {
      notificationService.cleanup();
    };
  }, []);

  return { isInitialized, pushToken };
}

/**
 * Hook to manage notification permissions
 */
export function useNotificationPermissions() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkPermissions = useCallback(async () => {
    try {
      const enabled = await notificationService.areNotificationsEnabled();
      setIsEnabled(enabled);
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const granted = await notificationService.requestPermissions();
      setIsEnabled(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    isEnabled,
    isLoading,
    requestPermissions,
    checkPermissions,
  };
}

/**
 * Hook to manage notification preferences
 */
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (err: any) {
      setError(err.message || 'Failed to load preferences');
      console.error('Failed to load notification preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      setIsLoading(true);
      setError(null);
      await notificationService.updatePreferences(updates);
      // Reload to get updated preferences
      await loadPreferences();
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences');
      console.error('Failed to update notification preferences:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    reload: loadPreferences,
  };
}

/**
 * Hook to manage notification badge
 */
export function useNotificationBadge() {
  const [badgeCount, setBadgeCount] = useState(0);

  const updateBadgeCount = useCallback(async () => {
    try {
      const count = await notificationService.getBadgeCount();
      setBadgeCount(count);
    } catch (error) {
      console.error('Failed to get badge count:', error);
    }
  }, []);

  const setCount = useCallback(async (count: number) => {
    try {
      await notificationService.setBadgeCount(count);
      setBadgeCount(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    await setCount(0);
  }, [setCount]);

  useEffect(() => {
    updateBadgeCount();
  }, [updateBadgeCount]);

  return {
    badgeCount,
    setCount,
    clearBadge,
    updateBadgeCount,
  };
}

/**
 * Comprehensive hook with all notification functionality
 */
export function useNotifications() {
  const initialization = useNotificationInitialization();
  const permissions = useNotificationPermissions();
  const preferences = useNotificationPreferences();
  const badge = useNotificationBadge();

  const scheduleNotification = useCallback(
    async (title: string, body: string, data?: any, trigger?: any) => {
      try {
        return await notificationService.scheduleLocalNotification(title, body, data, trigger);
      } catch (error) {
        console.error('Failed to schedule notification:', error);
        throw error;
      }
    },
    []
  );

  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.cancelNotification(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    try {
      await notificationService.cancelAllNotifications();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }, []);

  return {
    // Initialization
    isInitialized: initialization.isInitialized,
    pushToken: initialization.pushToken,

    // Permissions
    permissionsEnabled: permissions.isEnabled,
    permissionsLoading: permissions.isLoading,
    requestPermissions: permissions.requestPermissions,
    checkPermissions: permissions.checkPermissions,

    // Preferences
    preferences: preferences.preferences,
    preferencesLoading: preferences.isLoading,
    preferencesError: preferences.error,
    updatePreferences: preferences.updatePreferences,
    reloadPreferences: preferences.reload,

    // Badge
    badgeCount: badge.badgeCount,
    setBadgeCount: badge.setCount,
    clearBadge: badge.clearBadge,
    updateBadgeCount: badge.updateBadgeCount,

    // Notifications
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
  };
}

export default useNotifications;
