import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AdCampaign,
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
} from '@/types/vendor';

interface VendorState {
  // Dashboard
  dashboardData: VendorDashboardData | null;
  dashboardLoading: boolean;

  // Campaigns
  campaigns: AdCampaign[];
  selectedCampaign: AdCampaign | null;
  campaignsLoading: boolean;

  // Pricing
  pricingRules: PricingRule[];
  dynamicPricingInsights: DynamicPricingInsight[];
  pricingLoading: boolean;

  // Analytics
  salesAnalytics: SalesAnalytics | null;
  analyticsLoading: boolean;
  analyticsDateRange: { start: string; end: string };

  // Fraud
  fraudAlerts: FraudAlert[];
  fraudStats: FraudStats | null;
  fraudLoading: boolean;

  // Email
  emailCampaigns: EmailCampaign[];
  selectedEmailCampaign: EmailCampaign | null;
  emailLoading: boolean;

  // Payouts
  payouts: VendorPayout[];
  payoutSchedule: PayoutSchedule | null;
  payoutMethods: PayoutMethod[];
  payoutsLoading: boolean;

  // Audiences
  savedAudiences: AudienceTargeting[];

  // Error state
  error: string | null;

  // Actions
  setDashboardData: (data: VendorDashboardData) => void;
  setDashboardLoading: (loading: boolean) => void;

  setCampaigns: (campaigns: AdCampaign[]) => void;
  addCampaign: (campaign: AdCampaign) => void;
  updateCampaign: (id: string, updates: Partial<AdCampaign>) => void;
  deleteCampaign: (id: string) => void;
  setSelectedCampaign: (campaign: AdCampaign | null) => void;
  setCampaignsLoading: (loading: boolean) => void;

  setPricingRules: (rules: PricingRule[]) => void;
  addPricingRule: (rule: PricingRule) => void;
  updatePricingRule: (id: string, updates: Partial<PricingRule>) => void;
  deletePricingRule: (id: string) => void;
  setDynamicPricingInsights: (insights: DynamicPricingInsight[]) => void;
  setPricingLoading: (loading: boolean) => void;

  setSalesAnalytics: (analytics: SalesAnalytics) => void;
  setAnalyticsLoading: (loading: boolean) => void;
  setAnalyticsDateRange: (range: { start: string; end: string }) => void;

  setFraudAlerts: (alerts: FraudAlert[]) => void;
  updateFraudAlert: (id: string, updates: Partial<FraudAlert>) => void;
  setFraudStats: (stats: FraudStats) => void;
  setFraudLoading: (loading: boolean) => void;

  setEmailCampaigns: (campaigns: EmailCampaign[]) => void;
  addEmailCampaign: (campaign: EmailCampaign) => void;
  updateEmailCampaign: (id: string, updates: Partial<EmailCampaign>) => void;
  deleteEmailCampaign: (id: string) => void;
  setSelectedEmailCampaign: (campaign: EmailCampaign | null) => void;
  setEmailLoading: (loading: boolean) => void;

  setPayouts: (payouts: VendorPayout[]) => void;
  setPayoutSchedule: (schedule: PayoutSchedule) => void;
  setPayoutMethods: (methods: PayoutMethod[]) => void;
  setPayoutsLoading: (loading: boolean) => void;

  setSavedAudiences: (audiences: AudienceTargeting[]) => void;
  addSavedAudience: (audience: AudienceTargeting) => void;
  deleteSavedAudience: (id: string) => void;

  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  dashboardData: null,
  dashboardLoading: false,
  campaigns: [],
  selectedCampaign: null,
  campaignsLoading: false,
  pricingRules: [],
  dynamicPricingInsights: [],
  pricingLoading: false,
  salesAnalytics: null,
  analyticsLoading: false,
  analyticsDateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  fraudAlerts: [],
  fraudStats: null,
  fraudLoading: false,
  emailCampaigns: [],
  selectedEmailCampaign: null,
  emailLoading: false,
  payouts: [],
  payoutSchedule: null,
  payoutMethods: [],
  payoutsLoading: false,
  savedAudiences: [],
  error: null,
};

