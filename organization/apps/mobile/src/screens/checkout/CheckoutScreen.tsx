import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { ordersApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

const mockAddresses: Address[] = [
  { id: '1', name: 'John Doe', street: '123 Main St', city: 'New York', state: 'NY', zip: '10001', country: 'USA', phone: '+1 234 567 8900', isDefault: true },
  { id: '2', name: 'John Doe', street: '456 Oak Ave', city: 'Los Angeles', state: 'CA', zip: '90001', country: 'USA', phone: '+1 234 567 8901', isDefault: false },
];

const mockPaymentMethods: PaymentMethod[] = [
  { id: '1', type: 'card', last4: '4242', brand: 'Visa', isDefault: true },
  { id: '2', type: 'card', last4: '1234', brand: 'Mastercard', isDefault: false },
  { id: '3', type: 'paypal', isDefault: false },
  { id: '4', type: 'apple_pay', isDefault: false },
];

export default function CheckoutScreen() {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const [step, setStep] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState<string>('1');
  const [selectedPayment, setSelectedPayment] = useState<string>('1');
  const [notes, setNotes] = useState('');

  const subtotal = 679.97;
  const shipping = 0;
  const tax = 54.40;
  const total = subtotal + shipping + tax;

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => ordersApi.createOrder(data),
    onSuccess: (response) => {
      Alert.alert(
        'Order Placed!',
        'Your order has been placed successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('Main') }]
      );
    },
    onError: () => {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    },
  });

  const handlePlaceOrder = () => {
    createOrderMutation.mutate({
      addressId: selectedAddress,
      paymentMethodId: selectedPayment,
      notes,
    });
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card': return 'card-outline';
      case 'paypal': return 'logo-paypal';
      case 'apple_pay': return 'logo-apple';
      case 'google_pay': return 'logo-google';
      default: return 'card-outline';
    }
  };

  const getPaymentLabel = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return `${method.brand} •••• ${method.last4}`;
    }
    return method.type === 'paypal' ? 'PayPal' :
           method.type === 'apple_pay' ? 'Apple Pay' : 'Google Pay';
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            {step > s ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
            )}
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderShippingStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Shipping Address</Text>
      {mockAddresses.map((address) => (
        <TouchableOpacity
          key={address.id}
          style={[styles.addressCard, selectedAddress === address.id && styles.addressCardSelected]}
          onPress={() => setSelectedAddress(address.id)}
        >
          <View style={styles.addressHeader}>
            <View style={[styles.radio, selectedAddress === address.id && styles.radioSelected]}>
              {selectedAddress === address.id && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.addressName}>{address.name}</Text>
            {address.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.addressText}>{address.street}</Text>
          <Text style={styles.addressText}>{address.city}, {address.state} {address.zip}</Text>
          <Text style={styles.addressText}>{address.phone}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment Method</Text>
      {mockPaymentMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[styles.paymentCard, selectedPayment === method.id && styles.paymentCardSelected]}
          onPress={() => setSelectedPayment(method.id)}
        >
          <View style={[styles.radio, selectedPayment === method.id && styles.radioSelected]}>
            {selectedPayment === method.id && <View style={styles.radioInner} />}
          </View>
          <View style={styles.paymentIcon}>
            <Ionicons name={getPaymentIcon(method.type) as any} size={24} color="#4b5563" />
          </View>
          <Text style={styles.paymentLabel}>{getPaymentLabel(method)}</Text>
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
        <Text style={styles.addButtonText}>Add New Payment Method</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => {
    const address = mockAddresses.find(a => a.id === selectedAddress)!;
    const payment = mockPaymentMethods.find(p => p.id === selectedPayment)!;

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review Order</Text>

        {/* Shipping */}
        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewSectionTitle}>Shipping Address</Text>
            <TouchableOpacity onPress={() => setStep(1)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.reviewText}>{address.name}</Text>
          <Text style={styles.reviewText}>{address.street}</Text>
          <Text style={styles.reviewText}>{address.city}, {address.state} {address.zip}</Text>
        </View>

        {/* Payment */}
        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewSectionTitle}>Payment Method</Text>
            <TouchableOpacity onPress={() => setStep(2)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reviewPayment}>
            <Ionicons name={getPaymentIcon(payment.type) as any} size={20} color="#4b5563" />
            <Text style={styles.reviewText}>{getPaymentLabel(payment)}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Order Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any special instructions..."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, styles.freeText]}>FREE</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderStepIndicator()}

      <ScrollView showsVerticalScrollIndicator={false}>
        {step === 1 && renderShippingStep()}
        {step === 2 && renderPaymentStep()}
        {step === 3 && renderReviewStep()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={20} color="#4b5563" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.continueButton, step === 1 && { flex: 1 }]}
          onPress={() => {
            if (step < 3) {
              setStep(step + 1);
            } else {
              handlePlaceOrder();
            }
          }}
          disabled={createOrderMutation.isPending}
        >
          {createOrderMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>
                {step === 3 ? 'Place Order' : 'Continue'}
              </Text>
              {step < 3 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#6366f1',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#6366f1',
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  addressCardSelected: {
    borderColor: '#6366f1',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  addressName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  defaultBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 32,
    marginBottom: 2,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  paymentCardSelected: {
    borderColor: '#6366f1',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 8,
  },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  editText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  reviewText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  reviewPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    textAlignVertical: 'top',
    marginTop: 8,
    minHeight: 80,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  freeText: {
    color: '#10b981',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  bottomPadding: {
    height: 100,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
