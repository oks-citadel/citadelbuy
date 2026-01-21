'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { ErrorBoundary } from '@/components/error-boundary';
import { AnalyticsProvider, ConsentBanner, setUserId, setUserProperties } from '@/lib/marketing';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const refreshUser = useAuthStore((state) => state.refreshUser);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Refresh user data on mount
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    // Fetch cart when authenticated
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  // Track user identification for analytics
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserId(user.id);
      setUserProperties({
        user_type: user.role || 'customer',
        account_created: user.createdAt,
      });
    } else {
      setUserId(null);
    }
  }, [isAuthenticated, user]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Suspense fallback={null}>
          <AnalyticsProvider>
            <ErrorBoundary componentName="AppRoot">
              {children}
            </ErrorBoundary>
            <ConsentBanner position="bottom" />
          </AnalyticsProvider>
        </Suspense>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
