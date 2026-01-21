import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { billingService, subscriptionsApi, SubscriptionPlan } from '../../services/billing';

interface CurrentSubscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider: string;
}

const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    'Up to 100 products',
    'Basic analytics',
    'Email support',
    'Standard checkout',
  ],
  premium: [
    'Unlimited products',
    'Advanced analytics',
    'Priority support',
    'Enhanced checkout',
    'Custom domain',
    'API access',
  ],
  vip: [
    'Everything in Premium',
    'Dedicated account manager',
    'Custom integrations',
    'White-label options',
    'SLA guarantee',
    '24/7 phone support',
  ],
};

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        subscriptionsApi.getPlans(),
        subscriptionsApi.getCurrentSubscription(),
      ]);

      setPlans(plansRes);
      if (subRes.success && subRes.subscription) {
        setCurrentSubscription(subRes.subscription);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (currentSubscription?.planId === plan.id) {
      Alert.alert('Current Plan', 'You are already subscribed to this plan.');
      return;
    }

    Alert.alert(
      'Subscribe to ' + plan.name,
      `You will be charged ${formatCurrency(isYearly ? (plan.price ?? 0) * 10 : plan.price ?? 0, plan.currency ?? "USD")} ${isYearly ? 'per year' : 'per month'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            setProcessingPlanId(plan.id);
            try {
              const result = await billingService.purchaseSubscription(plan);
              if (result.success) {
                Alert.alert('Success', 'Subscription activated!');
                await loadData();
              } else {
                Alert.alert('Failed', result.error?.message || 'Unable to process subscription');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Subscription failed');
            } finally {
              setProcessingPlanId(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelSubscription = () => {
    if (!currentSubscription) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel? You will retain access until the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await billingService.cancelSubscription(currentSubscription.id);
              if (success) {
                Alert.alert('Subscription Cancelled', 'Your subscription will end on ' + formatDate(currentSubscription.currentPeriodEnd));
                await loadData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'trialing':
        return '#3b82f6';
      case 'past_due':
        return '#ef4444';
      case 'canceled':
        return '#6b7280';
      default:
        return '#6b7280';
    }
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Subscription */}
        {currentSubscription && (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <View>
                <Text style={styles.currentPlanLabel}>Current Plan</Text>
                <Text style={styles.currentPlanName}>{currentSubscription.planName}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentSubscription.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(currentSubscription.status) }]}>
                  {currentSubscription.status === 'active' ? 'Active' :
                   currentSubscription.status === 'trialing' ? 'Trial' :
                   currentSubscription.status === 'past_due' ? 'Past Due' : 'Canceled'}
                </Text>
              </View>
            </View>

            {currentSubscription.cancelAtPeriodEnd && (
              <View style={styles.cancelWarning}>
                <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                <Text style={styles.cancelWarningText}>
                  Subscription ends {formatDate(currentSubscription.currentPeriodEnd)}
                </Text>
              </View>
            )}

            {!currentSubscription.cancelAtPeriodEnd && currentSubscription.status === 'active' && (
              <View style={styles.renewInfo}>
                <Ionicons name="refresh" size={16} color="#6b7280" />
                <Text style={styles.renewText}>
                  Renews {formatDate(currentSubscription.currentPeriodEnd)}
                </Text>
              </View>
            )}

            {currentSubscription.status === 'active' && !currentSubscription.cancelAtPeriodEnd && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelSubscription}
              >
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <Text style={[styles.toggleLabel, !isYearly && styles.toggleLabelActive]}>Monthly</Text>
          <Switch
            value={isYearly}
            onValueChange={setIsYearly}
            trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
            thumbColor={isYearly ? '#6366f1' : '#f4f3f4'}
          />
          <Text style={[styles.toggleLabel, isYearly && styles.toggleLabelActive]}>
            Yearly <Text style={styles.savingsText}>Save 17%</Text>
          </Text>
        </View>

        {/* Plans */}
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.planId === plan.id;
          const price = isYearly ? (plan.price ?? 0) * 10 : (plan.price ?? 0);
          const features = PLAN_FEATURES[plan.id.toLowerCase()] || plan.features;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.id === 'premium' && styles.planCardFeatured,
                isCurrentPlan && styles.planCardCurrent,
              ]}
            >
              {plan.id === 'premium' && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDescription}>{plan.description}</Text>

              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  {formatCurrency(price, plan.currency ?? 'USD')}
                </Text>
                <Text style={styles.pricePeriod}>/{isYearly ? 'year' : 'month'}</Text>
              </View>

              <View style={styles.featuresList}>
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  plan.id === 'premium' && styles.selectButtonFeatured,
                  isCurrentPlan && styles.selectButtonCurrent,
                ]}
                onPress={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || processingPlanId === plan.id}
              >
                {processingPlanId === plan.id ? (
                  <ActivityIndicator color={plan.id === 'premium' ? '#fff' : '#6366f1'} />
                ) : (
                  <Text style={[
                    styles.selectButtonText,
                    plan.id === 'premium' && styles.selectButtonTextFeatured,
                    isCurrentPlan && styles.selectButtonTextCurrent,
                  ]}>
                    {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  currentPlanCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  currentPlanLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  cancelWarningText: {
    fontSize: 13,
    color: '#92400e',
  },
  renewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  renewText: {
    fontSize: 13,
    color: '#6b7280',
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  toggleLabelActive: {
    color: '#1f2937',
    fontWeight: '600',
  },
  savingsText: {
    color: '#10b981',
    fontSize: 12,
  },
  planCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  planCardFeatured: {
    borderColor: '#6366f1',
  },
  planCardCurrent: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -50,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 16,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#4b5563',
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
  },
  selectButtonFeatured: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  selectButtonCurrent: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  selectButtonTextFeatured: {
    color: '#fff',
  },
  selectButtonTextCurrent: {
    color: '#fff',
  },
  bottomPadding: {
    height: 32,
  },
});
