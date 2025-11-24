import { apiClient } from '../client';

export interface Campaign {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  totalBudget: number;
  dailyBudget?: number;
  spentAmount: number;
  impressions: number;
  clicks: number;
  conversions: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  advertisements?: Advertisement[];
}

export interface Advertisement {
  id: string;
  campaignId: string;
  vendorId: string;
  productId?: string;
  type: 'SPONSORED_PRODUCT' | 'SEARCH' | 'DISPLAY' | 'CATEGORY';
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'COMPLETED' | 'OUT_OF_BUDGET';
  title: string;
  description?: string;
  imageUrl?: string;
  targetUrl?: string;
  bidAmount: number;
  dailyBudget?: number;
  spentAmount: number;
  targetCategories: string[];
  targetKeywords: string[];
  targetLocations: string[];
  impressions: number;
  clicks: number;
  conversions: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    price: number;
    images: string[];
    slug: string;
  };
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  totalBudget: number;
  dailyBudget?: number;
  startDate: string;
  endDate?: string;
}

export interface CreateAdvertisementDto {
  campaignId: string;
  productId?: string;
  type: 'SPONSORED_PRODUCT' | 'SEARCH' | 'DISPLAY' | 'CATEGORY';
  title: string;
  description?: string;
  imageUrl?: string;
  targetUrl?: string;
  bidAmount: number;
  dailyBudget?: number;
  targetCategories?: string[];
  targetKeywords?: string[];
  targetLocations?: string[];
  startDate: string;
  endDate?: string;
}

// Campaign APIs
export const campaignsApi = {
  getAll: async (params?: { status?: string }) => {
    const data = await apiClient.get<Campaign[]>('/advertisements/campaigns');
    return data;
  },

  getById: async (id: string) => {
    const data = await apiClient.get<Campaign>(`/advertisements/campaigns/${id}`);
    return data;
  },

  create: async (dto: CreateCampaignDto) => {
    return await apiClient.post<Campaign>('/advertisements/campaigns', dto);
  },

  update: async (id: string, dto: Partial<CreateCampaignDto> & { status?: string }) => {
    return await apiClient.patch<Campaign>(`/advertisements/campaigns/${id}`, dto);
  },

  delete: async (id: string) => {
    return await apiClient.delete(`/advertisements/campaigns/${id}`);
  },

  getPerformance: async (id: string) => {
    return await apiClient.get(`/advertisements/campaigns/${id}/performance`);
  },
};

// Advertisement APIs
export const advertisementsApi = {
  getAll: async (params?: { status?: string; type?: string; campaignId?: string }) => {
    return await apiClient.get<Advertisement[]>('/advertisements/ads');
  },

  getById: async (id: string) => {
    return await apiClient.get<Advertisement>(`/advertisements/ads/${id}`);
  },

  create: async (dto: CreateAdvertisementDto) => {
    return await apiClient.post<Advertisement>('/advertisements/ads', dto);
  },

  update: async (id: string, dto: Partial<CreateAdvertisementDto> & { status?: string }) => {
    return await apiClient.patch<Advertisement>(`/advertisements/ads/${id}`, dto);
  },

  delete: async (id: string) => {
    return await apiClient.delete(`/advertisements/ads/${id}`);
  },

  getPerformance: async (id: string) => {
    return await apiClient.get(`/advertisements/ads/${id}/performance`);
  },
};

// Public APIs (no auth required)
export const publicAdsApi = {
  getAdsForDisplay: async (params: {
    placement?: string;
    categoryId?: string;
    keywords?: string;
    limit?: number;
  }) => {
    return await apiClient.get<Advertisement[]>('/advertisements/display');
  },

  trackImpression: async (adId: string, placement?: string, userId?: string) => {
    return await apiClient.post('/advertisements/track/impression', {
      adId,
      userId,
      placement,
    });
  },

  trackClick: async (adId: string, placement?: string, userId?: string) => {
    return await apiClient.post('/advertisements/track/click', {
      adId,
      userId,
      placement,
    });
  },
};
