import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { billingService, walletApi, CreditPackage } from '../../services/billing';

interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'BONUS' | 'REFUND';
  amount: number;
  description: string;
  createdAt: string;
}

export default function WalletScreen() {
  const navigation = useNavigation();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceRes, transactionsRes, packagesRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions(20),
        walletApi.getCreditPackages(),
      ]);

      setBalance(balanceRes.balance || 0);
      setTransactions(transactionsRes.transactions || []);
      setPackages(packagesRes);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handlePurchasePackage = async (pkg: CreditPackage) => {
    setPurchasingPackageId(pkg.id);
    try {
      const result = await billingService.purchaseCreditPackage(pkg);
      if (result.success) {
        Alert.alert('Purchase Initiated', 'Complete your payment to receive credits.');
        setShowTopUpModal(false);
        // Reload after a delay to check for updates
        setTimeout(loadData, 2000);
      } else {
        Alert.alert('Purchase Failed', result.error?.message || 'Unable to process purchase');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Purchase failed');
    } finally {
      setPurchasingPackageId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return { name: 'arrow-down-circle', color: '#10b981' };
      case 'DEBIT':
        return { name: 'arrow-up-circle', color: '#ef4444' };
      case 'BONUS':
        return { name: 'gift', color: '#8b5cf6' };
      case 'REFUND':
        return { name: 'refresh-circle', color: '#3b82f6' };
      default:
        return { name: 'ellipse', color: '#6b7280' };
    }
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const icon = getTransactionIcon(item.type);
    const isDebit = item.type === 'DEBIT';

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.transactionAmount, isDebit && styles.transactionAmountDebit]}>
          {isDebit ? '-' : '+'}{item.amount.toLocaleString()}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconContainer}>
          <Ionicons name="wallet" size={32} color="#6366f1" />
        </View>
        <Text style={styles.balanceLabel}>Available Credits</Text>
        <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
        <Text style={styles.balanceValue}>≈ ${(balance * 0.01).toFixed(2)} USD</Text>

        <TouchableOpacity
          style={styles.topUpButton}
          onPress={() => setShowTopUpModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.topUpButtonText}>Add Credits</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptyText}>
            Add credits to your wallet to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.transactionsList}
        />
      )}

      {/* Top Up Modal */}
      <Modal
        visible={showTopUpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Credits</Text>
            <TouchableOpacity onPress={() => setShowTopUpModal(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.packagesContainer}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  pkg.id === 'credits_500' && styles.packageCardPopular,
                ]}
                onPress={() => handlePurchasePackage(pkg)}
                disabled={purchasingPackageId === pkg.id}
              >
                {pkg.id === 'credits_500' && (
                  <View style={styles.popularTag}>
                    <Text style={styles.popularTagText}>Best Value</Text>
                  </View>
                )}

                <View style={styles.packageInfo}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <View style={styles.creditsContainer}>
                    <Text style={styles.creditsAmount}>
                      {pkg.credits.toLocaleString()}
                    </Text>
                    <Text style={styles.creditsLabel}>credits</Text>
                    {pkg.bonus && (
                      <View style={styles.bonusBadge}>
                        <Text style={styles.bonusText}>+{pkg.bonus} bonus</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.packagePrice}>
                  {purchasingPackageId === pkg.id ? (
                    <ActivityIndicator color="#6366f1" />
                  ) : (
                    <Text style={styles.priceText}>${(pkg.price ?? 0).toFixed(2)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              Credits are non-refundable and do not expire
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  balanceAmount: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#1f2937',
    marginVertical: 4,
  },
  balanceValue: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  transactionsList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  transactionAmountDebit: {
    color: '#ef4444',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  packagesContainer: {
    flex: 1,
    padding: 16,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  packageCardPopular: {
    borderColor: '#6366f1',
  },
  popularTag: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  creditsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  creditsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  bonusBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  bonusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  packagePrice: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
