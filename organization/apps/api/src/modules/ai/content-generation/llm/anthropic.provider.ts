/**
 * Anthropic LLM Provider Implementation
 *
 * Provides integration with Anthropic's Claude models for content generation.
 * Includes rate limiting awareness and proper error handling.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
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
export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: Anthropic | null = null;
  private readonly model: string;
  private rateLimitInfo: RateLimitInfo = {
    requestsRemaining: 1000,
    tokensRemaining: 100000,
    resetInSeconds: 0,
    isLimited: false,
  };
  private lastRateLimitUpdate: number = Date.now();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.model = this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022';

    if (apiKey) {
      try {
        this.client = new Anthropic({
          apiKey,
          timeout: 60000, // 60 second timeout
          maxRetries: 2,
        });
        this.logger.log(`Anthropic provider initialized with model: ${this.model}`);
      } catch (error) {
        this.logger.error('Failed to initialize Anthropic client', error);
      }
    } else {
      this.logger.warn('Anthropic API key not configured - provider unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(prompt: string, config?: LLMRequestConfig): Promise<LLMResponse> {
    const messages: LLMMessage[] = [{ role: 'user', content: prompt }];
    return this.chat(messages, config);
  }

  async chat(messages: LLMMessage[], config?: LLMRequestConfig): Promise<LLMResponse> {
    if (!this.client) {
      throw new LLMError(
        'Anthropic client not initialized',
        LLMErrorType.SERVICE_UNAVAILABLE,
        this.name,
        false,
      );
    }

    if (this.isRateLimited()) {
      throw new LLMError(
        'Anthropic rate limit exceeded',
        LLMErrorType.RATE_LIMITED,
        this.name,
        true,
        this.rateLimitInfo.resetInSeconds,
      );
    }

    try {
      // Extract system message if present
      let systemPrompt = config?.systemPrompt;
      const chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt = msg.content;
        } else {
          chatMessages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      // Ensure we have at least one user message
      if (chatMessages.length === 0) {
        throw new LLMError(
          'At least one user message is required',
          LLMErrorType.INVALID_REQUEST,
          this.name,
          false,
        );
      }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: config?.maxTokens || 2048,
        system: systemPrompt,
        messages: chatMessages,
        temperature: config?.temperature ?? 0.7,
        top_p: config?.topP ?? 1,
        stop_sequences: config?.stopSequences,
      });

      // Update rate limit info
      this.updateRateLimitFromResponse(response);

      // Extract text content from response
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return {
        content: textContent,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: this.mapStopReason(response.stop_reason),
        metadata: {
          id: response.id,
          type: response.type,
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
    // Track usage locally
    const usage = response.usage;
    if (usage) {
      const totalTokens = usage.input_tokens + usage.output_tokens;
      this.rateLimitInfo.tokensRemaining = Math.max(
        0,
        this.rateLimitInfo.tokensRemaining - totalTokens,
      );
      this.rateLimitInfo.requestsRemaining = Math.max(
        0,
        this.rateLimitInfo.requestsRemaining - 1,
      );
      this.lastRateLimitUpdate = Date.now();
    }
  }

  private mapStopReason(
    reason: string | null,
  ): 'stop' | 'length' | 'content_filter' | 'error' | string {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return reason || 'unknown';
    }
  }

  private handleError(error: any): LLMError {
    this.logger.error('Anthropic API error', error);

    // Already an LLMError
    if (error instanceof LLMError) {
      return error;
    }

    if (error instanceof Anthropic.APIError) {
      const statusCode = error.status;
      const errorMessage = error.message;

      switch (statusCode) {
        case 401:
          return new LLMError(
            'Invalid Anthropic API key',
            LLMErrorType.AUTHENTICATION,
            this.name,
            false,
            undefined,
            error,
          );

        case 429: {
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
            'Anthropic rate limit exceeded',
            LLMErrorType.RATE_LIMITED,
            this.name,
            true,
            retryAfter,
            error,
          );
        }

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
        case 529:
          return new LLMError(
            'Anthropic service temporarily unavailable',
            LLMErrorType.SERVICE_UNAVAILABLE,
            this.name,
            true,
            30,
            error,
          );

        default:
          return new LLMError(
            `Anthropic API error: ${errorMessage}`,
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
        'Anthropic request timed out',
        LLMErrorType.TIMEOUT,
        this.name,
        true,
        5,
        error,
      );
    }

    return new LLMError(
      `Unexpected Anthropic error: ${error.message}`,
      LLMErrorType.UNKNOWN,
      this.name,
      false,
      undefined,
      error,
    );
  }

  private extractRetryAfter(error: any): number {
    // Try to extract retry-after from headers
    if (error.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after'], 10);
    }

    // Default to 60 seconds if not specified
    return 60;
  }
}
