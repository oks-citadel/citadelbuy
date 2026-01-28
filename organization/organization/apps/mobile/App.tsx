import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/auth-store';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { errorReporting } from './src/lib/error-reporting';
import { billingService } from './src/services/billing';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  const { checkAuth, user, isAuthenticated } = useAuthStore();
  const [servicesInitialized, setServicesInitialized] = React.useState(false);

  // Initialize error reporting and billing services on app startup
  React.useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('[App] Initializing services...');

        // Initialize error reporting (Sentry)
        errorReporting.initialize();
        console.log('[App] Error reporting initialized');

        // Initialize billing service (IAP)
        await billingService.initialize();
        console.log('[App] Billing service initialized');

        setServicesInitialized(true);
        console.log('[App] All services initialized successfully');
      } catch (error) {
        console.error('[App] Failed to initialize services:', error);
        // Still set initialized to true to allow app to load
        setServicesInitialized(true);
      }
    };

    initializeServices();

    // Cleanup on app unmount
    return () => {
      console.log('[App] Cleaning up services...');
      billingService.disconnect().catch((err) => {
        console.error('[App] Failed to disconnect billing service:', err);
      });
    };
  }, []);

  // Check authentication after services are initialized
  React.useEffect(() => {
    if (servicesInitialized) {
      checkAuth();
    }
  }, [servicesInitialized]);

  // Update error reporting user context when authentication state changes
  React.useEffect(() => {
    if (isAuthenticated && user) {
      // Set user context for error reporting
      errorReporting.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
        name: user.name,
      });
      console.log('[App] User context set for error reporting:', user.email);
    } else {
      // Clear user context on logout
      errorReporting.clearUser();
      console.log('[App] User context cleared for error reporting');
    }
  }, [isAuthenticated, user]);

  return (
    <ErrorBoundary componentName="App">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
