import { apiClient } from '@/lib/api-client';
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

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || '/ai';

// ============================================================================
// AI SERVICE RESPONSE TYPES
// ============================================================================

/** Generic API response wrapper */
interface ApiResponse<T> { data: T; }

/** Recommendation API responses */
interface RecommendationApiResponse extends ApiResponse<Recommendation> {}
interface ProductArrayApiResponse extends ApiResponse<Product[]> {}
interface StringArrayApiResponse extends ApiResponse<string[]> {}

/** Visual Search API responses */
interface VisualSearchApiResponse extends ApiResponse<VisualSearchResult> {}
interface ColorDetectionResponse { colors: string[]; }
interface PatternRecognitionResponse { patterns: string[]; }

/** Smart Search API responses */
interface SearchResultApiResponse extends ApiResponse<SearchResult> {}
interface AutocompleteApiResponse extends ApiResponse<{ suggestions: AISearchSuggestion[] }> {}
interface SpellCheckApiResponse extends ApiResponse<{ corrected: string }> {}

/** Voice Search API responses */
interface VoiceTranscriptionResponse { text: string; }
interface VoiceCommandResponse { intent: string; action: string; parameters: Record<string, unknown>; }
interface VoiceCommandsListApiResponse extends ApiResponse<Array<{ command: string; description: string }>> {}

/** Chatbot API responses */
interface ChatMessageApiResponse extends ApiResponse<ChatMessage> {}
interface ChatMessageArrayApiResponse extends ApiResponse<ChatMessage[]> {}
interface ChatSessionApiResponse extends ApiResponse<{ sessionId: string; greeting: ChatMessage }> {}
interface ProductQuestionApiResponse extends ApiResponse<{ answer: string }> {}
interface IntentAnalysisApiResponse extends ApiResponse<{ intent: string; confidence: number; entities: Array<{ type: string; value: string }>; }> {}

/** Virtual Try-On API responses */
interface VirtualTryOnApiResponse extends ApiResponse<VirtualTryOnResult> {}
interface AvatarCreationResponse { avatarId: string; avatarUrl: string; }
interface FitRecommendationApiResponse extends ApiResponse<FitRecommendation> {}
interface FurnitureVisualizationResponse { resultUrl: string; placement: { x: number; y: number; scale: number }; }

// ============================================================================
// RECOMMENDATION SERVICE
// ============================================================================

