import { Injectable, Logger } from '@nestjs/common';
import { TaxProviderInterface } from './tax-provider.interface';
import { TaxJarProvider } from './taxjar.provider';
import { AvalaraProvider } from './avalara.provider';

/**
 * Factory for creating the appropriate tax provider instance
 * based on configuration
 */
@Injectable()
export class TaxProviderFactory {
  private readonly logger = new Logger(TaxProviderFactory.name);
  private provider: TaxProviderInterface | null = null;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const providerName = process.env.TAX_PROVIDER || 'none';

    switch (providerName.toLowerCase()) {
      case 'taxjar':
        this.provider = new TaxJarProvider();
        this.logger.log('Initialized TaxJar provider');
        break;

      case 'avalara':
        this.provider = new AvalaraProvider();
        this.logger.log('Initialized Avalara provider');
        break;

      case 'none':
      default:
        this.logger.warn(
          'No external tax provider configured. Using internal tax calculation only.',
        );
        this.provider = null;
        break;
    }
  }

  /**
   * Get the configured tax provider instance
   * Returns null if no external provider is configured
   */
  getProvider(): TaxProviderInterface | null {
    return this.provider;
  }

  /**
   * Check if an external provider is configured
   */
  hasProvider(): boolean {
    return this.provider !== null;
  }

  /**
   * Get the name of the configured provider
   */
  getProviderName(): string {
    return this.provider?.getProviderName() || 'Internal';
  }
}
