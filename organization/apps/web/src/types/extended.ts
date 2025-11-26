// Extended types for new features

// Wishlist Types
export interface WishlistItem {
  id: string;
  productId: string;
  product: import('./index').Product;
  note?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notifyOnPriceDrop: boolean;
  notifyOnBackInStock: boolean;
  addedAt: string;
}

export interface WishlistCollection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  shareToken?: string;
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}

// Support Types
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  orderId?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  content: string;
  isStaff: boolean;
  attachments?: string[];
  createdAt: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
}

export interface KnowledgeBaseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  articleCount: number;
  icon?: string;
}

// Returns Types
export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  status: ReturnStatus;
  reason: string;
  reasonDetails?: string;
  items: ReturnItem[];
  refundMethod: 'ORIGINAL_PAYMENT' | 'STORE_CREDIT' | 'BANK_TRANSFER';
  refundAmount?: number;
  returnLabel?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  receivedAt?: string;
  refundedAt?: string;
}

export type ReturnStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'LABEL_GENERATED'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'CANCELLED';

export interface ReturnItem {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  reason: string;
  condition?: 'UNOPENED' | 'LIKE_NEW' | 'USED' | 'DAMAGED';
}

// Gift Card Types
export interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
  designTemplate?: string;
  scheduledDeliveryDate?: string;
  expiresAt?: string;
  createdAt: string;
  redeemedAt?: string;
}

export interface StoreCredit {
  id: string;
  balance: number;
  currency: string;
  history: StoreCreditTransaction[];
}

export interface StoreCreditTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'ADJUSTMENT';
  amount: number;
  description: string;
  orderId?: string;
  giftCardId?: string;
  createdAt: string;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: 'customer' | 'vendor';
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular: boolean;
  trialDays?: number;
}

export interface UserSubscription {
  id: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'TRIALING';
  billingCycle: 'MONTHLY' | 'YEARLY';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  paidAt?: string;
  createdAt: string;
}

// BNPL Types
export interface BNPLPlan {
  id: string;
  provider: 'KLARNA' | 'AFFIRM' | 'AFTERPAY' | 'INTERNAL';
  name: string;
  installments: number;
  interestRate: number;
  minAmount: number;
  maxAmount: number;
}

export interface BNPLOrder {
  id: string;
  orderId: string;
  planId: string;
  plan: BNPLPlan;
  totalAmount: number;
  installmentAmount: number;
  paidInstallments: number;
  nextPaymentDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
  payments: BNPLPayment[];
  createdAt: string;
}

export interface BNPLPayment {
  id: string;
  installmentNumber: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'OVERDUE';
  dueDate: string;
  paidAt?: string;
}

// Loyalty Extended Types
export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'DISCOUNT' | 'FREE_PRODUCT' | 'FREE_SHIPPING' | 'EXCLUSIVE_ACCESS';
  value?: number;
  productId?: string;
  minTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  stock?: number;
  expiresAt?: string;
  imageUrl?: string;
}

export interface LoyaltyRedemption {
  id: string;
  rewardId: string;
  reward: LoyaltyReward;
  pointsSpent: number;
  status: 'PENDING' | 'ACTIVE' | 'USED' | 'EXPIRED';
  code?: string;
  usedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  code: string;
  referredEmail: string;
  status: 'PENDING' | 'REGISTERED' | 'COMPLETED' | 'EXPIRED';
  pointsEarned?: number;
  createdAt: string;
  completedAt?: string;
}

// Coupon Types
export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' | 'BOGO';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

// Deal Types
export interface Deal {
  id: string;
  name: string;
  description: string;
  type: 'FLASH_SALE' | 'DAILY_DEAL' | 'BUNDLE' | 'CLEARANCE';
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  products: import('./index').Product[];
  startsAt: string;
  endsAt: string;
  stock?: number;
  soldCount: number;
}

// Account Settings Types
export interface AccountSettings {
  profile: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    dateOfBirth?: string;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange?: string;
    activeSessions: number;
  };
  privacy: {
    profileVisibility: 'PUBLIC' | 'PRIVATE';
    showPurchaseHistory: boolean;
    allowRecommendations: boolean;
  };
  communication: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };
}

// Address Book
export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

// Payment Methods
export interface SavedPaymentMethod {
  id: string;
  type: 'CARD' | 'PAYPAL' | 'BANK_ACCOUNT';
  isDefault: boolean;
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  paypal?: {
    email: string;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
  };
}
