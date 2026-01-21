/**
 * LLM Service
 *
 * Unified service for LLM operations with provider abstraction,
 * automatic fallback, rate limiting awareness, and error handling.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILLMProvider,
  LLMProviderType,
  LLMRequestConfig,
  LLMMessage,
  LLMResponse,
  RateLimitInfo,
  LLMError,
  LLMErrorType,
} from './llm.interfaces';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';

export interface LLMServiceOptions {
  /** Use fallback provider if primary fails */
  useFallback?: boolean;
  /** Specific provider to use (overrides default) */
  provider?: LLMProviderType;
}

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private providers: Map<LLMProviderType, ILLMProvider> = new Map();
  private primaryProvider: LLMProviderType;
  private fallbackProvider: LLMProviderType | null;
  private enableTemplateFallback: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
  ) {
    // Register providers
    this.providers.set('openai', this.openaiProvider);
    this.providers.set('anthropic', this.anthropicProvider);

    // Configure primary and fallback providers
    this.primaryProvider =
      (this.configService.get<string>('LLM_PRIMARY_PROVIDER') as LLMProviderType) || 'openai';
    this.fallbackProvider =
      (this.configService.get<string>('LLM_FALLBACK_PROVIDER') as LLMProviderType) || null;
    this.enableTemplateFallback =
      this.configService.get<string>('LLM_ENABLE_TEMPLATE_FALLBACK') !== 'false';
  }

  onModuleInit(): void {
    this.logProviderStatus();
  }

  private logProviderStatus(): void {
    const availableProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name]) => name);

    if (availableProviders.length === 0) {
      this.logger.warn(
        'No LLM providers available. Content generation will use template-based fallback.',
      );
    } else {
      this.logger.log(`Available LLM providers: ${availableProviders.join(', ')}`);
      this.logger.log(`Primary provider: ${this.primaryProvider}`);
      if (this.fallbackProvider) {
        this.logger.log(`Fallback provider: ${this.fallbackProvider}`);
      }
    }
  }

  /**
   * Check if any LLM provider is available
   */
  isAvailable(): boolean {
    return Array.from(this.providers.values()).some((p) => p.isAvailable());
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: LLMProviderType): boolean {
    return this.providers.get(provider)?.isAvailable() ?? false;
  }

  /**
   * Check if template fallback is enabled
   */
  isTemplateFallbackEnabled(): boolean {
    return this.enableTemplateFallback;
  }

  /**
   * Get the primary provider
   */
  getPrimaryProvider(): LLMProviderType {
    return this.primaryProvider;
  }

  /**
   * Get rate limit status for a provider
   */
  getRateLimitStatus(provider?: LLMProviderType): RateLimitInfo {
    const targetProvider = provider || this.primaryProvider;
    return (
      this.providers.get(targetProvider)?.getRateLimitStatus() || {
        requestsRemaining: 0,
        tokensRemaining: 0,
        resetInSeconds: 0,
        isLimited: true,
      }
    );
  }

  /**
   * Generate completion with automatic provider selection and fallback
   */
  async complete(
    prompt: string,
    config?: LLMRequestConfig,
    options?: LLMServiceOptions,
  ): Promise<LLMResponse> {
    const messages: LLMMessage[] = [{ role: 'user', content: prompt }];
    if (config?.systemPrompt) {
      messages.unshift({ role: 'system', content: config.systemPrompt });
    }
    return this.chat(messages, config, options);
  }

  /**
   * Chat completion with automatic provider selection and fallback
   */
  async chat(
    messages: LLMMessage[],
    config?: LLMRequestConfig,
    options?: LLMServiceOptions,
  ): Promise<LLMResponse> {
    const useFallback = options?.useFallback ?? true;
    const preferredProvider = options?.provider || this.primaryProvider;

    // Try primary provider
    const primaryProviderInstance = this.providers.get(preferredProvider);
    if (primaryProviderInstance?.isAvailable() && !primaryProviderInstance.isRateLimited()) {
      try {
        this.logger.debug(`Using primary provider: ${preferredProvider}`);
        return await primaryProviderInstance.chat(messages, config);
      } catch (error) {
        this.logger.warn(
          `Primary provider ${preferredProvider} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // If error is not retryable and we don't have fallback, rethrow
        if (!useFallback || !(error instanceof LLMError) || !error.retryable) {
          if (!useFallback) {
            throw error;
          }
        }
      }
    }

    // Try fallback provider
    if (useFallback && this.fallbackProvider && this.fallbackProvider !== preferredProvider) {
      const fallbackProviderInstance = this.providers.get(this.fallbackProvider);
      if (fallbackProviderInstance?.isAvailable() && !fallbackProviderInstance.isRateLimited()) {
        try {
          this.logger.debug(`Using fallback provider: ${this.fallbackProvider}`);
          return await fallbackProviderInstance.chat(messages, config);
        } catch (error) {
          this.logger.warn(
            `Fallback provider ${this.fallbackProvider} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    // Try any available provider as last resort
    if (useFallback) {
      for (const [name, provider] of this.providers) {
        if (
          name !== preferredProvider &&
          name !== this.fallbackProvider &&
          provider.isAvailable() &&
          !provider.isRateLimited()
        ) {
          try {
            this.logger.debug(`Using alternative provider: ${name}`);
            return await provider.chat(messages, config);
          } catch (error) {
            this.logger.warn(
              `Alternative provider ${name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }
    }

    // All providers failed
    throw new LLMError(
      'All LLM providers failed or unavailable',
      LLMErrorType.SERVICE_UNAVAILABLE,
      'llm-service',
      true,
      60,
    );
  }

  /**
   * Generate content with provider fallback and template fallback support
   * Returns null if LLM generation should fall back to template
   */
  async generateWithFallback(
    prompt: string,
    config?: LLMRequestConfig,
    options?: LLMServiceOptions,
  ): Promise<LLMResponse | null> {
    try {
      return await this.complete(prompt, config, options);
    } catch (error) {
      if (this.enableTemplateFallback) {
        this.logger.warn(
          `LLM generation failed, falling back to template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        return null;
      }
      throw error;
    }
  }

  /**
   * Generate a product description using LLM
   */
  async generateProductDescription(data: {
    productName: string;
    category: string;
    features?: string[];
    specifications?: Record<string, any>;
    targetAudience?: string;
    tone?: 'professional' | 'casual' | 'luxury' | 'technical';
  }): Promise<string | null> {
    const systemPrompt = `You are an expert e-commerce copywriter. Generate compelling, SEO-optimized product descriptions that drive conversions.
Focus on benefits over features, use power words, and create a sense of urgency without being pushy.
Match the tone requested and keep descriptions scannable with clear formatting.`;

    const userPrompt = `Generate a product description for the following product:

Product Name: ${data.productName}
Category: ${data.category}
${data.features?.length ? `Key Features: ${data.features.join(', ')}` : ''}
${data.specifications ? `Specifications: ${JSON.stringify(data.specifications)}` : ''}
${data.targetAudience ? `Target Audience: ${data.targetAudience}` : ''}
Tone: ${data.tone || 'professional'}

Please provide:
1. A short description (2-3 sentences, max 160 characters for SEO meta)
2. A detailed description (200-300 words)
3. 5 key bullet points highlighting the main benefits

Format the output as:
SHORT_DESCRIPTION:
[short description here]

DETAILED_DESCRIPTION:
[detailed description here]

BULLET_POINTS:
- [bullet 1]
- [bullet 2]
- [bullet 3]
- [bullet 4]
- [bullet 5]`;

    try {
      const response = await this.generateWithFallback(userPrompt, {
        systemPrompt,
        maxTokens: 1024,
        temperature: 0.7,
      });

      return response?.content || null;
    } catch (error) {
      this.logger.error('Failed to generate product description', error);
      return null;
    }
  }

  /**
   * Summarize product reviews using LLM
   */
  async summarizeReviews(data: {
    productId: string;
    productName?: string;
    reviews: Array<{
      rating: number;
      content: string;
      helpful?: number;
    }>;
  }): Promise<string | null> {
    if (data.reviews.length === 0) {
      return null;
    }

    const systemPrompt = `You are an expert at analyzing customer reviews and extracting actionable insights.
Provide balanced, honest summaries that help potential buyers make informed decisions.
Always mention both positives and areas for improvement.`;

    const reviewsText = data.reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars): ${r.content}`)
      .join('\n\n');

    const userPrompt = `Analyze and summarize the following customer reviews${data.productName ? ` for "${data.productName}"` : ''}:

${reviewsText}

Please provide:
1. A brief overall summary (2-3 sentences)
2. Key positive themes customers mention
3. Common concerns or criticisms
4. Notable quotes from reviews

Format the output as:
SUMMARY:
[overall summary here]

POSITIVE_THEMES:
- [theme 1]
- [theme 2]
- [theme 3]

CONCERNS:
- [concern 1]
- [concern 2]

NOTABLE_QUOTES:
- "[quote 1]"
- "[quote 2]"`;

    try {
      const response = await this.generateWithFallback(userPrompt, {
        systemPrompt,
        maxTokens: 1024,
        temperature: 0.5,
      });

      return response?.content || null;
    } catch (error) {
      this.logger.error('Failed to summarize reviews', error);
      return null;
    }
  }
}
