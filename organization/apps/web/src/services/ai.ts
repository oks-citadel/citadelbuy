import api from './api';
import {
  Product,
  Recommendation,
  RecommendationType,
  VisualSearchResult,
  ChatMessage,
  VirtualTryOnResult,
  FitRecommendation,
  SearchResult,
  AISearchSuggestion,
} from '@/types';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

// ============================================================================
// RECOMMENDATION SERVICE
// ============================================================================

export const recommendationService = {
  async getPersonalized(userId: string, limit: number = 10): Promise<Recommendation> {
    const response = await api.get<Recommendation>(
      `/ai/recommendations/personalized?userId=${userId}&limit=${limit}`
    );
    return response.data!;
  },

  async getSimilar(productId: string, limit: number = 10): Promise<Product[]> {
    const response = await api.get<Product[]>(
      `/ai/recommendations/similar/${productId}?limit=${limit}`
    );
    return response.data!;
  },

  async getFrequentlyBoughtTogether(productId: string): Promise<Product[]> {
    const response = await api.get<Product[]>(
      `/ai/recommendations/frequently-bought/${productId}`
    );
    return response.data!;
  },

  async getCrossSell(cartItems: string[]): Promise<Product[]> {
    const response = await api.post<Product[]>('/ai/recommendations/cross-sell', {
      productIds: cartItems,
    });
    return response.data!;
  },

  async getUpsell(productId: string): Promise<Product[]> {
    const response = await api.get<Product[]>(
      `/ai/recommendations/upsell/${productId}`
    );
    return response.data!;
  },

  async getCompleteTheLook(productId: string): Promise<Product[]> {
    const response = await api.get<Product[]>(
      `/ai/recommendations/complete-look/${productId}`
    );
    return response.data!;
  },

  async getTrending(category?: string, limit: number = 10): Promise<Product[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.append('category', category);
    const response = await api.get<Product[]>(`/ai/recommendations/trending?${params}`);
    return response.data!;
  },

  async getNewArrivals(userId?: string, limit: number = 10): Promise<Product[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (userId) params.append('userId', userId);
    const response = await api.get<Product[]>(`/ai/recommendations/new-arrivals?${params}`);
    return response.data!;
  },

  async getByType(
    type: RecommendationType,
    context: { userId?: string; productId?: string; categoryId?: string },
    limit: number = 10
  ): Promise<Recommendation> {
    const response = await api.post<Recommendation>('/ai/recommendations/by-type', {
      type,
      context,
      limit,
    });
    return response.data!;
  },

  async trackInteraction(
    userId: string,
    productId: string,
    type: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'wishlist'
  ): Promise<void> {
    await api.post('/ai/recommendations/track', {
      userId,
      productId,
      interactionType: type,
      timestamp: new Date().toISOString(),
    });
  },
};

// ============================================================================
// VISUAL SEARCH SERVICE
// ============================================================================