export const recommendationService = {
  async getPersonalized(userId: string, limit: number = 10): Promise<Recommendation> {
    const response = await apiClient.get<Recommendation>(
      `/ai/recommendations/personalized?userId=${userId}&limit=${limit}`
    );
    return response.data;
  },

  async getSimilar(productId: string, limit: number = 10): Promise<Product[]> {
    const response = await apiClient.get<Product[]>(
      `/ai/recommendations/similar/${productId}?limit=${limit}`
    );
    return response.data;
  },

  async getFrequentlyBoughtTogether(productId: string): Promise<Product[]> {
    const response = await apiClient.get<Product[]>(
      `/ai/recommendations/frequently-bought/${productId}`
    );
    return response.data;
  },

  async getCrossSell(cartItems: string[]): Promise<Product[]> {
    const response = await apiClient.post<Product[]>('/ai/recommendations/cross-sell', {
      productIds: cartItems,
    });
    return response.data;
  },

  async getUpsell(productId: string): Promise<Product[]> {
    const response = await apiClient.get<any>(
      `/ai/recommendations/upsell/${productId}`
    );
    return response.data;
  },

  async getCompleteTheLook(productId: string): Promise<Product[]> {
    const response = await apiClient.get<any>(
      `/ai/recommendations/complete-look/${productId}`
    );
    return response.data;
  },

  async getTrending(limit: number = 10): Promise<Recommendation> {
    const response = await apiClient.get<any>(
      `/ai/recommendations/trending?limit=${limit}`
    );
    return response.data;
  },

  async getNewArrivals(limit: number = 10): Promise<Recommendation> {
    const response = await apiClient.get<any>(
      `/ai/recommendations/new-arrivals?limit=${limit}`
    );
    return response.data;
  },

  async getRecentlyViewed(userId: string, limit: number = 10): Promise<Recommendation> {
    const response = await apiClient.get<any>(
      `/ai/recommendations/recently-viewed?userId=${userId}&limit=${limit}`
    );
    return response.data;
  },

  async getTrendingSearches(): Promise<string[]> {
    const response = await apiClient.get<any>('/ai/recommendations/trending-searches');
    return response.data;
  },

  async getByType(
    type: RecommendationType,
    context: { userId?: string; productId?: string; categoryId?: string },
    limit: number = 10
  ): Promise<Recommendation> {
    const response = await apiClient.post<any>('/ai/recommendations/by-type', {
      type,
      context,
      limit,
    });
    return response.data;
  },

  async trackInteraction(
    userId: string,
    productId: string,
    type: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'wishlist'
  ): Promise<void> {
    await apiClient.post('/ai/recommendations/track', {
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
    const response = await apiClient.post<any>('/ai/visual-search/url', {
      imageUrl,
    });
    return response.data;
  },

  async searchByCamera(imageData: string): Promise<VisualSearchResult> {
    const response = await apiClient.post<any>('/ai/visual-search/camera', {
      imageData,
    });
    return response.data;
  },

  async findSimilarStyle(productId: string): Promise<Product[]> {
    const response = await apiClient.get<any>(
      `/ai/visual-search/similar-style/${productId}`
    );
    return response.data;
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

    const data: ColorDetectionResponse = await response.json();
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

    const data: PatternRecognitionResponse = await response.json();
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
    const response = await apiClient.post<any>('/ai/search', {
      query,
      ...options,
    });
    return response.data;
  },

  async semanticSearch(query: string, limit: number = 20): Promise<Product[]> {
    const response = await apiClient.post<any>('/ai/search/semantic', {
      query,
      limit,
    });
    return response.data;
  },

  async getAutocomplete(query: string): Promise<{ suggestions: AISearchSuggestion[] }> {
    const response = await apiClient.get<any>(
      `/ai/search/autocomplete?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  async getTrending(): Promise<string[]> {
    const response = await apiClient.get<any>('/ai/search/trending');
    return response.data;
  },

  async correctSpelling(query: string): Promise<string> {
    const response = await apiClient.get<any>(
      `/ai/search/spell-check?q=${encodeURIComponent(query)}`
    );
    return response.data.corrected;
  },

  async expandQuery(query: string): Promise<string[]> {
    const response = await apiClient.get<any>(
      `/ai/search/expand?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  async getSynonyms(term: string): Promise<string[]> {
    const response = await apiClient.get<any>(
      `/ai/search/synonyms?term=${encodeURIComponent(term)}`
    );
    return response.data;
  },

  async getRelatedSearches(query: string): Promise<string[]> {
    const response = await apiClient.get<any>(
      `/ai/search/related?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  async personalizeResults(
    results: Product[],
    userId: string
  ): Promise<Product[]> {
    const response = await apiClient.post<any>('/ai/search/personalize', {
      products: results.map((p) => p.id),
      userId,
    });
    return response.data;
  },

  async trackSearchEvent(
    query: string,
    userId?: string,
    clickedProductId?: string
  ): Promise<void> {
    await apiClient.post('/ai/search/track', {
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

    const data: VoiceTranscriptionResponse = await response.json();
    return data.text;
  },

  async searchByVoice(audio: Blob): Promise<SearchResult> {
    const text = await this.transcribe(audio);
    return smartSearchService.search(text);
  },

  async getVoiceCommands(): Promise<{ command: string; description: string }[]> {
    const response = await apiClient.get<any>(
      '/ai/voice/commands'
    );
    return response.data;
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

    const data: VoiceCommandResponse = await response.json();
    return data;
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
    const response = await apiClient.post<any>('/ai/chatbot/message', {
      message,
      sessionId,
      context,
    });
    return response.data;
  },

  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get<any>(
      `/ai/chatbot/history/${sessionId}`
    );
    return response.data;
  },

  async startSession(userId?: string): Promise<{ sessionId: string; greeting: ChatMessage }> {
    const response = await apiClient.post<any>(
      '/ai/chatbot/start',
      { userId }
    );
    return response.data;
  },

  async endSession(sessionId: string): Promise<void> {
    await apiClient.post(`/ai/chatbot/end/${sessionId}`);
  },

  async provideFeedback(
    sessionId: string,
    messageId: string,
    feedback: 'helpful' | 'not_helpful'
  ): Promise<void> {
    await apiClient.post('/ai/chatbot/feedback', {
      sessionId,
      messageId,
      feedback,
    });
  },

  async getProductInfo(productId: string, question: string): Promise<string> {
    const response = await apiClient.post<any>('/ai/chatbot/product-qa', {
      productId,
      question,
    });
    return response.data.answer;
  },

  async getSuggestedQuestions(context: {
    productId?: string;
    categoryId?: string;
    page?: string;
  }): Promise<string[]> {
    const response = await apiClient.post<any>(
      '/ai/chatbot/suggested-questions',
      context
    );
    return response.data;
  },

  async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Array<{ type: string; value: string }>;
  }> {
    const response = await apiClient.post<any>('/ai/chatbot/analyze-intent', { message });
    return response.data;
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
    const response = await apiClient.post<any>(
      '/ai/virtual-tryon/avatar',
      { productId, avatarId }
    );
    return response.data;
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

    const data: AvatarCreationResponse = await response.json();
    return data;
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
    const response = await apiClient.post<FitRecommendation>(
      '/ai/virtual-tryon/fit-recommendation',
      { productId, measurements }
    );
    return response.data;
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
    const response = await apiClient.get<{
      banners: Array<{ id: string; imageUrl: string; link: string }>;
      sections: Array<{
        id: string;
        title: string;
        type: string;
        products: Product[];
      }>;
      deals: Product[];
    }>(`/ai/personalization/homepage/${userId}`);
    return response.data;
  },

  async getUserSegment(userId: string): Promise<{
    segment: string;
    traits: string[];
    preferredCategories: string[];
    priceRange: { min: number; max: number };
    shoppingBehavior: string;
  }> {
    const response = await apiClient.get<{
      segment: string;
      traits: string[];
      preferredCategories: string[];
      priceRange: { min: number; max: number };
      shoppingBehavior: string;
    }>(`/ai/personalization/segment/${userId}`);
    return response.data;
  },

  async getPurchasePrediction(userId: string): Promise<{
    likelihood: number;
    predictedProducts: Product[];
    predictedTimeframe: string;
    confidence: number;
  }> {
    const response = await apiClient.get<{
      likelihood: number;
      predictedProducts: Product[];
      predictedTimeframe: string;
      confidence: number;
    }>(`/ai/personalization/purchase-prediction/${userId}`);
    return response.data;
  },

  async getChurnRisk(userId: string): Promise<{
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    factors: string[];
    suggestedActions: string[];
  }> {
    const response = await apiClient.get<{
      risk: 'LOW' | 'MEDIUM' | 'HIGH';
      score: number;
      factors: string[];
      suggestedActions: string[];
    }>(`/ai/personalization/churn-risk/${userId}`);
    return response.data;
  },

  async getOptimalEngagementTime(userId: string): Promise<{
    bestTime: string;
    bestDay: string;
    channels: Array<{ channel: string; score: number }>;
  }> {
    const response = await apiClient.get<{
      bestTime: string;
      bestDay: string;
      channels: Array<{ channel: string; score: number }>;
    }>(`/ai/personalization/engagement-time/${userId}`);
    return response.data;
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
    await apiClient.post(`/ai/personalization/preferences/${userId}`, preferences);
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
    const response = await apiClient.post<{
      riskScore: number;
      decision: 'APPROVE' | 'REVIEW' | 'DECLINE';
      riskFactors: string[];
      recommendations: string[];
    }>('/ai/fraud/analyze', transaction);
    return response.data;
  },

  async checkAccountRisk(userId: string): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    flags: string[];
    lastIncident?: string;
  }> {
    const response = await apiClient.get<{
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      flags: string[];
      lastIncident?: string;
    }>(`/ai/fraud/account-risk/${userId}`);
    return response.data;
  },

  async reportFraud(
    transactionId: string,
    type: string,
    description: string
  ): Promise<void> {
    await apiClient.post('/ai/fraud/report', {
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
    const response = await apiClient.get<{
      suggestedPrice: number;
      minPrice: number;
      maxPrice: number;
      competitorPrices: Array<{ competitor: string; price: number }>;
      demandLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }>(`/ai/pricing/optimal/${productId}`);
    return response.data;
  },

  async getPersonalizedPrice(
    productId: string,
    userId: string
  ): Promise<{
    price: number;
    originalPrice: number;
    discountReason?: string;
  }> {
    const response = await apiClient.get<{
      price: number;
      originalPrice: number;
      discountReason?: string;
    }>(`/ai/pricing/personalized/${productId}?userId=${userId}`);
    return response.data;
  },

  async getBundlePrice(productIds: string[]): Promise<{
    bundlePrice: number;
    individualTotal: number;
    savings: number;
    savingsPercentage: number;
  }> {
    const response = await apiClient.post<{
      bundlePrice: number;
      individualTotal: number;
      savings: number;
      savingsPercentage: number;
    }>('/ai/pricing/bundle', { productIds });
    return response.data;
  },

  async getPriceHistory(productId: string, days: number = 30): Promise<
    Array<{ date: string; price: number }>
  > {
    const response = await apiClient.get<Array<{ date: string; price: number }>>(
      `/ai/pricing/history/${productId}?days=${days}`
    );
    return response.data;
  },

  async getPriceDropAlert(
    productId: string,
    targetPrice: number,
    userId: string
  ): Promise<{ alertId: string }> {
    const response = await apiClient.post<{ alertId: string }>('/ai/pricing/alert', {
      productId,
      targetPrice,
      userId,
    });
    return response.data;
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
    await apiClient.post('/ai/analytics/track', {
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
    const response = await apiClient.get<{
      currentValue: number;
      predictedValue: number;
      confidence: number;
      factors: string[];
    }>(`/ai/analytics/clv/${userId}`);
    return response.data;
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
    const response = await apiClient.get<{
      views: number;
      conversions: number;
      conversionRate: number;
      averageTimeOnPage: number;
      cartAdditions: number;
      cartAbandonments: number;
      sentiment: number;
    }>(`/ai/analytics/product/${productId}`);
    return response.data;
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
    const response = await apiClient.get<
      Array<{
        trend: string;
        direction: 'UP' | 'DOWN' | 'STABLE';
        confidence: number;
        relatedProducts: string[];
      }>
    >(`/ai/analytics/trends${params}`);
    return response.data;
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
