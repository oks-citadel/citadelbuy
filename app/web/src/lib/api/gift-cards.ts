import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ============================================
// TYPES
// ============================================

export enum GiftCardStatus {
  ACTIVE = 'ACTIVE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}

export enum GiftCardType {
  DIGITAL = 'DIGITAL',
  PHYSICAL = 'PHYSICAL',
  PROMOTIONAL = 'PROMOTIONAL',
}

export enum StoreCreditType {
  REFUND = 'REFUND',
  COMPENSATION = 'COMPENSATION',
  PROMOTIONAL = 'PROMOTIONAL',
  GIFT = 'GIFT',
  LOYALTY = 'LOYALTY',
}

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  REDEMPTION = 'REDEMPTION',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  EXPIRATION = 'EXPIRATION',
  CANCELLATION = 'CANCELLATION',
  TRANSFER = 'TRANSFER',
}

export interface GiftCard {
  id: string;
  code: string;
  type: GiftCardType;
  status: GiftCardStatus;
  initialAmount: number;
  currentBalance: number;
  currency: string;
  purchasedBy?: string;
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  personalMessage?: string;
  redeemedBy?: string;
  redeemedAt?: string;
  purchaseDate: string;
  activationDate: string;
  expirationDate?: string;
  designTemplate?: string;
  customImage?: string;
  isScheduled: boolean;
  scheduledDelivery?: string;
  deliveredAt?: string;
  orderId?: string;
  minimumPurchase?: number;
  allowedCategories?: string[];
  excludedProducts?: string[];
  lastUsedAt?: string;
  usageCount: number;
  purchaser?: {
    id: string;
    email: string;
    name: string;
  };
  redeemer?: {
    id: string;
    email: string;
    name: string;
  };
  transactions?: GiftCardTransaction[];
}

export interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  orderId?: string;
  userId?: string;
  description?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  giftCard?: GiftCard;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface StoreCredit {
  id: string;
  userId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  currency: string;
  expirationDate?: string;
  minimumPurchase?: number;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  transactions?: StoreCreditTransaction[];
}

