import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVendorStore } from '../../stores/vendor-store';
import { VendorTabParamList, VendorStackParamList } from '../../navigation/VendorNavigator';

const { width } = Dimensions.get('window');

type DashboardNavigationProp = NativeStackNavigationProp<VendorStackParamList & VendorTabParamList>;

export default function VendorDashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const {
    dashboardStats,
    profile,
    isLoadingDashboard,
    fetchDashboardStats,
    fetchProfile,
    refreshDashboard,
  } = useVendorStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('week');

  useEffect(() => {
    fetchProfile();
    fetchDashboardStats(selectedPeriod);
  }, [selectedPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), refreshDashboard()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const StatCard = ({
    title,
    value,
    change,
    icon,
    color,
    onPress,
  }: {
    title: string;
    value: string;
    change: number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <View style={styles.statChangeContainer}>
          <Ionicons
            name={change >= 0 ? 'trending-up' : 'trending-down'}
            size={14}
            color={change >= 0 ? '#10b981' : '#ef4444'}
          />
          <Text style={[styles.statChange, { color: change >= 0 ? '#10b981' : '#ef4444' }]}>
            {formatChange(change)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoadingDashboard && !dashboardStats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.businessName || 'Vendor'}!</Text>
          <Text style={styles.subGreeting}>Here's your store overview</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#1f2937" />
          {/* Badge for unread notifications could be added here */}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['today', 'week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        {dashboardStats && (
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(dashboardStats.totalRevenue)}
              change={dashboardStats.revenueChange}
              icon="cash-outline"
              color="#10b981"
              onPress={() => navigation.navigate('Analytics')}
            />
            <StatCard
              title="Total Orders"
              value={dashboardStats.totalOrders.toString()}
              change={dashboardStats.ordersChange}
              icon="receipt-outline"
              color="#6366f1"
              onPress={() => navigation.navigate('Orders')}
            />
            <StatCard
              title="Products"
              value={dashboardStats.totalProducts.toString()}
              change={dashboardStats.productsChange}
              icon="cube-outline"
              color="#f59e0b"
              onPress={() => navigation.navigate('Products')}
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(dashboardStats.averageOrderValue)}
              change={dashboardStats.averageOrderValueChange}
              icon="trending-up-outline"
              color="#8b5cf6"
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Orders')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="hourglass-outline" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.actionTitle}>Pending Orders</Text>
              {dashboardStats && (
                <Text style={styles.actionValue}>{dashboardStats.pendingOrders}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Products')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="alert-circle-outline" size={28} color="#ef4444" />
              </View>
              <Text style={styles.actionTitle}>Low Stock</Text>
              {dashboardStats && (
                <Text style={styles.actionValue}>{dashboardStats.lowStockProducts}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Analytics')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="analytics-outline" size={28} color="#3b82f6" />
              </View>
              <Text style={styles.actionTitle}>Analytics</Text>
              <Text style={styles.actionSubtitle}>View Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="settings-outline" size={28} color="#8b5cf6" />
              </View>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Manage Store</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Store Performance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Store Performance</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {profile && (
            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Store Rating</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>({profile.reviewCount} reviews)</Text>
                </View>
              </View>

              <View style={styles.performanceDivider} />

              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Total Products</Text>
                <Text style={styles.performanceValue}>{profile.totalProducts}</Text>
              </View>

              <View style={styles.performanceDivider} />

              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Total Orders</Text>
                <Text style={styles.performanceValue}>{profile.totalOrders}</Text>
              </View>

              <View style={styles.performanceDivider} />

              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Total Revenue</Text>
                <Text style={styles.performanceValue}>
                  {formatCurrency(profile.totalRevenue)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#6366f1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  statChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChange: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionButton: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  performanceDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
});
