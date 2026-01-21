import { useCallback } from 'react';
import { useAuthStore } from '../stores/auth-store';

/**
 * Hook for accessing authentication state and methods
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        await login(email, password);
        return { success: true };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [login]
  );

  const handleRegister = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        await register(name, email, password);
        return { success: true };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    [register]
  );

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkAuth,
    clearError,
  };
}
