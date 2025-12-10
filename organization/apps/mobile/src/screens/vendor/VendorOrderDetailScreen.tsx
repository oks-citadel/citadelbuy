import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVendorStore } from '../../stores/vendor-store';
import { OrderStatus } from '../../types/api';
import { VendorStackParamList } from '../../navigation/VendorNavigator';

type OrderDetailRouteProp = RouteProp<VendorStackParamList, 'OrderDetail'>;
type OrderDetailNavigationProp = NativeStackNavigationProp<VendorStackParamList, 'OrderDetail'>;

const STATUS_OPTIONS: { label: string; value: OrderStatus; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Confirmed', value: 'confirmed', icon: 'checkmark-circle' },
  { label: 'Processing', value: 'processing', icon: 'time' },
  { label: 'Shipped', value: 'shipped', icon: 'airplane' },
  { label: 'Delivered', value: 'delivered', icon: 'checkmark-done' },
];

export default function VendorOrderDetailScreen() {
  const navigation = useNavigation<OrderDetailNavigationProp>();
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;

  const { currentOrder, isLoadingOrders, fetchOrder, updateOrderStatus } = useVendorStore();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);

  useEffect(() => {
    fetchOrder(orderId);
  }, [orderId]);

  useEffect(() => {
    if (currentOrder) {
      setTrackingNumber(currentOrder.trackingNumber || '');
    }
  }, [currentOrder]);

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    setSelectedStatus(newStatus);
    if (newStatus === 'shipped') {
      setShowStatusModal(true);
    } else {
      confirmStatusUpdate(newStatus);
    }
  };

  const confirmStatusUpdate = async (status: OrderStatus) => {
    try {
      await updateOrderStatus(
        orderId,
        status,
        status === 'shipped' ? trackingNumber : undefined
      );
      Alert.alert('Success', `Order status updated to ${status}`);
      setShowStatusModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#8b5cf6',
      shipped: '#06b6d4',
      delivered: '#10b981',
      cancelled: '#ef4444',
      refunded: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  if (isLoadingOrders && !currentOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Order Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.orderNumber}>Order #{currentOrder.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(currentOrder.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentOrder.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(currentOrder.status) }]}>
                {currentOrder.status.charAt(0).toUpperCase() + currentOrder.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Update Status Actions */}
        {currentOrder.status !== 'delivered' && currentOrder.status !== 'cancelled' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Order Status</Text>
            <View style={styles.statusActions}>
              {STATUS_OPTIONS.map((option) => {
                const isDisabled =
                  currentOrder.status === 'delivered' ||
                  currentOrder.status === 'cancelled' ||
                  currentOrder.status === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusActionButton,
                      isDisabled && styles.statusActionButtonDisabled,
                    ]}
                    onPress={() => handleUpdateStatus(option.value)}
                    disabled={isDisabled}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={isDisabled ? '#d1d5db' : '#6366f1'}
                    />
                    <Text
                      style={[
                        styles.statusActionText,
                        isDisabled && styles.statusActionTextDisabled,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {currentOrder.items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemDetails}>
                  Qty: {item.quantity} × {formatCurrency(item.price)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(item.quantity * item.price)}
              </Text>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressRow}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <Text style={styles.addressText}>{currentOrder.shippingAddress.name}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <Text style={styles.addressText}>{currentOrder.shippingAddress.phone}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={20} color="#6b7280" />
              <Text style={styles.addressText}>
                {currentOrder.shippingAddress.street}, {currentOrder.shippingAddress.city},{' '}
                {currentOrder.shippingAddress.state} {currentOrder.shippingAddress.zipCode}
              </Text>
            </View>
          </View>
        </View>

        {/* Tracking Information */}
        {currentOrder.trackingNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracking Information</Text>
            <View style={styles.trackingCard}>
              <View style={styles.trackingRow}>
                <Ionicons name="cube-outline" size={20} color="#6366f1" />
                <Text style={styles.trackingNumber}>{currentOrder.trackingNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(currentOrder.subtotal)}</Text>
            </View>
            {currentOrder.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  -{formatCurrency(currentOrder.discount)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>{formatCurrency(currentOrder.shippingCost)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(currentOrder.tax)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Total</Text>
              <Text style={styles.summaryValueBold}>{formatCurrency(currentOrder.total)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Commission ({currentOrder.commission}%)</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                -{formatCurrency((currentOrder.total * currentOrder.commission) / 100)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabelBold, { color: '#10b981' }]}>Your Payout</Text>
              <Text style={[styles.summaryValueBold, { color: '#10b981' }]}>
                {formatCurrency(currentOrder.vendorPayout)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payout Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Status</Text>
          <View style={styles.payoutCard}>
            <View style={styles.payoutRow}>
              <Text style={styles.payoutLabel}>Status</Text>
              <View style={styles.payoutStatusBadge}>
                <Text style={styles.payoutStatusText}>
                  {currentOrder.payoutStatus.charAt(0).toUpperCase() +
                    currentOrder.payoutStatus.slice(1)}
                </Text>
              </View>
            </View>
            {currentOrder.payoutDate && (
              <View style={styles.payoutRow}>
                <Text style={styles.payoutLabel}>Payout Date</Text>
                <Text style={styles.payoutValue}>{formatDate(currentOrder.payoutDate)}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Tracking Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Tracking Number</Text>
            <Text style={styles.modalSubtitle}>Enter the tracking number for this shipment</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Tracking number"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowStatusModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => selectedStatus && confirmStatusUpdate(selectedStatus)}
              >
                <Text style={styles.modalButtonConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statusActionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusActionButtonDisabled: {
    opacity: 0.5,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  statusActionTextDisabled: {
    color: '#9ca3af',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 12,
  },
  trackingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  payoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  payoutValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  payoutStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
  },
  payoutStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
