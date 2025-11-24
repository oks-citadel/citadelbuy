import { apiClient } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== TYPES ====================

export enum DealType {
  FLASH_SALE = 'FLASH_SALE',
  DAILY_DEAL = 'DAILY_DEAL',
  BUNDLE_DEAL = 'BUNDLE_DEAL',
  BOGO = 'BOGO',
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  VOLUME_DISCOUNT = 'VOLUME_DISCOUNT',
  SEASONAL_SALE = 'SEASONAL_SALE',
}

export enum DealStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export interface TimeRemaining {
  status: 'upcoming' | 'active' | 'ended';
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
}

export interface DealEligibility {
  isEligible: boolean;
  reasons: string[];
  deal: {
    id: string;
    name: string;
    status: DealStatus;
    startTime: string;
    endTime: string;
    minimumTier: LoyaltyTier | null;
    remainingStock: number | null;
  };
}

export interface DealProduct {
  id: string;
  dealId: string;
  productId: string;
  dealPrice: number | null;
  originalPrice: number;
  stockAllocated: number | null;
  stockRemaining: number | null;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    price: number;
    stock: number;
  };
}

export interface Deal {
  id: string;
  name: string;
  description: string;
  type: DealType;
  status: DealStatus;
  startTime: string;
  endTime: string;
  earlyAccessHours: number;
  minimumTier: LoyaltyTier | null;
  discountPercentage: number | null;
  discountAmount: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  minimumPurchase: number | null;
  totalStock: number | null;
  remainingStock: number | null;
  limitPerCustomer: number | null;
  badge: string | null;
  badgeColor: string | null;
  featuredOrder: number | null;
  isFeatured: boolean;
  bannerImage: string | null;
  stackableWithCoupons: boolean;
  stackableWithLoyalty: boolean;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  dealProducts?: DealProduct[];
  timeRemaining?: TimeRemaining;
  eligibility?: DealEligibility | null;
  _count?: {
    dealProducts: number;
    dealPurchases: number;
  };
  analytics?: DealAnalytics;
}

export interface DealAnalytics {
  id: string;
  dealId: string;
  totalViews: number;
  uniqueViews: number;
  clicks: number;
  clickThroughRate: number;
  totalPurchases: number;
  totalRevenue: number;
  conversionRate: number;
  sellThroughRate: number;
  peakHour: number | null;
  stockAllocated: number | null;
  stockRemaining: number | null;
}

