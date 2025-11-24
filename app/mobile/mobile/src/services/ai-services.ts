import apiService from './api';

/**
 * AI Services - Comprehensive AI feature integrations
 * Connects mobile app to all 13 AI backend modules
 */

// ==================== AR Virtual Try-On ====================
export const ARTryOnService = {
  async generateVirtualTryOn(imageUri: string, productId: string) {
    return apiService.uploadImage(imageUri, `/ai/ar-tryon/virtual-tryon?productId=${productId}`);
  },

  async extractBodyMeasurements(imageUri: string) {
    return apiService.uploadImage(imageUri, '/ai/ar-tryon/body-measurements');
  },

  async getFitRecommendation(productId: string, measurements?: any) {
    return apiService.post('/ai/ar-tryon/fit-recommendation', {
      productId,
      measurements,
    });
  },

  async getSizeChart(productId: string) {
    return apiService.get(`/ai/ar-tryon/size-chart/${productId}`);
  },

  async submitFitFeedback(data: {
    productId: string;
    size: string;
    fit: 'too_small' | 'perfect' | 'too_large';
  }) {
    return apiService.post('/ai/ar-tryon/fit-feedback', data);
  },
};

// ==================== Visual Search ====================
export const VisualSearchService = {
  async searchByImage(imageUri: string) {
    return apiService.uploadImage(imageUri, '/ai/visual-search/search');
  },

  async findSimilarProducts(productId: string, imageUri?: string) {
    if (imageUri) {
      return apiService.uploadImage(imageUri, '/ai/visual-search/similar');
    }
    return apiService.get(`/ai/visual-search/similar/${productId}`);
  },
};

// ==================== Smart Search & Autocomplete ====================
export const SmartSearchService = {
  async search(query: string, filters?: any) {
    return apiService.post('/ai/smart-search/search', { query, filters });
  },

  async getAutocomplete(query: string, userId?: string) {
    return apiService.post('/ai/smart-search/autocomplete', { query, userId });
  },

  async getTrendingQueries() {
    return apiService.get('/ai/smart-search/trending');
  },
};

// ==================== Conversational Commerce ====================
export const ConversationalService = {
  async processQuery(query: string, context?: any) {
    return apiService.post('/ai/conversational/query', { query, context });
  },

  async chat(message: string, conversationId?: string) {
    return apiService.post('/ai/conversational/chat', {
      message,
      conversationId,
    });
  },
};

// ==================== Personalization ====================
export const PersonalizationService = {
  async getRecommendations(userId: string, context?: string) {
    return apiService.get(`/ai/personalization/recommendations/${userId}`, {
      params: { context },
    });
  },

  async getPersonalizedHomepage(userId: string) {
    return apiService.get(`/ai/personalization/homepage/${userId}`);
  },

  async trackBehavior(userId: string, event: any) {
    return apiService.post('/ai/personalization/track', { userId, event });
  },
};

// ==================== Cart Abandonment ====================
export const CartAbandonmentService = {
  async predictAbandonment(data: {
    userId: string;
    cartId: string;
    cartValue: number;
    itemCount: number;
    timeInCart: number;
  }) {
    return apiService.post('/ai/cart-abandonment/predict-abandonment', data);
  },

  async trackAbandonment(data: {
    userId: string;
    cartId: string;
    cartValue: number;
    items: any[];
  }) {
    return apiService.post('/ai/cart-abandonment/track-abandonment', data);
  },
};

// ==================== Revenue Optimization ====================
export const RevenueOptimizationService = {
  async getUpsellRecommendations(productId: string, userId?: string) {
    return apiService.post('/ai/revenue-optimization/upsell-recommendations', {
      productId,
      userId,
    });
  },

  async getCrosssellRecommendations(cartItems: any[], userId?: string) {
    return apiService.post('/ai/revenue-optimization/crosssell-recommendations', {
      cartItems,
      userId,
    });
  },

  async suggestBundles(productId: string, userId?: string) {
    return apiService.post('/ai/revenue-optimization/suggest-bundles', {
      productId,
      userId,
      includePersonalization: true,
    });
  },

  async calculateDynamicDiscount(data: {
    userId: string;
    productId: string;
    basePrice: number;
    inventory: number;
  }) {
    return apiService.post('/ai/revenue-optimization/dynamic-discount', data);
  },
};

