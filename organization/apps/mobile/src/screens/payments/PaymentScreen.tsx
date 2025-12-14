import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { billingService, paymentsApi, PaymentProvider } from '../../services/billing';
import { RootStackParamList } from '../../navigation/RootNavigator';

type PaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PaymentScreenParams {
  amount: number;
  currency: string;
  orderId?: string;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  onSuccess?: () => void;
}

interface ProviderOption {
  id: PaymentProvider;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

const PROVIDER_INFO: Record<PaymentProvider, { name: string; icon: string; description: string }> = {
  STRIPE: {
    name: 'Credit/Debit Card',
    icon: 'card-outline',
    description: 'Pay securely with your card',
  },
  PAYPAL: {
    name: 'PayPal',
    icon: 'logo-paypal',
    description: 'Pay with your PayPal account',
  },
  FLUTTERWAVE: {
    name: 'Flutterwave',
    icon: 'wallet-outline',
    description: 'Cards, Mobile Money, Bank Transfer',
  },
  PAYSTACK: {
    name: 'Paystack',
    icon: 'wallet-outline',
    description: 'Pay with Paystack (Nigeria/Ghana)',
  },
  APPLE_IAP: {
    name: 'Apple Pay',
    icon: 'logo-apple',
    description: 'Quick checkout with Apple Pay',
  },
  GOOGLE_IAP: {
    name: 'Google Pay',
    icon: 'logo-google',
    description: 'Quick checkout with Google Pay',
  },
};

export default function PaymentScreen() {
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as PaymentScreenParams;

  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await paymentsApi.getProviders(params.currency);
      const available: PaymentProvider[] = response.available || ['STRIPE', 'PAYPAL'];

      // Build provider options
      const options: ProviderOption[] = [];

      // Add platform-specific options first
      if (Platform.OS === 'ios' && available.includes('STRIPE')) {
        options.push({
          id: 'APPLE_IAP',
          ...PROVIDER_INFO.APPLE_IAP,
          enabled: true,
        });
      }
      if (Platform.OS === 'android' && available.includes('STRIPE')) {
        options.push({
          id: 'GOOGLE_IAP',
          ...PROVIDER_INFO.GOOGLE_IAP,
          enabled: true,
        });
      }

      // Add gateway options
      for (const provider of available) {
        if (provider !== 'APPLE_IAP' && provider !== 'GOOGLE_IAP') {
          options.push({
            id: provider,
            ...PROVIDER_INFO[provider],
            enabled: response.status?.[provider]?.enabled ?? true,
          });
        }
      }

      setProviders(options);
      if (options.length > 0) {
        setSelectedProvider(options[0].id);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      // Fallback to default providers
      setProviders([
        { id: 'STRIPE', ...PROVIDER_INFO.STRIPE, enabled: true },
        { id: 'PAYPAL', ...PROVIDER_INFO.PAYPAL, enabled: true },
      ]);
      setSelectedProvider('STRIPE');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedProvider) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await billingService.processGatewayPayment({
        amount: params.amount,
        currency: params.currency,
        provider: selectedProvider,
        items: params.items,
        metadata: params.orderId ? { orderId: params.orderId } : undefined,
        returnUrl: 'broxiva://checkout/success',
        cancelUrl: 'broxiva://checkout/cancel',
      });

      if (result.success) {
        // Payment initiated - user will be redirected to complete
        // The app will handle deep link callback on completion
        Alert.alert(
          'Payment Initiated',
          'You will be redirected to complete your payment.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Unable to process payment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading payment options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Total</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(params.amount, params.currency)}
          </Text>
          {params.items && params.items.length > 0 && (
            <Text style={styles.summaryItems}>
              {params.items.length} item{params.items.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerCard,
              selectedProvider === provider.id && styles.providerCardSelected,
              !provider.enabled && styles.providerCardDisabled,
            ]}
            onPress={() => provider.enabled && setSelectedProvider(provider.id)}
            disabled={!provider.enabled}
          >
            <View style={[
              styles.radio,
              selectedProvider === provider.id && styles.radioSelected,
            ]}>
              {selectedProvider === provider.id && <View style={styles.radioInner} />}
            </View>

            <View style={styles.providerIcon}>
              <Ionicons
                name={provider.icon as any}
                size={24}
                color={provider.enabled ? '#4b5563' : '#d1d5db'}
              />
            </View>

            <View style={styles.providerInfo}>
              <Text style={[
                styles.providerName,
                !provider.enabled && styles.providerNameDisabled,
              ]}>
                {provider.name}
              </Text>
              <Text style={styles.providerDescription}>{provider.description}</Text>
            </View>

            {!provider.enabled && (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableText}>Unavailable</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="lock-closed" size={16} color="#6b7280" />
          <Text style={styles.securityText}>
            Your payment is protected with industry-standard encryption
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedProvider || isProcessing) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!selectedProvider || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                Pay {formatCurrency(params.amount, params.currency)}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryItems: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  providerCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#fafafa',
  },
  providerCardDisabled: {
    opacity: 0.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#6366f1',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  providerNameDisabled: {
    color: '#9ca3af',
  },
  providerDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  unavailableBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unavailableText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#6b7280',
  },
  bottomPadding: {
    height: 100,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
