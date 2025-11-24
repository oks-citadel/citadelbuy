import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ============================================
// TYPES
// ============================================

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export enum PointTransactionType {
  EARNED_PURCHASE = 'EARNED_PURCHASE',
  EARNED_REVIEW = 'EARNED_REVIEW',
  EARNED_REFERRAL = 'EARNED_REFERRAL',
  EARNED_SIGNUP = 'EARNED_SIGNUP',
  EARNED_BIRTHDAY = 'EARNED_BIRTHDAY',
  EARNED_SOCIAL_SHARE = 'EARNED_SOCIAL_SHARE',
  EARNED_PROMOTION = 'EARNED_PROMOTION',
  REDEEMED_DISCOUNT = 'REDEEMED_DISCOUNT',
  REDEEMED_PRODUCT = 'REDEEMED_PRODUCT',
  EXPIRED = 'EXPIRED',
  ADJUSTED_MANUAL = 'ADJUSTED_MANUAL',
  REVERSED_RETURN = 'REVERSED_RETURN',
}

export enum RewardType {
  DISCOUNT_PERCENTAGE = 'DISCOUNT_PERCENTAGE',
  DISCOUNT_FIXED = 'DISCOUNT_FIXED',
  FREE_SHIPPING = 'FREE_SHIPPING',
  EARLY_ACCESS = 'EARLY_ACCESS',
  EXCLUSIVE_PRODUCT = 'EXCLUSIVE_PRODUCT',
  PRIORITY_SUPPORT = 'PRIORITY_SUPPORT',
  BONUS_POINTS = 'BONUS_POINTS',
  FREE_PRODUCT = 'FREE_PRODUCT',
}

export enum ReferralStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REWARDED = 'REWARDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface CustomerLoyalty {
  id: string;
  userId: string;
  totalPointsEarned: number;
  currentPoints: number;
  lifetimePoints: number;
  currentTier: LoyaltyTier;
  tierSince: string;
  lifetimeSpending: number;
  tierSpending: number;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  tierBenefit?: TierBenefit;
  recentTransactions?: PointTransaction[];
  availableRedemptions?: RewardRedemption[];
}

export interface PointTransaction {
  id: string;
  loyaltyId: string;
  type: PointTransactionType;
  points: number;
  description: string;
  orderId?: string;
  productId?: string;
  referralId?: string;
  expiresAt?: string;
  isExpired: boolean;
  createdAt: string;
  order?: {
    id: string;
    total: number;
    createdAt: string;
  };
}

export interface TierBenefit {
  id: string;
  tier: LoyaltyTier;
  name: string;
  description?: string;
  minimumSpending: number;
  minimumPoints: number;
  pointsMultiplier: number;
  discountPercentage: number;
  freeShipping: boolean;
  earlyAccessHours: number;
  prioritySupport: boolean;
  exclusiveProducts: boolean;
  badgeIcon?: string;
  badgeColor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: RewardType;
  pointsCost: number;
  discountPercentage?: number;
  discountAmount?: number;
  productId?: string;
  isActive: boolean;
  stock?: number;
  validFrom?: string;
  validUntil?: string;
  minimumTier?: LoyaltyTier;
  minimumPurchase?: number;
  createdAt: string;
  updatedAt: string;
  canAfford?: boolean;
  userPoints?: number;
}

export interface RewardRedemption {
  id: string;
  loyaltyId: string;
  rewardId: string;
  pointsSpent: number;
  isUsed: boolean;
  usedAt?: string;
  orderId?: string;
  expiresAt?: string;
  createdAt: string;
  reward: Reward;
  order?: {
    id: string;
    total: number;
    createdAt: string;
  };
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId?: string;
  refereeEmail?: string;
  refereePhone?: string;
  status: ReferralStatus;
  firstPurchaseId?: string;
  firstPurchaseAmount?: number;
  referrerRewarded: boolean;
  referrerRewardedAt?: string;
  referrerPoints?: number;
  refereeRewarded: boolean;
  refereeRewardedAt?: string;
  refereePoints?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  pointsPerDollar: number;
  minimumRedeemPoints: number;
  pointsExpiryDays?: number;
  signupBonusPoints: number;
  reviewRewardPoints: number;
  birthdayRewardPoints: number;
  referrerRewardPoints: number;
  refereeRewardPoints: number;
  referralMinPurchase: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyStatistics {
  totalCustomers: number;
  totalPointsIssued: number;
  totalPointsActive: number;
  totalRedemptions: number;
  successfulReferrals: number;
  tierDistribution: Record<LoyaltyTier, number>;
}

// ============================================
// QUERY KEYS
// ============================================

export const loyaltyKeys = {
  all: ['loyalty'] as const,
  myAccount: () => [...loyaltyKeys.all, 'my-account'] as const,
  leaderboard: (limit?: number) => [...loyaltyKeys.all, 'leaderboard', limit] as const,
  pointHistory: (limit?: number) => [...loyaltyKeys.all, 'point-history', limit] as const,
  tiers: () => [...loyaltyKeys.all, 'tiers'] as const,
  tier: (tier: LoyaltyTier) => [...loyaltyKeys.tiers(), tier] as const,
  referrals: () => [...loyaltyKeys.all, 'referrals'] as const,
  rewards: (includeInactive?: boolean) => [...loyaltyKeys.all, 'rewards', includeInactive] as const,
  availableRewards: () => [...loyaltyKeys.all, 'available-rewards'] as const,
  redemptions: () => [...loyaltyKeys.all, 'redemptions'] as const,
  program: () => [...loyaltyKeys.all, 'program'] as const,
  statistics: () => [...loyaltyKeys.all, 'statistics'] as const,
};

// ============================================
// LOYALTY ACCOUNT HOOKS
// ============================================

export function useMyLoyaltyAccount() {
  return useQuery({
    queryKey: loyaltyKeys.myAccount(),
    queryFn: async () => {
      const response = await apiClient.get<CustomerLoyalty>('/loyalty/my-account');
      return response;
    },
  });
}

export function useCreateLoyaltyAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<CustomerLoyalty>('/loyalty/my-account');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.myAccount() });
    },
  });
}

