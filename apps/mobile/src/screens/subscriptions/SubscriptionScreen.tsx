/**
 * Subscription Screen
 *
 * Uses IAP hooks for subscription purchases with proper error handling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useIAP } from '../../hooks/useIAP';
import { SUBSCRIPTION_PRODUCTS } from '../../config/iap-products';

// URLs for legal documents
const TERMS_OF_SERVICE_URL = 'https://broxiva.com/terms';
const PRIVACY_POLICY_URL = 'https://broxiva.com/privacy';

export default function SubscriptionScreen() {
  const {
    isInitialized,
    isInitializing,
    isAvailable,
    initError,
    retryInitialization,
    products,
    productsLoading,
    productsError,
    reloadProducts,
    purchasing,
    purchaseSubscription,
    lastPurchaseResult,
    clearLastPurchaseResult,
    isDeferred,
    restoring,
    restorePurchases,
  } = useIAP();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Handle purchase button press
  const handlePurchase = async (planId: string) => {
    const plan = SUBSCRIPTION_PRODUCTS.find(p => p.id === planId);
    if (!plan) return;

    setSelectedPlan(planId);

    try {
      const result = await purchaseSubscription(plan, true);

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your subscription is now active. Enjoy premium features!',
          [{ text: 'OK', onPress: () => clearLastPurchaseResult() }]
        );
      } else if (result.deferred) {
        // iOS "Ask to Buy" - purchase pending parental approval
        Alert.alert(
          'Approval Required',
          'Your subscription request has been sent for approval. Your subscription will be activated once the purchase is approved.',
          [{ text: 'OK', onPress: () => clearLastPurchaseResult() }]
        );
      } else if (result.cancelled) {
        // User cancelled - no alert needed
        clearLastPurchaseResult();
      } else if (result.error?.networkError) {
        // Network error - suggest checking connection
        Alert.alert(
          'Connection Error',
          'Unable to complete subscription. Please check your internet connection and try again.',
          [{ text: 'OK', onPress: () => clearLastPurchaseResult() }]
        );
      } else {
        Alert.alert(
          'Purchase Failed',
          result.error?.message || 'Something went wrong. Please try again.',
          [{ text: 'OK', onPress: () => clearLastPurchaseResult() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Purchase failed');
    } finally {
      setSelectedPlan(null);
    }
  };

  // Handle restore purchases
  const handleRestore = async () => {
    try {
      const result = await restorePurchases();

      if (result.success) {
        Alert.alert(
          'Restore Complete',
          result.restoredCount > 0
            ? `Successfully restored ${result.restoredCount} purchase(s)`
            : 'No purchases found to restore',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Restore Failed', result.error || 'Failed to restore purchases');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Restore failed');
    }
  };

  // Get product details by plan ID
  const getProductForPlan = (planId: string) => {
    const plan = SUBSCRIPTION_PRODUCTS.find(p => p.id === planId);
    if (!plan) return null;

    const platformProductId =
      Platform.OS === 'ios' ? plan.appleProductId : plan.googleProductId;

    return products.find(p => p.productId === platformProductId);
  };

  // Handle opening URLs
  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  // Render loading state (initializing IAP)
  if (isInitializing || (!isInitialized && !initError)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing store...</Text>
      </View>
    );
  }

  // Render initialization error state with retry button
  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to Initialize Store</Text>
        <Text style={styles.errorDetail}>{initError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={retryInitialization}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render products loading state
  if (productsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  // Render error state with retry button
  if (productsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load subscriptions</Text>
        <Text style={styles.errorDetail}>{productsError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={reloadProducts}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render unavailable state with retry button
  if (!isAvailable) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>In-App Purchases Not Available</Text>
        <Text style={styles.errorDetail}>
          Please check your device settings or try again later
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={retryInitialization}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Unlock premium features and support Broxiva
        </Text>
      </View>

      {/* Subscription Plans */}
      <View style={styles.plansContainer}>
        {SUBSCRIPTION_PRODUCTS.map(plan => {
          const product = getProductForPlan(plan.id);
          const isPurchasing = purchasing && selectedPlan === plan.id;

          return (
            <View key={plan.id} style={styles.planCard}>
              {/* Plan Header */}
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {plan.interval === 'year' && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>SAVE 20%</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <Text style={styles.planDescription}>{plan.description}</Text>

              {/* Price */}
              <View style={styles.priceContainer}>
                {product ? (
                  <>
                    <Text style={styles.price}>{product.price}</Text>
                    <Text style={styles.priceInterval}>
                      /{plan.interval === 'month' ? 'month' : 'year'}
                    </Text>
                  </>
                ) : (
                  <View style={styles.priceLoading}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.priceLoadingText}>Loading price...</Text>
                  </View>
                )}
              </View>

              {/* Trial Period */}
              {plan.trialPeriod && (
                <Text style={styles.trialText}>
                  {plan.trialPeriod.duration}-{plan.trialPeriod.unit} free trial
                </Text>
              )}

              {/* Purchase Button */}
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  isPurchasing && styles.purchaseButtonDisabled,
                ]}
                onPress={() => handlePurchase(plan.id)}
                disabled={isPurchasing || purchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {plan.trialPeriod ? 'Start Free Trial' : 'Subscribe'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Restore Purchases Button */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={restoring || purchasing}
      >
        {restoring ? (
          <ActivityIndicator color="#007AFF" />
        ) : (
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          • Subscriptions automatically renew unless cancelled
        </Text>
        <Text style={styles.footerText}>
          • Cancel anytime from your account settings
        </Text>
        <Text style={styles.footerText}>
          • Payment charged to your Apple ID / Google Play account
        </Text>
      </View>

      {/* Terms & Privacy */}
      <View style={styles.legalContainer}>
        <TouchableOpacity onPress={() => openURL(TERMS_OF_SERVICE_URL)}>
          <Text style={styles.legalLink}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>|</Text>
        <TouchableOpacity onPress={() => openURL(PRIVACY_POLICY_URL)}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  plansContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
    minHeight: 38,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  priceInterval: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  priceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  trialText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 12,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    marginHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  legalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  legalLink: {
    color: '#007AFF',
    fontSize: 12,
  },
  legalSeparator: {
    color: '#999',
    marginHorizontal: 8,
    fontSize: 12,
  },
});