export interface DealPurchase {
  id: string;
  dealId: string;
  userId: string;
  dealProductId: string | null;
  orderId: string;
  quantity: number;
  purchasePrice: number;
  discountApplied: number;
  createdAt: string;
  deal: {
    id: string;
    name: string;
    type: DealType;
    badge: string | null;
  };
  dealProduct?: {
    id: string;
    product: {
      id: string;
      name: string;
      slug: string;
      images: string[];
    };
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
}

export interface DealPriceCalculation {
  dealId: string;
  dealName: string;
  dealType: DealType;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  discountPercentage: number;
  quantity: number;
  totalOriginal: number;
  totalFinal: number;
  totalDiscount: number;
  savings: number;
}

export interface CreateDealDto {
  name: string;
  description: string;
  type: DealType;
  startTime: string;
  endTime: string;
  earlyAccessHours?: number;
  minimumTier?: LoyaltyTier;
  discountPercentage?: number;
  discountAmount?: number;
  buyQuantity?: number;
  getQuantity?: number;
  minimumPurchase?: number;
  totalStock?: number;
  limitPerCustomer?: number;
  badge?: string;
  badgeColor?: string;
  featuredOrder?: number;
  isFeatured?: boolean;
  bannerImage?: string;
  stackableWithCoupons?: boolean;
  stackableWithLoyalty?: boolean;
  products?: Array<{
    productId: string;
    dealPrice?: number;
    originalPrice: number;
    stockAllocated?: number;
    isActive?: boolean;
  }>;
}

export interface UpdateDealDto {
  name?: string;
  description?: string;
  status?: DealStatus;
  startTime?: string;
  endTime?: string;
  earlyAccessHours?: number;
  minimumTier?: LoyaltyTier;
  discountPercentage?: number;
  discountAmount?: number;
  totalStock?: number;
  limitPerCustomer?: number;
  badge?: string;
  badgeColor?: string;
  featuredOrder?: number;
  isFeatured?: boolean;
  bannerImage?: string;
  stackableWithCoupons?: boolean;
  stackableWithLoyalty?: boolean;
}

export interface GetDealsParams {
  type?: DealType;
  status?: DealStatus;
  isFeatured?: boolean;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface DealsResponse {
  deals: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== QUERY KEYS ====================

export const dealsKeys = {
  all: ['deals'] as const,
  lists: () => [...dealsKeys.all, 'list'] as const,
  list: (params: GetDealsParams) => [...dealsKeys.lists(), params] as const,
  featured: () => [...dealsKeys.all, 'featured'] as const,
  active: () => [...dealsKeys.all, 'active'] as const,
  details: () => [...dealsKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealsKeys.details(), id] as const,
  eligibility: (id: string) => [...dealsKeys.all, 'eligibility', id] as const,
  myPurchases: () => [...dealsKeys.all, 'myPurchases'] as const,
  analytics: (id: string) => [...dealsKeys.all, 'analytics', id] as const,
  allAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    [...dealsKeys.all, 'analytics', params] as const,
};

// ==================== API FUNCTIONS ====================

// Public endpoints
const getDeals = async (params: GetDealsParams = {}): Promise<DealsResponse> => {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.append('type', params.type);
  if (params.status) queryParams.append('status', params.status);
  if (params.isFeatured !== undefined) queryParams.append('isFeatured', String(params.isFeatured));
  if (params.activeOnly !== undefined) queryParams.append('activeOnly', String(params.activeOnly));
  if (params.page) queryParams.append('page', String(params.page));
  if (params.limit) queryParams.append('limit', String(params.limit));

  const response = await apiClient.get<DealsResponse>(`/deals?${queryParams.toString()}`);
  return response;
};

const getFeaturedDeals = async (): Promise<DealsResponse> => {
  const response = await apiClient.get<DealsResponse>('/deals/featured');
  return response;
};

const getActiveDeals = async (): Promise<DealsResponse> => {
  const response = await apiClient.get<DealsResponse>('/deals/active');
  return response;
};

const getDealById = async (id: string): Promise<Deal> => {
  const response = await apiClient.get<Deal>(`/deals/${id}`);
  return response;
};

const calculateDealPrice = async (data: {
  dealId: string;
  productId?: string;
  originalPrice: number;
  quantity: number;
  userId?: string;
}): Promise<DealPriceCalculation> => {
  const response = await apiClient.post<DealPriceCalculation>('/deals/calculate-price', data);
  return response;
};

const trackDealView = async (dealId: string, data: { userId?: string; sessionId?: string }) => {
  const response = await apiClient.post(`/deals/${dealId}/track-view`, data);
  return response;
};

const trackDealClick = async (dealId: string, data: { productId?: string; userId?: string; sessionId?: string }) => {
  const response = await apiClient.post(`/deals/${dealId}/track-click`, data);
  return response;
};

// Customer endpoints
const checkDealEligibility = async (dealId: string, quantity?: number): Promise<DealEligibility> => {
  const queryParams = quantity ? `?quantity=${quantity}` : '';
  const response = await apiClient.get<DealEligibility>(`/deals/${dealId}/eligibility${queryParams}`);
  return response;
};

const recordDealPurchase = async (data: {
  dealId: string;
  dealProductId?: string;
  quantity: number;
  orderId: string;
  purchasePrice: number;
  discountApplied: number;
}): Promise<DealPurchase> => {
  const response = await apiClient.post<DealPurchase>('/deals/purchase', data);
  return response;
};

const getMyDealPurchases = async (limit = 20): Promise<DealPurchase[]> => {
  const response = await apiClient.get<DealPurchase[]>(`/deals/my/purchases?limit=${limit}`);
  return response;
};

// Admin endpoints
const createDeal = async (data: CreateDealDto): Promise<Deal> => {
  const response = await apiClient.post<Deal>('/deals', data);
  return response;
};

const updateDeal = async (id: string, data: UpdateDealDto): Promise<Deal> => {
  const response = await apiClient.put<Deal>(`/deals/${id}`, data);
  return response;
};

const deleteDeal = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/deals/${id}`);
  return response;
};

const addProductsToDeal = async (dealId: string, products: Array<{
  productId: string;
  dealPrice?: number;
  originalPrice: number;
  stockAllocated?: number;
  isActive?: boolean;
}>) => {
  const response = await apiClient.post(`/deals/${dealId}/products`, { products });
  return response;
};

const removeProductFromDeal = async (dealId: string, productId: string) => {
  const response = await apiClient.delete(`/deals/${dealId}/products/${productId}`);
  return response;
};

const getDealAnalytics = async (dealId: string) => {
  const response = await apiClient.get(`/deals/${dealId}/analytics`);
  return response;
};

const getAllDealsAnalytics = async (params?: { startDate?: string; endDate?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const response = await apiClient.get(`/deals/admin/analytics?${queryParams.toString()}`);
  return response;
};

const notifyDeal = async (dealId: string, data: {
  notificationType: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  userId?: string;
  tier?: LoyaltyTier;
}) => {
  const response = await apiClient.post(`/deals/${dealId}/notify`, data);
  return response;
};

// ==================== REACT QUERY HOOKS ====================

// Public hooks
export function useDeals(params: GetDealsParams = {}) {
  return useQuery({
    queryKey: dealsKeys.list(params),
    queryFn: () => getDeals(params),
  });
}

export function useFeaturedDeals() {
  return useQuery({
    queryKey: dealsKeys.featured(),
    queryFn: getFeaturedDeals,
  });
}

export function useActiveDeals() {
  return useQuery({
    queryKey: dealsKeys.active(),
    queryFn: getActiveDeals,
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: dealsKeys.detail(id),
    queryFn: () => getDealById(id),
    enabled: !!id,
  });
}

export function useCalculateDealPrice() {
  return useMutation({
    mutationFn: calculateDealPrice,
  });
}

export function useTrackDealView() {
  return useMutation({
    mutationFn: ({ dealId, ...data }: { dealId: string; userId?: string; sessionId?: string }) =>
      trackDealView(dealId, data),
  });
}

export function useTrackDealClick() {
  return useMutation({
    mutationFn: ({ dealId, ...data }: { dealId: string; productId?: string; userId?: string; sessionId?: string }) =>
      trackDealClick(dealId, data),
  });
}

// Customer hooks
export function useCheckDealEligibility(dealId: string, quantity?: number) {
  return useQuery({
    queryKey: dealsKeys.eligibility(dealId),
    queryFn: () => checkDealEligibility(dealId, quantity),
    enabled: !!dealId,
  });
}

export function useRecordDealPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordDealPurchase,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealsKeys.detail(variables.dealId) });
      queryClient.invalidateQueries({ queryKey: dealsKeys.myPurchases() });
      queryClient.invalidateQueries({ queryKey: dealsKeys.active() });
      queryClient.invalidateQueries({ queryKey: dealsKeys.featured() });
    },
  });
}

export function useMyDealPurchases(limit = 20) {
  return useQuery({
    queryKey: dealsKeys.myPurchases(),
    queryFn: () => getMyDealPurchases(limit),
  });
}

// Admin hooks
export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealsKeys.lists() });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealDto }) => updateDeal(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: dealsKeys.lists() });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealsKeys.lists() });
    },
  });
}

export function useAddProductsToDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, products }: { dealId: string; products: any[] }) =>
      addProductsToDeal(dealId, products),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealsKeys.detail(variables.dealId) });
    },
  });
}

export function useRemoveProductFromDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, productId }: { dealId: string; productId: string }) =>
      removeProductFromDeal(dealId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealsKeys.detail(variables.dealId) });
    },
  });
}

export function useDealAnalytics(dealId: string) {
  return useQuery({
    queryKey: dealsKeys.analytics(dealId),
    queryFn: () => getDealAnalytics(dealId),
    enabled: !!dealId,
  });
}

export function useAllDealsAnalytics(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: dealsKeys.allAnalytics(params),
    queryFn: () => getAllDealsAnalytics(params),
  });
}

export function useNotifyDeal() {
  return useMutation({
    mutationFn: ({ dealId, data }: {
      dealId: string;
      data: {
        notificationType: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
        userId?: string;
        tier?: LoyaltyTier;
      };
    }) => notifyDeal(dealId, data),
  });
}
