import { Injectable, Logger } from '@nestjs/common';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sentiment?: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private conversations: Map<string, Message[]> = new Map();

  async processMessage(messageData: any) {
    try {
      const { userId, message, sessionId } = messageData;

      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(message);

      // Detect intent
      const intent = await this.detectIntent(message);

      // Generate response
      const response = await this.generateResponse(message, intent, userId);

      // Store conversation
      this.storeMessage(userId, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        sentiment: sentiment.sentiment,
      });

      this.storeMessage(userId, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });

      // Check if human handoff is needed
      const needsHandoff = sentiment.sentiment === 'negative' && sentiment.confidence > 0.8;

      return {
        success: true,
        response,
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

      const positiveWords = ['great', 'excellent', 'love', 'amazing', 'perfect'];
      const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'disappointed'];

      const hasPositive = positiveWords.some(word => lowerMessage.includes(word));
      const hasNegative = negativeWords.some(word => lowerMessage.includes(word));

      if (hasPositive) {
        sentiment = 'positive';
        confidence = 0.85;
      } else if (hasNegative) {
        sentiment = 'negative';
        confidence = 0.85;
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
      const { userId, reason, priority } = handoffData;

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

    if (lowerMessage.includes('track') || lowerMessage.includes('order')) {
      return { type: 'order_tracking', confidence: 0.9 };
    } else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
      return { type: 'return_request', confidence: 0.9 };
    } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return { type: 'general_support', confidence: 0.8 };
    }

    return { type: 'general_inquiry', confidence: 0.6 };
  }

  private async generateResponse(message: string, intent: any, userId: string) {
    // In production: Use GPT or custom model

    const responses = {
      order_tracking: "I can help you track your order. Please provide your order number or let me look it up for you.",
      return_request: "I understand you'd like to return an item. I can help with that. Which item would you like to return?",
      general_support: "I'm here to help! What can I assist you with today?",
      general_inquiry: "Thank you for your message. How can I help you today?",
    };

    return (responses as Record<string, string>)[intent.type] || responses.general_inquiry;
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
