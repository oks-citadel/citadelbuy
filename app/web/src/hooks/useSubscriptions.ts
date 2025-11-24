import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  subscriptionPlansApi,
  subscriptionsApi,
  benefitsApi,
  invoicesApi,
} from '@/lib/api/subscriptions';
import { toast } from 'sonner';

// Subscription Plans hooks
export const useSubscriptionPlans = (includeInactive = false) => {
  return useQuery({
    queryKey: ['subscription-plans', includeInactive],
    queryFn: () => subscriptionPlansApi.getAll(includeInactive),
  });
};

export const useSubscriptionPlansByType = (type: 'customer' | 'vendor') => {
  return useQuery({
    queryKey: ['subscription-plans', type],
    queryFn: () => subscriptionPlansApi.getByType(type),
  });
};

export const useSubscriptionPlan = (id: string) => {
  return useQuery({
    queryKey: ['subscription-plan', id],
    queryFn: () => subscriptionPlansApi.getById(id),
    enabled: !!id,
  });
};

// User Subscriptions hooks
export const useMySubscription = () => {
  return useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionsApi.getMyCurrent(),
    retry: false, // Don't retry if user has no subscription
  });
};

export const useMySubscriptions = () => {
  return useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => subscriptionsApi.getMyAll(),
  });
};

export const useSubscribe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, paymentMethodId }: { planId: string; paymentMethodId?: string }) =>
      subscriptionsApi.subscribe(planId, paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-benefits'] });
      toast.success('Subscription activated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    },
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId: string) => subscriptionsApi.cancel(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      toast.success('Subscription cancelled. You can use it until the end of the billing period.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    },
  });
};

export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId: string) => subscriptionsApi.reactivate(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      toast.success('Subscription reactivated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reactivate subscription');
    },
  });
};

export const useChangePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId, newPlanId }: { subscriptionId: string; newPlanId: string }) =>
      subscriptionsApi.changePlan(subscriptionId, newPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-benefits'] });
      toast.success('Subscription plan changed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change plan');
    },
  });
};

// Benefits hooks
export const useMyBenefits = () => {
  return useQuery({
    queryKey: ['my-benefits'],
    queryFn: () => benefitsApi.getMyBenefits(),
  });
};

export const useCanPerform = (action: 'createProduct' | 'createAd') => {
  return useQuery({
    queryKey: ['can-perform', action],
    queryFn: () => benefitsApi.canPerform(action),
  });
};

// Invoices hooks
export const useMyInvoices = (subscriptionId?: string) => {
  return useQuery({
    queryKey: ['my-invoices', subscriptionId],
    queryFn: () => invoicesApi.getMyInvoices(subscriptionId),
  });
};
