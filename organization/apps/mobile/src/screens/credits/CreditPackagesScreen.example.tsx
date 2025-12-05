/**
 * Example Credit Packages Screen
 *
 * Demonstrates how to use IAP hooks for purchasing credit packages
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
} from 'react-native';
import { useIAP } from '../../hooks/useIAP';
import { CREDIT_PACKAGES } from '../../config/iap-products';

export default function CreditPackagesScreen() {
  const {
    isInitialized,
    isAvailable,
    products,
    productsLoading,
    productsError,
    purchasing,
    purchaseCreditPackage,
    lastPurchaseResult,
    clearLastPurchaseResult,
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
      } else if (result.cancelled) {
        // User cancelled - no alert needed
        clearLastPurchaseResult();
      } else {
        Alert.alert(
          'Purchase Failed',
          result.error || 'Something went wrong. Please try again.',
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

  // Render loading state
  if (!isInitialized || productsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading credit packages...</Text>
      </View>
    );
  }

  // Render error state
  if (productsError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load credit packages</Text>
        <Text style={styles.errorDetail}>{productsError}</Text>
      </View>
    );
  }

  // Render unavailable state
  if (!isAvailable) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>In-App Purchases Not Available</Text>
        <Text style={styles.errorDetail}>
          Please check your device settings or try again later
        </Text>
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
              {product && (
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>{product.price}</Text>
                </View>
              )}

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
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
});
