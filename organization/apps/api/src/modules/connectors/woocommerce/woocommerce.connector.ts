/**
 * WooCommerce Connector
 *
 * Implements the connector interface for WooCommerce stores.
 * Uses the WooCommerce REST API v3 with consumer key/secret authentication.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  IConnector,
  ConnectorConfig,
  ConnectorSource,
  WooCommerceConnectorConfig,
  FetchOptions,
  PaginatedResponse,
  NormalizedProduct,
  SyncResult,
  SyncError,
  SyncWarning,
  ConnectionTestResult,
  WebhookConfig,
  ConnectorEventType,
} from '../base/connector.interface';
import { WooCommerceMapper } from './woocommerce.mapper';
import {
  WooCommerceProduct,
  WooCommerceVariation,
  WooCommerceStoreInfo,
  WooCommerceWebhookTopic,
} from './dto/woocommerce-product.dto';

/**
 * WooCommerce API rate limiting
 */
const RATE_LIMIT_DELAY_MS = 100; // 100ms between requests (conservative)
const MAX_PER_PAGE = 100;

@Injectable()
export class WooCommerceConnector implements IConnector {
  readonly type: ConnectorSource = 'woocommerce';
  readonly name = 'WooCommerce';

  private readonly logger = new Logger(WooCommerceConnector.name);
  private config?: WooCommerceConnectorConfig;
  private isConnected = false;
  private storeInfo?: WooCommerceStoreInfo;
  private lastRequestTime = 0;
  private tenantId?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mapper: WooCommerceMapper,
  ) {}

  /**
   * Connect to WooCommerce store
   */
  async connect(config: ConnectorConfig): Promise<void> {
    this.config = config as WooCommerceConnectorConfig;
    this.tenantId = config.tenantId;

    // Validate configuration
    if (!this.config.credentials?.siteUrl) {
      throw new Error('WooCommerce site URL is required');
    }
    if (!this.config.credentials?.consumerKey) {
      throw new Error('WooCommerce consumer key is required');
    }
    if (!this.config.credentials?.consumerSecret) {
      throw new Error('WooCommerce consumer secret is required');
    }

    // Normalize site URL
    this.config.credentials.siteUrl = this.normalizeSiteUrl(this.config.credentials.siteUrl);

    // Test the connection
    try {
      this.storeInfo = await this.fetchStoreInfo();
      this.isConnected = true;

      this.logger.log(`Connected to WooCommerce store: ${this.storeInfo.store_name}`);

      this.eventEmitter.emit(ConnectorEventType.CONNECTED, {
        type: ConnectorEventType.CONNECTED,
        connectorId: config.id,
        tenantId: this.tenantId,
        timestamp: new Date(),
        data: {
          siteUrl: this.config.credentials.siteUrl,
          storeName: this.storeInfo.store_name,
          wcVersion: this.storeInfo.wc_version,
        },
      });
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to WooCommerce: ${error.message}`);
    }
  }

  /**
   * Disconnect from WooCommerce
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.storeInfo = undefined;
    this.config = undefined;

    this.eventEmitter.emit(ConnectorEventType.DISCONNECTED, {
      type: ConnectorEventType.DISCONNECTED,
      connectorId: this.config?.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
    });

    this.logger.log('Disconnected from WooCommerce');
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      const storeInfo = await this.fetchStoreInfo();
      const latency = Date.now() - startTime;

      // Fetch product count
      const productCount = await this.fetchProductCount();

      return {
        success: true,
        message: `Successfully connected to ${storeInfo.store_name}`,
        details: {
          latency,
          apiVersion: storeInfo.wc_version,
          productCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to WooCommerce',
        error: {
          code: 'CONNECTION_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Fetch products with pagination
   */
  async fetchProducts(options?: FetchOptions): Promise<PaginatedResponse<NormalizedProduct>> {
    this.ensureConnected();

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 50, MAX_PER_PAGE);

    const params: Record<string, string | number> = {
      page,
      per_page: limit,
    };

    if (options?.since) {
      params.modified_after = options.since.toISOString();
    }

    if (options?.ids && options.ids.length > 0) {
      params.include = options.ids.join(',');
    }

    await this.rateLimitDelay();

    const response = await firstValueFrom(
      this.httpService.get<WooCommerceProduct[]>(this.buildApiUrl('/products'), {
        params,
        auth: this.getAuth(),
      }),
    );

    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    const totalCount = parseInt(response.headers['x-wp-total'] || '0', 10);

    // Fetch variations for variable products
    const variationsMap = new Map<number, WooCommerceVariation[]>();
    const variableProducts = response.data.filter((p) => p.type === 'variable' && p.variations.length > 0);

    if (variableProducts.length > 0 && this.config?.settings?.syncInventory !== false) {
      for (const product of variableProducts) {
        try {
          const variations = await this.fetchProductVariations(product.id);
          variationsMap.set(product.id, variations);
        } catch (error) {
          this.logger.warn(`Failed to fetch variations for product ${product.id}: ${error.message}`);
        }
      }
    }

    const products = this.mapper.mapProducts(
      response.data,
      variationsMap,
      this.storeInfo?.currency,
    );

    const hasMore = page < totalPages;

    return {
      data: products,
      pagination: {
        total: totalCount,
        page,
        limit,
        hasMore,
        nextCursor: hasMore ? (page + 1).toString() : undefined,
      },
    };
  }

  /**
   * Fetch a single product by external ID
   */
  async fetchProduct(externalId: string): Promise<NormalizedProduct | null> {
    this.ensureConnected();

    try {
      await this.rateLimitDelay();

      const response = await firstValueFrom(
        this.httpService.get<WooCommerceProduct>(this.buildApiUrl(`/products/${externalId}`), {
          auth: this.getAuth(),
        }),
      );

      // Fetch variations if variable product
      let variations: WooCommerceVariation[] | undefined;
      if (response.data.type === 'variable' && response.data.variations.length > 0) {
        variations = await this.fetchProductVariations(response.data.id);
      }

      return this.mapper.mapProduct(response.data, variations, this.storeInfo?.currency);
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to fetch WooCommerce product ${externalId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch product variations
   */
  private async fetchProductVariations(productId: number): Promise<WooCommerceVariation[]> {
    await this.rateLimitDelay();

    const response = await firstValueFrom(
      this.httpService.get<WooCommerceVariation[]>(
        this.buildApiUrl(`/products/${productId}/variations`),
        {
          params: { per_page: 100 },
          auth: this.getAuth(),
        },
      ),
    );

    return response.data;
  }

  /**
   * Sync all products
   */
  async syncProducts(): Promise<SyncResult> {
    this.ensureConnected();

    const startedAt = new Date();
    const errors: SyncError[] = [];
    const warnings: SyncWarning[] = [];
    let totalProcessed = 0;
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let skipped = 0;
    let failed = 0;

    this.eventEmitter.emit(ConnectorEventType.SYNC_STARTED, {
      type: ConnectorEventType.SYNC_STARTED,
      connectorId: this.config?.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
    });

    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await this.fetchProducts({ page, limit: MAX_PER_PAGE });

        for (const product of result.data) {
          totalProcessed++;

          try {
            this.eventEmitter.emit(ConnectorEventType.PRODUCT_UPDATED, {
              type: ConnectorEventType.PRODUCT_UPDATED,
              connectorId: this.config?.id,
              tenantId: this.tenantId,
              timestamp: new Date(),
              data: { product },
            });

            updated++;
          } catch (error) {
            failed++;
            errors.push({
              externalId: product.externalId,
              message: error.message,
              code: 'SYNC_ERROR',
            });
          }
        }

        hasMore = result.pagination.hasMore;
        page++;
      }

      this.eventEmitter.emit(ConnectorEventType.SYNC_COMPLETED, {
        type: ConnectorEventType.SYNC_COMPLETED,
        connectorId: this.config?.id,
        tenantId: this.tenantId,
        timestamp: new Date(),
        data: { totalProcessed, created, updated, deleted, failed },
      });

      return {
        success: failed === 0,
        connectorId: this.config?.id || '',
        startedAt,
        completedAt: new Date(),
        summary: {
          totalProcessed,
          created,
          updated,
          deleted,
          skipped,
          failed,
        },
        errors,
        warnings,
      };
    } catch (error) {
      this.eventEmitter.emit(ConnectorEventType.SYNC_FAILED, {
        type: ConnectorEventType.SYNC_FAILED,
        connectorId: this.config?.id,
        tenantId: this.tenantId,
        timestamp: new Date(),
        error: {
          code: 'SYNC_FAILED',
          message: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Sync changes since a specific date
   */
  async syncDelta(since: Date): Promise<SyncResult> {
    this.ensureConnected();

    const startedAt = new Date();
    const errors: SyncError[] = [];
    const warnings: SyncWarning[] = [];
    let totalProcessed = 0;
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let skipped = 0;
    let failed = 0;

    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await this.fetchProducts({ page, limit: MAX_PER_PAGE, since });

        for (const product of result.data) {
          totalProcessed++;

          try {
            this.eventEmitter.emit(ConnectorEventType.PRODUCT_UPDATED, {
              type: ConnectorEventType.PRODUCT_UPDATED,
              connectorId: this.config?.id,
              tenantId: this.tenantId,
              timestamp: new Date(),
              data: { product },
            });

            updated++;
          } catch (error) {
            failed++;
            errors.push({
              externalId: product.externalId,
              message: error.message,
              code: 'DELTA_SYNC_ERROR',
            });
          }
        }

        hasMore = result.pagination.hasMore;
        page++;
      }

      return {
        success: failed === 0,
        connectorId: this.config?.id || '',
        startedAt,
        completedAt: new Date(),
        summary: {
          totalProcessed,
          created,
          updated,
          deleted,
          skipped,
          failed,
        },
        errors,
        warnings,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Setup webhooks for real-time updates
   */
  async setupWebhooks(): Promise<WebhookConfig> {
    this.ensureConnected();

    const webhookUrl = this.configService.get<string>('WEBHOOK_BASE_URL') + '/api/v1/webhooks/woocommerce/products';
    const topics = [
      WooCommerceWebhookTopic.PRODUCT_CREATED,
      WooCommerceWebhookTopic.PRODUCT_UPDATED,
      WooCommerceWebhookTopic.PRODUCT_DELETED,
    ];

    const registeredWebhooks: string[] = [];

    for (const topic of topics) {
      try {
        await this.rateLimitDelay();

        const response = await firstValueFrom(
          this.httpService.post(
            this.buildApiUrl('/webhooks'),
            {
              name: `Broxiva - ${topic}`,
              topic,
              delivery_url: webhookUrl,
              status: 'active',
            },
            {
              auth: this.getAuth(),
            },
          ),
        );

        registeredWebhooks.push(response.data.id.toString());
      } catch (error) {
        this.logger.warn(`Failed to register webhook for ${topic}: ${error.message}`);
      }
    }

    return {
      webhookId: registeredWebhooks.join(','),
      url: webhookUrl,
      events: topics,
      createdAt: new Date(),
    };
  }

  /**
   * Handle incoming webhook payload
   */
  async handleWebhook(payload: any): Promise<void> {
    this.logger.log(`Received WooCommerce webhook: ${JSON.stringify(payload).substring(0, 100)}...`);

    this.eventEmitter.emit(ConnectorEventType.WEBHOOK_RECEIVED, {
      type: ConnectorEventType.WEBHOOK_RECEIVED,
      connectorId: this.config?.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
      data: payload,
    });
  }

  // Private methods

  /**
   * Fetch store information
   */
  private async fetchStoreInfo(): Promise<WooCommerceStoreInfo> {
    const response = await firstValueFrom(
      this.httpService.get(this.buildApiUrl('/system_status'), {
        auth: this.getAuth(),
      }),
    );

    const data = response.data;

    return {
      store_id: data.environment?.site_id || '',
      store_name: data.environment?.site_name || data.settings?.woocommerce_store_name || 'WooCommerce Store',
      store_url: this.config?.credentials?.siteUrl || '',
      wc_version: data.environment?.version || '',
      currency: data.settings?.currency || 'USD',
      currency_symbol: data.settings?.currency_symbol || '$',
      currency_position: data.settings?.currency_position || 'left',
      thousand_separator: data.settings?.thousand_separator || ',',
      decimal_separator: data.settings?.decimal_separator || '.',
      number_of_decimals: data.settings?.number_of_decimals || 2,
      weight_unit: data.settings?.weight_unit || 'kg',
      dimension_unit: data.settings?.dimension_unit || 'cm',
      timezone: data.environment?.timezone || 'UTC',
    };
  }

  /**
   * Fetch product count
   */
  private async fetchProductCount(): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any[]>(this.buildApiUrl('/products'), {
          params: { per_page: 1 },
          auth: this.getAuth(),
        }),
      );

      return parseInt(response.headers['x-wp-total'] || '0', 10);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Build API URL
   */
  private buildApiUrl(path: string): string {
    const siteUrl = this.config?.credentials?.siteUrl;
    const apiVersion = this.config?.settings?.apiVersion || 'wc/v3';
    return `${siteUrl}/wp-json/${apiVersion}${path}`;
  }

  /**
   * Get authentication config
   */
  private getAuth(): { username: string; password: string } {
    return {
      username: this.config?.credentials?.consumerKey || '',
      password: this.config?.credentials?.consumerSecret || '',
    };
  }

  /**
   * Normalize site URL
   */
  private normalizeSiteUrl(url: string): string {
    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // Remove trailing slash
    url = url.replace(/\/$/, '');

    return url;
  }

  /**
   * Ensure connector is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.config) {
      throw new Error('WooCommerce connector is not connected');
    }
  }

  /**
   * Rate limit delay
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }
}
