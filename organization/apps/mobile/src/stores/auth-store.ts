import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthReady: boolean; // Indicates if auth state has been checked on app startup
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  clearError: () => void;
  setUser: (user: User) => void;

  // Session Management
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
}

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Token refresh threshold: refresh if expiring within 5 minutes
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthReady: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, access_token, refresh_token } = response.data;

      // Store tokens securely
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      }
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Calculate token expiry from JWT (typically 7 days)
      const tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, tokenExpiry.toString());

      set({
        user,
        token: access_token,
        refreshToken: refresh_token || null,
        isAuthenticated: true,
        isLoading: false,
        isAuthReady: true,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
        isAuthReady: true,
      });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user, access_token, refresh_token } = response.data;

      // Store tokens securely
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      }
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Calculate token expiry from JWT (typically 7 days)
      const tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, tokenExpiry.toString());

      set({
        user,
        token: access_token,
        refreshToken: refresh_token || null,
        isAuthenticated: true,
        isLoading: false,
        isAuthReady: true,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false,
        isAuthReady: true,
      });
      throw error;
    }
  },

  logout: async () => {
    // SECURITY: Call API to blacklist the token before clearing local storage
    // This ensures the token cannot be reused if intercepted
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {
      // Continue with local logout even if API call fails
      // Token will eventually expire
    }

    // Clear all auth-related storage
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);

    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  /**
   * Check authentication state on app startup
   * Also attempts proactive token refresh if token is expiring soon
   */
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      const tokenExpiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson);
        const tokenExpiry = tokenExpiryStr ? parseInt(tokenExpiryStr, 10) : 0;

        set({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
          isAuthReady: true,
        });

        // Proactively refresh token if it's expiring soon
        if (refreshToken && tokenExpiry > 0) {
          const timeUntilExpiry = tokenExpiry - Date.now();
          if (timeUntilExpiry < REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
            // Token expiring soon, refresh in background
            get().refreshAccessToken().catch(() => {
              // Ignore refresh errors during startup, will handle on API calls
            });
          }
        }
      } else {
        set({
          isLoading: false,
          isAuthReady: true,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        isAuthReady: true,
      });
    }
  },

  /**
   * Refresh the access token using the refresh token
   * Returns true if successful, false otherwise
   */
  refreshAccessToken: async (): Promise<boolean> => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        console.warn('No refresh token available');
        return false;
      }

      const response = await api.post('/auth/refresh', {
        refreshToken,
      });

      const { access_token, refresh_token } = response.data;

      // Store new tokens
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      }

      // Update expiry
      const tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, tokenExpiry.toString());

      set({
        token: access_token,
        refreshToken: refresh_token || get().refreshToken,
      });

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Don't logout here - let the calling code decide what to do
      return false;
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: User) => {
    set({ user });
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)).catch(() => {
      // Ignore storage errors for setUser
    });
  },

  revokeSession: async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
    } catch (error: any) {
      throw error;
    }
  },

  revokeAllOtherSessions: async () => {
    try {
      await api.delete('/auth/sessions');
    } catch (error: any) {
      throw error;
    }
  },
}));