// ==================== Subscription Intelligence ====================
export const SubscriptionService = {
  async predictChurn(subscriptionId: string, userId: string) {
    return apiService.post('/ai/subscription/predict-churn', {
      subscriptionId,
      userId,
      subscriptionAge: 90,
      lastInteraction: new Date().toISOString(),
    });
  },

  async getSubscriptionRecommendations(userId: string, purchaseHistory: any[]) {
    return apiService.post('/ai/subscription/subscription-recommendations', {
      userId,
      purchaseHistory,
    });
  },

  async personalizeSubscription(userId: string, productId: string, basePrice: number) {
    return apiService.post('/ai/subscription/personalize-subscription', {
      userId,
      productId,
      basePrice,
    });
  },

  async getAnalytics(userId: string) {
    return apiService.get(`/ai/subscription/subscription-analytics/${userId}`);
  },

  async predictReplenishment(data: {
    userId: string;
    productId: string;
    lastPurchase: string;
  }) {
    return apiService.post('/ai/subscription/replenishment-prediction', data);
  },
};

// ==================== Fraud Detection ====================
export const FraudDetectionService = {
  async analyzeTransaction(data: {
    transactionId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    ipAddress: string;
  }) {
    return apiService.post('/ai/fraud-detection/analyze-transaction', data);
  },

  async getUserRiskScore(userId: string) {
    return apiService.get(`/ai/fraud-detection/risk-score/${userId}`);
  },
};

// ==================== Content Generation ====================
export const ContentGenerationService = {
  async summarizeReviews(productId: string, reviews: any[]) {
    return apiService.post('/ai/content-generation/summarize-reviews', {
      productId,
      reviews,
    });
  },
};

// ==================== Demand Forecasting ====================
export const DemandForecastingService = {
  async getSeasonalTrends(category?: string) {
    return apiService.get('/ai/demand-forecasting/seasonal-trends', {
      params: { category },
    });
  },

  async predictStockouts() {
    return apiService.get('/ai/demand-forecasting/stockout-prediction');
  },
};

// ==================== Chatbot ====================
export const ChatbotService = {
  async sendMessage(message: string, conversationId?: string) {
    return apiService.post('/ai/chatbot/message', { message, conversationId });
  },

  async getQuickReplies(context?: string) {
    return apiService.get('/ai/chatbot/quick-replies', { params: { context } });
  },

  async getFAQs(category?: string) {
    return apiService.get('/ai/chatbot/faqs', { params: { category } });
  },
};

// ==================== Dynamic Pricing ====================
export const PricingService = {
  async getOptimalPrice(productId: string, userId?: string) {
    return apiService.get(`/ai/pricing/optimal-price/${productId}`, {
      params: { userId },
    });
  },

  async getPersonalizedDiscount(userId: string, productId: string) {
    return apiService.get('/ai/pricing/personalized-discount', {
      params: { userId, productId },
    });
  },
};

// ==================== Combined AI Service ====================
export const AIService = {
  arTryOn: ARTryOnService,
  visualSearch: VisualSearchService,
  smartSearch: SmartSearchService,
  conversational: ConversationalService,
  personalization: PersonalizationService,
  cartAbandonment: CartAbandonmentService,
  revenueOptimization: RevenueOptimizationService,
  subscription: SubscriptionService,
  fraudDetection: FraudDetectionService,
  contentGeneration: ContentGenerationService,
  demandForecasting: DemandForecastingService,
  chatbot: ChatbotService,
  pricing: PricingService,
};

export default AIService;
