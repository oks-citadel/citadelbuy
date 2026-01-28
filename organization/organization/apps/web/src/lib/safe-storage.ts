/**
 * Safe Storage Utilities
 *
 * Provides safe wrappers around localStorage/sessionStorage that:
 * - Handle private browsing mode (Safari throws on setItem)
 * - Handle storage quota exceeded errors
 * - Provide fallback to sessionStorage or in-memory storage
 * - Work correctly during SSR
 */

// In-memory fallback when storage is unavailable
const memoryStorage = new Map<string, string>();

/**
 * Check if localStorage is available and functional
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  const testKey = '__storage_test__';
  try {
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if sessionStorage is available and functional
 */
export function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  const testKey = '__storage_test__';
  try {
    sessionStorage.setItem(testKey, testKey);
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe localStorage wrapper with fallback chain:
 * localStorage -> sessionStorage -> memory
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;

    try {
      // Try localStorage first
      const value = localStorage.getItem(key);
      if (value !== null) return value;

      // Fallback to sessionStorage
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue !== null) return sessionValue;

      // Fallback to memory
      return memoryStorage.get(key) ?? null;
    } catch {
      // If all else fails, try memory
      return memoryStorage.get(key) ?? null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      // localStorage failed (private mode or quota exceeded)
      console.warn('localStorage unavailable, falling back to sessionStorage:', e);

      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch {
        // Both storage APIs failed, use memory
        console.warn('sessionStorage also unavailable, using memory storage');
        memoryStorage.set(key, value);
        return true;
      }
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }

    try {
      sessionStorage.removeItem(key);
    } catch { /* ignore */ }

    memoryStorage.delete(key);
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.clear();
    } catch { /* ignore */ }

    try {
      sessionStorage.clear();
    } catch { /* ignore */ }

    memoryStorage.clear();
  },
};

/**
 * Safe sessionStorage wrapper with memory fallback
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;

    try {
      return sessionStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      memoryStorage.set(key, value);
      return true;
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(key);
    } catch { /* ignore */ }

    memoryStorage.delete(key);
  },
};

/**
 * Create a Zustand-compatible storage adapter
 */
export const createSafeStorage = () => ({
  getItem: (name: string): string | null => {
    return safeLocalStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    safeLocalStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    safeLocalStorage.removeItem(name);
  },
});

export default safeLocalStorage;