export interface StoreCreditTransaction {
  id: string;
  storeCreditId: string;
  type: StoreCreditType;
  transactionType: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  orderId?: string;
  giftCardId?: string;
  description: string;
  notes?: string;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface GiftCardStatistics {
  totalActive: number;
  totalRedeemed: number;
  totalExpired: number;
  totalCancelled: number;
  totalRevenue: number;
  totalOutstandingBalance: number;
  totalPurchased: number;
  totalScheduledDeliveries: number;
  averageCardValue: number;
  redemptionRate: number;
}

// ============================================
// DTOs
// ============================================

export interface PurchaseGiftCardDto {
  amount: number;
  type?: GiftCardType;
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  personalMessage?: string;
  designTemplate?: string;
  customImage?: string;
  isScheduled?: boolean;
  scheduledDelivery?: string;
  expirationDate?: string;
}

export interface CreatePromotionalGiftCardDto {
  amount: number;
  recipientEmail: string;
  recipientName?: string;
  personalMessage?: string;
  expirationDate?: string;
  minimumPurchase?: number;
  allowedCategories?: string[];
  excludedProducts?: string[];
}

export interface RedeemGiftCardDto {
  code: string;
  orderId?: string;
  amount?: number;
}

export interface CheckGiftCardBalanceDto {
  code: string;
}

export interface UpdateGiftCardDto {
  status?: GiftCardStatus;
  expirationDate?: string;
  minimumPurchase?: number;
  allowedCategories?: string[];
  excludedProducts?: string[];
}

export interface SendGiftCardEmailDto {
  recipientEmail?: string;
}

export interface ConvertToStoreCreditDto {
  giftCardCode: string;
}

export interface GetGiftCardsQueryDto {
  status?: GiftCardStatus;
  type?: GiftCardType;
  limit?: number;
}

export interface AddStoreCreditDto {
  userId: string;
  amount: number;
  type: StoreCreditType;
  description: string;
  notes?: string;
  expiresAt?: string;
  orderId?: string;
}

export interface DeductStoreCreditDto {
  userId: string;
  amount: number;
  orderId: string;
  description?: string;
}

export interface AdjustStoreCreditDto {
  amount: number;
  reason: string;
  notes?: string;
}

export interface GetStoreCreditHistoryDto {
  limit?: number;
  type?: StoreCreditType;
}

// ============================================
// QUERY KEYS
// ============================================

export const giftCardsKeys = {
  all: ['gift-cards'] as const,
  myPurchases: (query?: GetGiftCardsQueryDto) => [...giftCardsKeys.all, 'my-purchases', query] as const,
  myRedemptions: (query?: GetGiftCardsQueryDto) => [...giftCardsKeys.all, 'my-redemptions', query] as const,
  detail: (id: string) => [...giftCardsKeys.all, 'detail', id] as const,
  balance: (code: string) => [...giftCardsKeys.all, 'balance', code] as const,
  storeCredit: () => [...giftCardsKeys.all, 'store-credit'] as const,
  storeCreditHistory: (query?: GetStoreCreditHistoryDto) => [...giftCardsKeys.all, 'store-credit-history', query] as const,
  statistics: (startDate?: string, endDate?: string) => [...giftCardsKeys.all, 'statistics', startDate, endDate] as const,
};

// ============================================
// API FUNCTIONS
// ============================================

// ==================== PUBLIC ENDPOINTS ====================

const checkBalance = async (dto: CheckGiftCardBalanceDto): Promise<{ balance: number; status: GiftCardStatus; expirationDate?: string }> => {
  const response = await apiClient.post<{ balance: number; status: GiftCardStatus; expirationDate?: string }>('/gift-cards/check-balance', dto);
  return response;
};

// ==================== CUSTOMER ENDPOINTS ====================

const purchaseGiftCard = async (dto: PurchaseGiftCardDto): Promise<GiftCard> => {
  const response = await apiClient.post<GiftCard>('/gift-cards/purchase', dto);
  return response;
};

const redeemGiftCard = async (dto: RedeemGiftCardDto): Promise<{ redemptionAmount: number; remainingBalance: number }> => {
  const response = await apiClient.post<{ redemptionAmount: number; remainingBalance: number }>('/gift-cards/redeem', dto);
  return response;
};

const getMyPurchasedGiftCards = async (query?: GetGiftCardsQueryDto): Promise<GiftCard[]> => {
  const params = new URLSearchParams();
  if (query?.status) params.append('status', query.status);
  if (query?.type) params.append('type', query.type);
  if (query?.limit) params.append('limit', String(query.limit));

  const response = await apiClient.get<GiftCard[]>(`/gift-cards/my-purchases?${params.toString()}`);
  return response;
};

const getMyRedeemedGiftCards = async (query?: GetGiftCardsQueryDto): Promise<GiftCard[]> => {
  const params = new URLSearchParams();
  if (query?.status) params.append('status', query.status);
  if (query?.type) params.append('type', query.type);
  if (query?.limit) params.append('limit', String(query.limit));

  const response = await apiClient.get<GiftCard[]>(`/gift-cards/my-redemptions?${params.toString()}`);
  return response;
};

const getGiftCardById = async (id: string): Promise<GiftCard> => {
  const response = await apiClient.get<GiftCard>(`/gift-cards/${id}`);
  return response;
};

const convertToStoreCredit = async (dto: ConvertToStoreCreditDto): Promise<{ storeCredit: StoreCredit; message: string }> => {
  const response = await apiClient.post<{ storeCredit: StoreCredit; message: string }>('/gift-cards/convert-to-credit', dto);
  return response;
};

// ==================== STORE CREDIT ENDPOINTS ====================

const getMyStoreCredit = async (): Promise<StoreCredit> => {
  const response = await apiClient.get<StoreCredit>('/gift-cards/store-credit/balance');
  return response;
};

const getStoreCreditHistory = async (query?: GetStoreCreditHistoryDto): Promise<StoreCreditTransaction[]> => {
  const params = new URLSearchParams();
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.type) params.append('type', query.type);

  const response = await apiClient.get<StoreCreditTransaction[]>(`/gift-cards/store-credit/history?${params.toString()}`);
  return response;
};

const deductStoreCredit = async (dto: DeductStoreCreditDto): Promise<StoreCredit> => {
  const response = await apiClient.post<StoreCredit>('/gift-cards/store-credit/deduct', dto);
  return response;
};

// ==================== ADMIN ENDPOINTS ====================

const createPromotionalGiftCard = async (dto: CreatePromotionalGiftCardDto): Promise<GiftCard> => {
  const response = await apiClient.post<GiftCard>('/gift-cards/admin/promotional', dto);
  return response;
};

const updateGiftCard = async (id: string, dto: UpdateGiftCardDto): Promise<GiftCard> => {
  const response = await apiClient.put<GiftCard>(`/gift-cards/admin/${id}`, dto);
  return response;
};

