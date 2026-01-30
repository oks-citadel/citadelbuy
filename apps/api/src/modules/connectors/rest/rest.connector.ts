/**
 * REST API Connector
 *
 * Implements the connector interface for generic REST APIs.
 * Supports configurable authentication, field mapping, and pagination.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
// @ts-ignore
import * as jp from 'jsonpath';
import {
  IConnector,
  ConnectorConfig,
  ConnectorSource,
  RestConnectorConfig,
  FetchOptions,
  PaginatedResponse,
  NormalizedProduct,
  SyncResult,
  SyncError,
  SyncWarning,
  ConnectionTestResult,
  ConnectorEventType,
} from '../base/connector.interface';
import { RestMapper } from './rest.mapper';
import {
  RestConnectorFullConfig,
  OAuth2TokenResponse,
  RestConnectorState,
  RestFieldMapping,
} from './dto/rest-config.dto';

@Injectable()
export class RestConnector implements IConnector {
  readonly type: ConnectorSource = 'rest';
  readonly name = 'REST API';

  private readonly logger = new Logger(RestConnector.name);
  private config?: RestConnectorConfig;
  private fullConfig?: RestConnectorFullConfig;
  private isConnected = false;
  private state: RestConnectorState = {};
  private lastRequestTime = 0;
  private tenantId?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mapper: RestMapper,
  ) {}

  /**
   * Connect to REST API
   */
  async connect(config: ConnectorConfig): Promise<void> {
    this.config = config as RestConnectorConfig;
    this.tenantId = config.tenantId;

    // Build full configuration
    this.fullConfig = this.buildFullConfig(this.config);

    // Validate configuration
    if (!this.fullConfig.baseUrl) {
      throw new Error('REST API base URL is required');
    }
    if (!this.fullConfig.productsEndpoint) {
      throw new Error('Products endpoint is required');
    }
    if (!this.fullConfig.fieldMapping) {
      throw new Error('Field mapping is required');
    }

    // Initialize authentication if needed
    if (this.fullConfig.authMethod === 'oauth2' && this.fullConfig.oauth2) {
      await this.refreshOAuth2Token();
    }

    this.isConnected = true;

    this.logger.log(`Connected to REST API: ${this.fullConfig.baseUrl}`);

    this.eventEmitter.emit(ConnectorEventType.CONNECTED, {
      type: ConnectorEventType.CONNECTED,
      connectorId: config.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
      data: {
        baseUrl: this.fullConfig.baseUrl,
        authMethod: this.fullConfig.authMethod,
      },
    });
  }

  /**
   * Disconnect from REST API
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.state = {};
    this.config = undefined;
    this.fullConfig = undefined;

    this.eventEmitter.emit(ConnectorEventType.DISCONNECTED, {
      type: ConnectorEventType.DISCONNECTED,
      connectorId: this.config?.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
    });

    this.logger.log('Disconnected from REST API');
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();

      // Make a test request to the products endpoint
      const result = await this.fetchProducts({ limit: 1 });
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: `Successfully connected to REST API at ${this.fullConfig?.baseUrl}`,
        details: {
          latency,
          productCount: result.pagination.total || result.data.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to REST API',
        error: {
          code: error.response?.status?.toString() || 'CONNECTION_FAILED',
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

    const limit = options?.limit || this.fullConfig?.pagination?.defaultLimit || 50;
    const page = options?.page || 1;

    // Build request URL and params
    const url = this.buildUrl(this.fullConfig!.productsEndpoint);
    const requestConfig = await this.buildRequestConfig(options, limit, page);

    await this.rateLimitDelay();

    let response: AxiosResponse;

    if (this.fullConfig?.request?.method === 'POST') {
      response = await firstValueFrom(
        this.httpService.post(url, this.buildRequestBody(options, limit, page), requestConfig),
      );
    } else {
      response = await firstValueFrom(this.httpService.get(url, requestConfig));
    }

    // Extract products from response
    const products = this.extractProducts(response.data);
    const normalizedProducts = this.mapper.mapProducts(
      products,
      this.buildFieldMapping(),
      this.config?.settings?.fieldMapping?.currency || 'USD',
    );

    // Extract pagination info
    const pagination = this.extractPaginationInfo(response, limit, page, products.length);

    return {
      data: normalizedProducts,
      pagination,
    };
  }

  /**
   * Fetch a single product by external ID
   */
  async fetchProduct(externalId: string): Promise<NormalizedProduct | null> {
    this.ensureConnected();

    if (!this.fullConfig?.singleProductEndpoint) {
      // Fall back to fetching all and filtering
      const result = await this.fetchProducts({ ids: [externalId] });
      return result.data.find((p) => p.externalId === externalId) || null;
    }

    try {
      const url = this.buildUrl(
        this.fullConfig.singleProductEndpoint.replace('{id}', externalId),
      );
      const requestConfig = await this.buildRequestConfig();

      await this.rateLimitDelay();

      const response = await firstValueFrom(this.httpService.get(url, requestConfig));

      // Extract single product (might be wrapped in response object)
      let productData = response.data;
      if (this.fullConfig.response?.dataPath) {
        const results = jp.query(productData, this.fullConfig.response.dataPath);
        productData = results.length > 0 ? results[0] : productData;
      }

      return this.mapper.mapProduct(
        productData,
        this.buildFieldMapping(),
        this.config?.settings?.fieldMapping?.currency || 'USD',
      );
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to fetch REST product ${externalId}: ${error.message}`);
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
      let page = 1;
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const result = await this.fetchProducts({ page, cursor, limit: 100 });

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
        cursor = result.pagination.nextCursor;
        page++;
      }

      this.state.lastSyncTimestamp = new Date();

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
        const result = await this.fetchProducts({ page, since, limit: 100 });

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

      this.state.lastSyncTimestamp = new Date();

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

  // Private methods

  /**
   * Build full configuration from connector config
   */
  private buildFullConfig(config: RestConnectorConfig): RestConnectorFullConfig {
    return {
      baseUrl: config.credentials.baseUrl,
      authMethod: config.credentials.authType,
      apiKey: config.credentials.apiKey,
      apiKeyHeader: config.credentials.apiKeyHeader || 'X-API-Key',
      bearerToken: config.credentials.bearerToken,
      basicUsername: config.credentials.basicUsername,
      basicPassword: config.credentials.basicPassword,
      oauth2: config.credentials.oauth2Config
        ? {
            grantType: 'client_credentials',
            tokenUrl: config.credentials.oauth2Config.tokenUrl,
            clientId: config.credentials.oauth2Config.clientId,
            clientSecret: config.credentials.oauth2Config.clientSecret,
            scope: config.credentials.oauth2Config.scope,
          }
        : undefined,
      productsEndpoint: config.settings.productsEndpoint,
      singleProductEndpoint: config.settings.singleProductEndpoint,
      request: {
        method: 'GET',
        headers: config.settings.headers,
      },
      response: {
        format: 'json',
        dataPath: '$.data' as string, // Default JSONPath
      },
      pagination: config.settings.pagination
        ? {
            type: config.settings.pagination.type,
            limitParam: config.settings.pagination.limitParam,
            offsetParam: config.settings.pagination.offsetParam,
            pageParam: config.settings.pagination.pageParam,
            cursorParam: config.settings.pagination.cursorParam,
          }
        : undefined,
      fieldMapping: this.buildFieldMapping(),
      rateLimit: {
        requestsPerSecond: 10,
      },
      timeoutMs: 30000,
    };
  }

  /**
   * Build field mapping from settings
   */
  private buildFieldMapping(): RestFieldMapping {
    const mapping = this.config?.settings?.fieldMapping;

    if (!mapping) {
      throw new Error('Field mapping is required');
    }

    return {
      externalId: { path: mapping.externalId },
      name: { path: mapping.name },
      price: { path: mapping.price, transform: 'number' },
      sku: mapping.sku ? { path: mapping.sku } : undefined,
      description: mapping.description ? { path: mapping.description } : undefined,
      currency: mapping.currency ? { path: mapping.currency } : undefined,
      images: mapping.images ? { path: mapping.images, transform: 'array' } : undefined,
      categories: mapping.categories ? { path: mapping.categories, transform: 'array' } : undefined,
      quantity: mapping.quantity ? { path: mapping.quantity, transform: 'number' } : undefined,
      variants: mapping.variants ? { path: mapping.variants, transform: 'array' } : undefined,
      metadata: mapping.metadata
        ? Object.entries(mapping.metadata).reduce(
            (acc, [key, path]) => {
              acc[key] = { path };
              return acc;
            },
            {} as Record<string, { path: string }>,
          )
        : undefined,
    } as RestFieldMapping;
  }

  /**
   * Build request URL
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.fullConfig?.baseUrl || '';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${normalizedBase}${normalizedEndpoint}`;
  }

  /**
   * Build request configuration
   */
  private async buildRequestConfig(
    options?: FetchOptions,
    limit?: number,
    page?: number,
  ): Promise<AxiosRequestConfig> {
    const config: AxiosRequestConfig = {
      headers: { ...this.fullConfig?.request?.headers },
      params: { ...this.fullConfig?.request?.queryParams },
      timeout: this.fullConfig?.timeoutMs || 30000,
    };

    // Add authentication
    await this.addAuthentication(config);

    // Add pagination params
    if (this.fullConfig?.pagination && limit) {
      config.params[this.fullConfig.pagination.limitParam] = limit;

      switch (this.fullConfig.pagination.type) {
        case 'offset':
          if (this.fullConfig.pagination.offsetParam && page) {
            config.params[this.fullConfig.pagination.offsetParam] = (page - 1) * limit;
          }
          break;
        case 'page':
          if (this.fullConfig.pagination.pageParam && page) {
            config.params[this.fullConfig.pagination.pageParam] = page;
          }
          break;
        case 'cursor':
          if (this.fullConfig.pagination.cursorParam && options?.cursor) {
            config.params[this.fullConfig.pagination.cursorParam] = options.cursor;
          }
          break;
      }
    }

    // Add date filter if supported
    if (options?.since) {
      // This is configurable per API
      config.params['modified_after'] = options.since.toISOString();
    }

    return config;
  }

  /**
   * Build request body for POST requests
   */
  private buildRequestBody(options?: FetchOptions, limit?: number, page?: number): any {
    if (!this.fullConfig?.request?.bodyTemplate) {
      return {};
    }

    // Parse and fill template
    let body = JSON.parse(this.fullConfig.request.bodyTemplate);

    // Replace placeholders
    body = JSON.parse(
      JSON.stringify(body)
        .replace('{limit}', String(limit || 50))
        .replace('{page}', String(page || 1))
        .replace('{cursor}', options?.cursor || ''),
    );

    return body;
  }

  /**
   * Add authentication to request config
   */
  private async addAuthentication(config: AxiosRequestConfig): Promise<void> {
    switch (this.fullConfig?.authMethod) {
      case 'api_key':
        const header = this.fullConfig.apiKeyHeader || 'X-API-Key';
        config.headers![header] = this.fullConfig.apiKey;
        break;

      case 'bearer':
        config.headers!['Authorization'] = `Bearer ${this.fullConfig.bearerToken}`;
        break;

      case 'basic':
        config.auth = {
          username: this.fullConfig.basicUsername || '',
          password: this.fullConfig.basicPassword || '',
        };
        break;

      case 'oauth2':
        await this.ensureValidOAuth2Token();
        config.headers!['Authorization'] = `Bearer ${this.state.accessToken}`;
        break;
    }
  }

  /**
   * Refresh OAuth2 token
   */
  private async refreshOAuth2Token(): Promise<void> {
    if (!this.fullConfig?.oauth2) {
      throw new Error('OAuth2 configuration is missing');
    }

    const tokenResponse = await firstValueFrom(
      this.httpService.post<OAuth2TokenResponse>(
        this.fullConfig.oauth2.tokenUrl,
        new URLSearchParams({
          grant_type: this.fullConfig.oauth2.grantType,
          client_id: this.fullConfig.oauth2.clientId,
          client_secret: this.fullConfig.oauth2.clientSecret,
          scope: this.fullConfig.oauth2.scope || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    this.state.accessToken = tokenResponse.data.access_token;
    this.state.tokenExpiresAt = tokenResponse.data.expires_in
      ? new Date(Date.now() + tokenResponse.data.expires_in * 1000 - 60000) // Refresh 1 min early
      : undefined;
  }

  /**
   * Ensure OAuth2 token is valid
   */
  private async ensureValidOAuth2Token(): Promise<void> {
    if (
      !this.state.accessToken ||
      (this.state.tokenExpiresAt && new Date() >= this.state.tokenExpiresAt)
    ) {
      await this.refreshOAuth2Token();
    }
  }

  /**
   * Extract products from response data
   */
  private extractProducts(data: any): any[] {
    const dataPath = this.fullConfig?.response?.dataPath || '$.data';

    try {
      const results = jp.query(data, dataPath);

      if (results.length > 0 && Array.isArray(results[0])) {
        return results[0];
      }

      if (Array.isArray(results)) {
        return results;
      }

      // Try common paths
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.products)) return data.products;
      if (Array.isArray(data.results)) return data.results;

      return [];
    } catch (error) {
      this.logger.warn(`Failed to extract products with path ${dataPath}: ${error.message}`);
      return Array.isArray(data) ? data : [];
    }
  }

  /**
   * Extract pagination information from response
   */
  private extractPaginationInfo(
    response: AxiosResponse,
    limit: number,
    page: number,
    productsCount: number,
  ): PaginatedResponse<any>['pagination'] {
    let total: number | undefined;
    let hasMore = false;
    let nextCursor: string | undefined;

    const pagination = this.fullConfig?.pagination;

    if (pagination) {
      // Try to extract total from response
      if (pagination.totalPath) {
        try {
          const results = jp.query(response.data, pagination.totalPath);
          total = results.length > 0 ? Number(results[0]) : undefined;
        } catch {
          // Ignore
        }
      }

      // Check for has more
      if (pagination.hasMorePath) {
        try {
          const results = jp.query(response.data, pagination.hasMorePath);
          hasMore = results.length > 0 ? Boolean(results[0]) : false;
        } catch {
          // Ignore
        }
      } else {
        hasMore = productsCount >= limit;
      }

      // Extract next cursor
      if (pagination.cursorPath) {
        try {
          const results = jp.query(response.data, pagination.cursorPath);
          nextCursor = results.length > 0 ? String(results[0]) : undefined;
        } catch {
          // Ignore
        }
      }

      // Check link header for next page
      if (pagination.type === 'link_header') {
        const linkHeader = response.headers['link'];
        if (linkHeader?.includes('rel="next"')) {
          hasMore = true;
          const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          if (nextMatch) {
            nextCursor = nextMatch[1];
          }
        }
      }
    } else {
      hasMore = productsCount >= limit;
    }

    return {
      total,
      page,
      limit,
      hasMore,
      nextCursor: hasMore ? (nextCursor || String(page + 1)) : undefined,
    };
  }

  /**
   * Ensure connector is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.config || !this.fullConfig) {
      throw new Error('REST connector is not connected');
    }
  }

  /**
   * Rate limit delay
   */
  private async rateLimitDelay(): Promise<void> {
    const requestsPerSecond = this.fullConfig?.rateLimit?.requestsPerSecond || 10;
    const delayMs = 1000 / requestsPerSecond;

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }
}
