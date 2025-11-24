import { apiClient } from '../client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  type: string;
  price: number;
  billingInterval: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  trialDays: number;
  isActive: boolean;
  benefits: {
    freeShipping?: boolean;
    discountPercent?: number;
    earlyAccess?: boolean;
    prioritySupport?: boolean;
    features?: string[];
  };
  maxProducts?: number;
  maxAds?: number;
  commissionRate?: number;
  prioritySupport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'TRIAL';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
}

export interface UserBenefits {
  hasSubscription: boolean;
  planName?: string;
  planType?: string;
  status?: string;
  benefits?: Record<string, any>;
  maxProducts?: number;
  maxAds?: number;
  commissionRate?: number;
  prioritySupport?: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

// Subscription Plans APIs
export const subscriptionPlansApi = {
  getAll: async (includeInactive = false) => {
    const url = includeInactive ? '/subscriptions/plans?includeInactive=true' : '/subscriptions/plans';
    const response = await apiClient.get<SubscriptionPlan[]>(url);
    return response;
  },

  getByType: async (type: 'customer' | 'vendor') => {
    const response = await apiClient.get<SubscriptionPlan[]>(`/subscriptions/plans/type/${type}`);
    return response;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<SubscriptionPlan>(`/subscriptions/plans/${id}`);
    return response;
  },
};

// User Subscriptions APIs
export const subscriptionsApi = {
  subscribe: async (planId: string, paymentMethodId?: string) => {
    const response = await apiClient.post<Subscription>('/subscriptions/subscribe', {
      planId,
      paymentMethodId,
    });
    return response;
  },

  getMyCurrent: async () => {
    const response = await apiClient.get<Subscription>('/subscriptions/my-subscription');
    return response;
  },

  getMyAll: async () => {
    const response = await apiClient.get<Subscription[]>('/subscriptions/my-subscriptions');
    return response;
  },

  cancel: async (subscriptionId: string) => {
    const response = await apiClient.post<Subscription>(
      `/subscriptions/${subscriptionId}/cancel`
    );
    return response;
  },

  reactivate: async (subscriptionId: string) => {
    const response = await apiClient.post<Subscription>(
      `/subscriptions/${subscriptionId}/reactivate`
    );
    return response;
  },

  changePlan: async (subscriptionId: string, newPlanId: string) => {
    const response = await apiClient.post<Subscription>(
      `/subscriptions/${subscriptionId}/change-plan`,
      { planId: newPlanId }
    );
    return response;
  },
};

// Benefits APIs
export const benefitsApi = {
  getMyBenefits: async () => {
    const response = await apiClient.get<UserBenefits>('/subscriptions/benefits');
    return response;
  },

  canPerform: async (action: 'createProduct' | 'createAd') => {
    const response = await apiClient.get<{ can: boolean }>(
      `/subscriptions/can-perform/${action}`
    );
    return response;
  },
};

// Invoices APIs
export const invoicesApi = {
  getMyInvoices: async (subscriptionId?: string) => {
    const url = subscriptionId ? `/subscriptions/invoices?subscriptionId=${subscriptionId}` : '/subscriptions/invoices';
    const response = await apiClient.get<SubscriptionInvoice[]>(url);
    return response;
  },
};
