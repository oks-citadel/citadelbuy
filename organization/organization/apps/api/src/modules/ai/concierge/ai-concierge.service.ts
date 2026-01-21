/**
 * AI Shopping Concierge Service
 *
 * Combines chatbot, personalization, and conversational AI capabilities
 * to provide intelligent shopping assistance. Uses the AI Orchestrator
 * for multi-step workflows and integrates with the feature flag system.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// Services
import { ChatbotService, Message as ChatMessage } from '../chatbot/chatbot.service';
import { PersonalizationService } from '../personalization/personalization.service';
import { ConversationalService } from '../conversational/conversational.service';
import { AIOrchestratorService } from '../orchestrator/ai-orchestrator.service';
import { FeatureFlagsService } from '@/common/feature-flags';
import { FEATURE_FLAGS } from '@/common/feature-flags/feature-flags.interface';

// Interfaces
import {
  ConciergeSession,
  ConciergeContext,
  ConciergeMessage,
  ConciergeResponse,
  ShoppingIntent,
  ShoppingIntentType,
  ShoppingEntities,
  ProductRecommendation,
  MessageAction,
  MessageSentiment,
  ConciergeState,
  ConciergeCapabilities,
  ConciergeConfig,
  CONCIERGE_WORKFLOWS,
  UserShoppingPreferences,
} from './ai-concierge.interface';

// DTOs
import {
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
} from './dto/ai-concierge.dto';

import { IntentType } from '../chatbot/dto/chatbot.dto';

@Injectable()
export class AIConciergeService {
  private readonly logger = new Logger(AIConciergeService.name);

  // In-memory session storage (can be migrated to Redis/DB)
  private sessions: Map<string, ConciergeSession> = new Map();
  private feedback: Map<string, any> = new Map();
  private handoffRequests: Map<string, any> = new Map();

  // Configuration
  private readonly config: ConciergeConfig = {
    maxSessionDurationMinutes: 60,
    maxConversationHistory: 100,
    enabledCapabilities: {
      chat: true,
      productRecommendations: true,
      orderTracking: true,
      returnAssistance: true,
      sizeGuidance: true,
      styleAdvice: true,
      giftSuggestions: true,
      priceAlerts: true,
      inventoryNotifications: true,
      humanHandoff: true,
    },
    personalizedGreeting: true,
    proactiveAssistance: true,
    handoffThreshold: 0.3, // Escalate if confidence below 30%
  };

  // Session TTL
  private readonly SESSION_TTL_MS = this.config.maxSessionDurationMinutes * 60 * 1000;

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly personalizationService: PersonalizationService,
    private readonly conversationalService: ConversationalService,
    private readonly orchestratorService: AIOrchestratorService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * Check if AI Shopping Concierge feature is enabled
   */
  private async isFeatureEnabled(context?: Record<string, unknown>): Promise<boolean> {
    return this.featureFlagsService.isEnabled(FEATURE_FLAGS.AI_SHOPPING_CONCIERGE, context);
  }

  /**
   * Validate feature is enabled, throw if not
   */
  private async validateFeatureEnabled(userId?: string): Promise<void> {
    const isEnabled = await this.isFeatureEnabled({ userId });
    if (!isEnabled) {
      throw new ForbiddenException('AI Shopping Concierge feature is not currently available');
    }
  }

  /**
   * Start a new concierge session
   */
  async startSession(dto: StartConciergeSessionDto): Promise<ConciergeSessionResponseDto> {
    await this.validateFeatureEnabled(dto.userId);

    const startTime = Date.now();
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL_MS);

    try {
      // Get personalization data if user ID provided
      let userPreferences: UserShoppingPreferences | undefined;
      let personalizedGreeting = false;

      if (dto.userId && this.config.personalizedGreeting) {
        try {
          const personalizationData = await this.personalizationService.getPersonalizedRecommendations(dto.userId);
          if (personalizationData.success) {
            personalizedGreeting = true;
            // Extract preferences from personalization service
            userPreferences = await this.extractUserPreferences(dto.userId);
          }
        } catch (error) {
          this.logger.warn(`Failed to get personalization for user ${dto.userId}: ${error.message}`);
        }
      }

      // Create session
      const session: ConciergeSession = {
        sessionId,
        userId: dto.userId,
        startedAt: now,
        lastActivityAt: now,
        expiresAt,
        context: {
          userPreferences,
          ...((dto.initialContext || {}) as Partial<ConciergeContext>),
        },
        conversationHistory: [],
        state: 'greeting',
        metadata: {
          platform: dto.platform || 'web',
          language: dto.language || 'en',
        },
      };

      this.sessions.set(sessionId, session);

      // Generate welcome message
      const welcomeMessage = this.generateWelcomeMessage(session, dto.skipGreeting);
      const suggestions = this.getInitialSuggestions(session);

      // Add welcome message to history
      if (!dto.skipGreeting && welcomeMessage) {
        session.conversationHistory.push({
          id: uuidv4(),
          role: 'assistant',
          content: welcomeMessage,
          timestamp: now,
        });
      }

      this.logger.log(`Concierge session started: ${sessionId} (user: ${dto.userId || 'anonymous'})`);

      return {
        success: true,
        sessionId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        welcomeMessage: dto.skipGreeting ? undefined : welcomeMessage,
        suggestions,
        personalized: personalizedGreeting,
      };
    } catch (error) {
      this.logger.error(`Failed to start concierge session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send a message to the concierge and get a response
   */
  async sendMessage(dto: SendConciergeMessageDto): Promise<ConciergeMessageResponseDto> {
    const startTime = Date.now();

    const session = await this.getSession(dto.sessionId);
    await this.validateFeatureEnabled(session.userId);

    try {
      // Update session activity
      session.lastActivityAt = new Date();
      session.state = 'processing';

      // Add user message to history
      const userMessageId = uuidv4();
      const userMessage: ConciergeMessage = {
        id: userMessageId,
        role: 'user',
        content: dto.message,
        timestamp: new Date(),
      };

      // Analyze intent using chatbot service
      const intentAnalysis = await this.chatbotService.analyzeIntent({
        message: dto.message,
        context: dto.context,
      });

      // Map chatbot intent to shopping intent
      const shoppingIntent = this.mapToShoppingIntent(intentAnalysis);
      userMessage.intent = shoppingIntent;

      // Analyze sentiment
      const sentimentResult = await this.chatbotService.analyzeSentiment(dto.message);
      userMessage.sentiment = {
        label: sentimentResult.sentiment as 'positive' | 'negative' | 'neutral' | 'mixed',
        score: sentimentResult.confidence,
        urgency: this.determineUrgency(sentimentResult),
      };

      session.conversationHistory.push(userMessage);

      // Determine if we should use orchestrator workflow
      let response: ConciergeResponse;
      const shouldUseWorkflow = this.shouldUseWorkflow(shoppingIntent);

      if (shouldUseWorkflow) {
        response = await this.executeWorkflowResponse(session, shoppingIntent, dto);
      } else {
        response = await this.generateDirectResponse(session, shoppingIntent, dto);
      }

      // Check if human handoff is needed
      const requiresHandoff = this.shouldEscalateToHuman(response, userMessage.sentiment);

      // Create assistant message
      const assistantMessageId = uuidv4();
      const assistantMessage: ConciergeMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        products: response.products,
        actions: response.actions,
      };

      session.conversationHistory.push(assistantMessage);

      // Update session state
      session.state = requiresHandoff ? 'escalated' : 'waiting_input';
      session.context.currentIntent = shoppingIntent;

      // Trim conversation history if needed
      this.trimConversationHistory(session);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        sessionId: dto.sessionId,
        message: response.message,
        messageId: assistantMessageId,
        intent: shoppingIntent,
        sentiment: userMessage.sentiment,
        products: response.products,
        actions: response.actions,
        suggestions: this.getContextualSuggestions(session, shoppingIntent),
        requiresHumanHandoff: requiresHandoff,
        metadata: {
          processingTime,
          workflowExecuted: response.metadata?.workflowExecuted,
          confidenceScore: shoppingIntent.confidence,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process message: ${error.message}`, error.stack);
      session.state = 'waiting_input';
      throw error;
    }
  }

  /**
   * Get personalized product recommendations
   */
  async getRecommendations(dto: GetRecommendationsDto): Promise<RecommendationsResponseDto> {
    const session = await this.getSession(dto.sessionId);
    await this.validateFeatureEnabled(session.userId);

    try {
      const userId = dto.userId || session.userId;
      let recommendations: ProductRecommendation[] = [];
      let algorithm = 'default';

      if (userId) {
        // Use personalization service
        const personalizedRecs = await this.personalizationService.getPersonalizedRecommendations(userId);
        if (personalizedRecs.success) {
          recommendations = personalizedRecs.recommendations.map(rec => this.mapToProductRecommendation(rec));
          algorithm = personalizedRecs.algorithm || 'collaborative-filtering';
        }
      }

      // Apply filters
      if (dto.category) {
        recommendations = recommendations.filter(r =>
          r.recommendationReason?.toLowerCase().includes(dto.category!.toLowerCase())
        );
      }

      if (dto.minPrice !== undefined) {
        recommendations = recommendations.filter(r => r.price >= dto.minPrice!);
      }

      if (dto.maxPrice !== undefined) {
        recommendations = recommendations.filter(r => r.price <= dto.maxPrice!);
      }

      // Apply limit
      const limit = dto.limit || 10;
      const totalCount = recommendations.length;
      recommendations = recommendations.slice(0, limit);

      return {
        success: true,
        sessionId: dto.sessionId,
        recommendations,
        totalCount,
        explanation: this.generateRecommendationExplanation(dto, recommendations),
        algorithm,
      };
    } catch (error) {
      this.logger.error(`Failed to get recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get order assistance
   */
  async getOrderAssistance(dto: OrderAssistanceDto): Promise<OrderAssistanceResponseDto> {
    const session = await this.getSession(dto.sessionId);
    await this.validateFeatureEnabled(session.userId);

    try {
      // In production, this would query order service
      const orderStatus = this.getMockOrderStatus(dto.orderId);
      const message = this.generateOrderAssistanceMessage(dto.assistanceType, orderStatus);
      const availableActions = this.getOrderActions(dto.assistanceType, orderStatus);

      return {
        success: true,
        sessionId: dto.sessionId,
        orderId: dto.orderId,
        message,
        orderStatus,
        availableActions,
        nextSteps: this.getOrderNextSteps(dto.assistanceType),
      };
    } catch (error) {
      this.logger.error(`Failed to get order assistance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get size guidance for a product
   */
  async getSizeGuidance(dto: SizeGuidanceDto): Promise<SizeGuidanceResponseDto> {
    const session = await this.getSession(dto.sessionId);
    await this.validateFeatureEnabled(session.userId);

    try {
      // In production, this would use ML model and product data
      const recommendedSize = this.calculateRecommendedSize(dto);
      const confidence = 0.85;
      const alternatives = [
        { size: this.getNextSize(recommendedSize, 'down'), fit: 'Tighter fit', confidence: 0.7 },
        { size: this.getNextSize(recommendedSize, 'up'), fit: 'Looser fit', confidence: 0.75 },
      ];

      return {
        success: true,
        sessionId: dto.sessionId,
        recommendedSize,
        confidence,
        alternatives,
        sizeChart: this.getMockSizeChart(),
        fitTips: this.getFitTips(dto.productId),
      };
    } catch (error) {
      this.logger.error(`Failed to get size guidance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find gift recommendations
   */
  async findGifts(dto: GiftFinderDto): Promise<GiftFinderResponseDto> {
    const session = await this.getSession(dto.sessionId);
    await this.validateFeatureEnabled(session.userId);

    try {
      // Use orchestrator for gift finding workflow if available
      let giftRecommendations: Array<ProductRecommendation & {
        giftScore: number;
        giftReason: string;
        giftWrapAvailable?: boolean;
        personalizeAvailable?: boolean;
      }> = [];

      // Get base recommendations
      const baseRecs = await this.personalizationService.getPersonalizedRecommendations(
        session.userId || 'anonymous'
      );

      if (baseRecs.success) {
        giftRecommendations = baseRecs.recommendations.map(rec => ({
          ...this.mapToProductRecommendation(rec),
          giftScore: this.calculateGiftScore(rec, dto),
          giftReason: this.generateGiftReason(dto),
          giftWrapAvailable: Math.random() > 0.3,
          personalizeAvailable: Math.random() > 0.5,
        }));
      }

      // Sort by gift score
      giftRecommendations.sort((a, b) => b.giftScore - a.giftScore);

      // Apply budget filter
      if (dto.budget) {
        giftRecommendations = giftRecommendations.filter(g => g.price <= dto.budget!);
      }

      return {
        success: true,
        sessionId: dto.sessionId,
        giftRecommendations: giftRecommendations.slice(0, 10),
        messageSuggestions: this.getGiftMessageSuggestions(dto.occasion),
        additionalIdeas: this.getAdditionalGiftIdeas(dto),
      };
    } catch (error) {
      this.logger.error(`Failed to find gifts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get checkout assistance
   */
  async getCheckoutAssistance(dto: CheckoutAssistanceDto): Promise<CheckoutAssistanceResponseDto> {
    const session = await this.getSession(dto.sessionId);
    await this.validateFeatureEnabled(session.userId);

    try {
      const message = this.generateCheckoutAssistanceMessage(dto.assistanceType);

      return {
        success: true,
        sessionId: dto.sessionId,
        message,
        availableCoupons: dto.assistanceType === 'coupon_suggestion' ? this.getMockCoupons() : undefined,
        shippingOptions: dto.assistanceType === 'shipping_options' ? this.getMockShippingOptions() : undefined,
        cartSuggestions: dto.assistanceType === 'cart_review' ? this.getMockCartSuggestions() : undefined,
        actions: this.getCheckoutActions(dto.assistanceType),
      };
    } catch (error) {
      this.logger.error(`Failed to get checkout assistance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Submit feedback for the concierge session
   */
  async submitFeedback(dto: SubmitConciergeFeedbackDto): Promise<ConciergeFeedbackResponseDto> {
    const session = await this.getSession(dto.sessionId);

    try {
      const feedbackId = uuidv4();
      const feedbackEntry = {
        feedbackId,
        sessionId: dto.sessionId,
        userId: session.userId,
        rating: dto.rating,
        comment: dto.comment,
        messageId: dto.messageId,
        issueResolved: dto.issueResolved,
        tags: dto.tags,
        createdAt: new Date().toISOString(),
      };

      this.feedback.set(feedbackId, feedbackEntry);
      this.logger.log(`Feedback received: ${feedbackId}, rating: ${dto.rating}`);

      let followUpAction: string | undefined;
      if (dto.rating <= 2) {
        followUpAction = 'A customer service representative will reach out to address your concerns.';
      }

      return {
        success: true,
        feedbackId,
        message: 'Thank you for your feedback! It helps us improve your shopping experience.',
        followUpAction,
      };
    } catch (error) {
      this.logger.error(`Failed to submit feedback: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * End a concierge session
   */
  async endSession(dto: EndConciergeSessionDto): Promise<EndSessionResponseDto> {
    const session = await this.getSession(dto.sessionId);

    try {
      const startTime = session.startedAt.getTime();
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      const durationMinutes = Math.round(durationMs / 60000);

      // Calculate session summary
      const messageCount = session.conversationHistory.length;
      const productsViewed = this.countProductsViewed(session);
      const actionsCompleted = this.getCompletedActions(session);

      session.state = 'ended';

      // Archive and remove session
      this.logger.log(`Concierge session ended: ${dto.sessionId}, messages: ${messageCount}`);
      this.sessions.delete(dto.sessionId);

      return {
        success: true,
        sessionId: dto.sessionId,
        summary: {
          duration: `${durationMinutes} minutes`,
          messageCount,
          productsViewed,
          actionsCompleted,
        },
        farewellMessage: this.generateFarewellMessage(session, dto.reason),
      };
    } catch (error) {
      this.logger.error(`Failed to end session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Request handoff to human agent
   */
  async requestHumanHandoff(dto: RequestHumanHandoffDto): Promise<HumanHandoffResponseDto> {
    const session = await this.getSession(dto.sessionId);
    await this.validateFeatureEnabled(session.userId);

    try {
      const ticketId = `CONCIERGE-${Date.now()}`;
      const handoffRequest = {
        ticketId,
        sessionId: dto.sessionId,
        userId: session.userId,
        reason: dto.reason,
        priority: dto.priority || 'normal',
        preferredContact: dto.preferredContact || 'chat',
        conversationSummary: this.summarizeConversation(session),
        createdAt: new Date().toISOString(),
      };

      this.handoffRequests.set(ticketId, handoffRequest);
      session.state = 'escalated';

      this.logger.log(`Human handoff requested: ${ticketId} for session ${dto.sessionId}`);

      return {
        success: true,
        sessionId: dto.sessionId,
        ticketId,
        status: 'queued',
        estimatedWaitTime: this.estimateWaitTime(dto.priority),
        instructions: 'A customer service representative will be with you shortly. Please stay in the chat.',
      };
    } catch (error) {
      this.logger.error(`Failed to request handoff: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<ConversationHistoryResponseDto> {
    const session = await this.getSession(sessionId);

    return {
      success: true,
      sessionId,
      messages: session.conversationHistory.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        intent: msg.intent,
        products: msg.products,
      })),
      messageCount: session.conversationHistory.length,
      sessionState: session.state,
    };
  }

  // ==================== Private Helper Methods ====================

  private async getSession(sessionId: string): Promise<ConciergeSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Concierge session ${sessionId} not found`);
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      throw new NotFoundException(`Concierge session ${sessionId} has expired`);
    }

    return session;
  }

  private async extractUserPreferences(userId: string): Promise<UserShoppingPreferences> {
    // In production, this would extract from user profile and behavior data
    return {
      favoriteCategories: ['Electronics', 'Fashion'],
      preferredBrands: [],
      priceRange: { min: 0, max: 1000 },
    };
  }

  private generateWelcomeMessage(session: ConciergeSession, skipGreeting?: boolean): string {
    if (skipGreeting) return '';

    const userName = session.context.userPreferences ? 'there' : 'there';
    const greeting = this.getTimeBasedGreeting();

    return `${greeting}! I'm your AI Shopping Concierge. I can help you find products, track orders, get size recommendations, and much more. How can I assist you today?`;
  }

  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  private getInitialSuggestions(session: ConciergeSession): string[] {
    const suggestions = [
      'Help me find a product',
      'Track my recent order',
      'Show me today\'s deals',
      'I need size guidance',
      'Find a gift for someone',
    ];

    if (session.context.userPreferences?.favoriteCategories?.length) {
      const category = session.context.userPreferences.favoriteCategories[0];
      suggestions.unshift(`Show me new arrivals in ${category}`);
    }

    return suggestions.slice(0, 5);
  }

  private mapToShoppingIntent(intentAnalysis: any): ShoppingIntent {
    const intentTypeMap: Record<IntentType, ShoppingIntentType> = {
      [IntentType.ORDER_TRACKING]: 'order_tracking',
      [IntentType.RETURN_REQUEST]: 'return_request',
      [IntentType.PRODUCT_INQUIRY]: 'product_search',
      [IntentType.PRICE_CHECK]: 'price_inquiry',
      [IntentType.AVAILABILITY_CHECK]: 'availability_check',
      [IntentType.RECOMMENDATION]: 'product_recommendation',
      [IntentType.GENERAL_SUPPORT]: 'general_inquiry',
      [IntentType.GENERAL_INQUIRY]: 'general_inquiry',
    };

    const primaryIntent = intentAnalysis.primaryIntent as IntentType;
    return {
      type: intentTypeMap[primaryIntent] || 'general_inquiry',
      confidence: intentAnalysis.confidence,
      entities: intentAnalysis.entities || {},
    };
  }

  private determineUrgency(sentimentResult: any): 'low' | 'medium' | 'high' {
    if (sentimentResult.sentiment === 'negative' && sentimentResult.confidence > 0.8) {
      return 'high';
    }
    if (sentimentResult.sentiment === 'negative') {
      return 'medium';
    }
    return 'low';
  }

  private shouldUseWorkflow(intent: ShoppingIntent): boolean {
    const workflowIntents: ShoppingIntentType[] = [
      'product_recommendation',
      'gift_suggestion',
      'order_tracking',
      'return_request',
    ];
    return workflowIntents.includes(intent.type) && intent.confidence > 0.7;
  }

  private async executeWorkflowResponse(
    session: ConciergeSession,
    intent: ShoppingIntent,
    dto: SendConciergeMessageDto,
  ): Promise<ConciergeResponse> {
    try {
      // Execute shopping assistant workflow
      const workflowResult = await this.orchestratorService.executeWorkflow(
        CONCIERGE_WORKFLOWS.PRODUCT_DISCOVERY,
        {
          message: dto.message,
          userId: session.userId,
          sessionId: session.sessionId,
          intent: intent,
          context: dto.context,
        },
      );

      if (workflowResult.status === 'completed' && workflowResult.output) {
        const output = workflowResult.output as any;
        return {
          success: true,
          sessionId: session.sessionId,
          message: output.response || this.generateResponseForIntent(intent),
          intent,
          products: output.products || [],
          actions: this.getActionsForIntent(intent),
          metadata: {
            workflowExecuted: CONCIERGE_WORKFLOWS.PRODUCT_DISCOVERY,
            processingTime: workflowResult.duration,
          },
        };
      }
    } catch (error) {
      this.logger.warn(`Workflow execution failed, falling back to direct response: ${error.message}`);
    }

    // Fallback to direct response
    return this.generateDirectResponse(session, intent, dto);
  }

  private async generateDirectResponse(
    session: ConciergeSession,
    intent: ShoppingIntent,
    dto: SendConciergeMessageDto,
  ): Promise<ConciergeResponse> {
    // Use conversational service for natural language response
    let products: ProductRecommendation[] = [];

    if (['product_search', 'product_recommendation', 'availability_check'].includes(intent.type)) {
      try {
        const conversationalResult = await this.conversationalService.processQuery({
          query: dto.message,
          userId: session.userId,
        });

        if (conversationalResult.success && conversationalResult.products) {
          products = conversationalResult.products.map(p => this.mapToProductRecommendation(p));
        }
      } catch (error) {
        this.logger.warn(`Conversational query failed: ${error.message}`);
      }
    }

    const message = this.generateResponseForIntent(intent, products);

    return {
      success: true,
      sessionId: session.sessionId,
      message,
      intent,
      products,
      actions: this.getActionsForIntent(intent),
    };
  }

  private generateResponseForIntent(intent: ShoppingIntent, products?: ProductRecommendation[]): string {
    const responses: Record<ShoppingIntentType, string> = {
      product_search: products?.length
        ? `I found ${products.length} products that match what you're looking for. Here are my top recommendations.`
        : "I'm searching for products that match your criteria. Could you tell me more about what you're looking for?",
      product_recommendation: 'Based on your preferences and browsing history, I think you\'ll love these products.',
      product_comparison: 'Let me help you compare these products side by side.',
      price_inquiry: 'I can help you find the best prices. Which product would you like me to check?',
      availability_check: 'Let me check the availability for you.',
      order_tracking: 'I can help you track your order. Please provide your order number or I can look up your recent orders.',
      order_modification: 'I can help you modify your order. What changes would you like to make?',
      return_request: 'I understand you\'d like to return an item. I\'ll guide you through the process.',
      refund_inquiry: 'I can check on your refund status. Let me look that up for you.',
      size_guidance: 'I\'d be happy to help you find the perfect size. Let me guide you through our sizing.',
      style_advice: 'Great! I\'d love to help you with style recommendations.',
      gift_suggestion: 'Finding the perfect gift is exciting! Tell me about the person you\'re shopping for.',
      deal_finding: 'Let me find the best deals for you right now.',
      wishlist_management: 'I can help you manage your wishlist.',
      cart_assistance: 'I\'m here to help with your cart. What would you like to do?',
      checkout_help: 'I can help you complete your checkout smoothly.',
      general_inquiry: 'How can I help you today?',
      feedback: 'Thank you for sharing your feedback. Your input helps us improve.',
      complaint: 'I\'m sorry to hear you\'re having an issue. Let me help resolve this for you.',
    };

    return responses[intent.type] || responses.general_inquiry;
  }

  private getActionsForIntent(intent: ShoppingIntent): MessageAction[] {
    const actionMap: Record<ShoppingIntentType, MessageAction[]> = {
      product_search: [
        { type: 'view_product', label: 'View Details' },
        { type: 'add_to_cart', label: 'Add to Cart' },
        { type: 'view_similar', label: 'View Similar' },
      ],
      product_recommendation: [
        { type: 'view_product', label: 'View Details' },
        { type: 'add_to_wishlist', label: 'Save for Later' },
      ],
      product_comparison: [
        { type: 'compare_products', label: 'Compare' },
        { type: 'view_product', label: 'View Details' },
      ],
      order_tracking: [
        { type: 'track_order', label: 'Track Order' },
        { type: 'contact_support', label: 'Contact Support' },
      ],
      return_request: [
        { type: 'start_return', label: 'Start Return' },
        { type: 'contact_support', label: 'Contact Support' },
      ],
      checkout_help: [
        { type: 'proceed_checkout', label: 'Proceed to Checkout' },
        { type: 'apply_coupon', label: 'Apply Coupon' },
      ],
      price_inquiry: [],
      availability_check: [{ type: 'notify_availability', label: 'Notify When Available' }],
      order_modification: [{ type: 'contact_support', label: 'Contact Support' }],
      refund_inquiry: [{ type: 'contact_support', label: 'Contact Support' }],
      size_guidance: [{ type: 'view_product', label: 'View Product' }],
      style_advice: [{ type: 'view_similar', label: 'View Suggestions' }],
      gift_suggestion: [{ type: 'view_product', label: 'View Gift Ideas' }],
      deal_finding: [{ type: 'view_product', label: 'View Deals' }],
      wishlist_management: [{ type: 'add_to_wishlist', label: 'View Wishlist' }],
      cart_assistance: [{ type: 'proceed_checkout', label: 'Go to Cart' }],
      general_inquiry: [{ type: 'contact_support', label: 'Contact Support' }],
      feedback: [],
      complaint: [{ type: 'contact_support', label: 'Contact Support' }],
    };

    return actionMap[intent.type] || [];
  }

  private getContextualSuggestions(session: ConciergeSession, intent: ShoppingIntent): string[] {
    const baseSuggestions = [
      'Show me more options',
      'Help me with something else',
    ];

    const intentSuggestions: Record<ShoppingIntentType, string[]> = {
      product_search: ['Filter by price', 'Show different colors', 'Sort by rating'],
      product_recommendation: ['Show me more like this', 'Different category', 'Under $50'],
      order_tracking: ['Where is my package?', 'Change delivery address', 'Contact carrier'],
      return_request: ['Start return process', 'Check return policy', 'Exchange instead'],
      checkout_help: ['Apply a coupon', 'Change shipping method', 'Review my cart'],
      price_inquiry: ['Compare prices', 'Price drop alert', 'Find similar for less'],
      availability_check: ['Notify when available', 'Find alternatives', 'Check other locations'],
      product_comparison: ['Add another product', 'Show price comparison', 'View reviews'],
      order_modification: ['Cancel order', 'Change quantity', 'Update shipping'],
      refund_inquiry: ['Check refund status', 'Refund timeline', 'Refund to different method'],
      size_guidance: ['Size chart', 'Fit photos', 'Ask about material'],
      style_advice: ['Show outfit ideas', 'Trending styles', 'What goes with this'],
      gift_suggestion: ['Add gift wrap', 'Include message', 'Different budget'],
      deal_finding: ['Flash sales', 'Clearance', 'Bundle deals'],
      wishlist_management: ['Move to cart', 'Share wishlist', 'Price alerts'],
      cart_assistance: ['Remove item', 'Save for later', 'Check for coupons'],
      general_inquiry: ['Browse categories', 'Contact support', 'Account help'],
      feedback: ['Submit feedback', 'Rate experience', 'Suggest improvement'],
      complaint: ['Speak to manager', 'File complaint', 'Request callback'],
    };

    return [...(intentSuggestions[intent.type] || []), ...baseSuggestions].slice(0, 4);
  }

  private shouldEscalateToHuman(response: ConciergeResponse, sentiment?: MessageSentiment): boolean {
    if (!this.config.enabledCapabilities.humanHandoff) return false;

    // Escalate on high urgency negative sentiment
    if (sentiment?.urgency === 'high' && sentiment.label === 'negative') {
      return true;
    }

    // Escalate on low confidence
    if (response.intent && response.intent.confidence < this.config.handoffThreshold) {
      return true;
    }

    return false;
  }

  private trimConversationHistory(session: ConciergeSession): void {
    if (session.conversationHistory.length > this.config.maxConversationHistory) {
      // Keep the first message (greeting) and trim older messages
      const firstMessage = session.conversationHistory[0];
      session.conversationHistory = [
        firstMessage,
        ...session.conversationHistory.slice(-(this.config.maxConversationHistory - 1)),
      ];
    }
  }

  private mapToProductRecommendation(product: any): ProductRecommendation {
    return {
      productId: product.id || product.productId,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      rating: product.rating,
      reviewCount: product.reviewCount,
      inStock: product.inStock !== false,
      relevanceScore: product.score || product.relevance || 0.8,
      recommendationReason: product.reason || 'Recommended for you',
      badges: product.badges,
    };
  }

  private generateRecommendationExplanation(dto: GetRecommendationsDto, recommendations: ProductRecommendation[]): string {
    if (recommendations.length === 0) {
      return 'No matching products found with the current filters.';
    }

    const parts = ['These recommendations are based on'];
    if (dto.userId) parts.push('your preferences');
    if (dto.category) parts.push(`the ${dto.category} category`);
    if (dto.minPrice || dto.maxPrice) {
      const priceRange = dto.minPrice && dto.maxPrice
        ? `$${dto.minPrice}-$${dto.maxPrice}`
        : dto.maxPrice ? `under $${dto.maxPrice}` : `over $${dto.minPrice}`;
      parts.push(`your price range of ${priceRange}`);
    }

    return parts.length > 1 ? parts.join(', ') + '.' : 'Based on popular products.';
  }

  private getMockOrderStatus(orderId: string): any {
    return {
      status: 'in_transit',
      lastUpdate: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      trackingNumber: 'TRK123456789',
      trackingUrl: 'https://tracking.example.com/TRK123456789',
    };
  }

  private generateOrderAssistanceMessage(assistanceType: string, orderStatus: any): string {
    const messages: Record<string, string> = {
      tracking: `Your order is currently ${orderStatus.status.replace('_', ' ')}. Estimated delivery: ${new Date(orderStatus.estimatedDelivery).toLocaleDateString()}.`,
      modification: 'I can help you modify your order. Please note that modifications are only possible before the order ships.',
      cancellation: 'Would you like to cancel your order? I can help you with that if the order hasn\'t shipped yet.',
      return: 'I can help you start a return. Let me guide you through the process.',
      refund: 'Let me check on your refund status.',
      general: 'How can I help you with your order?',
    };
    return messages[assistanceType] || messages.general;
  }

  private getOrderActions(assistanceType: string, orderStatus: any): MessageAction[] {
    return [
      { type: 'track_order', label: 'View Tracking', data: { trackingUrl: orderStatus.trackingUrl } },
      { type: 'contact_support', label: 'Contact Support' },
    ];
  }

  private getOrderNextSteps(assistanceType: string): string[] {
    const stepsMap: Record<string, string[]> = {
      tracking: ['Check carrier website', 'Contact us if delayed'],
      modification: ['Review order details', 'Contact us within 24 hours'],
      cancellation: ['Confirm cancellation', 'Expect refund in 3-5 days'],
      return: ['Package the item', 'Print return label', 'Drop off at carrier'],
      refund: ['Refund processed within 5-7 business days', 'Check original payment method'],
      general: ['Check order status', 'Contact support if needed'],
    };
    return stepsMap[assistanceType] || stepsMap.general;
  }

  private calculateRecommendedSize(dto: SizeGuidanceDto): string {
    // Simplified size calculation - in production use ML model
    if (dto.measurements) {
      const { chest, waist } = dto.measurements;
      if (chest && chest < 90) return 'S';
      if (chest && chest < 100) return 'M';
      if (chest && chest < 110) return 'L';
      return 'XL';
    }

    if (dto.previousSizes?.length) {
      const perfectFit = dto.previousSizes.find(s => s.fit === 'perfect');
      if (perfectFit) return perfectFit.size;
    }

    return 'M';
  }

  private getNextSize(size: string, direction: 'up' | 'down'): string {
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const index = sizes.indexOf(size);
    if (direction === 'up' && index < sizes.length - 1) return sizes[index + 1];
    if (direction === 'down' && index > 0) return sizes[index - 1];
    return size;
  }

  private getMockSizeChart(): Record<string, unknown> {
    return {
      S: { chest: '34-36', waist: '28-30', hips: '35-37' },
      M: { chest: '38-40', waist: '32-34', hips: '39-41' },
      L: { chest: '42-44', waist: '36-38', hips: '43-45' },
      XL: { chest: '46-48', waist: '40-42', hips: '47-49' },
    };
  }

  private getFitTips(productId: string): string[] {
    return [
      'This item runs true to size',
      'Consider sizing up if between sizes',
      'Check the model measurements in photos',
    ];
  }

  private calculateGiftScore(product: any, dto: GiftFinderDto): number {
    let score = 0.5;
    if (dto.budget && product.price <= dto.budget) score += 0.2;
    if (dto.recipientInterests?.length) score += 0.15;
    if (dto.occasion) score += 0.15;
    return Math.min(score, 1);
  }

  private generateGiftReason(dto: GiftFinderDto): string {
    return `Perfect for ${dto.occasion || 'any occasion'}`;
  }

  private getGiftMessageSuggestions(occasion: string): string[] {
    const suggestions: Record<string, string[]> = {
      birthday: ['Happy Birthday!', 'Wishing you the best day!', 'Another year more amazing!'],
      anniversary: ['Cheers to us!', 'To many more years together!', 'With all my love'],
      wedding: ['Congratulations!', 'Best wishes!', 'Here\'s to happily ever after'],
      holiday: ['Happy Holidays!', 'Season\'s Greetings!', 'Warmest wishes'],
    };
    return suggestions[occasion?.toLowerCase()] || ['Thinking of you!', 'With love', 'Enjoy!'];
  }

  private getAdditionalGiftIdeas(dto: GiftFinderDto): string[] {
    return [
      'Gift cards are always appreciated',
      'Consider a subscription box',
      'Experiences make memorable gifts',
    ];
  }

  private generateCheckoutAssistanceMessage(assistanceType: string): string {
    const messages: Record<string, string> = {
      payment_help: 'I can help you with payment options. We accept all major credit cards, PayPal, and more.',
      shipping_options: 'Here are the available shipping options for your order.',
      coupon_suggestion: 'Let me find the best coupons for your cart!',
      cart_review: 'I\'ve reviewed your cart and have some suggestions to improve your order.',
      general: 'How can I help you complete your checkout?',
    };
    return messages[assistanceType] || messages.general;
  }

  private getMockCoupons(): Array<{ code: string; description: string; discount: string; applicable: boolean }> {
    return [
      { code: 'SAVE10', description: '10% off your order', discount: '10%', applicable: true },
      { code: 'FREESHIP', description: 'Free standard shipping', discount: 'Free Shipping', applicable: true },
    ];
  }

  private getMockShippingOptions(): Array<{ method: string; price: number; estimatedDays: string; recommended?: boolean }> {
    return [
      { method: 'Standard Shipping', price: 4.99, estimatedDays: '5-7 business days' },
      { method: 'Express Shipping', price: 12.99, estimatedDays: '2-3 business days', recommended: true },
      { method: 'Same Day Delivery', price: 19.99, estimatedDays: 'Today' },
    ];
  }

  private getMockCartSuggestions(): Array<{ type: 'upsell' | 'crosssell' | 'bundle' | 'warning'; message: string; product?: ProductRecommendation }> {
    return [
      { type: 'bundle', message: 'Complete the look with matching accessories' },
      { type: 'upsell', message: 'Upgrade to premium version for better quality' },
    ];
  }

  private getCheckoutActions(assistanceType: string): MessageAction[] {
    return [
      { type: 'proceed_checkout', label: 'Continue to Checkout' },
      { type: 'apply_coupon', label: 'Apply Coupon' },
    ];
  }

  private countProductsViewed(session: ConciergeSession): number {
    let count = 0;
    session.conversationHistory.forEach(msg => {
      if (msg.products) count += msg.products.length;
    });
    return count;
  }

  private getCompletedActions(session: ConciergeSession): string[] {
    const actions: string[] = [];
    session.conversationHistory.forEach(msg => {
      if (msg.actions) {
        msg.actions.forEach(a => actions.push(a.label));
      }
    });
    return [...new Set(actions)];
  }

  private generateFarewellMessage(session: ConciergeSession, reason?: string): string {
    const messages = [
      'Thank you for shopping with us! Have a great day.',
      'It was my pleasure to assist you. See you again soon!',
      'Thanks for chatting! Come back anytime you need help.',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private summarizeConversation(session: ConciergeSession): string {
    const recentMessages = session.conversationHistory.slice(-5);
    return recentMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n');
  }

  private estimateWaitTime(priority?: string): string {
    const times: Record<string, string> = {
      urgent: '< 1 minute',
      high: '2-3 minutes',
      normal: '5-10 minutes',
      low: '10-15 minutes',
    };
    return times[priority || 'normal'];
  }
}
