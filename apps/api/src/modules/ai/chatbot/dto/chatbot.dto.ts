import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum FeedbackRating {
  VERY_HELPFUL = 5,
  HELPFUL = 4,
  NEUTRAL = 3,
  NOT_HELPFUL = 2,
  VERY_UNHELPFUL = 1,
}

export enum IntentType {
  ORDER_TRACKING = 'order_tracking',
  RETURN_REQUEST = 'return_request',
  PRODUCT_INQUIRY = 'product_inquiry',
  GENERAL_SUPPORT = 'general_support',
  GENERAL_INQUIRY = 'general_inquiry',
  PRICE_CHECK = 'price_check',
  AVAILABILITY_CHECK = 'availability_check',
  RECOMMENDATION = 'recommendation',
}

// Request DTOs
export class StartSessionDto {
  @ApiPropertyOptional({ description: 'User ID (optional for anonymous sessions)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Initial context for the session' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Platform identifier (web, mobile, etc.)' })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message to send to the chatbot', example: 'Where is my order?' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'User ID for personalization' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID for conversation continuity' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class AnalyzeSentimentDto {
  @ApiProperty({ description: 'Message to analyze', example: 'I love your products!' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Session ID for the conversation' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Message ID the feedback refers to' })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({ description: 'Feedback rating (1-5)', enum: FeedbackRating, example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Additional feedback comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'User ID who submitted feedback' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class SuggestedQuestionsDto {
  @ApiPropertyOptional({ description: 'Session ID for context-aware suggestions' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Category to focus suggestions on' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'User ID for personalized suggestions' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of suggestions', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class AnalyzeIntentDto {
  @ApiProperty({ description: 'Message to analyze for intent', example: 'I want to return my order' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Session context for better analysis' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class RequestHandoffDto {
  @ApiProperty({ description: 'User ID requesting handoff' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Reason for handoff request', example: 'Complex issue with order' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Priority level', example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;
}

// Mobile chat endpoint DTO
export class MobileChatDto {
  @ApiProperty({ description: 'Message to send', example: 'Show me trending products' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Additional context (order ID, product ID, etc.)' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

// Response DTOs
export class SessionResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Unique session identifier' })
  sessionId: string;

  @ApiProperty({ description: 'Session creation timestamp' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Session expiry timestamp' })
  expiresAt?: string;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Chatbot response message' })
  response: string;

  @ApiProperty({ description: 'Sentiment analysis result' })
  sentiment: {
    sentiment: string;
    confidence: number;
    message: string;
  };

  @ApiProperty({ description: 'Detected intent' })
  intent: {
    type: string;
    confidence: number;
  };

  @ApiProperty({ description: 'Whether human handoff is recommended' })
  needsHandoff: boolean;

  @ApiPropertyOptional({ description: 'Session ID' })
  sessionId?: string;
}

export class ConversationHistoryResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Conversation messages' })
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sentiment?: string;
  }>;

  @ApiProperty({ description: 'Total message count' })
  messageCount: number;
}

export class FeedbackResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Feedback ID' })
  feedbackId: string;

  @ApiProperty({ description: 'Acknowledgment message' })
  message: string;
}

export class SuggestedQuestionsResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'List of suggested questions' })
  questions: Array<{
    text: string;
    category: string;
    priority: number;
  }>;
}

export class IntentAnalysisResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Primary detected intent', enum: IntentType })
  primaryIntent: IntentType;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;

  @ApiProperty({ description: 'Extracted entities from message' })
  entities: Record<string, any>;

  @ApiPropertyOptional({ description: 'Secondary intents if detected' })
  secondaryIntents?: Array<{
    type: IntentType;
    confidence: number;
  }>;
}

export class MobileChatResponseDto {
  @ApiProperty({ description: 'Chatbot response text' })
  response: string;

  @ApiPropertyOptional({ description: 'Related products if applicable' })
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image?: string;
  }>;

  @ApiPropertyOptional({ description: 'Suggested follow-up questions' })
  suggestions?: string[];
}

export class HandoffResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Handoff status' })
  status: string;

  @ApiProperty({ description: 'Estimated wait time' })
  estimatedWaitTime: string;

  @ApiProperty({ description: 'Support ticket ID' })
  ticketId: string;
}
