import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AIService from '../services/ai-services';

const SubscriptionsScreen = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  useEffect(() => {
    loadSubscriptionAnalytics();
  }, []);

  const loadSubscriptionAnalytics = async () => {
    try {
      setLoading(true);
      // In production, get actual user ID from auth state
      const userId = 'current-user-id';
      const response = await AIService.subscription.getAnalytics(userId);
      setAnalytics(response);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictChurn = async (subscriptionId: string) => {
    try {
      const userId = 'current-user-id';
      const churnPrediction = await AIService.subscription.predictChurn(
        subscriptionId,
        userId,
      );

      Alert.alert(
        'Churn Risk Analysis',
        `Risk Level: ${churnPrediction.churnPrediction.riskLevel}\n` +
        `Probability: ${churnPrediction.churnPrediction.probability}\n\n` +
        `Signals:\n${churnPrediction.signals.join('\n')}`,
      );
    } catch (error) {
      console.error('Churn prediction error:', error);
    }
  };

  const handlePredictReplenishment = async (productId: string, lastPurchase: string) => {
    try {
      const userId = 'current-user-id';
      const prediction = await AIService.subscription.predictReplenishment({
        userId,
        productId,
        lastPurchase,
      });

      Alert.alert(
        'Replenishment Prediction',
        `Supply Level: ${prediction.prediction.estimatedSupplyLevel}\n` +
        `Days Until Empty: ${prediction.prediction.daysUntilEmpty}\n` +
        `Urgency: ${prediction.prediction.urgency}\n\n` +
        `${prediction.recommendation.action === 'order_now' ? '⚠️ Order Now!' : '✅ Stock OK'}`,
      );
    } catch (error) {
      console.error('Replenishment prediction error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Overview Card */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Your Subscriptions</Text>
        <View style={styles.overviewStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics?.overview.activeSubscriptions}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${analytics?.overview.totalMonthlyValue}</Text>
            <Text style={styles.statLabel}>Monthly</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${analytics?.overview.totalAnnualSavings}</Text>
            <Text style={styles.statLabel}>Saved/Year</Text>
          </View>
        </View>
        <Text style={styles.memberSince}>
          Member since {new Date(analytics?.overview.memberSince).toLocaleDateString()}
        </Text>
      </View>

      {/* Active Subscriptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Subscriptions</Text>
        {analytics?.subscriptions.map((subscription: any) => (
          <TouchableOpacity
            key={subscription.id}
            style={styles.subscriptionCard}
            onPress={() => setSelectedSubscription(subscription)}
          >
            <View style={styles.subscriptionHeader}>
              <Text style={styles.subscriptionProduct}>{subscription.product}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{subscription.status}</Text>
              </View>
            </View>

            <View style={styles.subscriptionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Frequency:</Text>
                <Text style={styles.detailValue}>{subscription.frequency}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Next Delivery:</Text>
                <Text style={styles.detailValue}>
                  {new Date(subscription.nextDelivery).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monthly Cost:</Text>
                <Text style={styles.detailValue}>${subscription.monthlyCost}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePredictChurn(subscription.id)}
              >
                <Text style={styles.actionButtonText}>📊 Analyze</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePredictReplenishment(
                  subscription.product,
                  subscription.nextDelivery,
                )}
              >
                <Text style={styles.actionButtonText}>🔮 Predict Stock</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Insights</Text>
        <View style={styles.insightsCard}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Savings vs One-Time:</Text>
            <Text style={styles.insightValue}>
              {analytics?.insights.savingsVsOneTime}
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>On-Time Delivery:</Text>
            <Text style={styles.insightValue}>
              {analytics?.insights.onTimeDeliveryRate}
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Average Rating:</Text>
            <Text style={styles.insightValue}>
              ⭐ {analytics?.insights.averageRating}
            </Text>
          </View>
        </View>

        <Text style={styles.recommendationsTitle}>Recommendations:</Text>
        {analytics?.insights.recommendations.map((rec: string, index: number) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </View>

      {/* Savings Summary */}
      <View style={styles.savingsCard}>
        <Text style={styles.savingsTitle}>💰 You're Saving Money!</Text>
        <Text style={styles.savingsAmount}>
          ${analytics?.overview.totalAnnualSavings}
        </Text>
        <Text style={styles.savingsSubtext}>per year with subscriptions</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  overviewCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  memberSince: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  subscriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionProduct: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  subscriptionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  insightsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  bullet: {
    marginRight: 10,
    color: '#007AFF',
    fontSize: 16,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  savingsCard: {
    margin: 15,
    padding: 25,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  savingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  savingsAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  savingsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});

export default SubscriptionsScreen;
