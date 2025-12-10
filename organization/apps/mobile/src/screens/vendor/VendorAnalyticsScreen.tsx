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
import { useVendorStore } from '../../stores/vendor-store';

const { width } = Dimensions.get('window');

export default function VendorAnalyticsScreen() {
  const { analytics, isLoadingAnalytics, fetchAnalytics } = useVendorStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics(selectedPeriod);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoadingAnalytics && !analytics) {
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
        <Text style={styles.headerTitle}>Analytics</Text>
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
          {(['week', 'month', 'year'] as const).map((period) => (
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

        {analytics && (
          <>
            {/* Revenue Chart Placeholder */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue Trend</Text>
              <View style={styles.chartCard}>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="trending-up" size={48} color="#6366f1" />
                  <Text style={styles.chartPlaceholderText}>
                    Revenue chart visualization would appear here
                  </Text>
                  <View style={styles.chartStats}>
                    {analytics.revenue.slice(-5).map((point, index) => (
                      <View key={index} style={styles.chartStatItem}>
                        <Text style={styles.chartStatLabel}>{point.label}</Text>
                        <Text style={styles.chartStatValue}>{formatCurrency(point.value)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Top Products */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Performing Products</Text>
              {analytics.products.slice(0, 5).map((product, index) => (
                <View key={product.product.id} style={styles.productCard}>
                  <View style={styles.productRank}>
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.product.name}
                    </Text>
                    <View style={styles.productMetrics}>
                      <Text style={styles.productMetric}>
                        {product.sales} sales
                      </Text>
                      <Text style={styles.productMetricDivider}>•</Text>
                      <Text style={styles.productMetric}>
                        {formatCurrency(product.revenue)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.trendContainer}>
                    <Ionicons
                      name={
                        product.trend === 'up'
                          ? 'trending-up'
                          : product.trend === 'down'
                          ? 'trending-down'
                          : 'remove'
                      }
                      size={20}
                      color={
                        product.trend === 'up'
                          ? '#10b981'
                          : product.trend === 'down'
                          ? '#ef4444'
                          : '#6b7280'
                      }
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Category Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sales by Category</Text>
              {analytics.categories.map((category) => (
                <View key={category.categoryId} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{category.categoryName}</Text>
                    <Text style={styles.categoryRevenue}>{formatCurrency(category.revenue)}</Text>
                  </View>
                  <View style={styles.categoryBar}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        { width: `${category.percentage}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.categoryFooter}>
                    <Text style={styles.categoryStats}>
                      {category.sales} sales • {category.productCount} products
                    </Text>
                    <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Customer Analytics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Insights</Text>
              <View style={styles.customerCard}>
                <View style={styles.customerStat}>
                  <Ionicons name="people-outline" size={24} color="#6366f1" />
                  <View style={styles.customerStatInfo}>
                    <Text style={styles.customerStatValue}>
                      {analytics.customers.totalCustomers}
                    </Text>
                    <Text style={styles.customerStatLabel}>Total Customers</Text>
                  </View>
                </View>

                <View style={styles.customerDivider} />

                <View style={styles.customerStat}>
                  <Ionicons name="person-add-outline" size={24} color="#10b981" />
                  <View style={styles.customerStatInfo}>
                    <Text style={styles.customerStatValue}>
                      {analytics.customers.newCustomers}
                    </Text>
                    <Text style={styles.customerStatLabel}>New Customers</Text>
                  </View>
                </View>

                <View style={styles.customerDivider} />

                <View style={styles.customerStat}>
                  <Ionicons name="repeat-outline" size={24} color="#8b5cf6" />
                  <View style={styles.customerStatInfo}>
                    <Text style={styles.customerStatValue}>
                      {analytics.customers.returningCustomers}
                    </Text>
                    <Text style={styles.customerStatLabel}>Returning</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  chartStats: {
    width: '100%',
  },
  chartStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  chartStatLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  chartStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  productMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productMetric: {
    fontSize: 13,
    color: '#6b7280',
  },
  productMetricDivider: {
    marginHorizontal: 8,
    color: '#d1d5db',
  },
  trendContainer: {
    marginLeft: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  categoryRevenue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  categoryBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryStats: {
    fontSize: 13,
    color: '#6b7280',
  },
  categoryPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  customerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  customerStatInfo: {
    marginLeft: 16,
  },
  customerStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerStatLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  customerDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
});
