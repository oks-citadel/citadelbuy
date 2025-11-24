import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryDto, ConversationDto } from './dto/conversational.dto';

interface Intent {
  type: string;
  confidence: number;
  entities: Record<string, any>;
}

@Injectable()
export class ConversationalService {
  private readonly logger = new Logger(ConversationalService.name);
  private conversationHistory: Map<string, any[]> = new Map();

  constructor(private configService: ConfigService) {}

  async processQuery(queryDto: QueryDto) {
    try {
      const { query, userId } = queryDto;

      // Extract intent and entities from query
      const intent = await this.extractIntent(query);

      // Get product recommendations based on intent
      const products = await this.getProductsFromIntent(intent);

      // Generate natural language response
      const response = await this.generateResponse(intent, products);

      // Store conversation context
      if (userId) {
        this.addToConversationHistory(userId, { query, intent, products, response });
      }

      return {
        success: true,
        query,
        intent,
        products,
        response,
        suggestions: await this.getFollowUpSuggestions(intent),
      };
    } catch (error) {
      this.logger.error('Query processing failed', error);
      throw error;
    }
  }

  async continueConversation(conversationDto: ConversationDto) {
    try {
      const { userId, message, conversationId } = conversationDto;

      // Get conversation context
      const context = this.getConversationHistory(userId);

      // Process message with context
      const intent = await this.extractIntentWithContext(message, context);
      const products = await this.getProductsFromIntent(intent);
      const response = await this.generateResponse(intent, products);

      // Update conversation history
      this.addToConversationHistory(userId, { message, intent, products, response });

      return {
        success: true,
        conversationId,
        message,
        intent,
        products,
        response,
        contextUsed: context.length > 0,
      };
    } catch (error) {
      this.logger.error('Conversation continuation failed', error);
      throw error;
    }
  }

  async getQuerySuggestions(query: string) {
    try {
      // Generate intelligent query suggestions based on:
      // 1. Popular searches
      // 2. Trending products
      // 3. User history
      // 4. Semantic similarity

      const suggestions = [
        `${query} under $100`,
        `best ${query} 2024`,
        `${query} reviews`,
        `${query} comparison`,
        `${query} deals`,
      ];

      return {
        success: true,
        query,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Suggestion generation failed', error);
      throw error;
    }
  }

  private async extractIntent(query: string): Promise<Intent> {
    // In a real implementation, this would use:
    // 1. OpenAI GPT for intent classification
    // 2. Named Entity Recognition (NER)
    // 3. Custom trained models

    const lowerQuery = query.toLowerCase();

    let type = 'search';
    let entities: Record<string, any> = {};

    if (lowerQuery.includes('under') || lowerQuery.includes('less than')) {
      type = 'price_filtered_search';
      const priceMatch = lowerQuery.match(/\$?(\d+)/);
      if (priceMatch) {
        entities.maxPrice = parseInt(priceMatch[1]);
      }
    } else if (lowerQuery.includes('best') || lowerQuery.includes('top')) {
      type = 'recommendation_request';
    } else if (lowerQuery.includes('compare')) {
      type = 'comparison_request';
    }

    // Extract color, size, brand, etc.
    const colors = ['red', 'blue', 'black', 'white', 'green'];
    const sizes = ['small', 'medium', 'large', 'xl', 'xxl'];

    colors.forEach(color => {
      if (lowerQuery.includes(color)) {
        entities.color = color;
      }
    });

    sizes.forEach(size => {
      if (lowerQuery.includes(size)) {
        entities.size = size;
      }
    });

    return {
      type,
      confidence: 0.85,
      entities,
    };
  }

  private async extractIntentWithContext(
    message: string,
    context: any[],
  ): Promise<Intent> {
    // Extract intent considering previous conversation
    const intent = await this.extractIntent(message);

    // Merge with context if needed
    if (context.length > 0) {
      const lastContext = context[context.length - 1];
      if (lastContext.intent?.entities) {
        intent.entities = { ...lastContext.intent.entities, ...intent.entities };
      }
    }

    return intent;
  }

  private async getProductsFromIntent(intent: Intent): Promise<any[]> {
    // In a real implementation, this would query the product database
    // with filters extracted from the intent

    return [
      {
        id: '1',
        name: 'Sample Product 1',
        price: 49.99,
        relevance: 0.95,
      },
      {
        id: '2',
        name: 'Sample Product 2',
        price: 59.99,
        relevance: 0.89,
      },
    ];
  }

  private async generateResponse(intent: Intent, products: any[]): Promise<string> {
    // In a real implementation, this would use GPT to generate
    // natural language responses

    const productCount = products.length;

    if (productCount === 0) {
      return "I couldn't find any products matching your criteria. Would you like to try a different search?";
    }

    if (intent.type === 'price_filtered_search') {
      return `I found ${productCount} products under $${intent.entities.maxPrice}. Here are the top matches.`;
    }

    return `I found ${productCount} products that match what you're looking for. Let me show you the best options.`;
  }

  private async getFollowUpSuggestions(intent: Intent): Promise<string[]> {
    const suggestions = [
      'Show me more like this',
      'What are the customer reviews?',
      'Compare with similar products',
      'Show me different colors',
    ];

    if (intent.entities.maxPrice) {
      suggestions.push('Show me premium options');
    }

    return suggestions;
  }

  private addToConversationHistory(userId: string, entry: any) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId);
    history.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 10 entries
    if (history.length > 10) {
      history.shift();
    }
  }

  private getConversationHistory(userId: string): any[] {
    return this.conversationHistory.get(userId) || [];
  }
}