export const useVendorStore = create<VendorState>()(
  persist(
    (set) => ({
      ...initialState,

      // Dashboard
      setDashboardData: (data) => set({ dashboardData: data }),
      setDashboardLoading: (loading) => set({ dashboardLoading: loading }),

      // Campaigns
      setCampaigns: (campaigns) => set({ campaigns }),
      addCampaign: (campaign) =>
        set((state) => ({ campaigns: [...state.campaigns, campaign] })),
      updateCampaign: (id, updates) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
          selectedCampaign:
            state.selectedCampaign?.id === id
              ? { ...state.selectedCampaign, ...updates }
              : state.selectedCampaign,
        })),
      deleteCampaign: (id) =>
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
          selectedCampaign:
            state.selectedCampaign?.id === id ? null : state.selectedCampaign,
        })),
      setSelectedCampaign: (campaign) => set({ selectedCampaign: campaign }),
      setCampaignsLoading: (loading) => set({ campaignsLoading: loading }),

      // Pricing
      setPricingRules: (rules) => set({ pricingRules: rules }),
      addPricingRule: (rule) =>
        set((state) => ({ pricingRules: [...state.pricingRules, rule] })),
      updatePricingRule: (id, updates) =>
        set((state) => ({
          pricingRules: state.pricingRules.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      deletePricingRule: (id) =>
        set((state) => ({
          pricingRules: state.pricingRules.filter((r) => r.id !== id),
        })),
      setDynamicPricingInsights: (insights) =>
        set({ dynamicPricingInsights: insights }),
      setPricingLoading: (loading) => set({ pricingLoading: loading }),

      // Analytics
      setSalesAnalytics: (analytics) => set({ salesAnalytics: analytics }),
      setAnalyticsLoading: (loading) => set({ analyticsLoading: loading }),
      setAnalyticsDateRange: (range) => set({ analyticsDateRange: range }),

      // Fraud
      setFraudAlerts: (alerts) => set({ fraudAlerts: alerts }),
      updateFraudAlert: (id, updates) =>
        set((state) => ({
          fraudAlerts: state.fraudAlerts.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      setFraudStats: (stats) => set({ fraudStats: stats }),
      setFraudLoading: (loading) => set({ fraudLoading: loading }),

      // Email
      setEmailCampaigns: (campaigns) => set({ emailCampaigns: campaigns }),
      addEmailCampaign: (campaign) =>
        set((state) => ({ emailCampaigns: [...state.emailCampaigns, campaign] })),
      updateEmailCampaign: (id, updates) =>
        set((state) => ({
          emailCampaigns: state.emailCampaigns.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
          selectedEmailCampaign:
            state.selectedEmailCampaign?.id === id
              ? { ...state.selectedEmailCampaign, ...updates }
              : state.selectedEmailCampaign,
        })),
      deleteEmailCampaign: (id) =>
        set((state) => ({
          emailCampaigns: state.emailCampaigns.filter((c) => c.id !== id),
          selectedEmailCampaign:
            state.selectedEmailCampaign?.id === id
              ? null
              : state.selectedEmailCampaign,
        })),
      setSelectedEmailCampaign: (campaign) =>
        set({ selectedEmailCampaign: campaign }),
      setEmailLoading: (loading) => set({ emailLoading: loading }),

      // Payouts
      setPayouts: (payouts) => set({ payouts }),
      setPayoutSchedule: (schedule) => set({ payoutSchedule: schedule }),
      setPayoutMethods: (methods) => set({ payoutMethods: methods }),
      setPayoutsLoading: (loading) => set({ payoutsLoading: loading }),

      // Audiences
      setSavedAudiences: (audiences) => set({ savedAudiences: audiences }),
      addSavedAudience: (audience) =>
        set((state) => ({ savedAudiences: [...state.savedAudiences, audience] })),
      deleteSavedAudience: (id) =>
        set((state) => ({
          savedAudiences: state.savedAudiences.filter((a) => a.id !== id),
        })),

      // Error handling
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'vendor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedAudiences: state.savedAudiences,
        analyticsDateRange: state.analyticsDateRange,
      }),
    }
  )
);
