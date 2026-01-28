/**
 * Connector Interface - Base contract for all product source connectors
 *
 * This interface defines the standard contract that all product integration connectors
 * must implement. It supports various e-commerce platforms including Shopify,
 * WooCommerce, custom REST APIs, and CSV imports.
 */

export type ConnectorSource = 'shopify' | 'woocommerce' | 'rest' | 'csv';

/**
 * Connector configuration base interface
 */
export interface ConnectorConfig {
  id?: string;
  tenantId: string;
  type: ConnectorSource;
  name: string;
  isActive: boolean;
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
}

/**
 * Shopify-specific connector configuration
 */
export interface ShopifyConnectorConfig extends ConnectorConfig {
  type: 'shopify';
  credentials: {
    shopDomain: string;
    accessToken: string;
    apiKey?: string;
    apiSecretKey?: string;
  };
  settings: {
    useGraphQL: boolean;
    syncInventory: boolean;
    syncImages: boolean;
    webhooksEnabled: boolean;
    apiVersion: string;
  };
}

/**
 * WooCommerce-specific connector configuration
 */
export interface WooCommerceConnectorConfig extends ConnectorConfig {
  type: 'woocommerce';
  credentials: {
    siteUrl: string;
    consumerKey: string;
    consumerSecret: string;
  };
  settings: {
    syncInventory: boolean;
    syncImages: boolean;
    webhooksEnabled: boolean;
    apiVersion: string;
  };
}

/**
 * REST API connector configuration
 */
export interface RestConnectorConfig extends ConnectorConfig {
  type: 'rest';
  credentials: {
    baseUrl: string;
    authType: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';
    apiKey?: string;
    apiKeyHeader?: string;
    bearerToken?: string;
    basicUsername?: string;
    basicPassword?: string;
    oauth2Config?: {
      clientId: string;
      clientSecret: string;
      tokenUrl: string;
      scope?: string;
    };
  };
  settings: {
    productsEndpoint: string;
    singleProductEndpoint?: string;
    fieldMapping: FieldMapping;
    pagination?: {
      type: 'offset' | 'cursor' | 'page';
      limitParam: string;
      offsetParam?: string;
      cursorParam?: string;
      pageParam?: string;
    };
    headers?: Record<string, string>;
    pollingInterval?: number; // minutes
  };
}

/**
 * CSV connector configuration
 */
export interface CsvConnectorConfig extends ConnectorConfig {
  type: 'csv';
  credentials: {
    storageType: 'local' | 's3' | 'url';
    s3Bucket?: string;
    s3Region?: string;
    s3AccessKey?: string;
    s3SecretKey?: string;
    fileUrl?: string;
  };
  settings: {
    fieldMapping: FieldMapping;
    delimiter: string;
    hasHeader: boolean;
    encoding: string;
    skipRows?: number;
    validationRules?: ValidationRule[];
  };
}

/**
 * Field mapping configuration for REST and CSV connectors
 */
export interface FieldMapping {
  externalId: string;
  sku?: string;
  name: string;
  description?: string;
  price: string;
  currency?: string;
  images?: string;
  categories?: string;
  quantity?: string;
  variants?: string;
  metadata?: Record<string, string>;
  transformations?: FieldTransformation[];
}

/**
 * Field transformation rules
 */
export interface FieldTransformation {
  field: string;
  type: 'prefix' | 'suffix' | 'replace' | 'extract' | 'default' | 'template' | 'number' | 'boolean';
  value?: string;
  pattern?: string;
  replacement?: string;
}

/**
 * Validation rules for CSV imports
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'regex' | 'min' | 'max' | 'enum' | 'unique';
  value?: string | number | string[];
  message?: string;
}

/**
 * Fetch options for retrieving products
 */
export interface FetchOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  since?: Date;
  ids?: string[];
  filters?: Record<string, any>;
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * Sync result summary
 */
export interface SyncResult {
  success: boolean;
  connectorId: string;
  startedAt: Date;
  completedAt: Date;
  summary: {
    totalProcessed: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    failed: number;
  };
  errors: SyncError[];
  warnings: SyncWarning[];
}

/**
 * Sync error details
 */
export interface SyncError {
  externalId?: string;
  field?: string;
  message: string;
  code: string;
  data?: any;
}

/**
 * Sync warning details
 */
export interface SyncWarning {
  externalId?: string;
  field?: string;
  message: string;
  code: string;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  webhookId: string;
  url: string;
  events: string[];
  secret?: string;
  createdAt: Date;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    latency?: number;
    apiVersion?: string;
    permissions?: string[];
    productCount?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Main Connector Interface
 *
 * All product source connectors must implement this interface.
 */
export interface IConnector {
  /**
   * Get the connector type
   */
  readonly type: ConnectorSource;

  /**
   * Get the connector name
   */
  readonly name: string;

  /**
   * Initialize the connector with configuration
   * @param config - Connector configuration
   */
  connect(config: ConnectorConfig): Promise<void>;

  /**
   * Disconnect and cleanup resources
   */
  disconnect(): Promise<void>;

  /**
   * Test the connection to the external source
   * @returns Connection test result
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Fetch products from the external source
   * @param options - Fetch options (pagination, filters)
   * @returns Paginated list of normalized products
   */
  fetchProducts(options?: FetchOptions): Promise<PaginatedResponse<NormalizedProduct>>;

