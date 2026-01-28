/**
 * AI Shopping Concierge Module Exports
 *
 * Provides intelligent shopping assistance by combining
 * chatbot, personalization, and conversational AI capabilities.
 */

// Module
export { AIConciergeModule } from './ai-concierge.module';

// Service
export { AIConciergeService } from './ai-concierge.service';

// Controller
export { AIConciergeController } from './ai-concierge.controller';

// Interfaces
export {
  ConciergeSession,
  ConciergeContext,
  ConciergeMessage,
  ConciergeResponse,
  ConciergeState,
  ConciergeCapabilities,
  ConciergeConfig,
  ConciergeResponseMetadata,
  ConciergeAnalyticsEvent,
  ConciergeEventType,
  ConciergeActionType,
  ConciergeWorkflow,
  CONCIERGE_WORKFLOWS,
  ShoppingIntent,
  ShoppingIntentType,
  ShoppingEntities,
  UserShoppingPreferences,
  PriceRange,
  DeliveryPreferences,
  CartContext,
  CartItem,
  Discount,
  BrowsingHistoryItem,
  SearchContext,
  PreviousPurchase,
  Promotion,
  MessageSentiment,
  MessageAttachment,
  MessageAction,
  ProductRecommendation,
} from './ai-concierge.interface';

// DTOs
export {
  // Request DTOs
  StartConciergeSessionDto,
  SendConciergeMessageDto,
  GetRecommendationsDto,
  OrderAssistanceDto,
  SizeGuidanceDto,
  GiftFinderDto,
  CheckoutAssistanceDto,
  SubmitConciergeFeedbackDto,
  EndConciergeSessionDto,
  RequestHumanHandoffDto,
  // Response DTOs
  ConciergeSessionResponseDto,
  ConciergeMessageResponseDto,
  RecommendationsResponseDto,
  OrderAssistanceResponseDto,
  SizeGuidanceResponseDto,
  GiftFinderResponseDto,
  CheckoutAssistanceResponseDto,
  ConciergeFeedbackResponseDto,
  EndSessionResponseDto,
  HumanHandoffResponseDto,
  ConversationHistoryResponseDto,
} from './dto';
