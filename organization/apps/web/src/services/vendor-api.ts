import { apiClient } from '@/lib/api-client';
import {
  AdCampaign,
  AdCampaignStatus,
  PricingRule,
  SalesAnalytics,
  FraudAlert,
  FraudStats,
  EmailCampaign,
  VendorDashboardData,
  VendorPayout,
  PayoutSchedule,
  PayoutMethod,
  AudienceTargeting,
  DynamicPricingInsight,
  CompetitorPrice,
  AIRecommendation,
} from '@/types/vendor';

const BASE_URL = '/vendor';

// Dashboard API
export const vendorDashboardApi = {
  getDashboard: async (): Promise<VendorDashboardData> => {
    const response = await apiClient.get(`${BASE_URL}/dashboard`);
    return response.data;
  },

  getQuickStats: async (period: string) => {
    const response = await apiClient.get(`${BASE_URL}/dashboard/stats`, {
      params: { period },
    });
    return response.data;
  },
};

// Ad Campaigns API
export const adCampaignsApi = {
  getAll: async (params?: {
    status?: AdCampaignStatus;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: AdCampaign[]; total: number }> => {
    const response = await apiClient.get(`${BASE_URL}/campaigns`, { params });
    return response.data;
  },

  getById: async (id: string): Promise<AdCampaign> => {
    const response = await apiClient.get(`${BASE_URL}/campaigns/${id}`);
    return response.data;
  },

  create: async (data: Partial<AdCampaign>): Promise<AdCampaign> => {
    const response = await apiClient.post(`${BASE_URL}/campaigns`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<AdCampaign>): Promise<AdCampaign> => {
    const response = await apiClient.patch(`${BASE_URL}/campaigns/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/campaigns/${id}`);
  },

  updateStatus: async (id: string, status: AdCampaignStatus): Promise<AdCampaign> => {
    const response = await apiClient.patch(`${BASE_URL}/campaigns/${id}/status`, {
      status,
    });
    return response.data;
  },

  getMetrics: async (
    id: string,
    dateRange: { start: string; end: string }
  ) => {
    const response = await apiClient.get(`${BASE_URL}/campaigns/${id}/metrics`, {
      params: dateRange,
    });
    return response.data;
  },

  getAIRecommendations: async (id: string): Promise<AIRecommendation[]> => {
    const response = await apiClient.get(
      `${BASE_URL}/campaigns/${id}/ai-recommendations`
    );
    return response.data;
  },

  applyAIRecommendation: async (
    campaignId: string,
    recommendationId: string
  ): Promise<AdCampaign> => {
    const response = await apiClient.post(
      `${BASE_URL}/campaigns/${campaignId}/ai-recommendations/${recommendationId}/apply`
    );
    return response.data;
  },

  duplicateCampaign: async (id: string): Promise<AdCampaign> => {
    const response = await apiClient.post(`${BASE_URL}/campaigns/${id}/duplicate`);
    return response.data;
  },
};

// Audience Targeting API
export const audienceApi = {
  getSavedAudiences: async (): Promise<AudienceTargeting[]> => {
    const response = await apiClient.get(`${BASE_URL}/audiences`);
    return response.data;
  },

  saveAudience: async (audience: AudienceTargeting): Promise<AudienceTargeting> => {
    const response = await apiClient.post(`${BASE_URL}/audiences`, audience);
    return response.data;
  },

  updateAudience: async (
    id: string,
    data: Partial<AudienceTargeting>
  ): Promise<AudienceTargeting> => {
    const response = await apiClient.patch(`${BASE_URL}/audiences/${id}`, data);
    return response.data;
  },

  deleteAudience: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/audiences/${id}`);
  },

  estimateReach: async (targeting: AudienceTargeting): Promise<{ reach: number }> => {
    const response = await apiClient.post(`${BASE_URL}/audiences/estimate`, targeting);
    return response.data;
  },

  getAudienceInsights: async (id: string) => {
    const response = await apiClient.get(`${BASE_URL}/audiences/${id}/insights`);
    return response.data;
  },
};

// Pricing API
export const pricingApi = {
  getRules: async (): Promise<PricingRule[]> => {
    const response = await apiClient.get(`${BASE_URL}/pricing/rules`);
    return response.data;
  },

  createRule: async (rule: Partial<PricingRule>): Promise<PricingRule> => {
    const response = await apiClient.post(`${BASE_URL}/pricing/rules`, rule);
    return response.data;
  },

  updateRule: async (id: string, data: Partial<PricingRule>): Promise<PricingRule> => {
    const response = await apiClient.patch(`${BASE_URL}/pricing/rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/pricing/rules/${id}`);
  },

  toggleRuleStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<PricingRule> => {
    const response = await apiClient.patch(`${BASE_URL}/pricing/rules/${id}/status`, {
      status,
    });
    return response.data;
  },

  getDynamicPricingInsights: async (
    productIds?: string[]
  ): Promise<DynamicPricingInsight[]> => {
    const response = await apiClient.get(`${BASE_URL}/pricing/insights`, {
      params: { productIds: productIds?.join(',') },
    });
    return response.data;
  },

  getCompetitorPrices: async (productId: string): Promise<CompetitorPrice[]> => {
    const response = await apiClient.get(
      `${BASE_URL}/pricing/competitor/${productId}`
    );
    return response.data;
  },

  applyDynamicPrice: async (
    productId: string,
    price: number
  ): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`${BASE_URL}/pricing/apply`, {
      productId,
      price,
    });
    return response.data;
  },

  simulatePriceChange: async (productId: string, newPrice: number) => {
    const response = await apiClient.post(`${BASE_URL}/pricing/simulate`, {
      productId,
      newPrice,
    });
    return response.data;
  },
};

// Sales Analytics API
export const salesAnalyticsApi = {
  getAnalytics: async (dateRange: {
    start: string;
    end: string;
  }): Promise<SalesAnalytics> => {
    const response = await apiClient.get(`${BASE_URL}/analytics/sales`, {
      params: dateRange,
    });
    return response.data;
  },

  getTopProducts: async (params: {
    period: string;
    limit?: number;
    sortBy?: string;
  }) => {
    const response = await apiClient.get(`${BASE_URL}/analytics/top-products`, {
      params,
    });
    return response.data;
  },

  getCategoryBreakdown: async (dateRange: { start: string; end: string }) => {
    const response = await apiClient.get(`${BASE_URL}/analytics/categories`, {
      params: dateRange,
    });
    return response.data;
  },

  getCustomerInsights: async (dateRange: { start: string; end: string }) => {
    const response = await apiClient.get(`${BASE_URL}/analytics/customers`, {
      params: dateRange,
    });
    return response.data;
  },

  getPredictions: async (days: number) => {
    const response = await apiClient.get(`${BASE_URL}/analytics/predictions`, {
      params: { days },
    });
    return response.data;
  },

  exportReport: async (params: {
    type: 'SALES' | 'PRODUCTS' | 'CUSTOMERS';
    format: 'CSV' | 'EXCEL' | 'PDF';
    dateRange: { start: string; end: string };
  }): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/analytics/export`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

// Fraud Detection API
export const fraudApi = {
  getAlerts: async (params?: {
    status?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }): Promise<{ alerts: FraudAlert[]; total: number }> => {
    const response = await apiClient.get(`${BASE_URL}/fraud/alerts`, { params });
    return response.data;
  },

  getAlertById: async (id: string): Promise<FraudAlert> => {
    const response = await apiClient.get(`${BASE_URL}/fraud/alerts/${id}`);
    return response.data;
  },

  updateAlert: async (id: string, data: Partial<FraudAlert>): Promise<FraudAlert> => {
    const response = await apiClient.patch(`${BASE_URL}/fraud/alerts/${id}`, data);
    return response.data;
  },

  resolveAlert: async (
    id: string,
    resolution: {
      status: 'RESOLVED' | 'FALSE_POSITIVE';
      notes?: string;
    }
  ): Promise<FraudAlert> => {
    const response = await apiClient.post(
      `${BASE_URL}/fraud/alerts/${id}/resolve`,
      resolution
    );
    return response.data;
  },

  getStats: async (): Promise<FraudStats> => {
    const response = await apiClient.get(`${BASE_URL}/fraud/stats`);
    return response.data;
  },

  getRiskScore: async (orderId: string): Promise<{
    score: number;
    indicators: Array<{ name: string; value: string; weight: number }>;
  }> => {
    const response = await apiClient.get(`${BASE_URL}/fraud/risk/${orderId}`);
    return response.data;
  },

  reportFraud: async (data: {
    type: string;
    orderId?: string;
    customerId?: string;
    description: string;
  }): Promise<FraudAlert> => {
    const response = await apiClient.post(`${BASE_URL}/fraud/report`, data);
    return response.data;
  },
};

// Email Automation API
export const emailAutomationApi = {
  getCampaigns: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: EmailCampaign[]; total: number }> => {
    const response = await apiClient.get(`${BASE_URL}/email/campaigns`, { params });
    return response.data;
  },

  getCampaignById: async (id: string): Promise<EmailCampaign> => {
    const response = await apiClient.get(`${BASE_URL}/email/campaigns/${id}`);
    return response.data;
  },

  createCampaign: async (data: Partial<EmailCampaign>): Promise<EmailCampaign> => {
    const response = await apiClient.post(`${BASE_URL}/email/campaigns`, data);
    return response.data;
  },

  updateCampaign: async (
    id: string,
    data: Partial<EmailCampaign>
  ): Promise<EmailCampaign> => {
    const response = await apiClient.patch(`${BASE_URL}/email/campaigns/${id}`, data);
    return response.data;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/email/campaigns/${id}`);
  },

  updateCampaignStatus: async (
    id: string,
    status: EmailCampaign['status']
  ): Promise<EmailCampaign> => {
    const response = await apiClient.patch(
      `${BASE_URL}/email/campaigns/${id}/status`,
      { status }
    );
    return response.data;
  },

  sendTestEmail: async (id: string, email: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`${BASE_URL}/email/campaigns/${id}/test`, {
      email,
    });
    return response.data;
  },

  getCampaignMetrics: async (id: string) => {
    const response = await apiClient.get(`${BASE_URL}/email/campaigns/${id}/metrics`);
    return response.data;
  },

  getTemplates: async (): Promise<Array<{ id: string; name: string; html: string }>> => {
    const response = await apiClient.get(`${BASE_URL}/email/templates`);
    return response.data;
  },

  generateAIContent: async (params: {
    type: string;
    productIds?: string[];
    tone?: string;
    length?: string;
  }): Promise<{ subject: string; content: string }> => {
    const response = await apiClient.post(`${BASE_URL}/email/ai-generate`, params);
    return response.data;
  },

  duplicateCampaign: async (id: string): Promise<EmailCampaign> => {
    const response = await apiClient.post(
      `${BASE_URL}/email/campaigns/${id}/duplicate`
    );
    return response.data;
  },
};

// Payouts API
export const payoutsApi = {
  getPayouts: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ payouts: VendorPayout[]; total: number }> => {
    const response = await apiClient.get(`${BASE_URL}/payouts`, { params });
    return response.data;
  },

  getPayoutById: async (id: string): Promise<VendorPayout> => {
    const response = await apiClient.get(`${BASE_URL}/payouts/${id}`);
    return response.data;
  },

  getSchedule: async (): Promise<PayoutSchedule> => {
    const response = await apiClient.get(`${BASE_URL}/payouts/schedule`);
    return response.data;
  },

  updateSchedule: async (data: Partial<PayoutSchedule>): Promise<PayoutSchedule> => {
    const response = await apiClient.patch(`${BASE_URL}/payouts/schedule`, data);
    return response.data;
  },

  getMethods: async (): Promise<PayoutMethod[]> => {
    const response = await apiClient.get(`${BASE_URL}/payouts/methods`);
    return response.data;
  },

  addMethod: async (method: Partial<PayoutMethod>): Promise<PayoutMethod> => {
    const response = await apiClient.post(`${BASE_URL}/payouts/methods`, method);
    return response.data;
  },

  updateMethod: async (
    id: string,
    data: Partial<PayoutMethod>
  ): Promise<PayoutMethod> => {
    const response = await apiClient.patch(`${BASE_URL}/payouts/methods/${id}`, data);
    return response.data;
  },

  deleteMethod: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/payouts/methods/${id}`);
  },

  setDefaultMethod: async (id: string): Promise<PayoutMethod> => {
    const response = await apiClient.post(
      `${BASE_URL}/payouts/methods/${id}/default`
    );
    return response.data;
  },

  requestPayout: async (): Promise<VendorPayout> => {
    const response = await apiClient.post(`${BASE_URL}/payouts/request`);
    return response.data;
  },

  getBalance: async (): Promise<{
    available: number;
    pending: number;
    currency: string;
  }> => {
    const response = await apiClient.get(`${BASE_URL}/payouts/balance`);
    return response.data;
  },
};

export const vendorApi = {
  dashboard: vendorDashboardApi,
  campaigns: adCampaignsApi,
  audiences: audienceApi,
  pricing: pricingApi,
  analytics: salesAnalyticsApi,
  fraud: fraudApi,
  email: emailAutomationApi,
  payouts: payoutsApi,
};

export default vendorApi;
