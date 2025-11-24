/**
 * AI Services Library for CitadelBuy Web App
 * Connects to all 13 AI backend modules
 * Optimized for Next.js 14 with Server/Client Components
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// ==================== AR Virtual Try-On ====================
export const ARTryOnAPI = {
  async generateVirtualTryOn(imageFile: File, productId: string) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(
      `${API_URL}/ai/ar-tryon/virtual-tryon?productId=${productId}`,
      {
        method: 'POST',
        body: formData,
      },
    );

    return response.json();
  },

  async getFitRecommendation(productId: string, measurements?: any) {
    return apiCall('/ai/ar-tryon/fit-recommendation', {
      method: 'POST',
      body: JSON.stringify({ productId, measurements }),
    });
  },

  async getSizeChart(productId: string) {
    return apiCall(`/ai/ar-tryon/size-chart/${productId}`);
  },
};

// ==================== Visual Search ====================
export const VisualSearchAPI = {
  async searchByImage(imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_URL}/ai/visual-search/search`, {
      method: 'POST',
      body: formData,
    });

    return response.json();
  },

  async findSimilar(productId: string) {
    return apiCall(`/ai/visual-search/similar/${productId}`);
  },
};

// ==================== Smart Search ====================
export const SmartSearchAPI = {
  async search(query: string, filters?: any) {
    return apiCall('/ai/smart-search/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  },

  async autocomplete(query: string, userId?: string) {
    return apiCall('/ai/smart-search/autocomplete', {
      method: 'POST',
      body: JSON.stringify({ query, userId }),
    });
  },

  async getTrendingQueries() {
    return apiCall('/ai/smart-search/trending');
  },
};

// ==================== Personalization ====================
export const PersonalizationAPI = {
  async getRecommendations(userId: string, context?: string) {
    return apiCall(
      `/ai/personalization/recommendations/${userId}${context ? `?context=${context}` : ''}`,
    );
  },

  async getPersonalizedHomepage(userId: string) {
    return apiCall(`/ai/personalization/homepage/${userId}`);
  },

  async trackBehavior(userId: string, event: any) {
    return apiCall('/ai/personalization/track', {
      method: 'POST',
      body: JSON.stringify({ userId, event }),
    });
  },
};

// ==================== Revenue Optimization ====================
export const RevenueOptimizationAPI = {
  async getUpsellRecommendations(productId: string, userId?: string, currentCartValue?: number) {
    return apiCall('/ai/revenue-optimization/upsell-recommendations', {
      method: 'POST',
      body: JSON.stringify({ productId, userId, currentCartValue }),
    });
  },

  async getCrosssellRecommendations(cartItems: any[], userId?: string) {
    return apiCall('/ai/revenue-optimization/crosssell-recommendations', {
      method: 'POST',
      body: JSON.stringify({ cartItems, userId }),
    });
  },

  async suggestBundles(productId: string, userId?: string) {
    return apiCall('/ai/revenue-optimization/suggest-bundles', {
      method: 'POST',
      body: JSON.stringify({ productId, userId, includePersonalization: true }),
    });
  },

  async getDynamicDiscount(
    userId: string,
    productId: string,
    basePrice: number,
    inventory: number,
  ) {
    return apiCall('/ai/revenue-optimization/dynamic-discount', {
      method: 'POST',
      body: JSON.stringify({ userId, productId, basePrice, inventory }),
    });
  },

  async optimizeAOV(
    userId: string,
    currentCart: Array<{ productId: string; price: number }>,
    targetAOV?: number,
  ) {
    return apiCall('/ai/revenue-optimization/aov-optimization', {
      method: 'POST',
      body: JSON.stringify({ userId, currentCart, targetAOV }),
    });
  },
};

// ==================== Subscription Intelligence ====================
export const SubscriptionAPI = {
  async predictChurn(subscriptionId: string, userId: string) {
    return apiCall('/ai/subscription/predict-churn', {
      method: 'POST',
      body: JSON.stringify({
        subscriptionId,
        userId,
        subscriptionAge: 90,
        lastInteraction: new Date().toISOString(),
      }),
    });
  },

  async getRecommendations(userId: string, purchaseHistory: any[]) {
    return apiCall('/ai/subscription/subscription-recommendations', {
      method: 'POST',
      body: JSON.stringify({ userId, purchaseHistory }),
    });
  },

  async personalizeSubscription(userId: string, productId: string, basePrice: number) {
    return apiCall('/ai/subscription/personalize-subscription', {
      method: 'POST',
      body: JSON.stringify({ userId, productId, basePrice }),
    });
  },

  async getAnalytics(userId: string) {
    return apiCall(`/ai/subscription/subscription-analytics/${userId}`);
  },

  async predictReplenishment(userId: string, productId: string, lastPurchase: string) {
    return apiCall('/ai/subscription/replenishment-prediction', {
      method: 'POST',
      body: JSON.stringify({ userId, productId, lastPurchase }),
    });
  },
};

// ==================== Cart Abandonment ====================
export const CartAbandonmentAPI = {
  async predictAbandonment(data: {
    userId: string;
    cartId: string;
    cartValue: number;
    itemCount: number;
    timeInCart: number;
  }) {
    return apiCall('/ai/cart-abandonment/predict-abandonment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getRecoveryStrategy(
    userId: string,
    cartId: string,
    abandonmentReason: string,
    cartValue: number,
    items: any[],
  ) {
    return apiCall('/ai/cart-abandonment/generate-recovery-strategy', {
      method: 'POST',
      body: JSON.stringify({ userId, cartId, abandonmentReason, cartValue, items }),
    });
  },

  async calculateIncentive(
    userId: string,
    cartValue: number,
    customerLifetimeValue: number,
    previousPurchases: number,
    abandonmentCount: number,
  ) {
    return apiCall('/ai/cart-abandonment/calculate-incentive', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        cartValue,
        customerLifetimeValue,
        previousPurchases,
        abandonmentCount,
      }),
    });
  },
};

// ==================== Fraud Detection ====================
export const FraudDetectionAPI = {
  async analyzeTransaction(data: {
    transactionId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    ipAddress: string;
  }) {
    return apiCall('/ai/fraud-detection/analyze-transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getUserRiskScore(userId: string) {
    return apiCall(`/ai/fraud-detection/risk-score/${userId}`);
  },

  async analyzeFakeReview(reviewId: string, userId: string, productId: string, rating: number, content: string, verified: boolean) {
    return apiCall('/ai/fraud-detection/analyze-review', {
      method: 'POST',
      body: JSON.stringify({ reviewId, userId, productId, rating, content, verified }),
    });
  },
};

// ==================== Content Generation ====================
export const ContentGenerationAPI = {
  async generateProductDescription(data: {
    productName: string;
    category: string;
    features?: string[];
    specifications?: Record<string, any>;
    tone?: 'professional' | 'casual' | 'luxury' | 'technical';
  }) {
    return apiCall('/ai/content-generation/product-description', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async summarizeReviews(productId: string, reviews: any[]) {
    return apiCall('/ai/content-generation/summarize-reviews', {
      method: 'POST',
      body: JSON.stringify({ productId, reviews }),
    });
  },

  async generateSocialContent(
    productId: string,
    productName: string,
    platform: 'facebook' | 'instagram' | 'twitter' | 'pinterest' | 'tiktok',
  ) {
    return apiCall('/ai/content-generation/social-media-content', {
      method: 'POST',
      body: JSON.stringify({ productId, productName, platform }),
    });
  },

  async generateMetaTags(productName: string, category: string, description?: string, price?: number) {
    return apiCall('/ai/content-generation/generate-meta-tags', {
      method: 'POST',
      body: JSON.stringify({ productName, category, description, price }),
    });
  },
};

// ==================== Demand Forecasting ====================
export const DemandForecastingAPI = {
  async forecast(productId: string, timeframe: 'daily' | 'weekly' | 'monthly', periods: number) {
    return apiCall('/ai/demand-forecasting/forecast', {
      method: 'POST',
      body: JSON.stringify({ productId, timeframe, periods }),
    });
  },

  async getSeasonalTrends(category?: string) {
    return apiCall(
      `/ai/demand-forecasting/seasonal-trends${category ? `?category=${category}` : ''}`,
    );
  },

  async predictStockouts() {
    return apiCall('/ai/demand-forecasting/stockout-prediction');
  },

  async getReorderRecommendation(productId: string, currentStock: number, leadTime: number) {
    return apiCall('/ai/demand-forecasting/reorder-recommendation', {
      method: 'POST',
      body: JSON.stringify({ productId, currentStock, leadTime }),
    });
  },
};

// ==================== Chatbot ====================
export const ChatbotAPI = {
  async sendMessage(message: string, conversationId?: string) {
    return apiCall('/ai/chatbot/message', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    });
  },

  async getQuickReplies(context?: string) {
    return apiCall(`/ai/chatbot/quick-replies${context ? `?context=${context}` : ''}`);
  },

  async getFAQs(category?: string) {
    return apiCall(`/ai/chatbot/faqs${category ? `?category=${category}` : ''}`);
  },
};

// Combined export
export const AIServices = {
  arTryOn: ARTryOnAPI,
  visualSearch: VisualSearchAPI,
  smartSearch: SmartSearchAPI,
  personalization: PersonalizationAPI,
  revenueOptimization: RevenueOptimizationAPI,
  subscription: SubscriptionAPI,
  cartAbandonment: CartAbandonmentAPI,
  fraudDetection: FraudDetectionAPI,
  contentGeneration: ContentGenerationAPI,
  demandForecasting: DemandForecastingAPI,
  chatbot: ChatbotAPI,
};

export default AIServices;
