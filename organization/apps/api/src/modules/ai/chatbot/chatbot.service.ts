import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  StartSessionDto,
  SendMessageDto,
  SubmitFeedbackDto,
  SuggestedQuestionsDto,
  AnalyzeIntentDto,
  MobileChatDto,
  IntentType,
} from './dto/chatbot.dto';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sentiment?: string;
}

export interface ChatSession {
  sessionId: string;
  userId?: string;
  messages: Message[];
  context?: Record<string, any>;
  platform?: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

export interface Feedback {
  feedbackId: string;
  sessionId: string;
  messageId: string;
  rating: number;
  comment?: string;
  userId?: string;
  createdAt: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  // In-memory storage (can be migrated to DB later)
  private sessions: Map<string, ChatSession> = new Map();
  private conversations: Map<string, Message[]> = new Map();
  private feedback: Map<string, Feedback> = new Map();

  // Session TTL in milliseconds (1 hour)
  private readonly SESSION_TTL = 60 * 60 * 1000;

  /**
   * Start a new chat session
   */
  async startSession(dto: StartSessionDto): Promise<{
    success: boolean;
    sessionId: string;
    createdAt: string;
    expiresAt: string;
  }> {
    try {
      const sessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.SESSION_TTL);

      const session: ChatSession = {
        sessionId,
        userId: dto.userId,
        messages: [],
        context: dto.context || {},
        platform: dto.platform || 'web',
        createdAt: now.toISOString(),
        lastActivity: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      this.sessions.set(sessionId, session);
      this.logger.log(`New chat session started: ${sessionId}`);

      return {
        success: true,
        sessionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      this.logger.error('Failed to start session', error);
      throw error;
    }
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: string): Promise<{
    success: boolean;
    sessionId: string;
    messageCount: number;
    duration: string;
  }> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const startTime = new Date(session.createdAt).getTime();
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      const durationMinutes = Math.round(durationMs / 60000);

      const messageCount = session.messages.length;

      // Archive session data if needed before deletion
      this.logger.log(`Ending chat session: ${sessionId}, messages: ${messageCount}`);

      this.sessions.delete(sessionId);

      return {
        success: true,
        sessionId,
        messageCount,
        duration: `${durationMinutes} minutes`,
      };
    } catch (error) {
      this.logger.error(`Failed to end session ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Get conversation history by session ID
   */
  async getSessionHistory(sessionId: string): Promise<{
    success: boolean;
    sessionId: string;
    messages: Message[];
    messageCount: number;
  }> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // Update last activity
      session.lastActivity = new Date().toISOString();

      return {
        success: true,
        sessionId,
        messages: session.messages,
        messageCount: session.messages.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get session history: ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Store user feedback on a response
   */
  async submitFeedback(dto: SubmitFeedbackDto): Promise<{
    success: boolean;
    feedbackId: string;
    message: string;
  }> {
    try {
      const session = this.sessions.get(dto.sessionId);

      if (!session) {
        throw new NotFoundException(`Session ${dto.sessionId} not found`);
      }

      const feedbackId = uuidv4();

      const feedbackEntry: Feedback = {
        feedbackId,
        sessionId: dto.sessionId,
        messageId: dto.messageId,
        rating: dto.rating,
        comment: dto.comment,
        userId: dto.userId,
        createdAt: new Date().toISOString(),
      };

      this.feedback.set(feedbackId, feedbackEntry);
      this.logger.log(`Feedback received: ${feedbackId}, rating: ${dto.rating}`);

      return {
        success: true,
        feedbackId,
        message: 'Thank you for your feedback!',
      };
    } catch (error) {
      this.logger.error('Failed to submit feedback', error);
      throw error;
    }
  }

  /**
   * Get suggested questions based on context
   */
  async getSuggestedQuestions(dto: SuggestedQuestionsDto): Promise<{
    success: boolean;
    questions: Array<{
      text: string;
      category: string;
      priority: number;
    }>;
  }> {
    try {
      const limit = dto.limit || 5;

      // Default suggested questions
      const defaultQuestions = [
        { text: 'Where is my order?', category: 'order_tracking', priority: 1 },
        { text: 'How do I return an item?', category: 'returns', priority: 2 },
        { text: 'What are your shipping options?', category: 'shipping', priority: 3 },
        { text: 'Do you offer price matching?', category: 'pricing', priority: 4 },
        { text: 'How can I track my package?', category: 'order_tracking', priority: 5 },
        { text: 'What payment methods do you accept?', category: 'payment', priority: 6 },
        { text: 'How do I change my order?', category: 'order_management', priority: 7 },
        { text: 'What is your refund policy?', category: 'returns', priority: 8 },
        { text: 'Show me recommended products', category: 'recommendations', priority: 9 },
        { text: 'I need help with my account', category: 'account', priority: 10 },
      ];

      // If session exists, personalize suggestions
      let questions = defaultQuestions;

      if (dto.sessionId) {
        const session = this.sessions.get(dto.sessionId);
        if (session && session.messages.length > 0) {
          // Analyze recent conversation to provide context-aware suggestions
          const recentTopics = this.extractTopicsFromMessages(session.messages);
          questions = this.prioritizeQuestions(defaultQuestions, recentTopics);
        }
      }

      // Filter by category if provided
      if (dto.category) {
        questions = questions.filter(q => q.category === dto.category);
      }

      return {
        success: true,
        questions: questions.slice(0, limit),
      };
    } catch (error) {
      this.logger.error('Failed to get suggested questions', error);
      throw error;
    }
  }

  /**
   * Analyze message intent
   */
  async analyzeIntent(dto: AnalyzeIntentDto): Promise<{
    success: boolean;
    primaryIntent: IntentType;
    confidence: number;
    entities: Record<string, any>;
    secondaryIntents?: Array<{ type: IntentType; confidence: number }>;
  }> {
    try {
      const message = dto.message.toLowerCase();
      const entities: Record<string, any> = {};
      const secondaryIntents: Array<{ type: IntentType; confidence: number }> = [];

      // Intent detection rules
      const intentRules: Array<{
        keywords: string[];
        intent: IntentType;
        entityExtractors?: Array<{ pattern: RegExp; key: string }>;
      }> = [
        {
          keywords: ['track', 'where is', 'order status', 'shipping status', 'delivery'],
          intent: IntentType.ORDER_TRACKING,
          entityExtractors: [
            { pattern: /order\s*#?\s*(\w+)/i, key: 'orderId' },
            { pattern: /tracking\s*#?\s*(\w+)/i, key: 'trackingNumber' },
          ],
        },
        {
          keywords: ['return', 'refund', 'send back', 'exchange'],
          intent: IntentType.RETURN_REQUEST,
          entityExtractors: [
            { pattern: /order\s*#?\s*(\w+)/i, key: 'orderId' },
            { pattern: /product\s*#?\s*(\w+)/i, key: 'productId' },
          ],
        },
        {
          keywords: ['product', 'item', 'details', 'specifications', 'specs', 'features'],
          intent: IntentType.PRODUCT_INQUIRY,
          entityExtractors: [
            { pattern: /product\s*#?\s*(\w+)/i, key: 'productId' },
          ],
        },
        {
          keywords: ['price', 'cost', 'how much', 'expensive', 'cheap', 'discount'],
          intent: IntentType.PRICE_CHECK,
        },
        {
          keywords: ['available', 'in stock', 'stock', 'availability'],
          intent: IntentType.AVAILABILITY_CHECK,
        },
        {
          keywords: ['recommend', 'suggest', 'show me', 'looking for', 'find'],
          intent: IntentType.RECOMMENDATION,
        },
        {
          keywords: ['help', 'support', 'assist', 'problem', 'issue'],
          intent: IntentType.GENERAL_SUPPORT,
        },
      ];

      let primaryIntent = IntentType.GENERAL_INQUIRY;
      let maxConfidence = 0.5;

      for (const rule of intentRules) {
        const matchedKeywords = rule.keywords.filter(kw => message.includes(kw));
        if (matchedKeywords.length > 0) {
          const confidence = Math.min(0.95, 0.6 + matchedKeywords.length * 0.15);

          if (confidence > maxConfidence) {
            // Move current primary to secondary if it exists
            if (maxConfidence > 0.5) {
              secondaryIntents.push({ type: primaryIntent, confidence: maxConfidence });
            }
            primaryIntent = rule.intent;
            maxConfidence = confidence;

            // Extract entities
            if (rule.entityExtractors) {
              for (const extractor of rule.entityExtractors) {
                const match = dto.message.match(extractor.pattern);
                if (match) {
                  entities[extractor.key] = match[1];
                }
              }
            }
          } else if (confidence > 0.5) {
            secondaryIntents.push({ type: rule.intent, confidence });
          }
        }
      }

      return {
        success: true,
        primaryIntent,
        confidence: maxConfidence,
        entities,
        secondaryIntents: secondaryIntents.length > 0 ? secondaryIntents : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to analyze intent', error);
      throw error;
    }
  }

  /**
   * Simple mobile chat endpoint
   */
  async mobileChatMessage(dto: MobileChatDto): Promise<{
    response: string;
    products?: Array<{ id: string; name: string; price: number; image?: string }>;
    suggestions?: string[];
  }> {
    try {
      // Analyze intent
      const intentResult = await this.analyzeIntent({ message: dto.message, context: dto.context });

      // Generate response based on intent
      const response = await this.generateMobileResponse(dto.message, intentResult.primaryIntent, dto.context);

      // Get product recommendations if relevant
      let products: Array<{ id: string; name: string; price: number; image?: string }> | undefined;
      if (
        intentResult.primaryIntent === IntentType.PRODUCT_INQUIRY ||
        intentResult.primaryIntent === IntentType.RECOMMENDATION ||
        intentResult.primaryIntent === IntentType.AVAILABILITY_CHECK
      ) {
        products = await this.getRelatedProducts(dto.message, dto.context);
      }

      // Get follow-up suggestions
      const suggestions = this.getFollowUpSuggestions(intentResult.primaryIntent);

      return {
        response,
        products,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Mobile chat message failed', error);
      throw error;
    }
  }

  async processMessage(messageData: SendMessageDto) {
    try {
      const { userId, message, sessionId, context } = messageData;

      // Get or create session
      let session: ChatSession | undefined;
      if (sessionId) {
        session = this.sessions.get(sessionId);
      }

      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(message);

      // Detect intent
      const intent = await this.detectIntent(message);

      // Generate response
      const response = await this.generateResponse(message, intent, userId || 'anonymous');

      // Create message IDs
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();

      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        sentiment: sentiment.sentiment,
      };

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      // Store in session if exists
      if (session) {
        session.messages.push(userMessage, assistantMessage);
        session.lastActivity = new Date().toISOString();
        if (context) {
          session.context = { ...session.context, ...context };
        }
      }

      // Also store in legacy conversations map (for backward compatibility)
      if (userId) {
        this.storeMessage(userId, userMessage);
        this.storeMessage(userId, assistantMessage);
      }

      // Check if human handoff is needed
      const needsHandoff = sentiment.sentiment === 'negative' && sentiment.confidence > 0.8;

      return {
        success: true,
        response,
        messageId: assistantMessageId,
        sentiment,
        intent,
        needsHandoff,
        sessionId,
      };
    } catch (error) {
      this.logger.error('Message processing failed', error);
      throw error;
    }
  }

  async analyzeSentiment(message: string) {
    try {
      // In production: Use sentiment analysis ML model or service
      const lowerMessage = message.toLowerCase();

      let sentiment = 'neutral';
      let confidence = 0.7;

      const positiveWords = ['great', 'excellent', 'love', 'amazing', 'perfect', 'awesome', 'wonderful', 'thanks', 'thank you'];
      const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'disappointed', 'frustrated', 'angry', 'worst', 'horrible'];

      const hasPositive = positiveWords.some(word => lowerMessage.includes(word));
      const hasNegative = negativeWords.some(word => lowerMessage.includes(word));

      if (hasPositive && !hasNegative) {
        sentiment = 'positive';
        confidence = 0.85;
      } else if (hasNegative && !hasPositive) {
        sentiment = 'negative';
        confidence = 0.85;
      } else if (hasPositive && hasNegative) {
        sentiment = 'mixed';
        confidence = 0.6;
      }

      return {
        sentiment,
        confidence,
        message,
      };
    } catch (error) {
      this.logger.error('Sentiment analysis failed', error);
      throw error;
    }
  }

  async getConversationHistory(userId: string) {
    try {
      const messages = this.conversations.get(userId) || [];

      return {
        success: true,
        userId,
        messages,
        messageCount: messages.length,
      };
    } catch (error) {
      this.logger.error('Failed to get conversation history', error);
      throw error;
    }
  }

  async requestHumanHandoff(handoffData: any) {
    try {
      const { userId, reason, priority, sessionId } = handoffData;

      // In production: Notify available agents, create ticket, etc.
      this.logger.log(`Human handoff requested for user ${userId}: ${reason}`);

      return {
        success: true,
        userId,
        status: 'pending',
        estimatedWaitTime: '5 minutes',
        ticketId: `TICKET-${Date.now()}`,
      };
    } catch (error) {
      this.logger.error('Handoff request failed', error);
      throw error;
    }
  }

  private async detectIntent(message: string) {
    // In production: Use NLU service or trained model
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('track') || lowerMessage.includes('order status') || lowerMessage.includes('where is')) {
      return { type: 'order_tracking', confidence: 0.9 };
    } else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
      return { type: 'return_request', confidence: 0.9 };
    } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return { type: 'general_support', confidence: 0.8 };
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return { type: 'price_check', confidence: 0.85 };
    } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      return { type: 'recommendation', confidence: 0.85 };
    }

    return { type: 'general_inquiry', confidence: 0.6 };
  }

  private async generateResponse(message: string, intent: any, userId: string) {
    // In production: Use GPT or custom model

    const responses: Record<string, string> = {
      order_tracking: "I can help you track your order. Please provide your order number or let me look it up for you.",
      return_request: "I understand you'd like to return an item. I can help with that. Which item would you like to return?",
      general_support: "I'm here to help! What can I assist you with today?",
      general_inquiry: "Thank you for your message. How can I help you today?",
      price_check: "I can help you check prices. Which product are you interested in?",
      recommendation: "I'd love to help you find the perfect product! What are you looking for today?",
    };

    return responses[intent.type] || responses.general_inquiry;
  }

  private async generateMobileResponse(message: string, intent: IntentType, context?: Record<string, any>): Promise<string> {
    const responses: Record<IntentType, string> = {
      [IntentType.ORDER_TRACKING]: "I can help you track your order. Please provide your order number, or I can look up your recent orders.",
      [IntentType.RETURN_REQUEST]: "I can help you with your return. Which order would you like to return?",
      [IntentType.PRODUCT_INQUIRY]: "Let me find that information for you.",
      [IntentType.GENERAL_SUPPORT]: "I'm here to help! What do you need assistance with?",
      [IntentType.GENERAL_INQUIRY]: "How can I assist you today?",
      [IntentType.PRICE_CHECK]: "I can check prices for you. Which product are you interested in?",
      [IntentType.AVAILABILITY_CHECK]: "Let me check the availability for you.",
      [IntentType.RECOMMENDATION]: "I'd be happy to recommend some products! What are you looking for?",
    };

    return responses[intent] || responses[IntentType.GENERAL_INQUIRY];
  }

  private async getRelatedProducts(message: string, context?: Record<string, any>): Promise<Array<{ id: string; name: string; price: number; image?: string }>> {
    // In production: Query product database based on message/context
    // For now, return mock data
    return [
      { id: 'prod_1', name: 'Popular Product 1', price: 29.99, image: '/images/product1.jpg' },
      { id: 'prod_2', name: 'Popular Product 2', price: 49.99, image: '/images/product2.jpg' },
      { id: 'prod_3', name: 'Popular Product 3', price: 19.99, image: '/images/product3.jpg' },
    ];
  }

  private getFollowUpSuggestions(intent: IntentType): string[] {
    const suggestionMap: Record<IntentType, string[]> = {
      [IntentType.ORDER_TRACKING]: [
        'Track another order',
        'Contact support',
        'View order history',
      ],
      [IntentType.RETURN_REQUEST]: [
        'Check return status',
        'View return policy',
        'Contact support',
      ],
      [IntentType.PRODUCT_INQUIRY]: [
        'See similar products',
        'Check availability',
        'Add to cart',
      ],
      [IntentType.GENERAL_SUPPORT]: [
        'Track my order',
        'Start a return',
        'Browse products',
      ],
      [IntentType.GENERAL_INQUIRY]: [
        'Browse trending products',
        'Check my orders',
        'View my account',
      ],
      [IntentType.PRICE_CHECK]: [
        'Compare prices',
        'See similar products',
        'Check for deals',
      ],
      [IntentType.AVAILABILITY_CHECK]: [
        'Get notified when available',
        'See alternatives',
        'Check other locations',
      ],
      [IntentType.RECOMMENDATION]: [
        'Show more options',
        'Filter by price',
        'See bestsellers',
      ],
    };

    return suggestionMap[intent] || suggestionMap[IntentType.GENERAL_INQUIRY];
  }

  private extractTopicsFromMessages(messages: Message[]): string[] {
    // Simple topic extraction from recent messages
    const topics: string[] = [];
    const recentMessages = messages.slice(-5);

    for (const msg of recentMessages) {
      const content = msg.content.toLowerCase();
      if (content.includes('order')) topics.push('order_tracking');
      if (content.includes('return')) topics.push('returns');
      if (content.includes('product')) topics.push('recommendations');
      if (content.includes('shipping')) topics.push('shipping');
      if (content.includes('payment')) topics.push('payment');
    }

    return [...new Set(topics)];
  }

  private prioritizeQuestions(
    questions: Array<{ text: string; category: string; priority: number }>,
    topics: string[],
  ): Array<{ text: string; category: string; priority: number }> {
    // Boost priority for questions related to recent topics
    return questions.map(q => ({
      ...q,
      priority: topics.includes(q.category) ? q.priority - 5 : q.priority,
    })).sort((a, b) => a.priority - b.priority);
  }

  private storeMessage(userId: string, message: Message) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }

    const messages = this.conversations.get(userId);
    if (messages) {
      messages.push(message);

      // Keep only last 50 messages
      if (messages.length > 50) {
        messages.shift();
      }
    }
  }
}
