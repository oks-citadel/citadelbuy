/**
 * Shopify Connector
 *
 * Implements the connector interface for Shopify stores.
 * Supports both REST and GraphQL APIs with rate limiting,
 * pagination, and webhook integration.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';
import {
  IConnector,
  ConnectorConfig,
  ConnectorSource,
  ShopifyConnectorConfig,
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
import { ShopifyMapper } from './shopify.mapper';
import {
  ShopifyProduct,
  ShopifyProductsResponse,
  ShopifyGraphQLProduct,
  ShopifyShop,
  ShopifyRateLimitInfo,
  ShopifyWebhookTopic,
} from './dto/shopify-product.dto';

/**
 * Shopify API rate limit: 2 requests per second (REST), 50 points per second (GraphQL)
 */
const RATE_LIMIT_DELAY_MS = 500; // 500ms between requests

@Injectable()
export class ShopifyConnector implements IConnector {
  readonly type: ConnectorSource = 'shopify';
  readonly name = 'Shopify';

  private readonly logger = new Logger(ShopifyConnector.name);
  private config?: ShopifyConnectorConfig;
  private isConnected = false;
  private shopInfo?: ShopifyShop;
  private lastRequestTime = 0;
  private tenantId?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mapper: ShopifyMapper,
  ) {}

  /**
   * Connect to Shopify store
   */
  async connect(config: ConnectorConfig): Promise<void> {
    this.config = config as ShopifyConnectorConfig;
    this.tenantId = config.tenantId;

    // Validate configuration
    if (!this.config.credentials?.shopDomain) {
      throw new Error('Shopify shop domain is required');
    }
    if (!this.config.credentials?.accessToken) {
      throw new Error('Shopify access token is required');
    }

    // Normalize shop domain
    this.config.credentials.shopDomain = this.normalizeShopDomain(this.config.credentials.shopDomain);

    // Test the connection by fetching shop info
    try {
      this.shopInfo = await this.fetchShopInfo();
      this.isConnected = true;

      this.logger.log(`Connected to Shopify store: ${this.shopInfo.name}`);

      this.eventEmitter.emit(ConnectorEventType.CONNECTED, {
        type: ConnectorEventType.CONNECTED,
        connectorId: config.id,
        tenantId: this.tenantId,
        timestamp: new Date(),
        data: {
          shopDomain: this.config.credentials.shopDomain,
          shopName: this.shopInfo.name,
        },
      });
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to Shopify: ${error.message}`);
    }
  }

  /**
   * Disconnect from Shopify
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.shopInfo = undefined;
    this.config = undefined;

    this.eventEmitter.emit(ConnectorEventType.DISCONNECTED, {
      type: ConnectorEventType.DISCONNECTED,
      connectorId: this.config?.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
    });

    this.logger.log('Disconnected from Shopify');
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      const shopInfo = await this.fetchShopInfo();
      const latency = Date.now() - startTime;

      // Fetch product count
      const productCount = await this.fetchProductCount();

      return {
        success: true,
        message: `Successfully connected to ${shopInfo.name}`,
        details: {
          latency,
          apiVersion: this.config?.settings?.apiVersion || '2024-01',
          productCount,
          permissions: ['read_products', 'read_inventory'],
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to Shopify',
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

    const useGraphQL = this.config?.settings?.useGraphQL !== false;
    const limit = options?.limit || 50;
    const page = options?.page || 1;

    if (useGraphQL) {
      return this.fetchProductsGraphQL(options);
    } else {
      return this.fetchProductsREST(options);
    }
  }

  /**
   * Fetch a single product by external ID
   */
  async fetchProduct(externalId: string): Promise<NormalizedProduct | null> {
    this.ensureConnected();

    try {
      await this.rateLimitDelay();

      const response = await firstValueFrom(
        this.httpService.get<{ product: ShopifyProduct }>(
          this.buildRestUrl(`/products/${externalId}.json`),
          {
            headers: this.getAuthHeaders(),
          },
        ),
      );

      return this.mapper.mapRestProduct(response.data.product, this.shopInfo?.currency);
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to fetch Shopify product ${externalId}: ${error.message}`);
      throw error;
    }
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
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const result = await this.fetchProducts({ cursor, limit: 50 });

        for (const product of result.data) {
          totalProcessed++;

          try {
            // Emit event for each product (to be handled by sync service)
            this.eventEmitter.emit(ConnectorEventType.PRODUCT_UPDATED, {
              type: ConnectorEventType.PRODUCT_UPDATED,
              connectorId: this.config?.id,
              tenantId: this.tenantId,
              timestamp: new Date(),
              data: { product },
            });

            // Here you would typically check if product exists and update/create
            // For now, we count as updated
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
        cursor = result.pagination.nextCursor;
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
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const result = await this.fetchProducts({
          cursor,
          limit: 50,
          since,
        });

        for (const product of result.data) {
          totalProcessed++;

          try {
            if (product.updatedAt && product.updatedAt >= since) {
              this.eventEmitter.emit(ConnectorEventType.PRODUCT_UPDATED, {
                type: ConnectorEventType.PRODUCT_UPDATED,
                connectorId: this.config?.id,
                tenantId: this.tenantId,
                timestamp: new Date(),
                data: { product },
              });
              updated++;
            } else {
              skipped++;
            }
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
        cursor = result.pagination.nextCursor;
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

    const webhookUrl = this.configService.get<string>('WEBHOOK_BASE_URL') + '/api/v1/webhooks/shopify/products';
    const topics = [
      ShopifyWebhookTopic.PRODUCTS_CREATE,
      ShopifyWebhookTopic.PRODUCTS_UPDATE,
      ShopifyWebhookTopic.PRODUCTS_DELETE,
      ShopifyWebhookTopic.INVENTORY_LEVELS_UPDATE,
    ];

    const registeredWebhooks: string[] = [];

    for (const topic of topics) {
      try {
        await this.rateLimitDelay();

        const response = await firstValueFrom(
          this.httpService.post(
            this.buildRestUrl('/webhooks.json'),
            {
              webhook: {
                topic,
                address: webhookUrl,
                format: 'json',
              },
            },
            {
              headers: this.getAuthHeaders(),
            },
          ),
        );

        registeredWebhooks.push(response.data.webhook.id.toString());
      } catch (error) {
        // Webhook might already exist
        if (error.response?.status !== 422) {
          this.logger.warn(`Failed to register webhook for ${topic}: ${error.message}`);
        }
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
    this.logger.log(`Received Shopify webhook: ${JSON.stringify(payload).substring(0, 100)}...`);

    // The webhook handler will process this
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
   * Fetch products using REST API
   */
  private async fetchProductsREST(options?: FetchOptions): Promise<PaginatedResponse<NormalizedProduct>> {
    const limit = options?.limit || 50;
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
    };

    if (options?.since) {
      params.updated_at_min = options.since.toISOString();
    }

    if (options?.ids && options.ids.length > 0) {
      params.ids = options.ids.join(',');
    }

    await this.rateLimitDelay();

    const response = await firstValueFrom(
      this.httpService.get<ShopifyProductsResponse>(this.buildRestUrl('/products.json'), {
        headers: this.getAuthHeaders(),
        params,
      }),
    );

    const products = this.mapper.mapRestProducts(response.data.products, this.shopInfo?.currency);

    // Check for pagination link header
    const linkHeader = response.headers?.link;
    const hasMore = linkHeader?.includes('rel="next"') || false;
    let nextCursor: string | undefined;

    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        const nextUrl = new URL(nextMatch[1]);
        nextCursor = nextUrl.searchParams.get('page_info') || undefined;
      }
    }

    return {
      data: products,
      pagination: {
        total: undefined, // Shopify REST doesn't provide total count easily
        limit,
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Fetch products using GraphQL API
   */
  private async fetchProductsGraphQL(options?: FetchOptions): Promise<PaginatedResponse<NormalizedProduct>> {
    const limit = options?.limit || 50;
    const after = options?.cursor || null;

    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              productType
              vendor
              tags
              status
              createdAt
              updatedAt
              publishedAt
              totalInventory
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantCompareAtPrice {
                  amount
                  currencyCode
                }
                maxVariantCompareAtPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                id
                url
                altText
                width
                height
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    barcode
                    weight
                    weightUnit
                    inventoryQuantity
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      url
                    }
                    inventoryItem {
                      id
                      tracked
                    }
                  }
                }
              }
              metafields(first: 10) {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
                    type
                  }
                }
              }
            }
          }
        }
      }
    `;

    await this.rateLimitDelay();

    const response = await firstValueFrom(
      this.httpService.post(
        this.buildGraphQLUrl(),
        {
          query,
          variables: {
            first: Math.min(limit, 250),
            after,
          },
        },
        {
          headers: this.getAuthHeaders(),
        },
      ),
    );

    if (response.data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(response.data.errors)}`);
    }

    const productsData = response.data.data.products;
    const products = this.mapper.mapGraphQLProducts(
      productsData.edges.map((edge: any) => edge.node),
    );

    return {
      data: products,
      pagination: {
        limit,
        hasMore: productsData.pageInfo.hasNextPage,
        nextCursor: productsData.pageInfo.endCursor,
      },
    };
  }

  /**
   * Fetch shop information
   */
  private async fetchShopInfo(): Promise<ShopifyShop> {
    const response = await firstValueFrom(
      this.httpService.get<{ shop: ShopifyShop }>(this.buildRestUrl('/shop.json'), {
        headers: this.getAuthHeaders(),
      }),
    );

    return response.data.shop;
  }

  /**
   * Fetch product count
   */
  private async fetchProductCount(): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ count: number }>(this.buildRestUrl('/products/count.json'), {
          headers: this.getAuthHeaders(),
        }),
      );

      return response.data.count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Build REST API URL
   */
  private buildRestUrl(path: string): string {
    const shopDomain = this.config?.credentials?.shopDomain;
    const apiVersion = this.config?.settings?.apiVersion || '2024-01';
    return `https://${shopDomain}/admin/api/${apiVersion}${path}`;
  }

  /**
   * Build GraphQL API URL
   */
  private buildGraphQLUrl(): string {
    const shopDomain = this.config?.credentials?.shopDomain;
    const apiVersion = this.config?.settings?.apiVersion || '2024-01';
    return `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      'X-Shopify-Access-Token': this.config?.credentials?.accessToken || '',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Normalize shop domain
   */
  private normalizeShopDomain(domain: string): string {
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '');

    // Remove trailing slash
    domain = domain.replace(/\/$/, '');

    // Add .myshopify.com if not present
    if (!domain.includes('.myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }

    return domain;
  }

  /**
   * Ensure connector is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.config) {
      throw new Error('Shopify connector is not connected');
    }
  }

  /**
   * Rate limit delay to avoid hitting API limits
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