export function useLeaderboard(limit = 100) {
  return useQuery({
    queryKey: loyaltyKeys.leaderboard(limit),
    queryFn: async () => {
      const response = await apiClient.get<CustomerLoyalty[]>(
        `/loyalty/leaderboard?limit=${limit}`
      );
      return response;
    },
  });
}

// ============================================
// POINTS HOOKS
// ============================================

export function useEarnPointsFromPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post<CustomerLoyalty>(
        '/loyalty/points/earn/purchase',
        { orderId }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.myAccount() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.pointHistory() });
    },
  });
}

export function useEarnPointsFromReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiClient.post<CustomerLoyalty>(
        `/loyalty/points/earn/review/${productId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.myAccount() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.pointHistory() });
    },
  });
}

export function useClaimBirthdayPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<CustomerLoyalty>('/loyalty/points/birthday');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.myAccount() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.pointHistory() });
    },
  });
}

export function usePointHistory(limit = 50) {
  return useQuery({
    queryKey: loyaltyKeys.pointHistory(limit),
    queryFn: async () => {
      const response = await apiClient.get<PointTransaction[]>(
        `/loyalty/points/history?limit=${limit}`
      );
      return response;
    },
  });
}

// ============================================
// TIER HOOKS
// ============================================

export function useTiers() {
  return useQuery({
    queryKey: loyaltyKeys.tiers(),
    queryFn: async () => {
      const response = await apiClient.get<TierBenefit[]>('/loyalty/tiers');
      return response;
    },
  });
}

export function useTier(tier: LoyaltyTier) {
  return useQuery({
    queryKey: loyaltyKeys.tier(tier),
    queryFn: async () => {
      const response = await apiClient.get<TierBenefit>(`/loyalty/tiers/${tier}`);
      return response;
    },
    enabled: !!tier,
  });
}

// ============================================
// REFERRAL HOOKS
// ============================================

export function useCreateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { refereeEmail?: string; refereePhone?: string }) => {
      const response = await apiClient.post<Referral>('/loyalty/referrals', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.referrals() });
    },
  });
}

export function useMyReferrals() {
  return useQuery({
    queryKey: loyaltyKeys.referrals(),
    queryFn: async () => {
      const response = await apiClient.get<Referral[]>('/loyalty/referrals/my-referrals');
      return response;
    },
  });
}

export function useApplyReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referralCode: string) => {
      const response = await apiClient.post<Referral>(
        `/loyalty/referrals/apply/${referralCode}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.myAccount() });
    },
  });
}

// ============================================
// REWARDS HOOKS
// ============================================

export function useRewards(includeInactive = false) {
  return useQuery({
    queryKey: loyaltyKeys.rewards(includeInactive),
    queryFn: async () => {
      const params = includeInactive ? '?includeInactive=true' : '';
      const response = await apiClient.get<Reward[]>(`/loyalty/rewards${params}`);
      return response;
    },
  });
}

export function useAvailableRewards() {
  return useQuery({
    queryKey: loyaltyKeys.availableRewards(),
    queryFn: async () => {
      const response = await apiClient.get<Reward[]>('/loyalty/rewards/available');
      return response;
    },
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await apiClient.post<RewardRedemption>(
        '/loyalty/redemptions/redeem',
        { rewardId }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.myAccount() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.availableRewards() });
    },
  });
}

export function useMyRedemptions() {
  return useQuery({
    queryKey: loyaltyKeys.redemptions(),
    queryFn: async () => {
      const response = await apiClient.get<RewardRedemption[]>(
        '/loyalty/redemptions/my-redemptions'
      );
      return response;
    },
  });
}

export function useApplyRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { redemptionId: string; orderId: string }) => {
      const response = await apiClient.post('/loyalty/redemptions/apply', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
    },
  });
}

// ============================================
// PROGRAM HOOKS
// ============================================

export function useLoyaltyProgram() {
  return useQuery({
    queryKey: loyaltyKeys.program(),
    queryFn: async () => {
      const response = await apiClient.get<LoyaltyProgram>('/loyalty/program');
      return response;
    },
  });
}

export function useInitializeLoyaltyProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<LoyaltyProgram>(
        '/loyalty/program/initialize'
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
    },
  });
}

export function useInitializeTiers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/loyalty/tiers/initialize');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.tiers() });
    },
  });
}

// ============================================
// STATISTICS HOOKS (Admin)
// ============================================

export function useLoyaltyStatistics() {
  return useQuery({
    queryKey: loyaltyKeys.statistics(),
    queryFn: async () => {
      const response = await apiClient.get<LoyaltyStatistics>('/loyalty/statistics');
      return response;
    },
  });
}
