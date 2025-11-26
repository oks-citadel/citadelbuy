import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVendorStore } from '@/stores/vendor-store';
import { vendorApi } from '@/services/vendor-api';
import {
  AdCampaign,
  AdCampaignStatus,
  PricingRule,
  FraudAlert,
  EmailCampaign,
  AudienceTargeting,
} from '@/types/vendor';

// Dashboard Hook
export function useVendorDashboard() {
  const { setDashboardData, setDashboardLoading, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'dashboard'],
    queryFn: vendorApi.dashboard.getDashboard,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    setDashboardLoading(query.isLoading);
    if (query.data) {
      setDashboardData(query.data);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.isLoading, query.error, setDashboardData, setDashboardLoading, setError]);

  return query;
}

// Ad Campaigns Hooks
export function useAdCampaigns(params?: {
  status?: AdCampaignStatus;
  type?: string;
  page?: number;
  limit?: number;
}) {
  const { setCampaigns, setCampaignsLoading, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'campaigns', params],
    queryFn: () => vendorApi.campaigns.getAll(params),
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    setCampaignsLoading(query.isLoading);
    if (query.data) {
      setCampaigns(query.data.campaigns);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.isLoading, query.error, setCampaigns, setCampaignsLoading, setError]);

  return query;
}

export function useAdCampaign(id: string) {
  const { setSelectedCampaign, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'campaign', id],
    queryFn: () => vendorApi.campaigns.getById(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (query.data) {
      setSelectedCampaign(query.data);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.error, setSelectedCampaign, setError]);

  return query;
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { addCampaign } = useVendorStore();

  return useMutation({
    mutationFn: (data: Partial<AdCampaign>) => vendorApi.campaigns.create(data),
    onSuccess: (campaign) => {
      addCampaign(campaign);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create campaign');
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const { updateCampaign } = useVendorStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdCampaign> }) =>
      vendorApi.campaigns.update(id, data),
    onSuccess: (campaign) => {
      updateCampaign(campaign.id, campaign);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'campaign', campaign.id] });
      toast.success('Campaign updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update campaign');
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const { deleteCampaign } = useVendorStore();

  return useMutation({
    mutationFn: (id: string) => vendorApi.campaigns.delete(id),
    onSuccess: (_, id) => {
      deleteCampaign(id);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'campaigns'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete campaign');
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  const { updateCampaign } = useVendorStore();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdCampaignStatus }) =>
      vendorApi.campaigns.updateStatus(id, status),
    onSuccess: (campaign) => {
      updateCampaign(campaign.id, { status: campaign.status });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'campaigns'] });
      toast.success(`Campaign ${campaign.status.toLowerCase()}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update campaign status');
    },
  });
}

export function useCampaignAIRecommendations(campaignId: string) {
  return useQuery({
    queryKey: ['vendor', 'campaign', campaignId, 'ai-recommendations'],
    queryFn: () => vendorApi.campaigns.getAIRecommendations(campaignId),
    enabled: !!campaignId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useApplyAIRecommendation() {
  const queryClient = useQueryClient();
  const { updateCampaign } = useVendorStore();

  return useMutation({
    mutationFn: ({
      campaignId,
      recommendationId,
    }: {
      campaignId: string;
      recommendationId: string;
    }) => vendorApi.campaigns.applyAIRecommendation(campaignId, recommendationId),
    onSuccess: (campaign) => {
      updateCampaign(campaign.id, campaign);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'campaign', campaign.id] });
      toast.success('AI recommendation applied');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply recommendation');
    },
  });
}

// Audience Hooks
export function useSavedAudiences() {
  const { setSavedAudiences } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'audiences'],
    queryFn: vendorApi.audiences.getSavedAudiences,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (query.data) {
      setSavedAudiences(query.data);
    }
  }, [query.data, setSavedAudiences]);

  return query;
}

export function useSaveAudience() {
  const queryClient = useQueryClient();
  const { addSavedAudience } = useVendorStore();

  return useMutation({
    mutationFn: (audience: AudienceTargeting) => vendorApi.audiences.saveAudience(audience),
    onSuccess: (audience) => {
      addSavedAudience(audience);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'audiences'] });
      toast.success('Audience saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save audience');
    },
  });
}

export function useEstimateAudienceReach() {
  return useMutation({
    mutationFn: (targeting: AudienceTargeting) =>
      vendorApi.audiences.estimateReach(targeting),
  });
}

// Pricing Hooks
export function usePricingRules() {
  const { setPricingRules, setPricingLoading, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'pricing', 'rules'],
    queryFn: vendorApi.pricing.getRules,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    setPricingLoading(query.isLoading);
    if (query.data) {
      setPricingRules(query.data);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.isLoading, query.error, setPricingRules, setPricingLoading, setError]);

  return query;
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient();
  const { addPricingRule } = useVendorStore();

  return useMutation({
    mutationFn: (rule: Partial<PricingRule>) => vendorApi.pricing.createRule(rule),
    onSuccess: (rule) => {
      addPricingRule(rule);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pricing', 'rules'] });
      toast.success('Pricing rule created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create pricing rule');
    },
  });
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();
  const { updatePricingRule } = useVendorStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingRule> }) =>
      vendorApi.pricing.updateRule(id, data),
    onSuccess: (rule) => {
      updatePricingRule(rule.id, rule);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pricing', 'rules'] });
      toast.success('Pricing rule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update pricing rule');
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();
  const { deletePricingRule } = useVendorStore();

  return useMutation({
    mutationFn: (id: string) => vendorApi.pricing.deleteRule(id),
    onSuccess: (_, id) => {
      deletePricingRule(id);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pricing', 'rules'] });
      toast.success('Pricing rule deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete pricing rule');
    },
  });
}

export function useDynamicPricingInsights(productIds?: string[]) {
  const { setDynamicPricingInsights } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'pricing', 'insights', productIds],
    queryFn: () => vendorApi.pricing.getDynamicPricingInsights(productIds),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (query.data) {
      setDynamicPricingInsights(query.data);
    }
  }, [query.data, setDynamicPricingInsights]);

  return query;
}

export function useCompetitorPrices(productId: string) {
  return useQuery({
    queryKey: ['vendor', 'pricing', 'competitor', productId],
    queryFn: () => vendorApi.pricing.getCompetitorPrices(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 15,
  });
}

export function useApplyDynamicPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) =>
      vendorApi.pricing.applyDynamicPrice(productId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pricing', 'insights'] });
      toast.success('Price updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update price');
    },
  });
}

// Sales Analytics Hooks
export function useSalesAnalytics(dateRange: { start: string; end: string }) {
  const { setSalesAnalytics, setAnalyticsLoading, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'analytics', 'sales', dateRange],
    queryFn: () => vendorApi.analytics.getAnalytics(dateRange),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setAnalyticsLoading(query.isLoading);
    if (query.data) {
      setSalesAnalytics(query.data);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.isLoading, query.error, setSalesAnalytics, setAnalyticsLoading, setError]);

  return query;
}

export function useSalesPredictions(days: number = 30) {
  return useQuery({
    queryKey: ['vendor', 'analytics', 'predictions', days],
    queryFn: () => vendorApi.analytics.getPredictions(days),
    staleTime: 1000 * 60 * 30,
  });
}

export function useExportAnalytics() {
  return useMutation({
    mutationFn: vendorApi.analytics.exportReport,
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${variables.type.toLowerCase()}-report.${variables.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report exported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export report');
    },
  });
}

// Fraud Detection Hooks
export function useFraudAlerts(params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) {
  const { setFraudAlerts, setFraudLoading, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'fraud', 'alerts', params],
    queryFn: () => vendorApi.fraud.getAlerts(params),
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    setFraudLoading(query.isLoading);
    if (query.data) {
      setFraudAlerts(query.data.alerts);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.isLoading, query.error, setFraudAlerts, setFraudLoading, setError]);

  return query;
}

export function useFraudStats() {
  const { setFraudStats } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'fraud', 'stats'],
    queryFn: vendorApi.fraud.getStats,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (query.data) {
      setFraudStats(query.data);
    }
  }, [query.data, setFraudStats]);

  return query;
}

export function useResolveFraudAlert() {
  const queryClient = useQueryClient();
  const { updateFraudAlert } = useVendorStore();

  return useMutation({
    mutationFn: ({
      id,
      resolution,
    }: {
      id: string;
      resolution: { status: 'RESOLVED' | 'FALSE_POSITIVE'; notes?: string };
    }) => vendorApi.fraud.resolveAlert(id, resolution),
    onSuccess: (alert) => {
      updateFraudAlert(alert.id, alert);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'fraud'] });
      toast.success('Alert resolved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resolve alert');
    },
  });
}

// Email Automation Hooks
export function useEmailCampaigns(params?: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}) {
  const { setEmailCampaigns, setEmailLoading, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'email', 'campaigns', params],
    queryFn: () => vendorApi.email.getCampaigns(params),
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    setEmailLoading(query.isLoading);
    if (query.data) {
      setEmailCampaigns(query.data.campaigns);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.isLoading, query.error, setEmailCampaigns, setEmailLoading, setError]);

  return query;
}

export function useEmailCampaign(id: string) {
  const { setSelectedEmailCampaign, setError } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'email', 'campaign', id],
    queryFn: () => vendorApi.email.getCampaignById(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (query.data) {
      setSelectedEmailCampaign(query.data);
    }
    if (query.error) {
      setError((query.error as Error).message);
    }
  }, [query.data, query.error, setSelectedEmailCampaign, setError]);

  return query;
}

export function useCreateEmailCampaign() {
  const queryClient = useQueryClient();
  const { addEmailCampaign } = useVendorStore();

  return useMutation({
    mutationFn: (data: Partial<EmailCampaign>) => vendorApi.email.createCampaign(data),
    onSuccess: (campaign) => {
      addEmailCampaign(campaign);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'email', 'campaigns'] });
      toast.success('Email campaign created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create email campaign');
    },
  });
}

export function useUpdateEmailCampaign() {
  const queryClient = useQueryClient();
  const { updateEmailCampaign } = useVendorStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmailCampaign> }) =>
      vendorApi.email.updateCampaign(id, data),
    onSuccess: (campaign) => {
      updateEmailCampaign(campaign.id, campaign);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'email', 'campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'email', 'campaign', campaign.id] });
      toast.success('Email campaign updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update email campaign');
    },
  });
}

export function useDeleteEmailCampaign() {
  const queryClient = useQueryClient();
  const { deleteEmailCampaign } = useVendorStore();

  return useMutation({
    mutationFn: (id: string) => vendorApi.email.deleteCampaign(id),
    onSuccess: (_, id) => {
      deleteEmailCampaign(id);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'email', 'campaigns'] });
      toast.success('Email campaign deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete email campaign');
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      vendorApi.email.sendTestEmail(id, email),
    onSuccess: () => {
      toast.success('Test email sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send test email');
    },
  });
}

export function useGenerateAIEmailContent() {
  return useMutation({
    mutationFn: vendorApi.email.generateAIContent,
    onSuccess: () => {
      toast.success('AI content generated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate AI content');
    },
  });
}

// Payouts Hooks
export function usePayouts(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { setPayouts, setPayoutsLoading } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'payouts', params],
    queryFn: () => vendorApi.payouts.getPayouts(params),
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    setPayoutsLoading(query.isLoading);
    if (query.data) {
      setPayouts(query.data.payouts);
    }
  }, [query.data, query.isLoading, setPayouts, setPayoutsLoading]);

  return query;
}

export function usePayoutSchedule() {
  const { setPayoutSchedule } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'payouts', 'schedule'],
    queryFn: vendorApi.payouts.getSchedule,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (query.data) {
      setPayoutSchedule(query.data);
    }
  }, [query.data, setPayoutSchedule]);

  return query;
}

export function usePayoutMethods() {
  const { setPayoutMethods } = useVendorStore();

  const query = useQuery({
    queryKey: ['vendor', 'payouts', 'methods'],
    queryFn: vendorApi.payouts.getMethods,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (query.data) {
      setPayoutMethods(query.data);
    }
  }, [query.data, setPayoutMethods]);

  return query;
}

export function usePayoutBalance() {
  return useQuery({
    queryKey: ['vendor', 'payouts', 'balance'],
    queryFn: vendorApi.payouts.getBalance,
    staleTime: 1000 * 60,
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorApi.payouts.requestPayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'payouts'] });
      toast.success('Payout requested');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to request payout');
    },
  });
}
