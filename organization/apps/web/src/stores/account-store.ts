import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, Review, LoyaltyProgram } from '@/types';
import type {
  WishlistItem,
  WishlistCollection,
  SupportTicket,
  ReturnRequest,
  GiftCard,
  StoreCredit,
  UserSubscription,
  BNPLOrder,
  LoyaltyReward,
  LoyaltyRedemption,
  Referral,
  SavedAddress,
  SavedPaymentMethod,
} from '@/types/extended';
import {
  ordersApi,
  wishlistApi,
  reviewsApi,
  returnsApi,
  supportApi,
  giftCardsApi,
  subscriptionsApi,
  bnplApi,
  loyaltyApi,
  addressApi,
  paymentMethodsApi,
  profileApi,
} from '@/services/account-api';

// ==================== ORDERS STORE ====================
interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  cancelOrder: (id: string, reason: string) => Promise<void>;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await ordersApi.getOrders();
      set({ orders: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch orders', isLoading: false });
    }
  },

  fetchOrderById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await ordersApi.getOrderById(id);
      set({ currentOrder: data || null, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch order', isLoading: false });
    }
  },

  cancelOrder: async (id: string, reason: string) => {
    set({ isLoading: true, error: null });
    try {
      await ordersApi.cancelOrder(id, reason);
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: 'CANCELLED' as const } : o
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to cancel order', isLoading: false });
    }
  },
}));

// ==================== WISHLIST STORE ====================
interface WishlistState {
  items: WishlistItem[];
  collections: WishlistCollection[];
  count: number;
  isLoading: boolean;
  error: string | null;
  fetchWishlist: () => Promise<void>;
  fetchCollections: () => Promise<void>;
  addToWishlist: (productId: string, note?: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  checkInWishlist: (productId: string) => Promise<boolean>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  collections: [],
  count: 0,
  isLoading: false,
  error: null,

  fetchWishlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const [wishlistData, countData] = await Promise.all([
        wishlistApi.getWishlist(),
        wishlistApi.getWishlistCount(),
      ]);
      set({
        items: wishlistData || [],
        count: countData?.count || 0,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to fetch wishlist', isLoading: false });
    }
  },

  fetchCollections: async () => {
    try {
      const data = await wishlistApi.getCollections();
      set({ collections: data || [] });
    } catch (error) {
      set({ error: 'Failed to fetch collections' });
    }
  },

  addToWishlist: async (productId: string, note?: string) => {
    try {
      const data = await wishlistApi.addToWishlist({ productId, note });
      if (data) {
        set((state) => ({
          items: [...state.items, data!],
          count: state.count + 1,
        }));
      }
    } catch (error) {
      set({ error: 'Failed to add to wishlist' });
    }
  },

  removeFromWishlist: async (productId: string) => {
    try {
      await wishlistApi.removeFromWishlist(productId);
      set((state) => ({
        items: state.items.filter((item) => item.productId !== productId),
        count: Math.max(0, state.count - 1),
      }));
    } catch (error) {
      set({ error: 'Failed to remove from wishlist' });
    }
  },

  clearWishlist: async () => {
    try {
      await wishlistApi.clearWishlist();
      set({ items: [], count: 0 });
    } catch (error) {
      set({ error: 'Failed to clear wishlist' });
    }
  },

  createCollection: async (name: string, description?: string) => {
    try {
      const data = await wishlistApi.createCollection({ name, description });
      if (data) {
        set((state) => ({
          collections: [...state.collections, data!],
        }));
      }
    } catch (error) {
      set({ error: 'Failed to create collection' });
    }
  },

  deleteCollection: async (id: string) => {
    try {
      await wishlistApi.deleteCollection(id);
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
      }));
    } catch (error) {
      set({ error: 'Failed to delete collection' });
    }
  },

  checkInWishlist: async (productId: string) => {
    try {
      const data = await wishlistApi.checkInWishlist(productId);
      return data?.inWishlist || false;
    } catch {
      return false;
    }
  },
}));

