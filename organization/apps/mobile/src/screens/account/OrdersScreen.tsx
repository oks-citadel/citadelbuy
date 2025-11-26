import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../services/api';
import { AccountStackParamList } from '../../navigation/RootNavigator';

type OrdersScreenNavigationProp = NativeStackNavigationProp<AccountStackParamList, 'Orders'>;

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  total: number;
  items: OrderItem[];
  itemCount: number;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001234',
    status: 'shipped',
    date: '2024-01-15',
    total: 299.99,
    items: [
      { id: 'i1', name: 'Wireless Headphones', image: 'https://via.placeholder.com/60', quantity: 1 },
      { id: 'i2', name: 'Phone Case', image: 'https://via.placeholder.com/60', quantity: 2 },
    ],
    itemCount: 3,
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-001198',
    status: 'delivered',
    date: '2024-01-10',
    total: 149.99,
    items: [
      { id: 'i3', name: 'Smart Watch Band', image: 'https://via.placeholder.com/60', quantity: 1 },
    ],
    itemCount: 1,
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-001156',
    status: 'processing',
    date: '2024-01-18',
    total: 599.99,
    items: [
      { id: 'i4', name: 'Laptop Stand', image: 'https://via.placeholder.com/60', quantity: 1 },
      { id: 'i5', name: 'USB-C Hub', image: 'https://via.placeholder.com/60', quantity: 1 },
    ],
    itemCount: 2,
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-001089',
    status: 'cancelled',
    date: '2024-01-05',
    total: 79.99,
    items: [
      { id: 'i6', name: 'Bluetooth Speaker', image: 'https://via.placeholder.com/60', quantity: 1 },
    ],
    itemCount: 1,
  },
];

const statusConfig = {
  processing: { label: 'Processing', color: '#f59e0b', icon: 'time-outline' },
  shipped: { label: 'Shipped', color: '#3b82f6', icon: 'airplane-outline' },
  delivered: { label: 'Delivered', color: '#10b981', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: 'close-circle-outline' },
};

const tabs = ['All', 'Processing', 'Shipped', 'Delivered'];

export default function OrdersScreen() {
  const navigation = useNavigation<OrdersScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState('All');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getOrders(),
  });

  const orderList = orders?.data || mockOrders;
  const filteredOrders = activeTab === 'All'
    ? orderList
    : orderList.filter((o: Order) => o.status.toLowerCase() === activeTab.toLowerCase());

  const renderOrder = ({ item }: { item: Order }) => {
    const statusInfo = statusConfig[item.status];

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          {item.items.slice(0, 3).map((orderItem, index) => (
            <Image
              key={orderItem.id}
              source={{ uri: orderItem.image }}
              style={[styles.itemImage, { marginLeft: index > 0 ? -16 : 0 }]}
            />
          ))}
          {item.itemCount > 3 && (
            <View style={[styles.itemImage, styles.moreItems, { marginLeft: -16 }]}>
              <Text style={styles.moreItemsText}>+{item.itemCount - 3}</Text>
            </View>
          )}
          <View style={styles.orderSummary}>
            <Text style={styles.itemCount}>{item.itemCount} item{item.itemCount > 1 ? 's' : ''}</Text>
            <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.orderActions}>
          {item.status === 'shipped' && (
            <TouchableOpacity style={styles.trackButton}>
              <Ionicons name="location-outline" size={16} color="#6366f1" />
              <Text style={styles.trackButtonText}>Track Order</Text>
            </TouchableOpacity>
          )}
          {item.status === 'delivered' && (
            <TouchableOpacity style={styles.reorderButton}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={styles.reorderButtonText}>Reorder</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cube-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'All'
              ? "You haven't placed any orders yet"
              : `No ${activeTab.toLowerCase()} orders`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
  orderItems: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreItems: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  moreItemsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  orderSummary: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 4,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 8,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  trackButtonText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  reorderButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
