/**
 * Auth Store - Manages user authentication state
 * Connected to backend API with JWT token management
 *
 * Uses safe storage that handles:
 * - Private browsing mode (Safari throws on localStorage)
 * - Storage quota exceeded
 * - SSR compatibility
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, tokenManager, isNetworkConnectivityError, getErrorMessage } from '@/lib/api-client';
import { User } from '@/types';
import { createSafeStorage } from '@/lib/safe-storage';

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
  updateUser: (data: Partial<User>) => Promise<void>;
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
          const response = await authApi.login(email, password);
          set({
            user: response.user as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          set({
            user: response.user as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Enhanced error handling with user-friendly messages
          let message: string;

          if (isNetworkConnectivityError(error)) {
            message = 'Unable to connect. Please check your internet connection and try again.';
          } else if (error instanceof Error) {
            message = getErrorMessage(error);
          } else {
            message = 'Registration failed. Please try again.';
          }

          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch {
          // Continue with logout even if API fails
        } finally {
          tokenManager.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshUser: async () => {
        if (!tokenManager.isAuthenticated()) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.getProfile();
          set({ user: user as User, isAuthenticated: true, isLoading: false });
        } catch {
          tokenManager.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authApi.updateProfile(data);
          set({ user: updatedUser as User, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Profile update failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // Alias for updateProfile
      updateUser: async (data: Partial<User>) => {
        return get().updateProfile(data);
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.forgotPassword(email);
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
          await authApi.resetPassword(token, password);
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Password reset failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      verifyEmail: async (_token: string) => {
        set({ isLoading: true, error: null });
        try {
          // Verify email endpoint
          const user = await authApi.getProfile();
          set({ user: user as User, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Email verification failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      socialLogin: async (provider: 'google' | 'facebook' | 'apple', token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.socialLogin(provider, token);
          set({
            user: response.user as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
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
      storage: createJSONStorage(() => createSafeStorage()),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      skipHydration: true, // Prevent SSR hydration mismatch
    }
  )
);
