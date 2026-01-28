import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../services/api';
import { AccountStackParamList } from '../../navigation/RootNavigator';

type OrderDetailRouteProp = RouteProp<AccountStackParamList, 'OrderDetail'>;

interface OrderItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant?: string;
}

interface TrackingEvent {
  date: string;
  status: string;
  description: string;
  completed: boolean;
}

const mockOrder = {
  id: '1',
  orderNumber: 'ORD-2024-001234',
  status: 'shipped',
  date: '2024-01-15',
  estimatedDelivery: '2024-01-20',
  items: [
    { id: '1', name: 'Wireless Headphones Pro', image: 'https://via.placeholder.com/80', price: 249.99, quantity: 1, variant: 'Black' },
    { id: '2', name: 'Premium Phone Case', image: 'https://via.placeholder.com/80', price: 29.99, quantity: 2, variant: 'Clear' },
  ],
  shipping: {
    name: 'John Doe',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    phone: '+1 234 567 8900',
  },
  payment: {
    method: 'Visa •••• 4242',
    subtotal: 309.97,
    shipping: 0,
    tax: 24.80,
    total: 334.77,
  },
  tracking: [
    { date: '2024-01-15', status: 'Order Placed', description: 'Your order has been placed', completed: true },
    { date: '2024-01-16', status: 'Processing', description: 'Order is being processed', completed: true },
    { date: '2024-01-17', status: 'Shipped', description: 'Package has been shipped via FedEx', completed: true },
    { date: '2024-01-18', status: 'In Transit', description: 'Package is on the way', completed: false },
    { date: '2024-01-20', status: 'Delivered', description: 'Package will be delivered', completed: false },
  ],
};

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  processing: { label: 'Processing', color: '#f59e0b', icon: 'time-outline' },
  shipped: { label: 'Shipped', color: '#3b82f6', icon: 'airplane-outline' },
  delivered: { label: 'Delivered', color: '#10b981', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: 'close-circle-outline' },
};

export default function OrderDetailScreen() {
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId),
  });

  const orderData = order?.data || mockOrder;
  const statusInfo = statusConfig[orderData.status] || statusConfig.processing;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Order Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.orderNumber}>{orderData.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
        <Text style={styles.orderDate}>
          Placed on {new Date(orderData.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Tracking */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Tracking</Text>
          <TouchableOpacity>
            <Text style={styles.trackLink}>Track Package</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timeline}>
          {orderData.tracking.map((event: TrackingEvent, index: number) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineIndicator}>
                <View style={[
                  styles.timelineDot,
                  event.completed && styles.timelineDotCompleted,
                ]}>
                  {event.completed && <Ionicons name="checkmark" size={10} color="#fff" />}
                </View>
                {index < orderData.tracking.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    event.completed && styles.timelineLineCompleted,
                  ]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineStatus, !event.completed && styles.timelineStatusPending]}>
                  {event.status}
                </Text>
                <Text style={styles.timelineDescription}>{event.description}</Text>
                <Text style={styles.timelineDate}>{event.date}</Text>
              </View>
            </View>
          ))}
        </View>
        {orderData.estimatedDelivery && (
          <View style={styles.deliveryEstimate}>
            <Ionicons name="calendar-outline" size={18} color="#6366f1" />
            <Text style={styles.deliveryText}>
              Estimated delivery: {new Date(orderData.estimatedDelivery).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items ({orderData.items.length})</Text>
        {orderData.items.map((item: OrderItem) => (
          <View key={item.id} style={styles.orderItem}>
            <Image source={{ uri: item.image }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.variant && <Text style={styles.itemVariant}>{item.variant}</Text>}
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={20} color="#6366f1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoName}>{orderData.shipping.name}</Text>
            <Text style={styles.infoText}>{orderData.shipping.address}</Text>
            <Text style={styles.infoText}>
              {orderData.shipping.city}, {orderData.shipping.state} {orderData.shipping.zip}
            </Text>
            <Text style={styles.infoText}>{orderData.shipping.phone}</Text>
          </View>
        </View>
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        <View style={styles.paymentCard}>
          <View style={styles.paymentMethod}>
            <Ionicons name="card-outline" size={20} color="#4b5563" />
            <Text style={styles.paymentMethodText}>{orderData.payment.method}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Subtotal</Text>
            <Text style={styles.paymentValue}>${orderData.payment.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Shipping</Text>
            <Text style={[styles.paymentValue, orderData.payment.shipping === 0 && styles.freeText]}>
              {orderData.payment.shipping === 0 ? 'FREE' : `$${orderData.payment.shipping.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Tax</Text>
            <Text style={styles.paymentValue}>${orderData.payment.tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${orderData.payment.total.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubbles-outline" size={20} color="#6366f1" />
          <Text style={styles.actionButtonText}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="document-text-outline" size={20} color="#6366f1" />
          <Text style={styles.actionButtonText}>Download Invoice</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  trackLink: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  timeline: {
    marginLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#10b981',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  timelineStatusPending: {
    color: '#9ca3af',
  },
  timelineDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  deliveryEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deliveryText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  itemVariant: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  paymentCard: {},
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  freeText: {
    color: '#10b981',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 24,
  },
});
