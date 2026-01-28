/**
 * AI Shopping Concierge DTOs
 *
 * Request and response DTOs for the AI Shopping Concierge endpoints.
 */

import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ShoppingIntentType,
  ConciergeState,
  ConciergeActionType,
  ProductRecommendation,
  MessageAction,
  ShoppingIntent,
  MessageSentiment,
} from '../ai-concierge.interface';

// ==================== Request DTOs ====================

/**
 * DTO for starting a new concierge session
 */
export class StartConciergeSessionDto {
  @ApiPropertyOptional({ description: 'User ID for personalization' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Initial context for the session' })
  @IsOptional()
  @IsObject()
  initialContext?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Platform identifier (web, mobile, voice)' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'Language preference' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Initial greeting customization' })
  @IsOptional()
  @IsBoolean()
  skipGreeting?: boolean;
}

/**
 * DTO for sending a message to the concierge
 */
export class SendConciergeMessageDto {
  @ApiProperty({ description: 'Session ID', example: 'uuid-session-id' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'User message', example: 'I am looking for a red dress for a wedding' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Additional context for the message' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Attached product IDs for reference' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachedProductIds?: string[];

  @ApiPropertyOptional({ description: 'Attached order ID for reference' })
  @IsOptional()
  @IsString()
  attachedOrderId?: string;
}

/**
 * DTO for getting product recommendations
 */
export class GetRecommendationsDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ description: 'User ID for personalization' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum number of recommendations', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Recommendation context (e.g., gift, self, replacement)' })
  @IsOptional()
  @IsString()
  recommendationContext?: string;
}

/**
 * DTO for order assistance requests
 */
export class OrderAssistanceDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Type of assistance needed',
    enum: ['tracking', 'modification', 'cancellation', 'return', 'refund', 'general'],
  })
  @IsString()
  @IsNotEmpty()
  assistanceType: 'tracking' | 'modification' | 'cancellation' | 'return' | 'refund' | 'general';

  @ApiPropertyOptional({ description: 'Additional details' })
  @IsOptional()
  @IsString()
  details?: string;
}

/**
 * DTO for size guidance requests
 */
export class SizeGuidanceDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'User provided measurements' })
  @IsOptional()
  @IsObject()
  measurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    shoeSize?: number;
    unit?: 'metric' | 'imperial';
  };

  @ApiPropertyOptional({ description: 'Previous size purchases for this category' })
  @IsOptional()
  @IsArray()
  previousSizes?: Array<{
    brand: string;
    size: string;
    fit: 'small' | 'perfect' | 'large';
  }>;
}

/**
 * DTO for gift finder requests
 */
export class GiftFinderDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Occasion for the gift' })
  @IsString()
  @IsNotEmpty()
  occasion: string;

  @ApiPropertyOptional({ description: 'Recipient relationship (e.g., friend, partner, parent)' })
  @IsOptional()
  @IsString()
  recipientRelationship?: string;

  @ApiPropertyOptional({ description: 'Recipient age group' })
  @IsOptional()
  @IsString()
  recipientAgeGroup?: string;

  @ApiPropertyOptional({ description: 'Recipient gender' })
  @IsOptional()
  @IsString()
  recipientGender?: string;

  @ApiPropertyOptional({ description: 'Recipient interests' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipientInterests?: string[];

  @ApiPropertyOptional({ description: 'Budget for the gift' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;
}

/**
 * DTO for checkout assistance
 */
export class CheckoutAssistanceDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Cart ID' })
  @IsOptional()
  @IsString()
  cartId?: string;

  @ApiProperty({
    description: 'Type of checkout assistance',
    enum: ['payment_help', 'shipping_options', 'coupon_suggestion', 'cart_review', 'general'],
  })
  @IsString()
  @IsNotEmpty()
  assistanceType: 'payment_help' | 'shipping_options' | 'coupon_suggestion' | 'cart_review' | 'general';
}

/**
 * DTO for submitting feedback
 */
export class SubmitConciergeFeedbackDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Feedback rating (1-5)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Feedback comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Specific message ID feedback refers to' })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiPropertyOptional({ description: 'Whether the issue was resolved' })
  @IsOptional()
  @IsBoolean()
  issueResolved?: boolean;

  @ApiPropertyOptional({ description: 'Tags for feedback categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * DTO for ending a concierge session
 */
export class EndConciergeSessionDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Reason for ending' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for human handoff request
 */
export class RequestHumanHandoffDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Reason for handoff' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @ApiPropertyOptional({ description: 'Preferred contact method' })
  @IsOptional()
  @IsString()
  preferredContact?: 'chat' | 'phone' | 'email';
}

// ==================== Response DTOs ====================

/**
 * Response DTO for session creation
 */
export class ConciergeSessionResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Session creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Session expiry timestamp' })
  expiresAt: string;

  @ApiPropertyOptional({ description: 'Welcome message' })
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Suggested questions' })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'User personalization applied' })
  personalized?: boolean;
}

/**
 * Response DTO for concierge messages
 */
export class ConciergeMessageResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Response message from concierge' })
  message: string;

  @ApiProperty({ description: 'Message ID' })
  messageId: string;

  @ApiPropertyOptional({ description: 'Detected shopping intent' })
  intent?: ShoppingIntent;

  @ApiPropertyOptional({ description: 'Message sentiment analysis' })
  sentiment?: MessageSentiment;

  @ApiPropertyOptional({ description: 'Product recommendations' })
  products?: ProductRecommendation[];

  @ApiPropertyOptional({ description: 'Available actions' })
  actions?: MessageAction[];

  @ApiPropertyOptional({ description: 'Follow-up suggestions' })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'Whether human handoff is recommended' })
  requiresHumanHandoff?: boolean;

  @ApiPropertyOptional({ description: 'Response metadata' })
  metadata?: {
    processingTime?: number;
    workflowExecuted?: string;
    confidenceScore?: number;
  };
}

