/**
 * OpenAI LLM Provider Implementation
 *
 * Provides integration with OpenAI's GPT models for content generation.
 * Includes rate limiting awareness and proper error handling.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ILLMProvider,
  LLMRequestConfig,
  LLMMessage,
  LLMResponse,
  RateLimitInfo,
  LLMError,
  LLMErrorType,
} from './llm.interfaces';

@Injectable()
export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI | null = null;
  private readonly model: string;
  private rateLimitInfo: RateLimitInfo = {
    requestsRemaining: 1000,
    tokensRemaining: 100000,
    resetInSeconds: 0,
    isLimited: false,
  };
  private lastRateLimitUpdate: number = Date.now();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const organization = this.configService.get<string>('OPENAI_ORGANIZATION');
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview';

    if (apiKey) {
      try {
        this.client = new OpenAI({
          apiKey,
          organization: organization || undefined,
          timeout: 60000, // 60 second timeout
          maxRetries: 2,
        });
        this.logger.log(`OpenAI provider initialized with model: ${this.model}`);
      } catch (error) {
        this.logger.error('Failed to initialize OpenAI client', error);
      }
    } else {
      this.logger.warn('OpenAI API key not configured - provider unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(prompt: string, config?: LLMRequestConfig): Promise<LLMResponse> {
    const messages: LLMMessage[] = [{ role: 'user', content: prompt }];

    if (config?.systemPrompt) {
      messages.unshift({ role: 'system', content: config.systemPrompt });
    }

    return this.chat(messages, config);
  }

  async chat(messages: LLMMessage[], config?: LLMRequestConfig): Promise<LLMResponse> {
    if (!this.client) {
      throw new LLMError(
        'OpenAI client not initialized',
        LLMErrorType.SERVICE_UNAVAILABLE,
        this.name,
        false,
      );
    }

    if (this.isRateLimited()) {
      throw new LLMError(
        'OpenAI rate limit exceeded',
        LLMErrorType.RATE_LIMITED,
        this.name,
        true,
        this.rateLimitInfo.resetInSeconds,
      );
    }

    try {
      const openAIMessages = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openAIMessages,
        max_tokens: config?.maxTokens || 2048,
        temperature: config?.temperature ?? 0.7,
        top_p: config?.topP ?? 1,
        stop: config?.stopSequences,
      });

      // Update rate limit info from headers if available
      this.updateRateLimitFromResponse(response);

      const choice = response.choices[0];

      return {
        content: choice.message?.content || '',
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        metadata: {
          id: response.id,
          created: response.created,
          systemFingerprint: response.system_fingerprint,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  getRateLimitStatus(): RateLimitInfo {
    // Decay rate limit over time if we haven't received updates
    const elapsedSeconds = (Date.now() - this.lastRateLimitUpdate) / 1000;

    if (this.rateLimitInfo.isLimited && elapsedSeconds >= this.rateLimitInfo.resetInSeconds) {
      this.rateLimitInfo = {
        requestsRemaining: 1000,
        tokensRemaining: 100000,
        resetInSeconds: 0,
        isLimited: false,
      };
    }

    return { ...this.rateLimitInfo };
  }

  isRateLimited(): boolean {
    const status = this.getRateLimitStatus();
    return status.isLimited;
  }

  private updateRateLimitFromResponse(response: any): void {
    // OpenAI returns rate limit info in response headers
    // The SDK doesn't expose these directly, so we track based on usage
    const usage = response.usage;
    if (usage) {
      // Decrement our local tracking
      this.rateLimitInfo.tokensRemaining = Math.max(
        0,
        this.rateLimitInfo.tokensRemaining - usage.total_tokens,
      );
      this.rateLimitInfo.requestsRemaining = Math.max(
        0,
        this.rateLimitInfo.requestsRemaining - 1,
      );
      this.lastRateLimitUpdate = Date.now();
    }
  }

  private mapFinishReason(
    reason: string | null,
  ): 'stop' | 'length' | 'content_filter' | 'error' | string {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return reason || 'unknown';
    }
  }

  private handleError(error: any): LLMError {
    this.logger.error('OpenAI API error', error);

    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status;
      const errorMessage = error.message;

      switch (statusCode) {
        case 401:
          return new LLMError(
            'Invalid OpenAI API key',
            LLMErrorType.AUTHENTICATION,
            this.name,
            false,
            undefined,
            error,
          );

        case 429:
          // Rate limited
          const retryAfter = this.extractRetryAfter(error);
          this.rateLimitInfo = {
            requestsRemaining: 0,
            tokensRemaining: 0,
            resetInSeconds: retryAfter,
            isLimited: true,
          };
          this.lastRateLimitUpdate = Date.now();

          return new LLMError(
            'OpenAI rate limit exceeded',
            LLMErrorType.RATE_LIMITED,
            this.name,
            true,
            retryAfter,
            error,
          );

        case 400:
          return new LLMError(
            `Invalid request: ${errorMessage}`,
            LLMErrorType.INVALID_REQUEST,
            this.name,
            false,
            undefined,
            error,
          );

        case 500:
        case 502:
        case 503:
          return new LLMError(
            'OpenAI service temporarily unavailable',
            LLMErrorType.SERVICE_UNAVAILABLE,
            this.name,
            true,
            30,
            error,
          );

        default:
          return new LLMError(
            `OpenAI API error: ${errorMessage}`,
            LLMErrorType.UNKNOWN,
            this.name,
            false,
            undefined,
            error,
          );
      }
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new LLMError(
        'OpenAI request timed out',
        LLMErrorType.TIMEOUT,
        this.name,
        true,
        5,
        error,
      );
    }

    return new LLMError(
      `Unexpected OpenAI error: ${error.message}`,
      LLMErrorType.UNKNOWN,
      this.name,
      false,
      undefined,
      error,
    );
  }

  private extractRetryAfter(error: any): number {
    // Try to extract retry-after from headers or error message
    if (error.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after'], 10);
    }

    // Default to 60 seconds if not specified
    return 60;
  }
}
