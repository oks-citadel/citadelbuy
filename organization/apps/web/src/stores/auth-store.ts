import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/services/api';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  socialLogin: (provider: 'google' | 'facebook' | 'apple', token: string) => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<AuthResponse>('/auth/login', {
            email,
            password,
          });

          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            api.setTokens(accessToken, refreshToken);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Login failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<AuthResponse>('/auth/register', data);

          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            api.setTokens(accessToken, refreshToken);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Registration failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore logout errors
        } finally {
          api.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshUser: async () => {
        if (!get().isAuthenticated) return;

        set({ isLoading: true });
        try {
          const response = await api.get<User>('/auth/me');

          if (response.success && response.data) {
            set({ user: response.data, isLoading: false });
          } else {
            throw new Error('Failed to refresh user');
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
          api.clearTokens();
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.patch<User>('/auth/profile', data);

          if (response.success && response.data) {
            set({ user: response.data, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Profile update failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Profile update failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/forgot-password', { email });

          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to send reset email');
          }
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to send reset email';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/reset-password', {
            token,
            password,
          });

          if (!response.success) {
            throw new Error(response.error?.message || 'Password reset failed');
          }
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Password reset failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<User>('/auth/verify-email', { token });

          if (response.success && response.data) {
            set({ user: response.data, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Email verification failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Email verification failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      socialLogin: async (provider: 'google' | 'facebook' | 'apple', token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<AuthResponse>(`/auth/social/${provider}`, {
            token,
          });

          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            api.setTokens(accessToken, refreshToken);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Social login failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Social login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