// ==================== REVIEWS STORE ====================
interface ReviewsState {
  myReviews: Review[];
  isLoading: boolean;
  error: string | null;
  fetchMyReviews: () => Promise<void>;
  createReview: (data: {
    productId: string;
    rating: number;
    title: string;
    content: string;
  }) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
}

export const useReviewsStore = create<ReviewsState>((set) => ({
  myReviews: [],
  isLoading: false,
  error: null,

  fetchMyReviews: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await reviewsApi.getMyReviews();
      set({ myReviews: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch reviews', isLoading: false });
    }
  },

  createReview: async (reviewData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await reviewsApi.createReview(reviewData);
      if (data) {
        set((state) => ({
          myReviews: [...state.myReviews, data!],
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Failed to create review', isLoading: false });
    }
  },

  deleteReview: async (id: string) => {
    try {
      await reviewsApi.deleteReview(id);
      set((state) => ({
        myReviews: state.myReviews.filter((r) => r.id !== id),
      }));
    } catch (error) {
      set({ error: 'Failed to delete review' });
    }
  },
}));

// ==================== RETURNS STORE ====================
interface ReturnsState {
  returns: ReturnRequest[];
  currentReturn: ReturnRequest | null;
  isLoading: boolean;
  error: string | null;
  fetchReturns: () => Promise<void>;
  fetchReturnById: (id: string) => Promise<void>;
  createReturn: (data: {
    orderId: string;
    items: { orderItemId: string; quantity: number; reason: string }[];
    refundMethod: string;
  }) => Promise<void>;
  cancelReturn: (id: string, reason: string) => Promise<void>;
}

export const useReturnsStore = create<ReturnsState>((set) => ({
  returns: [],
  currentReturn: null,
  isLoading: false,
  error: null,

  fetchReturns: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await returnsApi.getMyReturns();
      set({ returns: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch returns', isLoading: false });
    }
  },

  fetchReturnById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await returnsApi.getReturnById(id);
      set({ currentReturn: data || null, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch return', isLoading: false });
    }
  },

  createReturn: async (returnData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await returnsApi.createReturn(returnData);
      if (data) {
        set((state) => ({
          returns: [...state.returns, data!],
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Failed to create return', isLoading: false });
    }
  },

  cancelReturn: async (id: string, reason: string) => {
    try {
      await returnsApi.cancelReturn(id, reason);
      set((state) => ({
        returns: state.returns.map((r) =>
          r.id === id ? { ...r, status: 'CANCELLED' as const } : r
        ),
      }));
    } catch (error) {
      set({ error: 'Failed to cancel return' });
    }
  },
}));

// ==================== SUPPORT STORE ====================
interface SupportState {
  tickets: SupportTicket[];
  currentTicket: SupportTicket | null;
  isLoading: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  fetchTicketById: (id: string) => Promise<void>;
  createTicket: (data: {
    subject: string;
    description: string;
    category: string;
  }) => Promise<void>;
  addMessage: (ticketId: string, content: string) => Promise<void>;
}

export const useSupportStore = create<SupportState>((set) => ({
  tickets: [],
  currentTicket: null,
  isLoading: false,
  error: null,

  fetchTickets: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await supportApi.getTickets();
      set({ tickets: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch tickets', isLoading: false });
    }
  },

  fetchTicketById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await supportApi.getTicketById(id);
      set({ currentTicket: data || null, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch ticket', isLoading: false });
    }
  },

  createTicket: async (ticketData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await supportApi.createTicket(ticketData);
      if (data) {
        set((state) => ({
          tickets: [...state.tickets, data!],
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Failed to create ticket', isLoading: false });
    }
  },

  addMessage: async (ticketId: string, content: string) => {
    try {
      await supportApi.addMessage(ticketId, { content });
      // Refresh ticket to get updated messages
      const data = await supportApi.getTicketById(ticketId);
      set({ currentTicket: data || null });
    } catch (error) {
      set({ error: 'Failed to add message' });
    }
  },
}));

// ==================== GIFT CARDS STORE ====================
interface GiftCardsState {
  myGiftCards: GiftCard[];
  storeCredit: StoreCredit | null;
  isLoading: boolean;
  error: string | null;
  fetchMyGiftCards: () => Promise<void>;
  fetchStoreCredit: () => Promise<void>;
  purchaseGiftCard: (data: {
    amount: number;
    recipientEmail: string;
    recipientName?: string;
    senderName?: string;
    message?: string;
    designTemplate?: string;
    scheduledDeliveryDate?: string;
  }) => Promise<void>;
  redeemGiftCard: (code: string) => Promise<{ success: boolean; creditsAdded: number }>;
  checkBalance: (code: string) => Promise<{ balance: number; currency: string } | null>;
}

export const useGiftCardsStore = create<GiftCardsState>((set) => ({
  myGiftCards: [],
  storeCredit: null,
  isLoading: false,
  error: null,

  fetchMyGiftCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await giftCardsApi.getMyPurchases();
      set({ myGiftCards: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch gift cards', isLoading: false });
    }
  },

  fetchStoreCredit: async () => {
    try {
      const data = await giftCardsApi.getStoreCredit();
      set({ storeCredit: data || null });
    } catch (error) {
      set({ error: 'Failed to fetch store credit' });
    }
  },

  purchaseGiftCard: async (giftCardData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await giftCardsApi.purchaseGiftCard(giftCardData);
      if (data) {
        set((state) => ({
          myGiftCards: [...state.myGiftCards, data!],
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Failed to purchase gift card', isLoading: false });
    }
  },

  redeemGiftCard: async (code: string) => {
    try {
      const data = await giftCardsApi.redeemGiftCard(code);
      if (data?.success) {
        // Refresh store credit
        const creditData = await giftCardsApi.getStoreCredit();
        set({ storeCredit: creditData || null });
      }
      return data || { success: false, creditsAdded: 0 };
    } catch (error) {
      set({ error: 'Failed to redeem gift card' });
      return { success: false, creditsAdded: 0 };
    }
  },

  checkBalance: async (code: string) => {
    try {
      const data = await giftCardsApi.checkBalance(code);
      return data || null;
    } catch {
      return null;
    }
  },
}));

// ==================== SUBSCRIPTIONS STORE ====================
interface SubscriptionsState {
  subscription: UserSubscription | null;
  plans: import('@/types/extended').SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  fetchSubscription: () => Promise<void>;
  fetchPlans: (type?: 'customer' | 'vendor') => Promise<void>;
  subscribe: (planId: string, billingCycle: 'MONTHLY' | 'YEARLY') => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

export const useSubscriptionsStore = create<SubscriptionsState>((set, get) => ({
  subscription: null,
  plans: [],
  isLoading: false,
  error: null,

  fetchSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await subscriptionsApi.getMySubscription();
      set({ subscription: data || null, isLoading: false });
    } catch (error) {
      set({ subscription: null, isLoading: false });
    }
  },

  fetchPlans: async (type) => {
    set({ isLoading: true, error: null });
    try {
      const data = await subscriptionsApi.getPlans(type);
      set({ plans: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch plans', isLoading: false });
    }
  },

  subscribe: async (planId, billingCycle) => {
    set({ isLoading: true, error: null });
    try {
      const data = await subscriptionsApi.subscribe({ planId, billingCycle });
      set({ subscription: data || null, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to subscribe', isLoading: false });
    }
  },

  cancelSubscription: async () => {
    const { subscription } = get();
    if (!subscription) return;

    set({ isLoading: true, error: null });
    try {
      await subscriptionsApi.cancelSubscription(subscription.id);
      set((state) => ({
        subscription: state.subscription
          ? { ...state.subscription, cancelAtPeriodEnd: true }
          : null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to cancel subscription', isLoading: false });
    }
  },
}));

// ==================== LOYALTY STORE ====================
interface LoyaltyState {
  account: LoyaltyProgram | null;
  rewards: LoyaltyReward[];
  redemptions: LoyaltyRedemption[];
  referrals: Referral[];
  isLoading: boolean;
  error: string | null;
  fetchAccount: () => Promise<void>;
  fetchRewards: () => Promise<void>;
  fetchRedemptions: () => Promise<void>;
  fetchReferrals: () => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
  createReferral: (email: string) => Promise<void>;
}

export const useLoyaltyStore = create<LoyaltyState>((set) => ({
  account: null,
  rewards: [],
  redemptions: [],
  referrals: [],
  isLoading: false,
  error: null,

  fetchAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await loyaltyApi.getMyAccount();
      set({ account: data || null, isLoading: false });
    } catch (error) {
      set({ account: null, isLoading: false });
    }
  },

  fetchRewards: async () => {
    try {
      const data = await loyaltyApi.getAvailableRewards();
      set({ rewards: data || [] });
    } catch (error) {
      set({ error: 'Failed to fetch rewards' });
    }
  },

  fetchRedemptions: async () => {
    try {
      const data = await loyaltyApi.getMyRedemptions();
      set({ redemptions: data || [] });
    } catch (error) {
      set({ error: 'Failed to fetch redemptions' });
    }
  },

  fetchReferrals: async () => {
    try {
      const data = await loyaltyApi.getMyReferrals();
      set({ referrals: data || [] });
    } catch (error) {
      set({ error: 'Failed to fetch referrals' });
    }
  },

  redeemReward: async (rewardId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loyaltyApi.redeemReward(rewardId);
      if (data) {
        set((state) => ({
          redemptions: [...state.redemptions, data!],
          isLoading: false,
        }));
        // Refresh account to update points
        const accountData = await loyaltyApi.getMyAccount();
        set({ account: accountData || null });
      }
    } catch (error) {
      set({ error: 'Failed to redeem reward', isLoading: false });
    }
  },

  createReferral: async (email: string) => {
    try {
      const data = await loyaltyApi.createReferral(email);
      if (data) {
        set((state) => ({
          referrals: [...state.referrals, data!],
        }));
      }
    } catch (error) {
      set({ error: 'Failed to create referral' });
    }
  },
}));

// ==================== ADDRESS STORE ====================
interface AddressState {
  addresses: SavedAddress[];
  isLoading: boolean;
  error: string | null;
  fetchAddresses: () => Promise<void>;
  addAddress: (data: Omit<SavedAddress, 'id'>) => Promise<void>;
  updateAddress: (id: string, data: Partial<SavedAddress>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultShipping: (id: string) => Promise<void>;
  setDefaultBilling: (id: string) => Promise<void>;
}

export const useAddressStore = create<AddressState>((set) => ({
  addresses: [],
  isLoading: false,
  error: null,

  fetchAddresses: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await addressApi.getAddresses();
      set({ addresses: data || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch addresses', isLoading: false });
    }
  },

  addAddress: async (addressData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await addressApi.addAddress(addressData);
      if (data) {
        set((state) => ({
          addresses: [...state.addresses, data!],
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Failed to add address', isLoading: false });
    }
  },

  updateAddress: async (id, updates) => {
    try {
      const data = await addressApi.updateAddress(id, updates);
      if (data) {
        set((state) => ({
          addresses: state.addresses.map((a) =>
            a.id === id ? data! : a
          ),
        }));
      }
    } catch (error) {
      set({ error: 'Failed to update address' });
    }
  },

  deleteAddress: async (id) => {
    try {
      await addressApi.deleteAddress(id);
      set((state) => ({
        addresses: state.addresses.filter((a) => a.id !== id),
      }));
    } catch (error) {
      set({ error: 'Failed to delete address' });
    }
  },

  setDefaultShipping: async (id) => {
    try {
      await addressApi.setDefaultShipping(id);
      set((state) => ({
        addresses: state.addresses.map((a) => ({
          ...a,
          isDefaultShipping: a.id === id,
        })),
      }));
    } catch (error) {
      set({ error: 'Failed to set default shipping' });
    }
  },

  setDefaultBilling: async (id) => {
    try {
      await addressApi.setDefaultBilling(id);
      set((state) => ({
        addresses: state.addresses.map((a) => ({
          ...a,
          isDefaultBilling: a.id === id,
        })),
      }));
    } catch (error) {
      set({ error: 'Failed to set default billing' });
    }
  },
}));
