/**
 * BNPL Provider Factory
 *
 * Factory service for creating and managing BNPL provider instances.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BnplProvider } from '@prisma/client';
import { BaseBnplProvider, BnplProviderConfig } from './base-bnpl.provider';
import { AffirmProvider } from './affirm.provider';
import { KlarnaProvider } from './klarna.provider';
import { AfterpayProvider } from './afterpay.provider';

@Injectable()
export class BnplProviderFactory {
  private readonly logger = new Logger(BnplProviderFactory.name);
  private readonly providers: Map<BnplProvider, BaseBnplProvider>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize all BNPL providers
   */
  private initializeProviders(): void {
    // Initialize Klarna
    const klarnaConfig = this.createKlarnaConfig();
    if (klarnaConfig.apiKey) {
      const klarnaProvider = new KlarnaProvider(this.httpService, klarnaConfig);
      this.providers.set(BnplProvider.KLARNA, klarnaProvider);
      this.logger.log('Klarna provider initialized');
    }

    // Initialize Affirm
    const affirmConfig = this.createAffirmConfig();
    if (affirmConfig.apiKey) {
      const affirmProvider = new AffirmProvider(this.httpService, affirmConfig);
      this.providers.set(BnplProvider.AFFIRM, affirmProvider);
      this.logger.log('Affirm provider initialized');
    }

    // Initialize Afterpay
    const afterpayConfig = this.createAfterpayConfig();
    if (afterpayConfig.apiKey) {
      const afterpayProvider = new AfterpayProvider(this.httpService, afterpayConfig);
      this.providers.set(BnplProvider.AFTERPAY, afterpayProvider);
      this.logger.log('Afterpay provider initialized');
    }

    this.logger.log(`Initialized ${this.providers.size} BNPL provider(s)`);
  }

  /**
   * Get a specific provider instance
   */
  getProvider(provider: BnplProvider): BaseBnplProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Check if a provider is configured and available
   */
  isProviderAvailable(provider: BnplProvider): boolean {
    const providerInstance = this.providers.get(provider);
    return providerInstance?.isConfigured() ?? false;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): BnplProvider[] {
    return Array.from(this.providers.keys()).filter((provider) =>
      this.isProviderAvailable(provider),
    );
  }

  /**
   * Get all provider instances
   */
  getAllProviders(): Map<BnplProvider, BaseBnplProvider> {
    return this.providers;
  }

  // =============================================================================
  // CONFIGURATION BUILDERS
  // =============================================================================

  private createKlarnaConfig(): BnplProviderConfig {
    const environment = this.configService.get<string>('KLARNA_ENV') === 'production'
      ? 'production'
      : 'sandbox';

    return {
      apiKey: this.configService.get<string>('KLARNA_API_KEY') || '',
      apiSecret: this.configService.get<string>('KLARNA_API_SECRET') || '',
      merchantId: this.configService.get<string>('KLARNA_MERCHANT_ID'),
      environment,
      baseUrl:
        environment === 'production'
          ? 'https://api.klarna.com'
          : 'https://api.playground.klarna.com',
    };
  }

  private createAffirmConfig(): BnplProviderConfig {
    const environment = this.configService.get<string>('AFFIRM_ENV') === 'production'
      ? 'production'
      : 'sandbox';

    return {
      apiKey: this.configService.get<string>('AFFIRM_PUBLIC_KEY') || '',
      apiSecret: this.configService.get<string>('AFFIRM_PRIVATE_KEY') || '',
      environment,
      baseUrl:
        environment === 'production'
          ? 'https://api.affirm.com'
          : 'https://sandbox.affirm.com',
    };
  }

  private createAfterpayConfig(): BnplProviderConfig {
    const environment = this.configService.get<string>('AFTERPAY_ENV') === 'production'
      ? 'production'
      : 'sandbox';

    return {
      apiKey: this.configService.get<string>('AFTERPAY_MERCHANT_ID') || '',
      apiSecret: this.configService.get<string>('AFTERPAY_SECRET_KEY') || '',
      environment,
      baseUrl:
        environment === 'production'
          ? 'https://global-api.afterpay.com'
          : 'https://global-api-sandbox.afterpay.com',
    };
  }
}
