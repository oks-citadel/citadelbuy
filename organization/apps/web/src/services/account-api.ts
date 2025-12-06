import { apiClient } from '@/lib/api-client';

// Helper wrapper to match the old api interface
const api = {
  get: async <T>(url: string, config?: any) => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },
  post: async <T>(url: string, data?: any, config?: any) => {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },
  put: async <T>(url: string, data?: any, config?: any) => {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },
  patch: async <T>(url: string, data?: any, config?: any) => {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
  },
  delete: async (url: string, config?: any) => {
    const response = await apiClient.delete(url, config);
    return response.data;
  },
  upload: async (url: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
import type {
  WishlistItem,
  WishlistCollection,
  SupportTicket,
  TicketMessage,
  KnowledgeBaseArticle,
  KnowledgeBaseCategory,
  ReturnRequest,
  GiftCard,
  StoreCredit,
  StoreCreditTransaction,
  SubscriptionPlan,
  UserSubscription,
  SubscriptionInvoice,
  BNPLPlan,
  BNPLOrder,
  LoyaltyReward,
  LoyaltyRedemption,
  Referral,
  Coupon,
  SavedAddress,
  SavedPaymentMethod,
} from '@/types/extended';
import type { Order, Review, LoyaltyProgram } from '@/types';

// ==================== ORDERS ====================
export const ordersApi = {
  getOrders: () => api.get<Order[]>('/orders'),
  getOrderById: (id: string) => api.get<Order>(`/orders/${id}`),
  trackOrder: (id: string) => api.get<Order>(`/orders/${id}/tracking`),
  cancelOrder: (id: string, reason: string) =>
    api.post<Order>(`/orders/${id}/cancel`, { reason }),
};

// ==================== WISHLIST ====================
export const wishlistApi = {
  getWishlist: () => api.get<WishlistItem[]>('/wishlist'),
  getWishlistCount: () => api.get<{ count: number }>('/wishlist/count'),
  checkInWishlist: (productId: string) =>
    api.get<{ inWishlist: boolean }>(`/wishlist/check/${productId}`),
  addToWishlist: (data: { productId: string; note?: string; priority?: string }) =>
    api.post<WishlistItem>('/wishlist', data),
  removeFromWishlist: (productId: string) =>
    api.delete(`/wishlist/${productId}`),
  clearWishlist: () => api.delete('/wishlist'),

  // Collections
  getCollections: () => api.get<WishlistCollection[]>('/wishlist/collections'),
  getCollection: (id: string) => api.get<WishlistCollection>(`/wishlist/collections/${id}`),
  createCollection: (data: { name: string; description?: string; isPublic?: boolean }) =>
    api.post<WishlistCollection>('/wishlist/collections', data),
  updateCollection: (id: string, data: Partial<{ name: string; description?: string; isPublic?: boolean }>) =>
    api.put<WishlistCollection>(`/wishlist/collections/${id}`, data),
  deleteCollection: (id: string) => api.delete(`/wishlist/collections/${id}`),
  addToCollection: (collectionId: string, productId: string) =>
    api.post(`/wishlist/collections/${collectionId}/items`, { productId }),
  removeFromCollection: (itemId: string) =>
    api.delete(`/wishlist/items/${itemId}`),
  createShareLink: (collectionId: string) =>
    api.post<{ shareUrl: string }>(`/wishlist/collections/${collectionId}/share`),
  getSharedCollection: (shareToken: string) =>
    api.get<WishlistCollection>(`/wishlist/shared/${shareToken}`),
};

// ==================== REVIEWS ====================
export const reviewsApi = {
  getMyReviews: () => api.get<Review[]>('/reviews/my-reviews'),
  getProductReviews: (productId: string, page = 1, limit = 10) =>
    api.get<{ reviews: Review[]; total: number }>(`/reviews/product/${productId}?page=${page}&limit=${limit}`),
  createReview: (data: {
    productId: string;
    rating: number;
    title: string;
    content: string;
    pros?: string[];
    cons?: string[];
    images?: string[];
  }) => api.post<Review>('/reviews', data),
  updateReview: (id: string, data: Partial<{ rating: number; title: string; content: string }>) =>
    api.put<Review>(`/reviews/${id}`, data),
  deleteReview: (id: string) => api.delete(`/reviews/${id}`),
  markHelpful: (id: string) => api.post(`/reviews/${id}/helpful`),
};

// ==================== RETURNS ====================
export const returnsApi = {
  getMyReturns: (filters?: { status?: string; page?: number; limit?: number }) =>
    api.get<ReturnRequest[]>('/returns/my-returns', { params: filters }),
  getReturnById: (id: string) => api.get<ReturnRequest>(`/returns/${id}`),
  createReturn: (data: {
    orderId: string;
    items: { orderItemId: string; quantity: number; reason: string; condition?: string }[];
    refundMethod: string;
    reasonDetails?: string;
  }) => api.post<ReturnRequest>('/returns', data),
  cancelReturn: (id: string, reason: string) =>
    api.post<ReturnRequest>(`/returns/${id}/cancel`, { reason }),
};

// ==================== SUPPORT ====================
export const supportApi = {
  // Tickets
  getTickets: (filters?: { status?: string; page?: number; limit?: number }) =>
    api.get<SupportTicket[]>('/support/tickets', { params: filters }),
  getTicketById: (id: string) => api.get<SupportTicket>(`/support/tickets/${id}`),
  createTicket: (data: {
    subject: string;
    description: string;
    category: string;
    priority?: string;
    orderId?: string;
    attachments?: string[];
  }) => api.post<SupportTicket>('/support/tickets', data),
  addMessage: (ticketId: string, data: { content: string; attachments?: string[] }) =>
    api.post<TicketMessage>(`/support/tickets/${ticketId}/messages`, data),

  // Knowledge Base
  getCategories: () => api.get<KnowledgeBaseCategory[]>('/support/knowledge-base/categories'),
  getArticles: (params?: { categoryId?: string; search?: string; page?: number; limit?: number }) =>
    api.get<KnowledgeBaseArticle[]>('/support/knowledge-base/articles', { params }),
  getArticleBySlug: (slug: string) => api.get<KnowledgeBaseArticle>(`/support/knowledge-base/articles/${slug}`),
  markArticleHelpful: (id: string, helpful: boolean) =>
    api.post(`/support/knowledge-base/articles/${id}/helpful`, { helpful }),

  // Live Chat
  startChat: (data: { name?: string; email?: string; message: string }) =>
    api.post<{ sessionId: string }>('/support/chat/sessions', data),
  sendChatMessage: (sessionId: string, message: string) =>
    api.post(`/support/chat/sessions/${sessionId}/messages`, { message }),
  getChatMessages: (sessionId: string) =>
    api.get<{ messages: { content: string; isStaff: boolean; createdAt: string }[] }>(
      `/support/chat/sessions/${sessionId}/messages`
    ),
};

// ==================== GIFT CARDS ====================
export const giftCardsApi = {
  checkBalance: (code: string, pin?: string) =>
    api.post<{ balance: number; currency: string; expiresAt?: string }>('/gift-cards/check-balance', { code, pin }),
  purchaseGiftCard: (data: {
    amount: number;
    recipientEmail: string;
    recipientName?: string;
    senderName?: string;
    message?: string;
    designTemplate?: string;
    scheduledDeliveryDate?: string;
  }) => api.post<GiftCard>('/gift-cards/purchase', data),
  redeemGiftCard: (code: string, pin?: string) =>
    api.post<{ success: boolean; creditsAdded: number }>('/gift-cards/redeem', { code, pin }),
  getMyPurchases: () => api.get<GiftCard[]>('/gift-cards/my-purchases'),
  getMyRedemptions: () => api.get<GiftCard[]>('/gift-cards/my-redemptions'),
  getGiftCardById: (id: string) => api.get<GiftCard>(`/gift-cards/${id}`),
  convertToStoreCredit: (giftCardId: string) =>
    api.post<{ success: boolean; creditsAdded: number }>('/gift-cards/convert-to-credit', { giftCardId }),

  // Store Credit
  getStoreCredit: () => api.get<StoreCredit>('/gift-cards/store-credit/balance'),
  getStoreCreditHistory: (params?: { page?: number; limit?: number }) =>
    api.get<StoreCreditTransaction[]>('/gift-cards/store-credit/history', { params }),
};

// ==================== SUBSCRIPTIONS ====================
export const subscriptionsApi = {
  getPlans: (type?: 'customer' | 'vendor') =>
    api.get<SubscriptionPlan[]>(type ? `/subscriptions/plans/type/${type}` : '/subscriptions/plans'),
  getPlanById: (id: string) => api.get<SubscriptionPlan>(`/subscriptions/plans/${id}`),
  getVendorTiers: () => api.get<SubscriptionPlan[]>('/subscriptions/vendor-tiers'),

  subscribe: (data: { planId: string; billingCycle: 'MONTHLY' | 'YEARLY' }) =>
    api.post<UserSubscription>('/subscriptions/subscribe', data),
  getMySubscription: () => api.get<UserSubscription>('/subscriptions/my-subscription'),
  getMySubscriptions: () => api.get<UserSubscription[]>('/subscriptions/my-subscriptions'),
  cancelSubscription: (id: string) => api.post<UserSubscription>(`/subscriptions/${id}/cancel`),
  reactivateSubscription: (id: string) => api.post<UserSubscription>(`/subscriptions/${id}/reactivate`),
  changePlan: (id: string, planId: string) =>
    api.post<UserSubscription>(`/subscriptions/${id}/change-plan`, { planId }),

  getBenefits: () => api.get<{ benefits: string[] }>('/subscriptions/benefits'),
  getInvoices: (subscriptionId?: string) =>
    api.get<SubscriptionInvoice[]>('/subscriptions/invoices', {
      params: subscriptionId ? { subscriptionId } : undefined
    }),

  // Vendor tier specific
  getMyTier: () => api.get<{ tier: SubscriptionPlan; usage: Record<string, number> }>('/subscriptions/my-tier'),
  getMyUsage: () => api.get<{ usage: Record<string, number>; limits: Record<string, { current: number; max: number }> }>(
    '/subscriptions/my-tier/usage'
  ),
  checkFeatureAccess: (feature: string) =>
    api.get<{ feature: string; hasAccess: boolean }>(`/subscriptions/my-tier/feature/${feature}`),
  getUpgradeOptions: () => api.get<SubscriptionPlan[]>('/subscriptions/my-tier/upgrade-options'),
};

// ==================== BNPL (Buy Now Pay Later) ====================
export const bnplApi = {
  getPlans: (amount: number) =>
    api.get<BNPLPlan[]>('/bnpl/plans', { params: { amount } }),
  getEligibility: (amount: number) =>
    api.get<{ eligible: boolean; maxAmount: number; reason?: string }>('/bnpl/eligibility', { params: { amount } }),
  createBNPLOrder: (data: { orderId: string; planId: string }) =>
    api.post<BNPLOrder>('/bnpl/orders', data),
  getMyBNPLOrders: () => api.get<BNPLOrder[]>('/bnpl/orders'),
  getBNPLOrderById: (id: string) => api.get<BNPLOrder>(`/bnpl/orders/${id}`),
  makePayment: (orderId: string) =>
    api.post<{ success: boolean; payment: { id: string; paidAt: string } }>(`/bnpl/orders/${orderId}/pay`),
  getPaymentSchedule: (orderId: string) =>
    api.get<{ payments: { dueDate: string; amount: number; status: string }[] }>(`/bnpl/orders/${orderId}/schedule`),
};

// ==================== LOYALTY ====================
export const loyaltyApi = {
  getMyAccount: () => api.get<LoyaltyProgram>('/loyalty/my-account'),
  createAccount: () => api.post<LoyaltyProgram>('/loyalty/my-account'),
  getPointHistory: (limit?: number) =>
    api.get<{ transactions: { type: string; points: number; description: string; createdAt: string }[] }>(
      '/loyalty/points/history',
      { params: limit ? { limit } : undefined }
    ),

  // Rewards
  getRewards: () => api.get<LoyaltyReward[]>('/loyalty/rewards'),
  getAvailableRewards: () => api.get<LoyaltyReward[]>('/loyalty/rewards/available'),
  redeemReward: (rewardId: string) =>
    api.post<LoyaltyRedemption>('/loyalty/redemptions/redeem', { rewardId }),
  getMyRedemptions: () => api.get<LoyaltyRedemption[]>('/loyalty/redemptions/my-redemptions'),
  applyRedemption: (redemptionId: string, orderId: string) =>
    api.post('/loyalty/redemptions/apply', { redemptionId, orderId }),

  // Tiers
  getTiers: () => api.get<{ tier: string; benefits: string[]; pointsRequired: number }[]>('/loyalty/tiers'),
  getLeaderboard: (limit?: number) =>
    api.get<{ users: { name: string; tier: string; points: number }[] }>('/loyalty/leaderboard', {
      params: limit ? { limit } : undefined
    }),

  // Referrals
  createReferral: (email: string) =>
    api.post<Referral>('/loyalty/referrals', { email }),
  getMyReferrals: () => api.get<Referral[]>('/loyalty/referrals/my-referrals'),
  applyReferralCode: (code: string) => api.post('/loyalty/referrals/apply/' + code),

  // Earn points
  earnFromReview: (productId: string) =>
    api.post<{ pointsEarned: number }>(`/loyalty/points/earn/review/${productId}`),
  claimBirthdayPoints: () =>
    api.post<{ pointsEarned: number }>('/loyalty/points/birthday'),

  // Program info
  getProgramInfo: () => api.get<{
    name: string;
    pointsPerDollar: number;
    pointValue: number;
    tiers: { name: string; minPoints: number; benefits: string[] }[];
  }>('/loyalty/program'),
};

// ==================== COUPONS ====================
export const couponsApi = {
  validateCoupon: (code: string, cartTotal?: number) =>
    api.post<{ valid: boolean; coupon?: Coupon; discount?: number; message?: string }>(
      '/coupons/validate',
      { code, cartTotal }
    ),
  applyCoupon: (code: string) =>
    api.post<{ success: boolean; discount: number }>('/coupons/apply', { code }),
  removeCoupon: () => api.post('/coupons/remove'),
  getMyCoupons: () => api.get<Coupon[]>('/coupons/my-coupons'),
};

// ==================== ADDRESS BOOK ====================
export const addressApi = {
  getAddresses: () => api.get<SavedAddress[]>('/users/addresses'),
  addAddress: (data: Omit<SavedAddress, 'id'>) =>
    api.post<SavedAddress>('/users/addresses', data),
  updateAddress: (id: string, data: Partial<SavedAddress>) =>
    api.put<SavedAddress>(`/users/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/addresses/${id}`),
  setDefaultShipping: (id: string) =>
    api.post(`/users/addresses/${id}/default-shipping`),
  setDefaultBilling: (id: string) =>
    api.post(`/users/addresses/${id}/default-billing`),
};

// ==================== PAYMENT METHODS ====================
export const paymentMethodsApi = {
  getPaymentMethods: () => api.get<SavedPaymentMethod[]>('/users/payment-methods'),
  addPaymentMethod: (data: { type: string; token: string }) =>
    api.post<SavedPaymentMethod>('/users/payment-methods', data),
  deletePaymentMethod: (id: string) => api.delete(`/users/payment-methods/${id}`),
  setDefaultPaymentMethod: (id: string) =>
    api.post(`/users/payment-methods/${id}/default`),
};

// ==================== USER PROFILE ====================
export const profileApi = {
  getProfile: () => api.get<{
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    dateOfBirth?: string;
  }>('/users/profile'),
  updateProfile: (data: { name?: string; phone?: string; dateOfBirth?: string }) =>
    api.put('/users/profile', data),
  uploadAvatar: (file: File) => api.upload('/users/avatar', file),
  deleteAvatar: () => api.delete('/users/avatar'),

  // Security
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/users/change-password', data),
  enable2FA: () => api.post<{ qrCode: string; secret: string }>('/users/2fa/enable'),
  verify2FA: (code: string) => api.post('/users/2fa/verify', { code }),
  disable2FA: (code: string) => api.post('/users/2fa/disable', { code }),
  getSessions: () => api.get<{ sessions: { id: string; device: string; lastActive: string; current: boolean }[] }>(
    '/users/sessions'
  ),
  revokeSession: (sessionId: string) => api.delete(`/users/sessions/${sessionId}`),
  revokeAllSessions: () => api.delete('/users/sessions'),

  // Preferences
  getPreferences: () => api.get<import('@/types').UserPreferences>('/users/preferences'),
  updatePreferences: (data: Partial<import('@/types').UserPreferences>) =>
    api.put('/users/preferences', data),

  // Account
  deleteAccount: (password: string) => api.post('/users/delete-account', { password }),
  exportData: () => api.post<{ downloadUrl: string }>('/users/export-data'),
};