export const visualSearchService = {
  async searchByImage(image: File | Blob): Promise<VisualSearchResult> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch(`${AI_SERVICE_URL}/visual-search/image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Visual search failed');
    }

    return response.json();
  },

  async searchByUrl(imageUrl: string): Promise<VisualSearchResult> {
    const response = await api.post<VisualSearchResult>('/ai/visual-search/url', {
      imageUrl,
    });
    return response.data!;
  },

  async searchByCamera(imageData: string): Promise<VisualSearchResult> {
    const response = await api.post<VisualSearchResult>('/ai/visual-search/camera', {
      imageData,
    });
    return response.data!;
  },

  async findSimilarStyle(productId: string): Promise<Product[]> {
    const response = await api.get<Product[]>(
      `/ai/visual-search/similar-style/${productId}`
    );
    return response.data!;
  },

  async detectColors(image: File | Blob): Promise<string[]> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch(`${AI_SERVICE_URL}/visual-search/colors`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Color detection failed');
    }

    const data = await response.json();
    return data.colors;
  },

  async recognizePattern(image: File | Blob): Promise<string[]> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch(`${AI_SERVICE_URL}/visual-search/patterns`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Pattern recognition failed');
    }

    const data = await response.json();
    return data.patterns;
  },
};

// ============================================================================
// SMART SEARCH SERVICE
// ============================================================================

export const smartSearchService = {
  async search(query: string, options?: {
    userId?: string;
    filters?: Record<string, string[]>;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<SearchResult> {
    const response = await api.post<SearchResult>('/ai/search', {
      query,
      ...options,
    });
    return response.data!;
  },

  async semanticSearch(query: string, limit: number = 20): Promise<Product[]> {
    const response = await api.post<Product[]>('/ai/search/semantic', {
      query,
      limit,
    });
    return response.data!;
  },

  async getAutocomplete(query: string): Promise<AISearchSuggestion[]> {
    const response = await api.get<AISearchSuggestion[]>(
      `/ai/search/autocomplete?q=${encodeURIComponent(query)}`
    );
    return response.data!;
  },

  async correctSpelling(query: string): Promise<string> {
    const response = await api.get<{ corrected: string }>(
      `/ai/search/spell-check?q=${encodeURIComponent(query)}`
    );
    return response.data!.corrected;
  },

  async expandQuery(query: string): Promise<string[]> {
    const response = await api.get<string[]>(
      `/ai/search/expand?q=${encodeURIComponent(query)}`
    );
    return response.data!;
  },

  async getSynonyms(term: string): Promise<string[]> {
    const response = await api.get<string[]>(
      `/ai/search/synonyms?term=${encodeURIComponent(term)}`
    );
    return response.data!;
  },

  async getRelatedSearches(query: string): Promise<string[]> {
    const response = await api.get<string[]>(
      `/ai/search/related?q=${encodeURIComponent(query)}`
    );
    return response.data!;
  },

  async personalizeResults(
    results: Product[],
    userId: string
  ): Promise<Product[]> {
    const response = await api.post<Product[]>('/ai/search/personalize', {
      products: results.map((p) => p.id),
      userId,
    });
    return response.data!;
  },

  async trackSearchEvent(
    query: string,
    userId?: string,
    clickedProductId?: string
  ): Promise<void> {
    await api.post('/ai/search/track', {
      query,
      userId,
      clickedProductId,
      timestamp: new Date().toISOString(),
    });
  },
};

// ============================================================================
// VOICE SEARCH SERVICE
// ============================================================================

export const voiceSearchService = {
  async transcribe(audio: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audio);

    const response = await fetch(`${AI_SERVICE_URL}/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Voice transcription failed');
    }

    const data = await response.json();
    return data.text;
  },

  async searchByVoice(audio: Blob): Promise<SearchResult> {
    const text = await this.transcribe(audio);
    return smartSearchService.search(text);
  },

  async getVoiceCommands(): Promise<{ command: string; description: string }[]> {
    const response = await api.get<{ command: string; description: string }[]>(
      '/ai/voice/commands'
    );
    return response.data!;
  },

  async processCommand(audio: Blob): Promise<{
    intent: string;
    action: string;
    parameters: Record<string, unknown>;
  }> {
    const formData = new FormData();
    formData.append('audio', audio);

    const response = await fetch(`${AI_SERVICE_URL}/voice/command`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Voice command processing failed');
    }

    return response.json();
  },
};

// ============================================================================
// CHATBOT SERVICE
// ============================================================================

export const chatbotService = {
  async sendMessage(
    message: string,
    sessionId: string,
    context?: {
      userId?: string;
      currentPage?: string;
      cartItems?: string[];
      viewedProducts?: string[];
    }
  ): Promise<ChatMessage> {
    const response = await api.post<ChatMessage>('/ai/chatbot/message', {
      message,
      sessionId,
      context,
    });
    return response.data!;
  },

  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await api.get<ChatMessage[]>(
      `/ai/chatbot/history/${sessionId}`
    );
    return response.data!;
  },

  async startSession(userId?: string): Promise<{ sessionId: string; greeting: ChatMessage }> {
    const response = await api.post<{ sessionId: string; greeting: ChatMessage }>(
      '/ai/chatbot/start',
      { userId }
    );
    return response.data!;
  },

  async endSession(sessionId: string): Promise<void> {
    await api.post(`/ai/chatbot/end/${sessionId}`);
  },

  async provideFeedback(
    sessionId: string,
    messageId: string,
    feedback: 'helpful' | 'not_helpful'
  ): Promise<void> {
    await api.post('/ai/chatbot/feedback', {
      sessionId,
      messageId,
      feedback,
    });
  },

  async getProductInfo(productId: string, question: string): Promise<string> {
    const response = await api.post<{ answer: string }>('/ai/chatbot/product-qa', {
      productId,
      question,
    });
    return response.data!.answer;
  },

  async getSuggestedQuestions(context: {
    productId?: string;
    categoryId?: string;
    page?: string;
  }): Promise<string[]> {
    const response = await api.post<string[]>(
      '/ai/chatbot/suggested-questions',
      context
    );
    return response.data!;
  },

  async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Array<{ type: string; value: string }>;
  }> {
    const response = await api.post<{
      intent: string;
      confidence: number;
      entities: Array<{ type: string; value: string }>;
    }>('/ai/chatbot/analyze-intent', { message });
    return response.data!;
  },
};

// ============================================================================
// VIRTUAL TRY-ON SERVICE
// ============================================================================

