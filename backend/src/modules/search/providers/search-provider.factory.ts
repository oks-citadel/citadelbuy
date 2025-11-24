import { Injectable, Logger } from '@nestjs/common';
import { SearchProviderInterface } from './search-provider.interface';
import { ElasticsearchProvider } from './elasticsearch.provider';
import { AlgoliaProvider } from './algolia.provider';
import { InternalProvider } from './internal.provider';
import { PrismaService } from '../../../common/prisma/prisma.service';

export type SearchProviderType = 'elasticsearch' | 'algolia' | 'internal' | 'auto';

/**
 * Factory for creating search providers
 */
@Injectable()
export class SearchProviderFactory {
  private readonly logger = new Logger(SearchProviderFactory.name);
  private cachedProvider: SearchProviderInterface | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get search provider based on configuration
   * Priority: SEARCH_PROVIDER env var > Auto-detect > Internal fallback
   */
  async getProvider(): Promise<SearchProviderInterface> {
    if (this.cachedProvider) {
      return this.cachedProvider;
    }

    const providerType = (process.env.SEARCH_PROVIDER || 'auto').toLowerCase() as SearchProviderType;

    this.logger.log(`Initializing search provider: ${providerType}`);

    let provider: SearchProviderInterface;

    switch (providerType) {
      case 'elasticsearch':
        provider = new ElasticsearchProvider();
        break;

      case 'algolia':
        provider = new AlgoliaProvider();
        break;

      case 'internal':
        provider = new InternalProvider(this.prisma);
        break;

      case 'auto':
      default:
        provider = await this.autoDetectProvider();
        break;
    }

    const isAvailable = await provider.isAvailable();

    if (!isAvailable && providerType !== 'internal') {
      this.logger.warn(
        `${provider.getProviderName()} provider not available, falling back to internal search`,
      );
      provider = new InternalProvider(this.prisma);
    }

    this.cachedProvider = provider;
    this.logger.log(`Using search provider: ${provider.getProviderName()}`);

    return provider;
  }

  /**
   * Auto-detect available search provider
   * Priority: Elasticsearch > Algolia > Internal
   */
  private async autoDetectProvider(): Promise<SearchProviderInterface> {
    // Try Elasticsearch first
    const elasticsearchProvider = new ElasticsearchProvider();
    if (await elasticsearchProvider.isAvailable()) {
      return elasticsearchProvider;
    }

    // Try Algolia second
    const algoliaProvider = new AlgoliaProvider();
    if (await algoliaProvider.isAvailable()) {
      return algoliaProvider;
    }

    // Fallback to internal
    return new InternalProvider(this.prisma);
  }

  /**
   * Create a specific provider instance
   */
  async createProvider(type: SearchProviderType): Promise<SearchProviderInterface> {
    switch (type) {
      case 'elasticsearch':
        return new ElasticsearchProvider();

      case 'algolia':
        return new AlgoliaProvider();

      case 'internal':
        return new InternalProvider(this.prisma);

      default:
        return this.autoDetectProvider();
    }
  }

  /**
   * Reset cached provider (useful for testing or configuration changes)
   */
  resetCache(): void {
    this.cachedProvider = null;
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<
    Array<{ name: string; type: string; available: boolean }>
  > {
    const providers: SearchProviderInterface[] = [
      new ElasticsearchProvider(),
      new AlgoliaProvider(),
      new InternalProvider(this.prisma),
    ];

    const results = await Promise.all(
      providers.map(async (provider) => ({
        name: provider.getProviderName(),
        type: provider.getProviderName().toLowerCase(),
        available: await provider.isAvailable(),
      })),
    );

    return results;
  }
}
