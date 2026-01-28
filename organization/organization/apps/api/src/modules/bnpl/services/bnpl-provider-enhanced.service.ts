/**
 * Enhanced BNPL Provider Service
 *
 * Enhanced service that uses the new provider architecture with individual provider classes.
 * This service acts as a facade for the BNPL provider factory and individual providers.
 */

import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BnplProvider } from '@prisma/client';
import { BnplProviderFactory } from '../providers/bnpl-provider.factory';
import {
  BnplSessionRequest,
  BnplSession,
  BnplAuthorizationResult,
  BnplRefundRequest,
  BnplRefundResult,
  BnplEligibilityRequest,
  BnplEligibilityResponse,
} from '../providers/base-bnpl.provider';

@Injectable()
export class BnplProviderEnhancedService {
  private readonly logger = new Logger(BnplProviderEnhancedService.name);

  constructor(private readonly providerFactory: BnplProviderFactory) {}

  // =============================================================================
  // PROVIDER AVAILABILITY
  // =============================================================================

  /**
   * Get list of available BNPL providers
   */
  getAvailableProviders(): BnplProvider[] {
    return this.providerFactory.getAvailableProviders();
  }

  /**
   * Check if a specific provider is configured
   */
  isProviderConfigured(provider: BnplProvider): boolean {
    return this.providerFactory.isProviderAvailable(provider);
  }

  // =============================================================================
  // ELIGIBILITY CHECK
  // =============================================================================

  /**
   * Check if an order is eligible for BNPL with a specific provider
   */
  async checkEligibility(
    provider: BnplProvider,
    request: BnplEligibilityRequest,
  ): Promise<BnplEligibilityResponse> {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    return providerInstance.checkEligibility(request);
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Create a checkout session with the BNPL provider
   */
  async createSession(provider: BnplProvider, request: BnplSessionRequest): Promise<BnplSession> {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    this.logger.log(`Creating BNPL session with ${provider} for order ${request.orderId}`);
    return providerInstance.createSession(request);
  }

  // =============================================================================
  // AUTHORIZATION & CAPTURE
  // =============================================================================

  /**
   * Authorize a BNPL payment after customer approval
   */
  async authorizePayment(
    provider: BnplProvider,
    sessionId: string,
    checkoutToken?: string,
  ): Promise<BnplAuthorizationResult> {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    this.logger.log(`Authorizing BNPL payment with ${provider} for session ${sessionId}`);
    return providerInstance.authorizePayment(sessionId, checkoutToken);
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment(
    provider: BnplProvider,
    authorizationToken: string,
    amount?: number,
  ) {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    this.logger.log(`Capturing BNPL payment with ${provider} for authorization ${authorizationToken}`);
    return providerInstance.capturePayment(authorizationToken, amount);
  }

  // =============================================================================
  // REFUNDS
  // =============================================================================

  /**
   * Process a refund through the BNPL provider
   */
  async processRefund(
    provider: BnplProvider,
    request: BnplRefundRequest,
  ): Promise<BnplRefundResult> {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    this.logger.log(`Processing BNPL refund with ${provider} for order ${request.providerOrderId}`);
    return providerInstance.processRefund(request);
  }

  // =============================================================================
  // WEBHOOKS
  // =============================================================================

  /**
   * Handle webhook events from a BNPL provider
   */
  async handleWebhook(provider: BnplProvider, payload: any, headers: Record<string, string>) {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    this.logger.log(`Handling BNPL webhook from ${provider}`);
    return providerInstance.handleWebhook(payload, headers);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(provider: BnplProvider, payload: any, signature: string): boolean {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    return providerInstance.verifyWebhookSignature(payload, signature);
  }

  // =============================================================================
  // ORDER MANAGEMENT
  // =============================================================================

  /**
   * Cancel an order with the BNPL provider
   */
  async cancelOrder(provider: BnplProvider, orderId: string) {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    this.logger.log(`Cancelling BNPL order with ${provider}: ${orderId}`);
    return providerInstance.cancelOrder(orderId);
  }

  /**
   * Get order status from the BNPL provider
   */
  async getOrderStatus(provider: BnplProvider, orderId: string) {
    const providerInstance = this.providerFactory.getProvider(provider);

    if (!providerInstance) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    return providerInstance.getOrderStatus(orderId);
  }
}