const cancelGiftCard = async (id: string, reason: string): Promise<GiftCard> => {
  const response = await apiClient.post<GiftCard>(`/gift-cards/admin/${id}/cancel`, { reason });
  return response;
};

const sendGiftCardEmail = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>(`/gift-cards/admin/${id}/send-email`);
  return response;
};

const addStoreCredit = async (dto: AddStoreCreditDto): Promise<StoreCredit> => {
  const response = await apiClient.post<StoreCredit>('/gift-cards/admin/store-credit/add', dto);
  return response;
};

const adjustStoreCredit = async (userId: string, dto: AdjustStoreCreditDto): Promise<StoreCredit> => {
  const response = await apiClient.post<StoreCredit>(`/gift-cards/admin/store-credit/${userId}/adjust`, dto);
  return response;
};

const getGiftCardStatistics = async (startDate?: string, endDate?: string): Promise<GiftCardStatistics> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get<GiftCardStatistics>(`/gift-cards/admin/statistics?${params.toString()}`);
  return response;
};

const processScheduledDeliveries = async (): Promise<{ count: number; message: string }> => {
  const response = await apiClient.post<{ count: number; message: string }>('/gift-cards/admin/process-scheduled');
  return response;
};

const expireOldGiftCards = async (): Promise<{ count: number; message: string }> => {
  const response = await apiClient.post<{ count: number; message: string }>('/gift-cards/admin/expire-old');
  return response;
};

// ============================================
// REACT QUERY HOOKS
// ============================================

// ==================== PUBLIC HOOKS ====================

export function useCheckGiftCardBalance() {
  return useMutation({
    mutationFn: checkBalance,
  });
}

// ==================== CUSTOMER HOOKS ====================

export function usePurchaseGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseGiftCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.myPurchases() });
    },
  });
}

export function useRedeemGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: redeemGiftCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.myRedemptions() });
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCredit() });
    },
  });
}

export function useMyPurchasedGiftCards(query?: GetGiftCardsQueryDto) {
  return useQuery({
    queryKey: giftCardsKeys.myPurchases(query),
    queryFn: () => getMyPurchasedGiftCards(query),
  });
}

export function useMyRedeemedGiftCards(query?: GetGiftCardsQueryDto) {
  return useQuery({
    queryKey: giftCardsKeys.myRedemptions(query),
    queryFn: () => getMyRedeemedGiftCards(query),
  });
}

export function useGiftCard(id: string) {
  return useQuery({
    queryKey: giftCardsKeys.detail(id),
    queryFn: () => getGiftCardById(id),
    enabled: !!id,
  });
}

export function useConvertToStoreCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: convertToStoreCredit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.myPurchases() });
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCredit() });
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCreditHistory() });
    },
  });
}

// ==================== STORE CREDIT HOOKS ====================

export function useMyStoreCredit() {
  return useQuery({
    queryKey: giftCardsKeys.storeCredit(),
    queryFn: getMyStoreCredit,
  });
}

export function useStoreCreditHistory(query?: GetStoreCreditHistoryDto) {
  return useQuery({
    queryKey: giftCardsKeys.storeCreditHistory(query),
    queryFn: () => getStoreCreditHistory(query),
  });
}

export function useDeductStoreCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deductStoreCredit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCredit() });
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCreditHistory() });
    },
  });
}

// ==================== ADMIN HOOKS ====================

export function useCreatePromotionalGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPromotionalGiftCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.all });
    },
  });
}

export function useUpdateGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateGiftCardDto }) => updateGiftCard(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.all });
    },
  });
}

export function useCancelGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelGiftCard(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.all });
    },
  });
}

export function useSendGiftCardEmail() {
  return useMutation({
    mutationFn: sendGiftCardEmail,
  });
}

export function useAddStoreCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addStoreCredit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCredit() });
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCreditHistory() });
    },
  });
}

export function useAdjustStoreCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, dto }: { userId: string; dto: AdjustStoreCreditDto }) => adjustStoreCredit(userId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCredit() });
      queryClient.invalidateQueries({ queryKey: giftCardsKeys.storeCreditHistory() });
    },
  });
}

export function useGiftCardStatistics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: giftCardsKeys.statistics(startDate, endDate),
    queryFn: () => getGiftCardStatistics(startDate, endDate),
  });
}

export function useProcessScheduledDeliveries() {
  return useMutation({
    mutationFn: processScheduledDeliveries,
  });
}

export function useExpireOldGiftCards() {
  return useMutation({
    mutationFn: expireOldGiftCards,
  });
}
