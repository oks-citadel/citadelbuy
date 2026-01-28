/**
 * Chatbot Service Client
 */

import axios, { AxiosInstance } from 'axios';
import type { AIConfig } from './index';

export interface ChatRequest {
  sessionId: string;
  userId?: string;
  message: string;
  context?: Record<string, unknown>;
  language?: string;
}

export interface ChatResponse {
  sessionId: string;
  response: string;
  intent: string;
  confidence: number;
  suggestions: string[];
  actions: ChatAction[];
  products?: ProductSuggestion[];
}

export interface ChatAction {
  type: 'link' | 'product' | 'cart' | 'order' | 'support';
  label: string;
  data: Record<string, unknown>;
}

export interface ProductSuggestion {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
}

export interface IntentResult {
  text: string;
  intent: string;
  confidence: number;
  allIntents: Array<{ intent: string; confidence: number }>;
}

export interface Entity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SentimentResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  emotions: Record<string, number>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export class ChatbotClient {
  private client: AxiosInstance;
  private wsConnection?: WebSocket;

  constructor(config: AIConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/chatbot`,
      timeout: config.timeout || 30000,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
  }

  /**
   * Send a chat message and get response
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>('/chat', {
      session_id: request.sessionId,
      user_id: request.userId,
      message: request.message,
      context: request.context,
      language: request.language || 'en',
    });
    return response.data;
  }

  /**
   * Connect to WebSocket for real-time chat
   */
  connectWebSocket(
    sessionId: string,
    onMessage: (response: ChatResponse) => void,
    onError?: (error: Event) => void
  ): void {
    const wsUrl = this.client.defaults.baseURL?.replace('http', 'ws');
    this.wsConnection = new WebSocket(`${wsUrl}/ws/${sessionId}`);

    this.wsConnection.onmessage = (event) => {
      const response = JSON.parse(event.data) as ChatResponse;
      onMessage(response);
    };

    if (onError) {
      this.wsConnection.onerror = onError;
    }
  }

  /**
   * Send message through WebSocket
   */
  sendWebSocketMessage(message: string, userId?: string, context?: Record<string, unknown>): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        text: message,
        user_id: userId,
        context,
      }));
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    this.wsConnection?.close();
    this.wsConnection = undefined;
  }

  /**
   * Classify intent of a message
   */
  async classifyIntent(text: string, language: string = 'en'): Promise<IntentResult> {
    const response = await this.client.post<IntentResult>('/intent/classify', {
      text,
      language,
    });
    return response.data;
  }

  /**
   * Extract entities from text
   */
  async extractEntities(text: string, language: string = 'en'): Promise<Entity[]> {
    const response = await this.client.post<{ entities: Entity[] }>('/entities/extract', null, {
      params: { text, language },
    });
    return response.data.entities;
  }

  /**
   * Analyze sentiment of a message
   */
  async analyzeSentiment(text: string, language: string = 'en'): Promise<SentimentResult> {
    const response = await this.client.post<SentimentResult>('/sentiment/analyze', null, {
      params: { text, language },
    });
    return response.data;
  }

  /**
   * Get chat history for a session
   */
  async getSessionHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const response = await this.client.get<{ messages: ChatMessage[] }>(
      `/session/${sessionId}/history`,
      { params: { limit } }
    );
    return response.data.messages;
  }

  /**
   * Submit feedback on a response
   */
  async submitFeedback(
    sessionId: string,
    messageId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    await this.client.post('/feedback', {
      session_id: sessionId,
      message_id: messageId,
      rating,
      feedback,
    });
  }

  /**
   * Escalate to human support
   */
  async escalateToHuman(
    sessionId: string,
    reason?: string
  ): Promise<{ ticketId: string; estimatedWait: number }> {
    const response = await this.client.post<{ ticket_id: string; estimated_wait: number }>(
      '/escalate',
      { session_id: sessionId, reason }
    );
    return {
      ticketId: response.data.ticket_id,
      estimatedWait: response.data.estimated_wait,
    };
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
