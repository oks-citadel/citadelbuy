/**
 * Network Status Hook for Offline Support
 * Provides network connectivity state and offline mode management
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isOfflineMode: boolean;
}

interface PendingAction {
  id: string;
  type: 'cart_add' | 'cart_update' | 'cart_remove' | 'wishlist_add' | 'wishlist_remove' | 'order_create';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const PENDING_ACTIONS_KEY = 'offline_pending_actions';
const MAX_RETRIES = 3;

export function useNetwork() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
    isOfflineMode: false,
  });
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending actions from storage
  const loadPendingActions = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[Network] Failed to load pending actions:', error);
    }
  }, []);

  // Save pending actions to storage
  const savePendingActions = useCallback(async (actions: PendingAction[]) => {
    try {
      await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error('[Network] Failed to save pending actions:', error);
    }
  }, []);

  // Add a pending action for offline sync
  const addPendingAction = useCallback(async (
    type: PendingAction['type'],
    payload: any
  ) => {
    const newAction: PendingAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };
    const updatedActions = [...pendingActions, newAction];
    await savePendingActions(updatedActions);
    return newAction.id;
  }, [pendingActions, savePendingActions]);

  // Remove a pending action
  const removePendingAction = useCallback(async (actionId: string) => {
    const updatedActions = pendingActions.filter(a => a.id !== actionId);
    await savePendingActions(updatedActions);
  }, [pendingActions, savePendingActions]);

  // Clear all pending actions
  const clearPendingActions = useCallback(async () => {
    await savePendingActions([]);
  }, [savePendingActions]);

  // Initialize network listeners
  useEffect(() => {
    loadPendingActions();

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isOfflineMode: !(state.isConnected && state.isInternetReachable),
      });
    });

    return () => unsubscribe();
  }, [loadPendingActions]);

  // Get current network state
  const refreshNetworkState = useCallback(async () => {
    const state = await NetInfo.fetch();
    setNetworkState({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
      isOfflineMode: !(state.isConnected && state.isInternetReachable),
    });
    return state;
  }, []);

  return {
    ...networkState,
    pendingActions,
    pendingActionsCount: pendingActions.length,
    isSyncing,
    addPendingAction,
    removePendingAction,
    clearPendingActions,
    refreshNetworkState,
    hasPendingActions: pendingActions.length > 0,
  };
}

/**
 * Hook for offline data caching
 */
export function useOfflineCache<T>(key: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const cacheKey = `offline_cache_${key}`;
  const metaKey = `offline_cache_meta_${key}`;

  // Load cached data on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        const meta = await AsyncStorage.getItem(metaKey);

        if (cached) {
          setData(JSON.parse(cached));
        }
        if (meta) {
          setLastUpdated(JSON.parse(meta).timestamp);
        }
      } catch (error) {
        console.error(`[OfflineCache] Failed to load cache for ${key}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCache();
  }, [key, cacheKey, metaKey]);

  // Save data to cache
  const saveToCache = useCallback(async (newData: T) => {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(newData));
      await AsyncStorage.setItem(metaKey, JSON.stringify({ timestamp: Date.now() }));
      setData(newData);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error(`[OfflineCache] Failed to save cache for ${key}:`, error);
    }
  }, [key, cacheKey, metaKey]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(cacheKey);
      await AsyncStorage.removeItem(metaKey);
      setData(defaultValue);
      setLastUpdated(null);
    } catch (error) {
      console.error(`[OfflineCache] Failed to clear cache for ${key}:`, error);
    }
  }, [key, cacheKey, metaKey, defaultValue]);

  // Check if cache is stale (older than specified minutes)
  const isCacheStale = useCallback((maxAgeMinutes: number = 30) => {
    if (!lastUpdated) return true;
    const maxAge = maxAgeMinutes * 60 * 1000;
    return Date.now() - lastUpdated > maxAge;
  }, [lastUpdated]);

  return {
    data,
    isLoading,
    lastUpdated,
    saveToCache,
    clearCache,
    isCacheStale,
  };
}

export default useNetwork;