  /**
   * Fetch a single product by external ID
   * @param externalId - External product identifier
   * @returns Normalized product or null if not found
   */
  fetchProduct(externalId: string): Promise<NormalizedProduct | null>;

  /**
   * Perform a full sync of all products
   * @returns Sync result summary
   */
  syncProducts(): Promise<SyncResult>;

  /**
   * Perform a delta sync (changes since last sync)
   * @param since - Date to sync from
   * @returns Sync result summary
   */
  syncDelta(since: Date): Promise<SyncResult>;

  /**
   * Setup webhooks for real-time updates (optional)
   * @returns Webhook configuration
   */
  setupWebhooks?(): Promise<WebhookConfig>;

  /**
   * Handle incoming webhook payload (optional)
   * @param payload - Webhook payload
   */
  handleWebhook?(payload: any): Promise<void>;

  /**
   * Validate connector configuration (optional)
   * @param config - Configuration to validate
   * @returns Validation result
   */
  validateConfig?(config: ConnectorConfig): Promise<{ valid: boolean; errors?: string[] }>;
}

/**
 * Normalized Product Model
 *
 * This is the standard product format that all connectors must map to.
 * It represents a unified product structure regardless of the source.
 */
export interface NormalizedProduct {
  /**
   * External product ID from the source system
   */
  externalId: string;

  /**
   * Source platform identifier
   */
  source: ConnectorSource;

  /**
   * Stock Keeping Unit
   */
  sku: string;

  /**
   * Product name/title
   */
  name: string;

  /**
   * Product description (HTML or plain text)
   */
  description: string;

  /**
   * Short description (if available)
   */
  shortDescription?: string;

  /**
   * Base price
   */
  price: number;

  /**
   * Compare at / original price (for sales)
   */
  compareAtPrice?: number;

  /**
   * Cost price (for profit calculations)
   */
  costPrice?: number;

  /**
   * Currency code (ISO 4217)
   */
  currency: string;

  /**
   * Product images URLs
   */
  images: string[];

  /**
   * Featured/primary image URL
   */
  featuredImage?: string;

  /**
   * Product categories
   */
  categories: string[];

  /**
   * Product tags
   */
  tags?: string[];

  /**
   * Product variants
   */
  variants?: NormalizedVariant[];

  /**
   * Inventory information
   */
  inventory?: NormalizedInventory;

  /**
   * Product attributes (color, size, material, etc.)
   */
  attributes?: NormalizedAttribute[];

  /**
   * SEO metadata
   */
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    slug?: string;
  };

  /**
   * Product dimensions and weight
   */
  dimensions?: {
    weight?: number;
    weightUnit?: string;
    length?: number;
    width?: number;
    height?: number;
    dimensionUnit?: string;
  };

  /**
   * Product status
   */
  status: 'active' | 'draft' | 'archived' | 'inactive';

  /**
   * Product visibility
   */
  visibility?: 'visible' | 'hidden' | 'search_only' | 'catalog_only';

  /**
   * Product type (physical, digital, service)
   */
  productType?: 'physical' | 'digital' | 'service' | 'bundle';

  /**
   * Vendor/manufacturer information
   */
  vendor?: string;

  /**
   * Brand name
   */
  brand?: string;

  /**
   * Barcode (UPC, EAN, ISBN)
   */
  barcode?: string;

  /**
   * Creation date in source system
   */
  createdAt?: Date;

  /**
   * Last update date in source system
   */
  updatedAt?: Date;

  /**
   * Additional metadata from source
   */
  metadata?: Record<string, any>;

  /**
   * Raw data from source (for debugging)
   */
  rawData?: any;
}

/**
 * Normalized Product Variant
 */
export interface NormalizedVariant {
  externalId: string;
  sku?: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  inventory?: NormalizedInventory;
  attributes: NormalizedAttribute[];
  images?: string[];
  barcode?: string;
  weight?: number;
  position?: number;
  isDefault?: boolean;
}

/**
 * Normalized Inventory
 */
export interface NormalizedInventory {
  quantity: number;
  trackInventory: boolean;
  allowBackorder?: boolean;
  lowStockThreshold?: number;
  locations?: {
    locationId: string;
    locationName?: string;
    quantity: number;
  }[];
}

/**
 * Normalized Product Attribute
 */
export interface NormalizedAttribute {
  name: string;
  value: string;
  position?: number;
  isVisible?: boolean;
  isVariation?: boolean;
}

/**
 * Connector event types
 */
export enum ConnectorEventType {
  CONNECTED = 'connector.connected',
  DISCONNECTED = 'connector.disconnected',
  SYNC_STARTED = 'connector.sync.started',
  SYNC_COMPLETED = 'connector.sync.completed',
  SYNC_FAILED = 'connector.sync.failed',
  PRODUCT_CREATED = 'connector.product.created',
  PRODUCT_UPDATED = 'connector.product.updated',
  PRODUCT_DELETED = 'connector.product.deleted',
  WEBHOOK_RECEIVED = 'connector.webhook.received',
  ERROR = 'connector.error',
  RATE_LIMITED = 'connector.rate_limited',
}

/**
 * Connector event payload
 */
export interface ConnectorEvent {
  type: ConnectorEventType;
  connectorId: string;
  tenantId: string;
  timestamp: Date;
  data?: any;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}