export const virtualTryOnService = {
  async tryOn(
    productId: string,
    userImage: File | Blob
  ): Promise<VirtualTryOnResult> {
    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('userImage', userImage);

    const response = await fetch(`${AI_SERVICE_URL}/virtual-tryon/try`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Virtual try-on failed');
    }

    return response.json();
  },

  async tryOnWithAvatar(
    productId: string,
    avatarId: string
  ): Promise<VirtualTryOnResult> {
    const response = await api.post<VirtualTryOnResult>(
      '/ai/virtual-tryon/avatar',
      { productId, avatarId }
    );
    return response.data!;
  },

  async createAvatar(userImage: File | Blob): Promise<{ avatarId: string; avatarUrl: string }> {
    const formData = new FormData();
    formData.append('image', userImage);

    const response = await fetch(`${AI_SERVICE_URL}/virtual-tryon/create-avatar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Avatar creation failed');
    }

    return response.json();
  },

  async getFitRecommendation(
    productId: string,
    measurements: {
      height?: number;
      weight?: number;
      chest?: number;
      waist?: number;
      hips?: number;
    }
  ): Promise<FitRecommendation> {
    const response = await api.post<FitRecommendation>(
      '/ai/virtual-tryon/fit-recommendation',
      { productId, measurements }
    );
    return response.data!;
  },

  async analyzeFit(
    productId: string,
    userImage: File | Blob
  ): Promise<FitRecommendation> {
    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('userImage', userImage);

    const response = await fetch(`${AI_SERVICE_URL}/virtual-tryon/analyze-fit`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Fit analysis failed');
    }

    return response.json();
  },

  async visualizeFurniture(
    productId: string,
    roomImage: File | Blob
  ): Promise<{ resultUrl: string; placement: { x: number; y: number; scale: number } }> {
    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('roomImage', roomImage);

    const response = await fetch(`${AI_SERVICE_URL}/virtual-tryon/furniture`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Furniture visualization failed');
    }

    return response.json();
  },
};

// ============================================================================
// PERSONALIZATION SERVICE
// ============================================================================

export const personalizationService = {
  async getPersonalizedHomepage(userId: string): Promise<{
    banners: Array<{ id: string; imageUrl: string; link: string }>;
    sections: Array<{
      id: string;
      title: string;
      type: string;
      products: Product[];
    }>;
    deals: Product[];
  }> {
    const response = await api.get<{
      banners: Array<{ id: string; imageUrl: string; link: string }>;
      sections: Array<{
        id: string;
        title: string;
        type: string;
        products: Product[];
      }>;
      deals: Product[];
    }>(`/ai/personalization/homepage/${userId}`);
    return response.data!;
  },

  async getUserSegment(userId: string): Promise<{
    segment: string;
    traits: string[];
    preferredCategories: string[];
    priceRange: { min: number; max: number };
    shoppingBehavior: string;
  }> {
    const response = await api.get<{
      segment: string;
      traits: string[];
      preferredCategories: string[];
      priceRange: { min: number; max: number };
      shoppingBehavior: string;
    }>(`/ai/personalization/segment/${userId}`);
    return response.data!;
  },

  async getPurchasePrediction(userId: string): Promise<{
    likelihood: number;
    predictedProducts: Product[];
    predictedTimeframe: string;
    confidence: number;
  }> {
    const response = await api.get<{
      likelihood: number;
      predictedProducts: Product[];
      predictedTimeframe: string;
      confidence: number;
    }>(`/ai/personalization/purchase-prediction/${userId}`);
    return response.data!;
  },

  async getChurnRisk(userId: string): Promise<{
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    factors: string[];
    suggestedActions: string[];
  }> {
    const response = await api.get<{
      risk: 'LOW' | 'MEDIUM' | 'HIGH';
      score: number;
      factors: string[];
      suggestedActions: string[];
    }>(`/ai/personalization/churn-risk/${userId}`);
    return response.data!;
  },

  async getOptimalEngagementTime(userId: string): Promise<{
    bestTime: string;
    bestDay: string;
    channels: Array<{ channel: string; score: number }>;
  }> {
    const response = await api.get<{
      bestTime: string;
      bestDay: string;
      channels: Array<{ channel: string; score: number }>;
    }>(`/ai/personalization/engagement-time/${userId}`);
    return response.data!;
  },

  async updatePreferences(
    userId: string,
    preferences: Partial<{
      categories: string[];
      brands: string[];
      priceRange: { min: number; max: number };
      styles: string[];
    }>
  ): Promise<void> {
    await api.post(`/ai/personalization/preferences/${userId}`, preferences);
  },
};

// ============================================================================
// FRAUD DETECTION SERVICE
// ============================================================================

export const fraudDetectionService = {
  async analyzeTransaction(transaction: {
    orderId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    shippingAddress: {
      city: string;
      country: string;
      postalCode: string;
    };
    billingAddress: {
      city: string;
      country: string;
      postalCode: string;
    };
    deviceFingerprint?: string;
    ipAddress?: string;
  }): Promise<{
    riskScore: number;
    decision: 'APPROVE' | 'REVIEW' | 'DECLINE';
    riskFactors: string[];
    recommendations: string[];
  }> {
    const response = await api.post<{
      riskScore: number;
      decision: 'APPROVE' | 'REVIEW' | 'DECLINE';
      riskFactors: string[];
      recommendations: string[];
    }>('/ai/fraud/analyze', transaction);
    return response.data!;
  },

  async checkAccountRisk(userId: string): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    flags: string[];
    lastIncident?: string;
  }> {
    const response = await api.get<{
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      flags: string[];
      lastIncident?: string;
    }>(`/ai/fraud/account-risk/${userId}`);
    return response.data!;
  },

  async reportFraud(
    transactionId: string,
    type: string,
    description: string
  ): Promise<void> {
    await api.post('/ai/fraud/report', {
      transactionId,
      type,
      description,
    });
  },
};

// ============================================================================
// PRICING SERVICE
// ============================================================================

export const pricingService = {
  async getOptimalPrice(productId: string): Promise<{
    suggestedPrice: number;
    minPrice: number;
    maxPrice: number;
    competitorPrices: Array<{ competitor: string; price: number }>;
    demandLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const response = await api.get<{
      suggestedPrice: number;
      minPrice: number;
      maxPrice: number;
      competitorPrices: Array<{ competitor: string; price: number }>;
      demandLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }>(`/ai/pricing/optimal/${productId}`);
    return response.data!;
  },

  async getPersonalizedPrice(
    productId: string,
    userId: string
  ): Promise<{
    price: number;
    originalPrice: number;
    discountReason?: string;
  }> {
    const response = await api.get<{
      price: number;
      originalPrice: number;
      discountReason?: string;
    }>(`/ai/pricing/personalized/${productId}?userId=${userId}`);
    return response.data!;
  },

  async getBundlePrice(productIds: string[]): Promise<{
    bundlePrice: number;
    individualTotal: number;
    savings: number;
    savingsPercentage: number;
  }> {
    const response = await api.post<{
      bundlePrice: number;
      individualTotal: number;
      savings: number;
      savingsPercentage: number;
    }>('/ai/pricing/bundle', { productIds });
    return response.data!;
  },

  async getPriceHistory(productId: string, days: number = 30): Promise<
    Array<{ date: string; price: number }>
  > {
    const response = await api.get<Array<{ date: string; price: number }>>(
      `/ai/pricing/history/${productId}?days=${days}`
    );
    return response.data!;
  },

  async getPriceDropAlert(
    productId: string,
    targetPrice: number,
    userId: string
  ): Promise<{ alertId: string }> {
    const response = await api.post<{ alertId: string }>('/ai/pricing/alert', {
      productId,
      targetPrice,
      userId,
    });
    return response.data!;
  },
};

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export const analyticsService = {
  async trackEvent(
    eventName: string,
    properties: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    await api.post('/ai/analytics/track', {
      event: eventName,
      properties,
      userId,
      timestamp: new Date().toISOString(),
    });
  },

  async getCustomerLifetimeValue(userId: string): Promise<{
    currentValue: number;
    predictedValue: number;
    confidence: number;
    factors: string[];
  }> {
    const response = await api.get<{
      currentValue: number;
      predictedValue: number;
      confidence: number;
      factors: string[];
    }>(`/ai/analytics/clv/${userId}`);
    return response.data!;
  },

  async getProductInsights(productId: string): Promise<{
    views: number;
    conversions: number;
    conversionRate: number;
    averageTimeOnPage: number;
    cartAdditions: number;
    cartAbandonments: number;
    sentiment: number;
  }> {
    const response = await api.get<{
      views: number;
      conversions: number;
      conversionRate: number;
      averageTimeOnPage: number;
      cartAdditions: number;
      cartAbandonments: number;
      sentiment: number;
    }>(`/ai/analytics/product/${productId}`);
    return response.data!;
  },

  async predictTrends(category?: string): Promise<
    Array<{
      trend: string;
      direction: 'UP' | 'DOWN' | 'STABLE';
      confidence: number;
      relatedProducts: string[];
    }>
  > {
    const params = category ? `?category=${category}` : '';
    const response = await api.get<
      Array<{
        trend: string;
        direction: 'UP' | 'DOWN' | 'STABLE';
        confidence: number;
        relatedProducts: string[];
      }>
    >(`/ai/analytics/trends${params}`);
    return response.data!;
  },
};

export const aiServices = {
  recommendation: recommendationService,
  visualSearch: visualSearchService,
  smartSearch: smartSearchService,
  voiceSearch: voiceSearchService,
  chatbot: chatbotService,
  virtualTryOn: virtualTryOnService,
  personalization: personalizationService,
  fraudDetection: fraudDetectionService,
  pricing: pricingService,
  analytics: analyticsService,
};

export default aiServices;