/**
 * Response DTO for product recommendations
 */
export class RecommendationsResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Product recommendations' })
  recommendations: ProductRecommendation[];

  @ApiProperty({ description: 'Total count of available recommendations' })
  totalCount: number;

  @ApiPropertyOptional({ description: 'Explanation for recommendations' })
  explanation?: string;

  @ApiPropertyOptional({ description: 'Algorithm used' })
  algorithm?: string;
}

/**
 * Response DTO for order assistance
 */
export class OrderAssistanceResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Assistance response message' })
  message: string;

  @ApiPropertyOptional({ description: 'Order status details' })
  orderStatus?: {
    status: string;
    lastUpdate: string;
    estimatedDelivery?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };

  @ApiPropertyOptional({ description: 'Available actions' })
  availableActions?: MessageAction[];

  @ApiPropertyOptional({ description: 'Next steps' })
  nextSteps?: string[];
}

/**
 * Response DTO for size guidance
 */
export class SizeGuidanceResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Recommended size' })
  recommendedSize: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;

  @ApiPropertyOptional({ description: 'Size alternatives' })
  alternatives?: Array<{
    size: string;
    fit: string;
    confidence: number;
  }>;

  @ApiPropertyOptional({ description: 'Size chart reference' })
  sizeChart?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Fit tips' })
  fitTips?: string[];
}

/**
 * Response DTO for gift finder
 */
export class GiftFinderResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Gift recommendations' })
  giftRecommendations: Array<ProductRecommendation & {
    giftScore: number;
    giftReason: string;
    giftWrapAvailable?: boolean;
    personalizeAvailable?: boolean;
  }>;

  @ApiPropertyOptional({ description: 'Gift message suggestions' })
  messageSuggestions?: string[];

  @ApiPropertyOptional({ description: 'Additional ideas' })
  additionalIdeas?: string[];
}

/**
 * Response DTO for checkout assistance
 */
export class CheckoutAssistanceResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Assistance response message' })
  message: string;

  @ApiPropertyOptional({ description: 'Available coupons' })
  availableCoupons?: Array<{
    code: string;
    description: string;
    discount: string;
    applicable: boolean;
  }>;

  @ApiPropertyOptional({ description: 'Shipping options' })
  shippingOptions?: Array<{
    method: string;
    price: number;
    estimatedDays: string;
    recommended?: boolean;
  }>;

  @ApiPropertyOptional({ description: 'Cart review suggestions' })
  cartSuggestions?: Array<{
    type: 'upsell' | 'crosssell' | 'bundle' | 'warning';
    message: string;
    product?: ProductRecommendation;
  }>;

  @ApiPropertyOptional({ description: 'Available actions' })
  actions?: MessageAction[];
}

/**
 * Response DTO for feedback submission
 */
export class ConciergeFeedbackResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Feedback ID' })
  feedbackId: string;

  @ApiProperty({ description: 'Thank you message' })
  message: string;

  @ApiPropertyOptional({ description: 'Follow-up action if needed' })
  followUpAction?: string;
}

/**
 * Response DTO for session end
 */
export class EndSessionResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Session summary' })
  summary: {
    duration: string;
    messageCount: number;
    productsViewed: number;
    actionsCompleted: string[];
  };

  @ApiPropertyOptional({ description: 'Farewell message' })
  farewellMessage?: string;
}

/**
 * Response DTO for human handoff
 */
export class HumanHandoffResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Handoff ticket ID' })
  ticketId: string;

  @ApiProperty({ description: 'Status of handoff' })
  status: 'queued' | 'connecting' | 'connected' | 'unavailable';

  @ApiProperty({ description: 'Estimated wait time' })
  estimatedWaitTime: string;

  @ApiPropertyOptional({ description: 'Agent information if connected' })
  agent?: {
    name: string;
    id: string;
  };

  @ApiPropertyOptional({ description: 'Instructions while waiting' })
  instructions?: string;
}

/**
 * Response DTO for conversation history
 */
export class ConversationHistoryResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Conversation messages' })
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    intent?: ShoppingIntent;
    products?: ProductRecommendation[];
  }>;

  @ApiProperty({ description: 'Total message count' })
  messageCount: number;

  @ApiPropertyOptional({ description: 'Session state' })
  sessionState?: ConciergeState;
}
