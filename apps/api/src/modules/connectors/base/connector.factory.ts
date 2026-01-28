/**
 * Connector Factory
 *
 * Factory pattern implementation for creating connector instances
 * based on connector type configuration.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  IConnector,
  ConnectorConfig,
  ConnectorSource,
  ShopifyConnectorConfig,
  WooCommerceConnectorConfig,
  RestConnectorConfig,
  CsvConnectorConfig,
} from './connector.interface';
import { ShopifyConnector } from '../shopify/shopify.connector';
import { WooCommerceConnector } from '../woocommerce/woocommerce.connector';
import { RestConnector } from '../rest/rest.connector';
import { CsvConnector } from '../csv/csv.connector';

/**
 * Connector Registry - Maintains active connector instances
 */
export class ConnectorRegistry {
  private connectors: Map<string, IConnector> = new Map();

  /**
   * Register a connector instance
   */
  register(id: string, connector: IConnector): void {
    this.connectors.set(id, connector);
  }

  /**
   * Get a connector by ID
   */
  get(id: string): IConnector | undefined {
    return this.connectors.get(id);
  }

  /**
   * Remove a connector
   */
  async remove(id: string): Promise<void> {
    const connector = this.connectors.get(id);
    if (connector) {
      await connector.disconnect();
      this.connectors.delete(id);
    }
  }

  /**
   * Check if a connector exists
   */
  has(id: string): boolean {
    return this.connectors.has(id);
  }

  /**
   * Get all connector IDs
   */
  getIds(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Get all connectors for a tenant
   */
  getByTenant(tenantId: string): IConnector[] {
    return Array.from(this.connectors.values()).filter(
      (connector) => (connector as any).tenantId === tenantId,
    );
  }

  /**
   * Clear all connectors
   */
  async clear(): Promise<void> {
    for (const [id, connector] of this.connectors) {
      try {
        await connector.disconnect();
      } catch (error) {
        // Log but continue
      }
    }
    this.connectors.clear();
  }
}

/**
 * Connector Factory Service
 *
 * Creates and manages connector instances based on configuration.
 */
@Injectable()
export class ConnectorFactory {
  private readonly logger = new Logger(ConnectorFactory.name);
  private readonly registry = new ConnectorRegistry();

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Create a connector instance based on type
   */
  async create(config: ConnectorConfig): Promise<IConnector> {
    this.logger.log(`Creating connector: ${config.type} - ${config.name}`);

    let connector: IConnector;

    switch (config.type) {
      case 'shopify':
        connector = await this.createShopifyConnector(config as ShopifyConnectorConfig);
        break;
      case 'woocommerce':
        connector = await this.createWooCommerceConnector(config as WooCommerceConnectorConfig);
        break;
      case 'rest':
        connector = await this.createRestConnector(config as RestConnectorConfig);
        break;
      case 'csv':
        connector = await this.createCsvConnector(config as CsvConnectorConfig);
        break;
      default:
        throw new Error(`Unsupported connector type: ${config.type}`);
    }

    // Initialize the connector
    await connector.connect(config);

    // Register the connector if it has an ID
    if (config.id) {
      this.registry.register(config.id, connector);
    }

    this.logger.log(`Connector created successfully: ${config.type} - ${config.name}`);
    return connector;
  }

  /**
   * Get an existing connector by ID
   */
  get(id: string): IConnector | undefined {
    return this.registry.get(id);
  }

  /**
   * Get or create a connector
   */
  async getOrCreate(config: ConnectorConfig): Promise<IConnector> {
    if (config.id && this.registry.has(config.id)) {
      return this.registry.get(config.id)!;
    }
    return this.create(config);
  }

  /**
   * Remove and disconnect a connector
   */
  async remove(id: string): Promise<void> {
    await this.registry.remove(id);
    this.logger.log(`Connector removed: ${id}`);
  }

  /**
   * Get all connectors for a tenant
   */
  getByTenant(tenantId: string): IConnector[] {
    return this.registry.getByTenant(tenantId);
  }

