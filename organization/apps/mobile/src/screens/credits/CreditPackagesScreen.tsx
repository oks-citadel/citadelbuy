/**
 * Credit Packages Screen
 *
 * Uses IAP hooks for purchasing credit packages with proper error handling
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
import { CREDIT_PACKAGES } from '../../config/iap-products';

// URLs for legal documents
const TERMS_OF_SERVICE_URL = 'https://broxiva.com/terms';
const PRIVACY_POLICY_URL = 'https://broxiva.com/privacy';

export default function CreditPackagesScreen() {
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
    purchaseCreditPackage,
    lastPurchaseResult,
    clearLastPurchaseResult,
    isDeferred,
    walletBalance,
    walletCurrency,
    walletLoading,
    reloadWallet,
  } = useIAP();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Handle purchase button press
  const handlePurchase = async (packageId: string) => {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;

    setSelectedPackage(packageId);

    try {
      const result = await purchaseCreditPackage(pkg, true);

      if (result.success) {
        // Reload wallet to show new balance
        await reloadWallet();

        Alert.alert(
          'Purchase Successful!',
          `${pkg.credits}${pkg.bonus ? ` + ${pkg.bonus} bonus` : ''} credits added to your account`,
          [{ text: 'OK', onPress: () => clearLastPurchaseResult() }]
        );
      } else if (result.deferred) {
        // iOS "Ask to Buy" - purchase pending parental approval
        Alert.alert(
          'Approval Required',
          'Your purchase request has been sent for approval. You will receive the credits once the purchase is approved.',
          [{ text: 'OK', onPress: () => clearLastPurchaseResult() }]
        );
      } else if (result.cancelled) {
        // User cancelled - no alert needed
        clearLastPurchaseResult();
      } else if (result.error?.networkError) {
        // Network error - suggest checking connection
        Alert.alert(
          'Connection Error',
          'Unable to complete purchase. Please check your internet connection and try again.',
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
      setSelectedPackage(null);
    }
  };

  // Get product details by package ID
  const getProductForPackage = (packageId: string) => {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return null;

    const platformProductId =
      Platform.OS === 'ios' ? pkg.appleProductId : pkg.googleProductId;

    return products.find(p => p.productId === platformProductId);
  };

  // Calculate total credits including bonus
  const getTotalCredits = (pkg: typeof CREDIT_PACKAGES[0]) => {
    return pkg.credits + (pkg.bonus || 0);
  };

  // Calculate bonus percentage
  const getBonusPercentage = (pkg: typeof CREDIT_PACKAGES[0]) => {
    if (!pkg.bonus) return 0;
    return Math.round((pkg.bonus / pkg.credits) * 100);
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
        <Text style={styles.loadingText}>Loading credit packages...</Text>
      </View>
    );
  }

  // Render error state with retry button
  if (productsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load credit packages</Text>
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
      {/* Header with Balance */}
      <View style={styles.header}>
        <Text style={styles.title}>Buy Credits</Text>
        <View style={styles.balanceCard}>
          {walletLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                {walletBalance.toLocaleString()} credits
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Credit Packages */}
      <View style={styles.packagesContainer}>
        {CREDIT_PACKAGES.map(pkg => {
          const product = getProductForPackage(pkg.id);
          const isPurchasing = purchasing && selectedPackage === pkg.id;
          const totalCredits = getTotalCredits(pkg);
          const bonusPercentage = getBonusPercentage(pkg);

          return (
            <View key={pkg.id} style={styles.packageCard}>
              {/* Bonus Badge */}
              {pkg.bonus && (
                <View style={styles.bonusBadge}>
                  <Text style={styles.bonusBadgeText}>+{bonusPercentage}% BONUS</Text>
                </View>
              )}

              {/* Package Header */}
              <View style={styles.packageHeader}>
                <Text style={styles.packageName}>{pkg.name}</Text>
              </View>

              {/* Credits Display */}
              <View style={styles.creditsContainer}>
                <Text style={styles.creditsAmount}>{totalCredits.toLocaleString()}</Text>
                <Text style={styles.creditsLabel}>credits</Text>
              </View>

              {/* Bonus Detail */}
              {pkg.bonus && (
                <Text style={styles.bonusDetail}>
                  {pkg.credits.toLocaleString()} + {pkg.bonus.toLocaleString()} bonus
                </Text>
              )}

              {/* Price */}
              <View style={styles.priceContainer}>
                {product ? (
                  <Text style={styles.price}>{product.price}</Text>
                ) : (
                  <View style={styles.priceLoading}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.priceLoadingText}>Loading price...</Text>
                  </View>
                )}
              </View>

              {/* Price per Credit */}
              {product && (
                <Text style={styles.pricePerCredit}>
                  {(
                    product.priceAmountMicros /
                    1000000 /
                    totalCredits
                  ).toFixed(3)}{' '}
                  {product.priceCurrencyCode} per credit
                </Text>
              )}

              {/* Purchase Button */}
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  isPurchasing && styles.purchaseButtonDisabled,
                ]}
                onPress={() => handlePurchase(pkg.id)}
                disabled={isPurchasing || purchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>Buy Now</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How Credits Work</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            Use credits to purchase products and services
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>Credits never expire</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            Larger packages include bonus credits
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            Credits are non-refundable once purchased
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account
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
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  packagesContainer: {
    padding: 16,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  bonusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bonusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  packageHeader: {
    marginBottom: 12,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  creditsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  creditsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  creditsLabel: {
    fontSize: 18,
    color: '#666',
    marginLeft: 8,
  },
  bonusDetail: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 12,
  },
  priceContainer: {
    marginBottom: 4,
    minHeight: 30,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  pricePerCredit: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
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
  infoSection: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    width: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
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
