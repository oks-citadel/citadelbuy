/**
 * AI Shopping Concierge Interfaces
 *
 * Provides type definitions for the AI Shopping Concierge,
 * which combines chatbot, personalization, and conversational AI
 * capabilities to deliver intelligent shopping assistance.
 */

import { IntentType } from '../chatbot/dto/chatbot.dto';

/**
 * Concierge session representing an active shopping assistance session
 */
export interface ConciergeSession {
  sessionId: string;
  userId?: string;
  startedAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  context: ConciergeContext;
  conversationHistory: ConciergeMessage[];
  state: ConciergeState;
  metadata?: Record<string, unknown>;
}

/**
 * Context for the concierge session including user preferences and shopping intent
 */
export interface ConciergeContext {
  userPreferences?: UserShoppingPreferences;
  currentIntent?: ShoppingIntent;
  cartContext?: CartContext;
  browsingHistory?: BrowsingHistoryItem[];
  searchContext?: SearchContext;
  previousPurchases?: PreviousPurchase[];
  activePromotions?: Promotion[];
}

/**
 * User shopping preferences for personalization
 */
export interface UserShoppingPreferences {
  favoriteCategories?: string[];
  preferredBrands?: string[];
  priceRange?: PriceRange;
  sizePreferences?: Record<string, string>;
  colorPreferences?: string[];
  stylePreferences?: string[];
  deliveryPreferences?: DeliveryPreferences;
}

export interface PriceRange {
  min?: number;
  max?: number;
  currency?: string;
}

export interface DeliveryPreferences {
  preferredMethod?: 'standard' | 'express' | 'same_day' | 'pickup';
  preferredAddress?: string;
}

/**
 * Shopping intent detected from user messages
 */
export interface ShoppingIntent {
  type: ShoppingIntentType;
  confidence: number;
  entities: ShoppingEntities;
  subIntents?: ShoppingIntent[];
}

export type ShoppingIntentType =
  | 'product_search'
  | 'product_recommendation'
  | 'product_comparison'
  | 'price_inquiry'
  | 'availability_check'
  | 'order_tracking'
  | 'order_modification'
  | 'return_request'
  | 'refund_inquiry'
  | 'size_guidance'
  | 'style_advice'
  | 'gift_suggestion'
  | 'deal_finding'
  | 'wishlist_management'
  | 'cart_assistance'
  | 'checkout_help'
  | 'general_inquiry'
  | 'feedback'
  | 'complaint';

export interface ShoppingEntities {
  productId?: string;
  productName?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  priceMax?: number;
  priceMin?: number;
  orderId?: string;
  quantity?: number;
  occasion?: string;
  recipient?: string;
  features?: string[];
}

/**
 * Cart context for shopping assistance
 */
export interface CartContext {
  cartId?: string;
  items?: CartItem[];
  subtotal?: number;
  discounts?: Discount[];
  estimatedTotal?: number;
  currency?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  image?: string;
}

export interface Discount {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description?: string;
}

/**
 * Browsing history item
 */
export interface BrowsingHistoryItem {
  productId: string;
  productName: string;
  category?: string;
  viewedAt: Date;
  duration?: number;
}

/**
 * Search context
 */
export interface SearchContext {
  lastQuery?: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  resultsCount?: number;
}

/**
 * Previous purchase
 */
export interface PreviousPurchase {
  orderId: string;
  productId: string;
  productName: string;
  purchaseDate: Date;
  price: number;
  rating?: number;
}

/**
 * Promotion
 */
export interface Promotion {
  id: string;
  code?: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'free_shipping';
  discountValue: number;
  validUntil?: Date;
  applicableCategories?: string[];
}

/**
 * Concierge message in conversation
 */
export interface ConciergeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  intent?: ShoppingIntent;
  sentiment?: MessageSentiment;
  attachments?: MessageAttachment[];
  actions?: MessageAction[];
  products?: ProductRecommendation[];
}

export interface MessageSentiment {
  label: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  urgency?: 'low' | 'medium' | 'high';
}

export interface MessageAttachment {
  type: 'image' | 'product' | 'order' | 'receipt';
  id: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageAction {
  type: ConciergeActionType;
  label: string;
  data?: Record<string, unknown>;
}

export type ConciergeActionType =
  | 'add_to_cart'
  | 'view_product'
  | 'compare_products'
  | 'track_order'
  | 'start_return'
  | 'apply_coupon'
  | 'contact_support'
  | 'view_similar'
  | 'notify_availability'
  | 'add_to_wishlist'
  | 'proceed_checkout';

/**
 * Product recommendation from concierge
 */
export interface ProductRecommendation {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  relevanceScore: number;
  recommendationReason?: string;
  badges?: string[];
}

/**
 * Concierge session state
 */
export type ConciergeState =
  | 'greeting'
  | 'browsing'
  | 'searching'
  | 'comparing'
  | 'checkout_assistance'
  | 'order_support'
  | 'return_support'
  | 'waiting_input'
  | 'processing'
  | 'escalated'
  | 'ended';

/**
 * Concierge response to user
 */
export interface ConciergeResponse {
  success: boolean;
  sessionId: string;
  message: string;
  intent?: ShoppingIntent;
  sentiment?: MessageSentiment;
  products?: ProductRecommendation[];
  actions?: MessageAction[];
  suggestions?: string[];
  requiresHumanHandoff?: boolean;
  metadata?: ConciergeResponseMetadata;
}

export interface ConciergeResponseMetadata {
  processingTime?: number;
  workflowExecuted?: string;
  confidenceScore?: number;
  sources?: string[];
}

/**
 * Concierge workflow types
 */
export const CONCIERGE_WORKFLOWS = {
  PRODUCT_DISCOVERY: 'concierge-product-discovery',
  ORDER_ASSISTANCE: 'concierge-order-assistance',
  RETURN_FLOW: 'concierge-return-flow',
  PERSONALIZED_RECOMMENDATIONS: 'concierge-personalized-recommendations',
  CHECKOUT_ASSISTANCE: 'concierge-checkout-assistance',
  SIZE_GUIDANCE: 'concierge-size-guidance',
  GIFT_FINDER: 'concierge-gift-finder',
} as const;

export type ConciergeWorkflow = (typeof CONCIERGE_WORKFLOWS)[keyof typeof CONCIERGE_WORKFLOWS];

/**
 * Concierge capability types
 */
export interface ConciergeCapabilities {
  chat: boolean;
  productRecommendations: boolean;
  orderTracking: boolean;
  returnAssistance: boolean;
  sizeGuidance: boolean;
  styleAdvice: boolean;
  giftSuggestions: boolean;
  priceAlerts: boolean;
  inventoryNotifications: boolean;
  humanHandoff: boolean;
}

/**
 * Concierge configuration
 */
export interface ConciergeConfig {
  maxSessionDurationMinutes: number;
  maxConversationHistory: number;
  enabledCapabilities: ConciergeCapabilities;
  personalizedGreeting: boolean;
  proactiveAssistance: boolean;
  handoffThreshold: number;
}

/**
 * Concierge analytics event
 */
export interface ConciergeAnalyticsEvent {
  eventType: ConciergeEventType;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type ConciergeEventType =
  | 'session_started'
  | 'session_ended'
  | 'message_sent'
  | 'message_received'
  | 'product_recommended'
  | 'product_clicked'
  | 'add_to_cart'
  | 'human_handoff'
  | 'feedback_submitted'
  | 'intent_detected'
  | 'workflow_executed';