  /**
   * Validate connector configuration
   */
  validateConfig(config: ConnectorConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Common validation
    if (!config.type) {
      errors.push('Connector type is required');
    }
    if (!config.name) {
      errors.push('Connector name is required');
    }
    if (!config.tenantId) {
      errors.push('Tenant ID is required');
    }

    // Type-specific validation
    switch (config.type) {
      case 'shopify':
        errors.push(...this.validateShopifyConfig(config as ShopifyConnectorConfig));
        break;
      case 'woocommerce':
        errors.push(...this.validateWooCommerceConfig(config as WooCommerceConnectorConfig));
        break;
      case 'rest':
        errors.push(...this.validateRestConfig(config as RestConnectorConfig));
        break;
      case 'csv':
        errors.push(...this.validateCsvConfig(config as CsvConnectorConfig));
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported connector types
   */
  getSupportedTypes(): ConnectorSource[] {
    return ['shopify', 'woocommerce', 'rest', 'csv'];
  }

  /**
   * Get connector type metadata
   */
  getTypeMetadata(type: ConnectorSource): {
    type: ConnectorSource;
    name: string;
    description: string;
    features: string[];
    requiredCredentials: string[];
  } {
    const metadata: Record<ConnectorSource, any> = {
      shopify: {
        type: 'shopify',
        name: 'Shopify',
        description: 'Connect to Shopify stores to import products',
        features: ['oauth', 'webhooks', 'inventory_sync', 'variants', 'metafields'],
        requiredCredentials: ['shopDomain', 'accessToken'],
      },
      woocommerce: {
        type: 'woocommerce',
        name: 'WooCommerce',
        description: 'Connect to WooCommerce stores to import products',
        features: ['webhooks', 'inventory_sync', 'variants', 'attributes'],
        requiredCredentials: ['siteUrl', 'consumerKey', 'consumerSecret'],
      },
      rest: {
        type: 'rest',
        name: 'REST API',
        description: 'Connect to any REST API to import products',
        features: ['custom_mapping', 'polling', 'authentication'],
        requiredCredentials: ['baseUrl'],
      },
      csv: {
        type: 'csv',
        name: 'CSV Import',
        description: 'Import products from CSV files',
        features: ['file_upload', 's3_integration', 'custom_mapping', 'validation'],
        requiredCredentials: [],
      },
    };

    return metadata[type];
  }

  // Private methods for creating specific connector types

  private async createShopifyConnector(config: ShopifyConnectorConfig): Promise<IConnector> {
    const connector = this.moduleRef.get(ShopifyConnector, { strict: false });
    return connector;
  }

  private async createWooCommerceConnector(config: WooCommerceConnectorConfig): Promise<IConnector> {
    const connector = this.moduleRef.get(WooCommerceConnector, { strict: false });
    return connector;
  }

  private async createRestConnector(config: RestConnectorConfig): Promise<IConnector> {
    const connector = this.moduleRef.get(RestConnector, { strict: false });
    return connector;
  }

  private async createCsvConnector(config: CsvConnectorConfig): Promise<IConnector> {
    const connector = this.moduleRef.get(CsvConnector, { strict: false });
    return connector;
  }

  // Private validation methods

  private validateShopifyConfig(config: ShopifyConnectorConfig): string[] {
    const errors: string[] = [];
    if (!config.credentials?.shopDomain) {
      errors.push('Shopify shop domain is required');
    }
    if (!config.credentials?.accessToken) {
      errors.push('Shopify access token is required');
    }
    // Validate shop domain format
    if (config.credentials?.shopDomain && !config.credentials.shopDomain.includes('.myshopify.com')) {
      if (!config.credentials.shopDomain.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/)) {
        errors.push('Invalid Shopify shop domain format');
      }
    }
    return errors;
  }

  private validateWooCommerceConfig(config: WooCommerceConnectorConfig): string[] {
    const errors: string[] = [];
    if (!config.credentials?.siteUrl) {
      errors.push('WooCommerce site URL is required');
    }
    if (!config.credentials?.consumerKey) {
      errors.push('WooCommerce consumer key is required');
    }
    if (!config.credentials?.consumerSecret) {
      errors.push('WooCommerce consumer secret is required');
    }
    // Validate URL format
    if (config.credentials?.siteUrl) {
      try {
        new URL(config.credentials.siteUrl);
      } catch {
        errors.push('Invalid WooCommerce site URL format');
      }
    }
    return errors;
  }

  private validateRestConfig(config: RestConnectorConfig): string[] {
    const errors: string[] = [];
    if (!config.credentials?.baseUrl) {
      errors.push('REST API base URL is required');
    }
    if (!config.settings?.productsEndpoint) {
      errors.push('Products endpoint is required');
    }
    if (!config.settings?.fieldMapping) {
      errors.push('Field mapping is required');
    }
    // Validate URL format
    if (config.credentials?.baseUrl) {
      try {
        new URL(config.credentials.baseUrl);
      } catch {
        errors.push('Invalid REST API base URL format');
      }
    }
    // Validate auth configuration
    if (config.credentials?.authType === 'api_key' && !config.credentials?.apiKey) {
      errors.push('API key is required for api_key authentication');
    }
    if (config.credentials?.authType === 'bearer' && !config.credentials?.bearerToken) {
      errors.push('Bearer token is required for bearer authentication');
    }
    if (config.credentials?.authType === 'basic') {
      if (!config.credentials?.basicUsername || !config.credentials?.basicPassword) {
        errors.push('Username and password are required for basic authentication');
      }
    }
    return errors;
  }

  private validateCsvConfig(config: CsvConnectorConfig): string[] {
    const errors: string[] = [];
    if (!config.settings?.fieldMapping) {
      errors.push('Field mapping is required');
    }
    if (config.credentials?.storageType === 's3') {
      if (!config.credentials?.s3Bucket) {
        errors.push('S3 bucket is required for S3 storage');
      }
    }
    if (config.credentials?.storageType === 'url') {
      if (!config.credentials?.fileUrl) {
        errors.push('File URL is required for URL storage');
      }
    }
    return errors;
  }
}

/**
 * Base connector class with common functionality
 */
export abstract class BaseConnector implements IConnector {
  protected readonly logger: Logger;
  protected config?: ConnectorConfig;
  protected isConnected = false;

