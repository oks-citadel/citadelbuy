import { Injectable, Logger } from '@nestjs/common';
import { IShippingProvider } from './shipping-provider.interface';
import { UpsProvider } from './ups.provider';
import { FedexProvider } from './fedex.provider';
import { UspsProvider } from './usps.provider';
import { DhlProvider } from './dhl.provider';
import { ShippingCarrierEnum } from '../dto/shipping.dto';

export interface ProviderConfig {
  carrier: ShippingCarrierEnum;
  apiKey?: string;
  apiSecret?: string;
  accountNumber?: string;
  meterNumber?: string;
  testMode?: boolean;
  config?: any;
}

@Injectable()
export class ShippingProviderFactory {
  private readonly logger = new Logger(ShippingProviderFactory.name);

  /**
   * Create a shipping provider instance based on configuration
   */
  createProvider(config: ProviderConfig): IShippingProvider | null {
    try {
      const providerConfig = {
        apiKey: config.apiKey || '',
        apiSecret: config.apiSecret || '',
        accountNumber: config.accountNumber || '',
        meterNumber: config.meterNumber || '',
        testMode: config.testMode ?? process.env.NODE_ENV !== 'production',
      };

      switch (config.carrier) {
        case ShippingCarrierEnum.UPS:
          this.logger.log('Creating UPS provider instance');
          return new UpsProvider(providerConfig);

        case ShippingCarrierEnum.FEDEX:
          this.logger.log('Creating FedEx provider instance');
          return new FedexProvider(providerConfig);

        case ShippingCarrierEnum.USPS:
          this.logger.log('Creating USPS provider instance');
          return new UspsProvider(providerConfig);

        case ShippingCarrierEnum.DHL:
          this.logger.log('Creating DHL provider instance');
          return new DhlProvider(providerConfig);

        default:
          this.logger.warn(`Unknown carrier: ${config.carrier}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Failed to create ${config.carrier} provider: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.carrier) {
      errors.push('Carrier is required');
    }

    // Carrier-specific validation
    switch (config.carrier) {
      case ShippingCarrierEnum.UPS:
        if (!config.apiKey) errors.push('UPS API key is required');
        if (!config.apiSecret) errors.push('UPS API secret is required');
        if (!config.accountNumber) errors.push('UPS account number is required');
        break;

      case ShippingCarrierEnum.FEDEX:
        if (!config.apiKey) errors.push('FedEx API key is required');
        if (!config.apiSecret) errors.push('FedEx API secret is required');
        if (!config.accountNumber) errors.push('FedEx account number is required');
        if (!config.meterNumber) errors.push('FedEx meter number is required');
        break;

      case ShippingCarrierEnum.USPS:
        if (!config.apiKey) errors.push('USPS API key is required');
        if (!config.accountNumber) errors.push('USPS account number is required');
        break;

      case ShippingCarrierEnum.DHL:
        if (!config.apiKey) errors.push('DHL API key is required');
        if (!config.apiSecret) errors.push('DHL API secret is required');
        if (!config.accountNumber) errors.push('DHL account number is required');
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported carriers
   */
  getSupportedCarriers(): ShippingCarrierEnum[] {
    return [
      ShippingCarrierEnum.UPS,
      ShippingCarrierEnum.FEDEX,
      ShippingCarrierEnum.USPS,
      ShippingCarrierEnum.DHL,
    ];
  }

  /**
   * Check if a carrier is supported
   */
  isCarrierSupported(carrier: string): boolean {
    return this.getSupportedCarriers().includes(carrier as ShippingCarrierEnum);
  }
}
