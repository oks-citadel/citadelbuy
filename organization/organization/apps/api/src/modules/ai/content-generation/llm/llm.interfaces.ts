/**
 * LLM Provider Abstraction Interfaces
 *
 * Provides a unified interface for interacting with different LLM providers
 * (OpenAI, Anthropic, etc.) for content generation tasks.
 */

/**
 * Configuration for LLM request
 */
export interface LLMRequestConfig {
  /** Maximum tokens in the response */
  maxTokens?: number;
  /** Temperature for generation (0-2 for OpenAI, 0-1 for Anthropic) */
  temperature?: number;
  /** Top P sampling */
  topP?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** System prompt/instruction */
  systemPrompt?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Standard message format for LLM conversations
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * LLM completion response
 */
export interface LLMResponse {
  /** Generated text content */
  content: string;
  /** Model used for generation */
  model: string;
  /** Token usage statistics */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | string;
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Requests remaining in current window */
  requestsRemaining: number;
  /** Tokens remaining in current window */
  tokensRemaining: number;
  /** Time until rate limit resets (in seconds) */
  resetInSeconds: number;
  /** Whether rate limited */
  isLimited: boolean;
}

/**
 * LLM Provider interface - all providers must implement this
 */
export interface ILLMProvider {
  /** Provider name identifier */
  readonly name: string;

  /** Check if provider is available and configured */
  isAvailable(): boolean;

  /**
   * Generate a completion from a single prompt
   * @param prompt - The user prompt
   * @param config - Optional configuration
   */
  complete(prompt: string, config?: LLMRequestConfig): Promise<LLMResponse>;

  /**
   * Generate a completion from a conversation
   * @param messages - Array of messages
   * @param config - Optional configuration
   */
  chat(messages: LLMMessage[], config?: LLMRequestConfig): Promise<LLMResponse>;

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitInfo;

  /**
   * Check if rate limited
   */
  isRateLimited(): boolean;
}

/**
 * LLM Provider factory type
 */
export type LLMProviderType = 'openai' | 'anthropic';

/**
 * LLM configuration options
 */
export interface LLMConfig {
  /** Primary provider to use */
  provider: LLMProviderType;
  /** Fallback provider if primary fails */
  fallbackProvider?: LLMProviderType;
  /** OpenAI specific config */
  openai?: {
    apiKey: string;
    model: string;
    organization?: string;
  };
  /** Anthropic specific config */
  anthropic?: {
    apiKey: string;
    model: string;
  };
  /** Default request configuration */
  defaults?: LLMRequestConfig;
  /** Enable fallback to template-based generation */
  enableTemplateFallback?: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    maxRequestsPerMinute: number;
    maxTokensPerMinute: number;
  };
}

/**
 * Content generation specific types
 */
export interface ProductDescriptionPrompt {
  productName: string;
  category: string;
  features?: string[];
  specifications?: Record<string, any>;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'luxury' | 'technical';
  includeKeywords?: string[];
  maxLength?: number;
}

export interface ReviewSummaryPrompt {
  productId: string;
  productName?: string;
  reviews: Array<{
    rating: number;
    content: string;
    helpful?: number;
    date?: string;
  }>;
  maxSummaryLength?: number;
  includeQuotes?: boolean;
}

/**
 * LLM error types for proper error handling
 */
export enum LLMErrorType {
  RATE_LIMITED = 'RATE_LIMITED',
  AUTHENTICATION = 'AUTHENTICATION',
  INVALID_REQUEST = 'INVALID_REQUEST',
  CONTENT_FILTER = 'CONTENT_FILTER',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom LLM error class
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly type: LLMErrorType,
    public readonly provider: string,
    public readonly retryable: boolean = false,
    public readonly retryAfterSeconds?: number,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