  abstract readonly type: ConnectorSource;
  abstract readonly name: string;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Connect to the external source
   */
  async connect(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.doConnect(config);
    this.isConnected = true;
    this.logger.log(`Connected to ${this.name}`);
  }

  /**
   * Disconnect from the external source
   */
  async disconnect(): Promise<void> {
    await this.doDisconnect();
    this.isConnected = false;
    this.config = undefined;
    this.logger.log(`Disconnected from ${this.name}`);
  }

  /**
   * Check if connected
   */
  protected ensureConnected(): void {
    if (!this.isConnected || !this.config) {
      throw new Error(`${this.name} connector is not connected`);
    }
  }

  /**
   * Implementation-specific connect logic
   */
  protected abstract doConnect(config: ConnectorConfig): Promise<void>;

  /**
   * Implementation-specific disconnect logic
   */
  protected abstract doDisconnect(): Promise<void>;

  /**
   * Test the connection
   */
  abstract testConnection(): Promise<import('./connector.interface').ConnectionTestResult>;

  /**
   * Fetch products
   */
  abstract fetchProducts(
    options?: import('./connector.interface').FetchOptions,
  ): Promise<import('./connector.interface').PaginatedResponse<import('./connector.interface').NormalizedProduct>>;

  /**
   * Fetch a single product
   */
  abstract fetchProduct(
    externalId: string,
  ): Promise<import('./connector.interface').NormalizedProduct | null>;

  /**
   * Sync all products
   */
  abstract syncProducts(): Promise<import('./connector.interface').SyncResult>;

  /**
   * Sync changes since a date
   */
  abstract syncDelta(since: Date): Promise<import('./connector.interface').SyncResult>;
}
