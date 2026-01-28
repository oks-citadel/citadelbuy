import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Hook for async storage operations
 */
export function useAsyncStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadValue = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error('Error loading from AsyncStorage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key]);

  const setValue = useCallback(
    async (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Error saving to AsyncStorage:', error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error('Error removing from AsyncStorage:', error);
    }
  }, [key, initialValue]);

  return { value: storedValue, setValue, removeValue, loading };
}

/**
 * Hook for secure storage operations (for sensitive data like tokens)
 */
export function useSecureStorage(key: string) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadValue = async () => {
      try {
        const result = await SecureStore.getItemAsync(key);
        setValue(result);
      } catch (error) {
        console.error('Error loading from SecureStore:', error);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key]);

  const setSecureValue = useCallback(
    async (newValue: string) => {
      try {
        await SecureStore.setItemAsync(key, newValue);
        setValue(newValue);
      } catch (error) {
        console.error('Error saving to SecureStore:', error);
      }
    },
    [key]
  );

  const removeSecureValue = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(key);
      setValue(null);
    } catch (error) {
      console.error('Error removing from SecureStore:', error);
    }
  }, [key]);

  return { value, setValue: setSecureValue, removeValue: removeSecureValue, loading };
}
